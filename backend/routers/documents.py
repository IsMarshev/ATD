from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from ..dependencies import get_document_service
from ..schemas.document import DocumentUploadResponse
from ..services.document_service import DocumentService

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentUploadResponse)
def upload_document(
    file: UploadFile = File(...),
    document_service: DocumentService = Depends(get_document_service),
) -> DocumentUploadResponse:
    metadata = document_service.save_upload(file)
    return DocumentUploadResponse.model_validate(metadata)


@router.get("/{file_id}", response_model=DocumentUploadResponse)
def get_document(
    file_id: str,
    document_service: DocumentService = Depends(get_document_service),
) -> DocumentUploadResponse:
    metadata = document_service.load_metadata(file_id)
    if not metadata:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentUploadResponse.model_validate(metadata)
