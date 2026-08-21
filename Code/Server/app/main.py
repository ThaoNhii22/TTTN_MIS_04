from contextlib import asynccontextmanager
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
        print("✅ Kết nối Database thành công và đã đồng bộ các bảng CSDL.")
    except Exception as e:
        print(f"⚠️ Cảnh báo kết nối Database: {e}")
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

# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
