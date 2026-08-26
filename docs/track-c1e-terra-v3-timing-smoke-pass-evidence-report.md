# Track C1E Canonical Terra v3 Timing Smoke Evidence

Date: 26 August 2026  
Final status: **CANONICAL TERRA V3 TIMING SMOKE — PASSED**  
Overall live-provider acceptance: **UNCHANGED — separate gate**  
Track C2: **PAUSED**  
Track B Phase B2: **PAUSED**

## 1. Authorised boundary

The human OpenAI project owner confirmed revocation and removal of the cache-exposed key and authorised a
replacement Future You project service-account credential for runtime-only Track C process injection.

Exactly one live case was authorised and run:

```text
Can I afford a £650 trip next month?
```

The limits were:

- model `gpt-5.6-terra`;
- reasoning effort `low`;
- one logical case;
- one initial request;
- at most one existing bounded repair;
- no more than two provider requests; and
- maximum estimated spend US$0.10.

No broader corpus, explanation case, Luna, Sol, Track C2 or Phase B2 work was run.

Recovery tag `track-c1e-timing-contract-local-ready-2026-08-26` preserves the completed C1E local contract at
commit `1e986f82e0a257aa33692735719f5f726986395c`.

## 2. Study Buddy shutdown

The earlier preflight blocker was verified before termination using process command, PID, parent/group and
working-directory metadata only. Four processes belonged to one development tree and one process group:

| PID | Role | Verified working directory |
| ---: | --- | --- |
| 50782 | `npm run dev` | `/Users/efeon/study-buddy-v2` |
| 50802 | Study Buddy `next dev` | `/Users/efeon/study-buddy-v2` |
| 50803 | `next-server` | `/Users/efeon/study-buddy-v2` |
| 50808 | Turbopack transform worker | `/Users/efeon/study-buddy-v2` |

`TERM` was sent only to those four confirmed PIDs, leaf-to-parent. They exited normally; force was not used.
Subsequent process checks found no `next dev`, `next-server`, Next build or Turbopack process.

## 3. Successful preflight

Disabled readiness reported only:

```text
Key configured: yes
Provider enabled: no
Selected model: not configured
Provider reachable: no
Model accessible: no
```

This readiness check made no provider request. The remaining preflight proved:

- no persistent `OPENAI_API_KEY` value existed in `.env.local`;
- no Next.js, Next build or Turbopack process was running;
- Future You `.next` was absent;
- the replacement key was absent from tracked files, non-ignored repository files, generated artifacts and client bundles;
- the source dependency-boundary suite passed 12/12;
- the worktree was clean and `git diff --check` passed; and
- the direct server-only evaluation harness starts no Next.js development process, build, Turbopack process or child process.

The OpenAI SDK adapter has automatic HTTP retries disabled. The application retained exactly one possible
validation-repair request, enforcing the two-request maximum.

## 4. Live configuration

| Setting | Value |
| --- | --- |
| API | OpenAI Responses API |
| Model | `gpt-5.6-terra` |
| Reasoning | `low` |
| Interpretation prompt | `fy-conversation-interpretation/3.0.0` |
| Interpretation schema | `fy-conversation-intent/3.0.0` |
| Timing policy | `fy-conversation-timing-policy/1.0.0` |
| Diagnostic contract | `fy-interpretation-diagnostic/2.0.0` |
| Forced function | `submit_conversation_interpretation_v3` |
| Strict schema | Enabled |
| Parallel tool calls | Disabled |
| Provider storage | `store: false` |
| Built-in tools | None |
| Provider conversation state | None |
| Timeout | 12,000 ms |
| Maximum validation repair | 1 |
| Maximum provider requests | 2 |
| Maximum estimated spend | US$0.10 |

The request shape follows the official OpenAI Responses API create contract:
<https://developers.openai.com/api/reference/typescript/resources/beta/subresources/responses/methods/create>.

## 5. Interpretation and timing result

The initial request passed. No repair was used.

