import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const SEASON_FILE = path.join(DATA_DIR, 'season.json');
const SCHEDULE_FILE = path.join(DATA_DIR, 'schedule.json');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');
const TEAMS_FILE = path.join(DATA_DIR, 'teams.json');
const PLAYOFFS_FILE = path.join(DATA_DIR, 'playoffs.json');

// Helper to read JSON
function readJSON(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
        console.error(`[readJSON] Failed to read ${file}:`, err);
        return null;
    }
}

// Helper to write JSON
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

// Check if all Week 18 games have been submitted and approved
function areAllWeek18GamesComplete() {
    const scheduleData = readJSON(SCHEDULE_FILE);
    const scoresData = readJSON(SCORES_FILE);
    const seasonData = readJSON(SEASON_FILE);

    if (!scheduleData || !scoresData || !seasonData) {
        return { complete: false, reason: 'Missing data files' };
    }

    // Check if we're at week 18 or later
    if (seasonData.currentWeek < 18) {
        return { complete: false, reason: `Current week is ${seasonData.currentWeek}, must be week 18 or later` };
    }

    // Find all Week 18 games
    const week18Games = scheduleData.filter(game => game.week === 18);

    if (week18Games.length === 0) {
        return { complete: false, reason: 'No Week 18 games found in schedule' };
    }

    // Check if all Week 18 games have scores submitted and approved
    for (const game of week18Games) {
        const gameScore = scoresData.find(score =>
            score.week === 18 &&
            score.homeTeam === game.homeTeam &&
            score.awayTeam === game.awayTeam
        );

        if (!gameScore) {
            return { complete: false, reason: `Missing score for ${game.awayTeam} @ ${game.homeTeam}` };
        }

        if (!gameScore.approved) {
            return { complete: false, reason: `Score not approved for ${game.awayTeam} @ ${game.homeTeam}` };
        }
    }

    return { complete: true, totalGames: week18Games.length };
}

// Create NBA playoff bracket structure
function createPlayoffBracket(eastStandings, westStandings) {
    // Parse standings (expecting format like "1. LAL, 2. BOS, 3. CLE...")
    const parseStandings = (standingsText) => {
        return standingsText.split(',')
            .map(item => item.trim())
            .map(item => {
                const match = item.match(/^\d+\.\s*(.+)$/);
                return match ? match[1].trim() : item.trim();
            })
            .filter(team => team.length > 0);
    };

    const eastTeams = parseStandings(eastStandings);
    const westTeams = parseStandings(westStandings);

    if (eastTeams.length !== 15) {
        throw new Error(`Eastern Conference must have exactly 15 teams, got ${eastTeams.length}`);
    }

    if (westTeams.length !== 15) {
        throw new Error(`Western Conference must have exactly 15 teams, got ${westTeams.length}`);
    }

    // Create bracket structure
    const bracket = {
        createdAt: new Date().toISOString(),
        regular_season_complete: true,
        conferences: {
            east: {
                standings: eastTeams.map((team, index) => ({ seed: index + 1, team })),
                playoff_teams: eastTeams.slice(0, 10), // Top 10 make playoffs/play-in
                playoffs: eastTeams.slice(0, 6), // Seeds 1-6 direct to playoffs
                playin: eastTeams.slice(6, 10) // Seeds 7-10 in play-in tournament
            },
            west: {
                standings: westTeams.map((team, index) => ({ seed: index + 1, team })),
                playoff_teams: westTeams.slice(0, 10), // Top 10 make playoffs/play-in
                playoffs: westTeams.slice(0, 6), // Seeds 1-6 direct to playoffs
                playin: westTeams.slice(6, 10) // Seeds 7-10 in play-in tournament
            }
        },
        playin_tournament: {
            east: {
                "7v8": { higher_seed: eastTeams[6], lower_seed: eastTeams[7], winner: null },
                "9v10": { higher_seed: eastTeams[8], lower_seed: eastTeams[9], winner: null },
                "loser_7v8_vs_winner_9v10": { team1: null, team2: null, winner: null }
            },
            west: {
                "7v8": { higher_seed: westTeams[6], lower_seed: westTeams[7], winner: null },
                "9v10": { higher_seed: westTeams[8], lower_seed: westTeams[9], winner: null },
                "loser_7v8_vs_winner_9v10": { team1: null, team2: null, winner: null }
            }
        },
        playoffs: {
            first_round: { east: [], west: [] },
            conference_semifinals: { east: [], west: [] },
            conference_finals: { east: null, west: null },
            finals: null
        },
        status: 'playin_ready' // playin_ready -> playin_complete -> playoffs_active -> complete
    };

    return bracket;
}

export const data = new SlashCommandBuilder()
    .setName('pushtoplayoffs')
    .setDescription('Initialize playoffs after regular season completion')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction) {
    try {
        // Check if user has staff permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                content: '❌ You need staff permissions to use this command.',
                ephemeral: true
            });
        }

        // Check if all Week 18 games are complete
        const gameCheck = areAllWeek18GamesComplete();

        if (!gameCheck.complete) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Cannot Initialize Playoffs')
                .setDescription('All Week 18 games must be completed and approved before initializing playoffs.')
                .addFields(
                    { name: 'Issue', value: gameCheck.reason, inline: false }
                );

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Check if playoffs already exist
        if (fs.existsSync(PLAYOFFS_FILE)) {
            const existingPlayoffs = readJSON(PLAYOFFS_FILE);
            if (existingPlayoffs && existingPlayoffs.regular_season_complete) {
                const embed = new EmbedBuilder()
                    .setColor('#FF6600')
                    .setTitle('⚠️ Playoffs Already Initialized')
                    .setDescription('Playoffs have already been set up for this season.')
                    .addFields(
                        { name: 'Status', value: existingPlayoffs.status || 'Unknown', inline: true },
                        { name: 'Created', value: existingPlayoffs.createdAt ? new Date(existingPlayoffs.createdAt).toLocaleDateString() : 'Unknown', inline: true }
                    );

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }

        // Show success embed with button to enter standings
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🏀 Ready to Initialize Playoffs')
            .setDescription('All Week 18 games have been completed and approved!')
            .addFields(
                { name: '✅ Regular Season Complete', value: `${gameCheck.totalGames} games completed`, inline: true },
                { name: '📝 Next Step', value: 'Enter final standings for both conferences', inline: false },
                { name: '📋 Format', value: 'Enter teams in order: "1. Team Name, 2. Team Name, ..."', inline: false }
            );

        const button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('enter_playoff_standings')
                    .setLabel('Enter Final Standings')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📊')
            );

        await interaction.reply({ embeds: [embed], components: [button] });

    } catch (error) {
        console.error('Error in pushtoplayoffs command:', error);
        await interaction.reply({
            content: '❌ An error occurred while checking playoff readiness.',
            ephemeral: true
        });
    }
}

// Export for interaction handling
export { createPlayoffBracket, areAllWeek18GamesComplete };
