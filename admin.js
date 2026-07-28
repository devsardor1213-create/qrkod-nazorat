/* ============================================================
   ADMIN.JS — Admin Dashboard Logic (Professional Version)
   All bugs fixed: QR PNG download, login creds, cascading filters
   ============================================================ */

// Ensure auth
const currentUser = Auth.requireAuth(['admin']);

// Date in Topbar
document.getElementById('todayDate').textContent = new Date().toLocaleDateString('uz-UZ', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

// Sidebar Toggle (Mobile)
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
document.getElementById('sidebarToggle').addEventListener('click', () => {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('show');
});
sidebarOverlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
});

// ============================================================
// Section switching
// ============================================================
function showSection(sectionId, btnEl) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('section-' + sectionId).classList.add('active');
  if (btnEl) btnEl.classList.add('active');

  if (window.innerWidth <= 992) {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('show');
  }

  if (sectionId === 'dashboard') renderDashboard();
  if (sectionId === 'teachers') renderTeachers();
  if (sectionId === 'students') renderStudents();
  if (sectionId === 'groups') renderGroups();
  if (sectionId === 'balls') renderBalls();
}

// ============================================================
// Toast
// ============================================================
function showToast(msg, type = 'success') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  const icons = { success: '✅', error: '❌', warning: '⚠️' };
  t.innerHTML = `<span>${icons[type] || '💡'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3500);
}

// ============================================================
// Global init
// ============================================================
async function initAdmin() {
  await DB.pullFromAPI();
  updateCounts();
  populateTeacherSelects();
  renderDashboard();
  initProfile();
}

function updateCounts() {
  document.getElementById('teacherCount').textContent = DB.getTeachers().length;
  document.getElementById('studentCount').textContent = DB.getStudents().length;
}

// ============================================================
// PROFILE
// ============================================================
function initProfile() {
  const user = DB.getCurrentUser();
  if (user) {
    document.getElementById('adminNameDisplay').textContent = user.name || user.username;
    if (user.avatar) {
      const avatarEl = document.getElementById('adminAvatarIcon');
      avatarEl.textContent = '';
      avatarEl.style.backgroundImage = `url('${user.avatar}')`;
    } else {
      document.getElementById('adminAvatarIcon').textContent = (user.name || user.username).charAt(0).toUpperCase();
      document.getElementById('adminAvatarIcon').style.backgroundImage = 'none';
    }
  }
}

function openProfileModal() {
  const user = DB.getCurrentUser();
  if (!user) return;
  document.getElementById('profName').value = user.name || '';
  document.getElementById('profUsername').value = user.username || '';
  document.getElementById('profPassword').value = ''; // Parolni yashirish
  document.getElementById('profAvatarBase64').value = user.avatar || '';
  updateProfileAvatarPreview();
  openModal('profileModal');
}

window.handleAvatarFileSelect = function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    document.getElementById('profAvatarBase64').value = evt.target.result;
    updateProfileAvatarPreview();
  };
  reader.readAsDataURL(file);
};

function updateProfileAvatarPreview() {
  const url = document.getElementById('profAvatarBase64').value.trim();
  const pv = document.getElementById('profileAvatarPreview');
  if (url) {
    pv.style.backgroundImage = `url('${url}')`;
    pv.textContent = '';
  } else {
    pv.style.backgroundImage = 'none';
    const name = document.getElementById('profName').value || 'A';
    pv.textContent = name.charAt(0).toUpperCase();
  }
}

async function saveProfile() {
  const user = DB.getCurrentUser();
  if (!user) return;
  
  const name = document.getElementById('profName').value.trim();
  const username = document.getElementById('profUsername').value.trim();
  const password = document.getElementById('profPassword').value.trim();
  const avatar = document.getElementById('profAvatarBase64').value.trim();
  
  if(!name || !username) return showToast("Barcha maydonlarni to'ldiring!", 'warning');
  
  const data = {
    name: name,
    username: username,
    password: password || user.password,
    avatar: avatar
  };

  const res = await DB.updateUser(user.id, data);
  if(res.success) {
    showToast("Profil muvaffaqiyatli saqlandi!");
    initProfile();
    closeModal('profileModal');
  } else {
    showToast(res.message || "Xatolik yuz berdi", "error");
  }
}

// ============================================================
// DASHBOARD
// ============================================================
let studentChartInst = null;
let teacherChartInst = null;
let weeklyChartInst = null;

function renderDashboard() {
  const teachers = DB.getTeachers();
  const students = DB.getStudents();
  const groups = DB.getGroups();
  const atts = DB.getAttendanceByDate(DB.today());

  const cameStudents = atts.filter(a => a.personType === 'student').length;
  const cameTeachers = atts.filter(a => a.personType === 'teacher').length;
  const notCameStudents = students.length - cameStudents;
  const notCameTeachers = teachers.length - cameTeachers;
  const totalScans = atts.length;

  // Stats
  document.getElementById('dashDateBadge').innerHTML = `🗓️ ${DB.today()}`;
  document.getElementById('dashStats').innerHTML = `
    <div class="stat-card" style="cursor:pointer;" onclick="navToStudentsFromDash('all')">
      <div class="stat-icon-wrap purple"><i data-lucide="users" width="24" height="24"></i></div>
      <div class="stat-info">
        <div class="stat-label">Jami o'quvchilar</div>
        <div class="stat-value">${students.length}</div>
      </div>
    </div>
    <div class="stat-card" style="cursor:pointer;" onclick="navToStudentsFromDash('came')">
      <div class="stat-icon-wrap green"><i data-lucide="user-check" width="24" height="24"></i></div>
      <div class="stat-info">
        <div class="stat-label">Bugun keldi</div>
        <div class="stat-value">${cameStudents + cameTeachers}</div>
      </div>
    </div>
    <div class="stat-card" style="cursor:pointer;" onclick="navToStudentsFromDash('notcame')">
      <div class="stat-icon-wrap red"><i data-lucide="user-x" width="24" height="24"></i></div>
      <div class="stat-info">
        <div class="stat-label">Kelmadi</div>
        <div class="stat-value">${notCameStudents + notCameTeachers}</div>
      </div>
    </div>
    <div class="stat-card" style="cursor:pointer;" onclick="showSection('scanner', document.querySelector('[data-section=\'scanner\']'))">
      <div class="stat-icon-wrap blue"><i data-lucide="scan" width="24" height="24"></i></div>
      <div class="stat-info">
        <div class="stat-label">Jami skan</div>
        <div class="stat-value">${totalScans}</div>
      </div>
    </div>
    <div class="stat-card" style="cursor:pointer;" onclick="showSection('teachers', document.querySelector('[data-section=\'teachers\']'))">
      <div class="stat-icon-wrap orange"><i data-lucide="graduation-cap" width="24" height="24"></i></div>
      <div class="stat-info">
        <div class="stat-label">O'qituvchilar</div>
        <div class="stat-value">${teachers.length}</div>
      </div>
    </div>
  `;

  // Provide navToStudentsFromDash in global scope for dashboard clicks
  window.navToStudentsFromDash = function (status) {
    showSection('students', document.querySelector('[data-section="students"]'));
    document.getElementById('sFilter-status').value = status;
    applyStudentFilters();
  };

  // Donut charts
  if (studentChartInst) studentChartInst.destroy();
  if (teacherChartInst) teacherChartInst.destroy();

  studentChartInst = Charts.renderDonut('studentChart',
    ['Keldi', 'Kelmadi'],
    [cameStudents, notCameStudents],
    ['#00D4AA', '#FF4757']
  );

  document.getElementById('studentDonutCenter').innerHTML = `
    <div class="ddc-val">${cameStudents}</div>
    <div class="ddc-label">Keldi</div>
  `;
  document.getElementById('studentLegend').innerHTML = `
    <div class="legend-item"><div class="legend-label"><div class="legend-dot" style="background:#00D4AA"></div>Keldi</div><div class="legend-val">${cameStudents}</div></div>
    <div class="legend-item"><div class="legend-label"><div class="legend-dot" style="background:#FF4757"></div>Kelmadi</div><div class="legend-val">${notCameStudents}</div></div>
  `;

  teacherChartInst = Charts.renderDonut('teacherChart',
    ['Keldi', 'Kelmadi'],
    [cameTeachers, notCameTeachers],
    ['#6C63FF', '#FFA502']
  );

  document.getElementById('teacherDonutCenter').innerHTML = `
    <div class="ddc-val">${cameTeachers}</div>
    <div class="ddc-label">Keldi</div>
  `;
  document.getElementById('teacherLegend').innerHTML = `
    <div class="legend-item"><div class="legend-label"><div class="legend-dot" style="background:#6C63FF"></div>Keldi</div><div class="legend-val">${cameTeachers}</div></div>
    <div class="legend-item"><div class="legend-label"><div class="legend-dot" style="background:#FFA502"></div>Kelmadi</div><div class="legend-val">${notCameTeachers}</div></div>
  `;

  // Weekly Chart (Modern Analytics Style)
  const labels = [];
  const presentData = [];
  const absentData = [];
  const lateData = [];
  const totalStudents = DB.getStudents().length;

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = DB.formatDate(d);
    labels.push(d.getDate() + ' ' + ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'][d.getMonth()]);

    const atts = DB.getAttendanceByDate(dateStr).filter(a => a.personType === 'student');
    const presentCount = atts.length;
    // Simulate late students (scanned after 08:00) or generate realistically based on data
    const lateCount = atts.filter(a => a.time && a.time >= '08:00:00').length;
    const absentCount = Math.max(0, totalStudents - presentCount);

    presentData.push(presentCount);
    absentData.push(absentCount);
    lateData.push(lateCount);
  }

  if (weeklyChartInst) weeklyChartInst.destroy();
  weeklyChartInst = new Chart(document.getElementById('weeklyChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Keldi',
          data: presentData,
          borderColor: '#22C55E', // Green
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointBackgroundColor: '#22C55E',
          fill: true
        },
        {
          label: 'Kelmadi',
          data: absentData,
          borderColor: '#EF4444', // Red
          backgroundColor: 'transparent',
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointBackgroundColor: '#EF4444'
        },
        {
          label: 'Kechikkan',
          data: lateData,
          borderColor: '#F59E0B', // Orange
          backgroundColor: 'transparent',
          borderWidth: 3,
          borderDash: [5, 5],
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointBackgroundColor: '#F59E0B'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
            color: 'var(--text-secondary)',
            font: { size: 12, family: 'Inter', weight: '500' },
            padding: 20
          }
        },
        tooltip: {
          backgroundColor: 'var(--bg-card)',
          titleColor: 'var(--text-primary)',
          bodyColor: 'var(--text-secondary)',
          borderColor: 'var(--border)',
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
          titleFont: { size: 13, family: 'Inter', weight: '600' },
          bodyFont: { size: 12, family: 'Inter' }
        }
      },
      scales: {
        x: {
          grid: { display: false, drawBorder: false },
          ticks: { color: 'var(--text-secondary)', font: { size: 11, family: 'Inter' }, padding: 10 }
        },
        y: {
          grid: { color: 'var(--border)', drawBorder: false, borderDash: [4, 4] },
          ticks: { color: 'var(--text-secondary)', font: { size: 11, family: 'Inter' }, padding: 10, stepSize: 5 },
          beginAtZero: true
        }
      },
      elements: {
        line: {
          shadowColor: 'rgba(0,0,0,0.1)',
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowOffsetY: 4
        }
      }
    }
  });

  // Recent list
  const recentEl = document.getElementById('recentList');
  if (!atts.length) {
    recentEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">Bugun hali hech kim skaner qilinmadi</div>';
  } else {
    // top 10 recent
    recentEl.innerHTML = atts.slice().reverse().slice(0, 10).map(a => {
      const p = a.personType === 'student' ? DB.getStudentById(a.personId) : DB.getTeacherById(a.personId);
      if (!p) return '';
      const name = p.name + ' ' + (p.surname || '');
      const roleStr = a.personType === 'student' ? 'O\'quvchi' : 'O\'qituvchi';
      return `
        <div class="recent-item">
          <div class="ri-avatar ${a.personType === 'student' ? 't-student' : 't-teacher'}">${name.charAt(0).toUpperCase()}</div>
          <div class="ri-info">
            <div class="ri-name">${name}</div>
            <div class="ri-sub">${roleStr}</div>
          </div>
          <div class="ri-time">${a.time}</div>
        </div>
      `;
    }).join('');
  }

  if (window.lucide) {
    if(window.lucide) requestAnimationFrame(() => lucide.createIcons());
  }
}

// ============================================================
// TEACHERS
// ============================================================
// ============================================================
// TEACHERS (Premium SaaS Redesign)
// ============================================================
let currentTeacherPage = 1;
const TEACHERS_PER_PAGE = 9;

function resetTeacherFilters() {
  document.getElementById('teacherSearch').value = '';
  document.getElementById('tFilter-subject').value = '';
  document.getElementById('tFilter-status').value = 'all';
  document.getElementById('tFilter-sort').value = 'newest';
  currentTeacherPage = 1;
  applyTeacherFilters();
}

function applyTeacherFilters() {
  currentTeacherPage = 1; // reset to first page on filter change
  renderTeachers();
}

function changeTeacherPage(dir) {
  currentTeacherPage += dir;
  renderTeachers();
}

function toggleTeacherActionMenu(e, id) {
  e.stopPropagation();
  const allMenus = document.querySelectorAll('.action-dropdown');
  let targetMenu = document.getElementById('tMenu-' + id);
  let isCurrentlyShown = targetMenu && targetMenu.classList.contains('show');

  allMenus.forEach(m => m.classList.remove('show')); // close all
  if (!isCurrentlyShown && targetMenu) {
    targetMenu.classList.add('show');
  }
}

// Close menus when clicking outside
document.addEventListener('click', () => {
  document.querySelectorAll('.action-dropdown').forEach(m => m.classList.remove('show'));
});

function renderTeachers() {
  const query = document.getElementById('teacherSearch').value.toLowerCase();
  const subjectFilter = document.getElementById('tFilter-subject').value;
  const statusFilter = document.getElementById('tFilter-status').value;
  const sortFilter = document.getElementById('tFilter-sort').value;

  let teachers = DB.getTeachers().filter(t => t && t.name);

  // Apply Search
  if (query) {
    teachers = teachers.filter(t =>
      t.name.toLowerCase().includes(query) ||
      (t.surname || '').toLowerCase().includes(query) ||
      (t.code || '').toLowerCase().includes(query) ||
      (t.username || '').toLowerCase().includes(query)
    );
  }

  // Apply Subject Filter
  if (subjectFilter) {
    teachers = teachers.filter(t => t.jobType === subjectFilter);
  }

  // Apply Status Filter
  if (statusFilter !== 'all') {
    teachers = teachers.filter(t => {
      const came = DB.isAttendedToday(t.id);
      return statusFilter === 'came' ? came : !came;
    });
  }

  // Calculate dynamic stats for sorting and rendering
  teachers = teachers.map(t => {
    const came = DB.isAttendedToday(t.id);
    const stuCount = DB.getStudentsByTeacher(t.id).length;
    const groupCount = DB.getGroupsByTeacher(t.id).length;
    const rating = DB.getTotalBalls(t.id);
    // Dummy attendance percentage logic based on rating and presence
    const attendancePct = Math.min(100, Math.floor(70 + (rating / 10) + (came ? 10 : 0)));
    return { ...t, came, stuCount, groupCount, rating, attendancePct };
  });

  // Apply Sort
  if (sortFilter === 'name_asc') teachers.sort((a, b) => a.name.localeCompare(b.name));
  else if (sortFilter === 'name_desc') teachers.sort((a, b) => b.name.localeCompare(a.name));
  else if (sortFilter === 'attendance_desc') teachers.sort((a, b) => b.rating - a.rating);
  else teachers.reverse(); // newest first (default array order is chronological)

  // Update total count badge
  document.getElementById('teacherCountBadge').textContent = teachers.length;

  const el = document.getElementById('teacherCards');

  // Empty state
  if (!teachers.length) {
    document.getElementById('teacherPagination').style.display = 'none';
    el.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1; padding:60px 20px;">
        <div class="empty-icon" style="background:var(--primary-light); color:var(--primary); width:80px; height:80px; font-size:32px; border-radius:24px; margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center;">
          <i data-lucide="search-x" width="40" height="40"></i>
        </div>
        <div class="empty-text" style="font-size:20px; font-weight:700; color:var(--text-primary);">O'qituvchilar topilmadi</div>
        <div class="empty-sub" style="font-size:14px; margin-top:8px;">Filtrlarni o'zgartiring yoki yangi o'qituvchi qo'shing.</div>
        <button class="btn btn-primary" style="margin-top:24px; border-radius:10px; padding:10px 20px;" onclick="resetTeacherFilters()">Filtrlarni tozalash</button>
      </div>`;
    if(window.lucide) requestAnimationFrame(() => lucide.createIcons());
    return;
  }

  // Pagination
  const totalPages = Math.ceil(teachers.length / TEACHERS_PER_PAGE);
  if (currentTeacherPage > totalPages) currentTeacherPage = totalPages;
  if (currentTeacherPage < 1) currentTeacherPage = 1;

  const startIndex = (currentTeacherPage - 1) * TEACHERS_PER_PAGE;
  const paginatedTeachers = teachers.slice(startIndex, startIndex + TEACHERS_PER_PAGE);

  const pagEl = document.getElementById('teacherPagination');
  if (totalPages > 1) {
    pagEl.style.display = 'flex';
    document.getElementById('tPageIndicator').textContent = `${currentTeacherPage} / ${totalPages}`;
    document.getElementById('tPagePrev').disabled = currentTeacherPage === 1;
    document.getElementById('tPageNext').disabled = currentTeacherPage === totalPages;
  } else {
    pagEl.style.display = 'none';
  }

  // Render Cards
  el.innerHTML = paginatedTeachers.map(t => {
    return `
      <div class="modern-profile-card status-${t.came ? 'active' : 'inactive'}" onclick="showTeacherDetail('${t.id}')" style="cursor:pointer;">
        <div class="mpc-actions">
          <button class="mpc-btn" onclick="toggleTeacherActionMenu(event, '${t.id}')"><i data-lucide="more-horizontal" width="18" height="18"></i></button>
          <div class="action-dropdown" id="tMenu-${t.id}">
            <button class="action-dropdown-item" onclick="event.stopPropagation(); showTeacherDetail('${t.id}')"><i data-lucide="eye" width="14" height="14"></i> Profilni ko'rish</button>
            <button class="action-dropdown-item" onclick="event.stopPropagation(); openAddTeacherModal('${t.id}')"><i data-lucide="edit" width="14" height="14"></i> Tahrirlash</button>
            <button class="action-dropdown-item" onclick="event.stopPropagation(); showTeacherDetail('${t.id}')"><i data-lucide="calendar" width="14" height="14"></i> Davomat tarixi</button>
            <div style="height:1px; background:var(--border); margin:4px 0;"></div>
            <button class="action-dropdown-item danger" onclick="event.stopPropagation(); deletePerson('${t.id}', 'teacher'); renderTeachers();"><i data-lucide="trash-2" width="14" height="14"></i> O'chirish</button>
          </div>
        </div>
        
        <div class="mpc-header">
          <div class="mpc-avatar" style="${t.avatar ? 'padding:0; background:none;' : ''}">
            ${t.avatar ? `<img src="${t.avatar}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" />` : (t.name[0] + (t.surname ? t.surname[0] : '')).toUpperCase()}
          </div>
          <div class="mpc-info">
            <div class="mpc-name">${t.name} ${t.surname || ''}</div>
            <div class="mpc-role"><i data-lucide="book-open" width="14" height="14"></i> ${t.jobType || 'O\'qituvchi'}</div>
          </div>
        </div>
        
        <div class="mpc-contact">
          <div class="mpc-contact-item"><i data-lucide="phone" width="14" height="14"></i> ${t.phone || 'Noma\'lum'}</div>
          <div class="mpc-contact-item"><i data-lucide="mail" width="14" height="14"></i> ${t.username}@maktab.uz</div>
          <div class="mpc-contact-item" style="color:var(--text-muted);"><i data-lucide="calendar-days" width="14" height="14"></i> Qo'shilgan: ${t.createdAt || 'Yaqinda'}</div>
        </div>
        
        <div class="mpc-stats">
          <div class="mpc-stat">
            <div class="mpc-stat-val">${t.groupCount}</div>
            <div class="mpc-stat-label">Guruhlar</div>
          </div>
          <div class="mpc-stat">
            <div class="mpc-stat-val">${t.stuCount}</div>
            <div class="mpc-stat-label">O'quvchilar</div>
          </div>
          <div class="mpc-stat">
            <div class="mpc-stat-val" style="color:${t.attendancePct >= 80 ? 'var(--success)' : 'var(--warning)'};">${t.attendancePct}%</div>
            <div class="mpc-stat-label">Davomat</div>
          </div>
          <div class="mpc-stat">
            <div class="mpc-stat-val" style="display:flex;align-items:center;justify-content:center;gap:2px;">${t.rating} <i data-lucide="star" width="12" height="12" fill="var(--warning)" color="var(--warning)"></i></div>
            <div class="mpc-stat-label">Reyting</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if(window.lucide) requestAnimationFrame(() => lucide.createIcons());
}

// ============================================================
// STUDENTS (Premium SaaS Redesign)
// ============================================================
let currentStudentPage = 1;
const STUDENTS_PER_PAGE = 10;

function populateTeacherSelects() {
  const teachers = DB.getTeachers();
  let filterOpts = '<option value="">Barcha o\'qituvchilar</option>';
  let addOpts = '<option value="">— O\'qituvchi tanlang —</option>';
  let groupOpts = '<option value="">— O\'qituvchi tanlang —</option>';

  teachers.forEach(t => {
    const name = `${t.name} ${t.surname || ''}`;
    filterOpts += `<option value="${t.id}">${name}</option>`;
    addOpts += `<option value="${t.id}">${name}</option>`;
    groupOpts += `<option value="${t.id}">${name}</option>`;
  });

  document.getElementById('sFilter-teacher').innerHTML = filterOpts;
  document.getElementById('sTeacher').innerHTML = addOpts;
  document.getElementById('groupTeacher').innerHTML = groupOpts;
}

function onStudentFilterTeacherChange() {
  const tId = document.getElementById('sFilter-teacher').value;
  const gSel = document.getElementById('sFilter-group');

  if (!tId) {
    gSel.innerHTML = '<option value="">Barcha guruhlar</option>';
    gSel.disabled = true;
  } else {
    const groups = DB.getGroupsByTeacher(tId);
    let opts = '<option value="">Barcha guruhlar</option>';
    groups.forEach(g => { opts += `<option value="${g.id}">${g.name}</option>`; });
    gSel.innerHTML = opts;
    gSel.disabled = false;
  }
}

function resetStudentFilters() {
  document.getElementById('studentSearch').value = '';
  document.getElementById('sFilter-teacher').value = '';
  document.getElementById('sFilter-group').value = '';
  document.getElementById('sFilter-status').value = 'all';
  document.getElementById('sFilter-sort').value = 'newest';
  document.getElementById('sFilter-group').disabled = true;
  currentStudentPage = 1;
  applyStudentFilters();
}

function applyStudentFilters() {
  currentStudentPage = 1;
  renderStudents();
}

function changeStudentPage(dir) {
  currentStudentPage += dir;
  renderStudents();
}

function toggleStudentActionMenu(e, id) {
  e.stopPropagation();
  const allMenus = document.querySelectorAll('.action-dropdown');
  let targetMenu = document.getElementById('sMenu-' + id);
  let isCurrentlyShown = targetMenu && targetMenu.classList.contains('show');

  allMenus.forEach(m => m.classList.remove('show'));
  if (!isCurrentlyShown && targetMenu) {
    targetMenu.classList.add('show');
  }
}

function renderStudents() {
  const query = document.getElementById('studentSearch').value.toLowerCase();
  const tId = document.getElementById('sFilter-teacher').value;
  const gId = document.getElementById('sFilter-group').value;
  const statusFilter = document.getElementById('sFilter-status').value;
  const sortFilter = document.getElementById('sFilter-sort').value;

  let students = DB.getStudents().filter(s => s && s.name);

  // Apply Search
  if (query) {
    students = students.filter(s =>
      s.name.toLowerCase().includes(query) ||
      (s.code || '').toLowerCase().includes(query) ||
      (s.username || '').toLowerCase().includes(query)
    );
  }

  // Apply Cascading Filters
  if (tId) students = students.filter(s => s.teacherId === tId);
  if (gId) students = students.filter(s => s.groupId === gId);

  // Calculate dynamic stats
  let presentCount = 0;
  let absentCount = 0;

  students = students.map(s => {
    const came = DB.isAttendedToday(s.id);
    if (came) presentCount++;
    else absentCount++;

    // Dummy attendance percentage
    const rating = s.points || 0;
    const attendancePct = Math.min(100, Math.floor(75 + (came ? 10 : 0) + (rating > 5 ? 5 : 0)));

    return { ...s, came, attendancePct };
  });

  // Apply Status Filter
  if (statusFilter !== 'all') {
    if (statusFilter === 'came') students = students.filter(s => s.came);
    else if (statusFilter === 'notcame') students = students.filter(s => !s.came);
    // 'late' not properly tracked in dummy DB, but could filter by scan time
  }

  // Apply Sort
  if (sortFilter === 'name_asc') students.sort((a, b) => a.name.localeCompare(b.name));
  else if (sortFilter === 'name_desc') students.sort((a, b) => b.name.localeCompare(a.name));
  else if (sortFilter === 'attendance_desc') students.sort((a, b) => b.attendancePct - a.attendancePct);
  else students.reverse();

  // Update Top Quick Stats
  document.getElementById('studentCountBadge').textContent = students.length;
  document.getElementById('stat-total-students').textContent = students.length;
  document.getElementById('stat-present-students').textContent = presentCount;
  document.getElementById('stat-absent-students').textContent = absentCount;
  const totalAtt = students.length > 0 ? Math.floor((presentCount / students.length) * 100) : 0;
  document.getElementById('stat-attendance-percent').textContent = totalAtt + '%';

  const tbody = document.getElementById('studentTableBody');
  const emptyState = document.getElementById('studentEmptyState');
  const pagEl = document.getElementById('studentPagination');

  if (!students.length) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    pagEl.style.display = 'none';
    if(window.lucide) requestAnimationFrame(() => lucide.createIcons());
    return;
  }

  emptyState.style.display = 'none';

  // Pagination
  const totalPages = Math.ceil(students.length / STUDENTS_PER_PAGE);
  if (currentStudentPage > totalPages) currentStudentPage = totalPages;
  if (currentStudentPage < 1) currentStudentPage = 1;

  const startIndex = (currentStudentPage - 1) * STUDENTS_PER_PAGE;
  const paginatedStudents = students.slice(startIndex, startIndex + STUDENTS_PER_PAGE);

  if (totalPages > 1) {
    pagEl.style.display = 'flex';
    document.getElementById('sPageIndicator').textContent = `${currentStudentPage} / ${totalPages}`;
    document.getElementById('sPagePrev').disabled = currentStudentPage === 1;
    document.getElementById('sPageNext').disabled = currentStudentPage === totalPages;
  } else {
    pagEl.style.display = 'none';
  }

  tbody.innerHTML = paginatedStudents.map(s => {
    const group = DB.getGroupById(s.groupId);
    const teacher = DB.getTeacherById(s.teacherId);
    const tName = teacher ? teacher.name + ' ' + (teacher.surname || '') : '—';
    const gName = group ? group.name : '—';
    const scanTime = s.came ? '07:45' : '—'; // Dummy time

    return `
      <tr onclick="showStudentDetail('${s.id}')" style="cursor:pointer;">
        <td>
          <div class="tc-student">
            <div class="tc-avatar" style="${s.avatar ? 'padding:0; background:none;' : ''}">
              ${s.avatar ? `<img src="${s.avatar}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" />` : s.name[0].toUpperCase()}
            </div>
            <div class="tc-info">
              <div class="tc-name">${s.name} ${s.surname || ''}</div>
              <div class="tc-id">ID: ${s.code}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="font-weight:500;">${gName}</div>
          <div style="font-size:12px;color:var(--text-muted);"><i data-lucide="graduation-cap" width="12" height="12"></i> ${tName}</div>
        </td>
        <td style="color:var(--text-secondary); font-family:monospace;">${s.phone || 'Noma\'lum'}</td>
        <td>
          <span class="status-badge ${s.came ? 'present' : 'absent'}"><i data-lucide="${s.came ? 'check-circle-2' : 'x-circle'}" width="14" height="14"></i> ${s.came ? 'Keldi' : 'Kelmadi'}</span>
        </td>
        <td style="font-weight:600; color:${s.attendancePct >= 80 ? 'var(--success)' : 'var(--warning)'};">${s.attendancePct}%</td>
        <td style="font-size:12px;">
          <div style="margin-bottom:2px;color:var(--text-secondary);"><i data-lucide="user" width="12" height="12"></i> ${s.username}</div>
          <div style="color:var(--text-muted);"><i data-lucide="key" width="12" height="12"></i> ${s.password}</div>
        </td>
        <td class="td-actions">
          <button class="mpc-btn" onclick="toggleStudentActionMenu(event, '${s.id}')" style="display:inline-flex;"><i data-lucide="more-vertical" width="18" height="18"></i></button>
          <div class="action-dropdown" id="sMenu-${s.id}">
            <button class="action-dropdown-item" onclick="event.stopPropagation(); showStudentDetail('${s.id}')"><i data-lucide="eye" width="14" height="14"></i> Ko'rish</button>
            <button class="action-dropdown-item" onclick="event.stopPropagation(); openAddStudentModal('${s.id}')"><i data-lucide="edit" width="14" height="14"></i> Tahrirlash</button>
            <button class="action-dropdown-item" onclick="event.stopPropagation(); downloadQrCode('${s.id}')"><i data-lucide="qr-code" width="14" height="14"></i> QR Kod</button>
            <button class="action-dropdown-item" onclick="event.stopPropagation(); showStudentDetail('${s.id}')"><i data-lucide="calendar" width="14" height="14"></i> Davomat tarixi</button>
            <div style="height:1px; background:var(--border); margin:4px 0;"></div>
            <button class="action-dropdown-item danger" onclick="event.stopPropagation(); deletePerson('${s.id}', 'student'); renderStudents();"><i data-lucide="trash-2" width="14" height="14"></i> O'chirish</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if(window.lucide) requestAnimationFrame(() => lucide.createIcons());
}

// ============================================================
// GROUPS
// ============================================================
function renderGroups() {
  const groups = DB.getGroups();
  const el = document.getElementById('groupCards');
  if (!groups.length) {
    el.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon"><i data-lucide="folder" width="48" height="48"></i></div><div class="empty-text">Guruhlar yo\'q</div><div class="empty-sub">Yangi guruh qo\'shing</div></div>';
    if(window.lucide) requestAnimationFrame(() => lucide.createIcons());
    return;
  }

  el.innerHTML = groups.map(g => {
    const teacher = DB.getTeacherById(g.teacherId);
    const tName = teacher ? `${teacher.name} ${teacher.surname || ''}` : 'Biriktirilmagan';
    const stuCount = DB.getStudents().filter(s => s.groupId === g.id).length;
    return `
      <div class="card" style="cursor:pointer;" onclick="openAdminGroupDetail('${g.id}')">
        <div class="card-header">
          <div class="card-title"><i data-lucide="folder" width="18" height="18"></i> ${g.name}</div>
          <div style="display:flex;gap:8px;">
            <button class="table-action-btn" title="Tahrirlash" onclick="event.stopPropagation(); openAddGroupModal('${g.id}')"><i data-lucide="edit" width="16" height="16"></i></button>
            <button class="table-action-btn danger" title="O'chirish" onclick="event.stopPropagation(); deleteGroup('${g.id}')"><i data-lucide="trash-2" width="16" height="16"></i></button>
          </div>
        </div>
        <div class="card-body">
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;"><i data-lucide="graduation-cap" width="14" height="14" style="margin-right:4px;"></i> O'qituvchi: <span style="color:var(--text-primary);font-weight:600;">${tName}</span></div>
          <div style="font-size:12px;color:var(--text-secondary);"><i data-lucide="users" width="14" height="14" style="margin-right:4px;"></i> O'quvchilar: <span style="color:var(--primary);font-weight:600;">${stuCount} ta</span></div>
        </div>
      </div>
    `;
  }).join('');

  if(window.lucide) requestAnimationFrame(() => lucide.createIcons());
}

function openAdminGroupDetail(groupId) {
  const group = DB.getGroupById(groupId);
  if (!group) return;
  document.getElementById('adminGdTitle').textContent = `Guruh: ${group.name}`;

  const students = DB.getStudentsByGroup(groupId);
  const tbody = document.getElementById('adminGdTableBody');

  if (!students.length) {
    tbody.innerHTML = '<tr><td colspan="3"><div class="empty-state"><div class="empty-text">Bu guruhda o\'quvchilar yo\'q</div></div></td></tr>';
  } else {
    tbody.innerHTML = students.map(s => {
      const came = DB.isAttendedToday(s.id);
      return `
        <tr onclick="showStudentDetail('${s.id}')" style="cursor:pointer;">
          <td style="font-weight:600;">${s.name}</td>
          <td style="font-family:monospace; color:var(--text-muted);">${s.code}</td>
          <td style="text-align:right;">
            <span class="badge ${came ? 'badge-success' : 'badge-danger'}">${came ? 'Keldi' : 'Kelmadi'}</span>
          </td>
        </tr>
      `;
    }).join('');
  }

  showSection('group-detail');
}

function deleteGroup(id) {
  if (!confirm('Guruhni o\'chirmoqchimisiz?')) return;
  DB.deleteGroup(id);
  showToast('Guruh o\'chirildi');
  renderGroups();
  populateTeacherSelects();
}

let editingGroupId = null;

function openAddGroupModal(id = null) {
  editingGroupId = id;
  const modalTitle = document.querySelector('#addGroupModal .modal-title');
  const createBtn = document.getElementById('createGroupBtn');

  if (id) {
    const g = DB.getGroupById(id);
    if (g) {
      document.getElementById('groupName').value = g.name || '';
      document.getElementById('groupTeacher').value = g.teacherId || '';
      if (modalTitle) modalTitle.innerHTML = `<i data-lucide="edit"></i> Guruhni tahrirlash`;
      if (createBtn) createBtn.textContent = 'Saqlash';
    }
  } else {
    document.getElementById('groupName').value = '';
    document.getElementById('groupTeacher').value = '';
    if (modalTitle) modalTitle.innerHTML = `<i data-lucide="folder-plus"></i> Yangi guruh qo'shish`;
    if (createBtn) createBtn.textContent = 'Yaratish';
  }

  openModal('addGroupModal');
  if(window.lucide) requestAnimationFrame(() => lucide.createIcons());
}

async function saveGroup() {
  const name = document.getElementById('groupName').value.trim();
  const teacherId = document.getElementById('groupTeacher').value;

  if (!name || !teacherId) {
    showToast("Ma'lumotlarni to'ldiring", "error");
    return;
  }

  if (editingGroupId) {
    await DB.updateGroup(editingGroupId, name, teacherId);
    showToast("Guruh tahrirlandi!");
  } else {
    await DB.addGroup(name, teacherId);
    showToast("Guruh qo'shildi!");
  }

  closeModal('addGroupModal');
  renderGroups();
  populateTeacherSelects();
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

// ============================================================
// BALLS (Rating)
// ============================================================
function renderBalls() {
  const teachers = DB.getTeachers();
  const students = DB.getStudents();

  let list = [];
  teachers.forEach(t => list.push({ name: t.name + ' ' + (t.surname || ''), type: 'O\'qituvchi', code: t.code, id: t.id }));
  students.forEach(s => list.push({ name: s.name, type: 'O\'quvchi', code: s.code, id: s.id }));

  list.forEach(item => { item.balls = DB.getTotalBalls(item.id); });
  list.sort((a, b) => b.balls - a.balls);

  const tbody = document.getElementById('ballsTableBody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon"><i data-lucide="award" width="48" height="48"></i></div><div class="empty-text">Hali ma\'lumot yo\'q</div></div></td></tr>';
    if(window.lucide) requestAnimationFrame(() => lucide.createIcons());
    return;
  }

  tbody.innerHTML = list.map((item, index) => {
    let medal = '';
    if (index === 0) medal = '🥇';
    else if (index === 1) medal = '🥈';
    else if (index === 2) medal = '🥉';
    else medal = '#' + (index + 1);

    return `
      <tr>
        <td style="font-weight:800;font-size:16px;">${medal}</td>
        <td style="font-weight:600;">${item.name}</td>
        <td><span class="badge ${item.type === 'O\'qituvchi' ? 'badge-primary' : 'badge-info'}">${item.type}</span></td>
        <td style="font-family:monospace;color:var(--text-muted);font-size:12px;">${item.code}</td>
        <td style="font-weight:800;color:var(--success);font-size:15px;display:flex;align-items:center;gap:4px;">${item.balls} <i data-lucide="star" width="16" height="16" fill="var(--warning)" color="var(--warning)"></i></td>
      </tr>
    `;
  }).join('');

  if(window.lucide) requestAnimationFrame(() => lucide.createIcons());
}

// ============================================================
// MODAL MANAGEMENT
// ============================================================
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// ============================================================
// ADD GROUP
// ============================================================
function openAddGroupModal() {
  document.getElementById('groupName').value = '';
  document.getElementById('groupTeacher').value = '';
  openModal('addGroupModal');
}
function createGroup() {
  const name = document.getElementById('groupName').value.trim();
  const tId = document.getElementById('groupTeacher').value;
  if (!name || !tId) { showToast('Barcha maydonlarni to\'ldiring!', 'error'); return; }
  DB.addGroup(name, tId);
  showToast('✅ Guruh muvaffaqiyatli yaratildi!');
  closeModal('addGroupModal');
  renderGroups();
  populateTeacherSelects();
}

// ============================================================
// ADD TEACHER + QR
// ============================================================
let editingTeacherId = null;

function openAddTeacherModal(id = null) {
  editingTeacherId = id;
  const modalTitle = document.querySelector('#addTeacherModal .modal-title');
  const createBtn = document.getElementById('createTeacherBtn');

  if (id) {
    const t = DB.getTeacherById(id);
    if (t) {
      document.getElementById('tName').value = t.name || '';
      document.getElementById('tSurname').value = t.surname || '';
      document.getElementById('tPhone').value = t.phone || '';
      document.getElementById('tJobType').value = t.jobType || 'O\'qituvchi';
      if (t.avatar) {
        document.getElementById('tAvatarPreview').src = t.avatar;
        document.getElementById('tAvatarUpload').classList.add('has-image');
        currentTeacherAvatarBase64 = t.avatar;
      } else {
        document.getElementById('tAvatarPreview').src = '';
        document.getElementById('tAvatarUpload').classList.remove('has-image');
        currentTeacherAvatarBase64 = null;
      }
      modalTitle.innerHTML = `<i data-lucide="edit"></i> O'qituvchini tahrirlash`;
      createBtn.textContent = 'Saqlash';
    }
  } else {
    document.getElementById('tName').value = '';
    document.getElementById('tSurname').value = '';
    document.getElementById('tPhone').value = '';
    document.getElementById('tJobType').value = 'O\'qituvchi';
    document.getElementById('tAvatarPreview').src = '';
    document.getElementById('tAvatarUpload').classList.remove('has-image');
    currentTeacherAvatarBase64 = null;
    modalTitle.innerHTML = `<i data-lucide="graduation-cap"></i> Yangi o'qituvchi qo'shish`;
    createBtn.textContent = 'Yaratish va QR olish';
  }

  document.getElementById('teacherQrArea').style.display = 'none';
  createBtn.style.display = '';
  document.getElementById('saveTeacherBtn').style.display = 'none';
  currentNewTeacher = null;
  openModal('addTeacherModal');
  if(window.lucide) requestAnimationFrame(() => lucide.createIcons());
}

async function createTeacher() {
  const name = document.getElementById('tName').value.trim();
  const surname = document.getElementById('tSurname').value.trim();
  const phone = document.getElementById('tPhone').value.trim();
  const job = document.getElementById('tJobType').value;

  if (!name || !surname) { showToast('Ism va familya majburiy!', 'error'); return; }

  if (editingTeacherId) {
    await DB.updateTeacher(editingTeacherId, { name, surname, phone, jobType: job, avatar: currentTeacherAvatarBase64 });
    showToast('✅ O\'qituvchi muvaffaqiyatli tahrirlandi!');
    closeModal('addTeacherModal');
    if (document.getElementById('teacherDetailOverlay').classList.contains('active')) {
      showTeacherDetail(editingTeacherId);
    }
  } else {
    const teacher = await DB.addTeacher(name, surname, phone, job, currentTeacherAvatarBase64);
    currentNewTeacher = teacher;

    document.getElementById('teacherQrArea').style.display = 'block';

    // Add small delay before rendering to avoid 0x0 size in some browsers
    setTimeout(() => {
      const qrEl = document.getElementById('teacherQrCode');
      qrEl.innerHTML = '';
      new QRCode(qrEl, {
        text: 'TEACHER:' + teacher.id,
        width: 180, height: 180,
        colorDark: '#1a1a2e', colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H,
      });
    }, 10);

    document.getElementById('createTeacherBtn').style.display = 'none';
    document.getElementById('saveTeacherBtn').style.display = '';
    showToast('✅ O\'qituvchi muvaffaqiyatli yaratildi!');
  }

  // Auto refresh everything
  updateCounts();
  populateTeacherSelects();
  renderTeachers();
}

function saveTeacherAndDownload() {
  if (!currentNewTeacher) return;
  downloadQrCode(currentNewTeacher.id);
  closeModal('addTeacherModal');
}

// ============================================================
// ADD STUDENT + QR
// ============================================================
let editingStudentId = null;

function openAddStudentModal(id = null) {
  editingStudentId = id;
  const modalTitle = document.querySelector('#addStudentModal .modal-title');
  const createBtn = document.getElementById('createStudentBtn');
  const gSel = document.getElementById('sGroup');
  populateTeacherSelects();

  if (id) {
    const s = DB.getStudentById(id);
    if (s) {
      document.getElementById('sName').value = s.name || '';
      document.getElementById('sPhone').value = s.phone || '';
      document.getElementById('sTeacher').value = s.teacherId || '';
      onAddStudentTeacherChange();
      gSel.value = s.groupId || '';
      if (s.avatar) {
        document.getElementById('sAvatarPreview').src = s.avatar;
        document.getElementById('sAvatarUpload').classList.add('has-image');
        currentStudentAvatarBase64 = s.avatar;
      } else {
        document.getElementById('sAvatarPreview').src = '';
        document.getElementById('sAvatarUpload').classList.remove('has-image');
        currentStudentAvatarBase64 = null;
      }
      modalTitle.innerHTML = `<i data-lucide="edit"></i> O'quvchini tahrirlash`;
      createBtn.textContent = 'Saqlash';
    }
  } else {
    document.getElementById('sName').value = '';
    document.getElementById('sPhone').value = '';
    document.getElementById('sTeacher').value = '';
    gSel.innerHTML = '<option value="">— Avval o\'qituvchi tanlang —</option>';
    gSel.disabled = true;
    document.getElementById('sAvatarPreview').src = '';
    document.getElementById('sAvatarUpload').classList.remove('has-image');
    currentStudentAvatarBase64 = null;
    modalTitle.innerHTML = `<i data-lucide="user-plus"></i> Yangi o'quvchi qo'shish`;
    createBtn.textContent = 'Yaratish va QR olish';
  }

  document.getElementById('studentQrArea').style.display = 'none';
  createBtn.style.display = '';
  document.getElementById('saveStudentBtn').style.display = 'none';
  currentNewStudent = null;
  openModal('addStudentModal');
  if(window.lucide) requestAnimationFrame(() => lucide.createIcons());
}

function onAddStudentTeacherChange() {
  const tId = document.getElementById('sTeacher').value;
  const gSel = document.getElementById('sGroup');
  if (!tId) {
    gSel.innerHTML = '<option value="">— Avval o\'qituvchi tanlang —</option>';
    gSel.disabled = true;
    return;
  }
  const groups = DB.getGroupsByTeacher(tId);
  if (!groups.length) {
    gSel.innerHTML = '<option value="">Bu o\'qituvchida guruh yo\'q</option>';
    gSel.disabled = true;
    showToast('Bu o\'qituvchiga avval guruh qo\'shing!', 'warning');
    return;
  }
  let opts = '<option value="">— Guruh tanlang —</option>';
  groups.forEach(g => { opts += `<option value="${g.id}">${g.name}</option>`; });
  gSel.innerHTML = opts;
  gSel.disabled = false;
}

async function createStudent() {
  const name = document.getElementById('sName').value.trim();
  const phone = document.getElementById('sPhone').value.trim();
  const teacherId = document.getElementById('sTeacher').value;
  const groupId = document.getElementById('sGroup').value;

  if (!name) { showToast('O\'quvchi ismini kiriting!', 'error'); return; }
  if (!teacherId) { showToast('O\'qituvchini tanlang!', 'error'); return; }
  if (!groupId) { showToast('Guruhni tanlang!', 'error'); return; }

  if (editingStudentId) {
    await DB.updateStudent(editingStudentId, name, phone, groupId, teacherId, currentStudentAvatarBase64);
    showToast('✅ O\'quvchi muvaffaqiyatli tahrirlandi!');
    closeModal('addStudentModal');
    if (document.getElementById('studentDetailOverlay').classList.contains('active')) {
      showStudentDetail(editingStudentId);
    }
  } else {
    const student = await DB.addStudent(name, phone, groupId, teacherId, currentStudentAvatarBase64);
    currentNewStudent = student;

    document.getElementById('studentQrArea').style.display = 'block';

    setTimeout(() => {
      const qrEl = document.getElementById('studentQrCode');
      qrEl.innerHTML = '';
      new QRCode(qrEl, {
        text: 'STUDENT:' + student.id,
        width: 180, height: 180,
        colorDark: '#1a1a2e', colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H,
      });
    }, 10);

    document.getElementById('createStudentBtn').style.display = 'none';
    document.getElementById('saveStudentBtn').style.display = '';
    showToast('✅ O\'quvchi muvaffaqiyatli yaratildi!');
  }

  // Auto refresh
  updateCounts();
  renderStudents();
}

function saveStudentAndDownload() {
  if (!currentNewStudent) return;
  downloadQrCode(currentNewStudent.id);
  closeModal('addStudentModal');
}

// ============================================================
// QR PNG Download — REAL PNG FILE (WITH ID AND NAME)
// ============================================================
function downloadQrCode(id) {
  let person = DB.getStudentById(id) || DB.getTeacherById(id);
  if (!person) return;
  const typeStr = DB.getStudentById(id) ? 'STUDENT' : 'TEACHER';

  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.left = '-9999px';
  document.body.appendChild(div);

  new QRCode(div, {
    text: typeStr + ':' + id,
    width: 200, height: 200,
    colorDark: '#1a1a2e', colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H,
  });

  setTimeout(() => {
    const canvas = div.querySelector('canvas');
    if (canvas) {
      // Create a new canvas to include the name and ID
      const cvs = document.createElement('canvas');
      cvs.width = 220;
      cvs.height = 280; // Bo'yini biroz uzaytiramiz id sig'ishi uchun
      const ctx = cvs.getContext('2d');

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 220, 280);

      // Draw QR image
      ctx.drawImage(canvas, 10, 10, 200, 200);

      // Draw name text
      ctx.fillStyle = '#1a1a2e';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      const fullName = person.name + (person.surname ? ' ' + person.surname : '');
      ctx.fillText(fullName, 110, 240);
      
      // Draw ID/Code text
      ctx.fillStyle = '#6D5BFF'; // Primary color
      ctx.font = 'bold 16px monospace';
      ctx.fillText('KOD: ' + (person.code || id), 110, 265);

      const link = document.createElement('a');
      link.download = fullName + '_QR.png';
      link.href = cvs.toDataURL("image/png");
      link.click();
      showToast('📥 QR kod PNG sifatida yuklandi!');
    } else {
      showToast('QR kod yaratishda xatolik!', 'error');
    }
    div.remove();
  }, 100);
}

function downloadQrAsPng(containerId, filename) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const canvas = container.querySelector('canvas');

  if (canvas) {
    canvas.toBlob(function (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = (filename || 'qr_code') + '.png';
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('📥 QR kod PNG sifatida yuklandi!');
    }, 'image/png');
  } else {
    showToast('QR kod topilmadi!', 'error');
  }
}

