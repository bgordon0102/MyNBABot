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
                { name: '/resetseason', value: 'Reset the current season setup' },
                { name: '/resetnbaroles', value: 'Create all NBA team coach and staff roles' },
                { name: '/advanceweek', value: 'Advance to the next week\'s matchups' },
                { name: '/deletegamechannel', value: 'Delete matchup channels for a selected week' },
                { name: '/clearmessages', value: 'Clear messages in a channel' },
                { name: '/assignrole', value: 'Assign a role to a user quickly' },
                { name: '/resetscouting', value: 'Reset weekly scouting data' },
            )
            .setFooter({ text: 'Staff access only' });
    } else {
        embed = new EmbedBuilder()
            .setColor(0x1E90FF) // blue
            .setTitle('⭐ Coach Commands')
            .setDescription('Here are the commands available to Coaches:')
            .addFields(
                { name: '/mycommands ⭐', value: 'Shows this menu' },
                { name: '/recruitboard', value: 'View recruits and pull up player cards' },
                { name: '/bigboard', value: 'Access draft boards (pre, mid, final)' },
                { name: '/mcdonaldsteam', value: 'View McDonald\'s All-American teams' },
                { name: '/invitecoach', value: 'Invite a coach to your office channel' },
                { name: '/uninvitecoach', value: 'Remove a coach from your office channel' },
                { name: '/showschedule', value: 'View season schedule by team' },
                { name: '/scout', value: 'Spend points to scout draft prospects' },
                { name: '/myscouts', value: 'View players you have scouted and info gathered' },
            )
            .setFooter({ text: 'Coach access only' });
    }

    await interaction.reply({
        embeds: [embed],
        flags: 64 // MessageFlags.Ephemeral
    });
}
