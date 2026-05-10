import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    registrationNumber: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['Voter', 'Admin'],
        default: 'Voter'
    },
    course: {
        type: String,
        enum: ['BCA', 'BCOM', 'BBA', 'N/A'],
        default: 'BCA'
    },

    avatarUrl: {
        type: String,
        required: false
    },
    symbol: {
        type: String,
        required: false
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: {
        type: String,
        required: false
    },
    isTwoFactorEnabled: {
        type: Boolean,
        default: false
    },
    votedElections: {
        type: [String],
        default: []
    },
    isVoted: {
        type: Boolean,
        default: false
    },
    faceDescriptor: {
        type: [Number],
        required: false
    },
    otpHash: String,
    otpExpires: Date,
    otpAttempts: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
