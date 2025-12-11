const { getAuth } = require('firebase-admin/auth');
let usersCollection;

// Function to initialize the database connection for middleware
const initDatabase = (db) => {
    usersCollection = db.collection("users");
};

// Token verification middleware
const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).send({ error: 'Unauthorized: No token provided' });
        }

        const token = authHeader.split(' ')[1];

        // Verify the Firebase ID token
        const decodedToken = await getAuth().verifyIdToken(token);
        req.user = decodedToken;

        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).send({ error: 'Unauthorized: Invalid token' });
    }
};

// Middleware to check if user is admin
const verifyAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).send({ error: 'Unauthorized: No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decodedToken = await getAuth().verifyIdToken(token);

        // Check user role in database
        const user = await usersCollection.findOne({ email: decodedToken.email });

        if (!user || user.role !== 'admin') {
            return res.status(403).send({ error: 'Forbidden: Admin access required' });
        }

        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Admin verification error:', error);
        return res.status(401).send({ error: 'Unauthorized: Invalid token' });
    }
};

// Middleware to check if user is club manager
const verifyClubManager = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).send({ error: 'Unauthorized: No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decodedToken = await getAuth().verifyIdToken(token);

        // Check user role in database
        const user = await usersCollection.findOne({ email: decodedToken.email });

        if (!user || (user.role !== 'admin' && user.role !== 'clubManager')) {
            return res.status(403).send({ error: 'Forbidden: Club manager access required' });
        }

        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Club manager verification error:', error);
        return res.status(401).send({ error: 'Unauthorized: Invalid token' });
    }
};

// Middleware to check if user is member
const verifyMember = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).send({ error: 'Unauthorized: No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decodedToken = await getAuth().verifyIdToken(token);

        // Check user role in database
        const user = await usersCollection.findOne({ email: decodedToken.email });

        if (!user || (user.role !== 'admin' && user.role !== 'clubManager' && user.role !== 'member')) {
            return res.status(403).send({ error: 'Forbidden: Member access required' });
        }

        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Member verification error:', error);
        return res.status(401).send({ error: 'Unauthorized: Invalid token' });
    }
};

module.exports = {
    initDatabase,
    verifyToken,
    verifyAdmin,
    verifyClubManager,
    verifyMember
};