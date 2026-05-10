import mongoose from 'mongoose';
import User from './src/models/User.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const forceRegisterAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/votex');
        console.log("Connected to database.");

        const email = 'rharshitha977@gmail.com';
        const password = 'AdminPassword123'; // Temporary password for initial access
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const adminData = {
            fullName: 'System Administrator',
            registrationNumber: 'U18IN23S0099', // Placeholder high-range ID
            email: email,
            password: hashedPassword,
            role: 'Admin',
            course: 'N/A',
            isEmailVerified: true,
            avatarUrl: `https://api.dicebear.com/9.x/micah/svg?seed=Admin&backgroundColor=transparent`,
            symbol: "🛡️"
        };

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            Object.assign(existingUser, adminData);
            await existingUser.save();
            console.log(`SUCCESS: Existing user ${email} updated to Admin.`);
        } else {
            const newUser = new User(adminData);
            await newUser.save();
            console.log(`SUCCESS: New Admin user ${email} created.`);
        }

        console.log("\n--- ADMIN CREDENTIALS ---");
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log("-------------------------\n");
        
        process.exit(0);
    } catch (err) {
        console.error("Force registration failed:", err);
        process.exit(1);
    }
};

forceRegisterAdmin();
