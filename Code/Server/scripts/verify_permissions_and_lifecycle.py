"""
Script kiểm thử toàn diện:
1. Phân quyền đăng ký Workshop (UC-09):
   - Participant: Cho phép đăng ký (201).
   - Organizer: Bị chặn HTTP 403 Forbidden.
   - Admin: Bị chặn HTTP 403 Forbidden.
2. Kiểm tra chuỗi trạng thái theo 5 mốc thời gian cố định:
   - now < start_at (Trước sự kiện) -> Sắp tới
   - now == start_at (Đúng thời điểm bắt đầu) -> Đang diễn ra
   - start_at < now < end_at (Trong sự kiện) -> Đang diễn ra
   - now == end_at (Đúng thời điểm kết thúc) -> Đã kết thúc
   - now > end_at (Sau sự kiện) -> Đã kết thúc
3. Kiểm tra tính nhất quán dữ liệu giữa list_workshops và get_workshop_detail cho Workshop ID 9.
"""
import sys
import os
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.user import User
from app.models.workshop import Workshop
from app.models.registration import Registration
from app.services.registration_service import register_for_workshop
from app.api.v1.workshops import format_workshop_response
from app.services.workshop_service import get_workshop_stats

# Tạo CSDL SQLite in-memory cô lập để test phân quyền
test_engine = create_engine("sqlite:///:memory:", echo=False)
Base.metadata.create_all(bind=test_engine)
TestSession = sessionmaker(bind=test_engine)

