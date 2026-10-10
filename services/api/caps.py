"""Global demo guardrails (cost and abuse): agent runs per day and demo sessions per day across ALL demo sessions."""
import datetime
import os
import time

from botocore.exceptions import ClientError

from . import ddb

AGENT_RUNS_PER_DAY = int(os.environ.get("DEMO_AGENT_RUNS_PER_DAY", "40"))
SESSIONS_PER_DAY = int(os.environ.get("DEMO_SESSIONS_PER_DAY", "400"))


class CapReached(Exception):
    def __init__(self, what, limit):
        self.what, self.limit = what, limit


def _today():
    return datetime.datetime.now(datetime.timezone.utc).date().isoformat()


def _take(name: str, limit: int):
    """Atomically count one use; raises CapReached when the day's limit is spent (conditional ADD, never exceeds)."""
    try:
        ddb.table().update_item(
            Key={"PK": f"PUBLIC#CAP#{_today()}", "SK": name},
            UpdateExpression="ADD n :one SET #t = :ttl",
            ConditionExpression="attribute_not_exists(n) OR n < :lim",
            ExpressionAttributeNames={"#t": "ttl"},
            ExpressionAttributeValues={":one": 1, ":lim": limit, ":ttl": int(time.time()) + 3 * 86400},
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise CapReached(name, limit)
        raise


def _limit(name: str, default: int) -> int:
    """Ops override: PUBLIC#CAP#CONFIG / <name> {limit}. Lets operators lower or raise a cap without a redeploy."""
    cfg = ddb.get("PUBLIC#CAP#CONFIG", name)
    return int(cfg["limit"]) if cfg and "limit" in cfg else default


def take_agent_run():
    _take("agent_runs", _limit("agent_runs", AGENT_RUNS_PER_DAY))


def take_session():
    _take("sessions", _limit("sessions", SESSIONS_PER_DAY))


def usage():
    r = ddb.table().query(KeyConditionExpression="PK = :p", ExpressionAttributeValues={":p": f"PUBLIC#CAP#{_today()}"})
    return {i["SK"]: int(i["n"]) for i in r["Items"]}
