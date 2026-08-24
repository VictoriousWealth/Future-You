alter table public.simulation_runs
  add constraint simulation_runs_owner_run_context_unique
  unique (user_id, run_id, context_version_id);

create table public.conversations (
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id text not null check (char_length(conversation_id) between 3 and 160),
  context_version_id text not null,
  title text not null check (char_length(title) between 1 and 120),
  status text not null default 'active' check (status = 'active'),
  selected_run_id text,
  pending_clarification jsonb check (
    pending_clarification is null or jsonb_typeof(pending_clarification) = 'object'
  ),
  orchestration_version text not null check (char_length(orchestration_version) between 1 and 120),
  created_at timestamptz not null default statement_timestamp(),
  latest_activity_at timestamptz not null default statement_timestamp(),
  primary key (user_id, conversation_id),
  unique (user_id, conversation_id, context_version_id),
  constraint conversation_context_fk
    foreign key (user_id, context_version_id)
    references public.financial_context_versions (user_id, version_id),
  constraint conversation_selected_run_fk
    foreign key (user_id, selected_run_id, context_version_id)
    references public.simulation_runs (user_id, run_id, context_version_id)
);

create table public.conversation_messages (
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id text not null,
  context_version_id text not null,
  message_id text not null check (char_length(message_id) between 3 and 160),
  sequence_number bigint not null check (sequence_number > 0),
  kind text not null check (kind in (
    'USER_TEXT',
    'ASSISTANT_CLARIFICATION',
    'ASSISTANT_RESULT',
    'ASSISTANT_EXPLANATION',
    'ASSISTANT_SCOPE',
    'ASSISTANT_ERROR'
  )),
  content_payload jsonb not null check (jsonb_typeof(content_payload) = 'object'),
  run_id text,
  created_at timestamptz not null default statement_timestamp(),
  primary key (user_id, message_id),
  unique (user_id, conversation_id, sequence_number),
  constraint conversation_message_conversation_fk
    foreign key (user_id, conversation_id, context_version_id)
    references public.conversations (user_id, conversation_id, context_version_id),
  constraint conversation_message_run_fk
    foreign key (user_id, run_id, context_version_id)
    references public.simulation_runs (user_id, run_id, context_version_id)
);

create table public.conversation_turns (
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id text not null,
  context_version_id text not null,
  turn_id text not null check (char_length(turn_id) between 3 and 160),
  request_id text not null check (char_length(request_id) between 3 and 80),
  request_identity text not null check (char_length(request_identity) between 1 and 160),
  user_message_id text not null,
  assistant_message_id text,
  status text not null check (status in ('PROCESSING', 'COMPLETED', 'FAILED')),
  interpretation_kind text,
  referenced_run_id text,
  interpretation_prompt_version text not null,
  interpretation_schema_version text not null,
  explanation_prompt_version text not null,
  explanation_schema_version text not null,
  provider_identifier text not null,
  model_identifier text not null,
  provider_attempt_count integer not null default 0 check (provider_attempt_count between 0 and 4),
  explanation_fallback_used boolean not null default false,
  failure_category text,
  trusted_timestamp timestamptz not null,
  trusted_timezone text not null check (trusted_timezone = 'Europe/London'),
  response_payload jsonb check (response_payload is null or jsonb_typeof(response_payload) = 'object'),
  created_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz,
  primary key (user_id, turn_id),
  unique (user_id, conversation_id, request_id),
  constraint conversation_turn_conversation_fk
    foreign key (user_id, conversation_id, context_version_id)
    references public.conversations (user_id, conversation_id, context_version_id),
  constraint conversation_turn_user_message_fk
    foreign key (user_id, user_message_id)
    references public.conversation_messages (user_id, message_id),
  constraint conversation_turn_assistant_message_fk
    foreign key (user_id, assistant_message_id)
    references public.conversation_messages (user_id, message_id),
  constraint conversation_turn_run_fk
    foreign key (user_id, referenced_run_id, context_version_id)
    references public.simulation_runs (user_id, run_id, context_version_id),
  constraint conversation_turn_completion_shape check (
    (status = 'PROCESSING' and assistant_message_id is null and response_payload is null and completed_at is null)
    or
    (status in ('COMPLETED', 'FAILED') and assistant_message_id is not null and response_payload is not null and completed_at is not null)
  )
);

create index conversations_owner_activity_idx
  on public.conversations (user_id, latest_activity_at desc);
create index conversation_messages_owner_conversation_sequence_idx
  on public.conversation_messages (user_id, conversation_id, sequence_number);
create index conversation_turns_owner_conversation_created_idx
  on public.conversation_turns (user_id, conversation_id, created_at);
create index conversation_turns_owner_run_idx
  on public.conversation_turns (user_id, referenced_run_id)
  where referenced_run_id is not null;

create trigger conversation_messages_are_immutable
before update or delete on public.conversation_messages
for each row execute function public.reject_immutable_financial_record_mutation();

