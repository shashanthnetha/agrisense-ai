import cv2
import numpy as np
import asyncio
import json
import logging
from typing import List, Literal
import google.generativeai as genai
from app.core.config import settings
from PIL import Image, ImageOps
import io
from pydantic import BaseModel, Field, StrictBool, ValidationError, model_validator

from app.services.guard import check_input_tokens, log_usage, run_provider, ProviderBusy

logger = logging.getLogger(__name__)


# Retry and timeout settings for the model call.
MODEL_ATTEMPTS = 3
MODEL_TIMEOUT_SECONDS = 30
RETRY_BACKOFF_SECONDS = 0.5
# Extra wall-clock allowance on top of the SDK timeout before we stop waiting.
WAIT_GRACE_SECONDS = 5


class AnalysisError(Exception):
    """Raised when the image analysis fails or returns unusable output.

    This is deliberately different from a valid "no disease detected" result,
    so a failed analysis is never reported to the user as a healthy crop.
    """

genai.configure(api_key=settings.GEMINI_API_KEY)

VISION_PROMPT = """
You are Dr. AgriSense, an expert plant pathologist with decades of experience in Indian agriculture.
Analyze this crop leaf image and return ONLY a valid JSON object. 
If no plant or leaf is detected, or if it's not a crop, set is_plant to false and disease_detected to false.

Return format:
{
  "is_plant": boolean (false if the image does not show a plant or leaf),
  "disease_detected": boolean,
  "disease_name": "Specific disease name or 'Healthy'",
  "crop_type": "Identified crop name",
  "confidence": 0-100,
  "affected_area_percent": 0-100,
  "visible_symptoms": ["symptom 1", "symptom 2"],
  "urgency": "Low|Medium|High|Critical",
  "reasoning": "Brief explanation of your diagnosis"
}
"""

MAX_PIXELS = 40_000_000  # reject decompression bombs before decoding
MAX_SIDE = 512  # longest side sent to the model (same size budget as before, aspect kept)


class InvalidImage(Exception):
    """The upload is not a readable JPG or PNG photo."""


def validate_image(image_bytes: bytes) -> None:
    """Cheap check before any paid call. Raises InvalidImage."""
    try:
        with Image.open(io.BytesIO(image_bytes)) as im:
            if im.format not in ("JPEG", "PNG"):
                raise InvalidImage("not JPEG or PNG")
            w, h = im.size
            if w < 32 or h < 32 or w * h > MAX_PIXELS:
                raise InvalidImage("unsupported size")
            im.verify()
    except InvalidImage:
        raise
    except Exception as e:
        raise InvalidImage("unreadable image") from e


def _upright(image_bytes: bytes) -> np.ndarray:
    """Decode, apply the camera's EXIF rotation (phone photos), return BGR."""
    with Image.open(io.BytesIO(image_bytes)) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        return cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2BGR)


def preprocess_image(image_bytes: bytes):
    try:
        img = _upright(image_bytes)

        # 1. Resize, keeping the aspect ratio (a forced square squashes the leaf)
        h, w = img.shape[:2]
        scale = MAX_SIDE / max(h, w)
        if scale < 1:
            img = cv2.resize(img, (max(1, round(w * scale)), max(1, round(h * scale))), interpolation=cv2.INTER_AREA)
        
        # 2. Denoise (Bilateral Filter)
        img = cv2.bilateralFilter(img, 9, 75, 75)
        
        # 3. CLAHE (Contrast Limited Adaptive Histogram Equalization)
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        cl = clahe.apply(l)
        limg = cv2.merge((cl, a, b))
        img = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
        
        # 4. Sharpen
        kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
        img = cv2.filter2D(img, -1, kernel)
        
        # Convert back to bytes for Gemini
        _, buffer = cv2.imencode('.jpg', img)
        return buffer.tobytes()
    except Exception as e:
        logger.error(f"Image preprocessing error: {e}")
        return image_bytes

class AnalysisResult(BaseModel):
    """Schema for the model's JSON output."""

    # Required, no defaults: a missing is_plant or confidence must not become
    # an assumed "plant" or an invented certainty.
    is_plant: StrictBool
    disease_detected: StrictBool
    disease_name: str = ""
    crop_type: str = "Unknown"
    confidence: float = Field(ge=0, le=100)
    affected_area_percent: float = Field(default=0, ge=0, le=100)
    visible_symptoms: List[str] = Field(default_factory=list)
    urgency: Literal["Low", "Medium", "High", "Critical"] = "Low"
    reasoning: str = ""

    @model_validator(mode="after")
    def _disease_needs_a_name(self):
        if self.disease_detected and not self.disease_name.strip():
            raise ValueError("disease_detected is true but disease_name is empty")
        return self


def parse_analysis(text: str) -> dict:
    """Parse and minimally validate the model's JSON output.

    Raises AnalysisError if the output is not a JSON object with a boolean
    `disease_detected` field.
    """
    text = (text or "").strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    try:
        analysis = json.loads(text)
    except json.JSONDecodeError as e:
        raise AnalysisError("Model output was not valid JSON") from e
    if not isinstance(analysis, dict):
        raise AnalysisError("Model output was not a JSON object")
    try:
        return AnalysisResult(**analysis).model_dump()
    except (ValidationError, TypeError) as e:
        raise AnalysisError("Model output failed schema validation") from e


def _call_model(processed_bytes: bytes) -> str:
    model = genai.GenerativeModel(settings.GEMINI_MODEL)
    image_part = {"mime_type": "image/jpeg", "data": processed_bytes}
    contents = [VISION_PROMPT, image_part]
    try:
        check_input_tokens(model, contents, settings.MAX_INPUT_TOKENS_DETECTION, "detection")
    except Exception as e:
        raise AnalysisError("Detection input check failed") from e
    response = model.generate_content(
        contents,
        generation_config={"max_output_tokens": settings.MAX_OUTPUT_TOKENS_DETECTION},
        request_options={"timeout": MODEL_TIMEOUT_SECONDS},
    )
    log_usage(response, "detection")
    return response.text


async def analyze_image(image_bytes: bytes):
    """Analyze an image. Retries transient failures and invalid output.

    Raises AnalysisError if every attempt fails.
    """
    processed_bytes = await asyncio.to_thread(preprocess_image, image_bytes)
    last_error = None
    for attempt in range(1, MODEL_ATTEMPTS + 1):
        try:
            text = await run_provider(
                _call_model, processed_bytes, timeout=MODEL_TIMEOUT_SECONDS + WAIT_GRACE_SECONDS,
            )
            return parse_analysis(text)
        except ProviderBusy as e:
            logger.error("Detection not started: provider calls still running")
            raise AnalysisError("Service is busy") from e
        except asyncio.TimeoutError as e:
            # The worker thread cannot be cancelled. Do not start another call
            # while it may still be running: stop here instead of piling up threads.
            logger.error("Detection call exceeded the wall-clock limit; not retrying")
            raise AnalysisError("Image analysis timed out") from e
        except Exception as e:
            last_error = e
            logger.warning(
                "Detection attempt %d/%d failed: %s", attempt, MODEL_ATTEMPTS, type(e).__name__
            )
            if attempt < MODEL_ATTEMPTS:
                await asyncio.sleep(RETRY_BACKOFF_SECONDS * attempt)
    logger.error("Detection failed after %d attempts: %s", MODEL_ATTEMPTS, last_error)
    raise AnalysisError("Image analysis failed") from last_error
