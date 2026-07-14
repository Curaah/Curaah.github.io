// ═══════════════════════════════════════════════════════════
// Curaah Recover — Home Dashboard
// Recovery plan overview, today's doses, quick actions
// ═══════════════════════════════════════════════════════════

import { showToast, showModal, hideModal, $, escapeHtml, getGreeting, todayISO, 
         currentTimePeriod, periodEmoji, calcAdherence, calcHealthScore, skeletonLoader } from './utils.js';

let _state, _supabase, _navigate;

export function init(state, supabase, navigate) {
  _state = state;
  _supabase = supabase;
  _navigate = navigate;
}

export async function render(state, supabase) {
  if (state) _state = state;
  if (supabase) _supabase = supabase;

  const container = $('homeContainer');
  if (!container) return;

  const name = _state.patient?.full_name || _state.patient?.settings?.name || 'there';
  const greeting = getGreeting();

  // Show skeleton while loading
  container.innerHTML = `
    <div class="home-wrapper">
      <!-- Greeting -->
      <div class="home-greeting">
        <h1 class="home-hello">${greeting}, <span class="gradient-text">${escapeHtml(name.split(' ')[0])}</span>!</h1>
        <p class="home-subtitle">Here's your recovery overview for today</p>
      </div>

      <!-- Health Score + Adherence -->
      <div class="home-stats-row" id="homeStatsRow">
        ${skeletonLoader(2)}
      </div>

      <!-- Daily Check-in Card -->
      <div class="home-checkin" id="homeCheckin">
        ${renderCheckinCard()}
      </div>

      <!-- Today's Doses (Quick View) -->
      <div class="home-section">
        <div class="section-header">
          <h2 class="section-title">💊 Today's Medicines</h2>
          <button class="btn btn-ghost btn-sm" onclick="window._goToday()">See All →</button>
        </div>
        <div class="home-doses" id="homeDoses">
          ${skeletonLoader(3)}
        </div>
      </div>

      <!-- Quick Actions Grid -->
      <div class="home-section">
        <h2 class="section-title">⚡ Quick Actions</h2>
        <div class="quick-actions-grid">
          <button class="quick-action" onclick="window._uploadRx()">
            <div class="qa-icon qa-blue">📋</div>
            <span class="qa-label">Upload Prescription</span>
          </button>
          <button class="quick-action" onclick="window._goToday()">
            <div class="qa-icon qa-green">💊</div>
            <span class="qa-label">Today's Doses</span>
          </button>
          <button class="quick-action" onclick="window._logVitals()">
            <div class="qa-icon qa-purple">📊</div>
            <span class="qa-label">Log Vitals</span>
          </button>
          <button class="quick-action" onclick="window._askAI()">
            <div class="qa-icon qa-teal">🤖</div>
            <span class="qa-label">Ask AI</span>
          </button>
          <button class="quick-action" onclick="window._pillCheck()">
            <div class="qa-icon qa-amber">💊</div>
            <span class="qa-label">Verify Pill</span>
          </button>
          <button class="quick-action" onclick="window._foodCheck()">
            <div class="qa-icon qa-green">🍱</div>
            <span class="qa-label">Food Analyzer</span>
          </button>
          <button class="quick-action" onclick="window._labReport()">
            <div class="qa-icon qa-blue">🧪</div>
            <span class="qa-label">Lab Report</span>
          </button>
          <button class="quick-action" onclick="window._healthPdf()">
            <div class="qa-icon qa-purple">📄</div>
            <span class="qa-label">Health PDF</span>
          </button>
        </div>
      </div>

      <!-- Recovery Plan Card -->
      <div class="home-section">
        <div class="section-header">
          <h2 class="section-title">🎯 Recovery Plan</h2>
        </div>
        <div id="homeRecoveryPlan">
          ${renderNoPlan()}
        </div>
      </div>

      <!-- Prescriptions -->
      <div class="home-section">
        <div class="section-header">
          <h2 class="section-title">📋 My Prescriptions</h2>
          <button class="btn btn-ghost btn-sm" onclick="window._uploadRx()">+ Add</button>
        </div>
        <div id="homePrescriptions">
          ${renderNoPrescriptions()}
        </div>
      </div>
    </div>
  `;

  // Load data
  loadHomeData();
}

