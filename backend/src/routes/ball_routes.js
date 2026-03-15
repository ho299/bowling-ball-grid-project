const express = require('express');
const algorithm = require("../../algorithms/bowlingBallScoreAlgos")
const router = express.Router();
const ballQueries = require('../queries/ball_queries'); // calling sql queries
const coreQueries = require('../queries/core_queries'); // calling sql queries
const coverstockQueries = require('../queries/coverstock_queries'); // calling sql queries
const specQueries = require('../queries/spec_queries'); // calling sql queries


//Get /api/balls - Get all the bowling balls
router.get('/', async (req, res) => {
    try {
        const balls = await ballQueries.getAllBalls();
        res.status(200).json(balls);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve bowling balls' });
    }   
});
//Get /api/ball/:id - Get a particular ball by id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const ball = await ballQueries.getBallById(id);
        if (!ball) return res.status(404).json({ error: 'Ball not found' });
        res.status(200).json(ball);
    }   
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve the bowling ball' });
    }
});

//POST /api/ball - Create a new bowling ball
router.post('/', async (req, res) => {
    try {
        const { name, image, brand, release_date, discontinued,
            overseas, factory_finish, early_v_late, smooth_v_angular, hook_potential, core, coverstock, specs } = req.body;

        const createdCore = await coreQueries.createCore({
            name: core.name,
            type: core.type,
            description: core.description
        });

        const createdCoverstock = await coverstockQueries.createCoverstock({
            name: coverstock.name,
            type: coverstock.type,
            description: coverstock.description
        });
        
        var finishNumber = algorithm.finishNametoNumber(factory_finish, coverstock.name);
        
        const newBall = await ballQueries.createBall({
            name, image,brand, release_date, discontinued,
            overseas, factory_finish, core_id: createdCore.id,
            coverstock_id: createdCoverstock.id
        });


       const createdSpecs = specs && specs.length > 0
        ? await Promise.all(
            specs.map(spec => {
                const bowlingBall = {
                    rg: spec.rg,
                    diff: spec.diff,
                    mb_diff: spec.mb_diff,
                    factory_finish: finishNumber
                };
                return specQueries.createSpec({
                    ball_id: newBall.id,
                    weight: spec.weight,
                    rg: spec.rg,
                    diff: spec.diff,
                    mb_diff: spec.mb_diff,
                    early_v_late: algorithm.earlyVLate(bowlingBall),
                    smooth_v_angular: algorithm.smoothVAngular(bowlingBall),
                    hook_potential: algorithm.hookPotential(bowlingBall)
                });
            })
        ) : [];

        res.status(201).json({ ...newBall, specs: createdSpecs }); 

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create a new bowling ball' });
    }
});

// PUT /api/ball/:id - Update a bowling ball by id
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, brand, image, release_date, discontinued, overseas, factory_finish,core_id, coverstock_id } = req.body;
const updatedBall = await ballQueries.updateBall(id, { name, brand, image, release_date, discontinued, overseas, factory_finish,core_id, coverstock_id });
        
        if (!updatedBall) return res.status(404).json({ error: 'Ball not found' });
        
        res.status(200).json(updatedBall);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update bowling ball' });
    }
});

router.delete ('/:id', async (req, res) => {
    try {      
        const { id } = req.params;
        const deletedBall = await ballQueries.deleteBall(id);

        if (!deletedBall) return res.status(404).json({ error: 'Ball not found' });

        res.status(200).json({ message: 'Ball deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete bowling ball' });
    }
});


module.exports = router;