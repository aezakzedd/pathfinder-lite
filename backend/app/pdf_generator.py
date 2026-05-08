"""Backend expedition-style PDF generation for Pathfinder Lite."""

from __future__ import annotations

from datetime import datetime
from typing import Any
import uuid

from fpdf import FPDF

from .pdf_store import generate_pdf_id, save_pdf
from .map_link import build_map_link_url, create_map_link
from .map_renderer import generate_route_map_image, generate_fallback_map_image


# Original Pathfinder-inspired theme.
NAVY = (15, 23, 42)
GREEN = (16, 185, 129)
BLUE = (37, 99, 235)
YELLOW = (234, 179, 8)
TEAL = (20, 184, 166)
RED = (220, 38, 38)
LIGHT_GRAY = (243, 244, 246)
BORDER = (220, 224, 230)
TEXT = (31, 41, 55)
MUTED = (107, 114, 128)
SOFT_TEXT = (156, 163, 175)
WHITE = (255, 255, 255)

PAGE_MARGIN = 15
FOOTER_HEIGHT = 16
PAGE_BOTTOM_SAFE = 24


class PathfinderPDF(FPDF):
    def __init__(self, *args, generated_label: str, **kwargs):
        super().__init__(*args, **kwargs)
        self.generated_label = generated_label

    def footer(self):
        self.set_y(-12)
        self.set_draw_color(*BORDER)
        self.set_line_width(0.2)
        self.line(PAGE_MARGIN, self.get_y() - 2, self.w - PAGE_MARGIN, self.get_y() - 2)
        self.set_font("helvetica", "", 6.5)
        self.set_text_color(180, 180, 180)
        self.cell(
            0,
            4,
            f"Pathfinder AI  -  Generated {self.generated_label}  -  Timing estimates may vary",
            align="L",
        )
        self.set_x(PAGE_MARGIN)
        self.cell(0, 4, f"Page {self.page_no()} of {{nb}}", align="R")


def generate_itinerary_pdf(payload: dict[str, Any], base_url: str = "") -> tuple[str, str, dict[str, Any]]:
    """Generate and persist a Pathfinder expedition-style itinerary PDF."""
    pdf_id = generate_pdf_id()
    itinerary_id = get_itinerary_id(payload)
    generated_label = format_generated_date(datetime.now())

    # Store overlay metadata for preview
    overlay_metadata: dict[str, Any] = {"pdf_id": pdf_id, "map_links": []}

    days = normalize_days(payload.get("days", {}))
    sorted_day_keys = sorted(days.keys(), key=lambda value: int(value) if str(value).isdigit() else 0)
    all_stops = [stop for key in sorted_day_keys for stop in days.get(key, [])]
    setup = payload.get("setup") or {}
    date_range = payload.get("dateRange") or {}
    start_point = str(setup.get("startPoint") or payload.get("activeHubName") or "Virac")
    day_count = int(payload.get("dayCount") or len(sorted_day_keys) or 1)
    total_stops = int(payload.get("totalStops") or len(all_stops))
    total_distance = get_total_distance_km(payload, all_stops)

    pdf = PathfinderPDF(format="A4", unit="mm", generated_label=generated_label)
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=False)
    pdf.set_margins(PAGE_MARGIN, PAGE_MARGIN, PAGE_MARGIN)
    pdf.add_page()

    current_y = draw_cover_header(
        pdf,
        itinerary_id=itinerary_id,
        start_point=start_point,
        date_label=format_date_range(date_range, setup),
        day_count=day_count,
        total_stops=total_stops,
        total_distance=total_distance,
    )

    previous_day_last_stop = None
    for index, day_key in enumerate(sorted_day_keys):
        stops = days.get(day_key, [])
        if not stops:
            continue

        if index > 0:
            pdf.add_page()
            current_y = 20

        day_meta = get_day_meta(payload, day_key)
        start_label = (
            day_meta.get("startLabel")
            or day_meta.get("start")
            or get_stop_name(previous_day_last_stop)
            or start_point
        )
        current_y, previous_day_last_stop, day_overlay = draw_day(
            pdf,
            day_key=day_key,
            stops=stops,
            start_label=start_label,
            day_meta=day_meta,
            start_point=start_point,
            current_y=current_y,
            pdf_id=pdf_id,
            base_url=base_url,
            overlay_metadata=overlay_metadata,
        )

    current_y += 6
    current_y = draw_financial_blueprint(pdf, current_y, all_stops, setup)
    current_y = draw_emergency_reference(pdf, current_y)
    draw_travel_reminders_and_disclaimer(pdf, current_y)

    pdf_bytes = pdf.output(dest="S")
    save_pdf(pdf_id, bytes(pdf_bytes))
    return pdf_id, f"/api/pdf/{pdf_id}.pdf", overlay_metadata


def draw_text(pdf: PathfinderPDF, x: float, y: float, text: Any, *, align: str = "L") -> None:
    """Draw text with simple left/center/right positioning for older fpdf2 builds."""
    value = sanitize(text)
    if align == "C":
        x -= pdf.get_string_width(value) / 2
    elif align == "R":
        x -= pdf.get_string_width(value)
    pdf.text(x, y, value)


