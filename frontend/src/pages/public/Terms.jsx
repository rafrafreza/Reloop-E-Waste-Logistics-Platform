export default function Terms() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <p className="field-label text-copper">Legal</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink md:text-4xl">Terms of Service</h1>
      <p className="mt-4 text-sm text-inkfaint">Last updated: July 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-inkfaint">
        <p>
          These Terms are provided for demonstration purposes as part of a college project and do
          not constitute a binding commercial agreement.
        </p>
        <div>
          <h2 className="font-medium text-ink">Use of the platform</h2>
          <p className="mt-1">
            Accounts are provided for demonstration and evaluation. Quotations, pricing, and
            payouts shown are illustrative and not real financial transactions.
          </p>
        </div>
        <div>
          <h2 className="font-medium text-ink">Roles &amp; responsibilities</h2>
          <p className="mt-1">
            Consumers are responsible for the accuracy of items listed. Segregation centres are
            responsible for quotation accuracy. Pickup partners are responsible for verified,
            OTP-confirmed handovers.
          </p>
        </div>
        <div>
          <h2 className="font-medium text-ink">Limitation of liability</h2>
          <p className="mt-1">
            This project is provided as-is for academic evaluation, with no warranty of any kind.
          </p>
        </div>
      </div>
    </div>
  );
}
