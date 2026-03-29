const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const algorithm = require('../../algorithms/bowlingBallScoreAlgos');
const pool = require('./db_credentials');

function parseSpec(specString) {
    if (!specString || specString.trim() === '') return null;
    try {
        const cleaned = specString
            .replace(/'/g, '"')
            .replace(/MB Diff/g, 'MB_Diff');
        const parsed = JSON.parse(cleaned);
        return {
            rg:      parsed.RG      ?? null,
            diff:    parsed.Diff    ?? null,
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

            // --- Core (upsert to avoid duplicates) ---
            const coreResult = await client.query(
                `INSERT INTO core (name, type, description)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (name) DO UPDATE SET type = EXCLUDED.type
                 RETURNING id`,
                [row.core, row.core_type, row.core_summary]
            );
            const coreId = coreResult.rows[0].id;

            // --- Coverstock (upsert to avoid duplicates) ---
            const coverstockResult = await client.query(
                `INSERT INTO coverstock (name, type, description)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (name) DO UPDATE SET type = EXCLUDED.type
                 RETURNING id`,
                [row.coverstock, row.coverstock_type, row.coverstock_description]
            );
            const coverstockId = coverstockResult.rows[0].id;

            // --- Parse specs (weights 12–16) ---
            const weightMap = { spec_12: 12, spec_13: 13, spec_14: 14, spec_15: 15, spec_16: 16 };
            const parsedSpecs = [];

            for (const [key, weight] of Object.entries(weightMap)) {
                const spec = parseSpec(row[key]);
                if (spec) {
                    const finishNumber = algorithm.finishNametoNumber(row.factory_finish, row.coverstock);
                    const bowlingBall = {
                        rg:             spec.rg,
                        diff:           spec.diff,
                        mb_diff:        spec.mb_diff,
                        factory_finish: finishNumber
                    };
                    parsedSpecs.push({
                        weight,
                        ...spec,
                        hook_potential:   algorithm.hookPotential(bowlingBall),
                        early_v_late:     algorithm.earlyVLate(bowlingBall),
                        smooth_v_angular: algorithm.smoothVAngular(bowlingBall)
                    });
                }
            }

            // --- Ball (algo columns removed — they live on specs, not ball) ---
            const ballResult = await client.query(
                `INSERT INTO ball (
                    core_id, coverstock_id, name, image, brand,
                    release_date, discontinued, overseas, factory_finish
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id`,
                [
                    coreId,
                    coverstockId,
                    row.name,                           
                    row.image_url,
                    row.brand,                          
                    row.release_date || null,
                    row.discontinued === 'true',
                    row.overseas === 'true',
                    row.factory_finish
                ]
            );
            const ballId = ballResult.rows[0].id;

            // --- Specs ---
            for (const spec of parsedSpecs) {
                await client.query(
                    `INSERT INTO specs (ball_id, weight, rg, diff, mb_diff, early_v_late, smooth_v_angular, hook_potential)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [ballId, spec.weight, spec.rg, spec.diff, spec.mb_diff,
                     spec.early_v_late, spec.smooth_v_angular, spec.hook_potential]
                );
            }

            await client.query('COMMIT');
            console.log(`✓ Inserted: ${row.name}`);
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