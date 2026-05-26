from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException

from .config import settings


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 210_000)
    return f"pbkdf2_sha256${_b64e(salt)}${_b64e(digest)}"


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        algorithm, salt_b64, digest_b64 = password_hash.split("$", 2)
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    salt = _b64d(salt_b64)
    expected = _b64d(digest_b64)
    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 210_000)
    return secrets.compare_digest(actual, expected)


def create_access_token(subject: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.auth_token_expire_minutes)).timestamp()),
    }
    header = {"alg": "HS256", "typ": "JWT"}
    signing_input = f"{_json_b64(header)}.{_json_b64(payload)}"
    signature = hmac.new(
        settings.auth_secret_key.encode("utf-8"),
        signing_input.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return f"{signing_input}.{_b64e(signature)}"


def decode_access_token(token: str) -> str:
    try:
        header_b64, payload_b64, signature_b64 = token.split(".", 2)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")

    signing_input = f"{header_b64}.{payload_b64}"
    expected = hmac.new(
        settings.auth_secret_key.encode("utf-8"),
        signing_input.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    actual = _b64d(signature_b64)
    if not hmac.compare_digest(expected, actual):
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        payload = json.loads(_b64d(payload_b64))
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    exp = int(payload.get("exp", 0))
    if exp < int(datetime.now(timezone.utc).timestamp()):
        raise HTTPException(status_code=401, detail="Token expired")

    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject:
        raise HTTPException(status_code=401, detail="Invalid token")
    return subject


def _json_b64(value: dict[str, Any]) -> str:
    raw = json.dumps(value, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return _b64e(raw)


def _b64e(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _b64d(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}")
