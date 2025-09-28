from __future__ import annotations

import enum
from typing import List, Optional

from sqlalchemy import Enum, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDMixin


class TestCaseStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    archived = "archived"


class DocumentSourceType(str, enum.Enum):
    upload = "upload"
    url = "url"
    manual = "manual"


class TestCase(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "test_cases"

    number: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    summary: Mapped[Optional[str]] = mapped_column(Text())
    author: Mapped[Optional[str]] = mapped_column(String(128))
    precondition: Mapped[Optional[str]] = mapped_column(Text())
    postcondition: Mapped[Optional[str]] = mapped_column(Text())
    status: Mapped[TestCaseStatus] = mapped_column(
        Enum(TestCaseStatus, native_enum=False), default=TestCaseStatus.draft, nullable=False
    )
    requirement_context: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    source_urls: Mapped[List[str]] = mapped_column(JSON, default=list)
    version: Mapped[int] = mapped_column(Integer, default=1)
    latest_generation_summary: Mapped[Optional[str]] = mapped_column(Text())
    change_hash: Mapped[Optional[str]] = mapped_column(String(128))

    steps: Mapped[List["TestCaseStep"]] = relationship(
        back_populates="test_case", cascade="all, delete-orphan", order_by="TestCaseStep.order_index"
    )
    documents: Mapped[List["SourceDocument"]] = relationship(
        back_populates="test_case", cascade="all, delete-orphan"
    )
    datapools: Mapped[List["TestDataPool"]] = relationship(
        back_populates="test_case", cascade="all, delete-orphan"
    )
    revisions: Mapped[List["TestCaseRevision"]] = relationship(
        back_populates="test_case", cascade="all, delete-orphan", order_by="desc(TestCaseRevision.created_at)"
    )


class TestCaseStep(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "test_case_steps"

    test_case_id: Mapped[str] = mapped_column(
        ForeignKey("test_cases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    action: Mapped[str] = mapped_column(Text(), nullable=False)
    expected_result: Mapped[Optional[str]] = mapped_column(Text())
    notes: Mapped[Optional[str]] = mapped_column(Text())

    test_case: Mapped[TestCase] = relationship(back_populates="steps")


class SourceDocument(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "source_documents"

    test_case_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("test_cases.id", ondelete="SET NULL"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    mime_type: Mapped[Optional[str]] = mapped_column(String(128))
    location: Mapped[str] = mapped_column(String(1024))
    source_type: Mapped[DocumentSourceType] = mapped_column(
        Enum(DocumentSourceType, native_enum=False), default=DocumentSourceType.upload, nullable=False
    )
    text_content: Mapped[Optional[str]] = mapped_column(Text())

    test_case: Mapped[Optional[TestCase]] = relationship(back_populates="documents")


class TestCaseRevision(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "test_case_revisions"

    test_case_id: Mapped[str] = mapped_column(
        ForeignKey("test_cases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text())
    changes: Mapped[dict] = mapped_column(JSON, default=dict)

    test_case: Mapped[TestCase] = relationship(back_populates="revisions")


class TestDataPool(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "test_data_pools"

    test_case_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("test_cases.id", ondelete="SET NULL"), index=True
    )
    name: Mapped[str] = mapped_column(String(128))
    description: Mapped[Optional[str]] = mapped_column(Text())
    dataset: Mapped[list] = mapped_column(JSON, default=list)

    test_case: Mapped[Optional[TestCase]] = relationship(back_populates="datapools")
