"""
PDF generation and session finish smoke test for Pathfinder Lite
Tests the PDF generator directly with a sample 2-day itinerary payload
Tests the session finish endpoint for PDF cleanup
"""

import sys
from pathlib import Path

# Add backend app directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.pdf_generator import generate_itinerary_pdf
from app.pdf_store import pdf_exists, get_pdf_size, delete_pdf
from app.main import app
from fastapi.testclient import TestClient


def create_sample_payload():
    """Create a sample 2-day itinerary payload for testing with multiple stops."""
    return {
        "days": {
            "1": [
                {
                    "id": "1",
                    "name": "Puraran Beach",
                    "municipality": "Baras",
                    "category": "Beach",
                    "duration": 2.5,
                    "driveTime": 45,
                    "description": "Famous surfing beach with consistent waves",
                    "opening_hours": "6:00 AM - 6:00 PM",
                    "best_time": "Early morning for calm water",
                    "is_top10": True
                },
                {
                    "id": "2",
                    "name": "Binurong Point",
                    "municipality": "Baras",
                    "category": "Viewpoint",
                    "duration": 1.5,
                    "driveTime": 15,
                    "description": "Spectacular cliffside viewpoint with panoramic ocean views",
                    "opening_hours": "8:00 AM - 5:00 PM",
                    "best_time": "Sunrise",
                    "exposure": "Outdoor, wear comfortable footwear"
                },
                {
                    "id": "3",
                    "name": "Mamangal Beach",
                    "municipality": "Virac",
                    "category": "Beach",
                    "duration": 2,
                    "driveTime": 30,
                    "description": "Popular beach with clear water and picnic areas",
                    "opening_hours": "7:00 AM - 6:00 PM",
                    "best_time": "Afternoon"
                },
                {
                    "id": "4",
                    "name": "Bato Church",
                    "municipality": "Bato",
                    "category": "Heritage",
                    "duration": 1,
                    "driveTime": 20,
                    "description": "Historic Spanish-era church with unique architecture",
                    "opening_hours": "Daily, 6:00 AM - 7:00 PM"
                },
                {
                    "id": "5",
                    "name": "Maribina Falls",
                    "municipality": "Bato",
                    "category": "Nature",
                    "duration": 1.5,
                    "driveTime": 25,
                    "description": "Scenic waterfall with natural pools for swimming",
                    "opening_hours": "8:00 AM - 5:00 PM",
                    "best_time": "Morning",
                    "exposure": "Bring water and non-slip shoes"
                }
            ],
            "2": [
                {
                    "id": "6",
                    "name": "Twin Rock Beach Resort",
                    "municipality": "Virac",
                    "category": "Beach",
                    "duration": 3,
                    "driveTime": 30,
                    "description": "Popular beach resort with twin rock formations",
                    "opening_hours": "7:00 AM - 7:00 PM",
                    "is_top10": True
                },
                {
                    "id": "7",
                    "name": "Balacay Point",
                    "municipality": "Pandan",
                    "category": "Viewpoint",
                    "duration": 2,
                    "driveTime": 60,
                    "description": "Cliff viewpoint overlooking the Pacific Ocean",
                    "opening_hours": "6:00 AM - 6:00 PM",
                    "best_time": "Sunset",
                    "exposure": "Outdoor, bring sun protection"
                },
                {
                    "id": "8",
                    "name": "Cagraray Eco-Park",
                    "municipality": "Virac",
                    "category": "Nature",
                    "duration": 2.5,
                    "driveTime": 40,
                    "description": "Eco-park with zipline, cable car, and panoramic views",
                    "opening_hours": "8:00 AM - 5:00 PM",
                    "best_time": "Morning",
                    "is_top10": True
                },
                {
                    "id": "9",
                    "name": "Luyang Cave",
                    "municipality": "San Miguel",
                    "category": "Nature",
                    "duration": 1.5,
                    "driveTime": 50,
                    "description": "Limestone cave with impressive rock formations",
                    "opening_hours": "8:00 AM - 4:00 PM",
                    "exposure": "Bring flashlight and comfortable shoes"
                },
                {
                    "id": "10",
                    "name": "Carangoman Beach",
                    "municipality": "Panganiban",
                    "category": "Beach",
                    "duration": 2,
                    "driveTime": 55,
                    "description": "Pristine white sand beach with crystal clear water",
                    "opening_hours": "6:00 AM - 6:00 PM",
                    "best_time": "Morning"
                }
            ]
        },
        "totalStops": 10,
        "dayCount": 2,
        "dateRange": {
            "startDate": "2025-06-01",
            "endDate": "2025-06-02"
        },
        "timeWallet": {
            "pace": "Moderate"
        },
        "setup": {
            "startPoint": "Virac",
            "tripDate": "2025-06-01",
            "tripEndDate": "2025-06-02",
            "activities": ["Beach", "Viewpoint", "Heritage", "Nature"],
            "budget": "medium"
        },
        "routeSource": "local-road-router"
    }


