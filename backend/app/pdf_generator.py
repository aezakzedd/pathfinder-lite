# PDF generation for Pathfinder Lite itineraries
# Uses fpdf2 for lightweight backend PDF generation

from datetime import datetime
from fpdf import FPDF
from typing import Dict, Any, Optional

from .pdf_store import generate_pdf_id, save_pdf


def calculate_day_status(total_minutes: int, day_capacity_hours: int = 8) -> str:
    """Calculate day status based on total minutes vs capacity."""
    capacity_minutes = day_capacity_hours * 60
    percentage = (total_minutes / capacity_minutes) * 100 if capacity_minutes > 0 else 0
    
    if percentage >= 100:
        return "Overloaded"
    elif percentage >= 80:
        return "Tight"
    elif percentage >= 60:
        return "Busy"
    else:
        return "Relaxed"


def format_duration(minutes: int) -> str:
    """Format minutes to hours and minutes."""
    if minutes < 60:
        return f"{minutes}m"
    hours = minutes // 60
    mins = minutes % 60
    if mins == 0:
        return f"{hours}h"
    return f"{hours}h {mins}m"


def generate_itinerary_pdf(payload: Dict[str, Any]) -> tuple[str, str]:
    """
    Generate PDF from itinerary payload.
    Returns (pdf_id, download_url).
    """
    pdf_id = generate_pdf_id()
    
    # Extract itinerary data with safe defaults
    days = payload.get("days", {})
    total_stops = payload.get("totalStops", 0)
    day_count = payload.get("dayCount", len(days))
    date_range = payload.get("dateRange", {})
    time_wallet = payload.get("timeWallet", {})
    setup = payload.get("setup", {})
    
    start_point = setup.get("startPoint", "Not specified")
    start_date = date_range.get("startDate", "")
    end_date = date_range.get("endDate", "")
    route_source = payload.get("routeSource", "Not specified")
    
    # Create PDF
    pdf = FPDF()
    pdf.add_page()
    
    # Set font (use built-in Arial/Helvetica)
    pdf.set_font("Arial", "B", 16)
    
    # Title
    pdf.cell(0, 10, "Pathfinder Catanduanes Itinerary", ln=True, align="C")
    pdf.ln(5)
    
    # Timestamp
    pdf.set_font("Arial", "", 10)
    pdf.cell(0, 8, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", ln=True, align="C")
    pdf.ln(10)
    
    # Trip summary section
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 10, "Trip Summary", ln=True)
    pdf.set_font("Arial", "", 10)
    
    pdf.cell(60, 8, "Start Hub:", border=0)
    pdf.cell(0, 8, start_point, ln=True)
    
    if start_date and end_date:
        pdf.cell(60, 8, "Date Range:", border=0)
        pdf.cell(0, 8, f"{start_date} to {end_date}", ln=True)
    
    pdf.cell(60, 8, "Duration:", border=0)
    pdf.cell(0, 8, f"{day_count} day(s)", ln=True)
    
    pdf.cell(60, 8, "Total Stops:", border=0)
    pdf.cell(0, 8, str(total_stops), ln=True)
    
    pdf.cell(60, 8, "Route Source:", border=0)
    pdf.cell(0, 8, route_source, ln=True)
    
    pdf.ln(10)
    
    # Day-by-day itinerary
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 10, "Day-by-Day Itinerary", ln=True)
    pdf.ln(5)
    
    # Sort days numerically
    sorted_days = sorted(days.keys(), key=lambda x: int(x) if x.isdigit() else 0)
    
    for day_key in sorted_days:
        stops = days.get(day_key, [])
        day_num = int(day_key) if day_key.isdigit() else day_key
        
        pdf.set_font("Arial", "B", 11)
        pdf.cell(0, 8, f"Day {day_num}", ln=True)
        
        if not stops:
            pdf.set_font("Arial", "", 10)
            pdf.cell(0, 6, "  No stops planned", ln=True)
            pdf.ln(3)
            continue
        
        # Calculate day statistics
        total_visit_minutes = 0
        total_drive_minutes = 0
        
        for stop in stops:
            duration = stop.get("duration", 0)
            if isinstance(duration, (int, float)):
                total_visit_minutes += int(duration * 60)  # Convert hours to minutes
            elif isinstance(duration, str):
                # Try to parse string duration
                if "h" in duration:
                    parts = duration.replace("h", " ").split()
                    for part in parts:
                        try:
                            total_visit_minutes += int(float(part)) * 60
                        except ValueError:
                            pass
            
            # Check for drive time in stop or route summary
            drive_time = stop.get("driveTime") or stop.get("drive_time") or stop.get("travel_time")
            if isinstance(drive_time, (int, float)):
                total_drive_minutes += int(drive_time)
            elif isinstance(drive_time, str):
                # Try to parse string drive time
                if "h" in drive_time or "m" in drive_time:
                    parts = drive_time.replace("h", " ").replace("m", " ").split()
                    for part in parts:
                        try:
                            val = int(float(part))
                            if "h" in drive_time and drive_time.index("h") < drive_time.index(part) if "h" in drive_time else False:
                                total_drive_minutes += val * 60
                            else:
                                total_drive_minutes += val
                        except ValueError:
                            pass
        
        total_minutes = total_visit_minutes + total_drive_minutes
        day_status = calculate_day_status(total_minutes)
        
        # Day status
        pdf.set_font("Arial", "", 10)
        pdf.cell(0, 6, f"  Status: {day_status}", ln=True)
        if total_drive_minutes > 0:
            pdf.cell(0, 6, f"  Drive Time: {format_duration(total_drive_minutes)}", ln=True)
        pdf.cell(0, 6, f"  Visit Time: {format_duration(total_visit_minutes)}", ln=True)
        pdf.ln(3)
        
        # Stop list
        pdf.set_font("Arial", "", 10)
        for idx, stop in enumerate(stops, 1):
            name = stop.get("name", "Unknown")
            municipality = stop.get("municipality") or stop.get("city") or ""
            category = stop.get("category") or ""
            time = stop.get("time", "")
            duration = stop.get("duration", "")
            
            # Format stop line
            stop_line = f"  {idx}. {name}"
            if municipality:
                stop_line += f" ({municipality})"
            if category:
                stop_line += f" - {category}"
            
            pdf.cell(0, 6, stop_line, ln=True)
            
            # Time and duration
            if time or duration:
                details = []
                if time:
                    details.append(f"Time: {time}")
                if duration:
                    details.append(f"Duration: {duration}")
                if details:
                    pdf.cell(0, 5, f"     {', '.join(details)}", ln=True)
            
            pdf.ln(1)
        
        pdf.ln(5)
    
    # Footer disclaimer
    pdf.set_y(-30)
    pdf.set_font("Arial", "", 8)
    pdf.multi_cell(0, 5, 
        "Disclaimer: Travel times, costs, operating hours, and availability shown are estimates and should be verified locally before your trip.",
        align="C")
    
    # Save PDF
    pdf_bytes = pdf.output()
    save_pdf(pdf_id, pdf_bytes)
    
    download_url = f"/api/pdf/{pdf_id}.pdf"
    
    return pdf_id, download_url
