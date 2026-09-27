// careconnect/js/create-action.js
// ONE responsibility: handle the 2-step Create Community Action form.
// NGO role only. Supports edit mode via ?edit=<action_id> query param.

(function () {
  'use strict';

  const dots  = [1, 2].map(n => document.getElementById(`dot-${n}`));
  const lines = [document.getElementById('line-1')];
  const bodies= [1, 2].map(n => document.getElementById(`step-body-${n}`));

  let selectedType = null;
  let editActionId = null;
  let orgId        = null;

  // ── Step navigation ───────────────────────────────────────────
  function goToStep(n) {
    dots.forEach((d, i) => {
      d.classList.remove('active', 'done');
      if (i + 1 < n)       d.classList.add('done');
      else if (i + 1 === n) d.classList.add('active');
    });
    lines[0].classList.toggle('done', n > 1);
    bodies.forEach((b, i) => b.classList.toggle('active', i + 1 === n));
    window.scrollTo(0, 0);
  }

  // ── Char counters ──────────────────────────────────────────────
  document.getElementById('title').addEventListener('input', function () {
    document.getElementById('title-count').textContent = this.value.length;
  });
  document.getElementById('description').addEventListener('input', function () {
    document.getElementById('desc-count').textContent = this.value.length;
  });

  // ── Type card selection ────────────────────────────────────────
  document.getElementById('type-grid').addEventListener('click', (e) => {
    const card = e.target.closest('.type-card[data-type]');
    if (!card) return;
    selectedType = card.dataset.type;
    document.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    document.getElementById('err-type').style.display = 'none';
  });

  // ── Populate district select ───────────────────────────────────
  populateSelect(document.getElementById('district'), PUNJAB_DISTRICTS, 'Select district…');

  // ── Step 1 validation ─────────────────────────────────────────
  function validateStep1() {
    let ok = true;
    const errType = document.getElementById('err-type');
    const titleEl = document.getElementById('title');
    const descEl  = document.getElementById('description');

    if (!selectedType) {
      errType.textContent = 'Please select an event type.';
      errType.style.display = 'block';
      ok = false;
    } else { errType.style.display = 'none'; }

    clearFieldError('title');
    clearFieldError('description');

    if (!isNotEmpty(titleEl.value) || titleEl.value.trim().length < 5) {
      showFieldError('title', 'Please enter a title with at least 5 characters.');
      ok = false;
    }
    if (!isNotEmpty(descEl.value) || descEl.value.trim().length < 20) {
      showFieldError('description', 'Please describe the event in at least 20 characters.');
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

    const dateEl    = document.getElementById('event-date');
    const venueEl   = document.getElementById('venue');
    const distEl    = document.getElementById('district');

    if (!dateEl.value) {
      showFieldError('event-date', 'Please select an event date.');
      ok = false;
    } else {
      const today = new Date().toISOString().split('T')[0];
      if (dateEl.value < today) {
        showFieldError('event-date', 'The event date cannot be in the past.');
        ok = false;
      }
    }

    if (!isNotEmpty(venueEl.value)) {
      showFieldError('venue', 'Please enter the venue or address.');
      ok = false;
    }
    if (!distEl.value) {
      showFieldError('district', 'Please select the district where this event will be held.');
      ok = false;
    }

    if (!ok) scrollToFirstError(document.getElementById('step-body-2'));
    return ok;
  }

  document.getElementById('btn-step2-back').addEventListener('click', () => goToStep(1));

  // ── Show/hide submit error ─────────────────────────────────────
  function showSubmitError(msg) {
    const box = document.getElementById('submit-error');
    document.getElementById('submit-error-text').textContent = msg;
    box.style.display = 'flex';
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function hideSubmitError() { document.getElementById('submit-error').style.display = 'none'; }

  // ── Submit ─────────────────────────────────────────────────────
  document.getElementById('btn-submit').addEventListener('click', async function () {
    hideSubmitError();
    if (!validateStep2()) return;
    if (!orgId) {
      showSubmitError('Your organisation ID could not be found. Please reload the page and try again.');
      return;
    }

    setButtonLoading(this, true);

    const payload = {
      org_id:               orgId,
      action_type:          selectedType,
      title:                document.getElementById('title').value.trim(),
      description:          document.getElementById('description').value.trim(),
      event_date:           document.getElementById('event-date').value,
      start_time:           document.getElementById('event-time').value || null,
      location_name:        document.getElementById('venue').value.trim(),
      district:             document.getElementById('district').value,
      volunteers_needed:    parseInt(document.getElementById('volunteers-needed').value) || null,
      is_free:              document.getElementById('is-free').checked,
      needs_professionals:  document.getElementById('needs-professionals').checked,
      status:               'upcoming',
    };

    let result;
    if (editActionId) {
      // Update existing action
      result = await supabase
        .from('cc_community_actions')
        .update(payload)
        .eq('id', editActionId);
    } else {
      // Create new action
      result = await supabase
        .from('cc_community_actions')
        .insert(payload);
    }

    setButtonLoading(this, false);

    if (result.error) {
      if (result.error.code === '42P01') {
        showSubmitError('The events system is being set up. Please run Migration 002 first.');
      } else if (result.error.code === '42501') {
        showSubmitError('You don\'t have permission to create events. Make sure you\'re signed in as an NGO.');
      } else {
        showSubmitError('Could not save the event. Please try again.');
      }
      console.error('[create-action]', result.error);
    } else {
      showToast(editActionId ? 'Event updated!' : 'Event published successfully!', 'success');
      setTimeout(() => {
        window.location.href = '/careconnect/community-actions.html';
      }, 1000);
    }
  });

  // ── Edit mode: pre-fill form from existing action ─────────────
  async function loadEditData(actionId) {
    document.getElementById('page-title').textContent = 'Edit Event';
    const { data: action } = await supabase
      .from('cc_community_actions')
      .select('*')
      .eq('id', actionId)
      .single();

    if (!action) {
      showToast('Event not found or you don\'t have access to edit it.', 'error');
      return;
    }

    // Pre-select type card
    const typeCard = document.querySelector(`.type-card[data-type="${action.action_type}"]`);
    if (typeCard) { selectedType = action.action_type; typeCard.classList.add('selected'); }

    document.getElementById('title').value          = action.title;
    document.getElementById('title-count').textContent = action.title.length;
    document.getElementById('description').value    = action.description || '';
    document.getElementById('desc-count').textContent  = (action.description || '').length;
    document.getElementById('event-date').value     = action.event_date;
    document.getElementById('event-time').value     = action.start_time || '';
    document.getElementById('venue').value          = action.location_name || '';
    document.getElementById('district').value       = action.district;
    document.getElementById('volunteers-needed').value = action.volunteers_needed || '';
    document.getElementById('is-free').checked      = action.is_free;
    document.getElementById('needs-professionals').checked = action.needs_professionals;
  }

  // ── Init ──────────────────────────────────────────────────────
  (async function init() {
    let attempts = 0;
    while (!window.currentUserId && attempts < 20) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }

    // NGO-only page
    if (window.currentRole && window.currentRole !== 'ngo') {
      showToast('Only NGO accounts can create events.', 'error');
      setTimeout(() => history.back(), 1500);
      return;
    }

    // Get org id for this user
    const { data: org } = await supabase
      .from('cc_organizations')
      .select('id')
      .eq('cc_user_id', window.currentUserId)
      .single();

    if (org) orgId = org.id;

    // Pre-fill district from user profile
    const { data: u } = await supabase
      .from('cc_users')
      .select('district')
      .eq('id', window.currentUserId)
      .single();
    if (u?.district) document.getElementById('district').value = u.district;

    // Check edit mode
    const params = new URLSearchParams(window.location.search);
    editActionId = params.get('edit') || null;
    if (editActionId) await loadEditData(editActionId);
  })();

})();
