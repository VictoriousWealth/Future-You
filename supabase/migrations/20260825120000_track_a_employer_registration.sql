create table private.employers (
  employer_id uuid primary key,
  public_company_id text not null unique
    check (public_company_id = upper(public_company_id))
    check (char_length(public_company_id) between 8 and 32),
  display_name text not null check (char_length(display_name) between 1 and 160),
  status text not null check (status in ('ACTIVE', 'SUSPENDED', 'RETIRED')),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp()
);

create table private.employee_provisions (
  provision_id uuid primary key,
  employer_id uuid not null references private.employers (employer_id),
  work_email_normalized text not null
    check (work_email_normalized = lower(work_email_normalized))
    check (char_length(work_email_normalized) between 3 and 320),
  work_email_fingerprint text not null check (char_length(work_email_fingerprint) = 64),
  external_reference text,
  status text not null check (status in ('ELIGIBLE', 'CLAIMED', 'REVOKED', 'EXPIRED')),
  available_from timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revocation_reason_code text,
  claimed_user_id uuid references auth.users (id),
  claimed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  check (expires_at = available_from + interval '30 days'),
  check (
    (status = 'CLAIMED' and claimed_user_id is not null and claimed_at is not null)
    or (status <> 'CLAIMED' and claimed_user_id is null and claimed_at is null)
  ),
  check (
    (status = 'REVOKED' and revoked_at is not null and revocation_reason_code is not null)
    or (status <> 'REVOKED' and revoked_at is null and revocation_reason_code is null)
  )
);

create unique index employee_provisions_one_claimable_idx
  on private.employee_provisions (employer_id, work_email_normalized)
  where status = 'ELIGIBLE';
create index employee_provisions_lookup_idx
  on private.employee_provisions (employer_id, work_email_normalized, status, expires_at);

create table private.registration_attempts (
  registration_id uuid primary key,
  provision_id uuid references private.employee_provisions (provision_id),
  request_fingerprint text not null check (char_length(request_fingerprint) = 64),
  state text not null check (state in (
    'CODE_PENDING', 'DETAILS_DECOY', 'WORK_EMAIL_VERIFIED',
    'ACCOUNT_CREATION_RESERVED', 'AUTH_IDENTITY_PENDING_CONFIRMATION',
    'PERSONAL_EMAIL_CONFIRMED', 'ACTIVE', 'ACCOUNT_CONFLICT',
    'ATTEMPTS_EXHAUSTED', 'REGISTRATION_EXPIRED', 'PROVISION_REVOKED',
    'PROVISION_ALREADY_CLAIMED', 'CANCELLED'
  )),
  submitted_work_email_fingerprint text not null check (char_length(submitted_work_email_fingerprint) = 64),
  code_digest text,
  code_salt text,
  code_key_version text,
  code_expires_at timestamptz,
  verification_attempt_count integer not null default 0 check (verification_attempt_count between 0 and 5),
  next_resend_at timestamptz,
  work_email_verified_at timestamptz,
  activation_digest text,
  previous_activation_digest text,
  activation_last_activity_at timestamptz,
  activation_expires_at timestamptz,
  personal_email_fingerprint text,
  personal_confirmation_next_resend_at timestamptz,
  auth_claim_digest text,
  auth_user_id uuid unique references auth.users (id),
  personal_email_confirmed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz,
  check (
    provision_id is not null
    or state in ('DETAILS_DECOY', 'ATTEMPTS_EXHAUSTED', 'REGISTRATION_EXPIRED', 'CANCELLED')
  )
);

create index registration_attempts_provision_idx
  on private.registration_attempts (provision_id, created_at desc);
create index registration_attempts_auth_user_idx
  on private.registration_attempts (auth_user_id)
  where auth_user_id is not null;

create table private.registration_request_keys (
  registration_id uuid not null references private.registration_attempts (registration_id),
  operation text not null check (char_length(operation) between 1 and 80),
  request_id text not null check (char_length(request_id) between 8 and 100),
  request_fingerprint text not null check (char_length(request_fingerprint) = 64),
  result_category text not null check (char_length(result_category) between 1 and 80),
  created_at timestamptz not null default statement_timestamp(),
  primary key (registration_id, operation, request_id)
);

create table private.registration_email_deliveries (
  delivery_id uuid primary key,
  registration_id uuid not null references private.registration_attempts (registration_id),
  purpose text not null check (purpose in ('WORK_CODE', 'PERSONAL_CONFIRMATION')),
  delivery_kind text not null check (delivery_kind in ('INITIAL', 'RESEND')),
  status text not null check (status in ('RESERVED', 'SENT', 'FAILED')),
  created_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz
);

create index registration_email_deliveries_rate_idx
  on private.registration_email_deliveries (registration_id, purpose, created_at desc);

create table private.registration_audit_events (
  event_id bigint generated always as identity primary key,
  correlation_id uuid not null,
  registration_id uuid references private.registration_attempts (registration_id),
  provision_id uuid references private.employee_provisions (provision_id),
  event_kind text not null check (char_length(event_kind) between 1 and 100),
  result_category text not null check (char_length(result_category) between 1 and 100),
  attempt_count integer,
  created_at timestamptz not null default statement_timestamp()
);

create index registration_audit_registration_idx
  on private.registration_audit_events (registration_id, created_at desc);

create table public.employer_memberships (
  user_id uuid primary key references auth.users (id) on delete cascade,
  employer_id uuid not null,
  employer_display_name text not null check (char_length(employer_display_name) between 1 and 160),
  provision_id uuid not null unique,
  work_email_normalized text not null
    check (work_email_normalized = lower(work_email_normalized))
    check (char_length(work_email_normalized) between 3 and 320),
  status text not null check (status in ('ACTIVE', 'INACTIVE')),
  source text not null check (source = 'employer_provisioned'),
  verified_at timestamptz not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint employer_membership_employer_fk
    foreign key (employer_id) references private.employers (employer_id),
  constraint employer_membership_provision_fk
    foreign key (provision_id) references private.employee_provisions (provision_id)
);

