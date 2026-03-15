const express = require('express')
const router = express.Router();
const specQueries = require('../queries/spec_queries'); // calling sql queries

//GET /api/specs/ball/:id - Get specs by ball id
router.get('/ball/:id', async function(req, res){
    try {
        const { id } = req.params;
        const specs = await specQueries.getSpecsByBallId(id);
        if (!specs || specs.length === 0) return res.status(404).json({ error: 'Specs not found for the specified ball id' });
        res.status(200).json(specs);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve specs' });
    }
});

//POST /api/specs - Create specs information
router.post('/', async function(req, res){
    try {
        const { ball_id, weight, length, RG, differential } = req.body;
        const newSpecs = await specQueries.createSpecs({ ball_id, weight, length, RG, differential });
        res.status(201).json(newSpecs);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create specs' });
    }});

module.exports = router;