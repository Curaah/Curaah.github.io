// ═══════════════════════════════════════════════════════════
// Curaah Recover — Recovery Journey
// Vitals tracking, lab reports, trends, health PDF, timeline
// ═══════════════════════════════════════════════════════════

import { showToast, showModal, hideModal, $, escapeHtml, formatDate,
         relativeDate, skeletonLoader, capitalize } from './utils.js';

let _state, _supabase, _navigate;

export function init(state, supabase, navigate) {
  _state = state;
  _supabase = supabase;
  _navigate = navigate;
}

export async function render(state, supabase) {
  if (state) _state = state;
  if (supabase) _supabase = supabase;

  const container = $('journeyContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="journey-wrapper">
      <h1 class="section-title" style="margin-bottom:4px;">📈 Recovery Journey</h1>
      <p class="text-muted" style="margin-bottom:20px;">Track your vitals, labs, and recovery progress</p>

      <!-- Stats -->
      <div class="card-grid card-grid-4" id="journeyStats">${skeletonLoader(2)}</div>

      <!-- Vitals Section -->
      <div class="journey-section">
        <div class="section-header">
          <h2 class="section-title">📊 Vitals</h2>
          <button class="btn btn-primary btn-sm" onclick="window._jLogVitals()">+ Log Vital</button>
        </div>
        
        <!-- Vital Type Selector -->
        <div class="chip-group" id="vitalTypeChips" style="margin-bottom:16px;">
          <button class="chip selected" data-type="blood_sugar" onclick="window._selectVitalType(this)">🩸 Blood Sugar</button>
          <button class="chip" data-type="bp" onclick="window._selectVitalType(this)">❤️ BP</button>
          <button class="chip" data-type="weight" onclick="window._selectVitalType(this)">⚖️ Weight</button>
          <button class="chip" data-type="spo2" onclick="window._selectVitalType(this)">🫁 SpO2</button>
          <button class="chip" data-type="temperature" onclick="window._selectVitalType(this)">🌡️ Temp</button>
          <button class="chip" data-type="heart_rate" onclick="window._selectVitalType(this)">💓 HR</button>
        </div>

        <!-- Chart -->
        <div class="card" style="padding:16px;">
          <canvas id="vitalChart" width="600" height="240" style="width:100%;height:200px;"></canvas>
        </div>

        <!-- Recent Values -->
        <div id="vitalsList" style="margin-top:12px;">${skeletonLoader(3)}</div>
      </div>

      <!-- Lab Reports -->
      <div class="journey-section">
        <div class="section-header">
          <h2 class="section-title">🧪 Lab Reports</h2>
          <button class="btn btn-primary btn-sm" onclick="window._jUploadLab()">+ Upload</button>
        </div>
        <div id="labsList">${skeletonLoader(2)}</div>
      </div>

      <!-- Health PDF -->
      <div class="journey-section">
        <div class="section-header">
          <h2 class="section-title">📄 Health Summary</h2>
        </div>
        <div class="card" style="cursor:pointer;" onclick="window._generatePDF()">
          <div class="flex-row" style="gap:12px;align-items:center;">
            <span style="font-size:32px;">📄</span>
            <div>
              <div style="font-weight:600;">Generate Doctor-Ready Health PDF</div>
              <div class="text-muted" style="font-size:13px;">AI-summarized recovery report for productive doctor visits</div>
            </div>
            <span style="margin-left:auto;color:var(--blue);">→</span>
          </div>
        </div>
      </div>

      <!-- Timeline -->
      <div class="journey-section">
        <div class="section-header">
          <h2 class="section-title">📅 Activity Timeline</h2>
        </div>
        <div id="activityTimeline">${skeletonLoader(4)}</div>
      </div>
    </div>
  `;

  await loadJourneyData();
}

let allVitals = [];

async function loadJourneyData() {
  const pid = _state.patient?.patient_id;
  if (!pid) return;

  const [vitRes, labRes, adhRes] = await Promise.all([
    _supabase.query('recover_vitals', { filter: `patient_id=eq.${pid}`, order: 'logged_at.desc', limit: 100 }),
    _supabase.query('recover_labs', { filter: `patient_id=eq.${pid}`, order: 'created_at.desc', limit: 20 }),
    _supabase.query('recover_adherence', { filter: `patient_id=eq.${pid}`, order: 'created_at.desc', limit: 100 }),
  ]);

  allVitals = vitRes.data || [];
  const labs = labRes.data || [];
  const adherence = adhRes.data || [];

  // Stats
  const totalDays = _state.patient?.created_at ? 
    Math.max(1, Math.ceil((Date.now() - new Date(_state.patient.created_at)) / 86400000)) : 1;
  const takenCount = adherence.filter(a => a.status === 'taken').length;
  const totalCount = adherence.length || 1;

  const statsEl = $('journeyStats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="card stat-mini"><div class="stat-mini-val">${totalDays}</div><div class="stat-mini-label">Days Active</div></div>
      <div class="card stat-mini"><div class="stat-mini-val" style="color:var(--green)">${Math.round(takenCount/totalCount*100)}%</div><div class="stat-mini-label">Adherence</div></div>
      <div class="card stat-mini"><div class="stat-mini-val" style="color:var(--blue)">${allVitals.length}</div><div class="stat-mini-label">Vitals Logged</div></div>
      <div class="card stat-mini"><div class="stat-mini-val" style="color:var(--purple)">${labs.length}</div><div class="stat-mini-label">Lab Reports</div></div>
    `;
  }

  // Render initial vital type
  renderVitalData('blood_sugar');
  renderLabs(labs);
  renderTimeline(allVitals, labs, adherence);
}

