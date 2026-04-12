const pool = require('../config/db_credentials'); // calling the db

//GET all the bowling balls
const getAllBalls = async () => {
  const query = `SELECT b.*,
              c.name AS core_name, c.type AS core_type,
              cs.name AS coverstock_name, cs.type AS coverstock_type,
              COALESCE(
                json_agg(
                  json_build_object('weight', s.weight, 'rg', s.rg, 'diff', s.diff, 'mb_diff', s.mb_diff, 'early_v_late', s.early_v_late, 'smooth_v_angular', s.smooth_v_angular, 'hook_potential', s.hook_potential)
                  ORDER BY s.weight
                ) FILTER (WHERE s.ball_id IS NOT NULL),
                '[]'
              ) AS specs
              FROM ball b
              LEFT JOIN core c ON c.id = b.core_id
              LEFT JOIN coverstock cs ON cs.id = b.coverstock_id
              LEFT JOIN specs s ON s.ball_id = b.id
              WHERE s.rg IS NOT NULL AND s.diff IS NOT NULL
              GROUP BY b.id, c.name, c.type, cs.name, cs.type
              ORDER BY b.release_date DESC`;
  const result = await pool.query(query);
  return result.rows;
}
//GET a particular ball by id
const getBallById = async (id) => {
  const query = `SELECT b.*,
                c.name AS core_name, c.type AS core_type,
                cs.name AS coverstock_name, cs.type AS coverstock_type,
                json_agg(s.*) AS specs
                FROM ball b
                LEFT JOIN specs s ON s.ball_id = b.id
                LEFT JOIN core c ON c.id = b.core_id
                LEFT JOIN coverstock cs ON cs.id = b.coverstock_id
                WHERE b.id = $1
                GROUP BY b.id, c.name, c.type, cs.name, cs.type`;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}


//POST - create ball information
const createBall = async ({name, brand=null, image=null, release_date, discontinued, overseas, factory_finish, core_id, coverstock_id}) => {
  const query = `INSERT INTO ball (name, brand, image, release_date, discontinued, overseas, factory_finish, core_id, coverstock_id) 
                  VALUES ($1, $2, $3, TO_DATE($4, 'Mon YYYY'), $5, $6, $7, $8, $9) 
                  RETURNING *`;
  const result = await pool.query(query, [name, brand, image, release_date, discontinued, overseas, factory_finish, core_id, coverstock_id]);
  return result.rows[0];
}

//PUT - update ball information
const updateBall = async (id, { name = null, brand = null, image = null, release_date = null, discontinued = null, overseas = null, factory_finish = null , core_id = null, coverstock_id = null }) => {  const query = `UPDATE ball 
                  SET name = COALESCE($1, name), 
                    brand = COALESCE($2, brand), 
                    image = COALESCE($3, image), 
                    release_date = COALESCE(TO_DATE($4, 'Mon YYYY'), release_date), 
                    discontinued = COALESCE($5, discontinued), 
                    overseas = COALESCE($6, overseas),
                    factory_finish = COALESCE($7, factory_finish),
                    core_id = COALESCE($8, core_id), 
                    coverstock_id = COALESCE($9, coverstock_id) 
                  WHERE id = $10
                  RETURNING *`;
  const result = await pool.query(query, [name, brand, image, release_date, discontinued, overseas, factory_finish, core_id, coverstock_id, id]);
  return result.rows[0];
}

//DELETE - delete ball information
const deleteBall = async (id) => {
  const query = 'DELETE FROM ball WHERE id = $1 RETURNING *';
  const result = await pool.query(query, [id]);
  return result.rows[0];
}


module.exports = {
  getAllBalls,
  getBallById,
  createBall,
  updateBall,
  deleteBall
};