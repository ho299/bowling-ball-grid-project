const express = require('express');
const router = express.Router();
const arsenalContentQueries = require('../queries/arsenal_content_queries');

// POST /api/arsenal-content — add a ball to an arsenal
router.post('/', async (req, res) => {
    try {
        const { arsenal_id, owned_ball_id, role, slot_number } = req.body;
        const added = await arsenalContentQueries.addBallToArsenal({ arsenal_id, owned_ball_id, role, slot_number });
        res.status(201).json(added);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Failed to add ball to arsenal' });
    }
});

// GET /api/arsenal-content/:arsenal_id — get all balls in an arsenal
router.get('/:arsenal_id', async (req, res) => {
    try {
        const { arsenal_id } = req.params;
        const balls = await arsenalContentQueries.getBallsInArsenal(arsenal_id);
        if (!balls || balls.length === 0) return res.status(404).json({ error: 'No balls found in this arsenal' });
        res.status(200).json(balls);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve arsenal contents' });
    }
});

// PUT /api/arsenal-content/:arsenal_id/:owned_ball_id — update a ball's role/slot
router.put('/:arsenal_id/:owned_ball_id', async (req, res) => {
    try {
        const { arsenal_id, owned_ball_id } = req.params;
        const { role, slot_number } = req.body;
        const updated = await arsenalContentQueries.updateBallInArsenal(arsenal_id, owned_ball_id, { role, slot_number });
        if (!updated) return res.status(404).json({ error: 'Entry not found in arsenal' });
        res.status(200).json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update ball in arsenal' });
    }
});

// DELETE /api/arsenal-content/:arsenal_id/:owned_ball_id — remove a ball from arsenal
router.delete('/:arsenal_id/:owned_ball_id', async (req, res) => {
    try {
        const { arsenal_id, owned_ball_id } = req.params;
        const deleted = await arsenalContentQueries.removeBallFromArsenal(arsenal_id, owned_ball_id);
        if (!deleted) return res.status(404).json({ error: 'Entry not found in arsenal' });
        res.status(200).json({ message: 'Ball removed from arsenal successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to remove ball from arsenal' });
    }
});

module.exports = router;