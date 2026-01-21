from datetime import datetime, timezone
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def _build_category_totals(items: list[dict], product_map: dict, category_map: dict) -> dict:
    totals: dict[str, dict[str, float]] = {}
    for item in items:
        product = product_map.get(item.get("product_id"), {})
        cat_id = product.get("category_id")
        cat_name = category_map.get(cat_id) if cat_id else None
        cat_key = cat_name or "Sonstige"
        if cat_key not in totals:
            totals[cat_key] = {"count": 0, "value": 0.0}
        totals[cat_key]["count"] += 1
        totals[cat_key]["value"] += float(item.get("total_price") or 0)
    return totals


def _collect_address_lines(profile: dict | None) -> list[str]:
    if not profile:
        return []
    address_lines = []
    for key in ("address", "address_line1", "address_line2", "street"):
        value = profile.get(key)
        if value:
            address_lines.append(str(value))
    postal_code = profile.get("postal_code") or profile.get("zip")
    city = profile.get("city")
    if postal_code or city:
        address_lines.append(" ".join([str(value) for value in (postal_code, city) if value]))
    country = profile.get("country")
    if country:
        address_lines.append(str(country))
    return address_lines


def _draw_footer(canvas, doc, generated_at: str) -> None:
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    y = 10 * mm
    canvas.drawString(doc.leftMargin, y, "Erstellt mit CrewInventurKI")
    canvas.drawCentredString(doc.pagesize[0] / 2, y, f"Generiert: {generated_at}")
    canvas.drawRightString(
        doc.pagesize[0] - doc.rightMargin, y, f"Seite {canvas.getPageNumber()}"
    )
    canvas.restoreState()


def generate_inventory_pdf(
    session: dict,
    location: dict,
    profile: dict | None,
    items: list[dict],
    product_map: dict,
    category_map: dict,
    include_category_summary: bool = True,
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )
    styles = getSampleStyleSheet()
    elements = []
    company_name = (profile or {}).get("company_name") or "CrewInventurKI"
    elements.append(Paragraph(company_name, styles["Title"]))
    for line in _collect_address_lines(profile):
        elements.append(Paragraph(line, styles["Normal"]))
    elements.append(Paragraph(f"Location: {location.get('name', '-')}", styles["Normal"]))
    elements.append(Paragraph(f"Inventurnummer: {session.get('id', '-')}", styles["Normal"]))
    started_at = session.get("started_at")
    completed_at = session.get("completed_at")
    if started_at or completed_at:
        elements.append(
            Paragraph(
                f"Zeitraum: {started_at or '-'} bis {completed_at or '-'}",
                styles["Normal"],
            )
        )
    elements.append(Spacer(1, 12))

    elements.append(Paragraph("Inventurliste", styles["Heading3"]))
    elements.append(Spacer(1, 6))
    data = [["Produkt", "Kategorie", "Menge", "Einzelpreis", "Gesamt"]]
    for item in items:
        product = product_map.get(item.get("product_id"), {})
        category_name = category_map.get(product.get("category_id"), "-")
        data.append(
            [
                product.get("name", "-"),
                category_name,
                str(item.get("quantity", "")),
                f"{float(item.get('unit_price') or 0):.2f}",
                f"{float(item.get('total_price') or 0):.2f}",
            ]
        )

    table = Table(data, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
            ]
        )
    )
    elements.append(table)
    elements.append(Spacer(1, 12))

    if include_category_summary:
        category_totals = _build_category_totals(items, product_map, category_map)
        if category_totals:
            elements.append(Paragraph("Kategorien-Summen", styles["Heading3"]))
            elements.append(Spacer(1, 6))
            summary_data = [["Kategorie", "Positionen", "Wert EUR"]]
            for cat_name in sorted(category_totals):
                totals = category_totals[cat_name]
                summary_data.append(
                    [
                        cat_name,
                        str(int(totals["count"])),
                        f"{totals['value']:.2f}",
                    ]
                )
            summary_table = Table(summary_data, hAlign="LEFT")
            summary_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
                    ]
                )
            )
            elements.append(summary_table)
            elements.append(Spacer(1, 12))

    elements.append(
        Paragraph(
            f"Gesamtwert: {float(session.get('total_value') or 0):.2f} EUR",
            styles["Heading3"],
        )
    )
    elements.append(Spacer(1, 24))
    elements.append(Paragraph("Unterschrift: __________________________", styles["Normal"]))

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    doc.build(
        elements,
        onFirstPage=lambda canvas, doc: _draw_footer(canvas, doc, generated_at),
        onLaterPages=lambda canvas, doc: _draw_footer(canvas, doc, generated_at),
    )
    return buffer.getvalue()


