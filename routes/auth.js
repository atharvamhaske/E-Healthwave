const express = require('express');
const admin = require('firebase-admin');
const db = admin.firestore();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Register route
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, role = 'patient' } = req.body;

        // Validate required fields
        if (!email || !password || !name) {
            return res.status(400).json({ 
                message: 'Missing required fields. Email, password, and name are required.' 
            });
        }

        // Check if user already exists
        const userSnapshot = await db.collection('users')
            .where('email', '==', email)
            .get();
        
        if (!userSnapshot.empty) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user with validated data
        const userData = {
            email: email,
            password: hashedPassword,
            name: name,
            role: role,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Create user
        const userRef = await db.collection('users').add(userData);

        // Generate JWT token
        const token = jwt.sign(
            { id: userRef.id, email, role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                id: userRef.id,
                email,
                name,
                role
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error: error.message });
    }
});

// Login route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const userSnapshot = await db.collection('users')
            .where('email', '==', email)
            .get();

        if (userSnapshot.empty) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const user = {
            id: userSnapshot.docs[0].id,
            ...userSnapshot.docs[0].data()
        };

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
});

module.exports = router;
