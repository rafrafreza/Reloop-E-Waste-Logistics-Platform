const STAGES = [
  {
    stage: "PENDING",
    title: "You schedule a pickup",
    body: "Pick an address, list what you're discarding by category (mobile, laptop, TV, appliance...) with an estimated weight, and choose a preferred date.",
  },
  {
    stage: "QUOTED",
    title: "A centre reviews and quotes",
    body: "The nearest segregation centre reviews your items and returns a quotation: material value minus handling and pickup charges.",
  },
  {
    stage: "ACCEPTED",
    title: "You accept & select payment",
    body: "No pickup happens without your sign-off. If you accept the quote, select your preferred payment method (Online via UPI, or Cash) to move the request to dispatch.",
  },
  {
    stage: "ASSIGNED",
    title: "A partner accepts the job",
    body: "A verified pickup partner accepts your request, and a one-time handover OTP is generated.",
  },
  {
    stage: "OUT_FOR_PICKUP → PICKED_UP",
    title: "Verified handover & payout",
    body: "Share the OTP with your pickup partner only at the doorstep. Once verified, your payout is instantly processed to your UPI, or cash is handed over.",
  },
  {
    stage: "AT_CENTRE → COMPLETED",
    title: "Logged and recycled",
    body: "Items are entered into the centre's warehouse inventory and processed. Your request is fully closed.",
  },
];

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      <p className="field-label text-copper">How it works</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink md:text-4xl">From doorstep to warehouse ledger.</h1>
      <p className="mt-4 max-w-2xl text-inkfaint">
        Every request moves through the same tracked pipeline, visible to you at every stage.
      </p>

      <div className="mt-12 space-y-8">
        {STAGES.map((s, idx) => (
          <div key={s.stage} className="ticket flex gap-5 p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/15 font-mono text-sm text-inkfaint">
              {idx + 1}
            </div>
            <div>
              <p className="field-label text-circuit">{s.stage}</p>
              <h3 className="mt-1 font-medium text-ink">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-inkfaint">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