// ── Load Dashboard Data ──
async function loadHomeData() {
  const patientId = _state.patient?.patient_id;
  if (!patientId) return;

  // Load medicines, adherence, vitals in parallel
  const [medsRes, adhRes, vitRes, checkRes, planRes] = await Promise.all([
    _supabase.query('recover_medicines', { filter: `patient_id=eq.${patientId}&is_active=eq.true`, select: '*' }),
    _supabase.query('recover_adherence', { filter: `patient_id=eq.${patientId}&scheduled_date=eq.${todayISO()}`, select: '*' }),
    _supabase.query('recover_vitals', { filter: `patient_id=eq.${patientId}`, order: 'logged_at.desc', limit: 5 }),
    _supabase.query('recover_checkins', { filter: `patient_id=eq.${patientId}&checkin_date=eq.${todayISO()}`, select: '*' }),
    _supabase.query('recover_plans', { filter: `patient_id=eq.${patientId}&status=eq.active`, order: 'generated_at.desc', limit: 1 }),
  ]);

  _state.medicines = medsRes.data || [];
  _state.todayLogs = adhRes.data || [];
  _state.vitals = vitRes.data || [];

  // Update stats
  const adherence = calcAdherence(_state.todayLogs);
  const healthScore = calcHealthScore({
    adherence,
    vitalsLogged: (_state.vitals || []).some(v => v.logged_at?.startsWith(todayISO())),
    checkinDone: (checkRes.data || []).length > 0,
    streak: 0, // TODO: Calculate streak
  });

  renderStats(healthScore, adherence);
  renderTodayDoses();

  // Recovery plan
  if (planRes.data && planRes.data.length > 0) {
    renderRecoveryPlan(planRes.data[0]);
  }

  // Load prescriptions
  loadPrescriptions(patientId);
}

function renderStats(healthScore, adherence) {
  const container = $('homeStatsRow');
  if (!container) return;

  container.innerHTML = `
    <div class="stat-card stat-card-health">
      <div class="stat-ring">
        <svg viewBox="0 0 100 100" class="ring-svg">
          <circle cx="50" cy="50" r="42" class="ring-bg"/>
          <circle cx="50" cy="50" r="42" class="ring-fill" 
            style="stroke-dasharray:${healthScore * 2.64}, 264; stroke:${healthScore > 70 ? 'var(--green)' : healthScore > 40 ? 'var(--amber)' : 'var(--red)'}"/>
        </svg>
        <div class="stat-ring-value">${healthScore}</div>
      </div>
      <div class="stat-info">
        <div class="stat-label">Health Score</div>
        <div class="stat-desc">${healthScore > 70 ? 'Great progress!' : healthScore > 40 ? 'Keep improving' : 'Needs attention'}</div>
      </div>
    </div>
    <div class="stat-card stat-card-adherence">
      <div class="stat-big-num" style="color:${adherence > 80 ? 'var(--green)' : adherence > 50 ? 'var(--amber)' : 'var(--red)'}">${adherence}%</div>
      <div class="stat-info">
        <div class="stat-label">Today's Adherence</div>
        <div class="stat-desc">${_state.todayLogs.filter(l => l.status === 'taken').length}/${_state.todayLogs.length} doses taken</div>
      </div>
    </div>
  `;
}

