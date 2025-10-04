import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fs from 'fs';

const SEASON_FILE = './data/season.json';
const SCORES_FILE = './data/scores.json';

const EAST = [
    'Hawks', 'Celtics', 'Nets', 'Hornets', 'Bulls', 'Cavaliers', 'Pistons', 'Pacers', 'Heat', 'Bucks', 'Knicks', 'Magic', '76ers', 'Raptors', 'Wizards'
];
const WEST = [
    'Mavericks', 'Nuggets', 'Warriors', 'Rockets', 'Clippers', 'Lakers', 'Grizzlies', 'Timberwolves', 'Pelicans', 'Thunder', 'Suns', 'Trail Blazers', 'Kings', 'Spurs', 'Jazz'
];

function getStandings() {
    if (!fs.existsSync(SEASON_FILE) || !fs.existsSync(SCORES_FILE)) return null;
    const season = JSON.parse(fs.readFileSync(SEASON_FILE, 'utf8'));
    const scores = JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8'));
    const teams = season.teams;
    const standings = {};
    for (const team of teams) {
        standings[team] = { team, wins: 0, losses: 0, winPct: 0, gb: 0 };
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
    for (const team of teams) {
        const s = standings[team];
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

export const data = new SlashCommandBuilder()
    .setName('playoffpicture')
    .setDescription('Show the current NBA-style playoff bracket and play-in teams for each conference.');

export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const standings = getStandings();
    if (!standings) {
        return await interaction.editReply('Standings data not available.');
    }
    const east = getPlayoffPicture(standings.east);
    const west = getPlayoffPicture(standings.west);
    function formatSeed(s, i) {
        return `**${i + 1}. ${s.team}**  (${s.wins}-${s.losses}, .${String(Math.round(s.winPct * 1000)).padStart(3, '0')})`;
    }
    const eastPlayoff = east.playoff.map(formatSeed).join('\n');
    const eastPlayin = east.playin.map((s, i) => formatSeed(s, i + 6)).join('\n');
    const westPlayoff = west.playoff.map(formatSeed).join('\n');
    const westPlayin = west.playin.map((s, i) => formatSeed(s, i + 6)).join('\n');
    const embed = new EmbedBuilder()
        .setTitle('NBA Playoff Picture')
        .addFields(
            { name: 'East Playoff Seeds (1-6)', value: eastPlayoff || 'N/A', inline: false },
            { name: 'East Play-In (7-10)', value: eastPlayin || 'N/A', inline: false },
            { name: 'West Playoff Seeds (1-6)', value: westPlayoff || 'N/A', inline: false },
            { name: 'West Play-In (7-10)', value: westPlayin || 'N/A', inline: false }
        )
        .setColor(0xE03A3E)
        .setFooter({ text: 'Top 6: Playoff | 7-10: Play-In | NBA Playoff Format' });
    await interaction.editReply({ embeds: [embed] });
}
