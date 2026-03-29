const express = require('express');
const router = express.Router();
const arsenalContentQueries = require('../queries/arsenal_content_queries');

// POST /api/:arsenalId/balls — add a ball to an arsenal
router.post('/:arsenalId/balls', async (req, res) => {
    try {
        const { arsenalId } = req.params;
        const { owned_ball_id, role, slotNumber } = req.body;
            
        const result = await arsenalContentQueries.addBalltoArsenal(arsenalId, owned_ball_id, role, slotNumber);
        res.status(201).json(result);
    } catch (error) {
        if (error.message.includes('not owned by the user')) {
            return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to add ball to arsenal' });
    }
});

module.exports = router;