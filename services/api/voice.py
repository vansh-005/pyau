"""Polly hi-IN synthesis with an S3 cache keyed by text hash; returns a presigned URL."""
import hashlib
import os

import boto3
from botocore.config import Config

_polly = _s3 = None


def synthesize_url(text: str) -> dict:
    global _polly, _s3
    _polly = _polly or boto3.client("polly")
    _s3 = _s3 or boto3.client("s3", config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}))
    voice, engine, bucket = os.environ["POLLY_VOICE_ID"], os.environ["POLLY_ENGINE"], os.environ["BUCKET_NAME"]
    key = "audio/" + hashlib.sha256(f"{voice}|{engine}|{text}".encode()).hexdigest()[:32] + ".mp3"
    cached = True
    try:
        _s3.head_object(Bucket=bucket, Key=key)
    except Exception:
        cached = False
        audio = _polly.synthesize_speech(Text=text, VoiceId=voice, Engine=engine, LanguageCode="hi-IN", OutputFormat="mp3")
        _s3.put_object(Bucket=bucket, Key=key, Body=audio["AudioStream"].read(), ContentType="audio/mpeg")
    url = _s3.generate_presigned_url("get_object", Params={"Bucket": bucket, "Key": key}, ExpiresIn=3600)
    return {"url": url, "voice": voice, "engine": engine, "cached": cached}
