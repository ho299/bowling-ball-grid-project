-- Create the bowling database
CREATE DATABASE bowling_db;

-- Connect to it
\c bowling_db;

-- Core table
CREATE TABLE Core (
    ID SERIAL PRIMARY KEY,
    NAME TEXT,
    DESCRIPTION TEXT,
    TYPE TEXT
);                                  

-- CoverStock table
CREATE TABLE CoverStock (
    ID SERIAL PRIMARY KEY,
    NAME TEXT,
    DESCRIPTION TEXT,
    TYPE TEXT
);

-- Ball table
CREATE TABLE Ball (
    ID SERIAL PRIMARY KEY,
    CORE_ID INT REFERENCES Core(ID),
    COVERSTOCK_ID INT REFERENCES CoverStock(ID),
    NAME TEXT,
    DESCRIPTION TEXT,
    IMAGE TEXT,
    BRAND TEXT,
    RELEASE_DATE DATE,
    DISCONTINUED BOOLEAN,
    OVERSEAS BOOLEAN,
    FACTORY_FINISH TEXT,
    EARLY_V_LATE REAL,       -- populated by algorithm, NULL until then
    SMOOTH_V_ANGULAR REAL,   -- populated by algorithm, NULL until then
    HOOK_POTENTIAL REAL      -- populated by algorithm, NULL until then
);

-- Specs table
CREATE TABLE Specs (
    BALL_ID INT REFERENCES Ball(ID),
    WEIGHT INT,
    RG REAL,
    DIFF REAL,
    MB_DIFF REAL,
    PRIMARY KEY (BALL_ID, WEIGHT)
);