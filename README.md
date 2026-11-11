# Hệ thống Quản lý Workshop Nội Bộ (TTTN_MIS_04)

> Đề tài thực tập tốt nghiệp ngành Hệ thống thông tin quản lý (MIS).<br />
> Xây dựng hệ thống số hóa quy trình tổ chức, đăng ký, điểm danh QR và khảo sát đánh giá Workshop nội bộ cho tổ chức/doanh nghiệp.

---

## 1. Giới thiệu Đề tài

Hệ thống Quản lý Workshop Nội Bộ hỗ trợ giải quyết bài toán quản lý sự kiện và nâng cao năng lực nhân sự trong tổ chức:
- **Quản trị viên (Admin)**: Quản lý người dùng nội bộ, phân quyền vai trò (RBAC), kiểm duyệt nội dung sự kiện và theo dõi nhật ký kiểm toán (Audit Logs) bất biến.
- **Ban tổ chức (Organizer)**: Khởi tạo sự kiện, thiết lập giới hạn số chỗ (Quota), điều phối lịch trình, trình chiếu mã QR điểm danh trực tiếp và xem báo cáo kết quả khảo sát.
- **Người tham gia (Participant)**: Khám phá sự kiện, đăng ký tham gia, tự động xếp hàng đợi (Waitlist) khi kín chỗ, quét QR check-in và gửi phản hồi khảo sát sau sự kiện.

---

## 2. Kiến trúc Hệ thống

- **Mô hình**: Client – Server (RESTful API)
- **Frontend**: React 19, Vite 8, React Router 7, Axios, QR Code Scanner (`html5-qrcode`).
- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0 (ORM), Pydantic v2, PyJWT.
- **Cơ sở dữ liệu**: Hỗ trợ đồng thời SQLite cục bộ (`tttn_mis_04.db`) và MySQL (`pymysql`). Hệ thống tự động fallback sang SQLite nếu chưa cài MySQL.
- **Bảo mật**:
  - Xác thực JWT Bearer Token với thuật toán HS256.
  - Phân quyền theo vai trò (Role-Based Access Control - RBAC).
  - Organizer Ownership Check: Ban tổ chức chỉ được quản trị sự kiện do chính mình tạo ra.
  - Audit Trail: Tự động ghi vết toàn bộ thao tác quan trọng vào bảng `AUDIT_LOGS`.

---

## 3. Quy tắc Nghiệp vụ (15 Business Rules - BR-01 đến BR-15)

1. **BR-01 (Chống đăng ký trùng)**: Mỗi người dùng chỉ được có tối đa 1 đăng ký hợp lệ (confirmed, waitlist hoặc attended) cho một Workshop.
2. **BR-02 (Kiểm soát Quota)**: Khi số lượng vé `confirmed` đạt giới hạn `quota`, các lượt đăng ký tiếp theo bắt buộc chuyển vào Danh sách chờ (`waitlist`).
3. **BR-03 (Tự động đôn hàng đợi)**: Khi có vé chính thức bị hủy (`cancelled`), hệ thống tự động tìm người đứng đầu hàng đợi (`waitlist_position = 1`) và nâng cấp thành vé chính thức (`confirmed`).
4. **BR-04 (Điểm danh QR kép)**: Hỗ trợ cả 2 phương thức điểm danh: Ban tổ chức quét QR vé của người tham gia hoặc người tham gia quét QR sự kiện do Ban tổ chức trình chiếu.
5. **BR-05 (Khung giờ điểm danh)**: Cổng điểm danh chỉ mở trong khoảng `checkin_start_at` đến `checkin_end_at`.
6. **BR-06 (Thời gian bắt đầu / kết thúc sự kiện)**: `end_at` phải diễn ra sau `start_at`.
7. **BR-07 (Khung giờ đăng ký)**: `registration_close_at` phải trước `start_at` và sau `registration_open_at`.
8. **BR-08 (Trạng thái công bố)**: Chỉ sự kiện ở trạng thái `published` mới được mở đăng ký cho người tham gia.
9. **BR-09 (Điều kiện làm khảo sát)**: Chỉ người tham gia đã được ghi nhận điểm danh (`attended`) mới được gửi khảo sát đánh giá.
10. **BR-10 (Đánh giá hợp lệ)**: Thang điểm đánh giá từ 1 đến 5 sao (`rating >= 1 and rating <= 5`).
11. **BR-11 (Hạn chế hủy vé)**: Người tham gia chỉ được hủy vé trước khi sự kiện bắt đầu hoặc trước mốc đóng đăng ký.
12. **BR-12 (Điều chỉnh Quota sau công bố)**: Ban tổ chức không được giảm `quota` nhỏ hơn số lượng vé đã xác nhận (`confirmed_count`). Nếu tăng `quota`, hệ thống tự động đôn người từ `waitlist`.
13. **BR-13 (Cưỡng chế hủy bởi Admin)**: Khi Admin hoặc Organizer hủy sự kiện, toàn bộ vé liên quan tự động chuyển sang `cancelled` và ghi vết kiểm toán.
14. **BR-14 (Chống điểm danh trùng)**: Mỗi lượt đăng ký chỉ được check-in thành công 1 lần duy nhất (bảo vệ bởi Row Lock và Unique Constraint).
15. **BR-15 (Quyền riêng tư nhật ký)**: Nhật ký kiểm toán `AUDIT_LOGS` là bảng dữ liệu bất biến (chỉ ghi, không cho phép sửa/xóa qua API).

