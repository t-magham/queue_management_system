from __future__ import annotations
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime
from app.models.base import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.enums import QueueStatus

class Queue(Base):
    __tablename__ = "queues"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(16), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    status: Mapped[QueueStatus] = mapped_column(nullable=False, default=QueueStatus.CLOSED)

    avg_serve_time: Mapped[int] = mapped_column(Integer, nullable=False)  # seconds, owner-set, auto-updated from history

    scheduled_open_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    scheduled_close_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    admin_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    admin = relationship("User", back_populates="queues")
    entries = relationship("QueueEntry", back_populates="queue", cascade="all, delete-orphan")
