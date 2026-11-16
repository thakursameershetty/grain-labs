/* Content pulled from the current grainlabs.ai (headings verbatim, body copy lightly paraphrased).
   Edit copy here — every version and theme reads from this one object. */
window.GRAIN = {
  hero: {
    eyebrow: "Grain · Governed AI execution",
    title: "AI operations your team can trust to run.",
    emph: "trust to run.",
    sub: "Grain turns a request, its files and its rules into a tracked workflow. It routes the right agent, runs every step, pauses for your decisions and hands back finished work with the evidence attached.",
    chips: ["Durable tasks", "Governed agents", "Human approvals", "Evidence with every output"]
  },

  how: {
    title: "From request to reviewed output.",
    sub: "Every job becomes a tracked workflow, with task state, approvals and evidence attached from intake to delivery.",
    caseName: "Example run · Patient healthcare-bill advocacy",
    steps: [
      { n: "01", t: "Intake",  d: "Request, files, rules and history become one durable task.",                         ex: "Bill + EOB arrive by email" },
      { n: "02", t: "Route",   d: "A versioned agent profile supplies skills, model settings and tool grants.",          ex: "advocacy-case-agent@rev9" },
      { n: "03", t: "Execute", d: "Steps run with checkpoints and retries, and recover from known-good state.",          ex: "Requests itemized bill from hospital" },
      { n: "04", t: "Approve", d: "The run pauses for human decisions and records each one.",                            ex: "Appeal letter held for the advocate" },
      { n: "05", t: "Inspect", d: "Evidence, safe previews and output lineage are reviewed before anything ships.",      ex: "Packet ready with full lineage" }
    ]
  },

  packet: {
    title: "A finished packet your team can review, send, or archive.",
    sub: "Each artifact carries its source references, origin, content hash, checkpoint and run metadata. The output is a packet, not a chat response.",
    name: "Client onboarding packet",
    run: "R-3092-04 · onboarding-packet@rev17",
    stats: [["6", "artifacts"], ["14", "inputs"], ["2", "approvals"]],
    items: [
      ["onboarding-brief.pdf", "Verified"],
      ["implementation-plan.md", "Derived"],
      ["security-questionnaire.xlsx", "Verified"],
      ["kickoff-email-draft.md", "Pending approval"],
      ["stakeholder-map.csv", "Derived"],
      ["risk-exceptions-memo.pdf", "Needs review"]
    ]
  },

  capabilities: {
    title: "Built for work your business repeats.",
    emph: "repeats.",
    sub: "Each capability pairs a business outcome with the mechanism behind it.",
    items: [
      { t: "Work intake",       h: "Capture the request, files, and rules in one place.",          m: "Durable task intake keeps files, context and thread history on a persistent task.",                          e: "An RFP arrives with 48 pages, a pricing matrix and a rule that pricing needs sign-off." },
      { t: "Agent routing",     h: "The right playbook for the job.",                              m: "Registry-backed agent profiles define skills, tool grants and model settings, versioned by revision and hash.", e: "rfp-response@12 can read the drive and CRM and write documents, but can never send email." },
      { t: "Execution",         h: "The steps get done — research, drafts, checks, packaging.",    m: "Agents, tools and sub-agents run with checkpoints, retries, leases and recovery, for hours or days.",        e: "A CRM timeout retries and resumes from the last checkpoint, not from zero." },
      { t: "Approvals",         h: "People approve the consequential decisions.",                  m: "Needs-input, approve, override, stop, resume and reactivate are explicit workflow states.",                  e: "The pricing section waits for a named approver. Nothing ships until it's approved." },
      { t: "Inspection",        h: "See what happened before you trust the result.",               m: "Run inspection exposes task state, journal evidence, safe previews and event provenance.",                   e: "Open the evidence drawer on any deliverable and walk the run from intake to delivery." },
      { t: "Output packaging",  h: "Review-ready deliverables, not chat responses.",               m: "Output plugins produce packets with attribution, lineage and artifact references.",                          e: "One packet with the response, approved pricing, questionnaire answers and the decision record." },
      { t: "Improvement",       h: "Each correction improves the next run.",                       m: "Accepted drafts, correction records, deterministic reruns and lineage-aware routing cut rework.",            e: "Approved proposal language from May is reused in July, with attribution." },
      { t: "Governance",        h: "Audit and control around AI work.",                            m: "PHI-safe runtime logs carry safe metadata only; detailed content lives in private journals.",                e: "A benefits case review runs end to end with no member details in any log line." }
    ]
  },

  models: ["OpenAI", "Anthropic", "GLM", "Open-weight models", "Your own endpoints"],

  uses: {
    title: "Start with a workflow your team already runs.",
    sub: "Eight agent fleets, one shared anatomy: a ledger that cross-checks sources, a deterministic gate against a written rulebook, a reviewer, and human-approved outbound.",
    items: [
      { i: "Healthcare",        t: "Patient healthcare-bill advocacy",          d: "Months-long cases built from bills, EOBs and collection letters, with appeal and charity-care clocks.", f: "advocacy-case-agent",     u: "advocacy-case-agent" },
      { i: "Franchising",       t: "Franchise agreement assembly",              d: "Deal documents become a state-compliant agreement packet.",                                           f: "franchise-agreement-agent", u: "franchise-agreement-agent" },
      { i: "Logistics",         t: "Detention & demurrage invoice disputes",    d: "Rebuilds free-time math and voids defective container charges inside the 30-day window.",            f: "dnd-dispute-agent",        u: "dnd-dispute-agent" },
      { i: "Construction",      t: "Lien waiver exchange & deadline tracking",  d: "Waivers chased every pay cycle and matched to pay apps against per-state lien deadlines.",            f: "lien-rights-sentinel",     u: "lien-rights-sentinel" },
      { i: "Legal & privacy",   t: "Incident notification matrix",              d: "One discovery date mapped against GDPR's 72 hours, HIPAA, 50 state statutes and contract clocks.",   f: "breach-notice-agent",      u: "breach-notice-agent" },
      { i: "Food service",      t: "Supplier contract-price audit",             d: "Checks 300 invoice lines a week against the contracted price list, inside the dispute window.",      f: "case-price-audit",         u: "case-price-audit" },
      { i: "Equipment dealers", t: "Warranty claim recovery",                   d: "Files each warranty repair correctly before the window closes.",                                     f: "warranty-claim-desk",      u: "warranty-claim-desk" },
      { i: "Consumer brands",   t: "Retailer fine recovery",                    d: "A third of retailer compliance fines are wrong. Dispute them before the 30–90 day deadline.",       f: "shipping-fine-recovery",   u: "shipping-fine-recovery" }
    ]
  },

  trust: {
    title: "Governed execution, not a black box.",
    sub: "The controls a CTO asks about, explained so a CEO can sign off. Every capability is granted, every run is evidenced, every output is traceable.",
    pillars: [
      ["Governed agents",       "Profiles, skills, tools and models are versioned, so what runs is what was approved."],
      ["Durable execution",     "Checkpoints, retries and recovery keep long work moving. Failures resume instead of restarting."],
      ["Human approval",        "Grain pauses before consequential actions, and every approval is recorded."],
      ["Inspectable output",    "Each deliverable links back to its runs, artifacts and lineage."],
      ["PHI-safe operations",   "Runtime logs leave out prompts, raw content and sensitive text. Detail lives in private journals."]
    ],
    audit: [
      ["event", '"output.assembled"'],
      ["task", '"TASK-2841"'],
      ["run", '"R-2841-03"'],
      ["profile", '"rfp-response@12"'],
      ["approved_by", '"s.whitfield"'],
      ["artifacts", "3"],
      ["journal", '{ "private": true, "entries": 23 }']
    ]
  },

  cta: {
    title: "Run the work your team repeats every week.",
    sub: "Bring one recurring job. Grain will intake it, route it, run it, and return an output you can inspect."
  },

  run: {
    id: "R-2841-03",
    task: "TASK-2841",
    request: "Draft our response to the Halvorsen RFP. Pricing needs sign-off before it goes out.",
    steps: ["Intake", "Profile selected", "Tool call", "Checkpoint", "Needs input", "Output packet"],
    details: [
      "48-page RFP, pricing matrix and rules stored on the task",
      "rfp-response@12 · 4 tool grants",
      "drive.read · crm.read · docs.write",
      "Checkpoint saved · resumable",
      "Pricing section held for a named approver",
      "Packet ready · lineage verified"
    ]
  }
};
