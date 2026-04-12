const pool = require('../config/db_credentials'); // calling the db

//GET all the specs ball id
const getSpecsByBallId = async (id) => {
  const query = `SELECT * 
                FROM specs 
                WHERE ball_id = $1`;
  const result = await pool.query(query, [id]);
  return result.rows;
};
// For ease of visualization 
const getFirstSpecByBallId = async (id) => {
    const query = `SELECT * FROM specs WHERE ball_id = $1 ORDER BY weight ASC LIMIT 1`;
    const result = await pool.query(query, [id]);
    return result.rows[0]; // rows[0] not rows since it's a single record
};

//GET all the specs ball id
const getSpecsByBallIdandWeight = async (id,weight) => {
  const query = `SELECT * 
                FROM specs 
                WHERE ball_id = $1 and weight = $2` ;
  const result = await pool.query(query, [id,weight]);
  return result.rows;
};

//POST - create specs information
const createSpecs = async ({ball_id, weight, rg, diff, mb_diff, evl, sva, hook}) => {
    const query = `INSERT INTO specs (ball_id, weight,  rg, diff, mb_diff, EARLY_V_LATE, SMOOTH_V_ANGULAR, HOOK_POTENTIAL)
                    VALUES ($1, $2, $3, $4, $5,$6,$7,$8)
                    RETURNING *`;
    const result = await pool.query(query, [ball_id, weight,  rg, diff, mb_diff, evl, sva, hook]);
    return result.rows[0];
}

module.exports = {
    getSpecsByBallId,
    getSpecsByBallIdandWeight,
    createSpecs,
    getFirstSpecByBallId
};