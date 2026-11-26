import cv2
import numpy as np
import asyncio
import json
import logging
from typing import List, Literal
import google.generativeai as genai
from app.core.config import settings
from PIL import Image
import io
from pydantic import BaseModel, Field, StrictBool, ValidationError, model_validator

logger = logging.getLogger(__name__)


# Retry and timeout settings for the model call.
MODEL_ATTEMPTS = 3
MODEL_TIMEOUT_SECONDS = 30
RETRY_BACKOFF_SECONDS = 0.5


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

def preprocess_image(image_bytes: bytes):
    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # 1. Resize
        img = cv2.resize(img, (512, 512))
        
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

    is_plant: StrictBool = True
    disease_detected: StrictBool
    disease_name: str = ""
    crop_type: str = "Unknown"
    confidence: float = Field(default=0, ge=0, le=100)
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
    model = genai.GenerativeModel("gemini-2.5-flash-lite")
    image_part = {"mime_type": "image/jpeg", "data": processed_bytes}
    response = model.generate_content(
        [VISION_PROMPT, image_part],
        request_options={"timeout": MODEL_TIMEOUT_SECONDS},
    )
    return response.text


async def analyze_image(image_bytes: bytes):
    """Analyze an image. Retries transient failures and invalid output.

    Raises AnalysisError if every attempt fails.
    """
    processed_bytes = preprocess_image(image_bytes)
    last_error = None
    for attempt in range(1, MODEL_ATTEMPTS + 1):
        try:
            text = await asyncio.wait_for(
                asyncio.to_thread(_call_model, processed_bytes),
                timeout=MODEL_TIMEOUT_SECONDS + 5,
            )
            return parse_analysis(text)
        except Exception as e:
            last_error = e
            logger.warning(
                "Detection attempt %d/%d failed: %s", attempt, MODEL_ATTEMPTS, type(e).__name__
            )
            if attempt < MODEL_ATTEMPTS:
                await asyncio.sleep(RETRY_BACKOFF_SECONDS * attempt)
    logger.error("Detection failed after %d attempts: %s", MODEL_ATTEMPTS, last_error)
    raise AnalysisError("Image analysis failed") from last_error
