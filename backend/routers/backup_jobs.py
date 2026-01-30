from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from database import get_db
from models import Backup as DBBackup, Device
import uuid
from datetime import datetime
import os
import asyncio
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import paramiko
import socket

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

def execute_ssh_commands(host: str, username: str, password: str, port: int, commands: List[str], device_name: str) -> Dict:
    ssh = None
    transport = None
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        ssh.connect(
            hostname=host,
            username=username,
            password=password,
            port=port,
            timeout=30,
            auth_timeout=30,
            banner_timeout=30,
            allow_agent=False,
            look_for_keys=False,
            compress=True,
            gss_auth=False,
            gss_kex=False,
            gss_deleg_creds=False
        )
        
        transport = ssh.get_transport()
        if transport:
            transport.set_keepalive(30)
        
        results = []
        for command in commands:
            try:
                chan = ssh.invoke_shell()
                chan.settimeout(60)
                chan.send(command + '\n')
                time.sleep(2)
                
                output = ""
                while True:
                    if chan.recv_ready():
                        data = chan.recv(4096).decode('utf-8', errors='replace')
                        output += data
                    else:
                        time.sleep(0.5)
                        if not chan.recv_ready():
                            break
                
                chan.close()
                results.append(f"# Command: {command}\n{output}\n")
            except Exception as e:
                results.append(f"# Command: {command}\n# Error: {str(e)}\n")
        
        content = "\n".join(results)
        
        timestamp = datetime.utcnow()
        safe_hostname = device_name.replace(" ", "_").replace("/", "_").replace("\\", "_")
        filename = f"{safe_hostname}_{host}.cfg"
        filepath = os.path.join(BACKUP_DIR, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return {
            "device_name": device_name,
            "device_ip": host,
            "success": True,
            "filename": filename,
            "filepath": filepath,
            "content": content,
            "timestamp": timestamp.isoformat(),
            "error": None
        }
    
    except paramiko.AuthenticationException:
        return {
            "device_name": device_name,
            "device_ip": host,
            "success": False,
            "filename": None,
            "filepath": None,
            "content": None,
            "timestamp": None,
            "error": f"SSH authentication failed for {username}@{host}:{port}"
        }
    except paramiko.SSHException as e:
        return {
            "device_name": device_name,
            "device_ip": host,
            "success": False,
            "filename": None,
            "filepath": None,
            "content": None,
            "timestamp": None,
            "error": f"SSH connection error to {host}:{port} - {str(e)}"
        }
    except socket.timeout:
        return {
            "device_name": device_name,
            "device_ip": host,
            "success": False,
            "filename": None,
            "filepath": None,
            "content": None,
            "timestamp": None,
            "error": f"SSH connection timeout to {host}:{port}"
        }
    except socket.error as e:
        return {
            "device_name": device_name,
            "device_ip": host,
            "success": False,
            "filename": None,
            "filepath": None,
            "content": None,
            "timestamp": None,
            "error": f"Network error connecting to {host}:{port} - {str(e)}"
        }
    except Exception as e:
        return {
            "device_name": device_name,
            "device_ip": host,
            "success": False,
            "filename": None,
            "filepath": None,
            "content": None,
            "timestamp": None,
            "error": f"SSH connection failed to {host}:{port} - {str(e)}"
        }
    finally:
        if ssh:
            try:
                ssh.close()
            except:
                pass

@router.post("/", response_model=BackupJobResult)
async def execute_batch_backup(request: BackupJobRequest, db: Session = Depends(get_db)):
    if not request.device_ids:
        raise HTTPException(status_code=400, detail="No devices selected")
    
    if not request.commands:
        raise HTTPException(status_code=400, detail="No commands provided")
    
    job_id = str(uuid.uuid4())
    
    devices = db.query(Device).filter(Device.id.in_(request.device_ids)).all()
    
    if not devices:
        raise HTTPException(status_code=404, detail="No devices found")
    
    username = request.template.get("username")
    password = request.template.get("password")
    port = request.template.get("port", 22)
    
    backup_tasks = []
    for device in devices:
        backup_tasks.append({
            "device_id": device.id,
            "device_name": device.name,
            "device_ip": device.ip,
            
            "task": execute_ssh_commands,
            "args": (device.ip, username, password, port, request.commands, device.name)
        })
    
    success_results = []
    error_results = []
    
    max_workers = min(len(devices), 10)
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_task = {
            executor.submit(task["task"], *task["args"]): task 
            for task in backup_tasks
        }
        
        for future in as_completed(future_to_task):
            task = future_to_task[future]
            try:
                result = future.result()
                result["device_id"] = task["device_id"]
                
                if result["success"]:
                    success_results.append(result)
                else:
                    error_results.append(result)
            except Exception as e:
                error_results.append({
                    "device_id": task["device_id"],
                    "device_name": task["device_name"],
                    "device_ip": task["device_ip"],
                    "success": False,
                    "filename": None,
                    "filepath": None,
                    "content": None,
                    "timestamp": None,
                    "error": f"Task execution failed: {str(e)}"
                })
    
    for success_result in success_results:
        db_backup = DBBackup(
            id=str(uuid.uuid4()),
            switch_id=success_result["device_id"],
            timestamp=datetime.fromisoformat(success_result["timestamp"]),
            content=success_result["content"],
            filename=success_result["filename"],
            commands=','.join(request.commands),
            template_name=request.template.get("name", "Unknown")
        )
        db.add(db_backup)
        
        device = db.query(Device).filter(Device.id == success_result["device_id"]).first()
        if device:
            device.last_backup = datetime.fromisoformat(success_result["timestamp"])
    
    db.commit()
    
    formatted_results = [
        {
            "device_id": r["device_id"],
            "device_name": r["device_name"],
            "device_ip": r["device_ip"],
            "success": True,
            "filename": r["filename"],
            "timestamp": r["timestamp"]
        }
        for r in success_results
    ]
    
    formatted_errors = [
        {
            "device_id": r["device_id"],
            "device_name": r["device_name"],
            "device_ip": r["device_ip"],
            "error": r["error"]
        }
        for r in error_results
    ]
    
    return BackupJobResult(
        job_id=job_id,
        total=len(devices),
        success=len(success_results),
        failed=len(error_results),
        results=formatted_results,
        errors=formatted_errors
    )