const express = require('express');
const router = express.Router();
const arsenalListQueries = require('../queries/arsenal_list_queries');

// POST /api/arsenal-lists — create an arsenal
router.post('/', async (req, res) => {
    try {
        const { user_id, name, description } = req.body;
        const newArsenal = await arsenalListQueries.createArsenal({ user_id, name, description });
        res.status(201).json(newArsenal);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create arsenal' });
    }
});

// GET /api/arsenal-lists/user/:user_id — get all arsenals for a user
router.get('/user/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        const arsenals = await arsenalListQueries.getArsenalsByUser(user_id);
        if (!arsenals || arsenals.length === 0) return res.status(404).json({ error: 'No arsenals found for this user' });
        res.status(200).json(arsenals);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve arsenals' });
    }
});

// GET /api/arsenal-lists/:id — get a specific arsenal
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const arsenal = await arsenalListQueries.getArsenalById(id);
        if (!arsenal) return res.status(404).json({ error: 'Arsenal not found' });
        res.status(200).json(arsenal);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve arsenal' });
    }
});

// PUT /api/arsenal-lists/:id — update an arsenal
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const updated = await arsenalListQueries.updateArsenal(id, { name, description });
        if (!updated) return res.status(404).json({ error: 'Arsenal not found' });
        res.status(200).json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update arsenal' });
    }
});

// DELETE /api/arsenal-lists/:id — delete an arsenal (cascades to arsenal_content)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await arsenalListQueries.deleteArsenal(id);
        if (!deleted) return res.status(404).json({ error: 'Arsenal not found' });
        res.status(200).json({ message: 'Arsenal deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete arsenal' });
    }
});

module.exports = router;