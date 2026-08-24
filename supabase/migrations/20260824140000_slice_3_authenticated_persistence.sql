create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function public.canonical_jsonb_sha256(value jsonb)
returns text
language sql
immutable
parallel safe
set search_path = ''
return encode(extensions.digest(convert_to(value::text, 'UTF8'), 'sha256'), 'hex');

revoke all on function public.canonical_jsonb_sha256(jsonb) from public, anon, authenticated;
grant execute on function public.canonical_jsonb_sha256(jsonb) to authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 120),
  onboarding_state text not null default 'financial_context_required'
    check (onboarding_state in ('financial_context_required', 'ready')),
  current_financial_context_version_id text,
  is_demo boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp()
);

create table public.financial_context_versions (
  user_id uuid not null references auth.users (id) on delete cascade,
  version_id text not null check (char_length(version_id) between 1 and 160),
  context_id text not null check (char_length(context_id) between 1 and 160),
  predecessor_version_id text,
  domain_schema_version text not null check (char_length(domain_schema_version) between 1 and 120),
  persistence_schema_version text not null
    check (persistence_schema_version = 'future-you.financial-context/1.0.0'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  payload_hash text generated always as (
    public.canonical_jsonb_sha256(payload)
  ) stored,
  source text not null check (char_length(source) between 1 and 160),
  origin text not null check (origin in ('fixture', 'onboarding', 'user_update')),
  confirmation_reason text not null check (char_length(confirmation_reason) between 1 and 240),
  created_at timestamptz not null default statement_timestamp(),
  primary key (user_id, version_id),
  unique (user_id, context_id, version_id),
  constraint financial_context_payload_identity_matches check (
    payload ->> 'id' = context_id
    and payload ->> 'version' = version_id
    and payload ->> 'schemaVersion' = domain_schema_version
  ),
  constraint financial_context_predecessor_fk
    foreign key (user_id, predecessor_version_id)
    references public.financial_context_versions (user_id, version_id)
);

alter table public.profiles
  add constraint profiles_current_context_fk
  foreign key (user_id, current_financial_context_version_id)
  references public.financial_context_versions (user_id, version_id);

create table public.simulation_baselines (
  user_id uuid not null references auth.users (id) on delete cascade,
  baseline_id text not null check (char_length(baseline_id) between 1 and 160),
  context_version_id text not null,
  rules_version text not null check (char_length(rules_version) between 1 and 120),
  calendar_version text not null check (char_length(calendar_version) between 1 and 120),
  input_identity text not null check (char_length(input_identity) between 1 and 160),
  projection_payload jsonb not null check (jsonb_typeof(projection_payload) = 'object'),
  projection_hash text generated always as (
    public.canonical_jsonb_sha256(projection_payload)
  ) stored,
  created_at timestamptz not null default statement_timestamp(),
  primary key (user_id, baseline_id),
  constraint simulation_baseline_context_fk
    foreign key (user_id, context_version_id)
    references public.financial_context_versions (user_id, version_id),
  constraint simulation_baseline_identity_matches check (
    projection_payload #>> '{identity,baselineId}' = baseline_id
    and projection_payload #>> '{identity,contextVersion}' = context_version_id
    and projection_payload #>> '{versions,rules}' = rules_version
    and projection_payload #>> '{versions,calendar}' = calendar_version
    and projection_payload #>> '{identity,inputIdentity}' = input_identity
  )
);

create table public.scenarios (
  user_id uuid not null references auth.users (id) on delete cascade,
  scenario_id text not null check (char_length(scenario_id) between 1 and 160),
  baseline_id text not null,
  context_version_id text not null,
  parent_scenario_id text,
  derived_from_scenario_id text,
  scenario_kind text not null check (scenario_kind = 'one_off_purchase'),
  definition_payload jsonb not null check (jsonb_typeof(definition_payload) = 'object'),
  definition_hash text generated always as (
    public.canonical_jsonb_sha256(definition_payload)
  ) stored,
  created_at timestamptz not null default statement_timestamp(),
  primary key (user_id, scenario_id),
  constraint scenario_baseline_fk
    foreign key (user_id, baseline_id)
    references public.simulation_baselines (user_id, baseline_id),
  constraint scenario_context_fk
    foreign key (user_id, context_version_id)
    references public.financial_context_versions (user_id, version_id),
  constraint scenario_parent_fk
    foreign key (user_id, parent_scenario_id)
    references public.scenarios (user_id, scenario_id),
  constraint scenario_derived_from_fk
    foreign key (user_id, derived_from_scenario_id)
    references public.scenarios (user_id, scenario_id),
  constraint scenario_definition_identity_matches check (
    definition_payload ->> 'id' = scenario_id
    and definition_payload ->> 'baselineId' = baseline_id
    and definition_payload ->> 'contextVersion' = context_version_id
    and definition_payload ->> 'scenarioKind' = scenario_kind
    and definition_payload ->> 'parentScenarioId' is not distinct from parent_scenario_id
    and definition_payload ->> 'derivedFromScenarioId' is not distinct from derived_from_scenario_id
  )
);

create table public.simulation_runs (
  user_id uuid not null references auth.users (id) on delete cascade,
  run_id text not null check (char_length(run_id) between 1 and 160),
  request_id text not null check (char_length(request_id) between 1 and 160),
  request_identity text not null check (char_length(request_identity) between 1 and 160),
  context_version_id text not null,
  baseline_id text not null,
  scenario_id text not null,
  parent_scenario_id text,
  scenario_kind text not null check (scenario_kind = 'one_off_purchase'),
  canonical_request jsonb not null check (jsonb_typeof(canonical_request) = 'object'),
  material_assumptions jsonb not null check (jsonb_typeof(material_assumptions) = 'object'),
  rules_version text not null check (char_length(rules_version) between 1 and 120),
  calendar_version text not null check (char_length(calendar_version) between 1 and 120),
  calendar_fallback_metadata jsonb not null check (jsonb_typeof(calendar_fallback_metadata) = 'object'),
  projection_horizons jsonb not null check (jsonb_typeof(projection_horizons) = 'object'),
  deterministic_classification text not null check (char_length(deterministic_classification) between 1 and 120),
  input_identity text not null check (char_length(input_identity) between 1 and 160),
  output_identity text not null check (char_length(output_identity) between 1 and 160),
  response_schema_version text not null check (char_length(response_schema_version) between 1 and 120),
  response_payload jsonb not null check (jsonb_typeof(response_payload) = 'object'),
  response_hash text generated always as (
    public.canonical_jsonb_sha256(response_payload)
  ) stored,
  created_at timestamptz not null default statement_timestamp(),
  primary key (user_id, run_id),
  unique (user_id, request_id),
  constraint simulation_run_context_fk
    foreign key (user_id, context_version_id)
    references public.financial_context_versions (user_id, version_id),
  constraint simulation_run_baseline_fk
    foreign key (user_id, baseline_id)
    references public.simulation_baselines (user_id, baseline_id),
  constraint simulation_run_scenario_fk
    foreign key (user_id, scenario_id)
    references public.scenarios (user_id, scenario_id),
  constraint simulation_run_parent_scenario_fk
    foreign key (user_id, parent_scenario_id)
    references public.scenarios (user_id, scenario_id),
  constraint simulation_run_response_identity_matches check (
    response_payload #>> '{calculation,runId}' = run_id
    and response_payload ->> 'requestId' = request_id
    and response_payload #>> '{context,version}' = context_version_id
    and response_payload #>> '{calculation,baselineId}' = baseline_id
    and response_payload #>> '{calculation,scenarioId}' = scenario_id
    and response_payload #>> '{calculation,parentScenarioId}' is not distinct from parent_scenario_id
    and response_payload ->> 'schemaVersion' = response_schema_version
    and response_payload #>> '{calculation,rulesVersion}' = rules_version
    and response_payload #>> '{calculation,calendarVersion}' = calendar_version
    and response_payload #>> '{reproducibility,inputIdentity}' = input_identity
    and response_payload #>> '{reproducibility,outputIdentity}' = output_identity
    and response_payload #>> '{result,comparison,classification,code}' = deterministic_classification
  )
);

create table public.api_request_keys (
  user_id uuid not null references auth.users (id) on delete cascade,
  request_id text not null check (char_length(request_id) between 1 and 160),
  operation text not null check (char_length(operation) between 1 and 120),
  request_identity text not null check (char_length(request_identity) between 1 and 160),
  run_id text not null,
  created_at timestamptz not null default statement_timestamp(),
  primary key (user_id, operation, request_id),
  constraint api_request_key_run_fk
    foreign key (user_id, run_id)
    references public.simulation_runs (user_id, run_id)
);

create index financial_context_versions_owner_created_idx
  on public.financial_context_versions (user_id, created_at desc);
create index simulation_baselines_owner_context_idx
  on public.simulation_baselines (user_id, context_version_id);
create index scenarios_owner_baseline_idx
  on public.scenarios (user_id, baseline_id);
create index scenarios_owner_parent_idx
  on public.scenarios (user_id, parent_scenario_id)
  where parent_scenario_id is not null;
create index scenarios_owner_derived_from_idx
  on public.scenarios (user_id, derived_from_scenario_id)
  where derived_from_scenario_id is not null;
create index simulation_runs_owner_context_idx
  on public.simulation_runs (user_id, context_version_id);
create index simulation_runs_owner_baseline_idx
  on public.simulation_runs (user_id, baseline_id);
create index simulation_runs_owner_scenario_idx
  on public.simulation_runs (user_id, scenario_id);
create index simulation_runs_owner_created_idx
  on public.simulation_runs (user_id, created_at desc);
create index api_request_keys_owner_run_idx
  on public.api_request_keys (user_id, run_id);

create function private.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Future You member'
    )
  );
  return new;
