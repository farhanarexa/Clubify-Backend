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
            maxAttendees,
            imageUrl
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
            imageUrl: imageUrl || null,
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

// Get all events with search and filter capabilities
const getAllEvents = async (db, req, res) => {
    try {
        // Support for pagination and sorting
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // Build query object
        let query = {};

        // Support for filtering by club
        if (req.query.clubId) {
            query.clubId = new ObjectId(req.query.clubId);
        }

        // Add search functionality
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i'); // Case insensitive
            query.title = { $regex: searchRegex };
        }

        // Add category filter if needed (assuming events might have a category)
        if (req.query.category) {
            query.category = req.query.category;
        }

        // Add sorting functionality
        let sort = { eventDate: 1 }; // Default to oldest first
        if (req.query.sortBy) {
            switch (req.query.sortBy) {
                case 'newest':
                    sort = { createdAt: -1 };
                    break;
                case 'oldest':
                    sort = { createdAt: 1 };
                    break;
                case 'highestFee':
                    sort = { eventFee: -1 };
                    break;
                case 'lowestFee':
                    sort = { eventFee: 1 };
                    break;
                case 'eventDateNewest':
                    sort = { eventDate: -1 };
                    break;
                case 'eventDateOldest':
                    sort = { eventDate: 1 };
                    break;
                default:
                    sort = { eventDate: 1 }; // Default sort by event date (oldest first)
            }
        }

        const eventsCollection = db.collection("events");

        const events = await eventsCollection
            .find(query)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();

        // Get total count for pagination info
        const total = await eventsCollection.countDocuments(query);

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

        // Add sorting capabilities to club events
        let sort = { eventDate: 1 }; // Default to oldest first
        if (req.query.sortBy) {
            switch (req.query.sortBy) {
                case 'newest':
                    sort = { createdAt: -1 };
                    break;
                case 'oldest':
                    sort = { createdAt: 1 };
                    break;
                case 'highestFee':
                    sort = { eventFee: -1 };
                    break;
                case 'lowestFee':
                    sort = { eventFee: 1 };
                    break;
                case 'eventDateNewest':
                    sort = { eventDate: -1 };
                    break;
                case 'eventDateOldest':
                    sort = { eventDate: 1 };
                    break;
                default:
                    sort = { eventDate: 1 }; // Default sort by event date (oldest first)
            }
        }

        const events = await eventsCollection
            .find({ clubId: new ObjectId(clubId) })
            .sort(sort)
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

        // Extract only the fields we want to allow updates for
        const allowedFields = [
            'title', 'description', 'eventDate', 'date', 'location',
            'isPaid', 'eventFee', 'maxAttendees', 'imageUrl'
        ];

        // Filter the request body to only include allowed fields
        const updateData = {};
        for (const field of allowedFields) {
            if (req.body.hasOwnProperty(field)) {
                updateData[field] = req.body[field];
            }
        }

        // Add updatedAt timestamp
        updateData.updatedAt = new Date();

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