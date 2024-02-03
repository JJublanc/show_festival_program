from datetime import datetime
from typing import Tuple, Optional
from pydantic import BaseModel


class Session(BaseModel):
	date: datetime
	start: datetime
	end: datetime
	time: str
	location: str


class Show(BaseModel):
	festival: str
	title: str
	description: str
	duration: str
	imageURL: str
	director: str
	sessions: Tuple[Session]


class Festival(BaseModel):
	name: str
	year: int
	start: datetime
	end: datetime
	shows: Tuple[Show]=None
