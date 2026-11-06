"""
Football Counsel — Live Upcoming Fixtures Ingestion Engine
Fetches strictly REAL future/upcoming matches across the next 2+ weeks from Live APIs:
  1. Zero-Key ESPN Public Soccer Scoreboard & Calendar API (eng.1, esp.1, ita.1, ger.1, fra.1, uefa.champions, uefa.europa)
  2. football-data.org API v4 (when FOOTBALL_DATA_API_KEY is configured in .env)

IMPORTANT ARCHITECTURE RULE:
- `match_stats` is strictly for FINISHED historical matches (used only to analyze future games).
- Future games are stored exclusively in `upcoming_fixtures` with normalized team names that match `match_stats`.
- ZERO synthetic/calculated fallback games (`NEXT_*`) are ever generated.
"""

import os
import re
import ssl
import json
import sqlite3
import urllib.request
import email.utils
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")
SQLITE_PATH = os.path.join(os.path.dirname(__file__), "football_counsel.db")
SQLITE_FALLBACK_PATH = os.path.join(os.path.dirname(__file__), "football_consul.db")
FOOTBALL_DATA_API_KEY = os.getenv("FOOTBALL_DATA_API_KEY")


def _get_ssl_context():
    """Returns an SSL context resilient to local system clock drift."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

# Explicit mapping from common external API team names (ESPN, football-data.org)
# to the exact historical team names in `match_stats` (Flashscore format).
TEAM_ALIASES = {
    # Premier League
    "manchester united": "Manchester Utd",
    "manchester united fc": "Manchester Utd",
    "man united": "Manchester Utd",
    "man utd": "Manchester Utd",
    "manchester city": "Manchester City",
    "manchester city fc": "Manchester City",
    "man city": "Manchester City",
    "newcastle united": "Newcastle",
    "newcastle united fc": "Newcastle",
    "newcastle utd": "Newcastle",
    "nottingham forest": "Nottingham",
    "nottingham forest fc": "Nottingham",
    "nott'm forest": "Nottingham",
    "tottenham hotspur": "Tottenham",
    "tottenham hotspur fc": "Tottenham",
    "spurs": "Tottenham",
    "west ham united": "West Ham",
    "west ham united fc": "West Ham",
    "wolverhampton wanderers": "Wolves",
    "wolverhampton wanderers fc": "Wolves",
    "wolverhampton": "Wolves",
    "brighton & hove albion": "Brighton",
    "brighton and hove albion": "Brighton",
    "brighton & hove albion fc": "Brighton",
    "leeds united": "Leeds",
    "leeds united fc": "Leeds",
    "afc bournemouth": "Bournemouth",
    "arsenal fc": "Arsenal",
    "aston villa fc": "Aston Villa",
    "brentford fc": "Brentford",
    "burnley fc": "Burnley",
    "chelsea fc": "Chelsea",
    "crystal palace fc": "Crystal Palace",
    "everton fc": "Everton",
    "fulham fc": "Fulham",
    "liverpool fc": "Liverpool",
    "sunderland afc": "Sunderland",

    # LaLiga
    "atlético madrid": "Atl. Madrid",
    "atletico madrid": "Atl. Madrid",
    "club atlético de madrid": "Atl. Madrid",
    "atletico de madrid": "Atl. Madrid",
    "athletic club": "Ath Bilbao",
    "athletic bilbao": "Ath Bilbao",
    "real betis": "Betis",
    "real betis balompié": "Betis",
    "celta vigo": "Celta Vigo",
    "rc celta de vigo": "Celta Vigo",
    "celta de vigo": "Celta Vigo",
    "deportivo alavés": "Alaves",
    "deportivo alaves": "Alaves",
    "alavés": "Alaves",
    "rcd espanyol": "Espanyol",
    "rcd espanyol de barcelona": "Espanyol",
    "rcd mallorca": "Mallorca",
    "ca osasuna": "Osasuna",
    "real oviedo": "Oviedo",
    "fc barcelona": "Barcelona",
    "real madrid cf": "Real Madrid",
    "real sociedad de fútbol": "Real Sociedad",
    "sevilla fc": "Sevilla",
    "valencia cf": "Valencia",
    "villarreal cf": "Villarreal",
    "getafe cf": "Getafe",
    "girona fc": "Girona",
    "elche cf": "Elche",
    "levante ud": "Levante",
    "rayo vallecano de madrid": "Rayo Vallecano",

    # Serie A
    "inter milan": "Inter",
    "fc internazionale milano": "Inter",
    "internazionale": "Inter",
    "ac milan": "AC Milan",
    "milan": "AC Milan",
    "as roma": "AS Roma",
    "roma": "AS Roma",
    "hellas verona": "Verona",
    "hellas verona fc": "Verona",
    "atalanta bc": "Atalanta",
    "bologna fc 1909": "Bologna",
    "cagliari calcio": "Cagliari",
    "como 1907": "Como",
    "us cremonese": "Cremonese",
    "acf fiorentina": "Fiorentina",
    "genoa cfc": "Genoa",
    "juventus fc": "Juventus",
    "ss lazio": "Lazio",
    "us lecce": "Lecce",
    "ssc napoli": "Napoli",
    "parma calcio 1913": "Parma",
    "pisa sporting club": "Pisa",
    "us sassuolo calcio": "Sassuolo",
    "torino fc": "Torino",
    "udinese calcio": "Udinese",

    # Bundesliga
    "borussia dortmund": "Dortmund",
    "bv borussia 09 dortmund": "Dortmund",
    "borussia mönchengladbach": "B. Monchengladbach",
    "borussia monchengladbach": "B. Monchengladbach",
    "b. mönchengladbach": "B. Monchengladbach",
    "bayer 04 leverkusen": "Bayer Leverkusen",
    "fc bayern münchen": "Bayern Munich",
    "bayern münchen": "Bayern Munich",
    "fc bayern munich": "Bayern Munich",
    "1. fc köln": "FC Koln",
    "fc köln": "FC Koln",
    "1. fc koln": "FC Koln",
    "1. fsv mainz 05": "Mainz",
    "mainz 05": "Mainz",
    "1. fc heidenheim 1846": "Heidenheim",
    "1. fc heidenheim": "Heidenheim",
    "1. fc union berlin": "Union Berlin",
    "tsg 1899 hoffenheim": "Hoffenheim",
    "tsg hoffenheim": "Hoffenheim",
    "sc freiburg": "Freiburg",
    "vfb stuttgart": "Stuttgart",
    "vfl wolfsburg": "Wolfsburg",
    "sv werder bremen": "Werder Bremen",
    "fc st. pauli": "St. Pauli",
    "fc st. pauli 1910": "St. Pauli",
    "fc augsburg": "Augsburg",
    "eintracht frankfurt": "Eintracht Frankfurt",
    "rb leipzig": "RB Leipzig",
    "hamburger sv": "Hamburger SV",

    # European Competitions (UCL / UEL)
    "paris saint-germain": "PSG",
    "paris saint-germain fc": "PSG",
    "Paris SG": "PSG",
    "psv eindhoven": "PSV",
    "sporting cp": "Sporting CP",
    "sporting lisbon": "Sporting CP",
    "sporting clube de portugal": "Sporting CP",
    "sl benfica": "Benfica",
    "fc porto": "FC Porto",
    "ajax amsterdam": "Ajax",
    "afc ajax": "Ajax",
    "feyenoord rotterdam": "Feyenoord",
    "club brugge": "Club Brugge KV",
    "club brugge kv": "Club Brugge KV",
    "union saint-gilloise": "Royale Union SG",
    "royale union saint-gilloise": "Royale Union SG",
    "olympiacos": "Olympiacos Piraeus",
    "olympiacos fc": "Olympiacos Piraeus",
    "olympiakos": "Olympiacos Piraeus",
    "as monaco": "Monaco",
    "olympique de marseille": "Marseille",
    "olympique marseille": "Marseille",
    "olympique lyonnais": "Lyon",
    "lille osc": "Lille",
    "losc lille": "Lille",
    "ogc nice": "Nice",
    "celtic fc": "Celtic",
    "rangers fc": "Rangers",
    "sk slavia praha": "Slavia Prague",
    "slavia praha": "Slavia Prague",
    "viktoria plzen": "Plzen",
    "fc viktoria plzeň": "Plzen",
    "fc copenhagen": "FC Copenhagen",
    "fc københavn": "FC Copenhagen",
    "bodø/glimt": "Bodo/Glimt",
    "fk bodø/glimt": "Bodo/Glimt",
    "galatasaray sk": "Galatasaray",
    "fenerbahçe": "Fenerbahce",
    "fenerbahce sk": "Fenerbahce",
    "red star belgrade": "Crvena zvezda",
    "fk crvena zvezda": "Crvena zvezda",
    "gnk dinamo zagreb": "Din. Zagreb",
    "dinamo zagreb": "Din. Zagreb",
    "sc braga": "Braga",
    "sporting braga": "Braga",
    "red bull salzburg": "Salzburg",
    "fc salzburg": "Salzburg",
    "sk sturm graz": "Sturm Graz",
    "bsc young boys": "Young Boys",
    "fc basel": "Basel",
    "fc basel 1893": "Basel",
    "ferencvárosi tc": "Ferencvaros",
    "ferencvarosi tc": "Ferencvaros",
    "paok thessaloniki": "PAOK",
    "paok fc": "PAOK",
    "panathinaikos fc": "Panathinaikos",
    "krc genk": "Genk",
    "fc midtjylland": "Midtjylland",
    "malmö ff": "Malmo FF",
    "fc utrecht": "Utrecht",
    "go ahead eagles": "G.A. Eagles",
    # Ligue 1 & Additional European Clubs
    "rc lens": "Lens",
    "racing club de lens": "Lens",
    "stade rennais": "Stade Rennais",
    "stade rennais fc": "Stade Rennais",
    "stade brestois 29": "Brest",
    "stade brestois": "Brest",
    "rc strasbourg alsace": "Strasbourg",
    "rc strasbourg": "Strasbourg",
    "toulouse fc": "Toulouse",
    "stade de reims": "Reims",
    "montpellier hsc": "Montpellier",
    "fc nantes": "Nantes",
    "le havre ac": "Le Havre AC",
    "aj auxerre": "AJ Auxerre",
    "angers sco": "Angers",
    "angers": "Angers",
    "as saint-étienne": "Saint-Etienne",
    "as saint-etienne": "Saint-Etienne",
    "fc lorient": "Lorient",
    "fc metz": "Metz",
    "lillestrøm": "Lillestrom",
    "lillestrom": "Lillestrom",
    "lillestrøm sk": "Lillestrom",
}


def normalize_team_name(raw_name: str, known_db_teams: list[str] = None) -> str:
    """
    Maps an external API team name to the exact team name used in `match_stats`
    without arbitrary substring matching (preventing collisions like Angers -> Rangers or Lillestrom -> Lille).
    """
    if not raw_name:
        return ""
    cleaned = re.sub(r'\s*\([A-Za-z0-9\s\.\-]+\)$', '', raw_name).strip()
    lower = cleaned.lower()

    if lower in TEAM_ALIASES:
        return TEAM_ALIASES[lower]

    # Strip common prefixes/suffixes like FC, CF, AFC, SC
    stripped = re.sub(r'\b(fc|cf|afc|sc|ac|as|us|ss|rcd|ca|ud|fk|sk|nk|bsc)\b', '', lower).strip()
    stripped = re.sub(r'\s+', ' ', stripped)
    if stripped in TEAM_ALIASES:
        return TEAM_ALIASES[stripped]

    if known_db_teams:
        # Exact case-insensitive match against historical DB names (ignoring country suffix like '(Fra)')
        for dbt in known_db_teams:
            dbt_clean = re.sub(r'\s*\([A-Za-z0-9\s\.\-]+\)$', '', dbt).strip()
            if dbt_clean.lower() == lower or dbt_clean.lower() == stripped:
                return dbt_clean

    return cleaned


RIVALRIES = {
    frozenset(["real madrid", "barcelona"]): "⚔️ El Clásico",
    frozenset(["arsenal", "tottenham"]): "🔥 North London Derby",
    frozenset(["manchester city", "manchester utd"]): "🔥 Manchester Derby",
    frozenset(["liverpool", "everton"]): "🔥 Merseyside Derby",
    frozenset(["inter", "ac milan"]): "🔥 Derby della Madonnina",
    frozenset(["inter", "juventus"]): "🔥 Derby d'Italia",
    frozenset(["bayern munich", "dortmund"]): "🔥 Der Klassiker",
    frozenset(["psg", "marseille"]): "🔥 Le Classique",
    frozenset(["arsenal", "chelsea"]): "🔥 London Derby",
    frozenset(["chelsea", "tottenham"]): "🔥 London Derby",
    frozenset(["real madrid", "atl. madrid"]): "🔥 Madrid Derby",
    frozenset(["as roma", "lazio"]): "🔥 Derby della Capitale",
    frozenset(["bayer leverkusen", "bayern munich"]): "⚔️ Top Flight Clash",
    frozenset(["arsenal", "manchester city"]): "⚔️ Title Decider",
    frozenset(["liverpool", "manchester city"]): "⚔️ Title Rivalry",
    frozenset(["barcelona", "atl. madrid"]): "⚔️ Spanish Title Fight",
    frozenset(["atl. madrid", "bayern munich"]): "⚔️ European Heavyweight Clash",
    frozenset(["manchester utd", "as roma"]): "⚔️ European Classic",
    frozenset(["fiorentina", "juventus"]): "🔥 Italian Derby",
    frozenset(["lazio", "napoli"]): "⚔️ Serie A Heavyweight Clash",
}


def compute_fixture_impact(match: dict, standings_map: dict) -> tuple[int, str]:
    """
    Computes an objective impact_score (50-100) and human-readable marquee_reason.
    Base weights: UCL: 70, PL: 65, LaLiga/Serie A/Bundesliga: 60, Ligue 1/UEL: 55, other: 50.
    Proximity bonuses (mutually exclusive): 1st vs 2nd: +20, Top-4: +15, Top-6: +10, Relegation: +10.
    Traditional rivalry/derby/elite bonus: +15 to +20.
    """
    comp = match.get("competition", "")
    home = match.get("home_team", "")
    away = match.get("away_team", "")

    if comp == "Champions League":
        base = 70
    elif comp == "Premier League":
        base = 65
    elif comp in ("LaLiga", "Serie A", "Bundesliga"):
        base = 60
    elif comp in ("Ligue 1", "Europa League"):
        base = 55
    else:
        base = 50

    reason = ""
    proximity_bonus = 0

    h_stand = standings_map.get((home.lower(), comp.lower()))
    a_stand = standings_map.get((away.lower(), comp.lower()))

    # Fallback to domestic standings for European fixtures
    if comp in ("Champions League", "Europa League"):
        if not h_stand:
            for domestic in ("Premier League", "LaLiga", "Serie A", "Bundesliga", "Ligue 1"):
                if (home.lower(), domestic.lower()) in standings_map:
                    h_stand = standings_map[(home.lower(), domestic.lower())]
                    break
        if not a_stand:
            for domestic in ("Premier League", "LaLiga", "Serie A", "Bundesliga", "Ligue 1"):
                if (away.lower(), domestic.lower()) in standings_map:
                    a_stand = standings_map[(away.lower(), domestic.lower())]
                    break

    if h_stand and a_stand:
        p1 = h_stand.get("position", 99)
        p2 = a_stand.get("position", 99)
        if (p1 == 1 and p2 == 2) or (p1 == 2 and p2 == 1):
            proximity_bonus = 20
            reason = "⚔️ Title Decider (1st vs 2nd)"
        elif p1 <= 4 and p2 <= 4:
            proximity_bonus = 15
            reason = f"⚔️ Top 4 Battle (#{p1} vs #{p2})"
        elif p1 <= 6 and p2 <= 6:
            proximity_bonus = 10
            reason = f"⚔️ Top 6 Clash (#{p1} vs #{p2})"
        elif p1 >= 17 and p2 >= 17 and comp in ("Premier League", "LaLiga", "Serie A", "Bundesliga", "Ligue 1"):
            proximity_bonus = 10
            reason = "⚠️ Relegation 6-Pointer"

    # Elite European & Domestic Heavyweights
    ELITE_CLUBS = {
        "real madrid", "barcelona", "bayern munich", "manchester city",
        "liverpool", "arsenal", "inter", "paris saint-germain", "psg",
        "atl. madrid", "atletico madrid", "juventus", "borussia dortmund", "dortmund",
        "manchester utd", "chelsea", "ac milan", "bayer leverkusen", "aston villa",
        "as roma", "napoli"
    }

    h_elite = home.lower() in ELITE_CLUBS
    a_elite = away.lower() in ELITE_CLUBS

    derby_key = frozenset([home.lower(), away.lower()])
    derby_bonus = 0
    if derby_key in RIVALRIES:
        derby_bonus = 20
        reason = RIVALRIES[derby_key]
    elif h_elite and a_elite:
        derby_bonus = 20 if comp == "Champions League" else 15
        if not reason or "Relegation" in reason:
            reason = "⚔️ European Heavyweight Clash" if comp == "Champions League" else "⚔️ Blockbuster Showdown"
    elif (h_elite or a_elite) and comp in ("Champions League", "Premier League", "LaLiga"):
        derby_bonus = 10

    if not reason:
        if comp == "Champions League":
            reason = "🏆 UEFA Champions League"
        elif comp == "Europa League":
            reason = "🏆 UEFA Europa League"
        else:
            reason = f"🏆 {comp}"

    score = max(50, min(100, base + proximity_bonus + derby_bonus))
    return score, reason


def get_baseline_formation(cur, is_postgres: bool, team_name: str, fallback: str = "4-3-3") -> str:
    """Finds the most frequent formation (mode) deployed by team in last 5 matches."""
    if not team_name:
        return fallback
    param = "%s" if is_postgres else "?"
    try:
        cur.execute(f"""
            SELECT CASE WHEN LOWER(home_team) = LOWER({param}) THEN home_formation ELSE away_formation END AS fmt
            FROM match_stats
            WHERE (LOWER(home_team) = LOWER({param}) OR LOWER(away_team) = LOWER({param}))
              AND home_formation IS NOT NULL AND home_formation != ''
            ORDER BY match_date DESC
            LIMIT 5
        """, (team_name, team_name, team_name))
        rows = [r[0] if isinstance(r, (tuple, list)) else r["fmt"] for r in cur.fetchall()]
        valid = [fmt.strip() for fmt in rows if fmt and str(fmt).strip() and str(fmt).strip() != "None"]
        if valid:
            return max(set(valid), key=valid.count)
    except Exception:
        pass
    return fallback


def sync_league_standings(conn, is_postgres: bool, known_teams: list[str]) -> int:
    """
    Fetches league standings from ESPN's zero-key public API for all 7 competitions
    and persists them into the `team_standings` table.
    """
    leagues = [
        ("eng.1", "Premier League"),
        ("esp.1", "LaLiga"),
        ("ita.1", "Serie A"),
        ("ger.1", "Bundesliga"),
        ("fra.1", "Ligue 1"),
        ("uefa.champions", "Champions League"),
        ("uefa.europa", "Europa League"),
    ]

    cur = conn.cursor()
    param = "%s" if is_postgres else "?"
    now_str = get_real_network_utc_now().strftime("%Y-%m-%d %H:%M:%S")
    total_saved = 0

    if is_postgres:
        upsert_sql = f"""
            INSERT INTO team_standings (
                team_name, competition, position, played, points, goal_diff, form_string, updated_at
            ) VALUES (
                {param}, {param}, {param}, {param}, {param}, {param}, {param}, {param}
            )
            ON CONFLICT (team_name, competition) DO UPDATE SET
                position = EXCLUDED.position,
                played = EXCLUDED.played,
                points = EXCLUDED.points,
                goal_diff = EXCLUDED.goal_diff,
                form_string = EXCLUDED.form_string,
                updated_at = EXCLUDED.updated_at
        """
    else:
        upsert_sql = """
            INSERT OR REPLACE INTO team_standings (
                team_name, competition, position, played, points, goal_diff, form_string, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """

    ssl_ctx = _get_ssl_context()
    print("[Sync] Synchronizing league standings from ESPN Public API...")
    for slug, comp_name in leagues:
        url = f"https://site.api.espn.com/apis/v2/sports/soccer/{slug}/standings"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "FootballCounsel/2.0"})
            with urllib.request.urlopen(req, timeout=8, context=ssl_ctx) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            print(f"[Sync] Standings notice for {comp_name} ({slug}): {e}")
            continue

        entries = []
        if "children" in data and data["children"]:
            for child in data["children"]:
                if "standings" in child and "entries" in child["standings"]:
                    entries.extend(child["standings"]["entries"])
        elif "standings" in data and "entries" in data["standings"]:
            entries.extend(data["standings"]["entries"])

        for entry in entries:
            team_info = entry.get("team", {})
            raw_name = team_info.get("displayName") or team_info.get("name") or ""
            norm_name = normalize_team_name(raw_name, known_teams)
            if not norm_name:
                continue

            stats_map = {s.get("name"): s.get("value") for s in entry.get("stats", []) if "name" in s}
            pos = int(stats_map.get("rank") or 0)
            pts = int(stats_map.get("points") or 0)
            gd = int(stats_map.get("pointDifferential") or 0)
            pl = int(stats_map.get("gamesPlayed") or 0)
            form = str(entry.get("form") or "")

            cur.execute(upsert_sql, (norm_name, comp_name, pos, pl, pts, gd, form, now_str))
            total_saved += 1

    conn.commit()
    print(f"[Sync] Saved/updated {total_saved} live team standings records across {len(leagues)} competitions.")
    return total_saved


def setup_and_clean_db(conn, is_postgres: bool):
    """
    1. Purges any synthetic `UPCOMING_%` or `FD_%` or unplayed rows from `match_stats`
       so `match_stats` remains 100% pure historical match data.
    2. Creates and safely migrates `upcoming_fixtures` table with marquee and formation attributes,
       and removes any synthetic `NEXT_%` fixtures.
    3. Creates `team_standings` table and index.
    """
    cur = conn.cursor()

    # Clean historical match_stats of any synthetic upcoming rows
    cur.execute("""
        DELETE FROM match_stats
        WHERE match_id LIKE 'UPCOMING_%'
           OR match_id LIKE 'FD_%'
           OR match_id LIKE 'ESPN_%'
           OR match_id LIKE 'NEXT_%'
           OR home_score IS NULL
    """)

    # Create upcoming_fixtures table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS upcoming_fixtures (
            fixture_id TEXT PRIMARY KEY,
            competition TEXT,
            match_date TEXT,
            venue TEXT,
            home_team TEXT,
            away_team TEXT,
            api_home_name TEXT,
            api_away_name TEXT,
            ai_summary TEXT,
            ai_insights TEXT,
            impact_score INTEGER DEFAULT 50,
            is_marquee BOOLEAN DEFAULT FALSE,
            marquee_reason TEXT,
            home_formation TEXT DEFAULT '4-3-3',
            away_formation TEXT DEFAULT '4-2-3-1',
            updated_at TEXT
        )
    """)

    # Purge any synthetic NEXT_% rows from upcoming_fixtures
    cur.execute("DELETE FROM upcoming_fixtures WHERE fixture_id LIKE 'NEXT_%'")

    # Safe migration for existing SQLite / Postgres tables if columns don't exist yet
    if is_postgres:
        cur.execute("ALTER TABLE upcoming_fixtures ADD COLUMN IF NOT EXISTS impact_score INTEGER DEFAULT 50;")
        cur.execute("ALTER TABLE upcoming_fixtures ADD COLUMN IF NOT EXISTS is_marquee BOOLEAN DEFAULT FALSE;")
        cur.execute("ALTER TABLE upcoming_fixtures ADD COLUMN IF NOT EXISTS marquee_reason TEXT;")
        cur.execute("ALTER TABLE upcoming_fixtures ADD COLUMN IF NOT EXISTS home_formation TEXT DEFAULT '4-3-3';")
        cur.execute("ALTER TABLE upcoming_fixtures ADD COLUMN IF NOT EXISTS away_formation TEXT DEFAULT '4-2-3-1';")
    else:
        cur.execute("PRAGMA table_info(upcoming_fixtures)")
        existing_cols = {row[1] for row in cur.fetchall()}
        cols_to_add = [
            ("impact_score", "INTEGER", "50"),
            ("is_marquee", "BOOLEAN", "0"),
            ("marquee_reason", "TEXT", "NULL"),
            ("home_formation", "TEXT", "'4-3-3'"),
            ("away_formation", "TEXT", "'4-2-3-1'"),
        ]
        for col_name, col_type, default_val in cols_to_add:
            if col_name not in existing_cols:
                cur.execute(f"ALTER TABLE upcoming_fixtures ADD COLUMN {col_name} {col_type} DEFAULT {default_val}")

    # Create team_standings table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS team_standings (
            team_name TEXT NOT NULL,
            competition TEXT NOT NULL,
            position INTEGER NOT NULL,
            played INTEGER NOT NULL,
            points INTEGER NOT NULL,
            goal_diff INTEGER NOT NULL,
            form_string TEXT,
            updated_at TEXT,
            PRIMARY KEY (team_name, competition)
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_standings_comp ON team_standings (competition, position);")
    conn.commit()


