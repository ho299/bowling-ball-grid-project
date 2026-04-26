// Replacement page: find the closest replacement ball, or fill gaps in your arsenal.
// Uses backend API:
//   /api/algo/replacement?id=<ballId>          — best replacement for one specific ball
//   /api/algo/gapFinder?ids=<json_array>        — best addition to complement an arsenal

let allBalls = [];
let selectedBall = null;
let currentMethod = 'arsenal'; // 'arsenal' | 'database'

const ARSENAL_KEY = 'bowliq_arsenal';
const IMAGE_BASE  = 'https://www.bowwwl.com';

// ── Arsenal storage ───────────────────────────────────────────────────────────

function getArsenalNames() {
    try {
        const data = JSON.parse(localStorage.getItem(ARSENAL_KEY) || '[]');
        return data.map(item => (typeof item === 'string' ? item : (item.name || '')));
    } catch { return []; }
}

// Returns the subset of allBalls whose names match the saved arsenal.
function getArsenalBalls() {
    const names = new Set(getArsenalNames().map(n => n.toLowerCase()));
    return allBalls.filter(b => names.has((b.name || '').toLowerCase()));
}

// Returns the database IDs of the user's arsenal balls (needs allBalls to be loaded).
function getArsenalBallIds() {
    return getArsenalBalls().map(b => b.id).filter(id => id != null);
}

