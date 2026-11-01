from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

_connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(settings.DATABASE_URL, connect_args=_connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    """Tạo bảng và khởi tạo dữ liệu mẫu (3 Actor: student, enterprise, admin) khi khởi động app."""
    from app import models  # noqa: F401  (đăng ký model vào Base.metadata)
    from app.services.auth_service import seed_initial_data

    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_initial_data(db)


def get_db():
    """Dependency cung cấp session CSDL cho từng request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
