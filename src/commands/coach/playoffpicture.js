import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fs from 'fs';

const SEASON_FILE = './data/2k/season.json';
const SCORES_FILE = './data/2k/scores.json';
const PLAYOFFS_FILE = './data/playoffs.json';

const EAST = [
    'Atlanta Hawks', 'Boston Celtics', 'Brooklyn Nets', 'Charlotte Hornets', 'Chicago Bulls', 'Cleveland Cavaliers', 'Detroit Pistons', 'Indiana Pacers', 'Miami Heat', 'Milwaukee Bucks', 'New York Knicks', 'Orlando Magic', 'Philadelphia 76ers', 'Toronto Raptors', 'Washington Wizards'
];
const WEST = [
    'Dallas Mavericks', 'Denver Nuggets', 'Golden State Warriors', 'Houston Rockets', 'LA Clippers', 'Los Angeles Lakers', 'Memphis Grizzlies', 'Minnesota Timberwolves', 'New Orleans Pelicans', 'Oklahoma City Thunder', 'Phoenix Suns', 'Portland Trail Blazers', 'Sacramento Kings', 'San Antonio Spurs', 'Utah Jazz'
];

function getStandings() {
    const TEAMS_FILE = './data/2k/teams.json';
    if (!fs.existsSync(TEAMS_FILE) || !fs.existsSync(SCORES_FILE)) return null;
    const teamsArr = JSON.parse(fs.readFileSync(TEAMS_FILE, 'utf8'));
    const scores = JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8'));
    // Initialize standings
    const standings = {};
    for (const team of teamsArr) {
        standings[team.name] = { team: team.name, wins: 0, losses: 0, winPct: 0, gb: 0 };
    }
    for (const game of scores) {
        if (!game.approved) continue;
        const { teamA, teamB, scoreA, scoreB } = game;
        if (!standings[teamA] || !standings[teamB]) continue;
        if (scoreA > scoreB) {
            standings[teamA].wins++;
            standings[teamB].losses++;
        } else if (scoreB > scoreA) {
            standings[teamB].wins++;
            standings[teamA].losses++;
        }
    }
    for (const team of teamsArr) {
        const s = standings[team.name];
        const total = s.wins + s.losses;
        s.winPct = total > 0 ? (s.wins / total) : 0;
    }
    function sortConf(conf) {
        const arr = conf.filter(t => standings[t]).map(t => standings[t]);
        arr.sort((a, b) => b.winPct - a.winPct || b.wins - a.wins || a.losses - b.losses || a.team.localeCompare(b.team));
        return arr;
    }
    return {
        east: sortConf(EAST),
        west: sortConf(WEST)
    };
}

function getPlayoffPicture(confArr) {
    // NBA Playoff logic: Top 6 = Playoff, 7-10 = Play-In
    // Seeds 1-6: Playoff, 7-10: Play-In
    return {
        playoff: confArr.slice(0, 6),
        playin: confArr.slice(6, 10)
    };
}

// Read finalized playoff data if available
function getPlayoffData() {
    if (!fs.existsSync(PLAYOFFS_FILE)) {
        return null;
    }
    try {
        return JSON.parse(fs.readFileSync(PLAYOFFS_FILE, 'utf8'));
    } catch (error) {
        console.error('Error reading playoff data:', error);
        return null;
    }
}

export const data = new SlashCommandBuilder()
    .setName('playoffpicture')
    .setDescription('Show the current NBA-style playoff bracket and play-in teams for each conference.');

export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Check if playoffs have been finalized
    const playoffData = getPlayoffData();

    if (playoffData && playoffData.regular_season_complete) {
        // Show finalized playoff bracket
        return showFinalizedPlayoffs(interaction, playoffData);
    } else {
        // Show current standings-based projection
        return showCurrentProjection(interaction);
    }
}

