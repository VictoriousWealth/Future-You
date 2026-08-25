begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select no_plan();

select ok((select relrowsecurity from pg_class where oid = 'public.employer_benefit_offerings'::regclass), 'offering RLS is enabled');
select ok((select relforcerowsecurity from pg_class where oid = 'public.employer_benefit_offerings'::regclass), 'offering RLS is forced');
select ok((select relrowsecurity from pg_class where oid = 'public.user_benefit_states'::regclass), 'user benefit-state RLS is enabled');
select ok((select relforcerowsecurity from pg_class where oid = 'public.user_benefit_states'::regclass), 'user benefit-state RLS is forced');

select ok(not has_table_privilege('anon', 'public.employer_benefit_offerings', 'select'), 'anon cannot read employer offerings');
select ok(not has_table_privilege('anon', 'public.user_benefit_states', 'select'), 'anon cannot read user benefit state');
select ok(has_table_privilege('authenticated', 'public.employer_benefit_offerings', 'select'), 'authenticated has narrow offering read access');
select ok(not has_table_privilege('authenticated', 'public.employer_benefit_offerings', 'insert'), 'authenticated cannot insert offerings');
select ok(not has_table_privilege('authenticated', 'public.employer_benefit_offerings', 'update'), 'authenticated cannot update offerings');
select ok(not has_table_privilege('authenticated', 'public.employer_benefit_offerings', 'delete'), 'authenticated cannot delete offerings');
select ok(has_table_privilege('authenticated', 'public.user_benefit_states', 'select'), 'authenticated has narrow user-state read access');
select ok(not has_table_privilege('authenticated', 'public.user_benefit_states', 'insert'), 'authenticated cannot insert user benefit state');
select ok(not has_table_privilege('authenticated', 'public.user_benefit_states', 'update'), 'authenticated cannot update user benefit state');
select ok(not has_table_privilege('authenticated', 'public.user_benefit_states', 'delete'), 'authenticated cannot delete user benefit state');

select ok(exists (
  select 1 from pg_indexes
  where schemaname = 'public' and indexname = 'employer_benefit_offerings_membership_read_idx'
), 'membership-scoped offering read index exists');
select ok(exists (
  select 1 from pg_indexes
  where schemaname = 'public' and indexname = 'user_benefit_states_owner_read_idx'
), 'owner-scoped user-state read index exists');
select ok(exists (
  select 1 from pg_trigger
  where tgrelid = 'public.employer_benefit_offerings'::regclass
    and tgname = 'employer_benefit_offerings_are_append_only'
    and not tgisinternal
), 'offering append-only trigger exists');
select ok(exists (
  select 1 from pg_trigger
  where tgrelid = 'public.user_benefit_states'::regclass
    and tgname = 'user_benefit_states_are_append_only'
    and not tgisinternal
), 'user-state append-only trigger exists');

select is((select email from auth.users where id = '11111111-1111-4111-8111-111111111111'), 'sarah@example.test', 'Sarah personal Login email is unchanged');
select is((select count(*)::integer from auth.users where id = '11111111-1111-4111-8111-111111111111'), 1, 'Sarah has exactly one Auth identity');
select is((select count(*)::integer from public.employer_memberships where user_id = '11111111-1111-4111-8111-111111111111'), 1, 'Sarah has exactly one employer membership');
select is((select status from public.employer_memberships where user_id = '11111111-1111-4111-8111-111111111111'), 'ACTIVE', 'Sarah membership is active');
select is((select source from public.employer_memberships where user_id = '11111111-1111-4111-8111-111111111111'), 'employer_provisioned', 'Sarah membership is employer-provisioned');
select is((select employer_display_name from public.employer_memberships where user_id = '11111111-1111-4111-8111-111111111111'), 'OniBank', 'Sarah membership is connected to OniBank');
select is((select work_email_normalized from public.employer_memberships where user_id = '11111111-1111-4111-8111-111111111111'), 'sarah.wonk@onibank.test', 'Sarah membership uses the canonical non-real work email');
select is((select status from private.employee_provisions where provision_id = '55555555-5555-4555-8555-555555555559'), 'CLAIMED', 'Sarah canonical provision is consumed');
select is((select claimed_user_id from private.employee_provisions where provision_id = '55555555-5555-4555-8555-555555555559'), '11111111-1111-4111-8111-111111111111'::uuid, 'Sarah canonical provision is linked to her existing identity');
select is((select external_reference from private.employee_provisions where provision_id = '55555555-5555-4555-8555-555555555559'), 'canonical-sarah-employer-membership-v1', 'Sarah provision identifies canonical fixture provenance');
select is((select count(*)::integer from private.employee_provisions where work_email_normalized = 'sarah.wonk@onibank.test' and status = 'ELIGIBLE'), 0, 'Sarah provision cannot be claimed again');
select is((select public_company_id from private.employers where employer_id = '44444444-4444-4444-8444-444444444444'), 'FY7K3M9Q2D', 'canonical Company ID resolves to OniBank');

