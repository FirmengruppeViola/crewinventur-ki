"""
Smart Product Matching Service using Gemini 3 Flash.

This service solves the matching problem between:
- Invoice items (often with cryptic abbreviations)
- Products in the database (with clean names)

Uses HIGH thinking for batch matching, MEDIUM for single invoice.
"""

import logging
from typing import Any

from pydantic import BaseModel, Field

from app.core.gemini import generate_structured_list, ThinkingLevel
from app.core.supabase import get_supabase

logger = logging.getLogger(__name__)


class ProductMatch(BaseModel):
    """Schema for a single product match result."""

    item_id: str = Field(description="ID of the invoice item")
    product_id: str | None = Field(
        description="ID of matched product, null if no match"
    )
    confidence: float = Field(ge=0.0, le=1.0, description="Match confidence 0.0-1.0")
    reason: str = Field(description="Brief explanation for the match")


def _build_matching_prompt(products: list[dict], items: list[dict]) -> str:
    """Build prompt for AI-powered product matching."""

    # Format products for the prompt
    products_text = "\n".join(
        [
            f'  - ID: {p["id"]}, Name: "{p.get("name", "")}", '
            f'Brand: "{p.get("brand", "")}", Size: "{p.get("size", "")}"'
            for p in products
        ]
    )

    # Format items for the prompt
    items_text = "\n".join(
        [
            f"  - ID: {item['id']}, "
            f'Raw: "{item.get("raw_text", "")}", '
            f'Normalized: "{item.get("ai_normalized_name") or item.get("product_name", "")}"'
            for item in items
        ]
    )

    return f"""Du bist ein Experte fuer Produktzuordnung in der Gastronomie.

Ordne die Rechnungspositionen den Produkten zu. Beachte:
- Abkuerzungen entschluesseln (Jägerm. = Jägermeister)
- Groessen normalisieren (0.7 = 0,7l = 700ml)
- Marken erkennen trotz Schreibvarianten
- Wenn kein sicherer Match: product_id = null

PRODUKTE (Datenbank):
{products_text}

RECHNUNGSPOSITIONEN (zu matchen):
{items_text}

WICHTIG:
- Nur matchen wenn SICHER (confidence > 0.7)
- Bei Unsicherheit: product_id = null
- Immer ALLE Items zurueckgeben!"""


def match_products_for_user(user_id: str) -> dict[str, Any]:
    """
    Match all unmatched invoice items to products for a user.

    Uses HIGH thinking level for thorough analysis.

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
        return {
            "matched_count": 0,
            "failed_count": 0,
            "matches": [],
            "message": "Keine Produkte vorhanden",
        }

    # Get all products for user (limit to 1000 for performance)
    products_resp = (
        supabase.table("products")
        .select("id, name, brand, size, variant")
        .eq("user_id", user_id)
        .limit(1000)
        .execute()
    )
    products = products_resp.data or []

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
        return {
            "matched_count": 0,
            "failed_count": 0,
            "matches": [],
            "message": "Keine offenen Items",
        }

    logger.info(
        f"Matching {len(items)} items against {len(products)} products for user {user_id}"
    )

    # Call Gemini for matching with structured output
    prompt = _build_matching_prompt(products, items)

    try:
        matches = generate_structured_list(
            prompt=prompt,
            item_schema=ProductMatch,
            thinking_level=ThinkingLevel.HIGH,
        )
    except Exception as e:
        logger.error(f"Gemini matching failed: {e}")
        return {
            "matched_count": 0,
            "failed_count": len(items),
            "matches": [],
            "error": str(e),
        }

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
                supabase.table("invoice_items").update(
                    {
                        "matched_product_id": product_id,
                        "match_confidence": confidence,
                        "is_manually_matched": False,
                    }
                ).eq("id", item_id).execute()

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
                    unit_price = (
                        item_price_resp.data[0].get("unit_price")
                        if item_price_resp.data
                        else None
                    )

                    # Update product with price
                    if unit_price:
                        supabase.table("products").update(
                            {
                                "last_price": unit_price,
                                "last_supplier": invoice.get("supplier_name"),
                                "last_price_date": invoice.get("invoice_date"),
                            }
                        ).eq("id", product_id).execute()

                matched_count += 1
                applied_matches.append(
                    {
                        "item_id": item_id,
                        "product_id": product_id,
                        "confidence": confidence,
                        "reason": match.get("reason", ""),
                    }
                )

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

    Uses MEDIUM thinking level (faster than batch).
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

    # Get all products for user (limit to 1000 for performance)
    products_resp = (
        supabase.table("products")
        .select("id, name, brand, size, variant")
        .eq("user_id", user_id)
        .limit(1000)
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
        .limit(1000)
        .execute()
    )
    items = items_resp.data or []

    if not items:
        return {"matched_count": 0, "message": "Keine offenen Items"}

    logger.info(f"Matching {len(items)} items for invoice {invoice_id}")

    prompt = _build_matching_prompt(products, items)

    try:
        matches = generate_structured_list(
            prompt=prompt,
            item_schema=ProductMatch,
            thinking_level=ThinkingLevel.MEDIUM,
        )
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
                supabase.table("invoice_items").update(
                    {
                        "matched_product_id": product_id,
                        "match_confidence": confidence,
                        "is_manually_matched": False,
                    }
                ).eq("id", item_id).execute()
                matched_count += 1
            except Exception as e:
                logger.error(f"Failed to apply match: {e}")

    return {
        "matched_count": matched_count,
        "total_items": len(items),
        "message": f"{matched_count} von {len(items)} zugeordnet",
    }
