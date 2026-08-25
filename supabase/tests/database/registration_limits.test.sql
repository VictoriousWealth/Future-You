begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(29);

select results_eq($$
  select result_category from public.registration_operational_issue_provision(
    '70000000-0000-4000-8000-000000000001', 'FY7K3M9Q2D',
    'resend-policy@onibank.example.test', repeat('1',64), 'limits-resend',
    '71000000-0000-4000-8000-000000000001', '2026-08-25 12:00:00+00'
  )
$$, array['CREATED'::text], 'creates a provision for code replacement tests');
select results_eq($$
  select result_category, should_deliver from public.registration_begin(
    '72000000-0000-4000-8000-000000000001', 'limits-begin-resend', repeat('2',64),
    'FY7K3M9Q2D', 'resend-policy@onibank.example.test', repeat('3',64),
    repeat('a',64), 'salt-a', 'registration-code-hmac/1',
    '73000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000002', '2026-08-25 12:00:00+00'
  )
$$, $$values ('ACCEPTED'::text, true)$$, 'starts a challenge with a ten-minute code');
select results_eq($$
  select result_category from public.registration_resend_work_code(
    '72000000-0000-4000-8000-000000000001', 'limits-resend-too-soon', repeat('4',64),
    repeat('b',64), 'salt-b', 'registration-code-hmac/1',
    '73000000-0000-4000-8000-000000000002',
    '71000000-0000-4000-8000-000000000003', '2026-08-25 12:00:30+00'
  )
$$, array['RATE_LIMITED'::text], 'work-code resend observes the 60-second cooldown');
select results_eq($$
  select result_category, should_deliver from public.registration_resend_work_code(
    '72000000-0000-4000-8000-000000000001', 'limits-resend-accepted', repeat('5',64),
    repeat('b',64), 'salt-b', 'registration-code-hmac/1',
    '73000000-0000-4000-8000-000000000003',
    '71000000-0000-4000-8000-000000000004', '2026-08-25 12:01:01+00'
  )
$$, $$values ('ACCEPTED'::text, true)$$, 'work-code resend is accepted after cooldown');
select results_eq($$
  select result_category, verified from public.registration_verify_work_code(
    '72000000-0000-4000-8000-000000000001', 'limits-old-code', repeat('6',64),
    repeat('a',64), repeat('c',64),
    '71000000-0000-4000-8000-000000000005', '2026-08-25 12:01:02+00'
  )
$$, $$values ('INVALID'::text, false)$$, 'resending invalidates the previous unexpired work code');
select results_eq($$
  select result_category, verified from public.registration_verify_work_code(
    '72000000-0000-4000-8000-000000000001', 'limits-new-code', repeat('7',64),
    repeat('b',64), repeat('d',64),
    '71000000-0000-4000-8000-000000000006', '2026-08-25 12:01:03+00'
  )
$$, $$values ('VERIFIED'::text, true)$$, 'the replacement work code verifies once');
select results_eq($$
  select result_category, verified from public.registration_verify_work_code(
    '72000000-0000-4000-8000-000000000001', 'limits-code-replay', repeat('8',64),
    repeat('b',64), repeat('e',64),
    '71000000-0000-4000-8000-000000000007', '2026-08-25 12:01:04+00'
  )
$$, $$values ('INVALID'::text, false)$$, 'a consumed work code cannot be replayed as a new request');
select results_eq($$
  select result_category, reserved from public.registration_reserve_personal_account(
    '72000000-0000-4000-8000-000000000001', 'limits-expired-activation', repeat('9',64),
    repeat('d',64), 'private-resend@example.test', repeat('f',64),
    repeat('1',64), repeat('2',64), '73000000-0000-4000-8000-000000000004',
    '71000000-0000-4000-8000-000000000008', '2026-08-25 12:32:04+00'
  )
$$, $$values ('ACTIVATION_INVALID'::text, false)$$, 'verified activation expires after thirty minutes of inactivity');
select results_eq($$
  select result_category from public.registration_operational_revoke_provision(
    '70000000-0000-4000-8000-000000000001', 'TEST_PREACTIVATION_REVOKE',
    '71000000-0000-4000-8000-000000000009', '2026-08-25 12:33:00+00'
  )
$$, array['REVOKED_BEFORE_ACTIVATION'::text], 'a verified but unclaimed provision can be revoked');
select is((select state from private.registration_attempts where registration_id = '72000000-0000-4000-8000-000000000001'), 'PROVISION_REVOKED', 'revocation invalidates the associated activation attempt');
select is((select activation_digest from private.registration_attempts where registration_id = '72000000-0000-4000-8000-000000000001'), null, 'revocation clears the server-side activation digest');

