# Football Counsel (Football Consul)

Football Counsel is an AI-powered match intelligence and tactical analytics platform that combines **real-time multi-league fixture & standings ingestion**, **historical match telemetry (xG, possession, shots, lineups)**, and **LLM/LangGraph tactical agents** into an interactive React dashboard, REST API, and Telegram/CLI assistant.

---

## 🚀 Key Features

- **⚡ 100% Live Upcoming Fixtures & Standings Engine (`sync_fixtures.py`):**
  - Automatically ingests **verified live upcoming matches** and **live league table standings** across 7 elite competitions: **Premier League, LaLiga, Serie A, Bundesliga, Ligue 1, UEFA Champions League, and UEFA Europa League**.
  - Uses ESPN's public scoreboard & calendar API (zero API key required) plus optional `football-data.org` v4 integration.
  - Smart multi-week calendar lookahead automatically scans ahead across international or European breaks to guarantee real scheduled matchweeks—with **zero synthetic or fabricated fixtures**.
  - Built-in network UTC clock synchronization (`get_real_network_utc_now()`) protects fixture filtering against local machine clock drift.
- **🔥 Algorithmic Marquee & Impact Scoring (`0–100`):**
  - Every upcoming fixture is scored and tagged in real time based on live league standings, points per game, historical rivalries (`El Clásico`, `Der Klassiker`, `Northwest Derby`, `Derby della Madonnina`, etc.), title deciders (`#1 vs #2–#3`), and UCL qualification battles.
  - Automatically selects the **Featured Match of the Week** (`Impact 90–100`) and organizes games into **Midweek Magic (Tue–Thu)** and **Weekend Showdowns (Fri–Sun)**.
- **🌐 Curated Matchday Intelligence Web App (`web/`):**
  - Modern **React 19 + Vite + Tailwind CSS** application with **Dark & Light theme** support.
  - **Curated Matchday Feed & All Fixtures Vault:** Filter by competition, time window (`All Marquee`, `Midweek`, `Weekend`), and live team search.
  - **Tactical Projections on Every Card:** Displays live league ranks & points, expected tactical formations (`4-2-3-1`, `4-3-3`, etc.), historical xG projections, and a 3-way Win/Draw/Away probability bar.
  - **Match Agent Workspace & Ask Consul AI Chat:** Deep-dive into individual match intelligence (`MatchAgentScreen`) or query the database in natural language (`AskConsulScreen`).
  - **Tiered Access Funnel:** Supports Guest (`1st Game Free • No Login`), Free Member (`3 Daily Credits`), and Pro (`Unlimited`) tiers.
- **⚡ Single-Query In-Memory Team Profile Engine (`api.py`):**
  - Preloads all historical finished matches from `match_stats` in a **single SQL query** (`preload_all_team_rows`) and computes rolling xG, goals, possession, expected formations, and win probabilities across 130+ upcoming fixtures in ~`0.2s`.
  - Automatically self-heals and re-syncs upcoming fixtures if the schedule is older than 6 hours or has fewer than 10 future games.
- **🧠 Natural-Language-to-SQL AI Agent (`app.py`) & Multi-Agent Previews (`agent_preview.py`):**
  - Translates natural language questions into SQL queries with an **Anti-Hallucination Engine**, self-correction loop, and conversational memory.
  - Supports **Google Gemini** (`gemini-2.5-flash`) and local **Ollama** (`llama3.1` + `qwen2.5-coder`) models.
  - Generates dynamic `matplotlib` charts delivered directly to **Telegram** or opened automatically in **Terminal mode**.

---

## 🗄️ Database Architecture

Football Counsel strictly separates historical finished match telemetry from live future schedule data across three core tables (compatible with both **Neon Serverless PostgreSQL** and local **SQLite** fallback):

| Table | Purpose | Source |
| :--- | :--- | :--- |
| `match_stats` (+ `match_lineups`, `players`) | **Strictly finished historical matches** (scores, xG, possession, shots, corners, fouls, yellow/red cards, formations, starting XI & bench). Never polluted by unplayed fixtures. | `main_parser.py` (Flashscore Playwright scraper) |
| `upcoming_fixtures` | **100% real future scheduled matches** (`fixture_id`, `competition`, `match_date`, `home_team`, `away_team`, `venue`, `is_marquee`, `impact_score`, `marquee_reason`). Automatically purges past games (`match_date < now - 2h`). | `sync_fixtures.py` (ESPN Public API + `football-data.org`) |
| `team_standings` | **Live league table standings** (`team_name`, `competition`, `rank`, `points`, `played`, `wins`, `draws`, `losses`, `goal_diff`, `form`) across all 7 competitions. | `sync_fixtures.py` |

