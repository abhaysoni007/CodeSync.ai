import requests
import uuid

BASE_URL = "http://localhost:5000"
TIMEOUT = 30
HEADERS = {
    "Content-Type": "application/json",
    "Authorization": "Bearer <VALID_JWT_TOKEN>"
}

def test_get_all_deltas_since_version():
    # Setup: Initialize delta sync for a new file to create initial snapshot
    project_id = str(uuid.uuid4())
    file_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    initial_content = "Initial content line 1\nInitial content line 2\n"
    init_payload = {
        "projectId": project_id,
        "fileId": file_id,
        "initialContent": initial_content,
        "userId": user_id
    }

    try:
        init_resp = requests.post(f"{BASE_URL}/delta/init", json=init_payload, headers=HEADERS, timeout=TIMEOUT)
        assert init_resp.status_code == 200, f"Init failed with status {init_resp.status_code}"
        init_json = init_resp.json()
        assert init_json.get("success") is True
        snapshot = init_json.get("snapshot")
        assert snapshot is not None
        base_version = snapshot.get("versionNumber")
        assert isinstance(base_version, int)
        assert base_version == 1

        # Create another snapshot with changes (delta)
        updated_content = initial_content + "Added line 3\n"
        snapshot_payload = {
            "projectId": project_id,
            "fileId": file_id,
            "content": updated_content,
            "oldContent": initial_content,
            "message": "Added line 3",
            "trigger": "manual"
        }
        snap_resp = requests.post(f"{BASE_URL}/delta/snapshot", json=snapshot_payload, headers=HEADERS, timeout=TIMEOUT)
        assert snap_resp.status_code == 200, f"Snapshot creation failed with status {snap_resp.status_code}"
        snap_json = snap_resp.json()
        assert snap_json.get("success") is True
        new_version = snap_json.get("versionNumber")
        assert isinstance(new_version, int)
        assert new_version > base_version

        # Test: get all delta changes since base_version
        params = {"version": base_version}
        deltas_resp = requests.get(f"{BASE_URL}/delta/deltas-since/{file_id}", headers=HEADERS, params=params, timeout=TIMEOUT)
        assert deltas_resp.status_code == 200, f"Deltas retrieval failed with status {deltas_resp.status_code}"
        deltas_json = deltas_resp.json()
        assert deltas_json.get("success") is True
        deltas = deltas_json.get("deltas")
        assert isinstance(deltas, list)
        assert any(d.get("versionNumber", 0) > base_version for d in deltas)

        # Validate each delta has required properties
        for delta in deltas:
            assert "snapshotId" in delta and isinstance(delta["snapshotId"], str)
            assert "versionNumber" in delta and isinstance(delta["versionNumber"], int)
            assert "fileId" in delta and delta["fileId"] == file_id
            # Optional but recommended fields to check
            assert "delta" in delta and isinstance(delta["delta"], dict)
            assert "createdAt" in delta
    finally:
        # Cleanup: no explicit delete endpoint is described, so skipping
        # In a real environment, cleanup of test data would be here if API supported it
        pass

test_get_all_deltas_since_version()
