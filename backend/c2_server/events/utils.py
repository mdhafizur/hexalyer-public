
from datetime import datetime
from zoneinfo import ZoneInfo

def current_utc_time():
    """Get the current UTC time as a timezone-aware datetime."""
    return datetime.now(ZoneInfo("UTC"))
