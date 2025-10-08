import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { DraftClassManager } from '../../utils/draftClassManager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('draftclass')
        .setDescription('Manage draft classes for the league')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all available draft classes')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('current')
                .setDescription('Show the currently active draft class')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('switch')
                .setDescription('Switch to a different draft class')
                .addStringOption(option =>
                    option
                        .setName('class')
                        .setDescription('The draft class to switch to')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('validate')
                .setDescription('Validate that all files exist for a draft class')
                .addStringOption(option =>
                    option
                        .setName('class')
                        .setDescription('The draft class to validate (optional - validates current if not specified)')
                        .setRequired(false)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'list':
                    await this.handleList(interaction);
                    break;
                case 'current':
                    await this.handleCurrent(interaction);
                    break;
                case 'switch':
                    await this.handleSwitch(interaction);
                    break;
                case 'validate':
                    await this.handleValidate(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown subcommand.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error in draftclass command:', error);
            console.error('Error stack:', error.stack);
            
            const errorMsg = `❌ **Draft Class Error:**
            
**Message:** ${error.message}
**Type:** ${error.constructor.name}
**Subcommand:** ${subcommand}

Check Railway logs for full details.`;

            try {
                await interaction.reply({
                    content: errorMsg,
                    ephemeral: true
                });
            } catch (replyError) {
                console.error('Failed to send error reply:', replyError);
            }
        }
    },

    async handleList(interaction) {
        const config = DraftClassManager.getAvailableClasses();

        const embed = new EmbedBuilder()
            .setTitle('🏀 Available Draft Classes')
            .setColor('#00ff00')
            .setTimestamp();

        if (config.availableClasses.length === 0) {
            embed.setDescription('No draft classes available.');
        } else {
            let description = '';
            for (const draftClass of config.availableClasses) {
                const status = draftClass.active ? '🟢 **ACTIVE**' : '⚫ Inactive';
                description += `**${draftClass.name}** (${draftClass.id})\n`;
                description += `└ Status: ${status}\n`;
                description += `└ Folder: \`${draftClass.folder}\`\n\n`;
            }
            embed.setDescription(description);
        }

        await interaction.reply({ embeds: [embed] });
    },

    async handleCurrent(interaction) {
        const currentClass = DraftClassManager.getCurrentClass();

        if (!currentClass) {
            await interaction.reply({
                content: '❌ No active draft class found.',
                ephemeral: true
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('🎯 Current Draft Class')
            .setColor('#0099ff')
            .addFields(
                { name: 'Name', value: currentClass.name, inline: true },
                { name: 'ID', value: currentClass.id, inline: true },
                { name: 'Folder', value: currentClass.folder, inline: true },
                { name: 'Year', value: currentClass.year, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async handleSwitch(interaction) {
        const classId = interaction.options.getString('class');

        try {
            const config = DraftClassManager.setCurrentClass(classId);
            const newClass = config.availableClasses.find(c => c.id === classId);

            const embed = new EmbedBuilder()
                .setTitle('✅ Draft Class Switched')
                .setDescription(`Successfully switched to **${newClass.name}** (${newClass.id})`)
                .setColor('#00ff00')
                .addFields(
                    { name: 'New Active Class', value: newClass.name, inline: true },
                    { name: 'Folder', value: newClass.folder, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Update prospect boards configuration
            try {
                const prospectBoards = DraftClassManager.getCurrentProspectBoards();
                const fs = await import('fs');
                const path = await import('path');

                fs.writeFileSync(
                    path.join(process.cwd(), 'data/prospectBoards.json'),
                    JSON.stringify(prospectBoards, null, 2)
                );

                console.log('Updated prospectBoards.json for new draft class');
            } catch (error) {
                console.error('Error updating prospectBoards.json:', error);
            }

        } catch (error) {
            await interaction.reply({
                content: `❌ ${error.message}`,
                ephemeral: true
            });
        }
    },

    async handleValidate(interaction) {
        const classId = interaction.options.getString('class') || DraftClassManager.getCurrentClass()?.id;

        if (!classId) {
            await interaction.reply({
                content: '❌ No draft class specified and no current class found.',
                ephemeral: true
            });
            return;
        }

        try {
            const validation = DraftClassManager.validateDraftClassFiles(classId);

            const embed = new EmbedBuilder()
                .setTitle(`🔍 Draft Class Validation: ${classId}`)
                .setTimestamp();

            if (validation.valid) {
                embed
                    .setColor('#00ff00')
                    .setDescription('✅ All required files are present and valid.');
            } else {
                embed
                    .setColor('#ff0000')
                    .setDescription('❌ Some required files are missing:')
                    .addFields({
                        name: 'Missing Files',
                        value: validation.missingFiles.map(file => `• \`${file}\``).join('\n')
                    });
            }

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({
                content: `❌ ${error.message}`,
                ephemeral: true
            });
        }
    }
};
