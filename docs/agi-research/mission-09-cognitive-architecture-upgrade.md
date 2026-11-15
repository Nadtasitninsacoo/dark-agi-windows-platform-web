# MISSION 09 — COGNITIVE ARCHITECTURE UPGRADE (persistent memory, reasoning loop, outcome learning, calibrated confidence)

Logged 2026-11-15, between Mission 08 Phase 4 and Phase 5. NOT STARTED — this is an external architecture review the user asked be recorded before any inspection or implementation begins. Explicitly a separate, larger initiative from Mission 08 (Intelligence Command Center): Mission 08 only ever visualizes data that already exists; this mission proposes new backend capability (persistent agent memory, a bounded multi-step reasoning loop, an outcome-learning feedback pipeline, and calibrated confidence) — a materially different, higher-risk category of work, since the highest-risk piece (the reasoning loop) touches `AgentsService`, the same execution path the day's separate approval-gating fix (see backend `docs/architecture/roadmap.md`) just finished restoring.

## How this came about

After Mission 08 Phase 3 (AGI Core & Operations), the user asked directly why no real "cognitive state" data exists in the platform and whether visualizing agent activity gives the system actual thought. Answered plainly in conversation: each `AgentRun` is one bounded request/response cycle, nothing reasons *between* runs, no model provider exposes a queryable reasoning state, and a dashboard cannot grant capability that doesn't exist — real continuous reasoning would be separate, substantial architecture work, not a dashboard phase.

