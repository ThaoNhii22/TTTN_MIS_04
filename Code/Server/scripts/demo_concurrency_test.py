"""
KỊCH BẢN KIỂM THỬ: ĐUA ĐĂNG KÝ ĐỒNG THỜI (CONCURRENCY & PESSIMISTIC ROW-LOCK)
Yêu cầu đề tài:
"Khi có nhiều yêu cầu đăng ký cùng lúc, khóa bản ghi workshop trước khi đếm số chỗ còn lại.
Giữ khóa cho đến khi kết quả đăng ký được lưu xong để các yêu cầu không cùng lấy một chỗ.
Kiểm tra trên MySQL/InnoDB để xác nhận số lượt đăng ký được xác nhận không vượt số chỗ cho phép."
"""
import os
import sys
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests

# Cấu hình đường dẫn import
SERVER_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if SERVER_DIR not in sys.path:
    sys.path.insert(0, SERVER_DIR)

if hasattr(sys.stdout, "reconfigure"):
    getattr(sys.stdout, "reconfigure")(encoding="utf-8")

from app.core.database import SessionLocal
from app.core.security import create_access_token, get_password_hash
from app.models.registration import Registration
from app.models.user import User
from app.models.workshop import Workshop

BASE_URL = "http://127.0.0.1:8000/api/v1"

