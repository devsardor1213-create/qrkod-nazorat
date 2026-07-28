/* ============================================================
   TEACHER.JS (Premium UI Version)
   ============================================================ */

const currentUser = Auth.requireAuth(['teacher']);
let teacher = null;

// Dark Mode logic (3 states)
const darkModeToggle = document.getElementById('darkModeToggle');
const savedTheme = localStorage.getItem('theme_preference') || (localStorage.getItem('premium_dark') === 'true' ? 'dark-mode' : 'light');

function applyTheme(theme) {
  document.body.classList.remove('dark-mode', 'theme-midnight', 'theme-vibrant');
  if (theme !== 'light') {
    document.body.classList.add(theme);
  }
  if (darkModeToggle) {
    if (theme === 'light') darkModeToggle.innerHTML = '<i data-lucide="moon"></i>';
    else if (theme === 'dark-mode') darkModeToggle.innerHTML = '<i data-lucide="sunset"></i>';
    else if (theme === 'theme-midnight') darkModeToggle.innerHTML = '<i data-lucide="sun"></i>';
    else darkModeToggle.innerHTML = '<i data-lucide="sun-dim"></i>';
    if (window.lucide) window.lucide.createIcons();
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

// Date in Topbar
document.getElementById('todayDate').textContent = new Date().toLocaleDateString('uz-UZ', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

// Sidebar Toggle (Mobile)
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarToggleBtn = document.getElementById('sidebarToggle');
if(sidebarToggleBtn) {
  sidebarToggleBtn.addEventListener('click', () => {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('show');
  });
}
if(sidebarOverlay) {
  sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('show');
  });
}

// ============================================================
// Section switching
// ============================================================
function showSection(sectionId, btnEl) {
  document.querySelectorAll('.pr-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.pr-nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('section-' + sectionId).classList.add('active');
  if (btnEl) btnEl.classList.add('active');

  if (window.innerWidth <= 992 && sidebar) {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('show');
  }

  if (sectionId === 'dashboard') renderDashboard();
  if (sectionId === 'students') renderStudents();
  if (sectionId === 'groups') renderGroups();
}

// ============================================================
// Toast & Modals
// ============================================================
function showToast(msg, type='success') {
  const c = document.getElementById('toastContainer');
  if(!c) return;
  const t = document.createElement('div');
  const bg = type === 'success' ? 'var(--pr-success)' : (type === 'error' ? 'var(--pr-danger)' : 'var(--pr-warning)');
  t.style.cssText = `
    background: ${bg}; color: #fff; padding: 12px 20px; border-radius: 12px;
    font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 8px;
    box-shadow: var(--pr-shadow-md); transform: translateY(20px); opacity: 0;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  `;
  const icon = type === 'success' ? 'check-circle' : 'alert-circle';
  t.innerHTML = `<i data-lucide="${icon}" width="18" height="18"></i> <span>${msg}</span>`;
  c.appendChild(t);
  if (window.lucide) window.lucide.createIcons();
  
  setTimeout(() => { t.style.transform = 'translateY(0)'; t.style.opacity = '1'; }, 10);
  setTimeout(() => { t.style.transform = 'translateY(20px)'; t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3500);
}

function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

// --- Profile Modal Logic ---
function openTeacherProfile() {
  const user = DB.getCurrentUser();
  if (!user) return;
  
  document.getElementById('tProfName').value = user.name || '';
  document.getElementById('tProfUsername').value = user.username || '';
  document.getElementById('tProfPassword').value = '';
  document.getElementById('tProfAvatarBase64').value = user.avatar || '';
  updateTeacherProfileAvatarPreview();
  openModal('profileModal');
}

window.handleTeacherAvatarFile = function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    document.getElementById('tProfAvatarBase64').value = evt.target.result;
    updateTeacherProfileAvatarPreview();
  };
  reader.readAsDataURL(file);
};

function updateTeacherProfileAvatarPreview() {
  const url = document.getElementById('tProfAvatarBase64').value.trim();
  const pv = document.getElementById('tProfileAvatarPreview');
  if (url) {
    pv.style.backgroundImage = `url('${url}')`;
    pv.textContent = '';
  } else {
    pv.style.backgroundImage = 'none';
    const name = document.getElementById('tProfName').value || 'A';
    pv.textContent = name.charAt(0).toUpperCase();
  }
}

async function saveTeacherProfile() {
  const user = DB.getCurrentUser();
  if (!user) return;
  
  const name = document.getElementById('tProfName').value.trim();
  const username = document.getElementById('tProfUsername').value.trim();
  const password = document.getElementById('tProfPassword').value.trim();
  const avatar = document.getElementById('tProfAvatarBase64').value.trim();
  
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
    // Update local currentUser explicitly
    const newUserData = Object.assign({}, user, data);
    if(newUserData.password) delete newUserData.password;
    localStorage.setItem('qr_currentUser', JSON.stringify(newUserData));
    
    // Also update the teacher DB record if this is a teacher
    const t = DB.getTeacherById(user.teacherId);
    if(t) {
       t.name = name;
       // ... save to server/localStorage if needed via API, wait, updateUser handles DB logic
    }
    
    // Refresh Sidebar Info
    document.getElementById('tAvatar').style.backgroundImage = avatar ? `url('${avatar}')` : 'none';
    document.getElementById('tAvatar').textContent = avatar ? '' : name.charAt(0).toUpperCase();
    document.getElementById('tName').textContent = name;
    
    closeModal('profileModal');
  } else {
    showToast(res.message || "Xatolik yuz berdi", "error");
  }
}
// ---------------------------