def get_known_db_teams(conn) -> list[str]:
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT home_team FROM match_stats WHERE home_score IS NOT NULL")
    rows = cur.fetchall()
    return [r[0] if isinstance(r, (tuple, list)) else r["home_team"] for r in rows if r]


_NETWORK_TIME_OFFSET = None


def get_real_network_utc_now() -> datetime:
    """
    Fetches the real-world current UTC date/time from an HTTP server's `Date` header
    using a clock-skew-tolerant SSL context so that an incorrect local Windows system clock
    (e.g. set to Nov 2026) never breaks SSL verification or API date ranges.
    """
    global _NETWORK_TIME_OFFSET
    if _NETWORK_TIME_OFFSET is not None:
        return datetime.utcnow() + _NETWORK_TIME_OFFSET

    ssl_ctx = _get_ssl_context()
    probe_urls = [
        "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard",
        "https://www.google.com",
        "http://www.google.com",
    ]
    for url in probe_urls:
        for method in ("HEAD", "GET"):
            try:
                req = urllib.request.Request(url, method=method, headers={"User-Agent": "FootballCounsel/2.0"})
                ctx = ssl_ctx if url.startswith("https") else None
                with urllib.request.urlopen(req, timeout=5, context=ctx) as resp:
                    date_hdr = resp.headers.get("Date")
                    if date_hdr:
                        dt = email.utils.parsedate_to_datetime(date_hdr).replace(tzinfo=None)
                        _NETWORK_TIME_OFFSET = dt - datetime.utcnow()
                        return dt
            except Exception:
                continue
    return datetime.utcnow()


