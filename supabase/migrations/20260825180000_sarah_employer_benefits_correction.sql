create table public.employer_benefit_offerings (
  offering_id uuid primary key,
  employer_id uuid not null references private.employers (employer_id),
  benefit_key text not null
    check (benefit_key in ('ADDITIONAL_PENSION_MATCH', 'SEASON_TICKET_LOAN')),
  display_name text not null check (char_length(display_name) between 1 and 160),
  category text not null check (category in ('PENSION', 'TRAVEL')),
  offering_status text not null check (offering_status in ('AVAILABLE', 'RETIRED')),
  provenance_source_type text not null
    check (provenance_source_type in ('CANONICAL_DEMONSTRATION_REFERENCE')),
  source_reference text not null check (char_length(source_reference) between 1 and 300),
  reference_date date not null,
  last_confirmed_date date,
  numerical_simulation_supported boolean not null,
  further_information_required boolean not null,
  record_version integer not null check (record_version > 0),
  schema_version text not null check (char_length(schema_version) between 1 and 80),
  created_at timestamptz not null default statement_timestamp(),
  supersedes_offering_id uuid references public.employer_benefit_offerings (offering_id),
  unique (offering_id, employer_id),
  unique (employer_id, benefit_key, record_version),
  check (last_confirmed_date is null or last_confirmed_date >= reference_date),
  check (supersedes_offering_id is null or record_version > 1)
);

create index employer_benefit_offerings_membership_read_idx
  on public.employer_benefit_offerings (employer_id, offering_status, benefit_key, record_version desc);

alter table public.employer_memberships
  add constraint employer_memberships_user_employer_unique unique (user_id, employer_id);

create table public.user_benefit_states (
  state_id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  employer_id uuid not null,
  offering_id uuid not null,
  eligibility_status text not null
    check (eligibility_status in ('UNKNOWN', 'CONFIRMED_ELIGIBLE', 'NOT_ELIGIBLE')),
  uptake_status text not null check (uptake_status in ('INACTIVE', 'ACTIVE')),
  included_in_financial_baseline boolean not null,
  information_completeness text not null check (information_completeness in ('INCOMPLETE', 'COMPLETE')),
  provenance_source_type text not null
    check (provenance_source_type in ('CANONICAL_DEMONSTRATION_FIXTURE')),
  source_reference text not null check (char_length(source_reference) between 1 and 300),
  last_confirmed_date date,
  schema_version text not null check (char_length(schema_version) between 1 and 80),
  created_at timestamptz not null default statement_timestamp(),
  constraint user_benefit_states_membership_fk
    foreign key (user_id, employer_id)
    references public.employer_memberships (user_id, employer_id),
  constraint user_benefit_states_offering_fk
    foreign key (offering_id, employer_id)
    references public.employer_benefit_offerings (offering_id, employer_id),
  unique (user_id, offering_id)
);

create index user_benefit_states_owner_read_idx
  on public.user_benefit_states (user_id, employer_id, offering_id);

create function private.reject_employer_benefit_record_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = '55000', message = 'employer benefit reference records are append-only';
end;
$$;

revoke all on function private.reject_employer_benefit_record_mutation() from public, anon, authenticated;

create trigger employer_benefit_offerings_are_append_only
before update or delete on public.employer_benefit_offerings
for each row execute function private.reject_employer_benefit_record_mutation();

create trigger user_benefit_states_are_append_only
before update or delete on public.user_benefit_states
for each row execute function private.reject_employer_benefit_record_mutation();

alter table public.employer_benefit_offerings enable row level security;
alter table public.employer_benefit_offerings force row level security;
revoke all on table public.employer_benefit_offerings from public, anon, authenticated;
grant select on table public.employer_benefit_offerings to authenticated;

create policy employer_benefit_offerings_select_for_active_membership
on public.employer_benefit_offerings for select to authenticated
using (
  exists (
    select 1
    from public.employer_memberships as membership
    where membership.user_id = (select auth.uid())
      and membership.employer_id = employer_benefit_offerings.employer_id
      and membership.status = 'ACTIVE'
  )
);

alter table public.user_benefit_states enable row level security;
alter table public.user_benefit_states force row level security;
revoke all on table public.user_benefit_states from public, anon, authenticated;
grant select on table public.user_benefit_states to authenticated;

create policy user_benefit_states_select_own_active_membership
on public.user_benefit_states for select to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.employer_memberships as membership
    where membership.user_id = (select auth.uid())
      and membership.employer_id = user_benefit_states.employer_id
      and membership.status = 'ACTIVE'
  )
);
