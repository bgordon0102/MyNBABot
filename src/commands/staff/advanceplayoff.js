import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, PermissionsBitField, EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { sendWelcomeAndButton } from '../../interactions/submit_score.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const PLAYOFFS_FILE = path.join(DATA_DIR, 'playoffs.json');
const SEASON_FILE = path.join(DATA_DIR, 'season.json');
const TEAMS_FILE = path.join(DATA_DIR, 'teams.json');

// Helper functions
function readJSON(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
        console.error(`[readJSON] Failed to read ${file}:`, err);
        return null;
    }
}

function writeJSON(file, data) {
    try {
        if (typeof data === 'undefined') {
            console.error(`[writeJSON] Tried to write undefined data to ${file}`);
            return;
        }
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(`[writeJSON] Failed to write to ${file}:`, err);
    }
}

// Determine current playoff phase and next phase
function getPlayoffPhase(playoffData) {
    const { status } = playoffData;

    const phases = [
        'playin_ready',      // Ready to start Play-In Round 1
        'playin_round1',     // Play-In Round 1 active (7v8, 9v10)
        'playin_round2',     // Play-In Round 2 active (loser 7v8 vs winner 9v10)
        'round1',            // Round 1 - Best of 3
        'round2',            // Round 2 - Best of 5  
        'conference_finals', // Conference Finals - Best of 5
        'finals',            // Finals - Best of 7
        'complete'           // Tournament complete
    ];

    const currentIndex = phases.indexOf(status);
    const nextPhase = currentIndex >= 0 && currentIndex < phases.length - 1 ? phases[currentIndex + 1] : null;

    return {
        current: status,
        next: nextPhase,
        categoryName: getPhaseCategoryName(nextPhase),
        seriesFormat: getSeriesFormat(nextPhase)
    };
}

// Get category name for each phase
function getPhaseCategoryName(phase) {
    const categories = {
        'playin_round1': '🎯 PLAY-IN ROUND 1',
        'playin_round2': '🎯 PLAY-IN ROUND 2',
        'round1': '🏀 ROUND 1',
        'round2': '🏀 ROUND 2',
        'conference_finals': '🏆 CONFERENCE FINALS',
        'finals': '🏆 FINALS'
    };
    return categories[phase] || '🏀 PLAYOFFS';
}

// Get series format (games needed to win)
function getSeriesFormat(phase) {
    const formats = {
        'playin_round1': { total: 1, toWin: 1, description: 'Single Game' },
        'playin_round2': { total: 1, toWin: 1, description: 'Single Game' },
        'round1': { total: 3, toWin: 2, description: 'Best of 3 (First to 2)' },
        'round2': { total: 5, toWin: 3, description: 'Best of 5 (First to 3)' },
        'conference_finals': { total: 5, toWin: 3, description: 'Best of 5 (First to 3)' },
        'finals': { total: 7, toWin: 4, description: 'Best of 7 (First to 4)' }
    };
    return formats[phase] || { total: 7, toWin: 4, description: 'Best of 7' };
}

