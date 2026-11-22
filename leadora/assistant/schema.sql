-- LEADORA Website Assistant schema draft.
-- REVIEW AND APPLY ONLY TO A DEVELOPMENT DATABASE. This file is not deployed.
create table if not exists public.site_assistants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  public_id uuid not null unique default gen_random_uuid(),
  name text not null default 'LEADORA Assistant' check (char_length(name) between 1 and 100),
  greeting text not null default 'Hello! How can we help you?' check (char_length(greeting) between 1 and 500),
  enabled boolean not null default false,
  allowed_origins text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, tenant_id)
);
create table if not exists public.site_assistant_knowledge (
  id uuid primary key default gen_random_uuid(),
  assistant_id uuid not null,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  content text not null check (char_length(content) between 1 and 12000),
  created_at timestamptz not null default now(),
  foreign key (assistant_id, tenant_id) references public.site_assistants(id, tenant_id) on delete cascade
);
create table if not exists public.site_assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  assistant_id uuid not null,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  language text not null default 'en' check (language in ('en','fr','ar')),
  origin text,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  foreign key (assistant_id, tenant_id) references public.site_assistants(id, tenant_id) on delete cascade,
  unique (id, assistant_id, tenant_id)
);
create table if not exists public.site_assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  assistant_id uuid not null,
  tenant_id uuid not null,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now(),
  foreign key (conversation_id, assistant_id, tenant_id)
    references public.site_assistant_conversations(id, assistant_id, tenant_id) on delete cascade
);
create table if not exists public.site_assistant_rate_limits (
  assistant_id uuid not null references public.site_assistants(id) on delete cascade,
  visitor_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count between 1 and 1000),
  primary key (assistant_id, visitor_hash)
);
create index if not exists site_assistant_knowledge_lookup on public.site_assistant_knowledge(assistant_id, tenant_id);
create index if not exists site_assistant_conversations_recent on public.site_assistant_conversations(assistant_id, tenant_id, last_message_at desc);
create index if not exists site_assistant_messages_recent on public.site_assistant_messages(conversation_id, created_at desc);

alter table public.site_assistants enable row level security;
alter table public.site_assistant_knowledge enable row level security;
alter table public.site_assistant_conversations enable row level security;
alter table public.site_assistant_messages enable row level security;
alter table public.site_assistant_rate_limits enable row level security;

drop policy if exists site_assistants_member_read on public.site_assistants;
create policy site_assistants_member_read on public.site_assistants for select to authenticated
  using (private.is_tenant_member(tenant_id));
drop policy if exists site_assistants_admin_write on public.site_assistants;
create policy site_assistants_admin_write on public.site_assistants for all to authenticated
  using (private.has_tenant_role(tenant_id, array['owner','admin']))
  with check (private.has_tenant_role(tenant_id, array['owner','admin']));

drop policy if exists site_assistant_knowledge_member_read on public.site_assistant_knowledge;
create policy site_assistant_knowledge_member_read on public.site_assistant_knowledge for select to authenticated
  using (private.is_tenant_member(tenant_id));
drop policy if exists site_assistant_knowledge_admin_write on public.site_assistant_knowledge;
create policy site_assistant_knowledge_admin_write on public.site_assistant_knowledge for all to authenticated
  using (private.has_tenant_role(tenant_id, array['owner','admin']))
  with check (private.has_tenant_role(tenant_id, array['owner','admin']));

drop policy if exists site_assistant_conversations_member_read on public.site_assistant_conversations;
create policy site_assistant_conversations_member_read on public.site_assistant_conversations for select to authenticated
  using (private.is_tenant_member(tenant_id));
drop policy if exists site_assistant_messages_member_read on public.site_assistant_messages;
create policy site_assistant_messages_member_read on public.site_assistant_messages for select to authenticated
  using (private.is_tenant_member(tenant_id));

create or replace function public.leadora_site_assistant_entitled(p_tenant_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(private.tenant_has_feature(p_tenant_id, 'website_assistant'), false) $$;
revoke all on function public.leadora_site_assistant_entitled(uuid) from public, anon, authenticated;
grant execute on function public.leadora_site_assistant_entitled(uuid) to service_role;

create or replace function public.leadora_site_assistant_rate_limit(
  p_assistant_id uuid, p_visitor_hash text, p_max_requests integer default 12
) returns boolean language plpgsql security definer set search_path = ''
as $$
declare allowed boolean;
begin
  insert into public.site_assistant_rate_limits(assistant_id, visitor_hash, window_started_at, request_count)
  values (p_assistant_id, p_visitor_hash, now(), 1)
  on conflict (assistant_id, visitor_hash) do update
    set window_started_at = case
          when public.site_assistant_rate_limits.window_started_at < now() - interval '1 minute' then now()
          else public.site_assistant_rate_limits.window_started_at end,
        request_count = case
          when public.site_assistant_rate_limits.window_started_at < now() - interval '1 minute' then 1
          else public.site_assistant_rate_limits.request_count + 1 end;
  select request_count <= greatest(1, least(p_max_requests, 60)) into allowed
    from public.site_assistant_rate_limits
    where assistant_id = p_assistant_id and visitor_hash = p_visitor_hash;
  return coalesce(allowed, false);
end;
$$;
revoke all on function public.leadora_site_assistant_rate_limit(uuid,text,integer) from public, anon, authenticated;
grant execute on function public.leadora_site_assistant_rate_limit(uuid,text,integer) to service_role;

update public.plan_entitlements
set features = jsonb_set(coalesce(features, '{}'::jsonb), '{website_assistant}', 'true'::jsonb, true),
    updated_at = now()
where plan_key = 'enterprise';
