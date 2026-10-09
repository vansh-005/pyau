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
