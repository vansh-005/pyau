# Decision record

Status: planning finalized on 10 Oct 2026 (IST, ~00:30); application not built. HeatOps (started 9 Oct) is set aside; its planning style is reused, none of its code.

| Decision | Reason | Revisit only if |
|---|---|---|
| Pyau, delivery riders, Track 02 Heat and Water | A specific person in a painful moment; help exists but is invisible; sourced numbers; strong Indian identity | Vansh changes the problem |
| Rider is anonymous; coordinator approves; hosts volunteer | No friction for the person in the heat; human oversight where the agent acts | Real users say otherwise |
| The agent plans and writes; code computes and ranks | Numbers judges can trust; agent value is prioritisation, messages, recommendations | — |
| Step Functions (task tokens + timeouts) instead of SQS + leases | Durable waits for humans at no compute cost; the graph is a visible AWS proof shot | A blocking limitation appears |
| Candidate order fixed by code in P0 | Reproducible demo; agent may drop with reason | After the demo works, allow reordering with validation |
| Fixed-template Polly answer for riders, not model text | Fast, predictable, reviewable Hindi | — |
| Transcribe voice question is P0b | High demo value, higher integration risk | Cut first if T09 overruns |
| `/demo` room with isolated sessions, no sign-up | Judges need value in 2 minutes; one screen recording covers the loop | — |
| Synthetic sample scenario on a real map | October is off-season; repeatable demo; honest badge | A verified archived hot-day forecast is added (P1) |
| Coverage radius 500 m, threshold 42 °C apparent | Illustrative demo policy, labelled unvalidated | Real coordinators set policy |
| No SMS/WhatsApp | DLT registration / third-party dependence | — |

## Confirm during T00

- AWS account/region, credits, Bedrock model/profile with tool use: **unverified**.
- Polly `Kajal` neural `hi-IN` in the chosen region: **unverified** (fallback `Aditi` standard).
- Transcribe streaming `hi-IN` in `ap-south-1`: **unverified**.
- Amazon Location `Scooter` routes quality in Delhi: **unverified** (fallback `Car` or straight-line with "approximate" label).
- Exact submission deadline in the event form: **unverified**.

## Known limits

All hosts, requests and temperatures in the hero scenario are invented; coordinates are real places so the map is real. No rider, host or coordinator has validated the workflow, the timeout length, or the 500 m radius. A host's "yes" is a promise, not verified water. Coverage is straight-line distance. Zones are small (≤ 500 hosts). Hindi strings need native review.

## T00 verification results (10 Oct 2026)

| Item | Result |
|---|---|
| Identity / region | IAM user credentials (default CLI profile), `ap-south-1`. Not named `pyau`; `.env.example` AWS_PROFILE=pyau is optional. |
| Bedrock tool use (Strands 1.59.0) | **Verified: `global.amazon.nova-2-lite-v1:0`** called the tool and returned 22/44 via `BedrockModel` in `ap-south-1`. |
| Bedrock Anthropic models | **Blocked**: `claude-sonnet-4-6 / 4-5 / haiku-4-5` -> "Model use case details have not been submitted" (Anthropic use-case form); `claude-*-5*` -> "not available for this account"; `sonnet-4` legacy. Fallback: Nova 2 Lite (AWS first-party). Revisit if Vansh submits the form in the Bedrock console. |
| Polly hi-IN | **Verified** in `ap-south-1`: `Kajal` neural and `Aditi` standard both synthesise. Use Kajal/neural. |
| Transcribe streaming hi-IN | **Verified** in `ap-south-1` with `amazon-transcribe` 0.6.4: Polly 16 kHz PCM clip -> "भैया पानी कहाँ मिलेगा?". |
| Location API key | Not created yet; `location:ListKeys` works (0 keys). Created by CDK in T02. |
| AWS Budget | `DescribeBudgets` returns none. Needs Vansh's go-ahead (see tasks.md). |
| Versions | strands-agents 1.59.0, boto3/botocore 1.43.111, amazon-transcribe 0.6.4, pydantic 2.14.0, Python 3.12.6, Node 24.19, CDK 2.1141 |
