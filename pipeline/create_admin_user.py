from dotenv import load_dotenv
import os
from pymongo import MongoClient
import bcrypt
from pymongo.errors import DuplicateKeyError

if __name__ == "__main__":
	# Charge .env file
	load_dotenv("./.env")

	# Lire le mot de passe non hashé à partir de .env
	login = os.getenv("LOGIN")
	password = os.getenv("PASSWORD")

	# Password hash with bcrypt
	hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
	# Connect to MongoDB
	client = MongoClient(os.getenv("MONGO_URI"))

	# DB and collection
	db = client["test"]
	collection = db["users"]

	# Get the user
	user = {
		"login": login,
		"password": hashed_password.decode('utf-8'),  # Conserver le mot de passe hashé comme un string
	}

	# Insert the user in the collection
	try:
		collection.insert_one(user)
	except DuplicateKeyError as e:
		collection.update_one(
		    {"login": login},
		    {"$set": {"password": hashed_password}},
		    upsert=True
		)

	from pymongo import MongoClient

	load_dotenv("./.env")

	# Lire le mot de passe non hashé à partir de .env
	login = os.getenv("LOGIN")
	password = os.getenv("PASSWORD")

	# Password hash with bcrypt
	hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
	# Connect to MongoDB
	client = MongoClient(os.getenv("MONGO_URI"))
	db = client.test_database
	post = {
		"login": login,
		"password": hashed_password.decode('utf-8')
	}
	posts = db.posts
	posts.insert_one(post)