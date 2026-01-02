import json
import logging
import os
import tempfile
from enum import Enum
from typing import Any

import google.generativeai as genai
from google.api_core import exceptions as google_exceptions

from app.core.config import settings

logger = logging.getLogger(__name__)

MODEL_PRIMARY = "gemini-3-flash-preview"
MODEL_FALLBACK = "gemini-2.0-flash"


class ThinkingLevel(str, Enum):
    """Thinking levels for Gemini API - controls reasoning depth."""
    MINIMAL = "minimal"  # Fast, simple tasks (single product recognition)
    LOW = "low"          # Multiple items (shelf scan)
    MEDIUM = "medium"    # Analysis tasks (inventory comparison)
    HIGH = "high"        # Complex extraction (invoices with calculations)


THINKING_BUDGETS = {
    ThinkingLevel.MINIMAL: 500,
    ThinkingLevel.LOW: 2000,
    ThinkingLevel.MEDIUM: 4000,
    ThinkingLevel.HIGH: 8000,
}


class GeminiError(Exception):
    """Base exception for Gemini API errors."""
    pass


class GeminiAPIError(GeminiError):
    """Raised when Gemini API returns an error."""
    pass


class GeminiParseError(GeminiError):
    """Raised when response cannot be parsed as JSON."""
    pass


def configure_gemini():
    """Configure the Gemini API with credentials."""
    genai.configure(api_key=settings.GOOGLE_GEMINI_API_KEY)


def _extract_json(text: str) -> Any:
    """Extract JSON from response text, handling markdown code blocks."""
    if not text or not text.strip():
        raise GeminiParseError("Empty response from Gemini")

    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find JSON in response (handles markdown blocks)
    start_obj = text.find("{")
    start_arr = text.find("[")
    start_candidates = [idx for idx in (start_obj, start_arr) if idx != -1]

    if not start_candidates:
        logger.error(f"No JSON found in response: {text[:200]}...")
        raise GeminiParseError(f"No JSON structure found in response")

    start = min(start_candidates)
    if text[start] == "{":
        end = text.rfind("}")
    else:
        end = text.rfind("]")

    if end != -1 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse failed: {e}, text: {text[start:end+1][:200]}...")
            raise GeminiParseError(f"Invalid JSON in response: {e}") from e

    raise GeminiParseError("Could not extract valid JSON from response")


def _build_image_part(image_bytes: bytes, mime_type: str):
    """Build image part for Gemini API."""
    try:
        from google.generativeai import types
        return types.Part.from_data(data=image_bytes, mime_type=mime_type)
    except Exception as e:
        logger.warning(f"Direct image part failed, uploading file: {e}")
        with tempfile.NamedTemporaryFile(delete=False, suffix=_mime_to_suffix(mime_type)) as tmp:
            tmp.write(image_bytes)
            tmp.flush()
            file_path = tmp.name
        try:
            uploaded = genai.upload_file(file_path)
            return uploaded
        finally:
            try:
                os.unlink(file_path)
            except OSError:
                pass


def _mime_to_suffix(mime_type: str) -> str:
    """Convert MIME type to file suffix."""
    if mime_type.endswith("png"):
        return ".png"
    if mime_type.endswith("pdf"):
        return ".pdf"
    return ".jpg"


def generate_json(
    prompt: str,
    image_bytes: bytes | None = None,
    mime_type: str = "image/jpeg",
    model_name: str = MODEL_PRIMARY,
    thinking_level: ThinkingLevel = ThinkingLevel.MINIMAL,
) -> Any:
    """
    Generate JSON response from Gemini.

    Args:
        prompt: The text prompt
        image_bytes: Optional image data
        mime_type: MIME type of the image
        model_name: Model to use
        thinking_level: Controls reasoning depth (affects cost/latency)

    Returns:
        Parsed JSON response

    Raises:
        GeminiAPIError: When API call fails
        GeminiParseError: When response cannot be parsed
    """
    configure_gemini()

    logger.info(f"Gemini request: model={model_name}, thinking={thinking_level.value}, has_image={image_bytes is not None}")

    model = genai.GenerativeModel(model_name=model_name)

    parts: list[Any] = [prompt]
    if image_bytes:
        parts.append(_build_image_part(image_bytes, mime_type))

    generation_config: dict[str, Any] = {
        "response_mime_type": "application/json",
        "thinking_level": thinking_level.value,
    }

    try:
        response = model.generate_content(
            parts,
            generation_config=generation_config,
        )

        if not response.text:
            raise GeminiAPIError("Empty response from Gemini API")

        result = _extract_json(response.text)
        logger.info(f"Gemini response parsed successfully")
        return result

    except google_exceptions.GoogleAPIError as e:
        logger.error(f"Gemini API error: {e}")
        raise GeminiAPIError(f"Gemini API call failed: {e}") from e
    except GeminiParseError:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in Gemini call: {type(e).__name__}: {e}")
        raise GeminiAPIError(f"Unexpected error: {e}") from e


def generate_json_with_fallback(
    prompt: str,
    image_bytes: bytes | None = None,
    mime_type: str = "image/jpeg",
    thinking_level: ThinkingLevel = ThinkingLevel.MINIMAL,
) -> Any:
    """
    Generate JSON with automatic fallback to secondary model.

    Tries primary model first, falls back to secondary on failure.
    """
    try:
        return generate_json(
            prompt=prompt,
            image_bytes=image_bytes,
            mime_type=mime_type,
            model_name=MODEL_PRIMARY,
            thinking_level=thinking_level,
        )
    except GeminiAPIError as e:
        logger.warning(f"Primary model failed ({e}), trying fallback: {MODEL_FALLBACK}")
        return generate_json(
            prompt=prompt,
            image_bytes=image_bytes,
            mime_type=mime_type,
            model_name=MODEL_FALLBACK,
            thinking_level=thinking_level,
        )
