const express = require('express');
const router = express.Router();
const converstockQueries = require('../queries/coverstock_queries'); // calling sql queries

//GET /api/coverstocks - Get all the coverstocks
router.get('/', async (req, res) => {
    try {
        const coverstocks = await converstockQueries.getAllCoverstocks();
        res.status(200).json(coverstocks);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve coverstocks' });
    }
});
//Get /api/coverstocks/:id - Get a particular coverstock by id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const coverstock = await converstockQueries.getCoverstockById(id);
        if (!coverstock) return res.status(404).json({ error: 'Coverstock not found' });
        res.status(200).json(coverstock);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve the coverstock' });
    }
});
//Post /api/coverstocks - Create a new coverstock
router.post('/', async (req, res) => {
    // console.log("POST /api/coverstocks hit", req.body);  // ← add this
    try {
        const { name, type, description } = req.body;
        // console.log("Creating coverstock:", { name, type, description });  // ← and this
        const newCoverstock = await converstockQueries.createCoverstock({ name, type, description });
        res.status(201).json(newCoverstock);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create the coverstock' });
    }
});
//PUT /api/coverstocks/:id - Update a coverstock by id
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name = null, type = null, description = null } = req.body;
        const updatedCoverstock = await converstockQueries.updateCoverstock(id, { name, type, description });
        if (!updatedCoverstock) return res.status(404).json({ error: 'Coverstock not found' });
        res.status(200).json(updatedCoverstock);
    } 
    catch (error) {
        res.status(500).json({ error: 'Failed to update the coverstock' });
    }
});
//DELETE /api/coverstocks/:id - Delete a coverstock by id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params; 
        const deletedCoverstock = await converstockQueries.deleteCoverstock(id);
        if (!deletedCoverstock) return res.status(404).json({ error: 'Coverstock not found' });
        res.status(200).json({ message: 'Coverstock deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete the coverstock' });
    }
});

module.exports = router;