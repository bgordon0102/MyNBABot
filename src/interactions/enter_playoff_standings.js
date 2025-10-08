// src/interactions/enter_playoff_standings.js
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { createPlayoffBracket } from '../commands/staff/pushtoplayoffs.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const PLAYOFFS_FILE = path.join(DATA_DIR, 'playoffs.json');
const TEAMS_FILE = path.join(DATA_DIR, 'teams.json');

// Helper to write JSON
function writeJSON(file, data) {
    try {
        if (typeof data === 'undefined') {
            console.error(`[writeJSON] Tried to write undefined data to ${file}`);
            return;
        }
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(`[writeJSON] Failed to write to ${file}:`, err);
    }
}

// Helper to read JSON
function readJSON(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
        console.error(`[readJSON] Failed to read ${file}:`, err);
        return null;
    }
}

// Validate team names against teams.json
function validateTeams(teamsList) {
    const teamsData = readJSON(TEAMS_FILE);
    if (!teamsData) {
        throw new Error('Could not read teams data');
    }
    
    const validTeamNames = teamsData.map(team => team.name);
    const invalidTeams = [];
    
    for (const team of teamsList) {
        if (!validTeamNames.includes(team)) {
            invalidTeams.push(team);
        }
    }
    
    if (invalidTeams.length > 0) {
        throw new Error(`Invalid team names: ${invalidTeams.join(', ')}`);
    }
    
    return true;
}

export const customId = "enter_playoff_standings";

export async function execute(interaction) {
    try {
        // Create modal for entering standings
        const modal = new ModalBuilder()
            .setCustomId('playoff_standings_modal')
            .setTitle('Enter Final Regular Season Standings');

        const eastInput = new TextInputBuilder()
            .setCustomId('east_standings')
            .setLabel('Eastern Conference (1st to 15th)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('1. Atlanta Hawks, 2. Boston Celtics, 3. Brooklyn Nets...')
            .setRequired(true)
            .setMaxLength(1000);

        const westInput = new TextInputBuilder()
            .setCustomId('west_standings')
            .setLabel('Western Conference (1st to 15th)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('1. Golden State Warriors, 2. Los Angeles Lakers, 3. Phoenix Suns...')
            .setRequired(true)
            .setMaxLength(1000);

        const eastRow = new ActionRowBuilder().addComponents(eastInput);
        const westRow = new ActionRowBuilder().addComponents(westInput);

        modal.addComponents(eastRow, westRow);

        await interaction.showModal(modal);
        
    } catch (error) {
        console.error('Error showing playoff standings modal:', error);
        await interaction.reply({
            content: '❌ An error occurred while opening the standings form.',
            ephemeral: true
        });
    }
}

// Handle modal submission
export const modalId = "playoff_standings_modal";

export async function handleModal(interaction) {
    try {
        const eastStandings = interaction.fields.getTextInputValue('east_standings').trim();
        const westStandings = interaction.fields.getTextInputValue('west_standings').trim();
        
        // Parse and validate standings
        const parseStandings = (standingsText) => {
            return standingsText.split(',')
                .map(item => item.trim())
                .map(item => {
                    const match = item.match(/^\d+\.\s*(.+)$/);
                    return match ? match[1].trim() : item.trim();
                })
                .filter(team => team.length > 0);
        };
        
        const eastTeams = parseStandings(eastStandings);
        const westTeams = parseStandings(westStandings);
        
        // Validate team counts
        if (eastTeams.length !== 15) {
            return interaction.reply({
                content: `❌ Eastern Conference must have exactly 15 teams. You provided ${eastTeams.length}.`,
                ephemeral: true
            });
        }
        
        if (westTeams.length !== 15) {
            return interaction.reply({
                content: `❌ Western Conference must have exactly 15 teams. You provided ${westTeams.length}.`,
                ephemeral: true
            });
        }
        
        // Validate team names
        try {
            validateTeams([...eastTeams, ...westTeams]);
        } catch (error) {
            return interaction.reply({
                content: `❌ ${error.message}`,
                ephemeral: true
            });
        }
        
        // Check for duplicates
        const allTeams = [...eastTeams, ...westTeams];
        const uniqueTeams = new Set(allTeams);
        if (uniqueTeams.size !== 30) {
            return interaction.reply({
                content: '❌ Duplicate teams found or missing teams. Each team should appear exactly once.',
                ephemeral: true
            });
        }
        
        // Create playoff bracket
        const bracket = createPlayoffBracket(eastStandings, westStandings);
        
        // Save playoff bracket
        writeJSON(PLAYOFFS_FILE, bracket);
        
        // Also update playoffpicture.json for compatibility
        const playoffPictureData = {
            lastUpdated: new Date().toISOString(),
            playoffs_initialized: true,
            status: bracket.status,
            east: {
                playoff_teams: bracket.conferences.east.playoffs,
                playin_teams: bracket.conferences.east.playin,
                all_standings: bracket.conferences.east.standings
            },
            west: {
                playoff_teams: bracket.conferences.west.playoffs,
                playin_teams: bracket.conferences.west.playin,
                all_standings: bracket.conferences.west.standings
            }
        };
        
        const playoffPictureFile = path.join(DATA_DIR, 'playoffpicture.json');
        writeJSON(playoffPictureFile, playoffPictureData);
        
        // Create success embed
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🏀 Playoffs Initialized Successfully!')
            .setDescription('Regular season standings have been recorded and playoff bracket created.')
            .addFields(
                { 
                    name: '🏆 Eastern Conference Playoff Teams (1-6)', 
                    value: eastTeams.slice(0, 6).map((team, i) => `${i + 1}. ${team}`).join('\n'), 
                    inline: true 
                },
                { 
                    name: '🏆 Western Conference Playoff Teams (1-6)', 
                    value: westTeams.slice(0, 6).map((team, i) => `${i + 1}. ${team}`).join('\n'), 
                    inline: true 
                },
                { 
                    name: '\u200B', 
                    value: '\u200B', 
                    inline: false 
                },
                { 
                    name: '🎯 Eastern Conference Play-In (7-10)', 
                    value: eastTeams.slice(6, 10).map((team, i) => `${i + 7}. ${team}`).join('\n'), 
                    inline: true 
                },
                { 
                    name: '🎯 Western Conference Play-In (7-10)', 
                    value: westTeams.slice(6, 10).map((team, i) => `${i + 7}. ${team}`).join('\n'), 
                    inline: true 
                },
                { 
                    name: '\u200B', 
                    value: '\u200B', 
                    inline: false 
                },
                { 
                    name: '📋 Next Steps', 
                    value: '• Use `/playoffs` command to manage tournament\n• Start with Play-In Tournament games\n• Seeds 1-6 await Play-In results', 
                    inline: false 
                }
            )
            .setFooter({ text: 'Playoff bracket saved to data/playoffs.json' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error processing playoff standings:', error);
        await interaction.reply({
            content: '❌ An error occurred while processing the standings.',
            ephemeral: true
        });
    }
}
