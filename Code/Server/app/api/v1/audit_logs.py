from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.audit_log import AuditLog
from app.schemas.audit_log import AuditLogResponse

router = APIRouter(prefix="/audit-logs", tags=["Nhật ký Hoạt động (Audit Logs)"])


@router.get(
    "",
    response_model=List[AuditLogResponse],
    summary="UC-20: Xem nhật ký hoạt động hệ thống (Admin)",
    dependencies=[Depends(require_roles(["admin"]))],
)
def list_audit_logs(
    action: Optional[str] = Query(None, description="Lọc theo hành động (ví dụ: APPROVE_WORKSHOP, CANCEL_BY_ORGANIZER, FORCE_CANCEL_BY_ADMIN, UPDATE_ROLE...)"),
    target_entity: Optional[str] = Query(None, description="Lọc theo Entity (Workshops, Users, Registrations...)"),
    actor_id: Optional[int] = Query(None, description="Lọc theo ID người thực hiện"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    Use Case 20: Quản trị viên theo dõi các hoạt động quan trọng trong hệ thống.
    Dữ liệu là chỉ đọc (Read-only / Immutable - BR-10).
    """
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action)
    if target_entity:
        query = query.filter(AuditLog.target_entity == target_entity)
    if actor_id:
        query = query.filter(AuditLog.actor_id == actor_id)

    logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).all()

    results = []
    for log in logs:
        actor_name = log.actor.full_name if log.actor else None
        actor_email = log.actor.email if log.actor else None
        results.append({
            "audit_log_id": log.audit_log_id,
            "actor_id": log.actor_id,
            "actor_name": actor_name,
            "actor_email": actor_email,
            "action": log.action,
            "target_entity": log.target_entity,
            "target_id": log.target_id,
            "old_value": log.old_value,
            "new_value": log.new_value,
            "timestamp": log.timestamp,
            "ip_address": log.ip_address,
        })
    return results
