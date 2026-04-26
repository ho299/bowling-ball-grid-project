// @ts-nocheck — plain browser script; globals (FilterPanel) loaded via separate <script> tags
// Canvas and drawing for plotting the scatter/grid
const gridCanvas = document.getElementById('gridCanvas');
const ctx = gridCanvas.getContext('2d');

// selectors for which numeric fields map to axes
const xAxisSelect = document.getElementById('x-axis');
const yAxisSelect = document.getElementById('y-axis');
const xLabelEl = document.getElementById('x-axis-label');
const yLabelEl = document.getElementById('y-axis-label');

// Container where the table of plotted objects will be inserted
const dataTableDiv = document.getElementById('data-table');

// Dark mode toggle button
const themeToggle = document.getElementById('theme-toggle');
const logo = document.getElementById('logo');

// Weight selector — resolved after FilterPanel.build() creates the element
let weightSelect = null;

// Application state
let bowlingBalls = [];       // array of objects (each ball with properties)
let numericFields = [];      // axis field value-keys, derived from AXIS_FIELDS
let selectedIndex = null;    // index of the currently selected ball (or null)
/** @type {any} FilterPanel instance, built after data loads (class loaded via script tag) */
let filterPanel  = null;

// Table sort state
let sortField = null;   // null | 'name' | AXIS_FIELDS[*].value
let sortDir   = 'asc';  // 'asc' | 'desc'

// Outlier filter state
let ignoreOutliers = false;

// Returns { min, max } bounds for field values within ±1 std dev, or null if not enough data.
function computeOutlierBounds(balls, weight, fieldKey) {
    const fieldDef = AXIS_FIELDS.find(f => f.value === fieldKey);
    if (!fieldDef) return null;
    const vals = balls.map(b => fieldDef.accessor(b, weight)).filter(v => v != null);
    if (vals.length < 2) return null;
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const std  = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
    return { min: mean - std, max: mean + std };
}

// Fixed axis field definitions: value = option key, label = display name,
// accessor(ball, selectedWeight) returns the numeric value to plot.
const AXIS_FIELDS = [
    { value: 'rg',               label: 'Radius of Gyration',  accessor: (b, w) => getSpec(b, w, 'rg') },
    { value: 'diff',             label: 'Differential',         accessor: (b, w) => getSpec(b, w, 'diff') },
    { value: 'mb_diff',          label: 'MB Differential',      accessor: (b, w) => getSpec(b, w, 'mb_diff') },
{ value: 'release_year',     label: 'Release Year',         accessor: (b) => b.release_date ? new Date(b.release_date).getFullYear() : null },
    { value: 'hook_potential',   label: 'Hook Potential',       accessor: (b, w) => getSpec(b, w, 'hook_potential') },
    { value: 'early_v_late',     label: 'Early vs. Late',       accessor: (b, w) => getSpec(b, w, 'early_v_late') },
    { value: 'smooth_v_angular', label: 'Smooth vs. Angular',   accessor: (b, w) => getSpec(b, w, 'smooth_v_angular') },
];

// Draw numeric tick labels on the canvas X and Y axes.
function drawAxisLabels(xMin, xMax, yMin, yMax) {
    const padding   = 40;
    const TICKS     = 5;
    const isDark    = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#aaa' : '#555';
    const tickColor = isDark ? '#666' : '#bbb';

    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;

    function fmt(val, range) {
        if (range > 100) return Math.round(val).toString();
        if (range > 10)  return val.toFixed(0);
        if (range > 1)   return val.toFixed(1);
        if (range > 0.1) return val.toFixed(2);
        return val.toFixed(3);
    }

    ctx.save();
    ctx.font      = '10px sans-serif';
    ctx.fillStyle = textColor;

    // Y axis — labels on the left, tick marks touching the axis line
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= TICKS; i++) {
        const frac = i / TICKS;
        const val  = yMin + frac * yRange;
        const y    = gridCanvas.height - padding - frac * (gridCanvas.height - 2 * padding);
        ctx.fillText(fmt(val, yRange), padding - 6, y);
        ctx.strokeStyle = tickColor;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(padding - 3, y);
        ctx.lineTo(padding,     y);
        ctx.stroke();
    }

    // X axis — labels below the bottom axis line
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i <= TICKS; i++) {
        const frac = i / TICKS;
        const val  = xMin + frac * xRange;
        const x    = padding + frac * (gridCanvas.width - 2 * padding);
        ctx.fillText(fmt(val, xRange), x, gridCanvas.height - padding + 4);
        ctx.strokeStyle = tickColor;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(x, gridCanvas.height - padding);
        ctx.lineTo(x, gridCanvas.height - padding + 3);
        ctx.stroke();
    }

    ctx.restore();
}

