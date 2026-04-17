type PolicyClause = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  steps?: string[];
};

type PolicySection = {
  id: string;
  title: string;
  clauses: PolicyClause[];
};

const highlights = [
  {
    title: "Lifetime Access",
    value: "Permanent",
    description: "You can keep playing purchased content on this platform.",
  },
  {
    title: "Payment Unit",
    value: "Orbit Coin",
    description: "All purchases are processed with Orbit Coin only.",
  },
  {
    title: "Refund Window",
    value: "2 Days",
    description: "Refund requests must be submitted within 2 days after purchase.",
  },
  {
    title: "Processing Time",
    value: "24-72 Hours",
    description: "Refund reviews are completed in approximately 24 to 72 hours.",
  },
];

const policySections: PolicySection[] = [
  {
    id: "1",
    title: "Ownership Policy",
    clauses: [
      {
        id: "1.1",
        title: "Usage Rights After Purchase",
        paragraphs: [
          "When a user purchases a game or map on the platform, they are granted lifetime access rights.",
          "This access only covers playing the game or map on the platform and viewing related content when available.",
          "These rights are personal and cannot be transferred to another person.",
        ],
      },
      {
        id: "1.2",
        title: "Limits of Ownership",
        paragraphs: [
          "Purchasing a game or map does not transfer ownership of the original content.",
        ],
        bullets: [
          "Downloading, copying, or extracting source code, assets, or game data is prohibited.",
          "Redistributing, reselling, or sharing accounts for third-party use is prohibited.",
          "Using purchased content for external commercial purposes is prohibited.",
        ],
      },
      {
        id: "1.3",
        title: "Platform Rights",
        bullets: [
          "Store, distribute, and display game or map content to users.",
          "Modify, hide, or remove content when necessary, including policy violations and technical issues.",
          "Use content for operations and product improvement.",
        ],
      },
      {
        id: "1.4",
        title: "Creator Rights",
        bullets: [
          "Creators keep ownership of original content they create.",
          "By publishing content, creators grant the platform rights to distribute it.",
          "Creators agree that users can purchase and use content under this policy.",
          "Creators cannot revoke access from users who already purchased content.",
        ],
      },
      {
        id: "1.5",
        title: "When Content Is Removed",
        bullets: [
          "Users who purchased earlier may keep access unless there is a severe violation.",
          "If access cannot continue, the case may be handled under applicable refund rules.",
          "The platform has final decision authority for violations, critical defects, and legal requests.",
        ],
      },
      {
        id: "1.6",
        title: "Account and Access",
        bullets: [
          "Purchase access is tied to the buyer account.",
          "Access may be restricted or revoked for account suspension, severe violations, fraud, or abuse.",
        ],
      },
    ],
  },
  {
    id: "2",
    title: "Pricing and Currency Policy",
    clauses: [
      {
        id: "2.1",
        title: "Payment Unit (Orbit Coin)",
        bullets: [
          "Orbit Coin is the only unit used to purchase games and maps.",
          "Users must top up first, then convert funds into Orbit Coin.",
          "Orbit Coin can only be used inside the platform.",
        ],
      },
      {
        id: "2.2",
        title: "Top Up",
        bullets: [
          "Users can top up with supported payment methods.",
          "The exact coin amount is shown before payment confirmation.",
          "After successful payment, coins are added to the account and recorded in history.",
        ],
      },
      {
        id: "2.3",
        title: "Pricing Rules",
        bullets: [
          "Platform-provided content prices are set and managed by the system.",
          "Creator content prices can be set by creators within allowed ranges.",
          "The platform can enforce minimum or maximum prices and can adjust or reject unsuitable prices.",
        ],
      },
      {
        id: "2.4",
        title: "Price Display",
        bullets: [
          "All prices are clearly displayed in Orbit Coin before purchase.",
          "Displayed information includes item price and buyer balance when available.",
          "No hidden fees are charged beyond the shown coin amount.",
        ],
      },
      {
        id: "2.5",
        title: "Wallet Policy",
        bullets: [
          "Orbit Coin cannot be converted back into cash.",
          "Coin transfer between accounts is not allowed unless the system explicitly supports it.",
          "Users are responsible for checking balance and securing their accounts.",
        ],
      },
      {
        id: "2.6",
        title: "Price Changes",
        bullets: [
          "Prices can change over time.",
          "The confirmed price at checkout is final for that transaction.",
          "Later price changes do not affect completed purchases.",
        ],
      },
      {
        id: "2.7",
        title: "Pricing Errors",
        bullets: [
          "The platform may pause or cancel transactions when invalid pricing is detected.",
          "If coins were deducted in error, the platform will refund Orbit Coin.",
          "Users are informed clearly when pricing incidents occur.",
        ],
      },
    ],
  },
  {
    id: "3",
    title: "Transaction Policy",
    clauses: [
      {
        id: "3.1",
        title: "Purchase Preconditions",
        bullets: [
          "User must be logged in with a valid account.",
          "Game or map must be purchasable (published or active).",
          "User must not already own the content.",
          "Account must have enough Orbit Coin balance.",
          "If any condition fails, the transaction is rejected.",
        ],
      },
      {
        id: "3.2",
        title: "Transaction Flow",
        steps: [
          "System re-validates transaction details, including price, content, and balance.",
          "Orbit Coin is deducted from the user account.",
          "Transaction log is recorded.",
          "Access rights to the purchased game or map are granted.",
        ],
        bullets: [
          "The process is atomic: either all steps succeed or no changes are applied.",
        ],
      },
      {
        id: "3.3",
        title: "Transaction Status",
        bullets: [
          "Pending: transaction is being processed.",
          "Success: coins deducted and access granted.",
          "Failed: transaction did not complete and balance is unchanged.",
          "Cancelled: transaction was cancelled by system or user when applicable.",
          "Users can view status in their transaction history.",
        ],
      },
      {
        id: "3.4",
        title: "Error and Interruption Handling",
        bullets: [
          "If coins are not deducted, transaction is marked Failed.",
          "If coins are deducted but access is not granted, the system auto-recovers by either refunding coins or completing access grant.",
          "The platform prevents loss of coins without receiving content.",
        ],
      },
      {
        id: "3.5",
        title: "Duplicate Transaction Prevention",
        bullets: [
          "Each transaction has a unique Transaction ID.",
          "The system blocks duplicate processing and ignores repeated retry requests.",
        ],
      },
      {
        id: "3.6",
        title: "Transaction History",
        bullets: [
          "History includes purchased content, used coins, timestamps, and final status.",
          "Users can use history for verification and issue reconciliation.",
        ],
      },
      {
        id: "3.7",
        title: "Platform Control",
        bullets: [
          "The platform may pause or reject transactions when suspicious behavior, fraud, or system inconsistency is detected.",
          "Transactions may be adjusted or restored to maintain accuracy and fairness.",
        ],
      },
      {
        id: "3.8",
        title: "Fraud and Abuse",
        bullets: [
          "Exploiting pricing bugs to buy at invalid prices is prohibited.",
          "Creating abnormal transaction patterns to exploit the system is prohibited.",
          "Interfering with payment flow is prohibited.",
          "Violations may result in cancellation, access revocation, temporary lock, or permanent account ban.",
        ],
      },
    ],
  },
  {
    id: "4",
    title: "Refund Policy",
    clauses: [
      {
        id: "4.1",
        title: "General Principle",
        bullets: [
          "By default, Orbit Coin purchases are non-refundable.",
          "Refund requests are accepted in specific eligible cases defined by this policy.",
          "Approved refunds are returned as Orbit Coin.",
        ],
      },
      {
        id: "4.2",
        title: "Eligible Refund Cases",
        bullets: [
          "Unplayable content: impossible completion, soft lock, or broken mechanics such as doors, keys, or switches not functioning.",
          "Content does not match description: difficulty, gameplay mechanics, or objectives are materially different.",
          "System purchase failure: coins deducted but correct access not granted.",
          "Content removed after purchase due to policy violations or severe defects.",
        ],
      },
      {
        id: "4.3",
        title: "Refund Eligibility Conditions",
        bullets: [
          "Request must be submitted within 2 days from purchase time.",
          "Content must not be excessively consumed, for example already completed or repeatedly played for abuse.",
        ],
      },
      {
        id: "4.4",
        title: "Non-Refundable Cases",
        bullets: [
          "User already completed the game or map.",
          "User played for an excessive duration indicating abuse.",
          "Subjective reasons such as not liking the content.",
          "Complaints that difficulty is high while matching clear description.",
          "Wrong purchase due to lack of user verification.",
          "Content functions correctly and matches published description.",
        ],
      },
      {
        id: "4.5",
        title: "Refund Process",
        steps: [
          "User submits a refund request with reason.",
          "System or admin reviews content status and user play history.",
          "Result is communicated as Approved (coins refunded) or Rejected (reason provided).",
        ],
      },
      {
        id: "4.6",
        title: "Processing Time",
        bullets: [
          "Typical handling time is 24 to 72 hours.",
          "Users are notified when final results are available.",
        ],
      },
      {
        id: "4.7",
        title: "Refund Abuse",
        bullets: [
          "Repeated buy-and-refund cycles to play for free are prohibited.",
          "Repeated invalid refund requests are treated as abuse.",
          "Platform may reject refunds, restrict refund submissions, or suspend accounts.",
        ],
      },
    ],
  },
  {
    id: "5",
    title: "Abuse and Edge Cases Policy",
    clauses: [
      {
        id: "5.1",
        title: "Content Removed After Purchase",
        bullets: [
          "Purchased users may keep access if content still works.",
          "If content becomes unusable, users may request a refund.",
          "Platform decides whether to keep access or revoke and refund depending on case severity.",
        ],
      },
      {
        id: "5.2",
        title: "Content Updates After Purchase",
        bullets: [
          "Buyers receive the newest version without additional payment.",
          "If updates materially change the original experience, refund requests may be reviewed under Refund Policy.",
        ],
      },
      {
        id: "5.3",
        title: "Duplicate Purchase Protection",
        bullets: [
          "Users cannot purchase content they already own.",
          "System blocks duplicate transactions or warns clearly before payment.",
        ],
      },
      {
        id: "5.4",
        title: "Purchase Interruption",
        bullets: [
          "If purchase flow is interrupted by network loss, refresh, or crash, system re-checks transaction status.",
          "If success already occurred, access is granted.",
          "If transaction is incomplete, coins are not deducted.",
        ],
      },
      {
        id: "5.5",
        title: "Content Status Changes",
        bullets: [
          "If content moves from public to private, unlisted, or disabled, previous buyers generally keep access unless severe violations apply.",
          "If content is locked for policy violations, access may be revoked and refund may be applied depending on severity.",
        ],
      },
      {
        id: "5.6",
        title: "Account Restrictions",
        bullets: [
          "If a user account is temporarily or permanently suspended, access to purchased content may be restricted or revoked.",
          "The platform decides whether to keep or disable access based on violation level.",
        ],
      },
      {
        id: "5.7",
        title: "Abnormal Transaction Activity",
        bullets: [
          "Examples include mass purchases in a short time, repeated fault-triggering actions, or scripts and automation tools for buying.",
          "Platform may pause transactions and request additional verification.",
        ],
      },
      {
        id: "5.8",
        title: "System and Data Errors",
        bullets: [
          "For wallet balance mismatch or ownership status errors, the platform may correct data to accurate state.",
          "Access rights may be revoked or restored accordingly, and affected users are informed.",
        ],
      },
      {
        id: "5.9",
        title: "Final Decision",
        bullets: [
          "For cases not explicitly covered, the platform has final authority.",
          "Decisions are based on fairness, transaction history, and overall impact to users and system.",
        ],
      },
    ],
  },
];

