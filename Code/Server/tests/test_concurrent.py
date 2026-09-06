"""
test_concurrent.py — Kiểm tra Race Condition (Concurrent Tests)

Mục đích: Mô phỏng nhiều request đồng thời để phát hiện lỗi TOCTOU (Time-of-Check-Time-of-Use).
Đây là loại test mà bộ test tuần tự KHÔNG bao giờ phát hiện được.

Chạy: pytest tests/test_concurrent.py -v -s
Yêu cầu: Server FastAPI đang chạy và database đã có seed data.

============================================================
QUAN TRỌNG VỀ GIỚI HẠN CỦA TEST NÀY:
============================================================
FastAPI TestClient (từ Starlette) là SYNCHRONOUS và chạy SINGLE-THREADED.
Điều này có nghĩa:
  - Dù dùng ThreadPoolExecutor(max_workers=N), TestClient vẫn serialize requests.
  - with_for_update() trong session serialized không thể ngăn "race condition" vì không có race thật sự.
  
Để test race condition THẬT SỰ:
  1. Khởi động server thật: uvicorn app.main:app --workers 4 --port 8000
  2. Dùng requests (thay TestClient) gọi http://localhost:8000
  3. Hoặc dùng httpx.AsyncClient với asyncio.gather()

Kịch bản kiểm tra:
1. BR-02: N người cùng đăng ký 1 workshop quota=1 → Chỉ đúng 1 người confirmed
2. BR-14: N người cùng quét cùng 1 QR → Chỉ đúng 1 lượt attendance được ghi
============================================================
"""

import concurrent.futures
import os
import sys
import time
import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)


# ─── Helpers ────────────────────────────────────────────────────────────────

def get_auth_token(email: str, password: str = "User@123") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


def auth_headers(token: str):
    return {"Authorization": f"Bearer {token}"}


# Danh sách test accounts — phải khớp với seed_data.py
PARTICIPANTS = [
    ("user@workshop.edu.vn", "User@123"),
    ("hoai.td@workshop.edu.vn", "User@123"),
    ("nam.nt@workshop.edu.vn", "User@123"),
    ("nhi.ntt@workshop.edu.vn", "User@123"),
    ("lan.pt@workshop.edu.vn", "User@123"),
]


def create_and_publish_workshop(quota: int, title_suffix: str = "") -> int:
    """Tạo và publish 1 workshop với quota cho trước. Trả về workshop_id."""
    org_token = get_auth_token("organizer@workshop.edu.vn", "Organizer@123")
    admin_token = get_auth_token("admin@workshop.edu.vn", "Admin@123")
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # Tạo workshop draft
    res = client.post(
        "/api/v1/workshops",
        headers=auth_headers(org_token),
        json={
            "title": f"Race Condition Test Workshop {title_suffix} {int(time.time())}",
            "description": "Workshop dùng để test concurrent",
            "location": "Test Room",
            "start_at": (now + timedelta(days=3)).isoformat(),
            "end_at": (now + timedelta(days=3, hours=2)).isoformat(),
            "quota": quota,
            "checkin_start_at": (now + timedelta(days=3, minutes=-15)).isoformat(),
            "checkin_end_at": (now + timedelta(days=3, hours=2, minutes=15)).isoformat(),
        },
    )
    assert res.status_code == 201, f"Create workshop failed: {res.text}"
    ws_id = res.json()["workshop_id"]

    # Submit và approve
    client.post(f"/api/v1/workshops/{ws_id}/submit", headers=auth_headers(org_token))
    res_approve = client.post(
        f"/api/v1/workshops/{ws_id}/review",
        headers=auth_headers(admin_token),
        json={"action": "approve"},
    )
    assert res_approve.status_code == 200
    return ws_id


# ─── TEST CASE 1: BR-02 Race Condition ─────────────────────────────────────

