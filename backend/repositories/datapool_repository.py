from __future__ import annotations

from typing import Iterable, List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db.models import TestDataPool


class TestDataPoolRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(
        self,
        *,
        name: str,
        description: Optional[str],
        dataset: Iterable[dict],
        test_case_id: Optional[str],
    ) -> TestDataPool:
        datapool = TestDataPool(
            name=name,
            description=description,
            dataset=list(dataset),
            test_case_id=test_case_id,
        )
        self.session.add(datapool)
        self.session.flush()
        return datapool

    def get(self, datapool_id: str) -> Optional[TestDataPool]:
        stmt = select(TestDataPool).where(TestDataPool.id == datapool_id)
        return self.session.execute(stmt).scalar_one_or_none()

    def list_by_test_case(self, test_case_id: str) -> List[TestDataPool]:
        stmt = select(TestDataPool).where(TestDataPool.test_case_id == test_case_id)
        return self.session.execute(stmt).scalars().all()

    def update(self, datapool: TestDataPool, payload: dict) -> TestDataPool:
        for key, value in payload.items():
            if value is not None:
                setattr(datapool, key, value)
        self.session.add(datapool)
        self.session.flush()
        return datapool

    def delete(self, datapool: TestDataPool) -> None:
        self.session.delete(datapool)
        self.session.flush()