// ============================================================
// Global Init
// ============================================================
async function initTeacher() {
  await DB.pullFromAPI();
  if (!currentUser || !currentUser.teacherId) { Auth.logout(); return; }
  teacher = DB.getTeacherById(currentUser.teacherId);
  if (!teacher) { Auth.logout(); return; }

  // Sidebar profile
  if (currentUser.avatar) {
    document.getElementById('tAvatar').style.backgroundImage = `url('${currentUser.avatar}')`;
    document.getElementById('tAvatar').textContent = '';
  } else {
    document.getElementById('tAvatar').style.backgroundImage = 'none';
    document.getElementById('tAvatar').textContent = (teacher.name[0] + (teacher.surname?.[0]||'')).toUpperCase();
  }
  document.getElementById('tName').textContent = currentUser.name || (teacher.name + ' ' + (teacher.surname||''));

  const came = DB.isAttendedToday(teacher.id);
  const badge = document.getElementById('tStatusBadge');
  badge.innerHTML = came ? '<i data-lucide="check-circle-2" width="16" height="16"></i> Bugun kelgansiz' : '<i data-lucide="x-circle" width="16" height="16"></i> Bugun kelmadingiz';
  badge.className = 'pr-pill ' + (came ? 'success' : 'danger');

  // Month options for dashboard
  const now = new Date();
  document.getElementById('tMonthSel').innerHTML = getMonthOptions(now.getFullYear(), now.getMonth()+1);

  populateGroupSelects();
  updateCounts();
  renderDashboard();

  if (window.lucide) window.lucide.createIcons();
}

function updateCounts() {
  const stCount = DB.getStudentsByTeacher(teacher.id).length;
  const grCount = DB.getGroupsByTeacher(teacher.id).length;
  document.getElementById('studentCountBadge').textContent = stCount;
  document.getElementById('groupCountBadge').textContent = grCount;
}

function populateGroupSelects() {
  const groups = DB.getGroupsByTeacher(teacher.id);
  let optsFilter = '<option value="">📁 Barcha guruhlarim</option>';
  let optsAdd = '<option value="">— Guruh tanlang —</option>';
  
  groups.forEach(g => {
    const o = `<option value="${g.id}">${g.name}</option>`;
    optsFilter += o;
    optsAdd += o;
  });
  
  document.getElementById('sFilter-group').innerHTML = optsFilter;
  document.getElementById('sGroup').innerHTML = optsAdd;
}

