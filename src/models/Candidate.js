import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true
    },
    electionId: {
        type: Number,
        required: true,
        index: true // Optimized for high-speed retrieval of club-based candidates
    },
    avatarUrl: {
        type: String,
        required: false
    },
    symbol: {
        type: String,
        required: false // Unique symbol for the candidate (e.g., "Rocket", "Lion")
    },
    votes: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

export default mongoose.model('Candidate', candidateSchema);
