import { useState } from "react";

const FAQS = [
  {
    q: "What can I schedule for pickup?",
    a: "Any electronic item — phones, laptops, desktops, TVs, refrigerators, washing machines, air conditioners, microwaves, printers, and batteries are all supported categories.",
  },
  {
    q: "How is the quotation calculated?",
    a: "Your segregation centre values each item's estimated weight against the category's material rate, then subtracts a handling charge and a pickup charge to give you a final payout figure.",
  },
  {
    q: "What is the handover OTP for?",
    a: "It confirms that items were collected by the partner assigned to your request, and only handed over with your consent at the doorstep.",
  },
  {
    q: "Can I cancel a request?",
    a: "Yes, any time before you accept a quotation. Once a pickup partner is assigned, contact support to cancel.",
  },
];

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <p className="field-label text-copper">FAQ</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink md:text-4xl">Frequently asked questions.</h1>

      <div className="mt-10 divide-y divide-ink/10 rounded border border-ink/10 bg-white">
        {FAQS.map((f, idx) => (
          <div key={f.q}>
            <button
              onClick={() => setOpenIdx(openIdx === idx ? -1 : idx)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <span className="font-medium text-ink">{f.q}</span>
              <span className="text-inkfaint">{openIdx === idx ? "−" : "+"}</span>
            </button>
            {openIdx === idx && <p className="px-5 pb-4 text-sm leading-relaxed text-inkfaint">{f.a}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
