import axios from 'axios';
import logger from './logger.js';
import express from 'express';
import open from 'open';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// EA Sports API Constants
const AUTH_SOURCE = 317239;
const CLIENT_SECRET = "wfGAWnrxLroZOwwELYA2ZrAuaycuF2WDb00zOLv48Sb79viJDGlyD6OyK8pM5eIiv_20240731135155";
const REDIRECT_URL = "http://127.0.0.1/success";
const CLIENT_ID = "MCA_25_COMP_APP";
const MACHINE_KEY = "444d362e8e067fe2";
const EA_LOGIN_URL = `https://accounts.ea.com/connect/auth?hide_create=true&release_type=prod&response_type=code&redirect_uri=${REDIRECT_URL}&client_id=${CLIENT_ID}&machineProfileKey=${MACHINE_KEY}&authentication_source=${AUTH_SOURCE}`;

class EASportsAPI {
    static logToFile(message) {
        logger.debug(message);
    }

    constructor() {
        this.tokens = new Map();
        this.tokenFilePath = path.join(__dirname, '../../data/ea_tokens.json');
        this.apiURL = 'https://gateway.ea.com/proxy/identity';
        this.loadTokens();
        EASportsAPI.logToFile('[EA DEBUG] EASportsAPI instance created. Logger test.');
    }

    loadTokens() {
        try {
            if (fs.existsSync(this.tokenFilePath)) {
                const data = fs.readFileSync(this.tokenFilePath, 'utf8');
                const tokenData = JSON.parse(data);
                const validEntries = Object.entries(tokenData).filter(([key]) => key && key !== 'undefined');
                this.tokens = new Map(validEntries);
                EASportsAPI.logToFile(`[EA DEBUG] Loaded ${this.tokens.size} valid EA Sports tokens`);
            }
        } catch (error) {
            EASportsAPI.logToFile(`[EA DEBUG] Error loading EA tokens: ${error}`);
        }
    }

    saveTokens() {
        try {
            const validEntries = Array.from(this.tokens.entries()).filter(([key]) => key && key !== 'undefined');
            const tokenData = Object.fromEntries(validEntries);
            fs.writeFileSync(this.tokenFilePath, JSON.stringify(tokenData, null, 2));
            EASportsAPI.logToFile(`[EA DEBUG] Saved ${validEntries.length} valid EA Sports tokens`);
        } catch (error) {
            EASportsAPI.logToFile(`[EA DEBUG] Error saving EA tokens: ${error}`);
        }
    }

    async saveToken(discordUserId, token) {
        if (!discordUserId || discordUserId === 'undefined') {
            EASportsAPI.logToFile(`[EA DEBUG] Refusing to save EA token: Missing or invalid Discord user ID`);
            return;
        }
        this.tokens.set(discordUserId, token);
        this.saveTokens();
        EASportsAPI.logToFile(`[EA DEBUG] Token saved for Discord user: ${discordUserId}`);
    }

    getToken(discordUserId) {
        if (!discordUserId || discordUserId === 'undefined') {
            EASportsAPI.logToFile(`[EA DEBUG] Refusing to get EA token: Missing or invalid Discord user ID`);
            return null;
        }
        return this.tokens.get(discordUserId) || null;
    }

    generateLoginUrl() {
        return EA_LOGIN_URL;
    }

