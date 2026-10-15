from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models import Queue, QueueEntry
from app.models import User
import random

from app.models.enums import EntryStatus, QueueStatus

from app.dependencies.auth import create_guest_token


# each function of these that needs to access the database,
# should be given a database session as a param


def generate_unique_code(db: Session, length: int = 6) -> str:
    while True:
        code = ''.join([str(random.randint(0, 9)) for _ in range(length)])
        if not db.query(Queue).filter(Queue.code == code).first():
            return code

def get_user_queues(user: User, db: Session):
    queues = db.query(Queue).filter(Queue.admin_id == user.id).all()
    return { "status": 200,
             "queues": [
                {"id": q.id, "name": q.name, "status": q.status}
                for q in queues
                ]
            }


# service


# ── helpers ──────────────────────────────────────────────────────────────────

def _get_queue_or_404(db: Session, queue_id: int) -> Queue:
    queue = db.query(Queue).filter(Queue.id == queue_id).first()
    if queue is None:
        raise HTTPException(status_code=404, detail="Queue not found")
    return queue

def _assert_admin(queue: Queue, user: User):
    if queue.admin_id != user.id:
        raise HTTPException(status_code=403, detail="Not your queue")

def get_queue(db: Session, queue_id: int) -> dict:
    queue = _get_queue_or_404(db, queue_id)
    return {
        "id": queue.id,
        "name": queue.name,
        "code": queue.code,
        "description": queue.description,
        "status": queue.status,
        "avg_serve_time": queue.avg_serve_time,
    }

# ── state snapshot (what gets broadcast over WS) ──────────────────────────────

def get_queue_state(db: Session, queue_id: int) -> dict:
    queue = _get_queue_or_404(db, queue_id)
    entries = (
        db.query(QueueEntry)
        .filter(QueueEntry.queue_id == queue_id)
        .order_by(QueueEntry.join_number)
        .all()
    )
    waiting = [e for e in entries if e.status == EntryStatus.WAITING]
    return {
        "queue": {
            "id": queue.id,
            "name": queue.name,
            "code": queue.code,
            "description": queue.description,
            "status": queue.status,
            "avg_serve_time": queue.avg_serve_time,
        },
        "entries": [
            {
                "id": e.id,
                "display_name": e.display_name,
                "status": e.status,
                "join_number": e.join_number,
                "joined_at": e.joined_at.isoformat(),
                "called_at": e.called_at.isoformat() if e.called_at else None,
            }
            for e in entries
        ],
        "stats": {
            "waiting_count": len(waiting),
            "served_count": sum(1 for e in entries if e.status == EntryStatus.SERVED),
            "skipped_count": sum(1 for e in entries if e.status in (EntryStatus.SKIPPED, EntryStatus.LEFT)),
            "estimated_wait": len(waiting) * queue.avg_serve_time,  # seconds
        }
    }

# ── admin actions ─────────────────────────────────────────────────────────────

def create_queue(db: Session, user: User, queue_name: str, description: str | None,
                 avg_serve_time: int,
                 scheduled_open_at: datetime | None,
                 scheduled_close_at: datetime | None):
    code = generate_unique_code(db)

    new_queue = Queue(
        code=code,
        name=queue_name,
        description=description,
        admin_id=user.id,
        avg_serve_time=avg_serve_time,
        scheduled_open_at=scheduled_open_at,
        scheduled_close_at=scheduled_close_at,
    )

    db.add(new_queue)
    db.commit()
    db.refresh(new_queue)
    return {"id": new_queue.id, "code": new_queue.code, "name": new_queue.name, "status": new_queue.status }

def delete_queue(user: User, db: Session, queue_id: int):
    queue = db.query(Queue).filter(Queue.id == queue_id, Queue.admin_id == user.id).first()
    if queue is None:
        raise HTTPException(status_code=404, detail="Queue not found")
    db.delete(queue)
    db.commit()
    return {"status": 200, "message": "Queue deleted"}

def open_queue(db: Session, queue_id: int, user: User) -> dict:
    queue = _get_queue_or_404(db, queue_id)
    _assert_admin(queue, user)
    if queue.status == QueueStatus.OPEN:
        raise HTTPException(status_code=400, detail="Queue is already open")
    queue.status = QueueStatus.OPEN
    db.commit()
    return get_queue_state(db, queue_id)

def close_queue(db: Session, queue_id: int, user: User) -> dict:
    queue = _get_queue_or_404(db, queue_id)
    _assert_admin(queue, user)
    if queue.status == QueueStatus.CLOSED:
        raise HTTPException(status_code=400, detail="Queue is already closed")
    queue.status = QueueStatus.CLOSED
    db.commit()
    return get_queue_state(db, queue_id)

# in queue actions

