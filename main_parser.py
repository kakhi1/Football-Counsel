import traceback
import requests
import time
import re
from datetime import datetime
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
import psycopg2
import os
from dotenv import load_dotenv
import socket

# --- FORCE IPv4 ---
# Prevents the "Cannot assign requested address" IPv6 error with Neon DB on Windows
old_getaddrinfo = socket.getaddrinfo


def new_getaddrinfo(*args, **kwargs):
    responses = old_getaddrinfo(*args, **kwargs)
    res = [response for response in responses if response[0] == socket.AF_INET]
    return res if res else responses


socket.getaddrinfo = new_getaddrinfo
# ------------------

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")


def send_admin_alert(message: str):
    """Sends a direct message to your personal Telegram account."""
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    admin_id = os.getenv("ADMIN_CHAT_ID")
    if token and admin_id:
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        requests.post(url, json={
            "chat_id": admin_id,
            "text": message,
            "parse_mode": "HTML"
        })


def clean_stat_value(val):
    """Extracts the first numeric value from a string (e.g., '48%' -> 48, '1.43' -> 1.43)."""
    if not val:
        return None
    match_float = re.search(r'\d+\.\d+', val)
    if match_float:
        return float(match_float.group())
    match_int = re.search(r'\d+', val)
    if match_int:
        return int(match_int.group())
    return None


def clean_team_name(name):
    """Removes country codes in parentheses from team names (e.g. 'PAOK (Gre)' -> 'PAOK')."""
    if not name:
        return name
    return re.sub(r'\s*\([A-Za-z0-9\s\.\-]+\)$', '', name).strip()


