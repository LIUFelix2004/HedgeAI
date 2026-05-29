import time
import uuid


_audit_events = []


def new_audit_id(prefix="exec"):
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def record_audit_event(event):
    payload = {
        "ts": time.time(),
        **_sanitize(event),
    }
    _audit_events.append(payload)
    return payload


def list_audit_events():
    return list(_audit_events)


def clear_audit_events():
    _audit_events.clear()


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
