from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
import os
import sys
import uuid
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.main import app
from app.models.attendance import Attendance
from app.models.registration import Registration
from app.models.user import User
from app.models.workshop import Workshop

client = TestClient(app)


def get_token_for_user(email: str, password: str = "User@123") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


def auth_hdr(token: str):
    return {"Authorization": f"Bearer {token}"}


class TestConcurrencySuite:
    """
    KIỂM TRA RACE CONDITION VÀ CONCURRENCY SAFETY TRÊN DATABASE THỰC TẾ
    Sử dụng ThreadPoolExecutor với N luồng đồng thời
    """

    def test_concurrency_registration_quota_strictly_enforced(self):
        """
        KỊCH BẢN 1: Workshop có Quota = 1.
        10 người dùng khác nhau gửi đồng thời 10 request đăng ký vào cùng 1 thời điểm.
        - Yêu cầu: Đúng 1 lượt confirmed thành công (nếu không nhận waitlist thì 9 người còn lại 400).
        - Nếu accept_waitlist=False: Đúng 1 request HTTP 201, 9 request HTTP 400.
        - Database: Số lượng vé confirmed đúng = 1, không vượt quá quota.
        """
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        db = SessionLocal()

        # 1. Tạo Workshop với quota = 1 và registration đang mở
        ws = Workshop(
            organizer_id=2,
            title=f"CONCURRENCY TEST Quota 1 - {uuid.uuid4().hex[:6]}",
            start_at=now + timedelta(days=5),
            end_at=now + timedelta(days=5, hours=2),
            registration_open_at=now - timedelta(days=1),
            registration_close_at=now + timedelta(days=4),
            quota=1,
            checkin_code=f"WS-CC-Q1-{uuid.uuid4().hex[:8]}",
            checkin_start_at=now + timedelta(days=5, minutes=-30),
            checkin_end_at=now + timedelta(days=5, minutes=30),
            status="published",
        )
        db.add(ws)
        db.commit()
        db.refresh(ws)
        ws_id = ws.workshop_id

        # 2. Tạo 10 người dùng độc lập để tham gia đua đăng ký
        tokens = []
        user_ids = []
        for i in range(10):
            email = f"concurrent_user_{uuid.uuid4().hex[:8]}@test.com"
            user = User(
                full_name=f"Concurrent User {i}",
                email=email,
                password_hash=get_password_hash("User@123"),
                role="participant",
                status="active",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            user_ids.append(user.user_id)
            tokens.append(get_token_for_user(email, "User@123"))

        db.close()

        # 3. Gửi đồng thời 10 request đăng ký (accept_waitlist = False để test quota cutoff)
        def send_reg_request(token):
            return client.post(
                "/api/v1/registrations",
                headers=auth_hdr(token),
                json={"workshop_id": ws_id, "accept_waitlist": False},
            )

        responses = []
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(send_reg_request, tok) for tok in tokens]
            for future in as_completed(futures):
                responses.append(future.result())

        status_codes = [r.status_code for r in responses]
        success_count = status_codes.count(201)
        rejected_count = status_codes.count(400)

        # 4. Kiểm tra HTTP response
        assert success_count == 1, f"Kỳ vọng đúng 1 request thành công nhưng có {success_count} thành công. Codes: {status_codes}"
        assert rejected_count == 9, f"Kỳ vọng 9 request bị từ chối do hết chỗ nhưng có {rejected_count}. Codes: {status_codes}"

        # 5. KIỂM TRA TRỰC TIẾP TRONG DATABASE (Bắt buộc theo yêu cầu)
        db_check = SessionLocal()
        confirmed_in_db = (
            db_check.query(Registration)
            .filter(Registration.workshop_id == ws_id, Registration.status == "confirmed")
            .all()
        )
        total_regs_in_db = (
            db_check.query(Registration)
            .filter(Registration.workshop_id == ws_id)
            .all()
        )
        db_check.close()

        assert len(confirmed_in_db) == 1, f"Database vượt quá Quota: tìm thấy {len(confirmed_in_db)} vé confirmed trong DB!"
        assert len(total_regs_in_db) == 1, f"Database có số lượng bản ghi không khớp: {len(total_regs_in_db)}"

    def test_concurrency_registration_with_waitlist(self):
        """
        KỊCH BẢN 2: Workshop có Quota = 2.
        8 người dùng gửi đồng thời 8 request đăng ký với accept_waitlist = True.
        - Yêu cầu: Đúng 2 confirmed, 6 waitlist.
        - Waitlist position trong database phải là duy nhất từ 1 đến 6.
        """
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        db = SessionLocal()

        ws = Workshop(
            organizer_id=2,
            title=f"CONCURRENCY TEST Waitlist Quota 2 - {uuid.uuid4().hex[:6]}",
            start_at=now + timedelta(days=5),
            end_at=now + timedelta(days=5, hours=2),
            registration_open_at=now - timedelta(days=1),
            registration_close_at=now + timedelta(days=4),
            quota=2,
            checkin_code=f"WS-CC-WL2-{uuid.uuid4().hex[:8]}",
            checkin_start_at=now + timedelta(days=5, minutes=-30),
            checkin_end_at=now + timedelta(days=5, minutes=30),
            status="published",
        )
        db.add(ws)
        db.commit()
        db.refresh(ws)
        ws_id = ws.workshop_id

        tokens = []
        for i in range(8):
            email = f"wl_user_{uuid.uuid4().hex[:8]}@test.com"
            user = User(
                full_name=f"Waitlist User {i}",
                email=email,
                password_hash=get_password_hash("User@123"),
                role="participant",
                status="active",
            )
            db.add(user)
            db.commit()
            tokens.append(get_token_for_user(email, "User@123"))

        db.close()

        def send_wl_request(token):
            return client.post(
                "/api/v1/registrations",
                headers=auth_hdr(token),
                json={"workshop_id": ws_id, "accept_waitlist": True},
            )

        responses = []
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = [executor.submit(send_wl_request, tok) for tok in tokens]
            for future in as_completed(futures):
                responses.append(future.result())

        for r in responses:
            assert r.status_code == 201, f"Tất cả request phải trả về 201 (2 confirmed, 6 waitlist), nhưng nhận: {r.status_code} - {r.text}"

        # Kiểm tra Database
        db_check = SessionLocal()
        confirmed_regs = (
            db_check.query(Registration)
            .filter(Registration.workshop_id == ws_id, Registration.status == "confirmed")
            .all()
        )
        waitlist_regs = (
            db_check.query(Registration)
            .filter(Registration.workshop_id == ws_id, Registration.status == "waitlist")
            .order_by(Registration.waitlist_position.asc())
            .all()
        )
        db_check.close()

        assert len(confirmed_regs) == 2, f"Kỳ vọng 2 confirmed trong DB nhưng có {len(confirmed_regs)}"
        assert len(waitlist_regs) == 6, f"Kỳ vọng 6 waitlist trong DB nhưng có {len(waitlist_regs)}"

        # Kiểm tra các vị trí waitlist_position là duy nhất từ 1 đến 6
        positions = [r.waitlist_position for r in waitlist_regs]
        assert positions == [1, 2, 3, 4, 5, 6], f"Vị trí waitlist không liên tục hoặc bị trùng: {positions}"

    def test_concurrency_checkin_anti_duplicate_strictly_enforced(self):
        """
        KỊCH BẢN 3: Một Registration hợp lệ.
        Gửi đồng thời 10 request check-in cho cùng 1 Registration.
        - Yêu cầu: Tối đa đúng 1 request thành công (HTTP 200).
        - 9 request còn lại nhận HTTP 400 (Không được xuất hiện HTTP 500 lỗi máy chủ nội bộ!).
        - Database chỉ có duy nhất 1 bản ghi Attendance cho registration đó.
        """
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        checkin_code = f"WS-CC-CHK-{uuid.uuid4().hex[:8]}"
        db = SessionLocal()

        # Tạo Workshop đang trong khung giờ check-in
        ws = Workshop(
            organizer_id=2,
            title=f"CONCURRENCY TEST Checkin - {uuid.uuid4().hex[:6]}",
            start_at=now + timedelta(minutes=15),
            end_at=now + timedelta(hours=2),
            registration_open_at=now - timedelta(days=1),
            registration_close_at=now + timedelta(minutes=10),
            quota=50,
            checkin_code=checkin_code,
            checkin_start_at=now - timedelta(minutes=15),
            checkin_end_at=now + timedelta(minutes=45),
            status="published",
        )
        db.add(ws)
        db.commit()
        db.refresh(ws)
        ws_id = ws.workshop_id

        # Tạo 1 người dùng và 1 vé confirmed
        email = f"chk_user_{uuid.uuid4().hex[:8]}@test.com"
        user = User(
            full_name="Checkin Concurrency User",
            email=email,
            password_hash=get_password_hash("User@123"),
            role="participant",
            status="active",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        reg = Registration(
            workshop_id=ws_id,
            user_id=user.user_id,
            status="confirmed",
            registered_at=now,
            confirmed_at=now,
        )
        db.add(reg)
        db.commit()
        db.refresh(reg)
        reg_id = reg.registration_id

        token = get_token_for_user(email, "User@123")
        db.close()

        # Gửi 10 request check-in đồng thời cho cùng lượt đăng ký này
        def send_checkin_request():
            return client.post(
                "/api/v1/attendance/check-in",
                headers=auth_hdr(token),
                json={
                    "workshop_id": ws_id,
                    "checkin_code": checkin_code,
                    "checkin_method": "qr",
                },
            )

        responses = []
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(send_checkin_request) for _ in range(10)]
            for future in as_completed(futures):
                responses.append(future.result())

        status_codes = [r.status_code for r in responses]
        success_count = status_codes.count(200)
        rejected_count = status_codes.count(400)
        server_errors = [code for code in status_codes if code >= 500]

        # Kiểm tra không có 500 lỗi máy chủ nội bộ
        assert len(server_errors) == 0, f"Phát hiện lỗi Server 500 khi check-in đồng thời: {server_errors}"
        assert success_count == 1, f"Kỳ vọng đúng 1 check-in thành công nhưng có {success_count}. Codes: {status_codes}"
        assert rejected_count == 9, f"Kỳ vọng 9 request bị từ chối (400) nhưng có {rejected_count}. Codes: {status_codes}"

        # Kiểm tra Database
        db_check = SessionLocal()
        attendances = (
            db_check.query(Attendance)
            .filter(Attendance.registration_id == reg_id)
            .all()
        )
        updated_reg = (
            db_check.query(Registration)
            .filter(Registration.registration_id == reg_id)
            .first()
        )
        db_check.close()

        assert len(attendances) == 1, f"Database có {len(attendances)} bản ghi Attendance (Kỳ vọng duy nhất 1)!"
        assert updated_reg is not None and updated_reg.status == "attended", f"Trạng thái Registration kỳ vọng là 'attended', thực tế là '{updated_reg.status if updated_reg else None}'"

    def test_concurrency_same_user_duplicate_registration_prevented(self):
        """
        KỊCH BẢN 4: Cùng 1 User gửi đồng thời 10 request đăng ký vào cùng 1 Workshop.
        - Yêu cầu: Đúng 1 request tạo thành công (201).
        - 9 request còn lại bị từ chối (400 do BR-01 hoặc Unique constraint).
        - Không xuất hiện HTTP 500.
        - Database chỉ có đúng 1 bản ghi Registration cho cặp (workshop_id, user_id).
        """
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        db = SessionLocal()

        ws = Workshop(
            organizer_id=2,
            title=f"CONCURRENCY Same User - {uuid.uuid4().hex[:6]}",
            start_at=now + timedelta(days=5),
            end_at=now + timedelta(days=5, hours=2),
            registration_open_at=now - timedelta(days=1),
            registration_close_at=now + timedelta(days=4),
            quota=50,
            checkin_code=f"WS-CC-USR-{uuid.uuid4().hex[:8]}",
            checkin_start_at=now + timedelta(days=5, minutes=-30),
            checkin_end_at=now + timedelta(days=5, minutes=30),
            status="published",
        )
        db.add(ws)
        db.commit()
        db.refresh(ws)
        ws_id = ws.workshop_id

        email = f"same_user_{uuid.uuid4().hex[:8]}@test.com"
        user = User(
            full_name="Same User Concurrency",
            email=email,
            password_hash=get_password_hash("User@123"),
            role="participant",
            status="active",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        user_id = user.user_id

        token = get_token_for_user(email, "User@123")
        db.close()

        def send_dup_request():
            return client.post(
                "/api/v1/registrations",
                headers=auth_hdr(token),
                json={"workshop_id": ws_id, "accept_waitlist": True},
            )

        responses = []
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(send_dup_request) for _ in range(10)]
            for future in as_completed(futures):
                responses.append(future.result())

        status_codes = [r.status_code for r in responses]
        success_count = status_codes.count(201)
        rejected_count = status_codes.count(400)
        server_errors = [code for code in status_codes if code >= 500]

        assert len(server_errors) == 0, f"Phát hiện lỗi Server 500 khi đăng ký trùng: {server_errors}"
        assert success_count == 1, f"Kỳ vọng đúng 1 request thành công nhưng có {success_count}. Codes: {status_codes}"
        assert rejected_count == 9, f"Kỳ vọng 9 request bị từ chối nhưng có {rejected_count}. Codes: {status_codes}"

        # Kiểm tra Database
        db_check = SessionLocal()
        regs = (
            db_check.query(Registration)
            .filter(Registration.workshop_id == ws_id, Registration.user_id == user_id)
            .all()
        )
        db_check.close()

        assert len(regs) == 1, f"Database có {len(regs)} bản ghi Registration cho cùng (workshop, user) (Kỳ vọng duy nhất 1)!"
