import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const commands = [];
const commandFolders = ['src/commands/staff', 'src/commands/coach'];

for (const folder of commandFolders) {
  const commandFiles = fs.readdirSync(folder).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(folder, file);
    const command = (await import(path.resolve(filePath))).default;
    if (command && command.data) {
      commands.push(command.data.toJSON());
    }
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('Successfully registered application commands.');
  } catch (error) {
    console.error(error);
  }
})();
