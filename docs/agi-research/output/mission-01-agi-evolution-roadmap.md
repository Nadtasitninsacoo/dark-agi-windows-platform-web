# Mission 01 — AGI Evolution Research: findings and ranked roadmap

Date: 2026-11-13. Status: analysis and design only. **No code has been written and nothing has been benchmarked.** No claim of AGI or Level 3 is made.

## 0. Method and honesty about evidence

Read for this report (backend `dark-agi-backend`, branch `feat/scope-enforcement-asset-authorization`; frontend `dark-agi-frontend`):

- `src/agents/agents.service.ts` (full), `agent-catalog.ts` (full), `agent-requests.ts` (constants only)
- `prisma/schema.prisma` models `Agent`, `AgentMemory`, `AgentRun`, `Job`, `JobSequence*`
- `docs/architecture/roadmap.md`, `src/mcp/mcp.service.ts` (head), `src/attack-graph/attack-graph-reasoning.service.ts`, `src/execution/sequence.service.ts` (head), `test/integration/` file list
- Frontend `src/lib/commands.ts`, `src/lib/modules.ts`

NOT read: `ai-gateway.service.ts` internals, `execution.service.ts`, `graph.service.ts`, `findings.service.ts`, the frontend suggest-next/sequence panels, and the integration test bodies. Any statement about those is marked *unverified*.

External literature was **not** consulted in this pass (no web research was run). "Existing approaches" below are named from general knowledge and must be re-checked against current sources before anything is cited as prior art.

## 1. Existing system analysis (verified from code)

DARK AGI's AI layer is currently a **governed, single-shot recommender with bounded one-way delegation**, not a closed-loop autonomous agent.

| Aspect | What the code does | Evidence |
|---|---|---|
| Agent turn | One model call per run. Tool requests and delegation requests are parsed from that one reply. | `AgentsService.execute` |
| Tool requests | Converted to `Job`s as actor `AGENT`, `canApprove: false`; always wait for a human. **The agent never sees the job's result.** | `toolRequest()`, comment "always requires human approval" |
| Delegation | Child runs execute synchronously in-process; their text output is fed back for exactly one synthesis turn, whose own requests are rejected. Limits: depth 2, 3 delegations/run, 10 runs/tree. | `MAX_*` constants, synthesis block |
| Memory | `AgentMemory`: operator-written text notes, max 50/agent, newest 20 injected verbatim. Agents cannot write memory. No retrieval, no relevance ranking, no provenance. | `addMemory`, `MEMORIES_IN_CONTEXT`; roadmap says "Agents do not yet write their own memory" |
| Learning | None. `AgentRun` stores output, tokens, latency, and request decisions, but nothing consumes it to change behaviour. | schema, `finish()` |
| Self-evaluation | None. A run is `SUCCEEDED` if the model call returned, not if the answer was correct. | `finish()` |
| Planning | Prompt-only decomposition by ORACLE. A separate `JobSequence` exists (ordered jobs, pauses for approval) but is operator-built, not agent-planned. | `sequence.service.ts` |
| Auto mode | A scheduler runs an agent every 15 min on a generic "perform your standard duties" task. Outputs are not compared with anything. | `triggerAutoRun` |
| Structured reasoning assets | `GraphNode/GraphEdge` plus AI ranking of already computed candidate paths; `Finding`, `Evidence`, `Ioc`. | `AttackGraphReasoningService` |
| External agent access | MCP server: each operation is a tool, calls go through the normal job path. | `McpService` |
| Evaluation | No benchmark, eval, or golden-task code anywhere in `src` (grep for eval/benchmark only hit unrelated words). Integration tests check plumbing (memory in context, denials, audit), not answer quality. | grep, `test/integration` listing |
| Doc drift | `roadmap.md` still says agent tool requests are "parsed, recorded and denied", but the code now queues them as jobs. | roadmap vs `toolRequest()` |

