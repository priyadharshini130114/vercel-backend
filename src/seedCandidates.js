import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Candidate from './models/Candidate.js';

dotenv.config();

const clubs = [
    "President Council", "Tech Club", "Sports Club", "Sanskrit Club", 
    "Kannada Club", "Prometheus Club", "Finance Club"
];

const positions = [
    { title: "Secretary", count: 8 },
    { title: "Deputy Secretary", count: 8 },
    { title: "Assistant Secretary", count: 8 },
    { title: "Treasurer", count: 8 },
    { title: "Joint Secretary", count: 8 },
    { title: "Event Coordinator", count: 8 },
    { title: "Cultural Head", count: 8 },
    { title: "Technical Head", count: 8 }
];

const firstNames = [
    "Aarav", "Aaryan", "Abhishek", "Aditya", "Akash", "Aniket", "Aniruddh", "Ankit", "Ansh", "Arjun",
    "Arnav", "Aryan", "Ayush", "Bhavya", "Chaitanya", "Daksh", "Darsh", "Dev", "Dhruv", "Divyansh",
    "Ganesh", "Gautam", "Gaurav", "Hardik", "Harsh", "Ishaan", "Jatin", "Kabir", "Karan", "Kartik",
    "Kunal", "Laksh", "Madhav", "Manan", "Mayank", "Moksh", "Nakul", "Namit", "Nikhil", "Nishant",
    "Ojas", "Om", "Parth", "Pranav", "Pranay", "Prateek", "Priyansh", "Rahul", "Rajat", "Rajiv",
    "Ranveer", "Rishi", "Rohan", "Rohit", "Rudra", "Sahil", "Samarth", "Sameer", "Sanchit", "Sarthak",
    "Saurabh", "Shaurya", "Shivam", "Shreyas", "Siddharth", "Sumit", "Tanmay", "Tushar", "Uday", "Utkarsh",
    "Vaibhav", "Varun", "Vedant", "Vihan", "Vikram", "Vinayak", "Vipul", "Vishal", "Yash", "Yuvraj",
    "Aavya", "Aditi", "Aishwarya", "Akshara", "Ananya", "Anika", "Anushka", "Avni", "Bhavna", "Chhavi",
    "Drishti", "Esha", "Gauri", "Gunjan", "Isha", "Ishani", "Ishita", "Janhvi", "Jiya", "Kavya",
    "Khushi", "Kirti", "Komal", "Laranya", "Mahi", "Manshi", "Mehak", "Mitali", "Myra", "Navya",
    "Nayana", "Nidhi", "Niharika", "Nikita", "Niyati", "Pahal", "Palak", "Pari", "Pavitra", "Prisha",
    "Priyanka", "Rashi", "Raveena", "Riya", "Ruchi", "Saanvi", "Sakshi", "Saloni", "Sanya", "Sara",
    "Saumya", "Sejal", "Shagun", "Shakti", "Shanya", "Sharvari", "Shikha", "Shivi", "Shreya",
    "Shruti", "Sia", "Sneha", "Sonakshi", "Srishti", "Suhani", "Tanvi", "Tanya", "Tara", "Trisha",
    "Urvi", "Vaani", "Vanya", "Vartika", "Vedika", "Vrinda", "Yashi", "Zoya"
];

const lastNames = [
    "Sharma", "Verma", "Gupta", "Singh", "Yadav", "Kumar", "Choudhary", "Thakur", "Mishra", "Pandey",
    "Srivastava", "Patel", "Joshi", "Iyer", "Nair", "Reddy", "Rao", "Kulkarni", "Deshmukh", "Chauhan",
    "Agrawal", "Bansal", "Goel", "Khanna", "Kapoor", "Malhotra", "Mehra", "Sethi", "Taneja", "Arora",
    "Bhat", "Dhar", "Kaul", "Zadoo", "Ganju", "Raina", "Tickoo", "Peer", "Shah", "Khan",
    "Ahmed", "Ansari", "Siddiqui", "Qureshi", "Sheikh", "Sayyed", "Mirza", "Baig", "Pasha", "Mani"
];

