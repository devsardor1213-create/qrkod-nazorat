from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import uuid
import random
import time
import os
import webbrowser
import threading
from datetime import datetime

from database import engine, get_db
import models
import schemas

# Create tables if they don't exist
models.Base.metadata.create_all(bind=engine)

# Auto-migration: add newly added columns if they don't exist in the uploaded DB
from sqlalchemy import text
with engine.connect() as conn:
    # Attendance table missing columns
    try: conn.execute(text("ALTER TABLE attendance ADD COLUMN time_out VARCHAR"))
    except Exception: pass
    try: conn.execute(text("ALTER TABLE attendance ADD COLUMN balls INTEGER DEFAULT 3"))
    except Exception: pass
    
    # User table missing columns
    try: conn.execute(text("ALTER TABLE users ADD COLUMN student_id VARCHAR"))
    except Exception: pass
    try: conn.execute(text("ALTER TABLE users ADD COLUMN teacher_id VARCHAR"))
    except Exception: pass
    try: conn.execute(text("ALTER TABLE users ADD COLUMN avatar TEXT"))
    except Exception: pass
    
    # Teacher table missing columns
    try: conn.execute(text("ALTER TABLE teachers ADD COLUMN job_type VARCHAR"))
    except Exception: pass
    try: conn.execute(text("ALTER TABLE teachers ADD COLUMN avatar TEXT"))
    except Exception: pass
    
    # Student table missing columns
    try: conn.execute(text("ALTER TABLE students ADD COLUMN avatar TEXT"))
    except Exception: pass

    try: conn.commit()
    except Exception: pass

app = FastAPI(title="QR Kod Nazorat API")

# Frontend papkasi (lokal yoki server deploy strukturasi uchun)
current_dir = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = current_dir

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def gen_code():
    return str(random.randint(1000, 9999))

def gen_id(prefix):
    return f"{prefix}{int(time.time() * 1000)}"

# --- AUTH & USERS ---
@app.post("/api/auth/login")
def login(req: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == req.username, models.User.password == req.password).first()
    if not user:
        return {"success": False, "message": "Invalid credentials"}
    return {
        "success": True, 
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "name": user.name,
            "studentId": user.student_id,
            "teacherId": user.teacher_id,
            "avatar": user.avatar
        }
    }

@app.put("/api/users/{u_id}")
def update_user(u_id: str, req: schemas.UserUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == u_id).first()
    if not user: raise HTTPException(status_code=404)
    
    # Optional check if username already exists for someone else
    existing = db.query(models.User).filter(models.User.username == req.username, models.User.id != u_id).first()
    if existing:
        return {"success": False, "message": "Username already taken"}

    user.name = req.name
    user.username = req.username
    user.password = req.password
    user.avatar = req.avatar
    db.commit()
    return {"success": True}

# --- TEACHERS ---
@app.get("/api/teachers")
def get_teachers(db: Session = Depends(get_db)):
    teachers = db.query(models.Teacher).all()
    # Map to JS format
    return [{
        "id": t.id, "code": t.code, "username": t.username, "password": t.password,
        "name": t.name, "surname": t.surname, "phone": t.phone, "jobType": t.job_type, "avatar": t.avatar,
        "createdAt": t.created_at.isoformat() if t.created_at else None
    } for t in teachers]

@app.post("/api/teachers")
def add_teacher(req: schemas.TeacherCreate, db: Session = Depends(get_db)):
    t_id = gen_id('t')
    code = gen_code()
    username = f"t{code}"
    password = f"p{code}"
    
    db_teacher = models.Teacher(
        id=t_id, code=code, username=username, password=password,
        name=req.name, surname=req.surname, phone=req.phone, job_type=req.jobType, avatar=req.avatar
    )
    db.add(db_teacher)
    
    full_name = req.name + (f" {req.surname}" if req.surname else "")
    db_user = models.User(
        id=t_id, username=username, password=password, role="teacher",
        name=full_name, teacher_id=t_id, avatar=req.avatar
    )
    db.add(db_user)
    db.commit()
    return {"success": True, "id": t_id}

