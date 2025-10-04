function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
export const data = new SlashCommandBuilder()
    .setName('advanceweek')
    .setDescription('Advance the current week by 1, or specify a week to advance to')
    .addIntegerOption(option =>
        option.setName('week')
            .setDescription('The week number to advance to (optional)')
            .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);


import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, PermissionsBitField } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { sendWelcomeAndButton } from '../../interactions/submit_score.js';
import { getTopPerformerForWeek } from '../../utils/top_performer.js';
import { EmbedBuilder } from 'discord.js';


const SEASON_FILE = './data/season.json';


function readJSON(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export async function execute(interaction) {
    let deferred = false;
    try {
        await interaction.deferReply(); // ABSOLUTELY FIRST
        deferred = true;
    } catch (err) {
        console.error('Failed to defer reply in /advanceweek:', err?.message || err);
        // If we can't defer, the interaction is expired or invalid; do not continue
        return;
    }
    console.log('[advanceweek] Handler entered');
    try {
        console.log('[advanceweek] Checking for season file...');
        if (!fs.existsSync(SEASON_FILE)) {
            console.log('[advanceweek] Season file not found.');
            return await interaction.editReply({ content: 'Season file not found.' });
        }

        const season = readJSON(SEASON_FILE);
        console.log('[advanceweek] Season loaded.');
        // Always start with week 1 if not set or less than 1
        if (!season.currentWeek || season.currentWeek < 1) {
            season.currentWeek = 1;
        }

        // Allow staff to specify a week number
        let weekNum = interaction.options.getInteger('week') || season.currentWeek;
        console.log('[advanceweek] Processing week:', weekNum);

        // Always create week 1 channels if weekNum is 1 or 2 and no Week 1 Games category exists
        if (weekNum > 1 && !interaction.guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === `Week 1 Games`)) {
            weekNum = 1;
            season.currentWeek = 1;
        }

        // Delete previous week's category/channels before advancing (but not on week 1)
        if (weekNum > 1) {
            const prevCategoryName = `Week ${weekNum - 1} Games`;
            const prevCategory = interaction.guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === prevCategoryName);
            if (prevCategory) {
                for (const channel of interaction.guild.channels.cache.filter(ch => ch.parentId === prevCategory.id).values()) {
                    await channel.delete().catch(() => { });
                }
                await prevCategory.delete().catch(() => { });
            }
        }

        // Calculate week number and matchups (week-based schedule)
        let schedule = Array.isArray(season.schedule) ? season.schedule : [];
        // Only support 29 games (one per team, round robin)
        const totalWeeks = 29;
        if (weekNum < 1 || weekNum > totalWeeks) {
            return await interaction.editReply({ content: `Invalid week number. Must be between 1 and ${totalWeeks}.` });
        }
        // If schedule is array of arrays (weeks), flatten and get correct week
        let weekMatchups = [];
        if (Array.isArray(schedule[0])) {
            // schedule[weekNum-1] is the array of games for this week
            weekMatchups = schedule[weekNum - 1] || [];
        } else {
            // fallback: filter by .week property
            const weekMatchupsRaw = schedule.filter(m => m.week === weekNum);
            weekMatchups = Array.isArray(weekMatchupsRaw) ? weekMatchupsRaw : [weekMatchupsRaw];
        }
        console.log('[advanceweek] Week matchups:', weekMatchups);

        // Category name for this week
        const categoryName = `Week ${weekNum} Games`;

        // Create new category
        console.log('[advanceweek] Creating new category:', categoryName);
        const newCategory = await interaction.guild.channels.create({
            name: categoryName,
            type: ChannelType.GuildCategory,
        });

        // Get staff roles
        const commishRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'commish');
        const scheduleTrackerRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'schedule tracker');

        // For each matchup, create a private channel
        const coachRoleMap = season.coachRoleMap || {};
        for (const matchup of weekMatchups) {
            console.log('[advanceweek] Creating channel for matchup:', matchup);
            const team1 = matchup.team1;
            const team2 = matchup.team2;
            if (!team1 || !team2 || !team1.name || !team2.name) continue;
            const channelName = `${team1.name.toLowerCase()}-vs-${team2.name.toLowerCase()}`.replace(/\s+/g, '-');

            // Use coachRoleMap for permissions, validate roles exist
            let team1RoleId = coachRoleMap[team1.name];
            let team2RoleId = coachRoleMap[team2.name];
            const team1Role = team1RoleId ? interaction.guild.roles.cache.get(team1RoleId) : null;
            const team2Role = team2RoleId ? interaction.guild.roles.cache.get(team2RoleId) : null;
            if (team1RoleId && !team1Role) {
                console.warn(`[advanceweek] Coach role for ${team1.name} (ID: ${team1RoleId}) not found in guild! Channel will not be visible to this coach until the role exists and is assigned.`);
                team1RoleId = null;
            }
            if (team2RoleId && !team2Role) {
                console.warn(`[advanceweek] Coach role for ${team2.name} (ID: ${team2RoleId}) not found in guild! Channel will not be visible to this coach until the role exists and is assigned.`);
                team2RoleId = null;
            }

            // Permissions: only the two coach roles, commish, and schedule tracker
            const permissionOverwrites = [
                { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
            ];
            if (team1RoleId) permissionOverwrites.push({ id: team1RoleId, allow: [PermissionsBitField.Flags.ViewChannel] });
            if (team2RoleId) permissionOverwrites.push({ id: team2RoleId, allow: [PermissionsBitField.Flags.ViewChannel] });
            if (commishRole) permissionOverwrites.push({ id: commishRole.id, allow: [PermissionsBitField.Flags.ViewChannel] });
            if (scheduleTrackerRole) permissionOverwrites.push({ id: scheduleTrackerRole.id, allow: [PermissionsBitField.Flags.ViewChannel] });

            const gameChannel = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: newCategory.id,
                permissionOverwrites,
            });

            // Send welcome message and submit score button, with error handling
            try {
                // Tag both coach roles if present
                let coachMentions = [];
                if (team1RoleId) coachMentions.push(`<@&${team1RoleId}>`);
                if (team2RoleId) coachMentions.push(`<@&${team2RoleId}>`);
                await sendWelcomeAndButton(gameChannel, weekNum, season.seasonNo || 1, coachMentions);
            } catch (e) {
                console.error('Failed to send welcome message:', e);
            }
        }


        // Post Top Performer for this week in the specified channel
        const performerChannelId = '1421189114912440423';
        console.log('[advanceweek] Looking up Top Performer for week:', weekNum);
        const performer = getTopPerformerForWeek(weekNum);
        console.log(`[advanceweek] Top Performer for week ${weekNum}:`, performer ? performer.name : 'None');
        if (performer) {
            let performerChannel = null;
            try {
                console.log('[advanceweek] Fetching Top Performer channel:', performerChannelId);
                performerChannel = await interaction.guild.channels.fetch(performerChannelId);
                console.log(`[advanceweek] Fetched Top Performer channel:`, performerChannel ? performerChannel.name : 'Not found');
            } catch (e) {
                console.error(`[advanceweek] Could not fetch Top Performer channel (${performerChannelId}):`, e);
            }
            if (performerChannel && performerChannel.isTextBased && performerChannel.isTextBased()) {
                try {
                    console.log('[advanceweek] Building Top Performer embed...');
                    const embed = new EmbedBuilder()
                        .setTitle(`Week ${weekNum} Top Performer`)
                        .setImage(performer.image)
                        .setDescription(
                            `${performer.position} ${performer.name}\n` +
                            `${performer.from}, ${performer.class}\n` +
                            `Physicals: ${performer.height} / ${performer.weight}\n\n` +
                            `Stats: ${performer.points} pts, ${performer.rebounds} reb, ${performer.assists} ast, ${performer.blocks} blk, ${performer.steals} stl, ${performer.turnovers} TO vs ${performer.opponent}`
                        )
                        .setColor(0x0099ff);
                    console.log('[advanceweek] Sending Top Performer embed...');
                    await performerChannel.send({ embeds: [embed] });
                    console.log('[advanceweek] Top Performer embed sent successfully.');
                } catch (e) {
                    console.error('[advanceweek] Failed to send Top Performer embed:', e);
                }
            } else {
                console.error(`[advanceweek] Top Performer channel not found or not text-based: ${performerChannelId}`);
            }
        } else {
            console.log(`[advanceweek] No Top Performer found for week ${weekNum}.`);
        }

        await interaction.editReply({ content: `Current week advanced to Week ${weekNum}. Game channels created!` });

        // Only update currentWeek in season.json
        const absSeasonPath = path.resolve(SEASON_FILE);
        let original = {};
        try {
            original = JSON.parse(fs.readFileSync(absSeasonPath, 'utf8'));
        } catch (e) {
            console.error('[advanceweek] Could not read original season.json:', e);
        }
        original.currentWeek = weekNum + 1;
        fs.writeFileSync(absSeasonPath, JSON.stringify(original, null, 2));

    } catch (err) {
        console.error(err);
        try {
            await interaction.editReply({ content: 'Error advancing week.' });
        } catch (e) {
            console.error('Failed to send error message:', e);
        }
    }
}

