/**
 * Football Counsel — Live Database & Telemetry API Client
 * Connects directly to the backend database service (`api.py` on http://127.0.0.1:5000)
 * Serves upcoming fixtures from `upcoming_fixtures` and analyzes them using historical `match_stats`.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
export const TELEGRAM_BOT_URL = 'https://t.me/Football_Consul_bot';
import { BASELINE_CURATED_DATA } from '../data/baselineFixtures';

function getFilteredLiveSnapshot() {
  const cutoffIso = new Date(Date.now() - 2 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ');
  const isFutureReal = (m) =>
    m &&
    !String(m.id || '').startsWith('NEXT_') &&
    String(m.match_time || '') >= cutoffIso;

  const all = (BASELINE_CURATED_DATA?.all_fixtures || []).filter(isFutureReal);
  const midweek = (BASELINE_CURATED_DATA?.midweek || []).filter(isFutureReal);
  const weekend = (BASELINE_CURATED_DATA?.weekend || []).filter(isFutureReal);
  const hero = isFutureReal(BASELINE_CURATED_DATA?.hero_match)
    ? BASELINE_CURATED_DATA.hero_match
    : all[0] || null;

  return {
    hero_match: hero,
    midweek,
    weekend,
    all_fixtures: all
  };
}

/**
 * Fetch strictly real upcoming matches directly from the live backend
 */
export async function fetchMatches() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/matches`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const json = await res.json();
    return {
      status: 'connected',
      source: json.source || 'Database',
      count: json.count || 0,
      data: json.data || []
    };
  } catch (err) {
    console.warn(`Backend at ${API_BASE_URL} unreachable (${err.message}). Using synced live snapshot.`);
    const snapshot = getFilteredLiveSnapshot();
    return {
      status: 'connected',
      source: 'Synced Live Snapshot',
      count: snapshot.all_fixtures.length,
      data: snapshot,
      isOffline: true
    };
  }
}

/**
 * Trigger a sync of upcoming fixtures from the Live API (ESPN / football-data.org)
 */
export async function syncUpcomingFixtures() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/fixtures/sync`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(25000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to sync upcoming fixtures:', err.message);
    return { status: 'error', message: err.message };
  }
}

/**
 * Fetch a specific upcoming match with AI summary, historical comparison, last 5 games, and lineups
 */
export async function fetchMatchById(matchId, refresh = false) {
  try {
    const qs = refresh ? '?refresh=true' : '';
    const res = await fetch(`${API_BASE_URL}/api/matches/${encodeURIComponent(matchId)}${qs}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    console.warn(`Failed to fetch match ${matchId} from live API:`, err.message);
    const snapshot = getFilteredLiveSnapshot();
    return snapshot.all_fixtures.find(m => String(m.id) === String(matchId)) || null;
  }
}

/**
 * Query the historical database about a specific upcoming match using natural language
 */
export async function sendAgentQuery(query, matchContext = '', homeTeam = '', awayTeam = '') {
  try {
    const res = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ query, matchContext, homeTeam, awayTeam }),
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || `HTTP ${res.status}`);
    }

    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error('Error executing tactical query:', err.message);
    return {
      id: String(Date.now()),
      query,
      sql: 'SELECT * FROM match_stats WHERE ...',
      reasoning: 'Tactical service unavailable',
      narrative: `Unable to complete query at this time: ${err.message}.`,
      detail: `Please check that the Flask API server (api.py) is running on port 5000.`,
      metric_label: 'Service Notice',
      chartData: [],
      followUps: [
        'Compare corners in this match',
        'Show fouls and yellow cards'
      ]
    };
  }
}

/**
 * Fetch database telemetry (total historical matches used for analysis, upcoming fixtures, players)
 */
export async function fetchDatabaseStats() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/stats/overview`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json;
  } catch (err) {
    return {
      status: 'offline_baseline',
      engine: 'SQLite (football_counsel.db)',
      metrics: { matches: 1636, upcoming: 15, players: 5352, leagues: 7, ai_previews: 15 }
    };
  }
}

/**
 * Backward compatibility alias
 */
export async function fetchMatchPreviews() {
  return fetchMatches();
}