@app.put("/api/teachers/{t_id}")
def update_teacher(t_id: str, req: schemas.TeacherUpdate, db: Session = Depends(get_db)):
    teacher = db.query(models.Teacher).filter(models.Teacher.id == t_id).first()
    if not teacher: raise HTTPException(status_code=404)
    
    teacher.name = req.name
    teacher.surname = req.surname
    teacher.phone = req.phone
    teacher.job_type = req.jobType
    teacher.avatar = req.avatar
    
    user = db.query(models.User).filter(models.User.teacher_id == t_id).first()
    if user:
        user.name = req.name + (f" {req.surname}" if req.surname else "")
        user.avatar = req.avatar
        
    db.commit()
    return {"success": True}

@app.delete("/api/teachers/{t_id}")
def delete_teacher(t_id: str, db: Session = Depends(get_db)):
    db.query(models.Teacher).filter(models.Teacher.id == t_id).delete()
    db.query(models.User).filter(models.User.teacher_id == t_id).delete()
    db.commit()
    return {"success": True}

# --- STUDENTS ---
@app.get("/api/students")
def get_students(db: Session = Depends(get_db)):
    students = db.query(models.Student).all()
    return [{
        "id": s.id, "code": s.code, "username": s.username, "password": s.password,
        "name": s.name, "phone": s.phone, "teacherId": s.teacher_id, "groupId": s.group_id, "avatar": s.avatar,
        "createdAt": s.created_at.isoformat() if s.created_at else None
    } for s in students]

@app.post("/api/students")
def add_student(req: schemas.StudentCreate, db: Session = Depends(get_db)):
    s_id = gen_id('s')
    code = gen_code()
    username = f"s{code}"
    password = f"p{code}"
    
    db_student = models.Student(
        id=s_id, code=code, username=username, password=password,
        name=req.name, phone=req.phone, teacher_id=req.teacherId, group_id=req.groupId, avatar=req.avatar
    )
    db.add(db_student)
    
    db_user = models.User(
        id=s_id, username=username, password=password, role="student",
        name=req.name, student_id=s_id, avatar=req.avatar
    )
    db.add(db_user)
    db.commit()
    return {"success": True, "id": s_id}

@app.put("/api/students/{s_id}")
def update_student(s_id: str, req: schemas.StudentUpdate, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.id == s_id).first()
    if not student: raise HTTPException(status_code=404)
    
    student.name = req.name
    student.phone = req.phone
    student.teacher_id = req.teacherId
    student.group_id = req.groupId
    student.avatar = req.avatar
    
    user = db.query(models.User).filter(models.User.student_id == s_id).first()
    if user: 
        user.name = req.name
        user.avatar = req.avatar
        
    db.commit()
    return {"success": True}

@app.delete("/api/students/{s_id}")
def delete_student(s_id: str, db: Session = Depends(get_db)):
    db.query(models.Student).filter(models.Student.id == s_id).delete()
    db.query(models.User).filter(models.User.student_id == s_id).delete()
    db.commit()
    return {"success": True}

# --- GROUPS ---
@app.get("/api/groups")
def get_groups(db: Session = Depends(get_db)):
    groups = db.query(models.Group).all()
    return [{"id": g.id, "name": g.name, "teacherId": g.teacher_id} for g in groups]

@app.post("/api/groups")
def add_group(req: schemas.GroupCreate, db: Session = Depends(get_db)):
    g_id = gen_id('g')
    db_group = models.Group(id=g_id, name=req.name, teacher_id=req.teacherId)
    db.add(db_group)
    db.commit()
    return {"success": True, "id": g_id}

@app.put("/api/groups/{g_id}")
def update_group(g_id: str, req: schemas.GroupUpdate, db: Session = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == g_id).first()
    if not group: raise HTTPException(status_code=404)
    group.name = req.name
    group.teacher_id = req.teacherId
    db.commit()
    return {"success": True}

