from fastapi.concurrency import run_in_threadpool

from app.api.routes.ws import manager
from app.dependencies.auth import get_current_user, get_current_guest
from app.schemas import queue_schemas
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends
from app.db.deps import get_db
from app.schemas.queue_schemas import DeleteQueueRequest, JoinQueueRequest
from app.services import queue_services
from app.models import User

queue_router = APIRouter()

# Routes that broadcast over WS must be async, but the services use blocking
# SQLAlchemy calls. run_in_threadpool keeps those off the event loop so one slow
# DB query doesn't stall every websocket.

# API Endpoints

# router — pass the new fields through
@queue_router.post("/create", response_model=queue_schemas.CreateQueueResponse)
def create_queue(payload: queue_schemas.CreateQueueRequest,
                 user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    return queue_services.create_queue(
        db, user,
        payload.queue_name,
        payload.description,
        payload.avg_serve_time,
        payload.scheduled_open_at,
        payload.scheduled_close_at,
    )


@queue_router.get("/dashboard")
def get_queues(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return queue_services.get_user_queues(user=user, db=db)


@queue_router.delete("/delete")
def delete_queue(payload: DeleteQueueRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return queue_services.delete_queue(user, db, payload.queue_id)


# ── admin actions ─────────────────────────────────────────────────────────────
@queue_router.get("/state/{queue_id}")
def get_state(queue_id: int, db: Session = Depends(get_db)):
    return queue_services.get_queue_state(db, queue_id)


@queue_router.post("/open/{queue_id}")
async def open_queue(queue_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    state = await run_in_threadpool(queue_services.open_queue, db, queue_id, user)
    await manager.broadcast(queue_id, state)
    return state


@queue_router.post("/close/{queue_id}")
async def close_queue(queue_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    state = await run_in_threadpool(queue_services.close_queue, db, queue_id, user)
    await manager.broadcast(queue_id, state)
    return state


@queue_router.post("/call-next/{queue_id}")
async def call_next(queue_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    state = await run_in_threadpool(queue_services.call_next, db, queue_id, user)
    await manager.broadcast(queue_id, state)
    return state


@queue_router.post("/skip/{queue_id}")
async def skip_current(queue_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    state = await run_in_threadpool(queue_services.skip_current, db, queue_id, user)
    await manager.broadcast(queue_id, state)
    return state


@queue_router.post("/recall/{queue_id}")
async def recall_current(queue_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    state = await run_in_threadpool(queue_services.recall_current, db, queue_id, user)
    await manager.broadcast(queue_id, state)
    return state


@queue_router.delete("/delete-entry/{entry_id}")
async def delete_entry(entry_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    res = await run_in_threadpool(queue_services.delete_queue_entry, db, entry_id, user)
    state = res["state"]
    await manager.broadcast(res["queue_id"], state)
    return state


# ── guest action ──────────────────────────────────────────────────────────────

@queue_router.post("/join/{code}")
async def join_queue(code: str, payload: JoinQueueRequest, db: Session = Depends(get_db)):
    result = await run_in_threadpool(queue_services.join_queue, db, code, payload.display_name)
    await manager.broadcast(result["queue_id"], result["state"])
    # return guest_token, entry_id and queue_id
    return {
        "guest_token": result["guest_token"],
        "queue_id": result["queue_id"],
        "entry_id": result["entry_id"],
        "join_number": result["join_number"],
    }  # only the ticket goes back to the guest


@queue_router.delete("/leave")
async def leave_queue(
        guest: dict = Depends(get_current_guest),
        db: Session = Depends(get_db)
):
    entry_id = guest["entry_id"]
    queue_id = guest["queue_id"]
    state = await run_in_threadpool(queue_services.leave_queue, db, entry_id)
    await manager.broadcast(queue_id, state)
    return {"message": "Left queue successfully"}


@queue_router.get("/{queue_id}")
def get_queue_endpoint(queue_id: int, db: Session = Depends(get_db)):
    return queue_services.get_queue(db, queue_id)
