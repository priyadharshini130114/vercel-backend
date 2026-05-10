import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const wipeDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB for wiping...");

        // Wipe only Voter accounts, keep Admins, Candidates, Elections, and AuditLogs
        const result = await User.deleteMany({ role: { $ne: 'Admin' } });

        console.log(`Database wiped: Deleted ${result.deletedCount} standard voters.`);
        console.log("Admins, Candidates, Elections, and AuditLogs were preserved so faculty can view results.");

        mongoose.connection.close();
        console.log("Database connection closed. Disconnected.");
    } catch (error) {
        console.error("Wiping Error:", error);
        process.exit(1);
    }
};

wipeDB();
