"""
Isolated verification script for Task 1 and Task 2.
Uses an isolated in-memory SQLite database.
Tests database transactions, cascading, audit log rollback,
survey eligibility rules, API endpoint handlers, response formatting, and schema validation.
"""
import sys
import os
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException, status, Request

from app.core.database import Base
from app.models.user import User
from app.models.workshop import Workshop
from app.models.registration import Registration
from app.models.attendance import Attendance
from app.models.survey import Survey
from app.models.audit_log import AuditLog
from app.schemas.survey import SurveySubmit, SurveyResponse
from app.schemas.registration import RegistrationResponse
from app.services.workshop_service import cancel_workshop
from app.services.survey_service import (
    check_survey_eligibility,
    is_survey_available,
    submit_workshop_survey,
    normalize_to_utc_naive,
)
from app.api.v1.surveys import submit_survey
from app.api.v1.registrations import format_registration_response, get_my_registrations

# Create completely isolated SQLite database
TEST_DB_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

TOTAL_PASS = 0
TOTAL_FAIL = 0
failed_tests = []

def record(name: str, condition: bool, details: str = ""):
    global TOTAL_PASS, TOTAL_FAIL
    if condition:
        TOTAL_PASS += 1
        print(f"  [PASS] {name}")
    else:
        TOTAL_FAIL += 1
        failed_tests.append(name)
        print(f"  [FAIL] {name} - Details: {details}")

print("=" * 75)
print("BẮT ĐẦU KIỂM THỬ TOÀN DIỆN CÔ LẬP TRÊN SQLITE (TASK 1 & TASK 2)")
print("=" * 75)

db = TestingSessionLocal()

# Seed Users
org_user = User(user_id=101, email="organizer101@test.com", password_hash="dummy", full_name="Organizer 101", role="organizer")
admin_user = User(user_id=102, email="admin102@test.com", password_hash="dummy", full_name="Admin 102", role="admin")
user_a = User(user_id=103, email="usera103@test.com", password_hash="dummy", full_name="User A 103", role="participant")
user_b = User(user_id=104, email="userb104@test.com", password_hash="dummy", full_name="User B 104", role="participant")
user_c = User(user_id=105, email="userc105@test.com", password_hash="dummy", full_name="User C 105", role="participant")
user_d = User(user_id=106, email="userd106@test.com", password_hash="dummy", full_name="User D 106", role="participant")
user_e = User(user_id=107, email="usere107@test.com", password_hash="dummy", full_name="User E 107", role="participant")

db.add_all([org_user, admin_user, user_a, user_b, user_c, user_d, user_e])
db.commit()

# =============================================================================
# TASK 1: HỦY WORKSHOP CASCADING, LƯU VẾT VÀ ROLLBACK GIAO DỊCH
# =============================================================================
print("\n[TASK 1] KIỂM THỬ: Hủy Workshop, Cascading vé còn hiệu lực, Audit Log & Rollback")

now = datetime.now(timezone.utc).replace(tzinfo=None)
ws1 = Workshop(
    workshop_id=1001,
    organizer_id=org_user.user_id,
    title="Workshop Kiểm Thử Hủy",
    quota=10,
    start_at=now + timedelta(days=2),
    end_at=now + timedelta(days=2, hours=3),
    checkin_start_at=now + timedelta(days=2, hours=-1),
    checkin_end_at=now + timedelta(days=2, hours=1),
    status="published",
)
db.add(ws1)
db.commit()

old_cancel_time = now - timedelta(days=3)
r_registered = Registration(registration_id=2001, workshop_id=1001, user_id=user_a.user_id, status="registered")
r_confirmed = Registration(registration_id=2002, workshop_id=1001, user_id=user_b.user_id, status="confirmed")
r_waitlist = Registration(registration_id=2003, workshop_id=1001, user_id=user_c.user_id, status="waitlist", waitlist_position=1)
r_attended = Registration(registration_id=2004, workshop_id=1001, user_id=user_d.user_id, status="attended")
r_cancelled = Registration(
    registration_id=2005,
    workshop_id=1001,
    user_id=user_e.user_id,
    status="cancelled",
    cancel_reason="Lý do tự hủy ban đầu",
    cancelled_at=old_cancel_time,
)
db.add_all([r_registered, r_confirmed, r_waitlist, r_attended, r_cancelled])
db.commit()

