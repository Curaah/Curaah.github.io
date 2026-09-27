// careconnect/js/dashboard-volunteer.js
// ONE responsibility: load and render the volunteer dashboard data.
// Reads: cc_users, cc_volunteers, cc_community_actions, cc_blood_requests (Phase 3)

(function () {
  'use strict';

  // ── Greeting based on time of day ─────────────────────────────
  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  // ── Render a community action card ───────────────────────────
  function renderEventCard(action) {
    const typeIcons = {
      health_camp:     '🏕️',
      blood_drive:     '🩸',
      awareness_drive: '📢',
      free_checkup:    '🩺',
      vaccination:     '💉',
      senior_care:     '🧓',
      other:           '🌟',
    };
    const icon = typeIcons[action.action_type] || '🌟';

    const card = document.createElement('a');
    card.href = `/careconnect/community-actions.html#action-${action.id}`;
    card.className = 'action-card mb-8';
    card.style.display = 'flex';

    card.innerHTML = `
      <div class="action-icon teal">${icon}</div>
      <div class="action-body">
        <div class="action-title">${action.title}</div>
        <div class="action-meta">
          📍 ${action.district} &nbsp;·&nbsp;
          📅 ${formatDate(action.event_date)}
          ${action.is_free ? ' &nbsp;·&nbsp; <span class="badge badge-green" style="font-size:10px;">Free</span>' : ''}
        </div>
      </div>
      <div class="action-arrow">›</div>
    `;
    return card;
  }

  // ── Render a blood request alert card ────────────────────────
  function renderBloodCard(req) {
    const urgencyColors = { urgent: 'var(--red)', high: 'var(--amber)', moderate: 'var(--muted)' };
    const color = urgencyColors[req.urgency] || 'var(--muted)';

    const card = document.createElement('div');
    card.className = 'blood-card mb-8';
    card.innerHTML = `
      <div class="blood-group-badge">${req.blood_group}</div>
      <div class="blood-card-body">
        <div class="blood-card-title" style="color:${color};">
          ${req.urgency === 'urgent' ? '🚨 URGENT — ' : req.urgency === 'high' ? '⚠️ HIGH — ' : ''}
          ${req.units_needed} unit${req.units_needed > 1 ? 's' : ''} needed
        </div>
        <div class="blood-card-meta">
          🏥 ${req.hospital_name}, ${req.hospital_city}
          &nbsp;·&nbsp; ${req.district}
        </div>
      </div>
      <button class="btn btn-danger btn-sm" data-req-id="${req.id}" onclick="respondToBlood('${req.id}')">Help</button>
    `;
    return card;
  }

  // ── Blood request response (placeholder for Phase 3) ─────────
  window.respondToBlood = function (requestId) {
    // Phase 3: creates cc_blood_responses row + relay message
    showToast('Blood emergency response — feature coming in Phase 3.', 'info');
  };

  // ── Main data loader ──────────────────────────────────────────
  async function loadDashboard() {
    // Wait for auth-guard to set currentUserId
    // (auth-guard is async, so we poll briefly — or use a safer approach)
    let attempts = 0;
    while (!window.currentUserId && attempts < 50) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }

    const userId = window.currentUserId;
    if (!userId) return;

    // 1. Load user profile + volunteer stats
    const [{ data: user }, { data: vol }] = await Promise.all([
      supabase.from('cc_users').select('full_name, district').eq('id', userId).single(),
      supabase.from('cc_volunteers').select(
        'sewa_points_total, sewa_score, sewa_level, total_events_attended, total_blood_donations, total_emergency_helps, skills, available_days, max_travel_km'
      ).eq('cc_user_id', userId).single(),
    ]);

    // Render greeting + name
    document.getElementById('greeting').textContent = getGreeting() + ' 👋';
    if (user) {
      const firstName = user.full_name.split(' ')[0];
      document.getElementById('user-name').textContent = `${firstName} · ${user.district}`;
    }

    // Render Sewa Points
    if (vol) {
      document.getElementById('sewa-points').textContent = formatPoints(vol.sewa_points_total);
      document.getElementById('sewa-level').textContent   = vol.sewa_level || 'Sewadar';
      document.getElementById('stat-events').textContent   = vol.total_events_attended || 0;
      document.getElementById('stat-blood').textContent    = vol.total_blood_donations  || 0;
      document.getElementById('stat-emergency').textContent= vol.total_emergency_helps  || 0;
    }

    // 2. Load upcoming community actions in volunteer's district
    const district = user?.district;
    if (district) {
      const { data: actions } = await supabase
        .from('cc_community_actions')
        .select('id, title, action_type, district, event_date, is_free')
        .eq('district', district)
        .eq('status', 'upcoming')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(5);

      const eventsList = document.getElementById('events-list');
      if (actions && actions.length > 0) {
        eventsList.innerHTML = '';
        actions.forEach(a => eventsList.appendChild(renderEventCard(a)));
        const seeAll = document.createElement('a');
        seeAll.href = '/careconnect/community-actions.html';
        seeAll.className = 'btn btn-ghost btn-sm btn-full mt-8';
        seeAll.textContent = 'See all events →';
        eventsList.appendChild(seeAll);
      }
    }

    // 3. Load active blood requests in volunteer's district (if opted in)
    // cc_blood_requests table exists after Migration 003
    // We gracefully skip if table doesn't exist yet
    if (district) {
      try {
        const { data: bloodReqs, error: bloodErr } = await supabase
          .from('cc_blood_requests')
          .select('id, blood_group, units_needed, hospital_name, hospital_city, district, urgency')
          .eq('district', district)
          .eq('status', 'active')
          .order('urgency', { ascending: true }) // urgent first
          .limit(3);

        if (!bloodErr && bloodReqs && bloodReqs.length > 0) {
          const bloodList = document.getElementById('blood-list');
          bloodList.innerHTML = '';
          bloodReqs.forEach(r => bloodList.appendChild(renderBloodCard(r)));
        }
      } catch (_) {
        // Migration 003 not run yet — silently ignore
      }
    }
  }

  // ── Init ──────────────────────────────────────────────────────
  loadDashboard().catch(err => {
    console.error('[dashboard-volunteer]', err);
    showToast('Could not load your dashboard. Please refresh.', 'error');
  });

})();