    async startAuthFlow(userId) {
        const callbackPort = 3000;
        return new Promise((resolve, reject) => {
            const app = express();
            app.use(express.urlencoded({ extended: true }));
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
                const rawCode = req.body.code;
                const code = new URLSearchParams(rawCode.substring(rawCode.indexOf("?"))).get("code");
                if (!code) {
                    res.status(400).send('Invalid code URL');
                    return;
                }
                try {
                    const token = await this.exchangeCodeForToken(code);
                    await this.saveToken(userId, token);
                    res.send('<h2>✅ Successfully Connected to EA Sports!</h2>');
                    server.close();
                    resolve({ success: true });
                } catch (error) {
                    res.send(`<h2>❌ Authentication Error</h2><p>${error.message}</p>`);
                    server.close();
                    reject(error);
                }
            });
            const server = app.listen(callbackPort, () => {
                open(EA_LOGIN_URL);
            });
            setTimeout(() => {
                server.close();
                reject(new Error('Authentication timeout'));
            }, 300000);
        });
    }

    async exchangeCodeForToken(code) {
        EASportsAPI.logToFile(`[EA DEBUG] Exchanging code for token: ${code}`);
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
            EASportsAPI.logToFile(`[EA DEBUG] Token exchange response: ${JSON.stringify(response.data)}`);
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
            EASportsAPI.logToFile(`[EA DEBUG] Token exchange error: ${error.message}`);
            throw new Error(`Failed to exchange authorization code for token: ${error.message}`);
        }
    }

    async refreshToken(refreshToken) {
        EASportsAPI.logToFile(`[EA DEBUG] Refreshing token: ${refreshToken}`);
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
            EASportsAPI.logToFile(`[EA DEBUG] Token refresh response: ${JSON.stringify(response.data)}`);
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
            EASportsAPI.logToFile(`[EA DEBUG] Token refresh error: ${error.message}`);
            throw error;
        }
    }

    async getValidToken(userId) {
        const token = this.tokens.get(userId);
        if (!token) return null;
        const expiresAt = token.expires_at || token.expiresAt;
        if (expiresAt && Date.now() >= expiresAt) {
            try {
                const newToken = await this.refreshToken(token.refresh_token);
                this.tokens.set(userId, newToken);
                this.saveTokens();
                return newToken;
            } catch (error) {
                this.tokens.delete(userId);
                this.saveTokens();
                return null;
            }
        }
        return token;
    }

    isAuthenticated(userId) {
        return this.tokens.has(userId);
    }

    disconnect(userId) {
        this.tokens.delete(userId);
        this.saveTokens();
    }

    async getSessionKey(token) {
        try {
            EASportsAPI.logToFile(`[EA DEBUG] getSessionKey called with token: ${JSON.stringify(token)}`);
            const walAuthResponse = await axios.post(
                'https://wal2.tools.gos.bio-iad.ea.com/wal/authentication/login',
                { authCode: token.access_token },
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
            EASportsAPI.logToFile(`[EA DEBUG] getSessionKey response: ${JSON.stringify(walAuthResponse.data)}`);
            return walAuthResponse.data.userLoginInfo.sessionKey;
        } catch (error) {
            EASportsAPI.logToFile(`[EA ERROR] getSessionKey failed: ${error.message}`);
            throw error;
        }
    }

    // Persona cache and fallback
    static personaCache = new Map();
    static defaultPersona = { id: 'unknown', name: 'Unknown', leagues: [] };
    static getPersona(discordUserId) {
        return EASportsAPI.personaCache.get(discordUserId) || EASportsAPI.defaultPersona;
    }
    static async walBlazeRequest(endpoint, payload, token, sessionKey, retries = 3, backoff = 200) {
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const now = Math.floor(Date.now() / 1000);
                const requestPayload = {
                    deviceId: 'LEAGUEbuddy',
                    componentId: 'LEAGUEbuddy',
                    componentName: 'LEAGUEbuddy',
                    messageAuthData: token.access_token,
                    messageExpirationTime: now + 300,
                    authData: token.access_token,
                    authCode: sessionKey,
                    requestPayload: JSON.stringify(payload || {})
                };
                const response = await axios.post(endpoint, requestPayload, {
                    headers: {
                        'Accept': 'application/json',
                        'X-BLAZE-ID': 'madden-2026-ps5-gen5',
                        'X-BLAZE-VOID-RESP': 'XML',
                        'X-Application-Key': 'MADDEN26-MCA',
                        'Content-Type': 'application/json',
                        'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031)'
                    }
                });
                return response.data;
            } catch (err) {
                if (attempt < retries - 1 && (err.response?.status === 429 || err.response?.status === 500 || err.code === 'ECONNRESET')) {
                    await new Promise(res => setTimeout(res, backoff * Math.pow(2, attempt)));
                    continue;
                }
                throw err;
            }
        }
    }
    async fetchAllTeamRosters(userId, leagueId, teamIds, token, sessionKey) {
        const results = {};
        const concurrency = 3;
        let idx = 0;
        async function nextBatch() {
            const batch = teamIds.slice(idx, idx + concurrency);
            await Promise.all(batch.map(async teamId => {
                results[teamId] = await EASportsAPI.walBlazeRequest('Mobile_GetTeamRoster', { teamId, leagueId }, token, sessionKey);
            }));
            idx += concurrency;
            if (idx < teamIds.length) {
                await new Promise(res => setTimeout(res, 100)); // 100ms stagger
                await nextBatch();
            }
        }
        await nextBatch();
        return results;
    }
    async fetchTeams(userId, leagueId) {
        const token = await this.getValidToken(userId);
        const persona = EASportsAPI.getPersona(userId);
        if (persona === EASportsAPI.defaultPersona) {
            EASportsAPI.logToFile(`[EA DEBUG] Persona fallback used for userId: ${userId}`);
        }
        EASportsAPI.logToFile(`[EA DEBUG] fetchTeams called for userId: ${userId}, leagueId: ${leagueId}, token: ${JSON.stringify(token)}, persona: ${JSON.stringify(persona)}`);
        const sessionKey = await this.getSessionKey(token);
        const payload = { leagueId, includeTeamData: true };
        const result = await EASportsAPI.walBlazeRequest('https://wal3.tools.gos.bio-iad.ea.com/wal/mca/Process/' + sessionKey, payload, token, sessionKey);
        if (persona === EASportsAPI.defaultPersona) {
            result.personaStatus = 'fallback';
        }
        return result;
    }
    async fetchTeamRoster(userId, leagueId, teamId) {
        const token = await this.getValidToken(userId);
        const persona = EASportsAPI.getPersona(userId);
        if (persona === EASportsAPI.defaultPersona) {
            EASportsAPI.logToFile(`[EA DEBUG] Persona fallback used for userId: ${userId}`);
        }
        EASportsAPI.logToFile(`[EA DEBUG] fetchTeamRoster called for userId: ${userId}, leagueId: ${leagueId}, teamId: ${teamId}, token: ${JSON.stringify(token)}, persona: ${JSON.stringify(persona)}`);
        const sessionKey = await this.getSessionKey(token);
        const payload = { leagueId, teamId };
        const result = await EASportsAPI.walBlazeRequest('https://wal3.tools.gos.bio-iad.ea.com/wal/mca/Process/' + sessionKey, payload, token, sessionKey);
        if (persona === EASportsAPI.defaultPersona) {
            result.personaStatus = 'fallback';
        }
        return result;
    }
    async fetchSchedule(userId, leagueId) {
        const token = await this.getValidToken(userId);
        const persona = EASportsAPI.getPersona(userId);
        if (persona === EASportsAPI.defaultPersona) {
            EASportsAPI.logToFile(`[EA DEBUG] Persona fallback used for userId: ${userId}`);
        }
        EASportsAPI.logToFile(`[EA DEBUG] fetchSchedule called for userId: ${userId}, leagueId: ${leagueId}, token: ${JSON.stringify(token)}, persona: ${JSON.stringify(persona)}`);
        const sessionKey = await this.getSessionKey(token);
        const payload = { leagueId };
        const result = await EASportsAPI.walBlazeRequest('https://wal3.tools.gos.bio-iad.ea.com/wal/mca/Process/' + sessionKey, payload, token, sessionKey);
        if (persona === EASportsAPI.defaultPersona) {
            result.personaStatus = 'fallback';
        }
        return result;
    }
    async fetchPlayoffs(userId, leagueId) {
        const token = await this.getValidToken(userId);
        const persona = EASportsAPI.getPersona(userId);
        if (persona === EASportsAPI.defaultPersona) {
            EASportsAPI.logToFile(`[EA DEBUG] Persona fallback used for userId: ${userId}`);
        }
        EASportsAPI.logToFile(`[EA DEBUG] fetchPlayoffs called for userId: ${userId}, leagueId: ${leagueId}, token: ${JSON.stringify(token)}, persona: ${JSON.stringify(persona)}`);
        const sessionKey = await this.getSessionKey(token);
        const payload = { leagueId };
        const result = await EASportsAPI.walBlazeRequest('https://wal3.tools.gos.bio-iad.ea.com/wal/mca/Process/' + sessionKey, payload, token, sessionKey);
        if (persona === EASportsAPI.defaultPersona) {
            result.personaStatus = 'fallback';
        }
        return result;
    }
    async fetchFreeAgents(userId, leagueId) {
        const token = await this.getValidToken(userId);
        const persona = EASportsAPI.getPersona(userId);
        if (persona === EASportsAPI.defaultPersona) {
            EASportsAPI.logToFile(`[EA DEBUG] Persona fallback used for userId: ${userId}`);
        }
        EASportsAPI.logToFile(`[EA DEBUG] fetchFreeAgents called for userId: ${userId}, leagueId: ${leagueId}, token: ${JSON.stringify(token)}, persona: ${JSON.stringify(persona)}`);
        const sessionKey = await this.getSessionKey(token);
        const payload = { leagueId, returnFreeAgents: true };
        const result = await EASportsAPI.walBlazeRequest('https://wal3.tools.gos.bio-iad.ea.com/wal/mca/Process/' + sessionKey, payload, token, sessionKey);
        if (persona === EASportsAPI.defaultPersona) {
            result.personaStatus = 'fallback';
        }
        return result;
    }
    async fetchWeeklyStats(userId, leagueId, statType, week) {
        const token = await this.getValidToken(userId);
        const persona = EASportsAPI.getPersona(userId);
        if (persona === EASportsAPI.defaultPersona) {
            EASportsAPI.logToFile(`[EA DEBUG] Persona fallback used for userId: ${userId}`);
        }
        EASportsAPI.logToFile(`[EA DEBUG] fetchWeeklyStats called for userId: ${userId}, leagueId: ${leagueId}, statType: ${statType}, week: ${week}, token: ${JSON.stringify(token)}, persona: ${JSON.stringify(persona)}`);
        const sessionKey = await this.getSessionKey(token);
        // Stat command mapping
        const statCommandMap = {
            passing: { commandName: 'Mobile_GetWeeklyPassingStats', commandId: 803 },
            rushing: { commandName: 'Mobile_GetWeeklyRushingStats', commandId: 804 },
            receiving: { commandName: 'Mobile_GetWeeklyReceivingStats', commandId: 805 },
            defense: { commandName: 'Mobile_GetWeeklyDefensiveStats', commandId: 806 },
            punting: { commandName: 'Mobile_GetWeeklyPuntingStats', commandId: 807 },
            kicking: { commandName: 'Mobile_GetWeeklyKickingStats', commandId: 808 },
            teamStats: { commandName: 'Mobile_GetWeeklyTeamStats', commandId: 809 }
        };
        const statCmd = statCommandMap[statType];
        if (!statCmd) throw new Error('Invalid stat type');
        const payload = { leagueId, week, statType: statCmd.commandName };
        const result = await EASportsAPI.walBlazeRequest('https://wal3.tools.gos.bio-iad.ea.com/wal/mca/Process/' + sessionKey, payload, token, sessionKey);
        if (persona === EASportsAPI.defaultPersona) {
            result.personaStatus = 'fallback';
        }
        return result;
    }
}

export { EASportsAPI };
export default EASportsAPI;
