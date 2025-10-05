console.log('DEBUG: Bot startup log from app.js');
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

// Initialize commands and interactions collections
client.commands = new Collection();
client.interactions = new Collection();

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
        const imported = await import(fileURL);
        const cmd = imported.default || imported; // Support both default and named exports
        if ('data' in cmd && 'execute' in cmd) {
          client.commands.set(cmd.data.name, cmd);
          console.log(`✅ Loaded ${folder} command: ${cmd.data.name}`);
        } else {
          console.log(`⚠️  Command at ${filePath} is missing required "data" or "execute" property.`);
        }
      } catch (error) {
        console.error(`❌ Error loading command ${file}:`, error);
      }
    }
  }
}

// Function to dynamically load all interaction handlers
async function loadInteractions() {
  const interactionsPath = join(__dirname, 'src', 'interactions');
  const interactionFiles = readdirSync(interactionsPath).filter(file => file.endsWith('.js'));

  for (const file of interactionFiles) {
    const filePath = join(interactionsPath, file);
    const fileURL = pathToFileURL(filePath).href;

    try {
      const interaction = await import(fileURL);

      if ('customId' in interaction && 'execute' in interaction) {
        client.interactions.set(interaction.customId, interaction);
        console.log(`✅ Loaded interaction: ${interaction.customId}`);
      } else {
        console.log(`⚠️  Interaction at ${filePath} is missing required "customId" or "execute" property.`);
      }
    } catch (error) {
      console.error(`❌ Error loading interaction ${file}:`, error);
    }
  }
}

// Register bigboard_move interaction

import * as bigboardMove from './src/interactions/bigboard_move.js';
client.interactions.set('bigboard_move', bigboardMove);
import * as bigboardMoveV2 from './src/interactions/bigboard_move_v2.js';
client.interactions.set('bigboard_move_up', bigboardMoveV2);
client.interactions.set('bigboard_move_down', bigboardMoveV2);
import * as bigboardSelectPlayer from './src/interactions/bigboard_select_player.js';
client.interactions.set('bigboard_select_player', bigboardSelectPlayer);

// Register submit_score button/modal/approval handlers
import * as submitScore from './src/interactions/submit_score_interaction.js';
client.interactions.set('submit_score', submitScore);
client.interactions.set('submit_score_modal', { execute: submitScore.handleModal });
client.interactions.set('approve_score', { execute: i => submitScore.handleApproval(i, true) });
client.interactions.set('deny_score', { execute: i => submitScore.handleApproval(i, false) });

// Bot clientReady event (Discord.js v15+)
client.once('clientReady', (readyClient) => {
  console.log('🏀 LEAGUEbuddy is online!');
  console.log(`📊 Logged in as ${readyClient.user.tag}`);
  console.log(`🏟️  Serving ${readyClient.guilds.cache.size} server(s)`);
  console.log(`⚡ Loaded ${client.commands.size} commands`);
});

