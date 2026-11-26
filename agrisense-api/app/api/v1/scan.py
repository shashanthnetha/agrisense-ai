from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Request
from typing import Optional
import base64
import logging
from app.services.detection import analyze_image, AnalysisError
from app.services.rag import query_disease_knowledge
from app.services.treatment import generate_treatment, TreatmentError
from app.services.voice import generate_voice
from app.core import limits
from app.core.config import settings

# Heuristic cut-off on the model's own self-reported confidence (0-100).
# This number is not calibrated against labelled data; treat it as a safety net.
MIN_CONFIDENCE = 50

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/analyze")
async def analyze_crop(
    request: Request,
    image: UploadFile = File(...),
    language: str = Form("English")
):
    limits.require_access(request)
    limits.check_scan_allowed(request)
    try:
        contents = await image.read()
        if len(contents) > settings.MAX_UPLOAD_MB * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail=f"That photo is too large. Please use a photo under {settings.MAX_UPLOAD_MB} MB.",
            )
        analysis = await analyze_image(contents)

        if not isinstance(analysis.get("is_plant"), bool):
            raise AnalysisError("Analysis is missing is_plant")

        if analysis.get("is_plant") is False:
            return {
                "status": "not_a_plant",
                "message": "This does not look like a plant or leaf. Please upload a clear photo of the affected crop.",
                "analysis": analysis,
                "treatment": None,
                "voice_data": None,
            }

        confidence = analysis.get("confidence")
        if not isinstance(confidence, (int, float)) or confidence < MIN_CONFIDENCE:
            return {
                "status": "uncertain",
                "message": "We are not confident about this diagnosis. Please retake the photo in good light, close to a single affected leaf.",
                "analysis": analysis,
                "treatment": None,
                "voice_data": None,
            }

        # Only an explicit disease_detected == False is a healthy result.
        if not isinstance(analysis.get("disease_detected"), bool):
            raise AnalysisError("Analysis is missing disease_detected")
        if analysis.get("disease_detected") is False:
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
        
        try:
            treatment = await generate_treatment(analysis, rag_context)
        except TreatmentError:
            # Keep the diagnosis; say plainly that the treatment plan is unavailable.
            return {
                "status": "disease_detected",
                "analysis": analysis,
                "treatment": None,
                "treatment_message": "Treatment advice is unavailable right now. Please try again, or ask a local agriculture officer.",
                "voice_data": None,
            }
        # Skip voice (not the scan) once this month's voice allowance is used up.
        voice_bytes = await generate_voice(analysis, treatment, language) if limits.voice_allowed() else None
        
        voice_base64 = None
        if voice_bytes:
            voice_base64 = base64.b64encode(voice_bytes).decode('utf-8')
            
        return {
            "status": "disease_detected",
            "analysis": analysis,
            "treatment": treatment,
            "voice_data": voice_base64
        }
        
    except HTTPException:
        raise
    except AnalysisError:
        raise HTTPException(
            status_code=502,
            detail="We could not analyze this image. Please try again with a clear, well-lit photo of a single leaf.",
        )
    except Exception:
        logger.exception("Scan endpoint error")
        raise HTTPException(
            status_code=500,
            detail="Something went wrong while processing your scan. Please try again.",
        )
