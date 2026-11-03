import os, re, io, uuid, hmac, time, hashlib, secrets, base64
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Literal
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from cryptography.fernet import Fernet
from PIL import Image, ImageOps, UnidentifiedImageError
from fastapi import FastAPI, Depends, HTTPException, Request, Response, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator, ConfigDict
from sqlalchemy import create_engine, event, select, func, ForeignKey, String, Integer, DateTime, Boolean
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker, Session

ROOT=Path(__file__).resolve().parent
load_dotenv(ROOT/'.env')
DATABASE_URL=os.getenv('DATABASE_URL','sqlite:///./codequest.db')
UPLOAD_DIR=Path(os.getenv('PRIVATE_UPLOAD_DIR',str(ROOT/'private_uploads')))
ORIGINS=[x.strip().rstrip('/') for x in os.getenv('FRONTEND_ORIGINS','http://localhost:5173,http://127.0.0.1:5173').split(',')]
engine=create_engine(DATABASE_URL,connect_args={'check_same_thread':False} if DATABASE_URL.startswith('sqlite') else {},pool_pre_ping=True)
if DATABASE_URL.startswith('sqlite'):
    @event.listens_for(engine,'connect')
    def fk_on(dbapi,conn_record):
        dbapi.execute('PRAGMA foreign_keys=ON')
DB=sessionmaker(bind=engine,expire_on_commit=False)
class Base(DeclarativeBase):pass
def utc():return datetime.now(timezone.utc).replace(tzinfo=None)
class School(Base):
    __tablename__='schools'
    id:Mapped[int]=mapped_column(primary_key=True)
    name:Mapped[str]=mapped_column(String(200),unique=True)
    city:Mapped[str]=mapped_column(String(100),default='')
    active:Mapped[bool]=mapped_column(Boolean,default=True)
class Subject(Base):
    __tablename__='subjects'
    id:Mapped[int]=mapped_column(primary_key=True)
    name_kk:Mapped[str]=mapped_column(String(90))
    name_ru:Mapped[str]=mapped_column(String(90))
    name_en:Mapped[str]=mapped_column(String(90))
class User(Base):
    __tablename__='users'
    id:Mapped[int]=mapped_column(primary_key=True)
    full_name:Mapped[str]=mapped_column(String(130))
    email:Mapped[str]=mapped_column(String(254),unique=True,index=True)
    phone:Mapped[str|None]=mapped_column(String(16))
    password_hash:Mapped[str]=mapped_column(String(255))
    iin_encrypted:Mapped[str|None]=mapped_column(String(255))
    iin_hash:Mapped[str|None]=mapped_column(String(64),unique=True)
    role:Mapped[str]=mapped_column(String(16))
    status:Mapped[str]=mapped_column(String(16),default='pending')
    school_id:Mapped[int|None]=mapped_column(ForeignKey('schools.id',ondelete='RESTRICT'))
    school:Mapped[School|None]=relationship()
    teacher_subjects:Mapped[list['TeacherSubject']]=relationship(cascade='all, delete-orphan')
    created_at:Mapped[datetime]=mapped_column(DateTime,default=utc)
class TeacherSubject(Base):
    __tablename__='teacher_subjects'
    id:Mapped[int]=mapped_column(primary_key=True)
    teacher_id:Mapped[int]=mapped_column(ForeignKey('users.id',ondelete='CASCADE'))
    subject_id:Mapped[int]=mapped_column(ForeignKey('subjects.id',ondelete='RESTRICT'))
class Student(Base):
    __tablename__='students'
    id:Mapped[int]=mapped_column(primary_key=True)
    full_name:Mapped[str]=mapped_column(String(130))
    iin_encrypted:Mapped[str]=mapped_column(String(255))
    iin_hash:Mapped[str]=mapped_column(String(64),unique=True)
    grade:Mapped[int]=mapped_column(Integer)
    class_letter:Mapped[str]=mapped_column(String(5),default='')
    school_id:Mapped[int]=mapped_column(ForeignKey('schools.id',ondelete='RESTRICT'))
    school:Mapped[School]=relationship()
    parent_id:Mapped[int]=mapped_column(ForeignKey('users.id',ondelete='RESTRICT'))
    status:Mapped[str]=mapped_column(String(16),default='pending')
    photo_name:Mapped[str|None]=mapped_column(String(90))
    created_at:Mapped[datetime]=mapped_column(DateTime,default=utc)
