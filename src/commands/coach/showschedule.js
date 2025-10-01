import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('showschedule')
    .setDescription('Display your team\'s schedule')
    .addStringOption(option =>
        option.setName('timeframe')
            .setDescription('Schedule timeframe to display')
            .setRequired(false)
            .addChoices(
                { name: 'This Week', value: 'week' },
                { name: 'This Month', value: 'month' },
                { name: 'Full Season', value: 'season' },
                { name: 'Upcoming', value: 'upcoming' }
            ));

export async function execute(interaction) {
    // TODO: implement logic to:
    // - Get coach's team
    // - Load team schedule from data
    // - Filter by timeframe
    // - Show game results and upcoming games
    // - Include opponent info and game times

    const timeframe = interaction.options.getString('timeframe') || 'upcoming';

    await interaction.reply({
        content: `📅 Team schedule (${timeframe}) display coming soon!`,
        flags: 64 // MessageFlags.Ephemeral
    });
}