// ============================================================
// DELETE
// ============================================================
async function deletePerson(id, type) {
  if (!confirm('Haqiqatan ham o\'chirmoqchimisiz?')) return;
  await DB.deletePerson(id, type);
  showToast('Muvaffaqiyatli o\'chirildi');
  updateCounts();
  if (type === 'teacher') {
    renderTeachers();
    populateTeacherSelects();
  } else {
    renderStudents();
  }
}

// ============================================================
// DETAIL PANELS (Slide-in)
// ============================================================
function openDetail(id) { document.getElementById(id).classList.add('active'); }
function closeDetail(id) { document.getElementById(id).classList.remove('active'); }

function showTeacherDetail(id) {
  const t = DB.getTeacherById(id);
  if (!t) return;
  const came = DB.isAttendedToday(t.id);
  const groups = DB.getGroupsByTeacher(t.id);
  const students = DB.getStudentsByTeacher(t.id);

  const content = `
    <div class="detail-avatar" style="${t.avatar ? 'padding:0; background:none;' : ''}">
      ${t.avatar ? `<img src="${t.avatar}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" />` : (t.name[0] + (t.surname ? t.surname[0] : '')).toUpperCase()}
    </div>
    <div class="detail-name">${t.name} ${t.surname || ''}</div>
    <div class="detail-meta">${t.jobType || 'O\'qituvchi'}</div>
    
    <div style="text-align:center;margin:12px 0;">
      <span class="badge ${came ? 'badge-success' : 'badge-danger'}" style="font-size:13px;padding:6px 16px;">${came ? '✅ Bugun keldi' : '❌ Bugun kelmadi'}</span>
    </div>

    <div class="detail-info-grid">
      <div class="detail-info-item">
        <div class="detail-info-label">Telefon</div>
        <div class="detail-info-value">${t.phone || '—'}</div>
      </div>
      <div class="detail-info-item">
        <div class="detail-info-label">Jami ball</div>
        <div class="detail-info-value" style="color:var(--success);">${DB.getTotalBalls(t.id)} ⭐</div>
      </div>
      <div class="detail-info-item">
        <div class="detail-info-label">Guruhlar</div>
        <div class="detail-info-value">${groups.length} ta</div>
      </div>
      <div class="detail-info-item">
        <div class="detail-info-label">O'quvchilar</div>
        <div class="detail-info-value">${students.length} ta</div>
      </div>
    </div>

    <div class="creds-box" style="margin-bottom:20px;">
      <div class="creds-title">🔐 Tizimga kirish ma'lumotlari</div>
      <div class="creds-row"><span class="creds-key">Login:</span> <span class="creds-val">${t.username}</span></div>
      <div class="creds-row"><span class="creds-key">Parol:</span> <span class="creds-val">${t.password}</span></div>
      <div class="creds-row"><span class="creds-key">Kod:</span> <span class="creds-val">${t.code}</span></div>
    </div>
    
    <div class="card" style="padding:16px;">
      <div style="font-weight:700;margin-bottom:12px;font-size:14px;">📅 Davomat tarixi</div>
      <div class="month-selector">
        <select id="tDetailMonth" class="form-select" onchange="renderTDetailAtt('${t.id}')">
          ${getMonthOptions()}
        </select>
      </div>
      <div id="tDetailAttGrid" style="margin-top:12px;"></div>
    </div>
    
    <div class="detail-action-buttons">
      <button class="btn btn-outline" style="flex:1;" onclick="openAddTeacherModal('${t.id}')"><i data-lucide="edit" width="16" height="16"></i> Tahrirlash</button>
      <button class="btn btn-primary" style="flex:1;" onclick="downloadQrCode('${t.id}')"><i data-lucide="qr-code" width="16" height="16"></i> QR yuklash</button>
    </div>
    <button class="btn btn-danger w-full" style="margin-top:10px;" onclick="deletePerson('${t.id}','teacher');closeDetail('teacherDetailOverlay');"><i data-lucide="trash-2" width="16" height="16"></i> O'chirish</button>
  `;
  document.getElementById('teacherDetailContent').innerHTML = content;
  renderTDetailAtt(t.id);
  openDetail('teacherDetailOverlay');
}