class SessionToken(Base):
    __tablename__='sessions'
    id:Mapped[int]=mapped_column(primary_key=True)
    token_hash:Mapped[str]=mapped_column(String(64),unique=True,index=True)
    user_id:Mapped[int]=mapped_column(ForeignKey('users.id',ondelete='CASCADE'))
    expires_at:Mapped[datetime]=mapped_column(DateTime)
class Audit(Base):
    __tablename__='audit_logs'
    id:Mapped[int]=mapped_column(primary_key=True)
    actor_id:Mapped[int|None]=mapped_column(ForeignKey('users.id',ondelete='SET NULL'))
    operation:Mapped[str]=mapped_column(String(40))
    entity:Mapped[str]=mapped_column(String(25))
    entity_id:Mapped[int]=mapped_column(Integer)
    created_at:Mapped[datetime]=mapped_column(DateTime,default=utc)

def db_session():
    with DB() as db:yield db
def crypto(iin):
    value=os.getenv('IIN_ENCRYPTION_KEY','')
    try:
        raw=base64.urlsafe_b64decode(value)
        if len(raw)!=32:raise ValueError('key')
        encoded=Fernet(value.encode()).encrypt(iin.encode()).decode()
    except Exception:raise HTTPException(503,'iin_encryption_not_configured')
    return encoded,hmac.new(raw,iin.encode(),hashlib.sha256).hexdigest()
def valid_iin(v):
    if not re.fullmatch(r'[0-9]{12}',v) or len(set(v))==1:raise ValueError('invalid_iin')
    digits=list(map(int,v))
    for weights in ((1,2,3,4,5,6,7,8,9,10,11),(3,4,5,6,7,8,9,10,11,1,2)):
        n=sum(x*y for x,y in zip(digits[:11],weights))%11
        if n<10:
            if n!=digits[-1]:raise ValueError('invalid_iin_checksum')
            return v
    raise ValueError('invalid_iin_checksum')
def valid_name(v):
    v=' '.join(v.split())
    if len(v)<3:raise ValueError('invalid_name')
    return v
def valid_phone(v):
    v=re.sub(r'[\s\-()]','',v)
    if re.fullmatch(r'8[0-9]{10}',v):return '+7'+v[1:]
    if re.fullmatch(r'7[0-9]{10}',v):return '+'+v
    if re.fullmatch(r'\+7[0-9]{10}',v):return v
    raise ValueError('invalid_phone')
def valid_email(v):
    v=v.strip().lower()
    if not re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+',v):raise ValueError('invalid_email')
    return v
class Strict(BaseModel):model_config=ConfigDict(extra='forbid')
class Register(Strict):
    role:Literal['teacher','parent']
    full_name:str=Field(min_length=3,max_length=130)
    iin:str
    phone:str
    email:str
    password:str=Field(min_length=10,max_length=128)
    school_id:int|None=None
    subject_ids:list[int]=Field(default_factory=list)
    _n=field_validator('full_name')(valid_name)
    _i=field_validator('iin')(valid_iin)
    _p=field_validator('phone')(valid_phone)
    _e=field_validator('email')(valid_email)
class Login(Strict):
    email:str
    password:str
class ChildData(Strict):
    full_name:str=Field(min_length=3,max_length=130)
    iin:str
    grade:int=Field(ge=1,le=11)
    class_letter:str=Field(default='',max_length=5)
    school_id:int
    _n=field_validator('full_name')(valid_name)
    _i=field_validator('iin')(valid_iin)
class ChildPatch(Strict):
    full_name:str|None=None
    iin:str|None=None
    grade:int|None=Field(default=None,ge=1,le=11)
    class_letter:str|None=None
    school_id:int|None=None
    status:Literal['pending','approved','rejected']|None=None
    _n=field_validator('full_name')(lambda v:valid_name(v) if v is not None else None)
    _i=field_validator('iin')(lambda v:valid_iin(v) if v is not None else None)
class UserPatch(Strict):
    full_name:str|None=None
    iin:str|None=None
    phone:str|None=None
    email:str|None=None
    role:Literal['teacher','parent','admin']|None=None
    status:Literal['pending','approved','rejected']|None=None
    school_id:int|None=None
    subject_ids:list[int]|None=None
    _n=field_validator('full_name')(lambda v:valid_name(v) if v is not None else None)
    _i=field_validator('iin')(lambda v:valid_iin(v) if v is not None else None)
    _p=field_validator('phone')(lambda v:valid_phone(v) if v is not None else None)
    _e=field_validator('email')(lambda v:valid_email(v) if v is not None else None)
