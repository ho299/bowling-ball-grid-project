# bowling-ball-grid-project
ECE50874 - Bowling Ball grid project repo

# TODO

---

## Local Testing Setup

This is a guide to set up the project for local development from a fresh clone. I ran the backend with npm in the terminal; the frontend with the VS Code Live Server extension.

### Prerequisites

Make sure the following are installed before starting:

- [Node.js](https://nodejs.org/) (v18 or later)
- [PostgreSQL](https://www.postgresql.org/) (v14 or later)
- [Python 3](https://www.python.org/) (for the database seed script)
- VS Code with the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) installed

---

### Step 1 — Clone the repo and install dependencies

```bash
git clone https://github.com/ho299/bowling-ball-grid-project.git
cd bowling-ball-grid-project
npm install
```

---

### Step 2 — Configure environment variables

Create or update your exsisting `.env` file in the project root (it is git-ignored via Sarah's forsight):

```env
# Leave DATABASE_URL commented out for local dev — only set on Render
# DATABASE_URL=postgresql://...

# Local PostgreSQL credentials
DB_USER=your_postgres_username  #this defaulted to my sys username (I think a MacOS thing)
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

From the project root, run:

```bash
npm run backend
```

This starts the Express API on `http://localhost:3000` using nodemon, which automatically restarts the server when backend files change.

You should see output similar to:

```
[nodemon] starting `node backend/src/app.js`
Server running on port 3000
```

Leave this terminal open while testing.

---

### Step 5 — Start the frontend with Live Server

1. Open the project folder in VS Code
2. Open `frontend/homepage.html`
3. Click **Go Live** in the VS Code status bar (bottom right), or right-click the file and select **Open with Live Server**

Live Server will open the page in your browser at `http://127.0.0.1:5500/frontend/homepage.html` (port may vary).

> **Important:** The frontend fetches data from `http://localhost:3000/api/balls`. The backend server from Step 4 **must be running** before loading the page, or the app will fall back to placeholder data.

---

### Step 6 — Verify everything is working

With both the backend server and Live Server running, open the homepage in your browser. You should see:

- Bowling balls plotted on the canvas grid
- A populated table below/beside the canvas
- Working X-Axis, Y-Axis, and Weight dropdowns

If the grid shows only placeholder balls (Ball A, Ball B, Ball C), check the browser console (`F12 → Console`) for errors — the most common causes are the backend not running or the database being empty. In chrome you can use the Developer tools to check for errors (Three Dot [upper right] > More Tools > Developer Tools)

---

### Stopping local servers

- **Backend:** Press `Ctrl+C` in the terminal running `npm run dev`
- **Live Server:** Click **Port 5500** in the VS Code status bar to stop it, or close VS Code

---

### Project structure at time of this commit 15MAR2026

```
bowling-ball-grid-project/
├── backend/
│   └── src/
│       ├── app.js              # Express entry point
│       ├── config/
│       │   ├── db.js           # PostgreSQL connection pool
│       │   └── database_script.sql  # Schema (run once to create tables)
│       ├── queries/            # SQL query functions
│       └── routes/             # API route handlers
├── data/
│   ├── bowling_ball_data.csv   # Source data for seeding
│   └── seed.py                 # Seed script — loads CSV into PostgreSQL
├── frontend/
│   ├── homepage.html           # Main page
│   ├── app.js                  # Frontend logic (fetch, plot, table)
│   └── styles.css              # Stylesheet
├── .env                        # Local credentials (git-ignored — create manually)
└── package.json
```