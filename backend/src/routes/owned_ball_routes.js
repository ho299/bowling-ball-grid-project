const express = require('express');
const router = express.Router();
const ownedBallQueries = require('../queries/owned_ball_queries');

// POST /api/owned-balls — add a ball to a user's collection
router.post('/', async (req, res) => {
    try {
        const { user_id, ball_id, weight, usage, note, condition, status, drilled } = req.body;
        const newOwnedBall = await ownedBallQueries.addOwnedBall({ user_id, ball_id, weight, usage, note, condition, status, drilled });
        res.status(201).json(newOwnedBall);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add owned ball' });
    }
});

// GET /api/owned-balls/user/:user_id — get all balls for a user
router.get('/user/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        const balls = await ownedBallQueries.getOwnedBallsByUser(user_id);
        if (!balls || balls.length === 0) return res.status(404).json({ error: 'No owned balls found for this user' });
        res.status(200).json(balls);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve owned balls' });
    }
});

// GET /api/owned-balls/:id — get a specific owned ball
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const ball = await ownedBallQueries.getOwnedBallById(id);
        if (!ball) return res.status(404).json({ error: 'Owned ball not found' });
        res.status(200).json(ball);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve owned ball' });
    }
});

// GET /api/owned-balls/:id/drilled — get drilled status
router.get('/:id/drilled', async (req, res) => {
    try {
        const { id } = req.params;
        const status = await ownedBallQueries.getOwnedBallDrilledStatus(id);
        if (!status) return res.status(404).json({ error: 'Owned ball not found' });
        res.status(200).json(status);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve drilled status' });
    }
});

// PUT /api/owned-balls/:id — update an owned ball
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { weight, usage, note, condition, status, drilled } = req.body;
        const updated = await ownedBallQueries.updateOwnedBall(id, { weight, usage, note, condition, status, drilled });
        if (!updated) return res.status(404).json({ error: 'Owned ball not found' });
        res.status(200).json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update owned ball' });
    }
});

// DELETE /api/owned-balls/:id — delete an owned ball
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await ownedBallQueries.deleteOwnedBall(id);
        if (!deleted) return res.status(404).json({ error: 'Owned ball not found' });
        res.status(200).json({ message: 'Owned ball deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete owned ball' });
    }
});

module.exports = router;