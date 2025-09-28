from langchain_core.documents import Document
import json
import logging

import requests

logger = logging.getLogger(__name__)


class DoclingLoader:
    def __init__(self, url, file_path=None, mime_type=None, params=None):
        self.url = url.rstrip("/")
        self.file_path = file_path
        self.mime_type = mime_type

        self.params = params or {}

    def load(self) -> list[Document]:
        with open(self.file_path, "rb") as f:
            files = {
                "files": (
                    self.file_path,
                    f,
                    self.mime_type or "application/octet-stream",
                )
            }

            params = {"image_export_mode": "placeholder"}

            if self.params:
                if self.params.get("do_picture_description"):
                    params["do_picture_description"] = self.params.get(
                        "do_picture_description"
                    )

                    picture_description_mode = self.params.get(
                        "picture_description_mode", ""
                    ).lower()

                    if picture_description_mode == "local" and self.params.get(
                        "picture_description_local", {}
                    ):
                        params["picture_description_local"] = json.dumps(
                            self.params.get("picture_description_local", {})
                        )

                    elif picture_description_mode == "api" and self.params.get(
                        "picture_description_api", {}
                    ):
                        params["picture_description_api"] = json.dumps(
                            self.params.get("picture_description_api", {})
                        )

                params["do_ocr"] = self.params.get("do_ocr")

                params["force_ocr"] = self.params.get("force_ocr")

                if (
                    self.params.get("do_ocr")
                    and self.params.get("ocr_engine")
                    and self.params.get("ocr_lang")
                ):
                    params["ocr_engine"] = self.params.get("ocr_engine")
                    params["ocr_lang"] = [
                        lang.strip()
                        for lang in self.params.get("ocr_lang").split(",")
                        if lang.strip()
                    ]

                if self.params.get("pdf_backend"):
                    params["pdf_backend"] = self.params.get("pdf_backend")

                if self.params.get("table_mode"):
                    params["table_mode"] = self.params.get("table_mode")

                if self.params.get("pipeline"):
                    params["pipeline"] = self.params.get("pipeline")

            endpoint = f"{self.url}/v1alpha/convert/file"
            r = requests.post(endpoint, files=files, data=params)

        if r.ok:
            result = r.json()
            document_data = result.get("document", {})
            text = document_data.get("md_content", "<No text content found>")

            metadata = {"Content-Type": self.mime_type} if self.mime_type else {}

            logger.debug("Docling extracted text: %s", text)

            return [Document(page_content=text, metadata=metadata)]
        else:
            error_msg = f"Error calling Docling API: {r.reason}"
            if r.text:
                try:
                    error_data = r.json()
                    if "detail" in error_data:
                        error_msg += f" - {error_data['detail']}"
                except Exception:
                    error_msg += f" - {r.text}"
            raise Exception(f"Error calling Docling: {error_msg}")