// ============================================================
// DASHBOARD
// ============================================================
function getMonthOptions(currentYear, currentMonth) {
  const months = ['','Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
  let opts = '';
  for (let y = currentYear; y >= currentYear - 1; y--) {
    const maxM = y === currentYear ? currentMonth : 12;
    for (let m = maxM; m >= 1; m--) {
      const val = `${y}-${m}`;
      const sel = (y === currentYear && m === currentMonth) ? 'selected' : '';
      opts += `<option value="${val}" ${sel}>${months[m]} ${y}</option>`;
    }
  }
  return opts;
}

function renderDashboard() {
  const students = DB.getStudentsByTeacher(teacher.id);
  const todayAtts = DB.getAttendanceByDate(DB.today());
  
  let cameCount = 0;
  students.forEach(s => {
    if (todayAtts.some(a => a.personId === s.id && a.personType === 'student')) {
      cameCount++;
    }
  });
  const balls = DB.getTotalBalls(teacher.id);
  const totalAtt = DB.getAttendanceByPerson(teacher.id).length;

  document.getElementById('dashStats').innerHTML = `
    <div class="pr-stat-card">
      <div class="pr-stat-icon purple"><i data-lucide="star" width="28" height="28"></i></div>
      <div>
        <div class="pr-stat-val">${balls}</div>
        <div class="pr-stat-label">Jami Reyting Balim</div>
      </div>
    </div>
    <div class="pr-stat-card">
      <div class="pr-stat-icon green"><i data-lucide="calendar-check" width="28" height="28"></i></div>
      <div>
        <div class="pr-stat-val">${totalAtt}</div>
        <div class="pr-stat-label">Mening jami kunlarim</div>
      </div>
    </div>
    <div class="pr-stat-card" style="cursor:pointer;" onclick="navToStudentsFromDash('came')">
      <div class="pr-stat-icon orange"><i data-lucide="users" width="28" height="28"></i></div>
      <div>
        <div class="pr-stat-val">${cameCount} <span style="font-size:16px;color:var(--pr-text-muted);">/ ${students.length}</span></div>
        <div class="pr-stat-label">Bugun kelgan o'quvchilar</div>
      </div>
    </div>
  `;

  renderMyMonthly();
  if (window.lucide) window.lucide.createIcons();
}

window.navToStudentsFromDash = function(status) {
  showSection('students', document.querySelector('[data-section="students"]'));
  document.getElementById('sFilter-status').value = status;
  applyStudentFilters();
};

function renderMyMonthly() {
  const sel = document.getElementById('tMonthSel');
  const [year, month] = sel.value.split('-').map(Number);
  const monthData = DB.getMonthlyAttendance(teacher.id, 'teacher', year, month);
  
  const isDark = document.body.classList.contains('dark-mode');
  
  // Customizing chart for premium theme
  const canvas = document.getElementById('tMonthChart');
  const ctx = canvas.getContext('2d');
  
  if(window.tMonthChartInstance) window.tMonthChartInstance.destroy();
  
  const labels = monthData.days.map(d => d.day);
  const data = monthData.days.map(d => d.came ? 1 : 0);
  
  // Create Gradient
  let gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, isDark ? 'rgba(79, 70, 229, 0.5)' : 'rgba(79, 70, 229, 0.3)');
  gradient.addColorStop(1, 'rgba(79, 70, 229, 0.0)');
  
  window.tMonthChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Keldi/Kelmadi',
        data: data,
        borderColor: '#4F46E5',
        backgroundColor: gradient,
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#4F46E5',
        pointBorderColor: isDark ? '#111827' : '#FFFFFF',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: false }, 
        tooltip: { 
          enabled: true,
          mode: 'index',
          intersect: false,
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          titleColor: isDark ? '#F3F4F6' : '#0F172A',
          bodyColor: isDark ? '#9CA3AF' : '#64748B',
          borderColor: isDark ? '#374151' : '#E2E8F0',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: function(context) {
              return context.raw === 1 ? '✅ Keldi' : '🔴 Kelmadi';
            }
          }
        } 
      },
      scales: {
        x: { 
          grid: { display: false, drawBorder: false },
          ticks: { color: isDark ? '#9CA3AF' : '#64748B', font: {family: 'Inter', size: 12} }
        },
        y: { 
          display: false, max: 1.5, min: -0.1
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  });
}

