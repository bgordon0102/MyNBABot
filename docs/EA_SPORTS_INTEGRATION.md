# EA Sports Integration for LEAGUEbuddy

This integration allows LEAGUEbuddy to connect with EA Sports accounts to import Madden league data, player ratings, and draft classes directly from EA's servers.

## How It Works

LEAGUEbuddy uses the same OAuth flow as snallabot and other EA Sports integrations:

### 1. Authentication Flow
- User runs `/ea connect` in Discord
- LEAGUEbuddy opens a browser to EA Sports login page
- User logs in with their normal EA account credentials
- EA redirects to `http://127.0.0.1:3000/callback` (localhost)
- LEAGUEbuddy captures the authentication token
- Connection is established automatically

### 2. Security
- **No credentials stored**: LEAGUEbuddy never stores your EA username/password
- **Token-based**: Only secure OAuth tokens are stored locally
- **Automatic refresh**: Tokens are refreshed automatically when they expire
- **Local callback**: Authentication happens entirely on your local machine

### 3. Data Access
Once connected, LEAGUEbuddy can:
- Import league rosters and team data
- Pull player ratings and stats
- Import draft classes by year
- Sync league schedules and standings

## Available Commands

### `/ea connect`
Initiates the EA Sports authentication flow. Opens your browser to EA's login page.

**Steps:**
1. Run the command in Discord
2. Complete login in the opened browser
3. Wait for the success message
4. Return to Discord - you're connected!

### `/ea status`
Check if your EA Sports account is connected and see available actions.

### `/ea sync`
Import league data from your connected EA Sports account.

### `/ea draft [year]`
Import a specific draft class year (defaults to 2026).

### `/ea disconnect`
Remove the connection between LEAGUEbuddy and your EA Sports account.

## Setup Requirements

### Environment Variables
Add these to your `.env` file:
```
EA_CLIENT_ID=your_ea_client_id
EA_CLIENT_SECRET=your_ea_client_secret
EA_BASE_URL=https://www.ea.com
EA_API_URL=https://api.ea.com
```

### Node.js Dependencies
```bash
npm install axios express open uuid
```

### Port Requirements
- LEAGUEbuddy uses port 3000 for OAuth callbacks
- Make sure this port is available when connecting

## File Structure

```
src/
├── utils/
│   └── eaSportsAPI.js          # Main EA Sports API integration
└── commands/
    └── staff/
        └── ea.js               # Discord command interface

data/
└── ea_tokens.json              # Encrypted token storage
```

## Integration with LEAGUEbuddy Features

### Draft Classes
- EA draft classes can be imported and saved to your draft class folders
- Automatic mapping between EA player data and LEAGUEbuddy format
- Support for multiple draft class years

### Team Management  
- Import real team rosters from EA Sports
- Sync player ratings and attributes
- Update team data automatically

### League Operations
- Pull league schedules and matchups
- Import game results and standings
- Sync playoff brackets

## Troubleshooting

### Connection Issues
- **"Authentication timeout"**: The login process took too long. Try again.
- **"Invalid state parameter"**: Browser security issue. Clear cookies and retry.
- **"Token exchange failed"**: EA's servers may be down. Try again later.

### Common Problems
- **Port 3000 in use**: Make sure no other applications are using port 3000
- **Browser doesn't open**: Manually navigate to the provided URL
- **Connection expires**: Tokens refresh automatically, but you may need to reconnect periodically

### Permission Issues
- Make sure your EA account has access to the leagues you want to import
- Some EA data may require specific game ownership or league membership

## Development Notes

### API Endpoints
The integration uses these EA Sports API endpoints:
- `/connect/auth` - OAuth authorization
- `/connect/token` - Token exchange and refresh  
- `/madden/leagues` - User's Madden leagues
- `/madden/leagues/{id}/teams` - League roster data
- `/madden/draft-classes/{year}` - Draft class data

### OAuth Flow Details
1. **Authorization Request**: Redirect to EA with client_id, redirect_uri, scope
2. **User Consent**: User logs in and grants permissions
3. **Authorization Code**: EA redirects with temporary code
4. **Token Exchange**: Exchange code for access/refresh tokens
5. **API Access**: Use access token for authenticated requests
6. **Token Refresh**: Use refresh token when access token expires

### Rate Limiting
- EA Sports APIs have rate limits (typically 100 requests/hour)
- LEAGUEbuddy implements automatic retry with exponential backoff
- Tokens are cached and reused to minimize API calls

## Legal & Compliance

- This integration uses EA Sports' official OAuth system
- No reverse engineering or unauthorized access
- Complies with EA's Terms of Service for API access
- Users must have valid EA Sports accounts and game licenses
