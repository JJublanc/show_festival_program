from urllib.parse import urljoin
import argparse
import requests
from data_schema import Festival
import logging
import os
import dotenv
import bcrypt
import json
import string
import secrets

dotenv.load_dotenv()

def generate_random_password():
    alphabet = string.ascii_letters + string.digits
    password = ''.join(secrets.choice(alphabet) for i in range(20))
    return password

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
	requests.post(get_absolute_url(api_url, "api/festivals"),
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
				 "end": str(session.end),
				 "time": str(session.time)}
			)
		response = requests.post(get_absolute_url(api_url,
		                                          "api/shows"),
		                        headers=get_headers(),
		                        json=show_dict)
		logging.info(f"Status code: {response.status_code}")
		logging.info(f"Data sent to the API, message : {response.content}")
	return None


def get_token():
	url = get_absolute_url(os.getenv("BACKEND_URL"), "/api/login/login")
	login = os.getenv("LOGIN")
	password = os.getenv("PASSWORD")
	# Define the data for the POST request
	data = {
		'email': login,
		'password': password
	}
	# Send the POST request

	# Convertir les données en JSON
	json_data = json.dumps(data)

	# Envoyer la requête POST avec les données JSON
	response = requests.post(url, data=json_data,
	                         headers={'Content-Type': 'application/json'})
	# If the request was successful (status code 200), return the token
	if response.status_code == 200:
		return response.json()['token']
	# If the request was not successful, raise an exception
	else:
		raise Exception(f"Failed to get token: {response.text}")

def get_headers():
	token = get_token()
	# Define the headers for the GET request
	return {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}
def check_token(entered_password, stored_hashed_password):
	# Define the headers for the GET request
	if bcrypt.checkpw(entered_password.encode('utf-8'),
	                  stored_hashed_password):
		print("Le mot de passe est correct")
	else:
		print("Le mot de passe est incorrect")

if __name__ == "__main__":
	token = get_token()
	print(token)
