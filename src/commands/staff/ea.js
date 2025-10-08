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
                .addStringOption(option =>
                    option
                        .setName('league')
                        .setDescription('Specific league ID to sync (leave empty to see all leagues)')
                        .setRequired(false)
                )
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
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('submit')
                .setDescription('Submit the EA Sports callback URL to complete connection')
                .addStringOption(option =>
                    option
                        .setName('url')
                        .setDescription('The URL from the blank EA page (starts with http://127.0.0.1/success)')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('refresh')
                .setDescription('Force refresh EA Sports data (clears cache)')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('setleague')
                .setDescription('Set your default league for LEAGUEbuddy integration')
                .addStringOption(option =>
                    option
                        .setName('leagueid')
                        .setDescription('The EA Sports League ID to set as default')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('dashboard')
                .setDescription('Get link to the EA Sports admin dashboard (recommended for Madden 26)')
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
                case 'submit':
                    await handleSubmit(interaction, userId);
                    break;
                case 'refresh':
                    await handleRefresh(interaction, userId);
                    break;
                case 'setleague':
                    await handleSetLeague(interaction, userId);
                    break;
                case 'dashboard':
                    await handleDashboard(interaction);
                    break;
                default:
                    await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
            }
        } catch (error) {
            console.error('EA Sports command error:', error);

            try {
                const errorMessage = 'An error occurred while processing the EA Sports command.';

                if (interaction.deferred) {
                    await interaction.editReply({ content: errorMessage });
                } else if (!interaction.replied) {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                }
            } catch (replyError) {
                console.error('Failed to send error reply:', replyError);
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
        .setTitle('🏈 Connect to EA Sports')
        .setDescription('**Follow these steps to connect your EA Sports account (exactly like snallabot):**')
        .addFields(
            { name: '📋 Instructions', value: '1. **Click the link below** to start EA Sports login\n2. Use your **normal EA account credentials** \n3. After login, you\'ll see a blank page with a URL starting with `http://127.0.0.1/success`\n4. **This blank page is normal and expected!**\n5. Copy the **entire URL** from your address bar\n6. Paste it back here using `/ea submit [url]`' },
            { name: '🔗 EA Sports Login', value: '[**Click Here to Login to EA Sports**](https://accounts.ea.com/connect/auth?hide_create=true&release_type=prod&response_type=code&redirect_uri=http://127.0.0.1/success&client_id=MCA_25_COMP_APP&machineProfileKey=444d362e8e067fe2&authentication_source=317239)' },
            { name: '🔒 Security Note', value: 'LEAGUEbuddy does **NOT** store your EA credentials. Only secure OAuth tokens.' },
            { name: '⚠️ Important', value: 'Each login URL can only be used once. If it fails, run `/ea connect` again.' }
        )
        .setFooter({ text: 'Click the login link above to start!' });

    await interaction.reply({ embeds: [embed], ephemeral: true });

}

async function handleStatus(interaction, userId) {
    const isConnected = eaAPI.isAuthenticated(userId);

    const embed = new EmbedBuilder()
        .setTitle('🏈 EA Sports Connection Status')
        .setDescription(isConnected ? '✅ **Connected** - Your EA Sports account is linked!' : '❌ **Not Connected** - Use `/ea connect` to link your account')
        .setColor(isConnected ? '#00ff00' : '#ff0000');

    if (isConnected) {
        const defaultLeague = eaAPI.getDefaultLeague(userId);

        embed.addFields(
            { name: 'Available Actions', value: '• `/ea sync` - Import league data\n• `/ea draft` - Import draft classes\n• `/ea setleague` - Set default league\n• `/ea disconnect` - Remove connection' }
        );

        if (defaultLeague) {
            embed.addFields(
                { name: '🏟️ Default League', value: `**${defaultLeague.name}**\nID: \`${defaultLeague.id}\`\nConsole: ${defaultLeague.console}\nTeams: ${defaultLeague.teams}` }
            );
        } else {
            embed.addFields(
                { name: '⚠️ No Default League', value: 'Use `/ea sync` to see available leagues, then `/ea setleague [id]` to set your default.' }
            );
        }
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

    const leagueId = interaction.options.getString('league');
    await interaction.deferReply({ ephemeral: true });

    try {
        const leagues = await eaAPI.getUserLeagues(userId);

        if (!leagues || leagues.length === 0) {
            const embed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('📋 No Leagues Found')
                .setDescription('No Madden leagues found in your EA Sports account.\n\n' +
                    '**Possible reasons:**\n' +
                    '• You haven\'t created any Madden 26 leagues\n' +
                    '• Your EA Sports account doesn\'t have Madden 26\n' +
                    '• Your token may have expired\n\n' +
                    '**Try:**\n' +
                    '• Create a league in Madden 26 first\n' +
                    '• Use `/ea refresh` to clear cache\n' +
                    '• Use `/ea connect` to re-authenticate');

            await interaction.editReply({ embeds: [embed] });
            return;
        }

        // If no specific league requested, show all available leagues
        if (!leagueId) {
            const leagueList = leagues.map((league, index) =>
                `**${index + 1}.** ${league.name}\n` +
                `   • ID: \`${league.id}\`\n` +
                `   • Console: ${league.console || 'Unknown'}\n` +
                `   • Teams: ${league.teams || 'Unknown'}\n`
            ).join('\n');

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🏟️ Available EA Sports Leagues')
                .setDescription(`Found ${leagues.length} league(s) in your EA Sports account:\n\n${leagueList}`)
                .addFields(
                    {
                        name: '📥 How to Sync a League',
                        value: 'Use `/ea sync league:[league-id]` to sync a specific league.\nExample: `/ea sync league:123456`'
                    }
                )
                .setFooter({ text: 'Copy the League ID to sync specific league data' });

            await interaction.editReply({ embeds: [embed] });
            return;
        }

        // User specified a league ID - sync that specific league
        const selectedLeague = leagues.find(league => league.id.toString() === leagueId);

        if (!selectedLeague) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ League Not Found')
                .setDescription(`League ID \`${leagueId}\` not found in your EA Sports account.`)
                .addFields(
                    { name: 'Available Leagues', value: leagues.map(l => `• ${l.name} (ID: \`${l.id}\`)`).join('\n') || 'None' }
                );

            await interaction.editReply({ embeds: [embed] });
            return;
        }

        // Sync the specific league (placeholder for now)
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ League Sync Started')
            .setDescription(`Syncing **${selectedLeague.name}** (ID: \`${selectedLeague.id}\`)`)
            .addFields(
                { name: 'League Info', value: `Console: ${selectedLeague.console}\nTeams: ${selectedLeague.teams}` },
                { name: 'Status', value: '🔄 Importing league data...' }
            )
            .setFooter({ text: 'Full league data import functionality coming soon!' });

        await interaction.editReply({ embeds: [embed] });

        // TODO: Implement actual league data syncing here
        // This would include:
        // - Team rosters
        // - Player stats
        // - Schedules
        // - Standings

    } catch (error) {
        console.error('Sync error:', error);

        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Sync Failed')
            .setDescription('Failed to sync league data. Your EA connection may have expired.')
            .addFields(
                { name: 'Error Details', value: error.message || 'Unknown error' },
                { name: 'Try Again', value: 'Use `/ea refresh` then `/ea sync` again.' }
            );

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
            .setTitle('� Draft Class Import')
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

async function handleSubmit(interaction, userId) {
    const rawUrl = interaction.options.getString('url');

    if (!rawUrl || !rawUrl.includes('127.0.0.1/success')) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Invalid URL')
            .setDescription('Please provide the complete URL from the EA Sports redirect page.')
            .addFields(
                { name: 'Expected Format', value: '`http://127.0.0.1/success?code=ABC123...`' },
                { name: 'Try Again', value: 'Use `/ea connect` to get a new login link.' }
            );

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        // Extract the authorization code from the URL
        const searchParams = rawUrl.substring(rawUrl.indexOf("?"));
        const eaCodeParams = new URLSearchParams(searchParams);
        const code = eaCodeParams.get("code");

        if (!code) {
            throw new Error('No authorization code found in URL');
        }

        // Exchange code for tokens
        const token = await eaAPI.exchangeCodeForToken(code);
        eaAPI.tokens.set(userId, token);
        eaAPI.saveTokens();

        const successEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Successfully Connected to EA Sports!')
            .setDescription('Your EA Sports account is now linked to LEAGUEbuddy!')
            .addFields(
                { name: 'What\'s Next?', value: '• Use `/ea sync` to import your league data\n• Use `/ea draft` to import draft classes\n• Use `/ea status` to check your connection' }
            );

        await interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
        console.error('EA token exchange error:', error);

        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Connection Failed')
            .setDescription('Failed to connect to EA Sports. Please try again.')
            .addFields(
                { name: 'Error Details', value: error.message || 'Unknown error occurred' },
                { name: 'Try Again', value: 'Use `/ea connect` to get a new login link.' }
            );

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function handleRefresh(interaction, userId) {
    if (!eaAPI.isAuthenticated(userId)) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Not Connected')
            .setDescription('You need to connect your EA Sports account first. Use `/ea connect` to get started.');

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    eaAPI.forceRefresh(userId);

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🔄 EA Data Refreshed')
        .setDescription('Your EA Sports connection has been refreshed. Cached data cleared.')
        .addFields(
            { name: 'Next Steps', value: '• Use `/ea sync` to get updated league data\n• Use `/ea status` to verify connection' }
        );

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleSetLeague(interaction, userId) {
    if (!eaAPI.isAuthenticated(userId)) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Not Connected')
            .setDescription('You need to connect your EA Sports account first. Use `/ea connect` to get started.');

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const leagueId = interaction.options.getString('leagueid');
    await interaction.deferReply({ ephemeral: true });

    try {
        const leagues = await eaAPI.getUserLeagues(userId);
        const selectedLeague = leagues.find(league => league.id.toString() === leagueId);

        if (!selectedLeague) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ League Not Found')
                .setDescription(`League ID \`${leagueId}\` not found in your EA Sports account.`)
                .addFields(
                    { name: 'Available Leagues', value: leagues.map(l => `• ${l.name} (ID: \`${l.id}\`)`).join('\n') || 'None' }
                );

            await interaction.editReply({ embeds: [embed] });
            return;
        }

        // Set the default league
        eaAPI.setDefaultLeague(userId, selectedLeague);

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Default League Set')
            .setDescription(`**${selectedLeague.name}** is now your default league for LEAGUEbuddy.`)
            .addFields(
                { name: 'League Details', value: `ID: \`${selectedLeague.id}\`\nConsole: ${selectedLeague.console}\nTeams: ${selectedLeague.teams}` },
                { name: 'What This Means', value: '• Future `/ea draft` imports will use this league\n• League data syncing will default to this league\n• LEAGUEbuddy will integrate with this league\'s data' }
            );

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Set league error:', error);

        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Failed to Set League')
            .setDescription('Could not set default league. Please try again.')
            .addFields(
                { name: 'Error', value: error.message || 'Unknown error' }
            );

        await interaction.editReply({ embeds: [embed] });
    }
}

async function handleDashboard(interaction) {
    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('� EA Sports Admin Dashboard')
        .setDescription('**Recommended Setup Method for Madden 26**\n\n' +
            'Since EA has not released a companion app for Madden 26 yet, ' +
            'use the admin dashboard to connect your league.')
        .addFields(
            { name: '🔗 Dashboard Link', value: `[Open Admin Dashboard](${dashboardUrl}/admin/sync)` },
            {
                name: '📋 Setup Steps', value:
                    '1. **Set Console & Version** - Choose your platform and Madden 26\n' +
                    '2. **Connect EA Sports** - Authenticate your account\n' +
                    '3. **Select League** - Choose from your available leagues\n' +
                    '4. **Complete Setup** - Start using bot commands'
            },
            {
                name: '✨ After Setup', value:
                    '• `/ea status` - Check connection\n' +
                    '• `/ea sync` - Import league data\n' +
                    '• `/ea refresh` - Clear cache'
            }
        )
        .setFooter({ text: 'This method works better than mobile API for Madden 26' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
