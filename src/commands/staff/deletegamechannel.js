
import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import fs from 'fs';
import path from 'path';

const SEASON_FILE = './data/season.json';

export const data = new SlashCommandBuilder()
    .setName('deletegamechannel')
    .setDescription('Delete all game channels for a selected week (Discord only, JSON remains intact).')
    .addIntegerOption(option =>
        option.setName('week')
            .setDescription('Week number to clear')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    await interaction.deferReply(); // Always first, no conditions
    const startTime = Date.now();
    try {
        const absSeasonPath = path.resolve(SEASON_FILE);
        const exists = fs.existsSync(absSeasonPath);
        console.log(`[deletegamechannel] Checking for season file at: ${absSeasonPath} (exists: ${exists})`);
        const week = interaction.options.getInteger('week');
        if (!exists) {
            console.error('[deletegamechannel] No active season file found.');
            return await interaction.editReply({ content: 'No active season found.' });
        }
        const season = JSON.parse(fs.readFileSync(SEASON_FILE, 'utf8'));
        const teams = season.teams;
        const gameno = season.gameno || (teams ? teams.length - 1 : 0);
        const schedule = season.schedule;
        if (!Array.isArray(schedule) || schedule.length === 0) {
            console.error('[deletegamechannel] No schedule found in season file.');
            return await interaction.editReply({ content: 'Error: No schedule found in season data. Please start a season first.' });
        }
        // Calculate matchups for the week
        const startIdx = (week - 1) * gameno;
        const endIdx = startIdx + gameno;
        const weekMatchups = schedule.slice(startIdx, endIdx);
        if (!weekMatchups || weekMatchups.length === 0) {
            console.error(`[deletegamechannel] No games found for week ${week}.`);
            return await interaction.editReply({ content: `No games found for week ${week}.` });
        }
        if (!interaction.guild) {
            console.error('[deletegamechannel] interaction.guild is undefined.');
            return await interaction.editReply({ content: 'Error: Guild not found.' });
        }
        if (!interaction.guild.channels || !interaction.guild.channels.cache) {
            console.error('[deletegamechannel] interaction.guild.channels.cache is undefined.');
            return await interaction.editReply({ content: 'Error: Guild channels not found.' });
        }
        // Find the category for this week
        const categoryName = `Week ${week} Games`;
        const category = interaction.guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === categoryName);
        if (!category) {
            console.error(`[deletegamechannel] No category found for Week ${week}.`);
            return await interaction.editReply({ content: `No category found for Week ${week}.` });
        }
        // Delete all channels under the category
        for (const channel of interaction.guild.channels.cache.filter(ch => ch.parentId === category.id).values()) {
            try {
                await channel.delete();
            } catch (e) {
                console.error(`[deletegamechannel] Failed to delete channel ${channel.name}:`, e);
            }
        }
        // Delete the category itself
        try {
            await category.delete();
        } catch (e) {
            console.error(`[deletegamechannel] Failed to delete category:`, e);
        }
        const elapsed = Date.now() - startTime;
        console.log(`[deletegamechannel] Successfully deleted week ${week} channels in ${elapsed}ms.`);
        await interaction.editReply({ content: `✅ Week ${week} game channels and category deleted from Discord.` });
    } catch (err) {
        console.error('[deletegamechannel] Fatal error:', err);
        // Only try to edit reply if still possible
        if (!interaction.replied && !interaction.deferred) {
            try { await interaction.editReply({ content: 'Error clearing week channels.' }); } catch (e) {
                console.error('[deletegamechannel] Failed to send error message:', e);
            }
        }
    }
}
