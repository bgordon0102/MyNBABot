# Development Guide

## Quick Reference

### Command Structure

Every Discord slash command needs these exports:

```javascript
export const data = new SlashCommandBuilder()
    .setName('commandname')
    .setDescription('Description');

export async function execute(interaction) {
    // Your command logic
}
```

### Interaction Handler Structure

For buttons, select menus, modals:

```javascript
export const customId = "interaction_id";

export async function execute(interaction) {
    // Your interaction logic
}
```

## File Organization

### Commands
- **Staff Commands**: `src/commands/staff/` - Admin/moderation commands
- **Coach Commands**: `src/commands/coach/` - Team management commands

### Interactions
- `src/interactions/` - Button clicks, select menus, modal submissions

### Data Storage
- `data/2k/` - NBA 2K league data (season info, standings, schedules)
- `data/*.json` - League configuration

## Common Patterns

### Replying to Interactions

```javascript
// Simple reply
await interaction.reply('Message');

// Ephemeral reply (only visible to user)
await interaction.reply({ content: 'Message', flags: 64 });

// Deferred reply (for long operations)
await interaction.deferReply();
// ... do work ...
await interaction.editReply('Done!');
```

### Embed Messages

```javascript
import { EmbedBuilder } from 'discord.js';

const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('Title')
    .setDescription('Description')
    .addFields(
        { name: 'Field', value: 'Value', inline: true }
    );

await interaction.reply({ embeds: [embed] });
```

### Reading/Writing JSON Data

```javascript
import fs from 'fs';
import path from 'path';

// Read
const data = JSON.parse(fs.readFileSync('./data/file.json', 'utf8'));

// Write
fs.writeFileSync('./data/file.json', JSON.stringify(data, null, 2));
```

### Role-Based Access Control

```javascript
const member = interaction.member;
const hasStaffRole = member.roles.cache.some(role => 
    ['Admin', 'Commish', 'Schedule Tracker'].includes(role.name)
);

if (!hasStaffRole) {
    await interaction.reply({ 
        content: 'Staff only!', 
        flags: 64 
    });
    return;
}
```

## Testing Commands

1. **Deploy to Discord**
   ```bash
   npm run deploy
   ```

2. **Restart the bot**
   ```bash
   npm start
   # or for auto-reload
   npm run dev
   ```

3. **Test in Discord**
   - Type `/` in Discord to see your commands
   - Test with valid and invalid inputs
   - Check console for errors

## Debugging Tips

### Enable Verbose Logging
The bot logs command execution in console:
- `🔄` - Command started
- `✅` - Command completed successfully
- `❌` - Command error

### Common Issues

**Command not showing in Discord**
- Run `npm run deploy` to register commands
- Wait a few minutes for Discord to update
- Check CLIENT_ID and GUILD_ID in .env

**Cannot read property 'cache' of undefined**
- Ensure you're testing in a guild (server), not DMs
- Check that the bot has proper permissions

**JSON parsing errors**
- Validate JSON syntax with a linter
- Ensure UTF-8 encoding
- Check for trailing commas

## Code Quality

### Before Committing
1. ✅ No syntax errors: `node --check yourfile.js`
2. ✅ Test the command/interaction in Discord
3. ✅ Check console for warnings/errors
4. ✅ Verify existing commands still work

### Good Practices
- ✅ Use descriptive variable names
- ✅ Add comments for complex logic
- ✅ Handle errors gracefully
- ✅ Test edge cases
- ✅ Keep functions focused and small

## Environment Variables

Required in `.env`:
```
TOKEN=your_discord_bot_token
CLIENT_ID=your_application_client_id
GUILD_ID=your_server_guild_id
```

Get these from:
- [Discord Developer Portal](https://discord.com/developers/applications)

## Resources

- [Discord.js Guide](https://discordjs.guide/)
- [Discord.js Documentation](https://discord.js.org/)
- [Discord Developer Portal](https://discord.com/developers/docs/)
- [Node.js Documentation](https://nodejs.org/docs/)

---

Need more help? Check [CONTRIBUTING.md](../CONTRIBUTING.md) or open an issue!
