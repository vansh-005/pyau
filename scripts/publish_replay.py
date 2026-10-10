"""Publish a saved-run replay from a REAL completed run (reads DynamoDB with local creds; run before the session TTL expires).
Usage: python scripts/publish_replay.py <sessionId> <runId> [replayId]"""
import json, os, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(ROOT / "packages/domain"))
OUT = json.loads((ROOT / "infra/outputs.json").read_text())["PyauStack"]
os.environ.update(TABLE_NAME=OUT["TableName"], BUCKET_NAME=OUT["BucketName"], AWS_REGION="ap-south-1", AWS_DEFAULT_REGION="ap-south-1")
from services.api import replays
sid, rid = sys.argv[1], sys.argv[2]
rep_id = sys.argv[3] if len(sys.argv) > 3 else "run-" + rid[:8]
print(replays.publish(sid, rid, rep_id, note="Real run on the deployed stack; sample scenario data"))
print("replay id:", rep_id)
