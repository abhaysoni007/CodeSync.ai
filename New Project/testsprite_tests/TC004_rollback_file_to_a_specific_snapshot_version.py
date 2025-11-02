import requests
import uuid

BASE_URL = "http://localhost:5000"
TIMEOUT = 30
# Replace 'your_valid_jwt_token_here' with an actual valid JWT token
HEADERS = {
    "Content-Type": "application/json",
    "Authorization": "Bearer your_valid_jwt_token_here"
}

def test_rollback_file_to_specific_snapshot_version():
    # Prepare unique ids and initial content
    project_id = str(uuid.uuid4())
    file_id = f"testfile_{uuid.uuid4()}.txt"
    user_id = str(uuid.uuid4())

    initial_content = "This is the initial content.\nLine 2.\nLine 3."
    updated_content = "This is the updated content.\nLine 2 modified.\nLine 3."

    created_snapshot_ids = []

    try:
        # Step 1: Initialize delta sync for a new file (create first snapshot)
        init_payload = {
            "projectId": project_id,
            "fileId": file_id,
            "initialContent": initial_content,
            "userId": user_id
        }
        r_init = requests.post(f"{BASE_URL}/delta/init", json=init_payload, headers=HEADERS, timeout=TIMEOUT)
        assert r_init.status_code == 200, f"Delta init failed: {r_init.text}"
        init_json = r_init.json()
        assert init_json.get("success") is True, "Init response success flag is False"
        snapshot1 = init_json.get("snapshot")
        assert snapshot1 is not None, "No snapshot returned from init"
        snapshot1_id = snapshot1.get("snapshotId")
        assert snapshot1_id, "Init snapshot missing snapshotId"
        created_snapshot_ids.append(snapshot1_id)

        # Step 2: Create a new snapshot with updated content (delta compression)
        snapshot_payload = {
            "projectId": project_id,
            "fileId": file_id,
            "content": updated_content,
            "oldContent": initial_content,
            "message": "Updated content for test",
            "trigger": "manual"
        }
        r_snapshot = requests.post(f"{BASE_URL}/delta/snapshot", json=snapshot_payload, headers=HEADERS, timeout=TIMEOUT)
        assert r_snapshot.status_code == 200, f"Create snapshot failed: {r_snapshot.text}"
        snap_json = r_snapshot.json()
        assert snap_json.get("success") is True, "Snapshot creation success flag is False"
        snapshot2 = snap_json.get("snapshot")
        assert snapshot2 is not None, "No snapshot returned from create snapshot"
        snapshot2_id = snapshot2.get("snapshotId")
        assert snapshot2_id, "Snapshot creation missing snapshotId"
        created_snapshot_ids.append(snapshot2_id)

        # Step 3: Rollback file to the first snapshot version (initial)
        rollback_payload = {
            "projectId": project_id,
            "fileId": file_id,
            "snapshotId": snapshot1_id,
            "userId": user_id
        }
        r_rollback = requests.post(f"{BASE_URL}/delta/rollback", json=rollback_payload, headers=HEADERS, timeout=TIMEOUT)
        assert r_rollback.status_code == 200, f"Rollback failed: {r_rollback.text}"
        rollback_json = r_rollback.json()
        assert rollback_json.get("success") is True, "Rollback success flag is False"
        restored_content = rollback_json.get("content")
        rollback_snapshot = rollback_json.get("snapshot")
        assert rollback_snapshot is not None, "Rollback response missing snapshot details"
        assert rollback_snapshot.get("snapshotId") == snapshot1_id, "Rollback snapshotId does not match requested"
        # Content restored should exactly match initial content
        assert restored_content == initial_content, "Restored content does not match initial snapshot content"

        # Step 4: Rollback file to the second snapshot version (updated)
        rollback_payload2 = {
            "projectId": project_id,
            "fileId": file_id,
            "snapshotId": snapshot2_id,
            "userId": user_id
        }
        r_rollback2 = requests.post(f"{BASE_URL}/delta/rollback", json=rollback_payload2, headers=HEADERS, timeout=TIMEOUT)
        assert r_rollback2.status_code == 200, f"Rollback to second snapshot failed: {r_rollback2.text}"
        rollback_json2 = r_rollback2.json()
        assert rollback_json2.get("success") is True, "Rollback to second snapshot success flag is False"
        restored_content2 = rollback_json2.get("content")
        rollback_snapshot2 = rollback_json2.get("snapshot")
        assert rollback_snapshot2 is not None, "Rollback to second snapshot missing snapshot details"
        assert rollback_snapshot2.get("snapshotId") == snapshot2_id, "Rollback second snapshotId does not match requested"
        # Content restored should exactly match updated content
        assert restored_content2 == updated_content, "Restored content does not match updated snapshot content"

    finally:
        # Cleanup: If there was an API to delete snapshots or files, call here.
        # As no delete endpoint described, no cleanup of snapshots is done.
        pass

test_rollback_file_to_specific_snapshot_version()
