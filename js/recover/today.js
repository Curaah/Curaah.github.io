// ═══════════════════════════════════════════════════════════
// Curaah Recover — Today's Schedule
// Full dose schedule, pill verifier, side effect reporting
// ═══════════════════════════════════════════════════════════

import { showToast, showModal, hideModal, $, escapeHtml, todayISO,
         formatTime, periodEmoji, capitalize, skeletonLoader, severityColor } from './utils.js';

let _state, _supabase, _navigate;

export function init(state, supabase, navigate) {
  _state = state;
  _supabase = supabase;
  _navigate = navigate;
}

export async function render(state, supabase) {
  if (state) _state = state;
  if (supabase) _supabase = supabase;

  const container = $('todayContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="today-wrapper">
      <div class="today-header">
        <h1 class="section-title">💊 Today's Schedule</h1>
        <p class="text-muted">${new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p>
      </div>

      <!-- Adherence Summary Bar -->
      <div class="today-adherence" id="todayAdherence">
        ${skeletonLoader(1)}
      </div>

      <!-- Dose Periods -->
      <div class="today-doses" id="todayDoseList">
        ${skeletonLoader(4)}
      </div>

      <!-- Side Effects Section -->
      <div class="today-section">
        <div class="section-header">
          <h2 class="section-title">⚠️ Report Side Effect</h2>
        </div>
        <div class="card" style="cursor:pointer" onclick="window._reportSideEffect()">
          <div class="flex-row" style="gap:12px;align-items:center;">
            <span style="font-size:24px">🩺</span>
            <div>
              <div style="font-weight:600;">Experiencing a side effect?</div>
              <div class="text-muted" style="font-size:13px;">Report it and our AI will assess severity and provide guidance.</div>
            </div>
            <span style="color:var(--muted);margin-left:auto;">→</span>
          </div>
        </div>
      </div>

      <!-- Recent Side Effects -->
      <div class="today-section" id="todaySideEffects" style="display:none">
        <h2 class="section-title">📋 Recent Side Effects</h2>
        <div id="sideEffectsList"></div>
      </div>

      <!-- Medicine Awareness -->
      <div class="today-section">
        <div class="section-header">
          <h2 class="section-title">📖 Medicine Awareness</h2>
        </div>
        <div id="medicineAwareness">
          <div class="card card-dashed">
            <div class="empty-state-sm">
              <p class="text-muted">Tap any medicine above to learn more about it — what it does, interactions, and what to watch for.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  await loadTodayData();
}

async function loadTodayData() {
  const patientId = _state.patient?.patient_id;
  if (!patientId) return;

  const [medsRes, adhRes, seRes] = await Promise.all([
    _supabase.query('recover_medicines', {
      filter: `patient_id=eq.${patientId}&is_active=eq.true`,
      select: '*',
    }),
    _supabase.query('recover_adherence', {
      filter: `patient_id=eq.${patientId}&scheduled_date=eq.${todayISO()}`,
      select: '*',
    }),
    _supabase.query('recover_side_effects', {
      filter: `patient_id=eq.${patientId}`,
      order: 'reported_at.desc',
      limit: 5,
    }),
  ]);

  const medicines = medsRes.data || [];
  const logs = adhRes.data || [];
  const sideEffects = seRes.data || [];

  _state.medicines = medicines;
  _state.todayLogs = logs;

  renderAdherenceSummary(logs);
  renderDoseList(medicines, logs);
  renderSideEffects(sideEffects, medicines);
}

function renderAdherenceSummary(logs) {
  const container = $('todayAdherence');
  if (!container) return;

  const total = logs.length;
  const taken = logs.filter(l => l.status === 'taken').length;
  const missed = logs.filter(l => l.status === 'missed').length;
  const pending = logs.filter(l => l.status === 'pending').length;
  const skipped = logs.filter(l => l.status === 'skipped').length;
  const pct = total > 0 ? Math.round((taken / total) * 100) : 0;

  container.innerHTML = `
    <div class="adherence-bar-card">
      <div class="adherence-row">
        <div class="adherence-pct" style="color:${pct > 80 ? 'var(--green)' : pct > 50 ? 'var(--amber)' : 'var(--red)'}">${pct}%</div>
        <div class="adherence-details">
          <div class="progress" style="height:8px;">
            <div class="progress-fill progress-green" style="width:${total ? (taken/total*100) : 0}%"></div>
          </div>
          <div class="adherence-counts">
            <span class="count-taken">✓ ${taken} taken</span>
            <span class="count-missed">✗ ${missed} missed</span>
            <span class="count-pending">○ ${pending + skipped} remaining</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderDoseList(medicines, logs) {
  const container = $('todayDoseList');
  if (!container) return;

  if (medicines.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span style="font-size:48px;">💊</span>
        <h3>No Medicines Yet</h3>
        <p class="text-muted">Upload your prescription from the Home screen to see your daily schedule here.</p>
        <button class="btn btn-primary" onclick="window._navigate && window._navigate('home')">Go to Home</button>
      </div>
    `;
    return;
  }

  const periods = ['morning', 'afternoon', 'night'];
  let html = '';

  for (const period of periods) {
    const periodMeds = medicines.filter(m => (m.timing || []).includes(period));
    if (periodMeds.length === 0) continue;

    const emoji = periodEmoji(period);
    const allDone = periodMeds.every(m => {
      const log = logs.find(l => l.medicine_id === m.id && l.scheduled_time === period);
      return log && log.status !== 'pending';
    });

    html += `
      <div class="dose-period ${allDone ? 'dose-period-done' : ''}">
        <div class="dose-period-header">
          <span>${emoji} ${capitalize(period)}</span>
          ${allDone ? '<span class="badge badge-green">✓ Done</span>' : ''}
        </div>
        <div class="dose-period-list">
          ${periodMeds.map(med => renderDoseCard(med, period, logs)).join('')}
        </div>
      </div>
    `;
  }

  // Medicines without specific timing
  const untimedMeds = medicines.filter(m => !m.timing || m.timing.length === 0);
  if (untimedMeds.length > 0) {
    html += `
      <div class="dose-period">
        <div class="dose-period-header"><span>📋 As Directed</span></div>
        <div class="dose-period-list">
          ${untimedMeds.map(med => `
            <div class="dose-card dose-info-only">
              <div class="dose-info">
                <div class="dose-name">${escapeHtml(med.medicine_name)}</div>
                <div class="dose-detail">${escapeHtml(med.dosage || '')} · ${escapeHtml(med.frequency || '')}</div>
              </div>
              <button class="btn btn-ghost btn-sm" onclick="window._showMedInfo('${med.id}')">ℹ️</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

function renderDoseCard(med, period, logs) {
  const log = logs.find(l => l.medicine_id === med.id && l.scheduled_time === period);
  const status = log?.status || 'pending';
  const statusClass = `dose-${status}`;
  
  return `
    <div class="dose-card ${statusClass}" id="dose-${med.id}-${period}">
      <div class="dose-main" onclick="window._showMedInfo('${med.id}')">
        <div class="dose-icon-wrap">
          <span class="dose-icon">${status === 'taken' ? '✅' : status === 'missed' ? '❌' : status === 'skipped' ? '⏭️' : '💊'}</span>
        </div>
        <div class="dose-info">
          <div class="dose-name">${escapeHtml(med.medicine_name)}</div>
          <div class="dose-detail">
            ${escapeHtml(med.dosage || '')}${med.instruction ? ' · ' + escapeHtml(med.instruction) : ''}
            ${med.purpose ? `<br><span class="dose-purpose">${escapeHtml(med.purpose)}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="dose-actions">
        ${status === 'pending' ? `
          <button class="btn btn-success btn-sm" onclick="event.stopPropagation(); window._markDoseToday('${med.id}','${period}','taken')">
            ✓ Taken
          </button>
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); window._skipDose('${med.id}','${period}')">
            Skip
          </button>
        ` : `
          <div class="dose-status-badge ${statusClass}">
            ${status === 'taken' ? '✓ Taken' : status === 'skipped' ? '⏭ Skipped' : '✗ Missed'}
            ${log?.taken_at ? `<br><span class="dose-time">${new Date(log.taken_at).toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'})}</span>` : ''}
          </div>
        `}
      </div>
    </div>
  `;
}

// ── Mark Dose ──
window._markDoseToday = async function(medId, time, status) {
  const patientId = _state.patient?.patient_id;

  const { error } = await _supabase.query('recover_adherence', {
    method: 'POST',
    body: {
      medicine_id: medId,
      patient_id: patientId,
      scheduled_date: todayISO(),
      scheduled_time: time,
      status,
      taken_at: status === 'taken' ? new Date().toISOString() : null,
    },
  });

  if (error) {
    await _supabase.query('recover_adherence', {
      method: 'PATCH',
      body: { status, taken_at: status === 'taken' ? new Date().toISOString() : null },
      filter: `medicine_id=eq.${medId}&scheduled_date=eq.${todayISO()}&scheduled_time=eq.${time}`,
    });
  }

  showToast(status === 'taken' ? '✓ Medicine taken!' : 'Skipped', status === 'taken' ? 'success' : 'warning');
  await loadTodayData();
};

// ── Skip with Reason ──
window._skipDose = function(medId, time) {
  showModal(`
    <div class="modal-header">
      <h2>Why are you skipping?</h2>
      <button class="modal-close" onclick="window._hideModalToday()">×</button>
    </div>
    <div class="modal-body">
      <p class="text-muted" style="margin-bottom:16px;">Understanding why helps us improve your recovery plan.</p>
      <div class="skip-reasons">
        ${['forgot', 'side_effect', 'ran_out', 'cost', 'felt_better', 'doctor_said'].map(r => `
          <button class="chip chip-full" onclick="window._confirmSkip('${medId}','${time}','${r}')">
            ${{forgot:'😅 I forgot', side_effect:'🤢 Side effects', ran_out:'📦 Ran out of medicine',
               cost:'💰 Can\'t afford', felt_better:'😊 Feeling better', doctor_said:'👨‍⚕️ Doctor advised'}[r]}
          </button>
        `).join('')}
      </div>
    </div>
  `);
};

window._confirmSkip = async function(medId, time, reason) {
  hideModal();

  const patientId = _state.patient?.patient_id;
  const { error } = await _supabase.query('recover_adherence', {
    method: 'POST',
    body: {
      medicine_id: medId,
      patient_id: patientId,
      scheduled_date: todayISO(),
      scheduled_time: time,
      status: 'skipped',
      skip_reason: reason,
    },
  });

  if (error) {
    await _supabase.query('recover_adherence', {
      method: 'PATCH',
      body: { status: 'skipped', skip_reason: reason },
      filter: `medicine_id=eq.${medId}&scheduled_date=eq.${todayISO()}&scheduled_time=eq.${time}`,
    });
  }

  // If skipped due to side effects, prompt to report
  if (reason === 'side_effect') {
    showToast('Medicine skipped. Please report the side effect below.', 'warning');
  } else if (reason === 'ran_out' || reason === 'cost') {
    showToast('Noted. Check generic alternatives — they can be 50-80% cheaper at Jan Aushadhi stores.', 'info', 5000);
  } else {
    showToast('Medicine skipped.', 'warning');
  }

  await loadTodayData();
};

window._hideModalToday = hideModal;

// ── Medicine Info ──
window._showMedInfo = async function(medId) {
  const med = (_state.medicines || []).find(m => m.id === medId);
  if (!med) return;

  showModal(`
    <div class="modal-header">
      <h2>💊 ${escapeHtml(med.medicine_name)}</h2>
      <button class="modal-close" onclick="window._hideModalToday()">×</button>
    </div>
    <div class="modal-body">
      <div class="med-info-grid">
        ${med.generic_name ? `<div class="med-info-row"><span class="med-info-label">Generic Name</span><span>${escapeHtml(med.generic_name)}</span></div>` : ''}
        ${med.drug_class ? `<div class="med-info-row"><span class="med-info-label">Drug Class</span><span>${escapeHtml(med.drug_class)}</span></div>` : ''}
        <div class="med-info-row"><span class="med-info-label">Dosage</span><span>${escapeHtml(med.dosage || 'As directed')}</span></div>
        <div class="med-info-row"><span class="med-info-label">Frequency</span><span>${escapeHtml(med.frequency || '—')}</span></div>
        <div class="med-info-row"><span class="med-info-label">Timing</span><span>${(med.timing || []).map(t => capitalize(t)).join(', ') || '—'}</span></div>
        ${med.instruction ? `<div class="med-info-row"><span class="med-info-label">Instruction</span><span>${escapeHtml(med.instruction)}</span></div>` : ''}
        ${med.purpose ? `<div class="med-info-row"><span class="med-info-label">Purpose</span><span>${escapeHtml(med.purpose)}</span></div>` : ''}
        ${med.duration_days ? `<div class="med-info-row"><span class="med-info-label">Duration</span><span>${med.duration_days} days</span></div>` : ''}
      </div>
      <div style="margin-top:16px;display:flex;gap:8px;">
        <button class="btn btn-ghost btn-sm" onclick="window.open('/medicine-info.html?q=${encodeURIComponent(med.medicine_name)}','_blank')">
          📖 Full Info
        </button>
        <button class="btn btn-ghost btn-sm" onclick="window._hideModalToday(); window._reportSideEffectFor('${medId}')">
          ⚠️ Report Side Effect
        </button>
      </div>
    </div>
  `, { width: '440px' });
};

// ── Side Effect Reporting ──
window._reportSideEffect = function() {
  const medicines = _state.medicines || [];
  showModal(`
    <div class="modal-header">
      <h2>⚠️ Report Side Effect</h2>
      <button class="modal-close" onclick="window._hideModalToday()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Which medicine?</label>
        <select class="select" id="seMedicine">
          <option value="">Select medicine</option>
          ${medicines.map(m => `<option value="${m.id}">${escapeHtml(m.medicine_name)} (${escapeHtml(m.dosage || '')})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Describe the side effect</label>
        <textarea class="textarea" id="seDescription" rows="3" placeholder="e.g., Feeling dizzy after taking medicine, nausea, stomach pain..."></textarea>
      </div>
      <button class="btn btn-primary btn-full" id="btnReportSE" onclick="window._submitSideEffect()">
        <span class="btn-text">Analyze & Report</span>
        <span class="btn-spinner" style="display:none"></span>
      </button>
    </div>
  `);
};

window._reportSideEffectFor = function(medId) {
  window._reportSideEffect();
  setTimeout(() => {
    const sel = $('seMedicine');
    if (sel) sel.value = medId;
  }, 100);
};

window._submitSideEffect = async function() {
  const medId = $('seMedicine')?.value;
  const desc = $('seDescription')?.value?.trim();
  const btn = $('btnReportSE');

  if (!desc) {
    showToast('Please describe the side effect', 'error');
    return;
  }

  const text = btn?.querySelector('.btn-text');
  const spinner = btn?.querySelector('.btn-spinner');
  if (text) text.style.display = 'none';
  if (spinner) spinner.style.display = '';
  if (btn) btn.disabled = true;

  // Get medicine name for context
  const med = (_state.medicines || []).find(m => m.id === medId);

  // Call side-effect-analyze edge function
  const { data, error } = await _supabase.edgeFn('side-effect-analyze', {
    medicine_name: med?.medicine_name || 'Unknown',
    side_effect: desc,
    patient_context: {
      conditions: _state.patient?.primary_conditions || [],
      age: _state.patient?.age,
      gender: _state.patient?.gender,
      other_medicines: (_state.medicines || []).map(m => m.medicine_name),
    },
  });

  // Save to DB regardless of AI result
  await _supabase.query('recover_side_effects', {
    method: 'POST',
    body: {
      patient_id: _state.patient?.patient_id,
      medicine_id: medId || null,
      description: desc,
      severity: data?.severity || 'yellow',
      ai_assessment: data ? JSON.stringify(data) : null,
    },
  });

  hideModal();

  // Show AI assessment
  if (data) {
    const sevColor = severityColor(data.severity);
    const sevLabel = { green: '🟢 Mild', yellow: '🟡 Moderate', red: '🔴 Severe' }[data.severity] || '🟡 Unknown';

    showModal(`
      <div class="modal-header">
        <h2>Side Effect Assessment</h2>
        <button class="modal-close" onclick="window._hideModalToday()">×</button>
      </div>
      <div class="modal-body">
        <div class="se-severity" style="border-color:${sevColor};background:${sevColor}15;padding:16px;border-radius:12px;border:1px solid;margin-bottom:16px;">
          <div style="font-size:18px;font-weight:700;color:${sevColor};">${sevLabel}</div>
        </div>
        ${data.assessment ? `<div class="card" style="margin-bottom:12px;"><p>${escapeHtml(data.assessment)}</p></div>` : ''}
        ${data.recommendation ? `<div class="card card-blue" style="margin-bottom:12px;"><h4>💡 Recommendation</h4><p>${escapeHtml(data.recommendation)}</p></div>` : ''}
        ${data.home_remedies ? `<div class="card card-green" style="margin-bottom:12px;"><h4>🏠 Home Remedies</h4><p>${escapeHtml(data.home_remedies)}</p></div>` : ''}
        <p class="text-muted" style="font-size:12px;margin-top:12px;">⚕️ This is AI-generated guidance. If symptoms persist or worsen, please consult your doctor immediately.</p>
        ${data.severity === 'red' ? '<div class="card card-red" style="margin-top:12px;"><strong>🚨 This appears serious. Please contact your doctor or call 108 immediately.</strong></div>' : ''}
      </div>
    `, { width: '480px' });
  } else {
    showToast('Side effect reported. Please consult your doctor if it persists.', 'warning');
  }
};

function renderSideEffects(sideEffects, medicines) {
  if (!sideEffects || sideEffects.length === 0) return;

  const container = $('todaySideEffects');
  const list = $('sideEffectsList');
  if (!container || !list) return;

  container.style.display = '';
  list.innerHTML = sideEffects.map(se => {
    const med = medicines.find(m => m.id === se.medicine_id);
    const sevColor = severityColor(se.severity);
    return `
      <div class="card" style="margin-bottom:8px;border-left:3px solid ${sevColor};">
        <div class="flex-row" style="justify-content:space-between;">
          <div>
            <div style="font-weight:600;">${med ? escapeHtml(med.medicine_name) : 'General'}</div>
            <div class="text-muted" style="font-size:13px;">${escapeHtml(se.description)}</div>
          </div>
          <span class="badge" style="background:${sevColor}20;color:${sevColor};">${se.severity?.toUpperCase() || '?'}</span>
        </div>
      </div>
    `;
  }).join('');
}
