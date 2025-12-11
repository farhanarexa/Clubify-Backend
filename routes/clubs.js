const { ObjectId } = require('mongodb');

// Create a new club
const createClub = async (db, req, res) => {
    try {
        const { clubName, description, category, location, bannerImage, membershipFee } = req.body;
        const { email } = req.body; // Manager's email

        if (!email) {
            return res.status(400).send({ error: 'Manager email is required' });
        }

        const clubsCollection = db.collection("clubs");

        // Create new club
        const newClub = {
            clubName,
            description,
            category,
            location,
            bannerImage: bannerImage || '',
            membershipFee: membershipFee || 0,
            status: 'pending', // Default status
            managerEmail: email,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await clubsCollection.insertOne(newClub);
        res.status(201).send({ message: 'Club created successfully', clubId: result.insertedId });
    } catch (error) {
        console.error('Error creating club:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Get all clubs with search and filter capabilities
const getAllClubs = async (db, req, res) => {
    try {
        const clubsCollection = db.collection("clubs");

        // Check if admin to show all clubs (including pending)
        const isAdmin = req.query.admin === 'true';

        // Build query object
        let query = {};
        if (!isAdmin) {
            // Only show approved clubs to regular users
            query = { status: 'approved' };
        }

        // Add search functionality
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i'); // Case insensitive
            query.clubName = { $regex: searchRegex };
        }

        // Add category filter
        if (req.query.category) {
            query.category = req.query.category;
        }

        // Add sorting functionality
        let sort = { createdAt: -1 }; // Default to newest first
        if (req.query.sortBy) {
            switch (req.query.sortBy) {
                case 'newest':
                    sort = { createdAt: -1 };
                    break;
                case 'oldest':
                    sort = { createdAt: 1 };
                    break;
                case 'highestFee':
                    sort = { membershipFee: -1 };
                    break;
                case 'lowestFee':
                    sort = { membershipFee: 1 };
                    break;
                default:
                    sort = { createdAt: -1 };
            }
        }

        const clubs = await clubsCollection.find(query).sort(sort).toArray();
        res.send(clubs);
    } catch (error) {
        console.error('Error getting clubs:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Get clubs by status
const getClubsByStatus = async (db, req, res) => {
    try {
        const clubsCollection = db.collection("clubs");
        const { status } = req.params;
        const validStatuses = ['pending', 'approved', 'rejected'];

        if (!validStatuses.includes(status)) {
            return res.status(400).send({ error: 'Invalid status' });
        }

        // Add search and category filter for status query
        const query = { status };

        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            query.clubName = { $regex: searchRegex };
        }

        if (req.query.category) {
            query.category = req.query.category;
        }

        const clubs = await clubsCollection.find(query).toArray();
        res.send(clubs);
    } catch (error) {
        console.error('Error getting clubs by status:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Get clubs by manager
const getClubsByManager = async (db, req, res) => {
    try {
        const clubsCollection = db.collection("clubs");
        const { email } = req.params;

        const clubs = await clubsCollection.find({ managerEmail: email }).toArray();
        res.send(clubs);
    } catch (error) {
        console.error('Error getting clubs by manager:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Update club status (admin only)
const updateClubStatus = async (db, req, res) => {
    try {
        const clubsCollection = db.collection("clubs");
        const { clubId } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'approved', 'rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).send({ error: 'Invalid status. Valid statuses are: pending, approved, rejected' });
        }

        const result = await clubsCollection.updateOne(
            { _id: new ObjectId(clubId) },
            { $set: { status: status, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).send({ error: 'Club not found' });
        }

        res.send({ message: `Club status updated to ${status}` });
    } catch (error) {
        console.error('Error updating club status:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Update club details (club manager only)
const updateClub = async (db, req, res) => {
    try {
        const clubsCollection = db.collection("clubs");
        const { clubId } = req.params;
        const updateData = { ...req.body, updatedAt: new Date() };

        // Remove email from update data to prevent changing manager
        delete updateData.managerEmail;
        delete updateData.status; // Status can only be changed by admin

        const result = await clubsCollection.updateOne(
            { _id: new ObjectId(clubId) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).send({ error: 'Club not found' });
        }

        res.send({ message: 'Club updated successfully' });
    } catch (error) {
        console.error('Error updating club:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Delete a club (admin only)
const deleteClub = async (db, req, res) => {
    try {
        const clubsCollection = db.collection("clubs");
        const { clubId } = req.params;

        const result = await clubsCollection.deleteOne(
            { _id: new ObjectId(clubId) }
        );

        if (result.deletedCount === 0) {
            return res.status(404).send({ error: 'Club not found' });
        }

        res.send({ message: 'Club deleted successfully' });
    } catch (error) {
        console.error('Error deleting club:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

module.exports = {
    createClub,
    getAllClubs,
    getClubsByStatus,
    getClubsByManager,
    updateClubStatus,
    updateClub,
    deleteClub
};