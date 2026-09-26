// careconnect/js/register-blood-bank.js
// ONE responsibility: handle the 3-step blood bank registration form.
// Step 1: bank details + login → Step 2: location + GPS → Step 3: inventory + terms → submit.

(function () {
  'use strict';

  // ── DOM refs ──────────────────────────────────────────────────
  const dots  = [1,2,3].map(n => document.getElementById(`dot-${n}`));
  const lines = [1,2].map(n  => document.getElementById(`line-${n}`));
  const bodies= [1,2,3].map(n => document.getElementById(`step-body-${n}`));

  // Step 1
  const bankNameEl   = document.getElementById('bank-name');
  const licenseEl    = document.getElementById('license');
  const affiliationEl= document.getElementById('affiliation');
  const hospitalNameEl= document.getElementById('hospital-name');
  const emailEl      = document.getElementById('email');
  const passwordEl   = document.getElementById('password');

  // Step 2
  const addressEl    = document.getElementById('address');
  const cityEl       = document.getElementById('city');
  const districtEl   = document.getElementById('district');
  const pincodeEl    = document.getElementById('pincode');
  const latEl        = document.getElementById('lat');
  const lngEl        = document.getElementById('lng');
  const hoursEl      = document.getElementById('hours');

  // Step 3
  const inventoryGrid= document.getElementById('inventory-grid');
  const termsEl      = document.getElementById('terms');
  const btnSubmit    = document.getElementById('btn-submit');
  const regError     = document.getElementById('reg-error');
  const regErrorText = document.getElementById('reg-error-text');

  const stateEl      = document.getElementById('state');

  // ── Init ──────────────────────────────────────────────────────
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

  // Build inventory grid for all 8 blood groups
  BLOOD_GROUPS.forEach(bg => {
    const item = document.createElement('div');
    item.className = 'inventory-item';
    item.innerHTML = `
      <span class="blood-badge">${bg}</span>
      <label for="inv-${bg.replace('+','p').replace('-','n')}">Units available</label>
      <input
        type="number"
        id="inv-${bg.replace('+','p').replace('-','n')}"
        class="input"
        placeholder="0"
        min="0"
        max="9999"
        inputmode="numeric"
        data-blood-group="${bg}"
      />
    `;
    inventoryGrid.appendChild(item);
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

    if (!isNotEmpty(bankNameEl.value)) {
      showFieldError('bank-name', 'Please enter the blood bank name.');
      ok = false;
    }
    if (!isNotEmpty(licenseEl.value)) {
      showFieldError('license', 'Licence number is required for verification.');
      ok = false;
    }
    if (!affiliationEl.value) {
      showFieldError('affiliation', 'Please select your affiliation type.');
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

    if (!ok) scrollToFirstError(document.getElementById('step-body-1'));
    return ok;
  }

  document.getElementById('btn-step1-next').addEventListener('click', () => {
    if (validateStep1()) goToStep(2);
  });

  // ── GPS detection ─────────────────────────────────────────────
  const btnDetectGps = document.getElementById('btn-detect-gps');
  btnDetectGps.addEventListener('click', async () => {
    setButtonLoading(btnDetectGps, true);
    const pos = await getCurrentPosition();
    setButtonLoading(btnDetectGps, false);

    if (!pos) {
      showToast('Could not detect your location. Please allow location access or enter coordinates manually.', 'error');
      // Allow manual entry
      latEl.removeAttribute('readonly');
      lngEl.removeAttribute('readonly');
      return;
    }

    latEl.value = pos.lat.toFixed(6);
    lngEl.value = pos.lng.toFixed(6);
    latEl.removeAttribute('readonly');
    lngEl.removeAttribute('readonly');
    showToast('Location detected successfully.', 'success');
    document.getElementById('err-gps').style.display = 'none';
  });

  // ── Step 2 validation ─────────────────────────────────────────
  function validateStep2() {
    let ok = true;
    clearAllErrors(document.getElementById('step-body-2'));

    if (!isNotEmpty(addressEl.value)) {
      showFieldError('address', 'Please enter the blood bank\'s street address.');
      ok = false;
    }
    if (!stateEl.value) {
      showFieldError('state', 'Please select the state.');
      ok = false;
    }
    if (!cityEl.value) {
      showFieldError('city', 'Please select the city.');
      ok = false;
    }
    if (!districtEl.value) {
      showFieldError('district', 'Please select the district.');
      ok = false;
    }
    if (!isNotEmpty(pincodeEl.value) || !/^\d{6}$/.test(pincodeEl.value.trim())) {
      showFieldError('pincode', 'Please enter a valid 6-digit pincode.');
      ok = false;
    }

    // GPS: must have both lat and lng
    const lat = parseFloat(latEl.value);
    const lng = parseFloat(lngEl.value);
    if (isNaN(lat) || isNaN(lng)) {
      const errGps = document.getElementById('err-gps');
      errGps.textContent = 'GPS location is required. Tap "Detect" to auto-fill your location.';
      errGps.style.display = 'block';
      ok = false;
    }

    if (!isNotEmpty(hoursEl.value)) {
      showFieldError('hours', 'Please enter your operating hours (e.g. 24/7 or Mon–Sat 8 AM–8 PM).');
      ok = false;
    }

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
      termsErr.textContent = 'You must confirm your licence and agree to the Terms of Service.';
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

  // ── Collect inventory ─────────────────────────────────────────
  function collectInventory() {
    const inv = {};
    inventoryGrid.querySelectorAll('input[data-blood-group]').forEach(inp => {
      const val = parseInt(inp.value, 10);
      inv[inp.dataset.bloodGroup] = isNaN(val) ? 0 : val;
    });
    return inv;
  }

  // ── Final submit ──────────────────────────────────────────────
  btnSubmit.addEventListener('click', async () => {
    hideRegError();
    if (!validateStep3()) return;

    setButtonLoading(btnSubmit, true);

    const email    = emailEl.value.trim().toLowerCase();
    const password = passwordEl.value;
    const fullName = bankNameEl.value.trim(); // contact name = bank name for blood banks

    // 1. Supabase Auth signUp
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: 'blood_bank' } },
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

    // 2. Insert cc_users
    const { error: userErr } = await supabase.from('cc_users').insert({
      id:          userId,
      role:        'blood_bank',
      full_name:   fullName,
      email,
      city:        cityEl.value,
      district:    districtEl.value,
      state:       stateEl.value,
      pincode:     pincodeEl.value.trim(),
      is_verified: false, // requires admin verification
    });

    if (userErr) {
      setButtonLoading(btnSubmit, false);
      showRegError('Account created but profile could not be saved. Please contact support.');
      return;
    }

    // 3. Insert cc_organizations (blood_bank org_type)
    const { data: orgData, error: orgErr } = await supabase.from('cc_organizations').insert({
      cc_user_id:          userId,
      org_name:            bankNameEl.value.trim(),
      org_type:            'blood_bank',
      registration_number: licenseEl.value.trim(),
      description:         `Affiliation: ${affiliationEl.value}${hospitalNameEl.value ? '. Hospital: ' + hospitalNameEl.value.trim() : ''}. Operating hours: ${hoursEl.value.trim()}.`,
      contact_person_name: fullName,
      contact_email:       email,
      contact_phone:       '+91' + phoneEl.value.trim(),
      address_line1:       addressEl.value.trim(),
      city:                cityEl.value,
      district:            districtEl.value,
      state:               stateEl.value,
      pincode:             pincodeEl.value.trim(),
      lat:                 parseFloat(latEl.value) || null,
      lng:                 parseFloat(lngEl.value) || null,
      coverage_districts:  [districtEl.value],
      verification_status: 'pending',
    }).select('id').single();

    if (orgErr) {
      setButtonLoading(btnSubmit, false);
      showRegError('Account created but blood bank record could not be saved. Please contact support.');
      return;
    }

    // 4. Insert into cc_verification_queue
    await supabase.from('cc_verification_queue').insert({
      org_id:     orgData.id,
      cc_user_id: userId,
      notes_from_org: `Licence: ${licenseEl.value.trim()}. Inventory: ${JSON.stringify(collectInventory())}`,
    });

    // 5. Redirect
    sessionStorage.setItem('cc_pending_email', email);
    window.location.href = '/careconnect/verify-email.html';
  });

  // Clear field errors on input
  [bankNameEl, licenseEl, emailEl, passwordEl, addressEl, cityEl, pincodeEl, hoursEl].forEach(el => {
    el.addEventListener('input', () => clearFieldError(el.id));
  });
  affiliationEl.addEventListener('change', () => clearFieldError('affiliation'));
  districtEl.addEventListener('change',    () => clearFieldError('district'));

})();
