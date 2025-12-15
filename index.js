require('dotenv').config();
const express = require("express");
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const admin = require('firebase-admin');
const app = express();
const port = process.env.PORT || 3000;

// Initialize Firebase Admin
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN || 'googleapis.com'
};

// Only initialize if we have the service account details
if (serviceAccount.private_key) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("Firebase Admin SDK initialized with service account");
} else {
  // For local development without service account
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
  console.log("Firebase Admin SDK initialized with application default credentials");
}

// Import routes and middleware
const userRoutes = require('./routes/users');
const clubRoutes = require('./routes/clubs');
const eventRoutes = require('./routes/events');
const membershipRoutes = require('./routes/memberships');
const eventRegistrationRoutes = require('./routes/eventRegistrations');
const paymentRoutes = require('./routes/payments');
const stripeRoutes = require('./routes/stripe');
const { initDatabase, verifyToken, verifyAdmin, verifyClubManager, verifyMember } = require('./middleware/auth');

//middleware
app.use(cors());
app.use(express.json());

// Stripe webhook requires raw body
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
    // This will be handled with the database context
    stripeRoutes.handleWebhook(db, req, res);
});

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
    app.patch('/users/:userId/role', verifyAdmin, (req, res) => userRoutes.updateUserRole(db, req, res));  // This would be admin only
    app.get('/users', verifyAdmin, (req, res) => userRoutes.getAllUsers(db, req, res));
    app.get('/users/role/:role', verifyAdmin, (req, res) => userRoutes.getUsersByRole(db, req, res));

    // Club routes
    app.post('/clubs', verifyToken, (req, res) => clubRoutes.createClub(db, req, res));
    app.get('/clubs', (req, res) => clubRoutes.getAllClubs(db, req, res));
    app.get('/clubs/status/:status', verifyAdmin, (req, res) => clubRoutes.getClubsByStatus(db, req, res));
    app.get('/clubs/manager/:email', verifyToken, (req, res) => clubRoutes.getClubsByManager(db, req, res));
    app.patch('/clubs/:clubId/status', verifyAdmin, (req, res) => clubRoutes.updateClubStatus(db, req, res));
    app.patch('/clubs/:clubId', verifyToken, (req, res) => clubRoutes.updateClub(db, req, res));
    app.delete('/clubs/:clubId', verifyToken, (req, res) => clubRoutes.deleteClub(db, req, res));

    // Event routes
    app.post('/events', verifyToken, (req, res) => eventRoutes.createEvent(db, req, res));
    app.get('/events', (req, res) => eventRoutes.getAllEvents(db, req, res));
    app.get('/events/club/:clubId', (req, res) => eventRoutes.getEventsByClub(db, req, res));
    app.get('/events/:eventId', (req, res) => eventRoutes.getEventById(db, req, res));
    app.patch('/events/:eventId', verifyToken, (req, res) => eventRoutes.updateEvent(db, req, res));
    app.delete('/events/:eventId', verifyToken, (req, res) => eventRoutes.deleteEvent(db, req, res));

    // Membership routes
    app.post('/memberships',  (req, res) => membershipRoutes.createMembership(db, req, res));
    app.get('/memberships/user/:email', verifyToken, (req, res) => membershipRoutes.getMembershipsByUser(db, req, res));
    app.get('/memberships/club/:clubId', verifyToken, (req, res) => membershipRoutes.getMembershipsByClub(db, req, res));
    app.patch('/memberships/:membershipId/status', verifyToken, (req, res) => membershipRoutes.updateMembershipStatus(db, req, res));
    app.delete('/memberships/:membershipId', verifyToken, (req, res) => membershipRoutes.deleteMembership(db, req, res));

    // Event registration routes
    app.post('/event-registrations', verifyToken, (req, res) => eventRegistrationRoutes.registerForEvent(db, req, res));
    app.get('/event-registrations/user/:email', verifyToken, (req, res) => eventRegistrationRoutes.getRegistrationsByUser(db, req, res));
    app.get('/event-registrations/event/:eventId', (req, res) => eventRegistrationRoutes.getRegistrationsByEvent(db, req, res));
    app.get('/event-registrations/club/:clubId', verifyToken, (req, res) => eventRegistrationRoutes.getRegistrationsByClub(db, req, res));
    app.patch('/event-registrations/:registrationId/status', verifyToken, (req, res) => eventRegistrationRoutes.updateRegistrationStatus(db, req, res));
    app.delete('/event-registrations/:registrationId', verifyToken, (req, res) => eventRegistrationRoutes.deleteRegistration(db, req, res));

    // Payment routes
    app.post('/payments', verifyToken, (req, res) => paymentRoutes.createPayment(db, req, res));
    app.get('/payments/user/:email', verifyToken, (req, res) => paymentRoutes.getPaymentsByUser(db, req, res));
    app.get('/payments', verifyAdmin, (req, res) => paymentRoutes.getAllPayments(db, req, res));
    app.patch('/payments/:paymentId/status', verifyAdmin, (req, res) => paymentRoutes.updatePaymentStatus(db, req, res));
    app.get('/payments/club/:clubId', verifyToken, (req, res) => paymentRoutes.getPaymentsByClub(db, req, res));

    // Stripe payment intent routes
    app.post('/stripe/create-event-payment-intent', verifyToken, (req, res) => stripeRoutes.createEventPaymentIntent(db, req, res));
    app.post('/stripe/create-membership-payment-intent', verifyToken, (req, res) => stripeRoutes.createMembershipPaymentIntent(db, req, res));
    app.get('/stripe/payment-intent/:paymentIntentId', verifyToken, (req, res) => stripeRoutes.getPaymentIntent(db, req, res));

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