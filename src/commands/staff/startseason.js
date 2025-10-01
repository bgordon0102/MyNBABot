import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import fs from 'fs';

const SCHEDULE_FILE = './data/schedule.json';

// Helper to write JSON
function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Generate a proper round-robin schedule
function generateSeasonSchedule(teams, gameno) {
    const totalTeams = teams.length;
    const weeks = {};

    if (totalTeams === 30 && (gameno === 29 || gameno === 58)) {
        let n = teams.length;
        let rrTeams = [...teams];
        if (n % 2 !== 0) rrTeams.push('BYE');

        let rounds = n - 1;
        let gamesPerWeek = n / 2;
        let allSchedule = [];

        // First round-robin (29 games)
        for (let round = 0; round < rounds; round++) {
            let weekGames = [];
            for (let i = 0; i < gamesPerWeek; i++) {
                let team1 = rrTeams[i];
                let team2 = rrTeams[n - 1 - i];
                if (team1 === 'BYE' || team2 === 'BYE') continue;

                weekGames.push({
                    teamA: team1,
                    teamB: team2,
                    scoreA: null,
                    scoreB: null,
                    approved: false,
                    channelId: null
                });
            }
            allSchedule.push(...weekGames);

            // Rotate teams (keep first team fixed, rotate others)
            let newTeams = [rrTeams[0], rrTeams[n - 1], ...rrTeams.slice(1, n - 1)];
            rrTeams = newTeams;
        }

        // Second round-robin for 58 games (reverse home/away)
        if (gameno === 58) {
            rrTeams = [...teams];
            if (n % 2 !== 0) rrTeams.push('BYE');

            for (let round = 0; round < rounds; round++) {
                let weekGames = [];
                for (let i = 0; i < gamesPerWeek; i++) {
                    let team1 = rrTeams[n - 1 - i]; // Reverse for home/away
                    let team2 = rrTeams[i];
                    if (team1 === 'BYE' || team2 === 'BYE') continue;

                    weekGames.push({
                        teamA: team1,
                        teamB: team2,
                        scoreA: null,
                        scoreB: null,
                        approved: false,
                        channelId: null
                    });
                }
                allSchedule.push(...weekGames);

                // Rotate teams
                let newTeams = [rrTeams[0], rrTeams[n - 1], ...rrTeams.slice(1, n - 1)];
                rrTeams = newTeams;
            }
        }

        // Organize games into weeks
        const gamesPerWeekFinal = Math.floor(totalTeams / 2);
        let weekNum = 1;

        for (let i = 0; i < allSchedule.length; i += gamesPerWeekFinal) {
            weeks[weekNum] = allSchedule.slice(i, i + gamesPerWeekFinal);
            weekNum++;
        }

    } else {
        // Fallback for non-30 team leagues
        const allMatchups = [];
        for (let i = 0; i < totalTeams; i++) {
            for (let j = i + 1; j < totalTeams; j++) {
                allMatchups.push({
                    teamA: teams[i],
                    teamB: teams[j],
                    scoreA: null,
                    scoreB: null,
                    approved: false,
                    channelId: null
                });
            }
        }

        const matchupList = gameno === 58 ? [...allMatchups, ...allMatchups] : allMatchups;
        const matchupsPerWeek = Math.floor(totalTeams / 2);
        let weekNum = 1;

        for (let i = 0; i < matchupList.length; i += matchupsPerWeek) {
            weeks[weekNum] = matchupList.slice(i, i + matchupsPerWeek);
            weekNum++;
        }
    }

    return weeks;
}

export const data = new SlashCommandBuilder()
    .setName('startseason')
    .setDescription('Initialize a new NBA 2K season with deterministic schedule (placeholder only).')
    .addIntegerOption(option =>
        option.setName('gameno')
            .setDescription('Total games per team (29 or 58)')
            .setRequired(true))
    .addIntegerOption(option =>
        option.setName('seasonno')
            .setDescription('Season number')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    const gameno = interaction.options.getInteger('gameno');
    const seasonno = interaction.options.getInteger('seasonno');

    if (![29, 58].includes(gameno)) {
        return interaction.reply({ content: 'Invalid gameno. Only 29 or 58 are supported.', flags: 64 });
    }

    if (fs.existsSync(SCHEDULE_FILE)) {
        const existing = JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
        if (existing.currentWeek > 0) {
            return interaction.reply({ content: 'A season is already active. Use /resetseason to overwrite.', flags: 64 });
        }
    }

    // Only NBA team coach roles (exclude "Head Coach")
    const allCoachRoles = interaction.guild.roles.cache
        .filter(r => r.name.match(/.+ Coach$/i))
        .map(r => r.name);

    console.log('All coach roles found:', allCoachRoles);

    const teamRoles = interaction.guild.roles.cache
        .filter(r => r.name.match(/.+ Coach$/i) && r.name !== 'Head Coach')
        .map(r => r.name.replace(/ Coach$/i, ''));

    console.log('Team roles after filtering:', teamRoles);

    if (teamRoles.length < 2) {
        return interaction.reply({ content: 'Not enough teams to create a season (minimum 2).', flags: 64 });
    }

    const weeks = generateSeasonSchedule(teamRoles, gameno);

    const scheduleData = {
        seasonNo: seasonno,
        currentWeek: 0,
        teams: teamRoles,
        gameno,
        weeks
    };

    writeJSON(SCHEDULE_FILE, scheduleData);

    await interaction.reply({
        content: `New season initialized with ${teamRoles.length} teams! Week channels will be created using /advanceweek.`,
        ephemeral: false
    });
}
