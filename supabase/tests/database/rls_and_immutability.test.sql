begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(59);

select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'profiles has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.financial_context_versions'::regclass), 'contexts have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.simulation_baselines'::regclass), 'baselines have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.scenarios'::regclass), 'scenarios have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.simulation_runs'::regclass), 'runs have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.api_request_keys'::regclass), 'request keys have RLS');

select ok(not has_table_privilege('anon', 'public.profiles', 'select'), 'anon has no profile SELECT');
select ok(not has_table_privilege('anon', 'public.financial_context_versions', 'select'), 'anon has no context SELECT');
select ok(not has_table_privilege('anon', 'public.simulation_baselines', 'select'), 'anon has no baseline SELECT');
select ok(not has_table_privilege('anon', 'public.scenarios', 'select'), 'anon has no scenario SELECT');
select ok(not has_table_privilege('anon', 'public.simulation_runs', 'select'), 'anon has no run SELECT');
select ok(not has_table_privilege('anon', 'public.api_request_keys', 'select'), 'anon has no request-key SELECT');
select ok(not has_table_privilege('anon', 'public.financial_context_versions', 'insert'), 'anon has no context INSERT');
select ok(not has_table_privilege('anon', 'public.simulation_runs', 'insert'), 'anon has no run INSERT');
select ok(has_column_privilege('authenticated', 'public.profiles', 'current_financial_context_version_id', 'update'), 'authenticated may update only the current pointer');
select ok(not has_column_privilege('authenticated', 'public.profiles', 'onboarding_state', 'update'), 'authenticated cannot update onboarding state in Slice 3');
select ok(not has_column_privilege('authenticated', 'public.profiles', 'updated_at', 'update'), 'authenticated cannot forge profile timestamps');
select ok(not exists(
  select 1 from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef
    and p.proname not in (
      'registration_begin', 'registration_mark_delivery',
      'registration_challenge_material', 'registration_verify_work_code',
      'registration_resend_work_code', 'registration_reserve_personal_account',
      'registration_release_personal_account_reservation',
      'registration_reserve_personal_confirmation_resend',
      'registration_operational_issue_provision', 'registration_operational_revoke_provision',
      'registration_mark_account_conflict', 'registration_activation_status'
    )
), 'public exposes no unapproved security-definer function');
select ok(not has_schema_privilege('authenticated', 'private', 'usage'), 'authenticated cannot use the private trigger schema');

insert into public.financial_context_versions (
  user_id, version_id, context_id, domain_schema_version, persistence_schema_version,
  payload, source, origin, confirmation_reason
)
select
  '22222222-2222-4222-8222-222222222222',
  'alex-v1@2026-09-01',
  'context-alex-v1',
  domain_schema_version,
  persistence_schema_version,
  jsonb_set(
    jsonb_set(payload, '{id}', '"context-alex-v1"'),
    '{version}', '"alex-v1@2026-09-01"'
  ),
  'RLS test fixture', 'fixture', 'Cross-user isolation test'
from public.financial_context_versions
where user_id = '11111111-1111-4111-8111-111111111111'
  and version_id = 'sarah-v1@2026-09-01';

update public.profiles
set current_financial_context_version_id = 'alex-v1@2026-09-01',
    onboarding_state = 'ready'
where user_id = '22222222-2222-4222-8222-222222222222';

insert into public.simulation_baselines (
  user_id, baseline_id, context_version_id, rules_version, calendar_version,
  input_identity, projection_payload
) values
(
  '11111111-1111-4111-8111-111111111111', 'baseline-a', 'sarah-v1@2026-09-01',
  'fy-sim/1.0.0', 'calendar/test', 'input-a',
  '{"identity":{"baselineId":"baseline-a","contextVersion":"sarah-v1@2026-09-01","inputIdentity":"input-a"},"versions":{"rules":"fy-sim/1.0.0","calendar":"calendar/test"}}'
),
(
  '22222222-2222-4222-8222-222222222222', 'baseline-b', 'alex-v1@2026-09-01',
  'fy-sim/1.0.0', 'calendar/test', 'input-b',
  '{"identity":{"baselineId":"baseline-b","contextVersion":"alex-v1@2026-09-01","inputIdentity":"input-b"},"versions":{"rules":"fy-sim/1.0.0","calendar":"calendar/test"}}'
);

