const pool = require('../config/db_credentials');

const createArsenal = async ({ user_id, name, description = null }) => {
    const result = await pool.query(
        `INSERT INTO arsenal_list (user_id, name, description)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [user_id, name, description]
    );
    return result.rows[0];
};

const getArsenalsByUser = async (user_id) => {
    const result = await pool.query(
        `SELECT * FROM arsenal_list WHERE user_id = $1 ORDER BY created_at DESC`,
        [user_id]
    );
    return result.rows;
};

const getArsenalById = async (id) => {
    const result = await pool.query(
        `SELECT * FROM arsenal_list WHERE id = $1`,
        [id]
    );
    return result.rows[0];
};

const updateArsenal = async (id, { name = null, description = null }) => {
    const result = await pool.query(
        `UPDATE arsenal_list
         SET name        = COALESCE($2, name),
             description = COALESCE($3, description)
         WHERE id = $1
         RETURNING *`,
        [id, name, description]
    );
    return result.rows[0];
};

const deleteArsenal = async (id) => {
    const result = await pool.query(
        `DELETE FROM arsenal_list WHERE id = $1 RETURNING *`,
        [id]
    );
    return result.rows[0];
};

module.exports = {
    createArsenal,
    getArsenalsByUser,
    getArsenalById,
    updateArsenal,
    deleteArsenal
};