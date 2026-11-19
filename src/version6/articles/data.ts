// Articles (v6). PLACEHOLDER CONTENT: written from the site's own concepts so the pages can be reviewed; Grain's
// team will replace these with real articles. The first one is written out in full as the sample article.
export type Cover = "packet" | "gate" | "rings" | "nia" | "route" | "docs" | "models";
export type Block =
  | { t: "p"; text: string }
  | { t: "h2"; text: string }
  | { t: "quote"; text: string }
  | { t: "list"; items: string[] }
  | { t: "callout"; title: string; text: string }
  | { t: "figure"; cover: Cover; caption: string };

export type Article = {
  slug: string; title: string; dek: string; category: string; date: string; read: string; cover: Cover; body: Block[];
};

export const CATEGORIES = ["All", "Product", "Governance", "Use cases", "Trust", "Engineering"];

export const ARTICLES: Article[] = [
  {
    slug: "packets-not-chats",
    title: "Why every AI run should end in a packet, not a chat",
    dek: "A chat answer disappears into a thread. A packet is something a team can review, send and keep. That difference decides whether AI work is usable.",
    category: "Product", date: "Nov 18, 2026", read: "6 min", cover: "packet",
    body: [
      { t: "p", text: "Most AI tools end the same way: a reply in a chat window. It reads well, it is often right, and it is nearly impossible to hand to anyone else. Where did that number come from? Which version of the contract did it read? Who checked it before it went out?" },
      { t: "p", text: "Grain ends every run differently. The output is a packet: a set of finished artifacts, each one carrying its source references, its origin, a content fingerprint, the checkpoint it came from and the details of the run that made it." },
      { t: "h2", text: "What a packet holds" },
      { t: "p", text: "Think of the folder a careful analyst would put on your desk. The letter is there, but so is everything behind it: the documents it relies on, the rules it applied, and a note on what still needs a decision." },
      { t: "list", items: [
        "The artifacts themselves: letters, plans, filled forms, summaries.",
        "Sources for every claim, down to the page and section.",
        "A fingerprint of each file, so a changed document is obvious.",
        "The checkpoint and run it came from, so it can be traced or replayed.",
      ] },
      { t: "figure", cover: "docs", caption: "Every claim in a draft points back to the document it came from." },
      { t: "h2", text: "Why it matters for the people reviewing it" },
      { t: "p", text: "Review is where AI work usually stalls. A reviewer handed a paragraph of prose has to redo the research to trust it. A reviewer handed a packet checks the sources that matter and moves on. The work gets faster because the evidence travels with it." },
      { t: "quote", text: "The output is a packet, not a chat response. That one rule changes how a team can use the work." },
      { t: "h2", text: "Why it matters later" },
      { t: "p", text: "Months on, someone will ask why a claim was disputed or a payment approved. With a packet, the answer is already filed: what came in, what the agent did with it, who approved it and when." },
      { t: "callout", title: "In practice", text: "In Grain, packets are assembled as the run goes. Nia writes each artifact with the profile for that step, attaches its evidence, and stops at an approval gate before anything leaves." },
      { t: "p", text: "Chat is a fine way to ask a question. It is a poor way to deliver work. Packets are how Grain makes AI output something a business can stand behind." },
    ],
  },
  {
    slug: "approval-gates",
    title: "Approval gates: where people belong in an agent workflow",
    dek: "Agents should do the work. People should make the calls that carry risk. Here is how to decide which is which.",
    category: "Governance", date: "Nov 12, 2026", read: "5 min", cover: "gate",
    body: [
      { t: "p", text: "Putting a person on every step makes an agent slow. Putting a person on none makes it dangerous. The useful question is narrower: which moments carry consequences that someone should own?" },
      { t: "h2", text: "Gate the moments, not the steps" },
      { t: "p", text: "Reading, sorting and drafting can run on their own. Sending, paying, filing and committing should wait for a named approver, with the evidence in front of them." },
      { t: "quote", text: "Agents do the work. Your people approve what matters." },
      { t: "h2", text: "Make approving fast" },
      { t: "p", text: "A gate that takes an hour to clear will be routed around. Show the decision, the sources behind it and what happens next, and approval takes seconds." },
    ],
  },
  {
    slug: "healthcare-bill-appeal",
    title: "What a healthcare-bill appeal looks like when an agent drafts it",
    dek: "From a confusing EOB to a cited appeal letter, step by step.",
    category: "Use cases", date: "Nov 6, 2026", read: "7 min", cover: "nia",
    body: [
      { t: "p", text: "A denied claim usually arrives as three documents that disagree: a bill, an explanation of benefits and a plan document nobody has read. The appeal lives in the gaps between them." },
      { t: "h2", text: "Sorting what came in" },
      { t: "p", text: "Nia files each document to the case it belongs to, then pulls out the facts that matter: dates, codes, amounts and the plan rules that apply." },
      { t: "h2", text: "Drafting with sources" },
      { t: "p", text: "Every line of the appeal cites where it came from, so the advocate reviewing it can check the argument instead of rebuilding it." },
    ],
  },
  {
    slug: "evidence-by-default",
    title: "Evidence by default: fingerprints, checkpoints and sources",
    dek: "Three small habits that make an AI run inspectable months later.",
    category: "Trust", date: "Oct 29, 2026", read: "4 min", cover: "rings",
    body: [
      { t: "p", text: "Trust in automated work is rarely lost in one big failure. It erodes when nobody can say where an answer came from. The fix is boring and effective: record it as you go." },
      { t: "h2", text: "Fingerprint every file" },
      { t: "p", text: "A content fingerprint makes any later change visible, so the document a decision rested on is the document you can show." },
      { t: "h2", text: "Checkpoint every step" },
      { t: "p", text: "Durable checkpoints mean a run can be paused, resumed or replayed, and its history read like a log rather than guessed at." },
    ],
  },
  {
    slug: "meet-nia",
    title: "Meet Nia: one agent, many profiles",
    dek: "Why Grain uses one agent that changes its working profile per step.",
    category: "Product", date: "Oct 22, 2026", read: "3 min", cover: "nia",
    body: [
      { t: "p", text: "Nia is the agent inside Grain. Instead of a crowd of narrow bots, one agent takes on the right profile for each step: intake, research, drafting or review." },
      { t: "h2", text: "Profiles, not personalities" },
      { t: "p", text: "A profile sets what Nia can read, which tools she can use and what she must hand back. The packet records which profile made each artifact." },
    ],
  },
  {
    slug: "detention-demurrage",
    title: "Detention & demurrage disputes, run end to end",
    dek: "How a logistics team turned a monthly scramble into a tracked workflow.",
    category: "Use cases", date: "Oct 15, 2026", read: "6 min", cover: "route",
    body: [
      { t: "p", text: "D&D charges arrive in volume and hide their errors in timestamps. Disputing them is mostly a matter of lining up the right records, which is exactly the work an agent is good at." },
      { t: "h2", text: "From invoices to a dispute packet" },
      { t: "p", text: "Each invoice is matched to gate logs and free-time terms, and every disputed line carries the record that proves it." },
    ],
  },
  {
    slug: "models-per-step",
    title: "Choosing models per step without rewriting the workflow",
    dek: "The workflow should outlive any one model. Here is how Grain keeps them apart.",
    category: "Engineering", date: "Oct 8, 2026", read: "5 min", cover: "models",
    body: [
      { t: "p", text: "Models change every few months. Workflows that are welded to one model have to be rebuilt each time. Grain keeps the two apart: the workflow defines the steps, and each step names the model that suits it." },
      { t: "h2", text: "Swap without breaking" },
      { t: "p", text: "Because evidence and checkpoints are recorded by Grain rather than the model, changing a step's model doesn't change how the run is reviewed." },
    ],
  },
];

export const bySlug = (slug: string) => ARTICLES.find((a) => a.slug === slug);
