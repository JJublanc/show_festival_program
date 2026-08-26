import argparse
import json
import logging
import os
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Tuple
from urllib.parse import urljoin

import pandas as pd
import requests
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO)

API_DB_ROUTE = "http://localhost:5001/api/shows"
DEFAULT_EXPORT_DIR = Path(__file__).resolve().parents[1] / "frontend" / "src" / "data"

def main(year: int, export_json_dir: Path = None, post_api: bool = True) -> None:
	tags_by_url = build_tags_by_url(year)
	logging.info(f"Tags map built for {len(tags_by_url)} films")
	shows_by_url: dict = {}
	festival_name = f"EtrangeFestival{year}"

	for n in range(2, 14):
		target_url = (
			f"https://www.etrangefestival.com/{year}/fr/schedule/09-{str(n).zfill(2)}"
		)
		target_div_class = "schedule_grid item-grid"

		try:
			urls_in_target_div = get_urls_from_div(target_url, target_div_class)
			session_urls = [
				url for url in urls_in_target_div
				if url != target_url and "etrangefestival.com" in url
			]
		except Exception as e:
			logging.info(f"Pas de programmation pour le 09-{str(n).zfill(2)} : {e}")
			continue

		for url in session_urls:
			logging.info(f"Getting info from {url}")
			try:
				(
					title,
					duration,
					session_practical_info,
					img_url,
					description,
					description_extra,
					director,
					country,
				) = get_info_from_session_url(url)
			except Exception as e:
				logging.warning(f"Extraction impossible pour {url} : {e}")
				continue
			show = {
				"festival": festival_name,
				"title": title,
				"description": description,
				"descriptionExtra": description_extra,
				"duration": duration,
				"country": country,
				"imageURL": img_url,
				"officialUrl": url,
				"tags": tags_by_url.get(url, []),
			}
			sessions = []
			for date, info in session_practical_info.items():
				startdate, enddate = get_start_end_date(date, year, info["time"],
				                                        duration)
				sessions.append({"_id": stable_id(url, date, info["time"]),
				                 "date": date,
				                 "location": info["location"],
				                 "start": startdate,
				                 "end": enddate,
				                 "time": info["time"]})
			show["sessions"] = sessions

			if post_api:
				try:
					res = requests.post(API_DB_ROUTE, json=show)
					logging.info(res.status_code)
				except Exception as e:
					logging.warning(f"POST API échoué : {e}")

			if export_json_dir is not None and url not in shows_by_url:
				exported = dict(show)
				exported["_id"] = stable_id(url)
				shows_by_url[url] = exported

	if export_json_dir is not None:
		export_json_dir.mkdir(parents=True, exist_ok=True)
		shows_path = export_json_dir / f"{festival_name}.json"
		shows_for_export = list(shows_by_url.values())
		shows_path.write_text(
			json.dumps(shows_for_export, ensure_ascii=False, indent=2),
			encoding="utf-8",
		)
		logging.info(f"Exported {len(shows_for_export)} shows to {shows_path}")

		festivals_path = export_json_dir / "festivals.json"
		if festivals_path.exists():
			festivals = json.loads(festivals_path.read_text(encoding="utf-8"))
		else:
			festivals = []
		festivals = [f for f in festivals if f.get("name") != festival_name]
		festivals.append({
			"name": festival_name,
			"start": f"{year}-09-01T22:00:00.000Z",
			"end": f"{year}-09-17T21:59:59.000Z",
		})
		festivals.sort(key=lambda f: f.get("start", ""), reverse=True)
		festivals_path.write_text(
			json.dumps(festivals, ensure_ascii=False, indent=2),
			encoding="utf-8",
		)
		logging.info(f"Updated festivals index at {festivals_path}")


def stable_id(*parts: str) -> str:
	"""Genere un identifiant stable base sur les composantes (URL, date, heure)."""
	seed = "|".join(parts)
	return uuid.uuid5(uuid.NAMESPACE_URL, seed).hex