function renderTodayDoses() {
  const container = $('homeDoses');
  if (!container) return;

  const medicines = _state.medicines || [];
  if (medicines.length === 0) {
    container.innerHTML = `
      <div class="empty-state-sm">
        <p>No medicines added yet. Upload a prescription to get started.</p>
        <button class="btn btn-primary btn-sm" onclick="window._uploadRx()">📋 Upload Prescription</button>
      </div>
    `;
    return;
  }

  const period = currentTimePeriod();
  const periodMeds = medicines.filter(m => (m.timing || []).includes(period));
  const emoji = periodEmoji(period);

  if (periodMeds.length === 0) {
    container.innerHTML = `
      <div class="dose-period-empty">
        <span>${emoji}</span> No medicines scheduled for ${period}. Check Today tab for full schedule.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="dose-period-header">
      <span>${emoji} ${period.charAt(0).toUpperCase() + period.slice(1)} Medicines</span>
    </div>
    ${periodMeds.map(med => {
      const log = _state.todayLogs.find(l => l.medicine_id === med.id && l.scheduled_time === period);
      const status = log?.status || 'pending';
      const statusClass = status === 'taken' ? 'dose-taken' : status === 'missed' ? 'dose-missed' : 'dose-pending';
      const statusIcon = status === 'taken' ? '✓' : status === 'missed' ? '✗' : '○';
      return `
        <div class="dose-card ${statusClass}">
          <div class="dose-info">
            <div class="dose-name">${escapeHtml(med.medicine_name)}</div>
            <div class="dose-detail">${escapeHtml(med.dosage || '')} ${med.instruction ? '· ' + escapeHtml(med.instruction) : ''}</div>
          </div>
          <div class="dose-actions">
            ${status === 'pending' ? `
              <button class="btn btn-success btn-sm" onclick="window._markDose('${med.id}','${period}','taken')">✓ Take</button>
              <button class="btn btn-ghost btn-sm" onclick="window._markDose('${med.id}','${period}','skipped')">Skip</button>
            ` : `
              <span class="dose-status-badge ${statusClass}">${statusIcon} ${status}</span>
            `}
          </div>
        </div>
      `;
    }).join('')}
  `;
}

function renderCheckinCard() {
  return `
    <div class="checkin-card">
      <div class="checkin-header">
        <span class="checkin-emoji">🌤️</span>
        <div>
          <h3 class="checkin-title">How are you feeling today?</h3>
          <p class="checkin-desc">Quick daily check-in helps your AI companion understand you better</p>
        </div>
      </div>
      <div class="checkin-moods">
        <button class="mood-btn" onclick="window._quickCheckin('great')">😊<span>Great</span></button>
        <button class="mood-btn" onclick="window._quickCheckin('good')">🙂<span>Good</span></button>
        <button class="mood-btn" onclick="window._quickCheckin('okay')">😐<span>Okay</span></button>
        <button class="mood-btn" onclick="window._quickCheckin('bad')">😔<span>Bad</span></button>
        <button class="mood-btn" onclick="window._quickCheckin('terrible')">😰<span>Terrible</span></button>
      </div>
    </div>
  `;
}

function renderNoPlan() {
  return `
    <div class="card card-dashed">
      <div class="empty-state-sm">
        <span style="font-size:32px">🎯</span>
        <p>Your personalized AI recovery plan will appear here once you upload your first prescription.</p>
      </div>
    </div>
  `;
}

function renderRecoveryPlan(plan) {
  const container = $('homeRecoveryPlan');
  if (!container || !plan?.plan_data) return;

  const data = plan.plan_data;
  container.innerHTML = `
    <div class="card card-blue">
      <div class="plan-header">
        <h3>🎯 Active Recovery Plan</h3>
        <span class="badge badge-green">v${plan.plan_version}</span>
      </div>
      ${data.nutrition ? `
        <div class="plan-section">
          <h4>🍱 Today's Nutrition</h4>
          <p>${escapeHtml(data.nutrition.breakfast || 'Follow your plan')}</p>
        </div>
      ` : ''}
      ${data.exercise ? `
        <div class="plan-section">
          <h4>🏃 Today's Activity</h4>
          <p>${(data.exercise || []).map(e => `${escapeHtml(e.name)} (${e.duration})`).join(', ') || 'Rest day'}</p>
        </div>
      ` : ''}
      ${data.milestones ? `
        <div class="plan-section">
          <h4>🏆 Current Milestone</h4>
          <p>${escapeHtml(data.milestones[0]?.goal || 'Keep up your adherence!')}</p>
        </div>
      ` : ''}
    </div>
  `;
}

function renderNoPrescriptions() {
  return `
    <div class="card card-dashed">
      <div class="empty-state-sm">
        <span style="font-size:32px">📋</span>
        <p>No prescriptions uploaded yet. Upload your prescription and our AI will extract your medicines.</p>
        <button class="btn btn-primary btn-sm" onclick="window._uploadRx()">📸 Upload Prescription</button>
      </div>
    </div>
  `;
}

async function loadPrescriptions(patientId) {
  const { data } = await _supabase.query('recover_prescriptions', {
    filter: `patient_id=eq.${patientId}&status=eq.active`,
    order: 'created_at.desc',
    limit: 3,
  });

  const container = $('homePrescriptions');
  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML = renderNoPrescriptions();
    return;
  }

  container.innerHTML = data.map(rx => {
    const statusColors = {
      ai_extracted: 'badge-amber',
      pending_review: 'badge-amber',
      verified: 'badge-green',
      flagged: 'badge-red',
    };
    const statusLabels = {
      ai_extracted: '⏳ AI Extracted',
      pending_review: '⏳ Pending Review',
      verified: '✅ Verified',
      flagged: '⚠️ Flagged',
    };
    return `
      <div class="rx-card">
        <div class="rx-info">
          <div class="rx-doctor">${escapeHtml(rx.doctor_name || 'Prescription')}</div>
          <div class="rx-date">${rx.prescription_date || rx.created_at?.split('T')[0] || '—'}</div>
          ${rx.diagnosis ? `<div class="rx-diagnosis">${escapeHtml(rx.diagnosis)}</div>` : ''}
        </div>
        <span class="badge ${statusColors[rx.verification_status] || 'badge-amber'}">
          ${statusLabels[rx.verification_status] || rx.verification_status}
        </span>
      </div>
    `;
  }).join('');
}

