from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import base64
import logging
from app.services import voice as voice_service
from app.services.voice import generate_voice
from app.core import limits
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

class VoiceRequest(BaseModel):
    analysis: dict
    treatment: dict
    language: str = "English"

@router.post("/generate")
async def generate_voice_report(request: VoiceRequest, http: Request):
    limits.require_access(http)
    if settings.PUBLIC_MODE and not settings.PUBLIC_VOICE_ENABLED:
        raise HTTPException(status_code=503, detail="Audio is not available in this demo.")
    # Audio already made for this exact report and language is returned without a provider call
    # and without using the voice allowance.
    peek = getattr(voice_service, "cached_voice", None)
    cached = peek(request.analysis, request.language) if peek else None
    if cached:
        return {"voice_data": base64.b64encode(cached).decode("utf-8")}
    if not limits.voice_allowed():
        raise HTTPException(status_code=429, detail="The voice report limit has been reached for now. Please try again later.")
    try:
        voice_bytes = await generate_voice(request.analysis, request.treatment, request.language)
        if not voice_bytes:
            raise HTTPException(status_code=500, detail="Voice generation failed")
        voice_base64 = base64.b64encode(voice_bytes).decode('utf-8')
        return {"voice_data": voice_base64}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Voice endpoint error: {e}")
        raise HTTPException(status_code=500, detail="Voice generation failed")
