// js/dashboard-shell.js — shared across every dashboard/admin page

let currentUser = null;
let currentProfile = null;

async function requireAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = '../login.html';
    return null;
  }
  currentUser = session.user;

  const { data: profile, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if (error) {
    console.error('Failed to load profile:', error);
    alert('Could not load your account. Please log in again.');
    window.location.href = '../login.html';
    return null;
  }

  currentProfile = profile;

  if (profile.role === 'admin') {
    injectAdminLink();
  }

  return { user: currentUser, profile };
}

function injectAdminLink() {
  if (window.location.pathname.includes('/admin/')) return; // already in admin section
  const sidebar = document.getElementById('sidebar');
  if (!sidebar || document.getElementById('admin-panel-link')) return;

  const link = document.createElement('a');
  link.href = '../admin/index.html';
  link.id = 'admin-panel-link';
  link.className = 'sidebar-link';
  link.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
    Admin Panel
  `;

  const footer = sidebar.querySelector('.sidebar-footer');
  if (footer) {
    sidebar.insertBefore(link, footer);
  } else {
    sidebar.appendChild(link);
  }
}

function initMobileSidebar() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!toggle || !sidebar || !overlay) return;

  const open = () => {
    sidebar.classList.add('mobile-open');
    overlay.classList.add('visible');
  };
  const close = () => {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('visible');
  };

  toggle.addEventListener('click', open);
  overlay.addEventListener('click', close);
  sidebar.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));
}

function initLogout() {
  document.querySelectorAll('[data-logout]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      window.location.href = '../login.html';
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initMobileSidebar();
  initLogout();
});