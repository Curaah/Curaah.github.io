/* ============================================
   CURAAH — Main JavaScript
   Shared across all pages
   ============================================ */

/* --- Navbar Mobile Toggle --- */
const hamburger = document.querySelector('.nav-hamburger');
const mobileMenu = document.querySelector('.nav-mobile');

if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');

    // Animate hamburger to X
    const spans = hamburger.querySelectorAll('span');
    hamburger.classList.toggle('active');

    if (hamburger.classList.contains('active')) {
      spans[0].style.transform = 'translateY(7px) rotate(45deg)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
    } else {
      spans[0].style.transform = '';
      spans[1].style.opacity = '';
      spans[2].style.transform = '';
    }
  });

  // Close mobile menu when a link is clicked
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('active');
      const spans = hamburger.querySelectorAll('span');
      spans[0].style.transform = '';
      spans[1].style.opacity = '';
      spans[2].style.transform = '';
    });
  });
}

/* --- Navbar scroll effect --- */
const navbar = document.querySelector('.navbar');

if (navbar) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      navbar.style.background = 'rgba(6, 13, 31, 0.98)';
      navbar.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)';
    } else {
      navbar.style.background = 'rgba(6, 13, 31, 0.95)';
      navbar.style.boxShadow = 'none';
    }
  });
}

/* --- Set active nav link based on current page --- */
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
const navLinks = document.querySelectorAll('.nav-links a, .nav-mobile a');

navLinks.forEach(link => {
  const linkPage = link.getAttribute('href');
  if (linkPage === currentPage) {
    link.classList.add('active');
  }
});

/* --- Smooth reveal on scroll (for sections) --- */
const revealElements = document.querySelectorAll('.reveal');

if (revealElements.length > 0) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12
  });

  revealElements.forEach(el => revealObserver.observe(el));
}

/* --- Utility: Show toast notification --- */
function showToast(message, type = 'success') {
  // Remove existing toast
  const existing = document.querySelector('.curaah-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'curaah-toast';

  const colors = {
    success: '#00c48c',
    error:   '#ff4757',
    info:    '#3d9eff',
    warning: '#ff9f00'
  };

  toast.style.cssText = `
    position: fixed;
    bottom: 28px;
    right: 28px;
    background: #0f1f3d;
    color: white;
    padding: 14px 20px;
    border-radius: 10px;
    font-family: Inter, sans-serif;
    font-size: 14px;
    font-weight: 500;
    border-left: 4px solid ${colors[type] || colors.info};
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    z-index: 9999;
    max-width: 320px;
    line-height: 1.5;
    animation: slideInToast 0.3s ease;
  `;

  toast.textContent = message;
  document.body.appendChild(toast);

  // Auto remove after 3.5s
  setTimeout(() => {
    toast.style.animation = 'slideOutToast 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* Toast animation styles */
const toastStyle = document.createElement('style');
toastStyle.textContent = `
  @keyframes slideInToast {
    from { transform: translateX(100px); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }
  @keyframes slideOutToast {
    from { transform: translateX(0);    opacity: 1; }
    to   { transform: translateX(100px); opacity: 0; }
  }
  .reveal {
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.55s ease, transform 0.55s ease;
  }
  .reveal.revealed {
    opacity: 1;
    transform: translateY(0);
  }
`;
document.head.appendChild(toastStyle);

/* --- Utility: Format date nicely --- */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/* --- Utility: Send form data to Google Apps Script --- */
async function sendToSheet(scriptUrl, formData) {
  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    return { success: true };
  } catch (error) {
    console.error('Sheet error:', error);
    return { success: false, error };
  }
}

/* --- Utility: Basic form validation --- */
function validateForm(fields) {
  let isValid = true;

  fields.forEach(({ input, errorEl, message }) => {
    if (!input.value.trim()) {
      errorEl.textContent = message || 'This field is required';
      input.style.borderColor = '#ff4757';
      isValid = false;
    } else {
      errorEl.textContent = '';
      input.style.borderColor = '';
    }
  });

  return isValid;
}

/* --- Utility: Validate email format --- */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* --- Utility: Validate Indian phone number --- */
function isValidPhone(phone) {
  return /^[6-9]\d{9}$/.test(phone.replace(/\s/g, ''));
}
