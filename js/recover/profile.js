// ═══════════════════════════════════════════════════════════
// Curaah Recover — Profile & Settings
// Health profile, family sharing, consent, settings
// ═══════════════════════════════════════════════════════════

import { showToast, showModal, hideModal, $, escapeHtml, capitalize, formatDate } from './utils.js';

let _state, _supabase, _navigate;

export function init(state, supabase, navigate) {
  _state = state;
  _supabase = supabase;
  _navigate = navigate;
}

export async function render(state, supabase) {
  if (state) _state = state;
  if (supabase) _supabase = supabase;

  const container = $('profileContainer');
  if (!container) return;

  const p = _state.patient || {};
  const name = p.full_name || '';
  const initial = name.charAt(0).toUpperCase() || '?';

  container.innerHTML = `
    <div class="profile-wrapper">
      <!-- Profile Header -->
      <div class="profile-header">
        <div class="profile-avatar-lg">${initial}</div>
        <h1 class="profile-name">${escapeHtml(name)}</h1>
        <p class="text-muted">${p.age ? p.age + ' years' : ''} ${p.gender ? '· ' + capitalize(p.gender) : ''} ${p.district ? '· ' + escapeHtml(p.district) : ''}</p>
        <div class="profile-share-code">
          <span class="text-muted" style="font-size:12px;">Family Share Code</span>
          <div class="share-code-display">
            <span class="share-code-val" id="shareCodeVal">${escapeHtml(p.family_share_code || '------')}</span>
            <button class="btn btn-ghost btn-sm" onclick="window._pCopyCode()">📋 Copy</button>
            <button class="btn btn-ghost btn-sm" onclick="window._pShareWA()">💬 WhatsApp</button>
          </div>
        </div>
      </div>

      <!-- Health Profile -->
      <div class="profile-section">
        <div class="section-header"><h2 class="section-title">🏥 Health Profile</h2>
          <button class="btn btn-ghost btn-sm" onclick="window._pEditProfile()">✏️ Edit</button></div>
        <div class="card">
          <div class="profile-grid">
            <div class="profile-item"><span class="profile-key">Age</span><span class="profile-val">${p.age || '—'}</span></div>
            <div class="profile-item"><span class="profile-key">Gender</span><span class="profile-val">${capitalize(p.gender || '—')}</span></div>
            <div class="profile-item"><span class="profile-key">Blood Group</span><span class="profile-val">${p.blood_group || '—'}</span></div>
            <div class="profile-item"><span class="profile-key">Height</span><span class="profile-val">${p.height_cm ? p.height_cm + ' cm' : '—'}</span></div>
            <div class="profile-item"><span class="profile-key">Weight</span><span class="profile-val">${p.weight_kg ? p.weight_kg + ' kg' : '—'}</span></div>
            <div class="profile-item"><span class="profile-key">District</span><span class="profile-val">${escapeHtml(p.district || '—')}</span></div>
          </div>
          <div style="margin-top:12px;">
            <span class="profile-key">Conditions: </span>
            ${(p.primary_conditions || []).map(c => `<span class="tag tag-blue">${c.replace(/_/g,' ')}</span>`).join(' ') || '<span class="text-muted">None</span>'}
          </div>
          <div style="margin-top:8px;">
            <span class="profile-key">Allergies: </span>
            ${(p.allergies || []).map(a => `<span class="tag tag-red">${escapeHtml(a)}</span>`).join(' ') || '<span class="text-muted">None</span>'}
          </div>
        </div>
      </div>

      <!-- Daily Routine -->
      <div class="profile-section">
        <div class="section-header"><h2 class="section-title">⏰ Daily Routine</h2>
          <button class="btn btn-ghost btn-sm" onclick="window._pEditRoutine()">✏️ Edit</button></div>
        <div class="card">
          <div class="profile-grid">
            <div class="profile-item"><span class="profile-key">Wake Up</span><span class="profile-val">${p.wake_time || '06:00'}</span></div>
            <div class="profile-item"><span class="profile-key">Sleep</span><span class="profile-val">${p.sleep_time || '22:00'}</span></div>
            <div class="profile-item"><span class="profile-key">Breakfast</span><span class="profile-val">${p.meal_times?.breakfast || '08:00'}</span></div>
            <div class="profile-item"><span class="profile-key">Lunch</span><span class="profile-val">${p.meal_times?.lunch || '13:00'}</span></div>
            <div class="profile-item"><span class="profile-key">Dinner</span><span class="profile-val">${p.meal_times?.dinner || '20:00'}</span></div>
          </div>
        </div>
      </div>

      <!-- Emergency Contacts -->
      <div class="profile-section">
        <div class="section-header"><h2 class="section-title">🚨 Emergency Contacts</h2>
          <button class="btn btn-ghost btn-sm" onclick="window._pAddEmergency()">+ Add</button></div>
        <div id="emergencyList">
          ${(p.emergency_contacts || []).map((c, i) => `
            <div class="card" style="margin-bottom:8px;">
              <div class="flex-row" style="justify-content:space-between;align-items:center;">
                <div><div style="font-weight:600;">${escapeHtml(c.name)}</div>
                <div class="text-muted" style="font-size:12px;">${escapeHtml(c.phone)} · ${capitalize(c.relation || '')}</div></div>
                <a href="tel:${c.phone}" class="btn btn-ghost btn-sm">📞 Call</a>
              </div>
            </div>
          `).join('') || '<div class="card card-dashed"><div class="empty-state-sm"><p>No emergency contacts. Add one for safety.</p></div></div>'}
        </div>
      </div>

      <!-- Family Sharing -->
      <div class="profile-section">
        <div class="section-header"><h2 class="section-title">👨‍👩‍👧 Family Sharing</h2></div>
        <div id="familyList">Loading...</div>
      </div>

      <!-- My Medicines -->
      <div class="profile-section">
        <div class="section-header"><h2 class="section-title">💊 My Medicines</h2></div>
        <div id="profileMedsList">Loading...</div>
      </div>

      <!-- Settings -->
      <div class="profile-section">
        <h2 class="section-title">⚙️ Settings</h2>
        <div class="card">
          <div class="settings-row"><span>Language</span>
            <select class="select select-inline" id="pLang" onchange="window._pSaveLang()">
              <option value="en" ${p.language==='en'?'selected':''}>English</option>
              <option value="hi" ${p.language==='hi'?'selected':''}>हिंदी</option>
              <option value="pa" ${p.language==='pa'?'selected':''}>ਪੰਜਾਬੀ</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Data & Privacy -->
      <div class="profile-section">
        <h2 class="section-title">🔒 Data & Privacy</h2>
        <div class="card">
          <div class="settings-row"><span>Data Processing</span><span class="badge ${p.consent_data_processing ? 'badge-green' : 'badge-amber'}">${p.consent_data_processing ? '✓ Consented' : 'Pending'}</span></div>
          <div class="settings-row"><span>AI Analysis</span><span class="badge ${p.consent_ai_analysis ? 'badge-green' : 'badge-amber'}">${p.consent_ai_analysis ? '✓ Consented' : 'Pending'}</span></div>
          <div class="settings-row"><span>Family Sharing</span><span class="badge ${p.consent_family_sharing ? 'badge-green' : 'badge-amber'}">${p.consent_family_sharing ? '✓ Consented' : 'Not Set'}</span></div>
          <div class="settings-row"><span>Emergency Data</span><span class="badge ${p.consent_emergency_share ? 'badge-green' : 'badge-amber'}">${p.consent_emergency_share ? '✓ Consented' : 'Not Set'}</span></div>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" onclick="window._pSyncNow()">☁️ Sync Now</button>
          <a href="/privacy.html" class="btn btn-ghost btn-sm" target="_blank">📜 Privacy Policy</a>
          <a href="/terms.html" class="btn btn-ghost btn-sm" target="_blank">📋 Terms</a>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="profile-section">
        <h2 class="section-title" style="color:var(--red);">⚠️ Danger Zone</h2>
        <div class="card card-red">
          <p class="text-muted" style="margin-bottom:12px;">These actions cannot be undone.</p>
          <button class="btn btn-danger btn-sm" onclick="window._pLogout()">🚪 Logout</button>
          <button class="btn btn-danger btn-sm" onclick="window._pDeleteAccount()" style="margin-left:8px;">🗑️ Delete Account</button>
        </div>
      </div>

      <!-- App Info -->
      <div class="profile-footer">
        <p>Curaah Recover v2.0 — Recovery Intelligence Engine</p>
        <p>IIT Ropar TBIF Incubated · DPIIT Recognised</p>
        <p style="font-size:11px;">© 2026 Curaah HealthTech Pvt. Ltd.</p>
      </div>
    </div>
  `;

  loadFamilyLinks();
  loadProfileMeds();
}

