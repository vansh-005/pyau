import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col justify-center gap-6 px-4 py-12">
      <h1 className="m-0 font-serif text-5xl font-semibold text-clay">Pyau</h1>
      <p className="hi m-0 text-2xl">प्याऊ — पानी, छाँव, आराम।</p>
      <p className="m-0 text-lg">
        Pyau finds delivery riders water, shade and rest in the heat — and an AI agent fills the gaps before the
        afternoon hits.
      </p>
      <Link
        to="/demo"
        className="inline-flex min-h-12 w-fit items-center rounded-xl bg-water px-6 text-lg font-semibold text-white no-underline"
      >
        Try the live demo
      </Link>
      <p className="m-0 text-sm text-muted">
        Sample scenario: all hosts, requests and temperatures are invented for the demo. Hindi strings await native
        review.
      </p>
    </main>
  );
}