def draw_round_rect(
    pdf: PathfinderPDF,
    x: float,
    y: float,
    width: float,
    height: float,
    radius: float,
    *,
    style: str = "",
) -> None:
    """Draw a rounded rectangle when available, with a plain rectangle fallback."""
    rounded = getattr(pdf, "rounded_rect", None)
    if callable(rounded):
        rounded(x, y, width, height, radius, style=style)
        return
    pdf.rect(x, y, width, height, style=style)


def draw_cover_header(
    pdf: PathfinderPDF,
    *,
    itinerary_id: str,
    start_point: str,
    date_label: str,
    day_count: int,
    total_stops: int,
    total_distance: float,
) -> float:
    page_width = pdf.w
    content_width = page_width - (PAGE_MARGIN * 2)

    pdf.set_fill_color(*NAVY)
    pdf.rect(0, 0, page_width, 60, "F")

    pdf.set_font("courier", "B", 12)
    pdf.set_text_color(*GREEN)
    pdf.text(PAGE_MARGIN, 15, "STATUS: Finalized")
    pdf.text(PAGE_MARGIN, 20, "PATHFINDER_v1.0.21")
    draw_text(pdf, page_width - PAGE_MARGIN, 15, f"ID: {itinerary_id}", align="R")

    pdf.set_font("helvetica", "B", 36)
    pdf.set_text_color(*WHITE)
    draw_text(pdf, page_width / 2, 40, "EXPEDITION PLAN", align="C")

    pdf.set_font("courier", "", 11)
    pdf.set_text_color(200, 220, 255)
    draw_text(
        pdf,
        page_width / 2,
        50,
        f"CATANDUANES, PH // HUB: {sanitize(start_point)}",
        align="C",
    )

    y = 75
    pdf.set_font("helvetica", "I", 12)
    pdf.set_text_color(*MUTED)
    draw_text(pdf, page_width / 2, y, date_label, align="C")
    y += 8

    day_word = "Day" if day_count == 1 else "Days"
    stop_word = "Stop" if total_stops == 1 else "Stops"
    pdf.set_font("courier", "B", 9)
    pdf.set_text_color(*SOFT_TEXT)
    draw_text(
        pdf,
        page_width / 2,
        y,
        f"{day_count} {day_word}  -  {total_stops} {stop_word}  -  {total_distance:.1f} km total",
        align="C",
    )
    y += 6

    pdf.set_draw_color(*BORDER)
    pdf.set_line_width(0.3)
    pdf.line(PAGE_MARGIN, y, page_width - PAGE_MARGIN, y)
    y += 8

    pdf.set_font("helvetica", "B", 8)
    pdf.set_text_color(*BLUE)
    draw_text(pdf, page_width / 2, y, "GENERATED BY PATHFINDER AI", align="C")
    y += 16

    return y


def draw_day(
    pdf: PathfinderPDF,
    *,
    day_key: str,
    stops: list[dict[str, Any]],
    start_label: str,
    day_meta: dict[str, Any],
    start_point: str,
    current_y: float,
    pdf_id: str,
    base_url: str,
    overlay_metadata: dict[str, Any],
) -> tuple[float, dict[str, Any] | None, dict[str, Any]]:
    day_num = int(day_key) if str(day_key).isdigit() else day_key
    schedule = build_day_schedule(stops, day_meta)
    status = schedule["status"]
    start_minutes = schedule["start_minutes"]
    end_minutes = schedule["end_minutes"]

    current_y = ensure_space(pdf, current_y, 92)
    current_y = draw_day_header(
        pdf,
        current_y,
        day_label=f"DAY {day_num}",
        stop_count=len(stops),
        status_text=f"{status} Schedule - Start at {format_time_12(start_minutes)}",
    )

    google_maps_url = build_day_directions_url(start_label, stops)
    launcher_url = ""
    map_link_id = ""
    if google_maps_url and base_url:
        map_link_id = create_map_link(pdf_id, google_maps_url)
        launcher_url = build_map_link_url(base_url, map_link_id)

    current_y, map_overlay = draw_map_placeholder(
        pdf,
        current_y,
        launcher_url,
        stops,
        start_label,
        map_link_id,
        overlay_metadata,
    )
    current_y += 8

    last_block = ""
    start_line_drawn = False

    for scheduled in schedule["items"]:
        block = get_time_block(scheduled["arrival_minutes"]).upper()
        if block != last_block:
            current_y = ensure_space(pdf, current_y, 15)
            pdf.set_font("helvetica", "B", 12)
            pdf.set_text_color(*BLUE)
            pdf.text(PAGE_MARGIN + 5, current_y, block)
            current_y += 8
            last_block = block

        if not start_line_drawn:
            current_y = draw_transit_line(pdf, current_y, f"-> START FROM {sanitize(start_label).upper()}")
            start_line_drawn = True

        drive_minutes = scheduled["drive_minutes"]
        if drive_minutes > 0:
            transport = get_drive_transport_type(drive_minutes)
            cost = get_drive_cost_estimate(drive_minutes)
            current_y = draw_transit_line(
                pdf,
                current_y,
                f"-> {drive_minutes} MIN DRIVE // {transport} ({cost})",
            )

        current_y = draw_stop_card(
            pdf,
            current_y,
            scheduled["stop"],
            scheduled["arrival_minutes"],
            scheduled["visit_minutes"],
        )

    current_y = ensure_space(pdf, current_y, 16)
    pdf.set_font("courier", "B", 7)
    pdf.set_text_color(*SOFT_TEXT)
    draw_text(
        pdf,
        pdf.w / 2,
        current_y,
        f"- END DAY {day_num} // EST FINISH: {format_time_12(end_minutes)} -",
        align="C",
    )
    current_y += 16

    return current_y, stops[-1] if stops else None