// Handle interactions (commands and autocomplete)
client.on('interactionCreate', async interaction => {
  console.log(`[INTERACTION EVENT] type: ${interaction.type}, id: ${interaction.id}, createdAt: ${interaction.createdAt}, user: ${interaction.user?.tag || interaction.user?.id}`);
  // Handle autocomplete interactions
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (!command || !command.autocomplete) return;

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      console.error(`❌ Error with autocomplete for ${interaction.commandName}:`, error);
    }
    return;
  }



  // Handle select menu interactions
  if (interaction.isStringSelectMenu()) {
    let interactionHandler = client.interactions.get(interaction.customId);
    // Add logging for scout select menu
    if (interaction.customId.startsWith('scout_select_')) {
      console.log(`[SCOUT SELECT MENU] customId: ${interaction.customId}, user: ${interaction.user.username} (${interaction.user.id}), values: ${JSON.stringify(interaction.values)}`);
    }
    // Support prefix matching for bigboard_move
    if (!interactionHandler && interaction.customId.startsWith('bigboard_move')) {
      interactionHandler = client.interactions.get('bigboard_move');
    }
    if (!interactionHandler) {
      console.error(`❌ No interaction handler matching ${interaction.customId} was found.`);
      return;
    }
    try {
      console.log(`🔄 ${interaction.user.username} is using select menu: ${interaction.customId}`);
      await interactionHandler.execute(interaction);
      console.log(`✅ ${interaction.user.username} successfully used select menu: ${interaction.customId}`);
    } catch (error) {
      console.error(`❌ Error executing interaction ${interaction.customId}:`, error);
      const errorMessage = 'There was an error while executing this interaction!';
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({ content: errorMessage });
        } else {
          await interaction.reply({
            content: errorMessage,
            flags: 64 // MessageFlags.Ephemeral
          });
        }
      } catch (replyError) {
        console.error('❌ Failed to send error message:', replyError);
      }
    }
    return;
  }

  // Handle button interactions for bigboard_move_v2, submit_score, and regex customId
  if (interaction.isButton()) {
    let interactionHandler = client.interactions.get(interaction.customId);
    // Regex support for customId (e.g., startseason_confirm)
    if (!interactionHandler) {
      for (const [key, handler] of client.interactions.entries()) {
        if (typeof key === 'object' && key instanceof RegExp && key.test(interaction.customId)) {
          interactionHandler = handler;
          break;
        }
      }
    }
    if (!interactionHandler && (interaction.customId.startsWith('bigboard_move_up:') || interaction.customId.startsWith('bigboard_move_down:'))) {
      interactionHandler = client.interactions.get('bigboard_move_up');
    }
    // Support submit_score approval/deny
    if (!interactionHandler && (interaction.customId === 'approve_score' || interaction.customId === 'deny_score')) {
      interactionHandler = client.interactions.get(interaction.customId);
    }
    if (!interactionHandler) {
      console.error(`❌ No interaction handler matching ${interaction.customId} was found.`);
      return;
    }
    try {
      console.log(`🔄 ${interaction.user.username} is using button: ${interaction.customId}`);
      await interactionHandler.execute(interaction);
      console.log(`✅ ${interaction.user.username} successfully used button: ${interaction.customId}`);
    } catch (error) {
      console.error(`❌ Error executing interaction ${interaction.customId}:`, error);
      const errorMessage = 'There was an error while executing this interaction!';
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({ content: errorMessage });
        } else {
          await interaction.reply({
            content: errorMessage,
            flags: 64 // MessageFlags.Ephemeral
          });
        }
      } catch (replyError) {
        console.error('❌ Failed to send error message:', replyError);
      }
    }
    return;
  }

  // Handle modal submit for submit_score
  if (interaction.isModalSubmit && interaction.isModalSubmit()) {
    let interactionHandler = client.interactions.get(interaction.customId);
    if (!interactionHandler && interaction.customId === 'submit_score_modal') {
      interactionHandler = client.interactions.get('submit_score_modal');
    }
    if (!interactionHandler) {
      console.error(`❌ No modal handler matching ${interaction.customId} was found.`);
      return;
    }
    try {
      await interactionHandler.execute(interaction);
    } catch (error) {
      console.error(`❌ Error executing modal ${interaction.customId}:`, error);
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({ content: 'There was an error while executing this modal!' });
        } else {
          await interaction.reply({ content: 'There was an error while executing this modal!', flags: 64 });
        }
      } catch (replyError) {
        console.error('❌ Failed to send error message:', replyError);
      }
    }
    return;
  }

  // Handle slash command interactions
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    console.error(`❌ No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    console.log(`🔄 ${interaction.user.username} is using /${interaction.commandName}`);
    await command.execute(interaction);
    console.log(`✅ ${interaction.user.username} successfully used /${interaction.commandName}`);
  } catch (error) {
    console.error(`❌ Error executing ${interaction.commandName}:`, error);

    const errorMessage = 'There was an error while executing this command!';

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.reply({
          content: errorMessage,
          flags: 64 // MessageFlags.Ephemeral
        });
      }
    } catch (replyError) {
      console.error('❌ Failed to send error message:', replyError);
    }
  }
});// Handle process termination
process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Load commands and interactions, then start the bot
async function startBot() {
  try {
    console.log('🔄 Loading LEAGUEbuddy commands...');
    await loadCommands();
    console.log('🔄 Loading LEAGUEbuddy interactions...');
    await loadInteractions();
    console.log('🚀 Starting LEAGUEbuddy bot...');
    // Use DISCORD_TOKEN for Railway, fallback to TOKEN for local .env
    const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
    if (!token) {
      throw new Error('No Discord bot token found in DISCORD_TOKEN or TOKEN environment variables.');
    }
    await client.login(token);
  } catch (error) {
    console.error('❌ Failed to start LEAGUEbuddy:', error);
    process.exit(1);
  }
}

startBot();
