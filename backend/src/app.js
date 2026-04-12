const express = require('express');
const cors = require('cors');
// const path = require('path');
// require('dotenv').config({ path: path.resolve(__dirname, '../..', '.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend static files
const init = async() => {
// app.use(express.static(path.join(__dirname, '../..', 'frontend')));

    const ballRoutes = require('./routes/ball_routes');
    const coreRoutes = require('./routes/core_routes');
    const coverstockRoutes = require('./routes/coverstock_routes');
    const specsRoutes = require('./routes/specs_routes');
    const algoRoutes = require('./routes/algo_routes');

    app.get('/', (req, res) => {
    res.send('Hello World!');
    });

    app.use('/api/balls', ballRoutes);
    app.use('/api/cores', coreRoutes);
    app.use('/api/coverstocks', coverstockRoutes);
    app.use('/api/specs', specsRoutes);
    app.use('/api/algo', algoRoutes);

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

}

init();
// console.log("Backend Loaded...")

// module.exports = app;