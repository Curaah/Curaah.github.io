// careconnect/js/dashboard-ngo.js
// ONE responsibility: load NGO dashboard data.
// Reads: cc_users, cc_organizations, cc_community_actions

(function () {
  'use strict';

  const STATUS_LABELS = {
    draft:     { text: 'Draft',     cls: 'status-draft'     },
    upcoming:  { text: 'Upcoming',  cls: 'status-upcoming'  },
    ongoing:   { text: 'Live now',  cls: 'status-ongoing'   },
    completed: { text: 'Completed', cls: 'status-completed' },
    cancelled: { text: 'Cancelled', cls: 'status-cancelled' },
  };

  const ACTION_ICONS = {
    health_camp:     '🏕️',
    blood_drive:     '🩸',
    awareness_drive: '📢',
    free_checkup:    '🩺',
    vaccination:     '💉',
    senior_care:     '🧓',
    other:           '🌟',
  };

  function renderEventRow(action) {
    const status = STATUS_LABELS[action.status] || { text: action.status, cls: '' };
    const reg = action.cc_action_registrations?.[0]?.count ?? 0;
    const needed = action.volunteers_needed || 0;
    const fillPct = needed > 0 ? Math.min(100, Math.round((reg / needed) * 100)) : 0;

    const row = document.createElement('div');
    row.className = 'event-row';
    row.innerHTML = `
      <div class="event-row-header">
        <div class="event-row-title">
          ${ACTION_ICONS[action.action_type] || '🌟'} ${action.title}
        </div>
        <span class="badge ${action.status === 'upcoming' ? 'badge-blue' : action.status === 'ongoing' ? 'badge-green' : action.status === 'completed' ? 'badge-dim' : 'badge-dim'}">
          ${status.text}
        </span>
      </div>
      <div class="event-row-meta">
        📅 ${formatDate(action.event_date)}
        &nbsp;·&nbsp; 📍 ${action.district}
        ${needed > 0 ? `&nbsp;·&nbsp; 👥 ${reg}/${needed} volunteers` : ''}
      </div>
      ${needed > 0 ? `<div class="slot-bar"><div class="slot-fill" style="width:${fillPct}%;"></div></div>` : ''}
      <div class="event-row-actions">
        <a href="/careconnect/community-actions.html#action-${action.id}" class="btn btn-surface btn-sm">View →</a>
        ${action.status === 'upcoming' || action.status === 'draft'
          ? `<a href="/careconnect/create-action.html?edit=${action.id}" class="btn btn-ghost btn-sm">Edit</a>`
          : ''}
      </div>
    `;
    return row;
  }

  async function loadDashboard() {
    // Wait for auth-guard
    let attempts = 0;
    while (!window.currentUserId && attempts < 50) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }

    const userId = window.currentUserId;
    if (!userId) return;

    // 1. Load org record
    const { data: org } = await supabase
      .from('cc_organizations')
      .select('id, org_name, org_type, district, total_events, total_volunteers, sewa_score')
      .eq('cc_user_id', userId)
      .single();

    if (org) {
      document.getElementById('org-name').textContent = org.org_name;
      document.getElementById('org-meta').textContent = `${org.district} · Verified Organisation`;
      document.getElementById('stat-volunteers').textContent = org.total_volunteers || 0;
      document.getElementById('stat-events').textContent     = org.total_events     || 0;
      // Estimated people = events * avg 50 participants (rough estimate until real data)
      document.getElementById('stat-people').textContent     = (org.total_events || 0) * 50 || '—';
      document.getElementById('stat-blood').textContent      = 0; // Phase 3

      // 2. Load this org's events
      const { data: actions } = await supabase
        .from('cc_community_actions')
        .select('id, title, action_type, district, event_date, status, volunteers_needed, is_free')
        .eq('org_id', org.id)
        .order('event_date', { ascending: false })
        .limit(10);

      const eventsList = document.getElementById('events-list');
      if (actions && actions.length > 0) {
        eventsList.innerHTML = '';
        actions.forEach(a => eventsList.appendChild(renderEventRow(a)));
      }
    } else {
      // cc_organizations row missing (edge case)
      document.getElementById('org-name').textContent = 'Your Organisation';
    }
  }

  loadDashboard().catch(err => {
    console.error('[dashboard-ngo]', err);
    showToast('Could not load your dashboard. Please refresh.', 'error');
  });

})();
