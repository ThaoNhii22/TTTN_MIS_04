import sys
from contextlib import asynccontextmanager

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.api_router import api_router
from app.core.config import settings
from app.core.database import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi tạo bảng CSDL nếu chưa tồn tại
    try:
        Base.metadata.create_all(bind=engine)
        print("Kết nối Database thành công và đã đồng bộ các bảng CSDL.")
    except Exception as e:
        print(f"Cảnh báo kết nối Database: {e}")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="""
## Hệ thống Quản lý Workshop Nội Bộ (TTTN_MIS_04)
Hệ thống backend API xây dựng bằng Python FastAPI + MySQL, hiện thực đầy đủ:
- **15 Business Rules (BR-01 đến BR-15)**
- **21 Use Cases (UC-01 đến UC-21)**
- **6 Bảng CSDL chuẩn theo Từ điển dữ liệu**: USERS, WORKSHOPS, REGISTRATIONS, ATTENDANCE, SURVEYS, AUDIT_LOGS
- **Bảo mật**: JWT Auth, Role-based Access Control (RBAC), Organizer Ownership Check, Server Audit Log bất biến.
    """,
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Cấu hình CORS toàn diện cho Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Kết nối các route API
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Hệ thống"])
def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "status": "online",
    }


@app.get("/health", tags=["Hệ thống"])
def health_check():
    return {"status": "healthy"}
