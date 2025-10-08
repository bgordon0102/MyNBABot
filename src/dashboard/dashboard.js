import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import EASportsAPI from '../utils/eaSportsAPI.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Initialize EA Sports API
const eaAPI = new EASportsAPI();

// Routes
app.get('/', (req, res) => {
    res.render('index', { title: 'LEAGUEbuddy Dashboard' });
});

app.get('/admin/sync', async (req, res) => {
    try {
        // This would be the main sync page where users can:
        // 1. Connect their EA Sports account
        // 2. Select their league
        // 3. Set console and Madden version
        // 4. Sync league data

        res.render('admin_sync', {
            title: 'EA Sports League Sync',
            message: 'Welcome to the EA Sports sync panel. This is the recommended way to connect your Madden 26 league since EA has not released a companion app for Madden 26 yet.'
        });
    } catch (error) {
        console.error('Admin sync error:', error);
        res.status(500).render('error', { error: 'Failed to load admin sync page' });
    }
});

app.post('/admin/sync/connect', async (req, res) => {
    try {
        const { userId } = req.body;

        // Generate EA Sports login URL
        const loginUrl = eaAPI.generateLoginUrl();

        res.json({
            success: true,
            loginUrl: loginUrl,
            message: 'Please complete EA Sports authentication in the new window'
        });
    } catch (error) {
        console.error('EA connect error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/admin/sync/leagues', async (req, res) => {
    try {
        const { userId, console, maddenVersion } = req.body;

        // Get user's leagues based on console and version settings
        const leagues = await eaAPI.getUserLeagues(userId);

        res.json({
            success: true,
            leagues: leagues,
            console: console,
            maddenVersion: maddenVersion
        });
    } catch (error) {
        console.error('Get leagues error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/admin/sync/select', async (req, res) => {
    try {
        const { userId, leagueId, console, maddenVersion } = req.body;

        // Store the selected league configuration
        // This would integrate with your Discord bot settings

        res.json({
            success: true,
            message: `League ${leagueId} selected for ${console} Madden ${maddenVersion}. You can now use bot commands to sync data.`
        });
    } catch (error) {
        console.error('League selection error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start server
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`📊 LEAGUEbuddy Dashboard running on http://localhost:${PORT}`);
        console.log(`🔧 Admin Sync: http://localhost:${PORT}/admin/sync`);
    });
}

export default app;
