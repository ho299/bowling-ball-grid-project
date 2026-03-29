const pool = require('../config/db');

const addOwnedBall = async ({ user_id, ball_id, weight, usage = 0, note = null, condition = null, status = null, drilled = false }) => {
    const result = await pool.query(
        `INSERT INTO owned_ball (user_id, ball_id, weight, usage, note, condition, status, drilled)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [user_id, ball_id, weight, usage, note, condition, status, drilled]
    );
    return result.rows[0];
};

const getOwnedBallDrilledStatus = async (id) => {
    const result = await pool.query(
        `SELECT drilled FROM owned_ball WHERE id = $1`,
        [id]
    );
    return result.rows[0];
};


const getOwnedBallsByUser = async (user_id) => {
    const result = await pool.query(
        `SELECT ob.*,
             b.name, b.image, b.brand, b.factory_finish,
             b.discontinued, b.overseas
         FROM owned_ball ob
         JOIN ball b ON b.id = ob.ball_id
         WHERE ob.user_id = $1
         ORDER BY ob.id`,
        [user_id]
    );
    return result.rows;
};

const getOwnedBallById = async (id) => {
    const result = await pool.query(
        `SELECT ob.*,
             b.name, b.image, b.brand, b.factory_finish
         FROM owned_ball ob
         JOIN ball b ON b.id = ob.ball_id
         WHERE ob.id = $1`,
        [id]
    );
    return result.rows[0];
};

const updateOwnedBall = async (id, { weight = null, usage = null, note = null, condition = null, status = null, drilled = null }) => {
    const result = await pool.query(
        `UPDATE owned_ball
         SET
             weight    = COALESCE($2, weight),
             usage     = COALESCE($3, usage),
             note      = COALESCE($4, note),
             condition = COALESCE($5, condition),
             status    = COALESCE($6, status),
             drilled   = COALESCE($7, drilled)
         WHERE id = $1
         RETURNING *`,
        [id, weight, usage, note, condition, status, drilled]
    );
    return result.rows[0];
};

const deleteOwnedBall = async (id) => {
    const result = await pool.query(
        `DELETE FROM owned_ball WHERE id = $1 RETURNING *`,
        [id]
    );
    return result.rows[0];
};

module.exports = { 
    addOwnedBall, 
    getOwnedBallDrilledStatus,
    getOwnedBallsByUser, 
    getOwnedBallById, 
    updateOwnedBall, 
    deleteOwnedBall 
};