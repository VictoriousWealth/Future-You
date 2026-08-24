begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(28);

select ok((select relrowsecurity from pg_class where oid = 'public.context_confirmation_keys'::regclass), 'confirmation keys have RLS');
select ok((select relforcerowsecurity from pg_class where oid = 'public.context_confirmation_keys'::regclass), 'confirmation-key RLS is forced');
select ok((select relrowsecurity from pg_class where oid = 'public.workplace_associations'::regclass), 'workplace associations have RLS');
select ok((select relforcerowsecurity from pg_class where oid = 'public.workplace_associations'::regclass), 'workplace RLS is forced');
select ok(not has_table_privilege('anon', 'public.context_confirmation_keys', 'select'), 'anon cannot read confirmation keys');
select ok(not has_table_privilege('anon', 'public.workplace_associations', 'select'), 'anon cannot read workplace associations');
select ok(has_function_privilege('authenticated', 'public.confirm_financial_context_version(text,text,text,text,text,text,text,text,jsonb,text,text,text,text,text,text)', 'execute'), 'authenticated users may invoke the narrow confirmation transaction');
select ok(not has_function_privilege('anon', 'public.confirm_financial_context_version(text,text,text,text,text,text,text,text,jsonb,text,text,text,text,text,text)', 'execute'), 'anon cannot invoke context confirmation');
select ok(not (select prosecdef from pg_proc where oid = 'public.confirm_financial_context_version(text,text,text,text,text,text,text,text,jsonb,text,text,text,text,text,text)'::regprocedure), 'confirmation transaction is security invoker');
select is((select proconfig[1] from pg_proc where oid = 'public.confirm_financial_context_version(text,text,text,text,text,text,text,text,jsonb,text,text,text,text,text,text)'::regprocedure), 'search_path=""', 'confirmation transaction pins an empty search path');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);

select results_eq($$
  select status from public.confirm_financial_context_version(
    'initial_context', 'onboarding-request-1', 'identity-one', '',
    'onboarding-v1', 'context-onboarding', 'financial-context/1.0.0',
    'future-you.financial-context/1.0.0',
    '{"id":"context-onboarding","version":"onboarding-v1","schemaVersion":"financial-context/1.0.0"}'::jsonb,
    'manual onboarding', 'onboarding', 'confirmed preview',
    'fy-sim/1.0.0', 'calendar/test', 'hash-one'
  )
$$, array['created'::text], 'first confirmation creates V1');
select is((select current_financial_context_version_id from public.profiles), 'onboarding-v1', 'V1 becomes current atomically');
select is((select count(*)::integer from public.financial_context_versions), 1, 'user sees one owned context version');
select is((select count(*)::integer from public.context_confirmation_keys), 1, 'one immutable confirmation key is stored');

select results_eq($$
  select status from public.confirm_financial_context_version(
    'initial_context', 'onboarding-request-1', 'identity-one', '',
    'onboarding-v1', 'context-onboarding', 'financial-context/1.0.0',
    'future-you.financial-context/1.0.0',
    '{"id":"context-onboarding","version":"onboarding-v1","schemaVersion":"financial-context/1.0.0"}'::jsonb,
    'manual onboarding', 'onboarding', 'confirmed preview',
    'fy-sim/1.0.0', 'calendar/test', 'hash-one'
  )
$$, array['existing'::text], 'exact retry returns existing V1');
select is((select count(*)::integer from public.financial_context_versions), 1, 'exact retry creates no V2');

select results_eq($$
  select status from public.confirm_financial_context_version(
    'initial_context', 'onboarding-request-1', 'different-identity', '',
    'onboarding-conflict', 'context-conflict', 'financial-context/1.0.0',
    'future-you.financial-context/1.0.0',
    '{"id":"context-conflict","version":"onboarding-conflict","schemaVersion":"financial-context/1.0.0"}'::jsonb,
    'manual onboarding', 'onboarding', 'conflicting retry',
    'fy-sim/1.0.0', 'calendar/test', 'hash-two'
  )
$$, array['idempotency_conflict'::text], 'conflicting request-ID reuse is rejected');

select results_eq($$
  select status from public.confirm_financial_context_version(
    'context_revision', 'revision-request-1', 'identity-two', 'onboarding-v1',
    'onboarding-v2', 'context-onboarding', 'financial-context/1.0.0',
    'future-you.financial-context/1.0.0',
    '{"id":"context-onboarding","version":"onboarding-v2","schemaVersion":"financial-context/1.0.0"}'::jsonb,
    'manual confirmed-context update', 'user_update', 'corrected current fact',
    'fy-sim/1.0.0', 'calendar/test', 'hash-three'
  )
$$, array['created'::text], 'correction creates V2');
select is((select current_financial_context_version_id from public.profiles), 'onboarding-v2', 'V2 becomes current');
select is((select count(*)::integer from public.financial_context_versions), 2, 'V1 and V2 coexist');
select is((select predecessor_version_id from public.financial_context_versions where version_id = 'onboarding-v2'), 'onboarding-v1', 'V2 records V1 predecessor');
select throws_ok($$update public.financial_context_versions set source = 'changed' where version_id = 'onboarding-v1'$$, '42501'::char(5), null, 'V1 cannot be edited in place');
select throws_ok($$delete from public.financial_context_versions where version_id = 'onboarding-v1'$$, '42501'::char(5), null, 'V1 cannot be deleted');
select throws_ok($$update public.profiles set current_financial_context_version_id = 'sarah-v1@2026-09-01'$$, '23503'::char(5), null, 'user cannot activate another owner context');

select lives_ok($$
  insert into public.workplace_associations (
    user_id, workplace_name, association_source, verification_status
  ) values (
    '33333333-3333-4333-8333-333333333333', 'Example Workplace', 'user_provided', 'unverified'
  )
$$, 'optional unverified workplace can be stored separately');
select is((select workplace_name from public.workplace_associations), 'Example Workplace', 'owner reads own workplace association');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select is((select count(*)::integer from public.financial_context_versions where version_id in ('onboarding-v1', 'onboarding-v2')), 0, 'another user cannot read onboarding versions');
select is((select count(*)::integer from public.workplace_associations), 0, 'another user cannot read workplace association');

select * from finish();
rollback;
