# Submission preparation

Submission = public GitHub repo + YouTube video (≤ 3 min, public/unlisted, opens signed out) + short writeup (problem, build, where AWS fits) through the event form before its deadline. Optional: Builder Center blog for the blog prize. Vansh submits.

## Checklist

- [ ] Project name **Pyau**, Track 02 Heat and Water.
- [ ] Repo public; history shows work during 8–11 Oct; README has demo link, architecture, setup, limitations, credits.
- [ ] Secret scan (no keys, account IDs, tokens, emails).
- [ ] Writeup claims only verified, deployed behaviour; AWS services list matches `facts.json`.
- [ ] AI tools actually used are listed (e.g. Claude Code with Claude Opus for building; Remotion with Claude Code for the video; the runtime Bedrock model).
- [ ] Deployed URL and `/demo` tested in a signed-out incognito window.
- [ ] Video link opens signed out.

## Short description (draft)

Pyau helps delivery riders find drinking water, shade and rest in the heat — and keeps those points open when they're needed most. Riders ask in Hindi and hear the nearest open, confirmed-today point with a scooter route. Shops, temples and RWAs join as hosts in under a minute. Every evening a Strands agent on Amazon Bedrock reads tomorrow's heat forecast, finds where riders will be without water during the hottest hours, and drafts Hindi requests to nearby hosts. A coordinator approves; an AWS Step Functions workflow asks hosts one by one, moves on when nobody answers, and lights the point up on the rider map when someone says yes. Gaps it can't fill stay visible for a human.

## Build paragraph (use only after verified)

React PWA on AWS Amplify with Amazon Location maps, places and scooter routes. API Gateway and Python Lambdas; DynamoDB for hosts, availability, runs and audit events. A Strands agent in a Lambda container calls Amazon Bedrock with typed tools; code computes every distance and coverage number. AWS Step Functions holds the coordinator approval and each host request as task tokens with timeouts. Amazon Polly speaks answers in Hindi; Amazon Transcribe understands spoken Hindi questions. EventBridge Scheduler runs the nightly plan and morning freshness checks. Cognito protects coordinator and host actions; judges get an isolated no-sign-up demo room.

## Result paragraph (use only if the deployed run matches)

In our East Delhi sample scenario, 44 rider water requests fall in the 13:00–16:00 heat window and only 22 have an open, confirmed water point within 500 m. The agent finds the 18-request gap, plans outreach to two nearby hosts, the first doesn't answer, the second accepts, and coverage rises to 40 of 44 (90.9%). The last 4 requests have no host nearby and stay flagged for the coordinator. These are sample-scenario figures, not measured outcomes.

## AI disclosure template

"We used [tools] for [activities]. We reviewed generated code and verified [checks]. At runtime Pyau uses [Strands version] with [Bedrock model]. The demo uses a documented synthetic scenario on a real map."

## Blog outline (optional, Builder Center)

1. The pyau, and why riders can't find water in 2026.
2. Why an agent — and why it must not do arithmetic.
3. Step Functions task tokens: waiting for humans for free.
4. The bug/obstacle you actually hit and how you fixed it (real, not invented).
5. What's next: real hosts, real coordinators, live forecasts.
