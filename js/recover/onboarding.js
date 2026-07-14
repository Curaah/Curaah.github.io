// ═══════════════════════════════════════════════════════════
// Curaah Recover — Onboarding Wizard
// 4-Step: Profile → Medical → Routine → Consent Summary
// ═══════════════════════════════════════════════════════════

import { showToast, $, escapeHtml } from './utils.js';

let _state, _supabase, _navigate;
let currentStep = 1;
const totalSteps = 4;

const CONDITIONS = [
  { id: 'diabetes_type2', label: 'Diabetes (Type 2)', icon: '🩸' },
  { id: 'diabetes_type1', label: 'Diabetes (Type 1)', icon: '🩸' },
  { id: 'hypertension', label: 'Hypertension / High BP', icon: '❤️' },
  { id: 'heart_disease', label: 'Heart Disease', icon: '🫀' },
  { id: 'cancer', label: 'Cancer', icon: '🎗️' },
  { id: 'tuberculosis', label: 'Tuberculosis (TB)', icon: '🫁' },
  { id: 'kidney_disease', label: 'Kidney Disease', icon: '🫘' },
  { id: 'liver_disease', label: 'Liver Disease', icon: '🫁' },
  { id: 'thyroid', label: 'Thyroid Disorder', icon: '🦋' },
  { id: 'asthma_copd', label: 'Asthma / COPD', icon: '🌬️' },
  { id: 'arthritis', label: 'Arthritis', icon: '🦴' },
  { id: 'post_surgical', label: 'Post-Surgical Recovery', icon: '🏥' },
  { id: 'mental_health', label: 'Mental Health', icon: '🧠' },
  { id: 'pcod_pcos', label: 'PCOD / PCOS', icon: '♀️' },
  { id: 'other', label: 'Other', icon: '➕' },
];

export function init(state, supabase, navigate) {
  _state = state;
  _supabase = supabase;
  _navigate = navigate;
}

