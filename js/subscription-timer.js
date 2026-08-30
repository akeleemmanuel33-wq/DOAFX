// js/subscription-timer.js

let timerInterval = null;

function computeLiveRemaining(sub) {
  if (sub.status === 'active' && sub.last_resumed_at) {
    const elapsed = Math.floor((Date.now() - new Date(sub.last_resumed_at).getTime()) / 1000);
    return Math.max(0, sub.remaining_seconds - elapsed);
  }
  return sub.remaining_seconds;
}

function formatDuration(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');

  if (days > 0) {
    return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

async function fetchSubscription(userId) {
  const { data, error } = await supabaseClient
    .from('subscriptions')
    .select('*, plans:plan_id (label)')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch subscription:', error);
    return null;
  }
  return data;
}

function renderSubscriptionState(sub) {
  const container = document.getElementById('status-card-body');
  if (!container) return;

  if (timerInterval) clearInterval(timerInterval);

  if (!sub || sub.status === 'inactive') {
    container.innerHTML = `
      <div class="no-plan-state">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <h3>No active plan</h3>
        <p>Subscribe to a plan to start receiving live trade signals.</p>
        <a href="subscribe.html" class="btn btn-primary">View Plans</a>
      </div>
    `;
    triggerFadeIn(container);
    return;
  }

  const statusLabel = {
    active: 'Active',
    paused: 'Paused',
    expired: 'Expired',
  }[sub.status] || sub.status;

  container.innerHTML = `
    <div class="status-header">
      <div>
        <span class="status-pill ${sub.status}">${statusLabel}</span>
      </div>
      <span class="field-hint">${sub.plans?.label || ''} plan</span>
    </div>
    <div class="timer-display ${sub.status === 'active' ? 'live' : ''}" id="timer-value">--:--:--</div>
    <div class="timer-label">${sub.status === 'paused' ? 'Time remaining (paused)' : sub.status === 'expired' ? 'Subscription expired' : 'Time remaining'}</div>
    ${sub.status === 'expired' ? `<a href="subscribe.html" class="btn btn-primary">Renew Subscription</a>` : ''}
  `;

  triggerFadeIn(container);

  if (sub.status === 'expired') return;

  const timerEl = document.getElementById('timer-value');
  let remaining = computeLiveRemaining(sub);
  timerEl.textContent = formatDuration(remaining);

  if (sub.status === 'active') {
    timerInterval = setInterval(() => {
      remaining = Math.max(0, remaining - 1);
      timerEl.textContent = formatDuration(remaining);
      timerEl.classList.remove('tick');
      void timerEl.offsetWidth; // force reflow so the animation can retrigger every second
      timerEl.classList.add('tick');
      if (remaining <= 0) {
        clearInterval(timerInterval);
        // Re-fetch to reflect the server-side expiry (cron may take up to a minute)
        setTimeout(() => loadAndRenderSubscription(), 1500);
      }
    }, 1000);
  }
}

function triggerFadeIn(el) {
  el.classList.remove('fade-slide-in');
  void el.offsetWidth; // force reflow so the animation retriggers
  el.classList.add('fade-slide-in');
}

async function loadAndRenderSubscription() {
  if (!currentUser) return null;
  const sub = await fetchSubscription(currentUser.id);
  renderSubscriptionState(sub);
  return sub;
}