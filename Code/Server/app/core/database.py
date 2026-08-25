import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

Base = declarative_base()


def create_db_engine():
    db_url = settings.DATABASE_URL
    try:
        if db_url.startswith("sqlite"):
            return create_engine(db_url, connect_args={"check_same_thread": False})

        # Thử kết nối MySQL
        engine_instance = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_recycle=3600,
            echo=False,
        )
        with engine_instance.connect() as conn:
            pass
        return engine_instance
    except Exception as e:
        logger.warning(f"⚠️ Không thể kết nối MySQL ({e}). Tự động fallback sang SQLite cục bộ (tttn_mis_04.db).")
        sqlite_url = "sqlite:///./tttn_mis_04.db"
        return create_engine(sqlite_url, connect_args={"check_same_thread": False})


engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

