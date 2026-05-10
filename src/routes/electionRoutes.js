import express from 'express';
import Election from '../models/Election.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { isVotingOpen } from '../utils/votingTimeValidator.js';

const router = express.Router();

// Get voting status
router.get('/status', (req, res) => {
    res.json(isVotingOpen());
});

// Get all active elections
router.get('/', async (req, res) => {
    try {
        const elections = await Election.find({});
        res.json(elections);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin: Create an election
router.post('/', protect, adminOnly, async (req, res) => {
    try {
        const { title, description, startTime, endTime, blockchainId } = req.body;

        const election = new Election({
            title,
            description,
            startTime,
            endTime,
            blockchainId
        });

        const createdElection = await election.save();
        res.status(201).json(createdElection);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin: Add candidate to election
router.post('/:id/candidates', protect, adminOnly, async (req, res) => {
    try {
        const { name, description, blockchainId } = req.body;

        const election = await Election.findById(req.params.id);

        if (election) {
            const candidate = {
                name,
                description,
                blockchainId
            };

            election.candidates.push(candidate);
            await election.save();
            res.status(201).json({ message: 'Candidate added' });
        } else {
            res.status(404).json({ message: 'Election not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin: Toggle election status
router.put('/:id/toggle', protect, adminOnly, async (req, res) => {
    try {
        const election = await Election.findById(req.params.id);
        if (election) {
            election.isActive = !election.isActive;
            await election.save();
            res.json({ message: `Election ${election.isActive ? 'activated' : 'deactivated'}`, isActive: election.isActive });
        } else {
            res.status(404).json({ message: 'Election not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
