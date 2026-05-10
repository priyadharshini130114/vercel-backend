import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Candidate from './models/Candidate.js';

dotenv.config();

const verify = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const candidates = await Candidate.find({}).limit(5);
        console.log("--- Sample Candidates ---");
        candidates.forEach(c => {
            console.log(`Name: ${c.name}, URL: ${c.avatarUrl}`);
        });
        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

verify();