select is((select count(*)::integer from public.employer_benefit_offerings where employer_id = '44444444-4444-4444-8444-444444444444'), 2, 'OniBank has exactly two canonical offerings');
select results_eq($$
  select benefit_key from public.employer_benefit_offerings
  where employer_id = '44444444-4444-4444-8444-444444444444'
  order by benefit_key
$$, $$values ('ADDITIONAL_PENSION_MATCH'::text), ('SEASON_TICKET_LOAN'::text)$$, 'canonical offering keys are exact');
select is((select count(*)::integer from public.employer_benefit_offerings where offering_status = 'AVAILABLE'), 2, 'both OniBank offerings are available');
select is((select count(*)::integer from public.employer_benefit_offerings where reference_date = '2026-08-31'), 2, 'both offerings use the approved reference date');
select is((select count(*)::integer from public.employer_benefit_offerings where numerical_simulation_supported), 0, 'no offering supports numerical simulation');
select is((select count(*)::integer from public.employer_benefit_offerings where further_information_required), 2, 'both offerings require further information');
select ok(not exists (
  select 1 from public.employer_benefit_offerings as offering
  where to_jsonb(offering) ?| array['amount', 'monthly_value', 'annual_value', 'employee_contribution_percent']
), 'offering records contain no financial value or active contribution percentage');

select is((select count(*)::integer from public.user_benefit_states where user_id = '11111111-1111-4111-8111-111111111111'), 2, 'Sarah has explicit state for both opportunities');
select is((select count(*)::integer from public.user_benefit_states where eligibility_status = 'UNKNOWN'), 2, 'Sarah eligibility is unknown for both opportunities');
select is((select count(*)::integer from public.user_benefit_states where uptake_status = 'INACTIVE'), 2, 'Sarah uptake is inactive for both opportunities');
select is((select count(*)::integer from public.user_benefit_states where included_in_financial_baseline), 0, 'neither opportunity is included in Sarah baseline');
select is((select count(*)::integer from public.user_benefit_states where information_completeness = 'INCOMPLETE'), 2, 'both Sarah opportunity states are incomplete');

select is((select current_financial_context_version_id from public.profiles where user_id = '11111111-1111-4111-8111-111111111111'), 'sarah-v1@2026-09-01', 'Sarah current-context identity is unchanged');
select is((select count(*)::integer from public.financial_context_versions where user_id = '11111111-1111-4111-8111-111111111111'), 1, 'the correction creates no Sarah context version');
select is((
  select (fact ->> 'employeeContributionPercent')::integer
  from public.financial_context_versions,
    jsonb_array_elements(payload -> 'informationalContext') as fact
  where user_id = '11111111-1111-4111-8111-111111111111'
    and fact ->> 'kind' = 'PENSION_INFORMATION'
), 3, 'Sarah employee pension percentage remains in the financial context');
select is((
  select (fact ->> 'employerContributionPercent')::integer
  from public.financial_context_versions,
    jsonb_array_elements(payload -> 'informationalContext') as fact
  where user_id = '11111111-1111-4111-8111-111111111111'
    and fact ->> 'kind' = 'PENSION_INFORMATION'
), 3, 'Sarah employer pension percentage remains in the financial context');

select throws_ok($$
  update public.employer_benefit_offerings set display_name = 'Changed'
  where offering_id = '77777777-7777-4777-8777-777777777701'
$$, '55000'::char(5), null, 'even administrative updates cannot rewrite an offering version');
select throws_ok($$
  delete from public.user_benefit_states
  where state_id = '88888888-8888-4888-8888-888888888801'
$$, '55000'::char(5), null, 'even administrative deletes cannot erase user benefit-state history');

