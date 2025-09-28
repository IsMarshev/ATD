from __future__ import annotations

from functools import lru_cache

from .db.session import get_db
from .services.ai_service import AIService
from .services.document_service import DocumentService
from .services.export_service import ExportService


@lru_cache
def get_ai_service() -> AIService:
    return AIService.build()


def get_document_service() -> DocumentService:
    return DocumentService()


@lru_cache
def get_export_service() -> ExportService:
    return ExportService()


__all__ = [
    "get_db",
    "get_ai_service",
    "get_document_service",
    "get_export_service",
]
