from enum import Enum

class QueueStatus(str, Enum):
    SCHEDULED = "scheduled"
    OPEN = "open"
    CLOSED = "closed"
class EntryStatus(str, Enum):
    WAITING = "waiting"
    SERVED = "served"
    CALLED = "called"
    SKIPPED = "skipped"