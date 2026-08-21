from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    audit_log_id: int
    actor_id: int
    actor_name: Optional[str] = None
    actor_email: Optional[str] = None
    action: str
    target_entity: str
    target_id: Optional[int] = None
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    timestamp: datetime
    ip_address: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
