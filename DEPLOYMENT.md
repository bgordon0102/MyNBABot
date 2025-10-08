# LEAGUEbuddy Discord Bot - Test Environment

## Environment Variables for Railway

Copy these to your Railway project's Variables section:

```
TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_application_client_id_here
GUILD_ID=your_test_server_guild_id_here
```

## Quick Setup Commands

1. **Deploy commands locally** (run this first):
   ```bash
   # Create .env file with your actual values
   echo "TOKEN=your_actual_token" > .env
   echo "CLIENT_ID=your_actual_client_id" >> .env
   echo "GUILD_ID=your_actual_guild_id" >> .env
   
   # Install dependencies
   npm install
   
   # Deploy commands to Discord
   npm run deploy
   ```

2. **Test locally**:
   ```bash
   npm start
   ```

3. **Deploy to Railway**:
   - Push to GitHub
   - Railway will auto-deploy
   - Commands should already be registered from step 1

## Testing Checklist

- [ ] Bot appears online in your test server
- [ ] Slash commands are available (type `/` to see them)
- [ ] Staff commands work (if you have staff role)
- [ ] Coach commands work (if you have coach role)
- [ ] Data files are being created/updated properly

## Troubleshooting

- Check Railway logs if bot isn't starting
- Verify environment variables are set correctly
- Make sure bot has proper permissions in test server
- Check Discord Developer Portal for any API issues