insert into public.scenarios (
  user_id, scenario_id, baseline_id, context_version_id, scenario_kind, definition_payload
) values
(
  '11111111-1111-4111-8111-111111111111', 'scenario-a', 'baseline-a',
  'sarah-v1@2026-09-01', 'one_off_purchase',
  '{"id":"scenario-a","baselineId":"baseline-a","contextVersion":"sarah-v1@2026-09-01","parentScenarioId":null,"derivedFromScenarioId":null,"scenarioKind":"one_off_purchase"}'
),
(
  '22222222-2222-4222-8222-222222222222', 'scenario-b', 'baseline-b',
  'alex-v1@2026-09-01', 'one_off_purchase',
  '{"id":"scenario-b","baselineId":"baseline-b","contextVersion":"alex-v1@2026-09-01","parentScenarioId":null,"derivedFromScenarioId":null,"scenarioKind":"one_off_purchase"}'
);

insert into public.simulation_runs (
  user_id, run_id, request_id, request_identity, context_version_id, baseline_id,
  scenario_id, scenario_kind, canonical_request, material_assumptions, rules_version,
  calendar_version, calendar_fallback_metadata, projection_horizons,
  deterministic_classification, input_identity, output_identity, response_schema_version,
  response_payload
) values
(
  '11111111-1111-4111-8111-111111111111', 'run-a', 'request-a', 'request-input-a',
  'sarah-v1@2026-09-01', 'baseline-a', 'scenario-a', 'one_off_purchase', '{}', '{}',
  'fy-sim/1.0.0', 'calendar/test', '{}', '{}', 'AFFORDABLE_SIGNIFICANT_TRADE_OFF',
  'input-a', 'output-a', 'one-off-purchase-result/1.0.0',
  '{"schemaVersion":"one-off-purchase-result/1.0.0","requestId":"request-a","calculation":{"runId":"run-a","contextVersion":"sarah-v1@2026-09-01","baselineId":"baseline-a","scenarioId":"scenario-a","parentScenarioId":null,"rulesVersion":"fy-sim/1.0.0","calendarVersion":"calendar/test"},"context":{"version":"sarah-v1@2026-09-01"},"reproducibility":{"inputIdentity":"input-a","outputIdentity":"output-a"},"result":{"comparison":{"classification":{"code":"AFFORDABLE_SIGNIFICANT_TRADE_OFF"}}}}'
),
(
  '22222222-2222-4222-8222-222222222222', 'run-b', 'request-b', 'request-input-b',
  'alex-v1@2026-09-01', 'baseline-b', 'scenario-b', 'one_off_purchase', '{}', '{}',
  'fy-sim/1.0.0', 'calendar/test', '{}', '{}', 'AFFORDABLE_MINIMAL_IMPACT',
  'input-b', 'output-b', 'one-off-purchase-result/1.0.0',
  '{"schemaVersion":"one-off-purchase-result/1.0.0","requestId":"request-b","calculation":{"runId":"run-b","contextVersion":"alex-v1@2026-09-01","baselineId":"baseline-b","scenarioId":"scenario-b","parentScenarioId":null,"rulesVersion":"fy-sim/1.0.0","calendarVersion":"calendar/test"},"context":{"version":"alex-v1@2026-09-01"},"reproducibility":{"inputIdentity":"input-b","outputIdentity":"output-b"},"result":{"comparison":{"classification":{"code":"AFFORDABLE_MINIMAL_IMPACT"}}}}'
);

