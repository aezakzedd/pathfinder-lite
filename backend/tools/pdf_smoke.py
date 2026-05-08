"""
PDF generation smoke test for Pathfinder Lite
Tests the PDF generator directly with a sample 2-day itinerary payload
"""

import sys
from pathlib import Path

# Add backend app directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.pdf_generator import generate_itinerary_pdf
from app.pdf_store import pdf_exists, get_pdf_size, delete_pdf


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
    """Run PDF generation smoke test."""
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
        
        # Cleanup
        print("Cleaning up test PDF...")
        if delete_pdf(pdf_id):
            print("✓ Test PDF deleted successfully")
        else:
            print("⚠ Failed to delete test PDF")
        
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
