"""HMAC-signed demo-session tokens. Grant all roles inside ONE demo session only."""
import base64
import hashlib
import hmac
import json
import os
import time

import boto3

_secret = None


def secret() -> bytes:
    global _secret
    if _secret is None:
        _secret = boto3.client("secretsmanager").get_secret_value(SecretId=os.environ["DEMO_TOKEN_SECRET_ARN"])["SecretString"].encode()
    return _secret


def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


def sign(session_id: str, ttl_s: int = 7200) -> str:
    body = _b64(json.dumps({"sid": session_id, "exp": int(time.time()) + ttl_s}).encode())
    return body + "." + _b64(hmac.new(secret(), body.encode(), hashlib.sha256).digest())


def verify(token: str):
    """-> session id or None."""
    try:
        body, sig = token.split(".")
        good = _b64(hmac.new(secret(), body.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, good):
            return None
        claims = json.loads(base64.urlsafe_b64decode(body + "=" * (-len(body) % 4)))
        return claims["sid"] if claims["exp"] > time.time() else None
    except Exception:
        return None
