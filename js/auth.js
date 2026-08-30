// js/auth.js — shared helpers used across signup/login/forgot-password pages

function initPasswordToggles() {
  document.querySelectorAll('[data-password-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.passwordToggle);
      if (!input) return;
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
      btn.innerHTML = isHidden ? eyeOffIcon() : eyeIcon();
    });
  });
}

function eyeIcon() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

function eyeOffIcon() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a20.3 20.3 0 015.06-5.94M9.9 4.24A10.94 10.94 0 0112 4c7 0 11 8 11 8a20.29 20.29 0 01-3.22 4.41M14.12 14.12a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
}

function setButtonLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.classList.toggle('loading', loading);
}

function showFormError(el, message) {
  if (!el) return;
  el.textContent = message;
  el.classList.add('visible');
}

function hideFormError(el) {
  if (!el) return;
  el.classList.remove('visible');
}

function isValidUsername(value) {
  // letters, numbers, underscores only — 3 to 20 chars
  return /^[a-zA-Z0-9_]{3,20}$/.test(value);
}

document.addEventListener('DOMContentLoaded', () => {
  initPasswordToggles();
});