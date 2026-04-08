/* ============================================================
   FreelanceOS — Application Logic
   ============================================================ */

'use strict';

// ============================================================
// STATE
// ============================================================
const state = {
  clients: [],
  tasks: [],
  currentPage: 'dashboard',
  chartInstance: null,
  chartPeriod: 'monthly',
  searchQuery: '',
  syncInProgress: false,
};

// Demo seed data (used when DEMO_MODE is true or backend unreachable)
const DEMO_CLIENTS = [
  { ID:'CLT_001', Name:'Acme Corp',      Email:'contact@acmecorp.com',  Location:'New York, USA',    Type:'Corporate',  Status:'Active',   JoinedDate:'2023-10-12', TotalBilled:12400, ActiveTasks:4, LogoUrl:'' },
  { ID:'CLT_002', Name:'Stark Industries',Email:'t.stark@stark.com',    Location:'Malibu, CA',       Type:'Enterprise', Status:'Active',   JoinedDate:'2023-08-04', TotalBilled:48850, ActiveTasks:2, LogoUrl:'' },
  { ID:'CLT_003', Name:'Globex Inc',     Email:'billing@globex.io',     Location:'Springfield',      Type:'Startup',    Status:'Inactive', JoinedDate:'2023-09-18', TotalBilled:3200,  ActiveTasks:0, LogoUrl:'' },
  { ID:'CLT_004', Name:'Soylent Corp',   Email:'marketing@soylent.co',  Location:'Chicago, IL',      Type:'Agency',     Status:'Active',   JoinedDate:'2023-07-22', TotalBilled:9600,  ActiveTasks:5, LogoUrl:'' },
  { ID:'CLT_005', Name:'Initech Labs',   Email:'info@initech.com',      Location:'Austin, TX',       Type:'Corporate',  Status:'Active',   JoinedDate:'2023-11-01', TotalBilled:0,     ActiveTasks:1, LogoUrl:'' },
  { ID:'CLT_006', Name:'Umbrella Corp',  Email:'research@umbrella.io',  Location:'Raccoon City',     Type:'Enterprise', Status:'Active',   JoinedDate:'2023-02-14', TotalBilled:15300, ActiveTasks:8, LogoUrl:'' },
];

const DEMO_TASKS = [
  { ID:'TSK_001', ClientId:'CLT_001', ClientName:'Acme Corp',       TaskName:'Landing Page Redesign', TaskType:'Design',      Amount:2400, Status:'Pending',   PaymentStatus:'Pending',  AssignedDate:'2023-10-12', DueDate:'2023-10-25' },
  { ID:'TSK_002', ClientId:'CLT_002', ClientName:'Stark Industries', TaskName:'API Integration',       TaskType:'Development', Amount:5500, Status:'Completed', PaymentStatus:'Received', AssignedDate:'2023-10-10', DueDate:'2023-10-18' },
  { ID:'TSK_003', ClientId:'CLT_003', ClientName:'Globex Inc',       TaskName:'SEO Audit',             TaskType:'SEO',         Amount:1200, Status:'Completed', PaymentStatus:'Received', AssignedDate:'2023-10-05', DueDate:'2023-10-15' },
  { ID:'TSK_004', ClientId:'CLT_004', ClientName:'Soylent Corp',     TaskName:'Brand Identity',        TaskType:'Branding',    Amount:4000, Status:'Pending',   PaymentStatus:'Pending',  AssignedDate:'2023-10-14', DueDate:'2023-11-02' },
  { ID:'TSK_005', ClientId:'CLT_005', ClientName:'Initech Labs',     TaskName:'Site Maintenance',      TaskType:'Maintenance', Amount:800,  Status:'In Progress',PaymentStatus:'Pending',  AssignedDate:'2023-10-01', DueDate:'2023-10-31' },
  { ID:'TSK_006', ClientId:'CLT_006', ClientName:'Umbrella Corp',    TaskName:'Growth Consulting',     TaskType:'Consulting',  Amount:1500, Status:'Cancelled', PaymentStatus:'Pending',  AssignedDate:'2023-09-20', DueDate:'2023-10-10' },
];

// ============================================================
// UTILITIES
// ============================================================
function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random()*1000)}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    // If the input is YYYY-MM-DD, parse it manually to avoid timezone shift
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
      const [y, m, d] = dateStr.trim().split('-');
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    }
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  } catch { return dateStr; }
}

function formatCurrency(val) {
  const n = parseFloat(val) || 0;
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
}

