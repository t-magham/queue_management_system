from fastapi import WebSocket, WebSocketDisconnect, APIRouter, HTTPException, Query
import logging

from jwt.exceptions import ExpiredSignatureError

from app.db.session import SessionLocal
from app.dependencies.auth import verify_guest_token, verify_admin_token, get_expired_guest_entry
from app.services.queue_services import delete_queue_entry

logger = logging.getLogger(__name__)

ws_router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # { queue_id: [websocket1, websocket2, ...] }
        self.rooms: dict[int, list[WebSocket]] = {}

    async def connect(self, queue_id: int, websocket: WebSocket):
        await websocket.accept()
        if queue_id not in self.rooms:
            self.rooms[queue_id] = []
        self.rooms[queue_id].append(websocket)
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
        for websocket in self.rooms[queue_id]:
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
    db = SessionLocal()
    logger.info(f"request come here: {token}")
    try:
        try:
            verify_guest_token(token)
            logger.info(f"after verify guest token")
        except ExpiredSignatureError:
            logger.info(f"expired guest token")
            # valid guest token but expired — delete entry and reject
            entry_id = get_expired_guest_entry(token)
            state = delete_queue_entry(db, entry_id)
            await websocket.close(code=4001)
            if state:
                await manager.broadcast(queue_id, state)
            return
        except HTTPException as e:
            logger.info(f"Not a guest token, trying admin. Reason: {e.detail}")
            try:
                verify_admin_token(token)
                logger.info("Admin token verified successfully")
            except Exception as ex:
                logger.error(f"Admin token also failed: {ex}")
                await websocket.close(code=403)
                return
        logger.info(f"request come out of exceptions")
        await manager.connect(queue_id, websocket)
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            manager.disconnect(queue_id, websocket)
    finally:
        db.close()

