const { ObjectId } = require('mongodb');

// Create a new membership
const createMembership = async (db, req, res) => {
    try {
        const { userEmail, clubId, paymentId } = req.body;

        const membershipsCollection = db.collection("memberships");

        // Check if membership already exists
        const existingMembership = await membershipsCollection.findOne({
            userEmail,
            clubId: new ObjectId(clubId)
        });

        if (existingMembership) {
            return res.status(400).send({ error: 'Membership already exists for this user and club' });
        }

        const newMembership = {
            userEmail,
            clubId: new ObjectId(clubId),
            status: 'active', // Default status
            paymentId: paymentId || null,
            joinedAt: new Date(),
            expiresAt: null // Will be set based on membership type
        };

        const result = await membershipsCollection.insertOne(newMembership);
        res.status(201).send({ message: 'Membership created successfully', membershipId: result.insertedId });
    } catch (error) {
        console.error('Error creating membership:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Get memberships by user
const getMembershipsByUser = async (db, req, res) => {
    try {
        const membershipsCollection = db.collection("memberships");
        const { email } = req.params;

        const memberships = await membershipsCollection
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
                    $unwind: '$club'
                },
                {
                    $project: {
                        _id: 1,
                        userEmail: 1,
                        clubId: 1,
                        clubName: '$club.clubName',
                        description: '$club.description',
                        category: '$club.category',
                        location: '$club.location',
                        status: 1,
                        paymentId: 1,
                        joinedAt: 1,
                        expiresAt: 1,
                        membershipFee: '$club.membershipFee'
                    }
                }
            ])
            .toArray();

        res.send(memberships);
    } catch (error) {
        console.error('Error getting memberships by user:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Get memberships by club
const getMembershipsByClub = async (db, req, res) => {
    try {
        const membershipsCollection = db.collection("memberships");
        const { clubId } = req.params;

        const memberships = await membershipsCollection
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
                    $unwind: '$user'
                },
                {
                    $project: {
                        _id: 1,
                        userEmail: 1,
                        userName: '$user.name',
                        userPhoto: '$user.photoURL',
                        clubId: 1,
                        status: 1,
                        paymentId: 1,
                        joinedAt: 1,
                        expiresAt: 1
                    }
                }
            ])
            .toArray();

        res.send(memberships);
    } catch (error) {
        console.error('Error getting memberships by club:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Update membership status
const updateMembershipStatus = async (db, req, res) => {
    try {
        const membershipsCollection = db.collection("memberships");
        const { membershipId } = req.params;
        const { status } = req.body;

        const validStatuses = ['active', 'expired', 'pendingPayment', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).send({ error: 'Invalid status' });
        }

        const result = await membershipsCollection.updateOne(
            { _id: new ObjectId(membershipId) },
            { $set: { status: status, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).send({ error: 'Membership not found' });
        }

        res.send({ message: `Membership status updated to ${status}` });
    } catch (error) {
        console.error('Error updating membership status:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

// Delete a membership
const deleteMembership = async (db, req, res) => {
    try {
        const membershipsCollection = db.collection("memberships");
        const { membershipId } = req.params;

        const result = await membershipsCollection.deleteOne(
            { _id: new ObjectId(membershipId) }
        );

        if (result.deletedCount === 0) {
            return res.status(404).send({ error: 'Membership not found' });
        }

        res.send({ message: 'Membership deleted successfully' });
    } catch (error) {
        console.error('Error deleting membership:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
};

module.exports = {
    createMembership,
    getMembershipsByUser,
    getMembershipsByClub,
    updateMembershipStatus,
    deleteMembership
};