from urllib.parse import urljoin
import argparse
import requests
from data_schema import Festival


def get_absolute_url(base_url: str, relative_url: str) -> str:
	# Combine the base URL with the relative URL to get the absolute URL
	return urljoin(base_url, relative_url)


def get_args() -> argparse.Namespace:
	parser = argparse.ArgumentParser(
		description="Scrap the Etrange Festival website to get the schedule"
	)
	parser.add_argument(
		"-y",
		"--year",
		type=str,
		help="Year of the festival",
	)
	return parser.parse_args()


def load_to_mongo(festival: Festival, api_url: str) -> None:
	# Send the festival data to the API
	requests.post(get_absolute_url(api_url, "/festivals"),
	              json={"name": festival.name,
	                    "start": str(festival.start),
	                    "end": str(festival.end),
	                    })

	for show in festival.shows:
		show_dict = {"festival": show.festival,
		             "title": show.title,
		             "description": show.description,
		             "duration": show.duration,
		             "imageURL": show.imageURL,
		             "director": show.director,
		             "sessions": []}
		for session in show.sessions:
			show_dict["sessions"].append(
				{"date": str(session.date),
				 "location": session.location,
				 "start": str(session.start),
				 "end": str(session.end)}
			)
		requests.post(get_absolute_url(api_url, "/shows")
		              , json=show_dict)
	return None
