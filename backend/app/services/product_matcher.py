"""
Smart Product Matching Service using Gemini AI.

This service solves the matching problem between:
- Invoice items (often with cryptic abbreviations)
- Products in the database (with clean names)

The AI understands context and can match:
- "Jägerm. 0.7" → "Jägermeister 0,7l"
- "CocaCola 1L" → "Coca-Cola 1 Liter"
"""

import json
import logging
from typing import Any

from app.core.gemini import generate_json, ThinkingLevel
from app.core.supabase import get_supabase

logger = logging.getLogger(__name__)


def _build_matching_prompt(products: list[dict], items: list[dict]) -> str:
    """Build prompt for AI-powered product matching."""

    # Format products for the prompt
    products_text = "\n".join([
        f"  - ID: {p['id']}, Name: \"{p.get('name', '')}\", "
        f"Brand: \"{p.get('brand', '')}\", Size: \"{p.get('size', '')}\""
        for p in products
    ])

    # Format items for the prompt
    items_text = "\n".join([
        f"  - ID: {item['id']}, "
        f"Raw: \"{item.get('raw_text', '')}\", "
        f"Normalized: \"{item.get('ai_normalized_name') or item.get('product_name', '')}\""
        for item in items
    ])

    return f"""Du bist ein Experte für Produktzuordnung in der Gastronomie.

Ordne die Rechnungspositionen den Produkten zu. Beachte:
- Abkürzungen entschlüsseln (Jägerm. = Jägermeister)
- Größen normalisieren (0.7 = 0,7l = 700ml)
- Marken erkennen
- Wenn kein Match: null

PRODUKTE (Datenbank):
{products_text}

RECHNUNGSPOSITIONEN (zu matchen):
{items_text}

Antworte NUR mit JSON Array:
[
  {{"item_id": "...", "product_id": "..." oder null, "confidence": 0.0-1.0, "reason": "kurze Begründung"}}
]

WICHTIG:
- Nur matchen wenn SICHER (confidence > 0.7)
- Bei Unsicherheit: product_id = null
- Immer alle Items im Output!"""


def match_products_for_user(user_id: str) -> dict[str, Any]:
    """
    Match all unmatched invoice items to products for a user.

    Returns:
        Dict with matched_count, failed_count, matches list
    """
    supabase = get_supabase()

    # Get all products for user
    products_resp = (
        supabase.table("products")
        .select("id, name, brand, size, variant")
        .eq("user_id", user_id)
        .execute()
    )
    products = products_resp.data or []

    if not products:
        logger.info(f"No products found for user {user_id}")
        return {"matched_count": 0, "failed_count": 0, "matches": [], "message": "Keine Produkte vorhanden"}

    # Get all unmatched invoice items for user
    items_resp = (
        supabase.table("invoice_items")
        .select("id, raw_text, product_name, ai_normalized_name, invoice_id")
        .eq("user_id", user_id)
        .is_("matched_product_id", "null")
        .execute()
    )
    items = items_resp.data or []

    if not items:
        logger.info(f"No unmatched items found for user {user_id}")
        return {"matched_count": 0, "failed_count": 0, "matches": [], "message": "Keine offenen Items"}

    logger.info(f"Matching {len(items)} items against {len(products)} products for user {user_id}")

    # Call Gemini for matching
    prompt = _build_matching_prompt(products, items)

    try:
        matches_raw = generate_json(
            prompt=prompt,
            thinking_level=ThinkingLevel.HIGH,
        )

        # Handle both list and dict responses
        if isinstance(matches_raw, dict) and "matches" in matches_raw:
            matches = matches_raw["matches"]
        elif isinstance(matches_raw, list):
            matches = matches_raw
        else:
            logger.error(f"Unexpected response format: {type(matches_raw)}")
            matches = []

    except Exception as e:
        logger.error(f"Gemini matching failed: {e}")
        return {"matched_count": 0, "failed_count": len(items), "matches": [], "error": str(e)}

    # Apply matches to database
    matched_count = 0
    failed_count = 0
    applied_matches = []

    for match in matches:
        item_id = match.get("item_id")
        product_id = match.get("product_id")
        confidence = match.get("confidence", 0)

        if not item_id:
            continue

        if product_id and confidence >= 0.7:
            try:
                # Update invoice item with match
                supabase.table("invoice_items").update({
                    "matched_product_id": product_id,
                    "match_confidence": confidence,
                    "is_manually_matched": False,
                }).eq("id", item_id).execute()

                # Get invoice info for price update
                item_data = next((i for i in items if i["id"] == item_id), None)
                if item_data:
                    invoice_resp = (
                        supabase.table("invoices")
                        .select("supplier_name, invoice_date")
                        .eq("id", item_data["invoice_id"])
                        .execute()
                    )
                    invoice = invoice_resp.data[0] if invoice_resp.data else {}

                    # Get item price
                    item_price_resp = (
                        supabase.table("invoice_items")
                        .select("unit_price")
                        .eq("id", item_id)
                        .execute()
                    )
                    unit_price = item_price_resp.data[0].get("unit_price") if item_price_resp.data else None

                    # Update product with price
                    if unit_price:
                        supabase.table("products").update({
                            "last_price": unit_price,
                            "last_supplier": invoice.get("supplier_name"),
                            "last_price_date": invoice.get("invoice_date"),
                        }).eq("id", product_id).execute()

                matched_count += 1
                applied_matches.append({
                    "item_id": item_id,
                    "product_id": product_id,
                    "confidence": confidence,
                    "reason": match.get("reason", ""),
                })

            except Exception as e:
                logger.error(f"Failed to apply match {item_id} -> {product_id}: {e}")
                failed_count += 1
        else:
            failed_count += 1

    logger.info(f"Matching complete: {matched_count} matched, {failed_count} unmatched")

    return {
        "matched_count": matched_count,
        "failed_count": failed_count,
        "matches": applied_matches,
        "message": f"{matched_count} Zuordnungen gefunden",
    }