end;
$$;

revoke all on function private.create_profile_for_auth_user() from public, anon, authenticated;

create trigger create_profile_after_auth_user
after insert on auth.users
for each row execute function private.create_profile_for_auth_user();

create function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

revoke all on function public.set_profile_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_profile_updated_at();

create function public.reject_immutable_financial_record_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'immutable financial records cannot be updated or deleted';
end;
$$;

revoke all on function public.reject_immutable_financial_record_mutation()
  from public, anon, authenticated;

create trigger financial_context_versions_are_immutable
before update or delete on public.financial_context_versions
for each row execute function public.reject_immutable_financial_record_mutation();

create trigger simulation_baselines_are_immutable
before update or delete on public.simulation_baselines
for each row execute function public.reject_immutable_financial_record_mutation();

create trigger scenarios_are_immutable
before update or delete on public.scenarios
for each row execute function public.reject_immutable_financial_record_mutation();

create trigger simulation_runs_are_immutable
before update or delete on public.simulation_runs
for each row execute function public.reject_immutable_financial_record_mutation();

create trigger api_request_keys_are_immutable
before update or delete on public.api_request_keys
for each row execute function public.reject_immutable_financial_record_mutation();

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.financial_context_versions enable row level security;
alter table public.financial_context_versions force row level security;
alter table public.simulation_baselines enable row level security;
alter table public.simulation_baselines force row level security;
alter table public.scenarios enable row level security;
alter table public.scenarios force row level security;
alter table public.simulation_runs enable row level security;
alter table public.simulation_runs force row level security;
alter table public.api_request_keys enable row level security;
alter table public.api_request_keys force row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.financial_context_versions from anon, authenticated;
revoke all on table public.simulation_baselines from anon, authenticated;
revoke all on table public.scenarios from anon, authenticated;
revoke all on table public.simulation_runs from anon, authenticated;
revoke all on table public.api_request_keys from anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (current_financial_context_version_id)
  on table public.profiles to authenticated;
