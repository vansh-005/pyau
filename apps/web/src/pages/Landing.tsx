import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight, Bike, Calculator, ClipboardCheck, Droplet, Handshake, MapPin, Play, Store, UserCheck, UserX, Hourglass,
  type LucideIcon,
} from "lucide-react";
import { Pot, SampleDots } from "../components/diagrams";
import { ExtLink, Section, SiteFooter, SiteNav } from "../components/site";
import { I } from "../components/ui";
import { useLang } from "../i18n/lang";
import { SRC, VIDEO_URL } from "../links";

const ROLE_ICONS: LucideIcon[] = [Bike, Store, ClipboardCheck];
const TRUST_ICONS: LucideIcon[] = [UserX, Handshake, Calculator, UserCheck, Hourglass];

const C = {
  en: {
    badge: "WeMakeDevs × AWS Environmental Hacks · Track 02 Heat and Water",
    h1: "Water, shade and a place to rest for delivery riders in the heat.",
    sub: "Pyau maps the help that already exists in every neighbourhood, and an AI agent fills the gaps before the hottest hours.",
    demo: "Try the live demo", video: "Watch the 3-minute video", eng: "See the engineering",
    sampleTitle: "Sample scenario, not measured impact",
    before: "Before the plan: 22 of 44 rider requests have an open water point within 500 m",
    after: "After one host says yes: 40 of 44",
    missionTitle: "Why Pyau",
    mission: "Riders work through the hottest hours of the day. The help they need already exists, in shops, temples, resident offices and public water points, but it is invisible and unreliable: a rider cannot tell what is open right now. Pyau makes that help findable, keeps it confirmed every day, and uses an AI agent to fill the gaps before the heat arrives.",
    problemTitle: "The problem",
    problemIntro: "Figures below are quoted as reported by the sources linked on each card.",
    stats: [
      { big: "7.7 → 23.5 million", text: "gig workers in India: 7.7 million in 2020–21, projected to reach about 23.5 million by 2029–30.", src: "NITI Aayog, as reported by Mongabay India", href: SRC.mongabay },
      { big: "Over 50%", text: "of surveyed gig workers reported heat-exhaustion or heatstroke symptoms, and more than 40% lacked access to cold, clean drinking water.", src: "2024 IFAT survey, as reported by Mongabay India", href: SRC.mongabay },
      { big: "38 water ATMs", text: "made free by the New Delhi Municipal Council in June 2026. The report mentions no map or way to find them.", src: "The Tribune", href: SRC.tribune },
    ],
    ndma: "India's disaster management authority (NDMA) has asked delivery platforms to tag shaded rest zones in worker apps, and municipal bodies to set up refill points.",
    ndmaSrc: "As reported by Mongabay India",
    pyauTitle: "What is a pyau?",
    pyau: "A pyau (प्याऊ) is the old street-side water stall: a clay pot, a ladle, free water for anyone passing. Many have vanished. Pyau brings the idea back as a live map: every shop, temple or office that already hands out water can be found, confirmed each morning, and asked for help on the hottest days.",
    pyauSrc: "About the vanishing piaos, India Water Portal",
    howTitle: "How it works",
    roles: [
      { t: "Rider", x: "Asks by voice or tap and gets the nearest open, confirmed-today point with a scooter route. No account." },
      { t: "Host", x: "A shop, temple or office lists a place in under a minute and confirms each morning that water is on offer." },
      { t: "Coordinator", x: "Sees tomorrow's gaps, approves the plan, and watches hosts get asked one by one." },
    ],
    steps: [
      { t: "Riders ask", x: "In English or Hindi, by voice or tap. They hear and see the nearest open point." },
      { t: "Hosts join and confirm daily", x: "Points that are not confirmed today are shown as such and left out of answers during the heat." },
      { t: "The agent finds tomorrow's gaps", x: "Every evening it reads the heat forecast and rider demand, and drafts a request for each nearby host." },
      { t: "A coordinator approves", x: "Pyau then asks hosts one by one, moving on when nobody answers, until the gap is filled." },
    ],
    demoNote: "In the demo you start step 3 yourself. The evening schedule is wired for live zones but has not yet run on one.",
    resultsTitle: "What the sample scenario shows",
    results: "In our East Delhi sample scenario, 44 rider water requests fall in the 13:00–16:00 heat window and 22 of them (50.0%) have an open, confirmed water point within 500 m. The agent finds the biggest gap. The first host does not reply, the second says yes, and coverage rises to 40 of 44 (90.9%). The last 4 requests have no host within 500 m and stay flagged for a person.",
    resultsLabel: "Sample scenario with invented hosts, requests and temperatures. Not measured impact.",
    replay: "See the saved run",
    trustTitle: "Trust and privacy",
    trust: [
      { t: "No rider accounts, no tracking", x: "Riders are anonymous. A location is used for one request and stored only as a cell about 150 m wide." },
      { t: "A host's yes is a promise", x: "Pyau says \"Host confirmed\", never \"verified\". Two rider problem reports pause a point." },
      { t: "Numbers come from code, not AI", x: "Distances, coverage and ranking are computed by tested code. The AI plans and writes the messages." },
      { t: "A person approves every outreach", x: "The coordinator reviews each message and every unfilled gap before anything is sent." },
      { t: "Missing data is never \"safe\"", x: "If the forecast is missing, Pyau says so instead of assuming there is no heat." },
    ],
    awsTitle: "Built on AWS",
    awsMore: "Architecture, flows and checks",
    aws: [
      ["AWS Amplify", "hosts the web app"], ["Amazon Location Service", "maps, address lookup, scooter routes"],
      ["API Gateway + AWS Lambda", "the API"], ["Amazon DynamoDB", "hosts, availability, runs, audit events"],
      ["AWS Step Functions", "waits for people without paying for compute"], ["Amazon Bedrock + Strands Agents", "the planning agent"],
      ["Amazon Polly", "spoken answers"], ["Amazon Transcribe", "spoken questions"],
      ["Amazon S3", "audio cache"], ["Amazon CloudWatch", "logs and run evidence"],
      ["AWS CDK", "one stack, one command to deploy"], ["Amazon EventBridge Scheduler", "evening and morning jobs for live zones"],
    ],
    roadmapTitle: "Roadmap",
    roadmapLabel: "Planned, not built yet.",
    roadmap: ["More Indian languages beyond English and Hindi", "A real pilot zone with a riders' union", "Deep links from delivery-platform apps", "Live weather forecasts for real zones"],
  },
  hi: {
    badge: "WeMakeDevs × AWS Environmental Hacks · ट्रैक 02 गर्मी और पानी",
    h1: "गर्मी में डिलीवरी राइडरों के लिए पानी, छाँव और आराम की जगह।",
    sub: "प्याऊ हर मोहल्ले में पहले से मौजूद मदद को नक्शे पर लाता है, और एक AI एजेंट सबसे तेज़ गर्मी से पहले खाली जगहें भरता है।",
    demo: "लाइव डेमो आज़माएँ", video: "3 मिनट का वीडियो देखें", eng: "इंजीनियरिंग देखें",
    sampleTitle: "नमूना परिदृश्य, मापा हुआ असर नहीं",
    before: "प्लान से पहले: 44 में से 22 राइडर अनुरोधों के 500 मीटर में खुला पानी पॉइंट है",
    after: "एक होस्ट के हाँ कहने के बाद: 44 में से 40",
    missionTitle: "प्याऊ क्यों",
    mission: "राइडर दिन के सबसे गर्म घंटों में काम करते हैं। उन्हें जिस मदद की ज़रूरत है वह दुकानों, मंदिरों, रिहायशी दफ़्तरों और सार्वजनिक पानी पॉइंट में पहले से है, लेकिन दिखती नहीं और भरोसे लायक नहीं: राइडर नहीं जान पाता कि अभी क्या खुला है। प्याऊ उस मदद को ढूँढना आसान बनाता है, उसे हर दिन पक्का करवाता है, और गर्मी आने से पहले एक AI एजेंट से खाली जगहें भरवाता है।",
    problemTitle: "समस्या",
    problemIntro: "नीचे के आँकड़े वैसे ही दिए गए हैं जैसे हर कार्ड पर जुड़े स्रोत ने बताए।",
    stats: [
      { big: "7.7 → 23.5 million", text: "भारत में गिग वर्कर: 2020–21 में 7.7 million, और 2029–30 तक करीब 23.5 million होने का अनुमान।", src: "NITI Aayog, Mongabay India के हवाले से", href: SRC.mongabay },
      { big: "50% से ज़्यादा", text: "सर्वे किए गए गिग वर्करों ने गर्मी से थकावट या लू के लक्षण बताए, और 40% से ज़्यादा को ठंडा, साफ़ पीने का पानी नहीं मिला।", src: "2024 IFAT सर्वे, Mongabay India के हवाले से", href: SRC.mongabay },
      { big: "38 वाटर ATM", text: "नई दिल्ली नगर पालिका परिषद ने जून 2026 में मुफ़्त किए। रिपोर्ट में इन्हें ढूँढने के लिए किसी नक्शे या तरीके का ज़िक्र नहीं।", src: "The Tribune", href: SRC.tribune },
    ],
    ndma: "राष्ट्रीय आपदा प्रबंधन प्राधिकरण (NDMA) ने डिलीवरी प्लेटफ़ॉर्म से कहा है कि वर्कर ऐप में छायादार विश्राम स्थल दिखाएँ, और नगर निकायों से पानी भरने के पॉइंट बनाने को कहा है।",
    ndmaSrc: "Mongabay India के हवाले से",
    pyauTitle: "प्याऊ क्या है?",
    pyau: "प्याऊ गली किनारे का पुराना पानी का ठिकाना है: मिट्टी का घड़ा, एक करछुल, आते-जाते हर किसी के लिए मुफ़्त पानी। कई अब खत्म हो गए हैं। प्याऊ इस विचार को ज़िंदा नक्शे के रूप में लौटाता है: जो भी दुकान, मंदिर या दफ़्तर पहले से पानी देता है, उसे ढूँढा जा सकता है, हर सुबह पक्का किया जा सकता है, और सबसे गर्म दिनों में मदद के लिए कहा जा सकता है।",
    pyauSrc: "खत्म होते प्याऊ के बारे में, India Water Portal",
    howTitle: "कैसे काम करता है",
    roles: [
      { t: "राइडर", x: "बोलकर या दबाकर पूछता है और स्कूटर के रास्ते के साथ सबसे पास का खुला, आज पक्का किया हुआ पॉइंट पाता है। खाता नहीं चाहिए।" },
      { t: "होस्ट", x: "दुकान, मंदिर या दफ़्तर एक मिनट से कम में अपनी जगह जोड़ता है और हर सुबह पक्का करता है कि पानी उपलब्ध है।" },
      { t: "कोऑर्डिनेटर", x: "कल की कमियाँ देखता है, प्लान मंज़ूर करता है, और देखता है कि होस्ट से एक-एक करके पूछा जा रहा है।" },
    ],
    steps: [
      { t: "राइडर पूछते हैं", x: "अंग्रेज़ी या हिंदी में, बोलकर या दबाकर। उन्हें सबसे पास का खुला पॉइंट दिखता और सुनाई देता है।" },
      { t: "होस्ट जुड़ते हैं और रोज़ पक्का करते हैं", x: "जो पॉइंट आज पक्का नहीं है उसे वैसा ही दिखाया जाता है और गर्मी के समय जवाबों में नहीं लिया जाता।" },
      { t: "एजेंट कल की कमियाँ ढूँढता है", x: "हर शाम वह मौसम का अनुमान और राइडरों की माँग पढ़ता है, और हर पास के होस्ट के लिए अनुरोध लिखता है।" },
      { t: "कोऑर्डिनेटर मंज़ूर करता है", x: "फिर प्याऊ होस्ट से एक-एक करके पूछता है, किसी के जवाब न देने पर आगे बढ़ता है, जब तक कमी भर न जाए।" },
    ],
    demoNote: "डेमो में तीसरा चरण आप खुद शुरू करते हैं। शाम का शेड्यूल लाइव ज़ोन के लिए जुड़ा है, पर अभी किसी पर चला नहीं है।",
    resultsTitle: "नमूना परिदृश्य क्या दिखाता है",
    results: "हमारे पूर्वी दिल्ली के नमूना परिदृश्य में 13:00–16:00 के गर्मी के समय में 44 राइडर पानी अनुरोध हैं, जिनमें से 22 (50.0%) के 500 मीटर में खुला, पक्का पानी पॉइंट है। एजेंट सबसे बड़ी कमी ढूँढता है। पहला होस्ट जवाब नहीं देता, दूसरा हाँ कहता है, और उपलब्धता 44 में से 40 (90.9%) हो जाती है। आखिरी 4 अनुरोधों के 500 मीटर में कोई होस्ट नहीं, और वे किसी इंसान के लिए चिह्नित रहते हैं।",
    resultsLabel: "काल्पनिक होस्ट, अनुरोध और तापमान वाला नमूना परिदृश्य। मापा हुआ असर नहीं।",
    replay: "सेव किया हुआ रन देखें",
    trustTitle: "भरोसा और निजता",
    trust: [
      { t: "राइडर खाते नहीं, कोई ट्रैकिंग नहीं", x: "राइडर गुमनाम रहते हैं। लोकेशन एक अनुरोध के लिए इस्तेमाल होती है और सिर्फ़ करीब 150 मीटर चौड़े एक खाने के रूप में सेव होती है।" },
      { t: "होस्ट की हाँ एक वादा है", x: "प्याऊ \"होस्ट ने पक्का किया\" लिखता है, \"जाँचा हुआ\" कभी नहीं। राइडरों की दो शिकायतों पर पॉइंट रुक जाता है।" },
      { t: "आँकड़े कोड से, AI से नहीं", x: "दूरी, उपलब्धता और क्रम जाँचे हुए कोड से निकलते हैं। AI प्लान बनाता और संदेश लिखता है।" },
      { t: "हर संपर्क को इंसान मंज़ूर करता है", x: "कुछ भी भेजे जाने से पहले कोऑर्डिनेटर हर संदेश और हर बची हुई कमी देखता है।" },
      { t: "गायब डेटा कभी \"सुरक्षित\" नहीं", x: "मौसम का अनुमान न हो तो प्याऊ यही बताता है, यह नहीं मानता कि गर्मी नहीं है।" },
    ],
    awsTitle: "AWS पर बना",
    awsMore: "आर्किटेक्चर, फ़्लो और जाँचें",
    aws: [
      ["AWS Amplify", "वेब ऐप होस्ट करता है"], ["Amazon Location Service", "नक्शे, पता खोज, स्कूटर रास्ते"],
      ["API Gateway + AWS Lambda", "API"], ["Amazon DynamoDB", "होस्ट, उपलब्धता, रन, ऑडिट घटनाएँ"],
      ["AWS Step Functions", "बिना कंप्यूट खर्च के लोगों का इंतज़ार"], ["Amazon Bedrock + Strands Agents", "प्लान बनाने वाला एजेंट"],
      ["Amazon Polly", "बोलकर जवाब"], ["Amazon Transcribe", "बोले हुए सवाल समझना"],
      ["Amazon S3", "आवाज़ का कैश"], ["Amazon CloudWatch", "लॉग और रन के सबूत"],
      ["AWS CDK", "एक स्टैक, एक कमांड से डिप्लॉय"], ["Amazon EventBridge Scheduler", "लाइव ज़ोन के लिए शाम और सुबह के काम"],
    ],
    roadmapTitle: "आगे की योजना",
    roadmapLabel: "योजना में है, अभी बना नहीं।",
    roadmap: ["अंग्रेज़ी और हिंदी के अलावा और भारतीय भाषाएँ", "राइडरों की यूनियन के साथ असली पायलट ज़ोन", "डिलीवरी प्लेटफ़ॉर्म ऐप से सीधे लिंक", "असली ज़ोन के लिए लाइव मौसम अनुमान"],
  },
};

