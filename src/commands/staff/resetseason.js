import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import fs from 'fs';

const SCHEDULE_FILE = './data/schedule.json';

export const data = new SlashCommandBuilder()
  .setName('resetseason')
  .setDescription('Reset the current season completely.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  try {
    if (!fs.existsSync(SCHEDULE_FILE)) {
      return interaction.reply({ content: 'No season to reset.', ephemeral: true });
    }

    const schedule = JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));

    // Reset week and all channel IDs, scores, approvals
    for (const week in schedule.weeks) {
      for (const matchup of schedule.weeks[week]) {
        matchup.channelId = null;
        matchup.scoreA = null;
        matchup.scoreB = null;
        matchup.approved = false;
      }
    }

    schedule.currentWeek = 0;

    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedule, null, 2));

    await interaction.reply({ content: 'Season has been reset. You can start fresh with /advanceweek.', ephemeral: false });

  } catch (err) {
    console.error(err);
    await interaction.reply({ content: 'Error resetting season.', ephemeral: true });
  }
}
