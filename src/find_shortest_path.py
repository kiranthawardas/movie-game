import json
from collections import deque
import sys
import random

actor_filmographies_path = (
    "/Users/kiranthawardas/Documents/movie-game/src/actor_filmographies.json"
)
movie_casts_path = (
    "/Users/kiranthawardas/Documents/movie-game/src/movie_casts.json"
)
actor_list_path = (
    "/Users/kiranthawardas/Documents/movie-game/src/actor_list.json"
)

from collections import deque

def find_actor_path(start_actor, end_actor, filmographies, casts):
    """
    Find the shortest path between two actors through shared movies.
    
    Args:
        start_actor: Starting actor name
        end_actor: Target actor name
        filmographies: Dict mapping actor -> list of movies
        casts: Dict mapping movie -> list of actors
    
    Returns:
        List of dicts with 'movie_name' and 'costar', or None if no path exists
    """
    if start_actor == end_actor:
        return []
    
    if start_actor not in filmographies:
        return None
    
    # BFS setup
    queue = deque([(start_actor, [])])  # (current_actor, path_so_far)
    visited = {start_actor}
    
    while queue:
        current_actor, path = queue.popleft()
        
        # Get all movies this actor was in
        if current_actor not in filmographies:
            continue
            
        for movie in filmographies[current_actor]:
            # Get all costars from this movie
            if movie not in casts:
                continue
                
            for costar in casts[movie]:
                if costar == current_actor:
                    continue
                
                # Found the target!
                if costar == end_actor:
                    return path + [{"film": movie, "costar": costar}]
                
                # Not visited yet, add to queue
                if costar not in visited:
                    visited.add(costar)
                    new_path = path + [{"film": movie, "costar": costar}]
                    queue.append((costar, new_path))
    
    return None  # No path found


with open(actor_filmographies_path, mode="r", newline="") as file:
    filmographies = json.load(file)

with open(movie_casts_path, mode="r", newline="") as file:
    casts = json.load(file)

with open(actor_list_path, mode="r", newline="") as file:
    actor_list = json.load(file)

actor_1 = random.choice(actor_list)
actor_2 = random.choice(actor_list)

result = find_actor_path(actor_1, actor_2, filmographies, casts)

output = {
    "day": 1,
    "date": "2026-01-10",
    "startingActor": actor_1,
    "endingActor": actor_2,
    "idealPath": result
}
json.dump(output, sys.stdout, indent=4) 
# Marilyn Monroe, Timothée Chalamet
# [{'film': 'All About Eve', 'costar': 'Ann Robinson'}, {'film': 'War of the Worlds (2005)', 'costar': 'Amy Ryan'}, {'film': 'Beautiful Boy', 'costar': 'Timothée Chalamet'}]

# Pierce Brosnan, Ellie Kemper
# [{'film': 'After the Sunset', 'costar': 'Jeff Garlin'}, {'film': 'Laggies', 'costar': 'Ellie Kemper'}]

# Austin Butler, Harrison Ford
# [{'film': 'Caught Stealing', 'costar': 'Griffin Dunne'}, {'film': 'Joan Didion: The Center Will Not Hold', 'costar': 'Harrison Ford'}]

# Audrey Hepburn, Anil Kapoor
# [{'film': 'Always (1989)', 'costar': 'Brad Johnson'}, {'film': 'Flight of the Intruder', 'costar': 'Ving Rhames'}, {'film': 'Mission: Impossible - Ghost Protocol', 'costar': 'Anil Kapoor'}]