insert into public.api_request_keys (user_id, request_id, operation, request_identity, run_id)
values
  ('11111111-1111-4111-8111-111111111111', 'request-a', 'simulate_one_off_purchase', 'request-input-a', 'run-a'),
  ('22222222-2222-4222-8222-222222222222', 'request-b', 'simulate_one_off_purchase', 'request-input-b', 'run-b');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select is((select count(*)::integer from public.financial_context_versions), 1, 'A reads A context');
select is((select count(*)::integer from public.financial_context_versions where version_id = 'alex-v1@2026-09-01'), 0, 'A cannot read B context');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select is((select count(*)::integer from public.financial_context_versions), 1, 'B reads B context');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select lives_ok($$
  insert into public.financial_context_versions (
    user_id, version_id, context_id, predecessor_version_id, domain_schema_version,
    persistence_schema_version, payload, source, origin, confirmation_reason
  )
  select user_id, 'sarah-v2-test', 'context-sarah-v2-test', version_id,
    domain_schema_version, persistence_schema_version,
    jsonb_set(jsonb_set(payload, '{id}', '"context-sarah-v2-test"'), '{version}', '"sarah-v2-test"'),
    'test', 'user_update', 'test correction'
  from public.financial_context_versions where version_id = 'sarah-v1@2026-09-01'
$$, 'A inserts a second A-owned immutable context');
select is((select count(*)::integer from public.financial_context_versions), 2, 'both A context versions coexist');

select throws_ok($$
  insert into public.financial_context_versions (
    user_id, version_id, context_id, domain_schema_version, persistence_schema_version,
    payload, source, origin, confirmation_reason
  )
  select '22222222-2222-4222-8222-222222222222', 'illegal-b-context', 'illegal-b-context',
    domain_schema_version, persistence_schema_version,
    jsonb_set(jsonb_set(payload, '{id}', '"illegal-b-context"'), '{version}', '"illegal-b-context"'),
    'test', 'user_update', 'illegal owner change'
  from public.financial_context_versions where version_id = 'sarah-v1@2026-09-01'
$$, '42501'::char(5), null, 'A cannot insert a B-owned context');
select throws_ok($$update public.financial_context_versions set source = 'changed' where version_id = 'sarah-v1@2026-09-01'$$, '42501'::char(5), null, 'A cannot update a context');
select throws_ok($$delete from public.financial_context_versions where version_id = 'sarah-v1@2026-09-01'$$, '42501'::char(5), null, 'A cannot delete a context');

select is((select count(*)::integer from public.profiles), 1, 'A reads only A pointer');
select is((select count(*)::integer from public.profiles where user_id = '22222222-2222-4222-8222-222222222222'), 0, 'A cannot read B pointer');
select lives_ok($$update public.profiles set current_financial_context_version_id = 'sarah-v2-test' where user_id = '11111111-1111-4111-8111-111111111111'$$, 'A can change A current pointer');
select is((select current_financial_context_version_id from public.profiles), 'sarah-v2-test', 'A pointer selects the second version');
select is((select count(*)::integer from public.financial_context_versions), 2, 'pointer change did not mutate contexts');
select throws_ok($$update public.profiles set current_financial_context_version_id = 'alex-v1@2026-09-01' where user_id = '11111111-1111-4111-8111-111111111111'$$, '23503'::char(5), null, 'A cannot point at B context');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$select * from public.profiles$$, '42501'::char(5), null, 'anon cannot read pointers');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select is((select count(*)::integer from public.simulation_runs where run_id = 'run-a'), 1, 'A reads A run');
select is((select count(*)::integer from public.simulation_runs where run_id = 'run-b'), 0, 'A cannot read B run');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select is((select count(*)::integer from public.simulation_runs), 1, 'B reads B run');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select lives_ok($$
  insert into public.scenarios (user_id, scenario_id, baseline_id, context_version_id, scenario_kind, definition_payload)
  values ('11111111-1111-4111-8111-111111111111', 'scenario-a-2', 'baseline-a', 'sarah-v1@2026-09-01', 'one_off_purchase',
  '{"id":"scenario-a-2","baselineId":"baseline-a","contextVersion":"sarah-v1@2026-09-01","parentScenarioId":null,"derivedFromScenarioId":null,"scenarioKind":"one_off_purchase"}')
$$, 'A inserts A-owned scenario');

