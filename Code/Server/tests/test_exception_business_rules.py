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


def get_token(email: str, password: str = "User@123") -> str:
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
        "organizer2": get_token("organizer2@workshop.edu.vn", "Organizer@123"),
        "participant_1": get_token("user@workshop.edu.vn", "User@123"),
        "participant_2": get_token("lan.pt@workshop.edu.vn", "User@123"),
    }


def create_published_workshop(quota: int = 1, hours_until_start: int = 48) -> int:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    db = SessionLocal()
    ws = Workshop(
        organizer_id=2,
        title=f"Exception Test Workshop {uuid.uuid4().hex[:8]}",
        description="Workshop kiểm thử các ngoại lệ và ràng buộc nghiệp vụ",
        location="Lab Test B2",
        start_at=now + timedelta(hours=hours_until_start),
        end_at=now + timedelta(hours=hours_until_start + 3),
        registration_open_at=now - timedelta(days=1),
        registration_close_at=now + timedelta(hours=hours_until_start - 2),
        quota=quota,
        checkin_code=f"WS-EX-{uuid.uuid4().hex[:6]}",
        checkin_start_at=now + timedelta(hours=hours_until_start, minutes=-30),
        checkin_end_at=now + timedelta(hours=hours_until_start, minutes=30),
        status="published",
    )
    db.add(ws)
    db.commit()
    db.refresh(ws)
    ws_id = int(getattr(ws, "workshop_id"))
    db.close()
    return ws_id


class TestDuplicateRegistrationException:
    """Kiểm thử ngoại lệ Đăng ký trùng lặp"""

    def test_duplicate_registration_when_confirmed_fails_400(self, tokens):
        ws_id = create_published_workshop(quota=5)

        # Đăng ký lần 1: Thành công
        res1 = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_1"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        assert res1.status_code == 201

        # Đăng ký lần 2: Thất bại với mã lỗi 400 (BR-01)
        res2 = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_1"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        assert res2.status_code == 400
        detail = res2.json()["detail"].lower()
        assert "br-01" in detail or "đã có lượt đăng ký" in detail or "trùng" in detail

    def test_duplicate_registration_when_in_waitlist_fails_400(self, tokens):
        ws_id = create_published_workshop(quota=1)

        # Participant 1 confirmed
        client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_1"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        # Participant 2 vào waitlist
        res2 = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_2"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        assert res2.status_code == 201
        assert res2.json()["status"] == "waitlist"

        # Participant 2 đăng ký lại khi đang ở waitlist -> Bị chặn (BR-01)
        res3 = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_2"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        assert res3.status_code == 400
        detail = res3.json()["detail"].lower()
        assert "br-01" in detail or "đã có lượt đăng ký" in detail or "trùng" in detail


class TestQuotaOverflowException:
    """Kiểm thử ngoại lệ Vượt Quota không chấp nhận Waitlist"""

    def test_register_full_quota_without_accepting_waitlist_fails_400(self, tokens):
        ws_id = create_published_workshop(quota=1)

        # Participant 1 chiếm chỗ cuối cùng
        res1 = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_1"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        assert res1.status_code == 201

        # Participant 2 cố tình gửi accept_waitlist=False khi Workshop đã full chỗ
        res2 = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_2"]),
            json={"workshop_id": ws_id, "accept_waitlist": False},
        )
        assert res2.status_code == 400
        detail = res2.json()["detail"].lower()
        assert "hết chỗ" in detail or "br-02" in detail


class TestAuthenticationAndRoleExceptions:
    """Kiểm thử ngoại lệ Thiếu/Sai Token & Sai Role/Quyền hạn"""

    def test_no_token_returns_401(self):
        res = client.get("/api/v1/registrations/my")
        assert res.status_code == 401

    def test_invalid_token_returns_401(self):
        res = client.get("/api/v1/registrations/my", headers={"Authorization": "Bearer invalid_token_xyz"})
        assert res.status_code == 401

    def test_participant_cannot_access_admin_api(self, tokens):
        # Participant gọi Audit Logs -> 403 Forbidden
        res_audit = client.get("/api/v1/audit-logs", headers=auth_header(tokens["participant_1"]))
        assert res_audit.status_code == 403

        # Participant gọi API lấy danh sách User -> 403 Forbidden
        res_users = client.get("/api/v1/users", headers=auth_header(tokens["participant_1"]))
        assert res_users.status_code == 403

    def test_participant_cannot_review_workshop(self, tokens):
        ws_id = create_published_workshop(quota=10)
        res = client.post(
            f"/api/v1/workshops/{ws_id}/review",
            headers=auth_header(tokens["participant_1"]),
            json={"action": "approve"},
        )
        assert res.status_code == 403

    def test_organizer_cannot_approve_workshop(self, tokens):
        ws_id = create_published_workshop(quota=10)
        res = client.post(
            f"/api/v1/workshops/{ws_id}/review",
            headers=auth_header(tokens["organizer"]),
            json={"action": "approve"},
        )
        assert res.status_code == 403

    def test_organizer_cannot_modify_other_organizers_workshop(self, tokens):
        # Workshop thuộc về organizer 1 (user_id 2)
        ws_id = create_published_workshop(quota=10)

        # Organizer 2 cố tình sửa Workshop của Organizer 1
        res = client.put(
            f"/api/v1/workshops/{ws_id}",
            headers=auth_header(tokens["organizer2"]),
            json={"title": "Hacked Title By Organizer 2"},
        )
        assert res.status_code == 403

    def test_participant_cannot_cancel_other_participants_ticket(self, tokens):
        ws_id = create_published_workshop(quota=10)

        # Participant 1 đăng ký vé
        res_reg = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_1"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        reg_id = res_reg.json()["registration_id"]

        # Participant 2 cố tình hủy vé của Participant 1
        res_cancel = client.post(
            f"/api/v1/registrations/{reg_id}/cancel",
            headers=auth_header(tokens["participant_2"]),
            json={"cancel_reason": "Hủy trộm"},
        )
        assert res_cancel.status_code == 403


