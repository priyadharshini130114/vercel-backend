import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const promote = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const email = process.argv[2];
        if (!email) {
            console.log("Usage: node src/promoteAdmin.js <email>");
            process.exit(1);
        }

        const user = await User.findOneAndUpdate(
            { email: email.toLowerCase() },
            { role: 'Admin' },
            { new: true }
        );

        if (user) {
            console.log(`Success: ${user.fullName} is now an Admin.`);
        } else {
            console.log("Error: User not found.");
        }
        mongoose.connection.close();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

promote();
