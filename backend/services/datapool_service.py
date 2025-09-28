from __future__ import annotations

import csv
from io import BytesIO, StringIO
from typing import Tuple

from openpyxl import Workbook
from sqlalchemy.orm import Session

from ..db.models import TestDataPool
from ..repositories.datapool_repository import TestDataPoolRepository
from ..schemas.test_case import DatapoolRequest


class DatapoolService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repo = TestDataPoolRepository(session)

    def create(self, request: DatapoolRequest) -> TestDataPool:
        datapool = self.repo.create(
            name=request.name,
            description=request.description,
            dataset=request.dataset,
            test_case_id=request.test_case_id,
        )
        self.session.commit()
        self.session.refresh(datapool)
        return datapool

    def update(self, datapool: TestDataPool, request: DatapoolRequest) -> TestDataPool:
        payload = request.model_dump(exclude_none=True)
        updated = self.repo.update(datapool, payload)
        self.session.commit()
        self.session.refresh(updated)
        return updated

    def export_csv(self, datapool: TestDataPool) -> Tuple[bytes, str, str]:
        output = StringIO()
        dataset = datapool.dataset or []
        if dataset:
            fieldnames = list(dataset[0].keys())
        else:
            fieldnames = []
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        if fieldnames:
            writer.writeheader()
            writer.writerows(dataset)
        content = output.getvalue().encode("utf-8-sig")
        filename = f"{datapool.name}.csv"
        return content, "text/csv", filename

    def export_excel(self, datapool: TestDataPool) -> Tuple[bytes, str, str]:
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = datapool.name[:31] or "Datapool"
        dataset = datapool.dataset or []
        if dataset:
            header = list(dataset[0].keys())
            sheet.append(header)
            for row in dataset:
                sheet.append([row.get(column) for column in header])
        buffer = BytesIO()
        workbook.save(buffer)
        filename = f"{datapool.name}.xlsx"
        return (
            buffer.getvalue(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename,
        )

    def delete(self, datapool: TestDataPool) -> None:
        self.repo.delete(datapool)
        self.session.commit()
