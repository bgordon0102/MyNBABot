import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('invitecoach')
    .setDescription('Invite another coach to view private team information')
    .addUserOption(option =>
        option.setName('coach')
            .setDescription('The coach to invite')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('permissions')
            .setDescription('What they can access')
            .setRequired(false)
            .addChoices(
                { name: 'View Only', value: 'view' },
                { name: 'View & Comment', value: 'comment' },
                { name: 'Full Access', value: 'full' }
            ));

export async function execute(interaction) {
    // TODO: implement logic to:
    // - Validate coach permissions
    // - Check if target is a coach
    // - Create temporary access permissions
    // - Send invitation notification
    // - Log the invitation
    
    const coach = interaction.options.getUser('coach');
    const permissions = interaction.options.getString('permissions') || 'view';
    
    await interaction.reply({
        content: `🤝 Coach invitation for ${coach.username} (${permissions} access) coming soon!`,
        ephemeral: true
    });
}
