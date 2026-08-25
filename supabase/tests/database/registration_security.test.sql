begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(61);

select ok((select relrowsecurity from pg_class where oid = 'public.employer_memberships'::regclass), 'membership RLS is enabled');
select ok((select relforcerowsecurity from pg_class where oid = 'public.employer_memberships'::regclass), 'membership RLS is forced');
select ok(not has_table_privilege('anon', 'public.employer_memberships', 'select'), 'anon cannot read memberships');
select ok(has_table_privilege('authenticated', 'public.employer_memberships', 'select'), 'authenticated users have narrow membership read grant');
select ok(not has_table_privilege('authenticated', 'public.employer_memberships', 'insert'), 'authenticated users cannot create verified memberships');
select ok(not has_table_privilege('authenticated', 'public.employer_memberships', 'update'), 'authenticated users cannot update verified memberships');
select ok(not has_table_privilege('authenticated', 'public.employer_memberships', 'delete'), 'authenticated users cannot delete verified memberships');
select ok(not has_schema_privilege('anon', 'private', 'usage'), 'anon cannot use private registration schema');
select ok(not has_schema_privilege('authenticated', 'private', 'usage'), 'authenticated cannot use private registration schema');

select ok(has_function_privilege('service_role', 'public.registration_begin(uuid,text,text,text,text,text,text,text,text,uuid,uuid,timestamptz)', 'execute'), 'registration begin is granted only to the privileged adapter role');
select ok(not has_function_privilege('anon', 'public.registration_begin(uuid,text,text,text,text,text,text,text,text,uuid,uuid,timestamptz)', 'execute'), 'anon cannot invoke registration begin');
select ok(not has_function_privilege('authenticated', 'public.registration_begin(uuid,text,text,text,text,text,text,text,text,uuid,uuid,timestamptz)', 'execute'), 'authenticated cannot invoke privileged registration begin');
select ok(not has_function_privilege('anon', 'public.registration_activation_status(uuid,text,timestamptz)', 'execute'), 'anon cannot inspect activation state');
select ok(not has_function_privilege('authenticated', 'public.registration_activation_status(uuid,text,timestamptz)', 'execute'), 'authenticated cannot inspect activation state through the privileged RPC');
select ok(has_function_privilege('service_role', 'public.registration_release_personal_account_reservation(uuid,text,text,text,uuid,timestamptz)', 'execute'), 'only the privileged adapter can release a failed account reservation');
select ok(not has_function_privilege('anon', 'public.registration_release_personal_account_reservation(uuid,text,text,text,uuid,timestamptz)', 'execute'), 'anon cannot release an account reservation');
select ok(has_function_privilege('service_role', 'public.registration_operational_issue_provision(uuid,text,text,text,text,uuid,timestamptz)', 'execute'), 'restricted provisioning operation is granted to the privileged adapter role');
select ok(not has_function_privilege('anon', 'public.registration_operational_issue_provision(uuid,text,text,text,text,uuid,timestamptz)', 'execute'), 'anon cannot issue employee provisions');

select results_eq($$
  select result_category from public.registration_operational_issue_provision(
    '60000000-0000-4000-8000-000000000010', 'FY7K3M9Q2D',
    'operational@onibank.example.test', repeat('f',64), 'pgtap-operational',
    '60000000-0000-4000-8000-000000000020',
    statement_timestamp()
  )
$$, array['CREATED'::text], 'restricted operation creates a 30-day provision');
select results_eq($$
  select result_category from public.registration_operational_issue_provision(
    '60000000-0000-4000-8000-000000000011', 'FY7K3M9Q2D',
    'operational@onibank.example.test', repeat('e',64), 'pgtap-duplicate',
    '60000000-0000-4000-8000-000000000021',
    statement_timestamp()
  )
$$, array['CLAIMABLE_PROVISION_EXISTS'::text], 'restricted operation cannot create a second claimable provision');
select results_eq($$
  select result_category from public.registration_operational_revoke_provision(
    '60000000-0000-4000-8000-000000000010', 'TEST_REVOCATION',
    '60000000-0000-4000-8000-000000000022', statement_timestamp()
  )
$$, array['REVOKED_BEFORE_ACTIVATION'::text], 'unused provision revocation takes effect immediately');
select is((select status from private.employee_provisions where provision_id = '60000000-0000-4000-8000-000000000010'), 'REVOKED', 'revoked provision remains as an immutable historical row');
select is((select count(*)::integer from private.registration_audit_events where event_kind like 'OPERATIONAL_PROVISION_%'), 3, 'every operational issue/revoke outcome produces append-only audit metadata');

