const pool = require('../config/db'); // calling the db

//GET all the cores
const getAllCores = async () => {
  const query = 'SELECT * FROM core ORDER BY id ASC';
  const result = await pool.query(query);
  return result.rows;
}   

//GET a particular core by id
const getCoreById = async (id) => {
    const query = 'SELECT * FROM core WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
}

//POST - create core information
const createCore = async ({name,type,description=null}) => {
    const query = `INSERT INTO core (name, type, description) 
                    VALUES ($1, $2, $3)
                    RETURNING *`;
    const result = await pool.query(query, [name, type, description]);
    return result.rows[0];
}
//PUT - update core information by id
const updateCore = async (id, {name=null,type=null,description=null}) => {
    const query = `UPDATE core 
                    SET name = COALESCE($1, name), 
                     type = COALESCE($2, type), 
                     description = COALESCE($3, description) 
                    WHERE id = $4
                    RETURNING *`;
    const result = await pool.query(query, [name, type, description, id]);
    return result.rows[0];
}

//DELETE a core by id
const deleteCore = async (id) => {
    const query = 'DELETE FROM core WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
}

module.exports = {
    getAllCores,
    getCoreById,
    createCore,
    updateCore,
    deleteCore,
};
    