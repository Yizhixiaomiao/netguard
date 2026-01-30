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

class BackupJobRequest(BaseModel):
    device_ids: List[str]
    commands: List[str]
    template: dict
    backup_path: Optional[str] = None

class BackupJobResult(BaseModel):
    job_id: str
    total: int
    success: int
    failed: int
    results: List[dict]
    errors: List[dict]

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

@router.post("/", response_model=BackupJobResult)
async def execute_batch_backup(request: BackupJobRequest, db: Session = Depends(get_db)):
    if not request.device_ids:
        raise HTTPException(status_code=400, detail="No devices selected")
    
    if not request.commands:
        raise HTTPException(status_code=400, detail="No commands provided")
    
    job_id = str(uuid.uuid4())
    results = []
    errors = []
    
    for device_id in request.device_ids:
        try:
            device = db.query(Device).filter(Device.id == device_id).first()
            if not device:
                errors.append({
                    "device_id": device_id,
                    "error": "Device not found"
                })
                continue
            
            content = await execute_ssh_commands(
                host=request.template.get("ip"),
                username=request.template.get("username"),
                password=request.template.get("password"),
                port=request.template.get("port", 22),
                commands=request.commands
            )
            
            timestamp = datetime.utcnow()
            filename = f"{device_id}_{timestamp.strftime('%Y-%m-%d-%H-%M-%S')}.txt"
            filepath = os.path.join(BACKUP_DIR, filename)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            
            db_backup = DBBackup(
                id=str(uuid.uuid4()),
                switch_id=device_id,
                timestamp=timestamp,
                content=content,
                filename=filename,
                commands=','.join(request.commands),
                template_name=request.template.get("name", "Unknown")
            )
            db.add(db_backup)
            
            device.last_backup = timestamp
            
            results.append({
                "device_id": device_id,
                "success": True,
                "filename": filename,
                "timestamp": timestamp.isoformat()
            })
        except Exception as e:
            errors.append({
                "device_id": device_id,
                "error": str(e)
            })
    
    db.commit()
    
    return BackupJobResult(
        job_id=job_id,
        total=len(request.device_ids),
        success=len(results),
        failed=len(errors),
        results=results,
        errors=errors
    )
