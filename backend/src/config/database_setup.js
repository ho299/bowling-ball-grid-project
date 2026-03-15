const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const algorithm = require('../../algorithms/bowlingBallScoreAlgos'); // adjust path as needed
const pool =  require('./db_credentials'); 

// Parses "{'RG': 2.494, 'Diff': 0.045, 'MB Diff': 0.017}" into an object
function parseSpec(specString) {
    if (!specString || specString.trim() === '') return null;
    try {
        const cleaned = specString
            .replace(/'/g, '"')           // single to double quotes
            .replace(/MB Diff/g, 'MB_Diff'); // fix key with space
        const parsed = JSON.parse(cleaned);
        return {
            rg: parsed.RG ?? null,
            diff: parsed.Diff ?? null,
            mb_diff: parsed.MB_Diff ?? null
        };
    } catch (e) {
        return null;
    }
}

async function seed() {
    const csvFile = fs.readFileSync(path.join(__dirname, '../../../data/bowling_ball_data.csv'), 'utf8');
    const rows = parse(csvFile, { columns: true, skip_empty_lines: true });

    const client = await pool.connect();

    try {
        for (const row of rows) {
            await client.query('BEGIN');

            // --- Core ---
            const coreResult = await client.query(
                `INSERT INTO Core (name, type, description) VALUES ($1, $2, $3) RETURNING id`,
                [row.core, row.core_type, row.core_summary]
            );
            const coreId = coreResult.rows[0].id;

            // --- Coverstock ---
            const coverstockResult = await client.query(
                `INSERT INTO CoverStock (name, type, description) VALUES ($1, $2, $3) RETURNING id`,
                [row.coverstock, row.coverstock_type, row.coverstock_description]
            );
            const coverstockId = coverstockResult.rows[0].id;

            // --- Parse all specs (12-16) ---
            const weightMap = { spec_12: 12, spec_13: 13, spec_14: 14, spec_15: 15, spec_16: 16 };
            const parsedSpecs = [];

            for (const [key, weight] of Object.entries(weightMap)) {
                const spec = parseSpec(row[key]);
                if (spec) {
                    // Run algorithms per spec
                    const finishNumber = algorithm.finishNametoNumber(row.factory_finish, row.coverstock);
                    const bowlingBall = {
                        rg: spec.rg,
                        diff: spec.diff,
                        mb_diff: spec.mb_diff,
                        factory_finish: finishNumber
                    };
                    parsedSpecs.push({
                        weight,
                        ...spec,
                        // hook_potential: algorithm.hookPotential(bowlingBall),
                        // early_v_late: algorithm.earlyVLate(bowlingBall),
                        // smooth_v_angular: algorithm.smoothVAngular(bowlingBall)
                    });
                }
            }

            // Use the first available spec's algorithm values for the ball
            const ballAlgo = parsedSpecs[0] ?? { hook_potential: null, early_v_late: null, smooth_v_angular: null };

            // --- Ball ---
            const ballResult = await client.query(
                `INSERT INTO Ball (
                    core_id, coverstock_id, name, image, brand, release_date,
                    discontinued, overseas, factory_finish,
                    early_v_late, smooth_v_angular, hook_potential
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
                [
                    coreId,
                    coverstockId,
                    row.url,
                    row.image_url,
                    row.brand_url,
                    row.release_date || null,
                    row.discontinued === 'true',
                    row.overseas === 'true',
                    row.factory_finish,
                    ballAlgo.early_v_late,
                    ballAlgo.smooth_v_angular,
                    ballAlgo.hook_potential
                ]
            );
            const ballId = ballResult.rows[0].id;

            // --- Specs ---
            for (const spec of parsedSpecs) {
                await client.query(
                    `INSERT INTO Specs (ball_id, weight, rg, diff, mb_diff) VALUES ($1,$2,$3,$4,$5)`,
                    [ballId, spec.weight, spec.rg, spec.diff, spec.mb_diff]
                );
            }

            await client.query('COMMIT');
            console.log(`✓ Inserted: ${row.url}`);
        }

        console.log('Seeding complete.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Seeding failed, rolled back:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();