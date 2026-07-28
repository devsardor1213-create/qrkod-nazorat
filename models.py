from sqlalchemy import Column, String, Integer, DateTime, Text
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String)
    name = Column(String)
    student_id = Column(String, nullable=True)
    teacher_id = Column(String, nullable=True)
    avatar = Column(Text, nullable=True)

class Teacher(Base):
    __tablename__ = "teachers"
    
    id = Column(String, primary_key=True, index=True)
    code = Column(String)
    username = Column(String)
    password = Column(String)
    name = Column(String)
    surname = Column(String)
    phone = Column(String)
    job_type = Column(String, nullable=True)
    avatar = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Student(Base):
    __tablename__ = "students"
    
    id = Column(String, primary_key=True, index=True)
    code = Column(String)
    username = Column(String)
    password = Column(String)
    name = Column(String)
    phone = Column(String)
    teacher_id = Column(String)
    group_id = Column(String)
    avatar = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Group(Base):
    __tablename__ = "groups"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    teacher_id = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Attendance(Base):
    __tablename__ = "attendance"
    
    id = Column(String, primary_key=True, index=True)
    date = Column(String, index=True)
    person_id = Column(String)
    person_type = Column(String)
    time = Column(String)
    time_out = Column(String, nullable=True)
    balls = Column(Integer, default=3)

class Ball(Base):
    __tablename__ = "balls"
    
    id = Column(String, primary_key=True, index=True)
    person_id = Column(String)
    amount = Column(Integer)
    date = Column(String)
    time = Column(String)
