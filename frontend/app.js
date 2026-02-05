const gridCanvas = document.getElementById('gridCanvas');
const ctx = gridCanvas.getContext('2d');

const xAxisSelect = document.getElementById('x-axis');
const yAxisSelect = document.getElementById('y-axis');
const updateButton = document.getElementById('Update Grid');

let bowlingBalls = [];
let numericFields = [];

//fetch data from backend
async function fetchData() {
    //todo
    bowlingBalls = [
        {
            name: "Ball A"  ,
            weight: 12,
            diameter: 7,
            price: 150
        },
        {
            name: "Ball C"  ,
            weight: 10,
            diameter: 8.5,
            price: 300
        },
        {
            name: "Ball C"  ,
            weight: 11,
            diameter: 9,
            price: 75
        }
    ]

    detectNumericFields();
    populateAxisOptions();
    drawGrid();
}

//numeric fields detection
function detectNumericFields() {
    if (bowlingBalls.length === 0) return;

    numericFields = Object.keys(bowlingBalls[0]).filter(
        key => typeof bowlingBalls[0][key] === 'number'
    );
}

//populate dropdowns
function populateAxisOptions() {
    xAxisSelect.innerHTML = '';
    yAxisSelect.innerHTML = '';

    numericFields.forEach(field => {
        //x axis data options
        const optionX = document.createElement('option');
        optionX.value = field;
        optionX.textContent = field;
        xAxisSelect.appendChild(optionX);

        //y axis data options
        const optionY = document.createElement('option');
        optionY.value = field;
        optionY.textContent = field;
        yAxisSelect.appendChild(optionY);
    });

    if (numericFields.length >= 2) {
        xAxisSelect.value = numericFields[0];
        yAxisSelect.value = numericFields[1];
    }
}

//draw grid and bowling balls
function drawGrid() {
    ctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    
    const xField = xAxisSelect.value;
    const yField = yAxisSelect.value;

    drawGridLines();
    plotBowlingBalls(xField, yField);
}

//draw grid lines
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

//plot bowling balls
function plotBowlingBalls(xField, yField) {
    const padding = 40;

    const xValues = bowlingBalls.map(ball => ball[xField]);
    const yValues = bowlingBalls.map(ball => ball[yField]);

    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);

    bowlingBalls.forEach(ball => {
        const x = 
            padding + ((ball[xField] - xMin) / (xMax - xMin)) * 
            (gridCanvas.width - 2 * padding);
        const y = 
            gridCanvas.height - padding - ((ball[yField] - yMin) / (yMax - yMin)) * 
            (gridCanvas.height - 2 * padding);

        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#0077cc';
        ctx.fill();
    });
}

//event listener for plot button
updateButton.addEventListener('click', drawGrid);

//initial data fetch
fetchData();