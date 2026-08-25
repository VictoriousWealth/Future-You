import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SARAH_V1_CONTEXT } from "../src/fixtures/sarah-v1";
import { SLICE_1_RULES } from "../src/domain/simulator/engine";
import {
  ENGLAND_WALES_CALENDAR_METADATA,
  ENGLAND_WALES_WORKING_DAY_CALENDAR
} from "../src/fixtures/calendar/england-wales-bank-holidays";
import { SarahV1ContextSource } from "../src/infrastructure/context/sarah-v1-context-source";
import { InMemorySimulationRunStore } from "../src/infrastructure/runs/in-memory-simulation-run-store";
import {
  FINANCIAL_CONTEXT_PERSISTENCE_SCHEMA,
  financialContextToPersistence
} from "../src/infrastructure/persistence/financial-context-persistence";
import {
  jsonValueToPersistence,
  requestToJson,
  simulationResponseToJson
} from "../src/infrastructure/persistence/simulation-run-persistence";
import { requestIdentityFor } from "../src/application/use-cases/idempotent-simulation-run";
import type { OneOffPurchaseRequestDTO, OneOffPurchaseResponseDTO } from "../src/application/dto/contracts";
import { createSimulatorApplication } from "../src/server/simulator-application";
import { SARAH_V1_BROWSER_PROOF_COMMAND, SARAH_V1_BROWSER_PROOF_OPTIONS_COMMAND } from "../src/server/sarah-v1-demo-command";

const SARAH_USER_ID = "11111111-1111-4111-8111-111111111111";
const ALEX_USER_ID = "22222222-2222-4222-8222-222222222222";
const ONBOARDING_USER_ID = "33333333-3333-4333-8333-333333333333";
const VISUAL_ONBOARDING_USER_ID = "88888888-8888-4888-8888-888888888888";
const ONIBANK_EMPLOYER_ID = "44444444-4444-4444-8444-444444444444";
const SARAH_ONIBANK_PROVISION_ID = "55555555-5555-4555-8555-555555555559";
const ONIBANK_PENSION_MATCH_OFFERING_ID = "77777777-7777-4777-8777-777777777701";
const ONIBANK_SEASON_TICKET_OFFERING_ID = "77777777-7777-4777-8777-777777777702";

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlNullable(value: string | null): string {
  return value === null ? "null" : sqlString(value);
}

function jsonSql(value: unknown): string {
  return `${sqlString(JSON.stringify(jsonValueToPersistence(value)))}::jsonb`;
}

function authUser(input: Readonly<{
  id: string;
  identityId: string;
  email: string;
  password: string;
  displayName: string;
}>): string {
  const appMetadata = JSON.stringify({
    provider: "email",
    providers: ["email"],
    future_you_fixture: true
  });
  const userMetadata = JSON.stringify({ display_name: input.displayName });
  const identityData = JSON.stringify({
    sub: input.id,
    email: input.email,
    email_verified: true,
    phone_verified: false
  });
  return `insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
  email_change, reauthentication_token, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, created_at, updated_at, is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000',
  ${sqlString(input.id)},
  'authenticated',
  'authenticated',
  ${sqlString(input.email)},
  extensions.crypt(${sqlString(input.password)}, extensions.gen_salt('bf')),
  statement_timestamp(), '', '', '', '', '', '',
  ${sqlString(appMetadata)}::jsonb,
  ${sqlString(userMetadata)}::jsonb,
  false, statement_timestamp(), statement_timestamp(), false, false
);

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values (
  ${sqlString(input.identityId)},
  ${sqlString(input.email)},
  ${sqlString(input.id)},
  ${sqlString(identityData)}::jsonb,
  'email', statement_timestamp(), statement_timestamp(), statement_timestamp()
);`;
}

