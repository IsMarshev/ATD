from __future__ import annotations

import csv
from dataclasses import dataclass
from io import BytesIO, StringIO
from typing import Iterable, Tuple

from openpyxl import Workbook

from ..db.models import TestCase
from ..schemas.test_case import ExportFormat


@dataclass
class ExportService:
    def export_test_case(self, test_case: TestCase, *, format: ExportFormat) -> Tuple[bytes, str, str]:
        if format == ExportFormat.csv:
            return self._export_csv(test_case)
        if format == ExportFormat.excel:
            return self._export_excel(test_case)
        if format in (ExportFormat.adaptavist, ExportFormat.zephyr):
            return self._export_csv(test_case)
        raise ValueError(f"Unsupported export format {format}")

    def _rows(self, test_case: TestCase) -> Iterable[dict]:
        created_at = test_case.created_at.strftime("%Y-%m-%d") if test_case.created_at else ""
        for step in test_case.steps:
            yield {
                "Test Case Number": test_case.number,
                "Created At": created_at,
                "Title": test_case.title,
                "Author": test_case.author or "",
                "Precondition": test_case.precondition or "",
                "Step #": step.order_index,
                "Action": step.action,
                "Expected Result": step.expected_result or "",
                "Postcondition": test_case.postcondition or "",
                "Status": test_case.status.value,
            }

    def _export_csv(self, test_case: TestCase) -> Tuple[bytes, str, str]:
        output = StringIO()
        rows = list(self._rows(test_case))
        if not rows:
            rows = [
                {
                    "Test Case Number": test_case.number,
                    "Created At": test_case.created_at.strftime("%Y-%m-%d") if test_case.created_at else "",
                    "Title": test_case.title,
                    "Author": test_case.author or "",
                    "Precondition": test_case.precondition or "",
                    "Step #": "",
                    "Action": "",
                    "Expected Result": "",
                    "Postcondition": test_case.postcondition or "",
                    "Status": test_case.status.value,
                }
            ]
        writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
        content = output.getvalue().encode("utf-8-sig")
        filename = f"{test_case.number}.csv"
        return content, "text/csv", filename

    def _export_excel(self, test_case: TestCase) -> Tuple[bytes, str, str]:
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "Test Cases"
        header = [
            "Test Case Number",
            "Created At",
            "Title",
            "Author",
            "Precondition",
            "Step #",
            "Action",
            "Expected Result",
            "Postcondition",
            "Status",
        ]
        sheet.append(header)
        for row in self._rows(test_case):
            sheet.append([row[column] for column in header])
        buffer = BytesIO()
        workbook.save(buffer)
        filename = f"{test_case.number}.xlsx"
        return buffer.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename
