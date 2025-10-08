import axios from 'axios';
import express from 'express';
import open from 'open';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EASportsAPI {
    constructor() {
        this.baseURL = process.env.EA_BASE_URL || 'https://www.ea.com';
        this.apiURL = process.env.EA_API_URL || 'https://api.ea.com';
        this.clientId = process.env.EA_CLIENT_ID || 'MADDEN_WEB_CLIENT';
        this.clientSecret = process.env.EA_CLIENT_SECRET || 'EA_CLIENT_SECRET';
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

    // Start OAuth flow - exactly like snallabot
    async startAuthFlow(userId) {
        const state = uuidv4();
        const callbackPort = 3000;
        
        // EA Sports OAuth parameters (these are typical EA OAuth params)
        const authParams = new URLSearchParams({
            client_id: this.clientId,
            response_type: 'code',
            redirect_uri: `http://127.0.0.1:${callbackPort}/callback`,
            scope: 'basic.identity offline basic.entitlement',
            state: state,
            locale: 'en_US'
        });

        const authURL = `${this.baseURL}/connect/auth?${authParams.toString()}`;

        return new Promise((resolve, reject) => {
            // Create callback server exactly like snallabot
            const app = express();
            
            app.get('/callback', async (req, res) => {
                const { code, state: returnedState } = req.query;
                
                if (returnedState !== state) {
                    res.send(`
                        <html>
                            <body style="font-family: Arial, sans-serif; padding: 20px;">
                                <h2>❌ Authentication Error</h2>
                                <p>Invalid state parameter. Please try again.</p>
                            </body>
                        </html>
                    `);
                    return reject(new Error('Invalid state parameter'));
                }

                if (code) {
                    try {
                        // Exchange code for token
                        const token = await this.exchangeCodeForToken(code, callbackPort);
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
                                </body>
                            </html>
                        `);
                        server.close();
                        reject(error);
                    }
                } else {
                    res.send(`
                        <html>
                            <body style="font-family: Arial, sans-serif; padding: 20px;">
                                <h2>❌ Authentication Cancelled</h2>
                                <p>Authorization was cancelled or failed. Please try again.</p>
                            </body>
                        </html>
                    `);
                    server.close();
                    reject(new Error('Authorization cancelled'));
                }
            });

            const server = app.listen(callbackPort, () => {
                console.log(`EA OAuth callback server running on port ${callbackPort}`);
                // Open browser to EA login - exactly like snallabot
                open(authURL);
            });

            // Timeout after 5 minutes
            setTimeout(() => {
                server.close();
                reject(new Error('Authentication timeout'));
            }, 300000);
        });
    }

    // Exchange authorization code for access token
    async exchangeCodeForToken(code, callbackPort) {
        const tokenParams = {
            client_id: this.clientId,
            client_secret: this.clientSecret,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: `http://127.0.0.1:${callbackPort}/callback`
        };

        try {
            const response = await axios.post(`${this.apiURL}/connect/token`, tokenParams, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                }
            });

            return {
                access_token: response.data.access_token,
                refresh_token: response.data.refresh_token,
                expires_at: Date.now() + (response.data.expires_in * 1000),
                token_type: response.data.token_type || 'Bearer'
            };
        } catch (error) {
            console.error('Token exchange failed:', error.response?.data || error.message);
            throw new Error('Failed to exchange authorization code for token');
        }
    }

    // Get user's Madden leagues
    async getUserLeagues(userId) {
        const token = await this.getValidToken(userId);
        if (!token) throw new Error('No valid EA Sports token found. Please authenticate first.');

        try {
            const response = await axios.get(`${this.apiURL}/madden/leagues`, {
                headers: {
                    'Authorization': `${token.token_type} ${token.access_token}`,
                    'Accept': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Failed to get user leagues:', error.response?.data || error.message);
            throw error;
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
        const token = this.tokens.get(userId);
        if (!token) return null;

        // Check if token is expired
        if (Date.now() >= token.expires_at) {
            try {
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

        return token;
    }

    // Refresh expired token
    async refreshToken(refreshToken) {
        const tokenParams = {
            client_id: this.clientId,
            client_secret: this.clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        };

        try {
            const response = await axios.post(`${this.apiURL}/connect/token`, tokenParams, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                }
            });

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
}

export default EASportsAPI;
