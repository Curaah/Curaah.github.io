// careconnect/js/register-volunteer.js
// ONE responsibility: handle the 5-step volunteer registration form.
// Validates each step, then on submit: signUp → insert cc_users → insert cc_volunteers → verify-email.

(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────
  const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const TIMES = ['Morning (6–12)','Afternoon (12–17)','Evening (17–21)','Flexible'];
  const DAY_IDS  = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const TIME_IDS = ['morning','afternoon','evening','flexible'];

  // ── DOM refs ──────────────────────────────────────────────────
  const dots      = [1,2,3,4,5].map(n => document.getElementById(`dot-${n}`));
  const lines     = [1,2,3,4].map(n => document.getElementById(`line-${n}`));
  const bodies    = [1,2,3,4,5].map(n => document.getElementById(`step-body-${n}`));

  // Step 1
  const fullNameEl  = document.getElementById('full-name');
  const emailEl     = document.getElementById('email');
  const passwordEl  = document.getElementById('password');
  const phoneEl     = document.getElementById('phone');
  const cityEl      = document.getElementById('city');
  const districtEl  = document.getElementById('district');
  const stateEl     = document.getElementById('state');

  // Step 2
  const skillsGrid  = document.getElementById('skills-grid');

  // Step 3
  const daysGrid    = document.getElementById('days-grid');
  const timesGrid   = document.getElementById('times-grid');
  const travelEl    = document.getElementById('travel-radius');

  // Step 4
  const bloodOptEl  = document.getElementById('blood-opted');
  const bloodFields = document.getElementById('blood-fields');
  const bloodGroupEl= document.getElementById('blood-group');
  const lastDonatedEl= document.getElementById('last-donated');
  const alertRadiusEl= document.getElementById('alert-radius');

  // Step 5
  const consentLevels = document.querySelectorAll('.consent-level[data-level]');
  const termsEl      = document.getElementById('terms');
  const btnSubmit    = document.getElementById('btn-submit');
  const regError     = document.getElementById('reg-error');
  const regErrorText = document.getElementById('reg-error-text');

  // ── State ─────────────────────────────────────────────────────
  let currentStep = 1;
  let selectedConsent = 'relay_only'; // default per spec

  // ── Initialise selects and chip grids ─────────────────────────
  async function initLocations() {
    stateEl.disabled = true;
    populateSelect(stateEl, [], 'Loading states...');
    const states = await window.LOCATION_API.getStates();
    populateSelect(stateEl, states, 'Select state…');
    stateEl.disabled = false;
  }
  
  stateEl.addEventListener('change', async () => {
    clearFieldError('state');
    districtEl.disabled = true;
    cityEl.disabled = true;
    populateSelect(districtEl, [], 'Loading districts...');
    populateSelect(cityEl, [], 'Select city / town…');
    
    if (!stateEl.value) return;
    
    const districts = await window.LOCATION_API.getDistricts(stateEl.value);
    populateSelect(districtEl, districts, 'Select district…');
    districtEl.disabled = false;
    
    // Also preload cities in the background so they are ready
    window.LOCATION_API.getCities(stateEl.value);
  });
  
  districtEl.addEventListener('change', async () => {
    clearFieldError('district');
    cityEl.disabled = true;
    populateSelect(cityEl, [], 'Loading cities...');
    
    if (!districtEl.value) return;
    
    const cities = await window.LOCATION_API.getCities(stateEl.value);
    populateSelect(cityEl, cities, 'Select city / town…');
    cityEl.disabled = false;
  });

  initLocations();

  buildChipGrid(skillsGrid, VOLUNTEER_SKILLS);
  buildChipGrid(daysGrid,   DAYS.map((label, i) => ({ id: DAY_IDS[i], label })));
  buildChipGrid(timesGrid,  TIMES.map((label, i) => ({ id: TIME_IDS[i], label })));

  populateSelect(bloodGroupEl, BLOOD_GROUPS, 'Select blood group…');

  // ── Step navigation ───────────────────────────────────────────
  function goToStep(n) {
    // Dots and lines
    dots.forEach((d, i) => {
      d.classList.remove('active','done');
      if (i + 1 < n)      d.classList.add('done');
      else if (i + 1 === n) d.classList.add('active');
    });
    lines.forEach((l, i) => {
      l.classList.toggle('done', i + 1 < n);
    });

    // Bodies
    bodies.forEach((b, i) => {
      b.classList.toggle('active', i + 1 === n);
    });

    currentStep = n;
    window.scrollTo(0, 0);
  }

  // Back button in nav
  document.getElementById('btn-back').addEventListener('click', () => {
    if (currentStep > 1) goToStep(currentStep - 1);
    else window.location.href = '/careconnect/register.html';
  });

  // ── Step 1 validation ─────────────────────────────────────────
  function validateStep1() {
    let ok = true;

    clearAllErrors(document.getElementById('step-body-1'));

    if (!isNotEmpty(fullNameEl.value)) {
      showFieldError('full-name', 'Please enter your full name.');
      ok = false;
    }
    if (!isValidEmail(emailEl.value)) {
      showFieldError('email', 'Please enter a valid email address.');
      ok = false;
    }
    if (!isValidPassword(passwordEl.value)) {
      showFieldError('password', 'Password must be at least 8 characters long.');
      ok = false;
    }
    if (!isValidPhone(phoneEl.value)) {
      showFieldError('phone', 'Please enter a valid 10-digit Indian mobile number.');
      ok = false;
    }
    if (!cityEl.value) {
      showFieldError('city', 'Please select your city or town.');
      ok = false;
    }
    if (!districtEl.value) {
      showFieldError('district', 'Please select your district.');
      ok = false;
    }
    if (!stateEl.value) {
      showFieldError('state', 'Please select your state.');
      ok = false;
    }

    if (!ok) scrollToFirstError(document.getElementById('step-body-1'));
    return ok;
  }

  document.getElementById('btn-step1-next').addEventListener('click', () => {
    if (validateStep1()) goToStep(2);
  });

  // ── Step 2 validation ─────────────────────────────────────────
  function validateStep2() {
    const errEl = document.getElementById('err-skills');
    if (skillsGrid.getSelected().length === 0) {
      errEl.textContent = 'Please select at least one skill.';
      errEl.style.display = 'block';
      return false;
    }
    errEl.style.display = 'none';
    return true;
  }

  document.getElementById('btn-step2-back').addEventListener('click', () => goToStep(1));
  document.getElementById('btn-step2-next').addEventListener('click', () => {
    if (validateStep2()) goToStep(3);
  });

  // ── Step 3 validation ─────────────────────────────────────────
  function validateStep3() {
    let ok = true;
    const daysErr  = document.getElementById('err-days');
    const timesErr = document.getElementById('err-times');

    if (daysGrid.getSelected().length === 0) {
      daysErr.textContent = 'Please select at least one day.';
      daysErr.style.display = 'block';
      ok = false;
    } else { daysErr.style.display = 'none'; }

    if (timesGrid.getSelected().length === 0) {
      timesErr.textContent = 'Please select at least one preferred time.';
      timesErr.style.display = 'block';
      ok = false;
    } else { timesErr.style.display = 'none'; }

    if (!travelEl.value) {
      showFieldError('travel-radius', 'Please select your maximum travel distance.');
      ok = false;
    }

    return ok;
  }

  document.getElementById('btn-step3-back').addEventListener('click', () => goToStep(2));
  document.getElementById('btn-step3-next').addEventListener('click', () => {
    if (validateStep3()) goToStep(4);
  });

  // ── Step 4: blood toggle ──────────────────────────────────────
  bloodOptEl.addEventListener('change', () => {
    bloodFields.classList.toggle('visible', bloodOptEl.checked);
  });

  function validateStep4() {
    if (!bloodOptEl.checked) return true; // optional step
    let ok = true;
    if (!bloodGroupEl.value) {
      showFieldError('blood-group', 'Please select your blood group.');
      ok = false;
    }
    if (!alertRadiusEl.value) {
      showFieldError('alert-radius', 'Please select an alert radius.');
      ok = false;
    }
    return ok;
  }

  document.getElementById('btn-step4-back').addEventListener('click', () => goToStep(3));
  document.getElementById('btn-step4-next').addEventListener('click', () => {
    if (validateStep4()) goToStep(5);
  });

  // ── Step 5: consent dial ──────────────────────────────────────
  consentLevels.forEach(level => {
    level.addEventListener('click', () => {
      consentLevels.forEach(l => l.classList.remove('active'));
      level.classList.add('active');
      selectedConsent = level.dataset.level;
    });
  });

  // Terms checkbox visual toggle
  termsEl.addEventListener('change', () => {
    document.getElementById('terms-label').classList.toggle('checked', termsEl.checked);
  });

  function validateStep5() {
    const errEl = document.getElementById('err-terms');
    if (!termsEl.checked) {
      errEl.textContent = 'You must agree to the Terms of Service to create an account.';
      errEl.style.display = 'block';
      return false;
    }
    errEl.style.display = 'none';
    return true;
  }

  document.getElementById('btn-step5-back').addEventListener('click', () => goToStep(4));

  // ── Error display helpers ─────────────────────────────────────
  function showRegError(msg) {
    regErrorText.textContent = msg;
    regError.style.display = 'flex';
    regError.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function hideRegError() { regError.style.display = 'none'; }

  function mapAuthError(message) {
    if (!message) return 'Something went wrong. Please try again.';
    const m = message.toLowerCase();
    if (m.includes('user already registered') || m.includes('already been registered'))
      return 'An account with this email already exists. Please sign in instead.';
    if (m.includes('invalid email'))
      return 'Please enter a valid email address.';
    if (m.includes('password'))
      return 'Your password does not meet the requirements. Please use at least 8 characters.';
    if (m.includes('rate limit'))
      return 'Too many attempts. Please wait a minute and try again.';
    return 'Registration failed. Please check your details and try again.';
  }

  // ── Final submit ──────────────────────────────────────────────
  btnSubmit.addEventListener('click', async () => {
    hideRegError();
    if (!validateStep5()) return;

    setButtonLoading(btnSubmit, true);

    const email    = emailEl.value.trim().toLowerCase();
    const password = passwordEl.value;
    const fullName = fullNameEl.value.trim();

    // 1. Create Supabase Auth user
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: 'volunteer' },
      },
    });

    if (authErr) {
      setButtonLoading(btnSubmit, false);
      showRegError(mapAuthError(authErr.message));
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      setButtonLoading(btnSubmit, false);
      showRegError('Account creation failed. Please try again.');
      return;
    }

    // 2. Insert cc_users row (volunteers are auto-verified)
    const { error: userErr } = await supabase.from('cc_users').insert({
      id:           userId,
      role:         'volunteer',
      full_name:    fullName,
      email,
      phone:        '+91' + phoneEl.value.trim(),
      city:         cityEl.value.trim(),
      district:     districtEl.value,
      state:        stateEl.value,
      is_verified:  true,  // volunteers auto-verified per spec
    });

    if (userErr) {
      setButtonLoading(btnSubmit, false);
      showRegError('We created your account but could not save your profile. Please contact support.');
      return;
    }

    // 3. Insert cc_volunteers row
    const volunteerPayload = {
      cc_user_id:            userId,
      skills:                skillsGrid.getSelected(),
      available_days:        daysGrid.getSelected(),
      available_times:       timesGrid.getSelected(),
      max_travel_km:         parseInt(travelEl.value, 10),
      default_consent_level: selectedConsent,
      blood_donation_opted:  bloodOptEl.checked,
    };

    if (bloodOptEl.checked) {
      volunteerPayload.blood_group = bloodGroupEl.value || null;
      // blood_donation_radius and last_donated_at are optional in schema
    }

    const { error: volErr } = await supabase.from('cc_volunteers').insert(volunteerPayload);

    if (volErr) {
      // Non-fatal: user exists, volunteer row failed. Show partial-success warning.
      setButtonLoading(btnSubmit, false);
      showRegError('Account created but volunteer profile is incomplete. Please contact support.');
      return;
    }

    // 4. Redirect to verify-email screen
    sessionStorage.setItem('cc_pending_email', email);
    window.location.href = '/careconnect/verify-email.html';
  });

  // Clear field errors on input
  [fullNameEl, emailEl, passwordEl, phoneEl, cityEl].forEach(el => {
    el.addEventListener('input', () => clearFieldError(el.id));
  });
  districtEl.addEventListener('change', () => clearFieldError('district'));
  stateEl.addEventListener('change',    () => clearFieldError('state'));
  travelEl.addEventListener('change',   () => clearFieldError('travel-radius'));
  bloodGroupEl.addEventListener('change',   () => clearFieldError('blood-group'));
  alertRadiusEl.addEventListener('change',  () => clearFieldError('alert-radius'));

})();
