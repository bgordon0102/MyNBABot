export const customId = "prospectboard_select";
import fs from "fs";
import path from "path";
import { EmbedBuilder } from "discord.js";

const playersFile = path.join(process.cwd(), "data/players.json");

export async function execute(interaction) {
    await interaction.deferUpdate();
    // Get which board is active from the message embed title
    const boardTitle = interaction.message.embeds[0]?.title || "";
    let board = "pre";
    if (boardTitle.includes("Mid Prospect")) board = "mid";
    else if (boardTitle.includes("Final Prospect")) board = "final";

    const playerConfig = JSON.parse(fs.readFileSync(playersFile));
    const boardFilePath = playerConfig.boardFiles[board];
    const bigBoardData = JSON.parse(fs.readFileSync(boardFilePath));
    const allPlayers = Object.values(bigBoardData).filter(player => player && player.name && player.position_1);

    // Page 1: 1-15
    const players = allPlayers.slice(0, 15);
    const selected = players.find(p => p.id_number.toString() === interaction.values[0]);
    if (!selected) return await interaction.editReply({ content: "Player not found.", flags: 64 });

    const strengths = [selected.strength_1, selected.strength_2, selected.strength_3].filter(Boolean).join(", ") || "N/A";
    const weaknesses = [selected.weakness_1, selected.weakness_2, selected.weakness_3].filter(Boolean).join(", ") || "N/A";

    const embed = new EmbedBuilder()
        .setTitle(`${selected.position_1} - ${selected.name}`)
        .setThumbnail(selected.image || null)
        .addFields(
            { name: "Team", value: selected.team || "N/A", inline: true },
            { name: "Nationality", value: selected.nationality || "N/A", inline: true },
            { name: "Class", value: selected.class || "N/A", inline: true },
            { name: "Age", value: selected.age?.toString() || "N/A", inline: true },
            { name: "Height", value: selected.height || "N/A", inline: true },
            { name: "Weight", value: selected.weight?.toString() || "N/A", inline: true },
            { name: "Wingspan", value: selected.wingspan || "N/A", inline: true },
            { name: "About", value: selected.about || "N/A" },
            { name: "Strengths", value: strengths, inline: true },
            { name: "Weaknesses", value: weaknesses, inline: true },
            { name: "Pro Comparison", value: selected.pro_comp || "N/A", inline: false }
        )
        .setColor("Green");

    await interaction.editReply({ embeds: [embed], flags: 64 });
}
