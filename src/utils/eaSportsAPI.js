import axios from 'axios';
import express from 'express';
import open from 'open';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// EA Sports API Constants - Exactly like snallabot
const AUTH_SOURCE = 317239;
const CLIENT_SECRET = "wfGAWnrxLroZOwwELYA2ZrAuaycuF2WDb00zOLv48Sb79viJDGlyD6OyK8pM5eIiv_20240731135155";
const REDIRECT_URL = "http://127.0.0.1/success";
const CLIENT_ID = "MCA_25_COMP_APP";
const MACHINE_KEY = "444d362e8e067fe2";
const EA_LOGIN_URL = `https://accounts.ea.com/connect/auth?hide_create=true&release_type=prod&response_type=code&redirect_uri=${REDIRECT_URL}&client_id=${CLIENT_ID}&machineProfileKey=${MACHINE_KEY}&authentication_source=${AUTH_SOURCE}`;

class EASportsAPI {
    constructor() {
        this.tokens = new Map(); // Store user tokens
        this.callbackServer = null;
        this.tokenFilePath = path.join(__dirname, '../../data/ea_tokens.json');
        this.loadTokens();
    }

    // Load stored tokens from file
    loadTokens() {
        try {
            if (fs.existsSync(this.tokenFilePath)) {
                const data = fs.readFileSync(this.tokenFilePath, 'utf8');
                const tokenData = JSON.parse(data);
                this.tokens = new Map(Object.entries(tokenData));
                console.log(`Loaded ${this.tokens.size} EA Sports tokens`);
            }
        } catch (error) {
            console.error('Error loading EA tokens:', error);
        }
    }

    // Save tokens to file
    saveTokens() {
        try {
            const tokenData = Object.fromEntries(this.tokens);
            fs.writeFileSync(this.tokenFilePath, JSON.stringify(tokenData, null, 2));
        } catch (error) {
            console.error('Error saving EA tokens:', error);
        }
    }

    // Generate EA Sports login URL
    generateLoginUrl() {
        return EA_LOGIN_URL;
    }

