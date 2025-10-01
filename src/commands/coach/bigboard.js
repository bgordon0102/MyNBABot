import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('bigboard')
    .setDescription('View your team\'s big board (draft rankings)')
    .addStringOption(option =>
        option.setName('action')
            .setDescription('Action to perform')
            .setRequired(false)
            .addChoices(
                { name: 'View', value: 'view' },
                { name: 'Update', value: 'update' },
                { name: 'Reset', value: 'reset' }
            ));

export async function execute(interaction) {
    // TODO: implement logic to:
    // - Get coach's team
    // - Load team's big board data
    // - Handle view/update/reset actions
    // - Show ranked players with ratings
    // - Allow drag-and-drop reordering (future)
    
    const action = interaction.options.getString('action') || 'view';
    
    await interaction.reply({
        content: `📊 Big board ${action} functionality coming soon!`,
        ephemeral: true
    });
}