alter table public.profiles
  add column registration_origin text not null default 'legacy_fixture'
    check (registration_origin in ('legacy_fixture', 'employer_provisioned')),
  add column personal_email_confirmed_at timestamptz,
  add column account_activation_state text not null default 'ACTIVE'
    check (account_activation_state in ('PENDING', 'ACTIVE'));

update public.profiles as profile
set personal_email_confirmed_at = auth_user.email_confirmed_at
from auth.users as auth_user
where auth_user.id = profile.user_id
  and profile.personal_email_confirmed_at is null;

create trigger employer_memberships_set_updated_at
before update on public.employer_memberships
for each row execute function public.set_profile_updated_at();

create function private.reject_membership_identity_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id
    or new.employer_id is distinct from old.employer_id
    or new.provision_id is distinct from old.provision_id
    or new.work_email_normalized is distinct from old.work_email_normalized
    or new.source is distinct from old.source
    or new.verified_at is distinct from old.verified_at
    or new.created_at is distinct from old.created_at then
    raise exception using errcode = '55000', message = 'verified employer membership identity is immutable';
  end if;
  return new;
end;
$$;

revoke all on function private.reject_membership_identity_mutation() from public, anon, authenticated;

create trigger employer_membership_identity_is_immutable
before update on public.employer_memberships
for each row execute function private.reject_membership_identity_mutation();

alter table public.employer_memberships enable row level security;
alter table public.employer_memberships force row level security;
revoke all on table public.employer_memberships from public, anon, authenticated;
grant select on table public.employer_memberships to authenticated;

create policy employer_memberships_select_own
on public.employer_memberships for select to authenticated
using ((select auth.uid()) = user_id);

create function public.registration_begin(
  p_registration_id uuid,
  p_request_id text,
  p_request_fingerprint text,
  p_company_id text,
  p_work_email_normalized text,
  p_work_email_fingerprint text,
  p_code_digest text,
  p_code_salt text,
  p_code_key_version text,
  p_delivery_id uuid,
  p_correlation_id uuid,
  p_now timestamptz
)
returns table(
  result_category text,
  registration_id uuid,
  should_deliver boolean,
  delivery_id uuid,
  delivery_address text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing private.registration_request_keys%rowtype;
  v_employer private.employers%rowtype;
  v_provision private.employee_provisions%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('registration-begin:' || p_request_id, 0));

  select key.* into v_existing
  from private.registration_request_keys as key
  where key.operation = 'BEGIN'
    and key.request_id = p_request_id
  order by key.created_at desc
  limit 1;
  if found then
    if v_existing.request_fingerprint <> p_request_fingerprint then
      return query select 'IDEMPOTENCY_CONFLICT'::text, v_existing.registration_id, false, null::uuid, null::text;
    else
      return query select v_existing.result_category, v_existing.registration_id, false, null::uuid, null::text;
    end if;
    return;
  end if;

  select employer.* into v_employer
  from private.employers as employer
  where employer.public_company_id = p_company_id
    and employer.status = 'ACTIVE';

  if found then
    update private.employee_provisions
    set status = 'EXPIRED', updated_at = p_now
    where employer_id = v_employer.employer_id
      and work_email_normalized = p_work_email_normalized
      and status = 'ELIGIBLE'
      and expires_at <= p_now;

    select provision.* into v_provision
    from private.employee_provisions as provision
    where provision.employer_id = v_employer.employer_id
      and provision.work_email_normalized = p_work_email_normalized
      and provision.status = 'ELIGIBLE'
      and provision.available_from <= p_now
      and provision.expires_at > p_now
    for update;
  end if;

  if v_provision.provision_id is null then
    insert into private.registration_attempts (
      registration_id, request_fingerprint, state, submitted_work_email_fingerprint
    ) values (
      p_registration_id, p_request_fingerprint, 'DETAILS_DECOY', p_work_email_fingerprint
    );
    insert into private.registration_request_keys (
      registration_id, operation, request_id, request_fingerprint, result_category
    ) values (
      p_registration_id, 'BEGIN', p_request_id, p_request_fingerprint, 'ACCEPTED'
    );
    insert into private.registration_audit_events (
      correlation_id, registration_id, event_kind, result_category
    ) values (p_correlation_id, p_registration_id, 'DETAILS_SUBMITTED', 'DECOY_ACCEPTED');
    return query select 'ACCEPTED'::text, p_registration_id, false, null::uuid, null::text;
    return;
  end if;

  insert into private.registration_attempts (
    registration_id, provision_id, request_fingerprint, state,
    submitted_work_email_fingerprint, code_digest, code_salt, code_key_version,
    code_expires_at, next_resend_at
  ) values (
    p_registration_id, v_provision.provision_id, p_request_fingerprint, 'CODE_PENDING',
    p_work_email_fingerprint, p_code_digest, p_code_salt, p_code_key_version,
    p_now + interval '10 minutes', p_now + interval '60 seconds'
  );
  insert into private.registration_request_keys (
    registration_id, operation, request_id, request_fingerprint, result_category
  ) values (
    p_registration_id, 'BEGIN', p_request_id, p_request_fingerprint, 'ACCEPTED'
  );
  insert into private.registration_email_deliveries (
    delivery_id, registration_id, purpose, delivery_kind, status, created_at
  ) values (p_delivery_id, p_registration_id, 'WORK_CODE', 'INITIAL', 'RESERVED', p_now);
  insert into private.registration_audit_events (
    correlation_id, registration_id, provision_id, event_kind, result_category
  ) values (
    p_correlation_id, p_registration_id, v_provision.provision_id,
    'DETAILS_SUBMITTED', 'CHALLENGE_RESERVED'
  );
  return query select 'ACCEPTED'::text, p_registration_id, true, p_delivery_id, v_provision.work_email_normalized;
end;
$$;

