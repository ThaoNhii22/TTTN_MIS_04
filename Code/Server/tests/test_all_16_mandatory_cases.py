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
from app.models.attendance import Attendance
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
        "participant_a": get_token("user@workshop.edu.vn", "User@123"),
        "participant_b": get_token("lan.pt@workshop.edu.vn", "User@123"),
    }


class TestMandatory16Cases:
    """
    TẬP HỢP ĐẦY ĐỦ 16 TEST CASE BẮT BUỘC THEO MỤC X CỦA YÊU CẦU DỰ ÁN TTTN_MIS_04
    """

    # TEST 1: Đăng ký trước registration_open_at => FAIL (400)
    def test_01_register_before_registration_open_at_fails(self, tokens):
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        db = SessionLocal()
        ws = Workshop(
            organizer_id=2,
            title=f"TEST 1 Workshop Future Open {uuid.uuid4().hex[:6]}",
            start_at=now + timedelta(days=10),
            end_at=now + timedelta(days=10, hours=2),
            registration_open_at=now + timedelta(days=2),  # Cổng mở sau 2 ngày nữa
            registration_close_at=now + timedelta(days=9),
            quota=50,
            checkin_code=f"WS-T1-{uuid.uuid4().hex[:8]}",
            checkin_start_at=now + timedelta(days=10, minutes=-30),
            checkin_end_at=now + timedelta(days=10, minutes=30),
            status="published",
        )
        db.add(ws)
        db.commit()
        db.refresh(ws)
        ws_id = ws.workshop_id
        db.close()

        res = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_b"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        assert res.status_code == 400
        assert "chưa mở" in res.json()["detail"].lower()

    # TEST 2: Đăng ký trong registration window và còn quota => SUCCESS (201)
    def test_02_register_within_registration_window_success(self, tokens):
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        db = SessionLocal()
        ws = Workshop(
            organizer_id=2,
            title=f"TEST 2 Workshop Open Window {uuid.uuid4().hex[:6]}",
            start_at=now + timedelta(days=5),
            end_at=now + timedelta(days=5, hours=2),
            registration_open_at=now - timedelta(days=1),  # Đã mở từ hôm qua
            registration_close_at=now + timedelta(days=4),  # Đóng sau 4 ngày
            quota=10,
            checkin_code=f"WS-T2-{uuid.uuid4().hex[:8]}",
            checkin_start_at=now + timedelta(days=5, minutes=-30),
            checkin_end_at=now + timedelta(days=5, minutes=30),
            status="published",
        )
        db.add(ws)
        db.commit()
        db.refresh(ws)
        ws_id = ws.workshop_id
        db.close()

        res = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_b"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        assert res.status_code == 201
        data = res.json()
        assert data["status"] == "confirmed"

    # TEST 3: Đăng ký sau registration_close_at => FAIL (400)
    def test_03_register_after_registration_close_at_fails(self, tokens):
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        db = SessionLocal()
        ws = Workshop(
            organizer_id=2,
            title=f"TEST 3 Workshop Closed Window {uuid.uuid4().hex[:6]}",
            start_at=now + timedelta(days=5),
            end_at=now + timedelta(days=5, hours=2),
            registration_open_at=now - timedelta(days=5),
            registration_close_at=now - timedelta(days=1),  # Đã đóng hôm qua
            quota=50,
            checkin_code=f"WS-T3-{uuid.uuid4().hex[:8]}",
            checkin_start_at=now + timedelta(days=5, minutes=-30),
            checkin_end_at=now + timedelta(days=5, minutes=30),
            status="published",
        )
        db.add(ws)
        db.commit()
        db.refresh(ws)
        ws_id = ws.workshop_id
        db.close()

        res = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_b"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        assert res.status_code == 400
        assert "đã đóng" in res.json()["detail"].lower()

    # TEST 4: Hai lần đăng ký cùng một Workshop bởi cùng User => lần 2 FAIL (400)
    def test_04_duplicate_registration_same_user_fails(self, tokens):
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        db = SessionLocal()
        ws = Workshop(
            organizer_id=2,
            title=f"TEST 4 Workshop Duplicate Check {uuid.uuid4().hex[:6]}",
            start_at=now + timedelta(days=5),
            end_at=now + timedelta(days=5, hours=2),
            registration_open_at=now - timedelta(days=1),
            registration_close_at=now + timedelta(days=4),
            quota=50,
            checkin_code=f"WS-T4-{uuid.uuid4().hex[:8]}",
            checkin_start_at=now + timedelta(days=5, minutes=-30),
            checkin_end_at=now + timedelta(days=5, minutes=30),
            status="published",
        )
        db.add(ws)
        db.commit()
        db.refresh(ws)
        ws_id = ws.workshop_id
        db.close()

        # Lần 1: Thành công
        res1 = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_b"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        assert res1.status_code == 201

        # Lần 2: Thất bại (BR-01 Chống đăng ký trùng)
        res2 = client.post(
            "/api/v1/registrations",
            headers=auth_header(tokens["participant_b"]),
            json={"workshop_id": ws_id, "accept_waitlist": True},
        )
        assert res2.status_code == 400
        assert "BR-01" in res2.json()["detail"] or "trùng" in res2.json()["detail"].lower() or "đã có lượt đăng ký" in res2.json()["detail"].lower()

    # TEST 5: Participant A dùng registration_id của Participant B để check-in => HTTP 403
    def test_05_participant_a_uses_participant_b_registration_id_checkin_fails_403(self, tokens):
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        db = SessionLocal()
        # Tạo workshop đang trong khung giờ checkin
        ws = Workshop(
            organizer_id=2,
            title=f"TEST 5 Security Checkin Workshop {uuid.uuid4().hex[:6]}",
            start_at=now + timedelta(minutes=15),
            end_at=now + timedelta(hours=2),
            registration_open_at=now - timedelta(days=1),
            registration_close_at=now + timedelta(minutes=10),
            quota=50,
            checkin_code=f"WS-T5-{uuid.uuid4().hex[:8]}",
            checkin_start_at=now - timedelta(minutes=10),  # Đang mở checkin
            checkin_end_at=now + timedelta(minutes=30),
            status="published",
        )
        db.add(ws)
        db.commit()
        db.refresh(ws)

        # Tạo vé cho Participant B (user_id=8: lan.pt)
        user_b = db.query(User).filter(User.email == "lan.pt@workshop.edu.vn").first()
        reg_b = Registration(
            workshop_id=ws.workshop_id,
            user_id=user_b.user_id,
            status="confirmed",
            registered_at=now,
            confirmed_at=now,
        )
        db.add(reg_b)
        db.commit()
        db.refresh(reg_b)
        reg_b_id = reg_b.registration_id
        ws_id = ws.workshop_id
        db.close()

        # Participant A (user@workshop.edu.vn) cố tình gửi registration_id của Participant B
        res = client.post(
            "/api/v1/attendance/check-in",
            headers=auth_header(tokens["participant_a"]),
            json={
                "workshop_id": ws_id,
                "registration_id": reg_b_id,
                "checkin_method": "manual",
            },
        )
        assert res.status_code == 403
        assert "không có quyền" in res.json()["detail"].lower()

    # TEST 6: Participant check-in bằng checkin_code đúng trong thời gian cho phép => SUCCESS (200)
    def test_06_participant_checkin_with_valid_code_in_window_success(self, tokens):
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        code = f"WS-T6-{uuid.uuid4().hex[:8]}"
        db = SessionLocal()
        ws = Workshop(
            organizer_id=2,
            title=f"TEST 6 Valid Checkin Workshop {uuid.uuid4().hex[:6]}",
            start_at=now + timedelta(minutes=15),
            end_at=now + timedelta(hours=2),
            registration_open_at=now - timedelta(days=1),
            registration_close_at=now + timedelta(minutes=10),
            quota=50,
            checkin_code=code,
            checkin_start_at=now - timedelta(minutes=15),
            checkin_end_at=now + timedelta(minutes=45),
            status="published",
        )
        db.add(ws)
        db.commit()
        db.refresh(ws)

        # Participant A có vé confirmed
        user_a = db.query(User).filter(User.email == "user@workshop.edu.vn").first()
        reg_a = Registration(
            workshop_id=ws.workshop_id,
            user_id=user_a.user_id,
            status="confirmed",
            registered_at=now,
            confirmed_at=now,
        )
        db.add(reg_a)
        db.commit()
        ws_id = ws.workshop_id
        db.close()

        res = client.post(
            "/api/v1/attendance/check-in",
            headers=auth_header(tokens["participant_a"]),
            json={
                "workshop_id": ws_id,
                "checkin_code": code,
                "checkin_method": "manual",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["message"] == "Điểm danh thành công."

    # TEST 7: Check-in bằng checkin_code sai => FAIL (400)
    def test_07_participant_checkin_with_wrong_code_fails(self, tokens):
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        code = f"WS-T7-{uuid.uuid4().hex[:8]}"
        db = SessionLocal()
        ws = Workshop(
            organizer_id=2,
            title=f"TEST 7 Wrong Code Workshop {uuid.uuid4().hex[:6]}",
            start_at=now + timedelta(minutes=15),
            end_at=now + timedelta(hours=2),
            registration_open_at=now - timedelta(days=1),
            registration_close_at=now + timedelta(minutes=10),
            quota=50,
            checkin_code=code,
            checkin_start_at=now - timedelta(minutes=15),
            checkin_end_at=now + timedelta(minutes=45),
            status="published",
        )
        db.add(ws)
        db.commit()
        db.refresh(ws)
        ws_id = ws.workshop_id
        db.close()

        res = client.post(
            "/api/v1/attendance/check-in",
            headers=auth_header(tokens["participant_a"]),
            json={
                "workshop_id": ws_id,
                "checkin_code": "WRONG-CODE-XYZ",
                "checkin_method": "manual",
            },
        )
        assert res.status_code == 400
        assert "không chính xác" in res.json()["detail"].lower()

    # TEST 8: Check-in ngoài checkin_start_at/checkin_end_at => FAIL (400)
    def test_08_participant_checkin_outside_window_fails(self, tokens):
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        code = f"WS-T8-{uuid.uuid4().hex[:8]}"
        db = SessionLocal()
        # Check-in chỉ mở sau 3 ngày nữa
        ws = Workshop(
            organizer_id=2,
            title=f"TEST 8 Future Window Workshop {uuid.uuid4().hex[:6]}",
            start_at=now + timedelta(days=3),
            end_at=now + timedelta(days=3, hours=2),
            registration_open_at=now - timedelta(days=1),
            registration_close_at=now + timedelta(days=2),
            quota=50,
            checkin_code=code,
            checkin_start_at=now + timedelta(days=3, minutes=-15),
            checkin_end_at=now + timedelta(days=3, minutes=45),
            status="published",
        )
        db.add(ws)
        db.commit()
        db.refresh(ws)
        ws_id = ws.workshop_id
        db.close()

        res = client.post(
            "/api/v1/attendance/check-in",
            headers=auth_header(tokens["participant_a"]),
            json={
                "workshop_id": ws_id,
                "checkin_code": code,
                "checkin_method": "manual",
            },
        )
        assert res.status_code == 400
        assert "chưa đến giờ" in res.json()["detail"].lower() or "br-05" in res.json()["detail"].lower()

    # TEST 9: Một registration check-in hai lần => lần 2 FAIL (400)
    def test_09_registration_checkin_twice_fails(self, tokens):
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        code = f"WS-T9-{uuid.uuid4().hex[:8]}"
        db = SessionLocal()
        ws = Workshop(
            organizer_id=2,
            title=f"TEST 9 Double Checkin Workshop {uuid.uuid4().hex[:6]}",
            start_at=now + timedelta(minutes=15),
            end_at=now + timedelta(hours=2),
            registration_open_at=now - timedelta(days=1),
            registration_close_at=now + timedelta(minutes=10),
            quota=50,
            checkin_code=code,
            checkin_start_at=now - timedelta(minutes=15),
            checkin_end_at=now + timedelta(minutes=45),
            status="published",
        )
        db.add(ws)
        db.commit()
        db.refresh(ws)

        user_b = db.query(User).filter(User.email == "lan.pt@workshop.edu.vn").first()
        reg_b = Registration(
            workshop_id=ws.workshop_id,
            user_id=user_b.user_id,
            status="confirmed",
            registered_at=now,
            confirmed_at=now,
        )
        db.add(reg_b)
        db.commit()
        ws_id = ws.workshop_id
        db.close()

        # Lần 1: Check-in thành công
        res1 = client.post(
            "/api/v1/attendance/check-in",
            headers=auth_header(tokens["participant_b"]),
            json={
                "workshop_id": ws_id,
                "checkin_code": code,
                "checkin_method": "manual",
            },
        )
        assert res1.status_code == 200

        # Lần 2: Check-in lại => FAIL (BR-14)
        res2 = client.post(
            "/api/v1/attendance/check-in",
            headers=auth_header(tokens["participant_b"]),
            json={
                "workshop_id": ws_id,
                "checkin_code": code,
                "checkin_method": "manual",
            },
        )
        assert res2.status_code == 400
        assert "đã được điểm danh" in res2.json()["detail"].lower()

    # TEST 10: Participant gọi API Admin => HTTP 403
    def test_10_participant_calls_admin_api_fails_403(self, tokens):
        # Participant gọi API xem Audit Logs của Admin
        res_audit = client.get("/api/v1/audit-logs", headers=auth_header(tokens["participant_a"]))
        assert res_audit.status_code == 403

        # Participant gọi API danh sách toàn bộ Users
        res_users = client.get("/api/v1/users", headers=auth_header(tokens["participant_a"]))
        assert res_users.status_code == 403

    # TEST 11: Organizer gọi API approve Workshop => HTTP 403
    def test_11_organizer_calls_approve_workshop_fails_403(self, tokens):
        res = client.post(
            "/api/v1/workshops/1/review",
            headers=auth_header(tokens["organizer"]),
            json={"action": "approve"},
        )
        assert res.status_code == 403

    # TEST 12: Admin approve Workshop => SUCCESS (200)
    def test_12_admin_approve_workshop_success(self, tokens):
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        db = SessionLocal()
        ws = Workshop(
            organizer_id=2,
            title=f"TEST 12 Workshop For Admin Approval {uuid.uuid4().hex[:6]}",
            start_at=now + timedelta(days=10),
            end_at=now + timedelta(days=10, hours=3),
            registration_open_at=None,
            registration_close_at=now + timedelta(days=9),
            quota=30,
            checkin_code=f"WS-T12-{uuid.uuid4().hex[:8]}",
            checkin_start_at=now + timedelta(days=10, minutes=-30),
            checkin_end_at=now + timedelta(days=10, minutes=30),
            status="pending",  # Đang chờ duyệt
        )
        db.add(ws)
        db.commit()
        db.refresh(ws)
        ws_id = ws.workshop_id
        db.close()

        res = client.post(
            f"/api/v1/workshops/{ws_id}/review",
            headers=auth_header(tokens["admin"]),
            json={"action": "approve"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "published"
        assert data["registration_open_at"] is not None

    # TEST 13: Admin tự khóa chính mình => FAIL (400)
    def test_13_admin_locks_self_fails(self, tokens):
        db = SessionLocal()
        admin_user = db.query(User).filter(User.email == "admin@workshop.edu.vn").first()
        assert admin_user is not None
        admin_id = admin_user.user_id
        db.close()

        # Admin tự khóa chính mình
        res_lock = client.put(
            f"/api/v1/users/{admin_id}/status",
            headers=auth_header(tokens["admin"]),
            json={"status": "locked"},
        )
        assert res_lock.status_code == 400
        assert "tự khóa" in res_lock.json()["detail"].lower()

        # Admin tự hạ role của chính mình
        res_demote = client.put(
            f"/api/v1/users/{admin_id}/role",
            headers=auth_header(tokens["admin"]),
            json={"role": "participant"},
        )
        assert res_demote.status_code == 400
        assert "tự hạ quyền" in res_demote.json()["detail"].lower()

    # TEST 14: Create Workshop với start_at >= end_at => FAIL (400/422)
    def test_14_create_workshop_with_start_at_ge_end_at_fails(self, tokens):
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        res = client.post(
            "/api/v1/workshops",
            headers=auth_header(tokens["organizer"]),
            json={
                "title": "TEST 14 Invalid Workshop Time",
                "start_at": (now + timedelta(days=5, hours=3)).isoformat(),
                "end_at": (now + timedelta(days=5)).isoformat(),  # end_at trước start_at!
                "quota": 20,
                "checkin_start_at": (now + timedelta(days=5, minutes=-30)).isoformat(),
                "checkin_end_at": (now + timedelta(days=5, minutes=30)).isoformat(),
            },
        )
        assert res.status_code in [400, 422]

    # TEST 15: Create Workshop với registration_open_at >= registration_close_at => FAIL (400/422)
    def test_15_create_workshop_with_registration_open_ge_close_fails(self, tokens):
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        res = client.post(
            "/api/v1/workshops",
            headers=auth_header(tokens["organizer"]),
            json={
                "title": "TEST 15 Invalid Reg Window",
                "start_at": (now + timedelta(days=5)).isoformat(),
                "end_at": (now + timedelta(days=5, hours=3)).isoformat(),
                "registration_open_at": (now + timedelta(days=3)).isoformat(),
                "registration_close_at": (now + timedelta(days=2)).isoformat(),  # close trước open!
                "quota": 20,
                "checkin_start_at": (now + timedelta(days=5, minutes=-30)).isoformat(),
                "checkin_end_at": (now + timedelta(days=5, minutes=30)).isoformat(),
            },
        )
        assert res.status_code in [400, 422]

    # TEST 16: Create Workshop với checkin_start_at >= checkin_end_at => FAIL (400/422)
    def test_16_create_workshop_with_checkin_start_ge_checkin_end_fails(self, tokens):
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        res = client.post(
            "/api/v1/workshops",
            headers=auth_header(tokens["organizer"]),
            json={
                "title": "TEST 16 Invalid Checkin Window",
                "start_at": (now + timedelta(days=5)).isoformat(),
                "end_at": (now + timedelta(days=5, hours=3)).isoformat(),
                "quota": 20,
                "checkin_start_at": (now + timedelta(days=5, minutes=30)).isoformat(),
                "checkin_end_at": (now + timedelta(days=5, minutes=-30)).isoformat(),  # checkin_end trước start!
            },
        )
        assert res.status_code in [400, 422]