function renderVitalData(type) {
  const filtered = allVitals.filter(v => v.type === type);
  renderVitalChart(filtered, type);
  renderVitalList(filtered, type);
}

function renderVitalChart(data, type) {
  const canvas = $('vitalChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = 200 * dpr;
  ctx.scale(dpr, dpr);
  const W = canvas.offsetWidth;
  const H = 200;

  ctx.clearRect(0, 0, W, H);

  if (data.length < 2) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(data.length === 0 ? 'No data yet — log your first vital!' : 'Need at least 2 readings for a trend', W/2, H/2);
    return;
  }

  const sorted = [...data].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at)).slice(-14);
  const values = sorted.map(v => v.value_num || parseFloat(v.value) || 0);
  const min = Math.min(...values) * 0.9;
  const max = Math.max(...values) * 1.1 || 1;
  const pad = { top: 20, bottom: 30, left: 10, right: 10 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (plotH / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
  }

  // Plot points & line
  const points = sorted.map((v, i) => ({
    x: pad.left + (i / (sorted.length - 1)) * plotW,
    y: pad.top + plotH - ((values[i] - min) / (max - min)) * plotH,
  }));

  // Gradient fill
  const grad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
  grad.addColorStop(0, 'rgba(61,158,255,0.25)');
  grad.addColorStop(1, 'rgba(61,158,255,0.02)');
  ctx.beginPath();
  ctx.moveTo(points[0].x, H - pad.bottom);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length-1].x, H - pad.bottom);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.strokeStyle = '#3d9eff';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.stroke();

  // Dots
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#3d9eff';
    ctx.fill();
    ctx.strokeStyle = '#060d1f';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Labels
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '10px Inter';
  ctx.textAlign = 'center';
  sorted.forEach((v, i) => {
    if (i % Math.ceil(sorted.length / 6) === 0 || i === sorted.length - 1) {
      const d = new Date(v.logged_at);
      ctx.fillText(`${d.getDate()}/${d.getMonth()+1}`, points[i].x, H - 8);
    }
  });

  // Y-axis values
  ctx.textAlign = 'right';
  ctx.fillText(Math.round(max), pad.left + plotW, pad.top + 4);
  ctx.fillText(Math.round(min), pad.left + plotW, H - pad.bottom - 4);
}

