const pool = require('../config/db'); // calling the db

const createUser = async () => {
    const query = `INSERT INTO user (first_name, last_name, about, email, password)
                    VALUES ($1,$2, $3, $4, $5)`;
      const result = await pool.query(query, [first_name, last_name, about, email, password]);
      return result.rows[0];
}

const getUserByEmail = async (email) => {
    const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
         [email]);
    return result.rows[0];
};

const getUserById = async (id) => {
    const result = await pool.query(
        'SELECT id, name, about, email FROM users WHERE id = $1', 
        [id]
    );
    return result.rows[0];
};

const updateUser = async (id,{first_name = null, last_name = null,about=null,email = null,password=null}) => {
    const result = await pool.query(
                `UPDATE users
                SET 
                first_name = COALESCE($2, first_name), 
                last_name = COALESCE($3, last_name), 
                about = COALESCE($4, about), 
                email = COALESCE($5, email), 
                password = COALESCE($6, password)
                WHERE id = $1`,
         [id,first_name,last_name,about,email,password]);
    return result.rows[0];
};

const deleteUser = async (id) => {
  const query = 'DELETE FROM user WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

module.exports = {
    createUser,
    getUserByEmail,
    getUserById,
    updateUser,
    deleteUser
};