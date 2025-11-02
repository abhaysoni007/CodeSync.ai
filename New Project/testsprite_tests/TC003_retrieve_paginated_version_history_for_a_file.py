import requests
import uuid
import os

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

# You should set your JWT token as environment variable CODE_SYNC_JWT or replace below
JWT_TOKEN = os.getenv("CODE_SYNC_JWT", "your_jwt_token_here")

HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {JWT_TOKEN}"
}

def test_retrieve_paginated_version_history_for_file():
    project_id = str(uuid.uuid4())
    file_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    initial_content = "Initial content for version history test."

    # Initialize delta sync for a new file to create snapshots for pagination test
    init_payload = {
        "projectId": project_id,
        "fileId": file_id,
        "initialContent": initial_content,
        "userId": user_id
    }

    try:
        # Create initial snapshot
        init_response = requests.post(
            f"{BASE_URL}/delta/init",
            json=init_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert init_response.status_code == 200, f"Init failed: {init_response.text}"
        init_data = init_response.json()
        assert init_data.get("success") is True
        assert "snapshot" in init_data
        prev_content = initial_content
        # Create multiple snapshots to have version history for pagination
        for i in range(1, 6):
            new_content = prev_content + f"\nChange {i}"
            snapshot_payload = {
                "projectId": project_id,
                "fileId": file_id,
                "content": new_content,
                "oldContent": prev_content,
                "message": f"Commit {i}",
                "trigger": "manual"
            }
            snapshot_response = requests.post(
                f"{BASE_URL}/delta/snapshot",
                json=snapshot_payload,
                headers=HEADERS,
                timeout=TIMEOUT
            )
            assert snapshot_response.status_code == 200, f"Snapshot creation failed: {snapshot_response.text}"
            snapshot_data = snapshot_response.json()
            assert snapshot_data.get("success") is True
            assert "snapshot" in snapshot_data
            assert isinstance(snapshot_data.get("versionNumber"), int)
            prev_content = new_content

        # Test pagination: limit=3, skip=1
        params = {"limit": 3, "skip": 1}
        history_response = requests.get(
            f"{BASE_URL}/delta/history/{file_id}",
            headers=HEADERS,
            params=params,
            timeout=TIMEOUT
        )
        assert history_response.status_code == 200, f"History retrieval failed: {history_response.text}"
        history_data = history_response.json()
        assert history_data.get("success") is True
        assert isinstance(history_data.get("snapshots"), list)
        assert isinstance(history_data.get("total"), int)
        snapshots = history_data.get("snapshots")
        total = history_data.get("total")

        # Validate pagination logic
        assert len(snapshots) <= params["limit"]
        assert total >= len(snapshots)

        # Each snapshot should have required fields and fileId matching
        for snapshot in snapshots:
            assert snapshot.get("fileId") == file_id
            assert "snapshotId" in snapshot and isinstance(snapshot["snapshotId"], str)
            assert "versionNumber" in snapshot and isinstance(snapshot["versionNumber"], int)
            assert "createdAt" in snapshot

    finally:
        # Cleanup: Delete snapshots and file if API available (not described in PRD)
        # Since no delete endpoint in PRD, skip actual cleanup or implement if API is known
        pass

test_retrieve_paginated_version_history_for_file()
