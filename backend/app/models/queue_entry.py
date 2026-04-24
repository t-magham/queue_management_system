from __future__ import annotations
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, Integer, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from app.models.enums import EntryStatus

class QueueEntry(Base):
    __tablename__ = "queue_entries"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)

    queue_id: Mapped[int] = mapped_column(
        ForeignKey("queues.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    display_name: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[EntryStatus] = mapped_column(nullable=False, default=EntryStatus.WAITING)
    join_number: Mapped[int] = mapped_column(Integer, nullable=False)

    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)  # stored fact, never derive
    called_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    served_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    queue = relationship("Queue", back_populates="entries")
# Composite index: fetching waiting entries for a queue, ordered by join_number
# ix = index, queue_entries = table, queue_status = what it covers
Index("ix_queue_entries_queue_status", QueueEntry.queue_id, QueueEntry.status, QueueEntry.join_number)