grant select, insert on table public.financial_context_versions to authenticated;
grant select, insert on table public.simulation_baselines to authenticated;
grant select, insert on table public.scenarios to authenticated;
grant select, insert on table public.simulation_runs to authenticated;
grant select, insert on table public.api_request_keys to authenticated;

create policy profiles_select_own
on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy profiles_update_own
on public.profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy financial_context_versions_select_own
on public.financial_context_versions for select to authenticated
using ((select auth.uid()) = user_id);

create policy financial_context_versions_insert_own
on public.financial_context_versions for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy simulation_baselines_select_own
on public.simulation_baselines for select to authenticated
using ((select auth.uid()) = user_id);

create policy simulation_baselines_insert_own
on public.simulation_baselines for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy scenarios_select_own
on public.scenarios for select to authenticated
using ((select auth.uid()) = user_id);

create policy scenarios_insert_own
on public.scenarios for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy simulation_runs_select_own
on public.simulation_runs for select to authenticated
using ((select auth.uid()) = user_id);

create policy simulation_runs_insert_own
on public.simulation_runs for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy api_request_keys_select_own
on public.api_request_keys for select to authenticated
using ((select auth.uid()) = user_id);

create policy api_request_keys_insert_own
on public.api_request_keys for insert to authenticated
with check ((select auth.uid()) = user_id);
