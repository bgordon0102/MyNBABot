import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import fs from 'fs';

const SCHEDULE_FILE = './data/schedule.json';

function readJSON(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export const data = new SlashCommandBuilder()
    .setName('advanceweek')
    .setDescription('Advance to the next week and create game channels for the matchups.')
    .addIntegerOption(option =>
        option.setName('week')
            .setDescription('The week number to advance to')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    const week = interaction.options.getInteger('week');

    // Defer reply to give us more time to create channels
    await interaction.deferReply();

    if (!fs.existsSync(SCHEDULE_FILE)) {
        return interaction.editReply({ content: 'No active season found. Run /startseason first.' });
    }

    const schedule = readJSON(SCHEDULE_FILE);
    const currentWeek = schedule.currentWeek || 0;

    // Prevent skipping weeks
    if (week > currentWeek + 1) {
        return interaction.editReply({ content: `Cannot skip weeks. Current week is ${currentWeek}.` });
    }

    const weekMatchups = schedule.weeks[week];
    if (!weekMatchups) {
        return interaction.editReply({ content: `No schedule found for Week ${week}.` });
    }

    try {
        // Create Week category
        const category = await interaction.guild.channels.create({
            name: `Week ${week}`,
            type: 4, // category
            permissionOverwrites: [
                { id: interaction.guild.roles.everyone.id, deny: ['ViewChannel'] }
            ]
        });

        for (const matchup of weekMatchups) {
            // Fetch roles dynamically by name
            const teamARole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === `${matchup.teamA.toLowerCase()} coach`);
            const teamBRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === `${matchup.teamB.toLowerCase()} coach`);
            const staffRoles = ['commish', 'schedule tracker', 'gameplay mod'].map(name => interaction.guild.roles.cache.find(r => r.name.toLowerCase() === name)).filter(Boolean);

            if (!teamARole || !teamBRole) {
                return interaction.editReply({ content: `Coach role missing for ${matchup.teamA} or ${matchup.teamB}.` });
            }

            const allowedRoles = [teamARole, teamBRole, ...staffRoles];

            const channel = await interaction.guild.channels.create({
                name: `${matchup.teamA}-vs-${matchup.teamB}`,
                type: 0, // text channel
                parent: category.id,
                permissionOverwrites: [
                    { id: interaction.guild.roles.everyone.id, deny: ['ViewChannel'] },
                    ...allowedRoles.map(r => ({ id: r.id, allow: ['ViewChannel', 'ReadMessageHistory'] }))
                ]
            });

            // Save channel ID to schedule
            matchup.channelId = channel.id;
        }

        // Update current week
        schedule.currentWeek = week;
        writeJSON(SCHEDULE_FILE, schedule);

        await interaction.editReply({ content: `✅ Week ${week} channels created successfully! Created ${weekMatchups.length} matchup channels.` });

    } catch (err) {
        console.error(err);
        await interaction.editReply({ content: 'Error creating week channels. Check roles and permissions.' });
    }
}
