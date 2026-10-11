# SUBMIT.md — copy-paste blocks for the submission form

Every claim below is verified on the deployed app (see `docs/evidence/`, `tasks.md`, `README.md`). Nothing has been submitted for you.

## Project name

Pyau

## Track

Heat and Water (Track 02)

## One-line summary

Pyau helps delivery riders find open water, shade and rest in the heat, and uses an AI agent on AWS to keep those points open before the afternoon peak.

## The problem

Delivery riders work through the hottest hours of the day. Over half of surveyed gig workers reported heat-exhaustion or heatstroke symptoms and more than 40% lacked access to cold, clean drinking water (2024 IFAT survey, as reported by Mongabay India). The help that does exist — a shopkeeper's water, a temple pyau, an RWA office, Delhi's 38 free water ATMs — is informal and invisible on any map, so a rider cannot tell what is open right now. Sources are linked on the landing page and in `sources.md`.

## What it does

- **Riders** (anonymous, no account) tap or ask by voice in Hindi or English and get the nearest point that is open and confirmed today, with a scooter route and a spoken answer.
- **Hosts** (shops, offices, temples) register in under a minute and confirm each morning that water is on offer. A host's yes is shown as "Host confirmed", never "verified".
- **A coverage agent** reads tomorrow's heat forecast, finds areas where riders would have no open water in the hottest hours, and drafts a request to each nearby host in that host's own language. A **coordinator** reviews and approves. A workflow then asks hosts one at a time, moves on when nobody answers, and puts the point on the rider map when a host says yes. Gaps it cannot fill stay flagged for a human.
- **Trust loop:** two rider problem reports within three hours pause a point automatically; the coordinator can reactivate it.
- In our invented East Delhi sample scenario, coverage of 44 rider requests rises from 22 (50.0%) to 40 (90.9%) after one host times out after 45 seconds and the next accepts. These are scenario figures computed by code from invented data, not measured outcomes.

## How it is built / where AWS fits

The agent only plans and writes messages; all distances, coverage numbers, host ranking and timing are computed by tested code, and the agent cannot send, approve or reorder anything.

- **Amazon Bedrock** (Amazon Nova 2 Lite) with **Strands Agents** in a **Lambda** container image: the coverage agent with six read-only tools; its plan is validated in code before a human sees it.
- **AWS Step Functions:** approval and every host's answer are paused steps (task tokens) with timeouts, so waiting for people costs no compute and the execution graph is an audit trail.
- **Amazon Polly** (spoken answers, Hindi and English) and **Amazon Transcribe** (spoken questions).
- **Amazon Location Service:** maps, address lookup and scooter routes.
- **API Gateway + Lambda** (Python), **DynamoDB** (single table), **S3** (audio cache), **CloudWatch** (logs, no task tokens), **ECR**, **AWS Amplify** (hosting), **AWS CDK** (one stack).
- Deployed but not exercised by the demo: EventBridge Scheduler (live-zone morning and nightly jobs) and a Cognito user pool.
- Verified on the deployed stack: 3 consecutive full real-browser loops each found in Step Functions and CloudWatch, 13/13 authority and failure-injection gates, 42 tests.

## AI tools used

Claude Code (Claude Opus 5.5 and Claude Sonnet 5.5) wrote and debugged most of the code and scripts under my direction, checked by tests and deployed end-to-end checks, and recorded the demo footage with Playwright scripts. The video was made with Remotion and Claude Code; its narration is Kokoro-82M, a stock AI voice. In the video, the rider's spoken question is a synthetic Amazon Polly voice played into the microphone; the app's spoken answers are real Amazon Polly output. At runtime the app uses Strands Agents with Amazon Nova 2 Lite on Amazon Bedrock, Amazon Polly and Amazon Transcribe.

## Repo URL

https://github.com/vansh-005/pyau

## Video URL

https://www.youtube.com/watch?v=E_DlsfEabYc

## Live demo URL

https://main.d1lgs9hxx2cuwt.amplifyapp.com/demo

(Landing page: https://main.d1lgs9hxx2cuwt.amplifyapp.com/ · Engineering: https://main.d1lgs9hxx2cuwt.amplifyapp.com/engineering)

## Team

Solo: Vansh Deep Singh

## If the form asks for limitations

Sample data and an unvalidated demo policy (42 °C, 500 m, 45 s); no rider, host or coordinator has validated the workflow; Hindi needs native review (the coordinator reads every message before it is sent); the forecast is a fixture curve; sign-in screens are not built; the agent runs on Nova 2 Lite because Anthropic models were not enabled for this AWS account.
