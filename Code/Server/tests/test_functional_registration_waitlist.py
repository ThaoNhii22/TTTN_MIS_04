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
        "participant_1": get_token("user@workshop.edu.vn", "User@123"),
        "participant_2": get_token("hoai.td@workshop.edu.vn", "User@123"),
        "participant_3": get_token("nam.nt@workshop.edu.vn", "User@123"),
        "participant_4": get_token("lan.pt@workshop.edu.vn", "User@123"),
    }


def create_test_workshop(quota: int = 1, hours_until_start: int = 48) -> int:
    """Helper tạo workshop biệt lập phục vụ kiểm thử functional test"""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    db = SessionLocal()
    ws = Workshop(
        organizer_id=2,
        title=f"Functional Test Workshop {uuid.uuid4().hex[:8]}",
        description="Workshop kiểm thử chức năng Đăng ký, Hủy và Auto-promotion",
        location="Lab Test A1",
        start_at=now + timedelta(hours=hours_until_start),
        end_at=now + timedelta(hours=hours_until_start + 3),
        registration_open_at=now - timedelta(days=1),
        registration_close_at=now + timedelta(hours=hours_until_start - 2),
        quota=quota,
        checkin_code=f"WS-FUNC-{uuid.uuid4().hex[:6]}",
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


class TestFunctionalRegistration:
    """1. Kiểm thử chức năng Đăng ký"""

    def test_registration_success_within_quota(self, tokens):
        ws_id = create_test_workshop(quota=2)

        # Participant 1 đăng ký khi còn slot
        res = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_1"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        assert res.status_code == 201
        data = res.json()
        assert data["workshop_id"] == ws_id
        assert data["status"] == "confirmed"
        assert data["confirmed_at"] is not None
        assert data["waitlist_position"] is None

    def test_registration_joins_waitlist_when_quota_full(self, tokens):
        # Workshop có quota = 1
        ws_id = create_test_workshop(quota=1)

        # Participant 1 chiếm slot confirmed
        res1 = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_1"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        assert res1.status_code == 201
        assert res1.json()["status"] == "confirmed"

        # Participant 2 đăng ký khi đã full slot -> vào Waitlist position 1 (BR-02)
        res2 = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_2"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        assert res2.status_code == 201
        data2 = res2.json()
        assert data2["status"] == "waitlist"
        assert data2["waitlist_position"] == 1
        assert data2["confirmed_at"] is None

        # Participant 3 đăng ký tiếp theo -> vào Waitlist position 2 (FIFO)
        res3 = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_3"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        assert res3.status_code == 201
        data3 = res3.json()
        assert data3["status"] == "waitlist"
        assert data3["waitlist_position"] == 2


class TestFunctionalCancellation:
    """2. Kiểm thử chức năng Hủy đăng ký"""

    def test_cancel_confirmed_registration_success(self, tokens):
        ws_id = create_test_workshop(quota=5, hours_until_start=48)

        # Đăng ký vé
        res_reg = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_1"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        reg_id = res_reg.json()["registration_id"]

        # Hủy vé trước hạn 24h
        res_cancel = client.post(
            f"/api/v1/registrations/{reg_id}/cancel",
            headers=auth_header(tokens["participant_1"]),
            json={"cancel_reason": "Bận lịch công tác đột xuất"},
        )
        assert res_cancel.status_code == 200
        data = res_cancel.json()
        assert data["status"] == "cancelled"
        assert data["cancel_reason"] == "Bận lịch công tác đột xuất"
        assert data["cancelled_at"] is not None

    def test_cancel_waitlist_registration_reindexes_queue(self, tokens):
        # Workshop quota = 1, User 1 confirmed, User 2 (pos 1), User 3 (pos 2)
        ws_id = create_test_workshop(quota=1)

        client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_1"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        res2 = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_2"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        reg2_id = res2.json()["registration_id"]

        res3 = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_3"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        reg3_id = res3.json()["registration_id"]

        # User 2 hủy khỏi Waitlist
        res_cancel = client.post(
            f"/api/v1/registrations/{reg2_id}/cancel",
            headers=auth_header(tokens["participant_2"]),
            json={"cancel_reason": "Không muốn chờ nữa"},
        )
        assert res_cancel.status_code == 200
        assert res_cancel.json()["status"] == "cancelled"

        # Kiểm tra User 3 được re-index từ position 2 lên position 1
        db = SessionLocal()
        reg3 = db.query(Registration).filter(Registration.registration_id == reg3_id).first()
        assert reg3 is not None
        assert reg3.waitlist_position == 1
        assert reg3.status == "waitlist"
        db.close()


class TestFunctionalAutoPromotion:
    """3. Kiểm thử chức năng Auto-Promotion"""

    def test_auto_promote_on_confirmed_user_cancellation(self, tokens):
        # Workshop quota = 1.
        # User 1 confirmed, User 2 waitlist #1, User 3 waitlist #2
        ws_id = create_test_workshop(quota=1, hours_until_start=50)

        res1 = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_1"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        reg1_id = res1.json()["registration_id"]

        res2 = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_2"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        reg2_id = res2.json()["registration_id"]

        res3 = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_3"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        reg3_id = res3.json()["registration_id"]

        # User 1 hủy vé -> User 2 tự động được đôn lên Confirmed, User 3 lên pos 1
        res_cancel = client.post(
            f"/api/v1/registrations/{reg1_id}/cancel",
            headers=auth_header(tokens["participant_1"]),
            json={"cancel_reason": "Không thể tham gia"},
        )
        assert res_cancel.status_code == 200
        assert res_cancel.json()["status"] == "cancelled"

        db = SessionLocal()
        reg2 = db.query(Registration).filter(Registration.registration_id == reg2_id).first()
        reg3 = db.query(Registration).filter(Registration.registration_id == reg3_id).first()
        assert reg2 is not None
        assert reg3 is not None

        # User 2 BR-03 Promoted!
        assert reg2.status == "confirmed"
        assert reg2.waitlist_position is None
        assert reg2.confirmed_at is not None

        # User 3 được chuyển thành vị trí số 1 trong Waitlist
        assert reg3.status == "waitlist"
        assert reg3.waitlist_position == 1
        db.close()

    def test_auto_promote_on_quota_increase(self, tokens):
        # Workshop quota = 1 ban đầu
        ws_id = create_test_workshop(quota=1, hours_until_start=60)

        # User 1: confirmed
        client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_1"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        # User 2: waitlist #1
        res2 = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_2"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        reg2_id = res2.json()["registration_id"]

        # User 3: waitlist #2
        res3 = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_3"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        reg3_id = res3.json()["registration_id"]

        # Organizer tăng quota từ 1 lên 3 -> Cả User 2 và User 3 đều được đôn lên Confirmed (BR-03, BR-12)
        res_update = client.put(
            f"/api/v1/workshops/{ws_id}",
            headers=auth_header(tokens["organizer"]),
            json={"quota": 3},
        )
        assert res_update.status_code == 200
        assert res_update.json()["quota"] == 3

        db = SessionLocal()
        reg2 = db.query(Registration).filter(Registration.registration_id == reg2_id).first()
        reg3 = db.query(Registration).filter(Registration.registration_id == reg3_id).first()
        assert reg2 is not None
        assert reg3 is not None

        assert reg2.status == "confirmed"
        assert reg2.waitlist_position is None
        assert reg3.status == "confirmed"
        assert reg3.waitlist_position is None
        db.close()