def match_products_for_invoice(user_id: str, invoice_id: str) -> dict[str, Any]:
    """
    Match unmatched items for a specific invoice.
    """
    supabase = get_supabase()

    # Verify invoice belongs to user
    invoice_check = (
        supabase.table("invoices")
        .select("id")
        .eq("id", invoice_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not invoice_check.data:
        return {"error": "Invoice not found", "matched_count": 0}

    # Get all products for user
    products_resp = (
        supabase.table("products")
        .select("id, name, brand, size, variant")
        .eq("user_id", user_id)
        .execute()
    )
    products = products_resp.data or []

    if not products:
        return {"matched_count": 0, "message": "Keine Produkte vorhanden"}

    # Get unmatched items for this invoice
    items_resp = (
        supabase.table("invoice_items")
        .select("id, raw_text, product_name, ai_normalized_name, invoice_id")
        .eq("invoice_id", invoice_id)
        .is_("matched_product_id", "null")
        .execute()
    )
    items = items_resp.data or []

    if not items:
        return {"matched_count": 0, "message": "Keine offenen Items"}

    logger.info(f"Matching {len(items)} items for invoice {invoice_id}")

    # Use the same matching logic
    prompt = _build_matching_prompt(products, items)

    try:
        matches_raw = generate_json(
            prompt=prompt,
            thinking_level=ThinkingLevel.MEDIUM,
        )

        if isinstance(matches_raw, dict) and "matches" in matches_raw:
            matches = matches_raw["matches"]
        elif isinstance(matches_raw, list):
            matches = matches_raw
        else:
            matches = []

    except Exception as e:
        logger.error(f"Gemini matching failed: {e}")
        return {"matched_count": 0, "error": str(e)}

    # Apply matches
    matched_count = 0
    for match in matches:
        item_id = match.get("item_id")
        product_id = match.get("product_id")
        confidence = match.get("confidence", 0)

        if item_id and product_id and confidence >= 0.7:
            try:
                supabase.table("invoice_items").update({
                    "matched_product_id": product_id,
                    "match_confidence": confidence,
                    "is_manually_matched": False,
                }).eq("id", item_id).execute()
                matched_count += 1
            except Exception as e:
                logger.error(f"Failed to apply match: {e}")

    return {
        "matched_count": matched_count,
        "total_items": len(items),
        "message": f"{matched_count} von {len(items)} zugeordnet",
    }
