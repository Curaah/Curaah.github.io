// careconnect/js/login.js
// ONE responsibility: handle the CareConnect email/password login form.
// Validates input → calls Supabase Auth → reads cc_users role → redirects.

(function () {
  'use strict';

  // ── DOM refs ──────────────────────────────────────────────────
  const form      = document.getElementById('login-form');
  const emailEl   = document.getElementById('email');
  const passwordEl= document.getElementById('password');
  const btn       = document.getElementById('btn-login');
  const errBox    = document.getElementById('login-error');
  const errText   = document.getElementById('login-error-text');

  // ── Helpers ───────────────────────────────────────────────────

  function showGlobalError(msg) {
    errText.textContent = msg;
    errBox.style.display = 'flex';
    errBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function hideGlobalError() {
    errBox.style.display = 'none';
  }

  function mapSupabaseError(message) {
    if (!message) return 'Something went wrong. Please try again.';
    const m = message.toLowerCase();
    if (m.includes('invalid login credentials'))
      return 'The email or password you entered is incorrect. Please try again.';
    if (m.includes('email not confirmed'))
      return 'Please verify your email address first. Check your inbox for the verification link.';
    if (m.includes('too many requests'))
      return 'Too many attempts. Please wait a few minutes before trying again.';
    return 'Sign in failed. Please check your details and try again.';
  }

  // ── Validate fields, show inline errors, return true if valid ─
  function validate() {
    let ok = true;

    clearFieldError('email');
    clearFieldError('password');

    if (!isValidEmail(emailEl.value)) {
      showFieldError('email', 'Please enter a valid email address.');
      ok = false;
    }

    if (!isValidPassword(passwordEl.value)) {
      showFieldError('password', 'Password must be at least 8 characters.');
      ok = false;
    }

    if (!ok) scrollToFirstError(form);
    return ok;
  }

  // ── Redirect after successful login based on role + verified ──
  async function redirectAfterLogin(userId) {
    const { data: u, error } = await supabase
      .from('cc_users')
      .select('role, is_verified')
      .eq('id', userId)
      .single();

    if (error || !u) {
      // cc_users row missing — shouldn't happen but fail safely
      showGlobalError('Account setup is incomplete. Please contact support.');
      setButtonLoading(btn, false);
      return;
    }

    if (!u.is_verified) {
      // NGO / professional awaiting admin approval
      window.location.href = '/careconnect/pending.html';
      return;
    }

    // Volunteers are auto-verified; orgs land here after admin approval
    const dashboards = {
      volunteer:    '/careconnect/dashboard-volunteer.html',
      ngo:          '/careconnect/dashboard-ngo.html',
      blood_bank:   '/careconnect/dashboard-blood-bank.html',
      professional: '/careconnect/dashboard-professional.html',
    };

    window.location.href = dashboards[u.role] || '/careconnect/login.html';
  }

  // ── Form submit ───────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideGlobalError();

    if (!validate()) return;

    setButtonLoading(btn, true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email:    emailEl.value.trim().toLowerCase(),
      password: passwordEl.value,
    });

    if (error) {
      setButtonLoading(btn, false);
      showGlobalError(mapSupabaseError(error.message));
      return;
    }

    // Success — redirect based on role
    await redirectAfterLogin(data.user.id);
  });

  // ── Clear field errors on input ───────────────────────────────
  emailEl.addEventListener('input', () => clearFieldError('email'));
  passwordEl.addEventListener('input', () => clearFieldError('password'));

})();
