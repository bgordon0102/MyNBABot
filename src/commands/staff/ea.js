import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import EASportsAPI from '../../utils/eaSportsAPI.js';

const eaAPI = new EASportsAPI();

export default {
    data: new SlashCommandBuilder()
        .setName('ea')
        .setDescription('EA Sports integration commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('connect')
                .setDescription('Connect your EA Sports account to LEAGUEbuddy')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check your EA Sports connection status')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('sync')
                .setDescription('Sync league data from EA Sports')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('draft')
                .setDescription('Import draft class from EA Sports')
                .addStringOption(option =>
                    option
                        .setName('year')
                        .setDescription('Draft class year')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('disconnect')
                .setDescription('Disconnect your EA Sports account')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        try {
            switch (subcommand) {
                case 'connect':
                    await handleConnect(interaction, userId);
                    break;
                case 'status':
                    await handleStatus(interaction, userId);
                    break;
                case 'sync':
                    await handleSync(interaction, userId);
                    break;
                case 'draft':
                    await handleDraft(interaction, userId);
                    break;
                case 'disconnect':
                    await handleDisconnect(interaction, userId);
                    break;
                default:
                    await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
            }
        } catch (error) {
            console.error('EA Sports command error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: 'An error occurred while processing the EA Sports command.', 
                    ephemeral: true 
                });
            }
        }
    }
};

async function handleConnect(interaction, userId) {
    if (eaAPI.isAuthenticated(userId)) {
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Already Connected')
            .setDescription('Your EA Sports account is already connected to LEAGUEbuddy!')
            .addFields(
                { name: 'Available Commands', value: '• `/ea sync` - Import league data\n• `/ea draft` - Import draft classes\n• `/ea status` - Check connection\n• `/ea disconnect` - Remove connection' }
            );

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🔗 Connect to EA Sports')
        .setDescription('**Follow these steps to connect your EA Sports account:**')
        .addFields(
            { name: '📋 Instructions', value: '1. Click the link below to login to EA Sports\n2. Use your **normal EA account credentials**\n3. After login, you\'ll see a blank page with a URL starting with `http://127.0.0.1`\n4. **This is normal and expected!**\n5. The connection will complete automatically' },
            { name: '🔒 Security Note', value: 'LEAGUEbuddy does **NOT** store your EA credentials. It only stores secure authentication tokens.' },
            { name: '⚠️ Important', value: 'Keep your browser open until you see the success message!' }
        )
        .setFooter({ text: 'Starting EA Sports authentication...' });

    await interaction.reply({ embeds: [embed], ephemeral: true });

    try {
        // Start the OAuth flow exactly like snallabot
        const result = await eaAPI.startAuthFlow(userId);
        
        if (result.success) {
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Successfully Connected!')
                .setDescription(result.message)
                .addFields(
                    { name: 'What\'s Next?', value: '• Use `/ea sync` to import your league data\n• Use `/ea draft` to import draft classes\n• Use `/ea status` to check your connection' }
                );

            await interaction.followUp({ embeds: [successEmbed], ephemeral: true });
        }
    } catch (error) {
        console.error('EA connection error:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Connection Failed')
            .setDescription('Failed to connect to EA Sports. Please try again.')
            .addFields(
                { name: 'Common Issues', value: '• Make sure you completed the login process\n• Check that you didn\'t close the browser too early\n• Verify your EA account credentials are correct' }
            );

        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
    }
}

async function handleStatus(interaction, userId) {
    const isConnected = eaAPI.isAuthenticated(userId);
    
    const embed = new EmbedBuilder()
        .setTitle('🔗 EA Sports Connection Status')
        .setDescription(isConnected ? '✅ **Connected** - Your EA Sports account is linked!' : '❌ **Not Connected** - Use `/ea connect` to link your account')
        .setColor(isConnected ? '#00ff00' : '#ff0000');

    if (isConnected) {
        embed.addFields(
            { name: 'Available Actions', value: '• `/ea sync` - Import league data\n• `/ea draft` - Import draft classes\n• `/ea disconnect` - Remove connection' }
        );
    } else {
        embed.addFields(
            { name: 'Get Started', value: 'Use `/ea connect` to link your EA Sports account and access:\n• League roster imports\n• Draft class imports\n• Player rating sync' }
        );
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleSync(interaction, userId) {
    if (!eaAPI.isAuthenticated(userId)) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Not Connected')
            .setDescription('You need to connect your EA Sports account first. Use `/ea connect` to get started.');
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        const leagues = await eaAPI.getUserLeagues(userId);
        
        if (!leagues || leagues.length === 0) {
            const embed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('📋 No Leagues Found')
                .setDescription('No Madden leagues found in your EA Sports account.');
            
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        // For now, just show available leagues
        const leagueList = leagues.map((league, index) => 
            `${index + 1}. **${league.name}** (${league.teams?.length || 'Unknown'} teams)`
        ).join('\n');

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('📋 Available Leagues')
            .setDescription(`Found ${leagues.length} league(s) in your EA Sports account:\n\n${leagueList}`)
            .setFooter({ text: 'Full sync functionality coming soon!' });

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Sync error:', error);
        
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Sync Failed')
            .setDescription('Failed to sync league data. Your EA connection may have expired. Try `/ea connect` again.');

        await interaction.editReply({ embeds: [embed] });
    }
}

async function handleDraft(interaction, userId) {
    if (!eaAPI.isAuthenticated(userId)) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Not Connected')
            .setDescription('You need to connect your EA Sports account first. Use `/ea connect` to get started.');
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    await interaction.deferReply({ ephemeral: true });

    const year = interaction.options.getString('year') || '2026';

    try {
        const draftClass = await eaAPI.getDraftClass(userId, year);
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🏀 Draft Class Import')
            .setDescription(`Successfully imported ${year} draft class with ${draftClass.players?.length || 0} players!`)
            .addFields(
                { name: 'Year', value: year, inline: true },
                { name: 'Players', value: String(draftClass.players?.length || 0), inline: true }
            )
            .setFooter({ text: 'Draft class data has been imported to your LEAGUEbuddy system!' });

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Draft import error:', error);
        
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Draft Import Failed')
            .setDescription(`Failed to import ${year} draft class. Your EA connection may have expired or the draft class may not exist.`);

        await interaction.editReply({ embeds: [embed] });
    }
}

async function handleDisconnect(interaction, userId) {
    if (!eaAPI.isAuthenticated(userId)) {
        const embed = new EmbedBuilder()
            .setColor('#ffaa00')
            .setTitle('ℹ️ Already Disconnected')
            .setDescription('Your EA Sports account is not currently connected.');
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    eaAPI.disconnect(userId);

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Disconnected')
        .setDescription('Your EA Sports account has been disconnected from LEAGUEbuddy.')
        .addFields(
            { name: 'Reconnect Anytime', value: 'Use `/ea connect` whenever you want to reconnect your EA Sports account.' }
        );

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
