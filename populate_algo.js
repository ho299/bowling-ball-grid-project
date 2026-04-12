/**
 * populate_algo.js
 * One-time script: calculates and writes early_v_late, smooth_v_angular,
 * and hook_potential into every specs row that currently has NULL values.
 *
 * Run from the project root after seeding the database:
 *   node populate_algo.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const { Pool }    = require('pg');
const algorithm   = require('./backend/algorithms/bowlingBallScoreAlgos');

const pool = new Pool({
    user:     process.env.DB_USER,
    host:     process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD || undefined,
    port:     parseInt(process.env.DB_PORT || '5432', 10),
});

async function run() {
    const client = await pool.connect();
    try {
        // Fetch every spec that still needs algorithm values,
        // joined to ball (for factory_finish) and coverstock (for finish type detection).
        const { rows } = await client.query(`
            SELECT s.ball_id, s.weight,
                   s.rg, s.diff, s.mb_diff,
                   b.factory_finish,
                   cs.name AS coverstock_name
            FROM   specs s
            JOIN   ball       b  ON b.id  = s.ball_id
            JOIN   coverstock cs ON cs.id = b.coverstock_id
            WHERE  s.rg      IS NOT NULL
              AND  s.diff    IS NOT NULL
              AND  s.mb_diff IS NOT NULL
              AND  s.early_v_late IS NULL
        `);

        console.log(`Found ${rows.length} specs to process...`);
        let updated = 0;
        let skipped = 0;

        for (const row of rows) {
            // finishNametoNumber needs a string; fall back to '' if NULL
            const finishNum = algorithm.finishNametoNumber(
                row.factory_finish  || '',
                row.coverstock_name || ''
            );

            const ball = {
                rg:             parseFloat(row.rg),
                diff:           parseFloat(row.diff),
                mb_diff:        parseFloat(row.mb_diff),
                factory_finish: finishNum,
            };

            const hookPot      = algorithm.hookPotential(ball);
            const earlyLate    = algorithm.earlyVLate(ball);
            const smoothAngular = algorithm.smoothVAngular(ball);

            // Skip rows where the formula produced NaN or ±Infinity
            // (usually means a spec value is out of the algorithm's expected range)
            if (!isFinite(hookPot) || !isFinite(earlyLate) || !isFinite(smoothAngular)) {
                console.warn(`  Skipping ball_id=${row.ball_id} weight=${row.weight} — non-finite result`);
                skipped++;
                continue;
            }

            await client.query(`
                UPDATE specs
                SET    hook_potential  = $1,
                       early_v_late   = $2,
                       smooth_v_angular = $3
                WHERE  ball_id = $4
                  AND  weight  = $5
            `, [hookPot, earlyLate, smoothAngular, row.ball_id, row.weight]);

            updated++;
            if (updated % 100 === 0) {
                console.log(`  ${updated} updated...`);
            }
        }

        console.log(`\nDone.  Updated: ${updated}  |  Skipped (bad values): ${skipped}`);
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(err => {
    console.error('populate_algo failed:', err.message);
    process.exit(1);
});