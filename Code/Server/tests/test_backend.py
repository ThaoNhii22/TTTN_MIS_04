from datetime import datetime, timedelta, timezone
import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Thêm thư mục Server vào sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.core.database import Base, SessionLocal, get_db
from app.main import app
from app.models import Attendance, AuditLog, Registration, Survey, User, Workshop

client = TestClient(app)


def get_auth_token(email: str, password: str = "User@123") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Failed to login with {email}: {res.text}"
    return res.json()["access_token"]


def auth_headers(token: str):
    return {"Authorization": f"Bearer {token}"}


class TestAuthAndUsers:
    def test_uc01_login_success(self):
        token = get_auth_token("admin@workshop.edu.vn", "Admin@123")
        assert token is not None

    def test_uc01_login_wrong_password(self):
        res = client.post("/api/v1/auth/login", json={"email": "admin@workshop.edu.vn", "password": "WrongPassword"})
        assert res.status_code == 401

    def test_uc02_logout(self):
        token = get_auth_token("user@workshop.edu.vn", "User@123")
        res = client.post("/api/v1/auth/logout", headers=auth_headers(token))
        assert res.status_code == 200

    def test_uc14_admin_create_internal_user(self):
        admin_token = get_auth_token("admin@workshop.edu.vn", "Admin@123")
        unique_email = f"test_user_{int(datetime.now().timestamp())}@workshop.edu.vn"
        res = client.post(
            "/api/v1/users",
            headers=auth_headers(admin_token),
            json={
                "full_name": "Test User",
                "email": unique_email,
                "password": "Password@123",
                "role": "participant",
            },
        )
        assert res.status_code == 201
        data = res.json()
        assert data["email"] == unique_email
        assert data["role"] == "participant"

    def test_uc14_update_role_and_audit_log(self):
        admin_token = get_auth_token("admin@workshop.edu.vn", "Admin@123")
        # Find user lan.pt
        users_res = client.get("/api/v1/users", headers=auth_headers(admin_token))
        user_lan = next((u for u in users_res.json() if u["email"] == "lan.pt@workshop.edu.vn"), None)
        assert user_lan is not None

        # Update role to organizer
        res = client.put(
            f"/api/v1/users/{user_lan['user_id']}/role",
            headers=auth_headers(admin_token),
            json={"role": "organizer"},
        )
        assert res.status_code == 200
        assert res.json()["role"] == "organizer"

        # Revert back to participant
        res_revert = client.put(
            f"/api/v1/users/{user_lan['user_id']}/role",
            headers=auth_headers(admin_token),
            json={"role": "participant"},
        )
        assert res_revert.status_code == 200


class TestWorkshopLifecycleAndBR:
    def test_uc03_create_workshop_draft_br07(self):
        org_token = get_auth_token("organizer@workshop.edu.vn", "Organizer@123")
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        res = client.post(
            "/api/v1/workshops",
            headers=auth_headers(org_token),
            json={
                "title": "Workshop Test Draft",
                "description": "Mô tả workshop test",
                "location": "Phòng Lab C",
                "start_at": (now + timedelta(days=5)).isoformat(),
                "end_at": (now + timedelta(days=5, hours=3)).isoformat(),
                "quota": 25,
                "checkin_start_at": (now + timedelta(days=5, minutes=-30)).isoformat(),
                "checkin_end_at": (now + timedelta(days=5, minutes=30)).isoformat(),
            },
        )
        assert res.status_code == 201
        data = res.json()
        assert data["status"] == "draft"  # BR-07: Khởi tạo draft
        assert data["registration_open_at"] is None

        # UC-05: Submit for approval
        ws_id = data["workshop_id"]
        res_submit = client.post(f"/api/v1/workshops/{ws_id}/submit", headers=auth_headers(org_token))
        assert res_submit.status_code == 200
        assert res_submit.json()["status"] == "pending"

        # UC-06: Admin Review (Reject test first)
        admin_token = get_auth_token("admin@workshop.edu.vn", "Admin@123")
        res_reject = client.post(
            f"/api/v1/workshops/{ws_id}/review",
            headers=auth_headers(admin_token),
            json={"action": "reject", "rejection_reason": "Cần bổ sung chi tiết agenda"},
        )
        assert res_reject.status_code == 200
        assert res_reject.json()["status"] == "draft"
        assert res_reject.json()["rejection_reason"] == "Cần bổ sung chi tiết agenda"

        # Resubmit & Approve (BR-06)
        client.post(f"/api/v1/workshops/{ws_id}/submit", headers=auth_headers(org_token))
        res_approve = client.post(
            f"/api/v1/workshops/{ws_id}/review",
            headers=auth_headers(admin_token),
            json={"action": "approve"},
        )
        assert res_approve.status_code == 200
        approved_data = res_approve.json()
        assert approved_data["status"] == "published"
        assert approved_data["registration_open_at"] is not None  # BR-15 gán tự động khi duyệt

    def test_organizer_ownership_check_403(self):
        # Organizer 2 cannot edit Workshop owned by Organizer 1
        org2_token = get_auth_token("organizer2@workshop.edu.vn", "Organizer@123")
        workshops = client.get("/api/v1/workshops").json()
        # Find workshop owned by organizer 1
        ws_org1 = next(w for w in workshops if "UI/UX" in w["title"])

        res = client.put(
            f"/api/v1/workshops/{ws_org1['workshop_id']}",
            headers=auth_headers(org2_token),
            json={"title": "Hack title"},
        )
        assert res.status_code == 403  # 403 Forbidden because not owner!

        # Admin can bypass ownership check
        admin_token = get_auth_token("admin@workshop.edu.vn", "Admin@123")
        res_admin = client.put(
            f"/api/v1/workshops/{ws_org1['workshop_id']}",
            headers=auth_headers(admin_token),
            json={"title": ws_org1["title"]},
        )
        assert res_admin.status_code == 200


