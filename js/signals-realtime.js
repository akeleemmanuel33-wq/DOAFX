// js/signals-realtime.js

async function loadRecentSignals() {
  const feed = document.getElementById('signal-feed');
  if (feed) {
    feed.innerHTML = `
      <div class="skeleton skeleton-block"></div>
      <div class="skeleton skeleton-block"></div>
      <div class="skeleton skeleton-block"></div>
    `;
  }

  const { data, error } = await supabaseClient
    .from('signals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    // Likely RLS blocking (no active subscription) — treat as empty feed
    renderSignalFeed([]);
    return;
  }
  renderSignalFeed(data);
}

function renderSignalFeed(signals) {
  const feed = document.getElementById('signal-feed');
  if (!feed) return;

  if (!signals || signals.length === 0) {
    feed.innerHTML = `<div class="empty-feed">No signals yet. New signals will appear here the moment they're sent.</div>`;
  } else {
    feed.innerHTML = signals.map((s) => signalCardHTML(s)).join('');
  }

  feed.classList.remove('fade-slide-in');
  void feed.offsetWidth;
  feed.classList.add('fade-slide-in');
}

function renderNoSubscriptionFeed() {
  const feed = document.getElementById('signal-feed');
  if (!feed) return;

  feed.innerHTML = `
    <div class="no-plan-state card">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
      <h3>Subscribe to see signals</h3>
      <p>Signals are only visible to subscribers with an active plan.</p>
      <a href="subscribe.html" class="btn btn-primary">View Plans</a>
    </div>
  `;
}

function signalCardHTML(signal, isNew = false) {
  const time = new Date(signal.created_at).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const directionClass = signal.direction === 'buy' ? 'direction-buy' : 'direction-sell';
  const newClass = isNew ? `new-signal ${signal.direction === 'buy' ? 'buy' : 'sell'}` : '';

  return `
    <div class="signal-card card ${newClass}" data-signal-id="${signal.id}">
      <div class="signal-left">
        <span class="signal-pair-name">${signal.pair}</span>
        <span class="direction-tag ${directionClass}">${signal.direction.toUpperCase()}</span>
      </div>
      <div class="signal-details">
        <span>Entry <strong>${signal.entry_price}</strong></span>
        ${signal.stop_loss ? `<span>SL <strong>${signal.stop_loss}</strong></span>` : ''}
        ${signal.take_profit ? `<span>TP <strong>${signal.take_profit}</strong></span>` : ''}
      </div>
      <span class="signal-time">${time}</span>
    </div>
  `;
}

function subscribeToSignals() {
  const channel = supabaseClient
    .channel('signals-feed')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'signals' },
      (payload) => {
        const feed = document.getElementById('signal-feed');
        if (!feed) return;

        // Clear "no signals yet" empty state if present
        const empty = feed.querySelector('.empty-feed');
        if (empty) empty.remove();

        feed.insertAdjacentHTML('afterbegin', signalCardHTML(payload.new, true));
        playNotificationChime();
      }
    )
    .subscribe();

  return channel;
}

function playNotificationChime() {
  // Lightweight in-app toast — actual push notification handled separately in Phase 8
  const toast = document.createElement('div');
  toast.className = 'signal-toast';
  toast.textContent = 'New signal received';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}