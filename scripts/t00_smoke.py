"""T00 access smoke tests: Bedrock tool-use via Strands, Polly hi-IN. Usage: python scripts/t00_smoke.py [bedrock|polly]"""
import sys, os, boto3
REGION = os.environ.get("AWS_REGION", "ap-south-1")

def bedrock(model_id):
    from strands import Agent, tool
    from strands.models import BedrockModel
    calls = []
    @tool
    def get_coverage(zone: str) -> dict:
        """Return coverage for a zone."""
        calls.append(zone)
        return {"covered": 22, "total": 44}
    m = BedrockModel(model_id=model_id, region_name=REGION, max_tokens=300)
    a = Agent(model=m, tools=[get_coverage], callback_handler=None)
    r = a("Call get_coverage for zone 'east-delhi' and tell me covered/total.")
    print("model", model_id, "tool_calls", calls, "|", str(r)[:200])
    return bool(calls)

def polly(voice, engine):
    p = boto3.client("polly", region_name=REGION)
    r = p.synthesize_speech(Text="सबसे पास पानी: आरडब्ल्यूए ऑफिस, एक सौ छिहत्तर मीटर।", VoiceId=voice, Engine=engine, LanguageCode="hi-IN", OutputFormat="mp3")
    b = r["AudioStream"].read()
    print("polly", voice, engine, len(b), "bytes")

if __name__ == "__main__":
    w = sys.argv[1]
    if w == "bedrock": bedrock(sys.argv[2])
    elif w == "polly": polly(sys.argv[2], sys.argv[3])
