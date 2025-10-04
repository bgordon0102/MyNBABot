import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType } from 'discord.js';
import fs from 'fs';

import path from 'path';

const SEASON_FILE = './data/season.json';
const SCORES_FILE = './data/scores.json';

function readScores() {
    if (!fs.existsSync(SCORES_FILE)) return [];
    return JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8'));
}
function writeScores(scores) {
    fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2));
}

export const customId = 'submit_score';
export async function execute(interaction) {
    // Only allow the two coaches in this channel to use the button
    const channelName = interaction.channel.name;
    const match = channelName.match(/([a-z0-9\-]+)-vs-([a-z0-9\-]+)/);
    if (!match) {
        return interaction.reply({ content: 'This button can only be used in a valid game channel.', ephemeral: true });
    }
    const teamA = match[1].replace(/-/g, ' ');
    const teamB = match[2].replace(/-/g, ' ');
    const guild = interaction.guild;
    const teamARole = guild.roles.cache.find(r => r.name.toLowerCase() === `${teamA} coach`);
    const teamBRole = guild.roles.cache.find(r => r.name.toLowerCase() === `${teamB} coach`);
    const member = guild.members.cache.get(interaction.user.id);
    if (!member || (!teamARole || !teamBRole) || (!member.roles.cache.has(teamARole.id) && !member.roles.cache.has(teamBRole.id))) {
        return interaction.reply({ content: 'Only the coaches for this game can submit a score.', ephemeral: true });
    }
    // Open modal with team names pre-filled
    const modal = new ModalBuilder()
        .setCustomId('submit_score_modal')
        .setTitle('Submit Game Score');
    const teamAInput = new TextInputBuilder()
        .setCustomId('team_a')
        .setLabel('Team A')
        .setStyle(TextInputStyle.Short)
        .setValue(teamA)
        .setRequired(true);
    const teamBInput = new TextInputBuilder()
        .setCustomId('team_b')
        .setLabel('Team B')
        .setStyle(TextInputStyle.Short)
        .setValue(teamB)
        .setRequired(true);
    const scoreAInput = new TextInputBuilder()
        .setCustomId('score_a')
        .setLabel('Team A Score')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    const scoreBInput = new TextInputBuilder()
        .setCustomId('score_b')
        .setLabel('Team B Score')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    modal.addComponents(
        new ActionRowBuilder().addComponents(teamAInput),
        new ActionRowBuilder().addComponents(teamBInput),
        new ActionRowBuilder().addComponents(scoreAInput),
        new ActionRowBuilder().addComponents(scoreBInput)
    );
    await interaction.showModal(modal);
}

// Modal handler
export const modalCustomId = 'submit_score_modal';
export async function handleModal(interaction) {
    const teamA = interaction.fields.getTextInputValue('team_a');
    const teamB = interaction.fields.getTextInputValue('team_b');
    const scoreA = parseInt(interaction.fields.getTextInputValue('score_a'));
    const scoreB = parseInt(interaction.fields.getTextInputValue('score_b'));
    if (isNaN(scoreA) || isNaN(scoreB)) {
        return interaction.reply({ content: 'Scores must be numbers.', ephemeral: true });
    }
    if (scoreA === scoreB) {
        return interaction.reply({ content: 'Ties are not allowed in basketball. Please enter a valid score.', ephemeral: true });
    }
    // Prevent duplicate submissions for this matchup/week
    let seasonNo = null, week = null;
    if (fs.existsSync(SEASON_FILE)) {
        const season = JSON.parse(fs.readFileSync(SEASON_FILE, 'utf8'));
        seasonNo = season.seasonNo || 1;
        const cat = interaction.channel.parent;
        if (cat && cat.name.match(/Week (\d+)/)) {
            week = parseInt(cat.name.match(/Week (\d+)/)[1]);
        }
    }
    if (!week) {
        // Prompt for week if not found
        return interaction.reply({ content: 'Could not infer week. Please contact staff.', ephemeral: true });
    }
    // Only allow one approved score per matchup/week
    const scores = readScores();
    const alreadyLogged = scores.find(s => s.week == week && s.seasonNo == seasonNo && ((s.teamA === teamA && s.teamB === teamB) || (s.teamA === teamB && s.teamB === teamA)) && s.approved);
    if (alreadyLogged) {
        return interaction.reply({ content: 'A score for this matchup has already been approved and logged.', ephemeral: true });
    }
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
            { name: teamA, value: scoreA.toString(), inline: true },
            { name: teamB, value: scoreB.toString(), inline: true },
            { name: 'Week', value: week ? week.toString() : 'Unknown', inline: true },
            { name: 'Season', value: seasonNo ? seasonNo.toString() : 'Unknown', inline: true },
            { name: 'Submitted by', value: `<@${interaction.user.id}>`, inline: false }
        )
        .setColor(0x00AE86);
    await interaction.reply({
        content: scheduleTrackerRole ? `${scheduleTrackerRole}` : 'Schedule Tracker',
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(approveBtn, denyBtn)],
        ephemeral: false
    });
}

// Approval handler
export async function handleApproval(interaction, approve) {
    if (approve) {
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
