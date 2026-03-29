// Compare page: side-by-side bowling ball comparison

let allBalls = [];
let selectedBalls = [null, null]; // [slot0, slot1]
let filterPanels  = [null, null]; // one FilterPanel per slot, built after data loads

// All fields displayed in the comparison table, in order.
// type 'text'   => plain string value
// type 'bar'    => visual bar + value; bars relative to max of both values
// type 'spec'   => weight-dependent value, same bar behaviour
const COMPARE_FIELDS = [
    { section: 'General' },
    { key: 'brand',         label: 'Brand',           type: 'text', accessor: b => b.brand || '—' },
    { key: 'release_year',  label: 'Release Year',    type: 'text', accessor: b => b.release_date ? new Date(b.release_date).getFullYear() : '—' },
    { key: 'factory_finish',label: 'Factory Finish',  type: 'text', accessor: b => b.factory_finish || '—' },
    { key: 'discontinued',  label: 'Discontinued',    type: 'text', accessor: b => b.discontinued ? 'Yes' : 'No' },
    { key: 'overseas',      label: 'Overseas',        type: 'text', accessor: b => b.overseas ? 'Yes' : 'No' },

    { section: 'Core' },
    { key: 'core_name', label: 'Core Name', type: 'text', accessor: b => b.core_name || '—' },
    { key: 'core_type', label: 'Core Type', type: 'text', accessor: b => b.core_type || '—' },

    { section: 'Coverstock' },
    { key: 'coverstock_name', label: 'Coverstock Name', type: 'text', accessor: b => b.coverstock_name || '—' },
    { key: 'coverstock_type', label: 'Coverstock Type', type: 'text', accessor: b => b.coverstock_type || '—' },

    { section: 'Performance Ratings' },
    { key: 'hook_potential',   label: 'Hook Potential',    type: 'bar', accessor: b => b.hook_potential },
    { key: 'early_v_late',     label: 'Early vs. Late',    type: 'bar', accessor: b => b.early_v_late },
    { key: 'smooth_v_angular', label: 'Smooth vs. Angular',type: 'bar', accessor: b => b.smooth_v_angular },

    { section: 'Specs' },
    { key: 'rg',      label: 'Radius of Gyration', type: 'spec', accessor: (b, w) => getSpec(b, w, 'rg') },
    { key: 'diff',    label: 'Differential',        type: 'spec', accessor: (b, w) => getSpec(b, w, 'diff') },
    { key: 'mb_diff', label: 'MB Differential',     type: 'spec', accessor: (b, w) => getSpec(b, w, 'mb_diff') },
];