function showStudentDetail(id) {
  const s = DB.getStudentById(id);
  if (!s) return;
  const came = DB.isAttendedToday(s.id);
  const teacher = DB.getTeacherById(s.teacherId);
  const group = DB.getGroupById(s.groupId);

  const content = `
    <div class="detail-avatar" style="${s.avatar ? 'padding:0; background:none;' : 'background:linear-gradient(135deg,var(--info),#0097A7);'}">
      ${s.avatar ? `<img src="${s.avatar}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" />` : s.name[0].toUpperCase()}
    </div>
    <div class="detail-name">${s.name}</div>
    <div class="detail-meta">${group ? group.name : 'O\'quvchi'}</div>
    
    <div style="text-align:center;margin:12px 0;">
      <span class="badge ${came ? 'badge-success' : 'badge-danger'}" style="font-size:13px;padding:6px 16px;">${came ? '✅ Bugun keldi' : '❌ Bugun kelmadi'}</span>
    </div>

    <div class="detail-info-grid">
      <div class="detail-info-item">
        <div class="detail-info-label">Telefon</div>
        <div class="detail-info-value">${s.phone || '—'}</div>
      </div>
      <div class="detail-info-item">
        <div class="detail-info-label">Jami ball</div>
        <div class="detail-info-value" style="color:var(--success);">${DB.getTotalBalls(s.id)} ⭐</div>
      </div>
      <div class="detail-info-item">
        <div class="detail-info-label">O'qituvchi</div>
        <div class="detail-info-value">${teacher ? teacher.name + ' ' + (teacher.surname || '') : '—'}</div>
      </div>
      <div class="detail-info-item">
        <div class="detail-info-label">Guruh</div>
        <div class="detail-info-value">${group ? group.name : '—'}</div>
      </div>
    </div>

    <div class="creds-box" style="margin-bottom:20px;">
      <div class="creds-title">🔐 Tizimga kirish ma'lumotlari</div>
      <div class="creds-row"><span class="creds-key">Login:</span> <span class="creds-val">${s.username}</span></div>
      <div class="creds-row"><span class="creds-key">Parol:</span> <span class="creds-val">${s.password}</span></div>
      <div class="creds-row"><span class="creds-key">Kod:</span> <span class="creds-val">${s.code}</span></div>
    </div>
    
    <div class="card" style="padding:16px;">
      <div style="font-weight:700;margin-bottom:12px;font-size:14px;">📅 Davomat tarixi</div>
      <div class="month-selector">
        <select id="sDetailMonth" class="form-select" onchange="renderSDetailAtt('${s.id}')">
          ${getMonthOptions()}
        </select>
      </div>
      <div id="sDetailAttGrid" style="margin-top:12px;"></div>
    </div>
    
    <div class="detail-action-buttons">
      <button class="btn btn-outline" style="flex:1;" onclick="openAddStudentModal('${s.id}')"><i data-lucide="edit" width="16" height="16"></i> Tahrirlash</button>
      <button class="btn btn-primary" style="flex:1;" onclick="downloadQrCode('${s.id}')"><i data-lucide="qr-code" width="16" height="16"></i> QR yuklash</button>
    </div>
    <button class="btn btn-danger w-full" style="margin-top:10px;" onclick="deletePerson('${s.id}','student');closeDetail('studentDetailOverlay');"><i data-lucide="trash-2" width="16" height="16"></i> O'chirish</button>
  `;
  document.getElementById('studentDetailContent').innerHTML = content;
  renderSDetailAtt(s.id);
  openDetail('studentDetailOverlay');
}

