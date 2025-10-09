# Example Workflow: Adding a New Command

This guide walks through creating a new command from start to finish.

## Scenario: Add a `/hello` command for staff

### Step 1: Create the Command File

Create `src/commands/staff/hello.js`:

```javascript
import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Say hello to the bot!');

export async function execute(interaction) {
    await interaction.reply({
        content: `👋 Hello, ${interaction.user.username}!`,
        flags: 64 // Ephemeral - only visible to user
    });
}
```

### Step 2: Deploy the Command

```bash
npm run deploy
```

You should see output like:
```
✅ Loaded staff/hello.js
📊 Loaded 28 commands total
🚀 Deploying commands to Discord...
✅ Successfully registered 28 application commands!
```

### Step 3: Restart the Bot

```bash
npm start
```

Or with auto-reload during development:
```bash
npm run dev
```

### Step 4: Test in Discord

1. Type `/hello` in your Discord server
2. The command should appear in the autocomplete
3. Execute it and verify you get the greeting

### Step 5: Add Features

Let's add an optional name parameter:

```javascript
import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Say hello to the bot!')
    .addStringOption(option =>
        option.setName('name')
            .setDescription('Name to greet')
            .setRequired(false));

export async function execute(interaction) {
    const name = interaction.options.getString('name') || interaction.user.username;
    
    await interaction.reply({
        content: `👋 Hello, ${name}!`,
        flags: 64
    });
}
```

### Step 6: Re-deploy and Test

```bash
npm run deploy
npm run dev
```

Test with both:
- `/hello` (should use your username)
- `/hello name:World` (should say "Hello, World!")

## Example: Adding an Interaction Handler

### Scenario: Add a button that says "Clicked!"

#### Step 1: Add Button to Command

Update your command to include a button:

```javascript
import { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Say hello with a button!');

export async function execute(interaction) {
    const button = new ButtonBuilder()
        .setCustomId('hello_button')
        .setLabel('Click Me!')
        .setStyle(ButtonStyle.Primary);
    
    const row = new ActionRowBuilder()
        .addComponents(button);
    
    await interaction.reply({
        content: '👋 Hello! Click the button:',
        components: [row]
    });
}
```

#### Step 2: Create Interaction Handler

Create `src/interactions/hello_button.js`:

```javascript
export const customId = "hello_button";

export async function execute(interaction) {
    await interaction.reply({
        content: `🎉 Button clicked by ${interaction.user.username}!`,
        flags: 64 // Ephemeral
    });
}
```

#### Step 3: Restart and Test

The interaction handlers are loaded automatically on bot start:

```bash
npm run dev
```

Test:
1. Run `/hello` in Discord
2. Click the "Click Me!" button
3. Verify you get the clicked message

## Common Patterns

### Defer Long Operations

For operations that take more than 3 seconds:

```javascript
export async function execute(interaction) {
    // Defer immediately
    await interaction.deferReply({ flags: 64 });
    
    // Do long operation
    await someLongOperation();
    
    // Send result
    await interaction.editReply('Done!');
}
```

### Access League Data

```javascript
import fs from 'fs';
import path from 'path';

export async function execute(interaction) {
    const seasonFile = path.join(process.cwd(), 'data/2k/season.json');
    const season = JSON.parse(fs.readFileSync(seasonFile, 'utf8'));
    
    await interaction.reply(`Current week: ${season.currentWeek}`);
}
```

### Check User Roles

```javascript
export async function execute(interaction) {
    const member = interaction.member;
    const hasStaffRole = member.roles.cache.some(role => 
        ['Admin', 'Commish'].includes(role.name)
    );
    
    if (!hasStaffRole) {
        await interaction.reply({
            content: '❌ This command is for staff only!',
            flags: 64
        });
        return;
    }
    
    // Continue with staff-only logic
}
```

### Create Embeds

```javascript
import { EmbedBuilder } from 'discord.js';

export async function execute(interaction) {
    const embed = new EmbedBuilder()
        .setColor(0x1f8b4c) // Green
        .setTitle('League Stats')
        .setDescription('Current season information')
        .addFields(
            { name: 'Week', value: '5', inline: true },
            { name: 'Games Played', value: '150', inline: true }
        )
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}
```

## Debugging Tips

### Log Values

```javascript
console.log(`User: ${interaction.user.username}`);
console.log(`Options:`, interaction.options.data);
```

### Handle Errors

```javascript
export async function execute(interaction) {
    try {
        // Your logic
        await interaction.reply('Success!');
    } catch (error) {
        console.error('Error in hello command:', error);
        
        const errorMsg = 'Something went wrong!';
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(errorMsg);
        } else {
            await interaction.reply({ content: errorMsg, flags: 64 });
        }
    }
}
```

### Test Edge Cases

- Empty/invalid inputs
- Missing permissions
- Non-existent roles or channels
- Concurrent operations
- Missing data files

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/add-hello-command

# Make changes and test

# Commit
git add src/commands/staff/hello.js
git commit -m "Add /hello command for staff"

# Push
git push origin feature/add-hello-command

# Create PR on GitHub
```

## Next Steps

- Check [CONTRIBUTING.md](../CONTRIBUTING.md) for code guidelines
- See [DEVELOPMENT.md](DEVELOPMENT.md) for API reference
- Browse existing commands for more examples
- Join the Discord server to test your changes

---

Happy coding! 🏀