insert into private.employers (employer_id, public_company_id, display_name, status)
values ('99999999-9999-4999-8999-999999999901', 'FYOTHER01', 'Other Employer', 'ACTIVE');
insert into private.employee_provisions (
  provision_id, employer_id, work_email_normalized, work_email_fingerprint,
  external_reference, status, available_from, expires_at, claimed_user_id, claimed_at
) values (
  '99999999-9999-4999-8999-999999999902', '99999999-9999-4999-8999-999999999901',
  'alex@other.test', repeat('a', 64), 'benefit-rls-test', 'CLAIMED',
  statement_timestamp(), statement_timestamp() + interval '30 days',
  '22222222-2222-4222-8222-222222222222', statement_timestamp()
);
insert into public.employer_memberships (
  user_id, employer_id, employer_display_name, provision_id, work_email_normalized,
  status, source, verified_at
) values (
  '22222222-2222-4222-8222-222222222222', '99999999-9999-4999-8999-999999999901',
  'Other Employer', '99999999-9999-4999-8999-999999999902', 'alex@other.test',
  'ACTIVE', 'employer_provisioned', statement_timestamp()
);
insert into public.employer_benefit_offerings (
  offering_id, employer_id, benefit_key, display_name, category, offering_status,
  provenance_source_type, source_reference, reference_date, last_confirmed_date,
  numerical_simulation_supported, further_information_required, record_version, schema_version
) values (
  '99999999-9999-4999-8999-999999999903', '99999999-9999-4999-8999-999999999901',
  'SEASON_TICKET_LOAN', 'Other travel support', 'TRAVEL', 'AVAILABLE',
  'CANONICAL_DEMONSTRATION_REFERENCE', 'pgTAP employer-isolation record',
  '2026-08-31', '2026-08-31', false, true, 1, 'future-you.employer-benefit-offering/1.0.0'
);
insert into public.user_benefit_states (
  state_id, user_id, employer_id, offering_id, eligibility_status, uptake_status,
  included_in_financial_baseline, information_completeness, provenance_source_type,
  source_reference, last_confirmed_date, schema_version
) values (
  '99999999-9999-4999-8999-999999999904', '22222222-2222-4222-8222-222222222222',
  '99999999-9999-4999-8999-999999999901', '99999999-9999-4999-8999-999999999903',
  'UNKNOWN', 'INACTIVE', false, 'INCOMPLETE', 'CANONICAL_DEMONSTRATION_FIXTURE',
  'pgTAP user-isolation record', '2026-08-31', 'future-you.user-benefit-state/1.0.0'
);

select throws_ok($$
  insert into public.user_benefit_states (
    state_id, user_id, employer_id, offering_id, eligibility_status, uptake_status,
    included_in_financial_baseline, information_completeness, provenance_source_type,
    source_reference, last_confirmed_date, schema_version
  ) values (
    '99999999-9999-4999-8999-999999999905', '11111111-1111-4111-8111-111111111111',
    '99999999-9999-4999-8999-999999999901', '99999999-9999-4999-8999-999999999903',
    'UNKNOWN', 'INACTIVE', false, 'INCOMPLETE', 'CANONICAL_DEMONSTRATION_FIXTURE',
    'invalid cross-employer state', '2026-08-31', 'future-you.user-benefit-state/1.0.0'
  )
$$, '23503'::char(5), null, 'a user state cannot reference an employer without same-user membership');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select is((select count(*)::integer from public.employer_benefit_offerings), 2, 'Sarah reads only the two OniBank offerings');
select is((select count(*)::integer from public.employer_benefit_offerings where employer_id = '99999999-9999-4999-8999-999999999901'), 0, 'Sarah cannot read another employer offering');
select is((select count(*)::integer from public.user_benefit_states), 2, 'Sarah reads only her own two benefit states');
select throws_ok($$
  insert into public.employer_benefit_offerings (
    offering_id, employer_id, benefit_key, display_name, category, offering_status,
    provenance_source_type, source_reference, reference_date, numerical_simulation_supported,
    further_information_required, record_version, schema_version
  ) values (
    '99999999-9999-4999-8999-999999999906', '44444444-4444-4444-8444-444444444444',
    'SEASON_TICKET_LOAN', 'Forged', 'TRAVEL', 'AVAILABLE',
    'CANONICAL_DEMONSTRATION_REFERENCE', 'forged', '2026-08-31', false, true, 2,
    'future-you.employer-benefit-offering/1.0.0'
  )
$$, '42501'::char(5), null, 'Sarah cannot forge an employer offering');
select throws_ok($$
  update public.user_benefit_states set uptake_status = 'ACTIVE'
$$, '42501'::char(5), null, 'Sarah cannot activate an opportunity directly');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select is((select count(*)::integer from public.employer_benefit_offerings), 1, 'Alex reads only the offering for his verified employer');
select is((select count(*)::integer from public.employer_benefit_offerings where employer_id = '44444444-4444-4444-8444-444444444444'), 0, 'Alex cannot read OniBank offerings');
select is((select count(*)::integer from public.user_benefit_states), 1, 'Alex reads only his own benefit state');
select is((select count(*)::integer from public.user_benefit_states where user_id = '11111111-1111-4111-8111-111111111111'), 0, 'Alex cannot read Sarah-specific benefit state');
select is((select count(*)::integer from public.employer_memberships), 1, 'Alex reads only his own verified membership');

select * from finish();
rollback;
