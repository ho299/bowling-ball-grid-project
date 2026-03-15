const router = require('express').Router();
const specQueries = require('../queries/spec_queries'); // calling sql queries
const ballQueries = require('../queries/ball_queries');
const coverstockQueries = require('../queries/coverstock_queries')
const algorithm = require("../../algorithms/bowlingBallScoreAlgos")

//GET /api/specs/ball/:id - Get specs by ball id
router.get('/ball/:id', async (req, res) => {
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
router.post('/', async (req, res) => {
    try {
        const { ball_id, weight, rg, diff, mb_diff } = req.body;

        // get ball info
        const ball = await ballQueries.getBallById(ball_id);

        const coverstock = await coverstockQueries.getCoverstockById(ball.coverstock_id)
        // extract coverstock and finish
        const finishNumber = algorithm.finishNametoNumber(ball.factory_finish, coverstock.name);

        // calc algo values
        const bowlingBall = { rg, diff, mb_diff, factory_finish: finishNumber };

        const newSpec = await specQueries.createSpec({
            ball_id,
            weight,
            rg,
            diff,
            mb_diff,
            early_v_late: algorithm.earlyVLate(bowlingBall),
            smooth_v_angular: algorithm.smoothVAngular(bowlingBall),
            hook_potential: algorithm.hookPotential(bowlingBall)
        });

        res.status(201).json(newSpec);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create spec' });
    }
});