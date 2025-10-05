// Required for Discord interaction loader
export const customId = 'submit_score';
export const execute = handleButton;
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits, ChannelType, InteractionType } from 'discord.js';
import fs from 'fs';

const SEASON_FILE = './data/season.json';
const SCORES_FILE = './data/scores.json';

// Helper to read/write scores
function readScores() {
    if (!fs.existsSync(SCORES_FILE)) return [];
    return JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8'));
}
function writeScores(scores) {
    fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2));
}

export async function sendWelcomeAndButton(channel, week, seasonNo) {
    // Tag both coach roles using coachRoleMap.json and full team names
    let team1RoleId = null, team2RoleId = null;
    try {
        // Extract team abbreviations from channel name
        const match = channel.name.match(/^(.*?)-vs-(.*?)$/);
        if (match) {
            const abbrToFull = {
                ATL: 'Atlanta Hawks', BOS: 'Boston Celtics', BKN: 'Brooklyn Nets', CHA: 'Charlotte Hornets', CHI: 'Chicago Bulls', CLE: 'Cleveland Cavaliers', DAL: 'Dallas Mavericks', DEN: 'Denver Nuggets', DET: 'Detroit Pistons', GSW: 'Golden State Warriors', HOU: 'Houston Rockets', IND: 'Indiana Pacers', LAC: 'LA Clippers', LAL: 'Los Angeles Lakers', MEM: 'Memphis Grizzlies', MIA: 'Miami Heat', MIL: 'Milwaukee Bucks', MIN: 'Minnesota Timberwolves', NOP: 'New Orleans Pelicans', NYK: 'New York Knicks', OKC: 'Oklahoma City Thunder', ORL: 'Orlando Magic', PHI: 'Philadelphia 76ers', PHX: 'Phoenix Suns', POR: 'Portland Trail Blazers', SAC: 'Sacramento Kings', SAS: 'San Antonio Spurs', TOR: 'Toronto Raptors', UTA: 'Utah Jazz', WAS: 'Washington Wizards'
            };
            const abbr1 = match[1].toUpperCase();
            const abbr2 = match[2].toUpperCase();
            const team1Full = abbrToFull[abbr1] || abbr1;
            const team2Full = abbrToFull[abbr2] || abbr2;
            // Load coachRoleMap.json
            let coachRoleMap = {};
            try {
                coachRoleMap = JSON.parse(fs.readFileSync('./data/coachRoleMap.json', 'utf8'));
            } catch { }
            team1RoleId = coachRoleMap[team1Full];
            team2RoleId = coachRoleMap[team2Full];
        }
    } catch { }
    const submitBtn = new ButtonBuilder()
        .setCustomId('submit_score')
        .setLabel('Submit Score')
        .setStyle(ButtonStyle.Primary);
    // 48-hour countdown from now
    const deadline = Math.floor(Date.now() / 1000) + 48 * 3600;
    let content = '';
    if (team1RoleId && team2RoleId) {
        content += `Welcome <@&${team1RoleId}> & <@&${team2RoleId}>!\n`;
    }
    content += 'Use this channel to coordinate your matchup. After your game, the winning coach should report the score using the button below.\n\n';
    content += `:alarm_clock: **Score must be submitted within <t:${deadline}:R> (<t:${deadline}:f>)**`;
    console.log('[sendWelcomeAndButton] Attempting to send welcome message to channel:', channel.name, 'ID:', channel.id);
    console.log('[sendWelcomeAndButton] Content:', content);
    try {
        await channel.send({
            content,
            components: [new ActionRowBuilder().addComponents(submitBtn)]
        });
        console.log('[sendWelcomeAndButton] Successfully sent welcome message to channel:', channel.name, 'ID:', channel.id);
    } catch (err) {
        console.error('[sendWelcomeAndButton] Failed to send welcome message to channel:', channel.name, 'ID:', channel.id, 'Error:', err);
    }
}