// ── Quick Actions ──
window._goToday = () => _navigate('today');
window._askAI = () => _navigate('ai');

window._uploadRx = function() {
  showModal(`
    <div class="modal-header">
      <h2>📋 Upload Prescription</h2>
      <button class="modal-close" onclick="window._hideModal()">×</button>
    </div>
    <div class="modal-body">
      <p class="modal-desc">Take a photo of your prescription or upload an image. Our AI will extract medicine details.</p>
      
      <div class="upload-area" id="rxUploadArea">
        <input type="file" id="rxFileInput" accept="image/*" capture="environment" style="display:none"
          onchange="window._handleRxUpload(this)"/>
        <button class="upload-btn" onclick="document.getElementById('rxFileInput').click()">
          <span class="upload-icon">📸</span>
          <span class="upload-text">Camera / Gallery</span>
        </button>
      </div>
      
      <div id="rxUploadStatus" style="display:none">
        <div class="upload-progress">
          <div class="spinner"></div>
          <p>AI is analyzing your prescription...</p>
        </div>
      </div>
    </div>
  `);
};

window._handleRxUpload = async function(input) {
  const file = input.files?.[0];
  if (!file) return;

  const status = $('rxUploadStatus');
  const area = $('rxUploadArea');
  if (area) area.style.display = 'none';
  if (status) status.style.display = '';

  // Convert to base64
  const reader = new FileReader();
  reader.onload = async function(e) {
    const base64 = e.target.result.split(',')[1];

    // Call prescription-extract edge function
    const { data, error } = await _supabase.edgeFn('prescription-extract', {
      image: base64,
      patient_context: {
        conditions: _state.patient?.primary_conditions || [],
        allergies: _state.patient?.allergies || [],
        age: _state.patient?.age,
      },
    });

    if (error || !data) {
      showToast('Failed to process prescription. Please try again.', 'error');
      hideModal();
      return;
    }

    // Save prescription to database
    const patientId = _state.patient?.patient_id;
    const { data: rxData } = await _supabase.query('recover_prescriptions', {
      method: 'POST',
      body: {
        patient_id: patientId,
        raw_ai_extraction: data,
        doctor_name: data.doctor_name || null,
        hospital_name: data.hospital_name || null,
        diagnosis: data.diagnosis || null,
        prescription_date: data.date || todayISO(),
        follow_up_date: data.follow_up_date || null,
        verification_status: 'ai_extracted',
      },
    });

    // Save extracted medicines
    if (data.medicines && rxData?.[0]?.id) {
      const rxId = rxData[0].id;
      for (const med of data.medicines) {
        await _supabase.query('recover_medicines', {
          method: 'POST',
          body: {
            prescription_id: rxId,
            patient_id: patientId,
            medicine_name: med.name || med.medicine_name,
            generic_name: med.generic_name || null,
            drug_class: med.drug_class || null,
            dosage: med.dosage || null,
            frequency: med.frequency || null,
            timing: med.timing || [],
            instruction: med.instruction || null,
            duration_days: med.duration_days || null,
            purpose: med.purpose || null,
            is_active: true,
          },
        });
      }
    }

    hideModal();
    showToast(`Prescription processed! ${data.medicines?.length || 0} medicines extracted.`, 'success');
    render(_state, _supabase); // Refresh dashboard
  };
  reader.readAsDataURL(file);
};

window._hideModal = hideModal;

window._logVitals = function() {
  showModal(`
    <div class="modal-header">
      <h2>📊 Log Vitals</h2>
      <button class="modal-close" onclick="window._hideModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="vitals-grid">
        <button class="vital-btn" onclick="window._logVitalType('blood_sugar')">🩸 Blood Sugar</button>
        <button class="vital-btn" onclick="window._logVitalType('bp')">❤️ Blood Pressure</button>
        <button class="vital-btn" onclick="window._logVitalType('weight')">⚖️ Weight</button>
        <button class="vital-btn" onclick="window._logVitalType('spo2')">🫁 SpO2</button>
        <button class="vital-btn" onclick="window._logVitalType('temperature')">🌡️ Temperature</button>
        <button class="vital-btn" onclick="window._logVitalType('heart_rate')">💓 Heart Rate</button>
      </div>
    </div>
  `);
};