class TestConcurrentRegistration:
    """
    Kiểm tra BR-02: N người đồng thời đăng ký workshop quota=1.
    Expected (sau fix): Đúng 1 người confirmed, N-1 người vào waitlist.
    Bug cũ (trước fix): Có thể > 1 người confirmed → vỡ quota.
    """

    def test_br02_quota_integrity_under_concurrent_load(self):
        """
        Tạo workshop quota=1, cho N người đăng ký đồng thời.
        Verify: Chỉ đúng 1 confirmed, phần còn lại là waitlist.
        """
        CONCURRENT_USERS = min(len(PARTICIPANTS), 5)
        ws_id = create_and_publish_workshop(quota=1, title_suffix="BR02")
        tokens = [get_auth_token(email, pwd) for email, pwd in PARTICIPANTS[:CONCURRENT_USERS]]

        results = []

        def do_register(token: str):
            return client.post(
                "/api/v1/registrations",
                headers=auth_headers(token),
                json={"workshop_id": ws_id, "accept_waitlist": True},
            )

        # Gửi N requests đồng thời
        with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENT_USERS) as executor:
            futures = [executor.submit(do_register, token) for token in tokens]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]

        # Phân loại kết quả
        statuses = [r.json().get("status") for r in results if r.status_code in [200, 201]]
        http_codes = [r.status_code for r in results]

        confirmed_count = statuses.count("confirmed")
        waitlist_count = statuses.count("waitlist")
        error_count = sum(1 for code in http_codes if code >= 400)

        print(f"\n[BR-02 Concurrent Test] quota=1, users={CONCURRENT_USERS}")
        print(f"  → confirmed: {confirmed_count}, waitlist: {waitlist_count}, errors: {error_count}")
        print(f"  → HTTP codes: {sorted(http_codes)}")

        # ✅ ASSERT QUAN TRỌNG: Đúng 1 confirmed — không được nhiều hơn!
        assert confirmed_count == 1, (
            f"RACE CONDITION DETECTED! Có {confirmed_count} người confirmed cho workshop quota=1. "
            f"Cần có đúng 1 confirmed. Fix: Thêm .with_for_update() trong register_for_workshop()."
        )

        # Tổng confirmed + waitlist = tổng requests thành công
        total_success = confirmed_count + waitlist_count
        assert total_success == CONCURRENT_USERS - error_count

    def test_br02_quota_3_concurrent_10_users(self):
        """
        Workshop quota=3, 5 người đăng ký đồng thời.
        Expected: Đúng 3 confirmed, 2 waitlist.
        """
        QUOTA = 3
        CONCURRENT_USERS = min(len(PARTICIPANTS), 5)
        ws_id = create_and_publish_workshop(quota=QUOTA, title_suffix="BR02-QUOTA3")
        tokens = [get_auth_token(email, pwd) for email, pwd in PARTICIPANTS[:CONCURRENT_USERS]]

        results = []

        def do_register(token: str):
            return client.post(
                "/api/v1/registrations",
                headers=auth_headers(token),
                json={"workshop_id": ws_id, "accept_waitlist": True},
            )

        with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENT_USERS) as executor:
            futures = [executor.submit(do_register, token) for token in tokens]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]

        statuses = [r.json().get("status") for r in results if r.status_code in [200, 201]]
        confirmed_count = statuses.count("confirmed")

        print(f"\n[BR-02 Concurrent Test] quota={QUOTA}, users={CONCURRENT_USERS}")
        print(f"  → confirmed: {confirmed_count}, waitlist: {statuses.count('waitlist')}")

        # Không được vượt quota
        assert confirmed_count <= QUOTA, (
            f"RACE CONDITION! {confirmed_count} confirmed > quota={QUOTA}. "
            f"Fix: Thêm .with_for_update() trong register_for_workshop()."
        )
        # Phải đủ số confirmed (bằng quota vì có đủ người)
        assert confirmed_count == QUOTA, (
            f"Chỉ có {confirmed_count}/{QUOTA} confirmed. Có thể lost update."
        )


# ─── TEST CASE 2: BR-14 Race Condition ─────────────────────────────────────

