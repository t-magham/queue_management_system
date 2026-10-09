def test_guest_cannot_join_closed_queue(client, admin_headers):
    # Create queue (defaults to closed)
    create_res = client.post("/queues/create", json={
        "queue_name": "Consultation",
        "avg_serve_time": 300,
    }, headers=admin_headers)
    code = create_res.json()["code"]

    # Guest attempts to join
    res = client.post(f"/queues/join/{code}", json={"display_name": "Charlie"})
    assert res.status_code == 400
    assert "not open" in res.json()["detail"].lower()

def test_guest_join_open_queue_success(client, admin_headers):
    create_res = client.post("/queues/create", json={
        "queue_name": "Triage",
        "avg_serve_time": 240,
    }, headers=admin_headers)
    queue_id = create_res.json()["id"]
    code = create_res.json()["code"]

    # Open queue
    client.post(f"/queues/open/{queue_id}", headers=admin_headers)

    # Guest 1 joins
    res1 = client.post(f"/queues/join/{code}", json={"display_name": "Alice"})
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["join_number"] == 1
    assert "guest_token" in data1
    assert data1["queue_id"] == queue_id

    # Guest 2 joins
    res2 = client.post(f"/queues/join/{code}", json={"display_name": "Bob"})
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["join_number"] == 2

    # Verify queue state
    state_res = client.get(f"/queues/state/{queue_id}")
    assert state_res.status_code == 200
    state = state_res.json()
    assert state["stats"]["waiting_count"] == 2
    assert state["stats"]["served_count"] == 0
    assert state["stats"]["skipped_count"] == 0
    assert len(state["entries"]) == 2

def test_soft_close_blocks_new_joins_while_preserving_waiting(client, admin_headers):
    create_res = client.post("/queues/create", json={
        "queue_name": "Dental Checkup",
        "avg_serve_time": 180,
    }, headers=admin_headers)
    queue_id = create_res.json()["id"]
    code = create_res.json()["code"]

    # Open and let guests join
    client.post(f"/queues/open/{queue_id}", headers=admin_headers)
    client.post(f"/queues/join/{code}", json={"display_name": "David"})
    client.post(f"/queues/join/{code}", json={"display_name": "Eva"})

    # Soft close queue
    client.post(f"/queues/close/{queue_id}", headers=admin_headers)

    # New guest should be blocked
    block_res = client.post(f"/queues/join/{code}", json={"display_name": "Frank"})
    assert block_res.status_code == 400

    # Existing waiting guests are preserved
    state = client.get(f"/queues/state/{queue_id}").json()
    assert state["stats"]["waiting_count"] == 2