export function render() {
  const container = $('onboardingContainer');
  if (!container) return;
  currentStep = 1;

  const patientName = _state.patient?.full_name || _state.patient?.settings?.name || 'there';

  container.innerHTML = `
    <div class="onboard-wrapper">
      <!-- Progress -->
      <div class="onboard-progress">
        <div class="onboard-progress-bar">
          <div class="onboard-progress-fill" id="obProgressFill" style="width:25%"></div>
        </div>
        <div class="onboard-steps">
          ${[1,2,3,4].map(i => `
            <div class="onboard-step-dot ${i === 1 ? 'active' : ''}" data-step="${i}">
              <span>${i}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Step 1: Profile -->
      <div class="onboard-step active" id="obStep1">
        <div class="onboard-header">
          <h2 class="onboard-title">👋 Hello, ${escapeHtml(patientName)}!</h2>
          <p class="onboard-desc">Let's set up your health profile. This helps our AI understand you better.</p>
        </div>

        <div class="form-group">
          <label class="form-label">Age <span class="required">*</span></label>
          <input type="number" class="input" id="obAge" placeholder="Your age" min="1" max="120"/>
        </div>

        <div class="form-group">
          <label class="form-label">Gender <span class="required">*</span></label>
          <div class="chip-group" id="obGenderGroup">
            <button class="chip" data-value="male" onclick="window._selectChip('obGenderGroup', this)">👨 Male</button>
            <button class="chip" data-value="female" onclick="window._selectChip('obGenderGroup', this)">👩 Female</button>
            <button class="chip" data-value="other" onclick="window._selectChip('obGenderGroup', this)">⚧️ Other</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">District / City</label>
          <input type="text" class="input" id="obDistrict" placeholder="e.g., Nangal, Rupnagar"/>
        </div>

        <div class="form-group">
          <label class="form-label">Blood Group</label>
          <select class="select" id="obBloodGroup">
            <option value="">Select (optional)</option>
            <option value="A+">A+</option><option value="A-">A-</option>
            <option value="B+">B+</option><option value="B-">B-</option>
            <option value="AB+">AB+</option><option value="AB-">AB-</option>
            <option value="O+">O+</option><option value="O-">O-</option>
          </select>
        </div>
      </div>

      <!-- Step 2: Medical -->
      <div class="onboard-step" id="obStep2">
        <div class="onboard-header">
          <h2 class="onboard-title">🏥 Your Health Conditions</h2>
          <p class="onboard-desc">Select all conditions you're managing. This helps us create your personalized recovery plan.</p>
        </div>

        <div class="form-group">
          <label class="form-label">Primary Conditions <span class="required">*</span></label>
          <div class="chip-group chip-multi" id="obConditionsGroup">
            ${CONDITIONS.map(c => `
              <button class="chip chip-condition" data-value="${c.id}" 
                onclick="window._toggleMultiChip(this)">
                ${c.icon} ${c.label}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Known Allergies</label>
          <input type="text" class="input" id="obAllergies" 
            placeholder="e.g., Penicillin, Sulfa drugs, Peanuts (comma separated)"/>
          <span class="form-hint">Leave blank if none</span>
        </div>

        <div class="form-row">
          <div class="form-group form-half">
            <label class="form-label">Height (cm)</label>
            <input type="number" class="input" id="obHeight" placeholder="e.g., 165" min="50" max="250"/>
          </div>
          <div class="form-group form-half">
            <label class="form-label">Weight (kg)</label>
            <input type="number" class="input" id="obWeight" placeholder="e.g., 72" min="10" max="300"/>
          </div>
        </div>
      </div>

      <!-- Step 3: Daily Routine -->
      <div class="onboard-step" id="obStep3">
        <div class="onboard-header">
          <h2 class="onboard-title">⏰ Your Daily Routine</h2>
          <p class="onboard-desc">This helps us schedule your medicines, meals, and recovery activities perfectly.</p>
        </div>

        <div class="form-row">
          <div class="form-group form-half">
            <label class="form-label">Wake Up Time</label>
            <input type="time" class="input" id="obWakeTime" value="06:00"/>
          </div>
          <div class="form-group form-half">
            <label class="form-label">Sleep Time</label>
            <input type="time" class="input" id="obSleepTime" value="22:00"/>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Meal Times</label>
          <div class="meal-time-grid">
            <div class="meal-time-item">
              <span class="meal-emoji">🌅</span>
              <span class="meal-label">Breakfast</span>
              <input type="time" class="input input-sm" id="obBreakfast" value="08:00"/>
            </div>
            <div class="meal-time-item">
              <span class="meal-emoji">☀️</span>
              <span class="meal-label">Lunch</span>
              <input type="time" class="input input-sm" id="obLunch" value="13:00"/>
            </div>
            <div class="meal-time-item">
              <span class="meal-emoji">🌙</span>
              <span class="meal-label">Dinner</span>
              <input type="time" class="input input-sm" id="obDinner" value="20:00"/>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Emergency Contact</label>
          <div class="form-row">
            <input type="text" class="input" id="obEmergName" placeholder="Name" style="flex:1"/>
            <input type="tel" class="input" id="obEmergPhone" placeholder="Phone" maxlength="10" style="flex:1"/>
          </div>
          <div class="form-row" style="margin-top:8px">
            <select class="select" id="obEmergRelation" style="flex:1">
              <option value="spouse">Spouse</option>
              <option value="son">Son</option>
              <option value="daughter">Daughter</option>
              <option value="parent">Parent</option>
              <option value="sibling">Sibling</option>
              <option value="friend">Friend</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Step 4: Review & Complete -->
      <div class="onboard-step" id="obStep4">
        <div class="onboard-header">
          <h2 class="onboard-title">✅ Almost Done!</h2>
          <p class="onboard-desc">Review your profile. You can always update this later in Settings.</p>
        </div>

        <div class="review-card" id="obReviewContent">
          <!-- Populated dynamically -->
        </div>

        <div class="consent-box" style="margin-top:16px">
          <label class="consent-row">
            <input type="checkbox" id="consentFamilySharing"/>
            <span>I consent to sharing my health data with family members I invite via share code</span>
          </label>
          <label class="consent-row">
            <input type="checkbox" id="consentEmergency" checked/>
            <span>In case of emergency (SOS), I consent to sharing my medical data with emergency services</span>
          </label>
        </div>

        <div class="onboard-cta-note">
          <span>🔒</span>
          <p>Your health data is encrypted with AES-256-GCM and stored securely. Only you and people you explicitly authorize can access it. We are DPDP 2023 compliant.</p>
        </div>
      </div>

      <!-- Navigation Buttons -->
      <div class="onboard-nav">
        <button class="btn btn-ghost" id="obBtnBack" onclick="window._obBack()" style="visibility:hidden">
          ← Back
        </button>
        <button class="btn btn-primary btn-lg" id="obBtnNext" onclick="window._obNext()">
          <span class="btn-text">Next →</span>
          <span class="btn-spinner" style="display:none"></span>
        </button>
      </div>
    </div>
  `;
}

// ── Chip Selection (Single) ──
window._selectChip = function(groupId, chip) {
  const group = $(groupId);
  if (!group) return;
  group.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
  chip.classList.add('selected');
};

// ── Chip Toggle (Multi) ──
window._toggleMultiChip = function(chip) {
  chip.classList.toggle('selected');
};

// ── Get selected chips from a group ──
function getSelectedChips(groupId) {
  const group = $(groupId);
  if (!group) return [];
  return Array.from(group.querySelectorAll('.chip.selected')).map(c => c.dataset.value);
}

function getSingleChip(groupId) {
  const group = $(groupId);
  if (!group) return '';
  const sel = group.querySelector('.chip.selected');
  return sel ? sel.dataset.value : '';
}

// ── Step Navigation ──
window._obNext = async function() {
  if (currentStep < totalSteps) {
    // Validate current step
    if (!validateStep(currentStep)) return;

    if (currentStep === 3) {
      // Populate review before showing step 4
      populateReview();
    }

    currentStep++;
    updateStepUI();
  } else {
    // Final step — save and complete
    await completeOnboarding();
  }
};

window._obBack = function() {
  if (currentStep > 1) {
    currentStep--;
    updateStepUI();
  }
};

function updateStepUI() {
  // Update step visibility
  for (let i = 1; i <= totalSteps; i++) {
    const step = $(`obStep${i}`);
    if (step) step.classList.toggle('active', i === currentStep);
  }

  // Update progress
  const fill = $('obProgressFill');
  if (fill) fill.style.width = `${(currentStep / totalSteps) * 100}%`;

  // Update dots
  document.querySelectorAll('.onboard-step-dot').forEach(dot => {
    const s = parseInt(dot.dataset.step);
    dot.classList.toggle('active', s === currentStep);
    dot.classList.toggle('done', s < currentStep);
  });

  // Update back button
  const backBtn = $('obBtnBack');
  if (backBtn) backBtn.style.visibility = currentStep > 1 ? 'visible' : 'hidden';

  // Update next button text
  const nextBtn = $('obBtnNext');
  if (nextBtn) {
    const text = nextBtn.querySelector('.btn-text');
    if (text) text.textContent = currentStep === totalSteps ? 'Start Recovery 🚀' : 'Next →';
  }
}

function validateStep(step) {
  switch (step) {
    case 1: {
      const age = $('obAge')?.value;
      const gender = getSingleChip('obGenderGroup');
      if (!age || age < 1 || age > 120) {
        showToast('Please enter your age', 'error');
        return false;
      }
      if (!gender) {
        showToast('Please select your gender', 'error');
        return false;
      }
      return true;
    }
    case 2: {
      const conditions = getSelectedChips('obConditionsGroup');
      if (conditions.length === 0) {
        showToast('Please select at least one health condition', 'error');
        return false;
      }
      return true;
    }
    case 3:
      return true; // All optional
    case 4:
      return true;
    default:
      return true;
  }
}

function populateReview() {
  const review = $('obReviewContent');
  if (!review) return;

  const name = _state.patient?.full_name || 'N/A';
  const age = $('obAge')?.value || '—';
  const gender = getSingleChip('obGenderGroup') || '—';
  const district = $('obDistrict')?.value || '—';
  const blood = $('obBloodGroup')?.value || '—';
  const conditions = getSelectedChips('obConditionsGroup');
  const condLabels = conditions.map(id => {
    const c = CONDITIONS.find(x => x.id === id);
    return c ? `${c.icon} ${c.label}` : id;
  });
  const allergies = $('obAllergies')?.value || 'None';
  const height = $('obHeight')?.value || '—';
  const weight = $('obWeight')?.value || '—';
  const wake = $('obWakeTime')?.value || '06:00';
  const sleep = $('obSleepTime')?.value || '22:00';

  review.innerHTML = `
    <div class="review-section">
      <h3 class="review-label">Profile</h3>
      <div class="review-grid">
        <div class="review-item"><span class="review-key">Name</span><span class="review-val">${escapeHtml(name)}</span></div>
        <div class="review-item"><span class="review-key">Age</span><span class="review-val">${age} years</span></div>
        <div class="review-item"><span class="review-key">Gender</span><span class="review-val">${gender}</span></div>
        <div class="review-item"><span class="review-key">District</span><span class="review-val">${escapeHtml(district)}</span></div>
        <div class="review-item"><span class="review-key">Blood Group</span><span class="review-val">${blood}</span></div>
      </div>
    </div>
    <div class="review-section">
      <h3 class="review-label">Medical</h3>
      <div class="review-chips">${condLabels.map(l => `<span class="tag tag-blue">${l}</span>`).join('')}</div>
      <div class="review-grid" style="margin-top:8px">
        <div class="review-item"><span class="review-key">Allergies</span><span class="review-val">${escapeHtml(allergies)}</span></div>
        <div class="review-item"><span class="review-key">Height</span><span class="review-val">${height} cm</span></div>
        <div class="review-item"><span class="review-key">Weight</span><span class="review-val">${weight} kg</span></div>
      </div>
    </div>
    <div class="review-section">
      <h3 class="review-label">Routine</h3>
      <div class="review-grid">
        <div class="review-item"><span class="review-key">Wake</span><span class="review-val">${wake}</span></div>
        <div class="review-item"><span class="review-key">Sleep</span><span class="review-val">${sleep}</span></div>
      </div>
    </div>
  `;
}

async function completeOnboarding() {
  const btn = $('obBtnNext');
  setLoading(btn, true);

  const patientId = _state.patient?.patient_id;
  if (!patientId) {
    showToast('Session error. Please try registering again.', 'error');
    setLoading(btn, false);
    return;
  }

  // Gather all data
  const allergiesRaw = $('obAllergies')?.value || '';
  const allergies = allergiesRaw ? allergiesRaw.split(',').map(a => a.trim()).filter(Boolean) : [];

  const emergName = $('obEmergName')?.value?.trim();
  const emergPhone = $('obEmergPhone')?.value?.trim();
  const emergRelation = $('obEmergRelation')?.value;
  const emergencyContacts = [];
  if (emergName && emergPhone) {
    emergencyContacts.push({ name: emergName, phone: emergPhone, relation: emergRelation });
  }

  const updateData = {
    age: parseInt($('obAge')?.value) || null,
    gender: getSingleChip('obGenderGroup') || null,
    district: $('obDistrict')?.value?.trim() || null,
    blood_group: $('obBloodGroup')?.value || null,
    primary_conditions: getSelectedChips('obConditionsGroup'),
    allergies: allergies.length ? allergies : null,
    height_cm: parseFloat($('obHeight')?.value) || null,
    weight_kg: parseFloat($('obWeight')?.value) || null,
    wake_time: $('obWakeTime')?.value || '06:00',
    sleep_time: $('obSleepTime')?.value || '22:00',
    meal_times: {
      breakfast: $('obBreakfast')?.value || '08:00',
      lunch: $('obLunch')?.value || '13:00',
      dinner: $('obDinner')?.value || '20:00',
    },
    emergency_contacts: emergencyContacts.length ? emergencyContacts : null,
    consent_family_sharing: $('consentFamilySharing')?.checked || false,
    consent_emergency_share: $('consentEmergency')?.checked || true,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  };

  const { error } = await _supabase.query('recover_patients', {
    method: 'PATCH',
    body: updateData,
    filter: `id=eq.${patientId}`,
  });

  setLoading(btn, false);

  if (error) {
    showToast('Failed to save profile. Please try again.', 'error');
    console.error('Onboarding save error:', error);
    return;
  }

  // Update local state
  Object.assign(_state.patient, updateData);
  localStorage.setItem('curaah_r_patient', JSON.stringify(_state.patient));

  showToast('Profile complete! Let\'s start your recovery journey 🚀', 'success');
  _navigate('home');
}

function setLoading(btn, loading) {
  if (!btn) return;
  const text = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.btn-spinner');
  if (text) text.style.display = loading ? 'none' : '';
  if (spinner) spinner.style.display = loading ? '' : 'none';
  btn.disabled = loading;
}
