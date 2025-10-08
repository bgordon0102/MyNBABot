import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const rest = new REST().setToken(process.env.TOKEN);

try {
    console.log('🗑️ Clearing all global commands...');

    // Delete all global commands
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });

    console.log('✅ Successfully cleared all global commands!');
    console.log('⏳ Wait 10 seconds, then run: node deploy-commands.js');
} catch (error) {
    console.error('❌ Error clearing commands:', error);
}
