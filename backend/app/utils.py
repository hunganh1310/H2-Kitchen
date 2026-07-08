"""Small shared helpers."""
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status


def parse_object_id(value: str) -> ObjectId:
    """Parse a string into an ObjectId, raising 404 if it is malformed."""
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy")