const AVATAR_COLORS = [
  '#00d4ff','#3fb950','#f0a500','#f85149','#8957e5',
  '#0d8ecf','#e36209','#1f6feb','#d29922','#a371f7',
];
function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + (hash << 5) - hash;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(title, msg, type = 'success') {
  const icons = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <div class="toast-body">
      <div class="toast-title">${escHtml(title)}</div>
      ${msg ? `<div class="toast-msg">${escHtml(msg)}</div>` : ''}
    </div>`;
  document.getElementById('toast-container').appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-fade');
    setTimeout(() => toast.remove(), 320);
  }, 3500);
}

// ============================================================
// CONTEXT MENU
// ============================================================
let activeMenu = null;
function closeMenu() { if (activeMenu) { activeMenu.remove(); activeMenu = null; } }
document.addEventListener('click', closeMenu);

function showContextMenu(e, items) {
  e.stopPropagation();
  closeMenu();
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.top = e.clientY + 'px';
  menu.style.left = e.clientX + 'px';
  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'context-menu-item' + (item.danger ? ' danger' : '');
    el.innerHTML = `${item.icon || ''}<span>${escHtml(item.label)}</span>`;
    el.addEventListener('click', (ev) => { ev.stopPropagation(); closeMenu(); item.action(); });
    menu.appendChild(el);
  });
  document.body.appendChild(menu);
  activeMenu = menu;
  // Adjust position if off-screen
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) menu.style.left = (e.clientX - rect.width) + 'px';
  if (rect.bottom > window.innerHeight) menu.style.top = (e.clientY - rect.height) + 'px';
}

// ============================================================
// API LAYER
// ============================================================
// NOTE: Google Apps Script CORS fix —
// Using 'text/plain' ContentType avoids a browser CORS preflight (OPTIONS)
// request that GAS cannot handle. JSON is still in the body.
// ============================================================
// JSONP LOADER (bypasses ALL CORS restrictions for GET requests)
// ============================================================
// Google Apps Script GET endpoints require CORS headers which browsers
// sometimes block. JSONP loads the response as a <script> tag — no CORS
// check is performed, so the response is always readable.
function loadViaJsonp(baseUrl, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    // Unique callback name so parallel calls don't collide
    const cbName = '__gasCb_' + Date.now() + '_' + Math.floor(Math.random() * 99999);
    let script = null;

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('JSONP request timed out after 15 s'));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      try { delete window[cbName]; } catch (_) {}
      if (script && script.parentNode) script.parentNode.removeChild(script);
    }

    // Apps Script will call this function with the JSON payload
    window[cbName] = function (data) {
      cleanup();
      resolve(data);
    };

    script = document.createElement('script');
    script.onerror = function () {
      cleanup();
      reject(new Error('JSONP script failed to load — check Apps Script URL'));
    };
    // Append &callback= so Apps Script wraps the response
    script.src = baseUrl + '&callback=' + cbName;
    document.head.appendChild(script);
  });
}

// ============================================================
// API LAYER
// ============================================================
async function apiCall(method, payload) {
  if (CONFIG.DEMO_MODE || !CONFIG.APPS_SCRIPT_URL) {
    return simulateApi(method, payload);
  }
  try {
    let result;
    if (method === 'GET') {
      const params = new URLSearchParams({ action: payload.action });
      const url = `${CONFIG.APPS_SCRIPT_URL}?${params.toString()}`;

      // Try JSONP first — it bypasses CORS entirely for GET requests.
      // Falls back to regular fetch if JSONP fails (e.g. script.src error).
      try {
        result = await loadViaJsonp(url);
        console.log('[FreelanceOS] JSONP load succeeded for action:', payload.action);
      } catch (jsonpErr) {
        console.warn('[FreelanceOS] JSONP failed, trying fetch fallback:', jsonpErr.message);
        const res = await fetch(url, { method: 'GET', redirect: 'follow' });
        if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);
        result = await res.json();
      }
    } else {
      // CRITICAL: Use mode:'no-cors' to bypass the CORS redirect issue.
      // Apps Script redirects POST from script.google.com → script.googleusercontent.com,
      // which causes "Failed to fetch" in browsers due to CORS preflight on the redirect.
      // With no-cors, the response is opaque (unreadable) but the POST data IS sent to
      // the server and processed. Since we use optimistic UI updates we don't need the
      // response body — just assume success if the fetch itself doesn't throw.
      await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        mode: 'no-cors',
      });
      // Response is opaque with no-cors; optimistically treat as success
      result = { success: true };
    }

    // Apps Script sometimes returns { error: "..." } with HTTP 200 —
    // detect and throw so callers can surface the error to the user.
    if (result && result.error) {
      throw new Error(`Apps Script error: ${result.error}`);
    }
    return result;

  } catch (err) {
    console.error(`[FreelanceOS] apiCall failed (${payload.action || method}):`, err.message);
    throw err;  // always re-throw; callers decide how to surface it
  }
}

// Simulate backend in demo mode
function simulateApi(method, payload) {
  return new Promise(resolve => {
    setTimeout(() => {
      if (method === 'GET' && payload.action === 'getAllData') {
        resolve({ clients: [...DEMO_CLIENTS], tasks: [...DEMO_TASKS] });
      } else {
        resolve({ success: true, id: generateId('ID') });
      }
    }, 400);
  });
}

// ============================================================
// DATA LOADING
// ============================================================
// Normalize a value from Google Sheets to a plain string (dates, numbers, etc.)
function normalizeSheetValue(val) {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) {
    // Format as YYYY-MM-DD
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val);
}

// Normalize a row object returned from Google Sheets
// (all values arrive as numbers/Date objects from the Sheets API)
function normalizeSheetRow(obj) {
  const out = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    // Keep numeric fields as numbers
    if (key === 'TotalBilled' || key === 'Amount' || key === 'ActiveTasks') {
      out[key] = parseFloat(val) || 0;
    } else {
      out[key] = normalizeSheetValue(val);
    }
  }
  return out;
}

async function loadAllData() {
  if (CONFIG.DEMO_MODE || !CONFIG.APPS_SCRIPT_URL) {
    // Demo mode: use built-in sample data
    state.clients = [...DEMO_CLIENTS];
    state.tasks   = [...DEMO_TASKS];
    return;
  }
  try {
    showSyncIndicator(true);
    const data = await apiCall('GET', { action: 'getAllData' });
    // Normalize: sheets may return Date objects and numbers — convert everything to proper types
    state.clients = Array.isArray(data.clients)
      ? data.clients.map(normalizeSheetRow).filter(c => c.ID || c.Name)
      : [];
    state.tasks = Array.isArray(data.tasks)
      ? data.tasks.map(normalizeSheetRow).filter(t => t.ID || t.TaskName)
      : [];
    showToast('Connected', `Loaded ${state.clients.length} clients, ${state.tasks.length} tasks from Google Sheets.`, 'success');
  } catch (err) {
    console.warn('Sheet load failed, starting with empty data:', err);
    state.clients = [];
    state.tasks   = [];
    showToast('Sheet Load Error', 'Could not load data. Check your Apps Script URL.', 'info');
  } finally {
    showSyncIndicator(false);
  }
}

function showSyncIndicator(show) {
  let el = document.getElementById('sync-indicator');
  if (show) {
    if (!el) {
      el = document.createElement('div');
      el.id = 'sync-indicator';
      el.style.cssText = 'position:fixed;top:12px;right:50%;transform:translateX(50%);background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:6px 14px;font-size:12px;color:var(--text-muted);z-index:9990;display:flex;align-items:center;gap:8px';
      el.innerHTML = '<div style="width:8px;height:8px;border-radius:50%;border:2px solid var(--text-muted);border-top-color:var(--accent);animation:spin 0.7s linear infinite"></div>Syncing with Google Sheets…';
      document.body.appendChild(el);
    }
  } else {
    if (el) { setTimeout(() => el?.remove(), 800); }
  }
}

// ============================================================
// IMAGE UPLOAD HELPER
// ============================================================

// Helper: read a File object into a base64 data URL
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(file);
  });
}

// Upload image to Google Drive via Apps Script.
// Returns { driveUrl, localUrl } — driveUrl is for persistence, localUrl for immediate display.
// Never throws — returns empty driveUrl on any failure.
async function uploadImage(file) {
  if (!file) return { driveUrl: '', localUrl: '' };

  // Always read the local dataURL first for immediate display
  let localUrl = '';
  try {
    localUrl = await fileToDataUrl(file);
  } catch (e) {
    console.warn('[FreelanceOS] FileReader failed:', e);
    return { driveUrl: '', localUrl: '' };
  }

  if (CONFIG.DEMO_MODE || !CONFIG.APPS_SCRIPT_URL) {
    // Demo mode: use the local data URL for both display and storage
    return { driveUrl: localUrl, localUrl };
  }

  // Send base64 to Apps Script → Google Drive with a 20s timeout
  try {
    const base64 = localUrl.split(',')[1];
    const uploadPromise = apiCall('POST', {
      action:   'uploadImage',
      base64:   base64,
      filename: file.name,
      mimeType: file.type,
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Image upload timed out after 20 s')), 20000)
    );
    const result = await Promise.race([uploadPromise, timeoutPromise]);
    if (result && result.url) {
      console.log('[FreelanceOS] Logo uploaded to Drive:', result.url);
      return { driveUrl: result.url, localUrl };
    }
    throw new Error('Drive upload returned no URL.');
  } catch (err) {
    console.warn('[FreelanceOS] Drive upload failed (using local fallback):', err.message);
    return { driveUrl: '', localUrl };  // caller will use localUrl for display only
  }
}

// ============================================================
// ROUTER
// ============================================================
function showPage(pageName) {
  state.currentPage = pageName;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pg = document.getElementById(`page-${pageName}`);
  if (pg) pg.classList.add('active');
  const nav = document.querySelector(`[data-page="${pageName}"]`);
  if (nav) nav.classList.add('active');

  // Update topbar
  const titles = { dashboard: 'Dashboard', clients: 'Clients', tasks: 'Tasks', reports: 'Reports' };
  document.getElementById('topbar-title').textContent = titles[pageName] || pageName;

  // Update Add button label
  const addBtn = document.getElementById('topbar-add-btn');
  if (pageName === 'tasks') {
    addBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Task`;
    addBtn.onclick = () => openModal('task');
  } else {
    addBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Client`;
    addBtn.onclick = () => openModal('client');
  }

  // Render the page
  renderPage(pageName);
}

function renderPage(name) {
  switch (name) {
    case 'dashboard': renderDashboard(); break;
    case 'clients':   renderClients();   break;
    case 'tasks':     renderTasks();     break;
    case 'reports':   renderReports();   break;
  }
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
  renderDashboardStats();
  renderDashboardTasksTable();
  renderEarningsChart();
}

function renderDashboardStats() {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear  = now.getFullYear();

  const totalClients = state.clients.length;
  const newClientsThisMonth = state.clients.filter(c => {
    const d = new Date(c.JoinedDate);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  const totalEarnings = state.tasks.reduce((s, t) => s + (parseFloat(t.Amount)||0), 0);
  const thisMonthEarnings = state.tasks.filter(t => {
    const d = new Date(t.AssignedDate);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).reduce((s, t) => s + (parseFloat(t.Amount)||0), 0);

  setCard('dash-total-clients',    totalClients,               '12%', true);
  setCard('dash-new-clients',      newClientsThisMonth,        '2%',  true);
  setCard('dash-month-earnings',   formatCurrency(thisMonthEarnings), '8%', true);
  setCard('dash-total-earnings',   formatCurrency(totalEarnings),    '15%', true);
}

function setCard(id, value, badge, up) {
  const el = document.getElementById(id);
  if (!el) return;
  el.querySelector('.stat-value').textContent = value;
  const b = el.querySelector('.stat-badge');
  if (b) { b.textContent = (up ? '↑' : '↓') + ' ' + badge; b.className = 'stat-badge ' + (up ? 'up' : 'down'); }
}

function renderDashboardTasksTable() {
  const tbody = document.getElementById('dash-tasks-tbody');
  if (!tbody) return;

  const tasks = state.tasks.slice(0, 6);
  if (!tasks.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">No tasks yet.</div></td></tr>`;
    return;
  }

  tbody.innerHTML = tasks.map((t, i) => `
    <tr>
      <td class="sno-cell">${String(i+1).padStart(2,'0')}</td>
      <td>
        <div class="flex gap-8">
          <span class="client-avatar" style="background:${avatarColor(t.ClientName)}">${t.LogoUrl ? `<img src="${escHtml(t.LogoUrl)}" alt="">` : getInitials(t.ClientName)}</span>
          <span class="fw-500">${escHtml(t.ClientName)}</span>
        </div>
      </td>
      <td class="text-muted">${formatDate(t.AssignedDate)}</td>
      <td><span class="type-tag">${escHtml(t.TaskType)}</span></td>
      <td>${statusBadge(t.Status)}</td>
      <td class="fw-500">${formatCurrency(t.Amount)}</td>
    </tr>
  `).join('');
}