// Show finalized playoff bracket
async function showFinalizedPlayoffs(interaction, playoffData) {
    const { conferences, playin_tournament, status } = playoffData;

    // Helper function to format playoff teams
    function formatPlayoffTeams(teams) {
        return teams.map((team, idx) => `${idx + 1}. ${team}`).join('\n') || 'TBD';
    }

    // Helper function to format play-in teams
    function formatPlayinTeams(teams) {
        return teams.map((team, idx) => `${idx + 7}. ${team}`).join('\n') || 'TBD';
    }

    // Helper function to format play-in matchups
    function formatPlayinMatchups(conf) {
        const tourney = playin_tournament[conf];
        let matchups = [];

        if (tourney["7v8"]) {
            const match = tourney["7v8"];
            matchups.push(`7️⃣ ${match.higher_seed} vs 8️⃣ ${match.lower_seed} ${match.winner ? `✅ **${match.winner}**` : ''}`);
        }

        if (tourney["9v10"]) {
            const match = tourney["9v10"];
            matchups.push(`9️⃣ ${match.higher_seed} vs 🔟 ${match.lower_seed} ${match.winner ? `✅ **${match.winner}**` : ''}`);
        }

        if (tourney["loser_7v8_vs_winner_9v10"] && tourney["loser_7v8_vs_winner_9v10"].team1) {
            const match = tourney["loser_7v8_vs_winner_9v10"];
            matchups.push(`${match.team1} vs ${match.team2} ${match.winner ? `✅ **${match.winner}**` : ''}`);
        }

        return matchups.join('\n') || 'Matchups TBD';
    }

    const statusEmoji = {
        'playin_ready': '🎯',
        'playin_active': '⚡',
        'playin_complete': '✅',
        'playoffs_active': '🏀',
        'complete': '🏆'
    };

    const eastEmbed = new EmbedBuilder()
        .setTitle(`${statusEmoji[status] || '🏀'} Eastern Conference - ${status.replace('_', ' ').toUpperCase()}`)
        .addFields(
            {
                name: '🏆 Playoff Teams (Seeds 1-6)',
                value: formatPlayoffTeams(conferences.east.playoffs),
                inline: true
            },
            {
                name: '🎯 Play-In Teams (Seeds 7-10)',
                value: formatPlayinTeams(conferences.east.playin),
                inline: true
            },
            {
                name: '\u200B',
                value: '\u200B',
                inline: false
            },
            {
                name: 'Play-In Tournament Matchups',
                value: formatPlayinMatchups('east'),
                inline: false
            }
        )
        .setColor(0x1D428A)
        .setFooter({ text: 'Finalized Playoff Bracket' });

    const westEmbed = new EmbedBuilder()
        .setTitle(`${statusEmoji[status] || '🏀'} Western Conference - ${status.replace('_', ' ').toUpperCase()}`)
        .addFields(
            {
                name: '🏆 Playoff Teams (Seeds 1-6)',
                value: formatPlayoffTeams(conferences.west.playoffs),
                inline: true
            },
            {
                name: '🎯 Play-In Teams (Seeds 7-10)',
                value: formatPlayinTeams(conferences.west.playin),
                inline: true
            },
            {
                name: '\u200B',
                value: '\u200B',
                inline: false
            },
            {
                name: 'Play-In Tournament Matchups',
                value: formatPlayinMatchups('west'),
                inline: false
            }
        )
        .setColor(0xE03A3E)
        .setFooter({ text: 'Finalized Playoff Bracket' });

    await interaction.editReply({ embeds: [eastEmbed, westEmbed] });
}

// Show current standings projection (original functionality)
async function showCurrentProjection(interaction) {
    const standings = getStandings();
    if (!standings) {
        return await interaction.editReply('Standings data not available.');
    }

    const east = getPlayoffPicture(standings.east);
    const west = getPlayoffPicture(standings.west);

    function getTeamName(arr, idx) {
        return arr[idx] ? arr[idx].team : 'TBD';
    }

    // Playoff matchups: 1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5 (NBA format)
    function playoffMatchups(conf) {
        return [
            `1️⃣ ${getTeamName(conf, 0)} vs 8️⃣ ${getTeamName(conf, 7)}`,
            `2️⃣ ${getTeamName(conf, 1)} vs 7️⃣ ${getTeamName(conf, 6)}`,
            `3️⃣ ${getTeamName(conf, 2)} vs 6️⃣ ${getTeamName(conf, 5)}`,
            `4️⃣ ${getTeamName(conf, 3)} vs 5️⃣ ${getTeamName(conf, 4)}`
        ].join('\n');
    }

    // Play-In matchups: 7 vs 10, 8 vs 9
    function playinMatchups(conf) {
        return [
            `7️⃣ ${getTeamName(conf, 6)} vs 🔟 ${getTeamName(conf, 9)}`,
            `8️⃣ ${getTeamName(conf, 7)} vs 9️⃣ ${getTeamName(conf, 8)}`
        ].join('\n');
    }

    const eastEmbed = new EmbedBuilder()
        .setTitle('🏆 Eastern Conference Playoff Picture (Current)')
        .addFields(
            { name: 'Projected Playoff Matchups', value: playoffMatchups(standings.east), inline: false },
            { name: 'Projected Play-In Matchups', value: playinMatchups(standings.east), inline: false }
        )
        .setColor(0x1D428A)
        .setFooter({ text: 'Top 6: Playoff | 7-10: Play-In | Based on current standings' });

    const westEmbed = new EmbedBuilder()
        .setTitle('🏆 Western Conference Playoff Picture (Current)')
        .addFields(
            { name: 'Projected Playoff Matchups', value: playoffMatchups(standings.west), inline: false },
            { name: 'Projected Play-In Matchups', value: playinMatchups(standings.west), inline: false }
        )
        .setColor(0xE03A3E)
        .setFooter({ text: 'Top 6: Playoff | 7-10: Play-In | Based on current standings' });

    await interaction.editReply({ embeds: [eastEmbed, westEmbed] });
}