def setup_database():
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()

    # 1. Match Stats Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS match_stats (
            match_id TEXT PRIMARY KEY,
            match_date TEXT,
            competition TEXT,
            match_stage TEXT,
            home_team TEXT, away_team TEXT,
            home_score INTEGER, away_score INTEGER,
            home_formation TEXT, away_formation TEXT,
            
            -- Standard Stats
            home_xg REAL, away_xg REAL,
            home_possession_pct INTEGER, away_possession_pct INTEGER,
            home_total_shots INTEGER, away_total_shots INTEGER,
            home_shots_on_target INTEGER, away_shots_on_target INTEGER,
            home_shots_off_target INTEGER, away_shots_off_target INTEGER,
            home_blocked_shots INTEGER, away_blocked_shots INTEGER,
            home_corners INTEGER, away_corners INTEGER,
            home_offsides INTEGER, away_offsides INTEGER,
            home_fouls INTEGER, away_fouls INTEGER,
            home_yellow_cards INTEGER, away_yellow_cards INTEGER,
            home_big_chances INTEGER, away_big_chances INTEGER,
            home_passes_pct INTEGER, away_passes_pct INTEGER,
            home_goalkeeper_saves INTEGER, away_goalkeeper_saves INTEGER,
            
            -- Advanced Stats
            home_xgot REAL, away_xgot REAL,
            home_xa REAL, away_xa REAL,
            home_shots_inside_box INTEGER, away_shots_inside_box INTEGER,
            home_shots_outside_box INTEGER, away_shots_outside_box INTEGER,
            home_hit_woodwork INTEGER, away_hit_woodwork INTEGER,
            home_touches_in_opp_box INTEGER, away_touches_in_opp_box INTEGER,
            home_accurate_through_passes INTEGER, away_accurate_through_passes INTEGER,
            home_free_kicks INTEGER, away_free_kicks INTEGER,
            home_long_passes_pct INTEGER, away_long_passes_pct INTEGER,
            home_passes_final_third_pct INTEGER, away_passes_final_third_pct INTEGER,
            home_crosses_pct INTEGER, away_crosses_pct INTEGER,
            home_throw_ins INTEGER, away_throw_ins INTEGER,
            home_tackles_pct INTEGER, away_tackles_pct INTEGER,
            home_duels_won INTEGER, away_duels_won INTEGER,
            home_clearances INTEGER, away_clearances INTEGER,
            home_interceptions INTEGER, away_interceptions INTEGER,
            home_errors_leading_to_shot INTEGER, away_errors_leading_to_shot INTEGER,
            home_errors_leading_to_goal INTEGER, away_errors_leading_to_goal INTEGER,
            home_xgot_faced REAL, away_xgot_faced REAL,
            home_goals_prevented REAL, away_goals_prevented REAL,
            home_red_cards INTEGER, away_red_cards INTEGER,
            home_headed_goals INTEGER, away_headed_goals INTEGER
        )
    ''')

    # 2. Players Dictionary Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS players (
            player_id TEXT PRIMARY KEY,
            name TEXT
        )
    ''')

    # 3. Match Lineups (The Bridge Table)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS match_lineups (
            lineup_id SERIAL PRIMARY KEY,
            match_id TEXT,
            player_id TEXT,
            team_type TEXT, 
            shirt_number TEXT,
            is_starter BOOLEAN,
            rating REAL,
            FOREIGN KEY(match_id) REFERENCES match_stats(match_id),
            FOREIGN KEY(player_id) REFERENCES players(player_id),
            UNIQUE(match_id, player_id)
        )
    ''')

    conn.commit()
    return conn


def get_existing_match_ids(conn):
    cursor = conn.cursor()
    # Only treat as existing if the match was successfully parsed with valid stats
    cursor.execute("SELECT match_id FROM match_stats WHERE home_total_shots IS NOT NULL")
    return {row[0] for row in cursor.fetchall()}


def parse_and_save_stats(html_content, conn, match_id, competition, match_stage, home_team, away_team, home_score, away_score):
    """Parses the main Stats tab and saves to match_stats."""
    soup = BeautifulSoup(html_content, 'html.parser')

    # 1. INITIALIZE ALL FIELDS TO NONE
    stats = {
        'match_id': match_id, 'match_date': None, 'competition': competition, 'match_stage': match_stage,
        'home_team': home_team, 'away_team': away_team,
        'home_score': home_score, 'away_score': away_score,
        'home_formation': None, 'away_formation': None,

        # Standard Stats
        'home_xg': None, 'away_xg': None, 'home_possession_pct': None, 'away_possession_pct': None,
        'home_total_shots': None, 'away_total_shots': None, 'home_shots_on_target': None, 'away_shots_on_target': None,
        'home_shots_off_target': None, 'away_shots_off_target': None, 'home_blocked_shots': None, 'away_blocked_shots': None,
        'home_corners': None, 'away_corners': None, 'home_offsides': None, 'away_offsides': None,
        'home_fouls': None, 'away_fouls': None, 'home_yellow_cards': None, 'away_yellow_cards': None,
        'home_big_chances': None, 'away_big_chances': None, 'home_passes_pct': None, 'away_passes_pct': None,
        'home_goalkeeper_saves': None, 'away_goalkeeper_saves': None,

        # Advanced Stats
        'home_xgot': None, 'away_xgot': None, 'home_xa': None, 'away_xa': None,
        'home_shots_inside_box': None, 'away_shots_inside_box': None,
        'home_shots_outside_box': None, 'away_shots_outside_box': None,
        'home_hit_woodwork': None, 'away_hit_woodwork': None,
        'home_touches_in_opp_box': None, 'away_touches_in_opp_box': None,
        'home_accurate_through_passes': None, 'away_accurate_through_passes': None,
        'home_free_kicks': None, 'away_free_kicks': None,
        'home_long_passes_pct': None, 'away_long_passes_pct': None,
        'home_passes_final_third_pct': None, 'away_passes_final_third_pct': None,
        'home_crosses_pct': None, 'away_crosses_pct': None,
        'home_throw_ins': None, 'away_throw_ins': None,
        'home_tackles_pct': None, 'away_tackles_pct': None,
        'home_duels_won': None, 'away_duels_won': None,
        'home_clearances': None, 'away_clearances': None,
        'home_interceptions': None, 'away_interceptions': None,
        'home_errors_leading_to_shot': None, 'away_errors_leading_to_shot': None,
        'home_errors_leading_to_goal': None, 'away_errors_leading_to_goal': None,
        'home_xgot_faced': None, 'away_xgot_faced': None,
        'home_goals_prevented': None, 'away_goals_prevented': None,
        'home_red_cards': None, 'away_red_cards': None,
        'home_headed_goals': None, 'away_headed_goals': None
    }

    # Extract and format the Match Date
    date_elem = soup.find('div', class_='duelParticipant__startTime')
    if date_elem:
        raw_date = date_elem.text.strip()
        try:
            parsed_date = datetime.strptime(raw_date, "%d.%m.%Y %H:%M")
            stats['match_date'] = parsed_date.strftime("%Y-%m-%d %H:%M")
        except ValueError:
            stats['match_date'] = raw_date

    # Define mapping between Flashscore stat labels and our dictionary keys
    stat_mapping = {
        "Expected goals (xG)": "xg", "xG on target (xGOT)": "xgot", "Expected assists (xA)": "xa",
        "Ball possession": "possession_pct", "Total shots": "total_shots",
        "Shots on target": "shots_on_target", "Shots off target": "shots_off_target",
        "Blocked shots": "blocked_shots", "Shots inside the box": "shots_inside_box",
        "Shots outside the box": "shots_outside_box", "Hit the woodwork": "hit_woodwork",
        "Corner kicks": "corners", "Offsides": "offsides",
        "Touches in opposition box": "touches_in_opp_box", "Accurate through passes": "accurate_through_passes",
        "Free kicks": "free_kicks", "Fouls": "fouls", "Yellow cards": "yellow_cards",
        "Big chances": "big_chances", "Passes": "passes_pct", "Long passes": "long_passes_pct",
        "Passes in final third": "passes_final_third_pct", "Crosses": "crosses_pct",
        "Throw ins": "throw_ins", "Tackles": "tackles_pct", "Duels won": "duels_won",
        "Clearances": "clearances", "Interceptions": "interceptions",
        "Errors leading to shot": "errors_leading_to_shot", "Errors leading to goal": "errors_leading_to_goal",
        "Goalkeeper saves": "goalkeeper_saves", "xGOT faced": "xgot_faced", "Goals prevented": "goals_prevented",
        "Red cards": "red_cards", "Headed goals": "headed_goals"
    }

    # Extract Statistics (Supports both modern and legacy Flashscore DOM)
    rows = soup.find_all('div', attrs={'data-testid': 'wcl-statistics'})
    for row in rows:
        cat_elem = (
            row.find('div', class_=lambda c: c and 'wcl-label_' in c) or 
            row.find('div', attrs={'data-testid': 'wcl-statistics-category'})
        )
        home_val_elem = (
            row.find('div', class_=lambda c: c and 'wcl-value_' in c) or 
            row.find('div', attrs={'data-testid': 'wcl-statistics-value'})
        )
        away_box = row.find('div', class_=lambda c: c and 'wcl-awayValue_' in c)
        away_val_elem = (
            away_box.find('div', class_=lambda c: c and 'wcl-value_' in c) if away_box 
            else None
        )
        if not away_val_elem:
            vals = row.find_all('div', attrs={'data-testid': 'wcl-statistics-value'})
            if len(vals) >= 2:
                home_val_elem = vals[0]
                away_val_elem = vals[1]

        if cat_elem and home_val_elem and away_val_elem:
            category = cat_elem.get_text(strip=True)
            for key, suffix in stat_mapping.items():
                if key == category:
                    stats[f'home_{suffix}'] = clean_stat_value(home_val_elem.get_text(separator=" ", strip=True))
                    stats[f'away_{suffix}'] = clean_stat_value(away_val_elem.get_text(separator=" ", strip=True))
                    break

    # If general stats are available, default zero-occurrence event counts to 0 instead of None
    if stats['home_total_shots'] is not None:
        for zero_key in ['hit_woodwork', 'errors_leading_to_shot', 'errors_leading_to_goal', 'red_cards', 'headed_goals']:
            if stats[f'home_{zero_key}'] is None:
                stats[f'home_{zero_key}'] = 0
            if stats[f'away_{zero_key}'] is None:
                stats[f'away_{zero_key}'] = 0

    # 2. INSERT / UPSERT WITH ALL FIELDS
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO match_stats (
            match_id, match_date, competition, match_stage, home_team, away_team, 
            home_score, away_score, home_formation, away_formation,
            home_xg, away_xg, home_possession_pct, away_possession_pct, home_total_shots, away_total_shots,
            home_shots_on_target, away_shots_on_target, home_shots_off_target, away_shots_off_target,
            home_blocked_shots, away_blocked_shots, home_corners, away_corners, home_offsides, away_offsides,
            home_fouls, away_fouls, home_yellow_cards, away_yellow_cards, home_big_chances, away_big_chances,
            home_passes_pct, away_passes_pct, home_goalkeeper_saves, away_goalkeeper_saves,
            home_xgot, away_xgot, home_xa, away_xa, home_shots_inside_box, away_shots_inside_box,
            home_shots_outside_box, away_shots_outside_box, home_hit_woodwork, away_hit_woodwork,
            home_touches_in_opp_box, away_touches_in_opp_box, home_accurate_through_passes, away_accurate_through_passes,
            home_free_kicks, away_free_kicks, home_long_passes_pct, away_long_passes_pct,
            home_passes_final_third_pct, away_passes_final_third_pct, home_crosses_pct, away_crosses_pct,
            home_throw_ins, away_throw_ins, home_tackles_pct, away_tackles_pct, home_duels_won, away_duels_won,
            home_clearances, away_clearances, home_interceptions, away_interceptions,
            home_errors_leading_to_shot, away_errors_leading_to_shot, home_errors_leading_to_goal, away_errors_leading_to_goal,
            home_xgot_faced, away_xgot_faced, home_goals_prevented, away_goals_prevented,
            home_red_cards, away_red_cards, home_headed_goals, away_headed_goals
        ) VALUES (
            %(match_id)s, %(match_date)s, %(competition)s, %(match_stage)s, %(home_team)s, %(away_team)s, 
            %(home_score)s, %(away_score)s, %(home_formation)s, %(away_formation)s,
            %(home_xg)s, %(away_xg)s, %(home_possession_pct)s, %(away_possession_pct)s, %(home_total_shots)s, %(away_total_shots)s,
            %(home_shots_on_target)s, %(away_shots_on_target)s, %(home_shots_off_target)s, %(away_shots_off_target)s,
            %(home_blocked_shots)s, %(away_blocked_shots)s, %(home_corners)s, %(away_corners)s, %(home_offsides)s, %(away_offsides)s,
            %(home_fouls)s, %(away_fouls)s, %(home_yellow_cards)s, %(away_yellow_cards)s, %(home_big_chances)s, %(away_big_chances)s,
            %(home_passes_pct)s, %(away_passes_pct)s, %(home_goalkeeper_saves)s, %(away_goalkeeper_saves)s,
            %(home_xgot)s, %(away_xgot)s, %(home_xa)s, %(away_xa)s, %(home_shots_inside_box)s, %(away_shots_inside_box)s,
            %(home_shots_outside_box)s, %(away_shots_outside_box)s, %(home_hit_woodwork)s, %(away_hit_woodwork)s,
            %(home_touches_in_opp_box)s, %(away_touches_in_opp_box)s, %(home_accurate_through_passes)s, %(away_accurate_through_passes)s,
            %(home_free_kicks)s, %(away_free_kicks)s, %(home_long_passes_pct)s, %(away_long_passes_pct)s,
            %(home_passes_final_third_pct)s, %(away_passes_final_third_pct)s, %(home_crosses_pct)s, %(away_crosses_pct)s,
            %(home_throw_ins)s, %(away_throw_ins)s, %(home_tackles_pct)s, %(away_tackles_pct)s, %(home_duels_won)s, %(away_duels_won)s,
            %(home_clearances)s, %(away_clearances)s, %(home_interceptions)s, %(away_interceptions)s,
            %(home_errors_leading_to_shot)s, %(away_errors_leading_to_shot)s, %(home_errors_leading_to_goal)s, %(away_errors_leading_to_goal)s,
            %(home_xgot_faced)s, %(away_xgot_faced)s, %(home_goals_prevented)s, %(away_goals_prevented)s,
            %(home_red_cards)s, %(away_red_cards)s, %(home_headed_goals)s, %(away_headed_goals)s
        )
        ON CONFLICT (match_id) DO UPDATE SET
            match_date = COALESCE(EXCLUDED.match_date, match_stats.match_date),
            home_team = EXCLUDED.home_team,
            away_team = EXCLUDED.away_team,
            home_score = EXCLUDED.home_score,
            away_score = EXCLUDED.away_score,
            home_formation = COALESCE(EXCLUDED.home_formation, match_stats.home_formation),
            away_formation = COALESCE(EXCLUDED.away_formation, match_stats.away_formation),
            home_xg = COALESCE(EXCLUDED.home_xg, match_stats.home_xg),
            away_xg = COALESCE(EXCLUDED.away_xg, match_stats.away_xg),
            home_possession_pct = COALESCE(EXCLUDED.home_possession_pct, match_stats.home_possession_pct),
            away_possession_pct = COALESCE(EXCLUDED.away_possession_pct, match_stats.away_possession_pct),
            home_total_shots = COALESCE(EXCLUDED.home_total_shots, match_stats.home_total_shots),
            away_total_shots = COALESCE(EXCLUDED.away_total_shots, match_stats.away_total_shots),
            home_shots_on_target = COALESCE(EXCLUDED.home_shots_on_target, match_stats.home_shots_on_target),
            away_shots_on_target = COALESCE(EXCLUDED.away_shots_on_target, match_stats.away_shots_on_target),
            home_shots_off_target = COALESCE(EXCLUDED.home_shots_off_target, match_stats.home_shots_off_target),
            away_shots_off_target = COALESCE(EXCLUDED.away_shots_off_target, match_stats.away_shots_off_target),
            home_blocked_shots = COALESCE(EXCLUDED.home_blocked_shots, match_stats.home_blocked_shots),
            away_blocked_shots = COALESCE(EXCLUDED.away_blocked_shots, match_stats.away_blocked_shots),
            home_corners = COALESCE(EXCLUDED.home_corners, match_stats.home_corners),
            away_corners = COALESCE(EXCLUDED.away_corners, match_stats.away_corners),
            home_offsides = COALESCE(EXCLUDED.home_offsides, match_stats.home_offsides),
            away_offsides = COALESCE(EXCLUDED.away_offsides, match_stats.away_offsides),
            home_fouls = COALESCE(EXCLUDED.home_fouls, match_stats.home_fouls),
            away_fouls = COALESCE(EXCLUDED.away_fouls, match_stats.away_fouls),
            home_yellow_cards = COALESCE(EXCLUDED.home_yellow_cards, match_stats.home_yellow_cards),
            away_yellow_cards = COALESCE(EXCLUDED.away_yellow_cards, match_stats.away_yellow_cards),
            home_big_chances = COALESCE(EXCLUDED.home_big_chances, match_stats.home_big_chances),
            away_big_chances = COALESCE(EXCLUDED.away_big_chances, match_stats.away_big_chances),
            home_passes_pct = COALESCE(EXCLUDED.home_passes_pct, match_stats.home_passes_pct),
            away_passes_pct = COALESCE(EXCLUDED.away_passes_pct, match_stats.away_passes_pct),
            home_goalkeeper_saves = COALESCE(EXCLUDED.home_goalkeeper_saves, match_stats.home_goalkeeper_saves),
            away_goalkeeper_saves = COALESCE(EXCLUDED.away_goalkeeper_saves, match_stats.away_goalkeeper_saves),
            home_xgot = COALESCE(EXCLUDED.home_xgot, match_stats.home_xgot),
            away_xgot = COALESCE(EXCLUDED.away_xgot, match_stats.away_xgot),
            home_xa = COALESCE(EXCLUDED.home_xa, match_stats.home_xa),
            away_xa = COALESCE(EXCLUDED.away_xa, match_stats.away_xa),
            home_shots_inside_box = COALESCE(EXCLUDED.home_shots_inside_box, match_stats.home_shots_inside_box),
            away_shots_inside_box = COALESCE(EXCLUDED.away_shots_inside_box, match_stats.away_shots_inside_box),
            home_shots_outside_box = COALESCE(EXCLUDED.home_shots_outside_box, match_stats.home_shots_outside_box),
            away_shots_outside_box = COALESCE(EXCLUDED.away_shots_outside_box, match_stats.away_shots_outside_box),
            home_hit_woodwork = COALESCE(EXCLUDED.home_hit_woodwork, match_stats.home_hit_woodwork),
            away_hit_woodwork = COALESCE(EXCLUDED.away_hit_woodwork, match_stats.away_hit_woodwork),
            home_touches_in_opp_box = COALESCE(EXCLUDED.home_touches_in_opp_box, match_stats.home_touches_in_opp_box),
            away_touches_in_opp_box = COALESCE(EXCLUDED.away_touches_in_opp_box, match_stats.away_touches_in_opp_box),
            home_accurate_through_passes = COALESCE(EXCLUDED.home_accurate_through_passes, match_stats.home_accurate_through_passes),
            away_accurate_through_passes = COALESCE(EXCLUDED.away_accurate_through_passes, match_stats.away_accurate_through_passes),
            home_free_kicks = COALESCE(EXCLUDED.home_free_kicks, match_stats.home_free_kicks),
            away_free_kicks = COALESCE(EXCLUDED.away_free_kicks, match_stats.away_free_kicks),
            home_long_passes_pct = COALESCE(EXCLUDED.home_long_passes_pct, match_stats.home_long_passes_pct),
            away_long_passes_pct = COALESCE(EXCLUDED.away_long_passes_pct, match_stats.away_long_passes_pct),
            home_passes_final_third_pct = COALESCE(EXCLUDED.home_passes_final_third_pct, match_stats.home_passes_final_third_pct),
            away_passes_final_third_pct = COALESCE(EXCLUDED.away_passes_final_third_pct, match_stats.away_passes_final_third_pct),
            home_crosses_pct = COALESCE(EXCLUDED.home_crosses_pct, match_stats.home_crosses_pct),
            away_crosses_pct = COALESCE(EXCLUDED.away_crosses_pct, match_stats.away_crosses_pct),
            home_throw_ins = COALESCE(EXCLUDED.home_throw_ins, match_stats.home_throw_ins),
            away_throw_ins = COALESCE(EXCLUDED.away_throw_ins, match_stats.away_throw_ins),
            home_tackles_pct = COALESCE(EXCLUDED.home_tackles_pct, match_stats.home_tackles_pct),
            away_tackles_pct = COALESCE(EXCLUDED.away_tackles_pct, match_stats.away_tackles_pct),
            home_duels_won = COALESCE(EXCLUDED.home_duels_won, match_stats.home_duels_won),
            away_duels_won = COALESCE(EXCLUDED.away_duels_won, match_stats.away_duels_won),
            home_clearances = COALESCE(EXCLUDED.home_clearances, match_stats.home_clearances),
            away_clearances = COALESCE(EXCLUDED.away_clearances, match_stats.away_clearances),
            home_interceptions = COALESCE(EXCLUDED.home_interceptions, match_stats.home_interceptions),
            away_interceptions = COALESCE(EXCLUDED.away_interceptions, match_stats.away_interceptions),
            home_errors_leading_to_shot = COALESCE(EXCLUDED.home_errors_leading_to_shot, match_stats.home_errors_leading_to_shot),
            away_errors_leading_to_shot = COALESCE(EXCLUDED.away_errors_leading_to_shot, match_stats.away_errors_leading_to_shot),
            home_errors_leading_to_goal = COALESCE(EXCLUDED.home_errors_leading_to_goal, match_stats.home_errors_leading_to_goal),
            away_errors_leading_to_goal = COALESCE(EXCLUDED.away_errors_leading_to_goal, match_stats.away_errors_leading_to_goal),
            home_xgot_faced = COALESCE(EXCLUDED.home_xgot_faced, match_stats.home_xgot_faced),
            away_xgot_faced = COALESCE(EXCLUDED.away_xgot_faced, match_stats.away_xgot_faced),
            home_goals_prevented = COALESCE(EXCLUDED.home_goals_prevented, match_stats.home_goals_prevented),
            away_goals_prevented = COALESCE(EXCLUDED.away_goals_prevented, match_stats.away_goals_prevented),
            home_red_cards = COALESCE(EXCLUDED.home_red_cards, match_stats.home_red_cards),
            away_red_cards = COALESCE(EXCLUDED.away_red_cards, match_stats.away_red_cards),
            home_headed_goals = COALESCE(EXCLUDED.home_headed_goals, match_stats.home_headed_goals),
            away_headed_goals = COALESCE(EXCLUDED.away_headed_goals, match_stats.away_headed_goals)
    ''', stats)
    conn.commit()


