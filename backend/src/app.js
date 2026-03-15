
// app.js
const express = require('express');

const app = express();
const port = 3001;

console.log("Backend Starting...little")
// const init = async() => {
    //page routing below:
    const specRoutes = require('./routes/specs_routes');
    app.use('/api/specs', specRoutes);
    
    // const coverstockRoutes = require('./routes/coverstock_routes');
    // app.use('/api/coverstocks', coverstockRoutes);
    
    // const coreRoutes = require('./routes/core_routes');
    // app.use('/api/cores', coreRoutes);
    
    // const ballRoutes = require('./routes/ball_routes');
    // app.use('/api/ball', ballRoutes);

    app.get('/', (req, res) => {
    res.send('Hello World!');
    });

    app.listen(port, () => {
    console.log(`Backend Open on Port: ${port}`);
    });
// };

// init();


module.exports = app;