Security foundation to preserve: scope, forced human approval for `AGENT` actors, hash-chained audit, delegation allow-lists, fixed capability policy in code. Every proposal below keeps these.

## 2. Limitations, causes, and proposed approaches (the ten areas)

Legend for "existing approaches": named from general knowledge, **not freshly researched**.

### L1. Reasoning limitations
- **Limitation here:** one model call, no inspection of results, no verification of claims. A finding the model "reasons out" is never checked against a tool result.
- **Why:** open-loop design; tool outputs never re-enter the context.
- **Existing approaches:** chain-of-thought prompting, ReAct-style act-observe loops, self-consistency voting.
- **Weaknesses:** CoT text can be unfaithful; ReAct loops drift or waste budget without stop rules; self-consistency costs N calls.
- **Proposal:** *Claim-grounded reasoning.* Require the agent to emit claims as structured records `{claim, support: [jobId|findingId|evidenceId], confidence}` and have a deterministic checker reject any claim whose cited artifact does not exist or does not contain the cited value. Reasoning stays free-form; only claims are checked.
- **Compute:** one extra deterministic pass, no extra model call.
- **Benchmark:** fraction of claims with valid, verifying citations; hallucinated-artifact rate versus the current free-text baseline.

### L2. Long-term memory
- **Limitation:** operator-curated, FIFO-by-recency, 20 notes injected blindly, no write path from experience.
- **Existing:** vector retrieval (RAG), summarisation memory, episodic/semantic split, knowledge graphs.
- **Weaknesses:** embedding retrieval has no notion of truth or staleness; agent-written memory can poison itself (a wrong belief gets reinforced).
- **Proposal:** *Provenanced episodic memory.* Agents propose memories; each stores source `agentRunId`/`jobId`, a verification status (`UNVERIFIED | CONFIRMED | REFUTED`), an expiry, and is only injected if retrieved as relevant to the task (keyword/BM25 first, no new dependency). Memory writes need human or independent-verifier confirmation before `CONFIRMED`, and agents may not edit confirmed memories (no self-granting of authority).
- **Compute:** negligible; PostgreSQL full-text search is already available.
- **Benchmark:** recall@k of the correct prior fact on seeded scenarios; contamination rate (wrong memories injected) versus the current newest-20 baseline.

### L3. Continual learning
- **Limitation:** zero. Run history is write-only.
- **Existing:** fine-tuning, RLHF, in-context learning from examples, prompt optimisation.
- **Weaknesses:** fine-tuning is out of scope on this platform and unsafe without evals; prompt self-editing can silently weaken guardrails.
- **Proposal:** *Eval-gated prompt-and-memory improvement.* No weight training. Candidate instruction or memory changes are proposed, scored on the eval harness (L11-to-be below), and only promoted if they beat baseline and pass the safety checks; promotion needs human approval and is reversible (stored as versioned override). `PLATFORM_RULES` and capability policy remain non-editable by agents.
- **Benchmark:** score delta on a held-out task set; zero regressions on the safety checks.

### L4. Long-horizon planning
- **Limitation:** plans exist only inside prompts; a 15-minute auto run has no state across runs.
- **Existing:** hierarchical task networks, LLM planners, plan-and-execute.
- **Weaknesses:** plans go stale after each tool result; no replanning trigger.
- **Proposal:** *Plan as data.* Let ORACLE emit a plan that is compiled into a `JobSequence` draft (reusing the existing table and the approval pause), with explicit success predicates per step. The human approves the draft; the sequencer already stops on failure. Replan only on a failed predicate.
- **Benchmark:** steps completed per human approval; plan success rate on multi-step scenarios versus a hand-built sequence.

