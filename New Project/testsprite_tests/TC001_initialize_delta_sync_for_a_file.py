import requests
import uuid
import json

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

# Use a placeholder JWT token for testing purposes
JWT_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fakepayload.fakesignature"

def test_initialize_delta_sync_for_file():
    # Prepare test data
    project_id = str(uuid.uuid4())
    file_id = f"testfile-{uuid.uuid4()}.txt"
    user_id = str(uuid.uuid4())
    initial_content = "This is the initial file content.\nLine 2 of the content.\n"

    url = f"{BASE_URL}/delta/init"
    headers = {
        "Content-Type": "application/json",
        "Authorization": JWT_TOKEN
    }
    payload = {
        "projectId": project_id,
        "fileId": file_id,
        "initialContent": initial_content,
        "userId": user_id
    }

    snapshot_id = None

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

        data = response.json()
        assert "success" in data and data["success"] is True, "Initialization failed, success flag false or missing"
        assert "snapshot" in data and isinstance(data["snapshot"], dict), "Response lacks snapshot object"

        snapshot = data["snapshot"]

        # Validate snapshot metadata presence and basic fields
        assert "snapshotId" in snapshot and isinstance(snapshot["snapshotId"], str) and len(snapshot["snapshotId"]) > 0, "snapshotId missing or invalid"
        snapshot_id = snapshot["snapshotId"]

        assert snapshot.get("projectId") == project_id, "projectId mismatch in snapshot"
        assert snapshot.get("fileId") == file_id, "fileId mismatch in snapshot"
        if "userId" in snapshot:
            assert snapshot["userId"] == user_id, "userId mismatch in snapshot"
        assert isinstance(snapshot.get("versionNumber"), int) and snapshot.get("versionNumber") == 1, "versionNumber should be 1 for initial snapshot"

        assert snapshot.get("fullSnapshot") == initial_content, "fullSnapshot content does not match initial content"

        # Metadata checks
        metadata = snapshot.get("metadata")
        assert isinstance(metadata, dict), "Metadata missing or invalid"
        orig_size = metadata.get("originalSize")
        comp_size = metadata.get("compressedSize")
        comp_ratio = metadata.get("compressionRatio")
        lines_added = metadata.get("linesAdded")
        lines_removed = metadata.get("linesRemoved")

        assert isinstance(orig_size, int) and orig_size == len(initial_content), "originalSize mismatch"
        assert isinstance(comp_size, int) and comp_size <= orig_size, "compressedSize should be <= originalSize"
        assert isinstance(comp_ratio, (float, int)) and 0 <= comp_ratio <= 1, "compressionRatio should be between 0 and 1"
        assert isinstance(lines_added, int) and lines_added >= 0, "linesAdded should be non-negative integer"
        assert isinstance(lines_removed, int) and lines_removed == 0, "linesRemoved should be 0 for initial snapshot"

        # Check createdAt datetime string existence
        assert "createdAt" in snapshot and isinstance(snapshot["createdAt"], str) and len(snapshot["createdAt"]) > 0, "createdAt missing or invalid"

    finally:
        # Cleanup: delete snapshot if possible to not leave test data
        if snapshot_id:
            # Assuming there's a DELETE endpoint for snapshots (not specified in PRD),
            # but since no delete is defined, skip deletion or extend if API supports it
            pass

test_initialize_delta_sync_for_file()