---

## 🛠️ Prerequisites

- **Python 3.9+**
- **Node.js 18+** & **npm** (for the React + Vite web dashboard)
- **Neon.tech PostgreSQL** connection string (automatically falls back to local SQLite `football_counsel.db` / `football_consul.db` if omitted)
- **Google Gemini API Key** (for AI SQL chat & match intelligence)
- _Optional:_ **Telegram Bot Token** (from `@BotFather` if running in Telegram mode)
- _Optional:_ **Ollama** installed locally (if running with `AI_MODEL=ollama`)
- _Optional:_ **`FOOTBALL_DATA_API_KEY`** (from `football-data.org`; not required as the ESPN Zero-Key API covers all 7 competitions out of the box)

---

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd "Football Consul"
```

### 2. Create and Activate a Python Virtual Environment

**Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**Mac / Linux:**
```bash
python -m venv venv
source venv/bin/activate
```

### 3. Install Backend & Scraper Dependencies

```bash
pip install -r requirements.txt
playwright install chromium
```

### 4. Install Frontend Dependencies

```bash
cd web
npm install
cd ..
```

### 5. Configure Environment Variables (`.env`)

Create a `.env` file in the project root:

```env
# AI & Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
GOOGLE_API_KEY=your_gemini_api_key_here
GOOGLE_MODEL_NAME=gemini-2.5-flash
PLATFORM=telegram          # 'telegram' for Telegram bot, or 'terminal' for local CLI chat
AI_MODEL=google            # 'google' for Gemini, or 'ollama' for local models

# Ollama Configuration (Used if AI_MODEL=ollama)
OLLAMA_MODEL=llama3.1
SECOND_OLLAMA_MODEL=qwen2.5-coder

# Database Configuration (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@ep-your-host.region.aws.neon.tech/neondb?sslmode=require

# Optional: football-data.org API key (ESPN free API works automatically without this)
FOOTBALL_DATA_API_KEY=
```

---

## 🚀 Usage Guide

### Step 1: Sync Live Upcoming Fixtures & League Standings

Fetch the latest real-world upcoming matches and live standings across all 7 European competitions into PostgreSQL, local SQLite, and the frontend fallback snapshot:

```bash
python sync_fixtures.py
```

> **Note:** `api.py` also triggers `sync_fixtures.py` automatically in the background whenever the database has fewer than 10 future matches or hasn't been synced in the last 6 hours.

---

### Step 2: Run the Flask REST API & React Web Application

1. **Start the Flask API Backend** (runs on `http://localhost:5000`):
   ```bash
   python api.py
   ```

2. **Start the React + Vite Frontend** (in a second terminal, runs on `http://localhost:5173`):
   ```bash
   cd web
   npm run dev
   ```

3. **Production Frontend Build** (optional):
   ```bash
   npm --prefix web run build
   ```

---

### Step 3: Scrape Historical Match Stats (`main_parser.py`)

To scrape new finished match statistics, xG, and player lineups into `match_stats`:

```bash
python main_parser.py
```

---

### Step 4: Start the Telegram / Terminal SQL AI Bot (`app.py`)

Ensure `PLATFORM` in `.env` is set to `telegram` or `terminal`:

```bash
python app.py
```

- **Telegram Mode (`PLATFORM=telegram`):** Send `/start` to your bot and ask questions about team averages, corners, fouls, xG, or player stats.
- **Terminal Mode (`PLATFORM=terminal`):** Chat directly in your CLI, inspect generated SQL queries in real time, and view auto-opened `matplotlib` charts.

---

### Step 5: Generate LangGraph Multi-Agent Match Previews (`agent_preview.py`)

Run the autonomous **Data Analyst Agent + Preview Pundit Agent** workflow to generate rich Markdown tactical previews:

```bash
python agent_preview.py
```

---

## 🔌 REST API Endpoints (`api.py`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/matches` | Returns all verified upcoming fixtures enriched with live standings, expected formations, historical xG models, 3-way win probabilities, and marquee impact tags (`Featured Match of the Week`, `Midweek Magic`, `Weekend Showdowns`). |
| `POST` | `/api/fixtures/sync` | Triggers an immediate live sync of upcoming fixtures and standings from ESPN / `football-data.org`. |
| `GET` | `/api/matches/<match_id>` | Returns deep head-to-head telemetry, recent form, key tactical metrics, and AI preview narrative for a specific match. |
| `POST` | `/api/chat` | Conversational AI endpoint supporting both **Match-Scoped Tactical Analysis** and **Global Database SQL Queries**. |
| `GET` | `/api/stats/overview` | Returns high-level database telemetry (total historical matches tracked, teams, players, average goals, and xG leaders). |