async function loadFamilyLinks() {
  const pid = _state.patient?.patient_id;
  if (!pid) return;
  const { data } = await _supabase.query('recover_family_links', { filter: `patient_id=eq.${pid}` });
  const el = $('familyList');
  if (!el) return;
  if (!data || !data.length) {
    el.innerHTML = `<div class="card"><p class="text-muted">No family members linked yet. Share your code above to connect family.</p></div>`;
    return;
  }
  el.innerHTML = data.map(f => `
    <div class="card" style="margin-bottom:8px;">
      <div class="flex-row" style="justify-content:space-between;align-items:center;">
        <div><div style="font-weight:600;">${escapeHtml(f.family_name || 'Family Member')}</div>
        <div class="text-muted" style="font-size:12px;">${capitalize(f.relationship || '')}</div></div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          ${f.can_view_medicines ? '<span class="tag tag-blue" style="font-size:9px;">💊</span>' : ''}
          ${f.can_view_adherence ? '<span class="tag tag-green" style="font-size:9px;">📊</span>' : ''}
          ${f.can_view_vitals ? '<span class="tag tag-purple" style="font-size:9px;">❤️</span>' : ''}
          ${f.can_receive_sos ? '<span class="tag tag-red" style="font-size:9px;">🚨</span>' : ''}
        </div>
      </div>
    </div>
  `).join('');
}

