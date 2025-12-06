const { ObjectId } = require('mongodb');

// Create a new payment record
const createPayment = async (db, req, res) => {
    try {
        const {
            userEmail,
            amount,
            type,
            clubId,
            eventId,
            stripePaymentIntentId,
            status
        } = req.body;

        const validTypes = ['membership', 'event'];
        const validStatuses = ['pending', 'completed', 'failed', 'refunded'];

        if (!validTypes.includes(type)) {
            return res.status(400).send({ error: 'Invalid payment type. Valid types are: membership, event' });
        }

        if (!validStatuses.includes(status)) {
            return res.status(400).send({ error: 'Invalid payment status. Valid statuses are: pending, completed, failed, refunded' });
        }

        const paymentsCollection = db.collection("payments");

        const newPayment = {
            userEmail,
            amount: parseFloat(amount),
            type,
            clubId: clubId ? new ObjectId(clubId) : null,
            eventId: eventId ? new ObjectId(eventId) : null,
            stripePaymentIntentId,
            status,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await paymentsCollection.insertOne(newPayment);
        res.status(201).send({ message: 'Payment record created successfully', paymentId: result.insertedId });
    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Get payments by user
const getPaymentsByUser = async (db, req, res) => {
    try {
        const paymentsCollection = db.collection("payments");
        const { email } = req.params;

        const payments = await paymentsCollection
            .aggregate([
                {
                    $match: { userEmail: email }
                },
                {
                    $lookup: {
                        from: 'clubs',
                        localField: 'clubId',
                        foreignField: '_id',
                        as: 'club'
                    }
                },
                {
                    $lookup: {
                        from: 'events',
                        localField: 'eventId',
                        foreignField: '_id',
                        as: 'event'
                    }
                },
                {
                    $project: {
                        _id: 1,
                        userEmail: 1,
                        amount: 1,
                        type: 1,
                        clubId: 1,
                        clubName: { $arrayElemAt: ['$club.clubName', 0] },
                        eventId: 1,
                        eventName: { $arrayElemAt: ['$event.title', 0] },
                        stripePaymentIntentId: 1,
                        status: 1,
                        createdAt: 1,
                        updatedAt: 1
                    }
                },
                {
                    $sort: { createdAt: -1 }
                }
            ])
            .toArray();

        res.send(payments);
    } catch (error) {
        console.error('Error getting payments by user:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Get all payments (admin only)
const getAllPayments = async (db, req, res) => {
    try {
        const paymentsCollection = db.collection("payments");

        const payments = await paymentsCollection
            .aggregate([
                {
                    $lookup: {
                        from: 'clubs',
                        localField: 'clubId',
                        foreignField: '_id',
                        as: 'club'
                    }
                },
                {
                    $lookup: {
                        from: 'events',
                        localField: 'eventId',
                        foreignField: '_id',
                        as: 'event'
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userEmail',
                        foreignField: 'email',
                        as: 'user'
                    }
                },
                {
                    $project: {
                        _id: 1,
                        userEmail: 1,
                        userName: { $arrayElemAt: ['$user.name', 0] },
                        amount: 1,
                        type: 1,
                        clubId: 1,
                        clubName: { $arrayElemAt: ['$club.clubName', 0] },
                        eventId: 1,
                        eventName: { $arrayElemAt: ['$event.title', 0] },
                        stripePaymentIntentId: 1,
                        status: 1,
                        createdAt: 1,
                        updatedAt: 1
                    }
                },
                {
                    $sort: { createdAt: -1 }
                }
            ])
            .toArray();

        res.send(payments);
    } catch (error) {
        console.error('Error getting all payments:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Update payment status
const updatePaymentStatus = async (db, req, res) => {
    try {
        const paymentsCollection = db.collection("payments");
        const { paymentId } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
        if (!validStatuses.includes(status)) {
            return res.status(400).send({ error: 'Invalid payment status' });
        }

        const result = await paymentsCollection.updateOne(
            { _id: new ObjectId(paymentId) },
            { $set: { status: status, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).send({ error: 'Payment not found' });
        }

        res.send({ message: `Payment status updated to ${status}` });
    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Get payments by club (for club managers)
const getPaymentsByClub = async (db, req, res) => {
    try {
        const paymentsCollection = db.collection("payments");
        const { clubId } = req.params;

        const payments = await paymentsCollection
            .aggregate([
                {
                    $match: { clubId: new ObjectId(clubId) }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userEmail',
                        foreignField: 'email',
                        as: 'user'
                    }
                },
                {
                    $project: {
                        _id: 1,
                        userEmail: 1,
                        userName: { $arrayElemAt: ['$user.name', 0] },
                        amount: 1,
                        type: 1,
                        eventId: 1,
                        stripePaymentIntentId: 1,
                        status: 1,
                        createdAt: 1,
                        updatedAt: 1
                    }
                },
                {
                    $sort: { createdAt: -1 }
                }
            ])
            .toArray();

        res.send(payments);
    } catch (error) {
        console.error('Error getting payments by club:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

module.exports = {
    createPayment,
    getPaymentsByUser,
    getAllPayments,
    updatePaymentStatus,
    getPaymentsByClub
};