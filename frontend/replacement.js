// Replacement page: find the closest replacement ball from arsenal or full database

let allBalls = [];
let selectedBall = null;
let currentMethod = 'arsenal'; // 'arsenal' | 'database'

// Metrics used for similarity scoring.
// weight multiplier lets spec fields (rg, diff) count more than subjective ratings.
const METRICS = [
    { key: 'hook_potential',   accessor: (b, _w) => b.hook_potential,       w: 1   },
    { key: 'early_v_late',     accessor: (b, _w) => b.early_v_late,          w: 1   },
    { key: 'smooth_v_angular', accessor: (b, _w) => b.smooth_v_angular,      w: 1   },
    { key: 'rg',               accessor: (b, wt) => getSpec(b, wt, 'rg'),    w: 1.5 },
    { key: 'diff',             accessor: (b, wt) => getSpec(b, wt, 'diff'),  w: 1.5 },
    { key: 'mb_diff',          accessor: (b, wt) => getSpec(b, wt, 'mb_diff'), w: 1 },
];

function getSpec(ball, weight, field) {
    if (!Array.isArray(ball.specs)) return null;
    const spec = ball.specs.find(s => s.weight === weight);
    return spec ? spec[field] : null;
}

// ── Arsenal storage ───────────────────────────────────────────────────────────
// Arsenal is stored in localStorage as a JSON array of ball names.
// The Arsenal page (under construction) will write to this key.

const ARSENAL_KEY = 'bowliq_arsenal';

function getArsenalNames() {
    try {
        const data = JSON.parse(localStorage.getItem(ARSENAL_KEY) || '[]');
        // Handle both legacy array-of-strings and current array-of-objects format
        return data.map(item => (typeof item === 'string' ? item : (item.name || '')));
    } catch { return []; }
}

function getArsenalBalls() {
    const names = new Set(getArsenalNames().map(n => n.toLowerCase()));
    return allBalls.filter(b => names.has((b.name || '').toLowerCase()));
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchBalls() {
    try {
        const res = await fetch('http://localhost:3000/api/balls');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        allBalls = await res.json();
    } catch (e) {
        console.error('replacement: failed to load balls', e);
        allBalls = [];
    }
    refreshPickerState();
}

// ── Method toggle ─────────────────────────────────────────────────────────────

function setMethod(method) {
    currentMethod = method;
    document.getElementById('method-arsenal').classList.toggle('active', method === 'arsenal');
    document.getElementById('method-database').classList.toggle('active', method === 'database');

    // Reset selection whenever the pool changes
    selectedBall = null;
    document.getElementById('rp-search').value = '';
    document.getElementById('rp-dropdown').style.display = 'none';
    document.getElementById('rp-results-section').style.display = 'none';

    refreshPickerState();
}

function refreshPickerState() {
    const notice = document.getElementById('rp-arsenal-empty');
    const showNotice = currentMethod === 'arsenal' && getArsenalBalls().length === 0;
    notice.style.display = showNotice ? 'block' : 'none';
}

function getPool() {
    return currentMethod === 'arsenal' ? getArsenalBalls() : allBalls;
}

// ── Search / dropdown ─────────────────────────────────────────────────────────

function setupPicker() {
    const input    = document.getElementById('rp-search');
    const dropdown = document.getElementById('rp-dropdown');
    const clearBtn = document.getElementById('rp-clear');

    input.addEventListener('input', () => {
        const q = input.value.toLowerCase().trim();
        const pool = getPool();
        const matches = q
            ? pool.filter(b =>
                (b.name  || '').toLowerCase().includes(q) ||
                (b.brand || '').toLowerCase().includes(q))
            : pool;
        showDropdown(dropdown, matches);
    });

    input.addEventListener('focus', () => {
        showDropdown(dropdown, getPool());
    });

    document.addEventListener('click', e => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });

    clearBtn.addEventListener('click', () => {
        selectedBall = null;
        input.value = '';
        dropdown.style.display = 'none';
        document.getElementById('rp-results-section').style.display = 'none';
    });
}

function showDropdown(dropdown, balls) {
    dropdown.innerHTML = '';
    const visible = balls.slice(0, 80);
    visible.forEach(ball => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.innerHTML = `<span class="di-name">${ball.name}</span>` +
                         (ball.brand ? `<span class="di-brand">${ball.brand}</span>` : '');
        item.addEventListener('mousedown', e => {
            e.preventDefault();
            pickBall(ball);
        });
        dropdown.appendChild(item);
    });
    dropdown.style.display = visible.length ? 'block' : 'none';
}

