// Utility to get top performer for a week from the provided JSON
import fs from 'fs';
import { DraftClassManager } from './draftClassManager.js';

export function getTopPerformerForWeek(weekNum) {
    const TOP_PERFORMER_FILE = DraftClassManager.getCurrentTopPerformerFile();
    if (!fs.existsSync(TOP_PERFORMER_FILE)) {
        console.error(`[top_performer] File not found: ${TOP_PERFORMER_FILE}`);
        return null;
    }
    let data;
    try {
        const raw = fs.readFileSync(TOP_PERFORMER_FILE, 'utf8');
        data = JSON.parse(raw);
    } catch (e) {
        console.error(`[top_performer] Failed to read or parse file: ${TOP_PERFORMER_FILE}`, e);
        return null;
    }
    if (typeof data !== 'object' || Array.isArray(data) || !Object.keys(data).length) {
        console.error('[top_performer] Data is not a valid object or is empty:', data);
        return null;
    }
    for (const key of Object.keys(data)) {
        const entry = data[key];
        if (!entry || typeof entry !== 'object') continue;
        if (typeof entry.week_number !== 'number') {
            console.error(`[top_performer] Entry missing valid week_number:`, entry);
            continue;
        }
        if (entry.week_number === weekNum) return entry;
    }
    console.warn(`[top_performer] No entry found for week ${weekNum}`);
    return null;
}
