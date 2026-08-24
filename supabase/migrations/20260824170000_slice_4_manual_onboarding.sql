alter table public.financial_context_versions
  add column compatible_rules_version text default 'fy-sim/1.0.0',
  add column compatible_calendar_version text default 'england-wales-bank-holidays/2025-2030-v1',
  add column onboarding_request_hash text;

update public.financial_context_versions
set compatible_rules_version = 'fy-sim/1.0.0',
    compatible_calendar_version = 'england-wales-bank-holidays/2025-2030-v1'
where compatible_rules_version is null
   or compatible_calendar_version is null;

alter table public.financial_context_versions
  alter column compatible_rules_version set not null,
  alter column compatible_calendar_version set not null;

create table public.context_confirmation_keys (
  user_id uuid not null references auth.users (id) on delete cascade,
  operation text not null check (operation in ('initial_context', 'context_revision')),
  request_id text not null check (char_length(request_id) between 3 and 64),
  request_identity text not null check (char_length(request_identity) between 1 and 160),
  context_version_id text not null,
  created_at timestamptz not null default statement_timestamp(),
  primary key (user_id, operation, request_id),
  constraint context_confirmation_context_fk
    foreign key (user_id, context_version_id)
    references public.financial_context_versions (user_id, version_id)
);

create table public.workplace_associations (
  user_id uuid primary key references auth.users (id) on delete cascade,
  workplace_name text not null check (char_length(workplace_name) between 1 and 160),
  association_source text not null check (association_source = 'user_provided'),
  verification_status text not null check (verification_status = 'unverified'),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp()
);

create trigger context_confirmation_keys_are_immutable
before update or delete on public.context_confirmation_keys
for each row execute function public.reject_immutable_financial_record_mutation();

create trigger workplace_associations_set_updated_at
before update on public.workplace_associations
for each row execute function public.set_profile_updated_at();

alter table public.context_confirmation_keys enable row level security;
alter table public.context_confirmation_keys force row level security;
alter table public.workplace_associations enable row level security;
alter table public.workplace_associations force row level security;

revoke all on table public.context_confirmation_keys from anon, authenticated;
revoke all on table public.workplace_associations from anon, authenticated;
grant select, insert on table public.context_confirmation_keys to authenticated;
grant select, insert, update, delete on table public.workplace_associations to authenticated;
grant update (current_financial_context_version_id)
  on table public.profiles to authenticated;

create policy context_confirmation_keys_select_own
on public.context_confirmation_keys for select to authenticated
using ((select auth.uid()) = user_id);

create policy context_confirmation_keys_insert_own
on public.context_confirmation_keys for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy workplace_associations_select_own
on public.workplace_associations for select to authenticated
using ((select auth.uid()) = user_id);

create policy workplace_associations_insert_own
on public.workplace_associations for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy workplace_associations_update_own
on public.workplace_associations for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy workplace_associations_delete_own
on public.workplace_associations for delete to authenticated
using ((select auth.uid()) = user_id);

create function public.confirm_financial_context_version(
  p_operation text,
  p_request_id text,
  p_request_identity text,
  p_expected_current_version_id text,
  p_version_id text,
  p_context_id text,
  p_domain_schema_version text,
  p_persistence_schema_version text,
  p_payload jsonb,
  p_source text,
  p_origin text,
  p_confirmation_reason text,
  p_rules_version text,
  p_calendar_version text,
  p_onboarding_request_hash text
)
returns table(status text, context_version_id text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_existing_identity text;
  v_existing_version text;
  v_current_version text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_operation not in ('initial_context', 'context_revision') then
    raise exception using errcode = '22023', message = 'unsupported context operation';
  end if;
  if p_origin not in ('onboarding', 'user_update') then
    raise exception using errcode = '22023', message = 'unsupported context origin';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':' || p_operation || ':' || p_request_id, 0)
  );

  select confirmation.request_identity, confirmation.context_version_id
    into v_existing_identity, v_existing_version
  from public.context_confirmation_keys as confirmation
  where confirmation.user_id = v_user_id
    and confirmation.operation = p_operation
    and confirmation.request_id = p_request_id;

  if found then
    if v_existing_identity = p_request_identity then
      return query select 'existing'::text, v_existing_version;
    else
      return query select 'idempotency_conflict'::text, v_existing_version;
    end if;
    return;
  end if;

  select current_financial_context_version_id
    into v_current_version
  from public.profiles
  where user_id = v_user_id
  for update;

  if not found then
    raise exception using errcode = '23503', message = 'profile missing';
  end if;
  if v_current_version is distinct from nullif(p_expected_current_version_id, '') then
    return query select 'context_conflict'::text, v_current_version;
    return;
  end if;
  if exists (
    select 1 from public.financial_context_versions
    where user_id = v_user_id and version_id = p_version_id
  ) then
    return query select 'context_conflict'::text, p_version_id;
    return;
  end if;

  insert into public.financial_context_versions (
    user_id,
    version_id,
    context_id,
    predecessor_version_id,
    domain_schema_version,
    persistence_schema_version,
    payload,
    source,
    origin,
    confirmation_reason,
    compatible_rules_version,
    compatible_calendar_version,
    onboarding_request_hash
  ) values (
    v_user_id,
    p_version_id,
    p_context_id,
    nullif(p_expected_current_version_id, ''),
    p_domain_schema_version,
    p_persistence_schema_version,
    p_payload,
    p_source,
    p_origin,
    p_confirmation_reason,
    p_rules_version,
    p_calendar_version,
    p_onboarding_request_hash
  );

  update public.profiles
  set current_financial_context_version_id = p_version_id
  where user_id = v_user_id;

  insert into public.context_confirmation_keys (
    user_id, operation, request_id, request_identity, context_version_id
  ) values (
    v_user_id, p_operation, p_request_id, p_request_identity, p_version_id
  );

  return query select 'created'::text, p_version_id;
end;
$$;

revoke all on function public.confirm_financial_context_version(
  text, text, text, text, text, text, text, text, jsonb,
  text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.confirm_financial_context_version(
  text, text, text, text, text, text, text, text, jsonb,
  text, text, text, text, text, text
) to authenticated;