select throws_ok($$
  insert into private.employee_provisions (
    provision_id, employer_id, work_email_normalized, work_email_fingerprint,
    status, available_from, expires_at
  ) values (
    '60000000-0000-4000-8000-000000000001',
    '44444444-4444-4444-8444-444444444444', 'wrong-window@onibank.example.test',
    repeat('a', 64), 'ELIGIBLE', statement_timestamp(), statement_timestamp() + interval '29 days'
  )
$$, '23514'::char(5), null, 'provision eligibility window is exactly 30 days');

select throws_ok($$
  insert into private.employee_provisions (
    provision_id, employer_id, work_email_normalized, work_email_fingerprint,
    status, available_from, expires_at
  ) values (
    '60000000-0000-4000-8000-000000000002',
    '44444444-4444-4444-8444-444444444444', 'newstarter@onibank.example.test',
    repeat('b', 64), 'ELIGIBLE', statement_timestamp(), statement_timestamp() + interval '30 days'
  )
$$, '23505'::char(5), null, 'only one claimable provision exists for an employer and work email');

select results_eq($$
  select result_category, should_deliver
  from public.registration_begin(
    '61000000-0000-4000-8000-000000000001', 'begin-real-0001', repeat('1',64),
    'FY7K3M9Q2D', 'newstarter@onibank.example.test', repeat('2',64),
    repeat('3',64), 'salt-real', 'registration-code-hmac/1',
    '62000000-0000-4000-8000-000000000001',
    '63000000-0000-4000-8000-000000000001', statement_timestamp()
  )
$$, $$values ('ACCEPTED'::text, true)$$, 'eligible details reserve one real challenge');

select results_eq($$
  select result_category, should_deliver
  from public.registration_begin(
    '61000000-0000-4000-8000-000000000002', 'begin-decoy-001', repeat('4',64),
    'UNKNOWN999', 'nobody@example.test', repeat('5',64),
    repeat('6',64), 'salt-decoy', 'registration-code-hmac/1',
    '62000000-0000-4000-8000-000000000002',
    '63000000-0000-4000-8000-000000000002', statement_timestamp()
  )
$$, $$values ('ACCEPTED'::text, false)$$, 'unknown details receive the same public accepted category without mail');

select is((select state from private.registration_attempts where registration_id = '61000000-0000-4000-8000-000000000002'), 'DETAILS_DECOY', 'unmatched attempt is internally decoyed');
select is((select code_digest from private.registration_attempts where registration_id = '61000000-0000-4000-8000-000000000001'), repeat('3',64), 'only the supplied keyed code digest is retained');
select is((select count(*)::integer from private.registration_email_deliveries where registration_id = '61000000-0000-4000-8000-000000000001'), 1, 'one delivery reservation is recorded');

select results_eq($$
  select result_category, registration_id
  from public.registration_begin(
    '61000000-0000-4000-8000-000000000099', 'begin-real-0001', repeat('1',64),
    'FY7K3M9Q2D', 'newstarter@onibank.example.test', repeat('2',64),
    repeat('7',64), 'new-salt', 'registration-code-hmac/1',
    '62000000-0000-4000-8000-000000000099',
    '63000000-0000-4000-8000-000000000099', statement_timestamp()
  )
$$, $$values ('ACCEPTED'::text, '61000000-0000-4000-8000-000000000001'::uuid)$$, 'exact begin retry returns the original attempt');

select results_eq($$
  select result_category
  from public.registration_begin(
    '61000000-0000-4000-8000-000000000098', 'begin-real-0001', repeat('8',64),
    'FY7K3M9Q2D', 'newstarter@onibank.example.test', repeat('2',64),
    repeat('7',64), 'new-salt', 'registration-code-hmac/1',
    '62000000-0000-4000-8000-000000000098',
    '63000000-0000-4000-8000-000000000098', statement_timestamp()
  )
$$, array['IDEMPOTENCY_CONFLICT'::text], 'conflicting begin idempotency reuse is rejected');

select results_eq($$
  select result_category, verified
  from public.registration_verify_work_code(
    '61000000-0000-4000-8000-000000000001', 'verify-real-001', repeat('9',64),
    repeat('0',64), repeat('a',64),
    '63000000-0000-4000-8000-000000000003', statement_timestamp()
  )
$$, $$values ('INVALID'::text, false)$$, 'wrong work code digest is rejected');
select is((select verification_attempt_count from private.registration_attempts where registration_id = '61000000-0000-4000-8000-000000000001'), 1, 'failed code attempt is counted');

select results_eq($$
  select result_category, verified
  from public.registration_verify_work_code(
    '61000000-0000-4000-8000-000000000001', 'verify-real-002', repeat('a',64),
    repeat('3',64), repeat('b',64),
    '63000000-0000-4000-8000-000000000004', statement_timestamp()
  )
$$, $$values ('VERIFIED'::text, true)$$, 'matching keyed digest verifies work email');
select is((select state from private.registration_attempts where registration_id = '61000000-0000-4000-8000-000000000001'), 'WORK_EMAIL_VERIFIED', 'work verification advances state');
select is((select code_digest from private.registration_attempts where registration_id = '61000000-0000-4000-8000-000000000001'), null, 'successful work verification removes challenge digest');

