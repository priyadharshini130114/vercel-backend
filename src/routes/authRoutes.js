import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import nodemailer from 'nodemailer';
import User from '../models/User.js';

import { isVotingOpen } from '../utils/votingTimeValidator.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

const otpCache = new Map(); // Store mappings: email -> { otpHash, expiresAt }

let transporter;

const initNodemailer = async () => {
    try {
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });
            console.log("Nodemailer: Initialized with provided SMTP credentials.");
        } else {
            let testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: "smtp.ethereal.email",
                port: 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: testAccount.user, // generated ethereal user
                    pass: testAccount.pass  // generated ethereal password
                }
            });
            console.log("\n--- NODEMAILER TESTING MODE ---");
            console.log("No EMAIL_USER configured in .env. Using Ethereal Email for testing.");
            console.log("Ethereal Username:", testAccount.user);
            console.log("Login here to view sent emails: https://ethereal.email/login");
            console.log("-------------------------------\n");
        }
    } catch (err) {
        console.error("Failed to init Nodemailer:", err);
    }
};
initNodemailer();

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const getEuclideanDistance = (descriptors1, descriptors2) => {
    if (descriptors1.length !== descriptors2.length) return 1;
    let sum = 0;
    for (let i = 0; i < descriptors1.length; i++) {
        sum += Math.pow(descriptors1[i] - descriptors2[i], 2);
    }
    return Math.sqrt(sum);
};

