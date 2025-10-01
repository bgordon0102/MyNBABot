import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import fs from 'fs';

const SCHEDULE_FILE = './data/schedule.json';

function readJSON(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export const data = new SlashCommandBuilder()
    .setName('deletegamechannel')
    .setDescription('Clear all game channels for a selected week (JSON data remains intact).')
    .addIntegerOption(option =>
        option.setName('week')
            .setDescription('Week number to clear')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    const week = interaction.options.getInteger('week');

    // Defer reply to prevent timeout
    await interaction.deferReply();

    if (!fs.existsSync(SCHEDULE_FILE)) {
        return interaction.editReply({ content: 'No active season found.' });
    }

    const schedule = readJSON(SCHEDULE_FILE);
    const weekData = schedule.weeks[week];

    if (!weekData) {
        return interaction.editReply({ content: `Week ${week} does not exist in the schedule.` });
    }

    try {
        // Delete channels for the week (leave JSON intact)
        for (const matchup of weekData) {
            if (matchup.channelId) {
                const channel = interaction.guild.channels.cache.get(matchup.channelId);
                if (channel) await channel.delete().catch(() => { });
                matchup.channelId = null; // clear channel ID so we can recreate later
            }
        }

        // Delete the week category if it exists
        const category = interaction.guild.channels.cache.find(c => c.type === 4 && c.name === `Week ${week}`);
        if (category) await category.delete().catch(() => { });

        await interaction.editReply({ content: `✅ Week ${week} channels cleared. JSON data remains intact.` });

    } catch (err) {
        console.error(err);
        await interaction.editReply({ content: 'Error clearing week channels.' });
    }
}
