module.exports = { /* do I want to get all the information or only some? */
  findAll: `
    SELECT b.id, b.name, c.name as core_name, cs.name as cover_name 
    FROM ball b
    JOIN core c ON b.core_id = c.id
    JOIN coverstock cs ON b.coverstock_id = cs.id
    ORDER BY b.release_date DESC
  `,
  
  findById: `SELECT * FROM ball WHERE id = $1`,
  
  insertBall: `
    INSERT INTO ball (name, core_id, coverstock_id, image, release_date, description)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `
};