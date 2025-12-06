const { ObjectId } = require('mongodb');

// Create a new user
const createUser = async (db, req, res) => {
    try {
        const { email, name, photoURL } = req.body;

        const usersCollection = db.collection("users");

        // Check if user already exists
        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
            // Instead of returning an error, return success indicating user already exists
            return res.status(200).send({ message: 'User already exists', userId: existingUser._id });
        }

        // Create new user with default role 'member'
        const newUser = {
            email,
            name,
            photoURL: photoURL || '',
            role: 'member', // Default role
            createdAt: new Date(),
            isActive: true
        };

        const result = await usersCollection.insertOne(newUser);
        res.status(201).send({ message: 'User created successfully', userId: result.insertedId });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Get user by email
const getUserByEmail = async (db, req, res) => {
    try {
        const usersCollection = db.collection("users");
        const { email } = req.params;
        const user = await usersCollection.findOne({ email });

        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }

        res.send(user);
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Update user role (admin only)
const updateUserRole = async (db, req, res) => {
    try {
        const usersCollection = db.collection("users");
        const { userId } = req.params;
        const { newRole } = req.body;

        // Validate role
        const validRoles = ['admin', 'clubManager', 'member'];
        if (!validRoles.includes(newRole)) {
            return res.status(400).send({ error: 'Invalid role. Valid roles are: admin, clubManager, member' });
        }

        // Update user role
        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { role: newRole, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).send({ error: 'User not found' });
        }

        res.send({ message: `User role updated to ${newRole}` });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Get all users (admin only)
const getAllUsers = async (db, req, res) => {
    try {
        const usersCollection = db.collection("users");
        const users = await usersCollection.find({}).toArray();
        res.send(users);
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Get users by role
const getUsersByRole = async (db, req, res) => {
    try {
        const usersCollection = db.collection("users");
        const { role } = req.params;
        const validRoles = ['admin', 'clubManager', 'member'];

        if (!validRoles.includes(role)) {
            return res.status(400).send({ error: 'Invalid role' });
        }

        const users = await usersCollection.find({ role }).toArray();
        res.send(users);
    } catch (error) {
        console.error('Error getting users by role:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

module.exports = {
    createUser,
    getUserByEmail,
    updateUserRole,
    getAllUsers,
    getUsersByRole
};