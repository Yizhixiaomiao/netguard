from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from database import get_db
from models import Template as DBTemplate
import uuid

router = APIRouter()

class TemplateCreate(BaseModel):
    name: str
    username: str
    password: str
    port: Optional[int] = 22
    description: Optional[str] = ""

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    port: Optional[int] = None
    description: Optional[str] = None

class Template(BaseModel):
    id: str
    name: str
    username: str
    password: str
    port: int
    description: Optional[str] = None

def db_to_model(template: DBTemplate) -> Template:
    return Template(
        id=template.id,
        name=template.name,
        username=template.username,
        password=template.password,
        port=template.port,
        description=template.description
    )

@router.get("/", response_model=List[Template])
async def get_all_templates(db: Session = Depends(get_db)):
    templates = db.query(DBTemplate).all()
    return [db_to_model(t) for t in templates]

@router.post("/", response_model=Template, status_code=201)
async def create_template(template: TemplateCreate, db: Session = Depends(get_db)):
    db_template = DBTemplate(
        id=str(uuid.uuid4()),
        name=template.name,
        username=template.username,
        password=template.password,
        port=template.port or 22,
        description=template.description or ""
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_to_model(db_template)

@router.put("/{template_id}", response_model=Template)
async def update_template(template_id: str, template_update: TemplateUpdate, db: Session = Depends(get_db)):
    template = db.query(DBTemplate).filter(DBTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if template_update.name:
        template.name = template_update.name
    if template_update.username:
        template.username = template_update.username
    if template_update.password:
        template.password = template_update.password
    if template_update.port:
        template.port = template_update.port
    if template_update.description is not None:
        template.description = template_update.description
    
    db.commit()
    db.refresh(template)
    return db_to_model(template)

@router.delete("/{template_id}", status_code=204)
async def delete_template(template_id: str, db: Session = Depends(get_db)):
    template = db.query(DBTemplate).filter(DBTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db.delete(template)
    db.commit()
    return None