att_record = Attendance(
    attendance_id=3001,
    registration_id=2004,
    checkin_method="qr",
    status="present",
    checkin_at=now - timedelta(hours=1),
)
db.add(att_record)
db.commit()

# 1.1 Thực hiện hủy workshop bởi Organizer
cancel_workshop(db, ws1, "Khẩn cấp: Trùng lịch cơ sở vật chất", org_user, ip_address="192.168.1.100")
db.refresh(ws1)

record("1.1 Workshop chuyển status = cancelled", ws1.status == "cancelled")
record("1.2 Workshop lưu đúng cancel_reason", ws1.cancel_reason == "Khẩn cấp: Trùng lịch cơ sở vật chất")

# 1.3 Kiểm tra 4 trạng thái còn hiệu lực (registered, confirmed, waitlist, attended)
for reg_id, orig_status in [(2001, "registered"), (2002, "confirmed"), (2003, "waitlist"), (2004, "attended")]:
    r = db.query(Registration).filter(Registration.registration_id == reg_id).first()
    is_cancelled = r.status == "cancelled"
    has_reason = "Khẩn cấp: Trùng lịch cơ sở vật chất" in (r.cancel_reason or "")
    has_time = r.cancelled_at is not None
    pos_cleared = r.waitlist_position is None
    record(
        f"1.3.{reg_id} Lượt {orig_status} chuyển thành cancelled, lưu lý do, thời điểm, xóa waitlist_position",
        is_cancelled and has_reason and has_time and pos_cleared,
        f"status={r.status}, reason={r.cancel_reason}, time={r.cancelled_at}, pos={r.waitlist_position}",
    )

# 1.4 Kiểm tra lượt đã cancelled trước đó KHÔNG bị thay đổi
r_prev_cancel = db.query(Registration).filter(Registration.registration_id == 2005).first()
record(
    "1.4 Lượt đã cancelled từ trước giữ nguyên lý do và thời điểm cũ",
    r_prev_cancel.cancel_reason == "Lý do tự hủy ban đầu" and r_prev_cancel.cancelled_at == old_cancel_time,
    f"reason={r_prev_cancel.cancel_reason}, time={r_prev_cancel.cancelled_at}",
)

# 1.5 Kiểm tra Attendance không bị xóa
att_check = db.query(Attendance).filter(Attendance.registration_id == 2004).first()
record("1.5 Lịch sử Attendance của vé attended vẫn được bảo toàn nguyên vẹn", att_check is not None and att_check.status == "present")

# 1.6 Kiểm tra Audit Log
audit_entry = (
    db.query(AuditLog)
    .filter(AuditLog.target_entity == "Workshops", AuditLog.target_id == 1001)
    .order_by(AuditLog.audit_log_id.desc())
    .first()
)
record("1.6 Audit log ghi đúng action CANCEL_BY_ORGANIZER", audit_entry is not None and audit_entry.action == "CANCEL_BY_ORGANIZER")
record("1.7 Audit log ghi đúng số vé thực sự chuyển sang cancelled (4 vé)", audit_entry.new_value.get("cancelled_registrations_count") == 4)

# 1.8 Mô phỏng lỗi ghi Audit Log -> Workshop và vé phải Rollback toàn bộ
ws_rollback = Workshop(
    workshop_id=1002,
    organizer_id=org_user.user_id,
    title="Workshop Test Rollback",
    quota=5,
    start_at=now + timedelta(days=1),
    end_at=now + timedelta(days=1, hours=2),
    checkin_start_at=now + timedelta(days=1, hours=-1),
    checkin_end_at=now + timedelta(days=1, hours=1),
    status="published",
)
reg_rb1 = Registration(registration_id=2010, workshop_id=1002, user_id=user_a.user_id, status="confirmed")
reg_rb2 = Registration(registration_id=2011, workshop_id=1002, user_id=user_b.user_id, status="waitlist", waitlist_position=1)
db.add_all([ws_rollback, reg_rb1, reg_rb2])
db.commit()