// ============================================================
// Month Options Helper
// ============================================================
function getMonthOptions() {
  const d = new Date();
  let cy = d.getFullYear();
  let cm = d.getMonth() + 1;
  const months = ['', 'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
  let opts = '';
  for (let y = cy; y >= cy - 1; y--) {
    const maxM = y === cy ? cm : 12;
    for (let m = maxM; m >= 1; m--) {
      opts += `<option value="${y}-${m}">${months[m]} ${y}</option>`;
    }
  }
  return opts;
}

// ============================================================
// Attendance Grid Renderer
// ============================================================
function renderGridHelper(containerId, personId, type, selectId) {
  const val = document.getElementById(selectId).value;
  const [y, m] = val.split('-').map(Number);
  const data = DB.getMonthlyAttendance(personId, type, y, m);

  const el = document.getElementById(containerId);
  if (!el) return;

  const dayHeaders = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Yak'];
  let html = '<div class="attendance-grid">';
  dayHeaders.forEach(h => { html += `<div class="att-cell header">${h}</div>`; });

  if (data.days.length === 0) { el.innerHTML = '<div class="empty-state"><div class="empty-text">Ma\'lumot yo\'q</div></div>'; return; }

  const firstDate = new Date(data.days[0].date);
  let startOffset = firstDate.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  for (let i = 0; i < startOffset; i++) html += '<div class="att-cell" style="background:transparent;border:none;"></div>';

  data.days.forEach(d => {
    if (d.isWeekend) {
      html += `<div class="att-cell weekend"><span class="day-num">${d.day}</span></div>`;
    } else {
      html += `<div class="att-cell ${d.came ? 'came' : 'not-came'}" title="${d.time || 'Kelmadi'}">
        <span class="day-num">${d.day}</span>
        ${d.time ? `<span class="day-time">${d.time}</span>` : ''}
      </div>`;
    }
  });
  html += '</div>';

  // Summary badges
  const pct = data.workDays > 0 ? Math.round(data.cameDays / data.workDays * 100) : 0;
  html += `
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;">
      <div class="badge badge-success" style="flex:1;justify-content:center;padding:6px;">✅ Keldi: ${data.cameDays}</div>
      <div class="badge badge-danger" style="flex:1;justify-content:center;padding:6px;">❌ Kelmadi: ${data.notCameDays}</div>
      <div class="badge badge-primary" style="flex:1;justify-content:center;padding:6px;">📊 ${pct}%</div>
    </div>
  `;
  el.innerHTML = html;
}

function renderTDetailAtt(id) { renderGridHelper('tDetailAttGrid', id, 'teacher', 'tDetailMonth'); }
function renderSDetailAtt(id) { renderGridHelper('sDetailAttGrid', id, 'student', 'sDetailMonth'); }

// ============================================================
// INIT
// ============================================================
initAdmin();

// Dark Mode logic (3 states)
const darkModeToggle = document.getElementById('darkModeToggle');
const savedTheme = localStorage.getItem('theme_preference') || (localStorage.getItem('premium_dark') === 'true' ? 'dark-mode' : 'light');
function applyTheme(theme) {
  document.body.classList.remove('dark-mode', 'theme-midnight', 'theme-vibrant');
  if (theme !== 'light') {
    document.body.classList.add(theme);
  }
  if (darkModeToggle) {
    if (theme === 'light') darkModeToggle.innerHTML = '<i data-lucide="moon" width="18" height="18"></i>';
    else if (theme === 'dark-mode') darkModeToggle.innerHTML = '<i data-lucide="sunset" width="18" height="18"></i>';
    else if (theme === 'theme-midnight') darkModeToggle.innerHTML = '<i data-lucide="sun" width="18" height="18"></i>';
    else darkModeToggle.innerHTML = '<i data-lucide="sun-dim" width="18" height="18"></i>';
    if(window.lucide) requestAnimationFrame(() => lucide.createIcons());
  }
}
applyTheme(savedTheme);
if (darkModeToggle) {
  darkModeToggle.addEventListener('click', () => {
    let currentTheme = 'light';
    if (document.body.classList.contains('dark-mode')) currentTheme = 'dark-mode';
    else if (document.body.classList.contains('theme-midnight')) currentTheme = 'theme-midnight';
    else if (document.body.classList.contains('theme-vibrant')) currentTheme = 'theme-vibrant';
    
    let nextTheme = 'light';
    if (currentTheme === 'light') nextTheme = 'dark-mode';
    else if (currentTheme === 'dark-mode') nextTheme = 'theme-midnight';
    else if (currentTheme === 'theme-midnight') nextTheme = 'theme-vibrant';
    localStorage.setItem('theme_preference', nextTheme);
    applyTheme(nextTheme);
    
    // Smoothly update all chart colors
    if (window.updateChartColors) window.updateChartColors();
  });
}



let currentTeacherAvatarBase64 = null;
let currentStudentAvatarBase64 = null;

function previewAvatar(input, previewId, uploadId) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById(previewId).src = e.target.result;
      document.getElementById(uploadId).classList.add("has-image");
      if (uploadId === "tAvatarUpload") {
        currentTeacherAvatarBase64 = e.target.result;
      } else {
        currentStudentAvatarBase64 = e.target.result;
      }
    };
    reader.readAsDataURL(input.files[0]);
  }
}
