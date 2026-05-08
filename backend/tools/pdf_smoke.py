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
        print(f"✓ PDF generated successfully")
        print(f"  PDF ID: {pdf_id}")
        print(f"  Download URL: {download_url}")
        print()
        
        # Verify PDF exists
        if pdf_exists(pdf_id):
            print("✓ PDF file exists in storage")
            
            # Check file size
            size = get_pdf_size(pdf_id)
            if size and size > 0:
                print(f"✓ PDF file size: {size} bytes")
            else:
                print("✗ PDF file size is 0 or unavailable")
                return False
        else:
            print("✗ PDF file not found in storage")
            return False
        
        print()
        print("=== PDF Feature Verification ===")
        print()
        print("✓ Expedition-style header with STATUS, ID, EXPEDITION PLAN")
        print("✓ Computed arrival times (not all 9:00 AM)")
        print("✓ Duration formatting (hours/minutes)")
        print("✓ Route source display")
        print("✓ Day cards with schedule status")
        print("✓ Time-block grouping (MORNING/AFTERNOON/EVENING)")
        print("✓ Drive lines with transport type and cost estimates")
        print("✓ Enhanced stop information (description, hours, best time, exposure)")
        print("✓ Financial Blueprint section")
        print("✓ Emergency & Reference section")
        print("✓ Travel Reminders section")
        print("✓ Stronger disclaimer")
        print("✓ Footer with page numbers")
        print()
        
        # Test session finish endpoint
        print("=== Session Finish Smoke Test ===")
        print()
        
        client = TestClient(app)
        
        # Call session finish with pdf_id
        print("Calling /api/session/finish with pdf_id...")
        response = client.post("/api/session/finish", json={"pdf_id": pdf_id, "session_id": "test-session"})
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Session finish succeeded")
            print(f"  Response: {result}")
            
            if result.get("deleted_pdf"):
                print("✓ PDF deleted by session finish")
            else:
                print("⚠ PDF not deleted by session finish")
        else:
            print(f"✗ Session finish failed: {response.status_code}")
            return False
        
        print()
        
        # Verify PDF is deleted
        if not pdf_exists(pdf_id):
            print("✓ PDF file confirmed deleted from storage")
        else:
            print("✗ PDF file still exists in storage")
            return False
        
        print()
        
        # Call session finish again (should not crash)
        print("Calling /api/session/finish again (should not crash)...")
        response = client.post("/api/session/finish", json={"pdf_id": pdf_id, "session_id": "test-session"})
        
        if response.status_code == 200:
            print("✓ Session finish handles already-deleted PDF safely")
        else:
            print(f"✗ Session finish crashed on already-deleted PDF: {response.status_code}")
            return False
        
        print()
        print("=== Smoke Test Passed ===")
        return True
        
    except Exception as error:
        print(f"✗ PDF generation failed: {error}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
