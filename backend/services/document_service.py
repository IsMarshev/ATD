from __future__ import annotations

import json
import shutil
import uuid
from pathlib import Path
from typing import Optional

from fastapi import UploadFile

from ..config import get_settings
from ..retrival.loaders.main import DoclingLoader


class DocumentService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.storage_root = Path(self.settings.file_storage_root)
        self.storage_root.mkdir(parents=True, exist_ok=True)

    def save_upload(self, upload: UploadFile) -> dict:
        file_id = str(uuid.uuid4())
        suffix = Path(upload.filename or "").suffix
        stored_name = f"{file_id}{suffix}"
        stored_path = self.storage_root / stored_name
        with stored_path.open("wb") as out_file:
            shutil.copyfileobj(upload.file, out_file)
        text_content = self._extract_text(stored_path, upload.content_type)
        metadata = {
            "id": file_id,
            "name": upload.filename or stored_name,
            "mime_type": upload.content_type,
            "path": str(stored_path),
            "text": text_content,
        }
        self._write_metadata(file_id, metadata)
        return metadata

    def load_metadata(self, file_id: str) -> Optional[dict]:
        meta_path = self._metadata_path(file_id)
        if not meta_path.exists():
            return None
        with meta_path.open("r", encoding="utf-8") as infile:
            return json.load(infile)

    def _metadata_path(self, file_id: str) -> Path:
        return self.storage_root / f"{file_id}.json"

    def _write_metadata(self, file_id: str, metadata: dict) -> None:
        meta_path = self._metadata_path(file_id)
        with meta_path.open("w", encoding="utf-8") as outfile:
            json.dump(metadata, outfile, ensure_ascii=True, indent=2)

    def _extract_text(self, file_path: Path, mime_type: Optional[str]) -> Optional[str]:
        if not self.settings.docling_base_url:
            try:
                raw = file_path.read_bytes()
                return raw.decode("utf-8")
            except UnicodeDecodeError:
                return None
        loader = DoclingLoader(
            url=self.settings.docling_base_url,
            file_path=str(file_path),
            mime_type=mime_type,
        )
        try:
            documents = loader.load()
            if not documents:
                return None
            return documents[0].page_content
        except Exception:
            return None
