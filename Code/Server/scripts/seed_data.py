from datetime import datetime, timedelta, timezone
import os
import sys
from typing import cast

# Thêm thư mục Server vào sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')  # type: ignore[union-attr]

from app.core.audit import log_audit_action
from app.core.database import Base, SessionLocal, engine
from app.core.security import get_password_hash
from app.models.attendance import Attendance
from app.models.registration import Registration
from app.models.survey import Survey
from app.models.user import User
from app.models.workshop import Workshop


def seed():
    print("🌱 Đang bắt đầu seed dữ liệu mẫu cho hệ thống...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
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
                "full_name": "Nguyễn Hải Nam",
                "email": "organizer@workshop.edu.vn",
                "password": "Organizer@123",
                "role": "organizer",
                "status": "active",
            },
            {
                "full_name": "Trần Minh Tuấn",
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
                "title": "ERP trong Doanh nghiệp: Triển khai và Quản trị SAP",
                "description": "Tổng quan về hệ thống hoạch định nguồn lực doanh nghiệp ERP, quy trình triển khai SAP S/4HANA, tích hợp module FI, MM, SD và quản trị vận hành trong môi trường doanh nghiệp thực tế.",
                "location": "Phòng A203, Tòa nhà Trung tâm Công nghệ",
                "start_at": now + timedelta(days=3, hours=2),
                "end_at": now + timedelta(days=3, hours=5),
                "registration_open_at": now - timedelta(days=2),
                "registration_close_at": now + timedelta(days=2),
                "quota": 40,
                "checkin_code": "WS-CHECKIN-ERP2026",
                "checkin_start_at": now + timedelta(days=3, hours=1, minutes=30),
                "checkin_end_at": now + timedelta(days=3, hours=2, minutes=30),
                "status": "published",
            },
            {
                "organizer_id": organizer_2.user_id,
                "title": "Phân tích Dữ liệu Kinh doanh với Power BI",
                "description": "Thực hành xây dựng dashboard kinh doanh, phân tích KPI và trực quan hóa dữ liệu bằng Power BI Desktop và Power BI Service. Áp dụng DAX, Power Query và mô hình dữ liệu hình sao trong MIS.",
                "location": "Lab B302, Khoa Hệ thống Thông tin Quản lý",
                "start_at": now + timedelta(days=6, hours=4),
                "end_at": now + timedelta(days=6, hours=7),
                "registration_open_at": now - timedelta(days=1),
                "registration_close_at": now + timedelta(days=5),
                "quota": 2,  # Quota nhỏ để demo tính năng Full & Waitlist
                "checkin_code": "WS-CHECKIN-POWERBI26",
                "checkin_start_at": now + timedelta(days=6, hours=3, minutes=30),
                "checkin_end_at": now + timedelta(days=6, hours=4, minutes=30),
                "status": "published",
            },
            {
                "organizer_id": organizer_1.user_id,
                "title": "Thiết kế Cơ sở Dữ liệu Quan hệ và Tối ưu Truy vấn SQL",
                "description": "Nâng cao kỹ năng thiết kế CSDL chuẩn hóa 3NF/BCNF, viết stored procedure, index tuning và tối ưu hóa truy vấn SQL Server phục vụ hệ thống thông tin quản lý doanh nghiệp.",
                "location": "Lab B301, Khoa Hệ thống Thông tin Quản lý",
                "start_at": now + timedelta(days=9, hours=1),
                "end_at": now + timedelta(days=9, hours=4),
                "registration_open_at": now - timedelta(hours=12),
                "registration_close_at": None,
                "quota": 30,
                "checkin_code": "WS-CHECKIN-SQL2026",
                "checkin_start_at": now + timedelta(days=9, hours=0, minutes=30),
                "checkin_end_at": now + timedelta(days=9, hours=1, minutes=30),
                "status": "published",
            },
            {
                "organizer_id": organizer_2.user_id,
                "title": "An toàn Thông tin và Bảo mật Hệ thống Quản lý",
                "description": "Các nguy cơ bảo mật trong hệ thống thông tin doanh nghiệp, giải pháp phòng thủ ISO/IEC 27001, mã hóa dữ liệu, xác thực đa lớp và audit trail trong môi trường MIS.",
                "location": "Hội trường C, Tòa nhà Trung tâm Công nghệ",
                "start_at": now + timedelta(days=14),
                "end_at": now + timedelta(days=14, hours=3),
                "registration_open_at": None,
                "registration_close_at": None,
                "quota": 50,
                "checkin_code": "WS-CHECKIN-SEC2026",
                "checkin_start_at": now + timedelta(days=14, minutes=-30),
                "checkin_end_at": now + timedelta(days=14, minutes=30),
                "status": "pending",
            },
            {
                "organizer_id": organizer_1.user_id,
                "title": "Quản lý Dự án Công nghệ Thông tin theo Agile/Scrum",
                "description": "Phương pháp quản lý dự án CNTT linh hoạt theo Agile, tổ chức sprint, sử dụng Jira và công cụ quản lý backlog. Thực hành vai trò Product Owner, Scrum Master và phân tích yêu cầu hệ thống.",
                "location": "Hội trường B, Khu A",
                "start_at": now + timedelta(days=21, hours=8),
                "end_at": now + timedelta(days=21, hours=11),
                "registration_open_at": None,
                "registration_close_at": None,
                "quota": 60,
                "checkin_code": "WS-CHECKIN-AGILE26",
                "checkin_start_at": now + timedelta(days=21, hours=7, minutes=30),
                "checkin_end_at": now + timedelta(days=21, hours=8, minutes=30),
                "status": "draft",
            },
            {
                "organizer_id": organizer_2.user_id,
                "title": "Chuyển đổi Số và Chiến lược Ứng dụng MIS trong Doanh nghiệp",
                "description": "Thực trạng chuyển đổi số tại Việt Nam, lộ trình ứng dụng hệ thống thông tin quản lý MIS, CRM, SCM và lợi ích đo lường được trong doanh nghiệp vừa và nhỏ.",
                "location": "Hội trường A, Tòa nhà Chính",
                "start_at": now - timedelta(days=2, hours=4),
                "end_at": now - timedelta(days=2, hours=1),
                "registration_open_at": now - timedelta(days=10),
                "registration_close_at": now - timedelta(days=3),
                "quota": 50,
                "checkin_code": "WS-CHECKIN-DX2026",
                "checkin_start_at": now - timedelta(days=2, hours=4, minutes=30),
                "checkin_end_at": now - timedelta(days=2, hours=3, minutes=30),
                "status": "completed",
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

        ws_erp = created_workshops["ERP trong Doanh nghiệp: Triển khai và Quản trị SAP"]
        ws_powerbi = created_workshops["Phân tích Dữ liệu Kinh doanh với Power BI"]
        ws_dx = created_workshops["Chuyển đổi Số và Chiến lược Ứng dụng MIS trong Doanh nghiệp"]

        # 3. Seed Registrations & Waitlist (Demo BR-02, BR-03)
        # Workshop Python: Quota = 2 -> user_1, user_2 confirmed; user_3, user_4 in Waitlist
        regs_data = [
            # ERP Workshop
            {"workshop_id": ws_erp.workshop_id, "user_id": user_1.user_id, "status": "confirmed", "waitlist_position": None, "confirmed_at": now},
            {"workshop_id": ws_erp.workshop_id, "user_id": user_2.user_id, "status": "confirmed", "waitlist_position": None, "confirmed_at": now},
            # Power BI Workshop (Full Quota = 2 + 2 Waitlist)
            {"workshop_id": ws_powerbi.workshop_id, "user_id": user_1.user_id, "status": "confirmed", "waitlist_position": None, "confirmed_at": now - timedelta(hours=3)},
            {"workshop_id": ws_powerbi.workshop_id, "user_id": user_2.user_id, "status": "confirmed", "waitlist_position": None, "confirmed_at": now - timedelta(hours=2)},
            {"workshop_id": ws_powerbi.workshop_id, "user_id": user_3.user_id, "status": "waitlist", "waitlist_position": 1, "confirmed_at": None},
            {"workshop_id": ws_powerbi.workshop_id, "user_id": user_4.user_id, "status": "waitlist", "waitlist_position": 2, "confirmed_at": None},
            # Chuyển đổi Số Workshop (Attended + Survey)
            {"workshop_id": ws_dx.workshop_id, "user_id": user_1.user_id, "status": "attended", "waitlist_position": None, "confirmed_at": now - timedelta(days=5)},
            {"workshop_id": ws_dx.workshop_id, "user_id": user_2.user_id, "status": "attended", "waitlist_position": None, "confirmed_at": now - timedelta(days=5)},
            {"workshop_id": ws_dx.workshop_id, "user_id": user_3.user_id, "status": "attended", "waitlist_position": None, "confirmed_at": now - timedelta(days=5)},
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
        career_regs = [r for r in created_regs if r.workshop_id == ws_dx.workshop_id and r.status == "attended"]
        for reg in career_regs:
            # Attendance
            existing_att = db.query(Attendance).filter(Attendance.registration_id == reg.registration_id).first()
            if not existing_att:
                att = Attendance(
                    registration_id=reg.registration_id,
                    checkin_at=ws_dx.start_at + timedelta(minutes=10),
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
                    submitted_at=ws_dx.end_at + timedelta(minutes=30),
                )
                db.add(surv)

        print("  📝 Đã tạo các bản ghi Điểm danh và Khảo sát đánh giá mẫu.")

        # 5. Seed Audit Logs (BR-10)
        log_audit_action(
            db=db,
            actor_id=cast(int, admin_user.user_id),
            action="APPROVE_WORKSHOP",
            target_entity="Workshops",
            target_id=cast(int, ws_erp.workshop_id),
            old_value={"status": "pending"},
            new_value={"status": "published"},
            ip_address="127.0.0.1",
        )
        log_audit_action(
            db=db,
            actor_id=cast(int, organizer_2.user_id),
            action="CREATE_WORKSHOP",
            target_entity="Workshops",
            target_id=cast(int, ws_powerbi.workshop_id),
            new_value={"title": ws_powerbi.title, "quota": ws_powerbi.quota},
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
