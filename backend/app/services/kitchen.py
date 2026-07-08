"""Kitchen status persistence — a single document in ``kitchen_status``.

Uses a fixed string ``_id`` so there is exactly one status record. Defaults to
open when the record doesn't exist yet.
"""
from datetime import datetime, timezone

_QUERY = {"_id": "kitchen"}


async def get_kitchen_status(db) -> dict:
    doc = await db.kitchen_status.find_one(_QUERY)
    if not doc:
        doc = {
            "_id": "kitchen",
            "is_open": True,
            "updated_at": datetime.now(timezone.utc),
            "updated_by": None,
        }
        await db.kitchen_status.insert_one(doc)
    return doc


async def is_kitchen_open(db) -> bool:
    return bool((await get_kitchen_status(db)).get("is_open", True))


async def set_kitchen_status(db, is_open: bool, updated_by: str | None) -> dict:
    await db.kitchen_status.update_one(
        _QUERY,
        {
            "$set": {
                "is_open": is_open,
                "updated_at": datetime.now(timezone.utc),
                "updated_by": updated_by,
            }
        },
        upsert=True,
    )
    return await get_kitchen_status(db)
