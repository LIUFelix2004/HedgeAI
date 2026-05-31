import time
import uuid

from services import sqlite_service


def new_audit_id(prefix="exec"):
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def record_audit_event(event):
    payload = {
        "ts": time.time(),
        **_sanitize(event),
    }
    sqlite_service.append_audit_event(payload)
    return payload


def list_audit_events(limit=100):
    return sqlite_service.list_audit_events(limit=limit)


def clear_audit_events():
    sqlite_service.clear_audit_events()


def _sanitize(value):
    if isinstance(value, dict):
        sanitized = {}
        for key, item in value.items():
            if key.lower() in {"privatekey", "apikey", "apisecret", "secret", "token"}:
                sanitized[key] = "[redacted]"
            else:
                sanitized[key] = _sanitize(item)
        return sanitized
    if isinstance(value, list):
        return [_sanitize(item) for item in value]
    return value
