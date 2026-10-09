"""Run events (execution receipts, not chain-of-thought). Ordered by an atomic per-run sequence."""
import time

from . import ddb


def run_pk(session_id, run_id):
    return f"S#{session_id}#RUN#{run_id}"


def append(session_id, run_id, type_, actor, summary, data=None, tool_call_id=None):
    pk = run_pk(session_id, run_id)
    seq = ddb.next_seq(pk)
    ev = {"runId": run_id, "seq": seq, "at": time.time(), "type": type_, "actor": actor, "summary": summary,
          "toolCallId": tool_call_id, "data": data or {}}
    ddb.put(pk, f"EVT#{seq:06d}", ev, ttl=int(time.time()) + 48 * 3600)
    return ev


def list_events(session_id, run_id, after=0, limit=100):
    evs = ddb.query(run_pk(session_id, run_id), "EVT#")
    return [e for e in evs if e["seq"] > after][:limit]
