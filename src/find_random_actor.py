import json
import random

actor_filmographies_path = (
    "/Users/kiranthawardas/Documents/movie-game/src/actor_filmographies.json"
)
movie_casts_path = (
    "/Users/kiranthawardas/Documents/movie-game/src/movie_casts.json"
)

from collections import deque

with open(actor_filmographies_path, mode="r", newline="") as file:
    filmographies = json.load(file)

while True:
    index = random.randint(0, len(filmographies.keys()))
    if len(filmographies[list(filmographies.keys())[index]]) > 20:
        print(list(filmographies.keys())[index])
        break