select lives_ok($$
  insert into public.simulation_runs (
    user_id, run_id, request_id, request_identity, context_version_id, baseline_id, scenario_id,
    scenario_kind, canonical_request, material_assumptions, rules_version, calendar_version,
    calendar_fallback_metadata, projection_horizons, deterministic_classification, input_identity,
    output_identity, response_schema_version, response_payload
  ) values (
    '11111111-1111-4111-8111-111111111111', 'run-a-2', 'request-a-2', 'request-input-a-2',
    'sarah-v1@2026-09-01', 'baseline-a', 'scenario-a-2', 'one_off_purchase', '{}', '{}',
    'fy-sim/1.0.0', 'calendar/test', '{}', '{}', 'AFFORDABLE_MINIMAL_IMPACT',
    'input-a-2', 'output-a-2', 'one-off-purchase-result/1.0.0',
    '{"schemaVersion":"one-off-purchase-result/1.0.0","requestId":"request-a-2","calculation":{"runId":"run-a-2","contextVersion":"sarah-v1@2026-09-01","baselineId":"baseline-a","scenarioId":"scenario-a-2","parentScenarioId":null,"rulesVersion":"fy-sim/1.0.0","calendarVersion":"calendar/test"},"context":{"version":"sarah-v1@2026-09-01"},"reproducibility":{"inputIdentity":"input-a-2","outputIdentity":"output-a-2"},"result":{"comparison":{"classification":{"code":"AFFORDABLE_MINIMAL_IMPACT"}}}}'
  )
$$, 'A inserts A-owned run');
select is((select count(*)::integer from public.simulation_runs where run_id = 'run-a-2'), 1, 'permitted run insert persisted');
select throws_ok($$
  insert into public.simulation_runs (
    user_id, run_id, request_id, request_identity, context_version_id, baseline_id, scenario_id,
    parent_scenario_id, scenario_kind, canonical_request, material_assumptions, rules_version,
    calendar_version, calendar_fallback_metadata, projection_horizons,
    deterministic_classification, input_identity, output_identity, response_schema_version,
    response_payload
  )
  select '22222222-2222-4222-8222-222222222222', 'illegal-run', 'illegal-request',
    'illegal-input', context_version_id, baseline_id, scenario_id, parent_scenario_id,
    scenario_kind, canonical_request, material_assumptions, rules_version, calendar_version,
    calendar_fallback_metadata, projection_horizons, deterministic_classification,
    input_identity, output_identity, response_schema_version, response_payload
  from public.simulation_runs where run_id = 'run-a'
$$, '42501'::char(5), null, 'A cannot insert B-owned run');
select throws_ok($$update public.simulation_runs set output_identity = 'changed' where run_id = 'run-a'$$, '42501'::char(5), null, 'A cannot update a run');
select throws_ok($$delete from public.simulation_runs where run_id = 'run-a'$$, '42501'::char(5), null, 'A cannot delete a run');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$select * from public.simulation_runs$$, '42501'::char(5), null, 'anon cannot read runs');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select lives_ok($$
  insert into public.scenarios (user_id, scenario_id, baseline_id, context_version_id, parent_scenario_id, derived_from_scenario_id, scenario_kind, definition_payload)
  values ('11111111-1111-4111-8111-111111111111', 'scenario-a-child', 'baseline-a', 'sarah-v1@2026-09-01', 'scenario-a', 'scenario-a', 'one_off_purchase',
  '{"id":"scenario-a-child","baselineId":"baseline-a","contextVersion":"sarah-v1@2026-09-01","parentScenarioId":"scenario-a","derivedFromScenarioId":"scenario-a","scenarioKind":"one_off_purchase"}')
$$, 'same-owner scenario ancestry is permitted');
select throws_ok($$insert into public.scenarios (user_id, scenario_id, baseline_id, context_version_id, parent_scenario_id, scenario_kind, definition_payload) values ('11111111-1111-4111-8111-111111111111', 'foreign-parent', 'baseline-a', 'sarah-v1@2026-09-01', 'scenario-b', 'one_off_purchase', '{"id":"foreign-parent","baselineId":"baseline-a","contextVersion":"sarah-v1@2026-09-01","parentScenarioId":"scenario-b","derivedFromScenarioId":null,"scenarioKind":"one_off_purchase"}')$$, '23503'::char(5), null, 'foreign-owned parent is rejected');
select throws_ok($$insert into public.scenarios (user_id, scenario_id, baseline_id, context_version_id, scenario_kind, definition_payload) values ('11111111-1111-4111-8111-111111111111', 'foreign-baseline', 'baseline-b', 'sarah-v1@2026-09-01', 'one_off_purchase', '{"id":"foreign-baseline","baselineId":"baseline-b","contextVersion":"sarah-v1@2026-09-01","parentScenarioId":null,"derivedFromScenarioId":null,"scenarioKind":"one_off_purchase"}')$$, '23503'::char(5), null, 'foreign-owned baseline is rejected');
select throws_ok($$insert into public.scenarios (user_id, scenario_id, baseline_id, context_version_id, scenario_kind, definition_payload) values ('11111111-1111-4111-8111-111111111111', 'foreign-context', 'baseline-a', 'alex-v1@2026-09-01', 'one_off_purchase', '{"id":"foreign-context","baselineId":"baseline-a","contextVersion":"alex-v1@2026-09-01","parentScenarioId":null,"derivedFromScenarioId":null,"scenarioKind":"one_off_purchase"}')$$, '23503'::char(5), null, 'foreign-owned context is rejected');
select throws_ok($$update public.scenarios set scenario_kind = 'one_off_purchase' where scenario_id = 'scenario-a'$$, '42501'::char(5), null, 'A cannot update scenario ancestry');
select throws_ok($$delete from public.scenarios where scenario_id = 'scenario-a'$$, '42501'::char(5), null, 'A cannot delete a scenario');
select is((select count(*)::integer from public.scenarios where scenario_id = 'scenario-b'), 0, 'A cannot read B scenario');
select is((select count(*)::integer from public.scenarios where scenario_id = 'scenario-a-child'), 1, 'A reads same-owner child');
select throws_ok($$update public.simulation_baselines set input_identity = 'changed' where baseline_id = 'baseline-a'$$, '42501'::char(5), null, 'A cannot update immutable baseline');

select is((select count(*)::integer from public.api_request_keys where request_id = 'request-a'), 1, 'A reads A request key');
select is((select count(*)::integer from public.api_request_keys where request_id = 'request-b'), 0, 'A cannot read B request key');
select lives_ok($$insert into public.api_request_keys (user_id, request_id, operation, request_identity, run_id) values ('11111111-1111-4111-8111-111111111111', 'request-a-2', 'simulate_one_off_purchase', 'request-input-a-2', 'run-a-2')$$, 'A inserts an A-owned request key');
select throws_ok($$update public.api_request_keys set request_identity = 'changed' where request_id = 'request-a'$$, '42501'::char(5), null, 'A cannot update a request key');
select throws_ok($$delete from public.api_request_keys where request_id = 'request-a'$$, '42501'::char(5), null, 'A cannot delete a request key');
select is_empty($$update public.profiles set current_financial_context_version_id = null where user_id = '22222222-2222-4222-8222-222222222222' returning user_id$$, 'A cannot update B pointer');

select * from finish();
rollback;
