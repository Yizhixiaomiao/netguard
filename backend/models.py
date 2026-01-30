from sqlalchemy import Column, String, Integer, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Device(Base):
    __tablename__ = "devices"
    
    id = Column(String, primary_key=True)
    name = Column(String(100), nullable=False)
    ip = Column(String(50), nullable=False, unique=True)
    vendor = Column(String(50), nullable=False)
    location = Column(String(100), default="未知")
    last_backup = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Backup(Base):
    __tablename__ = "backups"
    
    id = Column(String, primary_key=True)
    switch_id = Column(String, nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    content = Column(Text, nullable=False)
    filename = Column(String(255), nullable=True)
    commands = Column(String(1000), nullable=True)
    template_name = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Template(Base):
    __tablename__ = "templates"
    
    id = Column(String, primary_key=True)
    name = Column(String(100), nullable=False)
    username = Column(String(100), nullable=False)
    password = Column(String(255), nullable=False)
    port = Column(Integer, default=22)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