class TestBusinessRuleViolations:
    """Kiểm thử các vi phạm Business Rule khác"""

    def test_br11_cancel_after_24h_cutoff_fails_400(self, tokens):
        # Workshop bắt đầu sau 12 giờ (< 24 giờ cutoff)
        ws_id = create_published_workshop(quota=10, hours_until_start=12)

        res_reg = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_1"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        reg_id = res_reg.json()["registration_id"]

        # Participant hủy khi cách giờ bắt đầu < 24h -> Thất bại (BR-11)
        res_cancel = client.post(
            f"/api/v1/registrations/{reg_id}/cancel",
            headers=auth_header(tokens["participant_1"]),
            json={"cancel_reason": "Bận đột xuất"},
        )
        assert res_cancel.status_code == 400
        detail = res_cancel.json()["detail"].lower()
        assert "hạn chót" in detail or "24" in detail or "br-11" in detail

        # Tuy nhiên Admin có quyền hủy hỗ trợ người dùng ngay cả khi quá hạn
        res_admin_cancel = client.post(
            f"/api/v1/registrations/{reg_id}/cancel",
            headers=auth_header(tokens["admin"]),
            json={"cancel_reason": "Admin hỗ trợ hủy đặc biệt"},
        )
        assert res_admin_cancel.status_code == 200
        assert res_admin_cancel.json()["status"] == "cancelled"

    def test_br08_register_draft_or_pending_workshop_fails_400(self, tokens):
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        db = SessionLocal()
        ws_draft = Workshop(
            organizer_id=2,
            title=f"Draft Workshop {uuid.uuid4().hex[:6]}",
            start_at=now + timedelta(days=5),
            end_at=now + timedelta(days=5, hours=3),
            quota=20,
            checkin_code=f"WS-DRAFT-{uuid.uuid4().hex[:6]}",
            checkin_start_at=now + timedelta(days=5, minutes=-30),
            checkin_end_at=now + timedelta(days=5, minutes=30),
            status="draft",  # Chưa công bố
        )
        db.add(ws_draft)
        db.commit()
        db.refresh(ws_draft)
        draft_id = ws_draft.workshop_id
        db.close()

        res = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_1"]),
            json={"workshop_id": draft_id, "accept_waitlist": True},
        )
        assert res.status_code == 400
        detail = res.json()["detail"].lower()
        assert "draft" in detail or "chưa mở" in detail or "br-08" in detail

    def test_br09_submit_survey_when_not_attended_fails_400(self, tokens):
        ws_id = create_published_workshop(quota=10)

        res_reg = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_1"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        reg_id = res_reg.json()["registration_id"]

        # Vé mới confirmed, chưa điểm danh attended -> gửi survey thất bại (BR-09)
        res_survey = client.post(
            "/api/v1/surveys",
            headers=auth_header(tokens["participant_1"]),
            json={
                "registration_id": reg_id,
                "rating": 5,
                "answers": {"feedback": "Hay"},
            },
        )
        assert res_survey.status_code == 400
        detail = res_survey.json()["detail"].lower()
        assert "điểm danh" in detail or "br-09" in detail

    def test_br12_reduce_quota_below_confirmed_count_fails_400(self, tokens):
        ws_id = create_published_workshop(quota=5)

        # 2 người đăng ký confirmed
        client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_1"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_2"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )

        # Organizer cố tình giảm quota xuống 1 (< 2 vé đã confirmed) -> Thất bại (BR-12)
        res_reduce = client.put(
            f"/api/v1/workshops/{ws_id}",
            headers=auth_header(tokens["organizer"]),
            json={"quota": 1},
        )
        assert res_reduce.status_code == 400
        detail = res_reduce.json()["detail"].lower()
        assert "không thể giảm" in detail or "br-12" in detail or "quota" in detail
