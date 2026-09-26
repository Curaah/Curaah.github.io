// careconnect/js/register-professional.js
// ONE responsibility: handle the 3-step healthcare professional registration form.
// Step 1: credentials + login → Step 2: practice details → Step 3: photo + bio + terms → submit.

(function () {
  'use strict';

  // ── Availability types ────────────────────────────────────────
  const AVAIL_TYPES = [
    { id: 'content',      label: '✍️ Health Content' },
    { id: 'camps',        label: '🏕️ Health Camps' },
    { id: 'webinars',     label: '🎥 Webinars / Talks' },
    { id: 'consultation', label: '💬 Patient Consultation' },
    { id: 'screening',    label: '🔬 Screening Programmes' },
  ];

  // ── DOM refs ──────────────────────────────────────────────────
  const dots  = [1,2,3].map(n => document.getElementById(`dot-${n}`));
  const lines = [1,2].map(n  => document.getElementById(`line-${n}`));
  const bodies= [1,2,3].map(n => document.getElementById(`step-body-${n}`));

  // Step 1
  const fullNameEl    = document.getElementById('full-name');
  const specialtyEl   = document.getElementById('specialty');
  const councilNumEl  = document.getElementById('council-number');
  const experienceEl  = document.getElementById('experience');
  const emailEl       = document.getElementById('email');
  const phoneEl       = document.getElementById('phone');
  const passwordEl    = document.getElementById('password');

  // Step 2
  const affiliationEl    = document.getElementById('affiliation');
  const practiceCityEl   = document.getElementById('practice-city');
  const practiceDistrictEl= document.getElementById('practice-district');
  const availGrid         = document.getElementById('availability-grid');

  // Step 3
  const photoFileEl  = document.getElementById('photo-file');
  const photoPreview = document.getElementById('photo-preview');
  const photoZone    = document.getElementById('photo-zone');
  const bioEl        = document.getElementById('bio');
  const bioCount     = document.getElementById('bio-count');
  const termsEl      = document.getElementById('terms');
  const btnSubmit    = document.getElementById('btn-submit');
  const regError     = document.getElementById('reg-error');
  const regErrorText = document.getElementById('reg-error-text');

  const practiceStateEl   = document.getElementById('practice-state');

  // ── Init ──────────────────────────────────────────────────────
  populateSelect(specialtyEl, PROFESSIONAL_SPECIALTIES, 'Select specialty…');
  
  async function initLocations() {
    practiceStateEl.disabled = true;
    populateSelect(practiceStateEl, [], 'Loading states...');
    const states = await window.LOCATION_API.getStates();
    populateSelect(practiceStateEl, states, 'Select state…');
    practiceStateEl.disabled = false;
  }
  
  practiceStateEl.addEventListener('change', async () => {
    clearFieldError('practice-state');
    practiceDistrictEl.disabled = true;
    practiceCityEl.disabled = true;
    populateSelect(practiceDistrictEl, [], 'Loading districts...');
    populateSelect(practiceCityEl, [], 'Select city / town…');
    
    if (!practiceStateEl.value) return;
    
    const districts = await window.LOCATION_API.getDistricts(practiceStateEl.value);
    populateSelect(practiceDistrictEl, districts, 'Select district…');
    practiceDistrictEl.disabled = false;
    
    window.LOCATION_API.getCities(practiceStateEl.value);
  });
  
  practiceDistrictEl.addEventListener('change', async () => {
    clearFieldError('practice-district');
    practiceCityEl.disabled = true;
    populateSelect(practiceCityEl, [], 'Loading cities...');
    
    if (!practiceDistrictEl.value) return;
    
    const cities = await window.LOCATION_API.getCities(practiceStateEl.value);
    populateSelect(practiceCityEl, cities, 'Select city / town…');
    practiceCityEl.disabled = false;
  });

  initLocations();
  buildChipGrid(availGrid, AVAIL_TYPES);

  // Bio character counter
  bioEl.addEventListener('input', () => {
    bioCount.textContent = bioEl.value.length;
  });

  // Photo preview
  photoFileEl.addEventListener('change', () => {
    const file = photoFileEl.files[0];
    if (!file) return;
    if (!isFileSizeValid(file)) {
      showToast(`${file.name} is too large. Maximum size is 5 MB.`, 'error');
      photoFileEl.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      photoPreview.src = e.target.result;
      photoZone.classList.add('has-file');
    };
    reader.readAsDataURL(file);
  });

  // ── Step navigation ───────────────────────────────────────────
  let currentStep = 1;

  function goToStep(n) {
    dots.forEach((d, i) => {
      d.classList.remove('active','done');
      if (i + 1 < n)       d.classList.add('done');
      else if (i + 1 === n) d.classList.add('active');
    });
    lines.forEach((l, i) => l.classList.toggle('done', i + 1 < n));
    bodies.forEach((b, i) => b.classList.toggle('active', i + 1 === n));
    currentStep = n;
    window.scrollTo(0, 0);
  }

  document.getElementById('btn-back').addEventListener('click', () => {
    if (currentStep > 1) goToStep(currentStep - 1);
    else window.location.href = '/careconnect/register.html';
  });

  // ── Step 1 validation ─────────────────────────────────────────
  function validateStep1() {
    let ok = true;
    clearAllErrors(document.getElementById('step-body-1'));

    if (!isNotEmpty(fullNameEl.value)) {
      showFieldError('full-name', 'Please enter your full name as it appears on your council registration.');
      ok = false;
    }
    if (!specialtyEl.value) {
      showFieldError('specialty', 'Please select your medical specialty.');
      ok = false;
    }
    if (!isNotEmpty(councilNumEl.value)) {
      showFieldError('council-number', 'Medical council registration number is required for verification.');
      ok = false;
    }
    if (!isValidEmail(emailEl.value)) {
      showFieldError('email', 'Please enter a valid email address.');
      ok = false;
    }
    if (!isValidPhone(phoneEl.value)) {
      showFieldError('phone', 'Please enter a valid 10-digit mobile number.');
      ok = false;
    }
    if (!isValidPassword(passwordEl.value)) {
      showFieldError('password', 'Password must be at least 8 characters long.');
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
    let ok = true;
    clearAllErrors(document.getElementById('step-body-2'));

    if (!practiceStateEl.value) {
      showFieldError('practice-state', 'Please select your practice state.');
      ok = false;
    }
    if (!practiceCityEl.value) {
      showFieldError('practice-city', 'Please select your practice city or town.');
      ok = false;
    }
    if (!practiceDistrictEl.value) {
      showFieldError('practice-district', 'Please select your practice district.');
      ok = false;
    }

    const availErr = document.getElementById('err-availability');
    if (availGrid.getSelected().length === 0) {
      availErr.textContent = 'Please select at least one way you want to contribute.';
      availErr.style.display = 'block';
      ok = false;
    } else { availErr.style.display = 'none'; }

    if (!ok) scrollToFirstError(document.getElementById('step-body-2'));
    return ok;
  }

  document.getElementById('btn-step2-back').addEventListener('click', () => goToStep(1));
  document.getElementById('btn-step2-next').addEventListener('click', () => {
    if (validateStep2()) goToStep(3);
  });

  // ── Step 3 validation ─────────────────────────────────────────
  function validateStep3() {
    const termsErr = document.getElementById('err-terms');
    if (!termsEl.checked) {
      termsErr.textContent = 'You must confirm you are a licensed professional and agree to the Terms of Service.';
      termsErr.style.display = 'block';
      return false;
    }
    termsErr.style.display = 'none';
    return true;
  }

  document.getElementById('btn-step3-back').addEventListener('click', () => goToStep(2));

  termsEl.addEventListener('change', () => {
    document.getElementById('terms-label').classList.toggle('checked', termsEl.checked);
  });

  // ── Error helpers ─────────────────────────────────────────────
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
    if (m.includes('rate limit'))
      return 'Too many attempts. Please wait a minute and try again.';
    return 'Registration failed. Please check your details and try again.';
  }

  // ── Final submit ──────────────────────────────────────────────
  btnSubmit.addEventListener('click', async () => {
    hideRegError();
    if (!validateStep3()) return;

    setButtonLoading(btnSubmit, true);

    const email    = emailEl.value.trim().toLowerCase();
    const password = passwordEl.value;
    const fullName = fullNameEl.value.trim();

    // 1. Supabase Auth signUp
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: 'professional' } },
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

    // 2. Upload profile photo if provided
    let profilePhotoUrl = null;
    if (photoFileEl.files[0]) {
      const file = photoFileEl.files[0];
      const path = `${userId}/photo.${file.name.split('.').pop()}`;
      profilePhotoUrl = await uploadToStorage(file, 'profile-photos', path);
    }

    // 3. Insert cc_users (professionals are NOT auto-verified)
    const { error: userErr } = await supabase.from('cc_users').insert({
      id:            userId,
      role:          'professional',
      full_name:     fullName,
      email,
      phone:         '+91' + phoneEl.value.trim(),
      city:          practiceCityEl.value,
      district:      practiceDistrictEl.value,
      state:         practiceStateEl.value,
      profile_photo: profilePhotoUrl,
      is_verified:   false, // requires admin verification of council number
    });

    if (userErr) {
      setButtonLoading(btnSubmit, false);
      showRegError('Account created but profile could not be saved. Please contact support.');
      return;
    }

    // 4. Insert cc_organizations (role=professional uses clinic org type)
    const { data: orgData, error: orgErr } = await supabase.from('cc_organizations').insert({
      cc_user_id:          userId,
      org_name:            `${fullName} — ${PROFESSIONAL_SPECIALTIES.find(s => s.id === specialtyEl.value)?.label || specialtyEl.value}`,
      org_type:            'clinic',
      registration_number: councilNumEl.value.trim(),
      description:         bioEl.value.trim() || null,
      contact_person_name: fullName,
      contact_email:       email,
      contact_phone:       '+91' + phoneEl.value.trim(),
      city:                practiceCityEl.value,
      district:            practiceDistrictEl.value,
      state:               practiceStateEl.value,
      work_areas:          availGrid.getSelected(),
      coverage_districts:  [practiceDistrictEl.value],
      verification_status: 'pending',
    }).select('id').single();

    if (orgErr) {
      setButtonLoading(btnSubmit, false);
      showRegError('Account created but professional record could not be saved. Please contact support.');
      return;
    }

    // 5. Insert cc_verification_queue
    await supabase.from('cc_verification_queue').insert({
      org_id:         orgData.id,
      cc_user_id:     userId,
      notes_from_org: `Specialty: ${specialtyEl.value}. Council No: ${councilNumEl.value.trim()}. Experience: ${experienceEl.value || 'not specified'} years. Affiliation: ${affiliationEl.value || 'not specified'}.`,
    });

    // 6. Redirect
    sessionStorage.setItem('cc_pending_email', email);
    window.location.href = '/careconnect/verify-email.html';
  });

  // Clear field errors on input
  [fullNameEl, councilNumEl, emailEl, passwordEl, practiceCityEl].forEach(el => {
    el.addEventListener('input', () => clearFieldError(el.id));
  });
  specialtyEl.addEventListener('change',          () => clearFieldError('specialty'));
  practiceDistrictEl.addEventListener('change',   () => clearFieldError('practice-district'));

})();
