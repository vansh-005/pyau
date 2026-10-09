import logging
import os

from .planner import plan

log = logging.getLogger()
log.setLevel(os.environ.get("LOG_LEVEL", "INFO"))


def handler(event, context):
    """Invoked by Step Functions PlanWithAgent (or directly for tests): {sessionId, zoneId, runId}."""
    return plan(event["sessionId"], event["zoneId"], event["runId"])
