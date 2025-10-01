import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('deletegamechannel')
    .setDescription('Delete a specific game channel')
    .addChannelOption(option =>
        option.setName('channel')
            .setDescription('The game channel to delete')
            .setRequired(true));

export async function execute(interaction) {
    // TODO: implement logic to:
    // - Validate the channel is a game channel
    // - Check staff permissions
    // - Archive channel content if needed
    // - Delete the channel
    // - Log the deletion action
    
    const channel = interaction.options.getChannel('channel');
    
    await interaction.reply({
        content: `🗑️ Game channel deletion for ${channel} coming soon!`,
        ephemeral: true
    });
}
