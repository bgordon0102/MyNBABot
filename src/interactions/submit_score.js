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
    // Try to tag both coach roles in the welcome message
    let team1RoleId = null, team2RoleId = null;
    let team1 = '', team2 = '';
    try {
        // Extract team names from channel name
        const match = channel.name.match(/^(.*?)-vs-(.*?)$/);
        if (match) {
            team1 = match[1].replace(/-/g, ' ');
            team2 = match[2].replace(/-/g, ' ');
            const guild = channel.guild;
            const team1Role = guild.roles.cache.find(r => r.name.toLowerCase() === `${team1.toLowerCase()} coach`);
            const team2Role = guild.roles.cache.find(r => r.name.toLowerCase() === `${team2.toLowerCase()} coach`);
            if (team1Role) team1RoleId = team1Role.id;
            if (team2Role) team2RoleId = team2Role.id;
        }
    } catch { }
    const submitBtn = new ButtonBuilder()
        .setCustomId('submit_score')
        .setLabel('Submit Score')
        .setStyle(ButtonStyle.Primary);
    // 48-hour countdown from now
    const deadline = Math.floor(Date.now() / 1000) + 48 * 3600;
    let content = `Welcome! Use this channel to coordinate your matchup. After your game, the winning coach should report the score using the button below.\n\n:alarm_clock: **Score must be submitted within <t:${deadline}:R> (<t:${deadline}:f>)**`;
    if (team1RoleId && team2RoleId) {
        content = `<@&${team1RoleId}> <@&${team2RoleId}>\n` + content;
    }
    await channel.send({
        content,
        components: [new ActionRowBuilder().addComponents(submitBtn)]
    });
}

export async function handleButton(interaction) {
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
