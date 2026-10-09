"""Build the web app with public config from infra/outputs.json and upload it to Amplify Hosting (manual deploy).
Usage: python scripts/deploy_web.py [--skip-build]"""
import json
import shutil
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

import boto3

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "apps" / "web"
OUT = json.loads((ROOT / "infra" / "outputs.json").read_text())["PyauStack"]
REGION = "ap-south-1"


def write_env():
    (WEB / ".env.local").write_text(
        "\n".join([
            f"VITE_API_BASE_URL={OUT['ApiUrl']}",
            f"VITE_AWS_REGION={REGION}",
            "VITE_LOCATION_MAP_STYLE=Standard",
            f"VITE_LOCATION_API_KEY={OUT['MapApiKey']}",
            f"VITE_COGNITO_USER_POOL_ID={OUT['UserPoolId']}",
            f"VITE_COGNITO_CLIENT_ID={OUT['UserPoolClientId']}",
        ]) + "\n"
    )


def main():
    if "--skip-build" not in sys.argv:
        write_env()
        subprocess.check_call("npm run build --workspace apps/web", cwd=ROOT, shell=True)
    zip_path = shutil.make_archive(str(ROOT / "infra" / "build" / "web"), "zip", WEB / "dist")
    amp = boto3.client("amplify", region_name=REGION)
    d = amp.create_deployment(appId=OUT["AmplifyAppId"], branchName="main")
    req = urllib.request.Request(d["zipUploadUrl"], data=Path(zip_path).read_bytes(), method="PUT",
                                 headers={"content-type": "application/zip"})
    urllib.request.urlopen(req, timeout=120).read()
    amp.start_deployment(appId=OUT["AmplifyAppId"], branchName="main", jobId=d["jobId"])
    for _ in range(60):
        job = amp.get_job(appId=OUT["AmplifyAppId"], branchName="main", jobId=d["jobId"])["job"]["summary"]
        if job["status"] in ("SUCCEED", "FAILED", "CANCELLED"):
            break
        time.sleep(3)
    print("amplify job", d["jobId"], job["status"], OUT["WebUrl"])
    sys.exit(0 if job["status"] == "SUCCEED" else 1)


if __name__ == "__main__":
    main()