create function public.registration_mark_delivery(
  p_registration_id uuid,
  p_delivery_id uuid,
  p_status text,
  p_correlation_id uuid,
  p_now timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provision_id uuid;
begin
  if p_status not in ('SENT', 'FAILED') then
    raise exception using errcode = '22023', message = 'invalid delivery status';
  end if;
  update private.registration_email_deliveries
  set status = p_status, completed_at = p_now
  where delivery_id = p_delivery_id
    and registration_id = p_registration_id
    and status = 'RESERVED';
  select provision_id into v_provision_id
  from private.registration_attempts where registration_id = p_registration_id;
  insert into private.registration_audit_events (
    correlation_id, registration_id, provision_id, event_kind, result_category
  ) values (p_correlation_id, p_registration_id, v_provision_id, 'EMAIL_DELIVERY', p_status);
end;
$$;

create function public.registration_challenge_material(p_registration_id uuid)
returns table(
  state text,
  code_digest text,
  code_salt text,
  code_key_version text,
  code_expires_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select attempt.state, attempt.code_digest, attempt.code_salt,
    attempt.code_key_version, attempt.code_expires_at
  from private.registration_attempts as attempt
  where attempt.registration_id = p_registration_id;
$$;

create function public.registration_verify_work_code(
  p_registration_id uuid,
  p_request_id text,
  p_request_fingerprint text,
  p_candidate_digest text,
  p_activation_digest text,
  p_correlation_id uuid,
  p_now timestamptz
)
returns table(result_category text, verified boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt private.registration_attempts%rowtype;
  v_existing private.registration_request_keys%rowtype;
begin
  select attempt.* into v_attempt
  from private.registration_attempts as attempt
  where attempt.registration_id = p_registration_id
  for update;
  if not found then
    return query select 'INVALID'::text, false;
    return;
  end if;

  select key.* into v_existing
  from private.registration_request_keys as key
  where key.registration_id = p_registration_id
    and key.operation = 'VERIFY_WORK_CODE'
    and key.request_id = p_request_id;
  if found then
    if v_existing.request_fingerprint <> p_request_fingerprint then
      return query select 'IDEMPOTENCY_CONFLICT'::text, false;
    elsif v_existing.result_category = 'VERIFIED' then
      update private.registration_attempts
      set activation_digest = p_activation_digest,
          activation_last_activity_at = p_now,
          activation_expires_at = p_now + interval '30 minutes',
          updated_at = p_now
      where private.registration_attempts.registration_id = p_registration_id;
      return query select 'VERIFIED'::text, true;
    else
      return query select v_existing.result_category, false;
    end if;
    return;
  end if;

  if v_attempt.state = 'DETAILS_DECOY' then
    insert into private.registration_request_keys values (
      p_registration_id, 'VERIFY_WORK_CODE', p_request_id,
      p_request_fingerprint, 'INVALID', p_now
    );
    return query select 'INVALID'::text, false;
    return;
  end if;
  if v_attempt.state <> 'CODE_PENDING'
    or v_attempt.code_expires_at is null
    or v_attempt.code_expires_at <= p_now then
    insert into private.registration_request_keys values (
      p_registration_id, 'VERIFY_WORK_CODE', p_request_id,
      p_request_fingerprint, 'INVALID', p_now
    );
    return query select 'INVALID'::text, false;
    return;
  end if;
  if v_attempt.verification_attempt_count >= 5 then
    update private.registration_attempts set state = 'ATTEMPTS_EXHAUSTED', updated_at = p_now
    where private.registration_attempts.registration_id = p_registration_id;
    insert into private.registration_request_keys values (
      p_registration_id, 'VERIFY_WORK_CODE', p_request_id,
      p_request_fingerprint, 'EXHAUSTED', p_now
    );
    return query select 'EXHAUSTED'::text, false;
    return;
  end if;

  if v_attempt.code_digest is null or v_attempt.code_digest <> p_candidate_digest then
    update private.registration_attempts
    set verification_attempt_count = least(5, verification_attempt_count + 1),
        state = case when verification_attempt_count + 1 >= 5 then 'ATTEMPTS_EXHAUSTED' else state end,
        updated_at = p_now
    where private.registration_attempts.registration_id = p_registration_id;
    insert into private.registration_request_keys values (
      p_registration_id, 'VERIFY_WORK_CODE', p_request_id,
      p_request_fingerprint,
      case when v_attempt.verification_attempt_count + 1 >= 5 then 'EXHAUSTED' else 'INVALID' end,
      p_now
    );
    return query select
      case when v_attempt.verification_attempt_count + 1 >= 5 then 'EXHAUSTED' else 'INVALID' end,
      false;
    return;
  end if;

  update private.registration_attempts
  set state = 'WORK_EMAIL_VERIFIED', code_digest = null, code_salt = null,
      code_key_version = null, code_expires_at = null,
      work_email_verified_at = p_now, activation_digest = p_activation_digest,
      activation_last_activity_at = p_now,
      activation_expires_at = p_now + interval '30 minutes', updated_at = p_now
  where private.registration_attempts.registration_id = p_registration_id;
  insert into private.registration_request_keys values (
    p_registration_id, 'VERIFY_WORK_CODE', p_request_id,
    p_request_fingerprint, 'VERIFIED', p_now
  );
  insert into private.registration_audit_events (
    correlation_id, registration_id, provision_id, event_kind, result_category,
    attempt_count
  ) values (
    p_correlation_id, p_registration_id, v_attempt.provision_id,
    'WORK_EMAIL_VERIFICATION', 'VERIFIED', v_attempt.verification_attempt_count
  );
  return query select 'VERIFIED'::text, true;
end;
$$;

create function public.registration_resend_work_code(
  p_registration_id uuid,
  p_request_id text,
  p_request_fingerprint text,
  p_code_digest text,
  p_code_salt text,
  p_code_key_version text,
  p_delivery_id uuid,
  p_correlation_id uuid,
  p_now timestamptz
)
returns table(
  result_category text,
  should_deliver boolean,
  delivery_id uuid,
  delivery_address text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt private.registration_attempts%rowtype;
  v_existing private.registration_request_keys%rowtype;
  v_address text;
  v_hour_resends integer;
  v_day_sends integer;
begin
  select attempt.* into v_attempt from private.registration_attempts as attempt
  where attempt.registration_id = p_registration_id for update;
  if not found then
    return query select 'ACCEPTED'::text, false, null::uuid, null::text;
    return;
  end if;
  select key.* into v_existing from private.registration_request_keys as key
  where key.registration_id = p_registration_id and key.operation = 'RESEND_WORK_CODE'
    and key.request_id = p_request_id;
  if found then
    if v_existing.request_fingerprint <> p_request_fingerprint then
      return query select 'IDEMPOTENCY_CONFLICT'::text, false, null::uuid, null::text;
    end if;
    return query select v_existing.result_category, false, null::uuid, null::text;
    return;
  end if;
  if v_attempt.state = 'DETAILS_DECOY' then
    insert into private.registration_request_keys values (
      p_registration_id, 'RESEND_WORK_CODE', p_request_id, p_request_fingerprint, 'ACCEPTED', p_now
    );
    return query select 'ACCEPTED'::text, false, null::uuid, null::text;
    return;
  end if;
  if v_attempt.state <> 'CODE_PENDING' or v_attempt.next_resend_at > p_now then
    return query select 'RATE_LIMITED'::text, false, null::uuid, null::text;
    return;
  end if;
  select count(*) filter (where delivery_kind = 'RESEND' and created_at > p_now - interval '1 hour'),
         count(*) filter (where created_at > p_now - interval '24 hours')
    into v_hour_resends, v_day_sends
  from private.registration_email_deliveries
  where registration_id = p_registration_id and purpose = 'WORK_CODE';
  if v_hour_resends >= 3 or v_day_sends >= 10 then
    return query select 'RATE_LIMITED'::text, false, null::uuid, null::text;
    return;
  end if;
  select provision.work_email_normalized into v_address
  from private.employee_provisions as provision where provision.provision_id = v_attempt.provision_id;
  update private.registration_attempts
  set code_digest = p_code_digest, code_salt = p_code_salt,
      code_key_version = p_code_key_version, code_expires_at = p_now + interval '10 minutes',
      verification_attempt_count = 0, next_resend_at = p_now + interval '60 seconds',
      updated_at = p_now
  where private.registration_attempts.registration_id = p_registration_id;
  insert into private.registration_email_deliveries values (
    p_delivery_id, p_registration_id, 'WORK_CODE', 'RESEND', 'RESERVED', p_now, null
  );
  insert into private.registration_request_keys values (
    p_registration_id, 'RESEND_WORK_CODE', p_request_id, p_request_fingerprint, 'ACCEPTED', p_now
  );
  insert into private.registration_audit_events (
    correlation_id, registration_id, provision_id, event_kind, result_category
  ) values (p_correlation_id, p_registration_id, v_attempt.provision_id, 'WORK_CODE_RESEND', 'ACCEPTED');
  return query select 'ACCEPTED'::text, true, p_delivery_id, v_address;
end;
$$;

create function public.registration_reserve_personal_account(
  p_registration_id uuid,
  p_request_id text,
  p_request_fingerprint text,
  p_activation_digest text,
  p_personal_email_normalized text,
  p_personal_email_fingerprint text,
  p_auth_claim_digest text,
  p_rotated_activation_digest text,
  p_delivery_id uuid,
  p_correlation_id uuid,
  p_now timestamptz
)
returns table(result_category text, reserved boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt private.registration_attempts%rowtype;
  v_existing private.registration_request_keys%rowtype;
  v_work_email text;
begin
  select attempt.* into v_attempt from private.registration_attempts as attempt
  where attempt.registration_id = p_registration_id for update;
  if not found then
    return query select 'ACTIVATION_INVALID'::text, false;
    return;
  end if;
  select key.* into v_existing from private.registration_request_keys as key
  where key.registration_id = p_registration_id and key.operation = 'CREATE_PERSONAL_ACCOUNT'
    and key.request_id = p_request_id;
  if found then
    if v_existing.request_fingerprint <> p_request_fingerprint then
      return query select 'IDEMPOTENCY_CONFLICT'::text, false;
    elsif v_attempt.activation_expires_at <= p_now
      or (v_attempt.activation_digest is distinct from p_activation_digest
        and v_attempt.previous_activation_digest is distinct from p_activation_digest) then
      return query select 'ACTIVATION_INVALID'::text, false;
    elsif v_existing.result_category = 'RETRYABLE_FAILURE'
      and v_attempt.state = 'WORK_EMAIL_VERIFIED' then
      update private.registration_attempts
      set state = 'ACCOUNT_CREATION_RESERVED',
          personal_email_fingerprint = p_personal_email_fingerprint,
          auth_claim_digest = p_auth_claim_digest,
          personal_confirmation_next_resend_at = p_now + interval '60 seconds',
          previous_activation_digest = activation_digest,
          activation_digest = p_rotated_activation_digest,
          activation_last_activity_at = p_now,
          activation_expires_at = p_now + interval '30 minutes',
          updated_at = p_now
      where private.registration_attempts.registration_id = p_registration_id;
      update private.registration_request_keys
      set result_category = 'RESERVED'
      where registration_id = p_registration_id
        and operation = 'CREATE_PERSONAL_ACCOUNT'
        and request_id = p_request_id;
      insert into private.registration_email_deliveries (
        delivery_id, registration_id, purpose, delivery_kind, status, created_at
      ) values (
        p_delivery_id, p_registration_id, 'PERSONAL_CONFIRMATION', 'INITIAL', 'RESERVED', p_now
      );
      insert into private.registration_audit_events (
        correlation_id, registration_id, provision_id, event_kind, result_category
      ) values (
        p_correlation_id, p_registration_id, v_attempt.provision_id,
        'PERSONAL_ACCOUNT_RETRY', 'RESERVED'
      );
      return query select 'RESERVED'::text, true;
    elsif v_attempt.auth_user_id is not null then
      update private.registration_attempts
      set previous_activation_digest = activation_digest,
          activation_digest = p_rotated_activation_digest,
          activation_last_activity_at = p_now,
          activation_expires_at = p_now + interval '30 minutes',
          updated_at = p_now
      where private.registration_attempts.registration_id = p_registration_id;
      return query select 'EXISTING'::text, false;
    else
      return query select 'PROCESSING'::text, false;
    end if;
    return;
  end if;
  if v_attempt.activation_digest is distinct from p_activation_digest
    or v_attempt.activation_expires_at <= p_now then
    return query select 'ACTIVATION_INVALID'::text, false;
    return;
  end if;
  if v_attempt.state = 'ACCOUNT_CREATION_RESERVED' then
    if v_attempt.personal_email_fingerprint is distinct from p_personal_email_fingerprint then
      return query select 'PERSONAL_DETAILS_CONFLICT'::text, false;
    elsif v_attempt.auth_user_id is null then
      return query select 'PROCESSING'::text, false;
    else
      update private.registration_attempts
      set previous_activation_digest = activation_digest,
          activation_digest = p_rotated_activation_digest,
          activation_last_activity_at = p_now,
          activation_expires_at = p_now + interval '30 minutes',
          updated_at = p_now
      where private.registration_attempts.registration_id = p_registration_id;
      return query select 'EXISTING'::text, false;
    end if;
    return;
  end if;
  if v_attempt.state <> 'WORK_EMAIL_VERIFIED' then
    return query select 'ACTIVATION_INVALID'::text, false;
    return;
  end if;
  select provision.work_email_normalized into v_work_email
  from private.employee_provisions as provision where provision.provision_id = v_attempt.provision_id;
  if p_personal_email_normalized = v_work_email then
    insert into private.registration_request_keys values (
      p_registration_id, 'CREATE_PERSONAL_ACCOUNT', p_request_id,
      p_request_fingerprint, 'EMAILS_MUST_DIFFER', p_now
    );
    return query select 'EMAILS_MUST_DIFFER'::text, false;
    return;
  end if;
  update private.registration_attempts
  set state = 'ACCOUNT_CREATION_RESERVED',
      personal_email_fingerprint = p_personal_email_fingerprint,
      auth_claim_digest = p_auth_claim_digest,
      personal_confirmation_next_resend_at = p_now + interval '60 seconds',
      previous_activation_digest = activation_digest,
      activation_digest = p_rotated_activation_digest,
      activation_last_activity_at = p_now,
      activation_expires_at = p_now + interval '30 minutes',
      updated_at = p_now
  where private.registration_attempts.registration_id = p_registration_id;
  insert into private.registration_request_keys values (
    p_registration_id, 'CREATE_PERSONAL_ACCOUNT', p_request_id,
    p_request_fingerprint, 'RESERVED', p_now
  );
  insert into private.registration_email_deliveries (
    delivery_id, registration_id, purpose, delivery_kind, status, created_at
  ) values (
    p_delivery_id, p_registration_id, 'PERSONAL_CONFIRMATION', 'INITIAL', 'RESERVED', p_now
  );
  insert into private.registration_audit_events (
    correlation_id, registration_id, provision_id, event_kind, result_category
  ) values (p_correlation_id, p_registration_id, v_attempt.provision_id, 'PERSONAL_ACCOUNT', 'RESERVED');
  return query select 'RESERVED'::text, true;
end;
$$;

create function public.registration_release_personal_account_reservation(
  p_registration_id uuid,
  p_request_id text,
  p_request_fingerprint text,
  p_rotated_activation_digest text,
  p_correlation_id uuid,
  p_now timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt private.registration_attempts%rowtype;
begin
  select attempt.* into v_attempt from private.registration_attempts as attempt
  where attempt.registration_id = p_registration_id for update;
  if not found or v_attempt.state <> 'ACCOUNT_CREATION_RESERVED'
    or v_attempt.auth_user_id is not null
    or v_attempt.activation_digest is distinct from p_rotated_activation_digest then
    return false;
  end if;
  update private.registration_attempts
  set state = 'WORK_EMAIL_VERIFIED', personal_email_fingerprint = null,
      auth_claim_digest = null, personal_confirmation_next_resend_at = null,
      activation_digest = previous_activation_digest, previous_activation_digest = null,
      activation_last_activity_at = p_now,
      activation_expires_at = p_now + interval '30 minutes', updated_at = p_now
  where registration_id = p_registration_id;
  update private.registration_request_keys
  set result_category = 'RETRYABLE_FAILURE'
  where registration_id = p_registration_id
    and operation = 'CREATE_PERSONAL_ACCOUNT'
    and request_id = p_request_id
    and request_fingerprint = p_request_fingerprint
    and result_category = 'RESERVED';
  if not found then
    raise exception using errcode = '55000', message = 'personal account reservation key is inconsistent';
  end if;
  insert into private.registration_audit_events (
    correlation_id, registration_id, provision_id, event_kind, result_category
  ) values (
    p_correlation_id, p_registration_id, v_attempt.provision_id,
    'PERSONAL_ACCOUNT', 'RETRYABLE_FAILURE_RELEASED'
  );
  return true;
end;
$$;

create function public.registration_reserve_personal_confirmation_resend(
  p_registration_id uuid,
  p_request_id text,
  p_request_fingerprint text,
  p_activation_digest text,
  p_delivery_id uuid,
  p_correlation_id uuid,
  p_now timestamptz
)
returns table(
  result_category text,
  should_deliver boolean,
  delivery_id uuid,
  auth_user_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt private.registration_attempts%rowtype;
  v_existing private.registration_request_keys%rowtype;
  v_hour_resends integer;
  v_day_sends integer;
begin
  select attempt.* into v_attempt from private.registration_attempts as attempt
  where attempt.registration_id = p_registration_id for update;
  if not found or v_attempt.activation_digest is distinct from p_activation_digest
    or v_attempt.activation_expires_at <= p_now then
    return query select 'ACTIVATION_INVALID'::text, false, null::uuid, null::uuid;
    return;
  end if;
  select key.* into v_existing from private.registration_request_keys as key
  where key.registration_id = p_registration_id
    and key.operation = 'RESEND_PERSONAL_CONFIRMATION'
    and key.request_id = p_request_id;
  if found then
    if v_existing.request_fingerprint <> p_request_fingerprint then
      return query select 'IDEMPOTENCY_CONFLICT'::text, false, null::uuid, null::uuid;
    end if;
    return query select v_existing.result_category, false, null::uuid, v_attempt.auth_user_id;
    return;
  end if;
  if v_attempt.state <> 'AUTH_IDENTITY_PENDING_CONFIRMATION'
    or v_attempt.auth_user_id is null then
    return query select 'ACTIVATION_INVALID'::text, false, null::uuid, null::uuid;
    return;
  end if;
  if v_attempt.personal_confirmation_next_resend_at > p_now then
    return query select 'RATE_LIMITED'::text, false, null::uuid, v_attempt.auth_user_id;
    return;
  end if;
  select count(*) filter (where delivery_kind = 'RESEND' and created_at > p_now - interval '1 hour'),
         count(*) filter (where created_at > p_now - interval '24 hours')
    into v_hour_resends, v_day_sends
  from private.registration_email_deliveries
  where registration_id = p_registration_id and purpose = 'PERSONAL_CONFIRMATION';
  if v_hour_resends >= 3 or v_day_sends >= 10 then
    return query select 'RATE_LIMITED'::text, false, null::uuid, v_attempt.auth_user_id;
    return;
  end if;
  update private.registration_attempts
  set personal_confirmation_next_resend_at = p_now + interval '60 seconds',
      activation_last_activity_at = p_now,
      activation_expires_at = p_now + interval '30 minutes',
      updated_at = p_now
  where private.registration_attempts.registration_id = p_registration_id;
  insert into private.registration_email_deliveries values (
    p_delivery_id, p_registration_id, 'PERSONAL_CONFIRMATION', 'RESEND', 'RESERVED', p_now, null
  );
  insert into private.registration_request_keys values (
    p_registration_id, 'RESEND_PERSONAL_CONFIRMATION', p_request_id,
    p_request_fingerprint, 'ACCEPTED', p_now
  );
  insert into private.registration_audit_events (
    correlation_id, registration_id, provision_id, event_kind, result_category
  ) values (
    p_correlation_id, p_registration_id, v_attempt.provision_id,
    'PERSONAL_CONFIRMATION_RESEND', 'ACCEPTED'
  );
  return query select 'ACCEPTED'::text, true, p_delivery_id, v_attempt.auth_user_id;
end;
$$;

create function public.registration_mark_account_conflict(
  p_registration_id uuid,
  p_correlation_id uuid,
  p_now timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provision_id uuid;
begin
  update private.registration_attempts
  set state = 'ACCOUNT_CONFLICT', activation_digest = null,
      activation_expires_at = null, updated_at = p_now
  where registration_id = p_registration_id
  returning provision_id into v_provision_id;
  insert into private.registration_audit_events (
    correlation_id, registration_id, provision_id, event_kind, result_category
  ) values (p_correlation_id, p_registration_id, v_provision_id, 'PERSONAL_ACCOUNT', 'ACCOUNT_CONFLICT');
end;
$$;

create function public.registration_operational_issue_provision(
  p_provision_id uuid,
  p_company_id text,
  p_work_email_normalized text,
  p_work_email_fingerprint text,
  p_external_reference text,
  p_correlation_id uuid,
  p_now timestamptz
)
returns table(result_category text, provision_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_employer_id uuid;
  v_existing_provision_id uuid;
begin
  select employer.employer_id into v_employer_id
  from private.employers as employer
  where employer.public_company_id = p_company_id
    and employer.status = 'ACTIVE'
  for update;
  if not found then
    insert into private.registration_audit_events (
      correlation_id, event_kind, result_category
    ) values (p_correlation_id, 'OPERATIONAL_PROVISION_ISSUE', 'EMPLOYER_NOT_FOUND');
    return query select 'EMPLOYER_NOT_FOUND'::text, null::uuid;
    return;
  end if;
  update private.employee_provisions
  set status = 'EXPIRED', updated_at = p_now
  where employer_id = v_employer_id
    and work_email_normalized = p_work_email_normalized
    and status = 'ELIGIBLE'
    and expires_at <= p_now;
  select provision.provision_id into v_existing_provision_id
    from private.employee_provisions as provision
    where provision.employer_id = v_employer_id
      and provision.work_email_normalized = p_work_email_normalized
      and provision.status = 'ELIGIBLE'
    for update;
  if v_existing_provision_id is not null then
    insert into private.registration_audit_events (
      correlation_id, provision_id, event_kind, result_category
    ) values (
      p_correlation_id, v_existing_provision_id,
      'OPERATIONAL_PROVISION_ISSUE', 'CLAIMABLE_PROVISION_EXISTS'
    );
    return query select 'CLAIMABLE_PROVISION_EXISTS'::text, null::uuid;
    return;
  end if;
  insert into private.employee_provisions (
    provision_id, employer_id, work_email_normalized, work_email_fingerprint,
    external_reference, status, available_from, expires_at, created_at, updated_at
  ) values (
    p_provision_id, v_employer_id, p_work_email_normalized, p_work_email_fingerprint,
    nullif(p_external_reference, ''), 'ELIGIBLE', p_now, p_now + interval '30 days', p_now, p_now
  );
  insert into private.registration_audit_events (
    correlation_id, provision_id, event_kind, result_category
  ) values (
    p_correlation_id, p_provision_id, 'OPERATIONAL_PROVISION_ISSUE', 'CREATED'
  );
  return query select 'CREATED'::text, p_provision_id;
end;
$$;

create function public.registration_operational_revoke_provision(
  p_provision_id uuid,
  p_reason_code text,
  p_correlation_id uuid,
  p_now timestamptz
)
returns table(result_category text, affected_user_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provision private.employee_provisions%rowtype;
begin
  select provision.* into v_provision from private.employee_provisions as provision
  where provision.provision_id = p_provision_id for update;
  if not found then
    insert into private.registration_audit_events (
      correlation_id, event_kind, result_category
    ) values (p_correlation_id, 'OPERATIONAL_PROVISION_REVOKE', 'NOT_FOUND');
    return query select 'NOT_FOUND'::text, null::uuid;
    return;
  end if;
  if v_provision.status = 'ELIGIBLE' then
    update private.employee_provisions
    set status = 'REVOKED', revoked_at = p_now,
        revocation_reason_code = p_reason_code, updated_at = p_now
    where provision_id = p_provision_id;
    update private.registration_attempts
    set state = 'PROVISION_REVOKED', activation_digest = null,
        previous_activation_digest = null, activation_expires_at = null,
        updated_at = p_now
    where provision_id = p_provision_id
      and state not in ('ACTIVE', 'ACCOUNT_CONFLICT', 'CANCELLED');
    insert into private.registration_audit_events (
      correlation_id, provision_id, event_kind, result_category
    ) values (
      p_correlation_id, p_provision_id,
      'OPERATIONAL_PROVISION_REVOKE', 'REVOKED_BEFORE_ACTIVATION'
    );
    return query select 'REVOKED_BEFORE_ACTIVATION'::text, null::uuid;
    return;
  end if;
  if v_provision.status = 'CLAIMED' then
    update public.employer_memberships
    set status = 'INACTIVE', updated_at = p_now
    where provision_id = p_provision_id;
    insert into private.registration_audit_events (
      correlation_id, provision_id, event_kind, result_category
    ) values (
      p_correlation_id, p_provision_id,
      'OPERATIONAL_PROVISION_REVOKE', 'MEMBERSHIP_DEACTIVATED'
    );
    return query select 'MEMBERSHIP_DEACTIVATED'::text, v_provision.claimed_user_id;
    return;
  end if;
  insert into private.registration_audit_events (
    correlation_id, provision_id, event_kind, result_category
  ) values (
    p_correlation_id, p_provision_id, 'OPERATIONAL_PROVISION_REVOKE', 'NO_CHANGE'
  );
  return query select 'NO_CHANGE'::text, v_provision.claimed_user_id;
end;
$$;

create function public.registration_activation_status(
  p_registration_id uuid,
  p_activation_digest text,
  p_now timestamptz
)
returns table(
  result_category text,
  state text,
  auth_user_id uuid,
  personal_email_confirmed boolean,
  onboarding_complete boolean,
  employer_display_name text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt private.registration_attempts%rowtype;
  v_employer_name text;
  v_onboarding_complete boolean := false;
begin
  select attempt.* into v_attempt from private.registration_attempts as attempt
  where attempt.registration_id = p_registration_id for update;
  if not found or v_attempt.activation_digest is distinct from p_activation_digest
    or v_attempt.activation_expires_at <= p_now or v_attempt.state = 'ACTIVE' then
    return query select 'ACTIVATION_INVALID'::text, null::text, null::uuid, false, false, null::text;
    return;
  end if;
  update private.registration_attempts
  set activation_last_activity_at = p_now,
      activation_expires_at = p_now + interval '30 minutes', updated_at = p_now
  where registration_id = p_registration_id;
  select employer.display_name into v_employer_name
  from private.employee_provisions as provision
  join private.employers as employer on employer.employer_id = provision.employer_id
  where provision.provision_id = v_attempt.provision_id;
  if v_attempt.auth_user_id is not null then
    select profile.current_financial_context_version_id is not null into v_onboarding_complete
    from public.profiles as profile where profile.user_id = v_attempt.auth_user_id;
  end if;
  return query select 'OK'::text, v_attempt.state, v_attempt.auth_user_id,
    v_attempt.personal_email_confirmed_at is not null, coalesce(v_onboarding_complete, false),
    v_employer_name;
end;
$$;

create function private.enforce_registered_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_registration_id uuid;
  v_claim_nonce text;
  v_attempt private.registration_attempts%rowtype;
begin
  if coalesce(new.raw_app_meta_data ->> 'future_you_fixture', '') = 'true'
    and coalesce(pg_catalog.current_setting('app.future_you_seed', true), '') = 'enabled' then
    return new;
  end if;
  begin
    v_registration_id := (new.raw_user_meta_data ->> 'future_you_registration_id')::uuid;
  exception when others then
    raise exception using errcode = '42501', message = 'employer registration required';
  end;
  v_claim_nonce := new.raw_user_meta_data ->> 'future_you_claim_nonce';
  select attempt.* into v_attempt from private.registration_attempts as attempt
  where attempt.registration_id = v_registration_id for update;
  if not found or v_attempt.state <> 'ACCOUNT_CREATION_RESERVED'
    or v_attempt.activation_expires_at <= statement_timestamp()
    or v_claim_nonce is null
    or v_attempt.auth_claim_digest <> encode(extensions.digest(convert_to(v_claim_nonce, 'UTF8'), 'sha256'), 'hex') then
    raise exception using errcode = '42501', message = 'invalid employer registration claim';
  end if;
  new.raw_user_meta_data := (new.raw_user_meta_data - 'future_you_claim_nonce')
    || jsonb_build_object('future_you_registration_validated', true);
  return new;
end;
$$;

revoke all on function private.enforce_registered_auth_user() from public, anon, authenticated;
create trigger aa_enforce_registered_auth_user
before insert on auth.users
for each row execute function private.enforce_registered_auth_user();

create function private.finalize_registered_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_registration_id uuid;
  v_attempt private.registration_attempts%rowtype;
  v_provision private.employee_provisions%rowtype;
  v_employer private.employers%rowtype;
begin
  if coalesce(new.raw_user_meta_data ->> 'future_you_registration_validated', '') <> 'true' then
    return new;
  end if;
  v_registration_id := (new.raw_user_meta_data ->> 'future_you_registration_id')::uuid;
  select attempt.* into v_attempt from private.registration_attempts as attempt
  where attempt.registration_id = v_registration_id for update;
  select provision.* into v_provision from private.employee_provisions as provision
  where provision.provision_id = v_attempt.provision_id for update;
  if v_attempt.state <> 'ACCOUNT_CREATION_RESERVED' or v_provision.status <> 'ELIGIBLE'
    or v_provision.expires_at <= statement_timestamp() then
    raise exception using errcode = '55000', message = 'registration provision is no longer claimable';
  end if;
  select employer.* into v_employer from private.employers as employer
  where employer.employer_id = v_provision.employer_id;
  update private.employee_provisions
  set status = 'CLAIMED', claimed_user_id = new.id, claimed_at = statement_timestamp(),
      updated_at = statement_timestamp()
  where provision_id = v_provision.provision_id;
  insert into public.employer_memberships (
    user_id, employer_id, employer_display_name, provision_id,
    work_email_normalized, status, source, verified_at
  ) values (
    new.id, v_employer.employer_id, v_employer.display_name, v_provision.provision_id,
    v_provision.work_email_normalized, 'ACTIVE', 'employer_provisioned',
    v_attempt.work_email_verified_at
  );
  update public.profiles
  set registration_origin = 'employer_provisioned',
      account_activation_state = 'PENDING',
      personal_email_confirmed_at = new.email_confirmed_at,
      updated_at = statement_timestamp()
  where user_id = new.id;
  update private.registration_attempts
  set state = case when new.email_confirmed_at is null
      then 'AUTH_IDENTITY_PENDING_CONFIRMATION' else 'PERSONAL_EMAIL_CONFIRMED' end,
      auth_user_id = new.id,
      personal_email_confirmed_at = new.email_confirmed_at,
      auth_claim_digest = null,
      updated_at = statement_timestamp()
  where registration_id = v_registration_id;
  update auth.users
  set raw_user_meta_data = raw_user_meta_data
    - 'future_you_registration_id'
    - 'future_you_registration_validated'
  where id = new.id;
  return new;
end;
$$;

revoke all on function private.finalize_registered_auth_user() from public, anon, authenticated;
create trigger zz_finalize_registered_auth_user
after insert on auth.users
for each row execute function private.finalize_registered_auth_user();

create function private.mark_personal_email_confirmation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_registration_id uuid;
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    update public.profiles
    set personal_email_confirmed_at = new.email_confirmed_at,
        updated_at = statement_timestamp()
    where user_id = new.id;
    update private.registration_attempts
    set personal_email_confirmed_at = new.email_confirmed_at,
        state = case when state = 'AUTH_IDENTITY_PENDING_CONFIRMATION'
          then 'PERSONAL_EMAIL_CONFIRMED' else state end,
        updated_at = statement_timestamp()
    where auth_user_id = new.id
    returning registration_id into v_registration_id;
  end if;
  return new;
end;
$$;

revoke all on function private.mark_personal_email_confirmation() from public, anon, authenticated;
create trigger mark_personal_email_confirmation
after update of email_confirmed_at on auth.users
for each row execute function private.mark_personal_email_confirmation();

create function private.complete_registration_after_onboarding()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.current_financial_context_version_id is not null
    and new.personal_email_confirmed_at is not null
    and new.registration_origin = 'employer_provisioned' then
    new.account_activation_state := 'ACTIVE';
    new.onboarding_state := 'ready';
    update private.registration_attempts
    set state = 'ACTIVE', activation_digest = null, previous_activation_digest = null,
        activation_expires_at = null, activation_last_activity_at = null,
        completed_at = statement_timestamp(), updated_at = statement_timestamp()
    where auth_user_id = new.user_id
      and state in ('PERSONAL_EMAIL_CONFIRMED', 'AUTH_IDENTITY_PENDING_CONFIRMATION');
  end if;
  return new;
end;
$$;

revoke all on function private.complete_registration_after_onboarding() from public, anon, authenticated;
create trigger complete_registration_after_onboarding
before update of current_financial_context_version_id, personal_email_confirmed_at on public.profiles
for each row execute function private.complete_registration_after_onboarding();

revoke all on table private.employers from public, anon, authenticated;
revoke all on table private.employee_provisions from public, anon, authenticated;
revoke all on table private.registration_attempts from public, anon, authenticated;
revoke all on table private.registration_request_keys from public, anon, authenticated;
revoke all on table private.registration_email_deliveries from public, anon, authenticated;
revoke all on table private.registration_audit_events from public, anon, authenticated;

revoke all on function public.registration_begin(uuid,text,text,text,text,text,text,text,text,uuid,uuid,timestamptz)
  from public, anon, authenticated;
revoke all on function public.registration_mark_delivery(uuid,uuid,text,uuid,timestamptz)
  from public, anon, authenticated;
revoke all on function public.registration_challenge_material(uuid)
  from public, anon, authenticated;
revoke all on function public.registration_verify_work_code(uuid,text,text,text,text,uuid,timestamptz)
  from public, anon, authenticated;
revoke all on function public.registration_resend_work_code(uuid,text,text,text,text,text,uuid,uuid,timestamptz)
  from public, anon, authenticated;
revoke all on function public.registration_reserve_personal_account(uuid,text,text,text,text,text,text,text,uuid,uuid,timestamptz)
  from public, anon, authenticated;
revoke all on function public.registration_release_personal_account_reservation(uuid,text,text,text,uuid,timestamptz)
  from public, anon, authenticated;
revoke all on function public.registration_reserve_personal_confirmation_resend(uuid,text,text,text,uuid,uuid,timestamptz)
  from public, anon, authenticated;
revoke all on function public.registration_mark_account_conflict(uuid,uuid,timestamptz)
  from public, anon, authenticated;
revoke all on function public.registration_operational_issue_provision(uuid,text,text,text,text,uuid,timestamptz)
  from public, anon, authenticated;
revoke all on function public.registration_operational_revoke_provision(uuid,text,uuid,timestamptz)
  from public, anon, authenticated;
revoke all on function public.registration_activation_status(uuid,text,timestamptz)
  from public, anon, authenticated;

grant execute on function public.registration_begin(uuid,text,text,text,text,text,text,text,text,uuid,uuid,timestamptz)
  to service_role;
grant execute on function public.registration_mark_delivery(uuid,uuid,text,uuid,timestamptz)
  to service_role;
grant execute on function public.registration_challenge_material(uuid)
  to service_role;
grant execute on function public.registration_verify_work_code(uuid,text,text,text,text,uuid,timestamptz)
  to service_role;
grant execute on function public.registration_resend_work_code(uuid,text,text,text,text,text,uuid,uuid,timestamptz)
  to service_role;
grant execute on function public.registration_reserve_personal_account(uuid,text,text,text,text,text,text,text,uuid,uuid,timestamptz)
  to service_role;
grant execute on function public.registration_release_personal_account_reservation(uuid,text,text,text,uuid,timestamptz)
  to service_role;
grant execute on function public.registration_reserve_personal_confirmation_resend(uuid,text,text,text,uuid,uuid,timestamptz)
  to service_role;
grant execute on function public.registration_mark_account_conflict(uuid,uuid,timestamptz)
  to service_role;
grant execute on function public.registration_operational_issue_provision(uuid,text,text,text,text,uuid,timestamptz)
  to service_role;
grant execute on function public.registration_operational_revoke_provision(uuid,text,uuid,timestamptz)
  to service_role;
grant execute on function public.registration_activation_status(uuid,text,timestamptz)
  to service_role;
