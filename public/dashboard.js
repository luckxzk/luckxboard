'use strict';

let chart        = null;
let currentRange = '1h';

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  loadAll();
  startClock();
  setInterval(loadAll, 30000);
});

async function loadAll() {
  await Promise.all([loadStats(), loadPlayers(), loadServerInfo(), loadHistory()]);
}

async function loadStats() {
  try {
    const res  = await fetch('/api/stats');
    const data = await res.json();
    document.getElementById('val-online').textContent = data.online  ?? '--';
    document.getElementById('val-peak').textContent   = data.peak    ?? '--';
    document.getElementById('val-total').textContent  = data.total   ?? '--';
    document.getElementById('val-banned').textContent = data.banned  ?? '--';
  } catch (err) { console.error('stats:', err); }
}

async function loadServerInfo() {
  try {
    const res  = await fetch('/api/server-info');
    const data = await res.json();
    document.getElementById('server-node').textContent   = data.nodeVersion ?? '--';
    document.getElementById('server-uptime').textContent = data.uptime      ?? '--';
    document.getElementById('server-memory').textContent = data.memory      ?? '--';
    document.getElementById('server-cpu').textContent    = data.cpu         ?? '--';
    document.getElementById('server-ping').textContent   = data.ping        ?? '--';
    document.getElementById('server-region').textContent = data.region      ?? '--';
  } catch (err) { console.error('server-info:', err); }
}

async function loadPlayers() {
  try {
    const res     = await fetch('/api/players');
    const players = await res.json();
    const tbody   = document.getElementById('players-tbody');

    document.getElementById('players-count').textContent = `${players.length} jogadores`;

    if (!players.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:40px">Nenhum jogador encontrado</td></tr>`;
      return;
    }

    const maxExp = Math.max(...players.map(p => p.experience || 0), 1);
    const colors = ['#00c8ff','#00e676','#a855f7','#ffcc00','#ff6b35','#00e5ff'];

    tbody.innerHTML = players.map(p => {
      const status     = p.isBanned ? 'banned' : 'online';
      const badgeClass = `badge--${status}`;
      const badgeLabel = p.isBanned ? 'Banido' : 'Online';
      const badgeIcon  = p.isBanned ? 'x-circle' : 'circle';
      const lastLogin  = p.lastLogin
        ? new Date(p.lastLogin).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })
        : '--';
      const expPct = Math.round(((p.experience || 0) / maxExp) * 100);
      const color  = colors[(p.id || 0) % colors.length];

      return `
        <tr>
          <td>
            <div class="player-cell">
              <div class="avatar" style="background:${color}18;color:${color};border:1px solid ${color}30">
                ${(p.username || '?').charAt(0).toUpperCase()}
              </div>
              <span class="player-name">${p.username ?? '--'}</span>
            </div>
          </td>
          <td class="player-id">#${p.id ?? '--'}</td>
          <td class="player-ip">${p.ip ?? '--'}</td>
          <td style="color:var(--muted);font-size:11px">${p.country ?? '--'} / ${p.region ?? '--'}</td>
          <td>
            <div class="stat-bar">
              <span style="font-size:11px;min-width:32px">${p.experience ?? 0}</span>
              <div class="stat-bar-bg">
                <div class="stat-bar-fill" style="width:${expPct}%"></div>
              </div>
            </div>
          </td>
          <td style="font-size:11px;color:var(--muted)">${lastLogin}</td>
          <td>
            <span class="badge ${badgeClass}">
              <i data-lucide="${badgeIcon}"></i>
              ${badgeLabel}
            </span>
          </td>
          <td>
            <button class="action-btn" title="Ver perfil"><i data-lucide="eye"></i></button>
            <button class="action-btn btn--danger" title="Banir" style="margin-left:4px"><i data-lucide="shield-off"></i></button>
          </td>
        </tr>
      `;
    }).join('');

    lucide.createIcons();
  } catch (err) { console.error('players:', err); }
}

async function loadHistory() {
  try {
    const res  = await fetch(`/api/history?range=${currentRange}`);
    const data = await res.json();

    if (!chart) {
      initChart(data.labels, data.values);
    } else {
      chart.data.labels           = data.labels;
      chart.data.datasets[0].data = data.values;
      chart.update('active');
    }
  } catch (err) { console.error('history:', err); }
}

function initChart(labels, values) {
  const ctx      = document.getElementById('playerChart').getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 220);
  gradient.addColorStop(0,   'rgba(0,200,255,0.25)');
  gradient.addColorStop(0.6, 'rgba(0,200,255,0.05)');
  gradient.addColorStop(1,   'rgba(0,200,255,0.00)');

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Jogadores',
        data: values,
        borderColor: '#00c8ff',
        borderWidth: 2,
        pointBackgroundColor: '#00c8ff',
        pointBorderColor: '#0a0f1a',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
        fill: true,
        backgroundColor: gradient,
        tension: 0.4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827',
          borderColor: '#1e2d42',
          borderWidth: 1,
          titleColor: '#e2ecf8',
          bodyColor: '#00c8ff',
          padding: 12,
          cornerRadius: 8,
          callbacks: { label: c => `  ${c.parsed.y} jogadores` },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(30,45,66,0.6)' },
          ticks: { color: '#4a6080', font: { size: 10, family: 'Poppins' } },
        },
        y: {
          grid: { color: 'rgba(30,45,66,0.6)' },
          ticks: { color: '#4a6080', font: { size: 10, family: 'Poppins' } },
          min: 0,
        },
      },
    },
  });
}

async function setRange(range, el) {
  currentRange = range;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('tab--active'));
  el.classList.add('tab--active');
  await loadHistory();
}

async function refreshData() {
  const btn = document.getElementById('refreshBtn');
  btn.classList.add('spinning');
  await loadAll();
  setTimeout(() => btn.classList.remove('spinning'), 600);
}

function startClock() {
  const tick = () => {
    document.getElementById('clock-val').textContent =
      new Date().toLocaleTimeString('pt-BR');
  };
  tick();
  setInterval(tick, 1000);
}