---

## 💻 Example Usage (Terminal SQL Mode)

When running `python app.py` with `PLATFORM=terminal`, you can watch the agent translate natural language into SQL and store results in conversational memory:

```text
🤖 Starting Terminal Mode...
☁️ Using Google Gemini
⚽ Football Consul is ready! Type 'exit' to close.
--------------------------------------------------

You: show ossasuna avarage fouls and corners

🤔 [Agent Thinking]: The user is asking for the average fouls and corners for Osasuna. I need to query the match_stats table, combining home and away stats for Osasuna using UNION ALL to calculate the average fouls and corners.
🗄️ [Running SQL]:
SELECT
  AVG(team_fouls) AS average_fouls,
  AVG(team_corners) AS average_corners
FROM (
  SELECT home_fouls AS team_fouls, home_corners AS team_corners FROM match_stats WHERE home_team LIKE '%Osasuna%'
  UNION ALL
  SELECT away_fouls AS team_fouls, away_corners AS team_corners FROM match_stats WHERE away_team LIKE '%Osasuna%'
);

🧠 [Memory Saved]: osasuna_average_fouls -> 13.538
🧠 [Memory Saved]: osasuna_average_corners -> 3.192

⚽ Football Consul: Osasuna averages approximately 13.54 fouls and 3.19 corners per match.
```

---

## 📁 Project Structure

```text
Football Consul/
├── api.py                      # Flask REST API, single-query profile engine & auto-sync guard
├── sync_fixtures.py            # Live 7-league upcoming fixtures & standings ingestion + Impact Engine
├── app.py                      # Telegram & Terminal Natural-Language-to-SQL AI Agent
├── agent_preview.py            # LangGraph Multi-Agent (Data Analyst + Pundit) preview generator
├── main_parser.py              # Playwright + BeautifulSoup historical match & lineup scraper
├── requirements.txt            # Python dependencies
├── .env                        # Environment variables (ignored by Git)
└── web/                        # React 19 + Vite + Tailwind CSS Frontend
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx             # Root router, navigation & theme shell
        ├── context/
        │   ├── AppContext.jsx      # Global match state, access tiers & daily credits
        │   └── ThemeContext.jsx    # Dark / Light mode persistence
        ├── screens/
        │   ├── UpcomingMatchesScreen.jsx  # Curated Matchday Feed, Hero Spotlight & All Fixtures
        │   ├── MatchAgentScreen.jsx       # Deep-dive Match Intelligence & AI Tactical Chat
        │   ├── AskConsulScreen.jsx        # Global natural-language database query workspace
        │   ├── SignInScreen.jsx           # Free Member registration / sign-in flow
        │   └── ProUpgradeScreen.jsx       # Pro subscription upgrade view
        ├── components/
        │   ├── MarqueeHeroCard.jsx        # Featured Match of the Week spotlight card
        │   ├── MinimalFixtureCard.jsx     # Compact tactical fixture card
        │   ├── Sidebar.jsx                # Desktop navigation & telemetry status
        │   ├── TopAppBar.jsx              # Header navigation, tier badges & theme toggle
        │   ├── BottomNavBar.jsx           # Mobile bottom navigation bar
        │   └── ThemeSelector.jsx          # Light / Dark mode switcher
        ├── services/
        │   └── api.js                     # API client with timeout protection & live snapshot fallback
        └── data/
            └── baselineFixtures.js        # Auto-exported verified upcoming fixtures snapshot
```

---

## 💡 Roadmap & Monetization

- **The "Bettor’s Edge" (B2C Subscription):** Freemium model where guests get 1 free match analysis, registered free members receive 3 daily AI credits, and Pro subscribers unlock unlimited deep tactical simulations and custom SQL queries.
- **Affiliate & Odds Comparison Integration:** Side-by-side comparison of model win probabilities (`xG` & form-derived) against market implied probabilities.
- **Scout-as-a-Service:** Instant tactical packs and visual exports for football analysts, journalists, and content creators.
- **White-Label API (B2B):** Licensing the natural-language-to-SQL and Curated Matchday Impact Engine to sports media platforms.
