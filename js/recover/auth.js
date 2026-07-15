// ═══════════════════════════════════════════════════════════
// Curaah Recover — Authentication Module
// Registration, Login, Device-ID auto-login
// ═══════════════════════════════════════════════════════════

import { getDeviceId, maskPhone } from './crypto.js';
import { showToast, $, escapeHtml } from './utils.js';

let _state, _supabase, _navigate;

export function init(state, supabase, navigate) {
  _state = state;
  _supabase = supabase;
  _navigate = navigate;
}

export function render() {
  const container = $('authContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="auth-wrapper">
      <!-- Animated Background -->
      <div class="auth-bg-glow auth-glow-1"></div>
      <div class="auth-bg-glow auth-glow-2"></div>

      <!-- Brand -->
      <div class="auth-brand">
        <svg class="auth-logo" viewBox="0 0 64 64" fill="none">
          <path d="M32 5L9 16L9 38Q9 54 32 61Q55 54 55 38L55 16Z" fill="#0f1f3d" stroke="#3d9eff" stroke-width="2"/>
          <path d="M32 18Q24 27 24 36Q24 45 32 50Q40 45 40 36Q40 27 32 18Z" fill="#3d9eff" opacity=".9"/>
          <circle cx="32" cy="39" r="6" fill="white"/>
        </svg>
        <h1 class="auth-title">Curaah Recover</h1>
        <p class="auth-subtitle">AI Recovery Intelligence Platform</p>
        <p class="auth-tagline">Personalized Recovery · Continuous Care · Intelligent Healthcare</p>
      </div>

      <!-- Auth Card -->
      <div class="auth-card" id="authCard">
        <!-- Login Form (default) -->
        <div class="auth-form" id="loginForm">
          <h2 class="auth-form-title">Welcome Back</h2>
          <p class="auth-form-desc">Login with your phone number</p>

          <div class="form-group">
            <label class="form-label" for="loginPhone">Phone Number</label>
            <div class="input-prefix-wrap">
              <span class="input-prefix">+91</span>
              <input type="tel" class="input input-with-prefix" id="loginPhone" 
                placeholder="Enter 10-digit number" maxlength="10" autocomplete="tel"/>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="loginPassword">Password</label>
            <div class="input-suffix-wrap">
              <input type="password" class="input input-with-suffix" id="loginPassword" 
                placeholder="Enter your password" autocomplete="current-password"/>
              <button type="button" class="input-suffix-btn" onclick="window._togglePwd('loginPassword', this)">👁️</button>
            </div>
          </div>

          <button class="btn btn-primary btn-lg btn-full" id="btnLogin" onclick="window._doLogin()">
            <span class="btn-text">Login</span>
            <span class="btn-spinner" style="display:none"></span>
          </button>

          <div class="auth-divider">
            <span>New to Curaah?</span>
          </div>

          <button class="btn btn-ghost btn-full" onclick="window._showRegister()">
            Create Account
          </button>
        </div>

        <!-- Register Form -->
        <div class="auth-form" id="registerForm" style="display:none">
          <h2 class="auth-form-title">Start Your Recovery Journey</h2>
          <p class="auth-form-desc">Create your account in 30 seconds</p>

          <div class="form-group">
            <label class="form-label" for="regName">Full Name <span class="required">*</span></label>
            <input type="text" class="input" id="regName" placeholder="Your name" autocomplete="name"/>
          </div>

          <div class="form-group">
            <label class="form-label" for="regPhone">Phone Number <span class="required">*</span></label>
            <div class="input-prefix-wrap">
              <span class="input-prefix">+91</span>
              <input type="tel" class="input input-with-prefix" id="regPhone" 
                placeholder="10-digit number" maxlength="10" autocomplete="tel"/>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="regPassword">Create Password <span class="required">*</span></label>
            <div class="input-suffix-wrap">
              <input type="password" class="input input-with-suffix" id="regPassword" 
                placeholder="Min 6 characters" autocomplete="new-password"/>
              <button type="button" class="input-suffix-btn" onclick="window._togglePwd('regPassword', this)">👁️</button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="regLanguage">Preferred Language</label>
            <select class="select" id="regLanguage">
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
            </select>
          </div>

          <!-- DPDP Consent -->
          <div class="consent-box">
            <label class="consent-row">
              <input type="checkbox" id="consentData" checked/>
              <span>I consent to processing of my health data for personalized recovery guidance as per 
                <a href="/privacy.html" target="_blank">Privacy Policy</a> and DPDP Act 2023</span>
            </label>
            <label class="consent-row">
              <input type="checkbox" id="consentAI" checked/>
              <span>I consent to AI analysis of my medical data for recovery recommendations. 
                <em>AI is advisory only — always verify with your doctor.</em></span>
            </label>
          </div>

          <button class="btn btn-primary btn-lg btn-full" id="btnRegister" onclick="window._doRegister()">
            <span class="btn-text">Create Account</span>
            <span class="btn-spinner" style="display:none"></span>
          </button>

          <div class="auth-divider">
            <span>Already have an account?</span>
          </div>

          <button class="btn btn-ghost btn-full" onclick="window._showLogin()">
            Login Instead
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div class="auth-footer">
        <span>🔒 End-to-end encrypted · DPDP 2023 compliant</span>
        <span>IIT Ropar TBIF Incubated · DPIIT Recognised</span>
      </div>
    </div>
  `;
}

// ── Toggle password visibility ──
window._togglePwd = function(inputId, btn) {
  const input = $(inputId);
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
    btn.textContent = input.type === 'password' ? '👁️' : '🙈';
  }
};

// ── Switch between login and register ──
window._showRegister = function() {
  const login = $('loginForm');
  const reg = $('registerForm');
  if (login) login.style.display = 'none';
  if (reg) reg.style.display = '';
};

window._showLogin = function() {
  const login = $('loginForm');
  const reg = $('registerForm');
  if (login) login.style.display = '';
  if (reg) reg.style.display = 'none';
};

// ── Login Handler ──
window._doLogin = async function() {
  const phone = $('loginPhone')?.value?.trim();
  const password = $('loginPassword')?.value;
  const btn = $('btnLogin');

  if (!phone || phone.length !== 10) {
    showToast('Please enter a valid 10-digit phone number', 'error');
    return;
  }
  if (!password) {
    showToast('Please enter your password', 'error');
    return;
  }

  setLoading(btn, true);

  const { data, error } = await _supabase.rpc('login_recover_patient', {
    p_phone: phone,
    p_password: password,
    p_device_id: _state.deviceId,
  });

  setLoading(btn, false);

  if (error || !data || data.status === 'error') {
    showToast(data?.message || 'Login failed. Please try again.', 'error');
    return;
  }

  // Success!
  _state.patient = data;
  localStorage.setItem('curaah_r_patient', JSON.stringify(data));
  showToast('Welcome back! 🎉', 'success');

  if (data.onboarding_completed === false) {
    _navigate('onboarding');
  } else {
    _navigate('home');
  }
};

// ── Register Handler ──
window._doRegister = async function() {
  const name = $('regName')?.value?.trim();
  const phone = $('regPhone')?.value?.trim();
  const password = $('regPassword')?.value;
  const language = $('regLanguage')?.value || 'en';
  const consentData = $('consentData')?.checked;
  const consentAI = $('consentAI')?.checked;
  const btn = $('btnRegister');

  // Validation
  if (!name || name.length < 2) {
    showToast('Please enter your full name', 'error');
    return;
  }
  if (!phone || phone.length !== 10) {
    showToast('Please enter a valid 10-digit phone number', 'error');
    return;
  }
  if (!password || password.length < 6) {
    showToast('Password must be at least 6 characters', 'error');
    return;
  }
  if (!consentData) {
    showToast('Please consent to data processing to continue', 'warning');
    return;
  }

  setLoading(btn, true);

  const { data, error } = await _supabase.rpc('register_recover_patient', {
    p_device_id: _state.deviceId,
    p_phone: phone,
    p_password: password,
    p_full_name: name,
    p_language: language,
  });

  setLoading(btn, false);

  if (error || !data || data.status === 'error') {
    showToast(data?.message || 'Registration failed. Please try again.', 'error');
    return;
  }

  // Update consent flags separately
  if (data.patient_id) {
    await _supabase.query('recover_patients', {
      method: 'PATCH',
      body: {
        consent_data_processing: consentData,
        consent_ai_analysis: consentAI,
        consent_given_at: new Date().toISOString(),
      },
      filter: `id=eq.${data.patient_id}`,
    });
  }

  // Success!
  _state.patient = data;
  localStorage.setItem('curaah_r_patient', JSON.stringify(data));
  showToast(`Welcome to Curaah, ${escapeHtml(name)}! 🎉`, 'success');

  // Go to onboarding
  _navigate('onboarding');
};

// ── Loading state helper ──
function setLoading(btn, loading) {
  if (!btn) return;
  const text = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.btn-spinner');
  if (text) text.style.display = loading ? 'none' : '';
  if (spinner) spinner.style.display = loading ? '' : 'none';
  btn.disabled = loading;
}
