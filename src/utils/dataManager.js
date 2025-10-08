import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Utility functions for handling JSON data files
 */

export class DataManager {
    constructor(gameType = null) {
        this.dataPath = join(__dirname, '../../data');
        this.gameType = gameType; // '2k', 'madden', or null for root data folder
    }

    /**
     * Get the appropriate file path based on game type
     * @param {string} filename - Name of the JSON file (without extension)
     * @returns {string} Full file path
     */
    getFilePath(filename) {
        if (this.gameType) {
            return join(this.dataPath, this.gameType, `${filename}.json`);
        }
        return join(this.dataPath, `${filename}.json`);
    }

    /**
     * Read JSON data from a file
     * @param {string} filename - Name of the JSON file (without extension)
     * @returns {Object} Parsed JSON data
     */
    readData(filename) {
        try {
            const filePath = this.getFilePath(filename);
            const rawData = readFileSync(filePath, 'utf8');
            return JSON.parse(rawData);
        } catch (error) {
            console.error(`Error reading ${filename}.json from ${this.gameType || 'root'}:`, error);
            return null;
        }
    }

    /**
     * Write JSON data to a file
     * @param {string} filename - Name of the JSON file (without extension)
     * @param {Object} data - Data to write
     * @returns {boolean} Success status
     */
    writeData(filename, data) {
        try {
            const filePath = this.getFilePath(filename);
            const jsonData = JSON.stringify(data, null, 2);
            writeFileSync(filePath, jsonData, 'utf8');
            return true;
        } catch (error) {
            console.error(`Error writing ${filename}.json to ${this.gameType || 'root'}:`, error);
            return false;
        }
    }

    /**
     * Get recruit data
     */
    getRecruits() {
        return this.readData('recruits');
    }

    /**
     * Get team data
     */
    getTeams() {
        return this.readData('teams');
    }

    /**
     * Get league data
     */
    getLeague() {
        return this.readData('league');
    }

    /**
     * Get scouting data
     */
    getScouting() {
        return this.readData('scouting');
    }

    /**
     * Get big board data
     */
    getBigBoard() {
        return this.readData('bigboard');
    }

    /**
     * Update recruit data
     */
    updateRecruits(data) {
        return this.writeData('recruits', data);
    }

    /**
     * Update team data
     */
    updateTeams(data) {
        return this.writeData('teams', data);
    }

    /**
     * Update league data
     */
    updateLeague(data) {
        return this.writeData('league', data);
    }

    /**
     * Update scouting data
     */
    updateScouting(data) {
        return this.writeData('scouting', data);
    }

    /**
     * Update big board data
     */
    updateBigBoard(data) {
        return this.writeData('bigboard', data);
    }
}
