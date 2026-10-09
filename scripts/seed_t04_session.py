"""Create a demo session at the 14:00 clock with an H5 acceptance record (test helper for UI screenshots; prints session JSON)."""
import json, sys
sys.path.insert(0, "scripts")
import boto3, smoke_cloud as m
code, s = m.call("POST", "/demo/sessions", {})
m.call("POST", f"/demo/sessions/{s['sessionId']}/clock", {"setLocalTime": "14:00"}, {"x-demo-token": s["token"]})
if "--accepted" in sys.argv:
    t = boto3.resource("dynamodb", region_name="ap-south-1").Table(m.OUT["TableName"])
    t.put_item(Item={"PK": f"S#{s['sessionId']}#ZONE#{s['zoneId']}", "SK": "AVAIL#2026-05-21#H5#accepted_ask",
                     "data": {"hostId": "H5", "date": "2026-05-21", "window": ["12:00", "17:00"], "source": "accepted_ask"}})
s["clock"] = {"date": "2026-05-21", "time": "14:00", "label": "scenario day"}
print(json.dumps(s))
