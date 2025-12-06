// This middleware will be provided with the database connection from the main index.js
let usersCollection;

// Function to initialize the database connection for middleware
const initDatabase = (db) => {
    usersCollection = db.collection("users");
};

// Middleware to verify user role
const verifyRole = async (req, res, next) => {
    const userEmail = req.query.email || req.body.email || req.headers.email; // Adjust based on how you pass user info

    if (!userEmail) {
        return res.status(401).send({ error: 'User email not provided' });
    }

    try {
        const user = await usersCollection.findOne({ email: userEmail });
        if (!user) {
            return res.status(401).send({ error: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Error verifying user role:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Middleware to check if user is admin
const verifyAdmin = async (req, res, next) => {
    const userEmail = req.query.email || req.body.email || req.headers.email;

    if (!userEmail) {
        return res.status(401).send({ error: 'User email not provided' });
    }

    try {
        const user = await usersCollection.findOne({ email: userEmail });
        if (!user || user.role !== 'admin') {
            return res.status(403).send({ error: 'Access denied. Admin required.' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Error verifying admin:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Middleware to check if user is club manager
const verifyClubManager = async (req, res, next) => {
    const userEmail = req.query.email || req.body.email || req.headers.email;

    if (!userEmail) {
        return res.status(401).send({ error: 'User email not provided' });
    }

    try {
        const user = await usersCollection.findOne({ email: userEmail });
        if (!user || (user.role !== 'clubManager' && user.role !== 'admin')) {
            return res.status(403).send({ error: 'Access denied. Club Manager or Admin required.' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Error verifying club manager:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Middleware to check if user is member
const verifyMember = async (req, res, next) => {
    const userEmail = req.query.email || req.body.email || req.headers.email;

    if (!userEmail) {
        return res.status(401).send({ error: 'User email not provided' });
    }

    try {
        const user = await usersCollection.findOne({ email: userEmail });
        if (!user || (user.role !== 'member' && user.role !== 'clubManager' && user.role !== 'admin')) {
            return res.status(403).send({ error: 'Access denied. Valid user required.' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Error verifying member:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

module.exports = {
    initDatabase,
    verifyRole,
    verifyAdmin,
    verifyClubManager,
    verifyMember
};