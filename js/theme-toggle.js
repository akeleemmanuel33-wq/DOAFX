const THEME_KEY = 'doafx-theme';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const preferred = saved || 'dark'; // dark is the DOAFX default
  applyTheme(preferred);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  const toggleBtns = document.querySelectorAll('[data-theme-toggle]');
  toggleBtns.forEach((btn) => btn.addEventListener('click', toggleTheme));
});