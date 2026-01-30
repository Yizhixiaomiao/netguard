from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from database import get_db
from models import Backup as DBBackup, Device
import uuid
from datetime import datetime
import paramiko
import os

router = APIRouter()

BACKUP_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backups")
os.makedirs(BACKUP_DIR, exist_ok=True)

class BackupCreate(BaseModel):
    switch_id: str
    commands: List[str]
    template: dict

class Backup(BaseModel):
    id: str
    switch_id: str
    timestamp: str
    content: str
    filename: str
    commands: List[str]
    template_name: str

async def execute_ssh_commands(host: str, username: str, password: str, port: int, commands: List[str]) -> str:
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(hostname=host, username=username, password=password, port=port, timeout=10)
        
        results = []
        for command in commands:
            stdin, stdout, stderr = ssh.exec_command(command)
            output = stdout.read().decode('utf-8')
            results.append(f"# Command: {command}\n{output}\n")
        
        ssh.close()
        return "\n".join(results)
    except Exception as e:
        raise Exception(f"SSH connection failed: {str(e)}")

def db_to_model(backup: DBBackup) -> Backup:
    return Backup(
        id=backup.id,
        switch_id=backup.switch_id,
        timestamp=backup.timestamp.isoformat() if backup.timestamp else "",
        content=backup.content,
        filename=backup.filename,
        commands=backup.commands.split(',') if backup.commands else [],
        template_name=backup.template_name or ""
    )

@router.get("/", response_model=List[Backup])
async def get_all_backups(db: Session = Depends(get_db)):
    backups = db.query(DBBackup).order_by(DBBackup.timestamp.desc()).all()
    return [db_to_model(b) for b in backups]

@router.post("/", response_model=Backup, status_code=201)
async def create_backup(backup: BackupCreate, db: Session = Depends(get_db)):
    try:
        device = db.query(Device).filter(Device.id == backup.switch_id).first()
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        template = backup.template
        content = await execute_ssh_commands(
            host=template.get("ip"),
            username=template.get("username"),
            password=template.get("password"),
            port=template.get("port", 22),
            commands=backup.commands
        )
        
        timestamp = datetime.utcnow()
        filename = f"{backup.switch_id}_{timestamp.strftime('%Y-%m-%d-%H-%M-%S')}.txt"
        filepath = os.path.join(BACKUP_DIR, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        db_backup = DBBackup(
            id=str(uuid.uuid4()),
            switch_id=backup.switch_id,
            timestamp=timestamp,
            content=content,
            filename=filename,
            commands=','.join(backup.commands),
            template_name=template.get("name", "Unknown")
        )
        db.add(db_backup)
        db.commit()
        db.refresh(db_backup)
        
        device.last_backup = timestamp
        db.commit()
        
        return db_to_model(db_backup)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")

@router.get("/{backup_id}", response_model=Backup)
async def get_backup(backup_id: str, db: Session = Depends(get_db)):
    backup = db.query(DBBackup).filter(DBBackup.id == backup_id).first()
    if not backup:
        raise HTTPException(status_code=404, detail="Backup not found")
    return db_to_model(backup)

@router.delete("/{backup_id}", status_code=204)
async def delete_backup(backup_id: str, db: Session = Depends(get_db)):
    backup = db.query(DBBackup).filter(DBBackup.id == backup_id).first()
    if not backup:
        raise HTTPException(status_code=404, detail="Backup not found")
    
    if backup.filename:
        filepath = os.path.join(BACKUP_DIR, backup.filename)
        if os.path.exists(filepath):
            os.remove(filepath)
    
    db.delete(backup)
    db.commit()
    return None