function renderVitalList(data, type) {
  const container = $('vitalsList');
  if (!container) return;

  const icons = { blood_sugar:'🩸', bp:'❤️', weight:'⚖️', spo2:'🫁', temperature:'🌡️', heart_rate:'💓' };

  if (!data.length) {
    container.innerHTML = `<div class="card card-dashed"><div class="empty-state-sm"><p>No ${type.replace(/_/g,' ')} readings yet. Tap "Log Vital" to add one.</p></div></div>`;
    return;
  }

  container.innerHTML = data.slice(0, 8).map(v => `
    <div class="card" style="margin-bottom:6px;padding:12px 16px;">
      <div class="flex-row" style="justify-content:space-between;align-items:center;">
        <div class="flex-row" style="gap:10px;align-items:center;">
          <span>${icons[v.type] || '📊'}</span>
          <div>
            <div style="font-weight:600;font-size:16px;">${escapeHtml(v.value)} <span class="text-muted" style="font-size:12px;">${v.unit || ''}</span></div>
            ${v.context ? `<span class="tag tag-blue" style="font-size:10px;">${v.context.replace(/_/g,' ')}</span>` : ''}
          </div>
        </div>
        <span class="text-muted" style="font-size:12px;">${relativeDate(v.logged_at)}</span>
      </div>
    </div>
  `).join('');
}

window._selectVitalType = function(chip) {
  document.querySelectorAll('#vitalTypeChips .chip').forEach(c => c.classList.remove('selected'));
  chip.classList.add('selected');
  renderVitalData(chip.dataset.type);
};

window._jLogVitals = function() {
  // Reuse same vital logging modal from home.js
  showModal(`
    <div class="modal-header"><h2>📊 Log Vital</h2><button class="modal-close" onclick="window._jHide()">×</button></div>
    <div class="modal-body">
      <div class="vitals-grid">
        <button class="vital-btn" onclick="window._jLogType('blood_sugar')">🩸 Blood Sugar</button>
        <button class="vital-btn" onclick="window._jLogType('bp')">❤️ Blood Pressure</button>
        <button class="vital-btn" onclick="window._jLogType('weight')">⚖️ Weight</button>
        <button class="vital-btn" onclick="window._jLogType('spo2')">🫁 SpO2</button>
        <button class="vital-btn" onclick="window._jLogType('temperature')">🌡️ Temperature</button>
        <button class="vital-btn" onclick="window._jLogType('heart_rate')">💓 Heart Rate</button>
      </div>
    </div>
  `);
};

window._jLogType = function(type) {
  const info = {
    blood_sugar: { name:'Blood Sugar', unit:'mg/dL', ph:'120' },
    bp: { name:'Blood Pressure', unit:'mmHg', ph:'120/80' },
    weight: { name:'Weight', unit:'kg', ph:'72.5' },
    spo2: { name:'SpO2', unit:'%', ph:'98' },
    temperature: { name:'Temperature', unit:'°F', ph:'98.6' },
    heart_rate: { name:'Heart Rate', unit:'bpm', ph:'72' },
  }[type] || {};

  showModal(`
    <div class="modal-header"><h2>${info.name}</h2><button class="modal-close" onclick="window._jHide()">×</button></div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">Value (${info.unit})</label>
        <input type="text" class="input" id="jVitalVal" placeholder="${info.ph}" inputmode="decimal"/></div>
      <button class="btn btn-primary btn-full" onclick="window._jSaveVital('${type}','${info.unit}')">Save</button>
    </div>
  `);
};

window._jSaveVital = async function(type, unit) {
  const val = $('jVitalVal')?.value?.trim();
  if (!val) { showToast('Enter a value', 'error'); return; }
  await _supabase.query('recover_vitals', { method:'POST', body:{
    patient_id: _state.patient?.patient_id, type, value: val,
    value_num: parseFloat(val.split('/')[0]) || null, unit,
    logged_at: new Date().toISOString(),
  }});
  hideModal();
  showToast('Vital logged!', 'success');
  render(_state, _supabase);
};

window._jHide = hideModal;