class SchoolData(Strict):
    name:str=Field(min_length=4,max_length=200)
    city:str=Field(default='',max_length=100)
def password_hash(p):
    salt=secrets.token_bytes(16)
    d=hashlib.pbkdf2_hmac('sha256',p.encode(),salt,310000)
    return 'pbkdf2$310000$'+salt.hex()+'$'+d.hex()
def password_verify(p,stored):
    try:
        alg,it,salt,d=stored.split('$')
        return alg=='pbkdf2' and hmac.compare_digest(hashlib.pbkdf2_hmac('sha256',p.encode(),bytes.fromhex(salt),int(it)),bytes.fromhex(d))
    except (ValueError,TypeError):return False
def login_cookie(response,db,user):
    token=secrets.token_urlsafe(48)
    db.add(SessionToken(token_hash=hashlib.sha256(token.encode()).hexdigest(),user_id=user.id,expires_at=utc()+timedelta(days=7)))
    db.commit()
    response.set_cookie('cq_session',token,httponly=True,samesite='lax',secure=os.getenv('COOKIE_SECURE','false')=='true',path='/',max_age=604800)
def current_user(request:Request,db:Session=Depends(db_session)):
    token=request.cookies.get('cq_session')
    if not token:raise HTTPException(401,'not_authenticated')
    session=db.scalar(select(SessionToken).where(SessionToken.token_hash==hashlib.sha256(token.encode()).hexdigest()))
    if not session or session.expires_at<=utc():raise HTTPException(401,'session_expired')
    user=db.get(User,session.user_id)
    if not user or user.status=='rejected':raise HTTPException(403,'account_disabled')
    return user
def role(user,*allowed):
    if user.role not in allowed:raise HTTPException(403,'forbidden')
def school_required(db,id):
    school=db.get(School,id)
    if not school or not school.active:raise HTTPException(422,'unknown_school')
def subjects_required(db,ids):
    if not ids or len(set(ids))!=len(ids) or len(db.scalars(select(Subject.id).where(Subject.id.in_(ids))).all())!=len(ids):raise HTTPException(422,'invalid_subjects')
def commit(db):
    try:db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409,'duplicate_or_referenced')
def audit(db,user,operation,entity,id):
    db.add(Audit(actor_id=user.id,operation=operation,entity=entity,entity_id=id))
def user_out(u):
    return dict(id=u.id,full_name=u.full_name,email=u.email,phone=u.phone,role=u.role,status=u.status,school_id=u.school_id,school_name=u.school.name if u.school else None,subject_ids=[s.subject_id for s in u.teacher_subjects])
def student_out(s):
    return dict(id=s.id,full_name=s.full_name,grade=s.grade,class_letter=s.class_letter,school_id=s.school_id,school_name=s.school.name,parent_id=s.parent_id,status=s.status,photo_url='/api/students/'+str(s.id)+'/photo' if s.photo_name else None)
def visible(s,u):
    return u.role=='admin' or (u.role=='parent' and s.parent_id==u.id) or (u.role=='teacher' and u.status=='approved' and s.status=='approved' and u.school_id==s.school_id)
@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(engine)
    with DB() as db:
        if not db.scalar(select(Subject.id).limit(1)):
            for kk,ru,en in [('Информатика','Информатика','Computer Science'),('Математика','Математика','Mathematics'),('Физика','Физика','Physics'),('Қазақ тілі','Казахский язык','Kazakh'),('Орыс тілі','Русский язык','Russian'),('Ағылшын тілі','Английский язык','English'),('Биология','Биология','Biology'),('Химия','Химия','Chemistry'),('География','География','Geography')]:db.add(Subject(name_kk=kk,name_ru=ru,name_en=en))
        if not db.scalar(select(School.id).limit(1)):
            for n,c in [('Демо мектеп №1','Астана'),('Демо мектеп №2','Алматы'),('Демо мектеп №3','Шымкент')]:db.add(School(name=n,city=c))
        db.commit()
    UPLOAD_DIR.mkdir(parents=True,exist_ok=True)
    yield
