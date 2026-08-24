from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog


def sanitize_log_dict(d: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not d or not isinstance(d, dict):
        return d
    return {
        k: ("[REDACTED]" if any(s in k.lower() for s in ["password", "secret", "token", "hash"]) else v)
        for k, v in d.items()
    }


def log_audit_action(
    db: Session,
    actor_id: int,
    action: str,
    target_entity: str,
    target_id: Optional[int] = None,
    old_value: Optional[Dict[str, Any]] = None,
    new_value: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    """
    Ghi vết nhật ký hoạt động hệ thống (BR-10 Server Audit Log).
    Dữ liệu nhật ký là bất biến (Immutable), ghi lại mọi tác động đến dữ liệu nhạy cảm.
    """
    audit_entry = AuditLog(
        actor_id=actor_id,
        action=action,
        target_entity=target_entity,
        target_id=target_id,
        old_value=sanitize_log_dict(old_value),
        new_value=sanitize_log_dict(new_value),
        ip_address=ip_address,
    )
    db.add(audit_entry)
    db.flush()
    return audit_entry
