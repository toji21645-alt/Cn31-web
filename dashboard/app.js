// Educational Cybersecurity measures purposes: sanitized for safe sharing, review, and classroom-style inspection of the code here.

/**
 * DOM Helpers
 */
const $ = (id) => document.getElementById(id);
const setText = (id, value) => {
  const el = $(id);
  if (!el) return;
  const str = String(value ?? '0');
  if (el.textContent !== str) {
    el.textContent = str;
    el.classList.remove('bump');
    // Trigger reflow
    void el.offsetWidth;
    el.classList.add('bump');
  }
};

const formatUptime = (seconds) => {
  const s = Number(seconds || 0);
  const mins = Math.floor(s / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  if (mins > 0) return `${mins}m ${Math.floor(s % 60)}s`;
  return `${Math.floor(s)}s`;
};

/**
 * Render Tokens
 */
const renderTokens = (tokens) => {
  const list = document.getElementById('tokenList');
  if (!list) return;

  if (!tokens || tokens.length === 0) {
    list.innerHTML = '<div class="empty-state">No tokens in queue</div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  const items = tokens.slice(0, 24);

  items.forEach((item, index) => {
    const token = item.token || 'token';
    const age = item.age ?? item.age_seconds ?? 0;
    
    const row = document.createElement('div');
    row.className = 'token-row';
    row.style.animationDelay = `${Math.min(index, 12) * 50}ms`;

    const textSpan = document.createElement('span');
    textSpan.className = 'token-text';
    textSpan.textContent = token;

    const ageSpan = document.createElement('span');
    ageSpan.className = 'token-age';
    ageSpan.textContent = `${age}s`;

    row.appendChild(textSpan);
    row.appendChild(ageSpan);
    fragment.appendChild(row);
  });

  list.replaceChildren(fragment);
};

/**
 * Set Status Indicator
 */
const setStatus = (state) => {
  const label = document.getElementById('stateLabel');
  if (!label) return;
  
  const states = {
    live: { text: 'Live', className: '' },
    offline: { text: 'Offline', className: 'offline' },
    error: { text: 'Error', className: 'error' },
    syncing: { text: 'Synchronizing', className: '' },
  };
  
  const current = states[state] || states.syncing;
  label.textContent = current.text;
  label.className = 'status-indicator';
  if (current.className) {
    label.classList.add(current.className);
  }
};

/**
 * Refresh Dashboard
 */
const refreshDashboard = async () => {
  try {
    const response = await fetch('/api/status', { cache: 'no-store' });
    if (!response.ok) throw new Error('Status fetch failed');
    
    const data = await response.json();
    
    // Update metrics
    const queueSize = data.queue_size || 0;
    const peak = Math.max(data.peak_queue || 0, queueSize, 1);
    const fill = Math.min(100, Math.round((queueSize / peak) * 100));
    
    setText('queueSize', queueSize);
    setText('received', data.total_received || 0);
    setText('served', data.total_served || 0);
    setText('expired', data.total_expired || 0);
    setText('peakQueue', data.peak_queue || 0);
    setText('rate', Number(data.tokens_per_minute || 0).toFixed(2));
    setText('ttl', `${data.token_ttl_seconds || 0}s`);
    setText('uptime', formatUptime(data.uptime_seconds));
    
    // Update progress bar
    const meter = document.getElementById('queueMeter');
    if (meter) {
      meter.style.width = `${fill}%`;
    }
    
    // Render tokens
    renderTokens(data.recent_tokens || []);
    
    // Set status
    setStatus('live');
    
  } catch (error) {
    console.error('Refresh failed:', error);
    setStatus('offline');
  }
};

/**
 * Flush Queue
 */
const flushQueue = async () => {
  const button = document.getElementById('flushButton');
  if (!button) return;
  
  try {
    button.disabled = true;
    button.querySelector('span:last-child').textContent = 'Clearing...';
    
    const response = await fetch('/api/tokens', { method: 'DELETE' });
    if (!response.ok) throw new Error('Flush failed');
    
    setStatus('live');
    await refreshDashboard();
    
    // Brief success feedback
    button.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    setTimeout(() => {
      button.style.borderColor = '';
    }, 1000);
    
  } catch (error) {
    console.error('Flush failed:', error);
    setStatus('error');
  } finally {
    button.disabled = false;
    button.querySelector('span:last-child').textContent = 'Clear Queue';
  }
};

/**
 * Initialize
 */
document.addEventListener('DOMContentLoaded', () => {
  // Set initial state
  setStatus('syncing');
  
  // Attach event listeners
  document.getElementById('refreshButton')?.addEventListener('click', refreshDashboard);
  document.getElementById('flushButton')?.addEventListener('click', flushQueue);
  
  // Initial load
  refreshDashboard();
  
  // Auto-refresh every 3 seconds
  window.setInterval(refreshDashboard, 3000);
});

// Handle visibility change - refresh when tab becomes visible
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    refreshDashboard();
  }
});