def build_tags_by_url(year: int) -> dict:
	"""Parcourt /program et chaque sous-programme pour associer les films aux sous-programmes."""
	program_url = f"https://www.etrangefestival.com/{year}/fr/program"
	tags_by_url: dict = {}
	try:
		resp = requests.get(program_url)
		resp.raise_for_status()
	except Exception as e:
		logging.warning(f"Impossible de charger la page /program : {e}")
		return tags_by_url

	soup = BeautifulSoup(resp.content, "html.parser")
	subprogram_urls: list = []
	for h3 in soup.find_all("h3"):
		grid = h3.find_next_sibling("div", class_="item-grid")
		if not grid:
			continue
		for a in grid.find_all("a", href=True):
			subprogram_urls.append(get_absolute_url(program_url, a["href"]))

	for sp_url in subprogram_urls:
		try:
			sp_resp = requests.get(sp_url)
			sp_resp.raise_for_status()
		except Exception as e:
			logging.warning(f"Sous-programme illisible ({sp_url}) : {e}")
			continue
		sp_soup = BeautifulSoup(sp_resp.content, "html.parser")
		title_el = sp_soup.find("h2")
		sp_name = title_el.get_text(strip=True) if title_el else sp_url.rsplit("/", 1)[-1]
		for a in sp_soup.find_all("a", href=True):
			href = a["href"]
			if "/movie/" not in href and "/show/" not in href:
				continue
			film_url = get_absolute_url(sp_url, href)
			tags_by_url.setdefault(film_url, [])
			if sp_name not in tags_by_url[film_url]:
				tags_by_url[film_url].append(sp_name)
	return tags_by_url


def get_args() -> argparse.Namespace:
	parser = argparse.ArgumentParser(
		description="Scrap the Etrange Festival website to get the schedule"
	)
	parser.add_argument(
		"-y",
		"--year",
		type=str,
		default="2022",
		help="Year of the festival",
	)
	parser.add_argument(
		"--export-json",
		nargs="?",
		const=str(DEFAULT_EXPORT_DIR),
		default=None,
		help=(
			"Écrit les shows au format JSON dans le dossier indiqué "
			f"(par défaut : {DEFAULT_EXPORT_DIR}). Utile pour un déploiement statique."
		),
	)
	parser.add_argument(
		"--no-api",
		action="store_true",
		help="Ne pas POSTer sur l'API locale (utile en mode export JSON seul).",
	)
	return parser.parse_args()

def get_absolute_url(base_url: str, relative_url: str) -> str:
	# Combine the base URL with the relative URL to get the absolute URL
	return urljoin(base_url, relative_url)


def get_urls_from_div(url: str, div_class: str) -> list:
	response = requests.get(url)
	response.raise_for_status()  # Check if the request was successful
	soup = BeautifulSoup(response.content,
	                     "html.parser")  # Parse the HTML content
	div_elements = soup.find_all("div", class_=div_class)
	urls = []

	for div in div_elements:
		anchor_elements = div.find_all("a")  # Find all anchor elements
		for anchor in anchor_elements:
			relative_url = anchor.get("href")  # Get the 'href' attribute
			if relative_url:
				absolute_url = get_absolute_url(url, relative_url)
				urls.append(absolute_url)
	return urls


def get_info_from_session_url(url: str) -> Tuple[
	str, int, dict, str, str, str, str, str]:
	response = requests.get(url)
	response.raise_for_status()

	soup = BeautifulSoup(response.content, "html.parser")

	title = get_title(soup)
	duration = get_duration(soup)
	absolute_image_url = get_absolute_image_url(soup, url)
	session_practical_info = get_session_practical_info(soup)
	description, description_extra = get_descriptions(soup)
	director = get_director(soup)
	country = get_country(soup)
	return (
		title,
		duration,
		session_practical_info,
		absolute_image_url,
		description,
		description_extra,
		director,
		country,
	)


def get_title(soup: BeautifulSoup) -> str:
	title_element = soup.find("h2", class_="content_details_title")
	if title_element:
		title = title_element.get_text().strip()
	else:
		title = ""
	return title


def get_duration(soup: BeautifulSoup) -> int:
	duration = 0
	ul_elements = soup.find_all("ul",
	                            class_="list-unstyled details_movie_basic")
	for ul_element in ul_elements:
		duration_elements = ul_element.find_all("li")
		if duration_elements:
			for duration_element in duration_elements:
				duration += convert_duration_to_minutes(duration_element.text)
	return duration


def get_absolute_image_url(soup: BeautifulSoup, url: str) -> str:
	absolute_image_url = ""
	container = soup.find("div", class_="details_main_picture")
	if not container:
		return absolute_image_url
	img_element = container.find("img")
	if img_element:
		image_url = img_element.get("src")
		if image_url:
			absolute_image_url = get_absolute_url(url, image_url)
	return absolute_image_url


def get_session_practical_info(soup: BeautifulSoup) -> dict:
	session = {}
	details_elements = soup.find_all("p")
	for details_element in details_elements:
		# Get the text of the paragraph
		paragraph_text = details_element.get_text().strip()
		# Extract date, time, and location from the paragraph text
		date, time, location = extract_date_time_location(paragraph_text)
		if date:
			session[date] = {"time": time, "location": location}
	return session