def _extract_espn_pre_events(
    events: list[dict],
    comp_name: str,
    known_teams: list[str],
    cutoff_str: str,
    max_date_str: str,
    seen_ids: set,
    out_fixtures: list[dict]
) -> int:
    """Extracts verified upcoming ('pre') fixtures within [cutoff_str, max_date_str] from ESPN events list."""
    added = 0
    for ev in events:
        ev_id = ev.get("id")
        if not ev_id or ev_id in seen_ids:
            continue
        competitions = ev.get("competitions", [])
        if not competitions:
            continue
        comp = competitions[0]
        state = comp.get("status", {}).get("type", {}).get("state", "")
        # Strictly keep only upcoming ('pre') matches
        if state != "pre":
            continue

        raw_date = ev.get("date", "")
        if not raw_date:
            continue
        dt_str = raw_date[:16].replace("T", " ")
        # Strictly require match to be in the future and within window
        if dt_str < cutoff_str or dt_str[:10] > max_date_str:
            continue

        competitors = comp.get("competitors", [])
        home_comp = next((c for c in competitors if c.get("homeAway") == "home"), None)
        away_comp = next((c for c in competitors if c.get("homeAway") == "away"), None)
        if not home_comp or not away_comp:
            continue

        raw_home = home_comp.get("team", {}).get("displayName") or home_comp.get("team", {}).get("name")
        raw_away = away_comp.get("team", {}).get("displayName") or away_comp.get("team", {}).get("name")
        if not raw_home or not raw_away:
            continue

        # Skip placeholder/TBD knockout slots
        if "tbd" in raw_home.lower() or "tbd" in raw_away.lower() or "winner" in raw_home.lower() or "winner" in raw_away.lower():
            continue

        home_norm = normalize_team_name(raw_home, known_teams)
        away_norm = normalize_team_name(raw_away, known_teams)
        venue = comp.get("venue", {}).get("fullName") or f"{home_norm} Stadium"

        out_fixtures.append({
            "fixture_id": f"ESPN_{ev_id}",
            "competition": comp_name,
            "match_date": dt_str,
            "venue": venue,
            "home_team": home_norm,
            "away_team": away_norm,
            "api_home_name": raw_home,
            "api_away_name": raw_away,
        })
        seen_ids.add(ev_id)
        added += 1
    return added