// Generate matchups for current phase
function generateMatchups(playoffData, nextPhase, teamsData) {
    const { conferences, playin_tournament } = playoffData;
    let matchups = [];

    switch (nextPhase) {
        case 'playin_round1':
            // 7v8 and 9v10 for both conferences
            matchups = [
                {
                    teams: [conferences.east.standings[6].team, conferences.east.standings[7].team],
                    conference: 'east',
                    seed1: 7, seed2: 8,
                    description: 'East 7v8'
                },
                {
                    teams: [conferences.east.standings[8].team, conferences.east.standings[9].team],
                    conference: 'east',
                    seed1: 9, seed2: 10,
                    description: 'East 9v10'
                },
                {
                    teams: [conferences.west.standings[6].team, conferences.west.standings[7].team],
                    conference: 'west',
                    seed1: 7, seed2: 8,
                    description: 'West 7v8'
                },
                {
                    teams: [conferences.west.standings[8].team, conferences.west.standings[9].team],
                    conference: 'west',
                    seed1: 9, seed2: 10,
                    description: 'West 9v10'
                }
            ];
            break;

        case 'playin_round2':
            // Loser of 7v8 vs Winner of 9v10 (need to check results)
            const eastLoser78 = getLoserOf7v8(playin_tournament.east);
            const eastWinner910 = getWinnerOf9v10(playin_tournament.east);
            const westLoser78 = getLoserOf7v8(playin_tournament.west);
            const westWinner910 = getWinnerOf9v10(playin_tournament.west);

            if (eastLoser78 && eastWinner910) {
                matchups.push({
                    teams: [eastLoser78, eastWinner910],
                    conference: 'east',
                    description: 'East Play-In Final'
                });
            }

            if (westLoser78 && westWinner910) {
                matchups.push({
                    teams: [westLoser78, westWinner910],
                    conference: 'west',
                    description: 'West Play-In Final'
                });
            }
            break;

        case 'round1':
            // 1v8, 2v7, 3v6, 4v5 with play-in winners as 7th and 8th seeds
            const east7thSeed = getWinnerOf7v8(playin_tournament.east);
            const east8thSeed = getWinnerOfPlayinFinal(playin_tournament.east);
            const west7thSeed = getWinnerOf7v8(playin_tournament.west);
            const west8thSeed = getWinnerOfPlayinFinal(playin_tournament.west);

            // Eastern Conference Round 1
            matchups.push(
                { teams: [conferences.east.standings[0].team, east8thSeed], conference: 'east', description: '1v8 East' },
                { teams: [conferences.east.standings[1].team, east7thSeed], conference: 'east', description: '2v7 East' },
                { teams: [conferences.east.standings[2].team, conferences.east.standings[5].team], conference: 'east', description: '3v6 East' },
                { teams: [conferences.east.standings[3].team, conferences.east.standings[4].team], conference: 'east', description: '4v5 East' }
            );

            // Western Conference Round 1  
            matchups.push(
                { teams: [conferences.west.standings[0].team, west8thSeed], conference: 'west', description: '1v8 West' },
                { teams: [conferences.west.standings[1].team, west7thSeed], conference: 'west', description: '2v7 West' },
                { teams: [conferences.west.standings[2].team, conferences.west.standings[5].team], conference: 'west', description: '3v6 West' },
                { teams: [conferences.west.standings[3].team, conferences.west.standings[4].team], conference: 'west', description: '4v5 West' }
            );
            break;

        // Additional rounds would need results from previous rounds
        // For now, return empty array - would need to implement winner tracking
        default:
            matchups = [];
    }

    // Convert team names to team objects with abbreviations
    return matchups.map(matchup => ({
        ...matchup,
        team1: teamsData.find(t => t.name === matchup.teams[0]),
        team2: teamsData.find(t => t.name === matchup.teams[1])
    })).filter(m => m.team1 && m.team2);
}

// Helper functions to get play-in results
function getWinnerOf7v8(confPlayin) {
    return confPlayin["7v8"]?.winner || null;
}

function getLoserOf7v8(confPlayin) {
    const match = confPlayin["7v8"];
    if (!match?.winner) return null;
    return match.winner === match.higher_seed ? match.lower_seed : match.higher_seed;
}

function getWinnerOf9v10(confPlayin) {
    return confPlayin["9v10"]?.winner || null;
}

function getWinnerOfPlayinFinal(confPlayin) {
    return confPlayin["loser_7v8_vs_winner_9v10"]?.winner || null;
}

