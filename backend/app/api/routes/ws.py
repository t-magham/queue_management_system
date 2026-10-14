from fastapi import WebSocket, WebSocketDisconnect, APIRouter, HTTPException, Query
import logging

from jwt.exceptions import ExpiredSignatureError

from fastapi.concurrency import run_in_threadpool

from app.db.session import SessionLocal
from app.models import Queue, User
from app.dependencies.auth import verify_guest_token, verify_admin_token, get_expired_guest_entry
from app.services.queue_services import delete_queue_entry

logger = logging.getLogger(__name__)

ws_router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # { queue_id: [websocket1, websocket2, ...] }
        self.rooms: dict[int, list[WebSocket]] = {}

    def connect(self, queue_id: int, websocket: WebSocket):
        # websocket must already be accepted
        self.rooms.setdefault(queue_id, []).append(websocket)
        logger.info(f"WS connected: queue_id={queue_id}, total in room={len(self.rooms[queue_id])}")

    def disconnect(self, queue_id: int, websocket: WebSocket):
        if queue_id in self.rooms:
            if websocket in self.rooms[queue_id]:
                self.rooms[queue_id].remove(websocket)
                logger.info(f"WS disconnected: queue_id={queue_id}, remaining={len(self.rooms[queue_id])}")
            if not self.rooms[queue_id]:
                del self.rooms[queue_id]  # clean up empty rooms

    async def broadcast(self, queue_id: int, message: dict):
        if queue_id not in self.rooms:
            logger.info(f"broadcast called but no connections in room {queue_id}")
            return
        disconnected = []
        # iterate a copy: connections may join/leave while we await sends
        for websocket in list(self.rooms[queue_id]):
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send to a websocket in room {queue_id}: {e}")
                disconnected.append(websocket)
        # clean up any dead connections found during broadcast
        for ws in disconnected:
            self.disconnect(queue_id, ws)


# single shared instance — imported by other modules
manager = ConnectionManager()





@ws_router.websocket("/queue/{queue_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    queue_id: int,
    token: str = Query(...),
):
    # Accept first: closing before accept turns into an HTTP 403 handshake failure,
    # and the browser then sees code 1006 instead of our custom close codes.
    await websocket.accept()
    db = SessionLocal()
    try:
        try:
            guest = verify_guest_token(token)
            if guest.get("queue_id") != queue_id:
                await websocket.close(code=4003)
                return
        except ExpiredSignatureError:
            # signature valid but expired — free the guest's spot and reject
            entry_id = get_expired_guest_entry(token)
            res = await run_in_threadpool(delete_queue_entry, db, entry_id) if entry_id else None
            await websocket.close(code=4001)
            if res and res["state"]:
                await manager.broadcast(res["queue_id"], res["state"])
            return
        except HTTPException as e:
            logger.info(f"Not a guest token, trying admin. Reason: {e.detail}")
            if not await run_in_threadpool(_is_queue_admin, db, token, queue_id):
                await websocket.close(code=4003)
                return

        manager.connect(queue_id, websocket)
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            pass
        finally:
            manager.disconnect(queue_id, websocket)
    finally:
        db.close()


def _is_queue_admin(db, token: str, queue_id: int) -> bool:
    try:
        payload = verify_admin_token(token)
    except HTTPException:
        return False
    user = db.query(User).filter(User.email == payload["sub"]).first()
    queue = db.query(Queue).filter(Queue.id == queue_id).first()
    return user is not None and queue is not None and queue.admin_id == user.id