app=FastAPI(title='CodeQuest AI API',version='0.2',lifespan=lifespan)
app.add_middleware(CORSMiddleware,allow_origins=ORIGINS,allow_credentials=True,allow_methods=['GET','POST','PATCH','DELETE'],allow_headers=['Content-Type'])
failures=defaultdict(deque)
@app.middleware('http')
async def check_origin(request,call_next):
    if request.method in ('POST','PATCH','PUT','DELETE') and request.url.path.startswith('/api/'):
        o=request.headers.get('origin','').rstrip('/')
        if (o and o not in ORIGINS) or (not o and request.headers.get('sec-fetch-site')=='cross-site'):
            return Response('invalid_origin',status_code=403)
    return await call_next(request)
@app.get('/api/health')
def health():return {'status':'ok'}
@app.get('/api/schools')
def schools(db:Session=Depends(db_session)):
    return [dict(id=x.id,name=x.name,city=x.city) for x in db.scalars(select(School).where(School.active.is_(True)).order_by(School.name))]
@app.get('/api/subjects')
def subjects(db:Session=Depends(db_session)):
    return [dict(id=x.id,kk=x.name_kk,ru=x.name_ru,en=x.name_en) for x in db.scalars(select(Subject).order_by(Subject.id))]
@app.post('/api/auth/register',status_code=201)
def register(p:Register,response:Response,db:Session=Depends(db_session)):
    if db.scalar(select(User.id).where(User.email==p.email)):raise HTTPException(409,'email_taken')
    if p.role=='teacher':
        if p.school_id is None:raise HTTPException(422,'select_school')
        school_required(db,p.school_id);subjects_required(db,p.subject_ids)
    elif p.school_id is not None:school_required(db,p.school_id)
    enc,digest=crypto(p.iin)
    if db.scalar(select(User.id).where(User.iin_hash==digest)):raise HTTPException(409,'iin_taken')
    u=User(full_name=p.full_name,email=p.email,phone=p.phone,password_hash=password_hash(p.password),iin_encrypted=enc,iin_hash=digest,role=p.role,status='pending' if p.role=='teacher' else 'approved',school_id=p.school_id)
    db.add(u);db.flush()
    if p.role=='teacher':
        for sid in p.subject_ids:db.add(TeacherSubject(teacher_id=u.id,subject_id=sid))
    commit(db);db.refresh(u);login_cookie(response,db,u)
    return user_out(u)
@app.post('/api/auth/login')
def login(p:Login,request:Request,response:Response,db:Session=Depends(db_session)):
    email=valid_email(p.email)
    key=(request.client.host if request.client else '?')+':'+email
    tick=failures[key]
    while tick and time.monotonic()-tick[0]>600:tick.popleft()
    if len(tick)>=8:raise HTTPException(429,'too_many_attempts')
    u=db.scalar(select(User).where(User.email==email))
    if not u or not password_verify(p.password,u.password_hash):
        tick.append(time.monotonic());raise HTTPException(401,'wrong_credentials')
    if u.status=='rejected':raise HTTPException(403,'account_disabled')
    failures.pop(key,None);login_cookie(response,db,u);return user_out(u)
@app.get('/api/auth/me')
def me(u:User=Depends(current_user)):return user_out(u)
@app.post('/api/auth/logout')
def logout(request:Request,response:Response,db:Session=Depends(db_session)):
    t=request.cookies.get('cq_session')
    if t:
        s=db.scalar(select(SessionToken).where(SessionToken.token_hash==hashlib.sha256(t.encode()).hexdigest()))
        if s:db.delete(s);db.commit()
    response.delete_cookie('cq_session',path='/')
    return {'ok':True}
@app.get('/api/dashboard')
def dashboard(u:User=Depends(current_user),db:Session=Depends(db_session)):
    if u.role=='teacher':
        n=db.scalar(select(func.count()).select_from(Student).where(Student.school_id==u.school_id,Student.status=='approved')) if u.status=='approved' else 0
        return dict(role='teacher',total_students=n or 0,school_name=u.school.name if u.school else None,approved=u.status=='approved')
    if u.role=='parent':
        total=db.scalar(select(func.count()).select_from(Student).where(Student.parent_id==u.id)) or 0
        waiting=db.scalar(select(func.count()).select_from(Student).where(Student.parent_id==u.id,Student.status=='pending')) or 0
        return dict(role='parent',total_children=total,pending_children=waiting)
    return dict(role='admin',total_users=db.scalar(select(func.count()).select_from(User)) or 0,total_students=db.scalar(select(func.count()).select_from(Student)) or 0,pending_teachers=db.scalar(select(func.count()).select_from(User).where(User.role=='teacher',User.status=='pending')) or 0,pending_children=db.scalar(select(func.count()).select_from(Student).where(Student.status=='pending')) or 0)