with patch("app.services.workshop_service.log_audit_action", side_effect=RuntimeError("Mô phỏng lỗi DB khi ghi Audit Log")):
    try:
        cancel_workshop(db, ws_rollback, "Thử hủy", org_user)
        record("1.8 Exception được ném khi Audit Log lỗi", False)
    except RuntimeError:
        record("1.8 Exception được ném khi Audit Log lỗi", True)

db.expire_all()
ws_check = db.query(Workshop).filter(Workshop.workshop_id == 1002).first()
r_rb1_check = db.query(Registration).filter(Registration.registration_id == 2010).first()
r_rb2_check = db.query(Registration).filter(Registration.registration_id == 2011).first()

record("1.9 Workshop rollback giữ nguyên status = published", ws_check.status == "published", f"status={ws_check.status}")
record("1.10 Registration 1 rollback giữ nguyên status = confirmed", r_rb1_check.status == "confirmed", f"status={r_rb1_check.status}")
record("1.11 Registration 2 rollback giữ nguyên status = waitlist và position = 1", r_rb2_check.status == "waitlist" and r_rb2_check.waitlist_position == 1)

# =============================================================================
# TASK 2: ĐIỀU KIỆN KHẢO SÁT, HELPER DÙNG CHUNG VÀ API ENDPOINTS
# =============================================================================
print("\n[TASK 2] KIỂM THỬ: Điều kiện khảo sát, Helper dùng chung và API endpoints")

# Workshop A: Đang diễn ra (now < end_at)
ws_ongoing = Workshop(
    workshop_id=1003,
    organizer_id=org_user.user_id,
    title="Workshop Đang Diễn Ra",
    quota=10,
    start_at=now - timedelta(hours=1),
    end_at=now + timedelta(hours=2),
    checkin_start_at=now - timedelta(hours=2),
    checkin_end_at=now,
    status="published",
)
# Workshop B: Đã kết thúc (now > end_at)
ws_ended = Workshop(
    workshop_id=1004,
    organizer_id=org_user.user_id,
    title="Workshop Đã Kết Thúc",
    quota=10,
    start_at=now - timedelta(hours=4),
    end_at=now - timedelta(hours=1),
    checkin_start_at=now - timedelta(hours=5),
    checkin_end_at=now - timedelta(hours=3),
    status="published",
)
# Workshop C: Đã hủy (cancelled)
ws_cancelled = Workshop(
    workshop_id=1005,
    organizer_id=org_user.user_id,
    title="Workshop Đã Hủy",
    quota=10,
    start_at=now - timedelta(hours=4),
    end_at=now - timedelta(hours=1),
    checkin_start_at=now - timedelta(hours=5),
    checkin_end_at=now - timedelta(hours=3),
    status="cancelled",
)

db.add_all([ws_ongoing, ws_ended, ws_cancelled])
db.commit()

# Đăng ký kiểm thử
reg_ongoing_att = Registration(registration_id=2020, workshop_id=1003, user_id=user_a.user_id, status="attended")
reg_ended_att = Registration(registration_id=2021, workshop_id=1004, user_id=user_a.user_id, status="attended")
reg_ended_conf = Registration(registration_id=2022, workshop_id=1004, user_id=user_d.user_id, status="confirmed")
reg_cancelled_att = Registration(registration_id=2023, workshop_id=1005, user_id=user_c.user_id, status="attended")
reg_for_user_b = Registration(registration_id=2024, workshop_id=1004, user_id=user_b.user_id, status="attended")

db.add_all([reg_ongoing_att, reg_ended_att, reg_ended_conf, reg_cancelled_att, reg_for_user_b])
db.commit()

