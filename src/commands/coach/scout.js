import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('scout')
    .setDescription('Scout a recruit or assign scouting points')
    .addStringOption(option =>
        option.setName('recruit')
            .setDescription('Name of the recruit to scout')
            .setRequired(true))
    .addIntegerOption(option =>
        option.setName('points')
            .setDescription('Scouting points to allocate (1-10)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(10));

export async function execute(interaction) {
    // TODO: implement logic to:
    // - Validate recruit exists
    // - Check coach's available scouting points
    // - Allocate scouting points to recruit
    // - Update scouting database
    // - Show updated recruit information
    // - Deduct points from coach's budget
    
    const recruit = interaction.options.getString('recruit');
    const points = interaction.options.getInteger('points') || 1;
    
    await interaction.reply({
        content: `🔍 Scouting ${recruit} with ${points} points coming soon!`,
        ephemeral: true
    });
}
