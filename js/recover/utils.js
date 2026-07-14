// ═══════════════════════════════════════════════════════════
// Curaah Recover — Shared Utility Functions
// ═══════════════════════════════════════════════════════════

/**
 * Format a date to DD/MM/YYYY (Indian format)
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDate(date) {
  const d = new Date(date);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Format a date to relative text (Today, Yesterday, 3 days ago, etc.)
 * @param {Date|string} date
 * @returns {string}
 */
export function relativeDate(date) {
  const d = new Date(date);
  if (isNaN(d)) return '—';
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(d);
}

/**
 * Format time to 12h format (e.g., 08:30 AM)
 * @param {string} time24 - '08:30' or '14:00'
 * @returns {string}
 */
export function formatTime(time24) {
  if (!time24) return '—';
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Get today's date as YYYY-MM-DD string
 * @returns {string}
 */
export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get current time period (morning/afternoon/night)
 * @returns {string}
 */
export function currentTimePeriod() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'night';
}

/**
 * Capitalize first letter of a string
 * @param {string} str
 * @returns {string}
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate text with ellipsis
 * @param {string} text
 * @param {number} maxLen
 * @returns {string}
 */
export function truncate(text, maxLen = 50) {
  if (!text || text.length <= maxLen) return text || '';
  return text.slice(0, maxLen) + '…';
}

/**
 * Debounce function
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Generate a random 6-character uppercase code
 * @returns {string}
 */
export function generateShareCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1 for clarity
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Calculate adherence percentage from logs
 * @param {Array} logs - Array of {status: 'taken'|'missed'|'skipped'}
 * @returns {number} Percentage (0-100)
 */
export function calcAdherence(logs) {
  if (!logs || logs.length === 0) return 0;
  const taken = logs.filter(l => l.status === 'taken').length;
  return Math.round((taken / logs.length) * 100);
}

/**
 * Calculate a health score (0-100) from multiple factors
 * @param {Object} data - { adherence: 0-100, vitalsLogged: boolean, checkinDone: boolean, streak: number }
 * @returns {number}
 */
export function calcHealthScore(data) {
  let score = 0;
  // Adherence contributes 60%
  score += (data.adherence || 0) * 0.6;
  // Vitals logged today contributes 15%
  if (data.vitalsLogged) score += 15;
  // Check-in done today contributes 15%
  if (data.checkinDone) score += 15;
  // Streak bonus (max 10 points)
  score += Math.min((data.streak || 0) * 2, 10);
  return Math.min(Math.round(score), 100);
}

/**
 * Show a toast notification
 * @param {string} message
 * @param {string} type - 'success' | 'error' | 'warning' | 'info'
 * @param {number} duration - ms before auto-dismiss
 */
export function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ'}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;

  container.appendChild(toast);
  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('toast-show'));

  setTimeout(() => {
    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Show the modal with custom content
 * @param {string} html - HTML content for the modal
 * @param {Object} options - { closeable: boolean, width: string }
 */
export function showModal(html, options = {}) {
  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  if (!overlay || !content) return;

  content.innerHTML = html;
  if (options.width) content.style.maxWidth = options.width;
  else content.style.maxWidth = '';

  overlay.classList.add('modal-open');

  if (options.closeable !== false) {
    overlay.onclick = (e) => {
      if (e.target === overlay) hideModal();
    };
  }
}

/**
 * Hide the modal
 */
export function hideModal() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) {
    overlay.classList.remove('modal-open');
    overlay.classList.add('modal-closing');
    setTimeout(() => {
      overlay.classList.remove('modal-closing');
      const content = document.getElementById('modalContent');
      if (content) content.innerHTML = '';
    }, 250);
  }
}

/**
 * Create a skeleton loading placeholder
 * @param {number} lines - Number of skeleton lines
 * @returns {string} HTML string
 */
export function skeletonLoader(lines = 3) {
  let html = '<div class="skeleton-group">';
  for (let i = 0; i < lines; i++) {
    const w = 60 + Math.random() * 40;
    html += `<div class="skeleton" style="width:${w}%"></div>`;
  }
  html += '</div>';
  return html;
}

/**
 * Safely get an element by ID with null check
 * @param {string} id
 * @returns {HTMLElement|null}
 */
export function $(id) {
  return document.getElementById(id);
}

/**
 * Sanitize HTML to prevent XSS
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Format a number with Indian locale
 * @param {number} num
 * @returns {string}
 */
export function formatNumber(num) {
  return new Intl.NumberFormat('en-IN').format(num);
}

/**
 * Check if the app is running offline
 * @returns {boolean}
 */
export function isOffline() {
  return !navigator.onLine;
}

/**
 * Get greeting based on time of day
 * @returns {string}
 */
export function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/**
 * Time period emoji
 * @param {string} period - 'morning'|'afternoon'|'night'
 * @returns {string}
 */
export function periodEmoji(period) {
  const emojis = { morning: '🌅', afternoon: '☀️', night: '🌙' };
  return emojis[period] || '💊';
}

/**
 * Severity color mapping
 * @param {string} severity - 'green'|'yellow'|'red' or 'minor'|'moderate'|'major'
 * @returns {string} CSS color variable
 */
export function severityColor(severity) {
  const map = {
    green: 'var(--green)', minor: 'var(--green)',
    yellow: 'var(--amber)', moderate: 'var(--amber)',
    red: 'var(--red)', major: 'var(--red)', contraindicated: 'var(--red)'
  };
  return map[severity] || 'var(--muted)';
}

/**
 * Deep clone an object (JSON-safe)
 * @param {*} obj
 * @returns {*}
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
