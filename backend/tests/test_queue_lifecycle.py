def test_create_queue(client, admin_headers):
    payload = {
        "queue_name": "General Checkup",
        "description": "Walk-in consultation desk",
        "avg_serve_time": 300,  # 5 minutes in seconds
        "scheduled_open_at": None,
        "scheduled_close_at": None,
    }
    response = client.post("/queues/create", json=payload, headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "General Checkup"
    assert data["status"] == "closed"
    assert len(data["code"]) == 6
    assert isinstance(data["id"], int)

def test_admin_dashboard_queues(client, admin_headers):
    payload = {
        "queue_name": "Lab Tests",
        "description": "Blood work desk",
        "avg_serve_time": 180,
    }
    client.post("/queues/create", json=payload, headers=admin_headers)

    res = client.get("/queues/dashboard", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "queues" in data
    assert any(q["name"] == "Lab Tests" for q in data["queues"])

def test_open_and_close_queue(client, admin_headers):
    create_res = client.post("/queues/create", json={
        "queue_name": "Pharmacy Pickup",
        "avg_serve_time": 120,
    }, headers=admin_headers)
    queue_id = create_res.json()["id"]

    # Open queue
    open_res = client.post(f"/queues/open/{queue_id}", headers=admin_headers)
    assert open_res.status_code == 200
    assert open_res.json()["queue"]["status"] == "open"

    # Cannot open already open queue
    open_again = client.post(f"/queues/open/{queue_id}", headers=admin_headers)
    assert open_again.status_code == 400

    # Soft close queue
    close_res = client.post(f"/queues/close/{queue_id}", headers=admin_headers)
    assert close_res.status_code == 200
    assert close_res.json()["queue"]["status"] == "closed"

    # Cannot close already closed queue
    close_again = client.post(f"/queues/close/{queue_id}", headers=admin_headers)
    assert close_again.status_code == 400

def test_delete_queue(client, admin_headers):
    create_res = client.post("/queues/create", json={
        "queue_name": "Temporary Desk",
        "avg_serve_time": 60,
    }, headers=admin_headers)
    queue_id = create_res.json()["id"]

    del_res = client.request("DELETE", "/queues/delete", json={"queue_id": queue_id}, headers=admin_headers)
    assert del_res.status_code == 200

    # Fetch state should now return 404
    get_res = client.get(f"/queues/state/{queue_id}")
    assert get_res.status_code == 404