select results_eq($$
  select result_category from public.registration_operational_issue_provision(
    '70000000-0000-4000-8000-000000000002', 'FY7K3M9Q2D',
    'hour-limit@onibank.example.test', repeat('2',64), 'limits-hour',
    '71000000-0000-4000-8000-000000000010', '2026-08-25 12:00:00+00'
  )
$$, array['CREATED'::text], 'creates a provision for hourly resend limits');
select results_eq($$
  select result_category from public.registration_begin(
    '72000000-0000-4000-8000-000000000002', 'limits-begin-hour', repeat('3',64),
    'FY7K3M9Q2D', 'hour-limit@onibank.example.test', repeat('4',64),
    repeat('a',64), 'salt-hour', 'registration-code-hmac/1',
    '73000000-0000-4000-8000-000000000010',
    '71000000-0000-4000-8000-000000000011', '2026-08-25 12:00:00+00'
  )
$$, array['ACCEPTED'::text], 'starts the hourly-limit challenge');
do $$
begin
  perform result_category from public.registration_resend_work_code(
    '72000000-0000-4000-8000-000000000002', 'hour-resend-001', repeat('5',64),
    repeat('b',64), 'salt-1', 'registration-code-hmac/1',
    '73000000-0000-4000-8000-000000000011',
    '71000000-0000-4000-8000-000000000012', '2026-08-25 12:01:01+00'
  );
  perform result_category from public.registration_resend_work_code(
    '72000000-0000-4000-8000-000000000002', 'hour-resend-002', repeat('6',64),
    repeat('c',64), 'salt-2', 'registration-code-hmac/1',
    '73000000-0000-4000-8000-000000000012',
    '71000000-0000-4000-8000-000000000013', '2026-08-25 12:02:02+00'
  );
  perform result_category from public.registration_resend_work_code(
    '72000000-0000-4000-8000-000000000002', 'hour-resend-003', repeat('7',64),
    repeat('d',64), 'salt-3', 'registration-code-hmac/1',
    '73000000-0000-4000-8000-000000000013',
    '71000000-0000-4000-8000-000000000014', '2026-08-25 12:03:03+00'
  );
end;
$$;
select is((select count(*)::integer from private.registration_email_deliveries where registration_id = '72000000-0000-4000-8000-000000000002' and delivery_kind = 'RESEND'), 3, 'three work-code resends can be accepted in one hour');
select results_eq($$
  select result_category from public.registration_resend_work_code(
    '72000000-0000-4000-8000-000000000002', 'hour-resend-004', repeat('8',64),
    repeat('e',64), 'salt-4', 'registration-code-hmac/1',
    '73000000-0000-4000-8000-000000000014',
    '71000000-0000-4000-8000-000000000015', '2026-08-25 12:04:04+00'
  )
$$, array['RATE_LIMITED'::text], 'a fourth work-code resend in one hour is rejected');

select results_eq($$
  select result_category from public.registration_operational_issue_provision(
    '70000000-0000-4000-8000-000000000003', 'FY7K3M9Q2D',
    'day-limit@onibank.example.test', repeat('3',64), 'limits-day',
    '71000000-0000-4000-8000-000000000016', '2026-08-25 12:00:00+00'
  )
$$, array['CREATED'::text], 'creates a provision for daily send limits');
select results_eq($$
  select result_category from public.registration_begin(
    '72000000-0000-4000-8000-000000000003', 'limits-begin-day', repeat('4',64),
    'FY7K3M9Q2D', 'day-limit@onibank.example.test', repeat('5',64),
    repeat('a',64), 'salt-day', 'registration-code-hmac/1',
    '73000000-0000-4000-8000-000000000020',
    '71000000-0000-4000-8000-000000000017', '2026-08-25 12:00:00+00'
  )
$$, array['ACCEPTED'::text], 'starts the daily-limit challenge');
insert into private.registration_email_deliveries (
  delivery_id, registration_id, purpose, delivery_kind, status, created_at, completed_at
)
select extensions.gen_random_uuid(), '72000000-0000-4000-8000-000000000003',
  'WORK_CODE', 'RESEND', 'SENT',
  '2026-08-25 12:00:00+00'::timestamptz + series.value * interval '2 hours',
  '2026-08-25 12:00:00+00'::timestamptz + series.value * interval '2 hours'
from generate_series(1, 9) as series(value);
select is((select count(*)::integer from private.registration_email_deliveries where registration_id = '72000000-0000-4000-8000-000000000003'), 10, 'daily-limit fixture has ten sends in the prior twenty-four hours');
select results_eq($$
  select result_category from public.registration_resend_work_code(
    '72000000-0000-4000-8000-000000000003', 'day-resend-010', repeat('6',64),
    repeat('b',64), 'salt-day-new', 'registration-code-hmac/1',
    '73000000-0000-4000-8000-000000000030',
    '71000000-0000-4000-8000-000000000018', '2026-08-26 08:00:00+00'
  )
$$, array['RATE_LIMITED'::text], 'an eleventh code send within twenty-four hours is rejected');