export default function Landing() {
  const { lang } = useLang();
  const c = C[lang];
  const loc = useLocation();
  useEffect(() => {
    if (loc.hash) document.getElementById(loc.hash.slice(1))?.scrollIntoView();
  }, [loc.hash]);
  const btn = "inline-flex min-h-12 items-center gap-2 rounded-lg px-5 text-lg font-semibold no-underline";
  return (
    <div className="min-h-full bg-canvas">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4">
        {/* Hero */}
        <div className="grid items-center gap-8 py-12 md:grid-cols-[1.25fr_1fr] md:py-16">
          <div>
            <p className="m-0 mb-4 inline-block rounded-full border border-border bg-white px-3 py-1 text-[15px] text-muted">{c.badge}</p>
            <h1 className="m-0 max-w-[20ch] text-[40px] font-semibold leading-[1.08] tracking-tight md:text-[52px]">{c.h1}</h1>
            <p className="m-0 mt-4 max-w-[52ch] text-xl text-muted">{c.sub}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link to="/demo" className={`${btn} bg-water text-white`}>{c.demo}<I icon={ArrowRight} /></Link>
              <a href={VIDEO_URL || "#video"} target="_blank" rel="noopener noreferrer" className={`${btn} border border-border bg-white text-ink`}><I icon={Play} className="text-water" />{c.video}</a>
              <Link to="/engineering" className={`${btn} border border-border bg-white text-ink`}>{c.eng}</Link>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="m-0 text-base font-semibold">{c.sampleTitle}</p>
            <div className="mt-3 space-y-4">
              <SampleDots covered={22} total={44} label={c.before} />
              <SampleDots covered={40} total={44} label={c.after} />
            </div>
          </div>
        </div>

        <Section id="mission" title={c.missionTitle}>
          <p className="m-0 max-w-[68ch] text-lg leading-relaxed">{c.mission}</p>
        </Section>

        <Section id="problem" title={c.problemTitle} intro={c.problemIntro}>
          <div className="grid gap-4 md:grid-cols-3">
            {c.stats.map((s) => (
              <div key={s.big} className="rounded-lg border border-border bg-white p-4">
                <p className="m-0 text-[32px] font-semibold leading-tight tracking-tight tnum text-water">{s.big}</p>
                <p className="m-0 mt-2 text-base">{s.text}</p>
                <p className="m-0 mt-3 text-[15px]"><ExtLink href={s.href}>{s.src}</ExtLink></p>
              </div>
            ))}
          </div>
          <p className="m-0 mt-4 max-w-[72ch] text-base text-muted">{c.ndma} <ExtLink href={SRC.mongabay}>{c.ndmaSrc}</ExtLink></p>
        </Section>

        <Section id="what" title={c.pyauTitle}>
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
            <Pot />
            <div>
              <p className="m-0 max-w-[62ch] text-lg leading-relaxed">{c.pyau}</p>
              <p className="m-0 mt-2 text-[15px]"><ExtLink href={SRC.piao}>{c.pyauSrc}</ExtLink></p>
            </div>
          </div>
        </Section>

        <Section id="how" title={c.howTitle}>
          <div className="grid gap-4 md:grid-cols-3">
            {c.roles.map((r, i) => (
              <div key={r.t} className="flex gap-3 rounded-lg border border-border bg-white p-4">
                <span className="mt-0.5 text-water"><I icon={ROLE_ICONS[i]} size={24} /></span>
                <div><p className="m-0 text-lg font-semibold">{r.t}</p><p className="m-0 mt-1 text-base text-muted">{r.x}</p></div>
              </div>
            ))}
          </div>
          <ol className="m-0 mt-6 grid list-none gap-4 p-0 md:grid-cols-4">
            {c.steps.map((s, i) => (
              <li key={s.t} className="border-t-2 border-water pt-3">
                <p className="m-0 text-[15px] font-semibold text-water tnum">{i + 1}</p>
                <p className="m-0 text-lg font-semibold leading-snug">{s.t}</p>
                <p className="m-0 mt-1 text-base text-muted">{s.x}</p>
              </li>
            ))}
          </ol>
          <p className="m-0 mt-4 text-[15px] text-muted">{c.demoNote}</p>
        </Section>

        <Section id="results" title={c.resultsTitle}>
          <p className="m-0 max-w-[68ch] text-lg leading-relaxed">{c.results}</p>
          <p className="m-0 mt-3 inline-block rounded-lg bg-heat-soft px-3 py-2 text-[15px] font-medium text-heat">{c.resultsLabel}</p>
          <p className="m-0 mt-4"><Link to="/replay/latest" className="inline-flex min-h-12 items-center gap-2 text-lg font-semibold text-water">{c.replay}<I icon={ArrowRight} /></Link></p>
        </Section>

        <Section id="trust" title={c.trustTitle}>
          <ul className="m-0 grid list-none gap-x-8 gap-y-6 p-0 md:grid-cols-2">
            {c.trust.map((t, i) => (
              <li key={t.t} className="flex gap-3">
                <span className="mt-0.5 text-water"><I icon={TRUST_ICONS[i]} size={22} /></span>
                <div><p className="m-0 text-lg font-semibold">{t.t}</p><p className="m-0 max-w-[52ch] text-base text-muted">{t.x}</p></div>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="aws" title={c.awsTitle}>
          <ul className="m-0 grid list-none gap-x-8 gap-y-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {c.aws.map(([n, r]) => (
              <li key={n} className="border-l-2 border-water pl-3"><strong className="block text-base">{n}</strong><span className="text-[15px] text-muted">{r}</span></li>
            ))}
          </ul>
          <p className="m-0 mt-6"><Link to="/engineering" className="inline-flex min-h-12 items-center gap-2 text-lg font-semibold text-water">{c.awsMore}<I icon={ArrowRight} /></Link></p>
        </Section>

        <Section id="roadmap" title={c.roadmapTitle} intro={c.roadmapLabel}>
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
            {c.roadmap.map((r) => (
              <li key={r} className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-white p-3 text-base"><I icon={MapPin} className="shrink-0 text-muted" />{r}</li>
            ))}
          </ul>
          <p className="m-0 mt-8 flex items-center gap-2 text-[15px] text-muted"><I icon={Droplet} size={16} className="text-water" />{lang === "hi" ? "नमूना परिदृश्य: डेमो के सभी होस्ट, अनुरोध और तापमान काल्पनिक हैं।" : "Sample scenario: all hosts, requests and temperatures in the demo are invented."}</p>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}
