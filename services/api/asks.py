"""Ask records: host outreach asks. Conditional status transitions guarantee exactly one outcome per ask."""
import time

from botocore.exceptions import ClientError

from . import ddb, sessions


def make_id(run_id, cluster_id, host_id):
    return f"{run_id}:{cluster_id}:{host_id}"


def pk(session_id, ask_id):
    return f"S#{session_id}#ASK#{ask_id}"


def inbox_key(session_id, host_id):
    return f"S#{session_id}#HOSTASKS#{host_id}"


def get(session_id, ask_id):
    return ddb.get(pk(session_id, ask_id), "META")


def get_token(session_id, ask_id):
    r = ddb.table().get_item(Key={"PK": pk(session_id, ask_id), "SK": "META"}, ConsistentRead=True).get("Item")
    return r.get("taskToken") if r else None


def create(session_id, ask, token) -> bool:
    """True if newly created; False if it already existed (a retry), in which case only the token is refreshed."""
    item = {"PK": pk(session_id, ask["id"]), "SK": "META", "data": ddb.to_ddb(ask),
            "GSI1PK": inbox_key(session_id, ask["hostId"]), "GSI1SK": f"OPEN#{ask['createdAt']:.3f}",
            "ttl": int(time.time()) + sessions.TTL_S}
    if token:
        item["taskToken"] = token
    try:
        ddb.table().put_item(Item=item, ConditionExpression="attribute_not_exists(PK)")
        if ask.get("runId"):
            ddb.put(f"S#{session_id}#RUN#{ask['runId']}", f"ASKREF#{ask['id']}", {"askId": ask["id"]}, ttl=item["ttl"])
        return True
    except ClientError as e:
        if e.response["Error"]["Code"] != "ConditionalCheckFailedException":
            raise
        if token:
            ddb.table().update_item(Key={"PK": item["PK"], "SK": "META"}, UpdateExpression="SET taskToken = :t",
                                    ExpressionAttributeValues={":t": token})
        return False


def transition(session_id, ask_id, from_status, to_status, extra=None) -> bool:
    """Conditional status change; False if the ask is no longer in `from_status` (someone else won)."""
    ask = get(session_id, ask_id)
    if not ask:
        return False
    fields = {"status": to_status, "answeredAt": time.time(), **(extra or {})}
    try:
        ddb.update_data(pk(session_id, ask_id), "META", fields, condition="#d.#f0 = :from",
                        cond_values={":from": from_status},
                        extra_set={"GSI1SK": f"{to_status}#{ask['createdAt']:.3f}"})
        return True
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return False
        raise


def for_host(session_id, host_id):
    from boto3.dynamodb.conditions import Key
    r = ddb.table().query(IndexName="GSI1", KeyConditionExpression=Key("GSI1PK").eq(inbox_key(session_id, host_id)),
                          ScanIndexForward=False)
    return [ddb.from_ddb(i["data"]) for i in r["Items"]]


def count_for_host_on_date(session_id, host_id, date):
    return len([a for a in for_host(session_id, host_id) if a.get("kind") == "outreach" and a.get("date") == date])


def for_run(session_id, run_id):
    """Asks of a run, via per-run pointer items (no scans)."""
    refs = ddb.query(f"S#{session_id}#RUN#{run_id}", "ASKREF#")
    out = [a for a in (get(session_id, r["askId"]) for r in refs) if a]
    return sorted(out, key=lambda a: a["createdAt"])


def write_availability(session_id, zone_id, host_id, date, window, run_id) -> bool:
    """Deterministic record per host/date/source; True if it was newly written (idempotent on retry)."""
    item = {"PK": sessions.zone_pk(session_id, zone_id), "SK": f"AVAIL#{date}#{host_id}#accepted_ask",
            "data": ddb.to_ddb({"hostId": host_id, "date": date, "window": list(window), "source": "accepted_ask",
                                "runId": run_id, "confirmedAt": time.time()}),
            "ttl": int(time.time()) + sessions.TTL_S}
    try:
        ddb.table().put_item(Item=item, ConditionExpression="attribute_not_exists(PK)")
        return True
    except ClientError as e:
        if e.response["Error"]["Code"] != "ConditionalCheckFailedException":
            raise
        return False
