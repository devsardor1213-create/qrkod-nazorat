// ============================================================
// AUTH.JS — Login / Logout / Role redirect (API bilan to'liq ulangan)
// ============================================================

const Auth = {
  // API orqali login (async)
  async login(username, password) {
    try {
      const res = await fetch(API_URL + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        DB.setCurrentUser(data.user);
        return { success: true, user: data.user };
      }
      return { success: false, message: "Login yoki parol noto'g'ri!" };
    } catch (e) {
      // Fallback: LocalStorage
      const users = DB.get(DB.KEYS.USERS);
      const user = users.find(u => u.username === username && u.password === password);
      if (user) {
        DB.setCurrentUser(user);
        return { success: true, user };
      }
      return { success: false, message: "Server bilan aloqa yo'q!" };
    }
  },

  logout() {
    DB.clearCurrentUser();
    window.location.href = '/';
  },

  requireAuth(allowedRoles) {
    const user = DB.getCurrentUser();
    if (!user || !user.id) {
      window.location.href = '/';
      return null;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      Auth.redirectByRole(user.role);
      return null;
    }
    return user;
  },

  redirectByRole(role) {
    const routes = {
      admin: '/admin.html',
      teacher: '/teacher.html',
      student: '/student.html',
      scanner: '/scanner.html',
    };
    window.location.href = routes[role] || '/';
  },

  getCurrentUser() {
    return DB.getCurrentUser();
  },
};
