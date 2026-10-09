from datetime import datetime, timezone, timedelta
from app.models.queue_entry import QueueEntry
from app.models.queue import Queue
from app.models.enums import EntryStatus

def test_dynamic_rolling_average_update(client, admin_headers, db):
    # Initial avg_serve_time is 300 seconds
    create_res = client.post("/queues/create", json={"queue_name": "Surgery Prep", "avg_serve_time": 300}, headers=admin_headers)
    queue_id = create_res.json()["id"]
    code = create_res.json()["code"]
    client.post(f"/queues/open/{queue_id}", headers=admin_headers)

    # Two guests join
    r1 = client.post(f"/queues/join/{code}", json={"display_name": "Patient 1"})
    r2 = client.post(f"/queues/join/{code}", json={"display_name": "Patient 2"})
    entry1_id = r1.json()["entry_id"]

    # Call Patient 1
    client.post(f"/queues/call-next/{queue_id}", headers=admin_headers)

    # Simulate that Patient 1 was called 100 seconds ago
    p1_entry = db.query(QueueEntry).filter(QueueEntry.id == entry1_id).first()
    p1_entry.called_at = datetime.now(timezone.utc) - timedelta(seconds=100)
    db.commit()

    # Now call next -> Patient 1 is served.
    # Observed duration is ~100s.
    # New avg_serve_time = int(0.7 * 300 + 0.3 * 100) = 210 + 30 = 240 seconds.
    res = client.post(f"/queues/call-next/{queue_id}", headers=admin_headers)
    assert res.status_code == 200
    state = res.json()

    updated_avg = state["queue"]["avg_serve_time"]
    assert 235 <= updated_avg <= 245  # within small clock tolerance of 240s

    # Also check estimated wait: 0 patients waiting ahead of current, waiting_count is 0
    assert state["stats"]["estimated_wait"] == 0

def test_estimated_wait_calculation_in_stats(client, admin_headers):
    create_res = client.post("/queues/create", json={"queue_name": "Vaccine Clinic", "avg_serve_time": 120}, headers=admin_headers)
    queue_id = create_res.json()["id"]
    code = create_res.json()["code"]
    client.post(f"/queues/open/{queue_id}", headers=admin_headers)

    client.post(f"/queues/join/{code}", json={"display_name": "Guest A"})
    client.post(f"/queues/join/{code}", json={"display_name": "Guest B"})
    client.post(f"/queues/join/{code}", json={"display_name": "Guest C"})

    state = client.get(f"/queues/state/{queue_id}").json()
    assert state["stats"]["waiting_count"] == 3
    # 3 * 120 = 360 seconds
    assert state["stats"]["estimated_wait"] == 360
