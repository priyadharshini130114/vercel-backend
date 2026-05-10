import mongoose from 'mongoose';
import User from './src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const promoteToAdmin = async (email) => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/votex');
        console.log("Connected to database.");

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            console.error(`User with email ${email} not found.`);
            process.exit(1);
        }

        user.role = 'Admin';
        user.isEmailVerified = true; // Ensure they can login
        await user.save();

        console.log(`SUCCESS: ${email} has been promoted to Admin and verified.`);
        process.exit(0);
    } catch (err) {
        console.error("Promotion failed:", err);
        process.exit(1);
    }
};

promoteToAdmin('rharshitha977@gmail.com');