class TestConcurrentCheckin:
    """
    Kiểm tra BR-14: N người đồng thời quét cùng 1 mã QR.
    Expected (sau fix): Chỉ 1 lượt attendance được ghi.
    Bug cũ: Nhiều hơn 1 attendance → bypass chống điểm danh trùng.

    Lưu ý: Test này cần 1 registration đã confirmed + workshop đang trong giờ checkin.
    Vì test môi trường nên sử dụng registration_id trực tiếp (manual checkin) qua Admin/Organizer.
    """

    def test_br14_no_duplicate_attendance_under_concurrent_load(self):
        """
        Tạo workshop, 1 người đăng ký confirmed, sau đó N Organizer/Admin đồng thời
        thực hiện manual check-in cho cùng 1 registration_id.
        Expected: Chỉ 1 attendance, những request còn lại nhận 400/409.
        """
        org_token = get_auth_token("organizer@workshop.edu.vn", "Organizer@123")
        admin_token = get_auth_token("admin@workshop.edu.vn", "Admin@123")
        user_token = get_auth_token("user@workshop.edu.vn", "User@123")

        # Tạo workshop với checkin_start_at = now (đang trong giờ checkin)
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        res_ws = client.post(
            "/api/v1/workshops",
            headers=auth_headers(org_token),
            json={
                "title": f"Concurrent Checkin Test {int(time.time())}",
                "description": "Test BR-14 concurrent",
                "location": "Test Room",
                "start_at": (now + timedelta(minutes=1)).isoformat(),
                "end_at": (now + timedelta(hours=3)).isoformat(),
                "quota": 10,
                "checkin_start_at": (now - timedelta(minutes=5)).isoformat(),  # Đang mở
                "checkin_end_at": (now + timedelta(hours=4)).isoformat(),
            },
        )
        assert res_ws.status_code == 201
        ws_id = res_ws.json()["workshop_id"]

        # Publish workshop
        client.post(f"/api/v1/workshops/{ws_id}/submit", headers=auth_headers(org_token))
        client.post(
            f"/api/v1/workshops/{ws_id}/review",
            headers=auth_headers(admin_token),
            json={"action": "approve"},
        )

        # User đăng ký
        res_reg = client.post(
            "/api/v1/registrations",
            headers=auth_headers(user_token),
            json={"workshop_id": ws_id, "accept_waitlist": False},
        )
        assert res_reg.status_code == 201
        assert res_reg.json()["status"] == "confirmed"
        reg_id = res_reg.json()["registration_id"]

        # N Admins đồng thời thực hiện manual checkin cho cùng 1 reg_id
        CONCURRENT = 5
        checkin_tokens = [admin_token] * CONCURRENT  # Dùng admin token để bypass

        checkin_results = []

        def do_checkin(token: str):
            return client.post(
                "/api/v1/attendance/check-in",
                headers=auth_headers(token),
                json={
                    "workshop_id": ws_id,
                    "registration_id": reg_id,
                    "checkin_method": "manual",
                },
            )

        with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENT) as executor:
            futures = [executor.submit(do_checkin, token) for token in checkin_tokens]
            checkin_results = [f.result() for f in concurrent.futures.as_completed(futures)]

        # Phân loại
        success_codes = [r.status_code for r in checkin_results if r.status_code in [200, 201]]
        error_codes = [r.status_code for r in checkin_results if r.status_code >= 400]

        print(f"\n[BR-14 Concurrent Test] concurrent={CONCURRENT}, reg_id={reg_id}")
        print(f"  → success: {len(success_codes)}, errors: {len(error_codes)}")
        print(f"  → HTTP codes: {sorted([r.status_code for r in checkin_results])}")

        # ✅ ASSERT QUAN TRỌNG: Chỉ đúng 1 checkin thành công
        assert len(success_codes) == 1, (
            f"RACE CONDITION DETECTED! Có {len(success_codes)} checkin thành công cho cùng 1 registration. "
            f"Fix: Thêm .with_for_update() + IntegrityError catch trong process_checkin()."
        )
        # N-1 phải là lỗi
        assert len(error_codes) == CONCURRENT - 1


# ─── TEST CASE 3: Kiểm tra Waitlist Promote sau concurrent cancel ───────────

