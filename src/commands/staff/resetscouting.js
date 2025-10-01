import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import fs from 'fs';

const SCOUTING_FILE = './data/scouting.json';

function readJSON(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export const data = new SlashCommandBuilder()
  .setName('resetscouting')
  .setDescription('Reset all coaches weekly scouting points and info.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  try {
    const scoutingData = readJSON(SCOUTING_FILE);

    // Loop through all coaches
    for (const coachId in scoutingData) {
      if (scoutingData[coachId]) {
        scoutingData[coachId].weeklyPoints = 40; // reset weekly points
        scoutingData[coachId].weekScoutedPlayers = {}; // clear current week scouting info
      }
    }

    writeJSON(SCOUTING_FILE, scoutingData);

    await interaction.reply({ content: 'All coaches weekly scouting points and info have been reset.', ephemeral: false });

  } catch (err) {
    console.error(err);
    await interaction.reply({ content: 'Error resetting scouting data.', ephemeral: true });
  }
}
