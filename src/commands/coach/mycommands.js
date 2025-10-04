import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('mycommands')
    .setDescription('Shows a list of commands available to you.');

export async function execute(interaction) {
    const member = interaction.member;

    // Staff role names
    const staffRoles = ['Admin', 'Commish', 'Schedule Tracker', 'Gameplay Mod', 'Trade Committee'];
    const hasStaffRole = member.roles.cache.some(role => staffRoles.includes(role.name));

    let embed;

    if (hasStaffRole) {
        embed = new EmbedBuilder()
            .setColor(0xFFD700) // gold
            .setTitle('⭐ Staff Commands')
            .setDescription('Here are the commands available to Staff:')
            .addFields(
                { name: '/mycommands ⭐', value: 'Shows this menu' },
                { name: '/startseason', value: 'Initialize season schedule and setup' },
                { name: '/advanceweek', value: 'Advance to the next week\'s matchups' },
                { name: '/deletegamechannel', value: 'Delete matchup channels for a selected week' },
                { name: '/clearmessages', value: 'Clear messages in a channel' },
                { name: '/assignrole', value: 'Assign a role to a user quickly' },
                { name: '/resetnbaroles', value: 'Create all NBA team coach and staff roles' },
                { name: '/resetscouting', value: 'Reset weekly scouting data' },
                { name: '/simscores', value: 'Simulate and approve random scores for the current week' },
            )
            .setFooter({ text: 'Staff access only' });
    } else {
        embed = new EmbedBuilder()
            .setColor(0x1E90FF) // blue
            .setTitle('⭐ Coach Commands')
            .setDescription('Here are the commands available to Coaches:')
            .addFields(
                { name: '/mycommands ⭐', value: 'Shows this menu' },
                { name: '/recruitboard', value: 'View recruits and player cards' },
                { name: '/bigboard', value: 'View and manage your personal draft big board (reorder your scouted players)' },
                { name: '/prospectboard', value: 'View the prospect board (pre, mid, final)' },
                { name: '/invitecoach', value: 'Invite a coach to your office channel' },
                { name: '/uninvitecoach', value: 'Remove a coach from your office channel' },
                { name: '/schedule', value: 'Show a team\'s NBA season schedule' },
                { name: '/standings', value: 'Show NBA-style conference standings' },
                { name: '/playoffpicture', value: 'Show the current NBA-style playoff bracket and play-in teams' },
                { name: '/scout', value: 'Scout a player from the big board' },
                { name: '/myscouts', value: 'View players you have scouted and info gathered' },
            )
            .setFooter({ text: 'Coach access only' });
    }

    await interaction.reply({
        embeds: [embed],
        flags: 64 // MessageFlags.Ephemeral
    });
}
