"""
Branded PDF quotation for a saved estimate, built with ReportLab.

Figures come from the estimate's stored result, so the PDF always matches what
the customer saw, even if prices have changed since.
"""

from datetime import timedelta
from io import BytesIO

from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .models import Estimate

# Keep in step with frontend/src/lib/site.ts.
STUDIO = {
    "name": "INTERIO",
    "tagline": "Interior design & renovation",
    "contact": "hello@interio.design · +91 12345 67891 · Baner Road, Pune 411045",
}
VALID_FOR_DAYS = 30

CHARCOAL = colors.HexColor("#1F1A16")
MUTED = colors.HexColor("#6B6259")
WOOD = colors.HexColor("#A5673F")
SAND = colors.HexColor("#E4DACB")
PAPER = colors.HexColor("#F4F1EA")

BODY = ParagraphStyle("body", fontName="Helvetica", fontSize=9, leading=12.5, textColor=CHARCOAL)
SMALL = ParagraphStyle("small", parent=BODY, fontSize=8, leading=11, textColor=MUTED)
LABEL = ParagraphStyle("label", parent=SMALL, fontName="Helvetica-Bold", textColor=WOOD, spaceAfter=3)
HEADING = ParagraphStyle("heading", parent=BODY, fontName="Times-Bold", fontSize=13, leading=16, spaceAfter=6)
BRAND = ParagraphStyle("brand", parent=BODY, fontName="Times-Bold", fontSize=24, leading=26)
RIGHT = ParagraphStyle("right", parent=BODY, alignment=TA_RIGHT)


def inr(value) -> str:
    """Rs. 7,08,000 with Indian digit grouping. The built-in PDF fonts have no rupee sign."""
    amount = int(round(value or 0))
    digits = str(abs(amount))
    if len(digits) > 3:
        head, groups = digits[:-3], []
        while len(head) > 2:
            groups.insert(0, head[-2:])
            head = head[:-2]
        digits = ",".join([head, *groups] if head else groups) + "," + digits[-3:]
    return f"{'-' if amount < 0 else ''}Rs. {digits}"


def number(value) -> str:
    return f"{int(value):,}"


