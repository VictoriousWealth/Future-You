begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(36);

select ok((select relrowsecurity from pg_class where oid = 'public.conversations'::regclass), 'conversations have RLS');
select ok((select relforcerowsecurity from pg_class where oid = 'public.conversations'::regclass), 'conversation RLS is forced');
select ok((select relrowsecurity from pg_class where oid = 'public.conversation_messages'::regclass), 'messages have RLS');
select ok((select relforcerowsecurity from pg_class where oid = 'public.conversation_messages'::regclass), 'message RLS is forced');
select ok((select relrowsecurity from pg_class where oid = 'public.conversation_turns'::regclass), 'turns have RLS');
select ok((select relforcerowsecurity from pg_class where oid = 'public.conversation_turns'::regclass), 'turn RLS is forced');
select ok(not has_table_privilege('anon', 'public.conversations', 'select'), 'anon cannot select conversations');
select ok(not has_table_privilege('anon', 'public.conversation_messages', 'select'), 'anon cannot select messages');
select ok(not has_table_privilege('anon', 'public.conversation_turns', 'select'), 'anon cannot select turns');
select ok(has_function_privilege('authenticated', 'public.begin_conversation_turn(text,text,text,text,text,text,timestamptz,text,text,text,text,text,text,text)', 'execute'), 'authenticated may begin a turn');
select ok(not has_function_privilege('anon', 'public.begin_conversation_turn(text,text,text,text,text,text,timestamptz,text,text,text,text,text,text,text)', 'execute'), 'anon cannot begin a turn');
select ok(not (select prosecdef from pg_proc where oid = 'public.begin_conversation_turn(text,text,text,text,text,text,timestamptz,text,text,text,text,text,text,text)'::regprocedure), 'begin turn is security invoker');
select ok(not (select prosecdef from pg_proc where oid = 'public.complete_conversation_turn(text,text,text,text,jsonb,text,text,integer,boolean,text,jsonb,text,jsonb,text)'::regprocedure), 'complete turn is security invoker');

insert into public.financial_context_versions (
  user_id, version_id, context_id, domain_schema_version, persistence_schema_version,
  payload, source, origin, confirmation_reason
)
select
  '22222222-2222-4222-8222-222222222222', 'alex-conversation-v1', 'context-alex-conversation',
  domain_schema_version, persistence_schema_version,
  jsonb_set(jsonb_set(payload, '{id}', '"context-alex-conversation"'), '{version}', '"alex-conversation-v1"'),
  'conversation RLS fixture', 'fixture', 'conversation isolation test'
from public.financial_context_versions
where user_id = '11111111-1111-4111-8111-111111111111'
  and version_id = 'sarah-v1@2026-09-01';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select lives_ok($$
  insert into public.conversations (
    user_id, conversation_id, context_version_id, title, orchestration_version
  ) values (
    '11111111-1111-4111-8111-111111111111', 'conversation-rls-a',
    'sarah-v1@2026-09-01', 'A conversation', 'fy-conversation-orchestration/1.0.0'
  )
$$, 'A creates an A-owned conversation');
select is((select count(*)::integer from public.conversations), 1, 'A reads A conversation');
select throws_ok($$
  insert into public.conversations (
    user_id, conversation_id, context_version_id, title, orchestration_version
  ) values (
    '22222222-2222-4222-8222-222222222222', 'conversation-illegal-owner',
    'alex-conversation-v1', 'Illegal', 'fy-conversation-orchestration/1.0.0'
  )
$$, '42501'::char(5), null, 'A cannot create a B-owned conversation');
select throws_ok($$
  insert into public.conversations (
    user_id, conversation_id, context_version_id, title, orchestration_version
  ) values (
    '11111111-1111-4111-8111-111111111111', 'conversation-foreign-context',
    'alex-conversation-v1', 'Illegal', 'fy-conversation-orchestration/1.0.0'
  )
$$, '23503'::char(5), null, 'A cannot anchor a conversation to B context');

