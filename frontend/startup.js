
// startup.js
const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

//page routing below:
app.get('/', (req, res) => {
  res.send('Hello World from a Docker container!');
});

// app.get('/homepage', (req, res) => {
//     res.sendFile(path.join(__dirname, 'homepage.html'));
// });

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});