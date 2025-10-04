import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';

const SEASON_FILE = './data/season.json';
const TEAMS_FILE = './data/teams.json';
const LEAGUE_FILE = './data/league.json';
const PLAYERS_FILE = './data/players.json';
const BIGBOARD_FILE = './data/bigboard.json';
const SCOUTING_FILE = './data/scouting.json';
const RECRUITS_FILE = './data/recruits.json';

// Helper to write JSON
function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Generate a week-based round-robin schedule: each team plays one game per week
function generateWeekBasedSchedule(teams, gameno) {
    // Standard round-robin (circle method)
    const n = teams.length;
    const rounds = n - 1;
    const schedule = [];
    let id = 0;
    let teamList = [...teams];
    if (n % 2 !== 0) teamList.push(null); // Add bye if odd
    const numTeams = teamList.length;
    const half = numTeams / 2;
    for (let round = 0; round < rounds; round++) {
        const weekGames = [];
        for (let i = 0; i < half; i++) {
            const t1 = teamList[i];
            const t2 = teamList[numTeams - 1 - i];
            if (t1 && t2) {
                weekGames.push({ id: id++, team1: t1, team2: t2 });
            }
        }
        schedule.push(weekGames);
        // Rotate teams (except first)
        teamList = [teamList[0], teamList[numTeams - 1], ...teamList.slice(1, numTeams - 1)];
    }
    // Only single round robin (29 games per team)
    return schedule;
}