function downloadMyPDF() {
  const sel = document.getElementById('tMonthSel');
  const [year, month] = sel.value.split('-').map(Number);
  const monthData = DB.getMonthlyAttendance(teacher.id, 'teacher', year, month);
  PDFManager.generateAttendance(teacher, 'teacher', monthData, year, month);
}

// ============================================================
// STUDENTS
// ============================================================
function resetStudentFilters() {
  document.getElementById('studentSearch').value = '';
  document.getElementById('globalSearch').value = '';
  document.getElementById('sFilter-group').value = '';
  document.getElementById('sFilter-status').value = 'all';
  applyStudentFilters();
}

function applyStudentFilters() {
  renderStudents();
}

function renderStudents() {
  const query = (document.getElementById('studentSearch').value || document.getElementById('globalSearch').value).toLowerCase();
  const gId = document.getElementById('sFilter-group').value;
  const statusFilter = document.getElementById('sFilter-status').value;
  
  let students = DB.getStudentsByTeacher(teacher.id);

  if (query) {
    students = students.filter(s => s.name.toLowerCase().includes(query) || (s.code||'').toLowerCase().includes(query));
  }
  if (gId) {
    students = students.filter(s => s.groupId === gId);
  }
  if (statusFilter !== 'all') {
    students = students.filter(s => {
      const came = DB.isAttendedToday(s.id);
      return statusFilter === 'came' ? came : !came;
    });
  }

  const tbody = document.getElementById('studentTableBody');
  const emptyState = document.getElementById('studentEmptyState');
  const tableWrap = document.querySelector('.pr-table');
  
  if (!students.length) {
    tbody.innerHTML = '';
    tableWrap.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }
  
  tableWrap.style.display = 'table';
  emptyState.style.display = 'none';

  tbody.innerHTML = students.map(s => {
    const group = DB.getGroupById(s.groupId);
    const came = DB.isAttendedToday(s.id);
    return `
      <tr onclick="showStudentDetail('${s.id}')" style="cursor:pointer;">
        <td>
          <div class="pr-cell-user">
            <div class="pr-cell-avatar">${s.name[0].toUpperCase()}</div>
            <div>
              <div class="pr-cell-name">${s.name}</div>
              <div class="pr-cell-sub">ID: ${s.code}</div>
            </div>
          </div>
        </td>
        <td>
          <span style="font-weight:500;"><i data-lucide="folder" width="14" height="14" style="vertical-align:-2px;margin-right:4px;color:var(--pr-text-muted)"></i>${group ? group.name : '—'}</span>
        </td>
        <td style="color:var(--pr-text-muted);">
          ${s.phone || '—'}
        </td>
        <td>
          <span class="pr-pill ${came ? 'success' : 'danger'}">
            <i data-lucide="${came ? 'check-circle-2' : 'x-circle'}" width="14" height="14"></i> ${came ? 'Keldi' : 'Kelmadi'}
          </span>
        </td>
        <td style="text-align:right;">
          <div style="display:flex; justify-content:flex-end; gap:8px;">
            <button class="pr-btn" style="padding:6px; border:1px solid var(--pr-border); background:transparent; color:var(--pr-text-main);" onclick="event.stopPropagation(); openAddStudentModal('${s.id}')"><i data-lucide="edit" width="16" height="16"></i></button>
            <button class="pr-btn" style="padding:6px; border:1px solid var(--pr-danger); background:var(--pr-danger-bg); color:var(--pr-danger);" onclick="event.stopPropagation(); deletePerson('${s.id}', 'student')"><i data-lucide="trash-2" width="16" height="16"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

let editingStudentId = null;
function openAddStudentModal(id = null) {
  if (DB.getGroupsByTeacher(teacher.id).length === 0) {
    alert("Oldin guruh yaratishingiz kerak!");
    return;
  }
  editingStudentId = id;
  const form = document.getElementById('addStudentForm');
  const submitBtn = form.querySelector('button[type="submit"]');
  if (id) {
    const s = DB.getStudentById(id);
    if (s) {
      document.getElementById('sName').value = s.name || '';
      document.getElementById('sPhone').value = s.phone || '';
      document.getElementById('sGroup').value = s.groupId || '';
      if(submitBtn) submitBtn.textContent = 'Saqlash';
    }
  } else {
    form.reset();
    if(submitBtn) submitBtn.textContent = 'Qo\'shish';
  }
  openModal('addStudentModal');
}

document.getElementById('addStudentForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const name = document.getElementById('sName').value.trim();
  const phone = document.getElementById('sPhone').value.trim();
  const groupId = document.getElementById('sGroup').value;
  
  if (!groupId) { showToast("Guruhni tanlang", "error"); return; }

  if (editingStudentId) {
    DB.updateStudent(editingStudentId, name, phone, groupId, teacher.id);
    showToast("O'quvchi muvaffaqiyatli tahrirlandi!");
    if(document.getElementById('studentDetailModal').classList.contains('show')){
      showStudentDetail(editingStudentId);
    }
  } else {
    DB.addStudent(name, phone, groupId, teacher.id);
    showToast("O'quvchi muvaffaqiyatli qo'shildi!");
  }
  
  closeModal('addStudentModal');
  updateCounts();
  renderStudents();
});

function deletePerson(id, type) {
  if (!confirm("Haqiqatan ham o'chirmoqchimisiz?")) return;
  DB.deletePerson(id, type);
  showToast("O'chirildi!");
  updateCounts();
  if (type === 'student') {
    renderStudents();
    closeModal('studentDetailModal');
  }
}

// Search input sync
document.getElementById('globalSearch').addEventListener('input', (e) => {
  document.getElementById('studentSearch').value = e.target.value;
  if(document.getElementById('section-students').classList.contains('active')) {
    applyStudentFilters();
  }
});

// ============================================================
// GROUPS
// ============================================================
function renderGroups() {
  const groups = DB.getGroupsByTeacher(teacher.id);
  const el = document.getElementById('groupCards');

  if (!groups.length) {
    el.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--pr-text-muted);"><i data-lucide="folder-open" width="48" height="48" style="opacity:0.3;margin-bottom:16px;"></i><h3>Hali guruhlar yo\'q</h3></div>';
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  el.innerHTML = groups.map(g => {
    const stuCount = DB.getStudentsByGroup(g.id).length;
    return `
      <div class="pr-card" style="position:relative;" onclick="openGroupDetail('${g.id}')">
        <div style="position:absolute; top:16px; right:16px; display:flex; gap:8px;">
          <button class="pr-btn" style="padding:6px; border:1px solid var(--pr-border); background:transparent; color:var(--pr-text-main);" onclick="event.stopPropagation(); openAddGroupModal('${g.id}')"><i data-lucide="edit" width="16" height="16"></i></button>
          <button class="pr-btn" style="padding:6px; border:1px solid var(--pr-danger); background:var(--pr-danger-bg); color:var(--pr-danger);" onclick="event.stopPropagation(); deleteGroup('${g.id}')"><i data-lucide="trash-2" width="16" height="16"></i></button>
        </div>
        <div class="pr-card-header">
          <div class="pr-card-icon"><i data-lucide="folder"></i></div>
          <div class="pr-pill success">${stuCount} ta o'quvchi</div>
        </div>
        <div class="pr-card-title" style="padding-right: 60px;">${g.name}</div>
        <div class="pr-card-sub"><i data-lucide="calendar"></i> Yaratilgan: ${new Date(g.createdAt||Date.now()).toLocaleDateString('uz-UZ')}</div>
      </div>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

let editingGroupId = null;
function openAddGroupModal(id = null) {
  editingGroupId = id;
  const form = document.getElementById('addGroupForm');
  const submitBtn = form.querySelector('button[type="submit"]');
  if (id) {
    const g = DB.getGroupById(id);
    if (g) {
      document.getElementById('gName').value = g.name || '';
      if(submitBtn) submitBtn.textContent = 'Saqlash';
    }
  } else {
    form.reset();
    if(submitBtn) submitBtn.textContent = 'Yaratish';
  }
  openModal('addGroupModal');
}

document.getElementById('addGroupForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const name = document.getElementById('gName').value.trim();
  
  if (editingGroupId) {
    const groups = DB.getGroups();
    const idx = groups.findIndex(g => g.id === editingGroupId);
    if (idx !== -1) {
      groups[idx].name = name;
      DB.set(DB.KEYS.GROUPS, groups);
    }
    showToast("Guruh tahrirlandi!");
  } else {
    DB.addGroup(name, teacher.id);
    showToast("Guruh yaratildi!");
  }
  
  closeModal('addGroupModal');
  populateGroupSelects();
  updateCounts();
  renderGroups();
});

function deleteGroup(id) {
  if (!confirm("Guruhni o'chirmoqchimisiz?")) return;
  DB.deleteGroup(id);
  showToast("Guruh o'chirildi!");
  populateGroupSelects();
  updateCounts();
  renderGroups();
}

function openGroupDetail(groupId) {
  const group = DB.getGroupById(groupId);
  if (!group) return;
  document.getElementById('gdPageTitle').textContent = `Guruh: ${group.name}`;
  
  const students = DB.getStudentsByGroup(groupId);
  const tbody = document.getElementById('gdPageTableBody');
  
  if (!students.length) {
    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;padding:32px;color:var(--pr-text-muted);">Bu guruhda o\'quvchilar yo\'q</td></tr>';
  } else {
    tbody.innerHTML = students.map(s => {
      const came = DB.isAttendedToday(s.id);
      return `
        <tr onclick="showStudentDetail('${s.id}')" style="cursor:pointer;">
          <td>
            <div style="font-weight:600; font-size:14px;">${s.name}</div>
            <div style="font-size:12px; color:var(--pr-text-muted);">ID: ${s.code}</div>
          </td>
          <td style="text-align:right;">
            <span class="pr-pill ${came ? 'success' : 'danger'}">${came ? 'Keldi' : 'Kelmadi'}</span>
          </td>
        </tr>
      `;
    }).join('');
  }
  
  showSection('group-detail');
}

// ============================================================
// STUDENT DETAIL & ATTENDANCE HISTORY
// ============================================================
function showStudentDetail(id) {
  const s = DB.getStudentById(id);
  if (!s) return;
  const came = DB.isAttendedToday(s.id);
  const group = DB.getGroupById(s.groupId);
  
  const content = `
    <div style="display:flex; align-items:center; gap:16px; margin-bottom:24px;">
      <div style="width:64px; height:64px; border-radius:16px; background:linear-gradient(135deg, var(--pr-primary), #818CF8); color:#fff; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:700;">
        ${s.name[0].toUpperCase()}
      </div>
      <div>
        <h2 style="margin:0; font-size:20px; font-weight:700;">${s.name}</h2>
        <div style="color:var(--pr-text-muted); font-size:14px;">${group ? group.name : 'Guruhsiz'} | ID: ${s.code}</div>
        <div style="margin-top:6px;">
          <span class="pr-pill ${came ? 'success' : 'danger'}" style="font-size:12px;">${came ? '✅ Bugun kelgan' : '❌ Bugun kelmagan'}</span>
        </div>
      </div>
    </div>
    
    <div class="pr-card" style="padding:20px; background:var(--pr-surface-hover); border:none; box-shadow:none; margin-bottom:0;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 style="margin:0; font-size:16px; font-weight:600;"><i data-lucide="calendar-days" width="18" height="18" style="vertical-align:text-bottom; margin-right:6px;"></i> Davomat tarixi</h3>
        <select id="sDetailMonth" class="pr-select" style="width:auto; padding:6px 12px;" onchange="renderSDetailAtt('${s.id}')">
          ${getMonthOptions()}
        </select>
      </div>
      <div id="sDetailAttGrid"></div>
    </div>
  `;
  document.getElementById('studentDetailContent').innerHTML = content;
  renderSDetailAtt(s.id);
  openModal('studentDetailModal');
  if (window.lucide) window.lucide.createIcons();
}

function getMonthOptions() {
  const d = new Date();
  let cy = d.getFullYear();
  let cm = d.getMonth() + 1;
  const months = ['','Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
  let opts = '';
  for (let y = cy; y >= cy - 1; y--) {
    const maxM = y === cy ? cm : 12;
    for (let m = maxM; m >= 1; m--) {
      opts += `<option value="${y}-${m}">${months[m]} ${y}</option>`;
    }
  }
  return opts;
}

function renderSDetailAtt(personId) {
  const val = document.getElementById('sDetailMonth').value;
  const [y, m] = val.split('-').map(Number);
  const data = DB.getMonthlyAttendance(personId, 'student', y, m);
  
  const el = document.getElementById('sDetailAttGrid');
  if (!el) return;
  
  const dayHeaders = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Yak'];
  let html = '<div class="attendance-grid">';
  dayHeaders.forEach(h => { html += `<div class="att-cell header">${h}</div>`; });
  
  if (data.days.length === 0) { 
    el.innerHTML = '<div style="text-align:center; padding:20px; color:var(--pr-text-muted);">Ma\'lumot yo\'q</div>'; 
    return; 
  }

  const firstDate = new Date(data.days[0].date);
  let startOffset = firstDate.getDay() - 1;
  if (startOffset < 0) startOffset = 6;
  
  for (let i = 0; i < startOffset; i++) html += '<div class="att-cell" style="background:transparent;border:none;"></div>';
  
  data.days.forEach(d => {
    if (d.isWeekend) {
      html += `<div class="att-cell weekend"><span class="day-num">${d.day}</span></div>`;
    } else {
      html += `<div class="att-cell ${d.came ? 'came' : 'not-came'}" title="${d.time||'Kelmadi'}">
        <span class="day-num">${d.day}</span>
        ${d.time ? `<span class="day-time">${d.time}</span>` : ''}
      </div>`;
    }
  });
  html += '</div>';

  const pct = data.workDays > 0 ? Math.round(data.cameDays / data.workDays * 100) : 0;
  html += `
    <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap;">
      <div class="pr-pill success" style="flex:1;justify-content:center;font-size:13px;">✅ Keldi: ${data.cameDays}</div>
      <div class="pr-pill danger" style="flex:1;justify-content:center;font-size:13px;">❌ Kelmadi: ${data.notCameDays}</div>
      <div class="pr-pill" style="flex:1;justify-content:center;font-size:13px;background:var(--pr-primary-light);color:var(--pr-primary);">📊 ${pct}%</div>
    </div>
  `;
  el.innerHTML = html;
}

// ============================================================
// Teacher QR
// ============================================================
function showTeacherQr() {
  document.getElementById('tCodeModal').textContent = teacher.code;
  openModal('qrModal');
  
  setTimeout(() => {
    const qrEl = document.getElementById('tQrLarge');
    qrEl.innerHTML = '';
    new QRCode(qrEl, {
      text: 'TEACHER:' + teacher.id,
      width: 200, height: 200,
      colorDark: document.body.classList.contains('dark-mode') ? '#0B0F19' : '#0F172A', 
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H,
    });
  }, 10);
}

function downloadTeacherQrLarge() {
  const qrEl = document.getElementById('tQrLarge');
  const canvas = qrEl?.querySelector('canvas');
  if (!canvas) {
    showToast("QR kod hali to'liq yuklanmadi", "warning");
    return;
  }
  const link = document.createElement('a');
  link.download = (teacher?.name || 'teacher') + '_qr.png';
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// Bootstrap
initTeacher();