function getSpec(ball, weight, field) {
    if (!Array.isArray(ball.specs)) return null;
    const spec = ball.specs.find(s => s.weight === weight);
    return spec ? spec[field] : null;
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function fetchBalls() {
    try {
        const res = await fetch(location.origin+'/api/balls');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        allBalls = await res.json();
    } catch (e) {
        console.error('compare: failed to load balls', e);
        allBalls = [];
    }
    const weightOptions = [
        { value: '16', label: '16 lb' },
        { value: '15', label: '15 lb' },
        { value: '14', label: '14 lb' },
        { value: '13', label: '13 lb' },
        { value: '12', label: '12 lb' },
    ];

    [0, 1].forEach(idx => {
        filterPanels[idx] = new FilterPanel(document.getElementById(`compare-filter-${idx}`), {
            onChange: () => { /* dropdowns refresh on next open/focus */ },
            weightConfig: { id: `compare-weight-${idx}`, options: weightOptions, selected: '15' },
        });
        filterPanels[idx].build(allBalls);
        document.getElementById(`compare-weight-${idx}`).addEventListener('change', renderComparison);
    });

    setupSlot(0);
    setupSlot(1);
    renderComparison();
}

// ── Search / dropdown ─────────────────────────────────────────────────────────

function setupSlot(idx) {
    const input    = document.getElementById(`search-${idx}`);
    const dropdown = document.getElementById(`dropdown-${idx}`);
    const clearBtn = document.getElementById(`clear-${idx}`);

    const getPool = () => {
        const fp = filterPanels[idx];
        const weight = parseInt(document.getElementById(`compare-weight-${idx}`).value, 10);
        return fp ? allBalls.filter(b => fp.passes(b, weight)) : allBalls;
    };

    input.addEventListener('input', () => {
        const q = input.value.toLowerCase().trim();
        const pool = getPool();
        const matches = q
            ? pool.filter(b =>
                b.name.toLowerCase().includes(q) ||
                (b.brand && b.brand.toLowerCase().includes(q)))
            : pool;
        showDropdown(dropdown, matches, idx);
    });

    input.addEventListener('focus', () => {
        showDropdown(dropdown, getPool(), idx);
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', e => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });

    clearBtn.addEventListener('click', () => {
        selectedBalls[idx] = null;
        input.value = '';
        dropdown.style.display = 'none';
        renderComparison();
    });
}

function showDropdown(dropdown, balls, idx) {
    dropdown.innerHTML = '';
    const visible = balls.slice(0, 80);
    visible.forEach(ball => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.innerHTML = `<span class="di-name">${ball.name}</span>${ball.brand ? `<span class="di-brand">${ball.brand}</span>` : ''}`;
        // mousedown fires before blur so the click is not lost
        item.addEventListener('mousedown', e => {
            e.preventDefault();
            pickBall(idx, ball);
        });
        dropdown.appendChild(item);
    });
    dropdown.style.display = balls.length ? 'block' : 'none';
}

function pickBall(idx, ball) {
    selectedBalls[idx] = ball;
    document.getElementById(`search-${idx}`).value = ball.name;
    document.getElementById(`dropdown-${idx}`).style.display = 'none';
    renderComparison();
}

// ── Comparison rendering ──────────────────────────────────────────────────────

function renderComparison() {
    const panel  = document.getElementById('comparison-panel');
    const [b1, b2] = selectedBalls;

    if (!b1 && !b2) {
        panel.innerHTML = '<p class="compare-prompt">Select two bowling balls above to compare them.</p>';
        return;
    }

    const weight0 = parseInt(document.getElementById('compare-weight-0').value, 10);
    const weight1 = parseInt(document.getElementById('compare-weight-1').value, 10);

    let html = '<table class="compare-table">';

    // Header row with ball names
    html += '<thead><tr>';
    html += '<th class="ct-label-col"></th>';
    html += `<th class="ct-ball-col">${ballHeader(b1)}</th>`;
    html += `<th class="ct-ball-col">${ballHeader(b2)}</th>`;
    html += '</tr></thead><tbody>';

    COMPARE_FIELDS.forEach(field => {
        if (field.section) {
            html += `<tr class="ct-section"><td colspan="3">${field.section}</td></tr>`;
            return;
        }

        const v1 = b1 ? field.accessor(b1, weight0) : null;
        const v2 = b2 ? field.accessor(b2, weight1) : null;

        html += '<tr class="ct-row">';
        html += `<td class="ct-label">${field.label}</td>`;

        if (field.type === 'text') {
            html += `<td class="ct-value">${v1 ?? '—'}</td>`;
            html += `<td class="ct-value">${v2 ?? '—'}</td>`;
        } else {
            // Bar cells — width relative to the max of the two values
            const maxVal = Math.max(v1 ?? 0, v2 ?? 0);
            html += `<td class="ct-value">${barCell(v1, maxVal)}</td>`;
            html += `<td class="ct-value">${barCell(v2, maxVal)}</td>`;
        }

        html += '</tr>';
    });

    html += '</tbody></table>';
    panel.innerHTML = html;
}

const IMAGE_BASE = 'https://www.bowwwl.com';

function ballHeader(ball) {
    if (!ball) return '<span class="ct-empty">—</span>';
    const imgHtml = ball.image
        ? `<img class="ct-ball-img" src="${IMAGE_BASE}${ball.image}" alt="${ball.name}" loading="lazy" onerror="this.style.display='none'">`
        : `<div class="ct-ball-img-placeholder"></div>`;
    return imgHtml +
           `<div class="ct-ball-name">${ball.name}</div>` +
           (ball.brand ? `<div class="ct-ball-brand">${ball.brand}</div>` : '');
}

function barCell(value, maxVal) {
    if (value == null) return '<span class="ct-nodata">—</span>';
    const pct = maxVal > 0 ? Math.round((value / maxVal) * 100) : 100;
    const display = Number.isInteger(value) ? value : parseFloat(value.toFixed(4));
    return `<div class="ct-bar-row">` +
               `<div class="ct-bar-bg"><div class="ct-bar-fill" style="width:${pct}%"></div></div>` +
               `<span class="ct-bar-val">${display}</span>` +
           `</div>`;
}

// ── Event listeners ───────────────────────────────────────────────────────────
// (compare-weight listener registered in fetchBalls() after FilterPanel.build() creates the element)

// ── Init ──────────────────────────────────────────────────────────────────────

fetchBalls();