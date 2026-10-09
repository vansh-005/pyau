"""T00: Transcribe streaming hi-IN with a Polly-generated 16 kHz PCM clip."""
import asyncio, boto3
from amazon_transcribe.client import TranscribeStreamingClient
from amazon_transcribe.handlers import TranscriptResultStreamHandler

TEXT = "भैया पानी कहाँ मिलेगा"
pcm = boto3.client("polly", region_name="ap-south-1").synthesize_speech(
    Text=TEXT, VoiceId="Kajal", Engine="neural", LanguageCode="hi-IN", OutputFormat="pcm", SampleRate="16000")["AudioStream"].read()

class H(TranscriptResultStreamHandler):
    out = []
    async def handle_transcript_event(self, ev):
        for r in ev.transcript.results:
            if not r.is_partial:
                self.out.append(r.alternatives[0].transcript)

async def main():
    c = TranscribeStreamingClient(region="ap-south-1")
    s = await c.start_stream_transcription(language_code="hi-IN", media_sample_rate_hz=16000, media_encoding="pcm")
    async def send():
        for i in range(0, len(pcm), 8000):
            await s.input_stream.send_audio_event(audio_chunk=pcm[i:i+8000])
        await s.input_stream.end_stream()
    h = H(s.output_stream)
    await asyncio.gather(send(), h.handle_events())
    print("transcript:", " ".join(h.out))
asyncio.run(main())
