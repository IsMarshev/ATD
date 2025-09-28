from __future__ import annotations

from typing import Iterable, List, Optional

from sqlalchemy.orm import Session

from ..db.models import TestCase, TestCaseStatus, TestCaseStep
from ..repositories.datapool_repository import TestDataPoolRepository
from ..repositories.test_case_repository import TestCaseRepository
from ..schemas.test_case import (
    DiffGenerationRequest,
    StepPayload,
    StepUpdatePayload,
    TestCaseGenerationRequest,
    TestCaseUpdatePayload,
)
from ..utils.identifiers import generate_test_case_number
from .ai_service import AIService, GeneratedDiff, GeneratedTestCase


class TestCaseService:
    def __init__(self, session: Session, ai_service: Optional[AIService] = None) -> None:
        self.session = session
        self.repo = TestCaseRepository(session)
        self.datapools = TestDataPoolRepository(session)
        self.ai = ai_service or AIService.build()

    def generate_via_ai(
        self,
        request: TestCaseGenerationRequest,
        *,
        documents_payload: Optional[List[dict]] = None,
    ) -> TestCase:
        generated = self.ai.generate_test_case(request)
        try:
            status = TestCaseStatus(generated.status) if generated.status else TestCaseStatus.draft
        except ValueError:
            status = TestCaseStatus.draft
        number = generate_test_case_number(self.session)
        context_dump = request.context.model_dump()
        source_urls = [str(url) for url in request.context.urls]

        steps_payload = [
            {
                "order_index": index,
                "action": step.action,
                "expected_result": step.expected_result,
                "notes": step.notes,
            }
            for index, step in enumerate(generated.steps, start=1)
        ]

        test_case = self.repo.create(
            number=number,
            title=generated.title,
            summary=generated.summary,
            author=request.author,
            precondition=generated.precondition,
            postcondition=generated.postcondition,
            status=status,
            requirement_context=context_dump,
            source_urls=source_urls,
            latest_generation_summary=generated.generation_summary,
            steps_payload=steps_payload,
        )

        if documents_payload:
            self.repo.add_documents(test_case, documents_payload)

        for datapool in generated.datapools:
            self.datapools.create(
                name=datapool.name,
                description=datapool.description,
                dataset=datapool.dataset,
                test_case_id=test_case.id,
            )

        self.repo.create_revision(
            test_case,
            summary=generated.generation_summary or "Initial AI generation",
            changes={"type": "initial_generation"},
        )
        self.session.commit()
        self.session.refresh(test_case)
        return test_case

    def list(self, *, skip: int = 0, limit: int = 50) -> tuple[List[TestCase], int]:
        return self.repo.list(skip=skip, limit=limit)

    def get(self, test_case_id: str) -> Optional[TestCase]:
        return self.repo.get(test_case_id)

    def update(self, test_case: TestCase, payload: TestCaseUpdatePayload) -> TestCase:
        update_data = payload.model_dump(exclude_none=True)
        if "status" in update_data:
            update_data["status"] = TestCaseStatus(update_data["status"])
        updated = self.repo.update(test_case, update_data)
        self.session.commit()
        self.session.refresh(updated)
        return updated

    def update_step(self, step: TestCaseStep, payload: StepUpdatePayload) -> TestCaseStep:
        update_data = payload.model_dump(exclude_none=True)
        updated = self.repo.update_step(step, update_data)
        self.session.commit()
        self.session.refresh(updated)
        return updated

    def regenerate_diff(self, request: DiffGenerationRequest) -> TestCase:
        test_case = self.repo.get(request.test_case_id)
        if not test_case:
            raise ValueError("Test case not found")
        existing_steps = [
            {
                "order_index": step.order_index,
                "action": step.action,
                "expected_result": step.expected_result,
                "notes": step.notes,
            }
            for step in test_case.steps
        ]
        document_snippets = [
            (doc.text or f"See reference {doc.name}") for doc in request.documents
        ]
        diff = self.ai.generate_diff(
            existing_steps=existing_steps,
            context=request.context,
            documents=document_snippets,
        )
        self._apply_diff(test_case, diff)

        if diff.summary:
            test_case.latest_generation_summary = diff.summary
        if diff.precondition:
            test_case.precondition = diff.precondition
        if diff.postcondition:
            test_case.postcondition = diff.postcondition

        self.repo.create_revision(
            test_case,
            summary=diff.summary or "AI generated update",
            changes=diff.model_dump(),
        )
        self.session.commit()
        self.session.refresh(test_case)
        return test_case

    def _apply_diff(self, test_case: TestCase, diff: GeneratedDiff) -> None:
        steps_by_order = {step.order_index: step for step in test_case.steps}
        for change in diff.steps:
            change_type = (change.change_type or "").strip().lower()
            if change_type == "update" and change.order_index:
                step = steps_by_order.get(change.order_index)
                if not step:
                    continue
                if change.action:
                    step.action = change.action
                if change.expected_result is not None:
                    step.expected_result = change.expected_result
                if change.notes is not None:
                    step.notes = change.notes
            elif change_type == "remove" and change.order_index:
                step = steps_by_order.get(change.order_index)
                if step:
                    self.session.delete(step)
                    steps_by_order.pop(change.order_index, None)
            elif change_type == "add":
                order_index = change.order_index or (len(test_case.steps) + 1)
                action = change.action or ""
                new_step = TestCaseStep(
                    test_case=test_case,
                    order_index=order_index,
                    action=action,
                    expected_result=change.expected_result,
                    notes=change.notes,
                )
                self.session.add(new_step)
        self.session.flush()
        ordered_steps = sorted(test_case.steps, key=lambda s: s.order_index)
        for index, step in enumerate(ordered_steps, start=1):
            if step.order_index != index:
                step.order_index = index
                self.session.add(step)
        self.session.flush()

    def replace_steps(self, test_case: TestCase, steps: Iterable[StepPayload]) -> TestCase:
        payload = [item.model_dump() for item in steps]
        self.repo.replace_steps(test_case, payload)
        self.session.commit()
        self.session.refresh(test_case)
        return test_case
