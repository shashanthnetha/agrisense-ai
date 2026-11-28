from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Request
from typing import Optional
import base64
import logging
from app.services.detection import analyze_image, AnalysisError, InvalidImage, validate_image
from app.services.rag import query_disease_knowledge, verified_context_of, NO_MATCH_CONTEXT
from app.services.treatment import generate_treatment, TreatmentError
from app.core import cap, limits
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

@router.get("/status")
async def scan_status():
    """Secret-free service status so the web app can show an honest open/paused state up front.

    No counters, keys or provider details: only what a visitor needs to know before uploading.
    `open` means an upload can be attempted right now (the scan cap can still refuse it).
    """
    if not settings.GENERATION_ENABLED:
        return {"open": False, "voice_available": False, "access_key_accepted": False, "state": "paused"}
    if settings.PUBLIC_MODE:
        window = cap.window_open()
        return {
            "open": window,
            "voice_available": window and settings.PUBLIC_VOICE_ENABLED,
            "access_key_accepted": False,
            "state": "open" if window else "closed",
        }
    keyed = bool(settings.ACCESS_KEY)
    return {
        "open": keyed,
        "voice_available": keyed,
        "access_key_accepted": keyed,
        "state": "key_required" if keyed else "paused",
    }


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
        if settings.PUBLIC_MODE:
            # Take a durable slot before any paid call. It is not returned if the scan later fails.
            await cap.reserve_scan()
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
        if rag_context in (NO_MATCH_CONTEXT, "Error retrieving knowledge."):
            # No usable reference knowledge (no match, or retrieval failed): do not let the model
            # write a plan from memory and do not read one aloud.
            return {
                "status": "disease_detected",
                "analysis": analysis,
                "treatment": None,
                "knowledge_match": "none",
                "treatment_message": "This problem is not in AgriSense's reference notes, so no treatment advice is given. Please show the leaf to a local agriculture officer.",
                "voice_data": None,
            }
        knowledge_match = "found"

        verified = verified_context_of(rag_context)
        if not verified:
            # The page cannot show unsourced advice, so do not pay for a model call that would be hidden.
            return {
                "status": "disease_detected",
                "analysis": analysis,
                "treatment": None,
                "knowledge_match": knowledge_match,
                "treatment_message": "Treatment advice for this problem is not shown yet, because AgriSense has no checked source for it. Please show the leaf to a local agriculture officer.",
                "voice_data": None,
            }

        try:
            treatment = await generate_treatment(analysis, verified)
        except TreatmentError:
            # Keep the diagnosis; say plainly that the treatment plan is unavailable.
            return {
                "status": "disease_detected",
                "analysis": analysis,
                "treatment": None,
                "treatment_message": "Treatment advice is unavailable right now. Please try again, or ask a local agriculture officer.",
                "voice_data": None,
            }
        # Audio is never made during a scan. The page asks for it only when the person taps Listen.
        return {
            "status": "disease_detected",
            "analysis": analysis,
            "treatment": treatment,
            "knowledge_match": knowledge_match,
            "voice_data": None,
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