| Check | Result |
| --- | --- |
| Forced tool selected | Expected |
| Approved branch | `CREATE_ONE_OFF_PURCHASE` |
| Timing kind | `NEXT_MONTH` |
| Strict provider schema | Pass |
| Runtime semantic contract | Pass |
| Quote/kind equivalence | Pass |
| Source grounding | Pass |
| Conversation state | Pass |
| Application command authorised | Yes |
| Deepest completed stage | `APPLICATION_COMMAND_AUTHORIZATION` |
| Failed stage | None |
| Diagnostic codes | None |
| Repair | Not used |

The v3 strict and runtime contracts permit only this `NEXT_MONTH` field relationship: source-grounded quote,
null `monthNumber`, null `year` and `offsetMonths: 1`. The sanitised artifact retains the approved kind and
field-presence metadata, not the provider's raw values or timing quote.

The deterministic server resolver independently produced:

```text
trusted date: 2026-08-24
timezone: Europe/London
resolved payment period: 2026-09
```

Terra did not authoritatively supply the final year-month or any financial result.

## 6. Frozen simulator proof

After the interpretation passed, the existing deterministic simulator proof passed unchanged:

| Result | Frozen value |
| --- | --- |
| Classification | `AFFORDABLE_SIGNIFICANT_TRADE_OFF` |
| Safety buffer | £900 → £250 |
| Required payments | Bills covered |
| Borrowing | £0 overdraft |
| Buffer recovery | Restored in November 2026 |
| Emergency fund completion | February 2027 |

The provider did not calculate or return these values. They came from the existing Sarah fixture, application
use case and deterministic simulator.

## 7. Operational evidence

| Metric | Result |
| --- | ---: |
| Logical cases | 1 |
| Provider requests | 1 |
| Repairs | 0 |
| Interpretation passes | 1 |
| Interpretation failures | 0 |
| Explanation requests | 0 |
| Latency | 1,848 ms |
| Input tokens | 3,063 |
| Output tokens | 93 |
| Total tokens | 3,156 |
| Estimated input cost | US$0.006126 |
| Estimated output cost | US$0.001116 |
| Total estimated cost | **US$0.007242** |
| Authorised ceiling | US$0.10 |

Pricing evidence uses the repository's approved Track C pricing snapshot dated 26 August 2026. Final invoiced
cost is not inferred.

## 8. Sanitised artifact

Artifact:

```text
artifacts/track-c1e-terra-v3-smoke/terra-canonical-smoke.json
```

The artifact contains one `fy-interpretation-diagnostic/2.0.0` success record and aggregate operational
telemetry. Automated inspection proved it contains none of:

- replacement-key bytes;
- the raw user message;
- the timing quote;
- the raw purchase amount;
- raw tool arguments or provider output;
- financial context or employer/account identifiers;
- personal or work email;
- authorization headers or bearer tokens;
- prompt text; or
- provider reasoning.

No hidden reasoning was stored or exposed.

## 9. Post-run containment

The one evaluation process ended immediately after the case. Its runtime-injected credential was not retained
by an evaluation process. Post-run disabled readiness reported provider disabled, model not configured,
provider unreachable and model inaccessible. Evaluation diagnostics were disabled for all subsequent commands.

Post-run verification proved:

- no Next.js, Next build or Turbopack process remained;
- no configured-key bytes existed in tracked files, non-ignored repository files, generated artifacts or client bundles;
- the sanitised live artifact contained no key bytes or prohibited raw content;
- the keyless production build passed and generated 22/22 static pages;
- the built-client dependency boundary passed; and
- the build-created `.next` directory was scanned clean and removed again.

The generated `next-env.d.ts` build change was restored. No prompt, schema, timing policy, repair rule,
evaluation expectation, UI, simulator or financial result was changed during the smoke.

## 10. Interpretation and next review

The exact outcome is:

> **CANONICAL TERRA V3 TIMING SMOKE — PASSED**

This establishes that Terra accepted the v3 strict function schema and produced one application-authorised
canonical timing interpretation for the approved message on the first request. It does not establish broad
live-provider acceptance and does not approve a production model.

Stop for review. Any wider Terra corpus evaluation requires separate explicit approval. Luna, Sol, Track C2
and Phase B2 remain paused.