def _extract_calendar_dates(calendar_data: list) -> list[str]:
    """
    Recursively extracts YYYY-MM-DD active matchday dates from ESPN's `leagues[0]['calendar']`,
    handling flat string lists, {'value': '...'} objects, and multi-stage {'entries': [...]} trees.
    """
    dates = set()
    for item in calendar_data:
        if isinstance(item, str):
            if len(item) >= 10 and item[4] == "-" and item[7] == "-":
                dates.add(item[:10])
        elif isinstance(item, dict):
            entries = item.get("entries")
            if isinstance(entries, list) and entries:
                for sub_d in _extract_calendar_dates(entries):
                    dates.add(sub_d)
            else:
                val = item.get("value")
                start_s = item.get("startDate")
                end_s = item.get("endDate")
                if isinstance(start_s, str) and isinstance(end_s, str) and len(start_s) >= 10 and len(end_s) >= 10:
                    try:
                        s_dt = datetime.strptime(start_s[:10], "%Y-%m-%d")
                        e_dt = datetime.strptime(end_s[:10], "%Y-%m-%d")
                        span = (e_dt - s_dt).days
                        if 0 <= span <= 6:
                            for d_off in range(span + 1):
                                dates.add((s_dt + timedelta(days=d_off)).strftime("%Y-%m-%d"))
                            continue
                    except Exception:
                        pass
                for candidate in (val, start_s):
                    if isinstance(candidate, str) and len(candidate) >= 10 and candidate[4] == "-" and candidate[7] == "-":
                        dates.add(candidate[:10])
    return sorted(dates)


