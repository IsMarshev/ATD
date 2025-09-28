from __future__ import annotations

from pydantic import Field

from .base import ORMModel


class DocumentUploadResponse(ORMModel):
    id: str = Field(..., description="Internal identifier of the uploaded file")
    name: str
    mime_type: str | None = None
    path: str
    text: str | None = None