    // Start OAuth flow - exactly like snallabot
    async startAuthFlow(userId) {
        const callbackPort = 3000;

        return new Promise((resolve, reject) => {
            // Create callback server exactly like snallabot
            const app = express();

            // Snallabot doesn't use a callback route, they have users paste the URL
            app.get('/', (req, res) => {
                res.send(`
                    <html>
                        <head>
                            <title>LEAGUEbuddy EA Sports Setup</title>
                            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
                        </head>
                        <body style="font-family: Arial, sans-serif; padding: 20px;">
                            <div class="container">
                                <h2>🏀 LEAGUEbuddy EA Sports Connection</h2>
                                <p>Please read all these instructions before doing anything! This connects LEAGUEbuddy to EA and your Madden league. To be clear, 
                                <strong>LEAGUEbuddy does not save your credentials, EA credentials, or any console credentials (such as PSN, Xbox, etc).</strong>
                                It uses special tokens to retain its connection to EA and is completely safe and secure with your personal information! This is a 
                                <strong>one time setup</strong> for your league, you should not have to login again.</p>
                                
                                <p>You will soon login to EA, this login is the same login you would normally use for the Madden Companion App, therefore login the 
                                same way you would in that app. LEAGUEbuddy will try to help you through the login process as much as possible</p>
                                
                                <p>Once you login to EA, you will be met with an error/blank page and your browser will be at URL 
                                <strong>"http://127.0.0.1"</strong>. This is 
                                <strong>EXPECTED AND NORMAL</strong>. Copy that entire URL into the box below and you will move on to the next step!</p>
                                
                                <p>Legality wise this all falls under <strong>interoperability</strong></p>
                                
                                <div class="mb-3">
                                    <a href="${EA_LOGIN_URL}" target="_blank" class="btn btn-primary">Login to EA</a>
                                </div>
                                
                                <form action="/submit" method="POST">
                                    <div class="mb-3">
                                        <label for="code" class="form-label">Enter the URL of the page. It should start with 127.0.0.1:</label>
                                        <input type="text" class="form-control" id="code" name="code" placeholder="http://127.0.0.1/success?code=..." required>
                                    </div>
                                    <button type="submit" class="btn btn-success">Submit URL</button>
                                </form>
                            </div>
                        </body>
                    </html>
                `);
            });

            app.post('/submit', async (req, res) => {
                const { code: rawCode } = req.body;

                try {
                    const searchParams = rawCode.substring(rawCode.indexOf("?"));
                    const eaCodeParams = new URLSearchParams(searchParams);
                    const code = eaCodeParams.get("code");

                    if (!code) {
                        throw new Error(`Invalid code URL sent. Expected format is http://127.0.0.1/success?code=CODE Actual url sent ${rawCode}`);
                    }
                    // Exchange code for token - exactly like snallabot
                    const token = await this.exchangeCodeForToken(code);
                    this.tokens.set(userId, token);
                    this.saveTokens();

                    res.send(`
                        <html>
                            <body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
                                <h2>✅ Successfully Connected to EA Sports!</h2>
                                <p>You can now close this window and return to Discord.</p>
                                <p>Your LEAGUEbuddy bot is now connected to your EA Sports account.</p>
                                
                                <div style="background-color: #f0f0f0; padding: 15px; margin: 20px 0; border-radius: 5px;">
                                    <strong>Next Steps:</strong>
                                    <br>• Use <code>/ea sync</code> to import your league data
                                    <br>• Use <code>/ea players</code> to view player ratings
                                    <br>• Use <code>/ea draft</code> to import draft classes
                                </div>
                            </body>
                        </html>
                    `);

                    server.close();
                    resolve({
                        success: true,
                        message: 'Successfully connected to EA Sports!'
                    });
                } catch (error) {
                    console.error('Token exchange error:', error);
                    res.send(`
                        <html>
                            <body style="font-family: Arial, sans-serif; padding: 20px;">
                                <h2>❌ Authentication Error</h2>
                                <p>Failed to exchange authorization code. Please try again.</p>
                                <p>Error: ${error.message}</p>
                            </body>
                        </html>
                    `);
                    server.close();
                    reject(error);
                }
            });

            const server = app.listen(callbackPort, () => {
                console.log(`EA OAuth setup server running on http://127.0.0.1:${callbackPort}`);
                // Open browser to EA Sports login page - exactly like snallabot
                open(EA_LOGIN_URL);
            });

            // Timeout after 5 minutes
            setTimeout(() => {
                server.close();
                reject(new Error('Authentication timeout'));
            }, 300000);
        });
    }

    // Exchange authorization code for access token - exactly like snallabot
    async exchangeCodeForToken(code) {
        try {
            const response = await axios.post('https://accounts.ea.com/connect/token',
                `authentication_source=${AUTH_SOURCE}&client_secret=${CLIENT_SECRET}&grant_type=authorization_code&code=${code}&redirect_uri=${REDIRECT_URL}&release_type=prod&client_id=${CLIENT_ID}`,
                {
                    headers: {
                        "Accept-Charset": "UTF-8",
                        "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031)",
                        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                        "Accept-Encoding": "gzip",
                    }
                }
            );

            if (!response.data.access_token) {
                throw new Error(`Token exchange failed: ${JSON.stringify(response.data)}`);
            }

            return {
                access_token: response.data.access_token,
                refresh_token: response.data.refresh_token,
                expires_at: Date.now() + (response.data.expires_in * 1000),
                token_type: response.data.token_type || 'Bearer'
            };
        } catch (error) {
            console.error('Token exchange failed:', error.response?.data || error.message);
            throw new Error(`Failed to exchange authorization code for token: ${error.message}`);
        }
    }

