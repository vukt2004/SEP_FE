type RuleSection = {
  id: string;
  title: string;
  bullets: string[];
};

const highlights = [
  {
    title: "Evaluation Criteria",
    value: "7 Groups",
    description: "This policy defines 7 core rule groups for game creation.",
  },
  {
    title: "Primary Focus",
    value: "Playability",
    description: "Content must be playable and realistically completable.",
  },
  {
    title: "Reliability",
    value: "Stable",
    description: "No critical technical defects, soft locks, or broken logic.",
  },
  {
    title: "Safety",
    value: "Clean Content",
    description: "Title and description must be appropriate and policy-compliant.",
  },
];

const ruleSections: RuleSection[] = [
  {
    id: "1",
    title: "Validity",
    bullets: [
      "Game has a start point (Start) and an end point (Goal).",
      "Game is solvable.",
      "No soft lock.",
      "No invalid route that makes the destination unreachable.",
      "Objects such as door, key, and switch must function correctly.",
    ],
  },
  {
    id: "2",
    title: "Difficulty",
    bullets: [
      "Difficulty matches the selected level.",
      "Not too easy to solve immediately.",
      "Not too hard or overly complex for the target level.",
      "Solution step count is reasonable.",
      "Completion time is reasonable.",
    ],
  },
  {
    id: "3",
    title: "Fairness",
    bullets: [
      "No unpredictable traps.",
      "No unfair unavoidable loss.",
      "Mechanics are clear and understandable, such as door, key, and hazard.",
    ],
  },
  {
    id: "4",
    title: "Technical Quality",
    bullets: [
      "No technical bugs such as broken collision or trigger behavior.",
      "Objects behave according to design.",
    ],
  },
  {
    id: "5",
    title: "Visual and User Experience",
    bullets: [
      "Layout is clear and easy to read.",
      "No clutter or object spam.",
      "Important elements are easy to recognize.",
      "Assets are used appropriately.",
    ],
  },
  {
    id: "6",
    title: "Content Safety",
    bullets: [
      "Game name is appropriate.",
      "Description does not violate policy.",
      "No offensive content.",
    ],
  },
  {
    id: "7",
    title: "Metadata",
    bullets: [
      "Game has a title.",
      "Game has a description.",
      "Game has relevant tags.",
    ],
  },
];

export default function GameCreationRuleENPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f3ea] via-[#f4f9ff] to-[#eef8f0] text-[#14213d]">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <header className="rounded-3xl border border-[#b8cad6] bg-white/80 p-6 shadow-lg shadow-[#99a9bb]/20 backdrop-blur-sm sm:p-8 lg:p-10">
          <p className="inline-flex rounded-full border border-[#0f766e]/30 bg-[#0f766e]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#0f766e]">
            Game Creation Rules
          </p>
          <h1
            className="mt-4 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl"
            style={{ fontFamily: "Merriweather, Georgia, serif" }}
          >
            Game Creation Guidelines
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#3b4a68] sm:text-base">
            These rules are used to validate game quality before publishing, ensuring
            completion feasibility, fairness, technical stability, and player experience.
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
          {ruleSections.map((section) => (
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
              <ul className="mt-4 list-disc space-y-2 pl-6 text-sm leading-7 text-[#2f4566] sm:text-base">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