export const data = new SlashCommandBuilder()
    .setName('startseason')
    .setDescription('Start a new NBA 2K season. If data exists, you will be prompted to confirm reset.')
    .addIntegerOption(option =>
        option.setName('seasonno')
            .setDescription('Season number')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction, seasonnoOverride = null) {
    const gameno = 29; // Always 29 games per team
    let seasonno = seasonnoOverride;
    if (!seasonno) {
        if (interaction.options && typeof interaction.options.getInteger === 'function') {
            seasonno = interaction.options.getInteger('seasonno');
        } else if (interaction.customId && interaction.customId.startsWith('startseason_confirm_')) {
            // Try to extract from customId: startseason_confirm_<seasonno>
            const parts = interaction.customId.split('_');
            seasonno = parseInt(parts[2], 10);
        }
    }
    if (!seasonno) {
        await interaction.editReply({ content: 'Error: Could not determine season number.', ephemeral: true });
        return;
    }

    // Check if any data files exist
    const filesExist = [SEASON_FILE, TEAMS_FILE, LEAGUE_FILE, PLAYERS_FILE, BIGBOARD_FILE, SCOUTING_FILE, RECRUITS_FILE].some(f => fs.existsSync(f));
    if (filesExist && !interaction.customId?.startsWith('startseason_confirm')) {
        // Store the season number in the customId for confirmation
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`startseason_confirm_${seasonno}`)
                .setLabel('Confirm Reset & Start New Season')
                .setStyle(ButtonStyle.Danger)
        );
        const warningMsg = '⚠️ League/season data already exists!\n**Running this command will ERASE ALL current league data and start a new season.**';
        // Always defer reply if not already done
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: true });
        }
        await interaction.editReply({
            content: warningMsg,
            components: [row],
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    // Delete all old data files if they exist
    [SEASON_FILE, TEAMS_FILE, LEAGUE_FILE, PLAYERS_FILE, BIGBOARD_FILE, SCOUTING_FILE, RECRUITS_FILE].forEach(f => {
        if (fs.existsSync(f)) {
            try { fs.unlinkSync(f); } catch (e) { console.warn(`Could not delete ${f}:`, e.message); }
        }
    });

    // Static NBA team list (shuffled for random schedule)
    const nbaTeams = [
        { id: 1, name: "Atlanta Hawks", abbreviation: "ATL" },
        { id: 2, name: "Boston Celtics", abbreviation: "BOS" },
        { id: 3, name: "Brooklyn Nets", abbreviation: "BKN" },
        { id: 4, name: "Charlotte Hornets", abbreviation: "CHA" },
        { id: 5, name: "Chicago Bulls", abbreviation: "CHI" },
        { id: 6, name: "Cleveland Cavaliers", abbreviation: "CLE" },
        { id: 7, name: "Dallas Mavericks", abbreviation: "DAL" },
        { id: 8, name: "Denver Nuggets", abbreviation: "DEN" },
        { id: 9, name: "Detroit Pistons", abbreviation: "DET" },
        { id: 10, name: "Golden State Warriors", abbreviation: "GSW" },
        { id: 11, name: "Houston Rockets", abbreviation: "HOU" },
        { id: 12, name: "Indiana Pacers", abbreviation: "IND" },
        { id: 13, name: "LA Clippers", abbreviation: "LAC" },
        { id: 14, name: "Los Angeles Lakers", abbreviation: "LAL" },
        { id: 15, name: "Memphis Grizzlies", abbreviation: "MEM" },
        { id: 16, name: "Miami Heat", abbreviation: "MIA" },
        { id: 17, name: "Milwaukee Bucks", abbreviation: "MIL" },
        { id: 18, name: "Minnesota Timberwolves", abbreviation: "MIN" },
        { id: 19, name: "New Orleans Pelicans", abbreviation: "NOP" },
        { id: 20, name: "New York Knicks", abbreviation: "NYK" },
        { id: 21, name: "Oklahoma City Thunder", abbreviation: "OKC" },
        { id: 22, name: "Orlando Magic", abbreviation: "ORL" },
        { id: 23, name: "Philadelphia 76ers", abbreviation: "PHI" },
        { id: 24, name: "Phoenix Suns", abbreviation: "PHX" },
        { id: 25, name: "Portland Trail Blazers", abbreviation: "POR" },
        { id: 26, name: "Sacramento Kings", abbreviation: "SAC" },
        { id: 27, name: "San Antonio Spurs", abbreviation: "SAS" },
        { id: 28, name: "Toronto Raptors", abbreviation: "TOR" },
        { id: 29, name: "Utah Jazz", abbreviation: "UTA" },
        { id: 30, name: "Washington Wizards", abbreviation: "WAS" }
    ];
    // Shuffle for random schedule
    const staticTeams = nbaTeams.map(team => ({ ...team, coach: null }));
    for (let i = staticTeams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [staticTeams[i], staticTeams[j]] = [staticTeams[j], staticTeams[i]];
    }

    // Map: team name -> coach role (if exists)
    const coachRoleMap = {};
    for (const team of staticTeams) {
        const role = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === `${team.name.toLowerCase()} coach`);
        if (role) coachRoleMap[team.name] = role.id;
    }
    console.log('Coach role map:', coachRoleMap);

    const schedule = generateWeekBasedSchedule(staticTeams, gameno);

    // Save to season.json as week-based array, with ids and coachRoleMap


    // Define all new file paths
    const SCHEDULE_FILE = './data/schedule.json';
    const TEAMS_FILE_NEW = './data/teams.json';
    const COACHROLEMAP_FILE = './data/coachRoleMap.json';
    const PROSPECTBOARDS_FILE = './data/prospectBoards.json';
    const STANDINGS_FILE = './data/standings.json';

    // Always create prospectBoards for season 1
    const prospectBoards = {
        pre: "./CUS01/2k26_CUS01 - Preseason Big Board.json",
        mid: "./CUS01/2k26_CUS01 - Midseason Big Board.json",
        final: "./CUS01/2k26_CUS01 - Final Big Board.json"
    };

    // Delete and recreate all needed files as blank for a new season (including prospect boards)
    const allFiles = [
        SCHEDULE_FILE, TEAMS_FILE_NEW, COACHROLEMAP_FILE, PROSPECTBOARDS_FILE, STANDINGS_FILE,
        LEAGUE_FILE, PLAYERS_FILE, BIGBOARD_FILE, SCOUTING_FILE, RECRUITS_FILE, './data/scout_points.json',
        prospectBoards.pre, prospectBoards.mid, prospectBoards.final
    ];
    allFiles.forEach(file => {
        // Always resolve to the workspace root
        const filePath = path.resolve(process.cwd(), file.replace('./', ''));
        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch { }
        // Initialize teams.json as an array, others as objects
        if (filePath.endsWith('teams.json')) {
            fs.writeFileSync(filePath, JSON.stringify([], null, 2));
        } else {
            fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
        }
    });

    // Always overwrite all data files with fresh content for a new season
    const seasonData = {
        currentWeek: 0,
        seasonNo: seasonno
    };
    fs.writeFileSync(SEASON_FILE, JSON.stringify(seasonData, null, 2));

    // Overwrite schedule.json
    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedule, null, 2));
    // Overwrite teams.json (ensure correct path)
    const teamsFilePath = path.resolve(process.cwd(), TEAMS_FILE_NEW.replace('./', ''));
    console.log('[startseason] Writing teams.json to:', teamsFilePath);
    console.log('[startseason] Teams data:', JSON.stringify(staticTeams, null, 2));
    fs.writeFileSync(teamsFilePath, JSON.stringify(staticTeams, null, 2));
    console.log('[startseason] teams.json write complete.');
    // Overwrite coachRoleMap.json
    fs.writeFileSync(COACHROLEMAP_FILE, JSON.stringify(coachRoleMap, null, 2));
    // Overwrite prospectBoards.json
    fs.writeFileSync(PROSPECTBOARDS_FILE, JSON.stringify(prospectBoards, null, 2));
    // Overwrite standings.json (initialize all to 0)
    const standings = {};
    staticTeams.forEach(team => {
        standings[team] = { wins: 0, losses: 0, ties: 0, games: 0, pointsFor: 0, pointsAgainst: 0 };
    });
    fs.writeFileSync(STANDINGS_FILE, JSON.stringify(standings, null, 2));

    // Send confirmation message using the correct method for the interaction type
    const msg = {
        content: `All old league data cleared. New season initialized with ${staticTeams.length} teams! Week channels will be created using /advanceweek.`,
        ephemeral: false
    };
    if (interaction.deferred || interaction.replied) {
        await interaction.editReply(msg);
    } else if (interaction.isButton && interaction.isButton()) {
        await interaction.followUp(msg);
    } else {
        await interaction.reply(msg);
    }
}
