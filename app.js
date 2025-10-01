import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Discord client
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] 
});

// Initialize commands collection
client.commands = new Collection();

// Get current directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to dynamically load all commands
async function loadCommands() {
    const commandFolders = ['staff', 'coach'];
    
    for (const folder of commandFolders) {
        const commandsPath = join(__dirname, 'src', 'commands', folder);
        const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            const filePath = join(commandsPath, file);
            const fileURL = pathToFileURL(filePath).href;
            
            try {
                const command = await import(fileURL);
                
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    console.log(`✅ Loaded ${folder} command: ${command.data.name}`);
                } else {
                    console.log(`⚠️  Command at ${filePath} is missing required "data" or "execute" property.`);
                }
            } catch (error) {
                console.error(`❌ Error loading command ${file}:`, error);
            }
        }
    }
}

// Bot ready event
client.once('ready', () => {
    console.log('🏀 LEAGUEbuddy is online!');
    console.log(`📊 Logged in as ${client.user.tag}`);
    console.log(`🏟️  Serving ${client.guilds.cache.size} server(s)`);
    console.log(`⚡ Loaded ${client.commands.size} commands`);
});

// Handle slash command interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
        console.error(`❌ No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
        console.log(`✅ ${interaction.user.username} used /${interaction.commandName}`);
    } catch (error) {
        console.error(`❌ Error executing ${interaction.commandName}:`, error);
        
        const errorMessage = 'There was an error while executing this command!';
        
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ content: errorMessage });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
});

// Handle process termination
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Load commands and start the bot
async function startBot() {
    try {
        console.log('🔄 Loading LEAGUEbuddy commands...');
        await loadCommands();
        console.log('🚀 Starting LEAGUEbuddy bot...');
        await client.login(process.env.TOKEN);
    } catch (error) {
        console.error('❌ Failed to start LEAGUEbuddy:', error);
        process.exit(1);
    }
}

startBot();
