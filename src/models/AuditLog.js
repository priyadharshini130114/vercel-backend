import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    actionType: {
        type: String,
        enum: ['VOTE_CAST', 'USER_REGISTRATION', 'ADMIN_ACTION'],
        required: true
    },
    ipAddress: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        required: true
    },
    cryptographicHash: {
        type: String,
        required: true // SHA-256 chained hash for tamper detection
    },
    previousHash: {
        type: String,
        required: true
    },
    details: {
        type: String, // E.g., "Encrypted Payload Processed", "Candidate Increment"
        required: false
    }
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