def draw_day_header(
    pdf: PathfinderPDF,
    y: float,
    *,
    day_label: str,
    stop_count: int,
    status_text: str,
) -> float:
    content_width = pdf.w - (PAGE_MARGIN * 2)
    pdf.set_fill_color(*NAVY)
    draw_round_rect(pdf, PAGE_MARGIN, y, content_width, 28, 3, style="F")

    pdf.set_font("helvetica", "B", 16)
    pdf.set_text_color(*WHITE)
    pdf.text(PAGE_MARGIN + 10, y + 12, day_label)

    pdf.set_font("helvetica", "B", 9)
    pdf.set_text_color(*YELLOW)
    pdf.text(PAGE_MARGIN + 10, y + 22, status_text)

    pdf.set_font("helvetica", "", 12)
    pdf.set_text_color(200, 200, 200)
    stop_word = "Stop" if stop_count == 1 else "Stops"
    draw_text(pdf, pdf.w - PAGE_MARGIN - 10, y + 12, f"{stop_count} {stop_word}", align="R")
    return y + 36


def draw_map_placeholder(
    pdf: PathfinderPDF,
    y: float,
    directions_url: str = "",
    stops: list[dict[str, Any]] | None = None,
    start_label: str = "",
    map_link_id: str = "",
    overlay_metadata: dict[str, Any] | None = None,
) -> tuple[float, dict[str, Any]]:
    content_width = pdf.w - (PAGE_MARGIN * 2)
    image_h = 44
    x = PAGE_MARGIN

    # Generate route map image if coordinates are available
    map_image_bytes = None
    if stops:
        try:
            map_image_bytes = generate_route_map_image(stops, start_label)
        except Exception:
            map_image_bytes = None

    # Use fallback image if generation failed
    if not map_image_bytes:
        map_image_bytes = generate_fallback_map_image()

    # Embed the map image
    pdf.image(map_image_bytes, x=x, y=y, w=content_width, h=image_h, type="PNG")

    # Record overlay metadata for preview
    overlay = {}
    if map_link_id and overlay_metadata is not None:
        # Calculate normalized coordinates (0-1)
        norm_x = x / pdf.w
        norm_y = y / pdf.h
        norm_w = content_width / pdf.w
        norm_h = image_h / pdf.h

        overlay = {
            "page": pdf.page_no(),
            "type": "map",
            "href": f"/m/{map_link_id}",
            "target": "_blank",
            "x": norm_x,
            "y": norm_y,
            "w": norm_w,
            "h": norm_h,
            "label": f"Open Day {pdf.page_no() - 1} in Google Maps",
        }

        overlay_metadata["map_links"].append(overlay)

    y += image_h + 6
    pdf.set_font("helvetica", "B", 8)
    if directions_url:
        pdf.set_text_color(*BLUE)
        draw_text(pdf, pdf.w / 2, y, "Click map image for directions.", align="C")
    else:
        pdf.set_text_color(*SOFT_TEXT)
        draw_text(pdf, pdf.w / 2, y, "Directions unavailable: missing coordinates.", align="C")
    return y + 6, overlay


def draw_transit_line(pdf: PathfinderPDF, y: float, text: str) -> float:
    y = ensure_space(pdf, y, 8)
    pdf.set_font("courier", "B", 9)
    pdf.set_text_color(*SOFT_TEXT)
    pdf.text(PAGE_MARGIN + 20, y, sanitize(text))
    return y + 8


