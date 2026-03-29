const pool = require('../config/db'); // calling the db


const addBalltoArsenal = async (arsenal_id, ball_id, role,slot_number) => {
    // Ensure owned_ball_id is valid for arsenal_id
    const ownerCheck = await pool.query(
        `SELECT 1
        FROM arsenal_list al
        JOIN owned_ball ob ON al.user_id = ob.user_id
        WHERE al.id = $1 AND ob.ball_id = $2`,
        [arsenal_id, ball_id]
    );

    if (ownerCheck.rows.length === 0) {
        throw new Error('Ball is not owned by the user who owns this arsenal');
    }


    //if valid, add to arsenal_content
    const query = `INSERT INTO arsenal_content (arsenal_id, ball_id, role, slot_number)
                   VALUES ($1, $2, $3, $4)
                   RETURNING *`;
    const result = await pool.query(query, [arsenal_id, ball_id, role, slot_number]);
    return result.rows[0];
};



module.exports = {
    addBalltoArsenal
}