create function public.guard_conversation_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.user_id is distinct from new.user_id
    or old.conversation_id is distinct from new.conversation_id
    or old.context_version_id is distinct from new.context_version_id
    or old.title is distinct from new.title
    or old.status is distinct from new.status
    or old.orchestration_version is distinct from new.orchestration_version
    or old.created_at is distinct from new.created_at then
    raise exception using errcode = '55000', message = 'conversation identity is immutable';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_conversation_update() from public, anon, authenticated;

create trigger conversations_guard_identity
before update on public.conversations
for each row execute function public.guard_conversation_update();

create function public.guard_conversation_turn_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'PROCESSING' or new.status not in ('COMPLETED', 'FAILED') then
    raise exception using errcode = '55000', message = 'conversation turn is append-final only';
  end if;
  if old.user_id is distinct from new.user_id
    or old.conversation_id is distinct from new.conversation_id
    or old.context_version_id is distinct from new.context_version_id
    or old.turn_id is distinct from new.turn_id
    or old.request_id is distinct from new.request_id
    or old.request_identity is distinct from new.request_identity
    or old.user_message_id is distinct from new.user_message_id
    or old.interpretation_prompt_version is distinct from new.interpretation_prompt_version
    or old.interpretation_schema_version is distinct from new.interpretation_schema_version
    or old.explanation_prompt_version is distinct from new.explanation_prompt_version
    or old.explanation_schema_version is distinct from new.explanation_schema_version
    or old.provider_identifier is distinct from new.provider_identifier
    or old.model_identifier is distinct from new.model_identifier
    or old.trusted_timestamp is distinct from new.trusted_timestamp
    or old.trusted_timezone is distinct from new.trusted_timezone
    or old.created_at is distinct from new.created_at then
    raise exception using errcode = '55000', message = 'conversation turn identity is immutable';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_conversation_turn_update() from public, anon, authenticated;

create trigger conversation_turns_are_append_final
before update on public.conversation_turns
for each row execute function public.guard_conversation_turn_update();

create trigger conversation_turns_cannot_be_deleted
before delete on public.conversation_turns
for each row execute function public.reject_immutable_financial_record_mutation();

alter table public.conversations enable row level security;
alter table public.conversations force row level security;
alter table public.conversation_messages enable row level security;
alter table public.conversation_messages force row level security;
alter table public.conversation_turns enable row level security;
alter table public.conversation_turns force row level security;

revoke all on table public.conversations from anon, authenticated;
revoke all on table public.conversation_messages from anon, authenticated;
revoke all on table public.conversation_turns from anon, authenticated;

grant select, insert on table public.conversations to authenticated;
grant update (selected_run_id, pending_clarification, latest_activity_at)
  on table public.conversations to authenticated;
grant select, insert on table public.conversation_messages to authenticated;
grant select, insert on table public.conversation_turns to authenticated;
grant update (
  assistant_message_id,
  status,
  interpretation_kind,
  referenced_run_id,
  provider_attempt_count,
  explanation_fallback_used,
  failure_category,
  response_payload,
  completed_at
) on table public.conversation_turns to authenticated;

create policy conversations_select_own
on public.conversations for select to authenticated
using ((select auth.uid()) = user_id);

create policy conversations_insert_own
on public.conversations for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy conversations_update_own
on public.conversations for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy conversation_messages_select_own
on public.conversation_messages for select to authenticated
using ((select auth.uid()) = user_id);

create policy conversation_messages_insert_own
on public.conversation_messages for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy conversation_turns_select_own
on public.conversation_turns for select to authenticated
using ((select auth.uid()) = user_id);