select results_eq($$
  select result_category from public.registration_operational_issue_provision(
    '70000000-0000-4000-8000-000000000004', 'FY7K3M9Q2D',
    'expiry-policy@onibank.example.test', repeat('4',64), 'limits-expiry',
    '71000000-0000-4000-8000-000000000019', '2026-08-25 12:00:00+00'
  )
$$, array['CREATED'::text], 'creates a provision for code expiry tests');
select results_eq($$
  select result_category from public.registration_begin(
    '72000000-0000-4000-8000-000000000004', 'limits-begin-expiry', repeat('5',64),
    'FY7K3M9Q2D', 'expiry-policy@onibank.example.test', repeat('6',64),
    repeat('a',64), 'salt-expiry', 'registration-code-hmac/1',
    '73000000-0000-4000-8000-000000000040',
    '71000000-0000-4000-8000-000000000020', '2026-08-25 12:00:00+00'
  )
$$, array['ACCEPTED'::text], 'starts the expiring challenge');
select results_eq($$
  select result_category, verified from public.registration_verify_work_code(
    '72000000-0000-4000-8000-000000000004', 'limits-expired-code', repeat('7',64),
    repeat('a',64), repeat('b',64),
    '71000000-0000-4000-8000-000000000021', '2026-08-25 12:10:00+00'
  )
$$, $$values ('INVALID'::text, false)$$, 'a code is invalid at its ten-minute expiry boundary');
select results_eq($$
  select result_category, verified from public.registration_verify_work_code(
    '72000000-0000-4000-8000-000000000004', 'limits-expired-code-later', repeat('8',64),
    repeat('a',64), repeat('c',64),
    '71000000-0000-4000-8000-000000000022', '2026-08-25 12:11:00+00'
  )
$$, $$values ('INVALID'::text, false)$$, 'an expired code remains unusable');

select results_eq($$
  select result_category from public.registration_operational_issue_provision(
    '70000000-0000-4000-8000-000000000005', 'FY7K3M9Q2D',
    'attempt-policy@onibank.example.test', repeat('5',64), 'limits-attempts',
    '71000000-0000-4000-8000-000000000023', '2026-08-25 12:00:00+00'
  )
$$, array['CREATED'::text], 'creates a provision for failed-attempt limits');
select results_eq($$
  select result_category from public.registration_begin(
    '72000000-0000-4000-8000-000000000005', 'limits-begin-attempts', repeat('6',64),
    'FY7K3M9Q2D', 'attempt-policy@onibank.example.test', repeat('7',64),
    repeat('a',64), 'salt-attempts', 'registration-code-hmac/1',
    '73000000-0000-4000-8000-000000000050',
    '71000000-0000-4000-8000-000000000024', '2026-08-25 12:00:00+00'
  )
$$, array['ACCEPTED'::text], 'starts the attempt-limited challenge');
do $$
begin
  perform result_category from public.registration_verify_work_code(
    '72000000-0000-4000-8000-000000000005', 'wrong-attempt-001', repeat('1',64), repeat('b',64), repeat('c',64),
    '71000000-0000-4000-8000-000000000025', '2026-08-25 12:00:01+00'
  );
  perform result_category from public.registration_verify_work_code(
    '72000000-0000-4000-8000-000000000005', 'wrong-attempt-002', repeat('2',64), repeat('b',64), repeat('c',64),
    '71000000-0000-4000-8000-000000000026', '2026-08-25 12:00:02+00'
  );
  perform result_category from public.registration_verify_work_code(
    '72000000-0000-4000-8000-000000000005', 'wrong-attempt-003', repeat('3',64), repeat('b',64), repeat('c',64),
    '71000000-0000-4000-8000-000000000027', '2026-08-25 12:00:03+00'
  );
  perform result_category from public.registration_verify_work_code(
    '72000000-0000-4000-8000-000000000005', 'wrong-attempt-004', repeat('4',64), repeat('b',64), repeat('c',64),
    '71000000-0000-4000-8000-000000000028', '2026-08-25 12:00:04+00'
  );
end;
$$;
select results_eq($$
  select result_category, verified from public.registration_verify_work_code(
    '72000000-0000-4000-8000-000000000005', 'wrong-attempt-005', repeat('5',64),
    repeat('b',64), repeat('c',64),
    '71000000-0000-4000-8000-000000000029', '2026-08-25 12:00:05+00'
  )
$$, $$values ('EXHAUSTED'::text, false)$$, 'the fifth failed work-code attempt exhausts the challenge');
select is((select verification_attempt_count from private.registration_attempts where registration_id = '72000000-0000-4000-8000-000000000005'), 5, 'failed verification count is capped at five');
select is((select state from private.registration_attempts where registration_id = '72000000-0000-4000-8000-000000000005'), 'ATTEMPTS_EXHAUSTED', 'the exhausted challenge enters a terminal state');
select results_eq($$
  select result_category, verified from public.registration_verify_work_code(
    '72000000-0000-4000-8000-000000000005', 'correct-after-exhaustion', repeat('6',64),
    repeat('a',64), repeat('d',64),
    '71000000-0000-4000-8000-000000000030', '2026-08-25 12:00:06+00'
  )
$$, $$values ('INVALID'::text, false)$$, 'the correct code cannot be used after attempts are exhausted');

select * from finish();
rollback;