// Return a spec field value for a given ball and weight, or null if not available.
function getSpec(ball, weight, field) {
    if (!Array.isArray(ball.specs)) return null;
    const spec = ball.specs.find(s => s.weight === weight);
    return spec ? spec[field] : null;
}

//fetch data from backend
async function fetchData() {
    try {
        const response = await fetch(location.origin+'/api/balls');
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        bowlingBalls = await response.json();
    } catch (error) {
        console.error('fetchData: failed to load from API, using placeholder data.', error);
        bowlingBalls = [
            {
                name: "Ball A",
                weight: 12,
                coverstock: 7,
                core_design: 150,
                radius_of_gyration: 2.5,
                price: 200,
                differential: 0.035,
                optimal_lane_condition: 8
            },
            {
                name: "Ball B",
                weight: 15,
                coverstock: 10,
                core_design: 100,
                radius_of_gyration: 3.5,
                price: 500,
                differential: 0.045,
                optimal_lane_condition: 10
            },
            {
                name: "Ball C",
                weight: 10,
                coverstock: 5,
                core_design: 80,
                radius_of_gyration: 1.5,
                price: 100,
                differential: 0.025,
                optimal_lane_condition: 6
            }
        ];
    }

    detectNumericFields();
    populateAxisOptions();

    filterPanel = new FilterPanel(document.getElementById('filter-container'), {
        onChange: () => { drawGrid(); renderTable(); },
        weightConfig: {
            id: 'weight-select',
            options: [
                { value: '16', label: '16 lb' },
                { value: '15', label: '15 lb' },
                { value: '14', label: '14 lb' },
                { value: '13', label: '13 lb' },
                { value: '12', label: '12 lb' },
            ],
            selected: '15',
        },
    });
    filterPanel.build(bowlingBalls);

    // Resolve the weight select now that FilterPanel has rendered it
    weightSelect = document.getElementById('weight-select');
    weightSelect.addEventListener('change', () => { drawGrid(); renderTable(); });

    document.getElementById('ignore-outliers').addEventListener('change', e => {
        ignoreOutliers = e.target.checked;
        drawGrid();
        renderTable();
    });

    drawGrid();
    console.log('fetchData: loaded', bowlingBalls.length, 'balls');
    console.log('fetchData: numericFields=', numericFields);
    renderTable();

    // Expose for ball-search-modal.js: select and highlight a ball by name.
    window.selectBallByName = function (name) {
        const lower = name.toLowerCase();
        const idx = bowlingBalls.findIndex(b => (b.name || '').toLowerCase() === lower);
        if (idx !== -1) {
            selectBall(idx);
            gridCanvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    // Handle ?highlight= param set by ball-search-modal when navigating from another page.
    const highlightName = new URLSearchParams(location.search).get('highlight');
    if (highlightName) {
        window.selectBallByName(highlightName);
        history.replaceState(null, '', location.pathname);
    }
}

// Set numericFields from the fixed AXIS_FIELDS list.
function detectNumericFields() {
    numericFields = AXIS_FIELDS.map(f => f.value);
}

// Populate the axis <select> elements from AXIS_FIELDS.
function populateAxisOptions() {
    xAxisSelect.innerHTML = '';
    yAxisSelect.innerHTML = '';

    AXIS_FIELDS.forEach(field => {
        const optX = document.createElement('option');
        optX.value = field.value;
        optX.textContent = field.label;
        xAxisSelect.appendChild(optX);

        const optY = document.createElement('option');
        optY.value = field.value;
        optY.textContent = field.label;
        yAxisSelect.appendChild(optY);
    });

    xAxisSelect.value = AXIS_FIELDS[0].value;   // Radius of Gyration
    yAxisSelect.value = AXIS_FIELDS[1].value;   // Differential

    updateHtmlAxisLabels();
}

// Clear the canvas and redraw grid lines and plotted points for the
// currently selected X/Y fields.
function drawGrid() {
    ctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    
    const xField = xAxisSelect.value;
    const yField = yAxisSelect.value;

    drawGridLines();
    updateHtmlAxisLabels();
    plotBowlingBalls(xField, yField);
}

// Draw light grid lines and the main X/Y axes on the canvas
function drawGridLines() {
    const gridSize = 10;
    const step = gridCanvas.width / gridSize;

    ctx.strokeStyle = '#ddd';

    for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath();
        ctx.moveTo(i * step, 0);
        ctx.lineTo(i * step, gridCanvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * step);
        ctx.lineTo(gridCanvas.width, i * step);
        ctx.stroke();
    }

    // Axis
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(0, gridCanvas.height);
    ctx.lineTo(gridCanvas.width, gridCanvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, gridCanvas.height);
    ctx.stroke();
}

// Plot each bowling ball as a point on the canvas. Points are scaled to the
// canvas bounds with padding. Each ball's computed canvas coordinates are
// stored on the object as `_x` and `_y` for hit-testing and interaction.
function plotBowlingBalls(xField, yField) {
    const padding = 40;
    const xDef = AXIS_FIELDS.find(f => f.value === xField);
    const yDef = AXIS_FIELDS.find(f => f.value === yField);
    const selectedWeight = parseInt(weightSelect.value, 10);

    // Clear all stored positions first
    bowlingBalls.forEach(b => { b._x = null; b._y = null; });

    // Only plot balls that pass the active filters
    let visible = filterPanel
        ? bowlingBalls.filter(b => filterPanel.passes(b, selectedWeight))
        : bowlingBalls;

    if (ignoreOutliers) {
        const xBounds = computeOutlierBounds(visible, selectedWeight, xField);
        const yBounds = computeOutlierBounds(visible, selectedWeight, yField);
        if (xBounds && yBounds) {
            visible = visible.filter(b => {
                const xv = xDef ? xDef.accessor(b, selectedWeight) : null;
                const yv = yDef ? yDef.accessor(b, selectedWeight) : null;
                return xv != null && yv != null &&
                       xv >= xBounds.min && xv <= xBounds.max &&
                       yv >= yBounds.min && yv <= yBounds.max;
            });
        }
    }

    const allX = visible.map(b => xDef ? xDef.accessor(b, selectedWeight) : null);
    const allY = visible.map(b => yDef ? yDef.accessor(b, selectedWeight) : null);
    const validX = allX.filter(v => v != null);
    const validY = allY.filter(v => v != null);
    if (validX.length === 0 || validY.length === 0) return;

    const xMin = Math.min(...validX), xMax = Math.max(...validX);
    const yMin = Math.min(...validY), yMax = Math.max(...validY);

    drawAxisLabels(xMin, xMax, yMin, yMax);

    // First pass: compute canvas coordinates for all visible balls.
    visible.forEach((ball, i) => {
        const xVal = allX[i];
        const yVal = allY[i];
        if (xVal == null || yVal == null) return;

        const xRatio = (xMax === xMin) ? 0.5 : (xVal - xMin) / (xMax - xMin);
        const yRatio = (yMax === yMin) ? 0.5 : (yVal - yMin) / (yMax - yMin);

        ball._x = padding + xRatio * (gridCanvas.width  - 2 * padding);
        ball._y = gridCanvas.height - padding - yRatio * (gridCanvas.height - 2 * padding);
    });

    // Second pass: draw unselected balls first so the selected ball always
    // renders on top regardless of its position in the data array.
    visible.forEach(ball => {
        const idx = bowlingBalls.indexOf(ball);
        if (ball._x == null || ball._y == null || idx === selectedIndex) return;
        ctx.beginPath();
        ctx.arc(ball._x, ball._y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#0077cc';
        ctx.fill();
    });

    // Third pass: draw the selected ball on top.
    if (selectedIndex !== null) {
        const sel = bowlingBalls[selectedIndex];
        if (sel && sel._x != null && sel._y != null) {
            ctx.beginPath();
            ctx.arc(sel._x, sel._y, 9, 0, 2 * Math.PI);
            ctx.fillStyle = '#ff4444';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#cc0000';
            ctx.stroke();
            ctx.lineWidth = 1;
        }
    }
}

// Render an HTML table of `bowlingBalls` under the canvas. Clicking a row
// will select the corresponding ball and highlight its point on the canvas.
function renderTable() {
    console.log('renderTable: dataTableDiv=', dataTableDiv);
    dataTableDiv.innerHTML = '';
    if (!bowlingBalls || bowlingBalls.length === 0) return;

    const selectedWeight = parseInt(weightSelect.value, 10);

    // Apply active filters; preserve original indices for selection
    let filteredIndices = filterPanel
        ? bowlingBalls.map((_, i) => i).filter(i => filterPanel.passes(bowlingBalls[i], selectedWeight))
        : bowlingBalls.map((_, i) => i);

    if (ignoreOutliers) {
        const xField   = xAxisSelect.value;
        const yField   = yAxisSelect.value;
        const visibles = filteredIndices.map(i => bowlingBalls[i]);
        const xBounds  = computeOutlierBounds(visibles, selectedWeight, xField);
        const yBounds  = computeOutlierBounds(visibles, selectedWeight, yField);
        if (xBounds && yBounds) {
            const xDef = AXIS_FIELDS.find(f => f.value === xField);
            const yDef = AXIS_FIELDS.find(f => f.value === yField);
            filteredIndices = filteredIndices.filter(i => {
                const b  = bowlingBalls[i];
                const xv = xDef ? xDef.accessor(b, selectedWeight) : null;
                const yv = yDef ? yDef.accessor(b, selectedWeight) : null;
                return xv != null && yv != null &&
                       xv >= xBounds.min && xv <= xBounds.max &&
                       yv >= yBounds.min && yv <= yBounds.max;
            });
        }
    }

    // Update "Showing X of Y" counter
    const countEl = document.getElementById('ball-count');
    if (countEl) {
        countEl.textContent = filteredIndices.length < bowlingBalls.length
            ? `(${filteredIndices.length} of ${bowlingBalls.length})`
            : `(${bowlingBalls.length})`;
    }

    // Sort filteredIndices before rendering
    if (sortField) {
        filteredIndices.sort((a, b) => {
            let va, vb;
            if (sortField === 'name') {
                va = (bowlingBalls[a].name || '').toLowerCase();
                vb = (bowlingBalls[b].name || '').toLowerCase();
            } else {
                const fieldDef = AXIS_FIELDS.find(f => f.value === sortField);
                va = fieldDef ? fieldDef.accessor(bowlingBalls[a], selectedWeight) : null;
                vb = fieldDef ? fieldDef.accessor(bowlingBalls[b], selectedWeight) : null;
                if (va == null && vb == null) return 0;
                if (va == null) return 1;
                if (vb == null) return -1;
            }
            if (va < vb) return sortDir === 'asc' ? -1 : 1;
            if (va > vb) return sortDir === 'asc' ?  1 : -1;
            return 0;
        });
    }

    function makeSortTh(label, key) {
        const th = document.createElement('th');
        th.className = 'sortable-th';
        th.textContent = label;
        if (sortField === key) th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
        th.addEventListener('click', () => {
            if (sortField === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
            else { sortField = key; sortDir = 'asc'; }
            renderTable();
        });
        return th;
    }

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.appendChild(makeSortTh('Name', 'name'));
    AXIS_FIELDS.forEach(field => headerRow.appendChild(makeSortTh(field.label, field.value)));
    // Empty header for the detail-button column
    headerRow.appendChild(document.createElement('th'));
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    filteredIndices.forEach(idx => {
        const ball = bowlingBalls[idx];
        const tr = document.createElement('tr');
        tr.dataset.index = idx;
        if (selectedIndex === idx) tr.classList.add('selected-row');

        const nameTd = document.createElement('td');
        nameTd.textContent = ball.name || '';
        tr.appendChild(nameTd);

        AXIS_FIELDS.forEach(field => {
            const td = document.createElement('td');
            const val = field.accessor(ball, selectedWeight);
            td.textContent = (val !== null && val !== undefined) ? val : '—';
            tr.appendChild(td);
        });

        // Three-dots cell — opens the ball detail pop-up without selecting
        const dotsTd = document.createElement('td');
        dotsTd.className = 'row-detail-cell';
        const dotsBtn = document.createElement('button');
        dotsBtn.className = 'row-detail-btn';
        dotsBtn.setAttribute('aria-label', `Details for ${ball.name || 'ball'}`);
        dotsBtn.textContent = '⋮';
        dotsBtn.addEventListener('click', e => {
            e.stopPropagation();
            if (typeof window.showBallDetail === 'function') {
                window.showBallDetail(ball);
            }
        });
        dotsTd.appendChild(dotsBtn);
        tr.appendChild(dotsTd);

        // Row click highlights the ball on the grid
        tr.addEventListener('click', () => selectBall(idx));
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    dataTableDiv.appendChild(table);

    // Scroll the selected row into view while accounting for the sticky thead.
    // scrollIntoView({ block: 'nearest' }) aligns the row's top edge with the
    // container top, but the sticky header sits exactly there and covers it.
    // Instead, compute positions manually and offset by the thead height.
    if (selectedIndex !== null) {
        const selectedRow = tbody.querySelector(`tr[data-index="${selectedIndex}"]`);
        const tableScroll = dataTableDiv.closest('.table-scroll');
        if (selectedRow && tableScroll) {
            const thead        = tableScroll.querySelector('thead');
            const theadH       = thead ? thead.getBoundingClientRect().height : 0;
            const rowRect      = selectedRow.getBoundingClientRect();
            const containerRect = tableScroll.getBoundingClientRect();
            const relTop       = rowRect.top    - containerRect.top;
            const relBottom    = rowRect.bottom - containerRect.top;
            if (relTop < theadH) {
                // Row is hidden behind or above the sticky header — scroll up.
                tableScroll.scrollTop += relTop - theadH;
            } else if (relBottom > tableScroll.clientHeight) {
                // Row is below the visible area — scroll down.
                tableScroll.scrollTop += relBottom - tableScroll.clientHeight;
            }
        }
    }
    console.log('renderTable: rendered', filteredIndices.length, 'of', bowlingBalls.length, 'rows');
}

// Mark a ball as selected by index, redraw the canvas immediately so the
// highlight appears, then blur the table panel out, re-render it, and fade it
// back in.
function selectBall(idx) {
    selectedIndex = idx;
    drawGrid();

    const tableScroll = document.querySelector('.table-scroll');
    if (!tableScroll) { renderTable(); return; }

    tableScroll.classList.add('table-loading');
    setTimeout(() => {
        renderTable();
        // rAF ensures the DOM has updated before we remove the class so the
        // fade-in transition actually runs.
        requestAnimationFrame(() => tableScroll.classList.remove('table-loading'));
    }, 160);
}

/* Sends the display labels of the selected axes to the HTML axis label elements */
function updateHtmlAxisLabels() {
    const xDef = AXIS_FIELDS.find(f => f.value === xAxisSelect.value);
    const yDef = AXIS_FIELDS.find(f => f.value === yAxisSelect.value);
    xLabelEl.textContent = xDef ? xDef.label : xAxisSelect.value;
    yLabelEl.textContent = yDef ? yDef.label : yAxisSelect.value;
}

// allow clicking canvas to select nearest ball
// Canvas click handler: find the nearest plotted point and select it if
// the click is close enough.
gridCanvas.addEventListener('click', (e) => {
    const rect = gridCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let nearest = null;
    let nearestDist = Infinity;
    bowlingBalls.forEach((ball, idx) => {
        if (ball._x == null || ball._y == null) return;
        const dx = ball._x - x;
        const dy = ball._y - y;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d < nearestDist) { nearestDist = d; nearest = idx; }
    });
    if (nearest !== null && nearestDist <= 10) {
        selectBall(nearest);
    }
});

// Dropdown event listeners: redraw automatically when axis selection changes
// Also prevent both axes from being set to the same field
/*xAxisSelect.addEventListener('change', () => {
    // If X-axis is now the same as Y-axis, auto-switch Y-axis to another field
    if (xAxisSelect.value === yAxisSelect.value) {
        const alternative = numericFields.find(f => f !== xAxisSelect.value);
        if (alternative) {
            yAxisSelect.value = alternative;
        }
    }
    drawGrid();
    renderTable();
});

yAxisSelect.addEventListener('change', () => {
    // If Y-axis is now the same as X-axis, auto-switch X-axis to another field
    if (yAxisSelect.value === xAxisSelect.value) {
        const alternative = numericFields.find(f => f !== yAxisSelect.value);
        if (alternative) {
            xAxisSelect.value = alternative;
        }
    }
    drawGrid();
    renderTable();
});*/

xAxisSelect.addEventListener('change', () => {
    if (xAxisSelect.value === yAxisSelect.value) {
        const alt = AXIS_FIELDS.find(f => f.value !== xAxisSelect.value);
        if (alt) yAxisSelect.value = alt.value;
    }
    updateHtmlAxisLabels();
    drawGrid();
    renderTable();
});

yAxisSelect.addEventListener('change', () => {
    if (yAxisSelect.value === xAxisSelect.value) {
        const alt = AXIS_FIELDS.find(f => f.value !== yAxisSelect.value);
        if (alt) xAxisSelect.value = alt.value;
    }
    updateHtmlAxisLabels();
    drawGrid();
    renderTable();
});

// Weight listener is registered in fetchData() after FilterPanel.build() creates the element.

// Dark mode toggle handler: toggle class on body and save preference to localStorage
themeToggle.addEventListener('click', () => {
    // update localStorage with the new theme preference
    document.body.classList.toggle('dark-mode');

    //update logo image and persist preference
    if (document.body.classList.contains('dark-mode')) {
        themeToggle.textContent = 'Light Mode';
        logo.src = '../images/bowl_iq_darkmode.png';
        localStorage.setItem('theme', 'dark');
    } else {
        themeToggle.textContent = 'Dark Mode';
        logo.src = '../images/bowl_iq_lightmode.png';
        localStorage.setItem('theme', 'light');
    }
});

// Initialize dark mode from localStorage preference
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = 'Light Mode';
        logo.src = '../images/bowl_iq_darkmode.png';
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.textContent = 'Dark Mode';
        logo.src = '../images/bowl_iq_lightmode.png';
    }
}

// Initial load: set theme preference, then fetch data, detect fields, populate controls and draw
initializeTheme();
fetchData();