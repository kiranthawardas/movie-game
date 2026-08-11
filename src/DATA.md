# Movie-game data pipeline

The game runs on two generated files bundled into the React app:

| File | Shape | Used for |
|------|-------|----------|
| `movie_casts.json` | `title -> [actors]` | the co-star dropdown for a chosen film |
| `actor_filmographies.json` | `actor -> [films]` | the film dropdown for the current actor |

Both are **generated** — don't hand-edit them.

## Refreshing the data (TMDB API — preferred)

`generate_data_tmdb.py` rebuilds both files from the TMDB API. Unlike the old
CSV, the API returns structured cast objects, so there's no comma-split junk
(e.g. a stray `"Jr."`), and the full cast is kept in billing order (leads first).

```bash
export TMDB_TOKEN='<your TMDB v4 API Read Access Token>'
python3 src/generate_data_tmdb.py
```

- It reads `src/movie_ids.json` (`title -> TMDB movie id`) to know which films to
  fetch, and force-keeps every actor/film the daily puzzles in
  `game_config.json` route through.
- Responses are cached under `src/.tmdb_cache/` (git-ignored), so re-runs are
  fast and an interrupted run resumes. To refresh a single movie, delete its
  `src/.tmdb_cache/<id>.json` and re-run. Delete the whole folder for a full
  re-pull.
- The token is read from the `TMDB_TOKEN` env var only — never commit it.

### Adding new movies to the pool

`movie_ids.json` defines the universe of films. It's currently produced by the
offline step below (from the Kaggle CSV). To add a film manually, add a
`"Title": <tmdb_id>` entry and re-run the API pipeline.

## Offline fallback (no API key)

`clean_data.py` regenerates the same two files from the Kaggle
`TMDB_all_movies.csv` dump without any network access. It fixes the comma-suffix
junk and trims each film to reasonably prominent actors (those appearing in
`MIN_FILMS`+ popular films), since the flat CSV has no billing order to trim by.
It also emits `movie_ids.json` for the API pipeline above.

```bash
python3 src/clean_data.py
```

The CSV path is set at the top of the script (`CSV_PATH`).
