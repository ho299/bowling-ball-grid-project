
// app.js
const express = require('express');
const app = express();
const specs = require('./routes/specs_routes');
const coverstocks = require('./routes/coverstock_routes');
const ball = require('./routes/ball_routes');
const core = require('./routes/core_routes');
const port = 3001;

//page routing below:
app.use('/api/specs', specs);
app.use('/api/coverstocks', coverstocks);
app.use('/api/cores', core);
app.use('/api/ball', ball);

app.listen(port, () => {
  console.log(`Backend Open on Port: ${port}`);
});