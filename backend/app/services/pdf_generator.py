from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors


def generate_inventory_pdf(
    session: dict,
    location: dict,
    profile: dict | None,
    items: list[dict],
    product_map: dict,
    category_map: dict,
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm)
    styles = getSampleStyleSheet()

    elements = []
    company_name = profile.get("company_name") if profile else "CrewInventurKI"
    elements.append(Paragraph(company_name, styles["Title"]))
    elements.append(Paragraph(f"Location: {location.get('name', '-')}", styles["Normal"]))
    elements.append(Paragraph(f"Datum: {session.get('completed_at') or session.get('started_at')}", styles["Normal"]))
    elements.append(Spacer(1, 12))

    data = [["Produkt", "Kategorie", "Menge", "Einzelpreis", "Gesamt"]]
    for item in items:
        product = product_map.get(item["product_id"], {})
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

    elements.append(
        Paragraph(
            f"Gesamtwert: {float(session.get('total_value') or 0):.2f} EUR",
            styles["Heading3"],
        )
    )
    elements.append(Spacer(1, 24))
    elements.append(Paragraph("Unterschrift: __________________________", styles["Normal"]))

    doc.build(elements)
    return buffer.getvalue()
