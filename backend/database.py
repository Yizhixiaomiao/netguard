from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from models import Base, Device, Backup, Template
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./netguard.db?check_same_thread=False")

engine = create_engine(
    DATABASE_URL, 
    echo=False, 
    connect_args={"check_same_thread": False},
    pool_pre_ping=True
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    with engine.connect() as conn:
        conn.execute(text("PRAGMA encoding = 'UTF-8'"))
        conn.commit()
    
    Base.metadata.create_all(bind=engine)
    print("Database initialized successfully")
