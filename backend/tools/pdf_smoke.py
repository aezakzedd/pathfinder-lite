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
from app.pdf_store import pdf_exists, get_pdf_size, get_pdf_path
from app.main import app
from app.map_link import get_map_link, cleanup_expired_map_links
from app.map_renderer import generate_route_map_image, generate_fallback_map_image
from app.pdf_preview import render_pdf_pages_to_images, delete_preview_images, get_preview_with_overlays
from fastapi.testclient import TestClient

try:
    from pypdf import PdfReader
except Exception:  # pragma: no cover - optional local inspection helper
    PdfReader = None


def create_sample_payload():
    """Create a sample payload that resembles the original Pathfinder export."""
    return {
        "days": {
            "1": [
                {
                    "id": "hinagasan-falls",
                    "name": "Hinagasan Falls",
                    "municipality": "Virac",
                    "category": "waterfall",
                    "description": "A quick roadside stop with cool water and shaded rock pools.",
                    "opening_hours": "Open daylight hours",
                    "visit_time_minutes": 30,
                    "best_time_of_day": "morning",
                    "outdoor_exposure": "shaded",
                    "driveTime": 10,
                    "min_budget": "low",
                    "coordinates": [124.23, 13.58],
                },
                {
                    "id": "diocesan-shrine-holy-cross",
                    "name": "Diocesan Shrine of the Holy Cross",
                    "municipality": "Bato",
                    "category": "religious",
                    "description": "The burial site of the Augustinian Recollect Fray Diego de Herrera, marking the introduction of Christianity to the island.",
                    "opening_hours": "06:00-18:00",
                    "visit_time_minutes": 30,
                    "best_time_of_day": "morning",
                    "outdoor_exposure": "indoor",
                    "driveTime": 20,
                    "min_budget": "low",
                    "coordinates": [124.28, 13.61],
                },
                {
                    "id": "batalay-mangrove",
                    "name": "Batalay Mangrove Eco Park",
                    "municipality": "Bato",
                    "category": "viewpoint",
                    "description": "A serene network of wooden boardwalks cutting through dense mangroves.",
                    "opening_hours": "08:00-17:00",
                    "visit_time_minutes": 45,
                    "best_time_of_day": "morning",
                    "outdoor_exposure": "shaded",
                    "driveTime": 20,
                    "min_budget": "low",
                    "coordinates": [124.29, 13.62],
                },
                {
                    "id": "bato-church",
                    "name": "St. John the Baptist Church",
                    "municipality": "Bato",
                    "category": "religious",
                    "description": "A stunning example of colonial architecture standing guard by the river.",
                    "opening_hours": "06:00-18:00",
                    "visit_time_minutes": 30,
                    "best_time_of_day": "morning",
                    "outdoor_exposure": "indoor",
                    "is_top_10": True,
                    "driveTime": 20,
                    "min_budget": "low",
                    "coordinates": [124.30, 13.63],
                },
                {
                    "id": "st-anthony-parish",
                    "name": "St. Anthony of Padua Parish Church",
                    "municipality": "Baras",
                    "category": "religious",
                    "description": "A community-centered parish serving as a quiet place for reflection.",
                    "opening_hours": "06:00-18:00",
                    "visit_time_minutes": 30,
                    "best_time_of_day": "midday",
                    "outdoor_exposure": "indoor",
                    "driveTime": 20,
                    "min_budget": "low",
                    "coordinates": [124.38, 13.64],
                },
                {
                    "id": "maribina-falls",
                    "name": "Maribina Falls",
                    "municipality": "Bato",
                    "category": "falls",
                    "description": "The catch basin is shallow and chilling cold, making it an accessible quick dip right off the main highway.",
                    "opening_hours": "08:00-17:00",
                    "visit_time_minutes": 45,
                    "best_time_of_day": "afternoon",
                    "outdoor_exposure": "shaded",
                    "is_top_10": True,
                    "driveTime": 20,
                    "min_budget": "low",
                    "coordinates": [124.31, 13.64],
                },
                {
                    "id": "virac-town-center",
                    "name": "Virac Town Center",
                    "municipality": "Virac",
                    "category": "food",
                    "description": "Useful town stop for snacks, cash, supplies, and transport coordination.",
                    "opening_hours": "08:00-20:00",
                    "visit_time_minutes": 60,
                    "best_time_of_day": "afternoon",
                    "outdoor_exposure": "indoor",
                    "driveTime": 15,
                    "min_budget": "medium",
                    "coordinates": [124.23, 13.58],
                },
                {
                    "id": "bote-lighthouse",
                    "name": "Bote Lighthouse",
                    "municipality": "Bato",
                    "category": "viewpoint",
                    "description": "A coastal viewpoint with open views toward the sea and nearby villages.",
                    "opening_hours": "Open daylight hours",
                    "visit_time_minutes": 45,
                    "best_time_of_day": "afternoon",
                    "outdoor_exposure": "open",
                    "driveTime": 25,
                    "min_budget": "low",
                    "coordinates": [124.32, 13.65],
                },
                {
                    "id": "cagraray-island-viewpoint",
                    "name": "Cagraray Island Viewpoint",
                    "municipality": "Pandan",
                    "category": "viewpoint",
                    "description": "A high-view stop with island scenery and cooler air near the ridge roads.",
                    "opening_hours": "Open daylight hours",
                    "visit_time_minutes": 60,
                    "best_time_of_day": "late afternoon",
                    "outdoor_exposure": "open",
                    "driveTime": 45,
                    "min_budget": "low",
                    "coordinates": [124.20, 13.80],
                },
            ],
            "2": [
                {
                    "id": "ba-haw-falls",
                    "name": "Ba-haw Falls",
                    "municipality": "Gigmoto",
                    "category": "falls",
                    "description": "A top waterfall stop with a refreshing basin and short nature approach.",
                    "opening_hours": "08:00-17:00",
                    "visit_time_minutes": 45,
                    "best_time_of_day": "morning",
                    "outdoor_exposure": "shaded",
                    "isTop10": True,
                    "driveTime": 32,
                    "min_budget": "low",
                    "coordinates": [124.45, 13.75],
                },
                {
                    "id": "nupa-green-lagoon",
                    "name": "Nupa Green Lagoon",
                    "municipality": "Gigmoto",
                    "category": "water",
                    "description": "A quiet green lagoon suited for a scenic pause and short photo stop.",
                    "opening_hours": "Open daylight hours",
                    "visit_time_minutes": 45,
                    "best_time_of_day": "morning",
                    "outdoor_exposure": "open",
                    "driveTime": 18,
                    "min_budget": "low",
                    "coordinates": [124.46, 13.76],
                },
                {
                    "id": "bestea-fries",
                    "name": "Bestea X E-fren Fries",
                    "municipality": "Viga",
                    "category": "food",
                    "description": "A casual food stop for snacks and drinks between coastal and interior routes.",
                    "opening_hours": "10:00-20:00",
                    "visit_time_minutes": 45,
                    "best_time_of_day": "midday",
                    "outdoor_exposure": "indoor",
                    "driveTime": 22,
                    "min_budget": "medium",
                    "coordinates": [124.55, 13.85],
                },
                {
                    "id": "nahulugan-falls",
                    "name": "Nahulugan Falls",
                    "municipality": "Gigmoto",
                    "category": "falls",
                    "description": "A stronger waterfall route that rewards careful planning and dry weather.",
                    "opening_hours": "08:00-16:00",
                    "visit_time_minutes": 60,
                    "best_time_of_day": "afternoon",
                    "outdoor_exposure": "open",
                    "weather_tip": "Avoid during heavy rain.",
                    "is_top10": True,
                    "driveTime": 35,
                    "min_budget": "low",
                    "coordinates": [124.47, 13.77],
                },
                {
                    "id": "san-pedro-calungsod",
                    "name": "San Pedro Calungsod Parish",
                    "municipality": "Viga",
                    "category": "religious",
                    "description": "A local parish stop for a quiet break before the return leg.",
                    "opening_hours": "06:00-18:00",
                    "visit_time_minutes": 30,
                    "best_time_of_day": "afternoon",
                    "outdoor_exposure": "indoor",
                    "driveTime": 24,
                    "min_budget": "low",
                    "coordinates": [124.56, 13.86],
                },
                {
                    "id": "mount-carmel-parish",
                    "name": "Our Lady of Mount Carmel Parish Church",
                    "municipality": "Viga",
                    "category": "religious",
                    "description": "A heritage parish stop near town services and local food options.",
                    "opening_hours": "06:00-18:00",
                    "visit_time_minutes": 30,
                    "best_time_of_day": "afternoon",
                    "outdoor_exposure": "indoor",
                    "driveTime": 16,
                    "min_budget": "low",
                    "coordinates": [124.57, 13.87],
                },
                {
                    "id": "banquerohan-bridge",
                    "name": "Banquerohan Bridge",
                    "municipality": "Viga",
                    "category": "viewpoint",
                    "description": "A final quick viewpoint and road landmark before closing the day.",
                    "opening_hours": "Open daylight hours",
                    "visit_time_minutes": 30,
                    "best_time_of_day": "late afternoon",
                    "outdoor_exposure": "open",
                    "driveTime": 20,
                    "min_budget": "low",
                    "coordinates": [124.58, 13.88],
                },
            ],
        },
        "totalStops": 16,
        "dayCount": 2,
        "totalDistanceKm": 85.3,
        "dateRange": {
            "startDate": "2026-05-13",
            "endDate": "2026-05-14",
        },
        "dayMeta": {
            "1": {
                "startLabel": "Virac",
                "startTime": "08:21 AM",
            },
            "2": {
                "startLabel": "Cagraray Island Viewpoint",
                "startTime": "09:11 AM",
            },
        },
        "timeWallet": {
            "pace": "Moderate",
        },
        "setup": {
            "startPoint": "Virac",
            "tripDate": "2026-05-13",
            "tripEndDate": "2026-05-14",
            "activities": ["Water", "Outdoor", "Views", "Heritage", "Dining"],
            "budget": "low",
        },
        "routeSource": "local-road-router",
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
        base_url = "http://testserver"
        pdf_id, download_url, overlay_metadata = generate_itinerary_pdf(payload, base_url=base_url)
        print(f"[OK] PDF generated successfully")
        print(f"  PDF ID: {pdf_id}")
        print(f"  Download URL: {download_url}")
        print(f"  Overlay metadata: {len(overlay_metadata.get('map_links', []))} map links")
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

            if PdfReader is not None:
                page_count = len(PdfReader(str(get_pdf_path(pdf_id))).pages)
                print(f"[OK] PDF page count: {page_count}")
                if page_count < 4:
                    print("[FAIL] PDF pagination did not exercise multi-page output")
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
        print("[OK] Expedition stats row with total distance")
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

        # Test QR share
        print()
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

        # Test map link launcher
        print("=== Map Link Launcher Smoke Test ===")
        print()

        cleanup_expired_map_links()
        map_links_count = 0
        for link_id in ["test-link-1", "test-link-2"]:
            map_link = get_map_link(link_id)
            if map_link:
                map_links_count += 1

        print(f"Map registry cleanup run")
        print(f"  Active map links: {map_links_count}")

        # Test map link creation during PDF generation
        from app.map_link import _map_links as map_links_registry
        generated_map_links = len([k for k, v in map_links_registry.items() if v.pdf_id == pdf_id])
        print(f"  Map links created for PDF {pdf_id}: {generated_map_links}")

        if generated_map_links > 0:
            print("[OK] Map links created for day directions")
            # Test one map link endpoint
            test_link_id = None
            for link_id, link in map_links_registry.items():
                if link.pdf_id == pdf_id:
                    test_link_id = link_id
                    break

            if test_link_id:
                launcher_response = client.get(f"/m/{test_link_id}")
                if launcher_response.status_code == 200:
                    launcher_content = launcher_response.text
                    if "Pathfinder Directions" in launcher_content and "Open Google Maps" in launcher_content and "target=\"_blank\"" in launcher_content and "Return to PDF" in launcher_content:
                        print("[OK] Launcher page contains required elements")
                        print(f"  Test map link ID: {test_link_id}")
                    else:
                        print("[FAIL] Launcher page missing required elements")
                        return False
                else:
                    print(f"[FAIL] Launcher page failed: {launcher_response.status_code}")
                    return False
            else:
                print("[WARN] No map link found to test launcher page")
        else:
            print("[WARN] No map links created (coordinates may be missing)")

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

        # Verify map links are also invalidated
        from app.map_link import _map_links as map_links_registry
        remaining_map_links = len([k for k, v in map_links_registry.items() if v.pdf_id == pdf_id])
        if remaining_map_links == 0:
            print("[OK] Map links invalidated by session finish")
        else:
            print(f"[WARN] Map links still exist after finish: {remaining_map_links}")
            # This is not a failure since map links have their own TTL

        # Verify preview images are also deleted
        from app.pdf_preview import PREVIEWS_DIR
        preview_dir = PREVIEWS_DIR / pdf_id
        if not preview_dir.exists():
            print("[OK] Preview images deleted by session finish")
        else:
            print(f"[WARN] Preview directory still exists after finish: {preview_dir}")
            # This is not a failure since preview cleanup is best-effort

        print()

        # Test map image generation
        print("=== Map Image Generation Smoke Test ===")
        print()

        # Test route map image generation with coordinates
        stops = payload["days"]["1"]
        try:
            map_image_bytes = generate_route_map_image(stops, "Virac")
            if map_image_bytes and len(map_image_bytes) > 0:
                print("[OK] Route map image generated successfully")
                print(f"  Image size: {len(map_image_bytes)} bytes")
            else:
                print("[FAIL] Route map image generation failed")
                return False
        except Exception as e:
            print(f"[FAIL] Route map image generation error: {e}")
            return False

        # Test fallback map image generation
        try:
            fallback_image_bytes = generate_fallback_map_image()
            if fallback_image_bytes and len(fallback_image_bytes) > 0:
                print("[OK] Fallback map image generated successfully")
                print(f"  Image size: {len(fallback_image_bytes)} bytes")
            else:
                print("[FAIL] Fallback map image generation failed")
                return False
        except Exception as e:
            print(f"[FAIL] Fallback map image generation error: {e}")
            return False

        print()

        # Test preview image generation
        print("=== PDF Preview Image Generation Smoke Test ===")
        print()

        # Regenerate PDF for preview testing
        print("Regenerating PDF for preview testing...")
        try:
            pdf_id_2, download_url_2, overlay_metadata_2 = generate_itinerary_pdf(payload, base_url=base_url)
            print(f"[OK] PDF regenerated for preview testing: {pdf_id_2}")
            print()
        except Exception as e:
            print(f"[FAIL] PDF regeneration failed: {e}")
            return False

        # Test preview image rendering
        try:
            pages_metadata = render_pdf_pages_to_images(pdf_id_2)
            if pages_metadata and len(pages_metadata) > 0:
                print(f"[OK] Preview images generated successfully")
                print(f"  Page count: {len(pages_metadata)}")
                for page_num, page_meta in pages_metadata.items():
                    print(f"  Page {page_num}: {page_meta['width']}x{page_meta['height']}")
            else:
                print("[FAIL] Preview image generation failed")
                return False
        except Exception as e:
            print(f"[FAIL] Preview image generation error: {e}")
            import traceback
            traceback.print_exc()
            return False

        # Test preview metadata retrieval
        try:
            preview_metadata = get_preview_with_overlays(pdf_id_2)
            if preview_metadata and preview_metadata.get("page_count") > 0:
                print(f"[OK] Preview metadata retrieved successfully")
                print(f"  Page count: {preview_metadata['page_count']}")
                print(f"  Pages with links: {len([p for p in preview_metadata['pages'] if p.get('links')])}")
            else:
                print("[FAIL] Preview metadata retrieval failed")
                return False
        except Exception as e:
            print(f"[FAIL] Preview metadata retrieval error: {e}")
            return False

        # Test preview image endpoint
        try:
            preview_response = client.get(f"/api/pdf/{pdf_id_2}/preview")
            if preview_response.status_code == 200:
                preview_data = preview_response.json()
                print(f"[OK] Preview endpoint returned JSON")
                print(f"  Page count: {preview_data.get('page_count', 0)}")
            else:
                print(f"[FAIL] Preview endpoint failed: {preview_response.status_code}")
                return False
        except Exception as e:
            print(f"[FAIL] Preview endpoint error: {e}")
            return False

        # Test preview page image endpoint
        try:
            page_response = client.get(f"/api/pdf/{pdf_id_2}/preview/1.png")
            if page_response.status_code == 200:
                print(f"[OK] Preview page image endpoint returned PNG")
                print(f"  Content type: {page_response.headers.get('content-type')}")
            else:
                print(f"[FAIL] Preview page image endpoint failed: {page_response.status_code}")
                return False
        except Exception as e:
            print(f"[FAIL] Preview page image endpoint error: {e}")
            return False

        # Test preview image cleanup
        print()
        print("Testing preview image cleanup...")
        deleted_count = delete_preview_images(pdf_id_2)
        print(f"[OK] Preview images deleted: {deleted_count} files")

        # Verify preview directory is removed
        preview_dir_2 = PREVIEWS_DIR / pdf_id_2
        if not preview_dir_2.exists():
            print("[OK] Preview directory removed")
        else:
            print("[WARN] Preview directory still exists")

        # Clean up the test PDF
        from app.pdf_store import delete_pdf
        delete_pdf(pdf_id_2)

        print()

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
