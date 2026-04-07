const pool = require('../config/db_credentials'); // calling the db

//GET all the replacement balls by id
const getReplacementBalls = async (id, discontinued, overseas) => {
  const query = `
  WITH currentBall AS (
    SELECT * FROM specs WHERE id=$1
  )
  SELECT *, 
  SQRT(
    POWER(cb.early_v_late-a.early_v_late,2)
    +POWER(cb.smooth_v_angular-a.smooth_v_angular,2)
    +POWER(cb.hook_potential-a.hook_potential,2)
  ) AS replacementScore
  FROM specs a, currentBall cb INNER JOIN ball b ON b.id=a.id
WHERE a.id!=$1 AND a.weight=cb.weight AND ($2 IS NULL OR b.discontinued=$2) AND ($3 IS NULL OR b.overseas=$3) ORDER BY replacementScore ASC;`; 
  const result = await pool.query(query, [id, discontinued, overseas]);
  return result.rows;
};

//GET all the gap finder balls by ids
const getGapFinderBalls = async (ids,discontinued,overseas) => {
  const query = `
  WITH sourceBalls AS (
    SELECT id AS source_id, * 
    FROM specs 
    WHERE id IN (SELECT value FROM json_each($1))
  )
  SELECT 
      t.*,
      MIN(SQRT(
          POWER(t.early_v_late - sb.early_v_late, 2) + 
          POWER(t.smooth_v_angular - sb.smooth_v_angular, 2) + 
          POWER(t.hook_potential - sb.hook_potential, 2)
      )) AS shortestDistanceToAnySource,
    sb.*,
    b.*
  FROM specs t
  INNER JOIN ball b ON b.id=t.id AND ($2 IS NULL OR b.discontinued=$2) AND ($3 IS NULL OR b.overseas=$3)
  CROSS JOIN sourceBalls sb ON t.weight=sb.weight
  WHERE t.id NOT IN (SELECT source_id FROM sourceBalls)
  GROUP BY t.id, t.early_v_late, t.smooth_v_angular, t.hook_potential
  ORDER BY shortestDistanceToAnySource DESC;`; 
  const result = await pool.query(query, [ids,discontinued,overseas]);
  return result.rows;
};
