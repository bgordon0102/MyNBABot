import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('clearallgames')
    .setDescription('Delete ALL game channels and categories (Week Games, Playoffs, etc.)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    await interaction.deferReply();

    try {
        if (!interaction.guild) {
            return await interaction.editReply({ content: 'Error: Guild not found.' });
        }

        // Find all game-related categories
        const gameCategories = interaction.guild.channels.cache.filter(c =>
            c.type === ChannelType.GuildCategory &&
            (c.name.includes('Week') && c.name.includes('Games') ||
                c.name.includes('PLAY-IN') ||
                c.name.includes('ROUND') ||
                c.name.includes('FINALS'))
        );

        if (gameCategories.size === 0) {
            return await interaction.editReply({ content: '✅ No game categories found to delete.' });
        }

        let deletedCategories = 0;
        let deletedChannels = 0;
        let failedDeletions = 0;

        const categoriesToDelete = Array.from(gameCategories.values());

        // Show what we're about to delete
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🗑️ Deleting Game Categories and Channels')
            .setDescription(`Found ${categoriesToDelete.length} game categories to delete:`)
            .addFields(
                { name: 'Categories', value: categoriesToDelete.map(c => `• ${c.name}`).join('\n') || 'None', inline: false }
            );

        await interaction.editReply({ embeds: [embed] });

        // Delete each category and its channels
        for (const category of categoriesToDelete) {
            try {
                console.log(`[clearallgames] Processing category: ${category.name}`);

                // Get all channels in this category
                const channelsInCategory = interaction.guild.channels.cache.filter(ch => ch.parentId === category.id);

                // Delete all channels in the category
                for (const channel of channelsInCategory.values()) {
                    try {
                        console.log(`[clearallgames] Deleting channel: ${channel.name}`);
                        await channel.delete();
                        deletedChannels++;
                        // Small delay to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (e) {
                        console.error(`[clearallgames] Failed to delete channel ${channel.name}:`, e);
                        failedDeletions++;
                    }
                }

                // Delete the category itself
                console.log(`[clearallgames] Deleting category: ${category.name}`);
                await category.delete();
                deletedCategories++;

                // Delay between categories
                await new Promise(resolve => setTimeout(resolve, 200));

            } catch (e) {
                console.error(`[clearallgames] Failed to delete category ${category.name}:`, e);
                failedDeletions++;
            }
        }

        // Final report
        const resultEmbed = new EmbedBuilder()
            .setColor(failedDeletions > 0 ? '#FF6600' : '#00FF00')
            .setTitle('🗑️ Cleanup Complete')
            .addFields(
                { name: '✅ Deleted Categories', value: deletedCategories.toString(), inline: true },
                { name: '✅ Deleted Channels', value: deletedChannels.toString(), inline: true },
                { name: '❌ Failed Deletions', value: failedDeletions.toString(), inline: true }
            );

        if (failedDeletions > 0) {
            resultEmbed.setFooter({ text: 'Some deletions failed. Check bot permissions and try again.' });
        } else {
            resultEmbed.setFooter({ text: 'All game channels and categories successfully removed!' });
        }

        await interaction.editReply({ embeds: [resultEmbed] });

    } catch (error) {
        console.error('[clearallgames] Fatal error:', error);
        await interaction.editReply({
            content: '❌ An error occurred while clearing game channels. Check console for details.'
        });
    }
}