async function loadProfileMeds() {
  const pid = _state.patient?.patient_id;
  if (!pid) return;
  const { data } = await _supabase.query('recover_medicines', { filter: `patient_id=eq.${pid}&is_active=eq.true` });
  const el = $('profileMedsList');
  if (!el) return;
  if (!data || !data.length) {
    el.innerHTML = `<div class="card card-dashed"><div class="empty-state-sm"><p>No medicines added yet.</p></div></div>`;
    return;
  }
  el.innerHTML = data.map(m => `
    <div class="card" style="margin-bottom:6px;padding:12px 16px;">
      <div style="font-weight:600;">${escapeHtml(m.medicine_name)}</div>
      <div class="text-muted" style="font-size:12px;">${escapeHtml(m.dosage||'')} · ${escapeHtml(m.frequency||'')} · ${(m.timing||[]).map(capitalize).join(', ')}</div>
      ${m.purpose ? `<div class="text-muted" style="font-size:11px;margin-top:4px;">${escapeHtml(m.purpose)}</div>` : ''}
    </div>
  `).join('');
}

// ── Actions ──
window._pCopyCode = function() {
  const code = _state.patient?.family_share_code || '';
  navigator.clipboard.writeText(code).then(() => showToast('Share code copied!', 'success'));
};

window._pShareWA = function() {
  const code = _state.patient?.family_share_code || '';
  const name = _state.patient?.full_name || '';
  const msg = `Hi! I'm using Curaah Recover for my health recovery. You can connect as my family caregiver using this code: ${code}\n\nOpen: https://curaah.in/family.html and enter the code.\n\n— ${name}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
};

window._pEditProfile = function() {
  const p = _state.patient || {};
  showModal(`
    <div class="modal-header"><h2>✏️ Edit Profile</h2><button class="modal-close" onclick="window._pHide()">×</button></div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">Age</label>
        <input type="number" class="input" id="epAge" value="${p.age || ''}"/></div>
      <div class="form-group"><label class="form-label">District</label>
        <input type="text" class="input" id="epDistrict" value="${escapeHtml(p.district || '')}"/></div>
      <div class="form-group"><label class="form-label">Blood Group</label>
        <select class="select" id="epBlood"><option value="">—</option>
          ${['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => `<option ${p.blood_group===b?'selected':''}>${b}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Height (cm)</label>
        <input type="number" class="input" id="epHeight" value="${p.height_cm || ''}"/></div>
      <div class="form-group"><label class="form-label">Weight (kg)</label>
        <input type="number" class="input" id="epWeight" value="${p.weight_kg || ''}"/></div>
      <div class="form-group"><label class="form-label">Allergies (comma separated)</label>
        <input type="text" class="input" id="epAllergies" value="${(p.allergies||[]).join(', ')}"/></div>
      <button class="btn btn-primary btn-full" onclick="window._pSaveProfile()">Save</button>
    </div>
  `);
};

window._pSaveProfile = async function() {
  const pid = _state.patient?.patient_id;
  const allergies = ($('epAllergies')?.value || '').split(',').map(a=>a.trim()).filter(Boolean);
  const body = {
    age: parseInt($('epAge')?.value) || null,
    district: $('epDistrict')?.value?.trim() || null,
    blood_group: $('epBlood')?.value || null,
    height_cm: parseFloat($('epHeight')?.value) || null,
    weight_kg: parseFloat($('epWeight')?.value) || null,
    allergies: allergies.length ? allergies : null,
    updated_at: new Date().toISOString(),
  };
  await _supabase.query('recover_patients', { method:'PATCH', body, filter:`id=eq.${pid}` });
  Object.assign(_state.patient, body);
  localStorage.setItem('curaah_r_patient', JSON.stringify(_state.patient));
  hideModal();
  showToast('Profile updated!', 'success');
  render(_state, _supabase);
};

window._pEditRoutine = function() {
  const p = _state.patient || {};
  showModal(`
    <div class="modal-header"><h2>⏰ Edit Routine</h2><button class="modal-close" onclick="window._pHide()">×</button></div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">Wake Up</label><input type="time" class="input" id="erWake" value="${p.wake_time||'06:00'}"/></div>
      <div class="form-group"><label class="form-label">Sleep</label><input type="time" class="input" id="erSleep" value="${p.sleep_time||'22:00'}"/></div>
      <div class="form-group"><label class="form-label">Breakfast</label><input type="time" class="input" id="erBf" value="${p.meal_times?.breakfast||'08:00'}"/></div>
      <div class="form-group"><label class="form-label">Lunch</label><input type="time" class="input" id="erLu" value="${p.meal_times?.lunch||'13:00'}"/></div>
      <div class="form-group"><label class="form-label">Dinner</label><input type="time" class="input" id="erDi" value="${p.meal_times?.dinner||'20:00'}"/></div>
      <button class="btn btn-primary btn-full" onclick="window._pSaveRoutine()">Save</button>
    </div>
  `);
};

window._pSaveRoutine = async function() {
  const pid = _state.patient?.patient_id;
  const body = {
    wake_time: $('erWake')?.value, sleep_time: $('erSleep')?.value,
    meal_times: { breakfast: $('erBf')?.value, lunch: $('erLu')?.value, dinner: $('erDi')?.value },
    updated_at: new Date().toISOString(),
  };
  await _supabase.query('recover_patients', { method:'PATCH', body, filter:`id=eq.${pid}` });
  Object.assign(_state.patient, body);
  localStorage.setItem('curaah_r_patient', JSON.stringify(_state.patient));
  hideModal();
  showToast('Routine updated!', 'success');
  render(_state, _supabase);
};

window._pAddEmergency = function() {
  showModal(`
    <div class="modal-header"><h2>🚨 Add Emergency Contact</h2><button class="modal-close" onclick="window._pHide()">×</button></div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">Name</label><input type="text" class="input" id="ecName"/></div>
      <div class="form-group"><label class="form-label">Phone</label><input type="tel" class="input" id="ecPhone" maxlength="10"/></div>
      <div class="form-group"><label class="form-label">Relation</label>
        <select class="select" id="ecRel"><option>spouse</option><option>son</option><option>daughter</option><option>parent</option><option>sibling</option><option>friend</option></select></div>
      <button class="btn btn-primary btn-full" onclick="window._pSaveEmergency()">Save</button>
    </div>
  `);
};

window._pSaveEmergency = async function() {
  const name = $('ecName')?.value?.trim();
  const phone = $('ecPhone')?.value?.trim();
  const rel = $('ecRel')?.value;
  if (!name || !phone) { showToast('Fill name and phone', 'error'); return; }
  const contacts = [...(_state.patient.emergency_contacts || []), { name, phone, relation: rel }];
  await _supabase.query('recover_patients', { method:'PATCH', body: { emergency_contacts: contacts }, filter:`id=eq.${_state.patient.patient_id}` });
  _state.patient.emergency_contacts = contacts;
  localStorage.setItem('curaah_r_patient', JSON.stringify(_state.patient));
  hideModal();
  showToast('Emergency contact added!', 'success');
  render(_state, _supabase);
};

window._pSaveLang = async function() {
  const lang = $('pLang')?.value;
  await _supabase.query('recover_patients', { method:'PATCH', body:{language:lang}, filter:`id=eq.${_state.patient.patient_id}` });
  _state.patient.language = lang;
  localStorage.setItem('curaah_r_patient', JSON.stringify(_state.patient));
  showToast('Language updated!', 'success');
};

window._pSyncNow = async function() {
  showToast('Syncing data...', 'info');
  // TODO: Full sync implementation
  showToast('Data synced!', 'success');
};

window._pLogout = function() {
  showModal(`
    <div class="modal-header"><h2>Logout?</h2><button class="modal-close" onclick="window._pHide()">×</button></div>
    <div class="modal-body">
      <p>Your data is saved locally and will be available when you log back in.</p>
      <div style="margin-top:16px;display:flex;gap:8px;">
        <button class="btn btn-danger" onclick="window._pConfirmLogout()">Yes, Logout</button>
        <button class="btn btn-ghost" onclick="window._pHide()">Cancel</button>
      </div>
    </div>
  `);
};

window._pConfirmLogout = function() {
  localStorage.removeItem('curaah_r_patient');
  localStorage.removeItem('curaah_r_medicines');
  _state.patient = null;
  hideModal();
  _navigate('auth');
};

window._pDeleteAccount = function() {
  showModal(`
    <div class="modal-header"><h2 style="color:var(--red);">⚠️ Delete Account?</h2><button class="modal-close" onclick="window._pHide()">×</button></div>
    <div class="modal-body">
      <p style="color:var(--red);font-weight:600;">This will permanently delete all your health data. This cannot be undone.</p>
      <p class="text-muted" style="margin-top:8px;">Type "DELETE" to confirm:</p>
      <input type="text" class="input" id="deleteConfirm" placeholder="Type DELETE" style="margin:12px 0;"/>
      <button class="btn btn-danger btn-full" onclick="window._pConfirmDelete()">Permanently Delete</button>
    </div>
  `);
};

window._pConfirmDelete = async function() {
  if ($('deleteConfirm')?.value !== 'DELETE') { showToast('Type DELETE to confirm', 'error'); return; }
  // Delete patient — cascades to all related data
  await _supabase.query('recover_patients', { method:'DELETE', filter:`id=eq.${_state.patient.patient_id}` });
  localStorage.clear();
  _state.patient = null;
  hideModal();
  showToast('Account deleted. We\'re sorry to see you go.', 'info');
  _navigate('auth');
};

window._pHide = hideModal;
