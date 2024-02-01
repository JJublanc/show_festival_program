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

schema = {
	"properties": {
		"festival": {"type": "string"},
		"year": {"type": "string"},
		"title": {"type": "string"},
		"imageURL": {"type": "string"},
		"movieURL": {"type": "string"},
	},
	"required": ["festival", "title", "year", "imageURL"]
}

# schema = {
# 	"properties": {
# 		"title": {"type": "string"},
# 		"synopsis": {"type": "string"},
# 		"duration": {"type": "string"},
# 		"director": {"type": "string"},
# 		"imageURL": {"type": "string"},
# 	},
# 	"required": ["title", "synopsis", "duration", "director", "imageURL"]
# }


def extract(content: str, schema: dict):
	return create_extraction_chain(schema=schema, llm=llm).run(content)


# Load HTML

if __name__ == '__main__':
	loader = AsyncChromiumLoader(
		['https://festival-gerardmer.com/2024/portfolio/monsters/'])
	#['https://festival-gerardmer.com/2024/hors-competition/'])
	html = loader.load()
	html = requests.get('https://festival-gerardmer.com/2024/hors-competition/').content
	bs_transformer = BeautifulSoupTransformer()
	docs_transformed = bs_transformer.transform_documents(html,
	                                                      tags_to_extract=[
		                                                      "span",
		                                                      "a", "p"])
	# Grab the first 1000 tokens of the site
	splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
		chunk_size=1000, chunk_overlap=0
	)
	splits = splitter.split_documents(docs_transformed)

	# Process the first split
	for i in range(len(splits)):
		extracted_content = extract(schema=schema,
		                            content=splits[i].page_content)
		print(extracted_content)
# print(extract(schema=schema, content=splits[2].page_content))
