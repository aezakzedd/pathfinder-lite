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
    """Create a sample 2-day itinerary payload for testing."""
    return {
        "days": {
            "1": [
                {
                    "id": "1",
                    "name": "Puraran Beach",
                    "municipality": "Baras",
                    "category": "Beach",
                    "time": "9:00 AM",
                    "duration": "2-3 hours",
                    "driveTime": 45
                },
                {
                    "id": "2",
                    "name": "Binurong Point",
                    "municipality": "Baras",
                    "category": "Viewpoint",
                    "time": "12:00 PM",
                    "duration": "1-2 hours",
                    "driveTime": 15
                }
            ],
            "2": [
                {
                    "id": "3",
                    "name": "Twin Rock Beach Resort",
                    "municipality": "Virac",
                    "category": "Beach",
                    "time": "10:00 AM",
                    "duration": "3-4 hours",
                    "driveTime": 30
                },
                {
                    "id": "4",
                    "name": "Bato Church",
                    "municipality": "Bato",
                    "category": "Heritage",
                    "time": "2:00 PM",
                    "duration": "1 hour",
                    "driveTime": 20
                }
            ]
        },
        "totalStops": 4,
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
            "activities": ["Beach", "Viewpoint", "Heritage"],
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
