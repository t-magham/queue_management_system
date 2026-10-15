import pytest
from starlette.websockets import WebSocketDisconnect

def test_websocket_rejects_invalid_token(client, admin_headers):
    create_res = client.post("/queues/create", json={"queue_name": "WS Test", "avg_serve_time": 60}, headers=admin_headers)
    queue_id = create_res.json()["id"]

    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(f"/ws/queue/{queue_id}?token=invalid.jwt.token") as ws:
            ws.receive_text()
    assert exc.value.code == 4003

def test_websocket_connect_and_broadcast_with_guest_and_admin(client, admin_headers):
    create_res = client.post("/queues/create", json={"queue_name": "Broadcast Test", "avg_serve_time": 60}, headers=admin_headers)
    queue_id = create_res.json()["id"]
    code = create_res.json()["code"]
    client.post(f"/queues/open/{queue_id}", headers=admin_headers)

    # Guest joins to get guest_token
    join_res = client.post(f"/queues/join/{code}", json={"display_name": "Live Guest"})
    guest_token = join_res.json()["guest_token"]
    admin_token = admin_headers["Authorization"].split(" ")[1]

    # Connect admin and guest websockets
    with client.websocket_connect(f"/ws/queue/{queue_id}?token={guest_token}") as guest_ws:
        # Trigger an action: admin calls next
        client.post(f"/queues/call-next/{queue_id}", headers=admin_headers)

        # Guest websocket receives the broadcasted updated state!
        message = guest_ws.receive_json()
        assert "queue" in message
        assert "entries" in message
        assert message["stats"]["waiting_count"] == 0
        called = next(e for e in message["entries"] if e["status"] == "called")
        assert called["display_name"] == "Live Guest"
