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
  var allBalls = defaultBalls;
  try {
    const resFromApi = await fetch(APIROUTE+'/api/balls');
    if (!resFromApi.ok) {
      console.error(`/api/balls: backend returned ${resFromApi.status} — serving placeholder data`);
    } else {
      allBalls = await resFromApi.json();
    }
  } catch (err) {
    console.error(`/api/balls: could not reach backend at ${APIROUTE} — serving placeholder data\n  ${err.message}`);
  }
  res.json(allBalls);
});

// Generic proxy for all /api/* routes not covered above (algo, specs, etc.)
// app.use('/api', ...) strips the '/api' prefix from req.url inside the handler.
app.use('/api', async (req, res) => {
  try {
    const target = APIROUTE + '/api' + req.url;
    const backendRes = await fetch(target);
    if (!backendRes.ok) {
      const err = await backendRes.json().catch(() => ({}));
      return res.status(backendRes.status).json(err);
    }
    const data = await backendRes.json();
    res.json(data);
  } catch (err) {
    console.error(`proxy ${req.url} failed: ${err.message}`);
    res.status(502).json({ error: 'Backend unavailable' });
  }
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});