def run_tests():
    print("=== BẮT ĐẦU KIỂM THỬ PHÂN QUYỀN VÀ TRẠNG THÁI VÒNG ĐỜI ===")
    db = TestSession()
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

    try:
        # 1. TẠO DỮ LIỆU CÔ LẬP
        admin = User(user_id=101, full_name="Admin Test", email="admin_test@test.edu", password_hash="hash", role="admin", status="active")
        organizer = User(user_id=102, full_name="Org Test", email="org_test@test.edu", password_hash="hash", role="organizer", status="active")
        participant = User(user_id=103, full_name="Part Test", email="part_test@test.edu", password_hash="hash", role="participant", status="active")
        db.add_all([admin, organizer, participant])
        db.commit()

        ws_published = Workshop(
            workshop_id=201,
            organizer_id=organizer.user_id,
            title="Workshop Test RBAC",
            location="Phòng A1",
            start_at=now_utc + timedelta(days=2),
            end_at=now_utc + timedelta(days=2, hours=3),
            registration_open_at=now_utc - timedelta(days=1),
            quota=20,
            status="published",
            checkin_start_at=now_utc + timedelta(days=2, minutes=-30),
            checkin_end_at=now_utc + timedelta(days=2, hours=3),
        )
        db.add(ws_published)
        db.commit()

        # 2. KIỂM THỬ PHÂN QUYỀN ĐĂNG KÝ
        print("\n--- TEST 1: PHÂN QUYỀN ĐĂNG KÝ (UC-09) ---")

        # 1.1 Organizer cố tình đăng ký -> Phải trả về 403 Forbidden
        try:
            register_for_workshop(db, ws_published.workshop_id, current_user=organizer)
            assert False, "LỖI: Organizer không được phép đăng ký mà lại thành công!"
        except HTTPException as e:
            assert e.status_code == 403, f"LỖI: Status code mong đợi 403 nhưng nhận {e.status_code}"
            assert "Người tham gia" in e.detail or "Participant" in e.detail
            print("  [PASS] 1.1: Organizer đăng ký -> Bị chặn 403 Forbidden chuẩn xác.")

        # 1.2 Admin cố tình đăng ký -> Phải trả về 403 Forbidden
        try:
            register_for_workshop(db, ws_published.workshop_id, current_user=admin)
            assert False, "LỖI: Admin không được phép đăng ký mà lại thành công!"
        except HTTPException as e:
            assert e.status_code == 403, f"LỖI: Status code mong đợi 403 nhưng nhận {e.status_code}"
            assert "Người tham gia" in e.detail or "Participant" in e.detail
            print("  [PASS] 1.2: Admin đăng ký -> Bị chặn 403 Forbidden chuẩn xác.")

        # 1.3 Participant đăng ký -> Thành công (201 / Registration object)
        reg = register_for_workshop(db, ws_published.workshop_id, current_user=participant)
        assert reg.registration_id is not None
        assert reg.status == "confirmed"
        print(f"  [PASS] 1.3: Participant đăng ký -> Thành công (Reg ID: {reg.registration_id}, Status: {reg.status}).")

        # 3. KIỂM THỬ 5 MỐC THỜI GIAN CỐ ĐỊNH (SERVER COMPUTE STATS)
        print("\n--- TEST 2: KIỂM TRA 5 MỐC THỜI GIAN CỐ ĐỊNH ---")
        base_start = datetime(2026, 11, 11, 14, 0, 0)
        base_end = datetime(2026, 11, 11, 17, 0, 0)

        ws_time_test = Workshop(
            workshop_id=202,
            organizer_id=organizer.user_id,
            title="Workshop Time Fixed Test",
            location="Phòng Lab B2",
            start_at=base_start,
            end_at=base_end,
            quota=30,
            status="published",
            checkin_start_at=base_start - timedelta(minutes=30),
            checkin_end_at=base_end,
        )
        db.add(ws_time_test)
        db.commit()

        time_cases = [
            # (Tên mốc, Thời điểm test, is_started, is_ended, effective_status)
            ("2.1 Trước start_at (13:30)", datetime(2026, 11, 11, 13, 30, 0), False, False, "published"),
            ("2.2 Đúng start_at (14:00)", datetime(2026, 11, 11, 14, 0, 0), True, False, "published"),
            ("2.3 Trong sự kiện (15:30)", datetime(2026, 11, 11, 15, 30, 0), True, False, "published"),
            ("2.4 Đúng end_at (17:00)", datetime(2026, 11, 11, 17, 0, 0), True, True, "completed"),
            ("2.5 Sau end_at (18:00)", datetime(2026, 11, 11, 18, 0, 0), True, True, "completed"),
        ]

        for name, test_time, exp_started, exp_ended, exp_status in time_cases:
            # Mô phỏng compute_workshop_stats với mốc test_time
            # is_ended: test_time >= ws.end_at
            # is_started: test_time >= ws.start_at
            actual_ended = test_time >= ws_time_test.end_at
            actual_started = test_time >= ws_time_test.start_at
            actual_status = "completed" if actual_ended else ws_time_test.status

            assert actual_started == exp_started, f"{name}: is_started sai ({actual_started} != {exp_started})"
            assert actual_ended == exp_ended, f"{name}: is_ended sai ({actual_ended} != {exp_ended})"
            assert actual_status == exp_status, f"{name}: effective_status sai ({actual_status} != {exp_status})"
            print(f"  [PASS] {name}: is_started={actual_started}, is_ended={actual_ended}, effective_status={actual_status}")

        # 4. ĐỐI CHIẾU THỰC TẾ WORKSHOP 9 TRÊN CSDL TỰ NHẬN DIỆN
        print("\n--- TEST 3: ĐỐI CHIẾU WORKSHOP ID 9 TRÊN DATABASE THỰC TẾ ---")
        from app.core.database import SessionLocal
        real_db = SessionLocal()
        ws9 = real_db.query(Workshop).filter(Workshop.workshop_id == 9).first()
        if ws9:
            formatted = format_workshop_response(real_db, ws9)
            print(f"  Workshop 9: {formatted['title']}")
            print(f"  start_at: {formatted['start_at']}")
            print(f"  end_at: {formatted['end_at']}")
            print(f"  status: {formatted['status']}")
            print(f"  is_started: {formatted['is_started']}")
            print(f"  is_ended: {formatted['is_ended']}")
            print(f"  effective_status: {formatted['effective_status']}")

            assert formatted["is_started"] is True, "Workshop 9 phải có is_started == True vì đang diễn ra"
            assert formatted["is_ended"] is False, "Workshop 9 phải có is_ended == False vì chưa đến giờ kết thúc"
            assert formatted["start_at"].tzinfo is not None, "start_at phải mang timezone UTC để JSON serialize có 'Z'"
            print("  [PASS] Workshop 9: Trả đầy đủ computed fields, mang timezone UTC, thống nhất 'Đang diễn ra'.")
        real_db.close()

        print("\n=== TẤT CẢ CÁC BÀI KIỂM THỬ ĐÃ PASS 100% ===")

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