async function sarahStoryRunsSql(): Promise<string> {
  const runStore = new InMemorySimulationRunStore();
  const application = createSimulatorApplication({
    contextSource: new SarahV1ContextSource(),
    rules: SLICE_1_RULES,
    calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
    calendarMetadata: ENGLAND_WALES_CALENDAR_METADATA,
    runStore
  });
  const generated = await application.listScenarioOptions.execute(
    SARAH_V1_BROWSER_PROOF_OPTIONS_COMMAND
  );
  if (!generated.ok) throw new Error(`Sarah story runs could not be generated: ${generated.error.code}`);
  const runs = generated.value.options
    .map((option) => option.simulation)
    .filter((run): run is OneOffPurchaseResponseDTO => run !== null);
  if (runs.length !== 4) throw new Error("Sarah story requires exactly four immutable scenario runs.");
  const baseline = runs[0]?.baseline;
  if (!baseline) throw new Error("Sarah story baseline was not generated.");

  const baselineSql = `insert into public.simulation_baselines (
  user_id, baseline_id, context_version_id, rules_version, calendar_version,
  input_identity, projection_payload
) values (
  ${sqlString(SARAH_USER_ID)},
  ${sqlString(baseline.identity.baselineId)},
  ${sqlString(baseline.identity.contextVersion)},
  ${sqlString(baseline.versions.rules)},
  ${sqlString(baseline.versions.calendar)},
  ${sqlString(baseline.identity.inputIdentity)},
  ${jsonSql(baseline)}
);`;

  const scenarioRows = runs.map((run) => {
    const definition = { ...run.scenario, scenarioKind: "one_off_purchase" };
    return `(
  ${sqlString(SARAH_USER_ID)}, ${sqlString(run.scenario.id)}, ${sqlString(run.scenario.baselineId)},
  ${sqlString(run.scenario.contextVersion)}, ${sqlNullable(run.scenario.parentScenarioId)},
  ${sqlNullable(run.scenario.derivedFromScenarioId)}, 'one_off_purchase', ${jsonSql(definition)}
)`;
  }).join(",\n");

  const requests = new Map<string, OneOffPurchaseRequestDTO>(runs.map((run) => [
    run.requestId,
    { ...SARAH_V1_BROWSER_PROOF_COMMAND, requestId: run.requestId }
  ]));
  for (const run of runs) {
    const request = requests.get(run.requestId);
    const applicationRecord = await runStore.findByRequestId(run.requestId);
    if (
      !request
      || !applicationRecord
      || applicationRecord.result.calculation.runId !== run.calculation.runId
      || applicationRecord.requestIdentity !== requestIdentityFor(request)
    ) {
      throw new Error(`Sarah story request metadata did not match application output for ${run.requestId}.`);
    }
  }
  const runRows = runs.map((run) => {
    const request = requests.get(run.requestId);
    if (!request) throw new Error(`Missing canonical request for ${run.requestId}.`);
    return `(
  ${sqlString(SARAH_USER_ID)}, ${sqlString(run.calculation.runId)}, ${sqlString(run.requestId)},
  ${sqlString(requestIdentityFor(request))}, ${sqlString(run.context.version)},
  ${sqlString(run.calculation.baselineId)}, ${sqlString(run.scenario.id)},
  ${sqlNullable(run.scenario.parentScenarioId)}, 'one_off_purchase', ${jsonSql(requestToJson(request))},
  ${jsonSql(run.result.projection.assumptions)}, ${sqlString(run.calculation.rulesVersion)},
  ${sqlString(run.calculation.calendarVersion)}, ${jsonSql(run.calculation.calendar)},
  ${jsonSql(run.calculation.projectionHorizon)}, ${sqlString(run.result.comparison.classification.code)},
  ${sqlString(run.reproducibility.inputIdentity)}, ${sqlString(run.reproducibility.outputIdentity)},
  ${sqlString(run.schemaVersion)}, ${jsonSql(simulationResponseToJson(run))}
)`;
  }).join(",\n");

  const requestKeyRows = runs.map((run) => {
    const request = requests.get(run.requestId);
    if (!request) throw new Error(`Missing request identity for ${run.requestId}.`);
    return `(
  ${sqlString(SARAH_USER_ID)}, ${sqlString(run.requestId)}, 'simulate_one_off_purchase',
  ${sqlString(requestIdentityFor(request))}, ${sqlString(run.calculation.runId)}
)`;
  }).join(",\n");

  return `${baselineSql}

insert into public.scenarios (
  user_id, scenario_id, baseline_id, context_version_id, parent_scenario_id,
  derived_from_scenario_id, scenario_kind, definition_payload
) values
${scenarioRows};

insert into public.simulation_runs (
  user_id, run_id, request_id, request_identity, context_version_id, baseline_id,
  scenario_id, parent_scenario_id, scenario_kind, canonical_request, material_assumptions,
  rules_version, calendar_version, calendar_fallback_metadata, projection_horizons,
  deterministic_classification, input_identity, output_identity, response_schema_version,
  response_payload
) values
${runRows};

insert into public.api_request_keys (
  user_id, request_id, operation, request_identity, run_id
) values
${requestKeyRows};`;
}