# 2.1 Đã điểm danh nhưng sự kiện chưa kết thúc (now < end_at)
el_ongoing, msg_ongoing = check_survey_eligibility(reg_ongoing_att, db=db)
record("2.1 Đã điểm danh nhưng chưa kết thúc -> check_survey_eligibility từ chối", not el_ongoing and "kết thúc" in (msg_ongoing or ""))
record("2.2 is_survey_available trả về False khi chưa kết thúc", not is_survey_available(reg_ongoing_att, db=db))

# 2.3 Đúng thời điểm end_at (now == end_at) -> Từ chối
el_exact, msg_exact = check_survey_eligibility(reg_ended_att, db=db, now=ws_ended.end_at)
record("2.3 Đúng end_at (now == end_at) -> check_survey_eligibility từ chối", not el_exact and "kết thúc" in (msg_exact or ""))

# 2.4 Sau thời điểm end_at (now > end_at) và đã điểm danh -> Cho phép
el_after, _ = check_survey_eligibility(reg_ended_att, db=db)
record("2.4 Sau end_at và đã điểm danh (attended) -> check_survey_eligibility cho phép", el_after)
record("2.5 is_survey_available trả về True khi đủ điều kiện", is_survey_available(reg_ended_att, db=db))

# 2.6 Đã kết thúc nhưng chưa điểm danh (status = confirmed) -> Từ chối
el_conf, msg_conf = check_survey_eligibility(reg_ended_conf, db=db)
record("2.6 Chưa điểm danh (confirmed) -> check_survey_eligibility từ chối", not el_conf and "điểm danh" in (msg_conf or ""))

# 2.7 Workshop đã hủy dù registration là attended -> Từ chối
el_canc, msg_canc = check_survey_eligibility(reg_cancelled_att, db=db)
record("2.7 Workshop cancelled -> check_survey_eligibility từ chối", not el_canc and "hủy" in (msg_canc or ""))

# 2.8 Kiểm tra response formatting chứa trường is_survey_available
fmt_eligible = format_registration_response(reg_ended_att, db=db)
record("2.8 format_registration_response có trường is_survey_available = True", fmt_eligible.get("is_survey_available") is True)
fmt_ineligible = format_registration_response(reg_ongoing_att, db=db)
record("2.9 format_registration_response có trường is_survey_available = False cho sự kiện chưa kết thúc", fmt_ineligible.get("is_survey_available") is False)

# 2.10 Kiểm tra Pydantic Schema SurveySubmit với answers = None -> tự động thành {}
schema_null_answers = SurveySubmit(registration_id=2021, rating=5, answers=None, feedback="Tốt")
record("2.10 SurveySubmit tự động chuẩn hóa answers=None thành object {}", schema_null_answers.answers == {})

# 2.11 Kiểm tra API Endpoint: submit_survey
dummy_request = MagicMock(spec=Request)
dummy_request.headers = {}
dummy_request.client = MagicMock()
dummy_request.client.host = "127.0.0.1"

# 2.11.1 Gửi khảo sát cho đăng ký của người khác -> 403 Forbidden
try:
    submit_survey(
        survey_in=SurveySubmit(registration_id=2021, rating=5, answers={}),
        request=dummy_request,
        db=db,
        current_user=user_b,  # user_b gửi cho registration 2021 của user_a
    )
    record("2.11.1 Gửi khảo sát cho đăng ký người khác ném 403", False)
except HTTPException as e:
    record("2.11.1 Gửi khảo sát cho đăng ký người khác bị từ chối với HTTP 403", e.status_code == status.HTTP_403_FORBIDDEN)

# 2.11.2 Gửi khảo sát khi workshop chưa kết thúc qua API -> 400 Bad Request
try:
    submit_survey(
        survey_in=SurveySubmit(registration_id=2020, rating=5, answers={}),
        request=dummy_request,
        db=db,
        current_user=user_a,
    )
    record("2.11.2 Gửi khảo sát khi chưa kết thúc ném 400", False)