def fetch_from_espn_free_api(known_teams: list[str], window_days: int = 14) -> list[dict]:
    """
    Fetches 100% real upcoming fixtures across all 7 supported competitions over the next
    `window_days` (default 14 days / 2 full weeks, extending up to 35 days if an international
    or European break occurs) using ESPN's public scoreboard & calendar API.
    """
    leagues = [
        ("uefa.champions", "Champions League"),
        ("uefa.europa", "Europa League"),
        ("eng.1", "Premier League"),
        ("esp.1", "LaLiga"),
        ("ita.1", "Serie A"),
        ("ger.1", "Bundesliga"),
        ("fra.1", "Ligue 1"),
    ]

    ssl_ctx = _get_ssl_context()
    now = get_real_network_utc_now()
    today_str = now.strftime("%Y-%m-%d")
    cutoff_str = (now - timedelta(hours=1)).strftime("%Y-%m-%d %H:%M")
    end_dt = now + timedelta(days=window_days)
    end_date_str = end_dt.strftime("%Y-%m-%d")
    extended_end_str = (now + timedelta(days=35)).strftime("%Y-%m-%d")

    print(f"[Sync] Querying ESPN Live Scoreboard API for upcoming matchweeks ({today_str} to {end_date_str}, extended to {extended_end_str} across breaks)...")

    fixtures = []
    seen_ids = set()

    for slug, comp_name in leagues:
        league_fixtures_before = len(fixtures)
        future_cal_dates = []

        # 1. Fetch base scoreboard to get current matchday + official league calendar
        base_url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/{slug}/scoreboard"
        try:
            req = urllib.request.Request(base_url, headers={"User-Agent": "FootballCounsel/2.0"})
            with urllib.request.urlopen(req, timeout=8, context=ssl_ctx) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                _extract_espn_pre_events(
                    data.get("events", []), comp_name, known_teams,
                    cutoff_str, extended_end_str, seen_ids, fixtures
                )
                lg_list = data.get("leagues", [])
                if lg_list and isinstance(lg_list[0].get("calendar"), list):
                    all_cal = _extract_calendar_dates(lg_list[0]["calendar"])
                    future_cal_dates = [d for d in all_cal if today_str <= d <= extended_end_str]
        except Exception as e:
            print(f"[Sync] Base scoreboard notice for {comp_name}: {e}")

        # 2. Select active matchday dates covering the 14-day window AND at least the next 6 active matchdays
        # so that an international break or UEFA gap still captures the next full round(s)
        if future_cal_dates:
            in_14d = [d for d in future_cal_dates if d <= end_date_str]
            if len(in_14d) >= 5:
                selected_iso_dates = in_14d
            else:
                selected_iso_dates = future_cal_dates[:6]
            target_dates = [d.replace("-", "") for d in selected_iso_dates]
            max_allowed_date = selected_iso_dates[-1] if selected_iso_dates else extended_end_str
        else:
            target_dates = [(now + timedelta(days=i)).strftime("%Y%m%d") for i in range(window_days + 1)]
            max_allowed_date = end_date_str

        # 3. Query each active date for this competition
        queried_dates = set(target_dates)
        for day_str in target_dates:
            day_url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/{slug}/scoreboard?dates={day_str}&limit=50"
            try:
                req = urllib.request.Request(day_url, headers={"User-Agent": "FootballCounsel/2.0"})
                with urllib.request.urlopen(req, timeout=6, context=ssl_ctx) as resp:
                    day_data = json.loads(resp.read().decode("utf-8"))
                    _extract_espn_pre_events(
                        day_data.get("events", []), comp_name, known_teams,
                        cutoff_str, max_allowed_date, seen_ids, fixtures
                    )
            except Exception:
                continue

        # 4. If 0 upcoming games found (e.g. UCL/UEL between bi-weekly rounds or international break),
        # scan forward up to 28 days for the very next round
        if len(fixtures) == league_fixtures_before:
            active_weekdays = (1, 2, 3) if slug in ("uefa.champions", "uefa.europa") else (4, 5, 6, 0, 1, 2, 3)
            for d_off in range(1, 29):
                cand_dt = now + timedelta(days=d_off)
                if cand_dt.weekday() not in active_weekdays:
                    continue
                day_str = cand_dt.strftime("%Y%m%d")
                if day_str in queried_dates:
                    continue
                queried_dates.add(day_str)
                day_url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/{slug}/scoreboard?dates={day_str}&limit=50"
                try:
                    req = urllib.request.Request(day_url, headers={"User-Agent": "FootballCounsel/2.0"})
                    with urllib.request.urlopen(req, timeout=6, context=ssl_ctx) as resp:
                        day_data = json.loads(resp.read().decode("utf-8"))
                        _extract_espn_pre_events(
                            day_data.get("events", []), comp_name, known_teams,
                            cutoff_str, extended_end_str, seen_ids, fixtures
                        )
                except Exception:
                    continue
                # Stop once we've captured a full round (e.g. >= 8 games)
                if (len(fixtures) - league_fixtures_before) >= 8 and cand_dt.weekday() in (3, 0):
                    break

        league_added = len(fixtures) - league_fixtures_before
        print(f"  -> {comp_name}: {league_added} live upcoming matches found.")

    if fixtures:
        print(f"[Sync] Total: Retrieved {len(fixtures)} live upcoming fixtures from ESPN Free Soccer API.")
    return fixtures


