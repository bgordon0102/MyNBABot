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
        const imported = await import(fileURL);
        const command = imported.default || imported; // Support both default and named exports

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

// Deploy commands to Discord
async function deployCommands() {
  try {
    console.log('🔄 Loading LEAGUEbuddy commands for deployment...');
    await loadCommandsForDeployment();

    console.log(`📊 Loaded ${commands.length} commands total`);
    console.log('🚀 Deploying commands to Discord...');

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    // Try global command deployment if guild deployment fails
    let data;
    try {
      // First try guild-specific deployment (faster)
      data = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log(`✅ Successfully registered ${data.length} guild commands!`);
    } catch (guildError) {
      console.log('⚠️ Guild deployment failed:', guildError.message);
      console.log('Trying global deployment...');
      // Fallback to global deployment (takes up to 1 hour to sync)
      data = await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log(`✅ Successfully registered ${data.length} global commands!`);
    }

    console.log('🏀 LEAGUEbuddy commands are ready to use!');

  } catch (error) {
    console.error('❌ Error deploying commands:', error);
    process.exit(1);
  }
}

// Run the deployment
deployCommands();
