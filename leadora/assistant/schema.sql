-- LEADORA Website Assistant database schema.
-- Applied to the LEADORA Supabase project through migration:
-- leadora_website_assistant_settings
-- Tenant data is isolated by RLS. Only owner/admin users with an active
-- Enterprise entitlement can create or change assistant settings.

create table if not exists public.site_assistants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  public_id uuid not null unique default gen_random_uuid(),
  name text not null default 'LEADORA Assistant' check (char_length(name) between 1 and 100),
  greeting text not null default 'Hello! How can we help you?' check (char_length(greeting) between 1 and 500),
  default_language text not null default 'auto' check (default_language in ('auto','en','fr','ar')),
  brand_color text not null default '#8caeff' check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  widget_position text not null default 'right' check (widget_position in ('right','left')),
  allowed_origins text[] not null default '{}',
  business_description text not null default '' check (char_length(business_description) <= 4000),
  faq_text text not null default '' check (char_length(faq_text) <= 12000),
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  assistant_id uuid not null references public.site_assistants(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  language text not null default 'en' check (language in ('en','fr','ar')),
  origin text,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
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
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count between 1 and 1000),
  primary key (assistant_id, visitor_hash)
);

create index if not exists site_assistant_conversations_recent
  on public.site_assistant_conversations(tenant_id, last_message_at desc);
create index if not exists site_assistant_messages_recent
  on public.site_assistant_messages(conversation_id, created_at desc);

alter table public.site_assistants enable row level security;
alter table public.site_assistant_conversations enable row level security;
alter table public.site_assistant_messages enable row level security;
alter table public.site_assistant_rate_limits enable row level security;

revoke all on public.site_assistants, public.site_assistant_conversations,
  public.site_assistant_messages, public.site_assistant_rate_limits from anon, authenticated, public;
grant select, insert, update, delete on public.site_assistants to authenticated;
grant select on public.site_assistant_conversations, public.site_assistant_messages to authenticated;
grant all on public.site_assistants, public.site_assistant_conversations,
  public.site_assistant_messages, public.site_assistant_rate_limits to service_role;

drop policy if exists site_assistants_member_read on public.site_assistants;
create policy site_assistants_member_read on public.site_assistants
  for select to authenticated
  using (private.is_tenant_member(tenant_id));

drop policy if exists site_assistants_enterprise_admin_insert on public.site_assistants;
create policy site_assistants_enterprise_admin_insert on public.site_assistants
  for insert to authenticated
  with check (
    private.has_tenant_role(tenant_id, array['owner','admin'])
    and private.tenant_has_feature(tenant_id, 'website_assistant')
  );

drop policy if exists site_assistants_enterprise_admin_update on public.site_assistants;
create policy site_assistants_enterprise_admin_update on public.site_assistants
  for update to authenticated
  using (
    private.has_tenant_role(tenant_id, array['owner','admin'])
    and private.tenant_has_feature(tenant_id, 'website_assistant')
  )
  with check (
    private.has_tenant_role(tenant_id, array['owner','admin'])
    and private.tenant_has_feature(tenant_id, 'website_assistant')
  );

drop policy if exists site_assistants_enterprise_admin_delete on public.site_assistants;
create policy site_assistants_enterprise_admin_delete on public.site_assistants
  for delete to authenticated
  using (
    private.has_tenant_role(tenant_id, array['owner','admin'])
    and private.tenant_has_feature(tenant_id, 'website_assistant')
  );

drop policy if exists site_assistant_conversations_member_read on public.site_assistant_conversations;
create policy site_assistant_conversations_member_read on public.site_assistant_conversations
  for select to authenticated
  using (private.is_tenant_member(tenant_id));

drop policy if exists site_assistant_messages_member_read on public.site_assistant_messages;
create policy site_assistant_messages_member_read on public.site_assistant_messages
  for select to authenticated
  using (private.is_tenant_member(tenant_id));

drop policy if exists site_assistant_rate_limits_no_client_access on public.site_assistant_rate_limits;
create policy site_assistant_rate_limits_no_client_access on public.site_assistant_rate_limits
  for all to anon, authenticated using (false) with check (false);

-- Feature is assigned to Enterprise only. Actual access additionally requires
-- private.tenant_current_plan_key() to return an active Enterprise subscription.
update public.plan_entitlements
set features = jsonb_set(coalesce(features, '{}'::jsonb), '{website_assistant}', 'true'::jsonb, true),
    updated_at = now()
where plan_key = 'enterprise';
