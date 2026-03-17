from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import base64
import logging
from app.services.voice import generate_voice

router = APIRouter()
logger = logging.getLogger(__name__)

class VoiceRequest(BaseModel):
    analysis: dict
    treatment: dict
    language: str = "English"

@router.post("/generate")
async def generate_voice_report(request: VoiceRequest):
    try:
        voice_bytes = await generate_voice(request.analysis, request.treatment, request.language)
        if not voice_bytes:
            raise HTTPException(status_code=500, detail="Voice generation failed")
        voice_base64 = base64.b64encode(voice_bytes).decode('utf-8')
        return {"voice_data": voice_base64}
    except Exception as e:
        logger.error(f"Voice endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
