"""
Script dọn dẹp dữ liệu test và nạp dữ liệu demo thực tế ngành Hệ thống thông tin quản lý (HTTTQL / MIS).
Đảm bảo tính Idempotent: có thể chạy nhiều lần mà không tạo trùng lặp dữ liệu, luôn cập nhật mốc thời gian theo 'now'.
Không xóa tài khoản người dùng, không xóa/sửa AuditLog.
"""
import sys
import os
from datetime import datetime, timedelta, timezone

# Add parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.workshop import Workshop
from app.models.registration import Registration
from app.models.attendance import Attendance
from app.models.survey import Survey
from app.models.user import User

def setup_demo_data():
    db = SessionLocal()
    try:
        print("=== BẮT ĐẦU DỌN DẸP DỮ LIỆU TEST VÀ NẠP DỮ LIỆU DEMO ===")
        now = datetime.now(timezone.utc)
        print(f"Thời điểm hiện tại (UTC): {now.isoformat()}")

        # 1. XÁC ĐỊNH VÀ DỌN DẸP CÁC WORKSHOP TEST VÔ NGHĨA
        # Các workshop test sinh ra từ test suite hoặc nhập tạm có tiêu đề chứa: TEST, Workshop Test, Workshop Audit Test, ...
        test_workshops = db.query(Workshop).filter(
            (Workshop.title.like("TEST %")) |
            (Workshop.title.like("Workshop Test %")) |
            (Workshop.title.like("Workshop Audit Test %")) |
            (Workshop.title.like("%[TEST]%")) |
            (Workshop.title.like("%Test Draft%"))
        ).all()

        test_ws_ids = [w.workshop_id for w in test_workshops]
        print(f"Tìm thấy {len(test_ws_ids)} workshop test cần dọn dẹp: {test_ws_ids}")

        if test_ws_ids:
            # Tìm tất cả registration thuộc test workshop
            test_regs = db.query(Registration).filter(Registration.workshop_id.in_(test_ws_ids)).all()
            test_reg_ids = [r.registration_id for r in test_regs]
            print(f"  - Có {len(test_reg_ids)} registrations liên quan")

            if test_reg_ids:
                # Xóa Survey liên quan
                deleted_surveys = db.query(Survey).filter(Survey.registration_id.in_(test_reg_ids)).delete(synchronize_session=False)
                print(f"  - Đã xóa {deleted_surveys} surveys")

                # Xóa Attendance liên quan
                deleted_attendances = db.query(Attendance).filter(Attendance.registration_id.in_(test_reg_ids)).delete(synchronize_session=False)
                print(f"  - Đã xóa {deleted_attendances} attendances")

                # Xóa Registrations
                deleted_regs = db.query(Registration).filter(Registration.registration_id.in_(test_reg_ids)).delete(synchronize_session=False)
                print(f"  - Đã xóa {deleted_regs} registrations")

            # Xóa Workshops
            deleted_ws = db.query(Workshop).filter(Workshop.workshop_id.in_(test_ws_ids)).delete(synchronize_session=False)
            print(f"  - Đã xóa {deleted_ws} test workshops")

        db.commit()

        # 2. DỌN DẸP TEST USERS SINH RA TỪ UNIT TEST (NẾU CÓ)
        # Giữ nguyên 8 tài khoản mẫu chuẩn (ID 1 đến 8)
        test_temp_users = db.query(User).filter(
            (User.email.like("test_user_%")) |
            (User.email.like("audit_user_%"))
        ).all()
        for tu in test_temp_users:
            print(f"  - Dọn test user tạm: {tu.email} (ID: {tu.user_id})")
            db.delete(tu)
        db.commit()

        # 3. THÔNG TIN NGƯỜI DÙNG DEMO CHUẨN
        organizer = db.query(User).filter(User.email == "organizer@workshop.edu.vn").first()
        if not organizer:
            organizer = db.query(User).filter(User.role == "organizer").first()
        organizer_id = organizer.user_id if organizer else 2

        participant_main = db.query(User).filter(User.email == "user@workshop.edu.vn").first()
        user4_id = participant_main.user_id if participant_main else 4

        participants = db.query(User).filter(User.role == "participant").order_by(User.user_id).all()
        user_ids = [u.user_id for u in participants]
        print(f"Organizer ID sử dụng: {organizer_id} ({organizer.email if organizer else ''})")
        print(f"Tài khoản học viên chính: {participant_main.email if participant_main else 'user@workshop.edu.vn'} (ID: {user4_id})")
        print(f"Danh sách học viên ({len(user_ids)} users): {user_ids}")

        # 3. DANH SÁCH 7 WORKSHOP DEMO CHUẨN NGÀNH HTTTQL (MIS)
        demo_specs = [
            {
                "title": "Xây dựng Dashboard KPI kinh doanh bằng Power BI",
                "description": (
                    "Diễn giả: ThS. Nguyễn Văn An - Data Analyst Lead tại TechCorp.\n\n"
                    "Hướng dẫn toàn diện về Business Intelligence: Thiết kế mô hình dữ liệu Star Schema, "
                    "viết công thức DAX tính toán các chỉ số kinh doanh chủ chốt (Revenue, MoM, YoY), "
                    "và xây dựng báo cáo trực quan cho ban lãnh đạo."
                ),
                "location": "Phòng Lab A2.04 - ĐH Kinh tế Quốc dân",
                "status": "published",
                "start_delta": timedelta(days=3, hours=2),
                "duration": timedelta(hours=3),
                "reg_close_delta": timedelta(days=2, hours=23),
                "quota": 30,
                # Tình huống: Sắp tới còn chỗ
                "registrations": [
                    {"user_id": user4_id, "status": "confirmed"},
                    {"user_id": user_ids[1] if len(user_ids) > 1 else 5, "status": "confirmed"},
                ]
            },
            {
                "title": "Phân tích dữ liệu bán hàng với Python và Pandas",
                "description": (
                    "Diễn giả: TS. Lê Hoàng Nam - Chuyên gia AI & Phân tích Dữ liệu.\n\n"
                    "Khóa học thực chiến phân tích hành vi mua sắm của khách hàng: Tiền xử lý dữ liệu với Pandas, "
                    "trực quan hóa với Matplotlib/Seaborn, và phân nhóm khách hàng bằng mô hình RFM (Recency, Frequency, Monetary)."
                ),
                "location": "Hội trường B3 - Cơ sở 2",
                "status": "published",
                "start_delta": timedelta(days=5, hours=1),
                "duration": timedelta(hours=3),
                "reg_close_delta": timedelta(days=4, hours=18),
                "quota": 3, # Quota nhỏ để test tình huống kín chỗ và waitlist
                # Tình huống: Kín chỗ, có hàng đợi waitlist hoạt động, User 4 ở vị trí #1
                "registrations": [
                    {"user_id": user_ids[1] if len(user_ids) > 1 else 5, "status": "confirmed"},
                    {"user_id": user_ids[2] if len(user_ids) > 2 else 6, "status": "confirmed"},
                    {"user_id": user_ids[3] if len(user_ids) > 3 else 8, "status": "confirmed"},
                    {"user_id": user4_id, "status": "waitlist", "waitlist_position": 1},
                    {"user_id": user_ids[4] if len(user_ids) > 4 else 7, "status": "waitlist", "waitlist_position": 2},
                ]
            },
            {
                "title": "Thiết kế cơ sở dữ liệu và tối ưu truy vấn SQL",
                "description": (
                    "Diễn giả: ThS. Trần Quốc Bảo - Principal Database Administrator.\n\n"
                    "Nâng cao hiệu năng ứng dụng thông qua kỹ thuật chuẩn hóa dữ liệu, đánh chỉ mục Index tối ưu, "
                    "phân tích Execution Plan, và khắc phục nghẽn cổ chai trong hệ thống cơ sở dữ liệu quy mô lớn."
                ),
                "location": "Phòng Hội thảo SmartLab C1",
                "status": "published",
                "start_delta": timedelta(minutes=-45), # Đang diễn ra
                "duration": timedelta(hours=2),
                "reg_close_delta": timedelta(hours=-2),
                "checkin_code": "WS-CHECKIN-SQLOPT26",
                "quota": 40,
                # Tình huống: Đang diễn ra, User 4 có vé CONFIRMED (có thể thử check-in qua /check-in), User khác đã ATTENDED
                "registrations": [
                    {"user_id": user4_id, "status": "confirmed"},
                    {
                        "user_id": user_ids[2] if len(user_ids) > 2 else 6,
                        "status": "attended",
                        "attended": True,
                        "checkin_delta": timedelta(minutes=-30)
                    },
                ]
            },
            {
                "title": "Ứng dụng Hệ thống ERP trong Quản lý Chuỗi cung ứng",
                "description": (
                    "Diễn giả: ThS. Phạm Thu Trang - ERP Senior Solution Architect.\n\n"
                    "Tổng quan kiến trúc các phân hệ ERP (SAP, Odoo, Oracle NetSuite): Quy trình từ mua hàng (Procure-to-Pay), "
                    "quản lý kho bãi, đến bán hàng và thu tiền (Order-to-Cash). Chia sẻ kinh nghiệm triển khai ERP thực tế."
                ),
                "location": "Trực tuyến qua Microsoft Teams",
                "status": "published",
                "start_delta": timedelta(days=-1, hours=-4), # Bắt đầu 28h trước
                "duration": timedelta(hours=3), # Kết thúc 25h trước
                "reg_close_delta": timedelta(days=-2),
                "checkin_code": "WS-CHECKIN-ERP2026",
                "quota": 50,
                # Tình huống: Đã kết thúc.
                # User 4 (user@workshop.edu.vn) ATTENDED nhưng CHƯA LÀM KHẢO SÁT -> is_survey_available = True trên giao diện!
                # Các user khác attended và ĐÃ làm khảo sát.
                "registrations": [
                    {
                        "user_id": user4_id,
                        "status": "attended",
                        "attended": True,
                        "checkin_delta": timedelta(days=-1, hours=-3, minutes=-50),
                        "survey": None # CHƯA LÀM KHẢO SÁT
                    },
                    {
                        "user_id": user_ids[1] if len(user_ids) > 1 else 5,
                        "status": "attended",
                        "attended": True,
                        "checkin_delta": timedelta(days=-1, hours=-3, minutes=-45),
                        "survey": {
                            "rating": 5,
                            "feedback": "Workshop rất thực tế, diễn giả phân tích ca triển khai Odoo tại doanh nghiệp phân phối rất hay!"
                        }
                    },
                    {
                        "user_id": user_ids[2] if len(user_ids) > 2 else 6,
                        "status": "attended",
                        "attended": True,
                        "checkin_delta": timedelta(days=-1, hours=-3, minutes=-40),
                        "survey": {
                            "rating": 4,
                            "feedback": "Nội dung phong phú, slide đẹp và chi tiết. Mong ban tổ chức chia sẻ tài liệu sau buổi học."
                        }
                    },
                    {
                        "user_id": user_ids[3] if len(user_ids) > 3 else 8,
                        "status": "cancelled",
                        "cancel_reason": "Bận lịch thi cuối kỳ",
                        "cancelled_delta": timedelta(days=-2)
                    }
                ]
            },
            {
                "title": "Mô hình hóa quy trình nghiệp vụ với BPMN 2.0",
                "description": (
                    "Diễn giả: Đỗ Minh Tuấn - Senior Business Analyst tại FPT Software.\n\n"
                    "Phương pháp luận phân tích và chuẩn hóa quy trình doanh nghiệp (BPM): "
                    "Sử dụng chuẩn BPMN 2.0 trên công cụ Camunda/Bizagi để lập sơ đồ AS-IS và thiết kế quy trình TO-BE hiệu quả."
                ),
                "location": "Phòng Lab B1.02 - Viện CNTT",
                "status": "pending", # Chờ duyệt
                "start_delta": timedelta(days=10, hours=2),
                "duration": timedelta(hours=3),
                "reg_close_delta": timedelta(days=9, hours=23),
                "quota": 35,
                "registrations": []
            },
            {
                "title": "Quản lý dự án Công nghệ thông tin theo Agile & Scrum",
                "description": (
                    "Diễn giả: Hoàng Kim Ngân - Agile Coach / Professional Scrum Master.\n\n"
                    "Áp dụng khung làm việc Scrum trong quản trị dự án phần mềm: Quản lý Product Backlog, "
                    "tổ chức Sprint Planning, Daily Scrum, Sprint Review và Retrospective bằng Jira Software."
                ),
                "location": "Hội trường Đa năng A",
                "status": "draft", # Bản nháp
                "start_delta": timedelta(days=14, hours=2),
                "duration": timedelta(hours=3),
                "reg_close_delta": timedelta(days=13, hours=23),
                "quota": 50,
                "registrations": []
            },
            {
                "title": "Ứng dụng GenAI trong Tự động hóa Văn phòng và Báo cáo",
                "description": (
                    "Diễn giả: Nguyễn Đức Huy - AI Solutions Engineer.\n\n"
                    "Khai thác Generative AI (LLMs, ChatGPT, Microsoft Copilot) để tự động hóa xử lý văn bản, "
                    "tổng hợp email, viết báo cáo phân tích kinh doanh và tạo code tự động hóa tác vụ Excel."
                ),
                "location": "Phòng Hội thảo D2",
                "status": "cancelled", # Đã hủy
                "cancel_reason": "Diễn giả có lịch công tác nước ngoài đột xuất, ban tổ chức xin lỗi và sẽ dời lịch sang tháng sau.",
                "cancelled_delta": timedelta(days=-2),
                "start_delta": timedelta(days=-1, hours=2),
                "duration": timedelta(hours=3),
                "reg_close_delta": timedelta(days=-2),
                "quota": 40,
                # Tình huống: Đã hủy, mọi đăng ký bị hủy với lý do của ban tổ chức
                "registrations": [
                    {
                        "user_id": user4_id,
                        "status": "cancelled",
                        "cancel_reason": "Workshop bị hủy bởi ban tổ chức",
                        "cancelled_delta": timedelta(days=-2)
                    },
                    {
                        "user_id": user_ids[1] if len(user_ids) > 1 else 5,
                        "status": "cancelled",
                        "cancel_reason": "Workshop bị hủy bởi ban tổ chức",
                        "cancelled_delta": timedelta(days=-2)
                    }
                ]
            }
        ]

        print("\n--- NẠP VÀ CẬP NHẬT 7 WORKSHOP DEMO HTTTQL ---")
        for spec in demo_specs:
            title = spec["title"]
            ws = db.query(Workshop).filter(Workshop.title == title).first()
            start_at = (now + spec["start_delta"]).replace(tzinfo=None)
            end_at = (start_at + spec["duration"])
            reg_close_at = (now + spec["reg_close_delta"]).replace(tzinfo=None) if spec.get("reg_close_delta") else None
            checkin_start_at = start_at - timedelta(minutes=30)
            checkin_end_at = end_at

            if not ws:
                ws = Workshop(
                    organizer_id=organizer_id,
                    title=title,
                    description=spec["description"],
                    location=spec["location"],
                    start_at=start_at,
                    end_at=end_at,
                    registration_open_at=start_at - timedelta(days=10),
                    registration_close_at=reg_close_at,
                    quota=spec["quota"],
                    checkin_code=spec.get("checkin_code"),
                    checkin_start_at=checkin_start_at,
                    checkin_end_at=checkin_end_at,
                    status=spec["status"],
                    cancel_reason=spec.get("cancel_reason")
                )
                db.add(ws)
                db.flush()
                print(f"[TẠO MỚI] Workshop ID={ws.workshop_id}: {title} (Trạng thái: {ws.status})")
            else:
                # Cập nhật thông tin và mốc thời gian động
                ws.organizer_id = organizer_id
                ws.description = spec["description"]
                ws.location = spec["location"]
                ws.start_at = start_at
                ws.end_at = end_at
                ws.registration_open_at = start_at - timedelta(days=10)
                ws.registration_close_at = reg_close_at
                ws.quota = spec["quota"]
                ws.checkin_code = spec.get("checkin_code")
                ws.checkin_start_at = checkin_start_at
                ws.checkin_end_at = checkin_end_at
                ws.status = spec["status"]
                ws.cancel_reason = spec.get("cancel_reason")
                db.flush()
                print(f"[CẬP NHẬT] Workshop ID={ws.workshop_id}: {title} (Trạng thái: {ws.status})")

                # Dọn đăng ký cũ của workshop này để nạp lại chuẩn
                existing_regs = db.query(Registration).filter(Registration.workshop_id == ws.workshop_id).all()
                existing_reg_ids = [r.registration_id for r in existing_regs]
                if existing_reg_ids:
                    db.query(Survey).filter(Survey.registration_id.in_(existing_reg_ids)).delete(synchronize_session=False)
                    db.query(Attendance).filter(Attendance.registration_id.in_(existing_reg_ids)).delete(synchronize_session=False)
                    db.query(Registration).filter(Registration.registration_id.in_(existing_reg_ids)).delete(synchronize_session=False)
                    db.flush()

            # Nạp registrations cho workshop
            for r_spec in spec["registrations"]:
                uid = r_spec["user_id"]
                reg = Registration(
                    workshop_id=ws.workshop_id,
                    user_id=uid,
                    status=r_spec["status"],
                    registered_at=(start_at - timedelta(days=2)),
                    waitlist_position=r_spec.get("waitlist_position"),
                    cancel_reason=r_spec.get("cancel_reason"),
                    cancelled_at=(now + r_spec["cancelled_delta"]).replace(tzinfo=None) if r_spec.get("cancelled_delta") else None
                )
                db.add(reg)
                db.flush()

                # Điểm danh nếu có
                if r_spec.get("attended"):
                    checkin_time = (now + r_spec["checkin_delta"]).replace(tzinfo=None)
                    att = Attendance(
                        registration_id=reg.registration_id,
                        checkin_at=checkin_time,
                        checkin_method="manual",
                        status="present"
                    )
                    db.add(att)
                    db.flush()

                # Khảo sát nếu có
                if r_spec.get("survey"):
                    surv_info = r_spec["survey"]
                    survey = Survey(
                        registration_id=reg.registration_id,
                        rating=surv_info["rating"],
                        feedback=surv_info["feedback"],
                        answers={"content_quality": surv_info["rating"], "speaker_enthusiasm": 5, "general_feedback": surv_info["feedback"]},
                        submitted_at=(now + timedelta(days=-1, hours=-2)).replace(tzinfo=None)
                    )
                    db.add(survey)
                    db.flush()

        db.commit()
        print("\n=== HOÀN TẤT THIẾT LẬP DỮ LIỆU DEMO THÀNH CÔNG ===")

    except Exception as e:
        db.rollback()
        print(f"LỖI trong quá trình setup demo data: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    setup_demo_data()