class TestConcurrentCancelAndPromote:
    """
    Kiểm tra BR-03: Khi 2 người confirmed cùng hủy → đôn đúng 2 người waitlist.
    Không đôn trùng 1 người 2 lần.
    """

    def test_br03_waitlist_promote_no_duplicate_on_concurrent_cancel(self):
        """
        Workshop quota=2, 2 người confirmed, 3 người waitlist (pos 1,2,3).
        2 người confirmed cùng hủy đồng thời.
        Expected: 2 người waitlist (pos 1, 2) được promote → confirmed.
        Không được promote cùng 1 người 2 lần.
        """
        # Chỉ chạy nếu có đủ accounts
        if len(PARTICIPANTS) < 5:
            pytest.skip("Cần ít nhất 5 participant accounts trong seed data")

        org_token = get_auth_token("organizer@workshop.edu.vn", "Organizer@123")
        admin_token = get_auth_token("admin@workshop.edu.vn", "Admin@123")
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        # Tạo workshop quota=2
        res_ws = client.post(
            "/api/v1/workshops",
            headers=auth_headers(org_token),
            json={
                "title": f"Waitlist Promote Test {int(time.time())}",
                "description": "Test BR-03 concurrent promote",
                "location": "Test Room",
                "start_at": (now + timedelta(days=5)).isoformat(),
                "end_at": (now + timedelta(days=5, hours=2)).isoformat(),
                "quota": 2,
                "checkin_start_at": (now + timedelta(days=5, minutes=-15)).isoformat(),
                "checkin_end_at": (now + timedelta(days=5, hours=2, minutes=15)).isoformat(),
            },
        )
        assert res_ws.status_code == 201
        ws_id = res_ws.json()["workshop_id"]

        # Publish
        client.post(f"/api/v1/workshops/{ws_id}/submit", headers=auth_headers(org_token))
        client.post(
            f"/api/v1/workshops/{ws_id}/review",
            headers=auth_headers(admin_token),
            json={"action": "approve"},
        )

        # Đăng ký tuần tự: 2 confirmed, 3 waitlist
        reg_ids = {}
        for email, pwd in PARTICIPANTS:
            token = get_auth_token(email, pwd)
            res = client.post(
                "/api/v1/registrations",
                headers=auth_headers(token),
                json={"workshop_id": ws_id, "accept_waitlist": True},
            )
            assert res.status_code == 201
            reg_ids[email] = res.json()["registration_id"]

        # Lấy 2 người confirmed để hủy
        confirmed_emails = [email for email, pwd in PARTICIPANTS[:2]]
        confirmed_reg_ids = [reg_ids[e] for e in confirmed_emails]
        confirmed_tokens = [get_auth_token(email, pwd) for email, pwd in PARTICIPANTS[:2]]

        # Hủy 2 người confirmed đồng thời
        def do_cancel(token: str, reg_id: int):
            return client.post(
                f"/api/v1/registrations/{reg_id}/cancel",
                headers=auth_headers(token),
                json={"cancel_reason": "Test concurrent cancel"},
            )

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            futures = [
                executor.submit(do_cancel, confirmed_tokens[0], confirmed_reg_ids[0]),
                executor.submit(do_cancel, confirmed_tokens[1], confirmed_reg_ids[1]),
            ]
            cancel_results = [f.result() for f in concurrent.futures.as_completed(futures)]

        cancel_success = [r for r in cancel_results if r.status_code == 200]
        assert len(cancel_success) == 2, "Cả 2 cancel phải thành công"

        # Verify: Đúng 2 người từ waitlist được promote (không duplicate)
        all_reg_ids = list(reg_ids.values())
        promoted_users = []

        for email, pwd in PARTICIPANTS[2:]:  # 3 người waitlist
            token = get_auth_token(email, pwd)
            my_regs = client.get("/api/v1/registrations/my", headers=auth_headers(token)).json()
            ws_reg = next((r for r in my_regs if r.get("workshop_id") == ws_id), None)
            if ws_reg and ws_reg["status"] == "confirmed":
                promoted_users.append(email)

        print(f"\n[BR-03 Concurrent Promote Test] Promoted: {promoted_users}")

        assert len(promoted_users) == 2, (
            f"Expected 2 promoted, got {len(promoted_users)}: {promoted_users}. "
            f"RACE CONDITION in promote_waitlist_entries()? Fix: .with_for_update() on waitlist query."
        )
        # Đảm bảo không có user nào bị promote 2 lần (set = list → không trùng)
        assert len(set(promoted_users)) == len(promoted_users), "Có user bị promote 2 lần!"