export default function BuyerPolicyENPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f4ec] via-[#f4f8ff] to-[#eef6f2] text-[#14213d]">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <header className="rounded-3xl border border-[#b8cad6] bg-white/80 p-6 shadow-lg shadow-[#99a9bb]/20 backdrop-blur-sm sm:p-8 lg:p-10">
          <p className="inline-flex rounded-full border border-[#0f766e]/30 bg-[#0f766e]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#0f766e]">
            Buyer Policy
          </p>
          <h1
            className="mt-4 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl"
            style={{ fontFamily: "Merriweather, Georgia, serif" }}
          >
            Buyer Policy and Purchase Protection
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#3b4a68] sm:text-base">
            This policy explains ownership rights, Orbit Coin pricing rules, transaction handling,
            refund conditions, and edge-case controls for buyers on the platform.
          </p>
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-[#5f6f8f]">
            Last updated: April 17, 2026
          </p>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-[#c7d8e3] bg-white/75 p-4 shadow-sm shadow-[#aabccd]/30"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#4e627f]">
                {item.title}
              </p>
              <p
                className="mt-2 text-xl font-extrabold text-[#0f172a]"
                style={{ fontFamily: "Merriweather, Georgia, serif" }}
              >
                {item.value}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#42536f]">{item.description}</p>
            </article>
          ))}
        </section>

        <section className="mt-10 space-y-6">
          {policySections.map((section) => (
            <article
              key={section.id}
              className="rounded-3xl border border-[#c6d5de] bg-white/85 p-5 shadow-md shadow-[#9fb0bf]/20 sm:p-7"
            >
              <h2
                className="text-2xl font-bold text-[#0b2c4a] sm:text-3xl"
                style={{ fontFamily: "Merriweather, Georgia, serif" }}
              >
                {section.id}. {section.title}
              </h2>

              <div className="mt-6 space-y-5">
                {section.clauses.map((clause) => (
                  <div key={clause.id} className="rounded-2xl border border-[#d6e2e9] bg-[#fbfcff] p-4 sm:p-5">
                    <h3 className="text-lg font-bold text-[#173d63] sm:text-xl">
                      {clause.id}. {clause.title}
                    </h3>

                    {clause.paragraphs?.map((text, index) => (
                      <p key={`${clause.id}-paragraph-${index}`} className="mt-3 text-sm leading-7 text-[#2f4566] sm:text-base">
                        {text}
                      </p>
                    ))}

                    {clause.steps && clause.steps.length > 0 ? (
                      <ol className="mt-3 list-decimal space-y-2 pl-6 text-sm leading-7 text-[#2f4566] sm:text-base">
                        {clause.steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    ) : null}

                    {clause.bullets && clause.bullets.length > 0 ? (
                      <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-7 text-[#2f4566] sm:text-base">
                        {clause.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