window._logVitalType = function(type) {
  const labels = {
    blood_sugar: { name: 'Blood Sugar', unit: 'mg/dL', placeholder: '120', contexts: ['fasting','post_meal','random'] },
    bp: { name: 'Blood Pressure', unit: 'mmHg', placeholder: '120/80', contexts: ['resting','after_exercise'] },
    weight: { name: 'Weight', unit: 'kg', placeholder: '72.5', contexts: ['morning','evening'] },
    spo2: { name: 'SpO2', unit: '%', placeholder: '98', contexts: [] },
    temperature: { name: 'Temperature', unit: '°F', placeholder: '98.6', contexts: [] },
    heart_rate: { name: 'Heart Rate', unit: 'bpm', placeholder: '72', contexts: ['resting','after_exercise'] },
  };
  const info = labels[type] || {};

  showModal(`
    <div class="modal-header">
      <h2>${info.name}</h2>
      <button class="modal-close" onclick="window._hideModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Value (${info.unit})</label>
        <input type="text" class="input" id="vitalValue" placeholder="${info.placeholder}" inputmode="decimal"/>
      </div>
      ${info.contexts.length ? `
        <div class="form-group">
          <label class="form-label">Context</label>
          <div class="chip-group" id="vitalContextGroup">
            ${info.contexts.map(c => `<button class="chip" data-value="${c}" onclick="window._selectChip('vitalContextGroup',this)">${c.replace(/_/g,' ')}</button>`).join('')}
          </div>
        </div>
      ` : ''}
      <button class="btn btn-primary btn-full" onclick="window._saveVital('${type}','${info.unit}')">Save</button>
    </div>
  `);
};

window._saveVital = async function(type, unit) {
  const value = $('vitalValue')?.value?.trim();
  if (!value) { showToast('Please enter a value', 'error'); return; }

  const contextGroup = $('vitalContextGroup');
  const context = contextGroup?.querySelector('.chip.selected')?.dataset?.value || null;
  const valueNum = parseFloat(value.split('/')[0]) || null;

  await _supabase.query('recover_vitals', {
    method: 'POST',
    body: {
      patient_id: _state.patient?.patient_id,
      type, value, value_num: valueNum, unit, context,
      logged_at: new Date().toISOString(),
    },
  });

  hideModal();
  showToast('Vital logged successfully!', 'success');
};

window._pillCheck = () => window.open('/medicine-info.html', '_blank');
window._foodCheck = () => showToast('Food Analyzer coming in Phase 3', 'info');
window._labReport = () => window.open('/report-explainer.html', '_blank');
window._healthPdf = () => showToast('Health PDF coming in Phase 6', 'info');

// ── Mark Dose ──
window._markDose = async function(medId, time, status) {
  const patientId = _state.patient?.patient_id;
  
  // Upsert adherence log
  const { error } = await _supabase.query('recover_adherence', {
    method: 'POST',
    body: {
      medicine_id: medId,
      patient_id: patientId,
      scheduled_date: todayISO(),
      scheduled_time: time,
      status: status,
      taken_at: status === 'taken' ? new Date().toISOString() : null,
    },
  });

  if (error) {
    // Try PATCH if already exists
    await _supabase.query('recover_adherence', {
      method: 'PATCH',
      body: { status, taken_at: status === 'taken' ? new Date().toISOString() : null },
      filter: `medicine_id=eq.${medId}&scheduled_date=eq.${todayISO()}&scheduled_time=eq.${time}`,
    });
  }

  showToast(status === 'taken' ? '✓ Medicine marked as taken!' : '⏭️ Medicine skipped', status === 'taken' ? 'success' : 'warning');
  
  // Refresh
  loadHomeData();
};

// ── Quick Check-in ──
window._quickCheckin = async function(mood) {
  const patientId = _state.patient?.patient_id;
  
  await _supabase.query('recover_checkins', {
    method: 'POST',
    body: {
      patient_id: patientId,
      checkin_date: todayISO(),
      mood: mood,
    },
  });

  const checkinContainer = $('homeCheckin');
  if (checkinContainer) {
    const emoji = { great:'😊', good:'🙂', okay:'😐', bad:'😔', terrible:'😰' }[mood] || '🙂';
    checkinContainer.innerHTML = `
      <div class="checkin-card checkin-done">
        <span class="checkin-done-emoji">${emoji}</span>
        <span class="checkin-done-text">You're feeling <strong>${mood}</strong> today. Take care! 💙</span>
      </div>
    `;
  }

  showToast(`Check-in recorded: ${mood}`, 'success');
};

// ── Chip selection (reusable) ──
window._selectChip = function(groupId, chip) {
  const group = $(groupId);
  if (!group) return;
  group.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
  chip.classList.add('selected');
};