    // Get user's Madden leagues - using real EA Sports API
    async getUserLeagues(userId, userConsole = null, maddenVersion = null) {
        const token = await this.getValidToken(userId);
        if (!token) throw new Error('No valid EA Sports token found. Please authenticate first.');

        try {
            // Step 1: Get user personas (accounts) from EA
            const personasResponse = await axios.get(
                `https://accounts.ea.com/connect/tokeninfo?access_token=${token.access_token}`,
                {
                    headers: {
                        "Accept-Charset": "UTF-8",
                        "X-Include-Deviceid": "true",
                        "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031)",
                        "Accept-Encoding": "gzip",
                    }
                }
            );

            if (!personasResponse.data.pid_id) {
                throw new Error('Failed to get user ID from EA Sports account');
            }

            const pid = personasResponse.data.pid_id;

            // Step 2: Get Madden entitlements 
            const entitlementsResponse = await axios.get(
                `https://gateway.ea.com/proxy/identity/pids/${pid}/entitlements/?status=ACTIVE`,
                {
                    headers: {
                        "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031)",
                        "Accept-Charset": "UFT-8",
                        "X-Expand-Results": "true",
                        "Accept-Encoding": "gzip",
                        "Authorization": `Bearer ${token.access_token}`,
                    }
                }
            );

            const entitlements = entitlementsResponse.data?.entitlements?.entitlement || [];

            // Debug: Log all entitlements to see what's available
            console.log('🔍 Available EA Sports entitlements:');
            entitlements.forEach(e => {
                console.log(`  - ${e.entitlementTag || 'No tag'} (${e.displayName || 'No name'})`);
            });

            // Try to find Madden entitlements (be more flexible with the matching)
            const maddenEntitlements = entitlements.filter(e =>
                e.entitlementTag && (
                    e.entitlementTag.includes('MADDEN_26') ||
                    e.entitlementTag.includes('MADDEN_25') ||
                    e.entitlementTag.includes('MADDEN') ||
                    (e.displayName && e.displayName.toLowerCase().includes('madden'))
                )
            );

            console.log(`🎮 Found ${maddenEntitlements.length} Madden entitlements`);

            if (maddenEntitlements.length === 0) {
                console.log('⚠️ No specific Madden entitlements found, but proceeding with ONLINE_ACCESS');
                console.log('🔄 Attempting to fetch leagues anyway (EA might not have Madden 26 entitlements ready)');
                // Don't return empty - continue with available entitlements
            }

            // Step 3: Get personas for Madden (or use all entitlements if no Madden-specific ones)
            const maddenPersonas = [];
            const entitlementsToCheck = maddenEntitlements.length > 0 ? maddenEntitlements : entitlements;

            for (const entitlement of entitlementsToCheck) {
                try {
                    const personaResponse = await axios.get(
                        `https://gateway.ea.com/proxy/identity/pids/${pid}/personas?status=ACTIVE`,
                        {
                            headers: {
                                "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031)",
                                "Accept-Charset": "UFT-8",
                                "X-Expand-Results": "true",
                                "Accept-Encoding": "gzip",
                                "Authorization": `Bearer ${token.access_token}`,
                            }
                        }
                    );

                    const personas = personaResponse.data?.personas?.persona || [];
                    maddenPersonas.push(...personas);
                } catch (error) {
                    console.log('Error getting personas for entitlement:', entitlement.entitlementTag);
                }
            }

            if (maddenPersonas.length === 0) {
                return [];
            }

            // Show all personas for debugging, then filter
            console.log(`🔍 DEBUG: All available personas in EA account:`);
            maddenPersonas.forEach(persona => {
                console.log(`  📋 ${persona.displayName} | Console: ${persona.namespaceName} | ID: ${persona.personaId}`);
            });

            let filteredPersonas = maddenPersonas;

            if (userConsole && maddenVersion) {
                console.log(`🎯 Filtering for console: ${userConsole}, Madden version: ${maddenVersion}`);

                // Map user-friendly console names to EA namespace names
                // Note: cem_ea_id appears to be used for newer/cross-platform leagues
                const consoleMap = {
                    'PS5': ['ps5', 'playstation5', 'cem_ea_id', 'ps4', 'playstation'],
                    'XBOX': ['xbox', 'xboxone', 'xboxseriesx', 'xbox360', 'cem_ea_id'],
                    'PC': ['pc', 'origin', 'steam', 'cem_ea_id']
                };

                const expectedConsoles = consoleMap[userConsole] || [userConsole.toLowerCase()];

                filteredPersonas = maddenPersonas.filter(persona => {
                    const namespaceName = persona.namespaceName?.toLowerCase() || '';
                    const matchesConsole = expectedConsoles.some(expectedConsole =>
                        namespaceName.includes(expectedConsole.toLowerCase())
                    );

                    console.log(`  � Persona: ${persona.displayName}, Console: ${namespaceName}, Matches: ${matchesConsole}`);
                    return matchesConsole;
                });

                console.log(`🎯 Filtered to ${filteredPersonas.length} personas for ${userConsole}`);

                // If no matches and user selected PS5, also show cem_ea_id personas as they might be PS5
                if (filteredPersonas.length === 0 && userConsole === 'PS5') {
                    console.log(`⚠️  No PS5 personas found, including cem_ea_id personas as fallback`);
                    filteredPersonas = maddenPersonas.filter(p =>
                        p.namespaceName?.toLowerCase().includes('cem_ea_id') ||
                        p.namespaceName?.toLowerCase().includes('ps')
                    );
                }
            }

            // Try to get actual Connected Franchise Mode leagues instead of just personas
            console.log(`🏈 Attempting to fetch Connected Franchise Mode leagues...`);

            try {
                // Get the user's PID for CFM API calls
                const pid = personasResponse.data.pid_id;

                // Try multiple CFM API endpoints that snallabot might use
                let cfmResponse = null;
                const cfmEndpoints = [
                    `https://gateway.ea.com/proxy/identity/pids/${pid}/cfm/leagues`,
                    `https://api.madden.ea.com/cfm/${pid}/leagues`,
                    `https://proclubs.ea.com/api/nhl/clubs/search?platform=common&clubId=${pid}`
                ];

                for (const endpoint of cfmEndpoints) {
                    try {
                        console.log(`🔍 Trying CFM endpoint: ${endpoint}`);
                        cfmResponse = await axios.get(endpoint, {
                            headers: {
                                "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031)",
                                "Authorization": `Bearer ${token.access_token}`,
                                "Accept": "application/json"
                            }
                        });
                        console.log(`✅ CFM endpoint worked: ${endpoint}`);
                        break;
                    } catch (endpointError) {
                        console.log(`❌ CFM endpoint failed: ${endpoint} - ${endpointError.message}`);
                        continue;
                    }
                }

                const cfmLeagues = cfmResponse.data?.leagues || [];
                console.log(`🏆 Found ${cfmLeagues.length} Connected Franchise Mode leagues`);

                cfmLeagues.forEach(league => {
                    console.log(`  🏈 CFM League: ${league.leagueName} | ID: ${league.leagueId} | Console: ${league.platform}`);
                });

                if (cfmLeagues.length > 0) {
                    // Return actual CFM leagues with proper filtering
                    let filteredLeagues = cfmLeagues;

                    if (userConsole) {
                        const platformMap = {
                            'PS5': ['ps5', 'playstation5', 'ps4'],
                            'XBOX': ['xbox', 'xboxone', 'xboxseriesx'],
                            'PC': ['pc', 'origin', 'steam']
                        };

                        const expectedPlatforms = platformMap[userConsole] || [userConsole.toLowerCase()];

                        filteredLeagues = cfmLeagues.filter(league => {
                            const platform = league.platform?.toLowerCase() || '';
                            return expectedPlatforms.some(expected =>
                                platform.includes(expected.toLowerCase())
                            );
                        });
                    }

                    return filteredLeagues.map(league => ({
                        id: league.leagueId,
                        name: league.leagueName,
                        console: league.platform,
                        teams: league.teamCount || 'Unknown',
                        week: league.currentWeek || 'Unknown',
                        season: league.season || (maddenVersion ? `Madden ${maddenVersion}` : '2025')
                    }));
                }
            } catch (cfmError) {
                console.log(`⚠️ All CFM API endpoints failed, falling back to personas: ${cfmError.message}`);
            }

            // Fallback to persona info if CFM API fails
            // Add better detection for current leagues
            return filteredPersonas.map(persona => {
                const isLikelyCurrentLeague = persona.namespaceName === 'cem_ea_id' ||
                    persona.displayName.includes('_') ||
                    parseInt(persona.personaId) > 900000000; // Higher IDs likely newer

                return {
                    id: persona.personaId,
                    name: `${persona.displayName}'s League`,
                    console: persona.namespaceName === 'cem_ea_id' ?
                        `${userConsole || 'Unknown'} (Cross-Platform)` :
                        persona.namespaceName,
                    teams: 'Unknown',
                    week: 'Unknown',
                    season: maddenVersion ? `Madden ${maddenVersion}` : 2025,
                    isCurrentLeague: isLikelyCurrentLeague
                };
            });

        } catch (error) {
            console.error('Failed to get user leagues:', error.response?.data || error.message);

            // If API calls fail, return empty array instead of crashing
            return [];
        }
    }

