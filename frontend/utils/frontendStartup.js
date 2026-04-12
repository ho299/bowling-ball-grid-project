// startup.js
const APIROUTE = process.env.dev=="local"?"http://localhost:3000":"http://backend:3000";

const express = require('express');
const path = require('path');
const app = express();
const port = 80;

const defaultBalls = [
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

//page routing below:
app.get('/', (_req, res) => {
  res.send('Hello World!');
});

app.get('/homepage', (_req, res) => {
  res.redirect('/homepage.html')
});

// Serve HTML/CSS from pages/ as the root (e.g. /homepage.html)
app.use(express.static(path.join(__dirname, '..', 'pages')));
// Serve JS files under /utils/ (HTML references them as ../utils/*)
app.use('/utils', express.static(__dirname));
// Serve images under /images/ (HTML references them as ../images/*)
app.use('/images', express.static(path.join(__dirname, '..', 'images')));

app.get('/api/balls', async (_req, res) => {
  const resFromApi = await fetch(APIROUTE+'/api/balls');
  var allBalls = defaultBalls;
  if (!resFromApi.ok) {
    console.log("error: ", resFromApi.status, resFromApi)
  }
  else{
    allBalls = await resFromApi.json();
  }
  res.json(allBalls);
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});