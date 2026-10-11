"""Temporary federated AWS console sign-in for the S09 recording (read-only Step Functions + CloudWatch Logs, 1 hour).
Writes the sign-in URL to .tmp/.signin (git-ignored; the recorder reads and deletes it). Prints nothing secret.
Usage: python scripts/aws_console_signin.py [destination-url]"""
import json, sys, urllib.parse, urllib.request
from pathlib import Path
import boto3

ROOT = Path(__file__).resolve().parent.parent
dest = sys.argv[1] if len(sys.argv) > 1 else "https://ap-south-1.console.aws.amazon.com/states/home?region=ap-south-1"
policy = {
    "Version": "2012-10-17",
    "Statement": [
        {"Effect": "Allow", "Action": [
            "states:ListStateMachines", "states:DescribeStateMachine", "states:DescribeExecution", "states:DescribeStateMachineForExecution",
            "states:ListExecutions", "states:GetExecutionHistory", "states:ListTagsForResource", "states:ListMapRuns", "states:DescribeMapRun"],
         "Resource": "*"},
        {"Effect": "Allow", "Action": [
            "logs:DescribeLogGroups", "logs:DescribeLogStreams", "logs:DescribeQueries", "logs:DescribeQueryDefinitions", "logs:FilterLogEvents",
            "logs:GetLogEvents", "logs:GetLogGroupFields", "logs:GetLogRecord", "logs:GetQueryResults", "logs:StartQuery", "logs:StopQuery",
            "logs:ListTagsForResource", "logs:ListTagsLogGroup", "logs:DescribeMetricFilters", "logs:DescribeSubscriptionFilters"],
         "Resource": "*"},
    ],
}
creds = boto3.client("sts").get_federation_token(Name="pyau-proof", DurationSeconds=3600, Policy=json.dumps(policy))["Credentials"]
session = json.dumps({"sessionId": creds["AccessKeyId"], "sessionKey": creds["SecretAccessKey"], "sessionToken": creds["SessionToken"]})
q = urllib.parse.urlencode({"Action": "getSigninToken", "SessionDuration": "3600", "Session": session})
tok = json.load(urllib.request.urlopen("https://signin.aws.amazon.com/federation?" + q, timeout=30))["SigninToken"]
url = "https://signin.aws.amazon.com/federation?" + urllib.parse.urlencode(
    {"Action": "login", "Issuer": "pyau-demo", "Destination": dest, "SigninToken": tok})
out = ROOT / ".tmp" / ".signin"
out.write_text(url, encoding="utf8")
print("sign-in URL written to .tmp/.signin (not shown); valid about 15 minutes to use, session 1 h")
