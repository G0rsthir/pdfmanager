from pydantic import BaseModel


class KoreaderProgress(BaseModel):
    document: str
    device_id: str
    device: str
    percentage: float
    progress: str


class KoreaderProgressResponse(KoreaderProgress):
    timestamp: int


class KoreaderProgressResult(BaseModel):
    document: str
    timestamp: int
