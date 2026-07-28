from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class LoginRequest(BaseModel):
    username: str
    password: str

class TeacherCreate(BaseModel):
    name: str
    surname: Optional[str] = None
    phone: str
    jobType: Optional[str] = None
    avatar: Optional[str] = None

class TeacherUpdate(BaseModel):
    name: str
    surname: Optional[str] = None
    phone: str
    jobType: Optional[str] = None
    avatar: Optional[str] = None

class StudentCreate(BaseModel):
    name: str
    phone: str
    teacherId: str
    groupId: str
    avatar: Optional[str] = None

class StudentUpdate(BaseModel):
    name: str
    phone: str
    teacherId: str
    groupId: str
    avatar: Optional[str] = None

class GroupCreate(BaseModel):
    name: str
    teacherId: str

class GroupUpdate(BaseModel):
    name: str
    teacherId: str

class AttendanceCreate(BaseModel):
    date: str
    personId: str
    personType: str
    time: str
    timeOut: Optional[str] = None

class UserUpdate(BaseModel):
    name: str
    username: str
    password: str
    avatar: Optional[str] = None
