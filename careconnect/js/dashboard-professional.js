// careconnect/js/dashboard-professional.js
// ONE responsibility: load healthcare professional dashboard data.
// Reads: cc_users, cc_organizations, cc_posts (Phase 2), cc_community_actions

(function () {
  'use strict';

  const SPECIALTY_LABELS = {};
  PROFESSIONAL_SPECIALTIES.forEach(s => { SPECIALTY_LABELS[s.id] = s.label; });

  // ── Render a post card ────────────────────────────────────────
  function renderPostCard(post) {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.innerHTML = `
      <div class="post-card-meta">
        ${formatRelativeTime(post.created_at)}
        ${post.category ? ` · <span class="badge badge-blue" style="font-size:9px;">${post.category}</span>` : ''}
      </div>
      <div class="post-card-text">
        ${post.content ? post.content.substring(0, 160) + (post.content.length > 160 ? '…' : '') : ''}
      </div>
      <div class="post-card-stats">
        <span class="post-card-stat">👁️ ${post.views || 0}</span>
        <span class="post-card-stat">👍 ${post.likes || 0}</span>
        <span class="post-card-stat">💬 ${post.comments_count || 0}</span>
      </div>
    `;
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      window.location.href = `/careconnect/feed.html#post-${post.id}`;
    });
    return card;
  }

  // ── Render a camp opportunity card ───────────────────────────
  function renderCampCard(action) {
    const card = document.createElement('div');
    card.style.cssText = 'background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:14px 16px;margin-bottom:8px;';
    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <div style="font-size:14px;font-weight:700;">🏕️ ${action.title}</div>
        <span class="badge badge-blue" style="font-size:10px;">${formatDate(action.event_date)}</span>
      </div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:10px;">
        📍 ${action.district} · Organised by ${action.org_name || 'an NGO'}
      </div>
      <button class="btn btn-surface btn-sm" onclick="expressInterest('${action.id}')">
        Express Interest
      </button>
    `;
    return card;
  }

  // ── Express interest in a camp (Phase 3: creates registration row) ──
  window.expressInterest = function (actionId) {
    showToast('Interest noted! The NGO will be notified. (Full camp coordination — Phase 3)', 'info');
  };

  // ── Main data loader ──────────────────────────────────────────
  async function loadDashboard() {
    let attempts = 0;
    while (!window.currentUserId && attempts < 50) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }

    const userId = window.currentUserId;
    if (!userId) return;

    // 1. Load user + org record in parallel
    const [{ data: user }, { data: org }] = await Promise.all([
      supabase.from('cc_users').select('full_name, district, city, profile_photo').eq('id', userId).single(),
      supabase.from('cc_organizations').select('id, registration_number, work_areas, district').eq('cc_user_id', userId).single(),
    ]);

    if (user) {
      document.getElementById('prof-name').textContent = user.full_name;
      document.getElementById('prof-location').textContent = `${user.city || ''}${user.city && user.district ? ', ' : ''}${user.district || ''}`;
      if (user.profile_photo) {
        const photoEl = document.getElementById('prof-photo');
        photoEl.innerHTML = `<img src="${user.profile_photo}" alt="${user.full_name}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid var(--green);" />`;
      }
    }

    // Specialty from council registration (stored in org.registration_number context)
    // The work_areas array from cc_organizations for professionals holds their contribution types
    if (org?.work_areas) {
      document.getElementById('prof-specialty').textContent = 'Healthcare Professional';
    }

    // 2. Load this professional's posts (cc_posts table — Phase 2 migration)
    try {
      const { data: posts } = await supabase
        .from('cc_posts')
        .select('id, content, category, views, likes, comments_count, created_at')
        .eq('author_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (posts && posts.length > 0) {
        document.getElementById('stat-posts').textContent = posts.length;
        const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
        document.getElementById('stat-views').textContent = formatPoints(totalViews);

        const postsList = document.getElementById('posts-list');
        postsList.innerHTML = '';
        posts.forEach(p => postsList.appendChild(renderPostCard(p)));
      } else {
        document.getElementById('stat-posts').textContent = 0;
        document.getElementById('stat-views').textContent = 0;
      }
    } catch (_) {
      // cc_posts table (Migration 002) not yet applied
      document.getElementById('stat-posts').textContent = 0;
      document.getElementById('stat-views').textContent = 0;
    }

    // 3. Load camps seeking professional volunteers in this district
    const district = user?.district;
    if (district) {
      const { data: camps } = await supabase
        .from('cc_community_actions')
        .select('id, title, event_date, district, org_id, cc_organizations(org_name)')
        .eq('district', district)
        .eq('needs_professionals', true)
        .eq('status', 'upcoming')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(5);

      if (camps && camps.length > 0) {
        document.getElementById('stat-camps').textContent = camps.length;
        const campsList = document.getElementById('camps-list');
        campsList.innerHTML = '';
        camps.forEach(c => {
          const enriched = { ...c, org_name: c.cc_organizations?.org_name };
          campsList.appendChild(renderCampCard(enriched));
        });
      } else {
        document.getElementById('stat-camps').textContent = 0;
      }
    }
  }

  loadDashboard().catch(err => {
    console.error('[dashboard-professional]', err);
    showToast('Could not load your dashboard. Please refresh.', 'error');
  });

})();