def draw_stop_card(
    pdf: PathfinderPDF,
    y: float,
    stop: dict[str, Any],
    arrival_minutes: int,
    visit_minutes: int,
) -> float:
    content_width = pdf.w - (PAGE_MARGIN * 2)
    pad = 7
    badge_w = 28
    text_x = PAGE_MARGIN + pad + badge_w + 10
    text_w = content_width - pad - badge_w - 10 - pad

    name = shorten(get_stop_name(stop), 44)
    municipality = sanitize(get_municipality(stop)).upper()
    description = shorten(get_description(stop), 124)
    metadata = build_stop_metadata(stop, visit_minutes)

    pdf.set_font("helvetica", "", 8)
    desc_lines = wrap_text(pdf, description, text_w, max_lines=2) if description else []
    meta_lines = wrap_text(pdf, metadata, text_w, max_lines=2) if metadata else []

    card_height = max(26, pad * 2 + 7 + (len(desc_lines) * 4) + (len(meta_lines) * 4) + 4)
    y = ensure_space(pdf, y, card_height + 5)

    pdf.set_fill_color(*WHITE)
    pdf.set_draw_color(*BORDER)
    draw_round_rect(pdf, PAGE_MARGIN, y, content_width, card_height, 3, style="FD")

    inner_y = y + pad
    pdf.set_fill_color(*BLUE)
    draw_round_rect(pdf, PAGE_MARGIN + pad, inner_y, badge_w, 11, 1.5, style="F")
    pdf.set_font("courier", "B", 7.2)
    pdf.set_text_color(*WHITE)
    draw_text(pdf, PAGE_MARGIN + pad + (badge_w / 2), inner_y + 7.3, format_time_12(arrival_minutes), align="C")

    row_y = inner_y + 7.8
    if municipality:
        pdf.set_font("helvetica", "", 7)
        pdf.set_text_color(*SOFT_TEXT)
        draw_text(pdf, PAGE_MARGIN + content_width - pad, row_y, municipality, align="R")

    right_reserve = min(40, pdf.get_string_width(municipality) + 5) if municipality else 0
    max_name_w = max(42, text_w - right_reserve)
    display_name = trim_to_width(pdf, name, max_name_w, font=("helvetica", "B", 10.5))
    pdf.set_font("helvetica", "B", 10.5)
    pdf.set_text_color(*NAVY)
    pdf.text(text_x, row_y, display_name)

    if is_top_10(stop):
        label_x = text_x + pdf.get_string_width(display_name) + 4
        if label_x < PAGE_MARGIN + content_width - right_reserve - 16:
            pdf.set_font("helvetica", "B", 6.2)
            pdf.set_text_color(*YELLOW)
            pdf.text(label_x, row_y - 0.5, "* TOP 10")

    line_y = row_y + 8
    if desc_lines:
        pdf.set_font("helvetica", "", 8)
        pdf.set_text_color(*TEXT)
        for line in desc_lines:
            pdf.text(text_x, line_y, line)
            line_y += 4

    if meta_lines:
        pdf.set_font("helvetica", "", 7)
        pdf.set_text_color(111, 79, 160)
        for line in meta_lines:
            pdf.text(text_x, line_y, line)
            line_y += 4

    return y + card_height + 4


def draw_financial_blueprint(
    pdf: PathfinderPDF,
    y: float,
    all_stops: list[dict[str, Any]],
    setup: dict[str, Any],
) -> float:
    y = ensure_space(pdf, y, 98)
    content_width = pdf.w - (PAGE_MARGIN * 2)

    pdf.set_fill_color(*TEAL)
    draw_round_rect(pdf, PAGE_MARGIN, y, content_width, 20, 3, style="F")
    pdf.set_font("helvetica", "B", 14)
    pdf.set_text_color(*WHITE)
    pdf.text(PAGE_MARGIN + 10, y + 14, "FINANCIAL BLUEPRINT")
    y += 30

    counts = count_budget_tiers(all_stops, setup)
    pdf.set_font("helvetica", "B", 10)
    pdf.set_text_color(*NAVY)
    pdf.text(PAGE_MARGIN, y, "Budget Distribution")
    y += 7

    pdf.set_fill_color(*LIGHT_GRAY)
    draw_round_rect(pdf, PAGE_MARGIN, y, content_width, 12, 2, style="F")
    pdf.set_font("helvetica", "B", 8)
    pdf.set_text_color(*NAVY)
    pdf.text(PAGE_MARGIN + 8, y + 8, "- BUDGET TIER")
    pdf.text(PAGE_MARGIN + 70, y + 8, "- EST. COST RANGE")
    draw_text(pdf, pdf.w - PAGE_MARGIN - 8, y + 8, "# SPOTS", align="R")
    y += 16

    for key, label, range_text, color in budget_rows():
        count = counts.get(key, 0)
        if count <= 0:
            continue
        y = ensure_space(pdf, y, 15)
        pdf.set_draw_color(240, 240, 240)
        pdf.line(PAGE_MARGIN, y + 10, pdf.w - PAGE_MARGIN, y + 10)
        pdf.set_fill_color(*color)
        pdf.circle(PAGE_MARGIN + 5, y + 6, 2, style="F")
        pdf.set_font("helvetica", "", 9)
        pdf.set_text_color(*NAVY)
        pdf.text(PAGE_MARGIN + 12, y + 8, label)
        pdf.set_text_color(*TEXT)
        pdf.text(PAGE_MARGIN + 70, y + 8, range_text)
        pdf.set_font("helvetica", "B", 9)
        pdf.set_text_color(*NAVY)
        draw_text(pdf, pdf.w - PAGE_MARGIN - 8, y + 8, str(count), align="R")
        y += 14

    y += 6
    y = ensure_space(pdf, y, 30)
    pdf.set_fill_color(255, 251, 235)
    draw_round_rect(pdf, PAGE_MARGIN, y, content_width, 24, 2, style="F")
    pdf.set_draw_color(*YELLOW)
    draw_round_rect(pdf, PAGE_MARGIN, y, content_width, 24, 2, style="D")
    pdf.set_font("helvetica", "B", 7.5)
    pdf.set_text_color(*YELLOW)
    pdf.text(PAGE_MARGIN + 8, y + 7, "! LOGISTICS & PAYMENT TIP")
    pdf.set_font("helvetica", "", 7.5)
    pdf.set_text_color(*TEXT)
    pdf.text(PAGE_MARGIN + 8, y + 14, "Most locations in Catanduanes are cash-only. ATMs are available in Virac town center.")
    pdf.text(PAGE_MARGIN + 8, y + 20, "FUEL TAX: Catanduanes terrain involves mountain passes. Budget extra for tricycle/van fuel.")
    y += 34

    pdf.set_font("helvetica", "B", 10)
    pdf.set_text_color(*NAVY)
    pdf.text(PAGE_MARGIN, y, "Cost Breakdown Per Stop")
    y += 8

    for index, stop in enumerate(all_stops):
        y = ensure_space(pdf, y, 13)
        shade = 250 if index % 2 == 0 else 255
        pdf.set_fill_color(shade, shade, shade)
        draw_round_rect(pdf, PAGE_MARGIN, y, content_width, 10, 1, style="F")
        pdf.set_font("helvetica", "", 8)
        pdf.set_text_color(*NAVY)
        pdf.text(PAGE_MARGIN + 5, y + 7, shorten(get_stop_name(stop), 30))
        pdf.set_text_color(*TEXT)
        draw_text(pdf, pdf.w - PAGE_MARGIN - 5, y + 7, get_cost_label(stop, setup), align="R")
        y += 12

    return y + 10


