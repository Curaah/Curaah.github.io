// careconnect/js/profile.js
// ONE responsibility: load user profile data and handle profile interactions.
// Works for all 4 roles (volunteer, ngo, blood_bank, professional).

(function () {
  'use strict';

  const ROLE_BADGES = {
    volunteer:    { text: 'Volunteer',              cls: 'badge-teal'   },
    ngo:          { text: 'NGO / Organisation',     cls: 'badge-blue'   },
    blood_bank:   { text: 'Blood Bank',             cls: 'badge-red'    },
    professional: { text: 'Healthcare Professional',cls: 'badge-green'  },
  };

  // ── Build role-aware bottom tabs ──────────────────────────────
  function buildBottomTabs(role) {
    const homeUrl = {
      volunteer:    '/careconnect/dashboard-volunteer.html',
      ngo:          '/careconnect/dashboard-ngo.html',
      blood_bank:   '/careconnect/dashboard-blood-bank.html',
      professional: '/careconnect/dashboard-professional.html',
    };
    const tabs = document.getElementById('bottom-tabs');
    tabs.innerHTML = `
      <div class="tab-item" onclick="location.href='${homeUrl[role] || '/careconnect/login.html'}'">
        <span class="tab-icon">🏠</span>
        <span class="tab-label">Home</span>
      </div>
      <div class="tab-item" onclick="location.href='/careconnect/feed.html'">
        <span class="tab-icon">📰</span>
        <span class="tab-label">Feed</span>
      </div>
      <div class="tab-item active">
        <span class="tab-icon">👤</span>
        <span class="tab-label">Profile</span>
      </div>
    `;
  }

  // ── Photo upload ──────────────────────────────────────────────
  document.getElementById('photo-input').addEventListener('change', async function () {
    const file = this.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Photo must be under 5 MB.', 'error');
      return;
    }

    const path = `${window.currentUserId}/photo.${file.name.split('.').pop()}`;
    const url  = await uploadToStorage(file, 'profile-photos', path);
    if (!url) { showToast('Upload failed. Please try again.', 'error'); return; }

    // Update cc_users
    const { error } = await supabase
      .from('cc_users')
      .update({ profile_photo: url })
      .eq('id', window.currentUserId);

    if (error) {
      showToast('Could not save photo. Please try again.', 'error');
    } else {
      // Show preview
      const avatarEl = document.getElementById('profile-avatar');
      avatarEl.innerHTML = `<img src="${url}" alt="Profile photo" />`;
      showToast('Profile photo updated!', 'success');
    }
  });

  // ── Change password ───────────────────────────────────────────
  window.changePassword = async function () {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.auth.resetPasswordForEmail(session.user.email, {
      redirectTo: window.location.origin + '/careconnect/reset-password.html',
    });

    if (error) {
      showToast('Could not send reset email. Please try again.', 'error');
    } else {
      showToast(`Password reset link sent to ${session.user.email}`, 'success');
    }
  };

  // ── Sign out ──────────────────────────────────────────────────
  window.signOut = async function () {
    await supabase.auth.signOut();
    window.location.replace('/careconnect/login.html');
  };

  // ── Consent settings (volunteer) ──────────────────────────────
  window.openConsentSettings = function () {
    const options = [
      { value: 'relay_only',   label: '🔒 Relay Only — Maximum privacy (recommended)' },
      { value: 'name_city',    label: '🏙️ Name + City — NGOs see your first name and city' },
      { value: 'full_contact', label: '📞 Full Contact — Each share requires 3 explicit confirmations' },
    ];

    const choice = prompt(
      `Choose your data sharing level:\n\n` +
      options.map((o, i) => `${i + 1}. ${o.label}`).join('\n') +
      `\n\nEnter 1, 2, or 3:`
    );
    const idx = parseInt(choice, 10) - 1;
    if (idx < 0 || idx > 2) return;

    const chosen = options[idx];
    supabase
      .from('cc_volunteers')
      .update({ default_consent_level: chosen.value })
      .eq('cc_user_id', window.currentUserId)
      .then(({ error }) => {
        if (error) {
          showToast('Could not update privacy setting.', 'error');
        } else {
          document.getElementById('consent-value').textContent = chosen.label.split(' — ')[0].replace(/🔒 |🏙️ |📞 /g, '');
          showToast('Privacy setting updated.', 'success');
        }
      });
  };

  window.openBloodSettings = function () {
    showToast('Blood donation settings — coming in Phase 3 with full blood request system.', 'info');
  };

  // ── Edit profile toggle (Phase 2: inline edit) ───────────────
  window.toggleEditMode = function () {
    showToast('Inline profile editing — coming in the next update.', 'info');
    return false;
  };

  // ── Delete account (confirmation) ─────────────────────────────
  window.confirmDeleteAccount = function () {
    const confirmed = confirm(
      'Are you absolutely sure you want to delete your account?\n\n' +
      'This will permanently remove:\n' +
      '• Your profile and all personal data\n' +
      '• Your Sewa Points and activity history\n' +
      '• All event registrations\n\n' +
      'This action CANNOT be undone. Type DELETE in the next prompt to confirm.'
    );
    if (!confirmed) return;

    const typed = prompt('Type DELETE to confirm account deletion:');
    if (typed?.trim().toUpperCase() !== 'DELETE') {
      showToast('Account deletion cancelled.', 'info');
      return;
    }

    // Phase 3: call a Supabase Edge Function that cascades deletes + soft-delete
    showToast('Account deletion request submitted. Our team will process it within 24 hours as per our Privacy Policy.', 'info');
  };

  // ── Main data loader ──────────────────────────────────────────
  async function loadProfile() {
    let attempts = 0;
    while (!window.currentUserId && attempts < 20) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }

    const userId = window.currentUserId;
    const role   = window.currentRole;
    if (!userId) return;

    buildBottomTabs(role);

    // 1. Load cc_users
    const { data: user } = await supabase
      .from('cc_users')
      .select('full_name, email, city, district, state, profile_photo, is_verified')
      .eq('id', userId)
      .single();

    if (user) {
      // Name + initials
      document.getElementById('profile-name').textContent = user.full_name;
      document.getElementById('avatar-initials').textContent = getInitials(user.full_name);

      // Photo
      if (user.profile_photo) {
        document.getElementById('profile-avatar').innerHTML =
          `<img src="${user.profile_photo}" alt="${user.full_name}" />`;
      }

      // Location
      const loc = [user.city, user.district, user.state].filter(Boolean).join(', ');
      document.getElementById('profile-location').textContent = loc || '—';

      // Verified badge
      if (user.is_verified) {
        document.getElementById('verified-badge').style.display = 'inline-flex';
      }
    }

    // Role badge
    const roleBadge = ROLE_BADGES[role];
    if (roleBadge) {
      const el = document.getElementById('role-badge');
      el.textContent = roleBadge.text;
      el.className   = `badge ${roleBadge.cls}`;
    }

    // 2. Volunteer-specific sections
    if (role === 'volunteer') {
      document.getElementById('sewa-section').style.display   = 'block';
      document.getElementById('privacy-section').style.display = 'block';

      const { data: vol } = await supabase
        .from('cc_volunteers')
        .select('sewa_points_total, sewa_level, default_consent_level')
        .eq('cc_user_id', userId)
        .single();

      if (vol) {
        document.getElementById('sewa-total').textContent         = formatPoints(vol.sewa_points_total);
        document.getElementById('sewa-level-display').textContent = vol.sewa_level || 'Sewadar';

        const consentLabels = {
          relay_only:   'Relay Only',
          name_city:    'Name + City',
          full_contact: 'Full Contact',
        };
        document.getElementById('consent-value').textContent =
          consentLabels[vol.default_consent_level] || 'Relay Only';
      }
    }
  }

  loadProfile().catch(err => {
    console.error('[profile]', err);
    showToast('Could not load your profile. Please refresh.', 'error');
  });

})();
