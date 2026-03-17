from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from typing import Optional
import base64
import logging
from app.services.detection import analyze_image
from app.services.rag import query_disease_knowledge
from app.services.treatment import generate_treatment
from app.services.voice import generate_voice

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/analyze")
async def analyze_crop(
    image: UploadFile = File(...),
    language: str = Form("English")
):
    try:
        contents = await image.read()
        analysis = await analyze_image(contents)
        
        if not analysis.get("disease_detected"):
            return {
                "status": "healthy",
                "analysis": analysis,
                "treatment": None,
                "voice_data": None
            }
            
        rag_context = await query_disease_knowledge(
            disease=analysis.get("disease_name"),
            crop=analysis.get("crop_type")
        )
        
        treatment = await generate_treatment(analysis, rag_context)
        voice_bytes = await generate_voice(analysis, treatment, language)
        
        voice_base64 = None
        if voice_bytes:
            voice_base64 = base64.b64encode(voice_bytes).decode('utf-8')
            
        return {
            "status": "disease_detected",
            "analysis": analysis,
            "treatment": treatment,
            "voice_data": voice_base64
        }
        
    except Exception as e:
        logger.error(f"Scan endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