@app.get('/api/children')
def children(u:User=Depends(current_user),db:Session=Depends(db_session)):
    role(u,'parent')
    return [student_out(s) for s in db.scalars(select(Student).where(Student.parent_id==u.id).order_by(Student.id.desc()))]
@app.post('/api/children',status_code=201)
def add_child(p:ChildData,u:User=Depends(current_user),db:Session=Depends(db_session)):
    role(u,'parent');school_required(db,p.school_id)
    enc,digest=crypto(p.iin)
    if db.scalar(select(Student.id).where(Student.iin_hash==digest)):raise HTTPException(409,'iin_taken')
    s=Student(full_name=p.full_name,iin_encrypted=enc,iin_hash=digest,grade=p.grade,class_letter=p.class_letter.upper().strip(),school_id=p.school_id,parent_id=u.id,status='pending')
    db.add(s);commit(db);db.refresh(s);return student_out(s)
def edit_student(s,p,u,db,is_admin=False):
    changes=p.model_dump(exclude_unset=True)
    if not is_admin and 'status' in changes:raise HTTPException(403,'admin_only_status')
    for k,v in changes.items():
        if v is None:continue
        if k=='iin':s.iin_encrypted,s.iin_hash=crypto(v)
        elif k=='school_id':school_required(db,v);s.school_id=v
        elif k in ('full_name','grade','class_letter','status'):setattr(s,k,v.strip().upper() if k=='class_letter' else v)
    if not is_admin:s.status='pending'
    audit(db,u,'update','student',s.id);commit(db);return student_out(s)
@app.patch('/api/children/{id}')
def edit_own_child(id:int,p:ChildPatch,u:User=Depends(current_user),db:Session=Depends(db_session)):
    role(u,'parent');s=db.get(Student,id)
    if not s or s.parent_id!=u.id:raise HTTPException(404,'student_not_found')
    return edit_student(s,p,u,db)
@app.get('/api/students')
def directory(q:str='',u:User=Depends(current_user),db:Session=Depends(db_session)):
    if u.role=='teacher':
        if u.status!='approved':raise HTTPException(403,'teacher_awaits_approval')
        stmt=select(Student).where(Student.school_id==u.school_id,Student.status=='approved')
    elif u.role=='admin':stmt=select(Student)
    else:raise HTTPException(403,'forbidden')
    if q.strip():stmt=stmt.where(Student.full_name.ilike('%'+q.strip()[:80]+'%'))
    return [student_out(s) for s in db.scalars(stmt.order_by(Student.full_name).limit(300))]
@app.get('/api/students/{id}')
def get_student(id:int,u:User=Depends(current_user),db:Session=Depends(db_session)):
    s=db.get(Student,id)
    if not s or not visible(s,u):raise HTTPException(404,'student_not_found')
    return student_out(s)
@app.post('/api/students/{id}/photo')
async def put_photo(id:int,file:UploadFile=File(...),u:User=Depends(current_user),db:Session=Depends(db_session)):
    s=db.get(Student,id)
    if not s or not (u.role=='admin' or (u.role=='parent' and s.parent_id==u.id)):raise HTTPException(404,'student_not_found')
    if file.content_type not in ('image/png','image/jpeg','image/webp'):raise HTTPException(422,'invalid_photo_type')
    data=await file.read(3000001)
    if len(data)>3000000:raise HTTPException(413,'photo_too_large')
    try:
        with Image.open(io.BytesIO(data)) as im:
            if im.width*im.height>12000000:raise HTTPException(413,'photo_too_large')
            image=ImageOps.exif_transpose(im).convert('RGB');image.thumbnail((512,512))
            filename=uuid.uuid4().hex+'.jpg'
            UPLOAD_DIR.mkdir(parents=True,exist_ok=True);image.save(UPLOAD_DIR/filename,'JPEG',quality=84)
    except (UnidentifiedImageError,OSError,ValueError):raise HTTPException(422,'invalid_photo')
    old=s.photo_name;s.photo_name=filename;audit(db,u,'photo_update','student',id);commit(db)
    if old:(UPLOAD_DIR/old).unlink(missing_ok=True)
    return student_out(s)
