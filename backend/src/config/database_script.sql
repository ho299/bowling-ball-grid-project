-- Run this after connecting to your 'bowling' database
-- On AWS RDS, create the DB via console or: CREATE DATABASE bowling;
-- Then connect through your client before running the rest.

--------------------- CATALOG SCHEMA
GRANT ALL PRIVILEGES ON DATABASE bowling TO docker_user;
-- Core table
CREATE TABLE core (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    type        TEXT
);

-- Coverstock table
CREATE TABLE coverstock (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    type        TEXT
);

-- Ball table
CREATE TABLE ball (
    id              SERIAL PRIMARY KEY,
    core_id         INT REFERENCES core(id) ON DELETE SET NULL,
    coverstock_id   INT REFERENCES coverstock(id) ON DELETE SET NULL,
    name            TEXT NOT NULL,
    image           TEXT,
    brand           TEXT,
    release_date    DATE,
    discontinued    BOOLEAN NOT NULL DEFAULT FALSE,
    overseas        BOOLEAN NOT NULL DEFAULT FALSE,
    factory_finish  TEXT       
);

-- Specs table (one row per ball+weight combo)
CREATE TABLE specs (
    ball_id         INT NOT NULL REFERENCES ball(id) ON DELETE CASCADE,
    weight          INT NOT NULL,
    rg              REAL,
    diff            REAL,
    mb_diff         REAL,
    early_v_late    REAL,
    smooth_v_angular REAL,
    hook_potential  REAL,
    PRIMARY KEY (ball_id, weight)
);


------------------------ USER SCHEMA


-- Users table  (renamed from User — reserved keyword in PostgreSQL)
CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    first_name  TEXT,
    last_name   TEXT,
    about       TEXT,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tracking user ball usage and condition
CREATE TABLE owned_ball (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ball_id     INT NOT NULL REFERENCES ball(id) ON DELETE CASCADE, 
    weight      INT NOT NULL,
    usage       INT NOT NULL DEFAULT 0,
    note        TEXT,
    condition   TEXT CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'replace')),
    status      TEXT CHECK (status IN ('active', 'lost', 'retired', 'repair', 'inactive')),
    drilled     BOOLEAN NOT NULL DEFAULT FALSE
);
-- Table for storing ball modifications (drilling layouts, surface changes, etc.)
CREATE TABLE modification (
    id                  SERIAL PRIMARY KEY,
    owned_ball_id       INT NOT NULL REFERENCES owned_ball(id) ON DELETE CASCADE,
    mod_type            TEXT CHECK (mod_type IN ('drilling', 'surface', 'plug & redrill', 'Detox/Oil Extraction','other')) NOT NULL,
    description         TEXT,
    rg                  REAL,
    diff                REAL,
    mb_diff             REAL,
    early_v_late        REAL,
    smooth_v_angular    REAL,
    hook_potential      REAL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


---------------------------------- ARSENAL SCHEMA


-- Tables for user-created arsenals and their contents 
CREATE TABLE arsenal_list (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE arsenal_content (
    arsenal_id      INT NOT NULL REFERENCES arsenal_list(id) ON DELETE CASCADE,
    owned_ball_id   INT NOT NULL REFERENCES owned_ball(id) ON DELETE CASCADE,
    role            TEXT CHECK (role IN ('primary', 'backup', 'spare', 'specialty')) NOT NULL,
    slot_number     INT NOT NULL,
    added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (arsenal_id, owned_ball_id)
);



-- Indexes for common lookups
CREATE INDEX ON ball (core_id);
CREATE INDEX ON ball (coverstock_id);
CREATE INDEX ON specs (ball_id);
CREATE INDEX ON owned_ball (user_id);
CREATE INDEX ON owned_ball (ball_id);
CREATE INDEX ON modification (owned_ball_id);
CREATE INDEX ON arsenal_list (user_id);
CREATE INDEX ON arsenal_content (arsenal_id);
CREATE INDEX ON arsenal_content (owned_ball_id);