except HTTPException as e:
    record("2.11.2 Gửi khảo sát khi chưa kết thúc bị từ chối với HTTP 400", e.status_code == status.HTTP_400_BAD_REQUEST and "kết thúc" in e.detail)

# 2.11.3 Gửi khảo sát cho workshop đã hủy qua API -> 400 Bad Request
try:
    submit_survey(
        survey_in=SurveySubmit(registration_id=2023, rating=5, answers={}),
        request=dummy_request,
        db=db,
        current_user=user_c,
    )
    record("2.11.3 Gửi khảo sát cho workshop đã hủy ném 400", False)
except HTTPException as e:
    record("2.11.3 Gửi khảo sát cho workshop đã hủy bị từ chối với HTTP 400", e.status_code == status.HTTP_400_BAD_REQUEST and "hủy" in e.detail)

# 2.11.4 Gửi khảo sát hợp lệ lần đầu qua API -> Thành công HTTP 201 Response
res_submit_ok = submit_survey(
    survey_in=SurveySubmit(registration_id=2021, rating=5, answers={"quality": 5}, feedback="Khóa học rất bổ ích"),
    request=dummy_request,
    db=db,
    current_user=user_a,
)
record("2.11.4 Gửi khảo sát hợp lệ thành công qua API endpoint", res_submit_ok.get("rating") == 5 and res_submit_ok.get("registration_id") == 2021)

# Kiểm tra bản ghi Survey và Audit Log được tạo trong CSDL
survey_saved = db.query(Survey).filter(Survey.registration_id == 2021).first()
record("2.11.5 Bản ghi Survey được lưu chính xác trong database", survey_saved is not None and survey_saved.rating == 5 and survey_saved.answers == {"quality": 5})

survey_audit = db.query(AuditLog).filter(AuditLog.target_entity == "Surveys", AuditLog.action == "SUBMIT_SURVEY").first()
record("2.11.6 Audit Log SUBMIT_SURVEY được tạo trong cùng transaction", survey_audit is not None and survey_audit.actor_id == user_a.user_id)

# 2.11.7 is_survey_available chuyển sang False sau khi gửi thành công
fmt_after_survey = format_registration_response(reg_ended_att, db=db)
record("2.11.7 format_registration_response chuyển is_survey_available = False sau khi đã gửi", fmt_after_survey.get("is_survey_available") is False)

# 2.11.8 Gửi trùng lần 2 qua API -> 400 Bad Request
try:
    submit_survey(
        survey_in=SurveySubmit(registration_id=2021, rating=4, answers={}),
        request=dummy_request,
        db=db,
        current_user=user_a,
    )
    record("2.11.8 Gửi khảo sát trùng ném 400", False)
except HTTPException as e:
    record("2.11.8 Gửi khảo sát trùng bị từ chối với HTTP 400", e.status_code == status.HTTP_400_BAD_REQUEST and "hoàn thành" in e.detail)

# 2.12 Kiểm tra get_my_registrations API endpoint trả về is_survey_available
my_regs = get_my_registrations(status_filter=None, db=db, current_user=user_b)
reg_b_item = next((r for r in my_regs if r["registration_id"] == 2024), None)
record("2.12 get_my_registrations trả về is_survey_available = True cho user B đủ điều kiện", reg_b_item is not None and reg_b_item.get("is_survey_available") is True)

print("\n" + "=" * 75)
print(f"KẾT QUẢ TỔNG CỘNG: {TOTAL_PASS} PASSED  |  {TOTAL_FAIL} FAILED")
print("=" * 75)

if TOTAL_FAIL == 0:
    print(">>> TẤT CẢ 30/30 BÀI KIỂM THỬ ĐÃ THÀNH CÔNG XUẤT SẮC! <<<")
    sys.exit(0)
else:
    print(f">>> CÓ {TOTAL_FAIL} BÀI KIỂM THỬ THẤT BẠI: {failed_tests} <<<")
    sys.exit(1)