create policy conversation_turns_insert_own
on public.conversation_turns for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy conversation_turns_update_own
on public.conversation_turns for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create function public.begin_conversation_turn(
  p_conversation_id text,
  p_turn_id text,
  p_request_id text,
  p_request_identity text,
  p_user_message_id text,
  p_message_text text,
  p_trusted_timestamp timestamptz,
  p_trusted_timezone text,
  p_interpretation_prompt_version text,
  p_interpretation_schema_version text,
  p_explanation_prompt_version text,
  p_explanation_schema_version text,
  p_provider_identifier text,
  p_model_identifier text
)
returns table(status text, turn_id text, response_payload jsonb)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_context_version_id text;
  v_existing_identity text;
  v_existing_turn_id text;
  v_existing_status text;
  v_existing_response jsonb;
  v_sequence bigint;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if char_length(p_message_text) < 1 or char_length(p_message_text) > 1000 then
    raise exception using errcode = '22023', message = 'message length invalid';
  end if;
  if p_trusted_timezone <> 'Europe/London' then
    raise exception using errcode = '22023', message = 'conversation timezone invalid';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':' || p_conversation_id || ':' || p_request_id, 0)
  );

  select turns.request_identity, turns.turn_id, turns.status, turns.response_payload
    into v_existing_identity, v_existing_turn_id, v_existing_status, v_existing_response
  from public.conversation_turns as turns
  where turns.user_id = v_user_id
    and turns.conversation_id = p_conversation_id
    and turns.request_id = p_request_id;

  if found then
    if v_existing_identity <> p_request_identity then
      return query select 'idempotency_conflict'::text, null::text, null::jsonb;
    elsif v_existing_status = 'PROCESSING' then
      return query select 'processing'::text, v_existing_turn_id, null::jsonb;
    else
      return query select 'existing'::text, v_existing_turn_id, v_existing_response;
    end if;
    return;
  end if;

  select conversations.context_version_id
    into v_context_version_id
  from public.conversations as conversations
  where conversations.user_id = v_user_id
    and conversations.conversation_id = p_conversation_id
  for update;

  if not found then
    return query select 'not_found'::text, null::text, null::jsonb;
    return;
  end if;

  select coalesce(max(messages.sequence_number), 0) + 1
    into v_sequence
  from public.conversation_messages as messages
  where messages.user_id = v_user_id
    and messages.conversation_id = p_conversation_id;

  insert into public.conversation_messages (
    user_id, conversation_id, context_version_id, message_id, sequence_number, kind, content_payload
  ) values (
    v_user_id, p_conversation_id, v_context_version_id, p_user_message_id, v_sequence,
    'USER_TEXT', pg_catalog.jsonb_build_object('text', p_message_text)
  );

  insert into public.conversation_turns (
    user_id, conversation_id, context_version_id, turn_id, request_id, request_identity,
    user_message_id, status, interpretation_prompt_version, interpretation_schema_version,
    explanation_prompt_version, explanation_schema_version, provider_identifier, model_identifier,
    trusted_timestamp, trusted_timezone
  ) values (
    v_user_id, p_conversation_id, v_context_version_id, p_turn_id, p_request_id, p_request_identity,
    p_user_message_id, 'PROCESSING', p_interpretation_prompt_version, p_interpretation_schema_version,
    p_explanation_prompt_version, p_explanation_schema_version, p_provider_identifier, p_model_identifier,
    p_trusted_timestamp, p_trusted_timezone
  );

  update public.conversations
  set latest_activity_at = statement_timestamp()
  where user_id = v_user_id and conversation_id = p_conversation_id;

  return query select 'created'::text, p_turn_id, null::jsonb;
end;
$$;

create function public.complete_conversation_turn(
  p_conversation_id text,
  p_turn_id text,
  p_assistant_message_id text,
  p_assistant_kind text,
  p_assistant_content jsonb,
  p_interpretation_kind text,
  p_referenced_run_id text,
  p_provider_attempt_count integer,
  p_explanation_fallback_used boolean,
  p_failure_category text,
  p_pending_clarification jsonb,
  p_selected_run_id text,
  p_response_payload jsonb,
  p_final_status text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_context_version_id text;
  v_sequence bigint;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_final_status not in ('COMPLETED', 'FAILED') then
    raise exception using errcode = '22023', message = 'turn completion status invalid';
  end if;

  select turns.context_version_id
    into v_context_version_id
  from public.conversation_turns as turns
  where turns.user_id = v_user_id
    and turns.conversation_id = p_conversation_id
    and turns.turn_id = p_turn_id
    and turns.status = 'PROCESSING'
  for update;

  if not found then
    raise exception using errcode = '55000', message = 'conversation turn cannot be completed';
  end if;

  select coalesce(max(messages.sequence_number), 0) + 1
    into v_sequence
  from public.conversation_messages as messages
  where messages.user_id = v_user_id
    and messages.conversation_id = p_conversation_id;

  insert into public.conversation_messages (
    user_id, conversation_id, context_version_id, message_id, sequence_number,
    kind, content_payload, run_id
  ) values (
    v_user_id, p_conversation_id, v_context_version_id, p_assistant_message_id, v_sequence,
    p_assistant_kind, p_assistant_content, nullif(p_referenced_run_id, '')
  );

  update public.conversation_turns
  set assistant_message_id = p_assistant_message_id,
      status = p_final_status,
      interpretation_kind = p_interpretation_kind,
      referenced_run_id = nullif(p_referenced_run_id, ''),
      provider_attempt_count = p_provider_attempt_count,
      explanation_fallback_used = p_explanation_fallback_used,
      failure_category = nullif(p_failure_category, ''),
      response_payload = p_response_payload,
      completed_at = statement_timestamp()
  where user_id = v_user_id and turn_id = p_turn_id;

  update public.conversations
  set selected_run_id = nullif(p_selected_run_id, ''),
      pending_clarification = p_pending_clarification,
      latest_activity_at = statement_timestamp()
  where user_id = v_user_id and conversation_id = p_conversation_id;
end;
$$;

revoke all on function public.begin_conversation_turn(
  text, text, text, text, text, text, timestamptz, text,
  text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.begin_conversation_turn(
  text, text, text, text, text, text, timestamptz, text,
  text, text, text, text, text, text
) to authenticated;

revoke all on function public.complete_conversation_turn(
  text, text, text, text, jsonb, text, text, integer, boolean,
  text, jsonb, text, jsonb, text
) from public, anon, authenticated;
grant execute on function public.complete_conversation_turn(
  text, text, text, text, jsonb, text, text, integer, boolean,
  text, jsonb, text, jsonb, text
) to authenticated;