// ── Labs ──
function renderLabs(labs) {
  const el = $('labsList');
  if (!el) return;
  if (!labs.length) {
    el.innerHTML = `<div class="card card-dashed"><div class="empty-state-sm"><p>No lab reports yet. Upload one to get AI explanations.</p></div></div>`;
    return;
  }
  el.innerHTML = labs.map(l => `
    <div class="card" style="margin-bottom:8px;cursor:pointer;" onclick="window._viewLab('${l.id}')">
      <div class="flex-row" style="justify-content:space-between;align-items:center;">
        <div><div style="font-weight:600;">🧪 ${escapeHtml(l.report_type || 'Lab Report')}</div>
        <div class="text-muted" style="font-size:12px;">${formatDate(l.report_date)}</div></div>
        <span style="color:var(--blue);">View →</span>
      </div>
      ${l.ai_explanation ? `<p class="text-muted" style="font-size:12px;margin-top:8px;">${escapeHtml(l.ai_explanation.substring(0,120))}...</p>` : ''}
    </div>
  `).join('');
}

window._viewLab = async function(labId) {
  const pid = _state.patient?.patient_id;
  const { data } = await _supabase.query('recover_labs', { filter: `id=eq.${labId}&patient_id=eq.${pid}` });
  const lab = data?.[0];
  if (!lab) return;
  showModal(`
    <div class="modal-header"><h2>🧪 Lab Report</h2><button class="modal-close" onclick="window._jHide()">×</button></div>
    <div class="modal-body">
      <div class="card card-blue" style="margin-bottom:12px;"><p style="font-weight:600;">Date: ${formatDate(lab.report_date)}</p>
      ${lab.report_type ? `<p>Type: ${escapeHtml(lab.report_type)}</p>` : ''}</div>
      ${lab.ai_explanation ? `<div class="card" style="margin-bottom:12px;"><h4>🤖 AI Explanation</h4><p style="white-space:pre-wrap;">${escapeHtml(lab.ai_explanation)}</p></div>` : ''}
      ${lab.raw_text ? `<div class="card" style="margin-bottom:12px;"><h4>📋 Raw Data</h4><pre style="font-size:12px;white-space:pre-wrap;color:var(--muted);">${escapeHtml(lab.raw_text)}</pre></div>` : ''}
      <p class="text-muted" style="font-size:11px;">⚕️ AI explanation is for educational purposes only. Consult your doctor for interpretation.</p>
    </div>
  `, { width: '520px' });
};

window._jUploadLab = function() {
  showModal(`
    <div class="modal-header"><h2>🧪 Upload Lab Report</h2><button class="modal-close" onclick="window._jHide()">×</button></div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">Report Type</label>
        <select class="select" id="labType"><option value="blood_test">Blood Test</option><option value="urine">Urine Test</option><option value="imaging">Imaging/X-Ray</option><option value="other">Other</option></select></div>
      <div class="form-group"><label class="form-label">Upload Image</label>
        <input type="file" id="labFileInput" accept="image/*" capture="environment" class="input"/></div>
      <div class="form-group"><label class="form-label">Or paste text manually</label>
        <textarea class="textarea" id="labText" rows="4" placeholder="Paste lab values here..."></textarea></div>
      <button class="btn btn-primary btn-full" id="labSubmitBtn" onclick="window._submitLab()"><span class="btn-text">Analyze with AI</span><span class="btn-spinner" style="display:none"></span></button>
    </div>
  `);
};

window._submitLab = async function() {
  const type = $('labType')?.value;
  const file = $('labFileInput')?.files?.[0];
  const text = $('labText')?.value?.trim();
  const btn = $('labSubmitBtn');
  if (!file && !text) { showToast('Upload image or paste text', 'error'); return; }

  const t = btn?.querySelector('.btn-text');
  const s = btn?.querySelector('.btn-spinner');
  if(t) t.style.display='none'; if(s) s.style.display=''; if(btn) btn.disabled=true;

  let base64 = null;
  if (file) {
    base64 = await new Promise(r => { const fr=new FileReader(); fr.onload=e=>r(e.target.result.split(',')[1]); fr.readAsDataURL(file); });
  }

  const { data } = await _supabase.edgeFn('report-explainer', {
    image: base64, text: text || '', language: _state.patient?.language || 'en',
    patient_context: { conditions: _state.patient?.primary_conditions || [], age: _state.patient?.age },
  });

  await _supabase.query('recover_labs', { method:'POST', body:{
    patient_id: _state.patient?.patient_id, report_type: type,
    report_date: new Date().toISOString().split('T')[0],
    raw_text: text || data?.raw_text || '', ai_explanation: data?.explanation || data?.summary || JSON.stringify(data),
    findings: data?.findings || null, abnormal_flags: data?.abnormal || null,
  }});

  hideModal();
  showToast('Lab report analyzed!', 'success');
  render(_state, _supabase);
};

