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

**Create the database and tables:**

```bash
psql -U your_postgres_username -f backend/src/config/database_script.sql
```

**Install Python dependencies and seed the database:**

```bash
pip install psycopg2-binary python-dotenv
python data/seed.py
```

The seed script reads `data/bowling_ball_data.csv` and populates the `ball`, `core`, `coverstock`, and `specs` tables. It skips rows that already exist, so it is safe to run multiple times.

**Verify the data loaded:**

```bash
psql -U your_postgres_username -d bowling_db -c "SELECT COUNT(*) FROM ball;"
```

---

### Step 4 — Start the backend server

Open a terminal in the project root and run:

```bash
npm run backend
```

This starts the Express API on `http://localhost:3000`.

You should see output similar to:

```
Server running on port 3000
```

Leave this terminal open for the duration of your testing session.

---

### Step 5 — Start the frontend

Open a second terminal and run:

```bash
dev=local node frontend/frontendStartup.js
```

This starts a lightweight Express server on port 80 that serves the static frontend files and proxies `/api/balls` requests to the backend. Setting `dev=local` tells the proxy to forward requests to `http://localhost:3000` (your local backend) rather than the Docker container hostname.

Open your browser to:

```
http://localhost/homepage.html
```

> **Note:** `package.json` has a `"frontend"` script but it references the wrong filename (`startup.js` instead of `frontendStartup.js`), so `npm run start` and `npm run frontend` will not work as written. Use the direct `node` command above until this is fixed.

---

### Step 6 — Verify everything is working

With both the backend (Step 4) and frontend server (Step 5) running, navigate to the pages below and confirm each one works:

| Page | URL (Option A) | What to check |
|---|---|---|
| Homepage | `/homepage.html` | Balls plotted on grid, table populated, axis/weight dropdowns work |
| Compare | `/compare.html` | Ball search returns results, side-by-side comparison table renders |
| Arsenal | `/arsenal.html` | Ball search returns results, adding a ball saves to the card list, scores and usage fields save correctly |
| Replace | `/replacement.html` | Database mode ball search returns results, replacement cards appear with match % after selecting a ball |

If the grid or dropdowns show only placeholder balls (Ball A, Ball B, Ball C), open the browser developer console (`F12 → Console`) and look for fetch errors — the most common causes are the backend not running or the database being empty.

---

### Stopping local servers

- **Backend:** Press `Ctrl+C` in the terminal running `npm run backend`
- **Frontend server:** Press `Ctrl+C` in the terminal running `node frontend/frontendStartup.js`

---

### Project structure (30 MAR 2026)

```
bowling-ball-grid-project/
├── backend/
│   ├── algorithms/
│   │   └── bowlingBallScoreAlgos.js  # Scoring algorithm utilities
│   └── src/
│       ├── app.js                    # Express API entry point
│       ├── config/
│       │   ├── db_credentials.js     # PostgreSQL connection pool
│       │   └── database_setup.js     # Schema setup
│       ├── queries/                  # SQL query functions (ball, core, coverstock, specs)
│       └── routes/                   # API route handlers
├── data/
│   ├── bowling_ball_data.csv         # Source data for seeding
│   ├── validation_data.json          # Validation reference data
│   └── seed.py                       # Seed script — loads CSV into PostgreSQL
├── frontend/
│   ├── homepage.html                 # Grid/scatter plot + filter panel
│   ├── compare.html                  # Side-by-side ball comparison
│   ├── arsenal.html                  # Personal ball collection with scores and usage
│   ├── replacement.html              # Find replacement balls (arsenal or database)
│   ├── index.html                    # AWS Amplify redirect shim
│   ├── app.js                        # Homepage logic (fetch, plot, table, filters)
│   ├── compare.js                    # Comparison page logic
│   ├── arsenal.js                    # Arsenal management (localStorage-backed)
│   ├── replacement.js                # Replacement scoring and search logic
│   ├── auth.js                       # Login/create account modal (API calls placeholder)
│   ├── filter-utils.js               # Reusable FilterPanel class
│   ├── theme.js                      # Dark/light mode toggle (shared by non-homepage pages)
│   ├── frontendStartup.js            # Node/Express static server + /api/balls proxy
│   └── styles.css                    # Shared stylesheet
├── .env                              # Local credentials (git-ignored — create manually)
└── package.json
```