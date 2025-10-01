import csv
import json
import ast

movies_file_path = (
    "/Users/kiranthawardas/Documents/movie-game/src/TMDB_all_movies.csv"
)

# Movie ID -> Movie Title
movie_id_to_movie_title = {}

# Movie Title -> {Release Year, Movie ID}
movie_title_to_release_year_and_id = {}

movie_to_cast = {}
actor_to_filmography = {}

with open(movies_file_path, mode="r", newline="") as file:
    csv_dict_reader = csv.DictReader(file)
    for movie in csv_dict_reader:
        if (movie["status"] != "Released" or float(movie["vote_count"]) < 50):
            continue
        movie_title = movie["title"]
        movie_release_year = movie["release_date"][0:4]
        cast = movie["cast"].split(',')
        normalized_cast = [s.strip() for s in cast]


        if movie_title in movie_to_cast.keys():
            previous_movie_to_cast = movie_to_cast.pop(movie_title)

            adjusted_previous_movie_title = (movie_title) + " (" + previous_movie_to_cast["release_year"] + ")"
            movie_to_cast[adjusted_previous_movie_title] = previous_movie_to_cast

            movie_to_cast[movie_title] = {"cast": normalized_cast, "release_year": movie_release_year}
        else:
            movie_to_cast[movie_title] = {"cast": normalized_cast, "release_year": movie_release_year}

for movie in movie_to_cast.keys():
    for actor in movie_to_cast[movie]["cast"]:
        if not actor in actor_to_filmography:
            actor_to_filmography[actor] = set()
        actor_to_filmography[actor].add(movie)

for movie in movie_to_cast.keys():
    movie_to_cast[movie] = set(movie_to_cast[movie]["cast"])

class SetEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, set):
            return sorted(list(obj))
        return json.JSONEncoder.default(self, obj)

print(movie_to_cast["Top Gun"])
print(actor_to_filmography["Tom Cruise"])
    
with open("actor_filmographies.json", "w") as file:
    json.dump(actor_to_filmography, file, indent=4, ensure_ascii=False, cls=SetEncoder)
with open("movie_casts.json", "w") as file:
    json.dump(movie_to_cast, file, indent=4, ensure_ascii=False, cls=SetEncoder)