// Look up a ball's database id from the loaded allBalls list.
function lookupBallId(ball) {
    const found = allBalls.find(b => b.name === ball.name);
    return found ? found.id : null;
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchBalls() {
    try {
        const res = await fetch(location.origin + '/api/balls');
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

    selectedBall = null;
    document.getElementById('rp-search').value = '';
    document.getElementById('rp-dropdown').style.display = 'none';
    document.getElementById('rp-results-section').style.display = 'none';

    refreshPickerState();
}

function refreshPickerState() {
    const notice  = document.getElementById('rp-arsenal-empty');
    const gapArea = document.getElementById('rp-gap-area');
    const arsenalBalls = getArsenalBalls();
    const arsenalEmpty = currentMethod === 'arsenal' && arsenalBalls.length === 0;

    notice.style.display  = arsenalEmpty ? 'block' : 'none';

    // Gap finder button: only useful in arsenal mode when arsenal has balls
    if (gapArea) {
        gapArea.style.display =
            currentMethod === 'arsenal' && arsenalBalls.length > 0 ? 'block' : 'none';
    }
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

    input.addEventListener('focus', () => showDropdown(dropdown, getPool()));

    document.addEventListener('click', e => {
        if (!input.contains(e.target) && !dropdown.contains(e.target))
            dropdown.style.display = 'none';
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
    renderReplacementResults();
}

// ── API calls ─────────────────────────────────────────────────────────────────

async function callReplacementApi(ballId) {
    const url = `${location.origin}/api/algo/replacement?id=${encodeURIComponent(ballId)}`;
    const res = await fetch(url);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err.detail || err.error || `HTTP ${res.status}`;
        console.error('replacement API detail:', msg);
        throw new Error(msg);
    }
    return res.json();
}

async function callGapFinderApi(ballIds) {
    const ids = encodeURIComponent(JSON.stringify(ballIds));
    const url = `${location.origin}/api/algo/gapFinder?ids=${ids}`;
    const res = await fetch(url);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

// ── Results rendering ─────────────────────────────────────────────────────────

// Called when the user picks a ball from the picker.
async function renderReplacementResults() {
    if (!selectedBall) return;

    const ballId = lookupBallId(selectedBall);
    if (!ballId) {
        showResultsError('Could not find this ball in the database.');
        return;
    }

    showLoading(`Finding replacements for ${selectedBall.name}…`);

    try {
        const results = await callReplacementApi(ballId);
        renderCards(results, 'replacement');
    } catch (e) {
        console.error('replacement API error:', e);
        showResultsError(`Could not load replacements: ${e.message}`);
    }
}

// Called when the "Find Arsenal Gaps" button is clicked.
async function renderGapFinderResults() {
    const ids = getArsenalBallIds();
    if (ids.length === 0) {
        showResultsError('None of your arsenal balls were found in the database. Try reloading the page.');
        return;
    }

    showLoading('Finding the best addition for your arsenal…');

    try {
        const results = await callGapFinderApi(ids);
        renderCards(results, 'gap');
    } catch (e) {
        console.error('gapFinder API error:', e);
        showResultsError(`Could not load gap finder results: ${e.message}`);
    }
}

function showLoading(msg) {
    const section = document.getElementById('rp-results-section');
    section.style.display = 'block';
    document.getElementById('rp-results').innerHTML =
        `<p class="rp-notice">${msg}</p>`;
}

function showResultsError(msg) {
    const section = document.getElementById('rp-results-section');
    section.style.display = 'block';
    document.getElementById('rp-results').innerHTML =
        `<p class="rp-notice">${msg}</p>`;
}

// Renders result cards for both replacement and gap-finder responses.
// Results are already ordered best-first by the backend.
function renderCards(results, mode) {
    const div = document.getElementById('rp-results');
    div.innerHTML = '';

    if (!results || results.length === 0) {
        div.innerHTML = '<p class="rp-notice">No results found. Algorithm values (early/late, hook, angular) may not be populated in the database yet.</p>';
        return;
    }

    const heading = document.createElement('h2');
    heading.className = 'rp-results-heading';
    heading.textContent = mode === 'gap'
        ? 'Best additions for your arsenal'
        : `Top replacements for ${selectedBall ? selectedBall.name : ''}`;
    div.appendChild(heading);

    // Normalize scores to 0–100% within this result set.
    // Replacement: lower replacementScore = better → invert for display.
    // Gap finder:  higher shortestDistanceToAnySource = better → use directly.
    const scoreKey = mode === 'gap' ? 'shortestDistanceToAnySource' : 'replacementScore';
    const rawScores = results.map(r => Number(r[scoreKey]) || 0);
    const maxScore  = Math.max(...rawScores, 0.001);

    results.slice(0, 5).forEach(r => {
        const raw = Number(r[scoreKey]) || 0;
        const pct = mode === 'gap'
            ? Math.round((raw / maxScore) * 100)
            : Math.round((1 - raw / maxScore) * 100);
        const label = mode === 'gap' ? `${pct}% gap fill` : `${pct}% match`;
        div.appendChild(buildResultCard(r, Math.max(0, pct), label));
    });
}

function buildResultCard(result, pct, scoreLabel) {
    const card = document.createElement('div');
    card.className = 'rp-card';

    // Open the shared ball detail pop-up on click.
    // Normalise the flat result fields into the specs-array format showBallDetail expects.
    card.addEventListener('click', () => {
        if (typeof window.showBallDetail !== 'function') return;
        window.showBallDetail({
            name:           result.name,
            brand:          result.brand,
            image:          result.image,
            release_date:   result.release_date,
            factory_finish: result.factory_finish,
            discontinued:   result.discontinued,
            overseas:       result.overseas,
            specs: [{
                weight:           result.weight,
                rg:               result.rg,
                diff:             result.diff,
                mb_diff:          result.mb_diff,
                hook_potential:   result.hook_potential,
                early_v_late:     result.early_v_late,
                smooth_v_angular: result.smooth_v_angular,
            }],
        });
    });

    const imgHtml = result.image
        ? `<img class="rp-card-img" src="${IMAGE_BASE}${result.image}" alt="${result.name || ''}" loading="lazy" onerror="this.style.display='none'">`
        : `<div class="rp-card-img-placeholder"></div>`;

    const specParts = [];
    if (result.rg   != null) specParts.push(`RG: ${result.rg}`);
    if (result.diff != null) specParts.push(`Diff: ${result.diff}`);
    const specsHtml = specParts.length
        ? `<div class="rp-card-specs">${specParts.join(' · ')}</div>`
        : '';

    card.innerHTML = `
        <div class="rp-card-img-wrap">${imgHtml}</div>
        <div class="rp-card-body">
            <div class="rp-card-name">${result.name || 'Unknown'}</div>
            ${result.brand ? `<div class="rp-card-brand">${result.brand}</div>` : ''}
            ${specsHtml}
        </div>
        <div class="rp-score-wrap">
            <div class="rp-score-bar-bg">
                <div class="rp-score-bar-fill" style="width:${pct}%"></div>
            </div>
            <span class="rp-score-pct">${scoreLabel}</span>
        </div>
    `;
    return card;
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('method-arsenal').addEventListener('click', () => setMethod('arsenal'));
    document.getElementById('method-database').addEventListener('click', () => setMethod('database'));
    document.getElementById('rp-gap-btn').addEventListener('click', renderGapFinderResults);

    setupPicker();
    fetchBalls();
});