import json
import os
import tempfile
from typing import Any

import google.generativeai as genai

from app.core.config import settings

MODEL_PRIMARY = "gemini-3-flash-preview"
MODEL_FALLBACK = "gemini-2.5-flash"


def configure_gemini():
    genai.configure(api_key=settings.GOOGLE_GEMINI_API_KEY)


def _extract_json(text: str) -> Any:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start_obj = text.find("{")
        start_arr = text.find("[")
        start_candidates = [idx for idx in (start_obj, start_arr) if idx != -1]
        if not start_candidates:
            raise
        start = min(start_candidates)
        if text[start] == "{":
            end = text.rfind("}")
        else:
            end = text.rfind("]")
        if end != -1 and end > start:
            return json.loads(text[start : end + 1])
        raise


def _build_image_part(image_bytes: bytes, mime_type: str):
    try:
        from google.generativeai import types

        return types.Part.from_data(data=image_bytes, mime_type=mime_type)
    except Exception:
        with tempfile.NamedTemporaryFile(delete=False, suffix=_mime_to_suffix(mime_type)) as tmp:
            tmp.write(image_bytes)
            tmp.flush()
            file_path = tmp.name
        uploaded = genai.upload_file(file_path)
        try:
            os.unlink(file_path)
        except OSError:
            pass
        return uploaded


def _mime_to_suffix(mime_type: str) -> str:
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
):
    configure_gemini()
    model = genai.GenerativeModel(model_name=model_name)

    parts: list[Any] = [prompt]
    if image_bytes:
        parts.append(_build_image_part(image_bytes, mime_type))

    response = model.generate_content(
        parts,
        generation_config={
            "response_mime_type": "application/json",
        },
    )

    return _extract_json(response.text)
