export default function PendingApprovalNotice({ heading = "Your account is under review, Please wait for approval." }) {
  return (
    <div className="ticket p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber bg-amberlight">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-amber">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
      </div>
      <h2 className="mt-4 font-semibold text-ink">{heading}</h2>
      <p className="mt-2 text-sm leading-relaxed text-inkfaint">
        Your account has been created but needs to be verified by an admin before you can
        access your dashboard. This is a manual review step for pickup partners and
        segregation centres.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-inkfaint">
        You'll be able to sign in as soon as your account is approved.
      </p>
    </div>
  );
}
