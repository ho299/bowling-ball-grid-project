const express = require('express')
const router = express.Router();
const algoQueries = require('../queries/algo_queries'); // calling sql queries

//GET /api/algo/replacement - Get replacements by replacement id
router.get('/replacement', async function(req, res){
    try {
        const { id,discontinued,overseas } = req.query;
        if(!id) return res.status(404).json({ error: 'Replacements not passed any id in the query' });
        const replacements = await algoQueries.getReplacementBalls(id,discontinued,overseas);
        if (!replacements || replacements.length === 0) return res.status(404).json({ error: 'Replacements not found for the specified ball id' });
        res.status(200).json(replacements);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve replacements' });
    }
});

//GET /api/algo/gapFinder - Get gapFinder by arsenal ids
router.get('/gapFinder', async function(req, res){
    try {
        const { ids,discontinued,overseas } = req.query;
        //ids needs to be JSON.stringify ('[1, 2, 5]')
        if(!ids) return res.status(404).json({ error: 'Gap Finder not passed any ids in the query' });
        const gapFinder = await algoQueries.getGapFinderBalls(ids,discontinued,overseas);
        if (!gapFinder || gapFinder.length === 0) return res.status(404).json({ error: 'Gap Finder not found for the specified ball ids' });
        res.status(200).json(gapFinder);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve gap finder' });
    }
});

module.exports = router;