def fetch_from_football_data_api(api_key: str, known_teams: list[str], window_days: int = 14) -> list[dict]:
    """Fetches upcoming scheduled matches from football-data.org (Free Tier) across a 14-day window."""
    print("[Sync] Connecting to football-data.org API...")
    ssl_ctx = _get_ssl_context()
    real_now = get_real_network_utc_now()
    cutoff_str = (real_now - timedelta(hours=1)).strftime("%Y-%m-%d %H:%M")
    date_from = real_now.strftime("%Y-%m-%d")
    date_to = (real_now + timedelta(days=window_days)).strftime("%Y-%m-%d")
    url = f"https://api.football-data.org/v4/matches?status=SCHEDULED,TIMED&dateFrom={date_from}&dateTo={date_to}"
    req = urllib.request.Request(url, headers={"X-Auth-Token": api_key, "User-Agent": "FootballConsul/2.0"})

    comp_map = {
        "Premier League": "Premier League",
        "Primera Division": "LaLiga",
        "La Liga": "LaLiga",
        "Serie A": "Serie A",
        "Bundesliga": "Bundesliga",
        "Ligue 1": "Ligue 1",
        "UEFA Champions League": "Champions League",
        "UEFA Europa League": "Europa League",
    }

    fixtures = []
    with urllib.request.urlopen(req, timeout=10, context=ssl_ctx) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        matches = data.get("matches", [])
        for m in matches:
            raw_comp = m.get("competition", {}).get("name", "League")
            if raw_comp not in comp_map:
                continue
            comp_name = comp_map[raw_comp]
            raw_home = m.get("homeTeam", {}).get("shortName") or m.get("homeTeam", {}).get("name")
            raw_away = m.get("awayTeam", {}).get("shortName") or m.get("awayTeam", {}).get("name")
            if not raw_home or not raw_away:
                continue
            home_norm = normalize_team_name(raw_home, known_teams)
            away_norm = normalize_team_name(raw_away, known_teams)

            utc_date = m.get("utcDate", "")
            if not utc_date:
                continue
            dt_str = utc_date[:16].replace("T", " ")
            if dt_str < cutoff_str:
                continue
            matchday = m.get("matchday")
            venue = f"Matchday {matchday}" if matchday else f"{home_norm} Stadium"

            fixtures.append({
                "fixture_id": f"FD_{m.get('id')}",
                "competition": comp_name,
                "match_date": dt_str,
                "venue": venue,
                "home_team": home_norm,
                "away_team": away_norm,
                "api_home_name": raw_home,
                "api_away_name": raw_away,
            })

    print(f"[Sync] Retrieved {len(fixtures)} scheduled fixtures from football-data.org")
    return fixtures


