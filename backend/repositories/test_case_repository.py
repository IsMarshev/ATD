from __future__ import annotations

from typing import Iterable, List, Optional, Sequence

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from ..db.models import (
    DocumentSourceType,
    SourceDocument,
    TestCase,
    TestCaseRevision,
    TestCaseStatus,
    TestCaseStep,
)


class TestCaseRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(
        self,
        *,
        number: str,
        title: str,
        summary: Optional[str],
        author: Optional[str],
        precondition: Optional[str],
        postcondition: Optional[str],
        status: TestCaseStatus,
        requirement_context: Optional[dict],
        source_urls: Optional[Sequence[str]],
        latest_generation_summary: Optional[str],
        steps_payload: Iterable[dict],
    ) -> TestCase:
        test_case = TestCase(
            number=number,
            title=title,
            summary=summary,
            author=author,
            precondition=precondition,
            postcondition=postcondition,
            status=status,
            requirement_context=requirement_context or {},
            source_urls=list(source_urls or []),
            latest_generation_summary=latest_generation_summary,
        )
        for index, payload in enumerate(steps_payload, start=1):
            step = TestCaseStep(
                order_index=payload.get("order_index") or index,
                action=payload["action"],
                expected_result=payload.get("expected_result"),
                notes=payload.get("notes"),
            )
            test_case.steps.append(step)
        self.session.add(test_case)
        self.session.flush()
        return test_case

    def add_documents(
        self,
        test_case: TestCase,
        documents: Iterable[dict],
    ) -> None:
        for payload in documents:
            source_type = payload.get("source_type", DocumentSourceType.upload)
            if isinstance(source_type, str):
                source_type = DocumentSourceType(source_type)
            doc = SourceDocument(
                test_case=test_case,
                name=payload["name"],
                mime_type=payload.get("mime_type"),
                location=payload["location"],
                source_type=source_type,
                text_content=payload.get("text_content"),
            )
            self.session.add(doc)

    def get(self, test_case_id: str) -> Optional[TestCase]:
        stmt = select(TestCase).where(TestCase.id == test_case_id)
        result = self.session.execute(stmt).scalar_one_or_none()
        return result

    def get_step(self, step_id: str) -> Optional[TestCaseStep]:
        stmt = select(TestCaseStep).where(TestCaseStep.id == step_id)
        return self.session.execute(stmt).scalar_one_or_none()

    def list(self, *, skip: int = 0, limit: int = 50) -> tuple[List[TestCase], int]:
        stmt = select(TestCase).order_by(desc(TestCase.created_at)).offset(skip).limit(limit)
        items = self.session.execute(stmt).scalars().all()
        total = self.session.execute(select(func.count(TestCase.id))).scalar_one()
        return items, total

    def update(self, test_case: TestCase, payload: dict) -> TestCase:
        for key, value in payload.items():
            if value is not None:
                setattr(test_case, key, value)
        self.session.add(test_case)
        self.session.flush()
        return test_case

    def update_step(self, step: TestCaseStep, payload: dict) -> TestCaseStep:
        for key, value in payload.items():
            if value is not None:
                setattr(step, key, value)
        if payload.get("order_index"):
            self._reorder_steps(step.test_case, step)
        self.session.add(step)
        self.session.flush()
        return step

    def replace_steps(self, test_case: TestCase, steps_payload: Sequence[dict]) -> None:
        test_case.steps.clear()
        for index, payload in enumerate(steps_payload, start=1):
            step = TestCaseStep(
                test_case=test_case,
                order_index=payload.get("order_index") or index,
                action=payload["action"],
                expected_result=payload.get("expected_result"),
                notes=payload.get("notes"),
            )
            self.session.add(step)
        self.session.flush()

    def create_revision(
        self,
        test_case: TestCase,
        *,
        summary: Optional[str],
        changes: dict,
    ) -> TestCaseRevision:
        test_case.version += 1
        revision = TestCaseRevision(
            test_case=test_case,
            version=test_case.version,
            summary=summary,
            changes=changes,
        )
        self.session.add(revision)
        self.session.flush()
        return revision

    def _reorder_steps(self, test_case: TestCase, updated_step: TestCaseStep) -> None:
        ordered = sorted(test_case.steps, key=lambda s: s.order_index)
        for index, step in enumerate(ordered, start=1):
            step.order_index = index
            self.session.add(step)
        self.session.flush()
