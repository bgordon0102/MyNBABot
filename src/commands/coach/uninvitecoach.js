import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('uninvitecoach')
    .setDescription('Remove a coach\'s access to your team information')
    .addUserOption(option =>
        option.setName('coach')
            .setDescription('The coach to uninvite')
            .setRequired(true));

export async function execute(interaction) {
    // TODO: implement logic to:
    // - Validate coach permissions
    // - Check existing invitations
    // - Remove access permissions
    // - Notify uninvited coach
    // - Log the uninvitation

    const coach = interaction.options.getUser('coach');

    await interaction.reply({
        content: `❌ Coach uninvitation for ${coach.username} coming soon!`,
        flags: 64 // MessageFlags.Ephemeral
    });
}
