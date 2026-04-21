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
    title: "Revenue Split",
    value: "90% Creator",
    description: "Valid sales are split 90% to creator and 10% to platform.",
  },
  {
    title: "Moderation Time",
    value: "24-72 Hours",
    description: "Typical initial review time for submitted content.",
  },
  {
    title: "Holding Period",
    value: "7-14 Days",
    description: "Earnings are held in pending balance before availability.",
  },
  {
    title: "Enforcement",
    value: "4 Levels",
    description: "Warning, Restriction, Suspension, and permanent Ban.",
  },
];

const policySections: PolicySection[] = [
  {
    id: "1",
    title: "Eligibility and Account Requirements",
    clauses: [
      {
        id: "1.1",
        title: "Requirements to Become a Creator",
        bullets: [
          "User must have a valid account on the platform.",
          "Required verification steps must be completed when requested by the system.",
          "User must not be suspended, restricted, or under violation investigation.",
          "User must agree to Creator Terms of Service and related content and transaction policies.",
        ],
      },
      {
        id: "1.2",
        title: "Creator Activation",
        bullets: [
          "User may need to upgrade account role or package to creator level.",
          "Creator profile setup may be required before publishing.",
          "After activation, creator can create, submit for review, and sell games or maps.",
        ],
      },
      {
        id: "1.3",
        title: "Creator Responsibilities",
        bullets: [
          "Creator is fully responsible for uploaded content.",
          "Creator is responsible for accurate descriptions and buyer expectations.",
          "Creator must ensure content is lawful, policy-compliant, and does not harm the system or users.",
        ],
      },
      {
        id: "1.4",
        title: "Account Security",
        bullets: [
          "Creator must protect login credentials and account access.",
          "Account sharing is prohibited.",
          "Unauthorized third-party use for publishing content is prohibited.",
        ],
      },
      {
        id: "1.5",
        title: "Multiple Accounts",
        bullets: [
          "Creating multiple accounts for revenue manipulation or policy circumvention is prohibited.",
          "Self-purchase through related accounts is prohibited.",
          "Platform may merge, restrict, lock related accounts, and recover fraudulent earnings.",
        ],
      },
      {
        id: "1.6",
        title: "Account Status Changes",
        bullets: [
          "Platform can change creator status for policy violations, fraud signs, or serious complaints.",
          "Possible statuses include Active, Restricted, Suspended, and Banned.",
        ],
      },
      {
        id: "1.7",
        title: "Creator Termination",
        bullets: [
          "Creator rights can be terminated by creator request, repeated severe violations, or platform decision.",
          "Consequences can include content delisting, stop-sales, and settlement of remaining earnings by policy.",
        ],
      },
    ],
  },
  {
    id: "2",
    title: "Content Submission Policy",
    clauses: [
      {
        id: "2.1",
        title: "Ownership and License",
        bullets: [
          "Creator must own the content or have lawful rights to use it.",
          "Content must not infringe copyrights or third-party intellectual property.",
          "By uploading, creator grants platform a non-exclusive right to store, distribute, and display content.",
        ],
      },
      {
        id: "2.2",
        title: "Minimum Content Quality",
        bullets: [
          "Submitted game or map must be solvable.",
          "Content must not contain critical issues such as soft locks, crashes, or broken logic.",
          "Core structure must exist, including Start, Goal, and a coherent gameplay flow.",
          "Non-compliant content may be rejected or removed.",
        ],
      },
      {
        id: "2.3",
        title: "Accuracy Requirements",
        bullets: [
          "Creator must provide accurate title, gameplay description, difficulty, and special mechanics.",
          "Misleading information and omission of important gameplay factors are prohibited.",
        ],
      },
      {
        id: "2.4",
        title: "Prohibited Content",
        bullets: [
          "Illegal content is prohibited.",
          "Harmful, offensive, unsuitable, spam, or low-quality content is prohibited.",
          "Content that negatively affects system stability or other users is prohibited.",
          "Platform may reject or remove violating content without prior notice.",
        ],
      },
      {
        id: "2.5",
        title: "Format and Data Integrity",
        bullets: [
          "Content must follow platform technical formats.",
          "Creator is responsible for file validity and safe data behavior.",
        ],
      },
      {
        id: "2.6",
        title: "Content Status",
        bullets: [
          "Content statuses include Draft, Pending, Approved, and Rejected.",
          "Creator must monitor and update content status when needed.",
        ],
      },
      {
        id: "2.7",
        title: "Content Edits",
        bullets: [
          "Creator can edit content before publish or after rejection.",
          "Published content edits may require re-review.",
        ],
      },
      {
        id: "2.8",
        title: "Content Removal",
        bullets: [
          "Platform may remove content for policy violations, severe bugs, or valid user complaints.",
          "Removal can be temporary or permanent, and may occur without prior notice in severe cases.",
        ],
      },
      {
        id: "2.9",
        title: "Post-Publish Responsibility",
        bullets: [
          "Creator must monitor feedback and fix issues after publishing.",
          "If quality is not maintained, content may be downgraded, delisted, or affect earnings.",
        ],
      },
    ],
  },
  {
    id: "3",
    title: "Review and Moderation Policy",
    clauses: [
      {
        id: "3.1",
        title: "Review Requirement",
        bullets: [
          "All creator-submitted content must pass moderation before publish.",
          "Only approved content meeting quality and policy standards can be listed and sold.",
        ],
      },
      {
        id: "3.2",
        title: "Review Workflow",
        steps: [
          "Creator submits content for review.",
          "Content status moves to Pending.",
          "Admin or moderator checks validity, completeness, and player experience.",
          "Result is recorded and sent to creator.",
        ],
      },
      {
        id: "3.3",
        title: "Review Outcomes",
        bullets: [
          "Approved: content passes and can be published.",
          "Rejected: content fails and must be fixed before re-submission.",
          "Needs Revision: content is close to acceptable but needs limited updates.",
        ],
      },
      {
        id: "3.4",
        title: "Moderation Criteria",
        bullets: [
          "Content is completable and free from severe defects.",
          "Gameplay is clear, reasonable, and aligned with description.",
          "Content does not mislead players and does not violate policy.",
          "Platform may update moderation criteria over time.",
        ],
      },
      {
        id: "3.5",
        title: "Processing Time",
        bullets: [
          "Typical review duration is 24 to 72 hours.",
          "Processing can be longer for high volume or complex cases.",
        ],
      },
      {
        id: "3.6",
        title: "Platform Rights",
        bullets: [
          "Platform can reject any content that fails standards.",
          "Platform can require edits before approval.",
          "Platform can pause or cancel review if violations are detected.",
        ],
      },
      {
        id: "3.7",
        title: "Post-Publish Re-Review",
        bullets: [
          "Published content may be re-reviewed if new bugs, policy breaches, or user complaints appear.",
          "Platform may delist content or suspend sales after re-review findings.",
        ],
      },
      {
        id: "3.8",
        title: "Appeal and Feedback",
        bullets: [
          "Creator may request reconsideration if disagreeing with review outcome.",
          "Platform may uphold or revise the original decision.",
        ],
      },
      {
        id: "3.9",
        title: "Final Decision",
        bullets: [
          "All moderation decisions belong to platform authority.",
          "Decisions are based on current policy, actual content state, and system-wide impact.",
        ],
      },
    ],
  },
  {
    id: "4",
    title: "Pricing Policy",
    clauses: [
      {
        id: "4.1",
        title: "Pricing Rights",
        bullets: [
          "Creator can set content prices in Orbit Coin.",
          "Pricing applies when content is approved and published.",
        ],
      },
      {
        id: "4.2",
        title: "Price Limits",
        bullets: [
          "Platform can reject invalid prices.",
          "Platform can require price adjustments before publishing.",
        ],
      },
      {
        id: "4.3",
        title: "Price Display",
        bullets: [
          "Prices are displayed publicly in Orbit Coin.",
          "Creator must ensure price fairly reflects content value and does not mislead users.",
        ],
      },
      {
        id: "4.4",
        title: "Price Changes",
        bullets: [
          "Creator can update price at any time.",
          "Updated price applies only to future transactions and does not affect prior buyers.",
        ],
      },
      {
        id: "4.5",
        title: "Pricing Responsibility",
        bullets: [
          "Creator is responsible for pricing decisions and value alignment.",
          "Unreasonable pricing can impact approval potential and sales performance.",
        ],
      },
      {
        id: "4.6",
        title: "Platform Intervention",
        bullets: [
          "Platform may intervene when prices are too low, too high, abusive, or harmful.",
          "Intervention can include adjustment requests, display suspension, or publish blocking until correction.",
        ],
      },
      {
        id: "4.7",
        title: "Pricing Errors",
        bullets: [
          "Platform may pause transactions and correct invalid prices.",
          "Affected transactions may be handled under transaction and refund policies.",
        ],
      },
    ],
  },
  {
    id: "5",
    title: "Revenue and Earnings Policy",
    clauses: [
      {
        id: "5.1",
        title: "Revenue Split Principle",
        bullets: [
          "Valid sales are split as 90% creator and 10% platform.",
          "This split applies to all eligible transactions.",
        ],
      },
      {
        id: "5.2",
        title: "Earnings Recognition",
        bullets: [
          "On successful purchase, buyer coins are deducted and creator share is recorded.",
          "Creator balance includes Pending Balance and Available Balance.",
        ],
      },
      {
        id: "5.3",
        title: "Holding Period",
        bullets: [
          "Initial earnings are kept in Pending state.",
          "Typical holding period is 7 to 14 days.",
          "If no refund request or dispute appears, earnings move to Available Balance.",
        ],
      },
      {
        id: "5.4",
        title: "Refund Impact",
        bullets: [
          "If revenue is pending, refunded amount is deducted from Pending Balance.",
          "If revenue is available, platform may deduct Available Balance or create Negative Balance.",
        ],
      },
      {
        id: "5.5",
        title: "Valid Earnings Conditions",
        bullets: [
          "Transaction must be Success.",
          "Content must be validly published.",
          "No fraud or policy violation can be present.",
        ],
      },
      {
        id: "5.6",
        title: "Earnings Hold and Restriction",
        bullets: [
          "Platform may hold or limit earnings while refunds or complaints are under review.",
          "Platform may hold or limit earnings for suspicious activity, fraud, or policy-violating content.",
        ],
      },
      {
        id: "5.7",
        title: "Revenue Fraud",
        bullets: [
          "Self-purchase and fake transactions through multiple accounts are prohibited.",
          "System exploitation for invalid earnings is prohibited.",
          "Platform may cancel earnings, freeze balance, create negative balance, and suspend or ban account.",
        ],
      },
      {
        id: "5.8",
        title: "Platform Control",
        bullets: [
          "Platform can adjust earnings for data mismatch, system errors, and disputes.",
          "Platform has final authority in revenue-related decisions.",
        ],
      },
    ],
  },
  {
    id: "6",
    title: "Content Updates and Maintenance",
    clauses: [
      {
        id: "6.1",
        title: "Update Rights",
        bullets: [
          "Creator can update published content.",
          "Updates may include bug fixes, gameplay improvements, difficulty tuning, and mechanic changes.",
        ],
      },
      {
        id: "6.2",
        title: "Re-Review Requirement After Updates",
        bullets: [
          "Major gameplay, map structure, or important mechanic changes can require re-review.",
          "Content may be moved to Pending before updated version is applied.",
        ],
      },
      {
        id: "6.3",
        title: "Maintenance Responsibility",
        bullets: [
          "Creator must keep content playable, stable, and aligned with description.",
          "Creator must proactively fix issues and maintain quality.",
        ],
      },
      {
        id: "6.4",
        title: "Impact on Existing Buyers",
        bullets: [
          "Existing buyers receive latest version updates.",
          "Creator must not fundamentally alter purchased experience in a way that degrades quality or harms previous buyers.",
        ],
      },
      {
        id: "6.5",
        title: "Negative Update Impact",
        bullets: [
          "If updates make content unplayable, misleading, or materially worse, platform may require fixes.",
          "Platform may pause content, remove content, and apply refund policy when appropriate.",
        ],
      },
      {
        id: "6.6",
        title: "Failure to Maintain",
        bullets: [
          "If creator fails to fix significant issues in reasonable time, platform may unpublish, disable, or remove content.",
          "Platform may suspend sales until quality is restored.",
        ],
      },
      {
        id: "6.7",
        title: "Creator-Initiated Removal",
        bullets: [
          "Creator may request content removal.",
          "Removal cannot invalidate prior buyer access unless platform decides otherwise.",
        ],
      },
      {
        id: "6.8",
        title: "Platform Intervention Rights",
        bullets: [
          "Platform may automatically or manually remove, lock, or request updates for violating or harmful content.",
        ],
      },
      {
        id: "6.9",
        title: "Final Decision",
        bullets: [
          "Platform has final authority over update acceptance, post-update status, and related enforcement measures.",
        ],
      },
    ],
  },
  {
    id: "7",
    title: "Prohibited Activities",
    clauses: [
      {
        id: "7.1",
        title: "Revenue Manipulation",
        bullets: [
          "Self-purchase, cross-account purchase rings, and collusion for fake sales are prohibited.",
        ],
      },
      {
        id: "7.2",
        title: "Payment System Abuse",
        bullets: [
          "Exploiting pricing or payment vulnerabilities is prohibited.",
          "Interfering with payment flow or bypassing controls is prohibited.",
        ],
      },
      {
        id: "7.3",
        title: "Refund Abuse",
        bullets: [
          "Creating buy-refund loops for unfair benefit is prohibited.",
          "Designing content to trigger abusive refund behavior is prohibited.",
        ],
      },
      {
        id: "7.4",
        title: "Spam and Low-Value Content",
        bullets: [
          "Bulk upload of duplicate or trivial content is prohibited.",
          "Spam uploads intended to dominate discovery or disrupt system quality are prohibited.",
        ],
      },
      {
        id: "7.5",
        title: "System-Harmful Content",
        bullets: [
          "Content that causes system instability, user disruption, or exploit risk is prohibited.",
        ],
      },
      {
        id: "7.6",
        title: "Impersonation and Misleading Representation",
        bullets: [
          "False claims, misleading descriptions or visuals, and impersonating other creators are prohibited.",
        ],
      },
      {
        id: "7.7",
        title: "Moderation Evasion",
        bullets: [
          "Deliberately changing approved content to bypass moderation is prohibited.",
          "Attempting to bypass review workflow is prohibited.",
        ],
      },
      {
        id: "7.8",
        title: "Unauthorized Account Use",
        bullets: [
          "Using other users' accounts or lending your account for publishing is prohibited.",
          "Mass-account creation for fraud is prohibited.",
        ],
      },
      {
        id: "7.9",
        title: "Negative Ecosystem Impact",
        bullets: [
          "Behavior that harms user experience, marketplace fairness, or platform reputation is prohibited.",
        ],
      },
      {
        id: "7.10",
        title: "Violation Consequences",
        bullets: [
          "Platform may remove content, suspend creator rights, freeze or recover earnings, set negative balance, and lock accounts.",
        ],
      },
      {
        id: "7.11",
        title: "Assessment and Enforcement Rights",
        bullets: [
          "Platform can detect and assess violations using system data, transaction history, and behavior patterns.",
          "For severe cases, actions may be applied without prior notice.",
        ],
      },
    ],
  },
  {
    id: "8",
    title: "Penalties and Enforcement",
    clauses: [
      {
        id: "8.1",
        title: "Enforcement Principle",
        bullets: [
          "Enforcement protects fairness, users, and system stability.",
          "Penalty severity depends on violation type, impact, and prior history.",
        ],
      },
      {
        id: "8.2",
        title: "Penalty Levels",
        bullets: [
          "Warning: for minor first-time issues, usually with correction request.",
          "Restriction: for repeated or medium violations, partial feature limits may apply.",
          "Suspension: for severe violations or fraud signs, temporary account lock and balance freeze may apply.",
          "Ban: for major fraud or repeated severe violations, permanent account lock and full content removal may apply.",
        ],
      },
      {
        id: "8.3",
        title: "Skipping Intermediate Steps",
        bullets: [
          "In severe cases, platform may skip lower levels and apply higher penalties directly.",
        ],
      },
      {
        id: "8.4",
        title: "Impact on Content and Earnings",
        bullets: [
          "Depending on severity, content may be removed, hidden, or access-restricted.",
          "Earnings may be frozen, recovered, or adjusted.",
        ],
      },
      {
        id: "8.5",
        title: "Appeal",
        bullets: [
          "Creator may submit an appeal regarding enforcement outcomes.",
          "Platform may uphold or revise prior decision.",
        ],
      },
      {
        id: "8.6",
        title: "Final Authority",
        bullets: [
          "All violation handling decisions belong to platform authority and internal evaluation.",
          "Where necessary, enforcement may be applied without prior notice.",
        ],
      },
    ],
  },
];

export default function SellerPolicyENPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f2ea] via-[#f3f8ff] to-[#edf7f1] text-[#14213d]">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <header className="rounded-3xl border border-[#b8cad6] bg-white/80 p-6 shadow-lg shadow-[#99a9bb]/20 backdrop-blur-sm sm:p-8 lg:p-10">
          <p className="inline-flex rounded-full border border-[#1d4ed8]/30 bg-[#1d4ed8]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#1d4ed8]">
            Seller Policy
          </p>
          <h1
            className="mt-4 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl"
            style={{ fontFamily: "Merriweather, Georgia, serif" }}
          >
            Seller Policy and Creator Governance
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#3b4a68] sm:text-base">
            This policy defines creator eligibility, submission standards, moderation, pricing,
            revenue handling, maintenance duties, prohibited activities, and enforcement framework.
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
                      <p
                        key={`${clause.id}-paragraph-${index}`}
                        className="mt-3 text-sm leading-7 text-[#2f4566] sm:text-base"
                      >
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
