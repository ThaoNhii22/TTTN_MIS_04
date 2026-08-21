from datetime import datetime, timedelta, timezone
import os
import sys

# Thêm thư mục Server vào sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.stdout.reconfigure(encoding='utf-8')

from app.core.audit import log_audit_action
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.attendance import Attendance
from app.models.registration import Registration
from app.models.survey import Survey
from app.models.user import User
from app.models.workshop import Workshop


def seed():
    print("🌱 Đang bắt đầu seed dữ liệu mẫu cho hệ thống...")
    db = SessionLocal()
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    try:
        # 1. Seed Users
        users_data = [
            {
                "full_name": "Quản trị viên Hệ thống",
                "email": "admin@workshop.edu.vn",
                "password": "Admin@123",
                "role": "admin",
                "status": "active",
            },
            {
                "full_name": "Nguyễn Hải Nam (P.CTSV)",
                "email": "organizer@workshop.edu.vn",
                "password": "Organizer@123",
                "role": "organizer",
                "status": "active",
            },
            {
                "full_name": "Trần Minh Tuấn (CLB CNTT)",
                "email": "organizer2@workshop.edu.vn",
                "password": "Organizer@123",
                "role": "organizer",
                "status": "active",
            },
            {
                "full_name": "Nguyễn Văn An",
                "email": "user@workshop.edu.vn",
                "password": "User@123",
                "role": "participant",
                "status": "active",
            },
            {
                "full_name": "Trương Dư Hoài",
                "email": "hoai.td@workshop.edu.vn",
                "password": "User@123",
                "role": "participant",
                "status": "active",
            },
            {
                "full_name": "Nguyễn Thiên Nam",
                "email": "nam.nt@workshop.edu.vn",
                "password": "User@123",
                "role": "participant",
                "status": "active",
            },
            {
                "full_name": "Nguyễn Thị Thảo Nhi",
                "email": "nhi.ntt@workshop.edu.vn",
                "password": "User@123",
                "role": "participant",
                "status": "active",
            },
            {
                "full_name": "Phạm Thị Lan",
                "email": "lan.pt@workshop.edu.vn",
                "password": "User@123",
                "role": "participant",
                "status": "active",
            },
        ]

        created_users = {}
        for u in users_data:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                new_user = User(
                    full_name=u["full_name"],
                    email=u["email"],
                    password_hash=get_password_hash(u["password"]),
                    role=u["role"],
                    status=u["status"],
                )
                db.add(new_user)
                db.flush()
                created_users[u["email"]] = new_user
                print(f"  👤 Đã tạo tài khoản: {u['email']} ({u['role']})")
            else:
                created_users[u["email"]] = existing

        admin_user = created_users["admin@workshop.edu.vn"]
        organizer_1 = created_users["organizer@workshop.edu.vn"]
        organizer_2 = created_users["organizer2@workshop.edu.vn"]
        user_1 = created_users["user@workshop.edu.vn"]
        user_2 = created_users["hoai.td@workshop.edu.vn"]
        user_3 = created_users["nam.nt@workshop.edu.vn"]
        user_4 = created_users["nhi.ntt@workshop.edu.vn"]
        user_5 = created_users["lan.pt@workshop.edu.vn"]

        # 2. Seed Workshops
        workshops_data = [
            {
                "organizer_id": organizer_1.user_id,
                "title": "UI/UX Design Workshop: Từ Ý Tưởng Đến Prototyping",
                "description": "Khám phá các nguyên tắc thiết kế trải nghiệm người dùng và xây dựng giao diện bằng Figma chuẩn Design Thinking.",
                "location": "Phòng A203, Tòa nhà Trung tâm Công nghệ",
                "start_at": now + timedelta(days=3, hours=2),
                "end_at": now + timedelta(days=3, hours=5),
                "registration_open_at": now - timedelta(days=2),
                "registration_close_at": now + timedelta(days=2),
                "quota": 40,
                "checkin_code": "WS-CHECKIN-UIUX2026",
                "checkin_start_at": now + timedelta(days=3, hours=1, minutes=30),
                "checkin_end_at": now + timedelta(days=3, hours=2, minutes=30),
                "status": "published",
            },
            {
                "organizer_id": organizer_2.user_id,
                "title": "Python for Data Analysis & Visualization",
                "description": "Thực hành phân tích và trực quan hóa dữ liệu thực tế bằng Python, Pandas, Matplotlib và Seaborn.",
                "location": "Lab B302, Khoa Công nghệ Thông tin",
                "start_at": now + timedelta(days=6, hours=4),
                "end_at": now + timedelta(days=6, hours=7),
                "registration_open_at": now - timedelta(days=1),
                "registration_close_at": now + timedelta(days=5),
                "quota": 2,  # Quota nhỏ để demo tính năng Full & Waitlist
                "checkin_code": "WS-CHECKIN-PYDATA26",
                "checkin_start_at": now + timedelta(days=6, hours=3, minutes=30),
                "checkin_end_at": now + timedelta(days=6, hours=4, minutes=30),
                "status": "published",
            },
            {
                "organizer_id": organizer_1.user_id,
                "title": "React Advanced: Kiến Trúc Xây Dựng Dự Án Lớn",
                "description": "Tìm hiểu kiến trúc dự án React quy mô lớn, tối ưu hóa re-render, Custom Hooks và bảo mật JWT.",
                "location": "Lab B301, Khoa Công nghệ Thông tin",
                "start_at": now + timedelta(days=9, hours=1),
                "end_at": now + timedelta(days=9, hours=4),
                "registration_open_at": now - timedelta(hours=12),
                "registration_close_at": None,  # Demo BR-15 không giới hạn close_at
                "quota": 30,
                "checkin_code": "WS-CHECKIN-REACT26",
                "checkin_start_at": now + timedelta(days=9, hours=0, minutes=30),
                "checkin_end_at": now + timedelta(days=9, hours=1, minutes=30),
                "status": "published",
            },
            {
                "organizer_id": organizer_2.user_id,
                "title": "AI & Machine Learning in Practice 2026",
                "description": "Ứng dụng GenAI và LLM trong phát triển phần mềm doanh nghiệp.",
                "location": "Hội trường C",
                "start_at": now + timedelta(days=15),
                "end_at": now + timedelta(days=15, hours=3),
                "registration_open_at": None,
                "registration_close_at": None,
                "quota": 50,
                "checkin_code": "WS-CHECKIN-AI2026",
                "checkin_start_at": now + timedelta(days=15, minutes=-30),
                "checkin_end_at": now + timedelta(days=15, minutes=30),
                "status": "pending",  # Demo trạng thái chờ Admin duyệt (UC-06)
            },
            {
                "organizer_id": organizer_1.user_id,
                "title": "Kỹ năng Thuyết trình & Làm chủ Sân khấu",
                "description": "Rèn luyện sự tự tin, ngôn ngữ cơ thể và kỹ thuật trình bày ấn tượng.",
                "location": "Hội trường B",
                "start_at": now + timedelta(days=20),
                "end_at": now + timedelta(days=20, hours=3),
                "registration_open_at": None,
                "registration_close_at": None,
                "quota": 60,
                "checkin_code": "WS-CHECKIN-SPEAK26",
                "checkin_start_at": now + timedelta(days=20, minutes=-30),
                "checkin_end_at": now + timedelta(days=20, minutes=30),
                "status": "draft",  # Demo trạng thái Nháp (UC-03, UC-04, UC-05)
            },
            {
                "organizer_id": organizer_2.user_id,
                "title": "Career Orientation & CV Masterclass 2026",
                "description": "Định hướng nghề nghiệp, viết CV chuẩn ATS và kỹ thuật phỏng vấn chuyên nghiệp.",
                "location": "Hội trường A",
                "start_at": now - timedelta(days=2, hours=4),
                "end_at": now - timedelta(days=2, hours=1),
                "registration_open_at": now - timedelta(days=10),
                "registration_close_at": now - timedelta(days=3),
                "quota": 50,
                "checkin_code": "WS-CHECKIN-CAREER26",
                "checkin_start_at": now - timedelta(days=2, hours=4, minutes=30),
                "checkin_end_at": now - timedelta(days=2, hours=3, minutes=30),
                "status": "completed",  # Đã hoàn thành (Demo Điểm danh & Khảo sát)
            },
        ]

        created_workshops = {}
        for w in workshops_data:
            existing = db.query(Workshop).filter(Workshop.title == w["title"]).first()
            if not existing:
                new_ws = Workshop(**w)
                db.add(new_ws)
                db.flush()
                created_workshops[w["title"]] = new_ws
                print(f"  📅 Đã tạo Workshop: {w['title']} ({w['status']})")
            else:
                created_workshops[w["title"]] = existing

        ws_uiux = created_workshops["UI/UX Design Workshop: Từ Ý Tưởng Đến Prototyping"]
        ws_python = created_workshops["Python for Data Analysis & Visualization"]
        ws_career = created_workshops["Career Orientation & CV Masterclass 2026"]

        # 3. Seed Registrations & Waitlist (Demo BR-02, BR-03)
        # Workshop Python: Quota = 2 -> user_1, user_2 confirmed; user_3, user_4 in Waitlist
        regs_data = [
            # UI/UX Workshop
            {"workshop_id": ws_uiux.workshop_id, "user_id": user_1.user_id, "status": "confirmed", "waitlist_position": None, "confirmed_at": now},
            {"workshop_id": ws_uiux.workshop_id, "user_id": user_2.user_id, "status": "confirmed", "waitlist_position": None, "confirmed_at": now},
            # Python Workshop (Full Quota = 2 + 2 Waitlist)
            {"workshop_id": ws_python.workshop_id, "user_id": user_1.user_id, "status": "confirmed", "waitlist_position": None, "confirmed_at": now - timedelta(hours=3)},
            {"workshop_id": ws_python.workshop_id, "user_id": user_2.user_id, "status": "confirmed", "waitlist_position": None, "confirmed_at": now - timedelta(hours=2)},
            {"workshop_id": ws_python.workshop_id, "user_id": user_3.user_id, "status": "waitlist", "waitlist_position": 1, "confirmed_at": None},
            {"workshop_id": ws_python.workshop_id, "user_id": user_4.user_id, "status": "waitlist", "waitlist_position": 2, "confirmed_at": None},
            # Career Workshop (Attended + Survey)
            {"workshop_id": ws_career.workshop_id, "user_id": user_1.user_id, "status": "attended", "waitlist_position": None, "confirmed_at": now - timedelta(days=5)},
            {"workshop_id": ws_career.workshop_id, "user_id": user_2.user_id, "status": "attended", "waitlist_position": None, "confirmed_at": now - timedelta(days=5)},
            {"workshop_id": ws_career.workshop_id, "user_id": user_3.user_id, "status": "attended", "waitlist_position": None, "confirmed_at": now - timedelta(days=5)},
        ]

        created_regs = []
        for r in regs_data:
            existing = (
                db.query(Registration)
                .filter(Registration.workshop_id == r["workshop_id"], Registration.user_id == r["user_id"])
                .first()
            )
            if not existing:
                new_reg = Registration(
                    workshop_id=r["workshop_id"],
                    user_id=r["user_id"],
                    status=r["status"],
                    waitlist_position=r["waitlist_position"],
                    registered_at=now - timedelta(hours=1),
                    confirmed_at=r["confirmed_at"],
                )
                db.add(new_reg)
                db.flush()
                created_regs.append(new_reg)
            else:
                created_regs.append(existing)

        print("  🎟️ Đã tạo các bản ghi Registrations và Waitlist mẫu.")

        # 4. Seed Attendance & Surveys for Career Workshop
        career_regs = [r for r in created_regs if r.workshop_id == ws_career.workshop_id and r.status == "attended"]
        for reg in career_regs:
            # Attendance
            existing_att = db.query(Attendance).filter(Attendance.registration_id == reg.registration_id).first()
            if not existing_att:
                att = Attendance(
                    registration_id=reg.registration_id,
                    checkin_at=ws_career.start_at + timedelta(minutes=10),
                    checkin_method="qr",
                )
                db.add(att)

            # Survey
            existing_surv = db.query(Survey).filter(Survey.registration_id == reg.registration_id).first()
            if not existing_surv:
                surv = Survey(
                    registration_id=reg.registration_id,
                    rating=5 if reg.user_id == user_1.user_id else 4,
                    answers={"clarity": "Rất rõ ràng", "organization": "Chu đáo", "speaker": "Tuyệt vời"},
                    feedback="Buổi chia sẻ rất bổ ích và thiết thực!",
                    submitted_at=ws_career.end_at + timedelta(minutes=30),
                )
                db.add(surv)

        print("  📝 Đã tạo các bản ghi Điểm danh và Khảo sát đánh giá mẫu.")

        # 5. Seed Audit Logs (BR-10)
        log_audit_action(
            db=db,
            actor_id=admin_user.user_id,
            action="APPROVE_WORKSHOP",
            target_entity="Workshops",
            target_id=ws_uiux.workshop_id,
            old_value={"status": "pending"},
            new_value={"status": "published"},
            ip_address="127.0.0.1",
        )
        log_audit_action(
            db=db,
            actor_id=organizer_2.user_id,
            action="CREATE_WORKSHOP",
            target_entity="Workshops",
            target_id=ws_python.workshop_id,
            new_value={"title": ws_python.title, "quota": ws_python.quota},
            ip_address="127.0.0.1",
        )

        db.commit()
        print("🎉 Đã hoàn tất seed dữ liệu mẫu thành công!")
        print("\n🔑 Danh sách tài khoản mẫu:")
        print("  - Admin:       admin@workshop.edu.vn     / Pass: Admin@123")
        print("  - Organizer 1: organizer@workshop.edu.vn / Pass: Organizer@123")
        print("  - Organizer 2: organizer2@workshop.edu.vn/ Pass: Organizer@123")
        print("  - Participant: user@workshop.edu.vn      / Pass: User@123")
        print("  - Participant: hoai.td@workshop.edu.vn   / Pass: User@123")
        print("  - Participant: nam.nt@workshop.edu.vn    / Pass: User@123")
        print("  - Participant: nhi.ntt@workshop.edu.vn   / Pass: User@123")

    except Exception as e:
        db.rollback()
        print(f"❌ Lỗi khi seed dữ liệu: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