def generate_bundle_pdf(
    bundle: dict,
    profile: dict | None,
    sessions_data: list[dict],
) -> bytes:
    """Generiert akkumulierte Inventur-PDF ueber mehrere Locations."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )
    styles = getSampleStyleSheet()
    elements = []

    company = (profile or {}).get("company_name") or "CrewInventurKI"
    elements.append(Paragraph(f"{company} - Gesamtinventur", styles["Title"]))
    elements.append(Paragraph(f"Name: {bundle.get('name', '-')}", styles["Normal"]))
    elements.append(Paragraph(f"Erstellt: {bundle.get('created_at', '-')}", styles["Normal"]))
    elements.append(Spacer(1, 12))

    summary_data = [["Location", "Positionen", "Wert EUR"]]
    for session_data in sessions_data:
        loc_name = session_data["location"].get("name", "-")
        session = session_data["session"]
        summary_data.append(
            [
                loc_name,
                str(session.get("total_items", 0)),
                f"{float(session.get('total_value') or 0):.2f}",
            ]
        )

    summary_data.append(
        [
            "GESAMT",
            str(bundle.get("total_items", 0)),
            f"{float(bundle.get('total_value') or 0):.2f}",
        ]
    )

    table = Table(summary_data, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("BACKGROUND", (0, -1), (-1, -1), colors.lightblue),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
            ]
        )
    )
    elements.append(table)
    elements.append(Spacer(1, 24))

    for session_data in sessions_data:
        elements.append(PageBreak())
        loc_name = session_data["location"].get("name", "-")
        session = session_data["session"]
        elements.append(Paragraph(f"Location: {loc_name}", styles["Heading2"]))
        elements.append(Paragraph(f"Session: {session.get('id', '-')}", styles["Normal"]))
        elements.append(
            Paragraph(
                f"Abgeschlossen: {session.get('completed_at') or '-'}",
                styles["Normal"],
            )
        )
        elements.append(Spacer(1, 8))

        data = [["Produkt", "Kategorie", "Menge", "Einzelpreis", "Gesamt"]]
        for item in session_data["items"]:
            product = session_data["product_map"].get(item.get("product_id"), {})
            cat = session_data["category_map"].get(product.get("category_id"), "-")
            data.append(
                [
                    product.get("name", "-"),
                    cat,
                    str(item.get("quantity", "")),
                    f"{float(item.get('unit_price') or 0):.2f}",
                    f"{float(item.get('total_price') or 0):.2f}",
                ]
            )

        detail_table = Table(data, hAlign="LEFT")
        detail_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
                ]
            )
        )
        elements.append(detail_table)
        elements.append(Spacer(1, 12))

        elements.append(
            Paragraph(
                f"Gesamtwert: {float(session.get('total_value') or 0):.2f} EUR",
                styles["Heading3"],
            )
        )

    elements.append(Spacer(1, 24))
    elements.append(Paragraph("Unterschrift: __________________________", styles["Normal"]))

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    doc.build(
        elements,
        onFirstPage=lambda canvas, doc: _draw_footer(canvas, doc, generated_at),
        onLaterPages=lambda canvas, doc: _draw_footer(canvas, doc, generated_at),
    )
    return buffer.getvalue()


def generate_reorder_pdf(
    overview: dict,
    items: list[dict],
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )
    styles = getSampleStyleSheet()
    elements = []

    location_name = overview.get("location_name") or "Location"
    elements.append(Paragraph("Nachbestellliste", styles["Title"]))
    elements.append(Paragraph(f"Location: {location_name}", styles["Normal"]))
    if overview.get("completed_at"):
        elements.append(
            Paragraph(f"Letzte Inventur: {overview.get('completed_at')}", styles["Normal"])
        )
    elements.append(Spacer(1, 12))

    data = [["Produkt", "Bestand", "Mindestbestand", "Fehlmenge"]]
    for item in items:
        product_name = " ".join(
            [part for part in [item.get("brand"), item.get("product_name")] if part]
        ).strip()
        data.append(
            [
                product_name or item.get("product_name", "-"),
                f"{item.get('current_quantity', 0)} {item.get('unit') or ''}".strip(),
                f"{item.get('min_quantity', 0)} {item.get('unit') or ''}".strip(),
                f"{item.get('deficit', 0)} {item.get('unit') or ''}".strip(),
            ]
        )

    table = Table(data, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
            ]
        )
    )
    elements.append(table)

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    doc.build(
        elements,
        onFirstPage=lambda canvas, doc: _draw_footer(canvas, doc, generated_at),
        onLaterPages=lambda canvas, doc: _draw_footer(canvas, doc, generated_at),
    )
    return buffer.getvalue()