class TestRegistrationWaitlistAndCheckin:
    def test_br01_anti_duplicate_registration(self):
        # user@workshop.edu.vn is already confirmed in ws_uiux
        user_token = get_auth_token("user@workshop.edu.vn", "User@123")
        workshops = client.get("/api/v1/workshops").json()
        ws_uiux = next(w for w in workshops if "UI/UX" in w["title"])

        res = client.post(
            "/api/v1/registrations",
            headers=auth_headers(user_token),
            json={"workshop_id": ws_uiux["workshop_id"], "accept_waitlist": True},
        )
        assert res.status_code == 400
        assert "BR-01" in res.json()["detail"] or "đã có lượt đăng ký" in res.json()["detail"]

    def test_br02_br03_waitlist_and_auto_promote(self):
        # Python workshop has quota=2.
        # User 1 & User 2 are confirmed. User 3 & User 4 are in waitlist (position 1, 2).
        # When User 1 cancels, User 3 should be promoted to confirmed, User 4 becomes waitlist position 1.
        db = SessionLocal()
        db.query(User).filter(User.email == "nam.nt@workshop.edu.vn").update({"status": "active"})
        db.commit()
        db.close()

        user1_token = get_auth_token("user@workshop.edu.vn", "User@123")
        my_regs = client.get("/api/v1/registrations/my", headers=auth_headers(user1_token)).json()
        py_reg = next((r for r in my_regs if "Python" in (r.get("workshop_title") or "") and r["status"] == "confirmed"), None)

        if py_reg:
            res_cancel = client.post(
                f"/api/v1/registrations/{py_reg['registration_id']}/cancel",
                headers=auth_headers(user1_token),
                json={"cancel_reason": "Bận việc đột xuất"},
            )
            assert res_cancel.status_code == 200
            assert res_cancel.json()["status"] == "cancelled"

            # Check User 3 (nam.nt) got promoted to confirmed
            user3_token = get_auth_token("nam.nt@workshop.edu.vn", "User@123")
            user3_regs = client.get("/api/v1/registrations/my", headers=auth_headers(user3_token)).json()
            user3_py_reg = next(r for r in user3_regs if "Python" in (r.get("workshop_title") or ""))
            assert user3_py_reg["status"] == "confirmed"  # BR-03 Promoted!

    def test_br09_survey_attended_only(self):
        # User 1 has attended registration for Career workshop -> should be able to view / submit survey
        user1_token = get_auth_token("user@workshop.edu.vn", "User@123")
        my_regs = client.get("/api/v1/registrations/my", headers=auth_headers(user1_token)).json()
        uiux_reg = next(r for r in my_regs if "UI/UX" in (r.get("workshop_title") or ""))

        # UI/UX is not attended yet -> Survey submit must fail with 400 (BR-09)
        res_survey_fail = client.post(
            "/api/v1/surveys",
            headers=auth_headers(user1_token),
            json={
                "registration_id": uiux_reg["registration_id"],
                "rating": 5,
                "answers": {"useful": "yes"},
            },
        )
        assert res_survey_fail.status_code == 400
        assert "BR-09" in res_survey_fail.json()["detail"] or "điểm danh" in res_survey_fail.json()["detail"]


class TestDashboardAndAuditLogs:
    def test_uc18_uc19_dashboard_stats(self):
        admin_token = get_auth_token("admin@workshop.edu.vn", "Admin@123")
        res = client.get("/api/v1/dashboard/stats", headers=auth_headers(admin_token))
        assert res.status_code == 200
        data = res.json()
        assert "total_workshops" in data
        assert "average_fill_rate" in data
        assert "average_attendance_rate" in data
        assert "average_satisfaction_score" in data

    def test_uc20_audit_logs(self):
        admin_token = get_auth_token("admin@workshop.edu.vn", "Admin@123")
        res = client.get("/api/v1/audit-logs", headers=auth_headers(admin_token))
        assert res.status_code == 200
        logs = res.json()
        assert len(logs) > 0
        assert any(l["action"] in ["APPROVE_WORKSHOP", "CREATE_WORKSHOP", "CREATE_USER", "UPDATE_ROLE"] for l in logs)
