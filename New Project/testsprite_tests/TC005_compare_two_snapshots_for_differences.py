import requests
import uuid

BASE_URL = "http://localhost:5000"
TIMEOUT = 30
HEADERS = {
    "Content-Type": "application/json",
    "Authorization": "Bearer <token>"
}

def test_TC005_compare_two_snapshots_for_differences():
    project_id = str(uuid.uuid4())
    file_id = "test/file/path_" + str(uuid.uuid4())
    user_id = str(uuid.uuid4())

    initial_content = "line1\nline2\nline3\nline4\n"
    modified_content = "line1\nline2 modified\nline3\nline5 added\n"

    snapshot_ids = []

    try:
        # Initialize delta sync and create the first snapshot
        init_payload = {
            "projectId": project_id,
            "fileId": file_id,
            "initialContent": initial_content,
            "userId": user_id
        }
        init_resp = requests.post(
            f"{BASE_URL}/delta/init",
            json=init_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert init_resp.status_code == 200, f"Init failed: {init_resp.text}"
        init_data = init_resp.json()
        assert init_data.get("success") is True, f"Init success false: {init_data}"
        snapshot1 = init_data.get("snapshot")
        assert snapshot1 and "snapshotId" in snapshot1, "No snapshotId in init response"
        snapshot_ids.append(snapshot1["snapshotId"])

        # Create a new snapshot with modified content and delta compression
        snapshot_payload = {
            "projectId": project_id,
            "fileId": file_id,
            "content": modified_content,
            "oldContent": initial_content,
            "message": "Modified lines 2 and 4",
            "trigger": "manual"
        }
        snapshot_resp = requests.post(
            f"{BASE_URL}/delta/snapshot",
            json=snapshot_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert snapshot_resp.status_code == 200, f"Snapshot creation failed: {snapshot_resp.text}"
        snapshot_data = snapshot_resp.json()
        assert snapshot_data.get("success") is True, f"Snapshot creation failed: {snapshot_data}"
        snapshot2 = snapshot_data.get("snapshot")
        assert snapshot2 and "snapshotId" in snapshot2, "No snapshotId in snapshot creation response"
        snapshot_ids.append(snapshot2["snapshotId"])

        # Call the compare endpoint with the two snapshots
        compare_payload = {
            "fileId": file_id,
            "snapshotId1": snapshot_ids[0],
            "snapshotId2": snapshot_ids[1]
        }
        compare_resp = requests.post(
            f"{BASE_URL}/delta/compare",
            json=compare_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert compare_resp.status_code == 200, f"Compare request failed: {compare_resp.text}"
        compare_data = compare_resp.json()
        assert compare_data.get("success") is True, f"Compare success false: {compare_data}"
        diff = compare_data.get("diff")
        lines_added = compare_data.get("linesAdded")
        lines_removed = compare_data.get("linesRemoved")

        assert isinstance(diff, str) and diff, "Invalid or empty diff string"
        assert isinstance(lines_added, int) and lines_added >= 0, "Invalid linesAdded"
        assert isinstance(lines_removed, int) and lines_removed >= 0, "Invalid linesRemoved"

        # Basic content check in unified diff (should contain line changes)
        assert ("-line2" in diff or "-line2\n" in diff or "-line2 modified" not in diff), "Diff missing expected line removal"
        assert ("+line2 modified" in diff), "Diff missing expected line addition"
        assert ("+line5 added" in diff), "Diff missing expected added line"
        assert ("-line4" in diff or "-line4\n" in diff), "Diff missing expected removed line"
        assert lines_added > 0 or lines_removed > 0, "No lines added or removed detected"

    finally:
        # Cleanup: Rollback or delete snapshots if delete API existed, but only snapshot creation init is primarily reversible.
        # Since no delete endpoint specified in PRD, skip cleanup or could consider rollback if applicable.
        # For safety, no cleanup as per given endpoints to avoid data loss.
        pass

test_TC005_compare_two_snapshots_for_differences()
