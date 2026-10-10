import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight, Calculator, ClipboardCheck, Flag, Hourglass, Languages, MapPin, Mic, Repeat, Route as RouteIcon, ShieldCheck, Volume2, Workflow, CircleAlert, Bot, Play, Pause,
  type LucideIcon,
} from "lucide-react";
import { api, type Receipt } from "../api";
import { ArchitectureDiagram, ExecutionGraph, StepFlow } from "../components/diagrams";
import { ExtLink, Section, SiteFooter, SiteNav } from "../components/site";
import { I } from "../components/ui";
import exec from "../data/execution.json";
import { useLang } from "../i18n/lang";
import { GITHUB_URL } from "../links";

const PRINCIPLE_ICONS: LucideIcon[] = [Calculator, Hourglass, Repeat];

const C = {
  en: {
    h1: "How Pyau is built",
    intro: "Three rules shaped every decision. They are also the checks we ran against the deployed system.",
    principles: [
      { t: "The agent plans, code computes", x: "Distances, coverage, ranking and timing are plain, tested functions. The model chooses priorities and writes messages, and its output is validated before anyone sees it." },
      { t: "Wait for humans without paying for compute", x: "Approval and every host's answer are Step Functions task tokens with timeouts. Nothing runs while we wait, and the execution graph shows every branch." },
      { t: "Every effect is idempotent", x: "Run ids, ask ids and availability records are deterministic, and status changes are conditional writes, so a double click does one thing." },
    ],
    archTitle: "Architecture",
    archIntro: "Only services that are deployed in the stack are drawn. Blue outlines are the agent path.",
    arch: {
      aria: "Architecture: the browser calls Amplify, API Gateway and Lambda, which use DynamoDB, S3, Location, Polly and Transcribe, and start a Step Functions workflow that calls an agent Lambda backed by Bedrock.",
      browser: "Browser", browserSub: "rider, host, coordinator", amplify: "hosts the React app", maps: "map tiles (restricted key)", ddb: "single table + 2 indexes", s3: "Polly audio cache",
      loc: "address + scooter routes", polly: "Hindi / English voice", trans: "spoken questions", sched: "07:30 / 18:30 IST", wf: "ask, time out, publish", sfn: "CoverageRun workflow",
      agent: "Strands, container image", cw: "logs, no task tokens", eLoad: "loads app", eTiles: "map tiles", eStart: "start / answer", eTasks: "task steps", eTools: "tool calls", eLogs: "logs",
    },
    flowsTitle: "Three flows",
    f1: "Rider asks", f1s: [
      { title: "Ask", text: "tap or hold the mic, in English or Hindi" }, { title: "Transcribe", text: "voice only: speech to text" }, { title: "Filter in code", text: "open, confirmed today, not paused, within 500 m" },
      { title: "Scooter route", text: "Amazon Location, with a straight-line fallback" }, { title: "Fixed template + Polly", text: "spoken answer, cached in S3" },
    ],
    f1n: "A synchronous call. Measured on the deployed API from one machine, 12 warm calls: median 0.47 s, 90th percentile 1.6 s, slowest 7.5 s. Voice adds the Transcribe step.",
    f2: "Evening coverage run", f2s: [
      { title: "PlanWithAgent", text: "agent reads forecast, demand, coverage" }, { title: "AwaitApproval", text: "task token, waits for the coordinator" }, { title: "AskHost loop", text: "one host at a time, with a timeout" },
      { title: "PublishPoint", text: "availability written, coverage recomputed" }, { title: "Summarize", text: "before and after, open gaps" },
    ],
    f3: "Trust loop", f3s: [
      { title: "Rider reports", text: "no water, closed, dirty, unsafe" }, { title: "Two reports in 3 hours", text: "counted in code" }, { title: "Point is paused", text: "conditional write, leaves answers at once" },
      { title: "Coordinator decides", text: "reactivate from the problem list" },
    ],
    graphTitle: "A real execution",
    graphIntro: "The Step Functions graph below is drawn from the execution history of one verified run. Blue states were visited. Dashed states were not: MarkUnresolved only runs when no host is left. The first host timed out, so the loop went through MarkTimedOut back to PickNextHost, and the second host accepted.",
    graph: { aria: "Step Functions execution graph with the visited states highlighted", map: "OutreachPerGap, one pass per area", hit: "visited in this run", miss: "not visited", back: "next host" },
    graphCap: "Run",
    agentTitle: "The agent",
    agentIntro: "One Strands agent on Amazon Bedrock, running in a Lambda container image. Its tools are small and read-only, and its scope comes from the run, not from the model's arguments.",
    toolsTitle: "Six tools",
    tools: [
      ["get_zone_context", "zone, policy, host counts"], ["get_heat_outlook", "forecast and the heat window, or INSUFFICIENT_DATA"], ["get_demand", "rider request areas with place names"],
      ["get_coverage", "the coverage report, computed in code"], ["find_candidate_hosts", "ranked hosts for one uncovered area"], ["submit_proposal", "the single, validated plan"],
    ],
    canTitle: "What it may do", can: ["Read the six tools' results together", "Choose priority between areas", "Write each host one request in that host's own language", "Recommend what a person should do about a gap it cannot fill"],
    cannotTitle: "What it cannot do", cannot: ["Send anything to a host or approve its own plan", "Add hosts, reorder candidates or change policy", "Compute coverage or distances", "Reach any other URL or service"],
    rulesTitle: "What submit_proposal checks in code",
    rules: [
      "Every area and host must come from the tools for this run (an invented host is rejected).", "Host order is the code's ranking; reordering is rejected, dropping needs a reason.",
      "The ask window must contain the heat hours and extend at most one hour beyond them.", "Each message is in the host's own language, under 280 characters, states the time window, and promises no money, rewards, official status, links or phone numbers.",
      "Every uncovered area is either planned or handed to a person with one of four recommendations.",
    ],
    budgetsTitle: "Budgets, enforced in code", budgets: ["At most 12 tool calls and one candidate lookup per area", "One repair attempt after a failed validation", "120 seconds for the run, inside a 180-second Lambda", "If the model is unavailable, the run fails with a readable message. There is no fake plan."],
    novaTitle: "Why Amazon Nova 2 Lite",
    nova: "It was the tool-calling model enabled for this AWS account, it is an AWS model reached through the same Bedrock API, and it is inexpensive for a short planning run. The model id is one configuration value, so another model can replace it. Its Hindi is understandable but plain, so every message needs a native speaker's review and the coordinator reads each one before it is sent.",
    receiptsTitle: "Real tool receipts",
    receiptsIntro: "From the saved run. These are receipts of what each tool returned, not the model's reasoning.",
    receiptsEmpty: "Loading the saved run…",
    awsTitle: "How AWS helped",
    cols: ["Service", "What it does in Pyau", "Why it was the right choice"],
    rows: [
      ["AWS Step Functions", "Holds the coordinator's approval and each host's answer as task tokens with timeouts.", "Waiting for people costs no compute, timeouts are built in, and the execution graph is a readable audit trail."],
      ["Amazon Location Service", "Map tiles, address lookup for a host's pin, and Scooter routes for riders.", "A two-wheeler travel mode fits delivery riders, and maps, places and routes come from one service in Mumbai."],
      ["Amazon Polly and Transcribe", "Spoken answers and spoken questions in English and Hindi.", "Riders have busy hands and many are Hindi-first; managed Indian-language voice avoids running our own models."],
      ["Amazon Bedrock and Strands Agents", "A planning agent with typed tools and code-enforced limits.", "One managed model API behind IAM. Strands runs the tool loop and our code supplies the rules."],
      ["Amazon DynamoDB", "One table for hosts, availability, runs, asks and events.", "Conditional writes give one winner per status change, which is what idempotency needs. TTL expires demo sessions."],
      ["API Gateway and Lambda", "Short validated commands and reads, with throttling per route.", "Pay per request, and the long waits live in Step Functions instead of in a function."],
      ["AWS CDK", "One TypeScript stack that also builds and deploys the agent container.", "The whole system is reviewable and repeatable from the repository."],
      ["Amazon CloudWatch", "Logs and the run-id trail used as evidence.", "State-machine logging runs with execution data off, so task tokens never reach logs."],
    ],
    safetyTitle: "Reliability and safety, and what proves each",
    scols: ["Behaviour", "How it works", "Verified by"],
    safety: [
      ["A repeated click does one thing", "Run id is the execution name; approval and answers are conditional writes with idempotency keys.", "scripts/smoke_loop.py: a second approve click and a double host tap return the original result."],
      ["A stale approval is refused", "The proposal hash, revision and a fingerprint of hosts, forecast and policy are re-checked.", "scripts/smoke_trust.py: pausing a host after the proposal makes approve return STALE_INPUT."],
      ["A late answer is refused", "The ask expires at a stored time; the answer must win a conditional status change.", "scripts/smoke_loop.py: the timed-out host's answer returns 409."],
      ["Demo sessions are isolated", "Signed tokens are valid for one session only; the demo clock rejects live data.", "scripts/gate_authority.py: 13 of 13 checks passed."],
      ["Failures degrade honestly", "Routes failure gives an approximate text answer, Polly failure gives text only, Bedrock denial fails the run.", "scripts/gate_authority.py, with the real failures injected."],
      ["Prompt injection is data", "A host label that says to approve the plan changes nothing: order, validation and approval are code and a person.", "scripts/gate_authority.py: an injected label, a human still decides."],
      ["Costs and abuse are capped", "One active run per session, a daily cap on agent runs, route throttling, 48-hour sessions.", "scripts/smoke_guardrails.py: the cap refuses a new run and offers the saved replay."],
      ["The whole loop works, repeatedly", "Real browser, real API, real Step Functions and Bedrock.", "scripts/gate_loops.py: 3 of 3 consecutive loops, each found in Step Functions and CloudWatch. 41 unit and validation tests pass."],
    ],
    limitsTitle: "Honest limits and what is next",
    limits: [
      "All hosts, requests and temperatures are invented; the figures are scenario arithmetic, not measured impact.", "Coverage is straight-line distance within 500 m, and zones are small (up to about 500 hosts).",
      "Hindi strings and model-written Hindi need a native speaker's review.", "The evening and morning schedules are deployed but have not yet run on a live zone.",
      "Roles in the demo use signed demo tokens; sign-in screens are not built. Voice was tested with a synthetic voice, not riders.",
    ],
    nextTitle: "Next", next: ["A real pilot zone", "Sign-in for coordinators and hosts", "Live weather forecasts", "More Indian languages"],
    code: "Source code", replay: "See the saved run",
  },
  hi: {
    h1: "प्याऊ कैसे बना है",
    intro: "तीन नियमों ने हर फ़ैसला तय किया। यही वे जाँचें भी हैं जो हमने डिप्लॉय किए गए सिस्टम पर चलाईं।",
    principles: [
      { t: "एजेंट योजना बनाता है, कोड हिसाब लगाता है", x: "दूरी, उपलब्धता, क्रम और समय साधारण, जाँचे हुए फ़ंक्शन हैं। मॉडल प्राथमिकता चुनता और संदेश लिखता है, और किसी के देखने से पहले उसका आउटपुट जाँचा जाता है।" },
      { t: "इंसानों का इंतज़ार, बिना कंप्यूट खर्च के", x: "मंज़ूरी और हर होस्ट का जवाब टाइमआउट वाले Step Functions टास्क टोकन हैं। इंतज़ार के दौरान कुछ नहीं चलता, और एक्ज़ीक्यूशन ग्राफ़ हर शाखा दिखाता है।" },
      { t: "हर असर दोहराने पर भी एक जैसा", x: "रन ID, अनुरोध ID और उपलब्धता रिकॉर्ड तय होते हैं, और स्थिति बदलना शर्त वाली लिखाई है, इसलिए दो बार क्लिक करने पर काम एक ही बार होता है।" },
    ],
    archTitle: "आर्किटेक्चर",
    archIntro: "सिर्फ़ वही सेवाएँ दिखाई गई हैं जो स्टैक में डिप्लॉय हैं। नीले किनारे एजेंट का रास्ता हैं।",
    arch: {
      aria: "आर्किटेक्चर: ब्राउज़र Amplify, API Gateway और Lambda को बुलाता है, जो DynamoDB, S3, Location, Polly और Transcribe इस्तेमाल करते हैं, और एक Step Functions वर्कफ़्लो शुरू करते हैं जो Bedrock पर चलने वाले एजेंट Lambda को बुलाता है।",
      browser: "ब्राउज़र", browserSub: "राइडर, होस्ट, कोऑर्डिनेटर", amplify: "React ऐप होस्ट करता है", maps: "नक्शे की टाइलें (सीमित कुंजी)", ddb: "एक टेबल + 2 इंडेक्स", s3: "Polly आवाज़ का कैश",
      loc: "पता + स्कूटर रास्ते", polly: "हिंदी / अंग्रेज़ी आवाज़", trans: "बोले हुए सवाल", sched: "07:30 / 18:30 IST", wf: "पूछना, समय खत्म, प्रकाशित", sfn: "CoverageRun वर्कफ़्लो",
      agent: "Strands, कंटेनर इमेज", cw: "लॉग, टास्क टोकन नहीं", eLoad: "ऐप लोड", eTiles: "नक्शे की टाइलें", eStart: "शुरू / जवाब", eTasks: "टास्क स्टेप", eTools: "टूल कॉल", eLogs: "लॉग",
    },
    flowsTitle: "तीन फ़्लो",
    f1: "राइडर पूछता है", f1s: [
      { title: "पूछना", text: "दबाएँ या माइक दबाए रखें, अंग्रेज़ी या हिंदी में" }, { title: "Transcribe", text: "सिर्फ़ आवाज़ में: बोली से लिखा हुआ" }, { title: "कोड में छँटाई", text: "खुला, आज पक्का, रुका नहीं, 500 मीटर में" },
      { title: "स्कूटर रास्ता", text: "Amazon Location, सीधी दूरी के विकल्प के साथ" }, { title: "तय टेम्पलेट + Polly", text: "बोला हुआ जवाब, S3 में कैश" },
    ],
    f1n: "यह तुरंत जवाब देने वाला कॉल है। एक मशीन से डिप्लॉय किए गए API पर 12 गर्म कॉल नापे: माध्यिका 0.47 सेकंड, 90वाँ प्रतिशतक 1.6 सेकंड, सबसे धीमा 7.5 सेकंड। आवाज़ में Transcribe का चरण जुड़ता है।",
    f2: "शाम का कवरेज रन", f2s: [
      { title: "PlanWithAgent", text: "एजेंट मौसम, माँग और उपलब्धता पढ़ता है" }, { title: "AwaitApproval", text: "टास्क टोकन, कोऑर्डिनेटर का इंतज़ार" }, { title: "AskHost लूप", text: "एक बार में एक होस्ट, टाइमआउट के साथ" },
      { title: "PublishPoint", text: "उपलब्धता लिखी जाती है, कवरेज दोबारा निकलता है" }, { title: "Summarize", text: "पहले और बाद, खुली कमियाँ" },
    ],
    f3: "भरोसे का चक्र", f3s: [
      { title: "राइडर की रिपोर्ट", text: "पानी नहीं, बंद, गंदा, असुरक्षित" }, { title: "3 घंटे में दो रिपोर्ट", text: "कोड में गिनी जाती हैं" }, { title: "पॉइंट रुकता है", text: "शर्त वाली लिखाई, जवाबों से तुरंत हटता है" },
      { title: "कोऑर्डिनेटर तय करता है", text: "समस्या सूची से फिर चालू करें" },
    ],
    graphTitle: "एक असली एक्ज़ीक्यूशन",
    graphIntro: "नीचे का Step Functions ग्राफ़ एक जाँचे हुए रन के एक्ज़ीक्यूशन इतिहास से बना है। नीले स्टेट पार किए गए। धराशायी लकीर वाले स्टेट नहीं: MarkUnresolved तभी चलता है जब कोई होस्ट न बचे। पहला होस्ट समय पर नहीं बोला, इसलिए लूप MarkTimedOut से होकर PickNextHost पर लौटा, और दूसरे होस्ट ने हाँ कहा।",
    graph: { aria: "Step Functions एक्ज़ीक्यूशन ग्राफ़ जिसमें पार किए गए स्टेट चिह्नित हैं", map: "OutreachPerGap, हर क्षेत्र के लिए एक बार", hit: "इस रन में पार किया", miss: "पार नहीं किया", back: "अगला होस्ट" },
    graphCap: "रन",
    agentTitle: "एजेंट",
    agentIntro: "Amazon Bedrock पर एक Strands एजेंट, जो Lambda कंटेनर इमेज में चलता है। उसके टूल छोटे और सिर्फ़ पढ़ने वाले हैं, और उसका दायरा रन से तय होता है, मॉडल के तर्कों से नहीं।",
    toolsTitle: "छह टूल",
    tools: [
      ["get_zone_context", "ज़ोन, नीति, होस्ट की गिनती"], ["get_heat_outlook", "मौसम और गर्मी का समय, या INSUFFICIENT_DATA"], ["get_demand", "जगह के नामों के साथ राइडर अनुरोध के क्षेत्र"],
      ["get_coverage", "कोड से निकली कवरेज रिपोर्ट"], ["find_candidate_hosts", "एक खाली क्षेत्र के लिए क्रम से होस्ट"], ["submit_proposal", "एकमात्र, जाँची हुई योजना"],
    ],
    canTitle: "यह क्या कर सकता है", can: ["छहों टूल के नतीजे साथ पढ़ना", "क्षेत्रों के बीच प्राथमिकता चुनना", "हर होस्ट को उसकी अपनी भाषा में एक अनुरोध लिखना", "जो कमी वह नहीं भर सकता, उस पर इंसान को क्या करना चाहिए, यह सुझाना"],
    cannotTitle: "यह क्या नहीं कर सकता", cannot: ["किसी होस्ट को कुछ भेजना या अपनी योजना खुद मंज़ूर करना", "होस्ट जोड़ना, उम्मीदवारों का क्रम बदलना या नीति बदलना", "कवरेज या दूरी निकालना", "किसी और URL या सेवा तक पहुँचना"],
    rulesTitle: "submit_proposal कोड में क्या जाँचता है",
    rules: [
      "हर क्षेत्र और होस्ट इसी रन के टूल से आना चाहिए (गढ़ा हुआ होस्ट अस्वीकार)।", "होस्ट का क्रम कोड की रैंकिंग है; क्रम बदलना अस्वीकार, हटाने के लिए कारण चाहिए।",
      "पूछने का समय गर्मी के घंटों को समेटे और उनसे ज़्यादा से ज़्यादा एक घंटा आगे-पीछे हो।", "हर संदेश होस्ट की अपनी भाषा में, 280 अक्षरों से कम, समय बताने वाला हो, और पैसे, इनाम, सरकारी दर्जा, लिंक या फ़ोन नंबर का वादा न करे।",
      "हर खाली क्षेत्र या तो योजना में हो या चार सुझावों में से एक के साथ इंसान को सौंपा गया हो।",
    ],
    budgetsTitle: "सीमाएँ, कोड में लागू", budgets: ["ज़्यादा से ज़्यादा 12 टूल कॉल और हर क्षेत्र के लिए एक उम्मीदवार खोज", "जाँच विफल होने पर एक सुधार का मौका", "रन के लिए 120 सेकंड, 180 सेकंड वाले Lambda के भीतर", "मॉडल उपलब्ध न हो तो रन पढ़ने लायक संदेश के साथ विफल होता है। कोई नकली योजना नहीं बनती।"],
    novaTitle: "Amazon Nova 2 Lite क्यों",
    nova: "यही टूल-कॉलिंग मॉडल इस AWS खाते में चालू था, यह उसी Bedrock API से मिलने वाला AWS का मॉडल है, और छोटी योजना वाले रन के लिए सस्ता है। मॉडल की ID एक कॉन्फ़िगरेशन मान है, इसलिए कोई और मॉडल उसकी जगह ले सकता है। इसकी हिंदी समझ में आती है पर सादा है, इसलिए हर संदेश की जाँच किसी हिंदी जानने वाले से होनी चाहिए और कोऑर्डिनेटर भेजने से पहले हर संदेश पढ़ता है।",
    receiptsTitle: "असली टूल रसीदें",
    receiptsIntro: "सेव किए हुए रन से। ये हर टूल ने जो लौटाया उसकी रसीदें हैं, मॉडल की सोच नहीं।",
    receiptsEmpty: "सेव किया हुआ रन लोड हो रहा है…",
    awsTitle: "AWS ने कैसे मदद की",
    cols: ["सेवा", "प्याऊ में क्या करती है", "सही चुनाव क्यों था"],
    rows: [
      ["AWS Step Functions", "कोऑर्डिनेटर की मंज़ूरी और हर होस्ट का जवाब टाइमआउट वाले टास्क टोकन के रूप में रखती है।", "लोगों का इंतज़ार बिना कंप्यूट खर्च के होता है, टाइमआउट साथ आता है, और एक्ज़ीक्यूशन ग्राफ़ पढ़ने लायक ऑडिट रास्ता है।"],
      ["Amazon Location Service", "नक्शे की टाइलें, होस्ट के पिन का पता, और राइडरों के लिए Scooter रास्ते।", "दोपहिया यात्रा मोड डिलीवरी राइडरों के लिए ठीक बैठता है, और नक्शे, जगहें और रास्ते मुंबई की एक ही सेवा से मिलते हैं।"],
      ["Amazon Polly और Transcribe", "अंग्रेज़ी और हिंदी में बोले हुए जवाब और बोले हुए सवाल।", "राइडरों के हाथ व्यस्त रहते हैं और कई हिंदी-पहले हैं; प्रबंधित भारतीय भाषा आवाज़ से अपने मॉडल नहीं चलाने पड़ते।"],
      ["Amazon Bedrock और Strands Agents", "टाइप किए हुए टूल और कोड से लागू सीमाओं वाला योजना बनाने वाला एजेंट।", "IAM के पीछे एक प्रबंधित मॉडल API। Strands टूल लूप चलाता है और हमारा कोड नियम देता है।"],
      ["Amazon DynamoDB", "होस्ट, उपलब्धता, रन, अनुरोध और घटनाओं के लिए एक टेबल।", "शर्त वाली लिखाई हर स्थिति-बदलाव पर एक ही विजेता देती है, जो दोहराव-सुरक्षा के लिए चाहिए। TTL से डेमो सेशन खत्म होते हैं।"],
      ["API Gateway और Lambda", "छोटे जाँचे हुए कमांड और रीड, हर रूट पर थ्रॉटलिंग के साथ।", "हर अनुरोध पर भुगतान, और लंबा इंतज़ार किसी फ़ंक्शन में नहीं बल्कि Step Functions में रहता है।"],
      ["AWS CDK", "एक TypeScript स्टैक जो एजेंट कंटेनर भी बनाकर डिप्लॉय करता है।", "पूरा सिस्टम रिपॉज़िटरी से देखने और दोहराने लायक है।"],
      ["Amazon CloudWatch", "लॉग और रन ID की कड़ी जो सबूत के तौर पर इस्तेमाल हुई।", "स्टेट मशीन लॉगिंग में एक्ज़ीक्यूशन डेटा बंद है, इसलिए टास्क टोकन लॉग तक नहीं पहुँचते।"],
    ],
    safetyTitle: "भरोसेमंदी और सुरक्षा, और हर एक का सबूत",
    scols: ["व्यवहार", "कैसे काम करता है", "किससे जाँचा गया"],
    safety: [
      ["दोबारा क्लिक एक ही काम करता है", "रन ID ही एक्ज़ीक्यूशन का नाम है; मंज़ूरी और जवाब शर्त वाली लिखाई और idempotency कुंजी से चलते हैं।", "scripts/smoke_loop.py: दूसरा मंज़ूरी क्लिक और होस्ट का दोहरा टैप पहला नतीजा ही लौटाते हैं।"],
      ["पुरानी मंज़ूरी अस्वीकार होती है", "प्रस्ताव का हैश, संस्करण और होस्ट, मौसम व नीति की उँगलियों की छाप दोबारा जाँची जाती है।", "scripts/smoke_trust.py: प्रस्ताव के बाद होस्ट रोकने पर मंज़ूरी STALE_INPUT लौटाती है।"],
      ["देर से आया जवाब अस्वीकार होता है", "अनुरोध एक तय समय पर खत्म होता है; जवाब को शर्त वाला स्थिति-बदलाव जीतना होता है।", "scripts/smoke_loop.py: समय खत्म हो चुके होस्ट का जवाब 409 लौटाता है।"],
      ["डेमो सेशन अलग-अलग रहते हैं", "साइन किए टोकन सिर्फ़ एक सेशन के लिए मान्य हैं; डेमो घड़ी लाइव डेटा को मना करती है।", "scripts/gate_authority.py: 13 में से 13 जाँचें पास।"],
      ["विफलता ईमानदारी से सँभलती है", "Routes विफल हो तो अनुमानित पाठ जवाब, Polly विफल हो तो सिर्फ़ पाठ, Bedrock मना करे तो रन विफल।", "scripts/gate_authority.py, असली विफलताएँ डालकर।"],
      ["प्रॉम्प्ट इंजेक्शन सिर्फ़ डेटा है", "होस्ट का नाम अगर योजना मंज़ूर करने को कहे तो कुछ नहीं बदलता: क्रम, जाँच और मंज़ूरी कोड और एक इंसान के हाथ में हैं।", "scripts/gate_authority.py: इंजेक्शन वाला नाम, फिर भी इंसान तय करता है।"],
      ["खर्च और दुरुपयोग की सीमा", "हर सेशन में एक सक्रिय रन, एजेंट रनों की रोज़ की सीमा, रूट थ्रॉटलिंग, 48 घंटे के सेशन।", "scripts/smoke_guardrails.py: सीमा नया रन मना करती है और सेव किया रन दिखाती है।"],
      ["पूरा चक्र बार-बार चलता है", "असली ब्राउज़र, असली API, असली Step Functions और Bedrock।", "scripts/gate_loops.py: लगातार 3 में से 3 चक्र, हर एक Step Functions और CloudWatch में मिला। 41 यूनिट और जाँच टेस्ट पास।"],
    ],
    limitsTitle: "ईमानदार सीमाएँ और आगे क्या",
    limits: [
      "सभी होस्ट, अनुरोध और तापमान काल्पनिक हैं; आँकड़े परिदृश्य का हिसाब हैं, मापा हुआ असर नहीं।", "उपलब्धता 500 मीटर के भीतर की सीधी दूरी पर आधारित है, और ज़ोन छोटे हैं (करीब 500 होस्ट तक)।",
      "हिंदी के शब्द और मॉडल की लिखी हिंदी को हिंदी जानने वाले की जाँच चाहिए।", "शाम और सुबह के शेड्यूल डिप्लॉय हैं पर अभी किसी लाइव ज़ोन पर चले नहीं।",
      "डेमो में भूमिकाएँ साइन किए डेमो टोकन से चलती हैं; साइन-इन स्क्रीन नहीं बनीं। आवाज़ को कृत्रिम आवाज़ से जाँचा गया, राइडरों से नहीं।",
    ],
    nextTitle: "आगे", next: ["एक असली पायलट ज़ोन", "कोऑर्डिनेटर और होस्ट के लिए साइन-इन", "लाइव मौसम अनुमान", "और भारतीय भाषाएँ"],
    code: "सोर्स कोड", replay: "सेव किया हुआ रन देखें",
  },
};

