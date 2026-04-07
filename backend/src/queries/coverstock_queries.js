const pool = require('../config/db_credentials'); // calling the db

//GET all the coverstocks
const getAllCoverstock = async () => {
  const query = 'SELECT * FROM coverstock ORDER BY id ASC';
  const result = await pool.query(query);
  return result.rows;
}   

//GET a particular coverstock by id
const getCoverstockById = async (id) => {
    const query = 'SELECT * FROM coverstock WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
}

//POST - create coverstock information
const createCoverstock = async ({name,type,description=null}) => {
    const query = `INSERT INTO coverstock (name, type, description) 
                    VALUES ($1, $2, $3)
                    RETURNING *`;
    const result = await pool.query(query, [name, type, description]);
    return result.rows[0];
}
//PUT - update coverstock information by id
const updateCoverstock = async (id, {name=null,type=null,description=null}) => {
    const query = `UPDATE coverstock         
                    SET name = COALESCE($1, name), 
                     type = COALESCE($2, type), 
                     description = COALESCE($3, description) 
                    WHERE id = $4
                    RETURNING *`;
    const result = await pool.query(query, [name, type, description, id]);
    return result.rows[0];
}

//DELETE a coverstock by id
const deleteCoverstock = async (id) => {
    const query = 'DELETE FROM coverstock WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
}

module.exports = {
    getAllCoverstock,
    getCoverstockById,
    createCoverstock,
    updateCoverstock,
    deleteCoverstock
};  