The user then asked to plan that work before continuing Mission 08's Phase 5, and asked whether I wanted a second opinion from GPT first. I have no live API connection to another model in this environment, so I wrote a self-contained consultation prompt (below) summarizing the platform's real, verified state (from Mission 08 Phase 1's capability matrix) and the non-negotiable platform rules, and the user took it to GPT directly. GPT's full response is pasted verbatim below it.

## The consultation prompt (written by Claude, 2026-11-15)

```
You are consulting as an independent AI systems architect for a second opinion on a real, running platform (not a thought experiment). I want you to be rigorous and skeptical, not encouraging — push back where the plan is unrealistic or overclaiming.

CONTEXT — the platform

"DARK AGI" is a working security-operations platform (NestJS backend + Next.js frontend, real PostgreSQL, real Windows process execution) that also runs a parallel "AGI research program" with a stated goal of progressing through three levels:
- Level 1 (done): information retrieval, search, analysis, memory, retrieval.
- Level 2 (current target): autonomous engineering — planning, coding, tool creation, execution, testing, simulation.
- Level 3 (long-term, unproven): general intelligence research — discovery, novel algorithms, cross-domain reasoning, verified knowledge.

Current REAL state, verified by direct code inspection (not aspirational):
- Agents are single-shot: one bounded request/response cycle per "run." A run can delegate to sub-agents (tracked as a real parent/child tree) and can request tools, which become jobs that may need human approval. There is no process that reasons *between* runs — nothing is "thinking" when no run is active.
- "Memory" is a flat list of short text notes a human operator writes and attaches to an agent; agents do not write their own memory, and there is no knowledge graph connecting notes.
- A "Diagnostic Hypothesis Ledger" exists (Heuer's Analysis of Competing Hypotheses — deterministic ranking over operator-authored hypotheses/evidence, with ties reported honestly rather than guessed) but has no persistence and isn't wired into any live workflow.
- An "Evidence-Bound Claim Ledger" exists and IS wired into production: when an agent's run makes a claim, it can be checked against the run's own real tool-call evidence and marked VERIFIED / CITED_UNCHECKED / UNSUPPORTED / etc. This is real but narrow — it verifies claims against already-finished evidence, it does not drive reasoning.
- A "research cycle" prototype exists implementing 6 of a planned 10 stages (hypothesis generation, experiment design, simulation, evidence verification, result analysis, hypothesis evaluation) as a deterministic orchestrator with no real model plugged in yet, and no persistence.
- An eval harness exists (38 synthetic test cases probing for things like ungrounded claims) but runs only as a standalone script, with no persisted history of runs over time.
- Non-negotiable platform rules I must preserve: the backend remains the sole security-authority; agents can never grant themselves additional permissions or bypass human approval for consequential actions; nothing may be presented as more capable or more "intelligent" than it measurably is; no claim of having achieved AGI or any scientific discovery without reproducible evidence.

THE QUESTION

I want a real engineering roadmap (not marketing language, not a claim that this becomes AGI) for giving these agents more of the following, incrementally and verifiably:
1. Persistent working memory *within* and potentially *across* a task, not just a single-shot response.
2. A real reasoning loop — generate, critique, revise — rather than one-shot output, using the claim-verification and hypothesis-ranking pieces that already exist as building blocks rather than from scratch.
3. Continual learning from real outcomes: today, nothing that happens (a job succeeds, a job fails, a hypothesis turns out wrong) ever feeds back into how an agent behaves next time. What's a credible, scoped way to close that loop without needing to fine-tune a model?
4. Meta-cognition: an agent reporting a real, calibrated confidence/uncertainty about its own output, rather than just a confident-sounding answer every time.

For each of these four, I want:
- The strongest real published approaches you know of (e.g. ReAct, Reflexion, memory-augmented/agentic architectures, debate/self-critique methods, confidence calibration techniques) and which actually apply to a tool-using, delegation-capable agent system like this one, not a purely conversational one.
- A concrete, buildable first step for THIS platform specifically (given the real pieces listed above), not a generic description.
- The honest failure modes and overclaiming risks of each approach — where people tend to fool themselves into thinking a system is "reasoning" when it's actually just producing plausible-sounding text.
- What should explicitly NOT be attempted yet (e.g. anything requiring fine-tuning, anything that would let an agent self-modify its own permissions or bypass human approval, anything presented as more than it is).

Be concrete, be skeptical of hype (including your own), and prioritize what's realistic to build and independently verify over what sounds impressive.
```

## GPT's response (pasted verbatim, 2026-11-15)

DARK AGI — Independent Systems Architecture Review

### Executive assessment

My assessment is that DARK AGI has several useful engineering foundations, but its current architecture does not yet support the stronger claims associated with persistent autonomous reasoning, continual learning, or metacognition.

The most important distinction is this: DARK AGI currently has components that can support a more sophisticated agent architecture. It does not yet have an integrated learning-and-reasoning system.

Classification of the four objectives:

| Capability | Current state | Engineering assessment |
|---|---|---|
| Persistent working memory | Operator-authored notes | Needs a new memory lifecycle |
| Iterative reasoning | Single-shot agent runs | Needs a bounded execution loop |
| Continual learning | No outcome feedback loop | Needs evaluation-driven adaptation |
| Metacognition | No calibrated confidence | Needs empirical calibration |

"I would not start by adding more agents, more prompts, or more sophisticated dashboards." Proposed execution model change:

Current: Agent receives objective → One model request → Response/Tool requests → Run ends.

Proposed: Objective + task context → Retrieve relevant memory and evidence → Plan → Act → Observe → Critique → Verify → Revise → Complete/Escalate/Request approval → Persist outcomes → Evaluate → Improve future task selection.

"This is a proposed architecture, not a description of functionality that already exists." Important qualification: an iterative agent is not necessarily a more intelligent agent — it may simply make more model calls, repeat mistakes, or produce more elaborate explanations; we need to measure whether iteration improves task outcomes.

#### 1. Persistent working memory (recommended first implementation; no model fine-tuning required)

Three published approaches are particularly relevant:

- **Generative Agents** (Park et al. 2023) — experience observations, memory storage, memory retrieval, reflection synthesizing higher-level memories, planning from retrieved memories. Relevant to retaining what happened during previous tasks. Caveat: demonstrated believable behavior in a controlled social simulation, not reliable engineering competence — useful architecture, not evidence of general intelligence.
- **MemGPT** (Packer et al. 2023) — hierarchical memory management; moves information into/out of the active context instead of putting everything in the context window. Applicable to large codebases, long investigations, extended task histories.
- **Reflexion** (Shinn et al. 2023) — stores textual reflections generated from previous task outcomes, retrieved during future attempts; improves subsequent attempts without changing model weights. Limitation: a reflection is not necessarily a correct lesson — wrong feedback means the agent remembers the wrong lesson.

Recommended architecture for DARK AGI: not a full knowledge graph as the first step. A structured PostgreSQL memory system with four categories:

1. **Working Memory** — current task context, plans, intermediate results, unresolved questions, active decisions.
2. **Episodic Memory** — what happened during previous runs, tool calls, jobs, approvals, failures, outcomes.
3. **Semantic Memory** — verified technical knowledge, reusable facts, constraints, system documentation, established findings.
4. **Procedural Memory** — verified workflows, successful procedures, known failure patterns, reusable engineering strategies.

Plus a Memory Retrieval and Ranking Engine (task relevance, recency, reliability, provenance, permissions) and an Agent Context Builder (only relevant, authorized memories enter the model context).

**First buildable milestone — Memory v1**: add persistent task memory without changing the existing agent's fundamental execution behavior. Proposed entities: `agent_memories` (persistent memory records), `memory_sources` (source runs/jobs/evidence), `memory_retrieval_logs` (which memories were retrieved and why), `memory_feedback` (whether a retrieved memory helped or harmed an outcome). Illustrative record shape (not an existing project interface):

```ts
interface AgentMemory {
  id: string;
  agentId: string;
  category: "WORKING" | "EPISODIC" | "SEMANTIC" | "PROCEDURAL";
  content: string;
  sourceRunId: string | null;
  sourceJobId: string | null;
  confidence: number | null;
  verificationStatus: "UNVERIFIED" | "VERIFIED" | "REJECTED";
  createdAt: Date;
  updatedAt: Date;
}
```

Critical design decisions: every memory must have provenance; agent-generated memories begin unverified; retrieval must be scoped to the requesting agent and its permissions; memories need expiration/review policies where appropriate; conflicting memories must stay distinguishable; a memory must never silently become an authoritative security policy; the agent can propose memory updates, but the memory service validates and persists them. Recommendation: PostgreSQL as the initial source of truth; do not introduce a vector database until retrieval benchmarks show ordinary structured/full-text search is insufficient.

Verification: a fixed set of 30-50 repeatable tasks, comparing agent without memory vs. with memory retrieval vs. with memory retrieval + provenance filtering, measuring correct-retrieval rate, irrelevant-memory rate, task completion rate, repeated-error rate, token consumption, latency. "A system that remembers more but performs worse is not an improvement."

#### 2. Real reasoning loop: Generate → Critique → Revise (highest architectural priority)

Relevant research:

- **ReAct** (Yao et al. 2022) — interleaves reasoning and actions; directly relevant to DARK AGI's existing tool-call/job architecture.
- **Self-Refine** (Madaan et al. 2023) — generate, critique, revise; low-complexity starting point, but the same model can reproduce its own incorrect assumptions during critique.
- **Reflexion** (Shinn et al. 2023) — incorporates task feedback into subsequent attempts; bridges the reasoning loop and the persistent memory architecture.
- **Multi-Agent Debate** (Smit et al. 2024) — important because it challenges the assumption that debate automatically improves accuracy; their benchmark found debate did not reliably outperform self-consistency/ensembling. "I would therefore not make multi-agent debate the foundation of DARK AGI reasoning."

Proposed architecture: the existing Evidence-Bound Claim Ledger is the most valuable component to reuse — make it part of the execution loop instead of building another verification framework:

1. OBJECTIVE — receive the task and its authorization context.
2. PLAN — generate a structured plan and expected outcomes.
3. EXECUTE — perform permitted actions through registered tool adapters.
4. OBSERVE — collect actual tool results and job outcomes.
5. GENERATE CLAIMS — extract claims the agent is relying on.
6. VERIFY — pass claims and supporting evidence to the existing Claim Ledger.
7. CRITIQUE — identify unsupported claims, missing evidence, contradictions, incomplete objectives.
8. REVISE — produce a revised plan/response using the verification results.
9. STOP OR CONTINUE — complete, continue within budget, or escalate for human approval.

Important distinction: the Claim Ledger currently checks claims against completed evidence from a run — it does not establish a claim is universally true (e.g. "a tool returns HTTP 200" supports "a service responded," not "the service is secure").

Concrete first implementation: introduce an `AgentRunController` (or equivalent) managing multiple bounded model invocations under one parent run:

```ts
interface ReasoningIteration {
  iteration: number;
  phase: "PLAN" | "ACT" | "OBSERVE" | "VERIFY" | "CRITIQUE" | "REVISE";
  input: unknown;
  output: unknown;
  claimsVerified: number;
  claimsUnsupported: number;
  startedAt: Date;
  completedAt: Date | null;
}
```

"The actual implementation should use the project's existing typed contracts rather than introducing unknown or arbitrary payloads where stronger types are available." Execution limits every reasoning loop needs: max iteration count, max model-call count, max elapsed time, max token/monetary budget, max tool-job count, cancellation support, persisted execution state, recovery after worker restart. Start with a max of 3 iterations for a low-risk, read-only benchmark; do not automatically grant additional execution permissions when the loop repeats.

Human approval must work independently of reasoning: backend checks authorization → creates an approval requirement → operation waits → human approves/rejects → only then dispatched. "A critique or revised plan must not convert an unapproved operation into an approved one."

Success benchmark: compare single-shot vs. iterative on task completion, evidence-supported claims, unsupported claims, tool execution failures, average model calls, cost per successful task. "The important metric is not how many reasoning steps the agent performs. It is whether it produces better independently verified outcomes at an acceptable cost."

#### 3. Continual learning from real outcomes (high practical value; no fine-tuning required)

- **Reflexion** — verbal feedback without weight updates: execute → receive external feedback → identify what went wrong → create a reflection → store it → retrieve during a future attempt. Model itself does not need fine-tuning.
- **Generative Agents' memory reflection** — don't store every event as an independent permanent lesson; periodically synthesize related experiences into higher-level knowledge (e.g. three build failures from one incompatible dependency → one reusable compatibility warning, tested against future builds, retaining links to the original events).
- **Evaluation-driven adaptation** — a more conservative engineering recommendation (not a specific paper's solved problem): use actual evaluation results to decide whether a proposed behavioral improvement should be retained.

Architecture: Outcome Learning Pipeline — real task execution (runs/jobs/tools/experiments) → outcome collector (success/failure/timeout/rejection/regression) → failure/success analysis (root cause from actual evidence) → lesson proposal (reusable behavioral guidance) → independent evaluation (vs. baseline and regression cases) → approved learning memory (versioned, traceable, reversible).

Concrete implementation: an Outcome Learning Service that first consumes existing platform events rather than executing additional model calls. Event sources: agent run completed, job completed, job failed, approval rejected, hypothesis evaluated, experiment completed, claim verification completed. Suggested shape:

```ts
interface AgentOutcome {
  id: string;
  runId: string;
  agentId: string;
  outcome: "SUCCESS" | "PARTIAL" | "FAILURE" | "CANCELLED" | "BLOCKED";
  taskCategory: string;
  evidenceReferences: string[];
  failureCategory: string | null;
  evaluationScore: number | null;
  evaluatedAt: Date;
}
```

Important: failure is not always agent failure (invalid code vs. tool unavailable vs. DB connection failure vs. human rejection vs. task genuinely impossible) — these must not be treated as equivalent, or the agent may learn the wrong lesson (e.g. must never learn that an authorization rejection means "find another execution path" — it should learn the operation remains blocked). Learning should happen at three levels: A — task-specific, B — agent-specific (verified recurring patterns), C — platform-wide (e.g. a broken tool adapter or API contract change; requires stronger validation since a shared-guidance mistake affects every agent).

How the agent actually improves: do NOT let the model rewrite its own system prompt after every failure. Build a versioned strategy library instead (illustrative, e.g. `TS_BUILD_VALIDATION_V1`, validated, with a numbered procedure and an evaluation history of attempts/successes) — a new strategy version only becomes available after evaluation, and rollback to an earlier version must be possible.

Verification: the current 38-case harness is a useful start but insufficient alone; add persisted evaluation runs, a fixed benchmark version, historical comparison, real task outcomes, regression tests, performance by task category/agent/model version. Central experiment: does an agent with outcome-derived memory perform better on previously unseen tasks than without it? Also test for negative transfer (does learning from one task make the agent worse at another?).

What NOT to implement yet: automatic model fine-tuning, automatic modification of core prompts, unrestricted self-modification, automatic promotion of unverified lessons, rewarding agents simply for producing successful-looking reports, treating every human approval rejection as a technical failure.

#### 4. Metacognition and calibrated confidence (achievable incrementally)

"An AI model saying 'I am 95% confident' does not mean there is a 95% probability its answer is correct. That number may simply be another generated sentence." DARK AGI needs an independently evaluated confidence mechanism.

- **On Calibration of Modern Neural Networks** (Guo et al., ICML 2017) — foundation for confidence calibration; a calibrated model's stated probabilities should match observed correctness frequencies; temperature scaling is one established post-processing method, applicability depending on usable model scores and a suitable calibration dataset.
- **Linguistic Calibration of Long-Form Generations** (Band et al., ICML 2024) — directly addresses communicating confidence in natural-language outputs, relevant to this platform's multi-claim reports; the proposed method is training-based, so treat as research guidance, not an immediate full implementation.
- **Calibrating LLM Confidence by Eliciting Fidelity** (2024) — separates uncertainty about a question from fidelity to the generated answer; confidence shouldn't be treated as a single unquestionable model-generated value.
- **Conformal prediction** — worth investigating once there's sufficient evaluation data; can give statistical coverage guarantees under specific assumptions (appropriate calibration data, exchangeability) — does not automatically guarantee every generated engineering statement is true.

Rather than one `intelligenceConfidence` field, calculate a Confidence Profile across distinct measurements: evidence support (evidence-derived), execution reliability (execution-derived), historical task accuracy (empirically calibrated), information completeness (measured heuristic), model-reported confidence (uncalibrated until tested) — these should not be combined into one misleading percentage.

First implementation — a Confidence Evaluation Service, starting narrow (e.g. code-generation tasks with an objective test result). Record per task: model-reported confidence, task category, model id/version, whether the answer passed independent tests, partial correctness, evidence coverage, whether the agent abstained. "The correctness field must come from an evaluator, not from the agent grading itself." Shape:

```ts
interface ConfidenceEvaluation {
  id: string;
  runId: string;
  agentId: string;
  taskCategory: string;
  reportedConfidence: number | null;
  evaluatedCorrectness: boolean | null;
  evidenceCoverage: number | null;
  evaluationMethod: string;
  modelVersion: string;
  evaluatedAt: Date;
}
```

Metrics: **Brier Score** (mean squared difference between predicted probability and actual binary outcome, lower is better), **Expected Calibration Error** (average confidence vs. observed accuracy across confidence bins — depends on binning choices, can hide calibration errors), **selective accuracy** (accuracy when the agent chooses to answer vs. abstain — an agent correctly saying "insufficient evidence" may be more reliable than one that always answers; abstention is an established NLP research direction).

What confidence should eventually change: low confidence → request more evidence; insufficient evidence → abstain; conflicting evidence → preserve multiple explanations; high confidence with strong evidence → a better-supported conclusion. "But confidence must not authorize actions. A 99% confidence estimate must never bypass approval, authorization, scope validation, or backend policy." Honest limitation: calibration on code-generation tasks does not establish calibration on cybersecurity, math, or physics tasks — it's task-dependent and must be re-evaluated per category and refreshed when model/tools/prompts/environment change.

#### 5. How the four systems should connect

Not four isolated features — one integrated feedback architecture: Task/Research Objective → Memory Retrieval (working/episodic/semantic/procedural) → Reasoning Controller (Plan→Execute→Observe→Critique→Revise) → Evidence & Hypothesis Evaluation (Claim Ledger + persisted Hypothesis Ledger) → Outcome Evaluation (independent tests + confidence) → Learning and Memory Update (versioned lessons, evaluated confidence, historical record) → relevant information retrieved for future tasks. The Diagnostic Hypothesis Ledger should be a separate evaluation service within this architecture (ranks competing hypotheses from supplied evidence; not an autonomous scientific-discovery mechanism). The six-stage research prototype should eventually use the same memory/evidence/experiment/evaluation infrastructure rather than a second, unrelated execution framework.

#### 6. Recommended engineering roadmap (sequential, not all four capabilities at once)

1. **Milestone 1 — Persistent Memory** (start here). Objective: make previous experiences available to future runs. Deliverables: Postgres memory persistence, categories, source provenance, retrieval, feedback. Acceptance: an agent can retrieve relevant information from a previous run, and irrelevant/unauthorized memories are excluded.
2. **Milestone 2 — Reasoning Controller**. Objective: replace single-shot execution with bounded iterative execution. Deliverables: parent-run orchestration, iteration state, plan-and-revise, Claim Ledger integration, execution limits, cancellation/recovery. Acceptance: a task can undergo multiple iterations, and independent verification demonstrates improvement over single-shot execution.
3. **Milestone 3 — Outcome Learning**. Objective: use actual outcomes to improve future task strategies. Deliverables: outcome collection, failure classification, lesson generation, strategy versioning, regression evaluation. Acceptance: evaluated lessons improve performance on held-out tasks without unacceptable regression elsewhere.
4. **Milestone 4 — Confidence & Metacognition**. Objective: make uncertainty measurable. Deliverables: confidence records, independent correctness evaluation, Brier Score, ECE, selective prediction, abstention behavior. Acceptance: confidence estimates are empirically calibrated within defined task categories, with sufficient evaluation data.
5. **Milestone 5 — Integrated Research Cycle**. Objective: connect the existing research prototype with the preceding infrastructure. Deliverables: persistent hypotheses, experiment history, evidence relationships, research memory, independent result evaluation, reproducible reports. Acceptance: a research cycle can be repeated, audited, and independently evaluated using persisted evidence.

#### 7. What to explicitly prohibit for now (engineering boundaries, not optional)

Build: persistent memory, bounded reasoning loops, outcome-based learning, empirical confidence calibration. Defer: automatic model fine-tuning, autonomous system-prompt rewriting. Prohibit: self-granted permissions, bypassing human approvals, unrestricted autonomous execution, claims of achieved AGI. Also defer: large-scale multi-agent debate, autonomous knowledge-graph construction without provenance, unrestricted background reasoning processes, automatic modification of production code by learning agents, claims that increasing memory size automatically increases intelligence. "There is no engineering reason to introduce these complexities before the core feedback loop is proven."

#### 8. Infrastructure changes worth planning now

Logical data domains (not an instruction to create eight tables immediately — some may fit existing tables): agent memory, reasoning iterations, run observations, outcome evaluations, learning proposals, strategy versions, confidence evaluations, research hypotheses, experiment records.

Three architectural rules: (1) persist state, not just logs — a run must be resumable after a worker restart without losing iteration state or repeating consequential operations; (2) make events traceable — every conclusion traces to the task, model version, tool results, evidence, and evaluation that produced it; (3) separate intelligence from authority — the reasoning system proposes actions, the backend independently decides whether they're permitted.

#### 9. How to measure whether DARK AGI is actually improving

Establish a benchmark program before Milestone 1. Keep the current 38 synthetic cases as an initial benchmark, but don't rely on them alone. Build a versioned benchmark across four categories (Memory, Reasoning, Learning, Metacognition), storing for every run: benchmark version, model/version, prompt/strategy version, agent/memory/tool configuration, task inputs, actual outcomes, evaluation results, execution cost, failures/regressions. Use held-out test cases to prevent memorizing the benchmark; compare against a single-shot baseline and ablation baselines (memory/learning/critique individually disabled) to see which component actually contributes.

#### 10. Final architectural judgment

"Build an evidence-driven agent system first. Not an artificial AGI simulation." The most valuable near-term achievement: an agent that remembers relevant verified experiences, plans and executes bounded tasks, examines actual execution results, identifies unsupported conclusions, revises its approach when necessary, learns from independently evaluated outcomes, knows when evidence is insufficient, and preserves a complete audit trail. "None of these alone establishes general intelligence. Together, however, they form a credible foundation for a more capable autonomous engineering and research platform." Final caution: verbalized confidence is particularly prone to overconfidence (per uncertainty-estimation research) — never display model-generated confidence as calibrated probability without independent testing.

#### 11. What to do first

Do not start with a complete rewrite of the agent architecture. Start with Milestone 1: Persistent Memory. Before writing code, inspect the actual database schema and execution lifecycle, then design the smallest compatible persistence layer, deliberately narrow: persist task observations, persist agent-generated memory proposals, retrieve relevant memories for subsequent runs, track provenance, evaluate retrieval quality. Only after that works should the reasoning controller be added. Suggested next step: turn this review into a series of implementation instructions for Claude with a separate approval gate after every milestone, starting with "DARK AGI — MILESTONE 1: Persistent Working & Episodic Memory Architecture" — Claude should inspect the existing repositories and schema, produce an implementation plan, and stop before modifying files.

## Claude's cross-check against the real codebase (2026-11-15)

Agree with the overall shape and sequencing — it matches the platform's own established "inspect → plan → stop for approval → implement one milestone at a time" discipline (same pattern Mission 08 has been using), reuses EBCL/DHL rather than duplicating them (matches Mission 08 Phase 1's own recommendation), and keeps approval/authorization strictly independent of reasoning output (matches today's separate approval-gating restoration work).

One real conflict to resolve before Milestone 1 starts: a Prisma model literally named `AgentMemory` already exists in production (`prisma/schema.prisma`) — operator-authored notes, with its own CRUD endpoints and UI (the per-agent Memory panel, plus the cross-agent `MemoryOverviewPanel` built in Mission 08 Phase 4 earlier the same day). GPT's proposed `agent_memories`/`AgentMemory` interface (with `category: WORKING|EPISODIC|SEMANTIC|PROCEDURAL`, `verificationStatus`, etc.) is a different, AGI-formed concept with the same name. Milestone 1's own inspection phase needs to resolve this collision explicitly — e.g. a `source: 'OPERATOR' | 'AGENT'` discriminator on one unified model, or a distinctly named new model — before any schema change, so the two don't silently merge into something inconsistent with what Phase 4's UI already promises its users ("operator-curated, not AI-learned").

The reasoning-loop milestone (2) is the highest-risk piece: it changes `AgentsService`'s core execution path, which is the same file the day's separate, independently-tracked approval-gating fix just finished restoring (see backend `docs/architecture/roadmap.md`, "Approval-gating restored platform-wide"). Any implementation there needs its own regression check against that fix, not just against this mission's own acceptance criteria.

## Status

NOT STARTED. User said to log this plan before starting anything. Next step, when the user is ready: Milestone 1 (Persistent Memory) inspection-only pass — read the real schema and `AgentsService`/`agents.contract.ts`, resolve the `AgentMemory` naming collision, and produce an implementation plan — stop before touching any file, per both this mission's own and GPT's recommendation.