### L5. Cross-domain knowledge transfer
- **Limitation:** each specialist works in isolation on text; shared structure (graph, findings, IOCs) is not exposed to agents as queryable facts.
- **Existing:** knowledge graphs, retrieval over shared stores, ontologies.
- **Weaknesses:** schema mismatch across domains; retrieval returns related but irrelevant context.
- **Proposal:** *Shared fact layer.* Expose read-only, typed queries over `Finding`/`Evidence`/`Ioc`/`GraphNode` to agents (agent-scoped, respecting each agent's `toolCategories`). Measure whether a vulnerability-domain fact improves a forensics-domain conclusion.
- *Unverified:* how `GraphService` and `Finding` ingestion actually normalise data.
- **Benchmark:** paired scenarios needing a fact from another domain; accuracy with versus without the fact layer.

### L6. Autonomous problem decomposition
- **Limitation:** decomposition quality is unmeasured; ORACLE can delegate at most 3 times, and children cannot ask follow-ups.
- **Existing:** decomposition prompting, tree-of-thoughts, task graphs.
- **Weaknesses:** model produces plausible but non-independent subtasks.
- **Proposal:** score decompositions on the harness: coverage of required sub-questions, redundancy, and correct specialist routing, against labelled scenarios. Improve only against this measured score.

### L7. Self-evaluation and error correction
- **Limitation:** none; status only reflects transport success. The same model also generates its own summary.
- **Existing:** LLM-as-judge, critique-and-revise, verifier models, test-time checks.
- **Weaknesses:** a judge from the same model shares its blind spots; judges are biased toward fluent answers.
- **Proposal:** *Independent verifier.* A different model (the registry supports multiple providers) plus deterministic checks reviews claims against cited artifacts. The generating agent cannot mark its own run verified. Disagreement is surfaced, not averaged away.
- **Benchmark:** agreement of verifier with human labels on a seeded set; false-accept rate on deliberately wrong answers.

### L8. Multi-agent coordination
- **Limitation:** strictly tree-shaped, synchronous, text-only handoffs truncated at 12,000 chars; no shared blackboard, no conflict detection beyond the prompt.
- **Existing:** blackboard architectures, debate, role-based crews.
- **Weaknesses:** more agents often add cost and correlated errors without accuracy gains; this must be measured, not assumed.
- **Proposal:** *Typed handoffs plus contradiction detection:* children return `{claims[], artifacts[], open_questions[]}`; the parent runs the deterministic checker from L1 and flags conflicting claims. Test whether multi-agent beats single-agent on the same budget; keep it only if it does.

### L9. Scientific reasoning
- **Limitation:** no mechanism to hold competing hypotheses or test them; threat-intel is an IOC registry, not analysis.
- **Proposal:** deferred to Missions 03 and 05. Record prerequisite: L1 claim checking and L7 independent verification must exist first, otherwise a "discovery" engine only produces convincing text.

### L10. Novel algorithm discovery
- **Limitation:** none present. Not a near-term target here.
- **Proposal:** deferred to Mission 02/05. Classification: **E, long-term speculative**, until an eval harness can tell an improvement from noise.

### L11 (added, foundational). No measurement
- **Limitation:** there is no way to say whether any change made DARK AGI better. Every other item depends on this.
- **Proposal:** build the evaluation harness first (Milestone 1).

## 3. Ranked AGI Evolution Roadmap

Classification per the Master Directive: A immediately implementable, B needs research, C needs prototype, D needs simulation/experimentation, E speculative.

| Rank | Milestone | Addresses | Class | Backend change | Needs DB change? |
|---|---|---|---|---|---|
| **1** | **Agent Evaluation Harness** (golden tasks, deterministic scorers, baseline run of the current agents) | L11, enables L1–L8 | **A** | new `src/evals/` module, test fixtures | optional (`EvalRun` table); can start file-based |
| 2 | Claim-grounded outputs plus deterministic citation checker | L1, L7 | A/C | agent protocol extension, checker | store claims in `AgentRun.requests`-style JSON first |
| 3 | Closed loop: feed approved job results back to the agent (bounded observe-act turns, token and turn budgets, human approval unchanged) | L1, L4 | C | `AgentsService` loop, run resumption | likely new run state (e.g. awaiting-approval); needs approval |
| 4 | Independent verifier agent (different model) gating "verified" status | L7 | C | verifier service, run metadata | small |
| 5 | Provenanced, retrievable, agent-proposed memory | L2, L3 | C | memory model change | **yes, needs approval** |
| 6 | Plan-as-data → `JobSequence` draft with success predicates | L4, L6 | C | planner to sequence compiler | none initially |
| 7 | Shared typed fact layer across domains | L5 | B | read-only query API | none |
| 8 | Typed handoffs and contradiction detection | L8 | C | contract change | none |
| 9 | Eval-gated prompt/memory promotion | L3 | D | versioned overrides | yes |
| 10 | Scientific reasoning, algorithm discovery | L9, L10 | E | deferred to Missions 02, 05, 03 | n/a |

**First milestone: Agent Evaluation Harness.** Reason: items 2–9 each claim an improvement; without a harness and a recorded baseline none of those claims can be verified, and the Master Directive forbids declaring success without independent verification.

## 4. Milestone 1 — design (prototype specification, not yet built)

**Goal:** a repeatable way to measure agent behaviour and compare a change against a recorded baseline.

**Scope:** offline, deterministic where possible; never touches real targets; no new permissions.

**Components**
1. `EvalCase`: `{id, domain, agent, task, fixtures, expected}` where `fixtures` are canned tool outputs (e.g. a saved nmap result), so no scan is ever executed.
2. Runner: calls the existing agent path with a **mock/local model gateway** for CI determinism, and optionally a real model for a manual run. Records model id, temperature, seed (if any), tokens, latency.
3. Scorers (deterministic, no model judging in v1):
   - `parse_validity`: did the structured request protocol parse (valid vs `invalid` decisions);
   - `policy_compliance`: were out-of-category tool requests produced (these must be denied) and were delegation limits respected;
   - `grounding`: for every number/host/port/CVE the answer asserts, does it appear in the fixture (string-match check, catches invented data, which `PLATFORM_RULES` forbids);
   - `refusal_correctness`: on prompts that ask for out-of-scope/unauthorised actions, did it refuse.
4. Report: JSON plus a short markdown table, stored under `docs/agi-research/output/eval/`, including baseline versus candidate with simple paired statistics (bootstrap CI over cases; no claim from fewer than ~30 cases).

**Baseline:** the current agents, current prompts, unchanged, run N times per case (to measure the model's own variance before comparing anything).

**Success criteria for the milestone itself**
- ≥ 30 labelled cases across at least 4 domains, including ≥ 8 adversarial/out-of-scope cases and ≥ 6 data-grounding traps (fixture lacks the fact the prompt invites inventing).
- Harness reruns reproduce the same scorer outputs for identical model responses (deterministic scoring).
- Baseline report committed, with measured run-to-run variance.
- Harness has its own tests: a deliberately bad answer must score worse than a good one.

**Risks / limits:** string-match grounding can false-flag paraphrases; fixtures can bias toward what we thought of; LLM judge deliberately excluded in v1. Hand-labelled cases are authored by the same team, so independent review is still required.

**Security:** harness never calls `ExecutionService.submit`; fixtures are inert text; it must not weaken or bypass scope/approval/audit. Using real providers sends fixture text to an external API, so fixtures must contain no real client data.

## 5. Open questions for the user

1. May I run Milestone 1 against a real model provider (cost and data leave the machine), or only against a local/mock gateway?
2. Is a new `eval_runs` table acceptable later, or should results stay file-based?
3. Are there real (sanitised) past agent runs in the database to seed cases from? I have not queried the DB.

## 6. Verification status of this report

- Code claims in section 1: verified by reading the cited files.
- Roadmap ranks and the milestone design: **engineering proposals, unverified**; no experiment has been run.
- Literature/prior-art claims: **not researched**; treat as unverified recollection.
- Not run: tests, builds, lint, any benchmark.
