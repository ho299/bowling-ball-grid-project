const pool = require('../config/db_credentials');

const addModification = async ({ owned_ball_id, mod_type, description = null, rg = null, diff = null, mb_diff = null, early_v_late = null, smooth_v_angular = null, hook_potential = null }) => {
    const result = await pool.query(
        `INSERT INTO modification (owned_ball_id, mod_type, description, rg, diff, mb_diff, early_v_late, smooth_v_angular, hook_potential)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [owned_ball_id, mod_type, description, rg, diff, mb_diff, early_v_late, smooth_v_angular, hook_potential]
    );
    return result.rows[0];
};

const getCurrentModification = async (owned_ball_id) => {
    const result = await pool.query(
        `SELECT * 
         FROM modification
         WHERE owned_ball_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [owned_ball_id]
    );
    return result.rows[0]; // single object, not an array
};

const getModificationHistoryofOwnedBall = async (owned_ball_id) => {
    const result = await pool.query(
        `SELECT * 
         FROM modification
        WHERE owned_ball_id = $1        
        ORDER BY created_at DESC`,
        [owned_ball_id]
    );
    return result.rows; // array of modifications for the owned ball
}        


//rarely used, useful for testing and admin purposes
const getModificationById = async (id) => {
    const result = await pool.query(`SELECT * FROM modification WHERE id = $1`, [id]);
    return result.rows[0];
};

const updateModification = async (id, { mod_type = null, description = null, rg = null, diff = null, mb_diff = null, early_v_late = null, smooth_v_angular = null, hook_potential = null }) => {
    const result = await pool.query(
        `UPDATE modification
         SET
             mod_type         = COALESCE($2, mod_type),
             description      = COALESCE($3, description),
             rg               = COALESCE($4, rg),
             diff             = COALESCE($5, diff),
             mb_diff          = COALESCE($6, mb_diff),
             early_v_late     = COALESCE($7, early_v_late),
             smooth_v_angular = COALESCE($8, smooth_v_angular),
             hook_potential   = COALESCE($9, hook_potential)
         WHERE id = $1
         RETURNING *`,
        [id, mod_type, description, rg, diff, mb_diff, early_v_late, smooth_v_angular, hook_potential]
    );
    return result.rows[0];
};

const deleteModification = async (id) => {
    const result = await pool.query(`DELETE FROM modification WHERE id = $1 RETURNING *`, [id]);
    return result.rows[0];
};

module.exports = { 
    addModification, 
    getCurrentModification,
    getModificationHistoryofOwnedBall, 
    getModificationById, 
    updateModification, 
    deleteModification 
};