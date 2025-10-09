// Modular EA Export Manager for batching, caching, and error handling
// Full integration with WAL/Blaze API for Madden 26 league import

import EASportsAPI from './eaSportsAPI.js';
const api = new EASportsAPI();


// Expanded in-memory cache and export status tracker
const cache = {
    leagues: {},
    teams: {},
    rosters: {},
    freeAgents: {},
    schedule: {},
    playoffs: {},
    stats: {
        passing: {},
        rushing: {},
        receiving: {},
        defense: {},
        punting: {},
        kicking: {},
        teamStats: {},
    },
};

// Granular export status tracking
const exportStatus = {
    league: null,
    teams: null,
    rosters: {}, // teamId: timestamp
    freeAgents: null,
    schedule: null,
    playoffs: null,
    stats: {
        passing: {}, // week: timestamp
        rushing: {},
        receiving: {},
        defense: {},
        punting: {},
        kicking: {},
        teamStats: {},
    },
};

// Rate limit for batching requests
const STAGGERED_MAX_MS = 75;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


// Fetch league info
async function fetchLeague(leagueId, token) {
    if (cache.leagues[leagueId]) return cache.leagues[leagueId];
    // Use WAL/Blaze API to fetch league info
    const leagueData = await api.fetchLeagueInfo(token.userId, leagueId);
    cache.leagues[leagueId] = leagueData;
    exportStatus.league = new Date();
    return leagueData;
}

// Fetch teams
async function fetchTeams(leagueId, token) {
    if (cache.teams[leagueId]) return cache.teams[leagueId];
    const teamsData = await api.fetchTeams(token.userId, leagueId);
    cache.teams[leagueId] = teamsData;
    exportStatus.teams = new Date();
    return teamsData;
}

// Fetch rosters (per team)
async function fetchRosters(leagueId, teamIds, token) {
    const results = {};
    for (let i = 0; i < teamIds.length; i++) {
        const teamId = teamIds[i];
        if (cache.rosters[teamId]) {
            results[teamId] = cache.rosters[teamId];
            continue;
        }
        const rosterData = await api.fetchTeamRoster(token.userId, leagueId, teamId);
        cache.rosters[teamId] = rosterData;
        results[teamId] = rosterData;
        exportStatus.rosters[teamId] = new Date();
        if ((i + 1) % 4 === 0) await sleep(STAGGERED_MAX_MS);
    }
    return results;
}

// Fetch free agent roster
async function fetchFreeAgents(leagueId, token) {
    if (cache.freeAgents[leagueId]) return cache.freeAgents[leagueId];
    const faData = await api.fetchFreeAgents(token.userId, leagueId);
    cache.freeAgents[leagueId] = faData;
    exportStatus.freeAgents = new Date();
    return faData;
}

// Fetch schedule
async function fetchSchedule(leagueId, token) {
    if (cache.schedule[leagueId]) return cache.schedule[leagueId];
    const scheduleData = await api.fetchSchedule(token.userId, leagueId);
    cache.schedule[leagueId] = scheduleData;
    exportStatus.schedule = new Date();
    return scheduleData;
}

// Fetch playoff data
async function fetchPlayoffs(leagueId, token) {
    if (cache.playoffs[leagueId]) return cache.playoffs[leagueId];
    const playoffData = await api.fetchPlayoffs(token.userId, leagueId);
    cache.playoffs[leagueId] = playoffData;
    exportStatus.playoffs = new Date();
    return playoffData;
}

// Fetch weekly stats (generic for all stat types)
async function fetchWeeklyStats(leagueId, statType, week, token) {
    if (cache.stats[statType][week]) return cache.stats[statType][week];
    const statsData = await api.fetchWeeklyStats(token.userId, leagueId, statType, week);
    cache.stats[statType][week] = statsData;
    exportStatus.stats[statType][week] = new Date();
    return statsData;
}

// Export league data with detailed logging
async function exportLeagueData(userId, leagueId) {
    try {
        logger.debug(`[EA DEBUG] exportLeagueData ENTRY for userId: ${userId}, leagueId: ${leagueId}`);
        const leagueInfo = await api.fetchLeagueInfo(userId, leagueId);
        logger.debug(`[EA DEBUG] exportLeagueData leagueInfo: ${JSON.stringify(leagueInfo)}`);
        const teams = await api.fetchTeams(userId, leagueId);
        logger.debug(`[EA DEBUG] exportLeagueData teams: ${JSON.stringify(teams)}`);
        for (const team of teams) {
            logger.debug(`[EA DEBUG] exportLeagueData fetching roster for teamId: ${team.teamId}`);
            const roster = await api.fetchTeamRoster(userId, leagueId, team.teamId);
            logger.debug(`[EA DEBUG] exportLeagueData roster for teamId ${team.teamId}: ${JSON.stringify(roster)}`);
        }
        const schedule = await api.fetchSchedule(userId, leagueId);
        logger.debug(`[EA DEBUG] exportLeagueData schedule: ${JSON.stringify(schedule)}`);
        const playoffs = await api.fetchPlayoffs(userId, leagueId);
        logger.debug(`[EA DEBUG] exportLeagueData playoffs: ${JSON.stringify(playoffs)}`);
        const freeAgents = await api.fetchFreeAgents(userId, leagueId);
        logger.debug(`[EA DEBUG] exportLeagueData freeAgents: ${JSON.stringify(freeAgents)}`);
        logger.debug(`[EA DEBUG] exportLeagueData EXIT for userId: ${userId}, leagueId: ${leagueId}`);
        return {
            leagueInfo,
            teams,
            schedule,
            playoffs,
            freeAgents
        };
    } catch (error) {
        logger.error(`[EA ERROR] exportLeagueData failed: ${error.message}`);
        throw error;
    }
}


export default {
    fetchLeague,
    fetchTeams,
    fetchRosters,
    fetchFreeAgents,
    fetchSchedule,
    fetchPlayoffs,
    fetchWeeklyStats,
    exportLeagueData,
    cache,
    exportStatus,
};
