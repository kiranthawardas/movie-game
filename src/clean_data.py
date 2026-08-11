"""
Offline cleanup for the movie-game cast/filmography data.

Rebuilds movie_casts.json and actor_filmographies.json from the Kaggle TMDB
CSV dump, fixing two long-standing data-quality problems:

  1. Comma-suffix bug: the CSV joins each film's cast into one comma-separated
     string, so a name like "Peter Sztojanov, Jr." was split into two people
     ("Peter Sztojanov" and a junk entry "Jr."). We re-merge suffix tokens.

  2. No trimming: the entire cast (often 40-60 people, incl. extras) was kept,
     making the in-game dropdowns huge. The CSV's cast field is NOT in billing
     order (leads are often buried mid-list), so a positional "top-N" trim
     keeps the wrong people. Instead we trim by prominence: keep actors who
     appear in at least MIN_FILMS popular films, which retains recognizable
     actors and drops one-off extras. (The TMDB-API pipeline does a proper
     billing-order + popularity trim; this is the best signal available offline.)

The existing daily puzzles (game_config.json) are preserved: every film and
every actor an ideal path routes through is force-included, even if the film
is below the popularity threshold or the actor is below the billing cutoff.

This is the immediate, no-API-key cleanup. See generate_data_tmdb.py for the
maintainable TMDB-API pipeline used to refresh the data going forward.
"""

import csv
import json
import os

csv.field_size_limit(10**9)

# --- Config -----------------------------------------------------------------

CSV_PATH = "/Users/kiranthawardas/Documents/movie-game/src/TMDB_all_movies.csv"
OUT_DIR = os.path.dirname(os.path.abspath(__file__))
GAME_CONFIG_PATH = os.path.join(OUT_DIR, "game_config.json")

MIN_VOTE_COUNT = 50      # same popularity filter the original pipeline used
MIN_FILMS = 3            # keep actors appearing in >= this many popular films

# Name suffixes that the CSV split onto their own line. When we see one of
# these as a standalone cast entry, re-attach it to the previous name.
SUFFIX_TOKENS = {
    "jr", "jr.", "sr", "sr.",
    "ii", "iii", "iv", "v",
    "phd", "ph.d.", "md", "m.d.", "esq.",
}


# --- Puzzle preservation ----------------------------------------------------

def collect_puzzle_requirements(game_config_path):
    """Return {film_title: set(actors that must appear in its cast)}.

    For each ideal-path step "A was in FILM with C", both A (the input actor)
    and C (the costar) must be present in FILM's cast for the path to be
    followable in either direction (the app supports a Swap that reverses it).
    """
    with open(game_config_path) as f:
        config = json.load(f)

    required = {}   # film -> set(actors)
    for game in config["games"]:
        input_actor = game["startingActor"]
        for step in game["idealPath"]:
            film = step["film"]
            costar = step["costar"]
            required.setdefault(film, set()).update({input_actor, costar})
            input_actor = costar
    return required


# --- Cast parsing -----------------------------------------------------------

def parse_cast(raw_cast):
    """Split the comma-joined cast string, re-merging split-off name suffixes.

    Preserves billing order (the order TMDB returned the cast in).
    """
    parts = [p.strip() for p in raw_cast.split(",")]
    names = []
    for part in parts:
        if not part:
            continue
        if part.lower() in SUFFIX_TOKENS and names:
            # Re-attach to the previous name: "Peter Sztojanov" + "Jr." ->
            # "Peter Sztojanov Jr." (space form, matching TMDB's canonical
            # spelling used elsewhere in the data, e.g. "Robert Downey Jr.").
            names[-1] = f"{names[-1]} {part}"
        else:
            names.append(part)
    return names


# --- Build ------------------------------------------------------------------

def build():
    required = collect_puzzle_requirements(GAME_CONFIG_PATH)
    puzzle_films = set(required.keys())

    # movie_title -> {"cast": [ordered names], "release_year": "YYYY"}
    movie_to_cast = {}

    with open(CSV_PATH, mode="r", newline="") as file:
        reader = csv.DictReader(file)
        for movie in reader:
            title = movie["title"]
            year = movie["release_date"][0:4]

            # Apply exactly the original popularity filter, in CSV order, so the
            # de-duplicated titles (e.g. "War of the Worlds (2005)") reproduce
            # identically to when game_config.json was generated. Every puzzle
            # film came from this same set, so no below-threshold inclusion is
            # needed -- and adding one risks a low-vote homonym hijacking a
            # plain title during de-dup.
            try:
                if movie["status"] != "Released" or float(movie["vote_count"] or 0) < MIN_VOTE_COUNT:
                    continue
            except ValueError:
                continue

            cast = parse_cast(movie["cast"])
            entry = {"cast": cast, "release_year": year, "id": movie["id"]}

            # De-dup identical titles by appending the release year to the
            # earlier one. (Same logic as the original generator.)
            if title in movie_to_cast:
                previous = movie_to_cast.pop(title)
                movie_to_cast[f"{title} ({previous['release_year']})"] = previous
                movie_to_cast[title] = entry
            else:
                movie_to_cast[title] = entry

    # Count how many popular films each actor appears in (their prominence).
    from collections import Counter
    appearances = Counter()
    for entry in movie_to_cast.values():
        for actor in set(entry["cast"]):
            appearances[actor] += 1

    # Trim each cast to prominent actors (>= MIN_FILMS), always keeping the
    # actors a puzzle routes through. Also emit a title -> TMDB id map for the
    # API refresh pipeline (generate_data_tmdb.py).
    casts = {}
    movie_ids = {}
    for title, entry in movie_to_cast.items():
        must_have = required.get(title, set())
        cast = [a for a in entry["cast"] if appearances[a] >= MIN_FILMS or a in must_have]
        for actor in must_have:
            if actor not in cast:
                cast.append(actor)
        casts[title] = cast
        movie_ids[title] = entry["id"]

    # Report any puzzle films still missing (would indicate a broken puzzle).
    missing = [f for f in puzzle_films if f not in casts]
    if missing:
        print(f"WARNING: {len(missing)} puzzle film(s) not found in CSV:")
        for f in missing[:20]:
            print("   -", f)

    # Rebuild filmographies from the cleaned casts.
    filmographies = {}
    for title, cast in casts.items():
        for actor in cast:
            filmographies.setdefault(actor, set()).add(title)

    return casts, filmographies, movie_ids


class SetEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, set):
            return sorted(obj)
        return json.JSONEncoder.default(self, obj)


def main():
    casts, filmographies, movie_ids = build()

    # Sort casts alphabetically for stable, scannable dropdown ordering.
    casts_sorted = {title: sorted(cast) for title, cast in casts.items()}

    with open(os.path.join(OUT_DIR, "movie_casts.json"), "w") as f:
        json.dump(casts_sorted, f, indent=4, ensure_ascii=False)
    with open(os.path.join(OUT_DIR, "actor_filmographies.json"), "w") as f:
        json.dump(filmographies, f, indent=4, ensure_ascii=False, cls=SetEncoder)
    with open(os.path.join(OUT_DIR, "movie_ids.json"), "w") as f:
        json.dump(movie_ids, f, indent=4, ensure_ascii=False)

    print(f"movies:  {len(casts_sorted)}")
    print(f"actors:  {len(filmographies)}")
    avg = sum(len(c) for c in casts_sorted.values()) / max(len(casts_sorted), 1)
    print(f"avg cast size: {avg:.1f}")


if __name__ == "__main__":
    main()
