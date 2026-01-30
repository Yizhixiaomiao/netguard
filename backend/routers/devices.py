from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from database import get_db
from models import Device as DBDevice
import uuid
from datetime import datetime

router = APIRouter()

class DeviceCreate(BaseModel):
    name: str
    ip: str
    vendor: str
    location: Optional[str] = "未知"

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    ip: Optional[str] = None
    vendor: Optional[str] = None
    location: Optional[str] = None

class Device(BaseModel):
    id: str
    name: str
    ip: str
    vendor: str
    location: str
    last_backup: Optional[str] = None
    created_at: str

def db_to_model(device: DBDevice) -> Device:
    return Device(
        id=device.id,
        name=device.name,
        ip=device.ip,
        vendor=device.vendor,
        location=device.location,
        last_backup=device.last_backup.isoformat() if device.last_backup else None,
        created_at=device.created_at.isoformat() if device.created_at else ""
    )

@router.get("/", response_model=List[Device])
async def get_all_devices(db: Session = Depends(get_db)):
    devices = db.query(DBDevice).all()
    return [db_to_model(d) for d in devices]

@router.post("/", response_model=Device, status_code=201)
async def create_device(device: DeviceCreate, db: Session = Depends(get_db)):
    db_device = DBDevice(
        id=str(uuid.uuid4()),
        name=device.name,
        ip=device.ip,
        vendor=device.vendor,
        location=device.location or "未知",
        last_backup=None,
        created_at=datetime.utcnow()
    )
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_to_model(db_device)

@router.get("/{device_id}", response_model=Device)
async def get_device(device_id: str, db: Session = Depends(get_db)):
    device = db.query(DBDevice).filter(DBDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return db_to_model(device)

@router.put("/{device_id}", response_model=Device)
async def update_device(device_id: str, device_update: DeviceUpdate, db: Session = Depends(get_db)):
    device = db.query(DBDevice).filter(DBDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    if device_update.name:
        device.name = device_update.name
    if device_update.ip:
        device.ip = device_update.ip
    if device_update.vendor:
        device.vendor = device_update.vendor
    if device_update.location:
        device.location = device_update.location
    
    db.commit()
    db.refresh(device)
    return db_to_model(device)

@router.delete("/{device_id}", status_code=204)
async def delete_device(device_id: str, db: Session = Depends(get_db)):
    device = db.query(DBDevice).filter(DBDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    db.delete(device)
    db.commit()
    return None