def save_fixtures_to_conn(conn, is_postgres: bool, fixtures: list[dict], clear_stale: bool = True):
    """
    Saves verified live upcoming fixtures into `upcoming_fixtures` while preserving any generated AI summaries.
    Always purges synthetic `NEXT_%` rows and past matches (`match_date < cutoff_str`).
    """
    cur = conn.cursor()
    param = "%s" if is_postgres else "?"
    real_now = get_real_network_utc_now()
    cutoff_str = (real_now - timedelta(hours=2)).strftime("%Y-%m-%d %H:%M")
    now_str = real_now.strftime("%Y-%m-%d %H:%M:%S")

    # Always remove synthetic NEXT_% fixtures and expired past fixtures
    cur.execute("DELETE FROM upcoming_fixtures WHERE fixture_id LIKE 'NEXT_%'")
    cur.execute(
        f"DELETE FROM upcoming_fixtures WHERE match_date < {param}",
        (cutoff_str,)
    )

    if not fixtures:
        conn.commit()
        return 0

    # Preserve existing AI summaries keyed by (home_team, away_team)
    existing_ai = {}
    try:
        cur.execute("SELECT home_team, away_team, ai_summary, ai_insights FROM upcoming_fixtures WHERE ai_summary IS NOT NULL")
        for row in cur.fetchall():
            h = row[0] if isinstance(row, (tuple, list)) else row["home_team"]
            a = row[1] if isinstance(row, (tuple, list)) else row["away_team"]
            s = row[2] if isinstance(row, (tuple, list)) else row["ai_summary"]
            ins = row[3] if isinstance(row, (tuple, list)) else row["ai_insights"]
            existing_ai[f"{h}__{a}".lower()] = (s, ins)
    except Exception:
        pass

    # Also check legacy agent_previews table if present
    try:
        cur.execute("SELECT home_team, away_team, preview_text, data_insights FROM agent_previews")
        for row in cur.fetchall():
            h = row[0] if isinstance(row, (tuple, list)) else row["home_team"]
            a = row[1] if isinstance(row, (tuple, list)) else row["away_team"]
            s = row[2] if isinstance(row, (tuple, list)) else row["preview_text"]
            ins = row[3] if isinstance(row, (tuple, list)) else row["data_insights"]
            key = f"{h}__{a}".lower()
            if key not in existing_ai and s:
                existing_ai[key] = (s, ins)
    except Exception:
        pass

    if clear_stale:
        cur.execute("DELETE FROM upcoming_fixtures")

    seen_pairs = set()
    saved = 0

    for f in fixtures:
        # Key by (home_team, away_team, date) so two-legged ties in 2 weeks aren't dropped if distinct dates
        pair_date_key = f"{f['home_team']}__{f['away_team']}__{f['match_date'][:10]}".lower()
        if pair_date_key in seen_pairs:
            continue
        seen_pairs.add(pair_date_key)

        pair_key = f"{f['home_team']}__{f['away_team']}".lower()
        ai_summary, ai_insights = existing_ai.get(pair_key, (None, None))

        insert_sql = f"""
            INSERT INTO upcoming_fixtures (
                fixture_id, competition, match_date, venue,
                home_team, away_team, api_home_name, api_away_name,
                ai_summary, ai_insights, impact_score, is_marquee, marquee_reason,
                home_formation, away_formation, updated_at
            ) VALUES (
                {param}, {param}, {param}, {param},
                {param}, {param}, {param}, {param},
                {param}, {param}, {param}, {param},
                {param}, {param}, {param}, {param}
            )
        """
        cur.execute(insert_sql, (
            f["fixture_id"],
            f["competition"],
            f["match_date"],
            f["venue"],
            f["home_team"],
            f["away_team"],
            f.get("api_home_name", f["home_team"]),
            f.get("api_away_name", f["away_team"]),
            ai_summary,
            ai_insights,
            int(f.get("impact_score") or 50),
            bool(f.get("is_marquee", False)),
            f.get("marquee_reason", f["competition"]),
            f.get("home_formation", "4-3-3"),
            f.get("away_formation", "4-2-3-1"),
            now_str
        ))
        saved += 1

    conn.commit()
    return saved


