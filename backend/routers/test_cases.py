from __future__ import annotations

from typing import List
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..dependencies import (
    get_ai_service,
    get_db,
    get_document_service,
    get_export_service,
)
from ..schemas.test_case import (
    DiffGenerationRequest,
    DocumentInput,
    ExportFormat,
    StepUpdatePayload,
    TestCaseGenerationRequest,
    TestCaseListResponse,
    TestCaseResponse,
    TestCaseUpdatePayload,
)
from ..services.ai_service import AIService
from ..services.document_service import DocumentService
from ..services.export_service import ExportService
from ..services.test_case_service import TestCaseService

router = APIRouter(prefix="/test-cases", tags=["test-cases"])


def _to_response(test_case) -> TestCaseResponse:
    return TestCaseResponse.model_validate(test_case)


@router.post("/generate", response_model=TestCaseResponse)
def generate_test_case(
    request: TestCaseGenerationRequest,
    db: Session = Depends(get_db),
    ai_service: AIService = Depends(get_ai_service),
    document_service: DocumentService = Depends(get_document_service),
) -> TestCaseResponse:
    documents_for_service: List[dict] = []
    enriched_documents: List[DocumentInput] = []
    for document in request.documents:
        doc_payload = document.model_dump()
        if document.file_id:
            metadata = document_service.load_metadata(document.file_id)
            if not metadata:
                raise HTTPException(status_code=404, detail=f"Document {document.file_id} not found")
            doc_payload["text"] = metadata.get("text")
            doc_payload["mime_type"] = metadata.get("mime_type")
            documents_for_service.append(
                {
                    "name": metadata.get("name", document.name),
                    "mime_type": metadata.get("mime_type"),
                    "location": metadata.get("path"),
                    "source_type": document.source_type.value,
                    "text_content": metadata.get("text"),
                }
            )
        else:
            documents_for_service.append(
                {
                    "name": document.name,
                    "mime_type": document.mime_type,
                    "location": document.url or "inline",
                    "source_type": document.source_type.value,
                    "text_content": document.text,
                }
            )
        enriched_documents.append(DocumentInput(**doc_payload))
    enriched_request = TestCaseGenerationRequest(
        requested_title=request.requested_title,
        objective=request.objective,
        author=request.author,
        context=request.context,
        documents=enriched_documents,
        datapool_hints=request.datapool_hints,
    )

    service = TestCaseService(db, ai_service)
    test_case = service.generate_via_ai(
        enriched_request,
        documents_payload=documents_for_service,
    )
    return _to_response(test_case)


@router.get("", response_model=TestCaseListResponse)
def list_test_cases(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    ai_service: AIService = Depends(get_ai_service),
) -> TestCaseListResponse:
    service = TestCaseService(db, ai_service)
    items, total = service.list(skip=skip, limit=limit)
    return TestCaseListResponse(items=[_to_response(item) for item in items], total=total)


@router.get("/{test_case_id}", response_model=TestCaseResponse)
def get_test_case(
    test_case_id: str,
    db: Session = Depends(get_db),
    ai_service: AIService = Depends(get_ai_service),
) -> TestCaseResponse:
    service = TestCaseService(db, ai_service)
    test_case = service.get(test_case_id)
    if not test_case:
        raise HTTPException(status_code=404, detail="Test case not found")
    return _to_response(test_case)


@router.patch("/{test_case_id}", response_model=TestCaseResponse)
def update_test_case(
    test_case_id: str,
    payload: TestCaseUpdatePayload,
    db: Session = Depends(get_db),
    ai_service: AIService = Depends(get_ai_service),
) -> TestCaseResponse:
    service = TestCaseService(db, ai_service)
    test_case = service.get(test_case_id)
    if not test_case:
        raise HTTPException(status_code=404, detail="Test case not found")
    updated = service.update(test_case, payload)
    return _to_response(updated)


@router.patch("/{test_case_id}/steps/{step_id}", response_model=TestCaseResponse)
def update_test_step(
    test_case_id: str,
    step_id: str,
    payload: StepUpdatePayload,
    db: Session = Depends(get_db),
    ai_service: AIService = Depends(get_ai_service),
) -> TestCaseResponse:
    service = TestCaseService(db, ai_service)
    test_case = service.get(test_case_id)
    if not test_case:
        raise HTTPException(status_code=404, detail="Test case not found")
    step = next((item for item in test_case.steps if item.id == step_id), None)
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    service.update_step(step, payload)
    refreshed = service.get(test_case_id)
    return _to_response(refreshed)


@router.post("/{test_case_id}/diff", response_model=TestCaseResponse)
def generate_diff(
    test_case_id: str,
    payload: DiffGenerationRequest,
    db: Session = Depends(get_db),
    ai_service: AIService = Depends(get_ai_service),
    document_service: DocumentService = Depends(get_document_service),
) -> TestCaseResponse:
    if payload.test_case_id != test_case_id:
        raise HTTPException(status_code=400, detail="Mismatched test case id")
    documents = []
    for document in payload.documents:
        if document.file_id:
            metadata = document_service.load_metadata(document.file_id)
            if not metadata:
                raise HTTPException(status_code=404, detail=f"Document {document.file_id} not found")
            documents.append(DocumentInput(**{
                **document.model_dump(),
                "text": metadata.get("text"),
                "mime_type": metadata.get("mime_type"),
            }))
        else:
            documents.append(document)
    enriched_payload = DiffGenerationRequest(
        test_case_id=payload.test_case_id,
        context=payload.context,
        documents=documents,
        existing_steps=payload.existing_steps,
    )
    service = TestCaseService(db, ai_service)
    updated = service.regenerate_diff(enriched_payload)
    return _to_response(updated)


@router.get("/{test_case_id}/export")
def export_test_case(
    test_case_id: str,
    format: ExportFormat = Query(ExportFormat.excel),
    db: Session = Depends(get_db),
    ai_service: AIService = Depends(get_ai_service),
    export_service: ExportService = Depends(get_export_service),
) -> StreamingResponse:
    service = TestCaseService(db, ai_service)
    test_case = service.get(test_case_id)
    if not test_case:
        raise HTTPException(status_code=404, detail="Test case not found")
    content, media_type, filename = export_service.export_test_case(test_case, format=format)
    stream = BytesIO(content)
    return StreamingResponse(
        stream,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