select results_eq($$
  select status from public.begin_conversation_turn(
    'conversation-rls-a', 'turn-rls-a', 'request-rls-a', 'identity-a',
    'message-user-rls-a', 'Can I afford a £650 trip next month?',
    '2026-08-24T12:00:00Z', 'Europe/London',
    'fy-conversation-interpretation/1.0.0', 'fy-conversation-intent/1.0.0',
    'fy-conversation-explanation/1.0.0', 'fy-explanation-plan/1.0.0',
    'fake', 'fake-conversation/1.0.0'
  )
$$, array['created'::text], 'first turn request is created');
select is((select count(*)::integer from public.conversation_messages), 1, 'first turn appends one user message');
select results_eq($$
  select status from public.begin_conversation_turn(
    'conversation-rls-a', 'different-proposed-turn', 'request-rls-a', 'identity-a',
    'different-proposed-message', 'Can I afford a £650 trip next month?',
    '2026-08-24T12:00:00Z', 'Europe/London',
    'fy-conversation-interpretation/1.0.0', 'fy-conversation-intent/1.0.0',
    'fy-conversation-explanation/1.0.0', 'fy-explanation-plan/1.0.0',
    'fake', 'fake-conversation/1.0.0'
  )
$$, array['processing'::text], 'exact in-flight retry returns the stored state');
select is((select count(*)::integer from public.conversation_messages), 1, 'exact retry creates no duplicate message');
select results_eq($$
  select status from public.begin_conversation_turn(
    'conversation-rls-a', 'turn-conflict', 'request-rls-a', 'different-identity',
    'message-conflict', 'Different message', '2026-08-24T12:00:00Z', 'Europe/London',
    'fy-conversation-interpretation/1.0.0', 'fy-conversation-intent/1.0.0',
    'fy-conversation-explanation/1.0.0', 'fy-explanation-plan/1.0.0',
    'fake', 'fake-conversation/1.0.0'
  )
$$, array['idempotency_conflict'::text], 'conflicting request identity is rejected');
select is((select count(*)::integer from public.conversation_messages), 1, 'conflict creates no message');
select lives_ok($$
  select public.complete_conversation_turn(
    'conversation-rls-a', 'turn-rls-a', 'message-assistant-rls-a',
    'ASSISTANT_SCOPE', '{"text":"Supported scope","templateId":"HELP"}'::jsonb,
    'HELP', '', 1, false, '', null, '',
    '{"assistantMessageId":"message-assistant-rls-a","intent":"HELP"}'::jsonb,
    'COMPLETED'
  )
$$, 'turn completion appends the assistant outcome atomically');
select is((select count(*)::integer from public.conversation_messages), 2, 'completion appends one assistant message');
select is((select status from public.conversation_turns where turn_id = 'turn-rls-a'), 'COMPLETED', 'turn becomes completed');
select throws_ok($$update public.conversation_messages set content_payload = '{"text":"changed"}' where message_id = 'message-user-rls-a'$$, '42501'::char(5), null, 'ordinary user cannot update a historical message');
select throws_ok($$delete from public.conversation_messages where message_id = 'message-user-rls-a'$$, '42501'::char(5), null, 'ordinary user cannot delete a historical message');
select throws_ok($$update public.conversations set user_id = '22222222-2222-4222-8222-222222222222' where conversation_id = 'conversation-rls-a'$$, '42501'::char(5), null, 'ordinary user cannot change conversation owner');
select throws_ok($$update public.conversation_turns set status = 'FAILED' where turn_id = 'turn-rls-a'$$, '55000'::char(5), null, 'completed turns cannot be changed again');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select is((select count(*)::integer from public.conversations where conversation_id = 'conversation-rls-a'), 0, 'B cannot read A conversation');
select is((select count(*)::integer from public.conversation_messages), 0, 'B cannot read A messages');
select is((select count(*)::integer from public.conversation_turns), 0, 'B cannot read A turns');
select results_eq($$
  select status from public.begin_conversation_turn(
    'conversation-rls-a', 'turn-b', 'request-b', 'identity-b', 'message-b', 'Hello',
    '2026-08-24T12:00:00Z', 'Europe/London',
    'fy-conversation-interpretation/1.0.0', 'fy-conversation-intent/1.0.0',
    'fy-conversation-explanation/1.0.0', 'fy-explanation-plan/1.0.0',
    'fake', 'fake-conversation/1.0.0'
  )
$$, array['not_found'::text], 'foreign conversation remains non-enumerable to B');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$select * from public.conversations$$, '42501'::char(5), null, 'anon cannot query conversations');
select throws_ok($$
  select * from public.begin_conversation_turn(
    'conversation-rls-a', 'turn-anon', 'request-anon', 'identity-anon', 'message-anon', 'Hello',
    '2026-08-24T12:00:00Z', 'Europe/London',
    'fy-conversation-interpretation/1.0.0', 'fy-conversation-intent/1.0.0',
    'fy-conversation-explanation/1.0.0', 'fy-explanation-plan/1.0.0',
    'fake', 'fake-conversation/1.0.0'
  )
$$, '42501'::char(5), null, 'anon cannot execute turn creation');

select * from finish();
rollback;
