const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
const PORT = 3001;

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/referenceHub';

const initialLinks = [
    { 
        url: "https://ipindia.gov.in/writereaddata/portal/ipoact/1_31_1_patent-act-1970-11march2015.pdf", 
        title: "The Patents Act, 1970 (As amended)",
        category: "Patents",
        status: 'Pending Check', 
        linkRotWarning: false 
    },
    { 
        url: "https://ipindia.gov.in/", 
        title: "Copyright Act, 1957",
        category: "Copyright",
        status: 'Pending Check', 
        linkRotWarning: false 
    },
    { 
        url: "https://ipindia.gov.in/this-link-is-broken-on-purpose.html", 
        title: "Trademarks Act, 1999",
        category: "Trademarks",
        status: 'Pending Check', 
        linkRotWarning: false 
    },
    { 
        url: "https://www.indiacode.nic.in/bitstream/123456789/1981/5/A1999-48.pdf", 
        title: "Geographical Indications of Goods (Registration and Protection) Act, 1999",
        category: "GI",
        status: 'Pending Check', 
        linkRotWarning: false 
    },
];

app.use(cors());
app.use(express.json());

const LinkSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true },
    url: { type: String, required: true, unique: true },
    status: { type: String, default: 'Pending Check' },
    lastChecked: { type: Date, default: null },
    linkRotWarning: { type: Boolean, default: false },
});

const Link = mongoose.model('Link', LinkSchema);

let cronJob = null;

const checkLinkHealth = async (url) => {
    let newStatus = 'Unknown Error';
    let warning = false;

    try {
        const response = await axios.get(url, {
            timeout: 10000,
            maxRedirects: 5,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            },
            validateStatus: (status) => status >= 200 && status < 500
        });

        const statusCode = response.status;
        
        if (statusCode >= 200 && statusCode < 400) {
            if (response.data && typeof response.data === 'string' && (response.data.includes('Error 404') || response.data.includes('page not found'))) {
                 newStatus = `Soft 404 (Code: ${statusCode})`;
                 warning = true;
            } else {
                 newStatus = `OK (Code: ${statusCode})`;
                 warning = false;
            }
        } else {
            newStatus = `Failed (Code: ${statusCode})`;
            warning = true;
        }
    } catch (error) {
        if (error.response) {
            newStatus = `Failed (Code: ${error.response.status})`;
        } else if (error.code === 'ECONNABORTED') {
            newStatus = 'Timeout Error';
        } else {
            newStatus = `Network Error: ${error.message.substring(0, 50)}...`;
        }
        warning = true;
    }

    return { newStatus, warning };
};

async function updateAllLinkStatuses() {
    console.log(`\n--- Starting periodic link check at ${new Date().toISOString()} ---`);
    const linksToUpdate = await Link.find({});

    for (const linkDoc of linksToUpdate) {
        const { newStatus, warning } = await checkLinkHealth(linkDoc.url);

        linkDoc.status = newStatus;
        linkDoc.lastChecked = new Date();
        linkDoc.linkRotWarning = warning;
        await linkDoc.save();

        console.log(`[${newStatus.padEnd(25)}] ${linkDoc.title}: ${linkDoc.url}`);
    }
    console.log('--- Link check complete. Database updated. ---');
}

app.get('/api/links', async (req, res) => {
    try {
        const links = await Link.find({}).sort({ category: 1, title: 1 });
        res.json(links);
    } catch (error) {
        console.error('Error fetching links:', error);
        res.status(500).json({ message: 'Failed to retrieve links from database.' });
    }
});

app.get('/', (req, res) => {
    res.send('Reference Hub Backend is running and connected to MongoDB.');
});

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('MongoDB connected successfully.');

        const count = await Link.countDocuments();
        if (count === 0) {
            await Link.insertMany(initialLinks.map(link => ({
                ...link,
                lastChecked: null 
            })));
            console.log('Database seeded with initial IP India links.');
        } else {
            console.log(`Database already contains ${count} links. Skipping seed.`);
        }

        app.listen(PORT, async () => {
            console.log(`Server running on http://localhost:${PORT}`);
            
            await updateAllLinkStatuses();

            cronJob = cron.schedule('0 * * * *', () => {
                console.log('Scheduled task triggered: Running hourly link check.');
                updateAllLinkStatuses();
            }, { timezone: "Asia/Kolkata" });
            
            console.log('Automatic link rot check scheduled to run every hour.');
        });
    })
    .catch(err => {
        console.error('MongoDB connection error. Server will not start:', err.message);
        process.exit(1);
    });