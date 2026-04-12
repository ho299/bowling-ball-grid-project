const pool = require('../config/db_credentials'); // calling the db

// GET replacement balls for a single ball.
// Results ordered by replacementScore ASC (closest match first).
const getReplacementBalls = async (id, discontinued, overseas) => {
  const query = `
    WITH currentBall AS (
      SELECT ball_id, weight, early_v_late, smooth_v_angular, hook_potential
      FROM   specs
      WHERE  ball_id = $1
      LIMIT  1
    )
    SELECT
      b.id, b.name, b.brand, b.image, b.release_date, b.factory_finish,
      b.discontinued, b.overseas,
      a.ball_id, a.weight, a.rg, a.diff, a.mb_diff,
      a.early_v_late, a.smooth_v_angular, a.hook_potential,
      SQRT(
          POWER(cb.early_v_late    - a.early_v_late,    2)
        + POWER(cb.smooth_v_angular - a.smooth_v_angular, 2)
        + POWER(cb.hook_potential  - a.hook_potential,  2)
      ) AS "replacementScore"
    FROM   currentBall cb
    CROSS  JOIN specs a
    JOIN   ball b ON b.id = a.ball_id
    WHERE  a.ball_id <> $1
      AND  a.weight = cb.weight
      AND  a.early_v_late    IS NOT NULL
      AND  a.smooth_v_angular IS NOT NULL
      AND  a.hook_potential  IS NOT NULL
      AND  ($2::boolean IS NULL OR b.discontinued = $2::boolean)
      AND  ($3::boolean IS NULL OR b.overseas     = $3::boolean)
    ORDER BY "replacementScore" ASC
  `;
  const result = await pool.query(query, [id, discontinued, overseas]);
  return result.rows;
};

// GET gap-filler balls for an arsenal (ids = JSON array string e.g. '[1,2,5]').
// Results ordered by shortestDistanceToAnySource DESC (biggest gap filled first).
const getGapFinderBalls = async (ids, discontinued, overseas) => {
  const query = `
    WITH sourceBalls AS (
      SELECT ball_id AS source_id, weight, early_v_late, smooth_v_angular, hook_potential
      FROM   specs
      WHERE  ball_id IN (
               SELECT value::int FROM json_array_elements_text($1::json)
             )
        AND  early_v_late    IS NOT NULL
        AND  smooth_v_angular IS NOT NULL
        AND  hook_potential  IS NOT NULL
    )
    SELECT
      b.id, b.name, b.brand, b.image, b.release_date, b.factory_finish,
      b.discontinued, b.overseas,
      t.ball_id, t.weight, t.rg, t.diff, t.mb_diff,
      t.early_v_late, t.smooth_v_angular, t.hook_potential,
      MIN(SQRT(
          POWER(t.early_v_late    - sb.early_v_late,    2)
        + POWER(t.smooth_v_angular - sb.smooth_v_angular, 2)
        + POWER(t.hook_potential  - sb.hook_potential,  2)
      )) AS "shortestDistanceToAnySource"
    FROM   specs t
    JOIN   ball b  ON b.id = t.ball_id
    JOIN   sourceBalls sb ON t.weight = sb.weight
    WHERE  t.ball_id NOT IN (SELECT source_id FROM sourceBalls)
      AND  t.early_v_late    IS NOT NULL
      AND  t.smooth_v_angular IS NOT NULL
      AND  t.hook_potential  IS NOT NULL
      AND  ($2::boolean IS NULL OR b.discontinued = $2::boolean)
      AND  ($3::boolean IS NULL OR b.overseas     = $3::boolean)
    GROUP BY
      b.id, b.name, b.brand, b.image, b.release_date, b.factory_finish,
      b.discontinued, b.overseas,
      t.ball_id, t.weight, t.rg, t.diff, t.mb_diff,
      t.early_v_late, t.smooth_v_angular, t.hook_potential
    ORDER BY "shortestDistanceToAnySource" DESC
  `;
  const result = await pool.query(query, [ids, discontinued, overseas]);
  return result.rows;
};

module.exports = { getReplacementBalls, getGapFinderBalls };