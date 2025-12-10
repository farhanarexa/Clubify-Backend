let usersCollection;

// Function to initialize the database connection for middleware
const initDatabase = (db) => {
    usersCollection = db.collection("users");
};

// Simple middleware - no verification, just pass through
const verifyToken = (req, res, next) => {
    // No token verification - just proceed
    next();
};

// Middleware to check if user is admin - removed token verification
const verifyAdmin = (req, res, next) => {
    // For development, allow all access - remove this in production if needed
    next();
};

// Middleware to check if user is club manager - removed token verification
const verifyClubManager = (req, res, next) => {
    // For development, allow all access - remove this in production if needed
    next();
};

// Middleware to check if user is member - removed token verification
const verifyMember = (req, res, next) => {
    // For development, allow all access - remove this in production if needed
    next();
};

module.exports = {
    initDatabase,
    verifyToken,
    verifyAdmin,
    verifyClubManager,
    verifyMember
};