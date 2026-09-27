// DOM manipulation helpers. Nothing else.
// No business logic, no Supabase calls, no routing decisions.

// Shows one screen, hides all others. Used by every module for navigation.
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`screen-${name}`);
  if (target) {
    target.classList.add('active');
    window.scrollTo(0, 0);
  }
}

// Puts a button in a loading state or restores it.
function setButtonLoading(btn, isLoading) {
  if (isLoading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = 'Please wait…';
    btn.disabled  = true;
    btn.classList.add('loading');
  } else {
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    btn.disabled  = false;
    btn.classList.remove('loading');
  }
}

// Fills a <select> element. Items can be strings or { id, label } objects.
function populateSelect(selectEl, items, placeholder = 'Select…') {
  selectEl.innerHTML = `<option value="" disabled selected>${placeholder}</option>`;
  items.forEach(item => {
    const opt      = document.createElement('option');
    opt.value      = typeof item === 'string' ? item : item.id;
    opt.textContent = typeof item === 'string' ? item : item.label;
    selectEl.appendChild(opt);
  });
}

// Builds a chip multi-select grid inside containerEl.
// Each chip toggles 'selected' on click.
// Call containerEl.getSelected() to read chosen values.
function buildChipGrid(containerEl, items) {
  containerEl.innerHTML = '';
  containerEl.className = 'chip-grid';

  items.forEach(item => {
    const id    = typeof item === 'string' ? item : item.id;
    const label = typeof item === 'string' ? item : item.label;
    const chip  = document.createElement('div');
    chip.className  = 'chip';
    chip.textContent = label;
    chip.dataset.id  = id;
    chip.addEventListener('click', () => chip.classList.toggle('selected'));
    containerEl.appendChild(chip);
  });

  containerEl.getSelected = () =>
    [...containerEl.querySelectorAll('.chip.selected')].map(c => c.dataset.id);
}

// Programmatically opens a hidden file input.
function triggerFileInput(inputId) {
  document.getElementById(inputId)?.click();
}
