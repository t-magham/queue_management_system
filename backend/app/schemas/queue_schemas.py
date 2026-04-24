from typing import List
from pydantic import BaseModel
from app.models.queue import Queue
from datetime import datetime
from typing import Optional
# Models
class CreateQueueResponse(BaseModel):
    id: int
    code: str
    name: str
    status: str

class DeleteQueueRequest(BaseModel):
    queue_id: int

class JoinQueueRequest(BaseModel):
    display_name: str

class QueueResponse(BaseModel):
    id: int
    name: str
    status: str

    class Config:
        from_attributes = True  # allows reading from SQLAlchemy objects
class CreateQueueRequest(BaseModel):
    queue_name: str
    description: Optional[str] = None
    avg_serve_time: int                              # seconds (frontend sends minutes * 60)
    scheduled_open_at:  Optional[datetime] = None
    scheduled_close_at: Optional[datetime] = None

    # @field_validator('avg_serve_time')
    # @classmethod
    # def must_be_positive(cls, v):
    #     if v < 1:
    #         raise ValueError('avg_serve_time must be a positive integer')
    #     return v

class GetQueueResponse(BaseModel):
    id: str
    name: str
    users: List[str]
    status: str
