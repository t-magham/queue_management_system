from datetime import datetime, timedelta, timezone

import jwt
import pytest
from starlette.websockets import WebSocketDisconnect

from app.core import settings
from app.models import QueueEntry
from app.models.enums import EntryStatus


def _open_queue(client, headers, name="Q"):
    res = client.post("/queues/create", json={"queue_name": name, "avg_serve_time": 60}, headers=headers)
    queue = res.json()
    client.post(f"/queues/open/{queue['id']}", headers=headers)
    return queue


def _other_admin_headers(client):
    creds = {"email": "other@example.com", "password": "Password123!"}
    client.post("/auth/signup", json={**creds, "confirmPassword": creds["password"]})
    token = client.post("/auth/login", json=creds).json()["token"]
    return {"Authorization": f"Bearer {token}"}


def _expired_guest_token(entry_id, queue_id):
    payload = {
        "sub": "guest", "entry_id": entry_id, "queue_id": queue_id, "join_number": 1,
        "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def test_get_queue_by_id(client, admin_headers):
    queue = _open_queue(client, admin_headers)
    res = client.get(f"/queues/{queue['id']}")
    assert res.status_code == 200
    assert res.json()["code"] == queue["code"]
    assert client.get("/queues/999999").status_code == 404


def test_delete_entry_requires_queue_owner(client, admin_headers, db):
    queue = _open_queue(client, admin_headers)
    entry_id = client.post(f"/queues/join/{queue['code']}", json={"display_name": "A"}).json()["entry_id"]

    assert client.delete(f"/queues/delete-entry/{entry_id}").status_code == 401
    assert client.delete(f"/queues/delete-entry/{entry_id}", headers=_other_admin_headers(client)).status_code == 403

    res = client.delete(f"/queues/delete-entry/{entry_id}", headers=admin_headers)
    assert res.status_code == 200
    assert db.get(QueueEntry, entry_id).status == EntryStatus.SKIPPED


def test_delete_entry_keeps_served_history(client, admin_headers, db):
    queue = _open_queue(client, admin_headers)
    entry_id = client.post(f"/queues/join/{queue['code']}", json={"display_name": "A"}).json()["entry_id"]
    client.post(f"/queues/call-next/{queue['id']}", headers=admin_headers)
    client.post(f"/queues/call-next/{queue['id']}", headers=admin_headers)  # A -> served
    client.delete(f"/queues/delete-entry/{entry_id}", headers=admin_headers)
    db.expire_all()
    assert db.get(QueueEntry, entry_id).status == EntryStatus.SERVED


def test_leave_with_expired_guest_token_is_401(client, admin_headers):
    queue = _open_queue(client, admin_headers)
    entry_id = client.post(f"/queues/join/{queue['code']}", json={"display_name": "A"}).json()["entry_id"]
    token = _expired_guest_token(entry_id, queue["id"])
    res = client.delete("/queues/leave", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401


def test_ws_expired_guest_gets_4001_and_room_gets_real_state(client, admin_headers, db):
    queue = _open_queue(client, admin_headers)
    entry_id = client.post(f"/queues/join/{queue['code']}", json={"display_name": "A"}).json()["entry_id"]
    admin_token = admin_headers["Authorization"].split(" ")[1]

    with client.websocket_connect(f"/ws/queue/{queue['id']}?token={admin_token}") as admin_ws:
        with pytest.raises(WebSocketDisconnect) as exc:
            with client.websocket_connect(
                f"/ws/queue/{queue['id']}?token={_expired_guest_token(entry_id, queue['id'])}"
            ) as guest_ws:
                guest_ws.receive_text()
        assert exc.value.code == 4001

        # the broadcast is the queue state itself, not a {"state", "queue_id"} wrapper
        message = admin_ws.receive_json()
        assert "entries" in message
        assert message["entries"][0]["status"] == "skipped"


def test_ws_guest_token_only_valid_for_its_queue(client, admin_headers):
    q1 = _open_queue(client, admin_headers, "One")
    q2 = _open_queue(client, admin_headers, "Two")
    guest_token = client.post(f"/queues/join/{q1['code']}", json={"display_name": "A"}).json()["guest_token"]
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(f"/ws/queue/{q2['id']}?token={guest_token}") as ws:
            ws.receive_text()
    assert exc.value.code == 4003


def test_ws_admin_must_own_queue(client, admin_headers):
    queue = _open_queue(client, admin_headers)
    other_token = _other_admin_headers(client)["Authorization"].split(" ")[1]
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(f"/ws/queue/{queue['id']}?token={other_token}") as ws:
            ws.receive_text()
    assert exc.value.code == 4003


def test_input_validation(client, admin_headers):
    bad_signup = {"email": "x@example.com", "password": "Password123!", "confirmPassword": "nope"}
    assert client.post("/auth/signup", json=bad_signup).status_code == 422
    bad_queue = {"queue_name": "Q", "avg_serve_time": 0}
    assert client.post("/queues/create", json=bad_queue, headers=admin_headers).status_code == 422
    queue = _open_queue(client, admin_headers)
    assert client.post(f"/queues/join/{queue['code']}", json={"display_name": "x" * 51}).status_code == 422
