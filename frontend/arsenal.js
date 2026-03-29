// Arsenal page: manage the user's personal ball collection with scores and usage data

const ARSENAL_KEY = 'bowliq_arsenal';
const IMAGE_BASE  = 'https://www.bowwwl.com';

let allBalls   = [];      // full API ball list (for search autocomplete)
let pendingBall = null;   // ball currently selected in the "Add" search input

// ── localStorage helpers ──────────────────────────────────────────────────────

function loadArsenal() {
    try { return JSON.parse(localStorage.getItem(ARSENAL_KEY) || '[]'); } catch { return []; }
}

function saveArsenal(data) {
    localStorage.setItem(ARSENAL_KEY, JSON.stringify(data));
}

// ── Data operations ───────────────────────────────────────────────────────────

// Returns 'ok' or 'already_added'
function addBall(ball, weight) {
    const arsenal = loadArsenal();
    if (arsenal.some(b => b.name.toLowerCase() === ball.name.toLowerCase())) {
        return 'already_added';
    }
    arsenal.push({
        name:        ball.name,
        brand:       ball.brand  || '',
        image:       ball.image  || null,
        weight:      parseInt(weight, 10),
        scores:      [],
        gamesPlayed: 0,
        condition:   '',
        notes:       '',
        dateAdded:   new Date().toISOString().slice(0, 10)
    });
    saveArsenal(arsenal);
    return 'ok';
}

function removeBall(name) {
    saveArsenal(loadArsenal().filter(b => b.name !== name));
}

function addScore(name, score) {
    const arsenal = loadArsenal();
    const ball = arsenal.find(b => b.name === name);
    if (!ball) return;
    ball.scores.push(score);
    // Keep gamesPlayed in sync — auto-increment if it hasn't been set manually above scores.length
    if (ball.gamesPlayed < ball.scores.length) ball.gamesPlayed = ball.scores.length;
    saveArsenal(arsenal);
}

function updateUsage(name, { gamesPlayed, condition, notes }) {
    const arsenal = loadArsenal();
    const ball = arsenal.find(b => b.name === name);
    if (!ball) return;
    if (gamesPlayed !== undefined) ball.gamesPlayed = Math.max(0, parseInt(gamesPlayed, 10) || 0);
    if (condition   !== undefined) ball.condition   = condition;
    if (notes       !== undefined) ball.notes       = notes;
    saveArsenal(arsenal);
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchBalls() {
    try {
        const res = await fetch('http://localhost:3000/api/balls');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        allBalls = await res.json();
    } catch (e) {
        console.error('arsenal: failed to load balls', e);
        allBalls = [];
    }
    setupSearch();
}

// ── Search / add form ─────────────────────────────────────────────────────────

function setupSearch() {
    const input    = document.getElementById('arsenal-search');
    const dropdown = document.getElementById('arsenal-dropdown');
    const clearBtn = document.getElementById('arsenal-search-clear');
    const addBtn   = document.getElementById('arsenal-add-btn');

    input.addEventListener('input', () => {
        const q = input.value.toLowerCase().trim();
        const matches = q
            ? allBalls.filter(b =>
                (b.name  || '').toLowerCase().includes(q) ||
                (b.brand || '').toLowerCase().includes(q))
            : allBalls;
        showSearchDropdown(dropdown, matches);
        if (!q) { pendingBall = null; addBtn.disabled = true; }
    });

    input.addEventListener('focus', () => showSearchDropdown(dropdown, allBalls));

    document.addEventListener('click', e => {
        if (!input.contains(e.target) && !dropdown.contains(e.target))
            dropdown.style.display = 'none';
    });

    clearBtn.addEventListener('click', () => {
        input.value = '';
        pendingBall = null;
        addBtn.disabled = true;
        dropdown.style.display = 'none';
        hideAddError();
    });

    addBtn.addEventListener('click', () => {
        if (!pendingBall) return;
        const weight = document.getElementById('arsenal-weight').value;
        const result = addBall(pendingBall, weight);
        if (result === 'already_added') {
            showAddError(`${pendingBall.name} is already in your arsenal.`);
            return;
        }
        hideAddError();
        input.value = '';
        pendingBall = null;
        addBtn.disabled = true;
        renderArsenal();
    });
}

function showSearchDropdown(dropdown, balls) {
    dropdown.innerHTML = '';
    const visible = balls.slice(0, 80);
    visible.forEach(ball => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.innerHTML = `<span class="di-name">${ball.name}</span>` +
                         (ball.brand ? `<span class="di-brand">${ball.brand}</span>` : '');
        item.addEventListener('mousedown', e => {
            e.preventDefault();
            pendingBall = ball;
            document.getElementById('arsenal-search').value = ball.name;
            dropdown.style.display = 'none';
            document.getElementById('arsenal-add-btn').disabled = false;
            hideAddError();
        });
        dropdown.appendChild(item);
    });
    dropdown.style.display = visible.length ? 'block' : 'none';
}

