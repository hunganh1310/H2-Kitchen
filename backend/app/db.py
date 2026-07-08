"""MongoDB connection management (Motor async driver).

The app talks to a real MongoDB via ``MONGODB_URI``. For local development
without a MongoDB install, set ``USE_MOCK_DB=true`` to use an in-memory
mongomock-motor client that mimics the same async API.
"""
from __future__ import annotations

from .core.config import settings


class _DBState:
    client = None
    db = None


_state = _DBState()


def _create_client():
    if settings.use_mock_db:
        # Local dev only — in-memory, non-persistent.
        from mongomock_motor import AsyncMongoMockClient

        return AsyncMongoMockClient()
    from motor.motor_asyncio import AsyncIOMotorClient

    return AsyncIOMotorClient(settings.mongodb_uri)


async def connect_to_mongo() -> None:
    _state.client = _create_client()
    _state.db = _state.client[settings.mongodb_db_name]


async def close_mongo_connection() -> None:
    if _state.client is not None:
        try:
            _state.client.close()
        except Exception:
            pass
        _state.client = None
        _state.db = None


def get_db():
    """Return the active database handle. Call after ``connect_to_mongo``."""
    if _state.db is None:
        raise RuntimeError("Database not initialised. Call connect_to_mongo() first.")
    return _state.db