def draw_footer(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(doc.leftMargin + 6, 10 * mm, f"{STUDIO['name']} · {STUDIO['contact']}")
    canvas.drawRightString(doc.leftMargin + doc.width - 6, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


def build_quotation(estimate: Estimate) -> bytes:
    result = estimate.result
    user = estimate.user
    profile = getattr(user, "profile", None)
    issued = timezone.localtime(estimate.updated_at).date()

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=14 * mm,
        bottomMargin=18 * mm,
        title=f"{STUDIO['name']} quotation {estimate.reference}",
        author=STUDIO["name"],
    )
    width = doc.width - 12  # the page frame keeps 6pt of padding on each side
    story = []

    # Header: studio on the left, quotation details on the right.
    header = Table(
        [
            [
                [Paragraph(STUDIO["name"], BRAND), Paragraph(STUDIO["tagline"], SMALL)],
                [
                    Paragraph("<b>QUOTATION</b>", RIGHT),
                    Paragraph(estimate.reference, RIGHT),
                    Paragraph(f"Issued {issued:%d %b %Y}", ParagraphStyle("r", parent=SMALL, alignment=TA_RIGHT)),
                    Paragraph(
                        f"Valid until {issued + timedelta(days=VALID_FOR_DAYS):%d %b %Y}",
                        ParagraphStyle("r2", parent=SMALL, alignment=TA_RIGHT),
                    ),
                ],
            ]
        ],
        colWidths=[width * 0.6, width * 0.4],
    )
    header.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LINEBELOW", (0, 0), (-1, 0), 1.2, WOOD),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story += [header, Spacer(1, 6 * mm)]

    # Who it's for and what it covers.
    customer = [Paragraph("PREPARED FOR", LABEL), Paragraph(f"<b>{user.first_name or user.email}</b>", BODY)]
    customer.append(Paragraph(user.email, BODY))
    if profile and profile.phone:
        customer.append(Paragraph(profile.phone, BODY))

    property_label = estimate.get_property_type_display()
    if estimate.property_subtype:
        property_label += f" ({estimate.property_subtype})"
    project = [
        Paragraph("PROJECT", LABEL),
        Paragraph(f"<b>{estimate.title}</b>", BODY),
        Paragraph(f"{property_label} · {estimate.get_project_type_display()} · {estimate.get_scope_display()}", BODY),
        Paragraph(
            f"{number(estimate.area_sqft)} sq.ft carpet area · {estimate.room_count} rooms · "
            f"{result['package']['title']} · {result['location']['city'] or 'Other city'}",
            BODY,
        ),
    ]
    details = Table([[customer, project]], colWidths=[width * 0.38, width * 0.62])
    details.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story += [details, Spacer(1, 6 * mm), Paragraph("Cost breakdown", HEADING)]

    # Line items, then the totals.
    rows = [["Item", "Quantity", "Rate", "Amount"]]
    base = result["base"]
    rows.append([base["label"], f"{number(base['area'])} sq.ft", f"{inr(base['rate'])} / sq.ft", inr(base["amount"])])
    for section in ("furniture", "services"):
        for item in result[section]["items"]:
            unit = "sq.ft" if item["unit"] == "sq.ft" else ""
            rows.append(
                [
                    Paragraph(item["name"], BODY),
                    f"{number(item['quantity'])} {unit}".strip(),
                    f"{inr(item['unit_price'])}{' / sq.ft' if unit else ''}",
                    inr(item["amount"]),
                ]
            )
    first_total = len(rows)
    location = result["location"]
    rows.append(["Subtotal", "", "", inr(result["subtotal"])])
    if location["adjustment"]:
        rows.append([f"City adjustment ({location['city']}, x{location['multiplier']:g})", "", "", inr(location["adjustment"])])
    rows.append([f"GST ({result['gst']['rate'] * 100:g}%)", "", "", inr(result["gst"]["amount"])])
    rows.append(["Estimated total", "", "", inr(result["total"])])

    items = Table(rows, colWidths=[width * 0.46, width * 0.16, width * 0.18, width * 0.20], repeatRows=1)
    items.setStyle(
        TableStyle(
            [
                ("FONT", (0, 0), (-1, -1), "Helvetica", 9),
                ("TEXTCOLOR", (0, 0), (-1, -1), CHARCOAL),
                ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 8),
                ("TEXTCOLOR", (0, 0), (-1, 0), MUTED),
                ("BACKGROUND", (0, 0), (-1, 0), PAPER),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LINEBELOW", (0, 0), (-1, first_total - 1), 0.4, SAND),
                ("LINEABOVE", (0, first_total), (-1, first_total), 0.8, CHARCOAL),
                ("FONT", (0, -1), (-1, -1), "Helvetica-Bold", 10.5),
                ("LINEABOVE", (0, -1), (-1, -1), 0.8, CHARCOAL),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story += [
        items,
        Spacer(1, 2 * mm),
        Paragraph(
            f"Expected range: {inr(result['range']['low'])} to {inr(result['range']['high'])}, "
            "depending on site conditions and final material choices.",
            SMALL,
        ),
        Spacer(1, 5 * mm),
    ]

    # Cost split and timeline side by side.
    split = [[row["label"], inr(row["amount"])] for row in result["categories"]]
    phases = [[phase["name"], f"{phase['weeks']} wk"] for phase in result["timeline"]["phases"]]
    side_style = TableStyle(
        [
            ("FONT", (0, 0), (-1, -1), "Helvetica", 8.5),
            ("TEXTCOLOR", (0, 0), (-1, -1), CHARCOAL),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("LINEBELOW", (0, 0), (-1, -1), 0.4, SAND),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]
    )
    half = width / 2 - 5 * mm
    split_table = Table(split or [["", ""]], colWidths=[half * 0.62, half * 0.38], style=side_style)
    phase_table = Table(phases, colWidths=[half * 0.8, half * 0.2], style=side_style)
    columns = Table(
        [
            [Paragraph("Where the money goes", HEADING), Paragraph(f"Timeline: about {result['timeline']['weeks']} weeks", HEADING)],
            [split_table, phase_table],
        ],
        colWidths=[width / 2, width / 2],
    )
    columns.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (0, -1), 10 * mm),
            ]
        )
    )
    story += [columns, Spacer(1, 5 * mm)]

    inclusions = estimate.package.inclusions or []
    if inclusions:
        story.append(Paragraph(f"Included with the {result['package']['title']}", HEADING))
        story += [Paragraph(f"• {line}", BODY) for line in inclusions]
        story.append(Spacer(1, 5 * mm))

    if result.get("notes"):
        story.append(Paragraph("Notes", HEADING))
        story += [Paragraph(f"• {note}", BODY) for note in result["notes"]]
        story.append(Spacer(1, 5 * mm))

    story += [
        Paragraph(result["disclaimer"], SMALL),
        Paragraph(f"This quotation is valid for {VALID_FOR_DAYS} days from the issue date.", SMALL),
    ]

    doc.build(story, onFirstPage=draw_footer, onLaterPages=draw_footer)
    return buffer.getvalue()