function statusBadge(status) {
  const map = {
    'Pending':        'badge-amber',
    'In Progress':    'badge-green text-accent',
    'Completed':      'badge-green',
    'Not Completed':  'badge-red',
    'Cancelled':      'badge-gray',
    'Overdue':        'badge-red',
    'Active':         'badge-green',
    'Inactive':       'badge-gray',
  };
  const cls = map[status] || 'badge-gray';
  return `<span class="badge ${cls}">${escHtml(status)}</span>`;
}

// ============================================================
// EARNINGS CHART (Chart.js)
// ============================================================
function renderEarningsChart() {
  const canvas = document.getElementById('earningsChart');
  if (!canvas) return;

  const { labels, data } = getClientChartData();

  if (state.chartInstance) state.chartInstance.destroy();
  state.chartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: data.map((_, i) => i === data.indexOf(Math.max(...data)) ? '#3fb950' : '#00d4ff'),
        borderRadius: 5,
        borderSkipped: false,
        barThickness: 'flex',
        maxBarThickness: 32,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: {
        backgroundColor: '#1c2333',
        titleColor: '#e6edf3',
        bodyColor: '#8b949e',
        borderColor: '#30363d',
        borderWidth: 1,
        padding: 10,
        callbacks: { label: ctx => ' ₹' + ctx.raw.toLocaleString('en-IN') }
      }},
      scales: {
        x: { grid: { color: 'transparent' }, ticks: { color: '#6e7681', font: { size: 11 } } },
        y: { grid: { color: '#21293a', borderDash: [3,3] }, ticks: { color: '#6e7681', font: { size: 11 },
          callback: v => v >= 1000 ? '₹' + v/1000 + 'k' : '₹' + v } }
      },
    },
  });
}