export const data = new SlashCommandBuilder()
    .setName('dev-advanceplayoff')
    .setDescription('Advance to the next playoff phase and create game channels')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction) {
    try {
        // Check staff permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                content: '❌ You need staff permissions to use this command.',
                ephemeral: true
            });
        }

        // Read playoff data
        const playoffData = readJSON(PLAYOFFS_FILE);
        if (!playoffData || !playoffData.regular_season_complete) {
            return interaction.reply({
                content: '❌ Playoffs have not been initialized yet. Use `/pushtoplayoffs` first.',
                ephemeral: true
            });
        }

        // Get phase information
        const phaseInfo = getPlayoffPhase(playoffData);

        if (!phaseInfo.next) {
            return interaction.reply({
                content: '🏆 Playoffs are already complete!',
                ephemeral: true
            });
        }

        // Read teams and season data
        const teamsData = readJSON(TEAMS_FILE);
        const seasonData = readJSON(SEASON_FILE);

        if (!teamsData || !seasonData) {
            return interaction.reply({
                content: '❌ Could not read teams or season data.',
                ephemeral: true
            });
        }

        // Generate matchups for next phase
        const matchups = generateMatchups(playoffData, phaseInfo.next, teamsData);

        if (matchups.length === 0) {
            return interaction.reply({
                content: `❌ No matchups available for ${phaseInfo.next}. Previous round may not be complete.`,
                ephemeral: true
            });
        }

        await interaction.deferReply();

        // Delete previous playoff category if it exists
        const prevCategories = interaction.guild.channels.cache.filter(c =>
            c.type === ChannelType.GuildCategory &&
            (c.name.includes('PLAY-IN') || c.name.includes('ROUND') || c.name.includes('FINALS'))
        );

        for (const category of prevCategories.values()) {
            const channels = interaction.guild.channels.cache.filter(ch => ch.parentId === category.id);
            for (const channel of channels.values()) {
                await channel.delete().catch(() => { });
            }
            await category.delete().catch(() => { });
        }

        // Create new category
        const newCategory = await interaction.guild.channels.create({
            name: phaseInfo.categoryName,
            type: ChannelType.GuildCategory,
        });

        // Get staff roles
        const commishRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'commish');
        const scheduleTrackerRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'schedule tracker');
        const coachRoleMap = seasonData.coachRoleMap || {};

        // Create channels for each matchup
        let channelsCreated = 0;
        for (const matchup of matchups) {
            const { team1, team2, description } = matchup;
            const channelName = `${team1.abbreviation.toLowerCase()}-vs-${team2.abbreviation.toLowerCase()}`;

            // Get coach roles
            const team1RoleId = coachRoleMap[team1.name];
            const team2RoleId = coachRoleMap[team2.name];

            // Set permissions
            const coachPerms = [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory
            ];

            const permissionOverwrites = [
                { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: coachPerms }
            ];

            if (team1RoleId) permissionOverwrites.push({ id: team1RoleId, allow: coachPerms });
            if (team2RoleId) permissionOverwrites.push({ id: team2RoleId, allow: coachPerms });
            if (commishRole) permissionOverwrites.push({ id: commishRole.id, allow: coachPerms });
            if (scheduleTrackerRole) permissionOverwrites.push({ id: scheduleTrackerRole.id, allow: coachPerms });

            // Create channel
            const gameChannel = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: newCategory.id,
                permissionOverwrites,
            });

            // Send welcome message
            try {
                // Use the existing sendWelcomeAndButton function with "PLAYOFF" as week indicator
                await sendWelcomeAndButton(gameChannel, 'PLAYOFF', seasonData.seasonNo || 1);

                // Then send additional playoff-specific information
                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle(`🏀 ${matchup.description}`)
                    .addFields(
                        { name: '📊 Series Format', value: phaseInfo.seriesFormat.description, inline: true },
                        { name: '🏆 Games to Win', value: phaseInfo.seriesFormat.toWin.toString(), inline: true }
                    )
                    .setFooter({ text: 'Good luck to both teams!' });

                await gameChannel.send({ embeds: [embed] });
            } catch (error) {
                console.error('Failed to send playoff welcome message:', error);
            }

            channelsCreated++;
        }

        // Update playoff status
        playoffData.status = phaseInfo.next;
        writeJSON(PLAYOFFS_FILE, playoffData);

        // Send success message
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle(`🏀 ${phaseInfo.categoryName}`)
            .setDescription(`Successfully created ${channelsCreated} playoff matchup channels.`)
            .addFields(
                { name: '📊 Series Format', value: phaseInfo.seriesFormat.description, inline: true },
                { name: '🎮 Matchups Created', value: matchups.map(m => m.description).join('\n'), inline: false }
            )
            .setFooter({ text: 'Coaches can now submit scores for their playoff games!' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error in advanceplayoff command:', error);
        const content = '❌ An error occurred while advancing playoffs.';

        if (interaction.deferred) {
            await interaction.editReply({ content });
        } else {
            await interaction.reply({ content, ephemeral: true });
        }
    }
}


