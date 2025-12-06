const { ObjectId } = require('mongodb');

// Register for an event
const registerForEvent = async (db, req, res) => {
    try {
        const { eventId, userEmail } = req.body;

        const eventsCollection = db.collection("events");
        const eventRegistrationsCollection = db.collection("eventRegistrations");

        // Check if event exists and get clubId
        const event = await eventsCollection.findOne({ _id: new ObjectId(eventId) });
        if (!event) {
            return res.status(404).send({ error: 'Event not found' });
        }

        // Check if user is already registered
        const existingRegistration = await eventRegistrationsCollection.findOne({
            eventId: new ObjectId(eventId),
            userEmail
        });

        if (existingRegistration) {
            return res.status(400).send({ error: 'User already registered for this event' });
        }

        // Check if max attendees limit is reached
        if (event.maxAttendees) {
            const currentRegistrations = await eventRegistrationsCollection.countDocuments({
                eventId: new ObjectId(eventId),
                status: 'registered'
            });

            if (currentRegistrations >= event.maxAttendees) {
                return res.status(400).send({ error: 'Maximum attendees limit reached for this event' });
            }
        }

        const newRegistration = {
            eventId: new ObjectId(eventId),
            userEmail,
            clubId: event.clubId, // Get clubId from the event
            status: 'registered',
            paymentId: req.body.paymentId || null,
            registeredAt: new Date()
        };

        const result = await eventRegistrationsCollection.insertOne(newRegistration);
        res.status(201).send({ message: 'Event registration created successfully', registrationId: result.insertedId });
    } catch (error) {
        console.error('Error registering for event:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Get registrations by user
const getRegistrationsByUser = async (db, req, res) => {
    try {
        const eventRegistrationsCollection = db.collection("eventRegistrations");
        const { email } = req.params;

        const registrations = await eventRegistrationsCollection
            .aggregate([
                {
                    $match: { userEmail: email }
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
                        from: 'clubs',
                        localField: 'clubId',
                        foreignField: '_id',
                        as: 'club'
                    }
                },
                {
                    $unwind: '$event'
                },
                {
                    $unwind: '$club'
                },
                {
                    $project: {
                        _id: 1,
                        eventId: 1,
                        eventName: '$event.title',
                        eventDate: '$event.eventDate',
                        eventLocation: '$event.location',
                        clubId: 1,
                        clubName: '$club.clubName',
                        userEmail: 1,
                        status: 1,
                        paymentId: 1,
                        registeredAt: 1
                    }
                },
                {
                    $sort: { 'event.eventDate': 1 }
                }
            ])
            .toArray();

        res.send(registrations);
    } catch (error) {
        console.error('Error getting registrations by user:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Get registrations by event
const getRegistrationsByEvent = async (db, req, res) => {
    try {
        const eventRegistrationsCollection = db.collection("eventRegistrations");
        const { eventId } = req.params;

        const registrations = await eventRegistrationsCollection
            .aggregate([
                {
                    $match: { eventId: new ObjectId(eventId) }
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
                    $unwind: '$user'
                },
                {
                    $project: {
                        _id: 1,
                        eventId: 1,
                        userEmail: 1,
                        userName: '$user.name',
                        userPhoto: '$user.photoURL',
                        status: 1,
                        paymentId: 1,
                        registeredAt: 1
                    }
                }
            ])
            .toArray();

        res.send(registrations);
    } catch (error) {
        console.error('Error getting registrations by event:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Get registrations by club
const getRegistrationsByClub = async (db, req, res) => {
    try {
        const eventRegistrationsCollection = db.collection("eventRegistrations");
        const { clubId } = req.params;

        const registrations = await eventRegistrationsCollection
            .aggregate([
                {
                    $match: { clubId: new ObjectId(clubId) }
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
                    $unwind: '$event'
                },
                {
                    $unwind: '$user'
                },
                {
                    $project: {
                        _id: 1,
                        eventId: 1,
                        eventName: '$event.title',
                        userEmail: 1,
                        userName: '$user.name',
                        userPhoto: '$user.photoURL',
                        status: 1,
                        paymentId: 1,
                        registeredAt: 1
                    }
                },
                {
                    $sort: { registeredAt: -1 }
                }
            ])
            .toArray();

        res.send(registrations);
    } catch (error) {
        console.error('Error getting registrations by club:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Update registration status
const updateRegistrationStatus = async (db, req, res) => {
    try {
        const eventRegistrationsCollection = db.collection("eventRegistrations");
        const { registrationId } = req.params;
        const { status } = req.body;

        const validStatuses = ['registered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).send({ error: 'Invalid status' });
        }

        const result = await eventRegistrationsCollection.updateOne(
            { _id: new ObjectId(registrationId) },
            { $set: { status: status, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).send({ error: 'Registration not found' });
        }

        res.send({ message: `Registration status updated to ${status}` });
    } catch (error) {
        console.error('Error updating registration status:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Delete a registration
const deleteRegistration = async (db, req, res) => {
    try {
        const eventRegistrationsCollection = db.collection("eventRegistrations");
        const { registrationId } = req.params;

        const result = await eventRegistrationsCollection.deleteOne(
            { _id: new ObjectId(registrationId) }
        );

        if (result.deletedCount === 0) {
            return res.status(404).send({ error: 'Registration not found' });
        }

        res.send({ message: 'Registration deleted successfully' });
    } catch (error) {
        console.error('Error deleting registration:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

module.exports = {
    registerForEvent,
    getRegistrationsByUser,
    getRegistrationsByEvent,
    getRegistrationsByClub,
    updateRegistrationStatus,
    deleteRegistration
};