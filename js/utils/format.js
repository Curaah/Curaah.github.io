// Data formatting functions. Nothing else.

// "14 Sep 2026" or "14 Sep"
function formatDate(dateStr, includeYear = true) {
  if (!dateStr) return '—';
  const d      = new Date(dateStr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const base   = `${d.getDate()} ${months[d.getMonth()]}`;
  return includeYear ? `${base} ${d.getFullYear()}` : base;
}

// "9:30 AM" (12-hour Indian style)
function formatTime(dateStr) {
  if (!dateStr) return '—';
  const d    = new Date(dateStr);
  const h    = d.getHours();
  const m    = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m} ${ampm}`;
}

// "2 min ago", "3 hr ago", "4 days ago", "just now"
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const secs = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (secs < 60)    return 'just now';
  if (secs < 3600)  return `${Math.floor(secs / 60)} min ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)} hr ago`;
  if (secs < 604800)return `${Math.floor(secs / 86400)} days ago`;
  return formatDate(dateStr, false);
}

// 12500 → "12,500"
function formatPoints(n) {
  return Number(n || 0).toLocaleString('en-IN');
}

// "Akshat Saini" → "AS"
function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

// Returns the matching sewa level object for a given score.
function resolveSewaLevel(score) {
  return [...SEWA_LEVELS].reverse().find(l => score >= l.minScore) || SEWA_LEVELS[0];
}

// Alias used by feed.js and dashboard-professional.js
const formatRelativeTime = timeAgo;
