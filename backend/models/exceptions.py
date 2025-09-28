from typing import Optional
import httpx
from enum import IntEnum


class ApiErrorCode(IntEnum):
    NETWORK_ERROR = 503
    TIMEOUT = 504
    INVALID_RESPONSE = 502
    RATE_LIMITED = 429
    SERVER_ERROR = 500
    CLIENT_ERROR = 400
    AUTH_ERROR = 401


class ApiError(Exception):
    def __init__(
        self,
        code: ApiErrorCode,
        message: str,
        response: Optional[httpx.Response] = None,
    ):
        self.code = code
        self.message = message
        self.response = response
        super().__init__(message)


class EmptyResponseError(ApiError):
    pass


class RetryableError(ApiError):
    pass
