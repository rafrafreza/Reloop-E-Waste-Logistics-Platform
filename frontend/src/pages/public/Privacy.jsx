export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <p className="field-label text-copper">Legal</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink md:text-4xl">Privacy Policy</h1>
      <p className="mt-4 text-sm text-inkfaint">Last updated: July 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-inkfaint">
        <p>
          This Privacy Policy is provided for demonstration purposes as part of a college project.
          Reloop is not a live commercial service and does not sell or share personal data
          with third parties.
        </p>
        <div>
          <h2 className="font-medium text-ink">Information we collect</h2>
          <p className="mt-1">
            Account details (name, email, phone), pickup addresses, and request history you submit
            while using the platform.
          </p>
        </div>
        <div>
          <h2 className="font-medium text-ink">How we use it</h2>
          <p className="mt-1">
            Solely to operate the pickup workflow: matching requests to segregation centres,
            dispatching pickup partners, and maintaining your request history.
          </p>
        </div>
        <div>
          <h2 className="font-medium text-ink">Data retention</h2>
          <p className="mt-1">
            Data is stored in a local SQLite database for the lifetime of this demonstration
            deployment and is not transmitted to any external service.
          </p>
        </div>
      </div>
    </div>
  );
}
