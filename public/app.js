'use strict';

/* AIJajan UI — plain fetch against the API in server.js. All state lives on
 * the server; this file only renders and posts actions. */

const $ = (id) => document.getElementById(id);
const money = (n) => '$' + Number(n).toFixed(2);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const time = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + new Date(iso).toLocaleDateString();

async function api(pathName, body) {
  const res = await fetch(pathName, body === undefined
    ? {}
    : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

let current = null;

function render(state) {
  current = state;
  $('moodEmoji').textContent = state.mood.emoji;
  $('moodLabel').textContent = state.mood.label;
  $('balance').textContent = money(state.balance);
  $('balance').classList.toggle('low', state.balance < 5);
  $('paypalMode').textContent = 'PayPal: ' + state.modes.paypal;
  $('aiMode').textContent = 'AI: ' + state.modes.ai;
  $('frozenBadge').classList.toggle('hidden', !state.frozen);
  $('freezeToggle').checked = state.frozen;

  // Rules form (only overwrite when not focused, to avoid clobbering typing)
  if (document.activeElement?.closest('.rules-card') == null) {
    $('ruleMax').value = state.policy.maxPerPurchase;
    $('ruleAsk').value = state.policy.askAbove;
    $('ruleGamesCap').value = state.policy.categoryCaps.games ?? '';
    $('ruleWeekly').value = state.policy.weeklyAllowance;
    $('ruleBlockSubs').checked = state.policy.blockSubscriptions;
  }

  renderPending(state);
  renderPlea(state);
  renderDiary(state);
  renderAudit(state);
  renderCatalog(state);
  $('shopBadge').classList.toggle('hidden', !(state.pending.length > 0 || state.plea));
}

// --- Tabs: one panel at a time; Shop holds the mission loop -------------------
function activateTab(name) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach((p) => { p.hidden = p.id !== 'panel-' + name; });
}
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => activateTab(t.dataset.tab)));

const CATEGORY_META = {
  domains: ['🌐', 'Domains'], hosting: ['🖥️', 'Hosting'], games: ['🎮', 'Games'],
  subscriptions: ['🔁', 'Subscriptions'], music: ['🎵', 'Music'], design: ['🎨', 'Design'],
  food: ['🍜', 'Food & drink'], transport: ['🚗', 'Transport'], bills: ['💡', 'Bills & data'],
  health: ['💊', 'Health'], home: ['🧺', 'Home'], tickets: ['🎟️', 'Tickets'],
};
let catalogFilter = 'all';
let catalogBuilt = false;

function renderCatalog(state) {
  if (!state.catalog) return;
  const chips = $('catalogChips');
  const grid = $('catalogGrid');
  if (!catalogBuilt) {
    const cats = [...new Set(state.catalog.map((i) => i.category))];
    chips.innerHTML = '';
    const mkChip = (key, label) => {
      const b = document.createElement('button');
      b.className = 'catalog-chip' + (catalogFilter === key ? ' active' : '');
      b.textContent = label;
      b.addEventListener('click', () => { catalogFilter = key; catalogBuilt = false; renderCatalog(current); });
      chips.appendChild(b);
    };
    mkChip('all', `🛍️ All (${state.catalog.length})`);
    for (const c of cats) {
      const [emoji, label] = CATEGORY_META[c] || ['🏷️', c];
      mkChip(c, `${emoji} ${label} (${state.catalog.filter((i) => i.category === c).length})`);
    }
    catalogBuilt = true;
  }
  const items = catalogFilter === 'all' ? state.catalog : state.catalog.filter((i) => i.category === catalogFilter);
  grid.innerHTML = '';
  for (const item of items) {
    const card = document.createElement('button');
    card.className = 'cat-item';
    card.innerHTML = `<span class="cat-item-name"></span>
      <span class="cat-item-meta"><span class="cat-item-vendor"></span>${item.subscription ? '<span class="cat-sub">subscription</span>' : ''}</span>
      <span class="cat-item-price">${money(item.price)}</span>`;
    card.querySelector('.cat-item-name').textContent = item.name;
    card.querySelector('.cat-item-vendor').textContent = item.vendor;
    card.title = item.blurb;
    card.addEventListener('click', () => {
      activateTab('shop');
      $('missionInput').value = 'Buy me: ' + item.name;
      $('missionInput').scrollIntoView({ behavior: 'smooth', block: 'center' });
      $('missionInput').focus();
    });
    grid.appendChild(card);
  }
}

function renderPending(state) {
  const zone = $('pendingZone');
  zone.innerHTML = state.pending.map((p) => `
    <div class="card pending-card">
      <h3>🙋 Jaja is asking permission</h3>
      <p><strong>${esc(p.item.name)}</strong> — ${money(p.item.price)} from ${esc(p.item.vendor)}<br>
      <span class="rule-tag">${esc(p.verdict.rule)}</span> ${esc(p.verdict.reason)}</p>
      <div class="action-row">
        <button class="btn btn-money" onclick="approve('${p.id}')">Approve &amp; pay</button>
        <button class="btn btn-deny" onclick="deny('${p.id}')">Deny</button>
      </div>
    </div>`).join('');
}

