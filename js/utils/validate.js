// Form validation functions. Nothing else.

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Indian mobile: 10 digits starting with 6–9, with optional +91/91/0 prefix
function isValidPhone(phone) {
  return /^[6-9]\d{9}$/.test(phone.replace(/^(\+91|91|0)/, '').trim());
}

function isValidPassword(password) {
  return password.length >= 8;
}

function isNotEmpty(value) {
  return value !== null && value !== undefined && String(value).trim().length > 0;
}

// ── Field-level error display ─────────────────────────────────

function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  const group = field.closest('.form-group');
  if (!group) return;
  group.classList.add('has-error');
  const errEl = group.querySelector('.form-error');
  if (errEl) errEl.textContent = message;
}

function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  const group = field.closest('.form-group');
  if (group) group.classList.remove('has-error');
}

function clearAllErrors(containerEl) {
  containerEl.querySelectorAll('.form-group.has-error')
    .forEach(g => g.classList.remove('has-error'));
}

function scrollToFirstError(containerEl) {
  const first = (containerEl || document).querySelector('.form-group.has-error');
  first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
