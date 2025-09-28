from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

from pydantic import BaseModel, Field

from ..config import get_settings
from ..models.exceptions import ApiError, RetryableError
from ..models.llm_client import BaseLLM
from ..schemas.test_case import ContextBundle, TestCaseGenerationRequest


class GeneratedStep(BaseModel):
    action: str
    expected_result: Optional[str] = None
    notes: Optional[str] = None


class GeneratedDatapool(BaseModel):
    name: str
    description: Optional[str] = None
    dataset: List[dict] = Field(default_factory=list)


class GeneratedTestCase(BaseModel):
    title: str
    summary: Optional[str] = None
    precondition: Optional[str] = None
    postcondition: Optional[str] = None
    status: Optional[str] = None
    steps: List[GeneratedStep]
    datapools: List[GeneratedDatapool] = Field(default_factory=list)
    generation_summary: Optional[str] = None


class StepChange(BaseModel):
    change_type: str = Field(..., description="add | update | remove")
    order_index: Optional[int] = None
    action: Optional[str] = None
    expected_result: Optional[str] = None
    notes: Optional[str] = None


class GeneratedDiff(BaseModel):
    summary: Optional[str] = None
    precondition: Optional[str] = None
    postcondition: Optional[str] = None
    steps: List[StepChange] = Field(default_factory=list)


@dataclass
class AIService:
    model: BaseLLM

    @classmethod
    def build(cls) -> "AIService":
        settings = get_settings()
        llm = BaseLLM(
            model=settings.openai_model,
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
        )
        return cls(model=llm)

    def _render_context(self, context: ContextBundle) -> str:
        sections: List[str] = []
        mapping = {
            "Functional requirements": context.functional_requirements,
            "Functional scenarios": context.functional_scenarios,
            "User scenarios": context.user_scenarios,
            "Product specifications": context.product_specs,
            "Acceptance criteria": context.acceptance_criteria,
            "Technical constraints": context.technical_constraints,
            "Additional context": context.raw_context,
        }
        for title, values in mapping.items():
            if values:
                block = f"## {title}\n" + "\n".join(f"- {item}" for item in values)
                sections.append(block)
        if context.urls:
            sections.append("## Referenced URLs\n" + "\n".join(str(url) for url in context.urls))
        return "\n\n".join(sections)

    def generate_test_case(self, request: TestCaseGenerationRequest) -> GeneratedTestCase:
        context_block = self._render_context(request.context)
        documents_block = "\n\n".join(
            f"### Document: {doc.name}\n{doc.text or 'See attached reference'}"
            for doc in request.documents
            if doc.text
        )
        prompt_parts = [
            "You are an experienced QA lead. Create a complete manual test case given the project documentation.",
            "Follow industry best practices (clear steps, observable expected results).",
            "If context lacks information, note the assumptions in the summary.",
        ]
        if request.datapool_hints:
            prompt_parts.append(
                "Propose structured datapools (CSV friendly) if sample data is needed."
            )
        prompt_body = "\n".join(prompt_parts)

        user_prompt = (
            f"Project objective: {request.objective or 'Not specified'}\n"
            f"Requested title: {request.requested_title or 'Derive a clear title'}\n"
            f"Context: \n{context_block or 'No structured context provided.'}\n\n"
            f"Documents:\n{documents_block or 'No inline document excerpts.'}\n\n"
            "Return the response as structured JSON."
        )

        system_prompt = (
            "You produce consistent, unambiguous test cases ready for import into test-management tools."
            "Use declarative titles (<=120 chars). Steps must be atomic and start with a verb."
            "When generating datapools ensure column names are clear and data is synthetic."
        )
        try:
            response = self.model.structured_output(
                system_prompt=system_prompt,
                prompt=prompt_body + "\n\n" + user_prompt,
                response_format=GeneratedTestCase,
            )
            return response
        except (ApiError, RetryableError) as exc:
            raise

    def generate_diff(
        self,
        *,
        existing_steps: List[dict],
        context: ContextBundle,
        documents: List[str],
    ) -> GeneratedDiff:
        context_block = self._render_context(context)
        steps_block = "\n".join(
            f"{item['order_index']}. {item['action']} => {item.get('expected_result') or 'N/A'}"
            for item in existing_steps
        )
        documents_block = "\n\n".join(documents)

        user_prompt = (
            "Given the existing test case steps and the updated documentation, propose only the necessary changes.\n"
            "List added/updated/removed steps. Use order_index when referencing existing steps."
        )
        detail_prompt = (
            f"Existing steps:\n{steps_block or 'No steps found.'}\n\n"
            f"Updated context:\n{context_block or 'No structured context.'}\n\n"
            f"Document updates:\n{documents_block or 'No document excerpts provided.'}\n"
        )
        system_prompt = (
            "You are assisting with maintaining manual test cases. Respond with a concise change set."
            "Prefer updates over removal unless step is obsolete."
        )

        response = self.model.structured_output(
            system_prompt=system_prompt,
            prompt=user_prompt + "\n" + detail_prompt,
            response_format=GeneratedDiff,
        )
        return response
