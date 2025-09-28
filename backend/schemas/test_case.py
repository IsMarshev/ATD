from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import Field, HttpUrl, model_validator

from .base import ORMModel


class TestCaseStatusEnum(str, Enum):
    draft = "draft"
    active = "active"
    archived = "archived"


class ExportFormat(str, Enum):
    adaptavist = "adaptavist"
    zephyr = "zephyr"
    excel = "excel"
    csv = "csv"


class DocumentSourceTypeEnum(str, Enum):
    upload = "upload"
    url = "url"
    manual = "manual"


class DocumentInput(ORMModel):
    name: str = Field(..., description="Human readable name of the document")
    source_type: DocumentSourceTypeEnum = DocumentSourceTypeEnum.manual
    text: Optional[str] = Field(None, description="Plain text contents when available")
    url: Optional[HttpUrl] = Field(None, description="Remote URL if the document is hosted externally")
    file_id: Optional[str] = Field(None, description="Identifier of the uploaded file in storage")
    mime_type: Optional[str] = None

    @model_validator(mode="after")
    def validate_payload(cls, values: "DocumentInput") -> "DocumentInput":
        if not any([values.text, values.url, values.file_id]):
            raise ValueError("DocumentInput requires text, url or file_id")
        return values


class ContextBundle(ORMModel):
    functional_requirements: List[str] = Field(default_factory=list)
    functional_scenarios: List[str] = Field(default_factory=list)
    user_scenarios: List[str] = Field(default_factory=list)
    product_specs: List[str] = Field(default_factory=list)
    acceptance_criteria: List[str] = Field(default_factory=list)
    technical_constraints: List[str] = Field(default_factory=list)
    urls: List[HttpUrl] = Field(default_factory=list)
    raw_context: List[str] = Field(default_factory=list)


class StepPayload(ORMModel):
    order_index: Optional[int] = Field(None, ge=1)
    action: str = Field(..., description="Step action")
    expected_result: Optional[str] = None
    notes: Optional[str] = None


class DatapoolHint(ORMModel):
    name: str
    description: Optional[str] = None
    columns: List[str] = Field(default_factory=list)
    sample_rows: List[dict] = Field(default_factory=list)


class TestCaseGenerationRequest(ORMModel):
    requested_title: Optional[str] = Field(
        None, description="Desired title of the generated test case"
    )
    objective: Optional[str] = Field(None, description="Business objective for the test case")
    author: Optional[str] = None
    context: ContextBundle
    documents: List[DocumentInput] = Field(default_factory=list)
    datapool_hints: List[DatapoolHint] = Field(default_factory=list)


class StepUpdatePayload(ORMModel):
    action: Optional[str] = None
    expected_result: Optional[str] = None
    notes: Optional[str] = None
    order_index: Optional[int] = Field(None, ge=1)


class TestCaseUpdatePayload(ORMModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    author: Optional[str] = None
    precondition: Optional[str] = None
    postcondition: Optional[str] = None
    status: Optional[TestCaseStatusEnum] = None


class DiffGenerationRequest(ORMModel):
    test_case_id: str
    context: ContextBundle
    documents: List[DocumentInput] = Field(default_factory=list)
    existing_steps: List[StepPayload] = Field(default_factory=list)


class RevisionResponse(ORMModel):
    id: str
    version: int
    summary: Optional[str]
    changes: dict
    created_at: datetime


class StepResponse(ORMModel):
    id: str
    order_index: int
    action: str
    expected_result: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]


class TestCaseResponse(ORMModel):
    id: str
    number: str
    title: str
    summary: Optional[str]
    author: Optional[str]
    precondition: Optional[str]
    postcondition: Optional[str]
    status: TestCaseStatusEnum
    requirement_context: Optional[dict]
    source_urls: List[str]
    version: int
    latest_generation_summary: Optional[str]
    steps: List[StepResponse]
    revisions: List[RevisionResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: Optional[datetime]


class TestCaseListResponse(ORMModel):
    items: List[TestCaseResponse]
    total: int


class ExportOptions(ORMModel):
    format: ExportFormat = ExportFormat.excel
    filename: Optional[str] = None


class DatapoolRecord(ORMModel):
    values: dict


class DatapoolRequest(ORMModel):
    test_case_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    dataset: List[dict]


class DatapoolResponse(ORMModel):
    id: str
    test_case_id: Optional[str]
    name: str
    description: Optional[str]
    dataset: List[dict]
    created_at: datetime
    updated_at: Optional[datetime]