function getClientChartData() {
  const clientEarnings = state.clients.map(c => {
    const earnings = state.tasks
      .filter(t => t.ClientId === c.ID)
      .reduce((sum, t) => sum + (parseFloat(t.Amount) || 0), 0);
    return { name: c.Name, earnings };
  });

  const activeClients = clientEarnings
    .filter(c => c.earnings > 0)
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 10);

  if (activeClients.length === 0) {
     return { labels: ['No Data'], data: [0] };
  }

  return {
    labels: activeClients.map(c => c.name),
    data: activeClients.map(c => c.earnings)
  };
}

// ============================================================
// CLIENTS PAGE
// ============================================================
function renderClients() {
  renderClientsStats();
  renderClientsTable();
}

function renderClientsStats() {
  const total    = state.clients.length;
  const active   = state.clients.filter(c => c.Status === 'Active').length;
  const inactive = state.clients.filter(c => c.Status === 'Inactive').length;
  const now = new Date();
  const newMonth = state.clients.filter(c => {
    const d = new Date(c.JoinedDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  setText('cl-stat-total',    total);
  setText('cl-stat-active',   active);
  setText('cl-stat-new',      newMonth);
  setText('cl-stat-inactive', inactive);
}

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

let clientsSortDesc = true;
function sortClientsByDate() {
  clientsSortDesc = !clientsSortDesc;
  state.clients.sort((a, b) => {
    const dA = new Date(a.JoinedDate || 0);
    const dB = new Date(b.JoinedDate || 0);
    return clientsSortDesc ? dB - dA : dA - dB;
  });
  renderClientsTable();
}

function renderClientsTable() {
  const tbody = document.getElementById('clients-tbody');
  if (!tbody) return;

  const q = state.searchQuery.toLowerCase();
  const clients = state.clients.filter(c =>
    !q || c.Name?.toLowerCase().includes(q) || c.Email?.toLowerCase().includes(q) || c.Type?.toLowerCase().includes(q)
  );

  if (!clients.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      <h3>No clients found</h3><p>Add your first client to get started.</p>
    </div></td></tr>`;
    return;
  }

  tbody.innerHTML = clients.map((c, i) => {
    const taskCount = state.tasks.filter(t => t.ClientId === c.ID).length;
    return `
    <tr>
      <td>
        <div class="client-cell">
          <span class="client-avatar" style="background:${avatarColor(c.Name)}">${c.LogoUrl ? `<img src="${escHtml(c.LogoUrl)}" alt="">` : getInitials(c.Name)}</span>
          <div class="client-info">
            <div class="c-name">${escHtml(c.Name)}</div>
            <div class="c-email">${escHtml(c.Email || '')}</div>
          </div>
        </div>
      </td>
      <td class="text-muted">${escHtml(c.Type || '—')}</td>
      <td class="text-muted">${formatDate(c.JoinedDate)}</td>
      <td class="fw-500">${taskCount}</td>
      <td class="fw-500">${formatCurrency(c.TotalBilled)}</td>
      <td>${statusBadge(c.Status)}</td>
      <td>
        <div class="flex gap-8">
          <button class="action-btn" title="Email client" onclick="mailClient('${c.ID}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </button>
          <button class="action-btn" title="More options" onclick="showClientMenu(event, '${c.ID}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function showClientMenu(e, clientId) {
  const client = state.clients.find(c => c.ID === clientId);
  if (!client) return;
  const newStatus = client.Status === 'Active' ? 'Inactive' : 'Active';
  showContextMenu(e, [
    {
      icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
      label: 'Edit Client',
      action: () => openEditClientModal(clientId),
    },
    {
      icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/></svg>`,
      label: `Mark as ${newStatus}`,
      action: () => toggleClientStatus(clientId, newStatus),
    },
    {
      icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
      label: 'Delete Client',
      danger: true,
      action: () => deleteClient(clientId),
    },
  ]);
}

function mailClient(clientId) {
  const c = state.clients.find(x => x.ID === clientId);
  if (c?.Email) window.location.href = `mailto:${c.Email}`;
}

async function toggleClientStatus(clientId, newStatus) {
  const idx = state.clients.findIndex(c => c.ID === clientId);
  if (idx === -1) return;
  state.clients[idx].Status = newStatus;
  renderClients();
  showToast('Status Updated', `Client marked as ${newStatus}.`, 'success');
  try {
    await apiCall('POST', { action: 'updateClientStatus', clientId, status: newStatus });
  } catch {}
}

async function deleteClient(clientId) {
  if (!confirm('Delete this client? This cannot be undone.')) return;
  state.clients = state.clients.filter(c => c.ID !== clientId);
  // Also remove related tasks
  state.tasks = state.tasks.filter(t => t.ClientId !== clientId);
  renderPage(state.currentPage);
  showToast('Client Deleted', 'Client and related tasks removed.', 'info');
  try {
    await apiCall('POST', { action: 'deleteClient', clientId });
  } catch {}
}

// ============================================================
// TASKS PAGE
// ============================================================
function renderTasks() {
  renderTasksStats();
  renderTasksTable();
}

function renderTasksStats() {
  const total      = state.tasks.length;
  const inProgress = state.tasks.filter(t => t.Status === 'In Progress').length;
  const completed  = state.tasks.filter(t => t.Status === 'Completed').length;
  const overdue    = state.tasks.filter(t => {
    if (!t.DueDate || t.Status === 'Completed' || t.Status === 'Cancelled') return false;
    return new Date(t.DueDate) < new Date();
  }).length;

  setText('tk-stat-total',      total);
  setText('tk-stat-inprogress', inProgress);
  setText('tk-stat-completed',  completed);
  setText('tk-stat-overdue',    overdue);
}

let tasksSortDesc = true;
function sortTasksByDate() {
  tasksSortDesc = !tasksSortDesc;
  state.tasks.sort((a, b) => {
    const dA = new Date(a.AssignedDate || 0);
    const dB = new Date(b.AssignedDate || 0);
    return tasksSortDesc ? dB - dA : dA - dB;
  });
  renderTasksTable();
  if (state.currentPage === 'dashboard') renderDashboardTasksTable();
}

function renderTasksTable() {
  const tbody = document.getElementById('tasks-tbody');
  if (!tbody) return;

  const q = state.searchQuery.toLowerCase();
  const tasks = state.tasks.filter(t =>
    !q || t.ClientName?.toLowerCase().includes(q) || t.TaskName?.toLowerCase().includes(q) || t.TaskType?.toLowerCase().includes(q)
  );

  if (!tasks.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
      <h3>No tasks found</h3><p>Create your first task to get started.</p>
    </div></td></tr>`;
    return;
  }

  tbody.innerHTML = tasks.map((t, i) => {
    const statusClass = statusSelectClass(t.Status);
    const payClass    = paySelectClass(t.PaymentStatus);
    return `
    <tr>
      <td class="sno-cell">#${String(i+1).padStart(3,'0')}</td>
      <td>
        <div class="client-cell">
          <span class="client-avatar" style="background:${avatarColor(t.ClientName)}">${getInitials(t.ClientName)}</span>
          <span class="fw-500">${escHtml(t.ClientName)}</span>
        </div>
      </td>
      <td class="text-muted">${formatDate(t.AssignedDate)}</td>
      <td>
        <select class="inline-select ${typeSelectClass(t.TaskType)}" onchange="updateTaskType(this, '${t.ID}')">
          ${['Design','Development','SEO','Branding','Maintenance','Consulting','Copywriting','Marketing'].map(tp =>
            `<option value="${tp}" ${t.TaskType===tp?'selected':''}>${tp}</option>`
          ).join('')}
        </select>
      </td>
      <td class="text-muted">${formatDate(t.DueDate)}</td>
      <td>
        <select class="inline-select ${statusClass}" onchange="updateTaskStatus(this, '${t.ID}')">
          ${['Pending','In Progress','Completed','Not Completed','Cancelled','Overdue'].map(s =>
            `<option value="${s}" ${t.Status===s?'selected':''}>${s}</option>`
          ).join('')}
        </select>
      </td>
      <td class="fw-500">${formatCurrency(t.Amount)}</td>
      <td>
        <div class="flex gap-8">
          <select class="inline-select ${payClass}" onchange="updatePaymentStatus(this, '${t.ID}')">
            ${['Pending','Received','Overdue'].map(p =>
              `<option value="${p}" ${t.PaymentStatus===p?'selected':''}>${p}</option>`
            ).join('')}
          </select>
          <button class="action-btn danger" title="Delete task" onclick="deleteTask('${t.ID}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function statusSelectClass(status) {
  const map = {
    'Pending':       'status-pending',
    'In Progress':   'status-inprogress',
    'Completed':     'status-completed',
    'Not Completed': 'status-notcompleted',
    'Cancelled':     'status-cancelled',
    'Overdue':       'status-overdue',
  };
  return map[status] || 'status-pending';
}

function paySelectClass(status) {
  return status === 'Received' ? 'pay-received' : status === 'Overdue' ? 'pay-overdue' : 'pay-pending';
}

function typeSelectClass(type) {
  const map = {
    'Design': 'type-design',
    'Development': 'type-dev',
    'SEO': 'type-seo',
    'Branding': 'type-branding',
    'Maintenance': 'type-maintenance',
    'Consulting': 'type-consulting',
    'Copywriting': 'type-copy',
    'Marketing': 'type-marketing'
  };
  return map[type] || 'type-design';
}

async function updateTaskStatus(selectEl, taskId) {
  const newStatus = selectEl.value;
  selectEl.className = `inline-select ${statusSelectClass(newStatus)}`;
  const idx = state.tasks.findIndex(t => t.ID === taskId);
  if (idx !== -1) state.tasks[idx].Status = newStatus;
  renderTasksStats();
  renderDashboardStats();
  showToast('Status Updated', `Task marked as ${newStatus}.`, 'success');
  try {
    await apiCall('POST', { action: 'updateTaskStatus', taskId, status: newStatus });
  } catch {}
}

async function updatePaymentStatus(selectEl, taskId) {
  const newStatus = selectEl.value;
  selectEl.className = `inline-select ${paySelectClass(newStatus)}`;
  const idx = state.tasks.findIndex(t => t.ID === taskId);
  if (idx !== -1) state.tasks[idx].PaymentStatus = newStatus;
  showToast('Payment Updated', `Payment marked as ${newStatus}.`, 'success');
  try {
    await apiCall('POST', { action: 'updatePaymentStatus', taskId, paymentStatus: newStatus });
  } catch {}
}

async function updateTaskType(selectEl, taskId) {
  const newType = selectEl.value;
  selectEl.className = `inline-select ${typeSelectClass(newType)}`;
  const idx = state.tasks.findIndex(t => t.ID === taskId);
  if (idx !== -1) state.tasks[idx].TaskType = newType;
}

async function deleteTask(taskId) {
  if (!confirm('Delete this task?')) return;
  state.tasks = state.tasks.filter(t => t.ID !== taskId);
  renderTasks();
  renderDashboard();
  showToast('Task Deleted', '', 'info');
  try {
    await apiCall('POST', { action: 'deleteTask', taskId });
  } catch {}
}

// ============================================================
// REPORTS PAGE
// ============================================================
function renderReports() {
  const completed   = state.tasks.filter(t => t.Status === 'Completed').length;
  const pending     = state.tasks.filter(t => t.Status === 'Pending').length;
  const inProgress  = state.tasks.filter(t => t.Status === 'In Progress').length;
  const totalBilled = state.tasks.reduce((s, t) => s + (parseFloat(t.Amount)||0), 0);
  const received    = state.tasks.filter(t => t.PaymentStatus === 'Received')
                        .reduce((s, t) => s + (parseFloat(t.Amount)||0), 0);

  setText('rpt-total-earnings', formatCurrency(totalBilled));
  setText('rpt-received',       formatCurrency(received));
  setText('rpt-pending-pay',    formatCurrency(totalBilled - received));
  setText('rpt-completed',      completed);
  setText('rpt-pending-tasks',  pending);
  setText('rpt-inprogress',     inProgress);
  setText('rpt-total-clients',  state.clients.length);
  setText('rpt-active-clients', state.clients.filter(c=>c.Status==='Active').length);

  renderReportsChart();
}

function renderReportsChart() {
  const canvas = document.getElementById('reportsChart');
  if (!canvas) return;
  if (window._reportChart) window._reportChart.destroy();

  const completed  = state.tasks.filter(t => t.Status === 'Completed').length;
  const inProgress = state.tasks.filter(t => t.Status === 'In Progress').length;
  const pending    = state.tasks.filter(t => t.Status === 'Pending').length;
  const other      = state.tasks.length - completed - inProgress - pending;

  window._reportChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Completed','In Progress','Pending','Other'],
      datasets: [{ data: [completed, inProgress, pending, Math.max(0,other)],
        backgroundColor: ['#3fb950','#00d4ff','#f0a500','#8b949e'],
        borderWidth: 3,
        borderColor: '#1c2333',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#8b949e', font: { size: 12 }, padding: 16 } },
        tooltip: {
          backgroundColor: '#1c2333',
          titleColor: '#e6edf3',
          bodyColor: '#8b949e',
          borderColor: '#30363d',
          borderWidth: 1,
        },
      },
      cutout: '65%',
    },
  });
}

// ============================================================
// MODALS
// ============================================================
function openModal(type) {
  closeModal();
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');

  if (type === 'client') {
    content.innerHTML = buildClientModalHtml();
    setupImageUpload();
    overlay.classList.add('open');
    const firstInput = content.querySelector('input');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
  } else if (type === 'task') {
    content.innerHTML = buildTaskModalHtml();
    overlay.classList.add('open');
    const firstInput = content.querySelector('input');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
  }
}

function openEditClientModal(clientId) {
  const client = state.clients.find(c => c.ID === clientId);
  if (!client) return;
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  content.innerHTML = buildClientModalHtml(client);
  setupImageUpload();
  overlay.classList.add('open');
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.remove('open');
}

function buildClientModalHtml(existing = null) {
  const isEdit = !!existing;
  return `
    <h2 class="modal-title">${isEdit ? 'Edit Client' : 'Add Client'}</h2>
    <div class="form-group">
      <label class="form-label">Client Name</label>
      <input id="f-name" class="form-input" type="text" placeholder="e.g. Acme Corp" value="${isEdit ? escHtml(existing.Name||'') : ''}">
    </div>
    <div class="form-group">
      <label class="form-label">Email Address</label>
      <input id="f-email" class="form-input" type="email" placeholder="e.g. contact@company.com" value="${isEdit ? escHtml(existing.Email||'') : ''}">
    </div>
    <div class="form-group">
      <label class="form-label">Location</label>
      <input id="f-location" class="form-input" type="text" placeholder="e.g. New York, USA" value="${isEdit ? escHtml(existing.Location||'') : ''}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Client Type</label>
        <select id="f-type" class="form-select">
          ${['Corporate','Enterprise','Startup','Agency','Freelancer','Non-Profit'].map(t =>
            `<option value="${t}" ${isEdit && existing.Type===t?'selected':''}>${t}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select id="f-status" class="form-select">
          <option value="Active" ${!isEdit || existing.Status==='Active' ? 'selected':''}>Active</option>
          <option value="Inactive" ${isEdit && existing.Status==='Inactive' ? 'selected':''}>Inactive</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Logo / Avatar (optional)</label>
      <div class="upload-area" id="upload-area">
        <input type="file" id="logo-input" accept="image/*">
        <img id="upload-preview" class="upload-preview" src="" alt="">
        <div class="upload-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        </div>
        <div class="upload-text">Click or drag to upload logo</div>
        <div class="upload-hint">PNG, JPG, GIF up to 5MB</div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn-submit" id="client-submit-btn" onclick="submitClient('${isEdit ? existing.ID : ''}')">
        ${isEdit ? 'Save Changes' : 'Add Client'}
      </button>
    </div>`;
}

function buildTaskModalHtml() {
  const clientOptions = state.clients.map(c =>
    `<option value="${c.ID}">${escHtml(c.Name)}</option>`
  ).join('');
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return `
    <h2 class="modal-title">Add New Task</h2>
    <div class="form-group">
      <label class="form-label">Task Name</label>
      <input id="tf-name" class="form-input" type="text" placeholder="e.g. Redesign Landing Page">
    </div>
    <div class="form-group">
      <label class="form-label">Client</label>
      <select id="tf-client" class="form-select">
        <option value="">Select client...</option>
        ${clientOptions}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Task Type</label>
        <select id="tf-type" class="form-select">
          <option value="">Select type...</option>
          ${['Design','Development','SEO','Branding','Maintenance','Consulting','Copywriting','Marketing'].map(t =>
            `<option value="${t}">${t}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Amount (₹)</label>
        <input id="tf-amount" class="form-input" type="number" min="0" step="0.01" placeholder="0.00" value="0.00">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Due Date</label>
      <input id="tf-duedate" class="form-input" type="date" value="${today}">
    </div>
    <div class="modal-footer">
      <button class="btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn-submit" id="task-submit-btn" onclick="submitTask()">
        Create Task
      </button>
    </div>`;
}

function setupImageUpload() {
  const input   = document.getElementById('logo-input');
  const preview = document.getElementById('upload-preview');
  const area    = document.getElementById('upload-area');
  if (!input) return;

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      preview.src = e.target.result;
      preview.style.display = 'block';
      area.querySelector('.upload-icon').style.display = 'none';
      area.querySelector('.upload-text').style.display = 'none';
      area.querySelector('.upload-hint').style.display = 'none';
    };
    reader.readAsDataURL(file);
  });

  // Drag & drop
  area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('drag-over'); });
  area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
  area.addEventListener('drop', e => {
    e.preventDefault();
    area.classList.remove('drag-over');
    const file = e.dataTransfer?.files[0];
    if (!file) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change'));
  });
}

async function submitClient(existingId) {
  const name     = document.getElementById('f-name')?.value?.trim();
  const email    = document.getElementById('f-email')?.value?.trim();
  const location = document.getElementById('f-location')?.value?.trim();
  const type     = document.getElementById('f-type')?.value;
  const status   = document.getElementById('f-status')?.value;
  const logoFile = document.getElementById('logo-input')?.files[0];

  if (!name) { showToast('Validation Error', 'Client name is required.', 'error'); return; }

  const btn = document.getElementById('client-submit-btn');
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Saving...`;

  try {
    // ---- Step 1: Upload logo (non-blocking — never prevents client save) ----
    let driveLogoUrl = '';   // Drive URL → stored in Google Sheet
    let displayLogoUrl = ''; // Data URL or Drive URL → used for immediate UI display

    if (logoFile) {
      btn.innerHTML = `<span class="spinner"></span> Uploading logo...`;
      const { driveUrl, localUrl } = await uploadImage(logoFile);
      driveLogoUrl   = driveUrl;   // may be '' if Drive upload failed
      displayLogoUrl = driveUrl || localUrl; // prefer Drive URL, fall back to local dataURL

      if (!driveUrl && localUrl) {
        showToast(
          'Logo Notice',
          'Logo saved locally for this session. It will not persist after a page refresh.',
          'info'
        );
      }
    }

    if (existingId) {
      // ---- Edit existing client ----
      btn.innerHTML = `<span class="spinner"></span> Updating...`;
      const idx = state.clients.findIndex(c => c.ID === existingId);
      if (idx !== -1) {
        state.clients[idx] = {
          ...state.clients[idx],
          Name: name, Email: email, Location: location,
          Type: type, Status: status,
          ...(displayLogoUrl ? { LogoUrl: displayLogoUrl } : {}),
        };
      }

      // Update UI immediately (optimistic)
      closeModal();
      renderClients();
      if (state.currentPage === 'dashboard') renderDashboard();
      showToast('Client Updated', `${name} has been updated.`, 'success');

      // Persist to sheet in background (fire-and-forget)
      apiCall('POST', {
        action: 'updateClient',
        client: {
          id: existingId, name, email, location, type, status,
          logoUrl: driveLogoUrl,
        },
      }).catch(err => console.warn('[FreelanceOS] Background updateClient failed:', err.message));

    } else {
      // ---- Add new client (optimistic: add to UI first, then save to sheet) ----
      const tempId = generateId('CLT');
      const dDate = new Date();
      const localDateIso = `${dDate.getFullYear()}-${String(dDate.getMonth()+1).padStart(2,'0')}-${String(dDate.getDate()).padStart(2,'0')}`;
      
      const newClient = {
        ID: tempId,
        Name: name, Email: email, Location: location,
        Type: type, Status: status,
        JoinedDate: localDateIso,
        TotalBilled: 0, ActiveTasks: 0,
        LogoUrl: displayLogoUrl,  // local dataURL or Drive URL — for immediate display
        CreatedAt: new Date().toISOString(),
      };

      // Add to state immediately so the client appears right away
      state.clients.push(newClient);

      // Close modal and render UI before waiting for the sheet API call
      closeModal();
      renderClients();
      if (state.currentPage === 'dashboard') renderDashboard();
      showToast('Client Added ✓', `${name} added. Saving to Google Sheet…`, 'success');

      // Now save to sheet in background — modal is already closed
      // (btn reference is stale after closeModal, but the API call itself still matters)
      apiCall('POST', {
        action: 'addClient',
        client: {
          id:          tempId,
          name,
          email,
          location,
          type,
          status,
          joinedDate:  newClient.JoinedDate,
          totalBilled: 0,
          activeTasks: 0,
          logoUrl:     driveLogoUrl,  // Drive URL only (never dataURL → too large for Sheet)
        },
      }).then(sheetResult => {
        // If Apps Script returns a different ID, update our local state record
        if (sheetResult?.id && sheetResult.id !== tempId) {
          const idx = state.clients.findIndex(c => c.ID === tempId);
          if (idx !== -1) state.clients[idx].ID = sheetResult.id;
        }
        console.log('[FreelanceOS] Client saved to sheet:', sheetResult);
      }).catch(sheetErr => {
        console.warn('[FreelanceOS] Sheet save failed (client kept in UI):', sheetErr.message);
        showToast(
          'Sync Warning',
          'Client is shown but could not be saved to Google Sheet. Check your connection.',
          'error'
        );
      });
    }

  } catch (err) {
    // Top-level catch — unexpected error (e.g. FileReader fail before modal close)
    const msg = err.message || 'Unknown error';
    console.error('submitClient error:', msg);
    showToast('Save Failed', msg, 'error');
    // Only try to re-enable btn if the modal is still open
    const stillOpen = document.getElementById('client-submit-btn');
    if (stillOpen) {
      stillOpen.disabled = false;
      stillOpen.textContent = existingId ? 'Save Changes' : 'Add Client';
    }
  }
}

async function submitTask() {
  const name      = document.getElementById('tf-name')?.value?.trim();
  const clientId  = document.getElementById('tf-client')?.value;
  const taskType  = document.getElementById('tf-type')?.value;
  const amount    = parseFloat(document.getElementById('tf-amount')?.value) || 0;
  const dueDate   = document.getElementById('tf-duedate')?.value;

  if (!name)     { showToast('Validation Error', 'Task name is required.', 'error');   return; }
  if (!clientId) { showToast('Validation Error', 'Please select a client.', 'error');  return; }
  if (!taskType) { showToast('Validation Error', 'Please select a task type.', 'error'); return; }

  const client = state.clients.find(c => c.ID === clientId);
  const btn = document.getElementById('task-submit-btn');
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Creating...`;

  const tempId = generateId('TSK');
  const dDate = new Date();
  const localDateIso = `${dDate.getFullYear()}-${String(dDate.getMonth()+1).padStart(2,'0')}-${String(dDate.getDate()).padStart(2,'0')}`;
  
  const newTask = {
    ID: tempId,
    ClientId: clientId,
    ClientName: client?.Name || 'Unknown',
    TaskName: name,
    TaskType: taskType,
    Amount: amount,
    Status: 'Pending',
    PaymentStatus: 'Pending',
    AssignedDate: localDateIso,
    DueDate: dueDate,
    CreatedAt: new Date().toISOString(),
  };

  // ---- Optimistic update: add to state and render UI immediately ----
  state.tasks.push(newTask);
  closeModal();
  renderTasks();                                        // always refresh tasks page
  if (state.currentPage === 'dashboard') renderDashboard();
  showToast('Task Created ✓', `"${name}" added. Saving to Google Sheet…`, 'success');

  // ---- Save to Google Sheet in background (fire-and-forget) ----
  apiCall('POST', {
    action: 'addTask',
    task: {
      id:            tempId,
      clientId:      newTask.ClientId,
      clientName:    newTask.ClientName,
      taskName:      newTask.TaskName,
      taskType:      newTask.TaskType,
      amount:        newTask.Amount,
      status:        newTask.Status,
      paymentStatus: newTask.PaymentStatus,
      assignedDate:  newTask.AssignedDate,
      dueDate:       newTask.DueDate,
    },
  }).then(sheetResult => {
    // If Apps Script returns a different ID, update our local state record
    if (sheetResult?.id && sheetResult.id !== tempId) {
      const idx = state.tasks.findIndex(t => t.ID === tempId);
      if (idx !== -1) state.tasks[idx].ID = sheetResult.id;
    }
    console.log('[FreelanceOS] Task saved to sheet:', sheetResult);
  }).catch(err => {
    console.warn('[FreelanceOS] Sheet save failed (task kept in UI):', err.message);
    showToast(
      'Sync Warning',
      'Task is shown but could not be saved to Google Sheet. Check your connection.',
      'error'
    );
  });
}

// ============================================================
// SEARCH
// ============================================================
function initSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;
  input.addEventListener('input', () => {
    state.searchQuery = input.value.trim();
    renderPage(state.currentPage);
  });
}

// ============================================================
// EXPORT
// ============================================================
function exportCSV() {
  let rows, filename;
  if (state.currentPage === 'clients') {
    rows = [['Name','Email','Location','Type','Status','Joined Date','Total Billed','Active Tasks'],
      ...state.clients.map(c => [c.Name, c.Email, c.Location, c.Type, c.Status, c.JoinedDate, c.TotalBilled, c.ActiveTasks])
    ];
    filename = 'clients.csv';
  } else {
    rows = [['Task Name','Client','Type','Amount','Status','Payment','Assigned','Due Date'],
      ...state.tasks.map(t => [t.TaskName, t.ClientName, t.TaskType, t.Amount, t.Status, t.PaymentStatus, t.AssignedDate, t.DueDate])
    ];
    filename = 'tasks.csv';
  }
  const csv = rows.map(r => r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  showToast('Export Ready', `${filename} downloaded.`, 'info');
}

// ============================================================
// DEMO MODE BANNER + CONNECTION TEST
// ============================================================
function checkDemoMode() {
  const banner = document.getElementById('demo-banner');
  if (CONFIG.DEMO_MODE || !CONFIG.APPS_SCRIPT_URL) {
    banner.style.display = 'flex';
  }
}

// Call this from console or a button to diagnose Sheets connection issues.
// It hits the ?action=testSheets endpoint and shows what Apps Script returns.
async function testSheetsConnection() {
  if (!CONFIG.APPS_SCRIPT_URL) {
    showToast('No URL', 'Set APPS_SCRIPT_URL in config.js first.', 'error');
    return;
  }
  showToast('Testing…', 'Checking Google Sheets connection…', 'info');
  try {
    const params = new URLSearchParams({ action: 'testSheets' });
    const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?${params}`, {
      method: 'GET',
      redirect: 'follow',
    });
    const data = await res.json();
    if (data.ok) {
      showToast(
        'Sheets Connected ✓',
        `Sheet: "${data.spreadsheetName}" | Tabs: ${data.sheets.join(', ')}`,
        'success'
      );
      console.log('[FreelanceOS] testSheets OK:', data);
    } else {
      showToast(
        'Sheets Error ✗',
        data.error || 'Unknown error from Apps Script',
        'error'
      );
      console.error('[FreelanceOS] testSheets FAILED:', data);
    }
  } catch (err) {
    showToast('Connection Failed', err.message, 'error');
    console.error('[FreelanceOS] testSheets fetch error:', err);
  }
}

// ============================================================
// INIT
// ============================================================
async function init() {
  // Show loading overlay
  const loading = document.getElementById('loading-overlay');

  // Load data
  await loadAllData();

  // Show app
  if (loading) {
    loading.classList.add('hidden');
    setTimeout(() => loading.remove(), 400);
  }

  // Initialize search
  initSearch();

  // Initial page
  showPage('dashboard');

  // Check demo mode
  checkDemoMode();

  // Dynamic Date Range 
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const m1 = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const m2 = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const drBtn = document.getElementById('date-range-btn');
  if (drBtn) {
    drBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      ${m1} – ${m2}
    `;
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // Modal overlay click to close
  document.getElementById('modal-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'modal-overlay') closeModal();
  });
}

document.addEventListener('DOMContentLoaded', init);
