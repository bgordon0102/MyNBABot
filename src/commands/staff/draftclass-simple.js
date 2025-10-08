import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { DraftClassManager } from '../../utils/draftClassManager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('draftclass')
        .setDescription('Switch between draft classes (CUS01/CUS02)')
        .addStringOption(option =>
            option
                .setName('class')
                .setDescription('Choose draft class: CUS01 or CUS02')
                .setRequired(false)
                .addChoices(
                    { name: 'CUS01 - 2026 Custom Class 01', value: 'CUS01' },
                    { name: 'CUS02 - 2026 Custom Class 02', value: 'CUS02' }
                )
        ),

    async execute(interaction) {
        const classChoice = interaction.options.getString('class');

        try {
            const currentClass = DraftClassManager.getCurrentClass();

            // If no class specified, show current status
            if (!classChoice) {
                const config = DraftClassManager.getAvailableClasses();

                const embed = new EmbedBuilder()
                    .setTitle('� Draft Class Status')
                    .setColor('#0099ff')
                    .setDescription(`**Current Active Class:** ${currentClass?.name || 'None'} (${currentClass?.id || 'N/A'})`)
                    .addFields(
                        {
                            name: 'Available Classes', value: config.availableClasses.map(c =>
                                `${c.active ? '🟢' : '⚫'} **${c.name}** (${c.id})`
                            ).join('\n') || 'None', inline: false
                        }
                    )
                    .setFooter({ text: 'Use /draftclass <class> to switch' })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
                return;
            }

            // Switch to specified class
            DraftClassManager.setCurrentClass(classChoice);
            const newClass = DraftClassManager.getCurrentClass();

            const embed = new EmbedBuilder()
                .setTitle('✅ Draft Class Switched')
                .setDescription(`Successfully switched to **${newClass.name}**`)
                .setColor('#00ff00')
                .addFields(
                    { name: 'Active Class', value: `${newClass.name} (${newClass.id})`, inline: true },
                    { name: 'Folder', value: newClass.folder, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Update prospect boards for the new class
            const prospectBoards = DraftClassManager.getCurrentProspectBoards();
            const fs = await import('fs');
            const path = await import('path');

            fs.writeFileSync(
                path.join(process.cwd(), 'data/prospectBoards.json'),
                JSON.stringify(prospectBoards, null, 2)
            );

        } catch (error) {
            console.error('Error in draftclass command:', error);
            await interaction.reply({
                content: `❌ Error: ${error.message}`,
                ephemeral: true
            });
        }
    }
};
