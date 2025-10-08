import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { DraftClassManager } from '../../utils/draftClassManager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('dev-draftclass')
        .setDescription('View or manually switch draft classes (auto-set by season)')
        .addStringOption(option =>
            option
                .setName('class')
                .setDescription('Manually override draft class')
                .setRequired(false)
                .addChoices(
                    { name: 'CUS01 - Season 1 Draft Class', value: 'CUS01' },
                    { name: 'CUS02 - Season 2 Draft Class', value: 'CUS02' },
                    { name: 'CUS03 - Season 3 Draft Class', value: 'CUS03' },
                    { name: 'CUS04 - Season 4 Draft Class', value: 'CUS04' },
                    { name: 'CUS05 - Season 5 Draft Class', value: 'CUS05' }
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
                    .setTitle('🏀 Draft Class Status')
                    .setColor('#0099ff')
                    .setDescription(`**Current Active Class:** ${currentClass?.name || 'None'} (${currentClass?.id || 'N/A'})`)
                    .addFields(
                        {
                            name: 'Season-Based System',
                            value: 'Draft classes are automatically set by season:\n• Season 1 → CUS01\n• Season 2 → CUS02\n• Season 3 → CUS03 (etc.)',
                            inline: false
                        },
                        {
                            name: 'Available Classes',
                            value: config.availableClasses.map(c => {
                                const seasonNum = c.id.replace('CUS', '').replace(/^0+/, '') || '1';
                                return `${c.active ? '🟢' : '⚫'} **Season ${seasonNum}** - ${c.id} (${c.name})`;
                            }).join('\n') || 'None',
                            inline: false
                        }
                    )
                    .setFooter({ text: 'Classes auto-switch with /startseason, or manually override with /draftclass <class>' })
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
                path.join(process.cwd(), 'data/2k/prospectBoards.json'),
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