// ── Timeline ──
function renderTimeline(vitals, labs, adherence) {
  const el = $('activityTimeline');
  if (!el) return;

  const events = [];
  vitals.slice(0, 10).forEach(v => events.push({ type:'vital', icon:'📊', text:`Logged ${v.type.replace(/_/g,' ')}: ${v.value} ${v.unit||''}`, date:v.logged_at }));
  labs.slice(0, 5).forEach(l => events.push({ type:'lab', icon:'🧪', text:`Lab report: ${l.report_type||'Test'}`, date:l.created_at }));
  adherence.filter(a=>a.status==='taken').slice(0,10).forEach(a => events.push({ type:'adherence', icon:'💊', text:`Took medicine`, date:a.taken_at||a.created_at }));

  events.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!events.length) {
    el.innerHTML = '<div class="card card-dashed"><div class="empty-state-sm"><p>Your activity timeline will appear here as you track your recovery.</p></div></div>';
    return;
  }

  el.innerHTML = `<div class="timeline">${events.slice(0,15).map(e => `
    <div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-content">
      <span>${e.icon} ${escapeHtml(e.text)}</span><span class="text-muted" style="font-size:11px;">${relativeDate(e.date)}</span>
    </div></div>
  `).join('')}</div>`;
}

// ── Health PDF ──
window._generatePDF = function() {
  const p = _state.patient || {};
  const meds = _state.medicines || [];
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>Health Summary — ${escapeHtml(p.full_name||'Patient')}</title>
    <style>body{font-family:Inter,sans-serif;max-width:800px;margin:auto;padding:40px;color:#1a1a2e;}
    h1{color:#3d9eff;border-bottom:2px solid #3d9eff;padding-bottom:8px;}h2{color:#0d1b35;margin-top:24px;}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}.item{background:#f0f4f8;padding:8px 12px;border-radius:8px;}
    .med{background:#e8f5e9;padding:8px;border-radius:6px;margin:4px 0;}.vital{padding:4px 0;border-bottom:1px solid #eee;}
    .footer{margin-top:40px;text-align:center;color:#888;font-size:12px;border-top:1px solid #eee;padding-top:16px;}
    @media print{body{padding:20px;}}</style></head><body>
    <h1>🏥 Curaah Health Summary</h1>
    <p>Generated: ${new Date().toLocaleString('en-IN')}</p>
    <h2>Patient Profile</h2><div class="grid">
      <div class="item"><strong>Name:</strong> ${escapeHtml(p.full_name||'')}</div>
      <div class="item"><strong>Age:</strong> ${p.age||'—'} · ${capitalize(p.gender||'')}</div>
      <div class="item"><strong>Blood Group:</strong> ${p.blood_group||'—'}</div>
      <div class="item"><strong>District:</strong> ${escapeHtml(p.district||'—')}</div>
      <div class="item"><strong>Conditions:</strong> ${(p.primary_conditions||[]).join(', ')||'None'}</div>
      <div class="item"><strong>Allergies:</strong> ${(p.allergies||[]).join(', ')||'None'}</div>
    </div>
    <h2>Active Medicines (${meds.length})</h2>
    ${meds.map(m => `<div class="med"><strong>${escapeHtml(m.medicine_name)}</strong> — ${escapeHtml(m.dosage||'')} · ${escapeHtml(m.frequency||'')}${m.purpose ? '<br><small>'+escapeHtml(m.purpose)+'</small>' : ''}</div>`).join('')}
    <h2>Recent Vitals</h2>
    ${allVitals.slice(0,10).map(v => `<div class="vital">${v.type.replace(/_/g,' ')}: <strong>${v.value} ${v.unit||''}</strong> — ${formatDate(v.logged_at)}</div>`).join('')||'<p>No vitals logged yet.</p>'}
    <div class="footer"><p>Generated by Curaah Recover — AI Recovery Intelligence Platform</p>
    <p>www.curaah.in · This is not a medical document. Always consult your doctor.</p></div>
    </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
};
