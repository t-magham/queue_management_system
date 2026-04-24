from app.api.routes.ws import manager
from app.dependencies.auth import get_current_user, get_current_guest
from app.schemas import queue_schemas
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends
from app.db.deps import get_db
from app.schemas.queue_schemas import DeleteQueueRequest, JoinQueueRequest
from app.services import queue_services
from app.models import User
from app.services.queue_services import delete_queue_entry

queue_router = APIRouter()


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
    print("dashboard")
    return queue_services.get_user_queues(user=user, db=db)


@queue_router.delete("/delete")
def delete_queue(payload: DeleteQueueRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return queue_services.delete_queue(user, db, payload.queue_id)


# ── admin actions ─────────────────────────────────────────────────────────────
@queue_router.get("/state/{queue_id}")
async def get_state(queue_id: int, db: Session = Depends(get_db)):
    state = queue_services.get_queue_state(db, queue_id)
    return state


@queue_router.post("/open/{queue_id}")
async def open_queue(queue_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    state = queue_services.open_queue(db, queue_id, user)
    await manager.broadcast(queue_id, state)
    return state


@queue_router.post("/close/{queue_id}")
async def close_queue(queue_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    state = queue_services.close_queue(db, queue_id, user)
    await manager.broadcast(queue_id, state)
    return state


@queue_router.post("/call-next/{queue_id}")
async def call_next(queue_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    state = queue_services.call_next(db, queue_id, user)
    await manager.broadcast(queue_id, state)
    return state


@queue_router.post("/skip/{queue_id}")
async def skip_current(queue_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    state = queue_services.skip_current(db, queue_id, user)
    await manager.broadcast(queue_id, state)
    return state


# ── guest action ──────────────────────────────────────────────────────────────

@queue_router.post("/join/{code}")
async def join_queue(code: str, payload: JoinQueueRequest, db: Session = Depends(get_db)):
    result = queue_services.join_queue(db, code, payload.display_name)
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
    state = queue_services.leave_queue(db, entry_id)
    await manager.broadcast(queue_id, state)
    return {"message": "Left queue successfully"}


@queue_router.get("/{_id}")
def get_queue_endpoint(_id: str, db: Session = Depends(get_db)):
    return queue_services.get_queue(db, _id)


@queue_router.delete("/delete-entry/{entry_id}")
async def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    res = delete_queue_entry(db, entry_id)
    state = res["state"]
    queue_id = res["queue_id"]
    await manager.broadcast(queue_id, state)
    return state