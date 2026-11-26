from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import base64
import logging
from app.services.voice import generate_voice
from app.core import limits

router = APIRouter()
logger = logging.getLogger(__name__)

class VoiceRequest(BaseModel):
    analysis: dict
    treatment: dict
    language: str = "English"

@router.post("/generate")
async def generate_voice_report(request: VoiceRequest, http: Request):
    limits.require_access(http)
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
