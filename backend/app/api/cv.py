from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.config import settings
from app.schemas.cv import CVExtractionResponse
from app.services.cv_service import cv_service

router = APIRouter(prefix="/cv", tags=["Phân tích CV"])


@router.post("/upload", response_model=CVExtractionResponse, summary="Upload và trích xuất thông tin CV")
async def upload_cv(file: UploadFile = File(...)):
    filename = file.filename or ""
    if not filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file định dạng .pdf hoặc .docx")

    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    content = await file.read(max_bytes + 1)  # đọc dư 1 byte để biết có vượt giới hạn không
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File vượt quá {settings.MAX_UPLOAD_MB}MB")

    return await cv_service.parse_cv(content, filename)
