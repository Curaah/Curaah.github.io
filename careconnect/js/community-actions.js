// careconnect/js/community-actions.js
// ONE responsibility: load and render the community actions browse page.
// RSVP / join functionality included for volunteers.

(function () {
  'use strict';

  const PAGE_SIZE = 12;
  let currentType   = '';
  let currentOffset = 0;
  let hasMore       = true;
  let isLoading     = false;
  let filterDistrict = null; // null = user's district only; 'all' = all Punjab

  const ACTION_TYPE_LABELS = {
    health_camp:     '🏕️ Health Camp',
    blood_drive:     '🩸 Blood Drive',
    free_checkup:    '🩺 Free Checkup',
    vaccination:     '💉 Vaccination Drive',
    awareness_drive: '📢 Awareness Drive',
    senior_care:     '🧓 Senior Care',
    other:           '🌟 Community Event',
  };

  // ── Build role-aware bottom tabs ──────────────────────────────
  function buildBottomTabs(role) {
    const homeUrl = {
      volunteer:    '/careconnect/dashboard-volunteer.html',
      ngo:          '/careconnect/dashboard-ngo.html',
      blood_bank:   '/careconnect/dashboard-blood-bank.html',
      professional: '/careconnect/dashboard-professional.html',
    };
    const tabs = document.getElementById('bottom-tabs');
    tabs.innerHTML = `
      <div class="tab-item" onclick="location.href='${homeUrl[role] || '/careconnect/login.html'}'">
        <span class="tab-icon">🏠</span>
        <span class="tab-label">Home</span>
      </div>
      <div class="tab-item active">
        <span class="tab-icon">🏕️</span>
        <span class="tab-label">Events</span>
      </div>
      <div class="tab-item" onclick="location.href='/careconnect/feed.html'">
        <span class="tab-icon">📰</span>
        <span class="tab-label">Feed</span>
      </div>
      <div class="tab-item" onclick="location.href='/careconnect/profile.html'">
        <span class="tab-icon">👤</span>
        <span class="tab-label">Profile</span>
      </div>
    `;
  }

  // ── Render one action event card ──────────────────────────────
  function renderActionCard(action) {
    const typeClass = `type-${action.action_type}`;
    const typeLabel = ACTION_TYPE_LABELS[action.action_type] || '🌟 Event';
    const orgName   = action.cc_organizations?.org_name || 'An organisation';
    const regCount  = action._reg_count || 0;
    const needed    = action.volunteers_needed || 0;
    const fillPct   = needed > 0 ? Math.min(100, Math.round((regCount / needed) * 100)) : 0;
    const isFull    = needed > 0 && regCount >= needed;

    const card = document.createElement('div');
    card.className = 'action-event-card';
    card.id = `action-${action.id}`;

    card.innerHTML = `
      <div class="event-card-inner ${typeClass}">
        <div class="event-type-row">
          <span class="event-type-label">${typeLabel}</span>
          ${action.is_free
            ? '<span class="badge badge-green" style="font-size:9px;">Free Entry</span>'
            : ''}
        </div>

        <div class="event-title">${action.title}</div>

        <div class="event-meta">
          📅 <strong>${formatDate(action.event_date)}</strong>
          ${action.start_time ? ` at ${action.start_time}` : ''}
          &nbsp;·&nbsp; 📍 ${action.location_name || ''}, ${action.district}
        </div>

        ${action.description
          ? `<div style="font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:10px;">
              ${action.description.substring(0, 120)}${action.description.length > 120 ? '…' : ''}
             </div>`
          : ''}

        <div class="event-footer">
          <div>
            ${needed > 0
              ? `<div class="event-slots">
                  <strong>${regCount}</strong>/${needed} volunteers
                  <span class="slot-mini-bar">
                    <span class="slot-mini-fill" style="width:${fillPct}%;"></span>
                  </span>
                </div>`
              : ''}
            <div class="event-org">🏛️ ${orgName}</div>
          </div>

          <div style="display:flex; gap:6px;">
            ${isFull
              ? '<span class="badge badge-dim" style="font-size:10px;">Slots Full</span>'
              : `<button class="btn btn-primary btn-sm"
                   onclick="rsvpAction('${action.id}', this)"
                   data-action-id="${action.id}">
                   Join
                 </button>`}
          </div>
        </div>
      </div>
    `;

    // Anchor scroll
    if (window.location.hash === `#action-${action.id}`) {
      setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    }

    return card;
  }

  // ── RSVP / Join an action (volunteer) ────────────────────────
  window.rsvpAction = async function (actionId, btn) {
    const userId = window.currentUserId;
    if (!userId) { showToast('Please sign in to join events.', 'error'); return; }

    const role = window.currentRole;
    if (role !== 'volunteer') {
      showToast('Only volunteers can register for events. NGOs can create them.', 'info');
      return;
    }

    setButtonLoading(btn, true);

    // Resolve cc_volunteers.id from cc_user_id
    const { data: vol } = await supabase
      .from('cc_volunteers')
      .select('id')
      .eq('cc_user_id', userId)
      .single();

    if (!vol) {
      setButtonLoading(btn, false);
      showToast('Your volunteer profile could not be found. Please contact support.', 'error');
      return;
    }

    // Check if already registered
    const { data: existing } = await supabase
      .from('cc_action_registrations')
      .select('id')
      .eq('action_id', actionId)
      .eq('volunteer_id', vol.id)
      .single();

    if (existing) {
      setButtonLoading(btn, false);
      showToast('You\'re already registered for this event!', 'info');
      btn.textContent = '✓ Joined';
      btn.disabled = true;
      return;
    }

    const { error } = await supabase
      .from('cc_action_registrations')
      .insert({
        action_id:         actionId,
        volunteer_id:      vol.id,
        registration_type: 'volunteer',
        status:            'registered',
      });

    setButtonLoading(btn, false);

    if (error) {
      if (error.code === '42P01') {
        showToast('Event registration system coming soon.', 'info');
      } else {
        showToast('Could not register. Please try again.', 'error');
        console.error('[rsvp]', error);
      }
    } else {
      btn.textContent = '✓ Joined';
      btn.disabled = true;
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-success');
      showToast('You\'re registered! The NGO will get in touch closer to the date.', 'success');
    }
  };

  // ── Show all Punjab (remove district filter) ──────────────────
  window.showAllDistricts = function () {
    filterDistrict = 'all';
    document.getElementById('district-label').textContent = 'all of Punjab';
    loadActions(true);
  };

  // ── Load actions from Supabase ────────────────────────────────
  async function loadActions(reset = false) {
    if (isLoading) return;
    if (!hasMore && !reset) return;
    isLoading = true;

    if (reset) {
      currentOffset = 0;
      hasMore = true;
      document.getElementById('actions-list').innerHTML = '';
      document.getElementById('actions-empty').style.display = 'none';
      document.getElementById('skeleton-wrap').style.display = 'block';
    }

    try {
      let query = supabase
        .from('cc_community_actions')
        .select(`
          id, title, action_type, district, location_name, event_date, start_time,
          description, volunteers_needed, is_free, needs_professionals,
          cc_organizations ( org_name )
        `)
        .eq('status', 'upcoming')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .range(currentOffset, currentOffset + PAGE_SIZE - 1);

      if (currentType) {
        query = query.eq('action_type', currentType);
      }

      // District filter
      if (filterDistrict !== 'all' && filterDistrict) {
        query = query.eq('district', filterDistrict);
      }

      const { data: actions, error } = await query;
      document.getElementById('skeleton-wrap').style.display = 'none';

      if (error) throw error;

      if (!actions || actions.length === 0) {
        if (currentOffset === 0) document.getElementById('actions-empty').style.display = 'block';
        hasMore = false;
        document.getElementById('load-more-wrap').style.display = 'none';
        return;
      }

      const list = document.getElementById('actions-list');
      actions.forEach(a => list.appendChild(renderActionCard(a)));
      currentOffset += actions.length;
      hasMore = actions.length === PAGE_SIZE;
      document.getElementById('load-more-wrap').style.display = hasMore ? 'block' : 'none';

    } catch (err) {
      document.getElementById('skeleton-wrap').style.display = 'none';
      if (err.code === '42P01') {
        document.getElementById('actions-empty').style.display = 'block';
      } else {
        showToast('Could not load events. Please refresh.', 'error');
        console.error('[community-actions]', err);
      }
    } finally {
      isLoading = false;
    }
  }

  // ── Filter clicks ─────────────────────────────────────────────
  document.getElementById('filter-bar').addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentType = chip.dataset.type;
    loadActions(true);
  });

  document.getElementById('btn-load-more').addEventListener('click', () => loadActions());

  // ── Init ──────────────────────────────────────────────────────
  (async function init() {
    let attempts = 0;
    while (!window.currentUserId && attempts < 20) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }

    buildBottomTabs(window.currentRole || 'volunteer');

    // Show FAB create button for NGO users
    if (window.currentRole === 'ngo') {
      document.getElementById('fab-create').style.display = 'block';
    }

    // Get user's district for local-first filtering
    if (window.currentUserId) {
      const { data: u } = await supabase
        .from('cc_users')
        .select('district')
        .eq('id', window.currentUserId)
        .single();

      if (u?.district) {
        filterDistrict = u.district;
        document.getElementById('district-label').textContent = u.district;
      }
    }

    await loadActions(true);
  })();

})();
