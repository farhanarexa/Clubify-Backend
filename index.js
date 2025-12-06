require('dotenv').config();
const express = require("express");
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

// Import routes and middleware
const userRoutes = require('./routes/users');
const clubRoutes = require('./routes/clubs');
const eventRoutes = require('./routes/events');
const membershipRoutes = require('./routes/memberships');
const eventRegistrationRoutes = require('./routes/eventRegistrations');
const paymentRoutes = require('./routes/payments');
const { initDatabase } = require('./middleware/auth');

//middleware
app.use(cors());
app.use(express.json());

function capitalize(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_CLUSTER}.scnhrfl.mongodb.net/?appName=${capitalize(process.env.DB_CLUSTER)}`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Database and collection references
let db;
let usersCollection;
let clubsCollection;
let membershipsCollection;
let eventsCollection;
let eventRegistrationsCollection;
let paymentsCollection;

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("Clubify").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // Initialize database and collections
    db = client.db("Clubify");
    usersCollection = db.collection("users");
    clubsCollection = db.collection("clubs");
    membershipsCollection = db.collection("memberships");
    eventsCollection = db.collection("events");
    eventRegistrationsCollection = db.collection("eventRegistrations");
    paymentsCollection = db.collection("payments");

    // Initialize middleware with database
    initDatabase(db);

    // Create indexes for better performance
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await clubsCollection.createIndex({ managerEmail: 1 });
    await membershipsCollection.createIndex({ userEmail: 1, clubId: 1 });
    await eventsCollection.createIndex({ clubId: 1 });
    await eventRegistrationsCollection.createIndex({ eventId: 1, userEmail: 1 });

    console.log("Collections and indexes created successfully!");

    // Define routes after database initialization
    // User routes
    app.post('/users', (req, res) => userRoutes.createUser(db, req, res));
    app.get('/users/:email', (req, res) => userRoutes.getUserByEmail(db, req, res));
    app.patch('/users/:userId/role', (req, res) => userRoutes.updateUserRole(db, req, res));  // This would be admin only
    app.get('/users', (req, res) => userRoutes.getAllUsers(db, req, res));
    app.get('/users/role/:role', (req, res) => userRoutes.getUsersByRole(db, req, res));

    // Club routes
    app.post('/clubs', (req, res) => clubRoutes.createClub(db, req, res));
    app.get('/clubs', (req, res) => clubRoutes.getAllClubs(db, req, res));
    app.get('/clubs/status/:status', (req, res) => clubRoutes.getClubsByStatus(db, req, res));
    app.get('/clubs/manager/:email', (req, res) => clubRoutes.getClubsByManager(db, req, res));
    app.patch('/clubs/:clubId/status', (req, res) => clubRoutes.updateClubStatus(db, req, res));
    app.patch('/clubs/:clubId', (req, res) => clubRoutes.updateClub(db, req, res));
    app.delete('/clubs/:clubId', (req, res) => clubRoutes.deleteClub(db, req, res));

    // Event routes
    app.post('/events', (req, res) => eventRoutes.createEvent(db, req, res));
    app.get('/events', (req, res) => eventRoutes.getAllEvents(db, req, res));
    app.get('/events/club/:clubId', (req, res) => eventRoutes.getEventsByClub(db, req, res));
    app.get('/events/:eventId', (req, res) => eventRoutes.getEventById(db, req, res));
    app.patch('/events/:eventId', (req, res) => eventRoutes.updateEvent(db, req, res));
    app.delete('/events/:eventId', (req, res) => eventRoutes.deleteEvent(db, req, res));

    // Membership routes
    app.post('/memberships', (req, res) => membershipRoutes.createMembership(db, req, res));
    app.get('/memberships/user/:email', (req, res) => membershipRoutes.getMembershipsByUser(db, req, res));
    app.get('/memberships/club/:clubId', (req, res) => membershipRoutes.getMembershipsByClub(db, req, res));
    app.patch('/memberships/:membershipId/status', (req, res) => membershipRoutes.updateMembershipStatus(db, req, res));
    app.delete('/memberships/:membershipId', (req, res) => membershipRoutes.deleteMembership(db, req, res));

    // Event registration routes
    app.post('/event-registrations', (req, res) => eventRegistrationRoutes.registerForEvent(db, req, res));
    app.get('/event-registrations/user/:email', (req, res) => eventRegistrationRoutes.getRegistrationsByUser(db, req, res));
    app.get('/event-registrations/event/:eventId', (req, res) => eventRegistrationRoutes.getRegistrationsByEvent(db, req, res));
    app.get('/event-registrations/club/:clubId', (req, res) => eventRegistrationRoutes.getRegistrationsByClub(db, req, res));
    app.patch('/event-registrations/:registrationId/status', (req, res) => eventRegistrationRoutes.updateRegistrationStatus(db, req, res));
    app.delete('/event-registrations/:registrationId', (req, res) => eventRegistrationRoutes.deleteRegistration(db, req, res));

    // Payment routes
    app.post('/payments', (req, res) => paymentRoutes.createPayment(db, req, res));
    app.get('/payments/user/:email', (req, res) => paymentRoutes.getPaymentsByUser(db, req, res));
    app.get('/payments', (req, res) => paymentRoutes.getAllPayments(db, req, res));
    app.patch('/payments/:paymentId/status', (req, res) => paymentRoutes.updatePaymentStatus(db, req, res));
    app.get('/payments/club/:clubId', (req, res) => paymentRoutes.getPaymentsByClub(db, req, res));

  } catch (error) {
    console.error("Error setting up database collections:", error);
  }
}
run().catch(console.dir);

// Root route
app.get("/", (req, res) => {
    res.send("Clubify Backend API - Welcome to the Club Management System");
});

// Health check endpoint
app.get("/health", (req, res) => {
    res.send({ status: "OK", message: "Clubify Backend is running" });
});

// Start the server only after the database connection is established
app.listen(port, () => {
    console.log(`Clubify Backend server is running at http://localhost:${port}`);
});