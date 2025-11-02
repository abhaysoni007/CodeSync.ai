import requests
import uuid
import time

BASE_URL = "http://localhost:5000"
TOKEN = "your_jwt_token_here"
HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {TOKEN}"
}
TIMEOUT = 30

def test_cleanup_old_snapshots_beyond_retention_period():
    project_id = str(uuid.uuid4())
    file_id = f"testfile-{uuid.uuid4()}"
    user_id = str(uuid.uuid4())

    init_payload = {
        "projectId": project_id,
        "fileId": file_id,
        "initialContent": "Initial content of the file",
        "userId": user_id
    }

    # Initialize a delta sync for the file to create the first snapshot
    try:
        init_resp = requests.post(f"{BASE_URL}/delta/init", json=init_payload, headers=HEADERS, timeout=TIMEOUT)
        assert init_resp.status_code == 200, f"Init failed with status {init_resp.status_code}"
        init_data = init_resp.json()
        assert init_data.get("success") is True, "Init success flag false"
        first_snapshot = init_data.get("snapshot")
        assert first_snapshot is not None, "No snapshot returned on init"

        # Create multiple snapshots with different createdAt to simulate old snapshots
        old_snapshots = []
        for i in range(3):
            content = f"File content version {i+2}"
            snapshot_payload = {
                "projectId": project_id,
                "fileId": file_id,
                "content": content,
                "oldContent": "Initial content of the file" if i == 0 else f"File content version {i+1}",
                "message": f"Snapshot {i+2}",
                "trigger": "manual"
            }

            snap_resp = requests.post(f"{BASE_URL}/delta/snapshot", json=snapshot_payload, headers=HEADERS, timeout=TIMEOUT)
            assert snap_resp.status_code == 200, f"Snapshot creation failed with status {snap_resp.status_code}"
            snap_data = snap_resp.json()
            assert snap_data.get("success") is True, "Snapshot creation success false"
            snapshot = snap_data.get("snapshot")
            assert snapshot is not None, "No snapshot returned on creation"
            old_snapshots.append(snapshot)

        # Artificially simulate snapshots older than retention by patching their creation date if possible
        # Since no direct API is given, assume the test environment auto-sets createdAt
        # We proceed to call cleanup with daysToKeep=0 to delete all old snapshots except the newest
        days_to_keep = 0

        cleanup_resp = requests.post(f"{BASE_URL}/delta/cleanup/{file_id}", 
                                     json={"daysToKeep": days_to_keep}, headers=HEADERS, timeout=TIMEOUT)
        assert cleanup_resp.status_code == 200, f"Cleanup failed with status {cleanup_resp.status_code}"
        cleanup_data = cleanup_resp.json()
        assert cleanup_data.get("success") is True, "Cleanup success false"
        deleted_count = cleanup_data.get("deletedCount")
        assert isinstance(deleted_count, int), "deletedCount is not integer"
        assert deleted_count > 0, "No snapshots deleted despite daysToKeep=0"

    finally:
        # Cleanup: delete all snapshots and the file if API available
        # No delete endpoint provided in PRD, so cleanup not implemented here.
        pass

test_cleanup_old_snapshots_beyond_retention_period()
