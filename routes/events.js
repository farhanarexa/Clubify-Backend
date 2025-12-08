const { ObjectId } = require('mongodb');

// Create a new event
const createEvent = async (db, req, res) => {
    try {
        const {
            clubId,
            title,
            description,
            eventDate,
            date,  // Also accept 'date' from frontend
            location,
            isPaid,
            eventFee,
            maxAttendees
        } = req.body;

        const eventsCollection = db.collection("events");

        // Use the 'date' field if 'eventDate' is not provided (for compatibility with frontend)
        const actualEventDate = eventDate || date || new Date();

        const newEvent = {
            clubId: new ObjectId(clubId),
            title,
            description,
            eventDate: new Date(actualEventDate),
            date: new Date(actualEventDate),  // Also store as 'date' for consistency
            location,
            isPaid: Boolean(isPaid),
            eventFee: eventFee || 0,
            maxAttendees: maxAttendees || null,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await eventsCollection.insertOne(newEvent);
        res.status(201).send({ message: 'Event created successfully', eventId: result.insertedId });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Get all events
const getAllEvents = async (db, req, res) => {
    try {
        // Support for pagination and sorting
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const sortBy = req.query.sortBy || 'eventDate';
        const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

        // Support for filtering by club
        const clubFilter = req.query.clubId ? { clubId: new ObjectId(req.query.clubId) } : {};

        const eventsCollection = db.collection("events");

        const events = await eventsCollection
            .find(clubFilter)
            .sort({ [sortBy]: sortOrder })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();

        // Get total count for pagination info
        const total = await eventsCollection.countDocuments(clubFilter);

        res.send({
            events,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Error getting events:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Get events by club
const getEventsByClub = async (db, req, res) => {
    try {
        const eventsCollection = db.collection("events");
        const { clubId } = req.params;

        const events = await eventsCollection
            .find({ clubId: new ObjectId(clubId) })
            .sort({ eventDate: 1 })
            .toArray();

        res.send(events);
    } catch (error) {
        console.error('Error getting events by club:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Get event by ID
const getEventById = async (db, req, res) => {
    try {
        const eventsCollection = db.collection("events");
        const { eventId } = req.params;

        const event = await eventsCollection.findOne({ _id: new ObjectId(eventId) });

        if (!event) {
            return res.status(404).send({ error: 'Event not found' });
        }

        res.send(event);
    } catch (error) {
        console.error('Error getting event by ID:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Update an event
const updateEvent = async (db, req, res) => {
    try {
        const eventsCollection = db.collection("events");
        const { eventId } = req.params;
        const updateData = { ...req.body, updatedAt: new Date() };

        // Convert date if provided
        if (updateData.eventDate) {
            updateData.eventDate = new Date(updateData.eventDate);
        }

        const result = await eventsCollection.updateOne(
            { _id: new ObjectId(eventId) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).send({ error: 'Event not found' });
        }

        res.send({ message: 'Event updated successfully' });
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Delete an event
const deleteEvent = async (db, req, res) => {
    try {
        const eventsCollection = db.collection("events");
        const eventRegistrationsCollection = db.collection("eventRegistrations");
        const { eventId } = req.params;

        const result = await eventsCollection.deleteOne(
            { _id: new ObjectId(eventId) }
        );

        if (result.deletedCount === 0) {
            return res.status(404).send({ error: 'Event not found' });
        }

        // Also delete related registrations
        await eventRegistrationsCollection.deleteMany({ eventId: new ObjectId(eventId) });

        res.send({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

module.exports = {
    createEvent,
    getAllEvents,
    getEventsByClub,
    getEventById,
    updateEvent,
    deleteEvent
};