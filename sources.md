# Sources and evidence boundaries

Use these for the README, writeup and video facts. Quote numbers as reported by the source ("as reported by…"), never as Pyau's own findings. Re-open a source before quoting it in the final video.

## Event

- Environmental Hacks: https://www.wemakedevs.org/aws/env — tracks (Heat and Water includes heatwaves), judging criteria, 3-minute video, top-10 student Amazon fast-track.
- Tour rules: https://www.wemakedevs.org/aws/rules — build only during the event, repo history must match event dates, AI tools must be listed, video ≤ 3 min on YouTube (public/unlisted), AWS must be shown in the video.

## Problem evidence

- Mongabay India, "Gig work heats up, disaster body steps in with advisory" (Aug 2025): http://india.mongabay.com/2025/08/gig-work-heats-up-disaster-body-steps-in-with-advisory/ — NDMA advisory asks platforms to tag shaded rest zones in worker apps, provide water, cooling breaks; municipal refill points. Reports the 2024 IFAT survey: >50% of gig workers reported heat exhaustion/heatstroke symptoms; >40% lacked access to cold, clean drinking water. NITI Aayog 7.7 M (2020–21) → 23.5 M (2029–30).
- Newslaundry, "Piping hot: India's delivery economy runs on worker heat stress" (4 May 2026): https://www.newslaundry.com/2026/05/04/piping-hot-indias-delivery-economy-runs-on-worker-heat-stress — no shade/water/toilets on 12-hour days; riders report being offered dish-washing water at restaurants.
- Al Jazeera, "Working in 'hellfire'" (15 Jun 2024): https://www.aljazeera.com/news/2024/6/15/working-in-hellfire-gig-workers-bear-the-brunt-of-indias-heatwave — rider fainted, shopkeeper poured water on him; riders prefer small restaurants that offer water.
- Newslaundry/IndiaSpend, informal workers and heat (13 Apr 2026): https://www.newslaundry.com/2026/04/13/as-india-braces-for-summer-informal-workers-have-little-heat-protection — WIEGO: 89% of surveyed street vendors had no free clean water while working; heat action plans rarely address outdoor workers.
- The Tribune, NDMC free water ATMs (Jun 2026): https://www.tribuneindia.com/news/delhi/delhi-heatwave-relief-ndmc-makes-drinking-water-free-at-all-38-water-atms/ — 38 water ATMs made free; no map or locator mentioned.
- India Water Portal, "Piao and the climate crisis" (19 Apr 2025): https://www.indiawaterportal.org/climate-change/disasters/the-vanishing-piaos-reviving-indias-tradition-of-free-water-in-a-heatwave-era — what a piao/pyau is; why they're vanishing; call to revive them.

## Existing platform measures (positioning)

- Business Standard (5 May 2026): https://www.business-standard.com/industry/news/gig-workers-heatwave-measures-delivery-platforms-india-126050500792_1.html — Zomato 5,000+ rest points via restaurant partners.
- Outlook Business (8 May 2026): https://www.outlookbusiness.com/amp/story/news/amazon-swiggy-eternal-heatwave-relief-delivery-partners — Amazon "Ashray" to 250 rest centres by end-2026, open to all drivers; Zomato points open to any platform.
- Business Standard (27 May 2026): https://www.business-standard.com/companies/news/gig-workers-in-a-45-degrees-economy-quick-commerce-faces-heatwave-test-126052700925_1.html — Swiggy relaxed login-hour requirements in peak heat.

## AWS and tools

- Amazon Location endpoints/regions (ap-south-1 listed for maps, places, routes): https://docs.aws.amazon.com/general/latest/gr/location.html
- Amazon Location routes, travel modes incl. Scooter: https://docs.aws.amazon.com/location/latest/developerguide/calculate-routes.html
- Polly bilingual voices (Aditi, Kajal; `hi-IN`): https://docs.aws.amazon.com/polly/latest/dg/bilingual-voices.html · Hindi neural launch: https://aws.amazon.com/about-aws/whats-new/2022/07/amazon-polly-neural-tts-support-hindi-indian-english/
- Transcribe streaming Hindi: https://aws.amazon.com/about-aws/whats-new/2022/11/amazon-transcribe-thai-hindi-streaming-audio · supported languages: https://docs.aws.amazon.com/transcribe/latest/dg/supported-languages.html
- Strands Agents (AWS open source): https://strandsagents.com · Bedrock models: https://docs.aws.amazon.com/bedrock/latest/userguide/models.html
- Step Functions callback with task token: https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html#connect-wait-token
- Open-Meteo forecast API (live mode): https://open-meteo.com/en/docs

Verify current SDK interfaces in the docs matching the installed versions; links describe capabilities, not this account's access.

## Our own design / illustrative data

Name, scenario, coordinates of sample hosts, request counts, temperatures, 42 °C threshold, 500 m radius, timeouts, ranking rule and UI are design choices or invented sample data — not measured outcomes and not safety guidance.