function renderPlea(state) {
  const zone = $('pleaZone');
  if (state.plea) {
    zone.innerHTML = `
      <div class="card plea-card">
        <h3>💌 A plea from Jaja</h3>
        <p class="plea-text">“${esc(state.plea.text)}”</p>
        <p>Requested top-up: <strong>${money(state.plea.amount)}</strong></p>
        <div class="action-row">
          <button class="btn btn-money" onclick="pleaApprove()">Approve top-up</button>
          <button class="btn btn-deny" onclick="pleaDeny()">Deny (stay strong)</button>
        </div>
      </div>`;
  } else if (state.balance < 5) {
    zone.innerHTML = `
      <div class="card plea-card">
        <h3>😭 Jaja is broke</h3>
        <p>Balance under $5. Jaja is composing a heartfelt plea…</p>
        <div class="action-row"><button class="btn btn-primary" onclick="hearPlea()">Hear the plea</button></div>
      </div>`;
  } else {
    zone.innerHTML = '';
  }
}

function renderDiary(state) {
  $('diary').innerHTML = state.diary.map((d) => `
    <div class="diary-entry"><time>${time(d.ts)}</time>${esc(d.text)}</div>`).join('')
    || '<p>No diary entries yet.</p>';
}

function renderAudit(state) {
  $('auditBody').innerHTML = state.audit.map((a) => `
    <tr>
      <td>${time(a.ts)}</td>
      <td>${esc(a.type)}</td>
      <td>${esc(a.detail)}</td>
      <td>${a.rule ? `<span class="rule-tag">${esc(a.rule)}</span>` : ''}</td>
      <td class="amt">${a.amount !== undefined ? money(a.amount) : ''}</td>
    </tr>`).join('') || '<tr><td colspan="5">Nothing yet — send Jaja on a mission.</td></tr>';
}

function renderSteps(steps) {
  $('feed').innerHTML = steps.map((s) => {
    if (s.kind === 'verdict') {
      return `<div class="step verdict-${s.decision}"><span class="decision ${s.decision}">${s.decision}</span> — ${esc(s.text)}</div>`;
    }
    return `<div class="step ${esc(s.kind)}">${esc(s.text)}</div>`;
  }).join('');
}

// --- Actions ---------------------------------------------------------------

async function sendMission() {
  const text = $('missionInput').value.trim();
  if (!text) return;
  const btn = $('missionBtn');
  btn.disabled = true; btn.textContent = 'Jaja is shopping… 🛒';
  $('feed').innerHTML = '<div class="step">Jaja grabbed the shopping list and ran out the door…</div>';
  try {
    const data = await api('/api/mission', { text });
    activateTab('shop');
    renderSteps(data.steps);
    render(data.state);
  } catch (err) {
    $('feed').innerHTML = `<div class="step verdict-BLOCK">${esc(err.message)}</div>`;
  } finally {
    btn.disabled = false; btn.textContent = 'Send Jaja shopping 🛍️';
  }
}

async function approve(id) { render((await api('/api/approve', { id })).state); }
async function deny(id) { render((await api('/api/deny', { id })).state); }
async function hearPlea() { render((await api('/api/plea', {})).state); }
async function pleaApprove() { render((await api('/api/plea/approve', {})).state); }
async function pleaDeny() { render((await api('/api/plea/deny', {})).state); }

// --- Wiring ------------------------------------------------------------------

$('missionBtn').addEventListener('click', sendMission);
$('missionInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMission(); });
document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => { $('missionInput').value = chip.dataset.mission; sendMission(); });
});
$('topupBtn').addEventListener('click', async () => {
  const amount = Number($('topupAmount').value);
  if (amount > 0) render((await api('/api/topup', { amount })).state);
});
$('freezeToggle').addEventListener('change', async (e) => {
  render(await api('/api/freeze', { frozen: e.target.checked }));
});
$('saveRules').addEventListener('click', async () => {
  const gamesCap = $('ruleGamesCap').value === '' ? {} : { games: Number($('ruleGamesCap').value) };
  render(await api('/api/policy', {
    maxPerPurchase: Number($('ruleMax').value),
    askAbove: Number($('ruleAsk').value),
    weeklyAllowance: Number($('ruleWeekly').value),
    categoryCaps: gamesCap,
    blockSubscriptions: $('ruleBlockSubs').checked,
  }));
});
$('teachRules').addEventListener('click', async () => {
  const box = $('ruleUnderstood');
  const text = $('ruleText').value.trim();
  if (!text) return;
  try {
    const r = await api('/api/policy/text', { text });
    box.innerHTML = '<strong>Jaja understood:</strong><br>' + r.understood.map(esc).join('<br>');
    render(r.state);
  } catch (err) {
    box.innerHTML = esc(err.message);
  }
});
$('resetBtn').addEventListener('click', async () => {
  $('feed').innerHTML = '';
  render(await api('/api/reset', {}));
});

api('/api/state').then(render).catch((err) => {
  document.body.insertAdjacentHTML('afterbegin', `<div class="card" style="margin:16px">Could not load state: ${esc(err.message)}</div>`);
});
