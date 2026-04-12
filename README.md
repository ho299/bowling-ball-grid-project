# bowling-ball-grid-project
ECE50874 - Bowling Ball grid project repo

# TODO

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