def parse_and_save_lineups(html_content, conn, match_id):
    """Parses the Lineups tab and populates the players and match_lineups tables."""
    soup = BeautifulSoup(html_content, 'html.parser')
    cursor = conn.cursor()

    # 1. FORMATION EXTRACTION (Supports modern custom headers and legacy spans)
    formations_found = []
    for div in soup.find_all('div', attrs={'data-testid': 'wcl-headerSection-custom'}):
        matches = re.findall(r"\d\s*-\s*\d(?:\s*-\s*\d)*", div.get_text())
        formations_found.extend([m.strip() for m in matches])
    if len(formations_found) < 2:
        for span in soup.find_all(['span', 'div'], attrs={'data-testid': re.compile(r'overline', re.I)}):
            text = span.get_text(strip=True)
            if re.match(r"^\d\s*-\s*\d(?:\s*-\s*\d)*$", text):
                formations_found.append(text)

    if len(formations_found) >= 2:
        home_formation = formations_found[0]
        away_formation = formations_found[1]
        cursor.execute('UPDATE match_stats SET home_formation = %s, away_formation = %s WHERE match_id = %s',
                       (home_formation, away_formation, match_id))

    # 2. Extract Players (Supports modern wcl-lineupsGroup and legacy section)
    sections = soup.find_all(['div', 'section'], class_=lambda c: c and any(k in c for k in ['wcl-section_', 'section', 'lineup']))
    for section in sections:
        header = section.find(['div', 'span'], attrs={'data-testid': 'wcl-headerSection-text'})
        if not header:
            continue

        header_text = header.get_text().lower()
        if 'starting lineups' in header_text:
            is_starter = True
        elif 'substitutes' in header_text:
            is_starter = False
        else:
            continue

        sides = section.find_all('div', class_=lambda c: c and ('wcl-side_' in c or 'lf__side' in c))
        if len(sides) >= 2:
            for side_idx, side_html in enumerate(sides[:2]):
                team_type = 'Home' if side_idx == 0 else 'Away'
                players = side_html.find_all('div', class_=lambda c: c and ('wcl-participant_' in c or 'lf__participant' in c))

                for player in players:
                    # Player Name
                    name_wrapper = player.find(['a', 'div', 'span'], class_=lambda c: c and any(k in c for k in ['wcl-nameWrapper_', 'wcl-name_', 'lf__participantName']))
                    if name_wrapper:
                        strong = name_wrapper.find('strong')
                        raw_name = strong.get_text(strip=True) if strong else name_wrapper.get_text(strip=True)
                    else:
                        main_row = player.find('div', class_=lambda c: c and 'wcl-mainRow_' in c)
                        num_tag = player.find('span', class_=lambda c: c and 'wcl-number_' in c)
                        num_text = num_tag.get_text(strip=True) if num_tag else ""
                        raw_name = main_row.get_text(strip=True) if main_row else ""
                        if num_text and raw_name.startswith(num_text):
                            raw_name = raw_name[len(num_text):].strip()

                    name = raw_name.replace("(C)", "").replace("(G)", "").strip()
                    if not name:
                        continue

                    player_id = name.lower().replace(" ", "_").replace(".", "")

                    # Shirt Number
                    num_tag = player.find('span', class_=lambda c: c and ('wcl-number_' in c or 'lf__number' in c))
                    shirt_number = num_tag.get_text(strip=True) if num_tag else None

                    # Rating tag
                    rating_tag = player.find('span', {'data-testid': re.compile(r'caption-05|rating', re.I)})
                    rating = None
                    if rating_tag and rating_tag.get_text(strip=True):
                        try:
                            rating = float(rating_tag.get_text(strip=True))
                        except ValueError:
                            rating = None

                    cursor.execute(
                        'INSERT INTO players (player_id, name) VALUES (%s, %s) ON CONFLICT (player_id) DO NOTHING',
                        (player_id, name))

                    cursor.execute('''
                        INSERT INTO match_lineups (match_id, player_id, team_type, shirt_number, is_starter, rating)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (match_id, player_id) DO NOTHING
                    ''', (match_id, player_id, team_type, shirt_number, is_starter, rating))

    conn.commit()