---

## 4. Tài khoản Thử nghiệm Hệ thống

Hệ thống đã được seed sẵn cơ sở dữ liệu mẫu với các tài khoản:

| Vai trò | Email đăng nhập | Mật khẩu | Quyền hạn |
|---|---|---|---|
| **Quản trị viên (Admin)** | `admin@workshop.edu.vn` | `Admin@123` | Toàn quyền kiểm duyệt, quản lý User, xem Audit Logs, Dashboard |
| **Ban tổ chức 1 (Organizer)** | `organizer@workshop.edu.vn` | `Organizer@123` | Tạo sự kiện, quản lý người đăng ký, chiếu QR điểm danh, xem khảo sát |
| **Ban tổ chức 2 (Organizer)** | `organizer2@workshop.edu.vn` | `Organizer@123` | Quản lý workshop riêng của Organizer 2 |
| **Người tham gia 1 (Participant)** | `user@workshop.edu.vn` | `User@123` | Đăng ký workshop, xem vé, rút waitlist, quét QR check-in, đánh giá |
| **Người tham gia 2 (Participant)** | `user2@workshop.edu.vn` | `User@123` | Tài khoản học viên thử nghiệm |

---

## 5. Hướng dẫn Cài đặt & Chạy Dự án

### Yêu cầu môi trường
- Python >= 3.10
- Node.js >= 18 (Khuyên dùng v20 hoặc v24)
- Trình duyệt hiện đại (Chrome, Edge, Firefox, Safari)

---

### Bước 1: Khởi động Backend (FastAPI)

Mở terminal thứ nhất:

```bash
# 1. Di chuyển vào thư mục Server
cd Code/Server

# 2. Cài đặt dependency (nếu máy mới)
pip install -r requirements.txt

# 3. Khởi chạy Backend Server
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- **Backend API**: `http://127.0.0.1:8000`
- **Swagger Interactive API Docs**: `http://127.0.0.1:8000/docs`
- **ReDoc**: `http://127.0.0.1:8000/redoc`

*(Tùy chọn) Để khởi tạo lại dữ liệu mẫu sạch từ đầu:*
```bash
python scripts/seed_data.py
```

---

### Bước 2: Khởi động Frontend (React + Vite)

Mở terminal thứ hai:

```bash
# 1. Di chuyển vào thư mục Client
cd Code/Client

# 2. Cài đặt thư viện (nếu chưa cài)
npm install

# 3. Chạy môi trường phát triển
npm run dev
```

- **Frontend Website**: `http://localhost:5173`

---

## 6. Cải tiến UI/UX theo Chuẩn Quốc tế

1. **Global Toast Notification Stack**:
   - Nổi ở góc trên bên phải màn hình, không làm xô lệch bố cục trang (tránh layout shift / CLS).
   - Tự động ẩn sau 4.5 – 6 giây, có nút tắt `X` và màu sắc tương phản rõ ràng (`success`, `error`, `warning`, `info`).
2. **Accessible Modal & Confirm Dialog**:
   - Thay thế toàn bộ hộp thoại thô sơ `window.confirm()` bằng component `ConfirmDialog` với icon trạng thái, giải thích rủi ro và nút loading chống double-click.
   - Hỗ trợ đóng modal bằng phím `Escape` hoặc bấm backdrop, tự động khóa cuộn trang (`body scroll lock`) khi mở popup.
3. **Smart Error Handler**:
   - Tự động bóc tách lỗi từ FastAPI (422 Pydantic, 400 Bad Request, 403 Forbidden, 404, 500, lỗi mất kết nối mạng) thành câu thông báo tiếng Việt dễ hiểu và hướng dẫn cách khắc phục.
