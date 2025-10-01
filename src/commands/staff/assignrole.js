import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

const NBA_TEAMS = [
    'Hawks', 'Celtics', 'Nets', 'Hornets', 'Bulls', 'Cavaliers', 'Mavericks', 'Nuggets', 'Pistons',
    'Warriors', 'Rockets', 'Pacers', 'Clippers', 'Lakers', 'Grizzlies', 'Heat', 'Bucks', 'Timberwolves',
    'Pelicans', 'Knicks', 'Thunder', 'Magic', '76ers', 'Suns', 'Trail Blazers', 'Kings', 'Spurs', 'Raptors', 'Jazz', 'Wizards'
];

const STAFF_ROLES = ['Commish', 'Schedule Tracker', 'Gameplay Mod', 'Trade Committee', 'Head Coach'];

export const data = new SlashCommandBuilder()
    .setName('assignrole')
    .setDescription('Assign a role to a user quickly.')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user to assign the role to')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('role')
            .setDescription('The role to assign')
            .setRequired(true)
            .setAutocomplete(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    const user = interaction.options.getUser('user');
    const roleName = interaction.options.getString('role');
    const member = interaction.guild.members.cache.get(user.id);

    if (!member) {
        return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
    }

    const role = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
    if (!role) {
        return interaction.reply({ content: `Role "${roleName}" not found.`, ephemeral: true });
    }

    try {
        await member.roles.add(role);
        await interaction.reply({ content: `Assigned role "${role.name}" to ${user.tag}.`, ephemeral: false });
    } catch (err) {
        console.error(err);
        await interaction.reply({ content: 'Error assigning role. Check bot permissions.', ephemeral: true });
    }
}

export async function autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();

    // Create list of all available roles
    const allRoles = [
        ...NBA_TEAMS.map(team => `${team} Coach`),
        ...STAFF_ROLES
    ];

    // Filter roles based on what user typed
    const filtered = allRoles.filter(role =>
        role.toLowerCase().includes(focusedValue.toLowerCase())
    );

    // Return up to 25 choices (Discord limit)
    await interaction.respond(
        filtered.slice(0, 25).map(role => ({ name: role, value: role }))
    );
}