const FLOW_ICONS: LucideIcon[][] = [
  [Mic, Languages, ShieldCheck, RouteIcon, Volume2],
  [Bot, Pause, Workflow, MapPin, ClipboardCheck],
  [Flag, Hourglass, CircleAlert, Play],
];

export default function Engineering() {
  const { lang } = useLang();
  const c = C[lang];
  useEffect(() => window.scrollTo(0, 0), []);
  const replay = useQuery({ queryKey: ["replay", "latest"], queryFn: () => api<{ runId: string; events: Receipt[] }>("GET", "/replays/latest"), retry: 1 });
  const receipts = (replay.data?.events ?? []).filter((e) => e.type === "tool_receipt").slice(0, 8);
  const flow = (steps: { title: string; text: string }[], icons: LucideIcon[]) => steps.map((s, i) => ({ ...s, icon: icons[i] }));
  const th = "border-b border-border px-3 py-2 text-left text-[15px] font-semibold text-muted";
  const td = "border-b border-border px-3 py-3 align-top text-[15px] leading-snug";
  return (
    <div className="min-h-full bg-canvas">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 pb-8">
        <div className="py-12">
          <h1 className="m-0 text-[40px] font-semibold leading-tight tracking-tight md:text-[48px]">{c.h1}</h1>
          <p className="m-0 mt-3 max-w-[60ch] text-xl text-muted">{c.intro}</p>
          <ul className="m-0 mt-8 grid list-none gap-6 p-0 md:grid-cols-3">
            {c.principles.map((p, i) => (
              <li key={p.t} className="border-t-2 border-water pt-3">
                <span className="text-water"><I icon={PRINCIPLE_ICONS[i]} size={24} /></span>
                <p className="m-0 mt-1 text-lg font-semibold leading-snug">{p.t}</p>
                <p className="m-0 mt-1 text-base text-muted">{p.x}</p>
              </li>
            ))}
          </ul>
        </div>

        <Section id="architecture" title={c.archTitle} intro={c.archIntro}>
          <div className="rounded-lg border border-border bg-white p-4"><ArchitectureDiagram labels={c.arch} /></div>
        </Section>

        <Section id="flows" title={c.flowsTitle}>
          <div className="space-y-8">
            <div><h3 className="m-0 mb-2 text-lg font-semibold">{c.f1}</h3><StepFlow label={c.f1} steps={flow(c.f1s, FLOW_ICONS[0])} /><p className="m-0 mt-2 max-w-[72ch] text-[15px] text-muted">{c.f1n}</p></div>
            <div><h3 className="m-0 mb-2 text-lg font-semibold">{c.f2}</h3><StepFlow label={c.f2} steps={flow(c.f2s, FLOW_ICONS[1])} /></div>
            <div><h3 className="m-0 mb-2 text-lg font-semibold">{c.f3}</h3><StepFlow label={c.f3} steps={flow(c.f3s, FLOW_ICONS[2])} /></div>
          </div>
        </Section>

        <Section id="execution" title={c.graphTitle} intro={c.graphIntro}>
          <div className="rounded-lg border border-border bg-white p-4"><ExecutionGraph visited={exec.statesEntered} labels={c.graph} /></div>
          <p className="m-0 mt-2 text-[15px] text-muted">{c.graphCap} <span className="tnum">{exec.runId}</span> · <span className="tnum">{exec.coverageBefore.percent}% → {exec.coverageAfter.percent}%</span></p>
        </Section>

        <Section id="agent" title={c.agentTitle} intro={c.agentIntro}>
          <h3 className="m-0 mb-2 text-lg font-semibold">{c.toolsTitle}</h3>
          <ul className="m-0 grid list-none gap-x-8 gap-y-2 p-0 sm:grid-cols-2">
            {c.tools.map(([n, d]) => (<li key={n} className="border-l-2 border-water pl-3"><code className="text-[15px] font-semibold">{n}</code><span className="block text-[15px] text-muted">{d}</span></li>))}
          </ul>
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div><h3 className="m-0 mb-2 text-lg font-semibold">{c.canTitle}</h3><ul className="m-0 space-y-1 pl-5 text-base">{c.can.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="m-0 mb-2 text-lg font-semibold">{c.cannotTitle}</h3><ul className="m-0 space-y-1 pl-5 text-base">{c.cannot.map((x) => <li key={x}>{x}</li>)}</ul></div>
          </div>
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div><h3 className="m-0 mb-2 text-lg font-semibold">{c.rulesTitle}</h3><ul className="m-0 space-y-1 pl-5 text-base">{c.rules.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="m-0 mb-2 text-lg font-semibold">{c.budgetsTitle}</h3><ul className="m-0 space-y-1 pl-5 text-base">{c.budgets.map((x) => <li key={x}>{x}</li>)}</ul></div>
          </div>
          <h3 className="m-0 mb-2 mt-8 text-lg font-semibold">{c.novaTitle}</h3>
          <p className="m-0 max-w-[72ch] text-base">{c.nova}</p>
          <h3 className="m-0 mb-1 mt-8 text-lg font-semibold">{c.receiptsTitle}</h3>
          <p className="m-0 mb-2 text-[15px] text-muted">{c.receiptsIntro}</p>
          <div className="rounded-lg border border-border bg-white p-4">
            {receipts.length === 0 ? <p className="m-0 text-muted">{c.receiptsEmpty}</p> : (
              <ol className="m-0 list-none space-y-1 p-0 text-[15px]">
                {receipts.map((r) => (
                  <li key={r.seq} className="flex flex-wrap gap-x-3"><code className="w-44 shrink-0 font-semibold">{(r.data as { tool?: string }).tool}</code><span className="min-w-0 flex-1">{r.summary}</span><span className="text-muted tnum">{(r.data as { durationMs?: number }).durationMs} ms</span></li>
                ))}
              </ol>
            )}
          </div>
        </Section>

        <Section id="aws" title={c.awsTitle}>
          <div className="overflow-x-auto rounded-lg border border-border bg-white">
            <table className="w-full min-w-[640px] border-collapse">
              <thead><tr>{c.cols.map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>{c.rows.map((r) => (<tr key={r[0]}><td className={`${td} w-[22%] font-semibold`}>{r[0]}</td><td className={`${td} w-[34%]`}>{r[1]}</td><td className={td}>{r[2]}</td></tr>))}</tbody>
            </table>
          </div>
        </Section>

        <Section id="safety" title={c.safetyTitle}>
          <div className="overflow-x-auto rounded-lg border border-border bg-white">
            <table className="w-full min-w-[720px] border-collapse">
              <thead><tr>{c.scols.map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>{c.safety.map((r) => (<tr key={r[0]}><td className={`${td} w-[22%] font-semibold`}>{r[0]}</td><td className={`${td} w-[36%]`}>{r[1]}</td><td className={`${td} text-muted`}>{r[2]}</td></tr>))}</tbody>
            </table>
          </div>
        </Section>

        <Section id="limits" title={c.limitsTitle}>
          <ul className="m-0 max-w-[72ch] space-y-2 pl-5 text-base">{c.limits.map((x) => <li key={x}>{x}</li>)}</ul>
          <h3 className="m-0 mb-2 mt-6 text-lg font-semibold">{c.nextTitle}</h3>
          <ul className="m-0 space-y-1 pl-5 text-base">{c.next.map((x) => <li key={x}>{x}</li>)}</ul>
          <p className="m-0 mt-8 flex flex-wrap items-center gap-x-8 gap-y-2 text-lg">
            <ExtLink href={GITHUB_URL}>{c.code}</ExtLink>
            <Link to="/replay/latest" className="inline-flex min-h-12 items-center gap-2 font-semibold text-water">{c.replay}<I icon={ArrowRight} /></Link>
          </p>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}
