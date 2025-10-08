import { REST, Routes } from 'discord.js';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get current directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands = [];

// Function to load all commands for deployment
async function loadCommandsForDeployment() {
    const commandFolders = ['staff', 'coach'];

    for (const folder of commandFolders) {
        const commandsPath = join(__dirname, 'src', 'commands', folder);
        const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        console.log(`📂 Loading ${folder} commands...`);

        for (const file of commandFiles) {
            const filePath = join(commandsPath, file);
            const fileURL = pathToFileURL(filePath).href;

            try {
                const command = await import(fileURL);

                if ('data' in command) {
                    commands.push(command.data.toJSON());
                    console.log(`✅ Loaded ${folder}/${file}`);
                } else {
                    console.log(`⚠️  Command at ${file} is missing required "data" property.`);
                }
            } catch (error) {
                console.error(`❌ Error loading command ${file}:`, error);
            }
        }
    }
}

// Deploy commands to Discord globally
async function deployCommands() {
    try {
        console.log('🔄 Loading LEAGUEbuddy commands for GLOBAL deployment...');
        await loadCommandsForDeployment();

        console.log(`📊 Loaded ${commands.length} commands total`);
        console.log('🚀 Deploying commands globally to Discord...');

        const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

        // Deploy globally instead of to specific guild
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log(`✅ Successfully registered ${data.length} global application commands!`);
        console.log('🏀 LEAGUEbuddy commands are ready to use globally!');
        console.log('⏰ Note: Global commands may take up to 1 hour to appear in all servers.');

    } catch (error) {
        console.error('❌ Error deploying commands:', error);
        process.exit(1);
    }
}

deployCommands();
