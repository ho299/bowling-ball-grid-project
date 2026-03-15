
// app.js
const express = require('express');
const coverstockRoutes = require('./routes/coverstock_routes');
const ballRoutes = require('./routes/ball_routes');
const coreRoutes = require('./routes/core_routes');
const specRoutes = require('./routes/specs_routes');

const app = express();
const port = 3001;

const init = async() => {
    //page routing below:
    app.use('/api/specs', specRoutes);
    app.use('/api/coverstocks', coverstockRoutes);
    app.use('/api/cores', coreRoutes);
    app.use('/api/ball', ballRoutes);

    app.get('/', (req, res) => {
    res.send('Hello World!');
    });

    app.listen(port, () => {
    console.log(`Backend Open on Port: ${port}`);
    });
};

init();

console.log("Backend Starting...")

module.exports = app;