export async function handleButton(interaction) {
    console.log('[submit_score] DEBUG: handleButton called by user:', interaction.user.tag, 'ID:', interaction.user.id);
    // Restrict: Only coaches for this game can submit a score
    try {
        // Extract team abbreviations from channel name
        const match = interaction.channel.name.match(/^(.*?)-vs-(.*?)$/);
        if (match) {
            const abbrToNickname = {
                ATL: 'Hawks', BOS: 'Celtics', BKN: 'Nets', CHA: 'Hornets', CHI: 'Bulls', CLE: 'Cavaliers', DAL: 'Mavericks', DEN: 'Nuggets', DET: 'Pistons', GSW: 'Warriors', HOU: 'Rockets', IND: 'Pacers', LAC: 'Clippers', LAL: 'Lakers', MEM: 'Grizzlies', MIA: 'Heat', MIL: 'Bucks', MIN: 'Timberwolves', NOP: 'Pelicans', NYK: 'Knicks', OKC: 'Thunder', ORL: 'Magic', PHI: 'Sixers', PHX: 'Suns', POR: 'Trail Blazers', SAC: 'Kings', SAS: 'Spurs', TOR: 'Raptors', UTA: 'Jazz', WAS: 'Wizards'
            };
            const abbr1 = match[1].toUpperCase();
            const abbr2 = match[2].toUpperCase();
            const nickname1 = abbrToNickname[abbr1] || abbr1;
            const nickname2 = abbrToNickname[abbr2] || abbr2;
            const guild = interaction.guild;
            const team1Role = guild.roles.cache.find(r => r.name.toLowerCase() === `${nickname1.toLowerCase()} coach`);
            const team2Role = guild.roles.cache.find(r => r.name.toLowerCase() === `${nickname2.toLowerCase()} coach`);
            const member = await guild.members.fetch(interaction.user.id);
            // Debug logging
            console.log('[submit_score] User:', interaction.user.tag, 'ID:', interaction.user.id);
            console.log('[submit_score] Member roles:', member.roles.cache.map(r => r.name + ' (' + r.id + ')').join(', '));
            console.log('[submit_score] Team1 role:', team1Role ? team1Role.name + ' (' + team1Role.id + ')' : 'not found');
            console.log('[submit_score] Team2 role:', team2Role ? team2Role.name + ' (' + team2Role.id + ')' : 'not found');
            if (!member.roles.cache.has(team1Role?.id) && !member.roles.cache.has(team2Role?.id)) {
                await interaction.reply({ content: 'Only the coaches for this game can submit a score.', ephemeral: true });
                return;
            }
        }
    } catch (e) {
        console.error('[submit_score] Error during coach role check:', e);
        await interaction.reply({ content: 'Unable to verify coach role. Please contact an admin.', ephemeral: true });
        return;
    }
    // Open modal for score submission
    const modal = new ModalBuilder()
        .setCustomId('submit_score_modal')
        .setTitle('Submit Game Score');
    const teamA = new TextInputBuilder()
        .setCustomId('team_a')
        .setLabel('Team A')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    const teamB = new TextInputBuilder()
        .setCustomId('team_b')
        .setLabel('Team B')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    const scoreA = new TextInputBuilder()
        .setCustomId('score_a')
        .setLabel('Team A Score')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    const scoreB = new TextInputBuilder()
        .setCustomId('score_b')
        .setLabel('Team B Score')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    modal.addComponents(
        new ActionRowBuilder().addComponents(teamA),
        new ActionRowBuilder().addComponents(teamB),
        new ActionRowBuilder().addComponents(scoreA),
        new ActionRowBuilder().addComponents(scoreB)
    );
    await interaction.showModal(modal);
}

export async function handleModal(interaction) {
    // Get modal input
    const teamA = interaction.fields.getTextInputValue('team_a');
    const teamB = interaction.fields.getTextInputValue('team_b');
    const scoreA = interaction.fields.getTextInputValue('score_a');
    const scoreB = interaction.fields.getTextInputValue('score_b');

    // Try to infer season/week from channel name or ask if not found
    let seasonNo = null, week = null;
    if (fs.existsSync(SEASON_FILE)) {
        const season = JSON.parse(fs.readFileSync(SEASON_FILE, 'utf8'));
        seasonNo = season.seasonNo || 1;
        // Try to infer week from channel's parent/category name
        const cat = interaction.channel.parent;
        if (cat && cat.name.match(/Week (\d+)/)) {
            week = parseInt(cat.name.match(/Week (\d+)/)[1]);
        }
    }
    // If not found, ask for season/week (not implemented here for brevity)

    // Post for approval
    const scheduleTrackerRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'schedule tracker');
    const approveBtn = new ButtonBuilder()
        .setCustomId('approve_score')
        .setLabel('Approve')
        .setStyle(ButtonStyle.Success);
    const denyBtn = new ButtonBuilder()
        .setCustomId('deny_score')
        .setLabel('Deny')
        .setStyle(ButtonStyle.Danger);
    const embed = new EmbedBuilder()
        .setTitle('Game Result Submitted')
        .addFields(
            { name: teamA, value: scoreA, inline: true },
            { name: teamB, value: scoreB, inline: true },
            { name: 'Week', value: week ? week.toString() : 'Unknown', inline: true },
            { name: 'Season', value: seasonNo ? seasonNo.toString() : 'Unknown', inline: true },
            { name: 'Submitted by', value: `<@${interaction.user.id}>`, inline: false }
        )
        .setColor(0x00AE86);
    await interaction.reply({
        content: scheduleTrackerRole ? `${scheduleTrackerRole}` : 'Schedule Tracker',
        embeds: [embed],
        components: [[approveBtn, denyBtn]],
        ephemeral: false
    });
}

export async function handleApproval(interaction, approve) {
    if (approve) {
        // Log score to backend
        const teamA = interaction.message.embeds[0].fields[0].name;
        const scoreA = interaction.message.embeds[0].fields[0].value;
        const teamB = interaction.message.embeds[0].fields[1].name;
        const scoreB = interaction.message.embeds[0].fields[1].value;
        const week = interaction.message.embeds[0].fields[2].value;
        const seasonNo = interaction.message.embeds[0].fields[3].value;
        const submittedBy = interaction.message.embeds[0].fields[4].value;
        const scores = readScores();
        scores.push({ teamA, scoreA, teamB, scoreB, week, seasonNo, submittedBy, approved: true, approvedBy: interaction.user.id, approvedAt: new Date().toISOString() });
        writeScores(scores);
        await interaction.update({ content: '✅ Score approved and logged!', embeds: interaction.message.embeds, components: [] });
    } else {
        await interaction.update({ content: '❌ Score denied. Please resubmit if needed.', embeds: interaction.message.embeds, components: [] });
    }
}