def draw_emergency_reference(pdf: PathfinderPDF, y: float) -> float:
    y = ensure_space(pdf, y, 112)
    content_width = pdf.w - (PAGE_MARGIN * 2)

    pdf.set_fill_color(*RED)
    draw_round_rect(pdf, PAGE_MARGIN, y, content_width, 20, 3, style="F")
    pdf.set_font("helvetica", "B", 14)
    pdf.set_text_color(*WHITE)
    pdf.text(PAGE_MARGIN + 10, y + 14, "EMERGENCY & REFERENCE")
    y += 28

    items = [
        ("[Location]  Provincial Tourism Office", "Capitol Complex, Virac - (052) 811-1231"),
        ("[Medical]  Catanduanes Provincial Hospital", "Virac, Catanduanes - (052) 811-1163"),
        ("[Police]  Philippine National Police - Virac", "Virac Station - (052) 811-1102"),
        ("[Port]  Philippine Coast Guard", "Port of Virac - (052) 811-1250"),
        ("[Phone]  Emergency Hotline", "911 (National) / 117 (PNP)"),
    ]

    for label, value in items:
        y = ensure_space(pdf, y, 17)
        pdf.set_fill_color(254, 242, 242)
        draw_round_rect(pdf, PAGE_MARGIN, y, content_width, 14, 2, style="F")
        pdf.set_font("helvetica", "B", 8)
        pdf.set_text_color(*NAVY)
        pdf.text(PAGE_MARGIN + 5, y + 9, label)
        pdf.set_font("helvetica", "", 8)
        pdf.set_text_color(*TEXT)
        draw_text(pdf, pdf.w - PAGE_MARGIN - 5, y + 9, value, align="R")
        y += 17

    return y + 5


def draw_travel_reminders_and_disclaimer(pdf: PathfinderPDF, y: float) -> float:
    content_width = pdf.w - (PAGE_MARGIN * 2)
    y = ensure_space(pdf, y, 88)

    pdf.set_fill_color(239, 246, 255)
    draw_round_rect(pdf, PAGE_MARGIN, y, content_width, 40, 3, style="F")
    pdf.set_draw_color(*BLUE)
    draw_round_rect(pdf, PAGE_MARGIN, y, content_width, 40, 3, style="D")
    pdf.set_font("helvetica", "B", 8)
    pdf.set_text_color(*BLUE)
    pdf.text(PAGE_MARGIN + 8, y + 9, "TRAVEL REMINDERS")
    pdf.set_font("helvetica", "", 7)
    pdf.set_text_color(*TEXT)

    tips = [
        "* Download offline maps - cell signal is weak in coastal and mountainous areas.",
        "* Bring cash - most rural spots do not accept digital payments.",
        "* Check weather forecasts - typhoon season is June to November.",
        "* Respect local customs - always ask before photographing locals or sacred sites.",
    ]
    for index, tip in enumerate(tips):
        pdf.text(PAGE_MARGIN + 8, y + 17 + (index * 6), tip)

    y += 49
    y = ensure_space(pdf, y, 28)
    disclaimer = (
        "AI-generated content: Itinerary details - including times, costs, and availability - "
        "are estimates produced by an AI model and may be inaccurate or outdated. Always verify "
        "with local operators before travelling. Pathfinder AI is not liable for any discrepancies."
    )
    pdf.set_font("helvetica", "I", 8.5)
    pdf.set_text_color(150, 150, 150)
    for line in wrap_text(pdf, disclaimer, content_width, max_lines=4):
        draw_text(pdf, pdf.w / 2, y, line, align="C")
        y += 4.5
    return y


