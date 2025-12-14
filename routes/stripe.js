const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { ObjectId } = require('mongodb');

// Create a payment intent for events
const createEventPaymentIntent = async (db, req, res) => {
    try {
        const { eventId, userEmail, amount } = req.body;

        // Validate inputs
        if (!eventId || !userEmail || !amount) {
            return res.status(400).json({ error: 'Missing required fields: eventId, userEmail, amount' });
        }

        // Verify the event exists
        const eventsCollection = db.collection('events');
        const event = await eventsCollection.findOne({ _id: new ObjectId(eventId) });

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(parseFloat(amount) * 100), // Stripe expects amount in cents
            currency: 'usd',
            metadata: {
                eventId: eventId,
                userEmail: userEmail,
                type: 'event'
            }
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        console.error('Error creating event payment intent:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create a payment intent for club membership
const createMembershipPaymentIntent = async (db, req, res) => {
    try {
        const { clubId, userEmail, amount } = req.body;

        // Validate inputs
        if (!clubId || !userEmail || !amount) {
            return res.status(400).json({ error: 'Missing required fields: clubId, userEmail, amount' });
        }

        // Verify the club exists
        const clubsCollection = db.collection('clubs');
        const club = await clubsCollection.findOne({ _id: new ObjectId(clubId) });

        if (!club) {
            return res.status(404).json({ error: 'Club not found' });
        }

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(parseFloat(amount) * 100), // Stripe expects amount in cents
            currency: 'usd',
            metadata: {
                clubId: clubId,
                userEmail: userEmail,
                type: 'membership'
            }
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        console.error('Error creating membership payment intent:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Retrieve a payment intent
const getPaymentIntent = async (db, req, res) => {
    try {
        const { paymentIntentId } = req.params;

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        res.json(paymentIntent);
    } catch (error) {
        console.error('Error retrieving payment intent:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Handle Stripe webhook - to update payment status in DB after successful payment
const handleWebhook = async (db, req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntentSucceeded = event.data.object;
            handleSuccessfulPayment(db, paymentIntentSucceeded);
            break;
        case 'payment_intent.payment_failed':
            const paymentIntentFailed = event.data.object;
            handleFailedPayment(db, paymentIntentFailed);
            break;
        // ... handle other event types
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });
};

// Helper function to handle successful payments
const handleSuccessfulPayment = async (db, paymentIntent) => {
    try {
        const paymentsCollection = db.collection('payments');
        const metadata = paymentIntent.metadata;

        // Update payment record with success status
        await paymentsCollection.updateOne(
            { stripePaymentIntentId: paymentIntent.id },
            {
                $set: {
                    status: 'completed',
                    updatedAt: new Date()
                }
            }
        );

        // For events, we might want to update event registration status if needed
        if (metadata.type === 'event') {
            // In a complete implementation, ensure registration is created
            const eventRegistrationsCollection = db.collection('eventRegistrations');
            const existingRegistration = await eventRegistrationsCollection.findOne({
                eventId: new ObjectId(metadata.eventId),
                userEmail: metadata.userEmail
            });

            if (!existingRegistration) {
                // Create registration if it doesn't exist (frontend usually handles this)
                await eventRegistrationsCollection.insertOne({
                    eventId: new ObjectId(metadata.eventId),
                    userEmail: metadata.userEmail,
                    status: 'registered',
                    paymentId: paymentIntent.id,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
        }
        // For membership, ensure membership is created if needed
        else if (metadata.type === 'membership') {
            // In a complete implementation, ensure membership is created
            const membershipsCollection = db.collection('memberships');
            const existingMembership = await membershipsCollection.findOne({
                clubId: new ObjectId(metadata.clubId),
                userEmail: metadata.userEmail
            });

            if (!existingMembership) {
                // Create membership if it doesn't exist (frontend usually handles this)
                await membershipsCollection.insertOne({
                    clubId: new ObjectId(metadata.clubId),
                    userEmail: metadata.userEmail,
                    status: 'active',
                    joinedDate: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
        }
    } catch (error) {
        console.error('Error handling successful payment:', error);
    }
};

// Helper function to handle failed payments
const handleFailedPayment = async (db, paymentIntent) => {
    try {
        const paymentsCollection = db.collection('payments');

        // Update payment record with failed status
        await paymentsCollection.updateOne(
            { stripePaymentIntentId: paymentIntent.id },
            {
                $set: {
                    status: 'failed',
                    updatedAt: new Date()
                }
            }
        );
    } catch (error) {
        console.error('Error handling failed payment:', error);
    }
};

module.exports = {
    createEventPaymentIntent,
    createMembershipPaymentIntent,
    getPaymentIntent,
    handleWebhook
};