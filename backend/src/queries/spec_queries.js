const pool = require('../config/db'); // calling the db

//GET all the specs ball id
const getSpecsByBallId = async (id) => {
  const query = `SELECT * 
                FROM specs 
                WHERE ball_id = $1`;
  const result = await pool.query(query, [id]);
  return result.rows;
};

//POST - create specs information
const createSpecs = async ({ball_id, weight, length, RG, differential}) => {
    const query = `INSERT INTO specs (ball_id, weight, length, RG, differential)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *`;
    const result = await pool.query(query, [ball_id, weight, length, RG, differential]);
    return result.rows[0];
}