// Request Secure OTP to Email
router.post('/request-email-otp', async (req, res) => {
    try {
        const { email, fullName, registrationNumber, password, role, course } = req.body;

        // Block registration outside voting window (Admins exempt)
        const votingStatus = isVotingOpen();
        if (!votingStatus.isOpen && role !== 'Admin') {
            return res.status(403).json({ message: `Registration is currently disabled. ${votingStatus.message}` });
        }

        // Strict Field Validation
        if (!email || !fullName || !registrationNumber || !password) {
            const missing = [];
            if (!email) missing.push("Email");
            if (!fullName) missing.push("Full Name");
            if (!registrationNumber) missing.push("Registration Number");
            if (!password) missing.push("Security Key (Password)");

            return res.status(400).json({ message: `Required fields missing: ${missing.join(', ')}` });
        }

        // Normalize IDs for consistency and uniqueness enforcement
        const normalizedRegNum = registrationNumber.toUpperCase().trim();
        const normalizedEmail = email.toLowerCase().trim();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({ message: "Invalid email format." });
        }

        const regNumRegex = /^U18IN23S00\d{2}$/;
        if (!regNumRegex.test(normalizedRegNum)) {
            return res.status(400).json({ message: 'Invalid Registration Number format. Expected: U18IN23S00XX' });
        }

        // Restricted Admin Access: Only allow specific email to register as Admin
        if (role === 'Admin' && normalizedEmail !== 'rharshitha977@gmail.com') {
            return res.status(403).json({ message: "Access Denied: Only the authorized administrator can register with the Admin role." });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [
                { email: normalizedEmail },
                { registrationNumber: normalizedRegNum }
            ]
        });

        if (existingUser && existingUser.isEmailVerified) {
            let conflictField = "Identity Record";
            if (existingUser.email === normalizedEmail) conflictField = "Email Address";
            if (existingUser.registrationNumber === normalizedRegNum) conflictField = "Registration Number";

            return res.status(403).json({
                message: `${conflictField} already registered. Duplicate identities are strictly prohibited for system integrity.`
            });
        }
        // Generate OTP
        const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const salt = await bcrypt.genSalt(10);
        const otpHash = await bcrypt.hash(rawOtp, salt);

        // Hash account password
        const hashedPassword = await bcrypt.hash(password, salt);

        const userData = {
            fullName,
            registrationNumber: normalizedRegNum,
            email: normalizedEmail,
            password: hashedPassword,
            role: role || 'Voter',
            course: course || 'BCA',
            isEmailVerified: false,
            otpHash, // PERSISTED TO DB
            otpExpires: new Date(Date.now() + 5 * 60000), // 5 MINS (Production-Level Protection)
            otpAttempts: 0,
            avatarUrl: `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(fullName)}&backgroundColor=transparent&mouth=smile,laughing`,
            symbol: "🆔"
        };

        if (existingUser) {
            Object.assign(existingUser, userData);
            await existingUser.save();
        } else {
            const newUser = new User(userData);
            await newUser.save();
        }


        if (transporter) {
            await transporter.sendMail({
                from: '"VOTEX Secure" <noreply@votex.edu>',
                to: email,
                subject: 'VOTEX - Your Secure Verification Token',
                text: `Your Identity Verification Token is: ${rawOtp}. It expires in 5 minutes. Do not share this.`,
                html: `
                    <div style="font-family: monospace; background: #000; color: #00ffff; padding: 20px; border-radius: 8px;">
                        <h2 style="color: #bc13fe; text-transform: uppercase;">VOTEX Secure Gateway</h2>
                        <p>Your one-time sequence token to establish identity is:</p>
                        <div style="font-size: 24px; font-weight: bold; padding: 10px; background: #111; display: inline-block; border: 1px solid #00ffff; letter-spacing: 5px;">${rawOtp}</div>
                        <p style="color: #666; font-size: 12px; margin-top: 20px;">This token self-destructs in 5 minutes. Do not share it with any entity.</p>
                    </div>
                `
            });
        }

        res.json({ message: "OTP transmitted securely to email" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

// Verify OTP (without activation)
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: "Email and OTP required" });

        const user = await User.findOne({ email });
        if (!user || !user.otpHash || !user.otpExpires || user.otpExpires < new Date()) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        const isOtpValid = await bcrypt.compare(otp, user.otpHash);
        if (!isOtpValid) return res.status(400).json({ message: "Invalid OTP" });

        res.json({ message: "OTP verified. Proceed to biometric scan." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/register', async (req, res) => {
    try {
        const { email, otp, faceDescriptor } = req.body;
        console.log(`[AUTH] Registration attempt for ${email}. Descriptor present: ${!!faceDescriptor}`);
        if (faceDescriptor) console.log(`[AUTH] Descriptor length: ${faceDescriptor.length}`);

        // --- HACK-PROOF SECURE OTP VERIFICATION ---
        if (!email || !otp) {
            return res.status(400).json({ message: "Secure OTP tracking sequence missing" });
        }

        const user = await User.findOne({ email });
        if (!user || !user.otpHash || !user.otpExpires || user.otpExpires < new Date()) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        if (user.otpAttempts >= 3) {
            await User.findByIdAndUpdate(user._id, { $unset: { otpHash: "", otpExpires: "" } });
            return res.status(400).json({ message: "Too many failed attempts. Please request a new OTP." });
        }

        const isOtpValid = await bcrypt.compare(otp, user.otpHash);
        console.log(`[AUTH] OTP Validation for ${email}: ${isOtpValid ? 'SUCCESS' : 'FAILED'}`);
        
        if (!isOtpValid) {
            await User.findByIdAndUpdate(user._id, { $inc: { otpAttempts: 1 } });
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }



        // --- FACE RECOGNITION DUPLICATE CHECK ---
        if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
            return res.status(400).json({ message: "Biometric face scan required to complete registration." });
        }

        // Fetch all existing users with face descriptors (excluding self)
        const usersWithFaces = await User.find({ 
            _id: { $ne: user._id },
            faceDescriptor: { $exists: true, $ne: [] }, 
            isEmailVerified: true 
        });

        for (const existingUser of usersWithFaces) {
            const distance = getEuclideanDistance(faceDescriptor, existingUser.faceDescriptor);
            if (distance < 0.6) { // Similarity threshold (lower means more similar)
                return res.status(403).json({
                    message: "Duplicate Identity Detected: Your biometric profile is already registered under a different account."
                });
            }
        }

        // Activate the user atomically to prevent versioning conflicts
        await User.findByIdAndUpdate(user._id, {
            isEmailVerified: true,
            faceDescriptor: faceDescriptor,
            $unset: { otpHash: "", otpExpires: "" }
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                course: user.course,
                registrationNumber: user.registrationNumber,
                avatarUrl: user.avatarUrl,
                symbol: user.symbol,
                token: generateToken(user._id),
                votedElections: user.votedElections,
                isVoted: user.isVoted
            });
        } else {
            res.status(400).json({ message: 'Activation failed' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Login User
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Block login outside voting window
        const votingStatus = isVotingOpen();
        if (!votingStatus.isOpen) {
            // FAIL-SAFE ADMIN BYPASS: Allow primary administrator regardless of window
            if (email.toLowerCase() !== 'rharshitha977@gmail.com') {
                const checkUser = await User.findOne({ email: email.toLowerCase() });
                if (!checkUser || checkUser.role !== 'Admin') {
                    return res.status(403).json({ message: `Access Portal is currently closed. ${votingStatus.message}` });
                }
            }
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (!user.isEmailVerified) {
            return res.status(403).json({ message: 'Email address not verified. Please contact system administrator.' });
        }

        if (await bcrypt.compare(password, user.password)) {

            // Strict Voting Access Control: Block login if voted (Exempt Admins)
            if (user.isVoted && user.role !== 'Admin') {
                return res.status(403).json({
                    message: "Access denied. You have already voted.",
                    isVoted: true
                });
            }

            // If 2FA is enabled, require OTP step
            if (user.isTwoFactorEnabled) {
                return res.json({
                    userId: user._id,
                    requires2FA: true,
                    message: "Proceed to 2FA verification"
                });
            }

            res.json({
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                course: user.course,
                registrationNumber: user.registrationNumber,
                avatarUrl: user.avatarUrl,
                symbol: user.symbol,
                token: generateToken(user._id),
                requires2FA: false,
                votedElections: user.votedElections,
                isVoted: user.isVoted,
                message: user.isVoted ? "" : "✅ Login Successful! Please proceed to cast your vote."
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Setup 2FA
router.post('/2fa/setup', async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ message: 'User not found' });

        const secret = speakeasy.generateSecret({ name: `VOTEX (${user.email})` });

        user.twoFactorSecret = secret.base32;
        await user.save();

        QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
            if (err) throw err;
            res.json({ secret: secret.base32, qrCode: data_url });
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Verify 2FA and Enable it
router.post('/2fa/verify', async (req, res) => {
    try {
        const { userId, token } = req.body;
        const user = await User.findById(userId);

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: token
        });

        if (verified) {
            user.isTwoFactorEnabled = true;
            await user.save();
            res.json({
                message: "2FA Enabled Successfully",
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: "Invalid OTP Token" });
        }

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Record a vote to prevent duplicates
router.post('/record-vote', protect, async (req, res) => {
    try {
        const votingStatus = isVotingOpen();
        if (!votingStatus.isOpen && req.user.role !== 'Admin') {
            return res.status(403).json({ message: votingStatus.message });
        }

        const { electionId, role } = req.body;
        const voteKey = `${electionId}-${role}`;
        
        // SECURE VOTE ANCHORING: Atomic update to prevent race conditions or duplicate tallies for this specific role
        const updatedUser = await User.findOneAndUpdate(
            { _id: req.user._id, votedElections: { $ne: voteKey } }, 
            {
                $set: { isVoted: true },
                $addToSet: { votedElections: voteKey }
            },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            const userCheck = await User.findById(req.user._id);
            console.log(`[VOTEX ERROR] Record-vote failed for ${req.user._id}. Key: ${voteKey}. Already voted: ${userCheck?.votedElections?.includes(voteKey)}`);
            return res.status(403).json({ message: `Access denied: You have already cast a vote for ${role} in this division.` });
        }

        console.log(`[VOTEX SERVER] Vote recorded for User: ${updatedUser.fullName} in Election: ${electionId}`);
        console.log(`[VOTEX SERVER] User isVoted: ${updatedUser.isVoted}, Voted Elections: ${updatedUser.votedElections}`);

        res.json({
            message: 'Vote recorded',
            votedElections: updatedUser.votedElections,
            isVoted: updatedUser.isVoted
        });
    } catch (error) {
        console.error(`[VOTEX SERVER] record-vote ERROR:`, error);
        res.status(500).json({ message: error.message });
    }
});

// Admin Only: Clear/Wipe DB (Reset all points/voters)
router.delete('/dev/clear-db', protect, adminOnly, async (req, res) => {
    try {
        // Wipe only Voter accounts, keep Admins
        const result = await User.deleteMany({ role: { $ne: 'Admin' } });
        res.json({ message: `Database reset successful. Deleted ${result.deletedCount} standard voters.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user profile/status
router.get('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: "No token provided" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (!user) return res.status(404).json({ message: "User not found" });

        res.json(user);
    } catch (error) {
        res.status(401).json({ message: "Invalid token" });
    }
});

export default router;
