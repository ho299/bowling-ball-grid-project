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

// Application state
let bowlingBalls = [];       // array of objects (each ball with properties)
let numericFields = [];     // detected numeric property names used for axes
let selectedIndex = null;   // index of the currently selected ball (or null)

//fetch data from backend
async function fetchData() {
    // TODO: fetch JSON from server
    
    //placeholder data until backend is implemented
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
    ]

    detectNumericFields();
    populateAxisOptions();
    drawGrid();
    console.log('fetchData: loaded', bowlingBalls.length, 'balls');
    console.log('fetchData: numericFields=', numericFields);
    renderTable();
}

// Detect which fields on a bowlingBall object are numeric so they can be plotted
function detectNumericFields() {
    if (bowlingBalls.length === 0) return;

    numericFields = Object.keys(bowlingBalls[0]).filter(
        key => typeof bowlingBalls[0][key] === 'number'
    );
}

// Populate the axis `<select>` elements with detected numeric field names
function populateAxisOptions() {   
    xAxisSelect.innerHTML = '';
    yAxisSelect.innerHTML = '';

    numericFields.forEach(field => {
        const optX = document.createElement('option');
        optX.value = field;
        optX.textContent = field;
        xAxisSelect.appendChild(optX);

        const optY = document.createElement('option');
        optY.value = field;
        optY.textContent = field;
        yAxisSelect.appendChild(optY);
    });

    if (numericFields.length >= 2) {
        xAxisSelect.value = numericFields[0];
        yAxisSelect.value = numericFields[1];
    } else if (numericFields.length === 1) {
        xAxisSelect.value = numericFields[0];
    }

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

    const xValues = bowlingBalls.map(ball => ball[xField]);
    const yValues = bowlingBalls.map(ball => ball[yField]);

    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);

    bowlingBalls.forEach(ball => {
        // handle flat ranges (avoid division by zero)
        const xRatio = (xMax === xMin) ? 0.5 : ((ball[xField] - xMin) / (xMax - xMin));
        const yRatio = (yMax === yMin) ? 0.5 : ((ball[yField] - yMin) / (yMax - yMin));

        const x = padding + xRatio * (gridCanvas.width - 2 * padding);
        const y = gridCanvas.height - padding - yRatio * (gridCanvas.height - 2 * padding);

        // store computed canvas positions for this ball for later hit-testing
        ball._x = x;
        ball._y = y;

        // draw point; larger and red if selected
        ctx.beginPath();
        ctx.arc(x, y, (selectedIndex === bowlingBalls.indexOf(ball)) ? 9 : 6, 0, 2 * Math.PI);
        ctx.fillStyle = (selectedIndex === bowlingBalls.indexOf(ball)) ? '#ff4444' : '#0077cc';
        ctx.fill();
        if (selectedIndex === bowlingBalls.indexOf(ball)) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#cc0000';
            ctx.stroke();
            ctx.lineWidth = 1;
        }
    });
}

// Render an HTML table of `bowlingBalls` under the canvas. Clicking a row
// will select the corresponding ball and highlight its point on the canvas.
function renderTable() {
    console.log('renderTable: dataTableDiv=', dataTableDiv);
    dataTableDiv.innerHTML = '';
    if (!bowlingBalls || bowlingBalls.length === 0) return;

    // build columns: name + numeric fields
    const cols = ['name', ...numericFields];

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    cols.forEach(c => {
        const th = document.createElement('th');
        th.textContent = c;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    bowlingBalls.forEach((ball, idx) => {
        const tr = document.createElement('tr');
        tr.dataset.index = idx;
        if (selectedIndex === idx) tr.classList.add('selected-row');
        cols.forEach(c => {
            const td = document.createElement('td');
            td.textContent = (ball[c] !== undefined) ? ball[c] : '';
            tr.appendChild(td);
        });
        tr.addEventListener('click', () => selectBall(idx));
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    dataTableDiv.appendChild(table);
    console.log('renderTable: rendered', bowlingBalls.length, 'rows');
}

// Mark a ball as selected by index, refresh the table row styles and redraw
// the canvas so the selected point appears highlighted.
function selectBall(idx) {
    selectedIndex = idx;
    // update table row selection
    const rows = dataTableDiv.querySelectorAll('tbody tr');
    rows.forEach(r => r.classList.toggle('selected-row', Number(r.dataset.index) === idx));
    drawGrid();
}

/* Sends the new values of the x and y axis to HTML */
function updateHtmlAxisLabels() {
    xLabelEl.textContent = xAxisSelect.value;
    yLabelEl.textContent = yAxisSelect.value;
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
        const alt = numericFields.find(f => f !== xAxisSelect.value);
        if (alt) yAxisSelect.value = alt;
    }
    updateHtmlAxisLabels();   // ← new
    drawGrid();
    renderTable();
});

yAxisSelect.addEventListener('change', () => {
    if (yAxisSelect.value === xAxisSelect.value) {
        const alt = numericFields.find(f => f !== yAxisSelect.value);
        if (alt) xAxisSelect.value = alt;
    }
    updateHtmlAxisLabels();   // ← new
    drawGrid();
    renderTable();
});

// Dark mode toggle handler: toggle class on body and save preference to localStorage
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    themeToggle.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
});

// Initialize dark mode from localStorage preference
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = 'Light Mode';
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.textContent = 'Dark Mode';
    }
}

// Initial load: set theme preference, then fetch data, detect fields, populate controls and draw
initializeTheme();
fetchData();