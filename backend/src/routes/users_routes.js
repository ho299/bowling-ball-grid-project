const express = require('express');
const algorithm = require("../../algorithms/bowlingBallScoreAlgos")
const router = express.Router();
const userQueries = require('../queries/users_queries'); // calling sql queries
const bcrypt = require('bcrypt');

//CREATE
// POST /api/user — create a user
// ✅ this registers the route
router.post('/', async (req, res) => {
    try {
        const { first_name, last_name, about = null, email, password } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10); 

        const newUser = await userQueries.createUser({ first_name, last_name, about, email, password: hashedPassword });
        res.status(201).json(newUser);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// POST /api/user/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await userQueries.getUserByEmail(email);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });

        res.status(200).json({ message: 'Login successful', user });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});


//READ
//GET /api/user/:id 
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await userQueries.getUserById(id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.status(200).json(user);
    }   
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve the user' });
    }
});

// // GET /api/users — get all users
// router.get('/', async (req, res) => {
//     try {
//         const users = await userQueries.getAllUsers();
//         res.status(200).json(users);
//     } catch (error) {
//         res.status(500).json({ error: 'Failed to retrieve users' });
//     }
// });

//UPDATE 
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { first_name, last_name, about, email, password } = req.body;

        const hashedPassword = password ? await bcrypt.hash(password, 10) : null; 

        const updatedUser = await userQueries.updateUser(id, { first_name, last_name, about, email, hashedPassword });
        if (!updatedUser) return res.status(404).json({ error: 'User not found' });
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});

//DELETE
router.delete('/:id', async (req,res) => {
    try {
        const { id } = req.params;
        const deleteUser = await userQueries.deleteUser(id);
        if (!deleteUser) return res.status(404).json({ error: 'User not found' });

        res.status(200).json({ message: 'User deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});
module.exports = router;