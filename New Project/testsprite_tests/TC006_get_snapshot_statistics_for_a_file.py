import requests
import uuid
import time

BASE_URL = "http://localhost:5000"
TIMEOUT = 30
HEADERS = {
    "Content-Type": "application/json",
    "Authorization": "Bearer your_jwt_token_here"
}

def test_get_snapshot_statistics_for_a_file():
    project_id = str(uuid.uuid4())
    file_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    initial_content = "print('Initial content for snapshot statistics test')"

    init_payload = {
        "projectId": project_id,
        "fileId": file_id,
        "initialContent": initial_content,
        "userId": user_id
    }

    # Create initial snapshot by initializing delta sync
    init_resp = requests.post(f"{BASE_URL}/delta/init", json=init_payload, headers=HEADERS, timeout=TIMEOUT)
    assert init_resp.status_code == 200, f"Init snapshot failed: {init_resp.text}"
    init_data = init_resp.json()
    assert init_data.get("success") is True
    assert "snapshot" in init_data and isinstance(init_data["snapshot"], dict)
    snapshot_ids = [init_data["snapshot"]["snapshotId"]]

    # Create a couple more snapshots to test statistics
    last_content = initial_content
    for i in range(2):
        new_content = last_content + f"\n# Change {i+1}"
        snapshot_payload = {
            "projectId": project_id,
            "fileId": file_id,
            "content": new_content,
            "oldContent": last_content,
            "message": f"Snapshot {i+2}",
            "trigger": "manual"
        }
        snap_resp = requests.post(f"{BASE_URL}/delta/snapshot", json=snapshot_payload, headers=HEADERS, timeout=TIMEOUT)
        assert snap_resp.status_code == 200, f"Create snapshot failed: {snap_resp.text}"
        snap_data = snap_resp.json()
        assert snap_data.get("success") is True
        assert "snapshot" in snap_data and isinstance(snap_data["snapshot"], dict)
        snapshot_ids.append(snap_data["snapshot"]["snapshotId"])
        last_content = new_content

    try:
        # Request snapshot statistics for the file
        stats_resp = requests.get(f"{BASE_URL}/delta/stats/{file_id}", headers=HEADERS, timeout=TIMEOUT)
        assert stats_resp.status_code == 200, f"Get stats failed: {stats_resp.text}"
        stats_data = stats_resp.json()

        assert stats_data.get("success") is True
        stats = stats_data.get("stats")
        assert isinstance(stats, dict)

        # Validate expected statistics fields presence and types
        assert "totalSnapshots" in stats and isinstance(stats["totalSnapshots"], int) and stats["totalSnapshots"] >= 3
        assert "totalSize" in stats and isinstance(stats["totalSize"], int) and stats["totalSize"] > 0
        assert "avgCompressionRatio" in stats and (isinstance(stats["avgCompressionRatio"], float) or isinstance(stats["avgCompressionRatio"], int))
        assert "oldestSnapshot" in stats and isinstance(stats["oldestSnapshot"], str)
        assert "newestSnapshot" in stats and isinstance(stats["newestSnapshot"], str)

        # Validate ISO datetime format for timestamps (basic check)
        time.strptime(stats["oldestSnapshot"][:19], "%Y-%m-%dT%H:%M:%S")
        time.strptime(stats["newestSnapshot"][:19], "%Y-%m-%dT%H:%M:%S")

    finally:
        # Cleanup: Delete all created snapshots if API to delete snapshots is available
        # No explicit delete snapshot endpoint defined in PRD, so skip cleanup here.
        pass

test_get_snapshot_statistics_for_a_file()
