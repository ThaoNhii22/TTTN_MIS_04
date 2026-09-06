import os
import sys
from urllib.parse import urlparse
import pymysql

# Thêm thư mục Server vào sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.stdout.reconfigure(encoding='utf-8')

from sqlalchemy import text
from app.core.config import settings
from app.core.database import Base, engine
import app.models  # Nạp toàn bộ metadata của 6 models


def init_database():
    print("🚀 Đang khởi tạo cơ sở dữ liệu MySQL cho Hệ thống Quản lý Workshop Nội Bộ...")

    parsed = urlparse(settings.DATABASE_URL.replace("mysql+pymysql://", "mysql://"))
    db_name = parsed.path.lstrip("/").split("?")[0]
    user = parsed.username or "root"
    password = parsed.password or ""
    host = parsed.hostname or "localhost"
    port = parsed.port or 3306

    print(f"📡 Đang kết nối tới MySQL Server tại {host}:{port} (User: {user})...")

    # 1. Tạo database nếu chưa tồn tại
    try:
        conn = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            charset="utf8mb4",
        )
        with conn.cursor() as cursor:
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
            )
        conn.commit()
        conn.close()
        print(f"✅ Đã kiểm tra/tạo CSDL `{db_name}` thành công.")
    except Exception as e:
        print(f"❌ Lỗi khi tạo database trên MySQL: {e}")
        print("💡 Vui lòng kiểm tra lại thông tin kết nối trong file .env hoặc đảm bảo MySQL Service đang chạy.")
        return False

    # 2. Tạo các bảng theo Models SQLAlchemy
    try:
        print("🔨 Đang tạo 6 bảng CSDL (USERS, WORKSHOPS, REGISTRATIONS, ATTENDANCE, SURVEYS, AUDIT_LOGS)...")
        Base.metadata.create_all(bind=engine)

        # 3. Đảm bảo đồng bộ các cột mới nếu bảng đã tồn tại từ trước
        with engine.connect() as conn:
            try:
                conn.execute(text("ALTER TABLE `ATTENDANCE` ADD COLUMN `status` ENUM('present', 'invalid') NOT NULL DEFAULT 'present' AFTER `checkin_method`;"))
                conn.commit()
                print("✅ Đã bổ sung cột `status` vào bảng `ATTENDANCE`.")
            except Exception:
                pass  # Cột đã tồn tại hoặc đang dùng SQLite

        print("✅ Đã tạo/đồng bộ thành công toàn bộ các bảng CSDL!")
        return True
    except Exception as e:
        print(f"❌ Lỗi khi tạo bảng CSDL: {e}")
        return False


if __name__ == "__main__":
    init_database()
