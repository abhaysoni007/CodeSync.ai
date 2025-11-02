import requests
import uuid
import hashlib

BASE_URL = "http://localhost:5000"
TIMEOUT = 30
# Added Authorization header with dummy JWT token
HEADERS = {
    "Content-Type": "application/json",
    "Authorization": "Bearer dummy-jwt-token"
}

def test_create_new_snapshot_with_delta_compression():
    # Prepare data for initialization (to create a new resource)
    project_id = str(uuid.uuid4())
    file_id = f"test-file-{uuid.uuid4()}.txt"
    initial_content = "Initial file content for delta sync testing.\nLine 2.\nLine 3."
    user_id = str(uuid.uuid4())

    init_payload = {
        "projectId": project_id,
        "fileId": file_id,
        "initialContent": initial_content,
        "userId": user_id
    }

    snapshot_id = None
    try:
        # Step 1: Initialize delta sync for a new file (creates first snapshot)
        init_resp = requests.post(
            f"{BASE_URL}/delta/init",
            json=init_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert init_resp.status_code == 200, f"Init request failed: {init_resp.text}"
        init_data = init_resp.json()
        assert init_data.get("success") is True, "Delta init did not succeed"
        snapshot = init_data.get("snapshot")
        assert snapshot is not None, "No snapshot returned in init response"
        snapshot_id = snapshot.get("snapshotId")
        assert snapshot_id is not None, "Snapshot missing snapshotId in init response"
        # Save the first version content and version number
        old_content = initial_content
        old_version_number = snapshot.get("versionNumber", 1)

        # Prepare data for creating new snapshot with delta compression
        # Modify content slightly
        new_content = "Initial file content for delta sync testing.\nLine 2 modified.\nLine 3.\nAdded line 4."
        message = "Updated file with new changes"
        trigger = "manual"

        snapshot_payload = {
            "projectId": project_id,
            "fileId": file_id,
            "content": new_content,
            "oldContent": old_content,
            "message": message,
            "trigger": trigger
        }

        # Step 2: Create a new snapshot with delta compression
        snapshot_resp = requests.post(
            f"{BASE_URL}/delta/snapshot",
            json=snapshot_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert snapshot_resp.status_code == 200, f"Snapshot creation failed: {snapshot_resp.text}"
        snapshot_data = snapshot_resp.json()
        assert snapshot_data.get("success") is True, "Snapshot creation not successful"

        new_snapshot = snapshot_data.get("snapshot")
        version_number = snapshot_data.get("versionNumber")

        # Validate snapshot fields for delta compression
        assert new_snapshot is not None, "No snapshot data returned"
        assert "delta" in new_snapshot and new_snapshot["delta"] is not None, "Delta information missing in snapshot"
        delta = new_snapshot["delta"]
        assert "data" in delta and isinstance(delta["data"], str) and len(delta["data"]) > 0, "Delta data missing or empty"
        assert delta.get("format") == "diff", "Delta format should be 'diff'"

        # Metadata validations
        metadata = new_snapshot.get("metadata")
        assert metadata is not None, "Metadata missing in snapshot"
        assert isinstance(metadata.get("originalSize"), int) and metadata["originalSize"] > 0, "Invalid originalSize in metadata"
        assert isinstance(metadata.get("compressedSize"), int) and metadata["compressedSize"] > 0, "Invalid compressedSize in metadata"
        # Compression ratio should be positive and <= 1 (typical compression ratio)
        compression_ratio = metadata.get("compressionRatio")
        assert isinstance(compression_ratio, (float, int)) and 0 < compression_ratio <= 1, "Invalid compressionRatio"

        # Version number should be incremented
        assert isinstance(version_number, int), "versionNumber missing or invalid"
        assert version_number > old_version_number, "versionNumber did not increment"

        # Check checksum integrity (checksum is SHA256 of content)
        checksum = new_snapshot.get("checksum")
        assert isinstance(checksum, str) and len(checksum) == 64, "Invalid checksum format"
        calculated_checksum = hashlib.sha256(new_content.encode('utf-8')).hexdigest()
        assert checksum == calculated_checksum, "Checksum does not match content hash"

        # Trigger and message are as sent
        assert new_snapshot.get("trigger") == trigger, "Trigger mismatch"
        assert new_snapshot.get("message") == message, "Message mismatch"

    finally:
        # Cleanup: delete snapshots for the test file (assuming cleanup API exists)
        # Note: The PRD does not specify a delete snapshot API; skipping if none available
        pass

test_create_new_snapshot_with_delta_compression()
