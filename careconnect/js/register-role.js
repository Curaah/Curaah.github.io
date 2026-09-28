// careconnect/js/register-role.js
// ONE responsibility: handle role card selection on register.html.
// Stores chosen role in sessionStorage and navigates to the correct register page.

(function () {
  'use strict';

  const cards    = document.querySelectorAll('.role-card[data-role]');
  const btnCont  = document.getElementById('btn-continue');

  // Destination for each role
  const destinations = {
    volunteer:    '/careconnect/register-volunteer.html',
    ngo:          '/careconnect/register-ngo.html',
    blood_bank:   '/careconnect/register-blood-bank.html',
    professional: '/careconnect/register-professional.html',
  };

  let selectedRole = null;

  // ── Card selection ────────────────────────────────────────────
  function selectRole(role) {
    selectedRole = role;

    // Visual state
    cards.forEach(c => {
      const isThis = c.dataset.role === role;
      c.classList.toggle('selected', isThis);
      c.setAttribute('aria-pressed', String(isThis));
    });

    // Enable continue button
    btnCont.disabled = false;
  }

  cards.forEach(card => {
    // Mouse / touch
    card.addEventListener('click', () => selectRole(card.dataset.role));

    // Keyboard: Enter or Space activates card
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectRole(card.dataset.role);
      }
    });
  });

  // ── Continue → navigate to registration page ─────────────────
  btnCont.addEventListener('click', () => {
    if (!selectedRole) return; // should not happen (button is disabled)
    // Persist so the register form can pre-fill if needed
    sessionStorage.setItem('cc_selected_role', selectedRole);
    window.location.href = destinations[selectedRole];
  });

})();
