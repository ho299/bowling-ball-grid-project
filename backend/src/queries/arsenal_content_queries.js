const pool = require('../config/db_credentials');

const addBallToArsenal = async ({ arsenal_id, owned_ball_id, role, slot_number }) => {
    // check the owned ball belongs to the user who owns the arsenal
    const ownerCheck = await pool.query(
        `SELECT 1
         FROM arsenal_list al
         JOIN owned_ball ob ON al.user_id = ob.user_id
         WHERE al.id = $1 AND ob.id = $2`,
        [arsenal_id, owned_ball_id]
    );

    if (ownerCheck.rows.length === 0) {
        throw new Error('Ball is not owned by the user who owns this arsenal');
    }

    const result = await pool.query(
        `INSERT INTO arsenal_content (arsenal_id, owned_ball_id, role, slot_number)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [arsenal_id, owned_ball_id, role, slot_number]
    );
    return result.rows[0];
};

const getBallsInArsenal = async (arsenal_id) => {
    const result = await pool.query(
        `SELECT ac.*, 
                ob.weight, ob.condition, ob.status, ob.drilled,
                b.name, b.brand, b.image, b.factory_finish
         FROM arsenal_content ac
         JOIN owned_ball ob ON ob.id = ac.owned_ball_id
         JOIN ball b ON b.id = ob.ball_id
         WHERE ac.arsenal_id = $1
         ORDER BY ac.slot_number ASC`,
        [arsenal_id]
    );
    return result.rows;
};

const updateBallInArsenal = async (arsenal_id, owned_ball_id, { role = null, slot_number = null }) => {
    const result = await pool.query(
        `UPDATE arsenal_content
         SET role        = COALESCE($3, role),
             slot_number = COALESCE($4, slot_number)
         WHERE arsenal_id = $1 AND owned_ball_id = $2
         RETURNING *`,
        [arsenal_id, owned_ball_id, role, slot_number]
    );
    return result.rows[0];
};

const removeBallFromArsenal = async (arsenal_id, owned_ball_id) => {
    const result = await pool.query(
        `DELETE FROM arsenal_content 
         WHERE arsenal_id = $1 AND owned_ball_id = $2 
         RETURNING *`,
        [arsenal_id, owned_ball_id]
    );
    return result.rows[0];
};

module.exports = {
    addBallToArsenal,
    getBallsInArsenal,
    updateBallInArsenal,
    removeBallFromArsenal
};