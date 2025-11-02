import requests
import uuid

BASE_URL = "http://localhost:5000"
TIMEOUT = 30
JWT_TOKEN = "Bearer your_valid_jwt_token_here"
HEADERS = {"Content-Type": "application/json", "Authorization": JWT_TOKEN}

def test_get_file_content_at_specific_version():
    # Setup: Initialize delta sync for a new file with an initial snapshot
    project_id = str(uuid.uuid4())
    file_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    initial_content = "Line1\nLine2\nLine3\n"
    init_payload = {
        "projectId": project_id,
        "fileId": file_id,
        "initialContent": initial_content,
        "userId": user_id
    }

    snapshot_ids = []
    version_numbers = []
    try:
        # 1) Initialize delta sync to create first snapshot
        r_init = requests.post(f"{BASE_URL}/delta/init", json=init_payload, headers=HEADERS, timeout=TIMEOUT)
        r_init.raise_for_status()
        init_response = r_init.json()
        assert init_response.get("success") is True
        snapshot = init_response.get("snapshot")
        assert snapshot is not None
        assert snapshot.get("versionNumber") == 1
        assert snapshot.get("fileId") == file_id
        snapshot_ids.append(snapshot.get("snapshotId"))
        version_numbers.append(snapshot.get("versionNumber"))
        current_content = initial_content

        # 2) Create one or two more snapshots with incremental changes
        # First update
        new_content_v2 = "Line1\nLine 2 modified\nLine3\nLine4 added\n"
        snapshot_payload_v2 = {
            "projectId": project_id,
            "fileId": file_id,
            "content": new_content_v2,
            "oldContent": current_content,
            "message": "Update v2",
            "trigger": "manual"
        }
        r_snap2 = requests.post(f"{BASE_URL}/delta/snapshot", json=snapshot_payload_v2, headers=HEADERS, timeout=TIMEOUT)
        r_snap2.raise_for_status()
        snap2_response = r_snap2.json()
        assert snap2_response.get("success") is True
        snap2 = snap2_response.get("snapshot")
        assert snap2 is not None
        snapshot_ids.append(snap2.get("snapshotId"))
        version_numbers.append(snap2_response.get("versionNumber"))
        current_content = new_content_v2

        # Second update
        new_content_v3 = "Line0 added\nLine1\nLine 2 modified\nLine3\nLine4 added\n"
        snapshot_payload_v3 = {
            "projectId": project_id,
            "fileId": file_id,
            "content": new_content_v3,
            "oldContent": current_content,
            "message": "Update v3",
            "trigger": "manual"
        }
        r_snap3 = requests.post(f"{BASE_URL}/delta/snapshot", json=snapshot_payload_v3, headers=HEADERS, timeout=TIMEOUT)
        r_snap3.raise_for_status()
        snap3_response = r_snap3.json()
        assert snap3_response.get("success") is True
        snap3 = snap3_response.get("snapshot")
        assert snap3 is not None
        snapshot_ids.append(snap3.get("snapshotId"))
        version_numbers.append(snap3_response.get("versionNumber"))
        current_content = new_content_v3

        # 3) Test GET /delta/content/:fileId for specific versions

        # Test retrieving version 1 content
        r_content_v1 = requests.get(f"{BASE_URL}/delta/content/{file_id}", 
                                   params={"version": 1}, headers=HEADERS, timeout=TIMEOUT)
        r_content_v1.raise_for_status()
        content_v1 = r_content_v1.json()
        assert content_v1.get("success") is True
        assert content_v1.get("versionNumber") == 1
        assert "Line1\nLine2\nLine3\n" == content_v1.get("content")

        # Test retrieving version 2 content
        r_content_v2 = requests.get(f"{BASE_URL}/delta/content/{file_id}", 
                                   params={"version": 2}, headers=HEADERS, timeout=TIMEOUT)
        r_content_v2.raise_for_status()
        content_v2 = r_content_v2.json()
        assert content_v2.get("success") is True
        assert content_v2.get("versionNumber") == 2
        assert "Line1\nLine 2 modified\nLine3\nLine4 added\n" == content_v2.get("content")

        # Test retrieving version 3 content
        r_content_v3 = requests.get(f"{BASE_URL}/delta/content/{file_id}", 
                                   params={"version": 3}, headers=HEADERS, timeout=TIMEOUT)
        r_content_v3.raise_for_status()
        content_v3 = r_content_v3.json()
        assert content_v3.get("success") is True
        assert content_v3.get("versionNumber") == 3
        assert "Line0 added\nLine1\nLine 2 modified\nLine3\nLine4 added\n" == content_v3.get("content")

        # Test retrieving content latest version without specifying version param
        r_content_latest = requests.get(f"{BASE_URL}/delta/content/{file_id}", headers=HEADERS, timeout=TIMEOUT)
        r_content_latest.raise_for_status()
        content_latest = r_content_latest.json()
        assert content_latest.get("success") is True
        assert content_latest.get("versionNumber") == 3
        assert "Line0 added\nLine1\nLine 2 modified\nLine3\nLine4 added\n" == content_latest.get("content")

        # 4) Negative test: Request non-existent version number (e.g., 999)
        r_content_invalid = requests.get(f"{BASE_URL}/delta/content/{file_id}", 
                                         params={"version": 999}, headers=HEADERS, timeout=TIMEOUT)
        # The API might respond with 400 or 404 for invalid version - handle either
        if r_content_invalid.status_code == 200:
            resp = r_content_invalid.json()
            # success likely false or content empty
            assert resp.get("success") is False or resp.get("content") is None or resp.get("content") == ""
        else:
            assert r_content_invalid.status_code in (400, 404)

    finally:
        # Cleanup: No direct delete API specified; if available, implement here.
        # If no cleanup API, test environment should handle data persistence.
        pass

test_get_file_content_at_specific_version()
