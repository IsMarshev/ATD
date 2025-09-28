from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db.models import TestCase


def generate_test_case_number(session: Session) -> str:
    today = datetime.utcnow().strftime("%Y%m%d")
    stmt = select(func.count(TestCase.id)).where(
        func.strftime("%Y%m%d", TestCase.created_at) == today
    )
    sequence = session.execute(stmt).scalar_one()
    suffix = f"{sequence + 1:04d}"
    return f"TC-{today}-{suffix}"
