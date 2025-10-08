// EA Token Refresher Utility
// Automatically refreshes EA access_token using refresh_token
// Run this on bot startup or periodically to keep tokens fresh

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tokenFilePath = path.join(__dirname, '../../data/ea_tokens.json');
const EA_TOKEN_URL = 'https://accounts.ea.com/connect/token';
const CLIENT_ID = 'MCA_25_COMP_APP';
const CLIENT_SECRET = 'wfGAWnrxLroZOwwELYA2ZrAuaycuF2WDb00zOLv48Sb79viJDGlyD6OyK8pM5eIiv_20240731135155';

function loadTokens() {
    if (!fs.existsSync(tokenFilePath)) return null;
    const data = fs.readFileSync(tokenFilePath, 'utf8');
    return JSON.parse(data);
}

function saveTokens(tokens) {
    fs.writeFileSync(tokenFilePath, JSON.stringify(tokens, null, 2));
}

async function refreshEaToken(userId) {
    const tokens = loadTokens();
    if (!tokens || !tokens[userId]) {
        console.error('No tokens found for user:', userId);
        return null;
    }
    const { refresh_token } = tokens[userId];
    if (!refresh_token) {
        console.error('No refresh_token found for user:', userId);
        return null;
    }
    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('refresh_token', refresh_token);
        params.append('client_id', CLIENT_ID);
        params.append('client_secret', CLIENT_SECRET);
        const response = await axios.post(EA_TOKEN_URL, params);
        const newTokens = response.data;
        tokens[userId] = newTokens;
        saveTokens(tokens);
        console.log('EA token refreshed for user:', userId);
        return newTokens;
    } catch (error) {
        console.error('Failed to refresh EA token:', error.response?.data || error.message);
        return null;
    }
}

// Example usage: refresh token for all users in ea_tokens.json
async function refreshAllEaTokens() {
    const tokens = loadTokens();
    if (!tokens) return;
    for (const userId of Object.keys(tokens)) {
        await refreshEaToken(userId);
    }
}

// Uncomment to run refresher on startup
// refreshAllEaTokens();

export { refreshEaToken, refreshAllEaTokens };