export async function createSupabaseSeed(): Promise<string> {
  const contextPayload = JSON.stringify(financialContextToPersistence(SARAH_V1_CONTEXT));
  const storyRuns = await sarahStoryRunsSql();
  return `-- GENERATED by scripts/generate-supabase-seed.ts. Do not hand-edit.
-- Local-only credentials are deterministic so browser and API isolation tests are reproducible.

select set_config('app.future_you_seed', 'enabled', false);

${authUser({
  id: SARAH_USER_ID,
  identityId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  email: "sarah@example.test",
  password: "Sarah-Local-Only-2026!",
  displayName: "Sarah Wonk"
})}

${authUser({
  id: ALEX_USER_ID,
  identityId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  email: "alex@example.test",
  password: "Alex-Local-Only-2026!",
  displayName: "Alex Morgan"
})}

${authUser({
  id: ONBOARDING_USER_ID,
  identityId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  email: "onboarding@example.test",
  password: "Onboarding-Local-Only-2026!",
  displayName: "Manual Onboarding User"
})}

${authUser({
  id: VISUAL_ONBOARDING_USER_ID,
  identityId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  email: "visual-onboarding@example.test",
  password: "Visual-Onboarding-Only-2026!",
  displayName: "Visual Onboarding User"
})}

insert into public.financial_context_versions (
  user_id, version_id, context_id, predecessor_version_id, domain_schema_version,
  persistence_schema_version, payload, source, origin, confirmation_reason
) values (
  ${sqlString(SARAH_USER_ID)},
  ${sqlString(SARAH_V1_CONTEXT.version)},
  ${sqlString(SARAH_V1_CONTEXT.id)},
  null,
  ${sqlString(SARAH_V1_CONTEXT.schemaVersion)},
  ${sqlString(FINANCIAL_CONTEXT_PERSISTENCE_SCHEMA)},
  ${sqlString(contextPayload)}::jsonb,
  'canonical Sarah v1 code fixture',
  'fixture',
  'Slice 3 deterministic local demo seed'
);

update public.profiles
set current_financial_context_version_id = ${sqlString(SARAH_V1_CONTEXT.version)},
    onboarding_state = 'ready',
    is_demo = true,
    updated_at = statement_timestamp()
where user_id = ${sqlString(SARAH_USER_ID)};

-- Track B1 reads these pre-created immutable DTO runs. Story playback never calculates them.
${storyRuns}

insert into private.employers (
  employer_id, public_company_id, display_name, status
) values (
  ${sqlString(ONIBANK_EMPLOYER_ID)},
  'FY7K3M9Q2D',
  'OniBank',
  'ACTIVE'
);

insert into private.employee_provisions (
  provision_id, employer_id, work_email_normalized, work_email_fingerprint,
  external_reference, status, available_from, expires_at
) values (
  '55555555-5555-4555-8555-555555555555',
  ${sqlString(ONIBANK_EMPLOYER_ID)},
  'newstarter@onibank.example.test',
  encode(extensions.digest(convert_to('local-seed:newstarter@onibank.example.test', 'UTF8'), 'sha256'), 'hex'),
  'local-browser-acceptance',
  'ELIGIBLE',
  statement_timestamp(),
  statement_timestamp() + interval '30 days'
), (
  '55555555-5555-4555-8555-555555555556',
  ${sqlString(ONIBANK_EMPLOYER_ID)},
  'integration@onibank.example.test',
  encode(extensions.digest(convert_to('local-seed:integration@onibank.example.test', 'UTF8'), 'sha256'), 'hex'),
  'local-integration-acceptance',
  'ELIGIBLE',
  statement_timestamp(),
  statement_timestamp() + interval '30 days'
), (
  '55555555-5555-4555-8555-555555555557',
  ${sqlString(ONIBANK_EMPLOYER_ID)},
  'concurrent@onibank.example.test',
  encode(extensions.digest(convert_to('local-seed:concurrent@onibank.example.test', 'UTF8'), 'sha256'), 'hex'),
  'local-concurrency-acceptance',
  'ELIGIBLE',
  statement_timestamp(),
  statement_timestamp() + interval '30 days'
), (
  '55555555-5555-4555-8555-555555555558',
  ${sqlString(ONIBANK_EMPLOYER_ID)},
  'collision@onibank.example.test',
  encode(extensions.digest(convert_to('local-seed:collision@onibank.example.test', 'UTF8'), 'sha256'), 'hex'),
  'local-existing-account-acceptance',
  'ELIGIBLE',
  statement_timestamp(),
  statement_timestamp() + interval '30 days'
);

-- Sarah predates Track A. This canonical fixture backfill records the equivalent verified
-- employer-provisioned membership without fabricating an OTP or another Auth identity.
insert into private.employee_provisions (
  provision_id, employer_id, work_email_normalized, work_email_fingerprint,
  external_reference, status, available_from, expires_at, claimed_user_id, claimed_at,
  created_at, updated_at
) values (
  ${sqlString(SARAH_ONIBANK_PROVISION_ID)},
  ${sqlString(ONIBANK_EMPLOYER_ID)},
  'sarah.wonk@onibank.test',
  encode(extensions.digest(convert_to('canonical-demo:sarah.wonk@onibank.test', 'UTF8'), 'sha256'), 'hex'),
  'canonical-sarah-employer-membership-v1',
  'CLAIMED',
  '2026-08-01 00:00:00+00'::timestamptz,
  '2026-08-31 00:00:00+00'::timestamptz,
  ${sqlString(SARAH_USER_ID)},
  '2026-08-25 12:00:00+00'::timestamptz,
  '2026-08-25 12:00:00+00'::timestamptz,
  '2026-08-25 12:00:00+00'::timestamptz
);

insert into public.employer_memberships (
  user_id, employer_id, employer_display_name, provision_id, work_email_normalized,
  status, source, verified_at, created_at, updated_at
) values (
  ${sqlString(SARAH_USER_ID)},
  ${sqlString(ONIBANK_EMPLOYER_ID)},
  'OniBank',
  ${sqlString(SARAH_ONIBANK_PROVISION_ID)},
  'sarah.wonk@onibank.test',
  'ACTIVE',
  'employer_provisioned',
  '2026-08-25 12:00:00+00'::timestamptz,
  '2026-08-25 12:00:00+00'::timestamptz,
  '2026-08-25 12:00:00+00'::timestamptz
);

insert into public.employer_benefit_offerings (
  offering_id, employer_id, benefit_key, display_name, category, offering_status,
  provenance_source_type, source_reference, reference_date, last_confirmed_date,
  numerical_simulation_supported, further_information_required,
  record_version, schema_version, created_at
) values (
  ${sqlString(ONIBANK_PENSION_MATCH_OFFERING_ID)},
  ${sqlString(ONIBANK_EMPLOYER_ID)},
  'ADDITIONAL_PENSION_MATCH',
  'Additional pension match',
  'PENSION',
  'AVAILABLE',
  'CANONICAL_DEMONSTRATION_REFERENCE',
  'Canonical OniBank demonstration benefit record',
  '2026-08-31'::date,
  '2026-08-31'::date,
  false,
  true,
  1,
  'future-you.employer-benefit-offering/1.0.0',
  '2026-08-31 00:00:00+00'::timestamptz
), (
  ${sqlString(ONIBANK_SEASON_TICKET_OFFERING_ID)},
  ${sqlString(ONIBANK_EMPLOYER_ID)},
  'SEASON_TICKET_LOAN',
  'Season-ticket loan',
  'TRAVEL',
  'AVAILABLE',
  'CANONICAL_DEMONSTRATION_REFERENCE',
  'Canonical OniBank demonstration benefit record',
  '2026-08-31'::date,
  '2026-08-31'::date,
  false,
  true,
  1,
  'future-you.employer-benefit-offering/1.0.0',
  '2026-08-31 00:00:00+00'::timestamptz
);

insert into public.user_benefit_states (
  state_id, user_id, employer_id, offering_id, eligibility_status, uptake_status,
  included_in_financial_baseline, information_completeness, provenance_source_type,
  source_reference, last_confirmed_date, schema_version, created_at
) values (
  '88888888-8888-4888-8888-888888888801',
  ${sqlString(SARAH_USER_ID)},
  ${sqlString(ONIBANK_EMPLOYER_ID)},
  ${sqlString(ONIBANK_PENSION_MATCH_OFFERING_ID)},
  'UNKNOWN',
  'INACTIVE',
  false,
  'INCOMPLETE',
  'CANONICAL_DEMONSTRATION_FIXTURE',
  'Canonical Sarah opportunity status v1',
  '2026-08-31'::date,
  'future-you.user-benefit-state/1.0.0',
  '2026-08-31 00:00:00+00'::timestamptz
), (
  '88888888-8888-4888-8888-888888888802',
  ${sqlString(SARAH_USER_ID)},
  ${sqlString(ONIBANK_EMPLOYER_ID)},
  ${sqlString(ONIBANK_SEASON_TICKET_OFFERING_ID)},
  'UNKNOWN',
  'INACTIVE',
  false,
  'INCOMPLETE',
  'CANONICAL_DEMONSTRATION_FIXTURE',
  'Canonical Sarah opportunity status v1',
  '2026-08-31'::date,
  'future-you.user-benefit-state/1.0.0',
  '2026-08-31 00:00:00+00'::timestamptz
);
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(
    fileURLToPath(new URL("../supabase/seed.sql", import.meta.url)),
    await createSupabaseSeed(),
    { encoding: "utf8" }
  );
}