select results_eq($$
  select result_category, reserved
  from public.registration_reserve_personal_account(
    '61000000-0000-4000-8000-000000000001', 'personal-account-001', repeat('c',64),
    repeat('b',64), 'newstarter@onibank.example.test', repeat('d',64),
    encode(extensions.digest(convert_to('claim-nonce', 'UTF8'), 'sha256'), 'hex'),
    repeat('e',64), '62000000-0000-4000-8000-000000000010',
    '63000000-0000-4000-8000-000000000005', statement_timestamp()
  )
$$, $$values ('EMAILS_MUST_DIFFER'::text, false)$$, 'personal and verified work emails must differ');

select results_eq($$
  select result_category, reserved
  from public.registration_reserve_personal_account(
    '61000000-0000-4000-8000-000000000001', 'personal-account-002', repeat('f',64),
    repeat('b',64), 'personal.activation@example.test', repeat('1',64),
    encode(extensions.digest(convert_to('claim-nonce', 'UTF8'), 'sha256'), 'hex'),
    repeat('e',64), '62000000-0000-4000-8000-000000000011',
    '63000000-0000-4000-8000-000000000006', statement_timestamp()
  )
$$, $$values ('RESERVED'::text, true)$$, 'verified attempt reserves a distinct personal account');

select results_eq($$
  select result_category, reserved
  from public.registration_reserve_personal_account(
    '61000000-0000-4000-8000-000000000001', 'personal-account-concurrent', repeat('2',64),
    repeat('e',64), 'personal.activation@example.test', repeat('1',64),
    repeat('3',64), repeat('4',64), '62000000-0000-4000-8000-000000000012',
    '63000000-0000-4000-8000-000000000007', statement_timestamp()
  )
$$, $$values ('PROCESSING'::text, false)$$, 'a concurrent account-creation follower cannot reserve a second Auth operation');
select is((select count(*)::integer from private.registration_email_deliveries where registration_id = '61000000-0000-4000-8000-000000000001' and purpose = 'PERSONAL_CONFIRMATION'), 1, 'concurrent account creation reserves only one initial confirmation delivery');

do $$
begin
  perform public.registration_mark_delivery(
    '61000000-0000-4000-8000-000000000001',
    '62000000-0000-4000-8000-000000000011', 'FAILED',
    '63000000-0000-4000-8000-000000000007', statement_timestamp()
  );
end;
$$;
select results_eq($$
  select public.registration_release_personal_account_reservation(
    '61000000-0000-4000-8000-000000000001', 'personal-account-002', repeat('f',64),
    repeat('e',64), '63000000-0000-4000-8000-000000000008', statement_timestamp()
  )
$$, $$values (true)$$, 'a pre-Auth infrastructure failure releases the account reservation');
select is((select state from private.registration_attempts where registration_id = '61000000-0000-4000-8000-000000000001'), 'WORK_EMAIL_VERIFIED', 'released account creation returns to the verified recoverable state');
select results_eq($$
  select result_category, reserved
  from public.registration_reserve_personal_account(
    '61000000-0000-4000-8000-000000000001', 'personal-account-002', repeat('f',64),
    repeat('b',64), 'personal.activation@example.test', repeat('1',64),
    encode(extensions.digest(convert_to('claim-nonce', 'UTF8'), 'sha256'), 'hex'),
    repeat('e',64), '62000000-0000-4000-8000-000000000018',
    '63000000-0000-4000-8000-000000000009', statement_timestamp()
  )
$$, $$values ('RESERVED'::text, true)$$, 'the exact failed request can safely reserve a replacement operation');
select results_eq($$
  select count(*)::integer, count(*) filter (where status = 'FAILED')::integer
  from private.registration_email_deliveries
  where registration_id = '61000000-0000-4000-8000-000000000001'
    and purpose = 'PERSONAL_CONFIRMATION'
$$, $$values (2, 1)$$, 'recovery preserves failed-delivery evidence and creates one replacement delivery');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
  email_change, reauthentication_token, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, created_at, updated_at, is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000',
  '64000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
  'personal.activation@example.test', extensions.crypt('Track-A-Test-Password!', extensions.gen_salt('bf')),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Provisioned Test","future_you_registration_id":"61000000-0000-4000-8000-000000000001","future_you_claim_nonce":"claim-nonce"}'::jsonb,
  false, statement_timestamp(), statement_timestamp(), false, false
);

