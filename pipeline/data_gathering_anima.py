import requests
from datetime import datetime, timedelta
from tools import get_absolute_url, get_args, load_to_mongo
from bs4 import BeautifulSoup
from data_schema import Show, Session, Festival
import logging

logging.basicConfig(level=logging.INFO)

start_date = datetime.strptime("23-02-2024", "%d-%m-%Y")
festival_duration = 10
festival_dates = [datetime.strftime(start_date + timedelta(days=i), "%d-%m-%Y")
                  for i in
                  range(festival_duration)]
default_description = "No description"
default_image_url = "/animafestival/img/base/logo-n.png"
api_url = "http://localhost:3000/api"

def main(year):
	festival = Festival(name=f"Anima{year}",
	                    year=year,
	                    start=start_date,
	                    end=start_date + timedelta(days=festival_duration))

	for i in range(len(festival_dates)):
		logging.info(f"Processing {festival_dates[i]} \n")
		base_url = "https://animafestival.be/fr/programme/grille/jour/"
		response = requests.get(get_absolute_url(base_url, festival_dates[i]))
		soup = BeautifulSoup(response.content,
		                     "html.parser")
		agenda_block = soup.find("div",
		                         class_="col-sm-8 col-md-9 col-lg-10 ml-0")
		shows = agenda_block.find_all("tr", class_=["base", "tr54"])

		for j in range(len(shows)):
			logging.info(f"Processing show {j} \n")
			title = shows[j].find("strong", class_="titre").get_text().strip()
			if festival.shows is not None:
				show_list = [show.title for show in festival.shows]
				if title not in show_list:
					show = get_show_info(shows[j], festival_dates[i],
					                     festival.name)
					festival.shows += (show,)
				else:
					start, end, start_time = get_start_end_time(shows[j],
					                                            festival_dates[
						                                            i])
					session = get_session_info(shows[j], start, end,
					                           start_time)
					festival.shows[show_list.index(title)].sessions += (
						session,)
			else:
				show = get_show_info(shows[j], festival_dates[i],
				                     festival.name)
				festival.shows = (show,)

	load_to_mongo(festival= festival, api_url= api_url)
	logging.info(festival)


def get_show_info(show_soup, date, festival):
	td_blocs = show_soup.find_all("td")
	for bloc in td_blocs:
		if "–" in bloc.get_text():
			director = bloc.get_text().split("–")[1].strip()
			break
		else:
			director = ""
	resumefilm = show_soup.find_next_sibling("tr")
	description = get_description(resumefilm)
	try:
		imageURL = resumefilm.find("img").get("src")
	except AttributeError as e:
		imageURL = default_image_url
		print("Image url not found. Here is the error message : " + str(e))
	start, end, start_time = get_start_end_time(show_soup, date)
	duration = str(int((end - start).seconds // 60))

	return Show(festival=festival,
	            title=show_soup.find("strong",
	                                 class_="titre").get_text().strip(),
	            description=description,
	            duration=duration,
	            imageURL=imageURL,
	            director=director,
	            sessions=(
		            get_session_info(show_soup, start, end, start_time),))


def get_session_info(show, start, end, start_time):
	location = show.find("span", class_=["badge", "badge-success"]).get_text()
	return Session(date=start, start=start, end=end, time=start_time,
	               location=location)


def get_start_end_time(show, date):
	start_time = show.find("td", class_="tdHeure").get_text().strip()
	end_time = show.find("span", title="Heure de fin").get_text().strip()
	start = datetime.strptime(f"{date} {start_time}", "%d-%m-%Y %H:%M")
	end = datetime.strptime(f"{date} {end_time}", "%d-%m-%Y %H:%M")
	return start, end, start_time


def get_description(soup):
	paragraphs = soup.find_all('p')

	# Filtrer pour trouver le paragraphe principal
	for p in paragraphs:
		# Vérifier si le paragraphe n'a pas de classe et ne contient pas de balise <strong>
		if not p.has_attr('class') and not p.find('strong'):
			return p.text.strip()
	return default_description


if __name__ == "__main__":
	args = get_args()
	main(args.year)
