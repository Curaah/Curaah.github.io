// careconnect/js/register-ngo.js
// ONE responsibility: handle the 4-step NGO/organisation registration form.
// Step 1: org info → Step 2: contact + login → Step 3: doc uploads → Step 4: work areas + terms → submit.

(function () {
  'use strict';

  // ── DOM refs ──────────────────────────────────────────────────
  const dots  = [1,2,3,4].map(n => document.getElementById(`dot-${n}`));
  const lines = [1,2,3].map(n => document.getElementById(`line-${n}`));
  const bodies= [1,2,3,4].map(n => document.getElementById(`step-body-${n}`));

  // Step 1
  const orgNameEl    = document.getElementById('org-name');
  const orgTypeEl    = document.getElementById('org-type');
  const regNumberEl  = document.getElementById('reg-number');
  const yearFoundedEl= document.getElementById('year-founded');
  const descriptionEl= document.getElementById('description');
  const descCount    = document.getElementById('desc-count');

  // Step 2
  const contactNameEl= document.getElementById('contact-name');
  const designationEl= document.getElementById('designation');
  const mobileEl     = document.getElementById('mobile');
  const emailEl      = document.getElementById('email');
  const passwordEl   = document.getElementById('password');

  // Step 3 — file inputs
  const file12a   = document.getElementById('file-12a');
  const file80g   = document.getElementById('file-80g');
  const fileOther = document.getElementById('file-other');

  // Step 4
  const workAreasGrid  = document.getElementById('work-areas-grid');
  const coverageGrid   = document.getElementById('coverage-grid');
  const termsEl        = document.getElementById('terms');
  const btnSubmit      = document.getElementById('btn-submit');
  const regError       = document.getElementById('reg-error');
  const regErrorText   = document.getElementById('reg-error-text');

  const stateEl        = document.getElementById('state');

  // ── Init ──────────────────────────────────────────────────────
  // Remove 'blood_bank' from org types on NGO form (it has its own page)
  const NGO_ORG_TYPES = ORG_TYPES.filter(t => t.id !== 'blood_bank');
  populateSelect(orgTypeEl, NGO_ORG_TYPES, 'Select organisation type…');
  buildChipGrid(workAreasGrid, NGO_WORK_AREAS);
  
  async function initLocations() {
    stateEl.disabled = true;
    populateSelect(stateEl, [], 'Loading states...');
    const states = await window.LOCATION_API.getStates();
    populateSelect(stateEl, states, 'Select operating state…');
    stateEl.disabled = false;
  }
  
  stateEl.addEventListener('change', async () => {
    clearFieldError('state');
    coverageGrid.innerHTML = 'Loading districts...';
    
    if (!stateEl.value) return;
    
    const districts = await window.LOCATION_API.getDistricts(stateEl.value);
    buildChipGrid(coverageGrid, districts);
    document.getElementById('coverage-hint').style.display = 'none';
  });

  initLocations();

  // Description char counter
  descriptionEl.addEventListener('input', () => {
    descCount.textContent = descriptionEl.value.length;
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

    if (!isNotEmpty(orgNameEl.value)) {
      showFieldError('org-name', 'Please enter your organisation name.');
      ok = false;
    }
    if (!orgTypeEl.value) {
      showFieldError('org-type', 'Please select your organisation type.');
      ok = false;
    }
    if (!isNotEmpty(descriptionEl.value) || descriptionEl.value.trim().length < 20) {
      showFieldError('description', 'Please describe your organisation in at least 20 characters.');
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

    if (!isNotEmpty(contactNameEl.value)) {
      showFieldError('contact-name', 'Please enter the contact person\'s name.');
      ok = false;
    }
    if (!isValidPhone(mobileEl.value)) {
      showFieldError('mobile', 'Please enter a valid 10-digit Indian mobile number.');
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

    if (!ok) scrollToFirstError(document.getElementById('step-body-2'));
    return ok;
  }

  document.getElementById('btn-step2-back').addEventListener('click', () => goToStep(1));
  document.getElementById('btn-step2-next').addEventListener('click', () => {
    if (validateStep2()) goToStep(3);
  });

  // ── Step 3: file upload zone handlers ─────────────────────────
  function wireFileInput(inputEl, zoneId) {
    inputEl.addEventListener('change', () => {
      const file = inputEl.files[0];
      if (!file) return;
      if (!isFileSizeValid(file)) {
        showToast(`${file.name} is too large. Max size is 5 MB.`, 'error');
        inputEl.value = '';
        return;
      }
      markUploadZoneReady(zoneId, file.name);
    });
  }

  wireFileInput(file12a,   'zone-12a');
  wireFileInput(file80g,   'zone-80g');
  wireFileInput(fileOther, 'zone-other');

  function validateStep3() {
    const has12a   = file12a.files.length > 0;
    const has80g   = file80g.files.length > 0;
    const hasOther = fileOther.files.length > 0;
    const errBox   = document.getElementById('err-docs');
    const errText  = document.getElementById('err-docs-text');

    if (!has12a && !has80g && !hasOther) {
      errText.textContent = 'Please upload at least one verification document — a 12A certificate, 80G certificate, or any other government-issued proof.';
      errBox.style.display = 'flex';
      errBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    errBox.style.display = 'none';
    return true;
  }

  document.getElementById('btn-step3-back').addEventListener('click', () => goToStep(2));
  document.getElementById('btn-step3-next').addEventListener('click', () => {
    if (validateStep3()) goToStep(4);
  });

  // ── Step 4 validation ─────────────────────────────────────────
  function validateStep4() {
    let ok = true;
    const workErr = document.getElementById('err-work-areas');
    const covErr  = document.getElementById('err-coverage');
    const termsErr= document.getElementById('err-terms');

    if (workAreasGrid.getSelected().length === 0) {
      workErr.textContent = 'Please select at least one health focus area.';
      workErr.style.display = 'block';
      ok = false;
    } else { workErr.style.display = 'none'; }
    if (!stateEl.value) {
      showFieldError('state', 'Please select the operating state.');
      ok = false;
    }
    if (coverageGrid.getSelected().length === 0) {
      covErr.textContent = 'Please select at least one district where you operate.';
      covErr.style.display = 'block';
      ok = false;
    } else { covErr.style.display = 'none'; }

    if (!termsEl.checked) {
      termsErr.textContent = 'You must agree to the Terms of Service to register your organisation.';
      termsErr.style.display = 'block';
      ok = false;
    } else { termsErr.style.display = 'none'; }

    return ok;
  }

  document.getElementById('btn-step4-back').addEventListener('click', () => goToStep(3));

  // Terms visual toggle
  termsEl.addEventListener('change', () => {
    document.getElementById('terms-label').classList.toggle('checked', termsEl.checked);
  });

  // ── Global error helpers ──────────────────────────────────────
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

  // ── Upload a single document ──────────────────────────────────
  async function uploadDoc(file, userId, docType) {
    if (!file) return null;
    const path = `${userId}/${docType}/${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`;
    return await uploadToStorage(file, 'cc-org-docs', path);
  }

  // ── Final submit ──────────────────────────────────────────────
  btnSubmit.addEventListener('click', async () => {
    hideRegError();
    if (!validateStep4()) return;

    setButtonLoading(btnSubmit, true);

    const email    = emailEl.value.trim().toLowerCase();
    const password = passwordEl.value;
    const fullName = contactNameEl.value.trim();

    // 1. Create Supabase Auth user
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: 'ngo' } },
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

    // 2. Upload documents
    const [url12a, url80g, urlOther] = await Promise.all([
      uploadDoc(file12a.files[0],   userId, '12a'),
      uploadDoc(file80g.files[0],   userId, '80g'),
      uploadDoc(fileOther.files[0], userId, 'other'),
    ]);

    // 3. Insert cc_users (NGOs are NOT auto-verified)
    const { error: userErr } = await supabase.from('cc_users').insert({
      id:          userId,
      role:        'ngo',
      full_name:   fullName,
      email,
      phone:       '+91' + mobileEl.value.trim(),
      city:        '',       // org city set in cc_organizations
      district:    coverageGrid.getSelected()[0] || 'Amritsar',
      state:       stateEl.value,
      is_verified: false,   // requires admin review
    });

    if (userErr) {
      setButtonLoading(btnSubmit, false);
      showRegError('We created your account but could not save your profile. Please contact support.');
      return;
    }

    // 4. Insert cc_organizations
    const { data: orgData, error: orgErr } = await supabase.from('cc_organizations').insert({
      cc_user_id:          userId,
      org_name:            orgNameEl.value.trim(),
      org_type:            orgTypeEl.value,
      registration_number: regNumberEl.value.trim() || null,
      year_founded:        yearFoundedEl.value ? parseInt(yearFoundedEl.value, 10) : null,
      description:         descriptionEl.value.trim(),
      contact_person_name: fullName,
      contact_designation: designationEl.value.trim() || null,
      contact_phone:       '+91' + mobileEl.value.trim(),
      contact_email:       email,
      city:                '',
      district:            coverageGrid.getSelected()[0] || 'Amritsar',
      state:               stateEl.value,
      work_areas:          workAreasGrid.getSelected(),
      coverage_districts:  coverageGrid.getSelected(),
      doc_12a_url:         url12a  || null,
      doc_80g_url:         url80g  || null,
      doc_other_url:       urlOther || null,
      verification_status: 'pending',
    }).select('id').single();

    if (orgErr) {
      setButtonLoading(btnSubmit, false);
      showRegError('Your account was created but the organisation record could not be saved. Please contact support.');
      return;
    }

    // 5. Insert cc_verification_queue
    await supabase.from('cc_verification_queue').insert({
      org_id:     orgData.id,
      cc_user_id: userId,
    });

    // 6. Redirect to verify-email
    sessionStorage.setItem('cc_pending_email', email);
    window.location.href = '/careconnect/verify-email.html';
  });

  // Clear field errors on input
  [orgNameEl, contactNameEl, mobileEl, emailEl, passwordEl, descriptionEl].forEach(el => {
    el.addEventListener('input', () => clearFieldError(el.id));
  });
  orgTypeEl.addEventListener('change', () => clearFieldError('org-type'));

})();
