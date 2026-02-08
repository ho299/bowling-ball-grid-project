// Script loaded - diagnostic check
console.log('app.js loaded');

// Canvas and drawing context used for plotting the scatter/grid
const gridCanvas = document.getElementById('gridCanvas');
const ctx = gridCanvas.getContext('2d');

// Controls: selectors for which numeric fields map to axes, and the update button
const xAxisSelect = document.getElementById('x-axis');
const yAxisSelect = document.getElementById('y-axis');
const updateButton = document.getElementById('Update Grid');

// Container where the table of plotted objects will be inserted
const dataTableDiv = document.getElementById('data-table');

// Application state
let bowlingBalls = [];       // array of objects (each ball with properties)
let numericFields = [];     // detected numeric property names used for axes
let selectedIndex = null;   // index of the currently selected ball (or null)

//fetch data from backend
// Fetch data from backend (placeholder uses a static array).
// Replace this with a real fetch to your API when available.
async function fetchData() {
    // TODO: fetch JSON from server, e.g. `await fetch('/api/balls').then(r=>r.json())`
    
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
            name: "Ball b",
            weight: 15,
            coverstock: 10,
            core_design: 100,
            radius_of_gyration: 3.5,
            price: 500,
            differential: 0.045,
            optimal_lane_condition: 10
        },
        {
            name: "Ball A",
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
        // x axis option
        const optionX = document.createElement('option');
        optionX.value = field;
        optionX.textContent = field;
        xAxisSelect.appendChild(optionX);

        // y axis option
        const optionY = document.createElement('option');
        optionY.value = field;
        optionY.textContent = field;
        yAxisSelect.appendChild(optionY);
    });

    // default to the first two numeric fields if available
    if (numericFields.length >= 2) {
        xAxisSelect.value = numericFields[0];
        yAxisSelect.value = numericFields[1];
    }
}

// Clear the canvas and redraw grid lines and plotted points for the
// currently selected X/Y fields.
function drawGrid() {
    ctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    
    const xField = xAxisSelect.value;
    const yField = yAxisSelect.value;

    drawGridLines();
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

//event listener for plot button
// When the Update Grid button is pressed refresh the plot and the table.
updateButton.addEventListener('click', () => {
    drawGrid();
    renderTable();
});

// Initial load: fetch data, detect fields, populate controls and draw
fetchData();