function pickBall(ball) {
    selectedBall = ball;
    document.getElementById('rp-search').value = ball.name;
    document.getElementById('rp-dropdown').style.display = 'none';
    renderResults();
}

// ── Similarity scoring ────────────────────────────────────────────────────────

// Build min/max range for each metric across all balls at the given weight.
function computeRanges(balls, weight) {
    const ranges = {};
    METRICS.forEach(m => {
        const vals = balls.map(b => m.accessor(b, weight)).filter(v => v != null);
        ranges[m.key] = vals.length >= 2
            ? { min: Math.min(...vals), max: Math.max(...vals) }
            : null;
    });
    return ranges;
}

// Returns a 0–1 score: 1 = identical, 0 = maximally different.
// Uses weighted normalised Euclidean distance.
function similarity(target, candidate, weight, ranges) {
    let sumSq = 0, totalW = 0;
    METRICS.forEach(m => {
        const r = ranges[m.key];
        if (!r || r.max === r.min) return;
        const vt = m.accessor(target, weight);
        const vc = m.accessor(candidate, weight);
        if (vt == null || vc == null) return;
        const diff = ((vt - vc) / (r.max - r.min)) * m.w;
        sumSq  += diff * diff;
        totalW += m.w * m.w;
    });
    if (totalW === 0) return 0;
    const dist = Math.sqrt(sumSq / totalW);
    return Math.max(0, 1 - dist);
}

// ── Results rendering ─────────────────────────────────────────────────────────

const IMAGE_BASE = 'https://www.bowwwl.com';

function renderResults() {
    if (!selectedBall) return;

    const resultsSection = document.getElementById('rp-results-section');
    const resultsDiv     = document.getElementById('rp-results');
    resultsSection.style.display = 'block';

    const weight     = parseInt(document.getElementById('rp-weight').value, 10);
    const candidates = allBalls.filter(b => b !== selectedBall && b.name !== selectedBall.name);
    const ranges     = computeRanges(allBalls, weight);

    const scored = candidates
        .map(b => ({ ball: b, score: similarity(selectedBall, b, weight, ranges) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    resultsDiv.innerHTML = '';

    if (scored.length === 0) {
        resultsDiv.innerHTML = '<p class="rp-notice">No replacement candidates found.</p>';
        return;
    }

    const heading = document.createElement('h2');
    heading.className = 'rp-results-heading';
    heading.textContent = `Top replacements for ${selectedBall.name}`;
    resultsDiv.appendChild(heading);

    scored.forEach(({ ball, score }) => {
        const pct  = Math.round(score * 100);
        const card = document.createElement('div');
        card.className = 'rp-card';

        const imgHtml = ball.image
            ? `<img class="rp-card-img" src="${IMAGE_BASE}${ball.image}" alt="${ball.name}" loading="lazy" onerror="this.style.display='none'">`
            : `<div class="rp-card-img-placeholder"></div>`;

        card.innerHTML = `
            <div class="rp-card-img-wrap">${imgHtml}</div>
            <div class="rp-card-body">
                <div class="rp-card-name">${ball.name}</div>
                ${ball.brand ? `<div class="rp-card-brand">${ball.brand}</div>` : ''}
                ${buildSpecRow(ball, weight)}
            </div>
            <div class="rp-score-wrap">
                <div class="rp-score-bar-bg">
                    <div class="rp-score-bar-fill" style="width:${pct}%"></div>
                </div>
                <span class="rp-score-pct">${pct}% match</span>
            </div>
        `;
        resultsDiv.appendChild(card);
    });
}

function buildSpecRow(ball, weight) {
    const spec = Array.isArray(ball.specs) ? ball.specs.find(s => s.weight === weight) : null;
    const parts = [];
    if (ball.hook_potential != null) parts.push(`Hook: ${ball.hook_potential}`);
    if (spec) {
        if (spec.rg   != null) parts.push(`RG: ${spec.rg}`);
        if (spec.diff != null) parts.push(`Diff: ${spec.diff}`);
    }
    return parts.length ? `<div class="rp-card-specs">${parts.join(' · ')}</div>` : '';
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('method-arsenal').addEventListener('click', () => setMethod('arsenal'));
    document.getElementById('method-database').addEventListener('click', () => setMethod('database'));
    document.getElementById('rp-weight').addEventListener('change', () => {
        if (selectedBall) renderResults();
    });

    setupPicker();
    fetchBalls();
});