import cv2
import numpy as np
import json
import logging
import google.generativeai as genai
from app.core.config import settings
from PIL import Image
import io

logger = logging.getLogger(__name__)

genai.configure(api_key=settings.GEMINI_API_KEY)

VISION_PROMPT = """
You are Dr. AgriSense, an expert plant pathologist with decades of experience in Indian agriculture.
Analyze this crop leaf image and return ONLY a valid JSON object. 
If no plant or leaf is detected, or if it's not a crop, set disease_detected to false.

Return format:
{
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

async def analyze_image(image_bytes: bytes):
    try:
        processed_bytes = preprocess_image(image_bytes)
        
        model = genai.GenerativeModel("gemini-2.5-flash-lite")
        
        image_part = {
            "mime_type": "image/jpeg",
            "data": processed_bytes
        }
        
        response = model.generate_content([VISION_PROMPT, image_part])
        
        # Parse JSON from response
        text = response.text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        
        analysis = json.loads(text)
        return analysis
    except Exception as e:
        logger.error(f"Detection service error: {e}")
        return {
            "disease_detected": False,
            "error": "Failed to analyze image",
            "details": str(e)
        }
