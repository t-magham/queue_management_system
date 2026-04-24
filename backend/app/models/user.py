from __future__ import annotations
from app.models.base import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String
class User(Base):
    __tablename__ = "users"

    # attributes of the table
    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    # name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique= True, index= True, nullable=False)
    # store a hash of the password
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    # one user can own and manages multiple queues
    queues = relationship("Queue", back_populates="admin", cascade="all, delete-orphan")