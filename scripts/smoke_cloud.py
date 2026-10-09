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


RIDER_B = {"lat": 28.6281, "lng": 77.2829}  # fixture rider query point, inside cluster B


def t04(s):
    """Rider find: before acceptance (honest 'nothing within 500 m'); after a REAL H5 acceptance record (written the
    way the workflow will write it) at the scenario-day clock -> H5, ~176 m straight line, Hindi audio."""
    h = {"x-demo-token": s["token"]}
    code, c = call("POST", f"/demo/sessions/{s['sessionId']}/clock", {"setLocalTime": "14:00"}, h)
    assert code == 200 and c["clock"]["time"] == "14:00", (code, c)
    code, a = call("POST", "/help/find", {"need": "water", **RIDER_B, "sessionId": s["sessionId"]})
    print("find before accept:", code, a["found"], a["host"] and a["host"]["id"], a["distanceM"], a["answer"]["en"])
    assert code == 200 and a["found"] is False
    code, bad = call("POST", f"/demo/sessions/{s['sessionId']}/clock", {"setLocalTime": "14:00"}, {"x-demo-token": "bad"})
    assert code == 403
    import boto3 as b3
    tbl = b3.resource("dynamodb", region_name=REGION).Table(OUT["TableName"])
    pk = f"S#{s['sessionId']}#ZONE#{s['zoneId']}"
    tbl.put_item(Item={"PK": pk, "SK": "AVAIL#2026-05-21#H5#accepted_ask", "data": {
        "hostId": "H5", "date": "2026-05-21", "window": ["12:00", "17:00"], "source": "accepted_ask"}})
    code, a = call("POST", "/help/find", {"need": "water", **RIDER_B, "sessionId": s["sessionId"]})
    print("find after accept:", code, a["found"], a["host"]["id"], a["host"]["straightLineM"], a["distanceM"], a["approximate"])
    print("  hi:", a["answer"]["hi"].encode("utf8").decode("utf8"))
    assert a["found"] and a["host"]["id"] == "H5" and a["host"]["straightLineM"] == 176
    assert a["audio"] and a["audio"]["url"].startswith("https://") and a["route"]["line"]
    with urllib.request.urlopen(a["audio"]["url"], timeout=20) as r:
        audio = r.read()
    print("  audio bytes:", len(audio), a["audio"]["voice"], a["audio"]["engine"])
    assert len(audio) > 5000


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
    t04(s)
    print("SMOKE OK")


if __name__ == "__main__":
    main()