def call_next(db: Session, queue_id: int, user: User) -> dict:
    queue = _get_queue_or_404(db, queue_id)
    _assert_admin(queue, user)
    if queue.status not in (QueueStatus.OPEN, QueueStatus.CLOSED):
        raise HTTPException(status_code=400, detail="Queue is not active")

    # set currently CALLED entry to SERVED and calculate duration
    current_called = (
        db.query(QueueEntry)
        .filter(QueueEntry.queue_id == queue_id, QueueEntry.status == EntryStatus.CALLED)
        .first()
    )
    if current_called:
        current_called.status = EntryStatus.SERVED
        current_called.served_at = datetime.now(timezone.utc)
        if current_called.called_at:
            called_at = current_called.called_at
            if called_at.tzinfo is None:
                called_at = called_at.replace(tzinfo=timezone.utc)
            served_at = current_called.served_at
            if served_at.tzinfo is None:
                served_at = served_at.replace(tzinfo=timezone.utc)
            duration = int((served_at - called_at).total_seconds())
            if duration > 0:
                # Dynamic rolling average: blend 70% current baseline + 30% observed duration
                queue.avg_serve_time = max(10, int(0.7 * queue.avg_serve_time + 0.3 * duration))

    next_entry = (
        db.query(QueueEntry)
        .filter(QueueEntry.queue_id == queue_id, QueueEntry.status == EntryStatus.WAITING)
        .order_by(QueueEntry.join_number)
        .first()
    )
    if next_entry is None:
        db.commit()
        if current_called:
            return get_queue_state(db, queue_id)
        raise HTTPException(status_code=404, detail="No waiting entries")

    next_entry.status = EntryStatus.CALLED
    next_entry.called_at = datetime.now(timezone.utc)
    db.commit()
    return get_queue_state(db, queue_id)

def recall_current(db: Session, queue_id: int, user: User) -> dict:
    queue = _get_queue_or_404(db, queue_id)
    _assert_admin(queue, user)
    current_called = (
        db.query(QueueEntry)
        .filter(QueueEntry.queue_id == queue_id, QueueEntry.status == EntryStatus.CALLED)
        .first()
    )
    if current_called is None:
        raise HTTPException(status_code=404, detail="No entry is currently called")
    current_called.called_at = datetime.now(timezone.utc)
    db.commit()
    return get_queue_state(db, queue_id)

def skip_current(db: Session, queue_id: int, user: User) -> dict:
    queue = _get_queue_or_404(db, queue_id)
    _assert_admin(queue, user)

    current_called = (
        db.query(QueueEntry)
        .filter(QueueEntry.queue_id == queue_id, QueueEntry.status == EntryStatus.CALLED)
        .first()
    )
    if current_called is None:
        raise HTTPException(status_code=404, detail="No entry is currently called")

    # soft update status instead of deleting
    current_called.status = EntryStatus.SKIPPED
    current_called.served_at = datetime.now(timezone.utc)
    db.commit()
    return get_queue_state(db, queue_id)

# ── guest action ──────────────────────────────────────────────────────────────

def join_queue(db: Session, code: str, display_name: str) -> dict:
    # lock the queue row so concurrent joins can't read the same last join_number
    queue = db.query(Queue).filter(Queue.code == code).with_for_update().first()
    if queue is None:
        raise HTTPException(status_code=404, detail="Queue not found")
    if queue.status != QueueStatus.OPEN:
        raise HTTPException(status_code=400, detail="Queue is not open")

    last = (
        db.query(QueueEntry)
        .filter(QueueEntry.queue_id == queue.id)
        .order_by(QueueEntry.join_number.desc())
        .first()
    )
    join_number = (last.join_number + 1) if last else 1

    entry = QueueEntry(
        queue_id=queue.id,
        display_name=display_name,
        status=EntryStatus.WAITING,
        join_number=join_number,
        joined_at=datetime.now(timezone.utc),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    # issue guest JWT
    token = create_guest_token(entry.id, queue.id, entry.join_number)

    return {
        "guest_token": token,
        "queue_id": queue.id,
        "entry_id": entry.id,
        "join_number": entry.join_number,
        "state": get_queue_state(db, queue.id)
    }

def leave_queue(db: Session, entry_id: int) -> dict:
    entry = db.query(QueueEntry).filter(QueueEntry.id == entry_id).first()
    if entry is None:
        raise HTTPException(status_code=404, detail="Entry not found")
    queue_id = entry.queue_id
    if entry.status in (EntryStatus.WAITING, EntryStatus.CALLED):
        entry.status = EntryStatus.LEFT
        entry.served_at = datetime.now(timezone.utc)
        db.commit()
    return get_queue_state(db, queue_id)

def delete_queue_entry(db: Session, entry_id: int, user: User | None = None) -> dict:
    """Mark an active entry as SKIPPED. With a user, only the queue's admin may do it;
    without one (expired guest token cleanup) a missing entry is a no-op."""
    entry = db.query(QueueEntry).filter(QueueEntry.id == entry_id).first()
    if entry is None:
        if user is not None:
            raise HTTPException(status_code=404, detail="Entry not found")
        return {"state": {}, "queue_id": 0}
    queue_id = entry.queue_id
    if user is not None:
        _assert_admin(entry.queue, user)
    # served/left/skipped entries are history; don't rewrite them
    if entry.status in (EntryStatus.WAITING, EntryStatus.CALLED):
        entry.status = EntryStatus.SKIPPED
        entry.served_at = datetime.now(timezone.utc)
        db.commit()
    return {"state": get_queue_state(db, queue_id), "queue_id": queue_id}
