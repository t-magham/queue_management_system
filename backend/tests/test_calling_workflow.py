from app.models.queue_entry import QueueEntry
from app.models.enums import EntryStatus

def test_call_next_and_served_workflow(client, admin_headers, db):
    # Setup queue
    create_res = client.post("/queues/create", json={"queue_name": "Clinic", "avg_serve_time": 60}, headers=admin_headers)
    queue_id = create_res.json()["id"]
    code = create_res.json()["code"]
    client.post(f"/queues/open/{queue_id}", headers=admin_headers)

    # 2 Guests join
    r1 = client.post(f"/queues/join/{code}", json={"display_name": "Alice"})
    r2 = client.post(f"/queues/join/{code}", json={"display_name": "Bob"})
    entry1_id = r1.json()["entry_id"]
    entry2_id = r2.json()["entry_id"]

    # 1st Call Next -> Alice is CALLED
    call1 = client.post(f"/queues/call-next/{queue_id}", headers=admin_headers)
    assert call1.status_code == 200
    state1 = call1.json()
    alice = next(e for e in state1["entries"] if e["id"] == entry1_id)
    assert alice["status"] == "called"
    assert alice["called_at"] is not None
    assert state1["stats"]["waiting_count"] == 1
    assert state1["stats"]["served_count"] == 0

    # 2nd Call Next -> Alice becomes SERVED, Bob becomes CALLED
    call2 = client.post(f"/queues/call-next/{queue_id}", headers=admin_headers)
    assert call2.status_code == 200
    state2 = call2.json()
    alice = next(e for e in state2["entries"] if e["id"] == entry1_id)
    bob = next(e for e in state2["entries"] if e["id"] == entry2_id)
    assert alice["status"] == "served"
    assert bob["status"] == "called"
    assert state2["stats"]["served_count"] == 1
    assert state2["stats"]["waiting_count"] == 0

    # 3rd Call Next -> Bob becomes SERVED, queue has 0 waiting
    call3 = client.post(f"/queues/call-next/{queue_id}", headers=admin_headers)
    assert call3.status_code == 200
    state3 = call3.json()
    bob = next(e for e in state3["entries"] if e["id"] == entry2_id)
    assert bob["status"] == "served"
    assert state3["stats"]["served_count"] == 2
    assert state3["stats"]["waiting_count"] == 0

    # 4th Call Next with nobody waiting -> 404
    call4 = client.post(f"/queues/call-next/{queue_id}", headers=admin_headers)
    assert call4.status_code == 404

def test_recall_current_workflow(client, admin_headers):
    create_res = client.post("/queues/create", json={"queue_name": "Recall Test", "avg_serve_time": 60}, headers=admin_headers)
    queue_id = create_res.json()["id"]
    code = create_res.json()["code"]
    client.post(f"/queues/open/{queue_id}", headers=admin_headers)

    # Recall with nobody called -> 404
    recall_empty = client.post(f"/queues/recall/{queue_id}", headers=admin_headers)
    assert recall_empty.status_code == 404

    # Join and call
    client.post(f"/queues/join/{code}", json={"display_name": "Alice"})
    client.post(f"/queues/call-next/{queue_id}", headers=admin_headers)

    # Recall should succeed
    recall_res = client.post(f"/queues/recall/{queue_id}", headers=admin_headers)
    assert recall_res.status_code == 200
    state = recall_res.json()
    called = next(e for e in state["entries"] if e["status"] == "called")
    assert called["display_name"] == "Alice"

def test_skip_current_soft_retention(client, admin_headers, db):
    create_res = client.post("/queues/create", json={"queue_name": "Skip Test", "avg_serve_time": 60}, headers=admin_headers)
    queue_id = create_res.json()["id"]
    code = create_res.json()["code"]
    client.post(f"/queues/open/{queue_id}", headers=admin_headers)

    join_res = client.post(f"/queues/join/{code}", json={"display_name": "NoShow User"})
    entry_id = join_res.json()["entry_id"]

    # Call user
    client.post(f"/queues/call-next/{queue_id}", headers=admin_headers)

    # Skip user
    skip_res = client.post(f"/queues/skip/{queue_id}", headers=admin_headers)
    assert skip_res.status_code == 200
    state = skip_res.json()
    assert state["stats"]["skipped_count"] == 1

    # Verify soft retention in database: row is NOT deleted
    entry = db.query(QueueEntry).filter(QueueEntry.id == entry_id).first()
    assert entry is not None
    assert entry.status == EntryStatus.SKIPPED
    assert entry.served_at is not None

def test_guest_leave_soft_retention(client, admin_headers, db):
    create_res = client.post("/queues/create", json={"queue_name": "Leave Test", "avg_serve_time": 60}, headers=admin_headers)
    queue_id = create_res.json()["id"]
    code = create_res.json()["code"]
    client.post(f"/queues/open/{queue_id}", headers=admin_headers)

    join_res = client.post(f"/queues/join/{code}", json={"display_name": "Departing User"})
    guest_token = join_res.json()["guest_token"]
    entry_id = join_res.json()["entry_id"]

    # Guest voluntarily leaves
    leave_res = client.delete("/queues/leave", headers={"Authorization": f"Bearer {guest_token}"})
    assert leave_res.status_code == 200

    # Verify entry is soft retained in database with LEFT status
    entry = db.query(QueueEntry).filter(QueueEntry.id == entry_id).first()
    assert entry is not None
    assert entry.status == EntryStatus.LEFT
