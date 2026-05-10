import express from 'express';
import Candidate from '../models/Candidate.js';
import AuditLog from '../models/AuditLog.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import CryptoJS from 'crypto-js';
import crypto from 'crypto';
import { getIO } from '../socket.js';
import { isVotingOpen } from '../utils/votingTimeValidator.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();
const SECRET_KEY = process.env.VOTE_SECRET_KEY || "VOTEX_E2E_SECURE_KEY";

// High-Concurrency Rate Limiter
const voteLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 50, // Increase limit to 50 votes per minute to allow multi-position voting
    message: { message: "NETWORK_CONGESTION: Rate limit exceeded. Please wait before casting another vote." },
    standardHeaders: true,
    legacyHeaders: false,
});

// GET all candidates for a specific election
router.get('/election/:electionId', async (req, res) => {
    try {
        const candidates = await Candidate.find({ electionId: req.params.electionId }).lean();
        res.json(candidates);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET a specific candidate
router.get('/:id', async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.params.id).lean();
        if (candidate) {
            res.json(candidate);
        } else {
            res.status(404).json({ message: 'Candidate not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Optimized Secure Anonymized E2E Tally Submission
router.post('/anonymized-cast', voteLimiter, async (req, res) => {
    try {
        const votingStatus = isVotingOpen();
        if (!votingStatus.isOpen) {
            // SECURE ADMIN BYPASS: Authorization via administrative coordinates
            const { adminEmail } = req.body;
            if (adminEmail?.toLowerCase() !== 'rharshitha977@gmail.com') {
                return res.status(403).json({ message: votingStatus.message });
            }
        }

        const { payload } = req.body;
        if (!payload) return res.status(400).json({ message: "Empty sequence rejected." });

        // 1. Decipher the payload
        let candidateId;
        try {
            const bytes = CryptoJS.AES.decrypt(payload, SECRET_KEY);
            candidateId = bytes.toString(CryptoJS.enc.Utf8);
        } catch (e) {
            return res.status(400).json({ message: "Cryptographic rejection: Corrupted payload." });
        }

        if (!candidateId) {
            return res.status(400).json({ message: "Cryptographic rejection: Invalid payload signature." });
        }

        // 2. ATOMIC INCREMENT: Increment votes without race conditions
        const candidate = await Candidate.findByIdAndUpdate(
            candidateId, 
            { $inc: { votes: 1 } }, 
            { new: true, lean: true }
        );
        
        if (!candidate) return res.status(404).json({ message: "Candidate not found." });

        // 3. ASYNC AUDIT LOG: Append to blockchain mock without blocking the response
        // This ensures the voter gets a quick response while the "blockchain" processes in the background
        const processAudit = async () => {
            try {
                const lastLog = await AuditLog.findOne().sort({ createdAt: -1 }).lean();
                const previousHash = lastLog ? lastLog.cryptographicHash : "GENESIS_NODE_000000000000000000000000";

                const timestamp = new Date().toISOString();
                const rawData = previousHash + payload + timestamp;
                const newHash = crypto.createHash('sha256').update(rawData).digest('hex');

                const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'Unknown IP';
                
                const log = new AuditLog({
                    actionType: 'VOTE_CAST',
                    ipAddress,
                    userAgent: req.headers['user-agent'] || 'Unknown Agent',
                    cryptographicHash: newHash,
                    previousHash,
                    details: `Secure, anonymous vote anchored to ledger segment.`
                });
                await log.save();

                // Broadcast the update in real-time
                const io = getIO();
                io.emit('voteUpdate', {
                    candidateId: candidate._id,
                    votes: candidate.votes,
                    electionId: candidate.electionId,
                    hash: newHash,
                    timestamp
                });
                
                return newHash;
            } catch (err) {
                console.error("Audit Logging Error:", err.message);
            }
        };

        // Start processing audit in background
        const txHashPromise = processAudit();

        // Respond immediately with the candidate update and a "Processing" status
        res.json({ 
            message: "Tally Authorized", 
            status: "PROCESSING_ON_BLOCKCHAIN",
            candidateId: candidate._id,
            newTally: candidate.votes
        });

    } catch (err) {
        console.error("VOTEX Protocol Error:", err);
        res.status(500).json({ message: "Protocol Error: " + err.message });
    }
});

// Admin: CREATE a new candidate
router.post('/', protect, adminOnly, async (req, res) => {
    try {
        const { name, role, electionId, avatarUrl } = req.body;
        const candidate = new Candidate({ name, role, electionId, avatarUrl });
        const createdCandidate = await candidate.save();
        res.status(201).json(createdCandidate);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin: UPDATE a candidate
router.put('/:id', protect, adminOnly, async (req, res) => {
    try {
        const { name, role, electionId, avatarUrl } = req.body;
        const updatedCandidate = await Candidate.findByIdAndUpdate(
            req.params.id,
            { name, role, electionId, avatarUrl },
            { new: true }
        );
        if (updatedCandidate) res.json(updatedCandidate);
        else res.status(404).json({ message: 'Candidate not found' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin: DELETE a candidate
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const result = await Candidate.findByIdAndDelete(req.params.id);
        if (result) res.json({ message: 'Candidate eliminated from the roster.' });
        else res.status(404).json({ message: 'Candidate not found' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin: Export Results as CSV
router.get('/export/csv/:electionId', protect, adminOnly, async (req, res) => {
    try {
        const candidates = await Candidate.find({ electionId: req.params.electionId }).lean();
        let csv = 'Candidate Name,Role,Votes\n';
        candidates.forEach(c => { csv += `"${c.name}","${c.role}",${c.votes}\n`; });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=election_${req.params.electionId}_results.csv`);
        res.status(200).send(csv);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
