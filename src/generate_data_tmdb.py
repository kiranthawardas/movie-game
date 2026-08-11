"""
TMDB API data pipeline for the movie-game (the maintainable, refreshable source).

Regenerates movie_casts.json and actor_filmographies.json using the TMDB API.
Unlike the flat Kaggle CSV -- whose comma-joined cast string produced junk like
a standalone "Jr." split off "Peter Sztojanov, Jr." -- the API returns
structured cast objects, so the full cast is clean. We keep every cast member
and output the casts alphabetically (matching the alphabetical film lists).

Run it as a manual shell command whenever you want to refresh the data:

    export TMDB_TOKEN='<your v4 API Read Access Token>'
    python3 src/generate_data_tmdb.py

Inputs:
    movie_ids.json      title -> TMDB movie id  (produced by clean_data.py)
    game_config.json    daily puzzles, whose actors/films are force-preserved

Outputs:
    movie_casts.json           title -> [top-billed cast, alphabetized]
    actor_filmographies.json   actor -> [films], rebuilt from the trimmed casts

Credits responses are cached under .tmdb_cache/ so re-runs are cheap and an
interrupted run resumes where it left off (incremental updates cost only the
movies whose cache is missing -- delete a cache file to refresh that movie).
"""

import json
import os
import ssl
import sys
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

# macOS' bundled Python often lacks system CA certs, so verify against certifi
# when available (falls back to the default context otherwise).
try:
    import certifi
    SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    SSL_CONTEXT = ssl.create_default_context()

# --- Config -----------------------------------------------------------------

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(OUT_DIR, ".tmdb_cache")
MOVIE_IDS_PATH = os.path.join(OUT_DIR, "movie_ids.json")
GAME_CONFIG_PATH = os.path.join(OUT_DIR, "game_config.json")

MAX_WORKERS = 16         # concurrent API requests (TMDB allows ~50 req/s)
TIMEOUT = 20

TOKEN = os.environ.get("TMDB_TOKEN")


# --- Puzzle preservation (shared contract with clean_data.py) ---------------

def collect_puzzle_requirements(path):
    """film title -> set(actors that must remain in its cast)."""
    with open(path) as f:
        config = json.load(f)
    required = {}
    for game in config["games"]:
        input_actor = game["startingActor"]
        for step in game["idealPath"]:
            required.setdefault(step["film"], set()).update({input_actor, step["costar"]})
            input_actor = step["costar"]
    return required


# --- TMDB fetch (cached) ----------------------------------------------------

def fetch_credits(movie_id):
    """Return the TMDB cast list for a movie id, using an on-disk cache."""
    cache_path = os.path.join(CACHE_DIR, f"{movie_id}.json")
    if os.path.exists(cache_path):
        with open(cache_path) as f:
            return json.load(f)

    url = f"https://api.themoviedb.org/3/movie/{movie_id}/credits?language=en-US"
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {TOKEN}",
        "accept": "application/json",
    })
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT, context=SSL_CONTEXT) as resp:
                data = json.load(resp)
            cast = data.get("cast", [])
            with open(cache_path, "w") as f:
                json.dump(cast, f, ensure_ascii=False)
            return cast
        except urllib.error.HTTPError as e:
            if e.code == 429:                      # rate limited -- back off
                time.sleep(2 ** attempt)
                continue
            if e.code == 404:                      # movie gone from TMDB
                with open(cache_path, "w") as f:
                    json.dump([], f)
                return []
            raise
        except (urllib.error.URLError, TimeoutError):
            time.sleep(2 ** attempt)
    return []


def cast_names(cast):
    """All cast members' names, in TMDB billing order (leads first).

    We keep the full cast -- the structured API data has no comma-split junk,
    so a complete list is still clean, and it gives players every real co-star
    to route through. De-duplicates names while preserving order.
    """
    ordered = sorted(cast, key=lambda c: c.get("order", 10**6))
    seen = set()
    names = []
    for c in ordered:
        name = c["name"]
        if name not in seen:
            seen.add(name)
            names.append(name)
    return names


# --- Build ------------------------------------------------------------------

def build():
    if not TOKEN:
        sys.exit("Set TMDB_TOKEN to your TMDB v4 API Read Access Token first.")
    os.makedirs(CACHE_DIR, exist_ok=True)

    with open(MOVIE_IDS_PATH) as f:
        movie_ids = json.load(f)          # title -> id
    required = collect_puzzle_requirements(GAME_CONFIG_PATH)

    casts = {}
    total = len(movie_ids)
    done = 0

    def work(item):
        title, movie_id = item
        return title, fetch_credits(movie_id)

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = [pool.submit(work, item) for item in movie_ids.items()]
        for fut in as_completed(futures):
            title, cast = fut.result()
            names = cast_names(cast)

            # Safety net: ensure a puzzle's actors are present even if TMDB has
            # since dropped them from the film's credits.
            for actor in required.get(title, set()):
                if actor not in names:
                    names.append(actor)
            casts[title] = sorted(set(names))

            done += 1
            if done % 2000 == 0:
                print(f"  {done}/{total} movies...", flush=True)

    missing = [f for f in required if f not in casts]
    if missing:
        print(f"WARNING: {len(missing)} puzzle film(s) missing from movie_ids.json")

    filmographies = {}
    for title, cast in casts.items():
        for actor in cast:
            filmographies.setdefault(actor, set()).add(title)

    return casts, filmographies


class SetEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, set):
            return sorted(obj)
        return json.JSONEncoder.default(self, obj)


def main():
    casts, filmographies = build()
    with open(os.path.join(OUT_DIR, "movie_casts.json"), "w") as f:
        json.dump(casts, f, indent=4, ensure_ascii=False)
    with open(os.path.join(OUT_DIR, "actor_filmographies.json"), "w") as f:
        json.dump(filmographies, f, indent=4, ensure_ascii=False, cls=SetEncoder)

    print(f"movies:  {len(casts)}")
    print(f"actors:  {len(filmographies)}")
    avg = sum(len(c) for c in casts.values()) / max(len(casts), 1)
    print(f"avg cast size: {avg:.1f}")


if __name__ == "__main__":
    main()
