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
        this.apiURL = 'https://gateway.ea.com/proxy/identity'; // EA Sports Gateway API base URL
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

            // Try to get actual Connected Franchise Mode leagues using WAL/Blaze system (like snallabot)
            console.log(`🏈 Attempting to fetch CFM leagues via WAL/Blaze system...`);

            try {
                // WAL Authentication
                console.log('🔐 Authenticating with WAL system...');
                const walAuthResponse = await axios.post(
                    'https://wal2.tools.gos.bio-iad.ea.com/wal/authentication/login',
                    {
                        authCode: token.access_token
                    },
                    {
                        headers: {
                            'Accept': 'application/json',
                            'X-BLAZE-VOID-RESP': 'XML',
                            'X-Application-Key': 'MADDEN-MCA',
                            'X-BLAZE-ID': 'madden-2025-ps5-gen5',
                            'Content-Type': 'application/json',
                            'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031)'
                        }
                    }
                );

                const sessionKey = walAuthResponse.data.userLoginInfo.sessionKey;
                console.log('✅ WAL authentication successful');

                // Get leagues using Mobile_GetMyLeagues command (like snallabot)
                const cfmResponse = await axios.post(
                    `https://wal2.tools.gos.bio-iad.ea.com/wal/mca/Process/${sessionKey}`,
                    {
                        apiVersion: 2,
                        clientDevice: 3,
                        requestInfo: JSON.stringify({
                            messageExpirationTime: Math.floor(Date.now() / 1000) + 300,
                            deviceId: 'LEAGUEbuddy-MCA',
                            commandName: 'Mobile_GetMyLeagues',
                            componentId: 2060,
                            commandId: 801,
                            ipAddress: '127.0.0.1',
                            requestPayload: '{}',
                            componentName: 'careermode',
                            messageAuthData: {
                                authCode: 'placeholder',
                                authData: 'placeholder',
                                authType: 17039361
                            }
                        })
                    },
                    {
                        headers: {
                            'Accept': 'application/json',
                            'X-BLAZE-ID': 'madden-2025-ps5-gen5',
                            'X-BLAZE-VOID-RESP': 'XML',
                            'X-Application-Key': 'MADDEN-MCA',
                            'Content-Type': 'application/json',
                            'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031)'
                        }
                    }
                );

                console.log('✅ Got CFM leagues via WAL system');

                // Parse WAL response format (like snallabot)
                const walResponse = cfmResponse.data?.responseInfo?.value?.leagues || [];
                console.log(`🏆 Found ${walResponse.length} Connected Franchise Mode leagues via WAL`);

                walResponse.forEach(league => {
                    console.log(`  🏈 CFM League: ${league.leagueName} | ID: ${league.leagueId} | Year: ${league.calendarYear}`);
                });

                if (walResponse.length > 0) {
                    // Return actual CFM leagues with proper filtering
                    let filteredLeagues = walResponse;

                    if (userConsole) {
                        const platformMap = {
                            'PS5': ['ps5', 'playstation5', 'ps4'],
                            'XBOX': ['xbox', 'xboxone', 'xboxseriesx'],
                            'PC': ['pc', 'origin', 'steam']
                        };

                        const expectedPlatforms = platformMap[userConsole] || [userConsole.toLowerCase()];

                        filteredLeagues = walResponse.filter(league => {
                            // WAL leagues may not have platform info, so skip filtering for now
                            return true;
                        });
                    }

                    return filteredLeagues.map(league => ({
                        id: league.leagueId,
                        name: league.leagueName,
                        console: 'Cross-Platform',
                        teams: league.numMembers || 'Unknown',
                        week: league.seasonText || 'Unknown',
                        season: league.calendarYear || (maddenVersion ? `Madden ${maddenVersion}` : '2025')
                    }));
                }
            } catch (cfmError) {
                console.log(`⚠️ WAL CFM access failed, falling back to personas: ${cfmError.message}`);
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

    // Get league roster data using EA's WAL/Blaze system (like snallabot)
    async getLeagueRoster(userId, leagueId) {
        const token = await this.getValidToken(userId);
        if (!token) throw new Error('No valid EA Sports token found. Please authenticate first.');

        try {
            console.log('🔐 Attempting WAL authentication for CFM data access...');

            // Try WAL authentication approach used by snallabot
            const walAuthResponse = await axios.post(
                'https://wal2.tools.gos.bio-iad.ea.com/wal/authentication/login',
                {
                    authCode: token.access_token
                },
                {
                    headers: {
                        'Accept': 'application/json',
                        'X-BLAZE-VOID-RESP': 'XML',
                        'X-Application-Key': 'MADDEN-MCA',
                        'X-BLAZE-ID': 'madden-2025-ps5-gen5',
                        'Content-Type': 'application/json',
                        'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031)'
                    }
                }
            );

            console.log('✅ WAL authentication successful');
            const sessionKey = walAuthResponse.data.userLoginInfo.sessionKey;

            // Now try to get roster data via WAL Process endpoint
            const processResponse = await axios.post(
                `https://wal2.tools.gos.bio-iad.ea.com/wal/mca/Process/${sessionKey}`,
                {
                    apiVersion: 2,
                    clientDevice: 3,
                    requestInfo: JSON.stringify({
                        messageExpirationTime: Math.floor(Date.now() / 1000) + 300,
                        deviceId: 'LEAGUEbuddy-MCA',
                        commandName: 'Mobile_GetLeagueRoster',
                        componentId: 2060,
                        commandId: 802,
                        ipAddress: '127.0.0.1',
                        requestPayload: JSON.stringify({ leagueId: parseInt(leagueId) }),
                        componentName: 'careermode'
                    })
                },
                {
                    headers: {
                        'Accept': 'application/json',
                        'X-BLAZE-ID': 'madden-2025-ps5-gen5',
                        'X-BLAZE-VOID-RESP': 'XML',
                        'X-Application-Key': 'MADDEN-MCA',
                        'Content-Type': 'application/json'
                    }
                }
            );

            return processResponse.data;

        } catch (error) {
            console.error('WAL/Blaze CFM access failed:', error.response?.data || error.message);
            console.log('🔄 Falling back to mock data for development...');

            // Fallback to mock data
            return {
                teams: this.generateMockTeamData(leagueId),
                _note: 'Mock data - Real CFM access requires WAL/Blaze system authentication',
                _error: error.message
            };
        }
    }

    // Generate realistic mock team data for demonstration
    generateMockTeamData(leagueId) {
        const nflTeams = [
            { id: 1, name: 'Buffalo Bills', abbreviation: 'BUF', city: 'Buffalo' },
            { id: 2, name: 'Miami Dolphins', abbreviation: 'MIA', city: 'Miami' },
            { id: 3, name: 'New England Patriots', abbreviation: 'NE', city: 'New England' },
            { id: 4, name: 'New York Jets', abbreviation: 'NYJ', city: 'New York' },
            { id: 5, name: 'Baltimore Ravens', abbreviation: 'BAL', city: 'Baltimore' },
            { id: 6, name: 'Cincinnati Bengals', abbreviation: 'CIN', city: 'Cincinnati' },
            { id: 7, name: 'Cleveland Browns', abbreviation: 'CLE', city: 'Cleveland' },
            { id: 8, name: 'Pittsburgh Steelers', abbreviation: 'PIT', city: 'Pittsburgh' }
        ];

        return nflTeams.map(team => ({
            teamId: team.id,
            displayName: team.name,
            cityName: team.city,
            teamName: team.name.split(' ').pop(),
            abbrName: team.abbreviation,
            logoId: team.id,
            primaryColor: '#000000',
            secondaryColor: '#FFFFFF',
            wins: Math.floor(Math.random() * 10),
            losses: Math.floor(Math.random() * 10),
            ties: 0,
            divisionId: Math.floor(team.id / 4) + 1,
            conferenceId: team.id <= 16 ? 0 : 1, // AFC/NFC
            _mockData: true
        }));
    }

    // Get draft class data
    async getDraftClass(userId, year = 2026) {
        const token = await this.getValidToken(userId);
        if (!token) throw new Error('No valid EA Sports token found. Please authenticate first.');

        try {
            // First get the user's PID
            const personasResponse = await axios.get(
                'https://gateway.ea.com/proxy/identity/pids/me',
                {
                    headers: {
                        'Authorization': `${token.token_type} ${token.access_token}`,
                        'Accept': 'application/json'
                    }
                }
            );

            const pid = personasResponse.data.pid.pidId;

            // Now get the draft class using the correct CFM endpoint
            const response = await axios.get(`${this.apiURL}/pids/${pid}/cfm/draft-classes/${year}`, {
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
