# WAKE-UP — read this first

> **UI FROZEN** at commit `53c8579` (release gate T13 passed: 3/3 consecutive full /demo loops on the deployed URL, authority gates 13/13, visual gate OK). The deployed site matches this commit. Layout, hero numbers and flow will not change. Later commits touch only backend prompt text, docs and scripts.

**Summary (updated as I work)**
1. **Done:** T00–T11 built, deployed and verified on AWS (agent, Step Functions loop, demo room, voice, host registration, trust loop). T12–T14 in progress overnight.
2. **Live:** https://main.d1lgs9hxx2cuwt.amplifyapp.com — open `/demo` (the recording surface), `/host`, `/ride`.
3. **Needs you:** see "Needs you" below (nothing blocking so far except the optional Anthropic model access).
4. **To record:** nothing is frozen yet. I'll write `UI FROZEN` + a commit hash here when the release gate (T13) passes. Then follow `RECORDING.md`.
5. **Progress log:** `tasks.md` (bottom). Decisions: `decisions.md`.

## Needs you
- _(none yet)_ Optional: if your Anthropic model access gets approved, tell me and I'll rerun `scripts/t00_smoke.py` and switch `BEDROCK_MODEL_ID` (one config value, `infra/cdk.json` context `bedrockModelId`).

## Log of things I could not finish or chose to cut
- Photo upload for hosts (cut first per demo.md).
- "Contact host" button in the problem queue (no contact data by design).
- Cognito sign-in screens: the user pool, groups and a JWT-protected `/auth/whoami` exist, but the apps run on signed demo tokens.