def sync_upcoming():
    """
    Synchronizes strictly real upcoming fixtures and standings from Live APIs
    (ESPN Free API / football-data.org) across the next 2 weeks into Neon PostgreSQL
    (if reachable) and local SQLite databases, and purges any synthetic or expired rows.
    """
    connections = []

    if DB_URL:
        try:
            pg_conn = psycopg2.connect(DB_URL, connect_timeout=5)
            connections.append((pg_conn, True, "Neon PostgreSQL"))
        except Exception as e:
            print(f"[Sync] PostgreSQL unreachable ({e}), syncing local SQLite...")

    for sq_candidate in (SQLITE_PATH, SQLITE_FALLBACK_PATH):
        if os.path.exists(sq_candidate):
            sq_conn = sqlite3.connect(sq_candidate)
            sq_conn.row_factory = sqlite3.Row
            connections.append((sq_conn, False, f"SQLite ({os.path.basename(sq_candidate)})"))

    if not connections:
        raise RuntimeError("No database available to sync fixtures.")

    primary_conn, primary_is_pg, _ = connections[0]
    setup_and_clean_db(primary_conn, primary_is_pg)
    known_teams = get_known_db_teams(primary_conn)

    # 1. Sync Standings first
    try:
        sync_league_standings(primary_conn, primary_is_pg, known_teams)
    except Exception as e:
        print(f"[Sync] Notice during standings sync: {e}")

    # Build standings_map from team_standings
    standings_map = {}
    try:
        cur = primary_conn.cursor()
        cur.execute("SELECT team_name, competition, position, points, goal_diff, played FROM team_standings")
        for row in cur.fetchall():
            tn = row[0] if isinstance(row, (tuple, list)) else row["team_name"]
            cp = row[1] if isinstance(row, (tuple, list)) else row["competition"]
            pos = row[2] if isinstance(row, (tuple, list)) else row["position"]
            pts = row[3] if isinstance(row, (tuple, list)) else row["points"]
            gd = row[4] if isinstance(row, (tuple, list)) else row["goal_diff"]
            pl = row[5] if isinstance(row, (tuple, list)) else row["played"]
            standings_map[(str(tn).lower(), str(cp).lower())] = {
                "position": int(pos or 0),
                "points": int(pts or 0),
                "goal_diff": int(gd or 0),
                "played": int(pl or 0)
            }
    except Exception as e:
        print(f"[Sync] Notice reading standings map: {e}")

    fixtures = []
    # 2. Try zero-key ESPN Public Soccer API (primary 7-league 14-day + calendar engine)
    try:
        fixtures = fetch_from_espn_free_api(known_teams, window_days=14)
    except Exception as e:
        print(f"[Sync] ESPN Free API notice: {e}")

    # 3. Also try football-data.org if user configured an API key and ESPN returned nothing
    if not fixtures and FOOTBALL_DATA_API_KEY:
        try:
            fixtures = fetch_from_football_data_api(FOOTBALL_DATA_API_KEY, known_teams, window_days=14)
        except Exception as e:
            print(f"[Sync] football-data.org API notice: {e}")

    if not fixtures:
        print("[Sync] Warning: Live fixture APIs returned 0 matches (check internet connection). Cleaning expired/fake rows without generating fake games.")
        for conn, is_pg, label in connections:
            setup_and_clean_db(conn, is_pg)
            save_fixtures_to_conn(conn, is_pg, [], clear_stale=False)
            conn.close()
        return []

    # Precompute impact score, baseline formations, and marquee tier
    cur = primary_conn.cursor()
    for f in fixtures:
        score, reason = compute_fixture_impact(f, standings_map)
        f["impact_score"] = score
        f["marquee_reason"] = reason
        f["home_formation"] = get_baseline_formation(cur, primary_is_pg, f["home_team"], "4-3-3")
        f["away_formation"] = get_baseline_formation(cur, primary_is_pg, f["away_team"], "4-2-3-1")

    # Dynamic Top-N marquee flag (top 4 midweek and top 6 weekend, or score >= 80)
    midweek_count = 0
    weekend_count = 0
    sorted_fixtures = sorted(fixtures, key=lambda x: x.get("impact_score", 50), reverse=True)
    for f in sorted_fixtures:
        dt_str = f.get("match_date", "")
        is_midweek = False
        try:
            m_dt = datetime.strptime(dt_str[:10], "%Y-%m-%d")
            is_midweek = m_dt.weekday() in (1, 2, 3)
        except Exception:
            is_midweek = f.get("competition") in ("Champions League", "Europa League")

        if is_midweek:
            if midweek_count < 4 or f.get("impact_score", 50) >= 80:
                f["is_marquee"] = True
                midweek_count += 1
            else:
                f["is_marquee"] = False
        else:
            if weekend_count < 6 or f.get("impact_score", 50) >= 80:
                f["is_marquee"] = True
                weekend_count += 1
            else:
                f["is_marquee"] = False

    for conn, is_pg, label in connections:
        setup_and_clean_db(conn, is_pg)
        if conn != primary_conn:
            try:
                sync_league_standings(conn, is_pg, known_teams)
            except Exception:
                pass
        count = save_fixtures_to_conn(conn, is_pg, fixtures, clear_stale=True)
        conn.close()
        print(f"[Sync] {label}: {count} live upcoming fixtures synced into `upcoming_fixtures`.")

    return fixtures


if __name__ == "__main__":
    sync_upcoming()
