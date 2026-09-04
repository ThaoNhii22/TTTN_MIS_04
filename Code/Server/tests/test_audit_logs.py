from datetime import datetime, timedelta, timezone
import os
import sys
import uuid
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.core.database import SessionLocal
from app.models.workshop import Workshop
from app.models.registration import Registration
from app.models.user import User

client = TestClient(app)


def get_token(email: str, password: str) -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


def auth_header(token: str):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def tokens():
    return {
        "admin": get_token("admin@workshop.edu.vn", "Admin@123"),
        "organizer": get_token("organizer@workshop.edu.vn", "Organizer@123"),
        "participant": get_token("user@workshop.edu.vn", "User@123"),
    }


class TestAuditLogTask25And26:
    """
    BỘ KIỂM THỬ AUDIT LOG CHO TASK 25 (AUDIT LOG MIDDLEWARE) VÀ TASK 26 (KIỂM TRA AUDIT LOG)
    """

    def test_audit_log_structure_and_integrity(self, tokens):
        """
        Task 26: Kiểm tra Audit Log được ghi nhận đầy đủ Actor, Action, Object, Timestamp và thông tin liên quan.
        """
        res = client.get("/api/v1/audit-logs?limit=50", headers=auth_header(tokens["admin"]))
        assert res.status_code == 200
        logs = res.json()
        assert len(logs) > 0

        # Kiểm tra tính toàn vẹn của cấu trúc mỗi bản ghi Audit Log
        for log in logs:
            assert "audit_log_id" in log
            assert "actor_id" in log
            assert "action" in log
            assert "target_entity" in log
            assert "timestamp" in log
            assert "ip_address" in log
            assert "old_value" in log
            assert "new_value" in log

    def test_audit_log_on_workshop_approval_and_quota_change(self, tokens):
        """
        Task 25: Tự động ghi log khi duyệt Workshop và thay đổi Quota.
        """
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        # 1. Tạo workshop draft
        res_create = client.post(
            "/api/v1/workshops",
            headers=auth_header(tokens["organizer"]),
            json={
                "title": f"Workshop Audit Test {uuid.uuid4().hex[:6]}",
                "start_at": (now + timedelta(days=7)).isoformat(),
                "end_at": (now + timedelta(days=7, hours=2)).isoformat(),
                "quota": 10,
                "checkin_start_at": (now + timedelta(days=7, minutes=-30)).isoformat(),
                "checkin_end_at": (now + timedelta(days=7, minutes=30)).isoformat(),
            },
        )
        assert res_create.status_code == 201
        ws_id = res_create.json()["workshop_id"]

        # 2. Gửi duyệt
        client.post(f"/api/v1/workshops/{ws_id}/submit", headers=auth_header(tokens["organizer"]))

        # 3. Admin phê duyệt
        client.post(f"/api/v1/workshops/{ws_id}/review", headers=auth_header(tokens["admin"]), json={"action": "approve"})

        # 4. Thay đổi Quota
        client.put(f"/api/v1/workshops/{ws_id}", headers=auth_header(tokens["organizer"]), json={"quota": 20})

        # 5. Kiểm tra Audit Log ghi lại APPROVE_WORKSHOP và UPDATE_QUOTA
        logs_res = client.get(f"/api/v1/audit-logs?target_entity=Workshops&limit=50", headers=auth_header(tokens["admin"]))
        assert logs_res.status_code == 200
        logs = logs_res.json()

        approve_log = next((l for l in logs if l["action"] == "APPROVE_WORKSHOP" and l["target_id"] == ws_id), None)
        assert approve_log is not None
        assert approve_log["new_value"]["status"] == "published"

        quota_log = next((l for l in logs if l["action"] == "UPDATE_QUOTA" and l["target_id"] == ws_id), None)
        assert quota_log is not None
        assert quota_log["old_value"]["quota"] == 10
        assert quota_log["new_value"]["quota"] == 20

    def test_audit_log_sensitive_data_redacted(self, tokens):
        """
        Task 25: Không ghi password/hash hoặc dữ liệu nhạy cảm vào nhật ký.
        """
        unique_email = f"audit_user_{uuid.uuid4().hex[:6]}@workshop.edu.vn"
        res_user = client.post(
            "/api/v1/users",
            headers=auth_header(tokens["admin"]),
            json={
                "full_name": "Audit Security User",
                "email": unique_email,
                "password": "SuperSecretPassword123!",
                "role": "participant",
            },
        )
        assert res_user.status_code == 201

        # Lấy audit logs
        logs = client.get("/api/v1/audit-logs?target_entity=Users&limit=10", headers=auth_header(tokens["admin"])).json()
        create_user_log = next((l for l in logs if l["action"] == "CREATE_USER" and l.get("new_value", {}).get("email") == unique_email), None)
        assert create_user_log is not None

        # Đảm bảo không chứa plain password trong log
        new_val_str = str(create_user_log["new_value"])
        assert "SuperSecretPassword123!" not in new_val_str

    def test_audit_log_rbac_forbidden_for_participant(self, tokens):
        """
        Task 26: Đảm bảo chỉ Admin mới có quyền truy cập nhật ký Audit Log.
        """
        res_part = client.get("/api/v1/audit-logs", headers=auth_header(tokens["participant"]))
        assert res_part.status_code == 403

        res_org = client.get("/api/v1/audit-logs", headers=auth_header(tokens["organizer"]))
        assert res_org.status_code == 403