def build_day_schedule(stops: list[dict[str, Any]], day_meta: dict[str, Any]) -> dict[str, Any]:
    stop_parts = []
    total_minutes = 0

    for index, stop in enumerate(stops):
        drive_minutes = get_drive_minutes(stop, first=(index == 0))
        visit_minutes = get_visit_minutes(stop)
        total_minutes += drive_minutes + visit_minutes
        stop_parts.append({
            "stop": stop,
            "drive_minutes": drive_minutes,
            "visit_minutes": visit_minutes,
        })

    start_minutes = parse_time_to_minutes(day_meta.get("startTime") or day_meta.get("start_time"))
    if start_minutes is None:
        hard_end = 17 * 60
        required_start = hard_end - total_minutes
        if total_minutes <= 8 * 60:
            start_minutes = 8 * 60
        else:
            start_minutes = max(6 * 60, min(8 * 60, required_start))

    current = start_minutes
    scheduled = []
    for part in stop_parts:
        arrival = current + part["drive_minutes"]
        scheduled.append({
            **part,
            "arrival_minutes": arrival,
        })
        current = arrival + part["visit_minutes"]

    return {
        "items": scheduled,
        "start_minutes": start_minutes,
        "end_minutes": current,
        "total_minutes": total_minutes,
        "status": calculate_day_status(total_minutes),
    }


def calculate_day_status(total_minutes: int) -> str:
    if total_minutes > 9 * 60:
        return "Overloaded"
    if total_minutes > 8 * 60:
        return "Tight"
    if total_minutes >= 6 * 60:
        return "Busy"
    return "Relaxed"


def ensure_space(pdf: PathfinderPDF, y: float, needed: float) -> float:
    if y + needed > pdf.h - PAGE_BOTTOM_SAFE:
        pdf.add_page()
        return 20
    return y


def normalize_days(raw_days: Any) -> dict[str, list[dict[str, Any]]]:
    if isinstance(raw_days, list):
        return {"1": [stop for stop in raw_days if isinstance(stop, dict)]}
    if not isinstance(raw_days, dict):
        return {}
    days: dict[str, list[dict[str, Any]]] = {}
    for key, stops in raw_days.items():
        if isinstance(stops, list):
            days[str(key)] = [stop for stop in stops if isinstance(stop, dict)]
    return days


def get_day_meta(payload: dict[str, Any], day_key: str) -> dict[str, Any]:
    candidates = [
        payload.get("dayMeta"),
        payload.get("daysMeta"),
        payload.get("day_meta"),
    ]
    for candidate in candidates:
        if isinstance(candidate, dict):
            meta = candidate.get(day_key) or candidate.get(str(day_key))
            if isinstance(meta, dict):
                return meta
    return {}


def get_itinerary_id(payload: dict[str, Any]) -> str:
    raw = payload.get("itineraryId") or payload.get("id")
    if raw:
        return sanitize(str(raw))[:10].upper()
    return str(uuid.uuid4())[:7].upper()


def get_total_distance_km(payload: dict[str, Any], stops: list[dict[str, Any]]) -> float:
    for key in ("totalDistanceKm", "totalDistance", "distanceKm", "routeDistanceKm"):
        value = payload.get(key)
        parsed = parse_float(value)
        if parsed is not None and parsed > 0:
            return parsed
    drive_minutes = sum(get_drive_minutes(stop, first=(index == 0)) for index, stop in enumerate(stops))
    return max(0.1, drive_minutes * 0.55)


def format_date_range(date_range: dict[str, Any], setup: dict[str, Any]) -> str:
    start = date_range.get("startDate") or date_range.get("start") or setup.get("tripDate") or setup.get("startDate")
    end = date_range.get("endDate") or date_range.get("end") or setup.get("tripEndDate") or setup.get("endDate")
    start_label = format_date_label(start)
    end_label = format_date_label(end)
    if start_label and end_label:
        return f"{start_label}  -  {end_label}"
    return start_label or end_label or "Date TBD"


def format_date_label(value: Any) -> str:
    if not value:
        return ""
    if isinstance(value, datetime):
        date = value
    else:
        try:
            date = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            return sanitize(str(value))
    return f"{date.strftime('%a')}, {date.strftime('%b')} {date.day}"


def format_generated_date(value: datetime) -> str:
    return f"{value.month}/{value.day}/{value.year}"


