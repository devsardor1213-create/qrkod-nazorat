// ============================================================
// DATA.JS — LocalStorage + Node.js API (Hybrid Mode)
// ============================================================

const hostname = window.location.hostname || '127.0.0.1';
let API_URL = '/api';
if (window.location.protocol === 'file:') {
    API_URL = 'http://127.0.0.1:8000/api';
} else if (window.location.port !== '8000' && window.location.port !== '') {
    API_URL = `http://${hostname}:8000/api`;
}

const DB = {
  // ---------- KEYS ----------
  KEYS: {
    USERS: 'qr_users',
    TEACHERS: 'qr_teachers',
    STUDENTS: 'qr_students',
    GROUPS: 'qr_groups',
    ATTENDANCE: 'qr_attendance',
    BALLS: 'qr_balls',
    CURRENT_USER: 'qr_current_user',
  },

  // ---------- HELPERS ----------
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
  },
  getObj(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; }
  },
  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },
  genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); },
  genCode() { return Math.floor(100 + Math.random() * 900).toString(); },
  today() { return new Date().toISOString().split('T')[0]; },
  nowTime() { return new Date().toTimeString().split(' ')[0].substring(0, 5); },
  formatDate(d) {
    if (typeof d === 'string') d = new Date(d);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  // ---------- INIT ----------
  async pullFromAPI() {
    try {
      const [t, s, g, a] = await Promise.all([
        fetch(API_URL + '/teachers').then(res => res.json()),
        fetch(API_URL + '/students').then(res => res.json()),
        fetch(API_URL + '/groups').then(res => res.json()),
        fetch(API_URL + '/attendance').then(res => res.json())
      ]);
      this.set(this.KEYS.TEACHERS, t);
      this.set(this.KEYS.STUDENTS, s);
      this.set(this.KEYS.GROUPS, g);
      this.set(this.KEYS.ATTENDANCE, a);
    } catch (e) {
      console.warn("API Server is not running! Fallback to LocalStorage.", e);
    }
  },

  // ---------- USERS & AUTH ----------
  async login(username, password) {
    try {
      const res = await fetch(API_URL + '/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, password})
      });
      const data = await res.json();
      if(data.success) {
        this.setCurrentUser(data.user);
        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.message };
      }
    } catch (e) {
      // Fallback
      const user = this.get(this.KEYS.USERS).find(u => u.username === username && u.password === password);
      if(user) {
        this.setCurrentUser(user);
        return { success: true, user };
      }
      return { success: false };
    }
  },

  async updateUser(userId, data) {
    try {
      const res = await fetch(API_URL + '/users/' + userId, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if(result.success) {
        let cur = this.getCurrentUser();
        if(cur && cur.id === userId) {
          cur.name = data.name;
          cur.username = data.username;
          cur.avatar = data.avatar;
          this.setCurrentUser(cur);
        }
      }
      return result;
    } catch(e) {
      console.error(e);
      return { success: false, message: "Tarmoq xatosi" };
    }
  },

  // ---------- TEACHERS ----------
  getTeachers() { return this.get(this.KEYS.TEACHERS); },
  getTeacherById(id) { return this.getTeachers().find(t => t.id === id); },
  async addTeacher(name, surname, phone, jobType, avatar) {
    try {
      const res = await fetch(API_URL + '/teachers', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name, surname, phone, jobType, avatar })
      });
      const data = await res.json();
      await this.pullFromAPI();
      return data;
    } catch(e) { console.error(e); }
  },
  async updateTeacher(id, data) {
    try {
      await fetch(API_URL + '/teachers/' + id, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
      });
      await this.pullFromAPI();
    } catch(e) { console.error(e); }
  },
  async deleteTeacher(id) {
    try {
      await fetch(API_URL + '/teachers/' + id, { method: 'DELETE' });
      await this.pullFromAPI();
    } catch(e) { console.error(e); }
  },

  // ---------- STUDENTS ----------
  getStudents() { return this.get(this.KEYS.STUDENTS); },
  getStudentById(id) { return this.getStudents().find(s => s.id === id); },
  getStudentsByTeacher(teacherId) { return this.getStudents().filter(s => s.teacherId === teacherId); },
  getStudentsByGroup(groupId) { return this.getStudents().filter(s => s.groupId === groupId); },
  async addStudent(name, phone, groupId, teacherId, avatar) {
    try {
      const res = await fetch(API_URL + '/students', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name, phone, groupId, teacherId, avatar })
      });
      const data = await res.json();
      await this.pullFromAPI();
      return data;
    } catch(e) { console.error(e); }
  },
  async updateStudent(id, name, phone, groupId, teacherId, avatar) {
    try {
      await fetch(API_URL + '/students/' + id, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name, phone, groupId, teacherId, avatar })
      });
      await this.pullFromAPI();
    } catch(e) { console.error(e); }
  },
  async deleteStudent(id) {
    try {
      await fetch(API_URL + '/students/' + id, { method: 'DELETE' });
      await this.pullFromAPI();
    } catch(e) { console.error(e); }
  },

  // Umumiy o'chirish
  async deletePerson(id, type) {
    if (type === 'teacher') await this.deleteTeacher(id);
    else if (type === 'student') await this.deleteStudent(id);
  },

  // ---------- GROUPS ----------
  getGroups() { return this.get(this.KEYS.GROUPS); },
  getGroupById(id) { return this.getGroups().find(g => g.id === id); },
  getGroupsByTeacher(teacherId) { return this.getGroups().filter(g => g.teacherId === teacherId); },
  async addGroup(name, teacherId) {
    try {
      const res = await fetch(API_URL + '/groups', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name, teacherId })
      });
      const data = await res.json();
      await this.pullFromAPI();
      return data;
    } catch(e) { console.error(e); }
  },
  async updateGroup(id, name, teacherId) {
    try {
      await fetch(API_URL + '/groups/' + id, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name, teacherId })
      });
      await this.pullFromAPI();
    } catch(e) { console.error(e); }
  },
  async deleteGroup(id) {
    try {
      await fetch(API_URL + '/groups/' + id, { method: 'DELETE' });
      await this.pullFromAPI();
    } catch(e) { console.error(e); }
  },

  // ---------- ATTENDANCE ----------
  getAttendance() { return this.get(this.KEYS.ATTENDANCE); },
  async addAttendance(personId, personType) {
    const today = this.today();
    const time = this.nowTime();
    try {
      const res = await fetch(API_URL + '/attendance', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ date: today, personId, personType, time })
      });
      const data = await res.json();
      await this.pullFromAPI();
      
      if(data.error) {
        return { error: true, message: data.error, record: this.getAttendance().find(a => a.personId===personId && a.date===today) };
      }
      return { error: false, type: data.type, record: { id: data.id, personId, personType, date: today, time, timeOut: data.type === 'chiqish' ? time : null } };
    } catch(e) {
      console.error(e);
      return { error: true, message: "Tarmoq xatosi yoki server ishlamayapti" };
    }
  },
  getAttendanceByPerson(personId) { return this.getAttendance().filter(a => a.personId === personId); },
  getAttendanceByDate(date) { return this.getAttendance().filter(a => a.date === date); },
  getAttendanceByMonth(personId, year, month) {
    return this.getAttendance().filter(a => {
      if (a.personId !== personId) return false;
      const d = new Date(a.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
  },
  isAttendedToday(personId) {
    return this.getAttendance().some(a => a.personId === personId && a.date === this.today());
  },
  getTodayAttendanceCount(personType) {
    const today = this.today();
    const all = personType === 'teacher' ? this.getTeachers() : this.getStudents();
    const attended = this.getAttendance().filter(a => a.date === today && a.personType === personType);
    return { came: attended.length, notCame: all.length - attended.length, total: all.length };
  },

  // ---------- BALLS (Local only for now) ----------
  getBalls() { return this.get(this.KEYS.BALLS); },
  getBallsByPerson(personId) { return this.getBalls().filter(b => b.personId === personId); },
  getTotalBalls(personId) { return this.getBallsByPerson(personId).reduce((sum, b) => sum + (b.amount || 0), 0); },
  addBalls(personId, amount, date, time) {
    const balls = this.getBalls();
    balls.push({ id: this.genId(), personId, amount, date, time });
    this.set(this.KEYS.BALLS, balls);
  },

  // ---------- CURRENT USER ----------
  getCurrentUser() { return this.getObj(this.KEYS.CURRENT_USER); },
  setCurrentUser(user) { this.set(this.KEYS.CURRENT_USER, user); },
  clearCurrentUser() { localStorage.removeItem(this.KEYS.CURRENT_USER); },

  // ---------- STATS & MONTHLY ----------
  getDashboardStats() {
    const today = this.today();
    const teachers = this.getTeachers();
    const students = this.getStudents();
    const attendance = this.getAttendanceByDate(today);

    return {
      totalTeachers: teachers.length,
      teacherCame: attendance.filter(a => a.personType === 'teacher').length,
      teacherNotCame: teachers.length - attendance.filter(a => a.personType === 'teacher').length,
      totalStudents: students.length,
      studentCame: attendance.filter(a => a.personType === 'student').length,
      studentNotCame: students.length - attendance.filter(a => a.personType === 'student').length,
    };
  },
  getMonthlyAttendance(personId, personType, year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const records = this.getAttendanceByMonth(personId, year, month);
    const result = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const rec = records.find(r => r.date === dateStr);
      const dayOfWeek = new Date(dateStr).getDay();
      result.push({
        day: d, date: dateStr,
        dayName: ['Yak', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'][dayOfWeek],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        came: !!rec, time: rec ? rec.time : null,
      });
    }
    const cameDays = result.filter(r => r.came && !r.isWeekend).length;
    const workDays = result.filter(r => !r.isWeekend).length;
    return { days: result, cameDays, notCameDays: workDays - cameDays, workDays };
  },
};
