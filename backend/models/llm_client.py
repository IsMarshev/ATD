import os
import logging
import functools
import asyncio
import inspect
from typing import (
    Any,
    AsyncIterator,
    Callable,
    Dict,
    Iterator,
    List,
    Mapping,
    Optional,
    Sequence,
    TypeVar,
)

from openai import OpenAI, AsyncOpenAI
from openai._exceptions import (
    APIConnectionError,
    APIStatusError,
    RateLimitError,
    APIError,
    APITimeoutError,
    LengthFinishReasonError
)

from pydantic import BaseModel, ValidationError
from tenacity import (
    AsyncRetrying,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)
import json

from .exceptions import (
    ApiError,
    ApiErrorCode,
    RetryableError,
    EmptyResponseError,
)

from dotenv import load_dotenv

load_dotenv()

T = TypeVar("T")
logger = logging.getLogger()


def _handle_errors(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except ValidationError as e:
            logger.warning(f"Invalid output {e}")
            raise RetryableError(ApiErrorCode.CLIENT_ERROR, str(e))
        except ValueError as e:
            logger.warning(f"Invalid output {e}")
            raise RetryableError(ApiErrorCode.CLIENT_ERROR, str(e))
        except LengthFinishReasonError as e:
            logger.warning(f"Could not parse response content as the length limit was reached: {e}")
            raise RetryableError(ApiErrorCode.CLIENT_ERROR, str(e))
        except RateLimitError as e:
            logger.warning(f"Rate limit exceeded: {e}")
            raise RetryableError(ApiErrorCode.RATE_LIMITED, str(e))
        except APITimeoutError as e:
            logger.error(f"Request timeout: {e}")
            raise RetryableError(ApiErrorCode.TIMEOUT, str(e))
        except APIConnectionError as e:
            logger.error(f"Network error: {e}")
            raise RetryableError(ApiErrorCode.NETWORK_ERROR, str(e))
        except APIStatusError as e:
            if 500 <= e.status_code < 600:
                logger.error(f"Server error ({e.status_code}): {e}")
                raise RetryableError(ApiErrorCode.SERVER_ERROR, str(e))
            elif e.status_code == 401:
                logger.critical(f"Authentication failed: {e}")
                raise ApiError(ApiErrorCode.AUTH_ERROR, "Ошибка аутентификации")
            else:
                logger.error(f"Client error ({e.status_code}): {e}")
                raise ApiError(ApiErrorCode.CLIENT_ERROR, str(e))
        except APIError as e:
            logger.error(f"OpenAI API error: {e}")
            raise ApiError(ApiErrorCode.INVALID_RESPONSE, str(e))

    return wrapper


def _ahandle_errors(func):
    if inspect.isasyncgenfunction(func): 
        @functools.wraps(func)
        async def awrapper(*args, **kwargs):
            try:
                async for item in func(*args, **kwargs):
                    yield item
            except Exception as e:
                _handle_errors(e)
    else:
        @functools.wraps(func)
        async def awrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                _handle_errors(e)
    return awrapper


def _sync_retry(
    *,
    attempts: int = 5,
    min_wait: float = 1.0,
    max_wait: float = 60.0,
) -> Callable[[Callable[..., T]], Callable[..., T]]:

    def decorator(fn: Callable[..., T]) -> Callable[..., T]:
        @retry(
            retry=retry_if_exception_type(
                (
                    APIConnectionError,
                    APITimeoutError,
                    RetryableError,
                    RateLimitError,
                    APIStatusError,
                    ValidationError,
                    ValueError,
                    LengthFinishReasonError
                )
            ),
            reraise=True,
            wait=wait_exponential(multiplier=1.5, min=min_wait, max=max_wait),
            stop=stop_after_attempt(attempts),
        )
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def _async_retry(
    *,
    attempts: int = 5,
    min_wait: float = 1.0,
    max_wait: float = 60.0,
) -> Callable[[Callable[..., T]], Callable[..., T]]:

    def decorator(
        fn: Callable[..., T],
    ) -> Callable[..., T]:
        @functools.wraps(fn)
        async def wrapper(*args, **kwargs):
            async for attempt in AsyncRetrying(
                retry=retry_if_exception_type(
                    (
                        APIConnectionError,
                        APITimeoutError,
                        RetryableError,
                        RateLimitError,
                        APIStatusError,
                        ValidationError,
                        ValueError,
                        LengthFinishReasonError
                    )
                ),
                wait=wait_exponential(multiplier=1, min=min_wait, max=max_wait),
                stop=stop_after_attempt(attempts),
                reraise=True,
            ):
                with attempt:
                    result = await fn(*args, **kwargs)
            return result

        return wrapper

    return decorator


class BaseLLM:
    def __init__(
        self,
        model: str = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        max_retries: int = 3,
        timeout: float = 1200.0,
        retry_wait: float = 4.0,
        max_retry_wait: float = 10.0,
    ):
        """
        Инициализация клиента LLM.

        :param model: Имя модели OpenAI.
        :param api_key: API ключ OpenAI. Если не указан, будет использован ключ
        :base_url: Базовый URL OpenAI API. Если не указан, будет использован стандартный URL.
        :param max_retries: Максимальное количество попыток при ошибках.
        :param timeout: Таймаут для запросов к API.
        :param retry_wait: Начальное время ожидания между попытками.
        :param max_retry_wait: Максимальное время ожидания между попытками.
        """
        self.model = model
        self.max_retries = max_retries
        self.retry_wait = retry_wait
        self.max_retry_wait = max_retry_wait
        self.timeout = timeout

        _api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not _api_key:
            raise RuntimeError("API ключ не предоставлен.")

        self.client = OpenAI(api_key=_api_key, base_url=base_url, timeout=self.timeout)
        self.async_client = AsyncOpenAI(
            api_key=_api_key, base_url=base_url, timeout=self.timeout
        )

        self._sync_retry = _sync_retry(
            attempts=max_retries, min_wait=retry_wait, max_wait=max_retry_wait
        )
        self._async_retry = _async_retry(
            attempts=max_retries, min_wait=retry_wait, max_wait=max_retry_wait
        )

    @staticmethod
    def _with_context(
        system_prompt: str | None,
        prompt: str | None,
        context: list[dict[str, str]],
    ) -> list[Mapping[str, str]]:
        ctx = list(context)
        if system_prompt:
            ctx.insert(0, {"role": "system", "content": system_prompt})
        if prompt:
            ctx.append({"role": "user", "content": prompt})
        return ctx

    @_handle_errors
    def chat(
        self,
        system_prompt: str | None,
        prompt: str | None,
        context: Sequence[Mapping[str, str]],
        **conf: Dict[str, Any],
    ) -> str:
        """
        Синхронный вызов чата. Возвращает текстовый ответ.

        :param system_prompt: Системный промпт для модели.
        :param prompt: Пользовательский промпт.
        :param conf: Дополнительные параметры для API вызова.
        :return: Строка с ответом модели.
        """

        @self._sync_retry
        def _chat_completion():
            msg = self._with_context(system_prompt, prompt, context)
            response = self.client.chat.completions.create(
                model=self.model, messages=msg, **conf
            )
            return response.choices[0].message.content

        return _chat_completion()

    @_handle_errors
    def stream_chat(
        self,
        system_prompt: str | None,
        prompt: str | None,
        context: Sequence[Mapping[str, str]],
        **conf: Dict[str, Any],
    ) -> Iterator[str]:
        """
        Синхронный стриминг ответа от чата.

        :param system_prompt: Системный промпт для модели.
        :param prompt: Пользовательский промпт.
        :param conf: Дополнительные параметры для API вызова.
        :yields: Строки (чанки) ответа модели по мере их поступления.
        """

        @self._sync_retry
        def _stream_completion():
            msg = self._with_context(system_prompt, prompt, context)
            response = self.client.chat.completions.create(
                model=self.model, messages=msg, stream=True, **conf
            )
            return response

        stream = _stream_completion()
        for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                yield content

    @_handle_errors
    def structured_output(
        self,
        system_prompt: str,
        prompt: str,
        response_format: type[BaseModel],
        **conf: Dict[str, Any],
    ) -> BaseModel:
        """
        Синхронный вызов для получения структурированного ответа в формате Pydantic.

        :param system_prompt: Системный промпт для модели.
        :param prompt: Пользовательский промпт.
        :param response_model: Pydantic модель для валидации ответа.
        :param conf: Дополнительные параметры для API вызова.
        :return: Экземпляр Pydantic модели с данными ответа.
        """

        @self._sync_retry
        def _structured_completion():
            msg = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ]
            completion = self.client.beta.chat.completions.parse(
                model=self.model,
                messages=msg,
                response_format=response_format,
                **conf,
            )

            try:
                response = completion.choices[0].message.parsed
                return response
            except (ValidationError, json.JSONDecodeError) as e:
                raise EmptyResponseError(
                    ApiErrorCode.INVALID_RESPONSE, "Модель не вернула ответа"
                )

        return _structured_completion()

    @_ahandle_errors
    async def achat(
        self,
        system_prompt: str | None,
        prompt: str | None,
        context: Sequence[Mapping[str, str]],
        **conf: Dict[str, Any],
    ) -> str:
        """
        Асинхронный вызов чата. Возвращает текстовый ответ.

        :param system_prompt: Системный промпт для модели.
        :param prompt: Пользовательский промпт.
        :param conf: Дополнительные параметры для API вызова.
        :return: Строка с ответом модели.
        """

        @self._async_retry
        async def _achat_completion():
            msg = self._with_context(system_prompt, prompt, context)
            response = await self.async_client.chat.completions.create(
                model=self.model, messages=msg, **conf
            )
            return response.choices[0].message.content

        return await _achat_completion()

    @_ahandle_errors
    async def astream_chat(
        self,
        system_prompt: str | None,
        prompt: str | None,
        context: Sequence[Mapping[str, str]],
        **conf: Dict[str, Any],
    ) -> AsyncIterator[str]:
        """
        Асинхронный стриминг ответа от чата.

        :param system_prompt: Системный промпт для модели.
        :param prompt: Пользовательский промпт.
        :param conf: Дополнительные параметры для API вызова.
        :yields: Строки (чанки) ответа модели по мере их поступления.
        """

        @self._async_retry
        async def _astream_completion():
            msg = self._with_context(system_prompt, prompt, context)
            return await self.async_client.chat.completions.create(
                model=self.model, messages=msg, stream=True, **conf
            )

        stream = await _astream_completion()
        async for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                yield content
                
    @_ahandle_errors
    async def astructured_output(
        self,
        system_prompt: str,
        prompt: str,
        response_format: type[BaseModel],
        **conf: Dict[str, Any],
    ) -> BaseModel:
        """
        Асинхронный вызов для получения структурированного ответа в формате Pydantic.

        :param system_prompt: Системный промпт для модели.
        :param prompt: Пользовательский промпт.
        :param response_model: Pydantic модель для валидации ответа.
        :param conf: Дополнительные параметры для API вызова.
        :return: Экземпляр Pydantic модели с данными ответа.
        """

        @self._async_retry
        async def _astructured_completion():
            msg = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ]
            completion = await self.async_client.beta.chat.completions.parse(
                model=self.model,
                messages=msg,
                response_format=response_format,
                **conf,
            )
            try:
                response = completion.choices[0].message.parsed
                return response
            except (ValidationError, json.JSONDecodeError) as e:
                raise EmptyResponseError(
                    ApiErrorCode.INVALID_RESPONSE, "Модель не вернула ответа"
                )

        return await _astructured_completion()

    def close(self) -> None:
        """
        Закрывает HTTP-пулы sync-клиента.
        Вызывать, если объект создавался без контекст-менеджера.
        """
        try:
            self.client.close()
        except AttributeError:
            logger.error("The async client cannot be close")

    async def aclose(self) -> None:
        """
        Асинхронное закрытие HTTP-пулов async-клиента.
        """
        try:
            await self.async_client.close()
        except AttributeError:
            logger.error("The async client cannot be close")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.aclose()