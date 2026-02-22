const express = require('express');
const router = express.Router();
const coreQueries = require('../queries/core_queries'); // calling sql queries

//GET /api/cores - Get all the cores
router.get('/',async (req, res) => {
    try{
        const cores = await coreQueries.getAllCores();
        res.status(200).json(cores);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve cores' });    
}});
//GET /api/cores/:id - Get a particular core by id
router.get('/:id', async (req, res) => {    
    try{
        const { id } = req.params;
        const core = await coreQueries.getCoreById(id);

        if (!core) return res.status(404).json({ error: 'Core not found' });
        res.status(200).json(core);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve the core' });
}});
//POST /api/cores - Create a new core
router.post('/', async (req, res) => {
    try{
        const { name, type, description } = req.body;
        const newCore = await coreQueries.createCore({ name, type, description });
        res.status(201).json(newCore);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create the core' });
}});
//PUT /api/cores/:id - Update a core by id
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name = null, type = null, description = null } = req.body;
        const updatedCore = await coreQueries.updateCore(id, { name, type, description });
        if (!updatedCore) return res.status(404).json({ error: 'Core not found' });
        res.status(200).json(updatedCore);
    }  
    catch (error) {
        res.status(500).json({ error: 'Failed to update the core' });
    }});
//DELETE /api/cores/:id - Delete a core by id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedCore = await coreQueries.deleteCore(id);
        if (!deletedCore) return res.status(404).json({ error: 'Core not found' });
        res.status(200).json({ message: 'Core deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete the core' });
    }});    

    
module.exports = router;