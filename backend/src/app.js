const express = require('express');
const app = express();

// ── Middleware ─────────────────────────────────────────────────────
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────
const ballRoutes            = require('./routes/ball_routes');
const userRoutes            = require('./routes/users_routes');
const coreRoutes            = require('./routes/core_routes');
const coverstockRoutes      = require('./routes/coverstock_routes');
const specsRoutes           = require('./routes/specs_routes');
const ownedBallRoutes       = require('./routes/owned_ball_routes');
const modificationRoutes    = require('./routes/modification_routes');
const arsenalListRoutes     = require('./routes/arsenal_list_routes');
const arsenalContentRoutes  = require('./routes/arsenal_content_routes');

app.use('/api/balls',           ballRoutes);
app.use('/api/users',           userRoutes);
app.use('/api/cores',           coreRoutes);
app.use('/api/coverstocks',     coverstockRoutes);
app.use('/api/specs',           specsRoutes);
app.use('/api/owned-balls',     ownedBallRoutes);
app.use('/api/modifications',   modificationRoutes);
app.use('/api/arsenal-lists',   arsenalListRoutes);
app.use('/api/arsenal-content', arsenalContentRoutes);

// ── Health check ──────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ message: 'Bowling API is running' });
});

// ── 404 handler ───────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong' });
});

// ── Start server ──────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
