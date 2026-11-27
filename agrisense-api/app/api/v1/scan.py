from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Request
from typing import Optional
import base64
import logging
from app.services.detection import analyze_image, AnalysisError, InvalidImage, validate_image
from app.services.rag import query_disease_knowledge, NO_MATCH_CONTEXT
from app.services.treatment import generate_treatment, TreatmentError
from app.services.voice import generate_voice
from app.core import limits
from app.core.config import settings

# Heuristic cut-off on the model's own self-reported confidence (0-100).
# This number is not calibrated against labelled data; treat it as a safety net.
MIN_CONFIDENCE = 50

router = APIRouter()
logger = logging.getLogger(__name__)

SUPPORTED_LANGUAGES = {"English", "Hindi", "Tamil", "Telugu"}
_active_scans = 0  # touched only on the event loop, with no await between check and change


class _ScanSlot:
    """Hold one of MAX_CONCURRENT_SCANS slots, or raise 503 at once instead of queueing."""

    async def __aenter__(self):
        global _active_scans
        if _active_scans >= settings.MAX_CONCURRENT_SCANS:
            raise HTTPException(status_code=503, detail="The service is busy with other scans. Please try again in a minute.")
        _active_scans += 1

    async def __aexit__(self, *exc):
        global _active_scans
        _active_scans -= 1


async def _read_limited(upload: UploadFile, limit: int) -> bytes:
    """Read an upload without ever holding more than limit bytes (+1 chunk) in memory."""
    chunks, total = [], 0
    while True:
        chunk = await upload.read(64 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > limit:
            raise HTTPException(
                status_code=413,
                detail=f"That photo is too large. Please use a photo under {settings.MAX_UPLOAD_MB} MB.",
            )
        chunks.append(chunk)
    return b"".join(chunks)

@router.post("/analyze")
async def analyze_crop(
    request: Request,
    image: UploadFile = File(...),
    language: str = Form("English")
):
    limits.require_access(request)
    if language not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail="That language is not supported.")
    # A busy refusal comes before the allowance is counted, so it costs the caller nothing.
    async with _ScanSlot():
        return await _analyze(request, image, language)


async def _analyze(request: Request, image: UploadFile, language: str):
    limits.check_scan_allowed(request)
    try:
        contents = await _read_limited(image, settings.MAX_UPLOAD_MB * 1024 * 1024)
        try:
            validate_image(contents)
        except InvalidImage:
            raise HTTPException(
                status_code=400,
                detail="That file is not a readable JPG or PNG photo. Please choose a photo of a leaf.",
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
            crop=analysis.get("crop_type"),
            symptoms=analysis.get("visible_symptoms"),
        )
        if rag_context == NO_MATCH_CONTEXT:
            # Nothing in the reference notes fits. Do not let the model write a plan from memory
            # and do not read one aloud: the diagnosis stays a reading to check, not a basis for treatment.
            return {
                "status": "disease_detected",
                "analysis": analysis,
                "treatment": None,
                "knowledge_match": "none",
                "treatment_message": "This problem is not in AgriSense's reference notes, so no treatment advice is given. Please show the leaf to a local agriculture officer.",
                "voice_data": None,
            }
        knowledge_match = "found"
        
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
            "knowledge_match": knowledge_match,
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
