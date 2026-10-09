"""Smoke test against the deployed PyauStack (reads infra/outputs.json). Grows with each task.
Usage: python scripts/smoke_cloud.py
Auth check needs a Cognito test coordinator: python scripts/smoke_cloud.py --create-test-user (password stored in .env.local)."""
import json
import os
import secrets
import sys
import urllib.request
from pathlib import Path

import boto3

ROOT = Path(__file__).resolve().parent.parent
OUT = json.loads((ROOT / "infra" / "outputs.json").read_text())["PyauStack"]
API = OUT["ApiUrl"]
REGION = "ap-south-1"
EMAIL = "pyau-test-coordinator@example.com"


def call(method, path, body=None, headers=None):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"content-type": "application/json", **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


def create_test_user():
    idp = boto3.client("cognito-idp", region_name=REGION)
    pw = "Pyau-" + secrets.token_urlsafe(12) + "!1"
    try:
        idp.admin_create_user(UserPoolId=OUT["UserPoolId"], Username=EMAIL, MessageAction="SUPPRESS",
                              UserAttributes=[{"Name": "email", "Value": EMAIL}, {"Name": "email_verified", "Value": "true"}])
    except idp.exceptions.UsernameExistsException:
        pass
    idp.admin_set_user_password(UserPoolId=OUT["UserPoolId"], Username=EMAIL, Password=pw, Permanent=True)
    idp.admin_add_user_to_group(UserPoolId=OUT["UserPoolId"], Username=EMAIL, GroupName="coordinator")
    env = ROOT / ".env.local"
    lines = [l for l in (env.read_text().splitlines() if env.exists() else []) if not l.startswith("PYAU_TEST_PASSWORD=")]
    env.write_text("\n".join(lines + [f"PYAU_TEST_PASSWORD={pw}"]) + "\n")
    print("test coordinator ready (password in .env.local)")


def test_password():
    for l in (ROOT / ".env.local").read_text().splitlines():
        if l.startswith("PYAU_TEST_PASSWORD="):
            return l.split("=", 1)[1]


def main():
    if "--create-test-user" in sys.argv:
        return create_test_user()
    code, body = call("GET", "/health")
    print("health", code, body)
    assert code == 200 and body["ok"]
    code, _ = call("GET", "/auth/whoami")
    print("whoami without token", code)
    assert code == 401
    pw = test_password()
    if pw:
        idp = boto3.client("cognito-idp", region_name=REGION)
        tok = idp.initiate_auth(ClientId=OUT["UserPoolClientId"], AuthFlow="USER_PASSWORD_AUTH",
                                AuthParameters={"USERNAME": EMAIL, "PASSWORD": pw})["AuthenticationResult"]["IdToken"]
        code, body = call("GET", "/auth/whoami", headers={"authorization": tok})
        print("whoami with token", code, body)
        assert code == 200 and body["groups"] and "coordinator" in str(body["groups"])
    code, s = call("POST", "/demo/sessions", {})
    print("session", code, {k: v for k, v in s.items() if k != "token"})
    assert code == 201
    code, m = call("GET", f"/zones/{s['zoneId']}/map?sessionId={s['sessionId']}")
    print("map", code, {h["id"]: h["state"] for h in m["hosts"]})
    assert {h["id"]: h["state"] for h in m["hosts"]} == {
        "H1": "live", "H2": "live", "H3": "live", "H4": "not_confirmed", "H5": "standby", "H6": "paused"}
    print("SMOKE OK")


if __name__ == "__main__":
    main()
