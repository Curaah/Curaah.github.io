// ═══════════════════════════════════════════════════════════
// Curaah Recover — App Core (Router, State, Init)
// Entry point for the Recovery Intelligence Engine
// ═══════════════════════════════════════════════════════════

import { getDeviceId } from './crypto.js';
import { showToast, $, isOffline, getGreeting } from './utils.js';

// ── Supabase Configuration ──
const SUPA_URL = 'https://lospowxozjnoiawxbojg.supabase.co';
const SUPA_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxvc3Bvd3hvempub2lhd3hib2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTIzMjksImV4cCI6MjA5MjMyODMyOX0.KBfNiJIKweEAqVJ8q_G8ZkbU5qi4vfglRhazKIH32ic';

// ── Application State ──
const state = {
  patient: null,           // Current patient record
  deviceId: getDeviceId(), // Persistent device ID
  currentScreen: null,     // Active screen name
  medicines: [],           // Active medicines
  todayLogs: [],           // Today's adherence logs
  vitals: [],              // Recent vitals
  plans: [],               // Recovery plans
  isOnline: navigator.onLine,
  isLoading: false,
};

// ── Supabase Client (lightweight, no SDK dependency) ──
const supabase = {
  /**
   * Make authenticated request to Supabase REST API
   */
  async query(table, { method = 'GET', body, select, filter, order, limit } = {}) {
    let url = `${SUPA_URL}/rest/v1/${table}`;
    const params = [];
    if (select) params.push(`select=${encodeURIComponent(select)}`);
    if (filter) params.push(filter);
    if (order) params.push(`order=${encodeURIComponent(order)}`);
    if (limit) params.push(`limit=${limit}`);
    if (params.length) url += '?' + params.join('&');

    const headers = {
      'apikey': SUPA_ANON_KEY,
      'Authorization': `Bearer ${SUPA_ANON_KEY}`,
      'x-device-id': state.deviceId,
      'Content-Type': 'application/json',
    };

    if (method === 'POST') headers['Prefer'] = 'return=representation';
    if (method === 'PATCH') headers['Prefer'] = 'return=representation';

    try {
      const resp = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!resp.ok) {
        const err = await resp.text();
        console.error(`Supabase ${method} ${table} error:`, err);
        return { error: err, data: null };
      }
      const data = await resp.json();
      return { data, error: null };
    } catch (e) {
      console.error(`Supabase ${method} ${table} network error:`, e);
      return { error: e.message, data: null };
    }
  },

  /**
   * Call Supabase RPC function
   */
  async rpc(fn, params = {}) {
    try {
      const resp = await fetch(`${SUPA_URL}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: {
          'apikey': SUPA_ANON_KEY,
          'Authorization': `Bearer ${SUPA_ANON_KEY}`,
          'x-device-id': state.deviceId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      const data = await resp.json();
      return { data, error: resp.ok ? null : data };
    } catch (e) {
      return { data: null, error: e.message };
    }
  },

  /**
   * Call Supabase Edge Function
   */
  async edgeFn(fnName, body = {}) {
    try {
      const resp = await fetch(`${SUPA_URL}/functions/v1/${fnName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPA_ANON_KEY}`,
          'Content-Type': 'application/json',
          'x-device-id': state.deviceId,
        },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      return { data, error: resp.ok ? null : data };
    } catch (e) {
      return { data: null, error: e.message };
    }
  },

  /**
   * Upload file to Supabase Storage
   */
  async upload(bucket, path, file) {
    try {
      const resp = await fetch(`${SUPA_URL}/storage/v1/object/${bucket}/${path}`, {
        method: 'POST',
        headers: {
          'apikey': SUPA_ANON_KEY,
          'Authorization': `Bearer ${SUPA_ANON_KEY}`,
        },
        body: file,
      });
      if (!resp.ok) return { error: await resp.text(), data: null };
      const publicUrl = `${SUPA_URL}/storage/v1/object/public/${bucket}/${path}`;
      return { data: { publicUrl }, error: null };
    } catch (e) {
      return { data: null, error: e.message };
    }
  }
};

// ── Screen Router ──
const screens = ['auth', 'onboarding', 'home', 'today', 'journey', 'ai', 'profile'];
const screenModules = {};

function navigate(screenName) {
  if (!screens.includes(screenName)) {
    console.warn(`Unknown screen: ${screenName}`);
    return;
  }

  // Hide all screens
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

  // Show target screen
  const target = document.querySelector(`[data-screen="${screenName}"]`);
  if (target) {
    target.classList.add('active');
    state.currentScreen = screenName;
  }

  // Update navigation active states
  document.querySelectorAll('.bnav-item, .sidebar-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === screenName);
  });

  // Show/hide navigation for auth/onboarding screens
  const isAuthScreen = screenName === 'auth' || screenName === 'onboarding';
  const bottomNav = $('bottomNav');
  const sidebar = $('sidebar');
  const topBar = $('topBar');
  const sosFloat = $('sosFloat');

  if (bottomNav) bottomNav.style.display = isAuthScreen ? 'none' : '';
  if (sidebar) sidebar.style.display = isAuthScreen ? 'none' : '';
  if (topBar) topBar.style.display = isAuthScreen ? 'none' : '';
  if (sosFloat) sosFloat.style.display = isAuthScreen ? 'none' : '';

  // Load screen module if not loaded
  loadScreen(screenName);
}

async function loadScreen(name) {
  if (screenModules[name]) {
    // Module already loaded, just call its render/refresh
    if (screenModules[name].render) {
      screenModules[name].render(state, supabase);
    }
    return;
  }

  const moduleMap = {
    auth: './auth.js',
    onboarding: './onboarding.js',
    home: './home.js',
    today: './today.js',
    journey: './journey.js',
    ai: './companion-ai.js',
    profile: './profile.js',
  };

  if (!moduleMap[name]) return;

  try {
    const mod = await import(moduleMap[name]);
    screenModules[name] = mod;
    if (mod.init) mod.init(state, supabase, navigate);
    if (mod.render) mod.render(state, supabase);
  } catch (e) {
    console.warn(`Module ${name} not yet built:`, e.message);
    // Show placeholder for unbuilt screens
    const container = document.querySelector(`[data-screen="${name}"] .screen-scroll`);
    if (container) {
      container.innerHTML = `
        <div style="padding:40px 20px;text-align:center;">
          <div style="font-size:48px;margin-bottom:16px;">🔨</div>
          <h2 style="font-family:Outfit;font-size:22px;margin-bottom:8px;">Coming Soon</h2>
          <p style="color:var(--muted);font-size:14px;">${name.charAt(0).toUpperCase() + name.slice(1)} screen is being built.</p>
        </div>
      `;
    }
  }
}

// ── Navigation Event Handlers ──
function setupNavigation() {
  // Bottom nav
  document.querySelectorAll('.bnav-item').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.tab));
  });

  // Sidebar nav
  document.querySelectorAll('.sidebar-item').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.tab));
  });

  // Avatar -> profile
  const avatarBtn = $('btnAvatar');
  if (avatarBtn) avatarBtn.addEventListener('click', () => navigate('profile'));
}

// ── Online/Offline Detection ──
function setupConnectivity() {
  window.addEventListener('online', () => {
    state.isOnline = true;
    showToast('Back online — syncing data', 'success');
    syncData();
  });
  window.addEventListener('offline', () => {
    state.isOnline = false;
    showToast('You\'re offline — data saved locally', 'warning');
  });
}

// ── Data Sync (Offline-First) ──
async function syncData() {
  if (!state.isOnline || !state.patient) return;
  // TODO: Implement full sync in Phase 3
  console.log('[Sync] Data sync triggered');
}

// ── Local Storage Helpers ──
function saveLocal(key, data) {
  try {
    localStorage.setItem(`curaah_r_${key}`, JSON.stringify(data));
  } catch (e) {
    console.warn('localStorage save failed:', e);
  }
}

function loadLocal(key) {
  try {
    const raw = localStorage.getItem(`curaah_r_${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// ── Auto-Login Check ──
async function checkAuth() {
  // Try loading patient from local storage first (offline-first)
  const localPatient = loadLocal('patient');
  if (localPatient) {
    state.patient = localPatient;
    updateAvatar();
  }

  if (state.isOnline) {
    // Try auto-login via device ID
    const { data, error } = await supabase.rpc('login_recover_patient', {
      p_phone: null,
      p_password: null,
      p_device_id: state.deviceId,
    });

    if (data && data.status === 'success') {
      state.patient = data;
      saveLocal('patient', data);
      updateAvatar();

      if (!data.onboarding_completed && data.action !== 'auto_login') {
        navigate('onboarding');
      } else {
        navigate('home');
      }
      return;
    }
  }

  // If we have local patient data, go to home
  if (state.patient) {
    navigate('home');
    return;
  }

  // No session found — show auth screen
  navigate('auth');
}

function updateAvatar() {
  const avatar = $('avatarCircle');
  if (avatar && state.patient) {
    const name = state.patient.full_name || state.patient.settings?.name || '?';
    avatar.textContent = name.charAt(0).toUpperCase();
    avatar.style.background = `linear-gradient(135deg, var(--blue), var(--purple))`;
  }
}

// ── App Initialization ──
async function initApp() {
  console.log('%c🏥 Curaah Recover v2.0 — Recovery Intelligence Engine', 
    'color:#3d9eff;font-size:14px;font-weight:bold;');
  console.log('%c   Personalized Recovery. Continuous Care. Intelligent Healthcare.', 
    'color:#00c48c;font-size:11px;');

  setupNavigation();
  setupConnectivity();

  // Check authentication
  await checkAuth();
}

// ── Export for modules ──
export { state, supabase, navigate, saveLocal, loadLocal, SUPA_URL };

// ── Start ──
document.addEventListener('DOMContentLoaded', initApp);
