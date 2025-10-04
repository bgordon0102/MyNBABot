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
    // Always defer immediately to avoid interaction expiration
    try {
      await interaction.deferReply({ flags: 64 });
    } catch (err) {
      console.error('Failed to defer reply in /resetscouting:', err?.message || err);
      return;
    }
    // Reset scouting.json (legacy or other use)
    const scoutingData = readJSON(SCOUTING_FILE);
    for (const coachId in scoutingData) {
      if (scoutingData[coachId]) {
        scoutingData[coachId].weeklyPoints = 40;
        scoutingData[coachId].weekScoutedPlayers = {};
      }
    }
    writeJSON(SCOUTING_FILE, scoutingData);

    // Reset scout_points.json (actual scouted info)
    const scoutPointsPath = './data/scout_points.json';
    let scoutPointsData = {};
    if (fs.existsSync(scoutPointsPath)) {
      scoutPointsData = JSON.parse(fs.readFileSync(scoutPointsPath, 'utf8'));
      for (const coachId in scoutPointsData) {
        if (scoutPointsData[coachId]) {
          scoutPointsData[coachId].playersScouted = {};
          scoutPointsData[coachId].weeklyPoints = {};
        }
      }
      fs.writeFileSync(scoutPointsPath, JSON.stringify(scoutPointsData, null, 2));
    }

    await interaction.editReply({ content: 'All coaches weekly scouting points and scouted info have been reset.' });
  } catch (err) {
    console.error(err);
    await interaction.editReply({ content: 'Error resetting scouting data.' });
  }
}
