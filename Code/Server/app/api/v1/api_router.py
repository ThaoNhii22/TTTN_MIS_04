from fastapi import APIRouter

from app.api.v1.attendance import router as attendance_router
from app.api.v1.audit_logs import router as audit_logs_router
from app.api.v1.auth import router as auth_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.registrations import router as registrations_router
from app.api.v1.surveys import router as surveys_router
from app.api.v1.users import router as users_router
from app.api.v1.workshops import router as workshops_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(workshops_router)
api_router.include_router(registrations_router)
api_router.include_router(attendance_router)
api_router.include_router(surveys_router)
api_router.include_router(dashboard_router)
api_router.include_router(audit_logs_router)