const emojiSymbols = [
    "🎓", "📚", "🏆", "🎭", "💻", "🤝", "💰", "🔬", "🔭", "🎨", "🎵", "⚖️", "🏥", "🏗️", "🧭", "📐", "✒️", "🖊️", "📝", "💾",
    "📱", "🔋", "📡", "💡", "🧠", "🌍", "🌱", "♻️", "📣", "🗣️", "🚀", "☄️", "🪐", "🌓", "🛸", "🛰️", "👽", "🤖", "👨‍🚀", "🌋",
    "🧪", "🛠️", "🔥", "💧", "⚡", "🌈", "☀️", "🌙", "⭐", "🍀", "🍁", "🍂", "🌿", "🍄", "🌵", "🌴", "🌲", "🌳", "🌊", "🌋",
    "🏔️", "⛰️", "🛤️", "🛣️", "🗺️", "🗾", "🏔️", "🏕️", "🏖️", "🏜️", "🏝️", "🏞️", "🏟️", "🏛️", "🏗️", "🏘️", "🏙️", "🏚️", "🏢", "🏬",
    "🏣", "🏤", "🏥", "🏦", "🏨", "🏪", "🏫", "🏩", "💒", "🗼", "🏰", "🏯", "🏟️", "🎡", "🎢", "🎠", "⛲", "⛱️", "🏖️", "🏝️",
    "🏜️", "🌋", "⛰️", "🏔️", "🗻", "🏕️", "⛺", "🛖", "🏠", "🏡", "🏘️", "🏚️", "🏗️", "🏢", "🏬", "🏣", "🏤", "🏥", "🏦", "🏨",
    "🏪", "🏫", "🏩", "💒", "🗼", "🏰", "🏯", "🏟️", "🎡", "🎢", "🎠", "⛲", "⛱️", "🏖️", "🏝️", "🏜️", "🌋", "⛰️", "🏔️", "🗻",
    "🏕️", "⛺", "🛖", "🏠", "🏡", "🏘️", "🏚️", "🏗️", "🏢", "🏬", "🏣", "🏤", "🏥", "🏦", "🏨", "🏪", "🏫", "🏩", "💒", "🗼",
    "🛡️", "🏹", "⚔️", "💎", "🔮", "🧿", "🧿", "📿", "🏮", "🕯️", "🕰️", "⌛", "⏳", "📡", "🔭", "🔬", "🧬", "🧪", "🧫", "🧪"
];

const generateCandidates = () => {
    const candidates = [];
    let nameIdx = 0;
    let symbolIdx = 0;

    clubs.forEach((club, clubIdx) => {
        const electionId = clubIdx + 1;
        positions.forEach(pos => {
            for (let i = 0; i < pos.count; i++) {
                // Generate a unique-ish Indian name
                const firstName = firstNames[(nameIdx + i) % firstNames.length];
                const lastName = lastNames[(nameIdx + i + clubIdx) % lastNames.length];
                const fullName = `${firstName} ${lastName}`;
                
                const role = `${club} - ${pos.title}`;
                const encodedName = encodeURIComponent(fullName);
                
                candidates.push({
                    name: fullName,
                    role: role,
                    electionId: electionId,
                    avatarUrl: "NEON_LOGO_IDENTITY",
                    symbol: emojiSymbols[symbolIdx % emojiSymbols.length] || "🗳️",
                    votes: 0
                });
                
                nameIdx++;
                symbolIdx++;
            }
        });
    });
    
    return candidates;
};

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB for club-based seeding...");

        // Clear existing candidates
        await Candidate.deleteMany({});
        console.log("Existing candidates wiped.");

        const candidates = generateCandidates();
        
        // Insert new candidates
        await Candidate.insertMany(candidates);
        console.log(`${candidates.length} Candidates generated and seeded across ${clubs.length} clubs.`);
        console.log(`Structure: ${clubs.length} Clubs, 3 Positions/Club (6 Pres, 8 Sec, 8 Dep Sec).`);

        mongoose.connection.close();
        console.log("Database connection closed.");
    } catch (error) {
        console.error("Seeding Error:", error);
        process.exit(1);
    }
};

seedDB();