def get_time_block(minutes: int) -> str:
    hour = (minutes // 60) % 24
    if hour < 12:
        return "Morning"
    if hour < 17:
        return "Afternoon"
    return "Evening"


def format_time_12(minutes: int) -> str:
    hour24 = (minutes // 60) % 24
    minute = minutes % 60
    suffix = "AM" if hour24 < 12 else "PM"
    hour12 = hour24 % 12 or 12
    return f"{hour12:02d}:{minute:02d} {suffix}"


def parse_time_to_minutes(value: Any) -> int | None:
    if not value:
        return None
    if isinstance(value, (int, float)):
        return int(value)
    text = str(value).strip().upper()
    try:
        suffix = None
        if text.endswith("AM") or text.endswith("PM"):
            suffix = text[-2:]
            text = text[:-2].strip()
        parts = text.split(":")
        hour = int(parts[0])
        minute = int(parts[1]) if len(parts) > 1 else 0
        if suffix == "PM" and hour != 12:
            hour += 12
        if suffix == "AM" and hour == 12:
            hour = 0
        return hour * 60 + minute
    except (ValueError, IndexError):
        return None


def get_drive_minutes(stop: dict[str, Any], *, first: bool = False) -> int:
    for key in ("driveTime", "drive_time", "travel_time", "travelTime", "drive_minutes"):
        parsed = parse_minutes(stop.get(key))
        if parsed is not None:
            return max(0, parsed)
    return 10 if first else 20


def get_visit_minutes(stop: dict[str, Any]) -> int:
    parsed = parse_minutes(stop.get("visit_time_minutes"))
    if parsed is not None:
        return max(15, parsed)

    duration = stop.get("duration")
    if isinstance(duration, (int, float)):
        # Frontend duration is usually hours. Very large values are likely minutes.
        if duration <= 12:
            return max(15, int(round(float(duration) * 60)))
        return max(15, int(round(float(duration))))
    parsed = parse_minutes(duration)
    if parsed is not None:
        return max(15, parsed)
    return 60


def parse_minutes(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return int(round(float(value)))
    text = str(value).strip().lower()
    if not text:
        return None
    if text.isdigit():
        return int(text)

    total = 0
    found = False
    for token in text.replace("-", " ").replace("~", " ").split():
        clean = token.strip(" ,")
        if clean.endswith("h"):
            parsed = parse_float(clean[:-1])
            if parsed is not None:
                total += int(round(parsed * 60))
                found = True
        elif clean.endswith("m"):
            parsed = parse_float(clean[:-1])
            if parsed is not None:
                total += int(round(parsed))
                found = True
        else:
            parsed = parse_float(clean)
            if parsed is not None and not found:
                total += int(round(parsed))
                found = True
                break
    return total if found else None


def parse_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace("km", "").replace(",", "")
    try:
        return float(text)
    except ValueError:
        return None


def get_drive_transport_type(drive_minutes: int) -> str:
    if drive_minutes <= 10:
        return "TRICYCLE"
    if drive_minutes <= 30:
        return "VAN / TRICYCLE"
    return "PRIVATE VAN RECOMMENDED"


def get_drive_cost_estimate(drive_minutes: int) -> str:
    if drive_minutes <= 10:
        return "~P30-50"
    if drive_minutes <= 30:
        return "~P50-150"
    return "~P150-500"


def get_stop_name(stop: dict[str, Any] | None) -> str:
    if not stop:
        return ""
    return sanitize(stop.get("name") or stop.get("title") or "Unknown Location")


def get_municipality(stop: dict[str, Any]) -> str:
    return sanitize(stop.get("municipality") or stop.get("city") or "")


def get_description(stop: dict[str, Any]) -> str:
    return sanitize(stop.get("description") or stop.get("desc") or "Local destination details are available at the kiosk.")


def is_top_10(stop: dict[str, Any]) -> bool:
    return bool(
        stop.get("is_top_10")
        or stop.get("isTop10")
        or stop.get("is_top10")
        or stop.get("top10")
    )


def build_stop_metadata(stop: dict[str, Any], visit_minutes: int) -> str:
    parts = []
    opening = sanitize(stop.get("opening_hours") or stop.get("hours") or "")
    if opening:
        parts.append(f"Open: {opening}")
    parts.append(f"Stay: {visit_minutes}m")

    best_time = sanitize(stop.get("best_time") or stop.get("best_time_of_day") or "")
    if best_time and best_time.lower() != "any":
        parts.append(f"Best: {best_time}")

    exposure = get_exposure_tip(stop)
    if exposure:
        parts.append(exposure)
    return "  -  ".join(parts)


def get_exposure_tip(stop: dict[str, Any]) -> str:
    raw = sanitize(stop.get("outdoor_exposure") or stop.get("exposure") or stop.get("weather_tip") or "")
    key = raw.lower()
    mapping = {
        "open": "Bring sun protection and water",
        "shaded": "Partially shaded - hat recommended",
        "indoor": "Indoor - comfortable in any weather",
    }
    return mapping.get(key, raw)


def count_budget_tiers(all_stops: list[dict[str, Any]], setup: dict[str, Any]) -> dict[str, int]:
    counts = {"low": 0, "medium": 0, "high": 0, "unknown": 0}
    setup_key = normalize_budget_key(setup.get("budget"))
    for stop in all_stops:
        key = normalize_budget_key(stop.get("min_budget") or stop.get("budget") or setup_key)
        counts[key if key in counts else "unknown"] += 1
    return counts


def budget_rows() -> list[tuple[str, str, str, tuple[int, int, int]]]:
    return [
        ("low", "Budget-Friendly", "P50 - P200 per person", GREEN),
        ("medium", "Moderate", "P200 - P500 per person", YELLOW),
        ("high", "Premium", "P500+ per person", RED),
        ("unknown", "Varies", "Verify locally", SOFT_TEXT),
    ]


def get_cost_label(stop: dict[str, Any], setup: dict[str, Any]) -> str:
    explicit = stop.get("cost") or stop.get("cost_estimate") or stop.get("price")
    if explicit:
        return sanitize(str(explicit))
    key = normalize_budget_key(stop.get("min_budget") or stop.get("budget") or setup.get("budget"))
    for row_key, label, range_text, _ in budget_rows():
        if key == row_key:
            compact = range_text.replace("P50 - P200 per person", "P50-200")
            compact = compact.replace("P200 - P500 per person", "P200-500")
            compact = compact.replace("P500+ per person", "P500+")
            return f"{compact} ({label})"
    return "Varies"


def normalize_budget_key(value: Any) -> str:
    text = str(value or "").strip().lower()
    if text in {"low", "budget", "budget-friendly", "budget friendly", "<=p200", "p50-200"}:
        return "low"
    if text in {"medium", "moderate", "mid", "p200-p600", "p200-500"}:
        return "medium"
    if text in {"high", "premium", "expensive", "p600+", "p500+"}:
        return "high"
    return "unknown"


def wrap_text(pdf: PathfinderPDF, text: str, width: float, max_lines: int = 2) -> list[str]:
    words = sanitize(text).split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if pdf.get_string_width(candidate) <= width:
            current = candidate
            continue
        if current:
            lines.append(current)
        current = word
        if len(lines) >= max_lines:
            break
    if current and len(lines) < max_lines:
        lines.append(current)
    if len(lines) == max_lines and words:
        original = " ".join(words)
        joined = " ".join(lines)
        if len(joined) < len(original) and not lines[-1].endswith("..."):
            lines[-1] = trim_to_width(pdf, f"{lines[-1]}...", width, font=None)
    return lines


def trim_to_width(
    pdf: PathfinderPDF,
    text: str,
    max_width: float,
    font: tuple[str, str, float] | None = None,
) -> str:
    if font:
        pdf.set_font(font[0], font[1], font[2])
    value = sanitize(text)
    if pdf.get_string_width(value) <= max_width:
        return value
    while value and pdf.get_string_width(f"{value}...") > max_width:
        value = value[:-1]
    return f"{value}..." if value else "..."


def shorten(text: str, max_length: int) -> str:
    value = sanitize(text)
    return f"{value[:max_length - 3]}..." if len(value) > max_length else value


def sanitize(value: Any) -> str:
    text = str(value or "")
    replacements = {
        "\u2014": "-",
        "\u2013": "-",
        "\u2011": "-",
        "\u2022": "*",
        "\u00b7": "-",
        "\u20b1": "P",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text.encode("latin-1", "replace").decode("latin-1").replace("?", "")


# Known hub coordinates for Catanduanes (lat, lng for Google Maps)
HUB_COORDINATES = {
    "virac": (13.5833, 124.2333),
    "san andres": (13.6167, 124.0833),
}


def extract_coordinates(stop: dict[str, Any]) -> tuple[float, float] | None:
    """Extract (lat, lng) coordinates from a stop, supporting multiple field formats."""
    coords = None

    # Try coordinates array [lng, lat] or [lat, lng]
    if "coordinates" in stop:
        val = stop["coordinates"]
        if isinstance(val, (list, tuple)) and len(val) >= 2:
            # GeoJSON uses [lng, lat], Google Maps uses lat,lng
            lng, lat = float(val[0]), float(val[1])
            coords = (lat, lng)

    # Try geometry.coordinates [lng, lat]
    if not coords and "geometry" in stop and isinstance(stop["geometry"], dict):
        val = stop["geometry"].get("coordinates")
        if isinstance(val, (list, tuple)) and len(val) >= 2:
            lng, lat = float(val[0]), float(val[1])
            coords = (lat, lng)

    # Try lng/lat fields
    if not coords:
        lng = stop.get("lng") or stop.get("longitude") or stop.get("lon")
        lat = stop.get("lat") or stop.get("latitude")
        if lng is not None and lat is not None:
            coords = (float(lat), float(lng))

    return coords


def get_hub_coordinates(hub_name: str) -> tuple[float, float] | None:
    """Get coordinates for a known hub name."""
    key = str(hub_name).strip().lower()
    return HUB_COORDINATES.get(key)


def build_google_maps_directions_url(
    origin: tuple[float, float] | None,
    waypoints: list[tuple[float, float]],
    destination: tuple[float, float],
) -> str:
    """Build a Google Maps directions URL with origin, waypoints, and destination."""
    if not destination:
        return ""

    parts = ["https://www.google.com/maps/dir/?api=1"]

    if origin:
        lat, lng = origin
        parts.append(f"origin={lat},{lng}")

    lat, lng = destination
    parts.append(f"destination={lat},{lng}")

    if waypoints:
        # Limit waypoints to avoid URL length issues (Google supports ~8-10 waypoints)
        safe_waypoints = waypoints[:8]
        waypoint_str = "|".join(f"{lat},{lng}" for lat, lng in safe_waypoints)
        parts.append(f"waypoints={waypoint_str}")

    parts.append("travelmode=driving")

    return "&".join(parts)


def build_day_directions_url(
    start_label: str,
    stops: list[dict[str, Any]],
) -> str:
    """Build a Google Maps directions URL for a day's itinerary."""
    if not stops:
        return ""

    # Get origin from hub name
    origin_coords = get_hub_coordinates(start_label)

    # Extract coordinates from stops
    stop_coords = []
    for stop in stops:
        coords = extract_coordinates(stop)
        if coords:
            stop_coords.append(coords)

    if not stop_coords:
        return ""

    # Use first stop as origin if hub not available
    if not origin_coords and stop_coords:
        origin_coords = stop_coords[0]
        stop_coords = stop_coords[1:]

    # Use last stop as destination
    if not stop_coords:
        return ""
    destination_coords = stop_coords[-1]

    # Intermediate stops as waypoints
    waypoints = stop_coords[:-1] if len(stop_coords) > 1 else []

    return build_google_maps_directions_url(origin_coords, waypoints, destination_coords)