    // Get league roster data
    async getLeagueRoster(userId, leagueId) {
        const token = await this.getValidToken(userId);
        if (!token) throw new Error('No valid EA Sports token found. Please authenticate first.');

        try {
            const response = await axios.get(`${this.apiURL}/madden/leagues/${leagueId}/teams`, {
                headers: {
                    'Authorization': `${token.token_type} ${token.access_token}`,
                    'Accept': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Failed to get league roster:', error.response?.data || error.message);
            throw error;
        }
    }

    // Get draft class data
    async getDraftClass(userId, year = 2026) {
        const token = await this.getValidToken(userId);
        if (!token) throw new Error('No valid EA Sports token found. Please authenticate first.');

        try {
            const response = await axios.get(`${this.apiURL}/madden/draft-classes/${year}`, {
                headers: {
                    'Authorization': `${token.token_type} ${token.access_token}`,
                    'Accept': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Failed to get draft class:', error.response?.data || error.message);
            throw error;
        }
    }

    // Get valid token (refresh if needed)
    async getValidToken(userId) {
        console.log(`🔍 Looking for token for userId: ${userId}`);
        console.log(`🔍 Available tokens:`, Array.from(this.tokens.keys()));

        const token = this.tokens.get(userId);
        if (!token) {
            console.log(`❌ No token found for userId: ${userId}`);
            return null;
        }

        console.log(`✅ Token found for ${userId}:`, Object.keys(token));

        // Check if token is expired (handle both expires_at and expiresAt)
        const expiresAt = token.expires_at || token.expiresAt;
        if (expiresAt && Date.now() >= expiresAt) {
            try {
                console.log(`🔄 Token expired, refreshing...`);
                const newToken = await this.refreshToken(token.refresh_token);
                this.tokens.set(userId, newToken);
                this.saveTokens();
                return newToken;
            } catch (error) {
                console.error('Token refresh failed:', error);
                this.tokens.delete(userId);
                this.saveTokens();
                return null;
            }
        }

        console.log(`✅ Token is valid for ${userId}`);
        return token;
    }

    // Refresh expired token - exactly like snallabot  
    async refreshToken(refreshToken) {
        try {
            const response = await axios.post('https://accounts.ea.com/connect/token',
                `grant_type=refresh_token&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&release_type=prod&refresh_token=${refreshToken}&authentication_source=${AUTH_SOURCE}&token_format=JWS`,
                {
                    headers: {
                        "Accept-Charset": "UTF-8",
                        "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031)",
                        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                        "Accept-Encoding": "gzip",
                    }
                }
            );

            if (!response.data.access_token) {
                throw new Error('Token refresh failed - no access token returned');
            }

            return {
                access_token: response.data.access_token,
                refresh_token: response.data.refresh_token || refreshToken,
                expires_at: Date.now() + (response.data.expires_in * 1000),
                token_type: response.data.token_type || 'Bearer'
            };
        } catch (error) {
            console.error('Token refresh failed:', error.response?.data || error.message);
            throw error;
        }
    }

    // Check if user is authenticated
    isAuthenticated(userId) {
        return this.tokens.has(userId);
    }

    // Disconnect user
    disconnect(userId) {
        this.tokens.delete(userId);
        this.saveTokens();
    }

    // Force refresh - clears cached tokens to get fresh data
    forceRefresh(userId) {
        if (this.tokens.has(userId)) {
            const token = this.tokens.get(userId);
            // Mark token as expired to force refresh on next use
            token.expires_at = Date.now() - 1000;
            this.tokens.set(userId, token);
            this.saveTokens();
        }
    }

    // Set default league for a user
    setDefaultLeague(userId, league) {
        if (this.tokens.has(userId)) {
            const token = this.tokens.get(userId);
            token.default_league = {
                id: league.id,
                name: league.name,
                console: league.console,
                teams: league.teams
            };
            this.tokens.set(userId, token);
            this.saveTokens();
        }
    }

    // Get user's default league
    getDefaultLeague(userId) {
        if (this.tokens.has(userId)) {
            const token = this.tokens.get(userId);
            return token.default_league || null;
        }
        return null;
    }
}

export default EASportsAPI;