function showAddError(msg) {
    const el = document.getElementById('arsenal-add-error');
    el.textContent = msg;
    el.style.display = 'block';
}

function hideAddError() {
    const el = document.getElementById('arsenal-add-error');
    el.textContent = '';
    el.style.display = 'none';
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderArsenal() {
    const listEl  = document.getElementById('arsenal-list');
    const countEl = document.getElementById('arsenal-count');
    const arsenal = loadArsenal();

    countEl.textContent = arsenal.length ? `(${arsenal.length})` : '';
    listEl.innerHTML = '';

    if (arsenal.length === 0) {
        listEl.innerHTML = '<p class="arsenal-empty">Your arsenal is empty. Search above to add a ball.</p>';
        return;
    }

    arsenal.forEach(entry => listEl.appendChild(buildCard(entry)));
}

function buildCard(entry) {
    const scores = entry.scores || [];
    const avg    = scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;
    const recent = scores.slice(-5).reverse();
    const condLabels = { dry: 'Dry', medium: 'Medium', heavy: 'Heavy', '': '' };

    const card = document.createElement('div');
    card.className = 'arsenal-card';
    card.dataset.name = entry.name;

    const imgHtml = entry.image
        ? `<img class="arsenal-card-img" src="${IMAGE_BASE}${entry.image}" alt="${entry.name}" loading="lazy" onerror="this.style.display='none'">`
        : `<div class="arsenal-card-img-placeholder"></div>`;

    const avgText    = avg !== null ? `Avg: ${avg}` : 'No scores yet';
    const gamesText  = `${entry.gamesPlayed} game${entry.gamesPlayed !== 1 ? 's' : ''}`;
    const condLabel  = condLabels[entry.condition] || '';
    const metaParts  = [entry.brand, `${entry.weight} lb`, condLabel].filter(Boolean);

    const scoreChipsHtml = recent.length
        ? recent.map(s => `<span class="arsenal-score-chip">${s}</span>`).join('')
        : '<span class="arsenal-no-scores">None yet</span>';

    card.innerHTML = `
        <div class="arsenal-card-header">
            <div class="arsenal-card-img-wrap">${imgHtml}</div>
            <div class="arsenal-card-info">
                <div class="arsenal-card-name">${entry.name}</div>
                <div class="arsenal-card-meta">${metaParts.join(' · ')}</div>
                <div class="arsenal-card-stats">${avgText} · ${gamesText}</div>
            </div>
            <button class="arsenal-remove-btn" data-name="${entry.name}">Remove</button>
        </div>

        <details class="arsenal-details">
            <summary class="arsenal-details-summary">Scores &amp; Usage</summary>
            <div class="arsenal-details-body">

                <div class="arsenal-section-label">Log a Score</div>
                <div class="arsenal-score-entry-row">
                    <input type="number" class="arsenal-score-input" min="0" max="300" placeholder="0–300">
                    <button class="arsenal-score-add-btn">Add</button>
                </div>
                <div class="arsenal-scores-recent">
                    <span class="arsenal-section-sublabel">Last 5 scores:</span>
                    <div class="arsenal-score-chips">${scoreChipsHtml}</div>
                </div>

                <div class="arsenal-section-label arsenal-usage-label">Usage Data</div>
                <div class="arsenal-usage-grid">
                    <div class="arsenal-usage-field">
                        <label class="fp-label">Total Games Played</label>
                        <input type="number" class="arsenal-games-input fp-num" min="0"
                               value="${entry.gamesPlayed}" placeholder="0">
                    </div>
                    <div class="arsenal-usage-field">
                        <label class="fp-label">Preferred Lane Condition</label>
                        <select class="arsenal-condition-select fp-select">
                            <option value=""     ${entry.condition === ''       ? 'selected' : ''}>Any</option>
                            <option value="dry"  ${entry.condition === 'dry'    ? 'selected' : ''}>Dry</option>
                            <option value="medium" ${entry.condition === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="heavy" ${entry.condition === 'heavy'  ? 'selected' : ''}>Heavy</option>
                        </select>
                    </div>
                </div>
                <div class="arsenal-usage-field arsenal-notes-field">
                    <label class="fp-label">Notes</label>
                    <textarea class="arsenal-notes-input" rows="3"
                              placeholder="Drilling layout, when to use this ball, observations…">${entry.notes || ''}</textarea>
                </div>
                <div class="arsenal-save-row">
                    <button class="arsenal-save-btn">Save Changes</button>
                    <span class="arsenal-saved-msg" style="display:none">Saved!</span>
                </div>

            </div>
        </details>
    `;

    // Remove ball
    card.querySelector('.arsenal-remove-btn').addEventListener('click', () => {
        removeBall(entry.name);
        renderArsenal();
    });

    // Add score
    const scoreInput   = card.querySelector('.arsenal-score-input');
    const scoreAddBtn  = card.querySelector('.arsenal-score-add-btn');
    scoreAddBtn.addEventListener('click', () => {
        const val = parseInt(scoreInput.value, 10);
        if (isNaN(val) || val < 0 || val > 300) {
            scoreInput.classList.add('invalid');
            return;
        }
        scoreInput.classList.remove('invalid');
        addScore(entry.name, val);
        scoreInput.value = '';
        renderArsenal();
        // Re-open the details panel after re-render
        const newCard = document.querySelector(`.arsenal-card[data-name="${CSS.escape(entry.name)}"]`);
        if (newCard) newCard.querySelector('.arsenal-details').open = true;
    });
    scoreInput.addEventListener('keydown', e => { if (e.key === 'Enter') scoreAddBtn.click(); });
    scoreInput.addEventListener('input',   () => scoreInput.classList.remove('invalid'));

    // Save usage changes
    card.querySelector('.arsenal-save-btn').addEventListener('click', () => {
        const gamesPlayed = card.querySelector('.arsenal-games-input').value;
        const condition   = card.querySelector('.arsenal-condition-select').value;
        const notes       = card.querySelector('.arsenal-notes-input').value;
        updateUsage(entry.name, { gamesPlayed, condition, notes });
        const msg = card.querySelector('.arsenal-saved-msg');
        msg.style.display = 'inline';
        setTimeout(() => { msg.style.display = 'none'; }, 2000);
        // Refresh header stats without closing the panel
        const newCard = document.querySelector(`.arsenal-card[data-name="${CSS.escape(entry.name)}"]`);
        if (newCard) {
            const updated = loadArsenal().find(b => b.name === entry.name);
            if (updated) {
                const condParts = [updated.brand, `${updated.weight} lb`, condLabels[updated.condition] || ''].filter(Boolean);
                newCard.querySelector('.arsenal-card-meta').textContent  = condParts.join(' · ');
            }
        }
    });

    return card;
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    renderArsenal();
    fetchBalls();
});