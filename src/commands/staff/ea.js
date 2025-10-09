import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import EASportsAPI from '../../utils/eaSportsAPI.js';
import { DataManager } from '../../utils/dataManager.js';
import eaExportManager from '../../utils/eaExportManager.js';
import { fetchEAData } from "../../utils/ea.js"; // adjust import to your EA fetch logic

const eaAPI = new EASportsAPI();
const maddenDataManager = new DataManager('madden'); // Use Madden-specific data folder

const {
    fetchLeague,
    fetchTeams,
    fetchRosters,
    fetchFreeAgents,
    fetchSchedule,
    fetchPlayoffs,
    fetchWeeklyStats,
    exportLeagueData,
    cache,
    exportStatus,
} = eaExportManager;

const eaSyncCommand = {
    data: new SlashCommandBuilder()
        .setName('dev-ea')
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
        // Defer the reply at the very top (ephemeral)
        await interaction.deferReply({ flags: 64 });
        try {
            // Timestamped debug log at start of execute
            const startTime = Date.now();
            console.log(`[EA DEBUG] execute() called at ${new Date(startTime).toISOString()} for interaction ${interaction.id}`);
            const deferTime = Date.now();
            console.log(`[EA DEBUG] deferReply completed at ${new Date(deferTime).toISOString()} (elapsed: ${deferTime - startTime}ms)`);
            // Get command info first
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            console.log(`🏈 EA Command: ${userId} using /ea ${subcommand}`);
            console.log(`🔍 Interaction status: replied=${interaction.replied}, deferred=${interaction.deferred}`);

            switch (subcommand) {
                case 'status':
                case 'connect':
                case 'disconnect':
                    await this.handleSimpleCommand(interaction, subcommand, userId);
                    break;
                case 'sync':
                    await handleSync(interaction, userId);
                    break;
                case 'draft':
                    await handleDraft(interaction, userId);
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
                    await interaction.editReply({ content: 'Unknown subcommand.' });
            }
        } catch (err) {
            console.error('EA Sports command error:', err);
            await interaction.editReply({ content: `❌ ${err.message}` });
        }
    },

    async handleSimpleCommand(interaction, subcommand, userId) {
        try {
            switch (subcommand) {
                case 'connect':
                    await handleConnect(interaction, userId);
                    break;
                case 'status':
                    await handleStatus(interaction, userId);
                    break;
                case 'disconnect':
                    await handleDisconnect(interaction, userId);
                    break;
                default:
                    await interaction.editReply({ content: 'Unknown simple command.' });
            }
        } catch (error) {
            console.error('Simple EA command error:', error);
            await interaction.editReply({ content: `Command failed: ${error.message}` });
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

        await interaction.editReply({ embeds: [embed] });
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

    await interaction.editReply({ embeds: [embed] });


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

        await interaction.editReply({ embeds: [embed] });
    }

    async function handleSync(interaction, userId) {
        try {
            const loadingEmbed = new EmbedBuilder()
                .setTitle('Syncing EA Sports League...')
                .setDescription('Importing league, teams, rosters, schedule, playoffs, free agents, and all stats. This may take a moment.')
                .setColor(0xFFA500);
            await interaction.editReply({ embeds: [loadingEmbed] });

            const token = await eaAPI.getValidToken(userId);
            if (!token || !token.userId) {
                await interaction.editReply({ content: "❌ No valid EA Sports token found. Please use `/dev-ea connect` to link your account." });
                return;
            }
            const leagueId = interaction.options.getString('league');
            if (!leagueId) {
                await interaction.editReply({ content: 'Please specify a league ID.' });
                return;
            }
            // Fetch all major league data
            const league = await fetchLeague(leagueId, token);
            const teams = await fetchTeams(leagueId, token);
            const teamIds = Array.isArray(teams) ? teams.map(t => t.id || t.teamId) : [];
            const rosters = await fetchRosters(leagueId, teamIds, token);
            const freeAgents = await fetchFreeAgents(leagueId, token);
            const schedule = await fetchSchedule(leagueId, token);
            const playoffs = await fetchPlayoffs(leagueId, token);
            // Stat types to import
            const statTypes = ['passing', 'rushing', 'receiving', 'defense', 'punting', 'kicking', 'teamStats'];
            const stats = {};
            for (const statType of statTypes) {
                stats[statType] = {};
                // Example: import for weeks 1-5 (customize as needed)
                for (let week = 1; week <= 5; week++) {
                    stats[statType][week] = await fetchWeeklyStats(leagueId, statType, week, token);
                }
            }
            // Build embed summary
            const embed = new EmbedBuilder()
                .setTitle(`League Sync Complete: ${league.name || leagueId}`)
                .setDescription('All major league data imported. See dashboard for granular status.')
                .setColor(0x32CD32)
                .addFields(
                    { name: 'Teams', value: Array.isArray(teams) ? teams.length.toString() : 'N/A', inline: true },
                    { name: 'Rosters', value: Object.keys(rosters).length.toString(), inline: true },
                    { name: 'Free Agents', value: freeAgents ? 'Imported' : 'N/A', inline: true },
                    { name: 'Schedule', value: schedule ? 'Imported' : 'N/A', inline: true },
                    { name: 'Playoffs', value: playoffs ? 'Imported' : 'N/A', inline: true },
                    { name: 'Stats', value: statTypes.map(st => `${st}: ${Object.keys(stats[st]).length} weeks`).join(', ') }
                );
            await interaction.editReply({ embeds: [embed] });
            await interaction.editReply({ content: '✅ EA data loaded' });
            return;
        } catch (err) {
            console.error('Error syncing league data:', err);
            await interaction.editReply({ content: `❌ ${err.message}` });
            return;
        }
    }

    async function handleDraft(interaction, userId) {

    }


    // Step 4: Sync Player Stats (placeholder for now)
    async function syncPlayerStats(userId, leagueId) {
        // For now, just return success - player stats are included in roster
        return { statsUpdated: true };
    }

    // Step 5: Load Schedule Data (placeholder for now)
    async function loadScheduleData(userId, leagueId) {
        // Create basic schedule structure if it doesn't exist
        const scheduleData = maddenDataManager.readData('schedule') || [];

        // EA Sports API doesn't have schedule endpoint in current implementation
        // Generate placeholder schedule or maintain existing
        if (scheduleData.length === 0) {
            const teams = maddenDataManager.readData('teams') || [];
            const games = [];

            // Generate a simple round-robin schedule for demonstration
            for (let week = 1; week <= 18; week++) {
                for (let gameIndex = 0; gameIndex < Math.floor(teams.length / 2); gameIndex++) {
                    const homeTeam = teams[gameIndex * 2];
                    const awayTeam = teams[gameIndex * 2 + 1];

                    if (homeTeam && awayTeam) {
                        games.push({
                            gameId: `${week}-${gameIndex + 1}`,
                            week: week,
                            homeTeam: homeTeam.teamId,
                            awayTeam: awayTeam.teamId,
                            homeScore: null,
                            awayScore: null,
                            isCompleted: false,
                            gameDate: new Date(Date.now() + (week * 7 * 24 * 60 * 60 * 1000)).toISOString()
                        });
                    }
                }
            }

            maddenDataManager.writeData('schedule', games);
            return { gamesCreated: games.length };
        }

        return { gamesLoaded: scheduleData.length };
    }

    // Step 6: Update Standings
    async function updateStandings(userId, leagueId) {
        const teams = maddenDataManager.readData('teams') || [];

        // Create standings from team records
        const standings = teams.map(team => ({
            teamId: team.teamId,
            teamName: team.teamName,
            wins: team.wins,
            losses: team.losses,
            ties: team.ties,
            winPercentage: team.wins / Math.max(team.wins + team.losses + team.ties, 1),
            conference: team.conference,
            division: team.division
        }));

        // Sort by win percentage
        standings.sort((a, b) => b.winPercentage - a.winPercentage);

        maddenDataManager.writeData('standings', standings);
        return { teamsUpdated: standings.length };
    }

    // Step 7: Finalize Import
    async function finalizeImport(userId, leagueId, leagueName) {
        // Update league info
        const leagueData = {
            leagueId: leagueId,
            leagueName: leagueName,
            lastSync: new Date().toISOString(),
            eaSportsConnected: true,
            syncedBy: userId
        };

        maddenDataManager.writeData('league', leagueData);

        // Get import summary
        const teams = maddenDataManager.readData('teams') || [];
        const players = maddenDataManager.readData('players') || [];
        const schedule = maddenDataManager.readData('schedule') || [];

        return {
            teams: teams.length,
            players: players.length,
            games: schedule.length,
            leagueName: leagueName
        };
    }

}
export default eaSyncCommand;
