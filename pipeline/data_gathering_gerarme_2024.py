from langchain_community.document_loaders import AsyncChromiumLoader
from bs4 import BeautifulSoup
import re
import requests
import PyPDF2
import os

import requests
from langchain.chains import create_extraction_chain
from langchain_openai import ChatOpenAI
from langchain_community.document_loaders import AsyncChromiumLoader
from langchain_community.document_transformers import BeautifulSoupTransformer
from langchain.text_splitter import RecursiveCharacterTextSplitter
from bs4 import BeautifulSoup
import dotenv
import os

dotenv.load_dotenv(".env")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

llm = ChatOpenAI(openai_api_key=OPENAI_API_KEY,
                 temperature=0,
                 model="gpt-3.5-turbo-0613")

os.listdir()
FESTIVAL_GERARDMER_URL = "https://festival-gerardmer.com/2024/"


def get_asynchronous_soup(urls: list):
	loader = AsyncChromiumLoader(urls)
	html = loader.load()
	# Analyser le contenu avec BeautifulSoup
	soup = BeautifulSoup(html[0].page_content, 'html.parser')
	return soup


def get_movie_categories():
	menu_ids = [247, 466, 895, 722, 718, 720, 721, 726, 727, 724]
	soup = get_asynchronous_soup([FESTIVAL_GERARDMER_URL])
	# Rechercher les éléments spécifiques
	movies_category = []
	for menu_id in menu_ids:
		item = soup.find(id=f"menu-item-{menu_id}")
		if not item:
			continue
		else:
			url = item.find('a')['href']
			category = item.find('a').text.strip()
			movies_category.append({
				"movie_category": category,
				"movie_category_url": url
			})
	return movies_category


schema = {
	"properties": {
		"title": {"type": "string"},
		"duration": {"type": "string"},
		"date": {"type": "string"},
		"location": {"type": "string"},
	},
	"required": ["title", "duration", "location"]
}


def read_agenda_pdf():
	# Ouvrir un fichier PDF en mode lecture binaire
	with (open('./gerardmer2024_agenda_readable.pdf', 'rb') as file):
		reader = PyPDF2.PdfReader(file)

		# Lire chaque page
		print(len(reader.pages))
		result = ''
		for page_num in range(len(reader.pages)):
			page = reader.pages[page_num]
			result += page.extract_text()
		return result


def read_agenda_txt():
	# Ouvrir un fichier PDF en mode lecture binaire
	with (open('./gerardmer2024_agenda_2024_readable.txt', 'r',
	           encoding="utf-8") as f):
		content = f.read()
		return content


def extract(content: str, schema: dict):
	return (create_extraction_chain(schema=schema, llm=llm).run(content, handle_parsing_errors=True))


def main():
	festival_shows = []
	movie_categories = get_movie_categories()
	url = "https://festival-gerardmer.com/2024/hommage-a-gareth-edwards/"

	soup = get_asynchronous_soup([url])

	items = soup.find_all('div', class_='work-item style-2')
	for item in items:
		movie_url = item.find('a')['href']
		movie_image_url = item.find('img')['src']
		movie_title = item.find('h3').text.strip()
		show = {
			"movie_title": movie_title,
			"movie_url": movie_url,
			"movie_image_url": movie_image_url
		}
		festival_shows.append(show)

	movies_urls = [item.find('a')['href'] for item in items]
	for show in festival_shows:
		movie_url = show['movie_url']

		content = requests.get(movie_url).content
		soup = BeautifulSoup(content, 'html.parser')

		# Durée
		info_block = soup.find_all('div',
		                           class_='vc_col-sm-6 wpb_column column_container vc_column_container col child_column no-extra-padding inherit_tablet inherit_phone')
		duration_pattern = re.compile(r'\d+h\d+')
		if info_block:
			show["duration"] = duration_pattern.findall(
				info_block[0].get_text())
			if not show["duration"]:
				print("Durée non trouvée")
		else:
			print("Bloc spécifique non trouvé")

		# Réalisateur
		for p in soup.find_all('p'):
			if 'Réalisateur' in p.get_text():
				show["director"] = p.get_text().split('|')[-1].strip()
				break
		else:
			print("Réalisateur non trouvé")

		# Synopsis
		synopsis_block = soup.find_all('div', class_=["wpb_text_column ",
		                                              "wpb_content_element",
		                                              "vc_custom_1702378072146"])

		if synopsis_block:
			show["description"] = synopsis_block[0].find('p').text.strip()


if __name__ == '__main__':
	content = read_agenda_txt()
	len(content.strip())
	str(content.strip())
	extracted = extract(str(content).strip(), schema)
	print(extracted)
