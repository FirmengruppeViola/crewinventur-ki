"""
Gemini 3 Flash API Integration.

Uses the new google-genai SDK with:
- Structured output (Pydantic JSON Schema)
- Configurable thinking levels
- Native multimodal support
"""

import logging
from enum import Enum
from typing import Any, Type

from google import genai
from google.genai import types
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)

MODEL_NAME = "gemini-3-flash-preview"


class ThinkingLevel(str, Enum):
    """
    Thinking levels for Gemini 3 Flash.

    Controls reasoning depth - higher = more accurate but slower/costlier.
    """
    MINIMAL = "minimal"  # Fastest, simple tasks (single product scan)
    LOW = "low"          # Quick reasoning (basic recognition)
    MEDIUM = "medium"    # Balanced (shelf scan, multiple items)
    HIGH = "high"        # Deep reasoning (invoices, complex extraction)


class GeminiError(Exception):
    """Base exception for Gemini API errors."""
    pass


class GeminiAPIError(GeminiError):
    """Raised when Gemini API returns an error."""
    pass


class GeminiParseError(GeminiError):
    """Raised when response cannot be parsed."""
    pass


def _get_client() -> genai.Client:
    """Get configured Gemini client."""
    return genai.Client(api_key=settings.GOOGLE_GEMINI_API_KEY)


def generate_structured(
    prompt: str,
    response_schema: Type[BaseModel],
    image_bytes: bytes | None = None,
    mime_type: str = "image/jpeg",
    thinking_level: ThinkingLevel = ThinkingLevel.MINIMAL,
) -> dict[str, Any]:
    """
    Generate structured JSON response from Gemini 3 Flash.

    Uses Pydantic schema for guaranteed valid output structure.

    Args:
        prompt: The text prompt
        response_schema: Pydantic model defining expected response structure
        image_bytes: Optional image data
        mime_type: MIME type of the image
        thinking_level: Controls reasoning depth

    Returns:
        Parsed JSON dict matching the schema

    Raises:
        GeminiAPIError: When API call fails
        GeminiParseError: When response is invalid
    """
    client = _get_client()

    logger.info(
        f"Gemini request: model={MODEL_NAME}, "
        f"thinking={thinking_level.value}, "
        f"schema={response_schema.__name__}, "
        f"has_image={image_bytes is not None}"
    )

    # Build content parts
    contents: list[Any] = []

    if image_bytes:
        # Add image first, then prompt
        contents.append(
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
        )

    contents.append(prompt)

    # Configure generation with structured output
    config = types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(
            thinking_level=thinking_level.value
        ),
        response_mime_type="application/json",
        response_schema=response_schema,
    )

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=contents,
            config=config,
        )

        if not response.text:
            raise GeminiAPIError("Empty response from Gemini API")

        # Parse JSON - should be valid due to structured output
        import json
        result = json.loads(response.text)

        logger.info(f"Gemini response parsed successfully")
        return result

    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error despite structured output: {e}")
        raise GeminiParseError(f"Invalid JSON in response: {e}") from e
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Gemini API error: {type(e).__name__}: {error_msg}")
        raise GeminiAPIError(f"Gemini API call failed: {error_msg}") from e


def generate_structured_list(
    prompt: str,
    item_schema: Type[BaseModel],
    image_bytes: bytes | None = None,
    mime_type: str = "image/jpeg",
    thinking_level: ThinkingLevel = ThinkingLevel.MEDIUM,
) -> list[dict[str, Any]]:
    """
    Generate a list of structured items from Gemini 3 Flash.

    For multi-item recognition (shelf scan, invoice items).

    Args:
        prompt: The text prompt
        item_schema: Pydantic model for each item
        image_bytes: Optional image data
        mime_type: MIME type of the image
        thinking_level: Controls reasoning depth

    Returns:
        List of dicts, each matching the item schema
    """
    client = _get_client()

    logger.info(
        f"Gemini list request: model={MODEL_NAME}, "
        f"thinking={thinking_level.value}, "
        f"item_schema={item_schema.__name__}"
    )

    contents: list[Any] = []

    if image_bytes:
        contents.append(
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
        )

    contents.append(prompt)

    # For lists, we create a wrapper schema
    class ListWrapper(BaseModel):
        items: list[item_schema]  # type: ignore

    config = types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(
            thinking_level=thinking_level.value
        ),
        response_mime_type="application/json",
        response_schema=ListWrapper,
    )

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=contents,
            config=config,
        )

        if not response.text:
            logger.warning("Empty response from Gemini, returning empty list")
            return []

        import json
        result = json.loads(response.text)

        # Extract items from wrapper
        items = result.get("items", [])
        logger.info(f"Gemini returned {len(items)} items")
        return items

    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
        raise GeminiParseError(f"Invalid JSON in response: {e}") from e
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Gemini API error: {type(e).__name__}: {error_msg}")
        raise GeminiAPIError(f"Gemini API call failed: {error_msg}") from e


# Legacy function for backwards compatibility during migration
def generate_json(
    prompt: str,
    image_bytes: bytes | None = None,
    mime_type: str = "image/jpeg",
    thinking_level: ThinkingLevel = ThinkingLevel.MINIMAL,
    response_schema: Type[BaseModel] | None = None,
) -> Any:
    """
    Legacy wrapper - prefer generate_structured() for new code.
    """
    if response_schema:
        return generate_structured(
            prompt=prompt,
            response_schema=response_schema,
            image_bytes=image_bytes,
            mime_type=mime_type,
            thinking_level=thinking_level,
        )

    # Fallback to unstructured (not recommended)
    client = _get_client()

    contents: list[Any] = []
    if image_bytes:
        contents.append(
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
        )
    contents.append(prompt)

    config = types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(
            thinking_level=thinking_level.value
        ),
        response_mime_type="application/json",
    )

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=contents,
            config=config,
        )

        if not response.text:
            raise GeminiAPIError("Empty response")

        import json
        return json.loads(response.text)

    except Exception as e:
        logger.error(f"Gemini error: {e}")
        raise GeminiAPIError(str(e)) from e
