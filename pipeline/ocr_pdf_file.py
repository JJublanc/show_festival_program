import platform
from tempfile import TemporaryDirectory
from pathlib import Path

import pytesseract
from pdf2image import convert_from_path
from PIL import Image
from data_gathering_gerarme_2024_llm import extract

import os

def clean_results(results):
	# Remove empty results
	results = [result for result in results if result['title'] != '' and result['duration'] != '' and result['date'] != '']
	# Remove duplicates
	len(results)
	results = list(set(results))
	return results

if __name__ == '__main__':
	os.listdir()
	PDF_file = "./gerardmer2024_agenda.pdf"
	pdf_pages = convert_from_path(PDF_file, 500)

	for page_enumeration, page in enumerate(pdf_pages, start=1):
		filename = f"./gerardmer2024_agenda_{page_enumeration}.jpg"
		page.save(filename, "JPEG")

	image = Image.open(filename)
	semi_width = image.size[0] // 2

	image_up_left = image.crop((0, int(image.size[1] // 3.5), semi_width, int(image.size[1] // 1.6)))
	image_up_right = image.crop((semi_width, int(image.size[1] // 3.5), image.size[0], int(image.size[1] // 1.6)))
	image_down_left = image.crop((0, int(image.size[1] // 1.6), semi_width, image.size[1]))
	image_down_right = image.crop((semi_width, int(image.size[1] // 1.6), image.size[0], image.size[1]))
	image_up = image.crop((0, 0, image.size[0], int(image.size[1] // 3.5)))

	image_up_left.save(filename.replace(".jpg", "_up_left.jpg"))
	image_up_right.save(filename.replace(".jpg", "_up_right.jpg"))
	image_down_left.save(filename.replace(".jpg", "_down_left.jpg"))
	image_down_right.save(filename.replace(".jpg", "_down_right.jpg"))
	image_up.save(filename.replace(".jpg", "_up.jpg"))

	text_up_left = str(pytesseract.image_to_string(image_up_left))
	text_up_right = str(pytesseract.image_to_string(image_up_right))
	text_down_left = str(pytesseract.image_to_string(image_down_left))
	text_down_right = str(pytesseract.image_to_string(image_down_right))
	text_up = str(pytesseract.image_to_string(image_up))

	schema = {
		"properties": {
			"title": {"type": "string"},
			"duration": {"type": "string"},
			"date": {"type": "string"},
			"heure": {"type": "string"},
			"location": {"type": "string"},
		},
		"required": ["title", "duration", "date", "heure", "location"]
	}


	result_up_left = extract(text_up_left, schema)
	result_up_right = extract(text_up_right, schema)
	result_down_left = extract(text_down_left, schema)
	result_down_right = extract(text_down_right, schema)
	result_up = extract(text_up, schema)

	results = result_up + result_up_left + result_up_right + result_down_left + result_down_right
	print(results)

