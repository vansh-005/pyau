"""Synthesise the rider's spoken question with Polly (synthetic voice) for the Chromium fake microphone.
16 kHz mono 16-bit WAV, padded with silence so Chromium does not loop it during a ~3 s hold.
Usage: python scripts/make_rider_clip.py [out.wav] [phrase] [lang]"""
import sys, wave
import boto3

out = sys.argv[1] if len(sys.argv) > 1 else ".tmp/rider-question-hi.wav"
phrase = sys.argv[2] if len(sys.argv) > 2 else "भैया, पानी कहाँ मिलेगा?"
lang = sys.argv[3] if len(sys.argv) > 3 else "hi-IN"
pcm = boto3.client("polly", region_name="ap-south-1").synthesize_speech(
    Text=phrase, VoiceId="Kajal", Engine="neural", LanguageCode=lang, OutputFormat="pcm", SampleRate="16000")["AudioStream"].read()
lead = b"\x00\x00" * 4000            # 0.25 s of silence before speech
tail_len = max(0, 16000 * 5 - len(pcm) // 2 - 4000)  # total about 5 s
data = lead + pcm + b"\x00\x00" * tail_len
with wave.open(out, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(16000); w.writeframes(data)
print(out, f"speech {len(pcm) / 32000:.2f}s, file {len(data) / 32000:.2f}s")
