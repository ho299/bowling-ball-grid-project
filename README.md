# bowling-ball-grid-project
ECE50874 - Bowling Ball grid project repo

## Overview

This app plots bowling balls on a configurable scatter grid and uses physics-derived scores to recommend replacements and identify arsenal gaps. The database holds 1,000+ balls with manufacturer specs (RG, differential, mass bias differential, factory finish) seeded from a datascraping operation.

**Pages**

- **Homepage** — Scatter plot with selectable X/Y axes: Radius of Gyration, Differential, MB Differential, Hook Potential, Early vs. Late, Smooth vs. Angular, Release Year. An optional outlier filter hides balls outside one standard deviation of the plotted field.
- **Compare** — Side-by-side table of two balls' raw specs and computed scores.
- **Arsenal** — Personal ball collection persisted to browser `localStorage`.
- **Replace** — Finds the closest replacement for a selected ball, or identifies the best addition to fill a gap in an existing arsenal.

**Scoring algorithms**

Three scores are pre-computed per ball spec and stored in the `specs` table. They accept RG (2.44–2.75), differential (0–0.062), mass bias differential (0–0.037), and a numeric surface finish value.

- **Hook Potential (0–100):** A nonlinear formula where higher differential, higher MB diff, and lower RG all increase hook. Factory finish applies a sinusoidal correction that models the difference between abraded and polished surfaces.
- **Early vs. Late (0 = early, 100 = late):** Captures how far down the lane the ball transitions from skid to roll. Lower RG and more aggressive surface produce earlier transition; higher finish number delays it.
- **Smooth vs. Angular (0–100):** Describes sharpness of the backend reaction. Higher RG and lower differential produce smooth arcs; more mass bias and aggressive surface produce sharper angles.

Factory finish strings (e.g., `"2000 Grit Polished"`) are parsed to a numeric scale before scoring. Polished surfaces add 5000 to the grit number. Spare balls (polyester/plastic coverstocks) are excluded and assigned a sentinel value of 90000, which causes all three scores to return 0.

**Replacement and gap-finder**

The replacement finder computes Euclidean distance in the three-score space (Hook Potential, Early vs. Late, Smooth vs. Angular) between the target ball and all other balls at the same weight, returning the five closest. The gap finder inverts this: for each candidate ball it finds the minimum distance to any ball in the arsenal. Balls with the greatest minimum distance fill the largest performance gap and rank highest.

---

## Local Testing Setup

This is a guide to set up the project for local development from a fresh clone.

### Prerequisites

Make sure the following are installed before starting:

- [Node.js](https://nodejs.org/) (v18 or later)
- [PostgreSQL](https://www.postgresql.org/) (v14 or later)
- [Python 3](https://www.python.org/) (for the database seed script)

---

### Step 1 — Clone the repo and install dependencies

```bash
git clone https://github.com/ho299/bowling-ball-grid-project.git
cd bowling-ball-grid-project
npm install
```

---

### Step 2 — Configure environment variables

Create or update your existing `.env` file in the project root and make sure it is git-ignored:

```env
# Leave DATABASE_URL commented out for local dev — only set on Render
# DATABASE_URL=postgresql://...

# Local PostgreSQL credentials
DB_USER=your_postgres_username
DB_HOST=localhost
DB_NAME=bowling_db
DB_PASSWORD=your_postgres_password   # leave blank if none set
DB_PORT=5432

# Backend server port
PORT=3000
```

> **Tip:** To find your Postgres username, run `psql postgres -c "\du"` in the terminal. If you installed Postgres via Homebrew on macOS, the default user is often your Mac login name with no password.

---

### Step 3 — Create and populate the database

**3a. Create the database:**

```bash
createdb -U your_postgres_username bowling_db
```

Or equivalently via psql:

```bash
psql -U your_postgres_username -c "CREATE DATABASE bowling_db;"
```

**3b. Apply the schema:**

```bash
psql -U your_postgres_username -d bowling_db -f backend/src/config/database_script.sql
```

> **Known issue:** The first line of `database_script.sql` is `GRANT ALL PRIVILEGES ON DATABASE bowling TO docker_user;` — this is Docker-specific and will produce an error locally (`role "docker_user" does not exist`). This is harmless; the tables will still be created. You can comment out that line to suppress the error.

**3c. Install Python dependencies and seed the database:**

```bash
pip install psycopg2-binary python-dotenv
python data/seed.py
```

The seed script reads `data/bowling_ball_data.csv` and populates the `ball`, `core`, `coverstock`, and `specs` tables. It skips balls that already exist by name, so it is safe to run multiple times.

**3d. Verify the data loaded:**

```bash
psql -U your_postgres_username -d bowling_db -c "SELECT COUNT(*) FROM ball;"
```

A successful seed should return several hundred rows.

**3e. Populate algorithm values:**

The seed script inserts raw specs (`rg`, `diff`, `mb_diff`) but does not calculate the derived algorithm values (`early_v_late`, `smooth_v_angular`, `hook_potential`). Run this script once to compute and write those values into the `specs` table:

```bash
node populate_algo.js
```

You should see output like:

```
Found 3200 specs to process...
  100 updated...
  ...
Done.  Updated: 3150  |  Skipped (bad values): 50
```

Skipped rows are typically spare balls (polyester coverstocks) or specs with values outside the algorithm's expected range — this is expected. Only needs to be run once; re-run it if you re-seed the database.

> **Note:** The Replace page's algorithm-based features (`replacement` and `Find Arsenal Gaps`) will return no results until this step is complete.

---

### Step 4 — Start the backend server

Open a terminal in the project root and run:

```bash
npm run backend
```

This starts the Express API on `http://localhost:3000`.

You should see output similar to:

```
Server running on http://localhost:3000
```

Leave this terminal open for the duration of your testing session.

---

### Step 5 — Start the frontend

Open a second terminal and run:

```bash
dev=local node frontend/utils/frontendStartup.js
```

This starts a lightweight Express server on port 80 that serves the static frontend files and proxies `/api/balls` requests to the backend. Setting `dev=local` tells the proxy to forward requests to `http://localhost:3000` (your local backend) rather than the Docker container hostname.

Open your browser to:

```
http://localhost/homepage.html
```

> **Note:** `package.json` has a `"frontend"` script that references the old path (`./frontend/startup.js`), so `npm run frontend` and `npm run start` will not work. Use the direct `node` command above.

---

### Step 6 — Verify everything is working

With both the backend (Step 4) and frontend server (Step 5) running, navigate to the pages below and confirm each one works:

| Page | URL | What to check |
|---|---|---|
| Homepage | `http://localhost/homepage.html` | Balls plotted on grid, table populated, axis/weight dropdowns work |
| Compare | `http://localhost/compare.html` | Ball search returns results, side-by-side comparison table renders |
| Arsenal | `http://localhost/arsenal.html` | Ball search returns results, adding a ball saves to the card list |
| Replace | `http://localhost/replacement.html` | Database mode ball search returns results, replacement cards appear with match % |

If the grid or table show only placeholder balls (Ball A, Ball B, Ball C), open the browser developer console (`F12 → Console`) and look for fetch errors — the most common causes are the backend not running or the database being empty.

---

### Stopping local servers

- **Backend:** Press `Ctrl+C` in the terminal running `npm run backend`
- **Frontend server:** Press `Ctrl+C` in the terminal running `node frontend/utils/frontendStartup.js`

---

### Project structure (12 APR 2026)

```
bowling-ball-grid-project/
├── backend/
│   ├── algorithms/
│   │   └── bowlingBallScoreAlgos.js  # Scoring algorithm utilities
│   └── src/
│       ├── app.js                    # Express API entry point
│       ├── config/
│       │   ├── db_credentials.js     # PostgreSQL connection pool (reads .env)
│       │   ├── database_setup.js     # Node.js seed script (requires csv-parse — see seed.py instead)
│       │   └── database_script.sql   # Schema DDL — run once to create all tables
│       ├── queries/                  # SQL query functions (ball, core, coverstock, specs)
│       └── routes/                   # API route handlers
├── data/
│   ├── bowling_ball_data.csv         # Source data (~1000+ balls) for seeding
│   ├── validation_data.json          # Validation reference data
│   └── seed.py                       # Python seed script — loads CSV into PostgreSQL
├── frontend/
│   ├── images/                       # Logo and favicon assets
│   ├── pages/                        # HTML pages (served as root by frontendStartup.js)
│   │   ├── homepage.html             # Grid/scatter plot + filter panel
│   │   ├── compare.html              # Side-by-side ball comparison
│   │   ├── arsenal.html              # Personal ball collection with scores and usage
│   │   ├── replacement.html          # Find replacement balls (arsenal or database)
│   │   ├── index.html                # AWS Amplify redirect shim
│   │   └── styles.css                # Shared stylesheet
│   └── utils/                        # JavaScript (served under /utils/ by frontendStartup.js)
│       ├── app.js                    # Homepage logic (fetch, plot, table, filters)
│       ├── compare.js                # Comparison page logic
│       ├── arsenal.js                # Arsenal management (localStorage-backed)
│       ├── replacement.js            # Replacement scoring and search logic
│       ├── auth.js                   # Login/create account modal (API calls placeholder)
│       ├── filter-utils.js           # Reusable FilterPanel class
│       ├── theme.js                  # Dark/light mode toggle (shared by non-homepage pages)
│       └── frontendStartup.js        # Node/Express static server + /api/balls proxy
├── populate_algo.js                  # One-time script: calculates and writes algorithm values into specs
├── .env                              # Local credentials (git-ignored — create manually)
└── package.json
```