def scrape_league(league_name, target_url):
    """Generic function to scrape any league passed to it."""
    print(f"\n{'='*50}")
    print(f"🚀 Starting scrape for {league_name}")
    print(f"{'='*50}\n")

    conn = setup_database()
    existing_ids = get_existing_match_ids(conn)
    print(f"Database currently holds {len(existing_ids)} matches with complete stats.")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.route("**/*", lambda route: route.abort()
                   if route.request.resource_type in ["image", "media", "font"]
                   else route.continue_())

        print(f"Loading {league_name} results page...")
        page.goto(target_url, wait_until='domcontentloaded')

        # Dismiss Cookie Banner
        try:
            page.locator('#onetrust-accept-btn-handler').click(timeout=3000)
        except:
            pass

        page.wait_for_selector('.event__match', timeout=10000)

        print(f"Expanding all past {league_name} matches... this might take a moment.")

        while True:
            try:
                show_more_btn = page.locator("button:has-text('Show more matches')")

                if show_more_btn.is_visible():
                    show_more_btn.scroll_into_view_if_needed()
                    page.wait_for_timeout(1000)
                    show_more_btn.click(force=True)
                    print("Clicked 'Show more matches'...")
                    page.wait_for_timeout(3000)
                else:
                    page.keyboard.press("End")
                    page.wait_for_timeout(2000)

                    if show_more_btn.is_visible():
                        continue

                    print("No more matches to load.")
                    break
            except Exception as e:
                print(f"Finished expanding matches. Note: {e}")
                break

        main_html = page.content()
        soup = BeautifulSoup(main_html, 'html.parser')
        match_list = []

        current_stage = "Regular Season"

        for element in soup.find_all(['div'], class_=lambda c: c and ('event__round' in c or 'event__match' in c)):
            classes = element.get('class', [])

            if 'event__round' in classes:
                current_stage = element.text.strip()

            elif 'event__match' in classes:
                match_id_raw = element.get('id')
                if not match_id_raw:
                    continue
                match_id = match_id_raw.split('_')[-1]

                try:
                    home_team_raw = element.find('div', class_='event__homeParticipant').find(
                        'span', class_='wcl-name_jjfMf').text.strip()
                    away_team_raw = element.find('div', class_='event__awayParticipant').find(
                        'span', class_='wcl-name_jjfMf').text.strip()
                    home_score = element.find(
                        'span', class_='event__score--home').text.strip()
                    away_score = element.find(
                        'span', class_='event__score--away').text.strip()

                    # Clean country codes in parentheses (e.g. 'PAOK (Gre)' -> 'PAOK')
                    home_team = clean_team_name(home_team_raw)
                    away_team = clean_team_name(away_team_raw)

                    if home_score.isdigit() and away_score.isdigit():
                        match_list.append({
                            'id': match_id, 'home': home_team, 'away': away_team,
                            'h_score': int(home_score), 'a_score': int(away_score),
                            'competition': league_name,
                            'match_stage': current_stage
                        })
                except AttributeError:
                    continue

        print(f"\nFound {len(match_list)} finished matches for {league_name}. Beginning deep extraction...\n")

        for m in match_list:
            if m['id'] in existing_ids:
                print(f"⏭️ Skipping {m['home']} vs {m['away']} (Already has stats in DB)")
                continue

            success = False
            for attempt in range(2):
                try:
                    page.goto(f"https://www.flashscore.com/match/{m['id']}/", wait_until='domcontentloaded')

                    try:
                        page.locator('#onetrust-accept-btn-handler').click(timeout=2000)
                    except:
                        pass

                    # 1. Capture Stats (Navigate directly via href for reliability)
                    stats_success = False
                    try:
                        stats_tab = page.locator('a[data-analytics-alias="match-statistics"]')
                        stats_href = stats_tab.get_attribute('href')
                        if stats_href:
                            page.goto(f"https://www.flashscore.com{stats_href}", wait_until='domcontentloaded')
                        else:
                            stats_tab.click(timeout=5000, force=True)
                        page.wait_for_selector('div[data-testid="wcl-statistics"]', timeout=5000)

                        parse_and_save_stats(page.content(), conn, m['id'], m['competition'], m['match_stage'],
                                             m['home'], m['away'], m['h_score'], m['a_score'])
                        stats_success = True
                    except Exception:
                        stats_success = False

                    # 2. Capture Lineups (Navigate directly via href for reliability)
                    lineups_success = False
                    try:
                        lineups_tab = page.locator('a[data-analytics-alias="lineups"]')
                        lineups_href = lineups_tab.get_attribute('href')
                        if lineups_href:
                            page.goto(f"https://www.flashscore.com{lineups_href}", wait_until='domcontentloaded')
                        else:
                            lineups_tab.click(timeout=5000, force=True)
                        try:
                            page.wait_for_selector('div[data-testid="wcl-lineupsGroup"], div.lf__lineUp, div[class*="wcl-section_"]', timeout=5000)
                        except:
                            pass
                        page.wait_for_timeout(1000)

                        parse_and_save_lineups(page.content(), conn, m['id'])
                        lineups_success = True
                    except Exception:
                        lineups_success = False

                    if stats_success or lineups_success:
                        print(f"✅ Saved Stats & Lineups: {m['home']} {m['h_score']}-{m['a_score']} {m['away']} ({m['match_stage']})")
                        success = True
                        break
                    else:
                        print(f"⚠️ Page load too slow for {m['home']} vs {m['away']}. Retrying (Attempt {attempt+1}/2)...")
                        time.sleep(2)

                except Exception as e:
                    print(f"⚠️ Network error parsing {m['home']} vs {m['away']}: {e}. Retrying...")
                    time.sleep(2)

            if not success:
                print(f"❌ Failed to extract advanced stats for {m['home']} vs {m['away']}. Saving basic info.")
                parse_and_save_stats("", conn, m['id'], m['competition'], m['match_stage'],
                                     m['home'], m['away'], m['h_score'], m['a_score'])

            time.sleep(1)

        browser.close()
        conn.close()
        print(f"\n🎉 {league_name} update complete!")


if __name__ == "__main__":
    try:
        leagues_to_scrape = [
            {"name": "Premier League",
                "url": "https://www.flashscore.com/football/england/premier-league/results/"},
            {"name": "LaLiga",
                "url": "https://www.flashscore.com/football/spain/laliga/results/"},
            {"name": "Serie A",
                "url": "https://www.flashscore.com/football/italy/serie-a/results/"},
            {"name": "Bundesliga",
                "url": "https://www.flashscore.com/football/germany/bundesliga/results/"},
            {"name": "Champions League",
                "url": "https://www.flashscore.com/football/europe/champions-league/results/"},
            {"name": "Europa League",
                "url": "https://www.flashscore.com/football/europe/europa-league/results/"},
        ]

        for league in leagues_to_scrape:
            scrape_league(league["name"], league["url"])

        print("\n🏆 All requested leagues have been scraped and saved!")
    except Exception as e:
        error_details = traceback.format_exc()
        error_message = f"🚨 <b>PARSER CRASHED!</b>\n\n<b>Error:</b> {e}\n\n<code>{error_details[:500]}</code>"
        send_admin_alert(error_message)
        print("Crash alert sent to admin.")