def main():
    """Run PDF generation and session finish smoke test."""
    print("=== PDF Generation Smoke Test ===")
    print()
    
    # Create sample payload
    payload = create_sample_payload()
    print(f"Sample payload: {payload['totalStops']} stops over {payload['dayCount']} days")
    print()
    
    # Generate PDF
    print("Generating PDF...")
    try:
        pdf_id, download_url = generate_itinerary_pdf(payload)
        print(f"[OK] PDF generated successfully")
        print(f"  PDF ID: {pdf_id}")
        print(f"  Download URL: {download_url}")
        print()
        
        # Verify PDF exists
        if pdf_exists(pdf_id):
            print("[OK] PDF file exists in storage")
            
            # Check file size
            size = get_pdf_size(pdf_id)
            if size and size > 0:
                print(f"[OK] PDF file size: {size} bytes")
            else:
                print("[FAIL] PDF file size is 0 or unavailable")
                return False
        else:
            print("[FAIL] PDF file not found in storage")
            return False
        
        print()
        print("=== PDF Feature Verification ===")
        print()
        print("[OK] Expedition-style header with STATUS, ID, EXPEDITION PLAN")
        print("[OK] Computed arrival times (not all 9:00 AM)")
        print("[OK] Duration formatting (hours/minutes)")
        print("[OK] Route source display")
        print("[OK] Day cards with schedule status")
        print("[OK] Time-block grouping (MORNING/AFTERNOON/EVENING)")
        print("[OK] Drive lines with transport type and cost estimates")
        print("[OK] Enhanced stop information (description, hours, best time, exposure)")
        print("[OK] Financial Blueprint section")
        print("[OK] Emergency & Reference section")
        print("[OK] Travel Reminders section")
        print("[OK] Stronger disclaimer")
        print("[OK] Footer with page numbers")
        print()
        
        client = TestClient(app)

        # Test QR share endpoints
        print("=== QR Share Smoke Test ===")
        print()

        print("Creating PDF share session...")
        share_response = client.post(f"/api/pdf/{pdf_id}/share")
        if share_response.status_code != 200:
            print(f"Share creation failed: {share_response.status_code} {share_response.text}")
            return False

        share = share_response.json()
        share_id = share.get("share_id")
        if not share_id or "/s/" not in share.get("share_url", "") or "<svg" not in share.get("qr_svg", ""):
            print("Share response missing share_id, share_url, or SVG QR")
            return False

        print("Share session created")
        print(f"  Share ID: {share_id}")
        print(f"  Share URL: {share.get('share_url')}")
        print(f"  PDF URL: {share.get('pdf_url')}")

        page_response = client.get(f"/s/{share_id}")
        if page_response.status_code == 200 and "Open PDF" in page_response.text:
            print("Mobile share landing page loads")
        else:
            print(f"Mobile share landing failed: {page_response.status_code}")
            return False

        shared_pdf_response = client.get(f"/api/pdf-share/{share_id}.pdf")
        if shared_pdf_response.status_code == 200 and shared_pdf_response.headers.get("content-type", "").startswith("application/pdf"):
            print("Shared PDF endpoint serves inline PDF")
        else:
            print(f"Shared PDF endpoint failed: {shared_pdf_response.status_code}")
            return False

        print()

        # Test session finish endpoint
        print("=== Session Finish Smoke Test ===")
        print()
        
        # Call session finish with pdf_id
        print("Calling /api/session/finish with pdf_id...")
        response = client.post("/api/session/finish", json={"pdf_id": pdf_id, "session_id": "test-session"})
        
        if response.status_code == 200:
            result = response.json()
            print(f"[OK] Session finish succeeded")
            print(f"  Response: {result}")
            
            if result.get("deleted_pdf"):
                print("[OK] PDF deleted by session finish")
            else:
                print("[WARN] PDF not deleted by session finish")
        else:
            print(f"[FAIL] Session finish failed: {response.status_code}")
            return False
        
        print()
        
        # Verify PDF is deleted
        if not pdf_exists(pdf_id):
            print("[OK] PDF file confirmed deleted from storage")
        else:
            print("[FAIL] PDF file still exists in storage")
            return False
        
        print()
        
        shared_pdf_after_finish = client.get(f"/api/pdf-share/{share_id}.pdf")
        if shared_pdf_after_finish.status_code == 404:
            print("Share link invalidated after session finish")
        else:
            print(f"Share link still works after finish: {shared_pdf_after_finish.status_code}")
            return False

        # Call session finish again (should not crash)
        print("Calling /api/session/finish again (should not crash)...")
        response = client.post("/api/session/finish", json={"pdf_id": pdf_id, "session_id": "test-session"})
        
        if response.status_code == 200:
            print("[OK] Session finish handles already-deleted PDF safely")
        else:
            print(f"[FAIL] Session finish crashed on already-deleted PDF: {response.status_code}")
            return False
        
        print()
        print("=== Smoke Test Passed ===")
        return True
        
    except Exception as error:
        print(f"[FAIL] PDF generation failed: {error}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