select is((select status from private.employee_provisions where provision_id = '55555555-5555-4555-8555-555555555555'), 'CLAIMED', 'auth creation claims the provision atomically');
select is((select user_id from public.employer_memberships where provision_id = '55555555-5555-4555-8555-555555555555'), '64000000-0000-4000-8000-000000000001'::uuid, 'auth creation creates one verified membership');
select is((select account_activation_state from public.profiles where user_id = '64000000-0000-4000-8000-000000000001'), 'PENDING', 'new provisioned identity remains pending');
select is((select raw_user_meta_data ? 'future_you_registration_id' from auth.users where id = '64000000-0000-4000-8000-000000000001'), false, 'registration claim metadata is removed after use');
select results_eq($$
  select result_category from public.registration_reserve_personal_confirmation_resend(
    '61000000-0000-4000-8000-000000000001', 'personal-resend-too-soon', repeat('4',64),
    repeat('e',64), '62000000-0000-4000-8000-000000000013',
    '63000000-0000-4000-8000-000000000010', statement_timestamp() + interval '30 seconds'
  )
$$, array['RATE_LIMITED'::text], 'personal confirmation resend observes the 60-second cooldown');
select results_eq($$
  select result_category from public.registration_reserve_personal_confirmation_resend(
    '61000000-0000-4000-8000-000000000001', 'personal-resend-001', repeat('5',64),
    repeat('e',64), '62000000-0000-4000-8000-000000000014',
    '63000000-0000-4000-8000-000000000011', statement_timestamp() + interval '61 seconds'
  )
$$, array['ACCEPTED'::text], 'personal confirmation resend is accepted after cooldown');
do $$
begin
  perform result_category from public.registration_reserve_personal_confirmation_resend(
    '61000000-0000-4000-8000-000000000001', 'personal-resend-002', repeat('6',64),
    repeat('e',64), '62000000-0000-4000-8000-000000000015',
    '63000000-0000-4000-8000-000000000012', statement_timestamp() + interval '122 seconds'
  );
  perform result_category from public.registration_reserve_personal_confirmation_resend(
    '61000000-0000-4000-8000-000000000001', 'personal-resend-003', repeat('7',64),
    repeat('e',64), '62000000-0000-4000-8000-000000000016',
    '63000000-0000-4000-8000-000000000013', statement_timestamp() + interval '183 seconds'
  );
end;
$$;
select is((select count(*)::integer from private.registration_email_deliveries where registration_id = '61000000-0000-4000-8000-000000000001' and purpose = 'PERSONAL_CONFIRMATION' and delivery_kind = 'RESEND'), 3, 'personal confirmation records at most three accepted resends in the hour');
select results_eq($$
  select result_category from public.registration_reserve_personal_confirmation_resend(
    '61000000-0000-4000-8000-000000000001', 'personal-resend-004', repeat('8',64),
    repeat('e',64), '62000000-0000-4000-8000-000000000017',
    '63000000-0000-4000-8000-000000000014', statement_timestamp() + interval '244 seconds'
  )
$$, array['RATE_LIMITED'::text], 'a fourth personal confirmation resend in one hour is rejected');
select results_eq($$
  select result_category from public.registration_operational_revoke_provision(
    '55555555-5555-4555-8555-555555555555', 'EMPLOYMENT_ENDED',
    '63000000-0000-4000-8000-000000000009', statement_timestamp()
  )
$$, array['MEMBERSHIP_DEACTIVATED'::text], 'post-claim revocation deactivates only the employer membership');
select is((select status from public.employer_memberships where provision_id = '55555555-5555-4555-8555-555555555555'), 'INACTIVE', 'post-claim membership becomes inactive');
select is((select account_activation_state from public.profiles where user_id = '64000000-0000-4000-8000-000000000001'), 'PENDING', 'membership revocation does not rewrite personal-account activation state');
select is((select count(*)::integer from private.registration_audit_events where event_kind = 'OPERATIONAL_PROVISION_REVOKE'), 2, 'pre- and post-activation revocations are both audited');

select throws_ok($$
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
    email_change, reauthentication_token, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at, is_sso_user, is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000',
    '64000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'bypass@example.test', extensions.crypt('Track-A-Test-Password!', extensions.gen_salt('bf')),
    '', '', '', '', '', '', '{}', '{}', false,
    statement_timestamp(), statement_timestamp(), false, false
  )
$$, '42501'::char(5), null, 'direct auth identity creation without a registration claim is blocked');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"64000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*)::integer from public.employer_memberships), 1, 'member can read only their own verified membership');
select throws_ok($$update public.employer_memberships set status = 'INACTIVE'$$, '42501'::char(5), null, 'member cannot deactivate or rewrite verified membership');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select is((select count(*)::integer from public.employer_memberships), 0, 'another user cannot read the provisioned membership');

select * from finish();
rollback;
