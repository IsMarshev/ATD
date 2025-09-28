from __future__ import annotations

from io import BytesIO
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..dependencies import get_db
from ..schemas.test_case import DatapoolRequest, DatapoolResponse, ExportFormat
from ..services.datapool_service import DatapoolService

router = APIRouter(prefix="/datapools", tags=["datapools"])


def _to_response(datapool) -> DatapoolResponse:
    return DatapoolResponse.model_validate(datapool)


@router.post("", response_model=DatapoolResponse)
def create_datapool(
    payload: DatapoolRequest,
    db: Session = Depends(get_db),
) -> DatapoolResponse:
    service = DatapoolService(db)
    datapool = service.create(payload)
    return _to_response(datapool)


@router.get("/{datapool_id}", response_model=DatapoolResponse)
def get_datapool(datapool_id: str, db: Session = Depends(get_db)) -> DatapoolResponse:
    service = DatapoolService(db)
    datapool = service.repo.get(datapool_id)
    if not datapool:
        raise HTTPException(status_code=404, detail="Datapool not found")
    return _to_response(datapool)


@router.get("/by-test-case/{test_case_id}", response_model=List[DatapoolResponse])
def list_datapools_for_test_case(
    test_case_id: str,
    db: Session = Depends(get_db),
) -> List[DatapoolResponse]:
    service = DatapoolService(db)
    datapools = service.repo.list_by_test_case(test_case_id)
    return [_to_response(dp) for dp in datapools]


@router.put("/{datapool_id}", response_model=DatapoolResponse)
def update_datapool(
    datapool_id: str,
    payload: DatapoolRequest,
    db: Session = Depends(get_db),
) -> DatapoolResponse:
    service = DatapoolService(db)
    datapool = service.repo.get(datapool_id)
    if not datapool:
        raise HTTPException(status_code=404, detail="Datapool not found")
    updated = service.update(datapool, payload)
    return _to_response(updated)


@router.delete("/{datapool_id}", status_code=204)
def delete_datapool(datapool_id: str, db: Session = Depends(get_db)) -> Response:
    service = DatapoolService(db)
    datapool = service.repo.get(datapool_id)
    if not datapool:
        raise HTTPException(status_code=404, detail="Datapool not found")
    service.delete(datapool)
    return Response(status_code=204)


@router.get("/{datapool_id}/export")
def export_datapool(
    datapool_id: str,
    format: ExportFormat = Query(ExportFormat.csv),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    service = DatapoolService(db)
    datapool = service.repo.get(datapool_id)
    if not datapool:
        raise HTTPException(status_code=404, detail="Datapool not found")
    if format in (ExportFormat.csv, ExportFormat.adaptavist, ExportFormat.zephyr):
        content, media_type, filename = service.export_csv(datapool)
    else:
        content, media_type, filename = service.export_excel(datapool)
    stream = BytesIO(content)
    return StreamingResponse(
        stream,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
