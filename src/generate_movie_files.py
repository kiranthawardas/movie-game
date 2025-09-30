import csv
import json
import ast

movies_file_path = (
    "/Users/kiranthawardas/Documents/movie-game/src/movies_metadata_2.csv"
)
cast_file_path = "/Users/kiranthawardas/Documents/movie-game/src/credits_2.csv"

# Movie ID -> Movie Title
movie_id_to_movie_title = {}

# Movie Title -> {Release Year, Movie ID}
movie_title_to_release_year_and_id = {}

with open(movies_file_path, mode="r", newline="") as file:
    csv_dict_reader = csv.DictReader(file)
    for movie in csv_dict_reader:
        movie_id = str(movie["id"])
        movie_title = movie["title"]
        movie_release_year = movie["release_date"][0:4]

        if movie_title in movie_title_to_release_year_and_id.keys():
            previous_movie_title_to_release_year_and_id = movie_title_to_release_year_and_id[movie_title]
            movie_id_to_movie_title.pop(previous_movie_title_to_release_year_and_id["movie_id"])

            adjusted_previous_movie_title = (movie_title) + " (" + previous_movie_title_to_release_year_and_id["release_year"] + ")"
            movie_id_to_movie_title[previous_movie_title_to_release_year_and_id["movie_id"]] = adjusted_previous_movie_title

            adjusted_current_movie_title = (movie_title) + " (" + movie_release_year + ")"
            movie_id_to_movie_title[movie_id] = adjusted_current_movie_title

        else:
            movie_title_to_release_year_and_id[movie_title] = {
                "movie_id": movie_id,
                "release_year": movie_release_year
            }
            movie_id_to_movie_title[movie_id] = movie_title


actor_id_to_actor_name = {}
movie_to_cast = {}
actor_to_filmography = {}

with open(cast_file_path, mode="r", newline="") as file:
    csv_dict_reader = csv.DictReader(file)
    for movie in csv_dict_reader:
        movie_id = str(movie["id"])
        cast = ast.literal_eval(movie["cast"])
        movie_title = movie_id_to_movie_title[movie_id]
        for actor in cast:
            actor_name = actor["name"]
            actor_id = actor["id"]

            if not movie_title in movie_to_cast:
                movie_to_cast[movie_title] = set()
            
            movie_to_cast[movie_title].add(actor_name)

            if not actor_name in actor_to_filmography:
                actor_to_filmography[actor_name] = set()
            
            actor_to_filmography[actor_name].add(movie_title)

class SetEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, set):
            return sorted(list(obj))
        return json.JSONEncoder.default(self, obj)
    
with open("actor_filmographies.json", "w") as file:
    json.dump(actor_to_filmography, file, indent=4, ensure_ascii=False, cls=SetEncoder)
with open("movie_casts.json", "w") as file:
    json.dump(movie_to_cast, file, indent=4, ensure_ascii=False, cls=SetEncoder)
