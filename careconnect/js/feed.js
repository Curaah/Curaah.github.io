// careconnect/js/feed.js
// ONE responsibility: load and render the CareConnect health content feed.
// Reads: cc_posts (joined with cc_users for author), cc_post_likes, cc_post_bookmarks

(function () {
  'use strict';

  const PAGE_SIZE = 10;
  let currentCategory = '';
  let currentOffset   = 0;
  let isLoading       = false;
  let hasMore         = true;
  let likedPostIds    = new Set();
  let bookmarkedPostIds = new Set();

  const CATEGORY_CLASSES = {
    diabetes:     'cat-diabetes',
    heart:        'cat-heart',
    nutrition:    'cat-nutrition',
    mental_health:'cat-mental',
    maternal:     'cat-maternal',
    awareness:    'cat-awareness',
    general:      'cat-general',
  };

  const CATEGORY_LABELS = {
    diabetes:     '🩺 Diabetes',
    heart:        '❤️ Heart',
    nutrition:    '🥗 Nutrition',
    mental_health:'🧠 Mental Health',
    maternal:     '🤱 Maternal',
    awareness:    '📢 Awareness',
    general:      '🌿 General',
  };

  // ── Bottom tabs (role-aware) ───────────────────────────────────
  function buildBottomTabs(role) {
    const tabs = document.getElementById('bottom-tabs');
    const homeUrl = {
      volunteer:    '/careconnect/dashboard-volunteer.html',
      ngo:          '/careconnect/dashboard-ngo.html',
      blood_bank:   '/careconnect/dashboard-blood-bank.html',
      professional: '/careconnect/dashboard-professional.html',
    };
    tabs.innerHTML = `
      <div class="tab-item" onclick="location.href='${homeUrl[role] || '/careconnect/login.html'}'">
        <span class="tab-icon">🏠</span>
        <span class="tab-label">Home</span>
      </div>
      ${role === 'ngo' ? `
      <div class="tab-item" onclick="location.href='/careconnect/create-action.html'">
        <span class="tab-icon">＋</span>
        <span class="tab-label">Create</span>
      </div>` : role === 'professional' ? `
      <div class="tab-item" onclick="location.href='/careconnect/create-post.html'">
        <span class="tab-icon">✍️</span>
        <span class="tab-label">Post</span>
      </div>` : `
      <div class="tab-item" onclick="location.href='/careconnect/community-actions.html'">
        <span class="tab-icon">🏕️</span>
        <span class="tab-label">Events</span>
      </div>`}
      <div class="tab-item active">
        <span class="tab-icon">📰</span>
        <span class="tab-label">Feed</span>
      </div>
      <div class="tab-item" onclick="location.href='/careconnect/profile.html'">
        <span class="tab-icon">👤</span>
        <span class="tab-label">Profile</span>
      </div>
    `;
  }

  // ── Render a single post card ──────────────────────────────────
  function renderPost(post) {
    const isLiked       = likedPostIds.has(post.id);
    const isBookmarked  = bookmarkedPostIds.has(post.id);
    const catClass      = CATEGORY_CLASSES[post.category] || 'cat-general';
    const catLabel      = CATEGORY_LABELS[post.category]  || '🌿 General';
    const authorName    = post.cc_users?.full_name || 'Healthcare Professional';
    const authorPhoto   = post.cc_users?.profile_photo;
    const isVerified    = post.cc_users?.is_verified;

    const card = document.createElement('div');
    card.className = 'feed-post';
    card.id = `post-${post.id}`;

    const truncateContent = post.content && post.content.length > 240;

    card.innerHTML = `
      <!-- Author row -->
      <div class="post-author">
        <div class="author-avatar">
          ${authorPhoto
            ? `<img src="${authorPhoto}" alt="${authorName}" />`
            : `<span>${authorName.charAt(0)}</span>`}
        </div>
        <div>
          <div class="author-name">
            ${authorName}
            ${isVerified ? '<span class="badge badge-green" style="font-size:9px;margin-left:4px;">✓ Verified</span>' : ''}
          </div>
          <div class="author-meta" id="author-meta-${post.id}">Healthcare Professional</div>
        </div>
        <div class="post-time">${formatRelativeTime(post.created_at)}</div>
      </div>

      <!-- Category -->
      ${post.category ? `<span class="post-category ${catClass}">${catLabel}</span>` : ''}

      <!-- Content -->
      <div class="post-content ${truncateContent ? 'truncated' : ''}" id="content-${post.id}">
        ${post.content || ''}
      </div>
      ${truncateContent
        ? `<span class="post-read-more" data-post="${post.id}" onclick="expandPost('${post.id}')">Read more…</span>`
        : ''}

      <!-- Image if present -->
      ${post.image_url ? `<img src="${post.image_url}" alt="Post image" class="post-image" loading="lazy" />` : ''}

      <!-- Action bar -->
      <div class="post-actions">
        <button class="post-action-btn ${isLiked ? 'liked' : ''}"
          id="btn-like-${post.id}"
          onclick="toggleLike('${post.id}', this)">
          ${isLiked ? '❤️' : '🤍'}
          <span class="post-action-count" id="like-count-${post.id}">${post.likes || 0}</span>
        </button>
        <button class="post-action-btn"
          onclick="location.href='/careconnect/post.html?id=${post.id}'">
          💬
          <span class="post-action-count">${post.comments_count || 0}</span>
        </button>
        <button class="post-action-btn ${isBookmarked ? 'bookmarked' : ''}"
          id="btn-bookmark-${post.id}"
          onclick="toggleBookmark('${post.id}', this)">
          ${isBookmarked ? '🔖' : '📑'}
        </button>
        <button class="post-action-btn" style="margin-left:auto;"
          onclick="sharePost('${post.id}', '${authorName.replace(/'/g, "\\'")}')">
          📤
        </button>
      </div>
    `;

    // Load specialty for author meta asynchronously (avoid N+1 by batching if needed)
    supabase
      .from('cc_organizations')
      .select('registration_number, org_name')
      .eq('cc_user_id', post.author_id)
      .single()
      .then(({ data: org }) => {
        const metaEl = card.querySelector(`#author-meta-${post.id}`);
        if (metaEl && org) metaEl.textContent = org.org_name || 'Healthcare Professional';
      });

    return card;
  }

  // ── Post interactions ──────────────────────────────────────────

  window.expandPost = function (postId) {
    const content = document.getElementById(`content-${postId}`);
    const btn     = document.querySelector(`[data-post="${postId}"]`);
    if (content) content.classList.remove('truncated');
    if (btn)     btn.style.display = 'none';
  };

  window.toggleLike = async function (postId, btn) {
    const userId = window.currentUserId;
    if (!userId) { showToast('Please sign in to like posts.', 'error'); return; }

    const isLiked = likedPostIds.has(postId);
    const countEl = document.getElementById(`like-count-${postId}`);
    const currentCount = parseInt(countEl.textContent) || 0;

    if (isLiked) {
      // Unlike
      likedPostIds.delete(postId);
      btn.classList.remove('liked');
      btn.innerHTML = `🤍 <span class="post-action-count" id="like-count-${postId}">${currentCount - 1}</span>`;
      await supabase.from('cc_post_likes').delete().eq('post_id', postId).eq('user_id', userId);
    } else {
      // Like
      likedPostIds.add(postId);
      btn.classList.add('liked');
      btn.innerHTML = `❤️ <span class="post-action-count" id="like-count-${postId}">${currentCount + 1}</span>`;
      await supabase.from('cc_post_likes').upsert({ post_id: postId, user_id: userId });
    }
  };

  window.toggleBookmark = async function (postId, btn) {
    const userId = window.currentUserId;
    if (!userId) { showToast('Please sign in to save posts.', 'error'); return; }

    if (bookmarkedPostIds.has(postId)) {
      bookmarkedPostIds.delete(postId);
      btn.classList.remove('bookmarked');
      btn.textContent = '📑';
      await supabase.from('cc_post_bookmarks').delete().eq('post_id', postId).eq('user_id', userId);
      showToast('Removed from saved posts.', 'info');
    } else {
      bookmarkedPostIds.add(postId);
      btn.classList.add('bookmarked');
      btn.textContent = '🔖';
      await supabase.from('cc_post_bookmarks').upsert({ post_id: postId, user_id: userId });
      showToast('Saved to your bookmarks.', 'success');
    }
  };

  window.sharePost = function (postId, authorName) {
    const url  = `${window.location.origin}/careconnect/post.html?id=${postId}`;
    const text = `Health advice from ${authorName} on CareConnect by Curaah`;
    if (navigator.share) {
      navigator.share({ title: 'CareConnect Health Post', text, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).then(() => {
        showToast('Link copied to clipboard!', 'success');
      });
    }
  };

  // ── Load posts from Supabase ───────────────────────────────────
  async function loadPosts(reset = false) {
    if (isLoading) return;
    if (!hasMore && !reset) return;

    isLoading = true;

    if (reset) {
      currentOffset = 0;
      hasMore = true;
      document.getElementById('feed-list').innerHTML = '';
      document.getElementById('feed-empty').style.display = 'none';
      document.getElementById('skeleton-wrap').style.display = 'block';
    }

    try {
      let query = supabase
        .from('cc_posts')
        .select(`
          id, author_id, content, category, image_url,
          likes, comments_count, views, created_at,
          cc_users!cc_posts_author_id_fkey (
            full_name, profile_photo, is_verified
          )
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + PAGE_SIZE - 1);

      if (currentCategory) {
        query = query.eq('category', currentCategory);
      }

      const { data: posts, error } = await query;

      document.getElementById('skeleton-wrap').style.display = 'none';

      if (error) throw error;

      if (!posts || posts.length === 0) {
        if (currentOffset === 0) {
          document.getElementById('feed-empty').style.display = 'block';
        }
        hasMore = false;
        document.getElementById('load-more-wrap').style.display = 'none';
        return;
      }

      const feedList = document.getElementById('feed-list');
      posts.forEach(post => feedList.appendChild(renderPost(post)));

      currentOffset += posts.length;
      hasMore = posts.length === PAGE_SIZE;
      document.getElementById('load-more-wrap').style.display = hasMore ? 'block' : 'none';

      // Anchor scroll if hash matches a post id
      const hash = window.location.hash;
      if (hash && hash.startsWith('#post-')) {
        const el = document.getElementById(hash.slice(1));
        if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
      }
    } catch (err) {
      document.getElementById('skeleton-wrap').style.display = 'none';
      // cc_posts table (Migration 002) might not exist yet
      if (err.code === '42P01') {
        document.getElementById('feed-empty').style.display = 'block';
      } else {
        showToast('Could not load the feed. Please refresh.', 'error');
        console.error('[feed]', err);
      }
    } finally {
      isLoading = false;
    }
  }

  // ── Load user's liked + bookmarked posts ───────────────────────
  async function loadUserInteractions(userId) {
    try {
      const [{ data: likes }, { data: bookmarks }] = await Promise.all([
        supabase.from('cc_post_likes').select('post_id').eq('user_id', userId),
        supabase.from('cc_post_bookmarks').select('post_id').eq('user_id', userId),
      ]);
      if (likes) likes.forEach(l => likedPostIds.add(l.post_id));
      if (bookmarks) bookmarks.forEach(b => bookmarkedPostIds.add(b.post_id));
    } catch (_) {
      // Tables not yet created — silently skip
    }
  }

  // ── Category filter clicks ─────────────────────────────────────
  document.getElementById('feed-filters').addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentCategory = chip.dataset.cat;
    loadPosts(true);
  });

  // ── Load more button ───────────────────────────────────────────
  document.getElementById('btn-load-more').addEventListener('click', () => loadPosts());

  // ── Init ───────────────────────────────────────────────────────
  (async function init() {
    // Wait for auth-guard
    let attempts = 0;
    while (!window.currentUserId && attempts < 20) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }

    // Build role-aware bottom tabs
    buildBottomTabs(window.currentRole || 'volunteer');

    // Load user interactions in parallel with first page of posts
    if (window.currentUserId) {
      await loadUserInteractions(window.currentUserId);
    }

    await loadPosts(true);
  })();

})();
