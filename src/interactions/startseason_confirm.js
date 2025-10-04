// src/interactions/startseason_confirm.js
import { ButtonInteraction } from 'discord.js';
import { execute as startSeasonExecute } from '../commands/staff/startseason.js';

const SEASON_FILE = './data/season.json';
const TEAMS_FILE = './data/teams.json';
const LEAGUE_FILE = './data/league.json';
const PLAYERS_FILE = './data/players.json';
const BIGBOARD_FILE = './data/bigboard.json';
const SCOUTING_FILE = './data/scouting.json';
const RECRUITS_FILE = './data/recruits.json';

export const customId = /^startseason_confirm/;

export async function execute(interaction) {
    if (!(interaction instanceof ButtonInteraction)) return;
    // Remove the button to prevent double-clicks
    await interaction.update({ content: 'Resetting league and starting new season...', components: [] });

    // Extract season number from customId: startseason_confirm_<seasonno>
    let seasonno = null;
    if (interaction.customId && interaction.customId.startsWith('startseason_confirm_')) {
        const parts = interaction.customId.split('_');
        seasonno = parseInt(parts[2], 10);
    }
    await startSeasonExecute(interaction, seasonno);
}

export default { customId, execute };
