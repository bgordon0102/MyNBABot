import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const rest = new REST().setToken(process.env.TOKEN);

try {
    console.log('🗑️ Clearing guild-specific commands...');

    // Delete all guild commands for this specific guild
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: [] });

    console.log('✅ Successfully cleared all guild commands!');
    console.log('⏳ Wait 5 seconds, then run: node deploy-commands.js');
} catch (error) {
    console.error('❌ Error clearing guild commands:', error);
}
