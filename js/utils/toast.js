// Shows toast notifications. Nothing else.

function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
  container.appendChild(el);

  setTimeout(() => {
    el.classList.add('hiding');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, duration);
}

const toastSuccess = (msg) => showToast(msg, 'success');
const toastError   = (msg) => showToast(msg, 'error', 5000);
const toastWarning = (msg) => showToast(msg, 'warning');
const toastInfo    = (msg) => showToast(msg, 'info');