@app.get('/api/students/{id}/photo')
def photo(id:int,u:User=Depends(current_user),db:Session=Depends(db_session)):
    s=db.get(Student,id)
    if not s or not visible(s,u) or not s.photo_name:raise HTTPException(404,'photo_not_found')
    p=UPLOAD_DIR/Path(s.photo_name).name
    if not p.exists():raise HTTPException(404,'photo_not_found')
    return FileResponse(p,media_type='image/jpeg',headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'})
@app.get('/api/admin/users')
def admin_users(u:User=Depends(current_user),db:Session=Depends(db_session)):
    role(u,'admin')
    return [user_out(x) for x in db.scalars(select(User).order_by(User.id.desc()).limit(500))]
@app.patch('/api/admin/users/{id}')
def admin_edit_user(id:int,p:UserPatch,u:User=Depends(current_user),db:Session=Depends(db_session)):
    role(u,'admin');target=db.get(User,id)
    if not target:raise HTTPException(404,'user_not_found')
    updates=p.model_dump(exclude_unset=True)
    if id==u.id and ('role' in updates or 'status' in updates):raise HTTPException(403,'cannot_demote_self')
    if updates.get('school_id') is not None:school_required(db,updates['school_id'])
    if updates.get('role',target.role)=='teacher' and updates.get('school_id',target.school_id) is None:raise HTTPException(422,'school_required')
    if 'subject_ids' in updates:
        if updates.get('role',target.role)!='teacher':raise HTTPException(422,'teacher_only_subjects')
        subjects_required(db,updates['subject_ids'])
        target.teacher_subjects.clear()
        for sid in updates['subject_ids']:target.teacher_subjects.append(TeacherSubject(subject_id=sid))
    for k,v in updates.items():
        if k=='iin' and v is not None:target.iin_encrypted,target.iin_hash=crypto(v)
        elif k in ('full_name','email','phone','role','status','school_id'):setattr(target,k,v)
    audit(db,u,'update','user',id);commit(db);return user_out(target)
@app.delete('/api/admin/users/{id}')
def admin_delete_user(id:int,u:User=Depends(current_user),db:Session=Depends(db_session)):
    role(u,'admin')
    if id==u.id:raise HTTPException(403,'cannot_delete_self')
    x=db.get(User,id)
    if not x:raise HTTPException(404,'user_not_found')
    if db.scalar(select(Student.id).where(Student.parent_id==id)):raise HTTPException(409,'delete_children_first')
    audit(db,u,'delete','user',id);db.delete(x);commit(db);return {'ok':True}
@app.patch('/api/admin/students/{id}')
def admin_edit_student(id:int,p:ChildPatch,u:User=Depends(current_user),db:Session=Depends(db_session)):
    role(u,'admin');s=db.get(Student,id)
    if not s:raise HTTPException(404,'student_not_found')
    return edit_student(s,p,u,db,True)
@app.delete('/api/admin/students/{id}')
def admin_delete_student(id:int,u:User=Depends(current_user),db:Session=Depends(db_session)):
    role(u,'admin');s=db.get(Student,id)
    if not s:raise HTTPException(404,'student_not_found')
    old=s.photo_name;audit(db,u,'delete','student',id);db.delete(s);commit(db)
    if old:(UPLOAD_DIR/old).unlink(missing_ok=True)
    return {'ok':True}
@app.post('/api/admin/schools',status_code=201)
def add_school(p:SchoolData,u:User=Depends(current_user),db:Session=Depends(db_session)):
    role(u,'admin');s=School(name=p.name,city=p.city);db.add(s);commit(db);db.refresh(s)
    audit(db,u,'create','school',s.id);commit(db)
    return {'id':s.id,'name':s.name,'city':s.city}
@app.patch('/api/admin/schools/{id}')
def edit_school(id:int,p:SchoolData,u:User=Depends(current_user),db:Session=Depends(db_session)):
    role(u,'admin');s=db.get(School,id)
    if not s:raise HTTPException(404,'school_not_found')
    s.name=p.name;s.city=p.city;audit(db,u,'update','school',id);commit(db)
    return {'id':s.id,'name':s.name,'city':s.city}
@app.delete('/api/admin/schools/{id}')
def disable_school(id:int,u:User=Depends(current_user),db:Session=Depends(db_session)):
    role(u,'admin');s=db.get(School,id)
    if not s:raise HTTPException(404,'school_not_found')
    s.active=False;audit(db,u,'deactivate','school',id);commit(db)
    return {'ok':True}