@app.delete("/api/groups/{g_id}")
def delete_group(g_id: str, db: Session = Depends(get_db)):
    db.query(models.Group).filter(models.Group.id == g_id).delete()
    db.commit()
    return {"success": True}

# --- ATTENDANCE ---
@app.get("/api/attendance")
def get_attendance(date: str = None, db: Session = Depends(get_db)):
    query = db.query(models.Attendance)
    if date: query = query.filter(models.Attendance.date == date)
    atts = query.all()
    return [{
        "id": a.id, "date": a.date, "personId": a.person_id,
        "personType": a.person_type, "time": a.time, "timeOut": a.time_out, "balls": a.balls
    } for a in atts]

@app.post("/api/attendance")
def add_attendance(req: schemas.AttendanceCreate, db: Session = Depends(get_db)):
    from datetime import datetime
    existing = db.query(models.Attendance).filter(
        models.Attendance.date == req.date, 
        models.Attendance.person_id == req.personId
    ).first()
    
    if existing:
        if existing.time_out:
            return {"error": "Siz bugun kirib chiqdingiz, qayta skaner qilinmaydi"}
        else:
            try:
                t_in = datetime.strptime(existing.time, "%H:%M")
                t_out = datetime.strptime(req.time, "%H:%M")
                diff = (t_out - t_in).total_seconds() / 60.0
                if diff < 90:
                    return {"error": "Siz allaqachon kirdingiz. Chiqish uchun 1.5 soat o'tishi kerak"}
                else:
                    existing.time_out = req.time
                    db.commit()
                    return {"success": True, "type": "chiqish", "id": existing.id}
            except Exception as e:
                # Fallback if time parsing fails
                existing.time_out = req.time
                db.commit()
                return {"success": True, "type": "chiqish", "id": existing.id}
        
    a_id = gen_id('a')
    db_att = models.Attendance(
        id=a_id, date=req.date, person_id=req.personId, 
        person_type=req.personType, time=req.time
    )
    db.add(db_att)
    db.commit()
    return {"success": True, "type": "kirish", "id": a_id}

@app.delete("/api/attendance/{a_id}")
def delete_attendance(a_id: str, db: Session = Depends(get_db)):
    db.query(models.Attendance).filter(models.Attendance.id == a_id).delete()
    db.commit()
    return {"success": True}

# Add default admin and scanner on startup
def init_admin():
    db = next(get_db())
    admin = db.query(models.User).filter(models.User.username == "admin").first()
    if not admin:
        db_admin = models.User(id="admin1", username="admin", password="admin", role="admin", name="Administrator")
        db.add(db_admin)
        db.commit()
        print("Default admin created (admin/admin)")
    
    # Scanner foydalanuvchini yaratish
    scanner = db.query(models.User).filter(models.User.username == "scanner").first()
    if not scanner:
        db_scanner = models.User(id="scanner1", username="scanner", password="scanner", role="scanner", name="Skaner")
        db.add(db_scanner)
        db.commit()
        print("Default scanner created (scanner/scanner)")

# Running this sync function when file loads
try:
    init_admin()
except Exception as e:
    print("Database might not be running yet:", e)


# ============================================================
# FRONTEND SAHIFALARNI XIZMAT QILISH (SERVE)
# ============================================================

# HTML sahifalar
@app.get("/")
def serve_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

@app.get("/admin.html")
def serve_admin():
    return FileResponse(os.path.join(FRONTEND_DIR, "admin.html"))

@app.get("/teacher.html")
def serve_teacher():
    return FileResponse(os.path.join(FRONTEND_DIR, "teacher.html"))

@app.get("/student.html")
def serve_student():
    return FileResponse(os.path.join(FRONTEND_DIR, "student.html"))

@app.get("/scanner.html")
def serve_scanner():
    return FileResponse(os.path.join(FRONTEND_DIR, "scanner.html"))

# CSS va JS static fayllar (barchasi bitta papkada bo'lgani uchun)
app.mount("/css", StaticFiles(directory=FRONTEND_DIR), name="css")
app.mount("/js", StaticFiles(directory=FRONTEND_DIR), name="js")
