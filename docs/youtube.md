# YouTube upload text — Pyau

Fill `<<VIDEO_URL>>` references after upload (the writeup uses the same token). Nothing here has been uploaded.

## Title (pick one; each is under 100 characters)

1. **Pyau: an AI agent that keeps water open for delivery riders in the heat (AWS)** ← recommended
2. Pyau — water, shade and rest for delivery riders, kept open by an AI agent on AWS
3. How an AWS Step Functions + Bedrock agent finds water for delivery riders in a heatwave

## Description

Delivery riders work through the hottest hours of the day, and the help that already exists — a shopkeeper's water, a temple pyau, an RWA office — is invisible and unreliable. Pyau maps that help, keeps it confirmed every day, and uses an AI agent to fill the gaps before the heat arrives.

What you see in this video (sample scenario, East Delhi, invented hosts and requests):
• A rider asks for water in Hindi by voice and gets the nearest open, confirmed-today point, with a scooter route and a spoken answer.
• The evening before a heatwave, a Strands agent on Amazon Bedrock reads the forecast and finds where riders will be without water: 22 of 44 requests covered (50%).
• A coordinator reviews the agent's plan (Hindi and English messages, and the gaps a human must decide) and approves it.
• An AWS Step Functions workflow asks hosts one by one. The first host does not answer within the 45-second demo timeout; the second says yes; coverage rises to 40 of 44 (90.9%). Nothing is sped up.
• A shop registers as a host in under a minute; two "no water" reports pause a point automatically.
• The proof in the AWS console: the same run in Step Functions (timeout and accept branches) and in CloudWatch Logs Insights.

Honest notes: all hosts, requests and temperatures are invented, so the figures are scenario arithmetic, not measured impact. The rider's spoken question is a synthetic voice (Amazon Polly) played into the microphone. A host's yes is a promise, shown as "Host confirmed", never "verified". Hindi text needs native review.

Built with: Amazon Bedrock (Nova 2 Lite) + Strands Agents, AWS Step Functions, Lambda, API Gateway, DynamoDB, S3, Amazon Location Service, Amazon Polly, Amazon Transcribe, CloudWatch, Amplify, CDK.

Try it (no sign-up): https://main.d1lgs9hxx2cuwt.amplifyapp.com/demo
Source code: https://github.com/vansh-005/pyau
How it is built: https://main.d1lgs9hxx2cuwt.amplifyapp.com/engineering

AI tools used: Claude Code (Claude Opus 5.5 and Claude Sonnet 5.5) wrote and debugged most of the code, recorded the demo footage with Playwright scripts, and, with Remotion, helped assemble this video; at runtime the app uses Amazon Nova 2 Lite on Amazon Bedrock. Everything on screen is the real app on AWS with sample data.

Made for the WeMakeDevs × AWS Environmental Hacks, Track 02: Heat and Water.
Map data © AWS, HERE. AWS Architecture Icons © Amazon Web Services.

Sources for the statistics are linked on the landing page: https://main.d1lgs9hxx2cuwt.amplifyapp.com/#problem

## Chapters (set the real timestamps after the edit; keep the first at 0:00)

0:00 The problem
0:__ A rider asks for water (Hindi voice)
0:__ The agent finds tomorrow's gaps
0:__ A coordinator reviews and approves
0:__ Hosts are asked one by one (real 45 s timeout)
0:__ A host joins; two reports pause a point
0:__ Proof in the AWS console
0:__ What is next and honest limits

## Tags

pyau, delivery riders, gig workers, heatwave, heat stress, drinking water, India, Delhi, AWS, Amazon Bedrock, Strands Agents, AWS Step Functions, AI agent, agentic AI, Amazon Nova, Amazon Polly, Amazon Transcribe, Amazon Location Service, serverless, hackathon, WeMakeDevs, AWS Environmental Hacks, climate tech, social impact

## Hashtags (first three show above the title)

#AWS #AIagents #ClimateTech

## Settings to choose

- Visibility: your choice (Unlisted is enough for a submission link; Public for the community).
- Audience: not made for kids.
- Category: Science & Technology. Language: English (spoken Hindi appears with on-screen subtitles).
- "Altered or synthetic content" question: the rider's question is synthetic voice and the video says so; decide the answer yourself, we do not choose it for you.
- Subtitles: upload an English `.srt` and a Hindi `.srt` for the spoken Hindi if you have them.
- Comments: on. Add the pinned comment below.

## Pinned comment

Sample scenario with invented hosts, requests and temperatures — the coverage numbers (50% → 90.9%) are computed by the app's code, not measured impact. Source: https://github.com/vansh-005/pyau · Try it: https://main.d1lgs9hxx2cuwt.amplifyapp.com/demo

## Thumbnail idea (1280×720)

The clay pot icon on the left, large text "Water for riders, kept open by AI", and the "50% → 90.9%" dot strip on the right in water blue on the warm canvas colour (#FBF8F3). No faces.