def get_descriptions(soup: BeautifulSoup) -> Tuple[str, str]:
	description = ""
	descriptions = soup.find_all("div", class_="movie_details_description")
	if descriptions:
		description = ". ".join(
			[description.get_text() for description in descriptions]
		).strip()
	else:
		descriptions = soup.find_all("div",
		                             class_="program_details_description")
		if descriptions:
			description = ". ".join(
				[description.get_text() for description in descriptions]
			).strip()

	description_extra = ""
	descriptions_extra = soup.find_all("div", class_="movie_details_extra")
	if descriptions_extra:
		description_extra = ". ".join(
			[description.get_text() for description in descriptions_extra]
		).strip()
	else:
		descriptions_extra = soup.find_all("div",
		                                   class_="program_details_extra")
		if descriptions_extra:
			description_extra = ". ".join(
				[description.get_text() for description in descriptions_extra]
			).strip()
	return description, description_extra


def get_country(soup: BeautifulSoup) -> str:
	"""Extrait le pays depuis la liste des details du film (annee, pays, genre, duree, ...)."""
	ignore_patterns = [
		re.compile(r"^\d{4}$"),                       # annee (ex: 1991)
		re.compile(r"\d+h\d*mn?", re.IGNORECASE),     # duree (1h49mn, 45mn)
		re.compile(r"^\d+mn$", re.IGNORECASE),        # duree courte
		re.compile(r"^VOST", re.IGNORECASE),          # version
		re.compile(r"^VO$", re.IGNORECASE),
		re.compile(r"^VF$", re.IGNORECASE),
		re.compile(r"couleurs?", re.IGNORECASE),      # couleurs
		re.compile(r"noir\s*(et|&)\s*blanc", re.IGNORECASE),
		re.compile(r"^N&B$", re.IGNORECASE),
	]

	def is_country_candidate(text: str) -> bool:
		if not text:
			return False
		if any(p.search(text) for p in ignore_patterns):
			return False
		if "/" in text:  # les genres contiennent souvent un slash
			return False
		return True

	for ul in soup.find_all("ul", class_="list-unstyled details_movie_basic"):
		items = [li.get_text(" ", strip=True) for li in ul.find_all("li")]
		# Premier candidat qui ressemble a un pays (typiquement en 2e position apres l'annee)
		for text in items:
			if is_country_candidate(text):
				return text
	return ""


def get_director(soup: BeautifulSoup) -> str:
	director = ""
	directors = soup.find_all("div", class_="director_detail")
	if directors:
		director = ". ".join(
			[director.get_text() for director in directors]).strip()
	else:
		directors = soup.find_all("h4", class_="director_detail")
		if directors:
			director = ". ".join(
				[director.get_text() for director in directors]
			).strip()
	return director


def convert_duration_to_minutes(duration_text: str) -> int:
	duration_text = duration_text.lower()

	# Define regular expressions for matching hours and minutes
	hour_regex = r"(\d+)h"
	minute_regex = r"(\d+)m"

	# Initialize variables for hours and minutes
	hours = 0
	minutes = 0

	# Find hours in the duration text
	hour_match = re.search(hour_regex, duration_text)
	if hour_match:
		hours = int(hour_match.group(1))

	# Find minutes in the duration text
	minute_match = re.search(minute_regex, duration_text)
	if minute_match:
		minutes = int(minute_match.group(1))

	# Calculate the total duration in minutes
	total_minutes = hours * 60 + minutes

	return total_minutes


def extract_date_time_location(text: str) -> Tuple[str, str, str]:
	# Define regular expressions for matching date, time, and location
	date_regex = r"(\d{2}/\d{2})"
	time_regex = r"(\d{2}h\d{2})"
	location_regex = r"Salle \d+"

	# Initialize variables for date, time, and location
	date = None
	time = None
	location = None

	# Find date in the text
	date_match = re.search(date_regex, text)
	if date_match:
		date = date_match.group(1)

	# Find time in the text
	time_match = re.search(time_regex, text)
	if time_match:
		time = time_match.group(1)

	# Find location in the text
	location_match = re.search(location_regex, text)
	if location_match:
		location = location_match.group()

	return date, time, location


def get_start_end_date(date: str,
                       current_year: int,
                       time: str,
                       duration: int,
                       ) -> tuple:
	startdate = pd.to_datetime(
		date
		+ "/"
		+ str(current_year)
		+ " "
		+ time.replace("h", ":"),
		dayfirst=True,
	)
	enddate = startdate + pd.to_timedelta(
		duration, unit="m"
	)
	return startdate.strftime("%Y-%m-%dT%H:%M:%S"), enddate.strftime("%Y-%m-%dT%H:%M:%S")


# Example usage
if __name__ == "__main__":
	args = get_args()
	export_dir = Path(args.export_json) if args.export_json else None
	post_api = not args.no_api
	main(args.year, export_json_dir=export_dir, post_api=post_api)