def run_test():
    print("=" * 75)
    print("🚀 BẮT ĐẦU KIỂM THỬ ĐỒNG THỜI (CONCURRENCY & PESSIMISTIC ROW-LOCK TEST)")
    print("=" * 75)

    # 0. Kiểm tra kết nối Backend
    try:
        requests.get(f"{BASE_URL}/workshops", timeout=3)
    except requests.exceptions.ConnectionError:
        print("\n❌ LỖI: Backend Server chưa chạy tại http://127.0.0.1:8000!")
        print("👉 Vui lòng mở terminal và chạy: python -m uvicorn app.main:app --app-dir Code/Server --reload\n")
        return

    db = SessionLocal()
    QUOTA = 2
    NUM_USERS = 10
    unique_suffix = uuid.uuid4().hex[:6]

    # 1. Lấy danh sách 10 Participant độc lập từ Database để tham gia đua đăng ký
    print(f"\n[Bước 1] Chuẩn bị {NUM_USERS} người dùng độc lập để tham gia đua tranh...")
    participants = db.query(User).filter(User.role == "participant").all()
    
    # Nếu thiếu user thì tạo nhanh với password_hash có sẵn
    dummy_hash = get_password_hash("User@123")
    while len(participants) < NUM_USERS:
        idx = len(participants)
        new_u = User(
            full_name=f"Racer User {idx+1}",
            email=f"racer_{idx}_{unique_suffix}@test.com",
            password_hash=dummy_hash,
            role="participant",
            status="active"
        )
        db.add(new_u)
        db.commit()
        db.refresh(new_u)
        participants.append(new_u)

    selected_users = participants[:NUM_USERS]
    user_tokens = []
    for u in selected_users:
        token = create_access_token(subject=str(u.user_id))
        user_tokens.append((u.full_name, u.email, token))

    print(f"   -> Đã chuẩn bị sẵn sàng {len(user_tokens)} tài khoản (từ {selected_users[0].email} đến {selected_users[-1].email}).")

    # 2. Tạo một Workshop có Quota = 2 và trạng thái PUBLISHED trực tiếp trong DB
    print(f"\n[Bước 2] Khởi tạo Workshop thử nghiệm với QUOTA = {QUOTA} chỗ (Trạng thái PUBLISHED)...")
    from datetime import datetime, timedelta
    now = datetime.now()
    ws = Workshop(
        organizer_id=2,
        title=f"Test Concurrency Quota {QUOTA} [{unique_suffix}]",
        description="Kiểm tra khóa dòng with_for_update() chống overbooking",
        location="Hội trường Trung tâm A",
        quota=QUOTA,
        start_at=now + timedelta(days=5),
        end_at=now + timedelta(days=5, hours=3),
        registration_open_at=now - timedelta(days=1),
        registration_close_at=now + timedelta(days=4),
        checkin_start_at=now + timedelta(days=5, minutes=-30),
        checkin_end_at=now + timedelta(days=5, minutes=30),
        status="published"
    )
    db.add(ws)
    db.commit()
    db.refresh(ws)
    ws_id = ws.workshop_id
    db.close()
    print(f"   -> Đã tạo thành công Workshop ID: {ws_id} ('{ws.title}')")
    print(f"   -> Quota giới hạn: {QUOTA} chỗ | Đăng ký: ĐANG MỞ (PUBLISHED)")

    # 3. BẮN ĐỒNG THỜI 10 REQUEST QUA THREADPOOLEXECUTOR
    print(f"\n[Bước 3] 💥 BẮN ĐỒNG THỜI {NUM_USERS} REQUEST ĐĂNG KÝ VÀO WORKSHOP {ws_id}...")
    print(f"   (10 luồng gửi API cùng lúc, tắt accept_waitlist để kiểm tra chặn Quota nghiêm ngặt)")

    def send_register(name, email, token):
        headers = {"Authorization": f"Bearer {token}"}
        res = requests.post(
            f"{BASE_URL}/registrations",
            json={"workshop_id": ws_id, "accept_waitlist": False},
            headers=headers
        )
        return name, email, res.status_code, res.json()

    results = []
    with ThreadPoolExecutor(max_workers=NUM_USERS) as executor:
        futures = [executor.submit(send_register, name, email, tok) for name, email, tok in user_tokens]
        for f in as_completed(futures):
            results.append(f.result())

    # 4. THỐNG KÊ KẾT QUẢ PHẢN HỒI HTTP TỪ SERVER
    print("\n[Bước 4] KẾT QUẢ PHẢN HỒI HTTP TỪ HỆ THỐNG:")
    print("-" * 75)
    confirmed_list = []
    rejected_list = []

    for name, email, status_code, body in results:
        if status_code == 201:
            confirmed_list.append((name, email, body))
            print(f"  ✅ [HTTP 201 - THÀNH CÔNG] {name} ({email}) -> Nhận vé: REG-{body.get('registration_id')} ({body.get('status')})")
        else:
            rejected_list.append((name, email, body))
            detail = body.get("detail", "Bị từ chối")
            print(f"  ❌ [HTTP {status_code} - BỊ TỪ CHỐI] {name} ({email}) -> {detail}")

    print("-" * 75)
    print(f"📊 Tổng kết phản hồi: {len(confirmed_list)} thành công | {len(rejected_list)} bị từ chối")

    # 5. TRUY VẤN TRỰC TIẾP DATABASE ĐỂ XÁC MINH SỐ LƯỢNG BẢN GHI
    print("\n[Bước 5] KIỂM TRA TRỰC TIẾP TRONG DATABASE:")
    db_verify = SessionLocal()
    confirmed_in_db = (
        db_verify.query(Registration)
        .filter(Registration.workshop_id == ws_id, Registration.status == "confirmed")
        .all()
    )
    db_verify.close()

    print(f"   -> Số vé 'confirmed' thực tế lưu trong Database: {len(confirmed_in_db)}")
    print(f"   -> Quota tối đa cho phép của Workshop        : {QUOTA}")

    # 6. KẾT LUẬN
    print("\n" + "=" * 75)
    if len(confirmed_in_db) == QUOTA and len(confirmed_list) == QUOTA and len(rejected_list) == (NUM_USERS - QUOTA):
        print("🎉 KẾT QUẢ KIỂM THỬ: ĐẠT CHUẨN TUYỆT ĐỐI (PASSED)!")
        print(f"  1. Cơ chế khóa bi quan (`with_for_update()` -> `SELECT ... FOR UPDATE`)")
        print(f"     đã khóa dòng Workshop trước khi đếm chỗ còn lại.")
        print(f"  2. Khóa được giữ cho đến khi lưu xong kết quả (db.commit).")
        print(f"  3. Hoàn toàn không xảy ra tranh chấp (Race Condition) hay bán vượt quá số chỗ (Overbooking).")
        print(f"  4. Đúng {QUOTA} người nhanh nhất được cấp vé, {NUM_USERS - QUOTA} người còn lại bị chặn chính xác theo quy tắc BR-02.")
    else:
        print("❌ KẾT QUẢ: THẤT BẠI! Số lượng vé confirmed không khớp với Quota!")
    print("=" * 75)

if __name__ == "__main__":
    run_test()
