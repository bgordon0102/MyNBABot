import { Client, GatewayIntentBits, Collection } from 'discord.js';
import dotenv from 'dotenv';
import { loadCommands } from './src/handler.js';

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

loadCommands(client);

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ content: 'There was an error executing this command.' });
    } else {
      await interaction.reply({ content: 'There was an error executing this command.', ephemeral: true });
    }
  }
});

client.login(process.env.TOKEN);
