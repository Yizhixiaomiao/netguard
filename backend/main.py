from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import os
from datetime import datetime

from routers import devices, backups, templates, backup_jobs
from database import init_db

app = FastAPI(
    title="NetGuard AI Backend", 
    version="1.0.0",
    default_response_class=JSONResponse
)

@app.on_event("startup")
async def startup_event():
    init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(devices.router, prefix="/api/devices", tags=["devices"])
app.include_router(backups.router, prefix="/api/backups", tags=["backups"])
app.include_router(templates.router, prefix="/api/templates", tags=["templates"])
app.include_router(backup_jobs.router, prefix="/api/backup-jobs", tags=["backup-jobs"])

@app.get("/")
async def root():
    return {
        "message": "NetGuard AI Backend",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
