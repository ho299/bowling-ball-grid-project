const express = require('express');
const router = express.Router();
const modificationQueries = require('../queries/modification_queries');

// POST /api/modifications — add a modification to an owned ball
router.post('/', async (req, res) => {
    try {
        const { owned_ball_id, mod_type, description, rg, diff, mb_diff, early_v_late, smooth_v_angular, hook_potential } = req.body;
        const newMod = await modificationQueries.addModification({ owned_ball_id, mod_type, description, rg, diff, mb_diff, early_v_late, smooth_v_angular, hook_potential });
        res.status(201).json(newMod);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add modification' });
    }
});

// GET /api/modifications/owned-ball/:id/current — get current (latest) modification
router.get('/owned-ball/:id/current', async (req, res) => {
    try {
        const { id } = req.params;
        const mod = await modificationQueries.getCurrentModification(id);
        if (!mod) return res.status(404).json({ error: 'No modification found for this owned ball' });
        res.status(200).json(mod);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve current modification' });
    }
});

// GET /api/modifications/owned-ball/:id/history — get full modification history
router.get('/owned-ball/:id/history', async (req, res) => {
    try {
        const { id } = req.params;
        const history = await modificationQueries.getModificationHistoryofOwnedBall(id);
        if (!history || history.length === 0) return res.status(404).json({ error: 'No modification history found for this owned ball' });
        res.status(200).json(history);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve modification history' });
    }
});

// GET /api/modifications/:id — get a modification by id (admin/testing)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const mod = await modificationQueries.getModificationById(id);
        if (!mod) return res.status(404).json({ error: 'Modification not found' });
        res.status(200).json(mod);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve modification' });
    }
});

// PUT /api/modifications/:id — update a modification
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { mod_type, description, rg, diff, mb_diff, early_v_late, smooth_v_angular, hook_potential } = req.body;
        const updated = await modificationQueries.updateModification(id, { mod_type, description, rg, diff, mb_diff, early_v_late, smooth_v_angular, hook_potential });
        if (!updated) return res.status(404).json({ error: 'Modification not found' });
        res.status(200).json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update modification' });
    }
});

// DELETE /api/modifications/:id — delete a modification
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await modificationQueries.deleteModification(id);
        if (!deleted) return res.status(404).json({ error: 'Modification not found' });
        res.status(200).json({ message: 'Modification deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete modification' });
    }
});

module.exports = router;