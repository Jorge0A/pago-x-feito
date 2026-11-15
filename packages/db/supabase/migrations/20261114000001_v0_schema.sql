-- Pago x Feito — v0 schema
-- Money is always integer centavos (bigint). Due dates are `date`; moments are `timestamptz`.
-- Every table has RLS. Access is through obra membership (obra_members).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.obra_status as enum ('planning', 'in_progress', 'finished');
create type public.member_role as enum ('owner', 'partner', 'engineer', 'viewer');
create type public.nf_status as enum ('pending', 'received', 'not_applicable');
create type public.payment_method as enum ('pix', 'transfer', 'boleto', 'card', 'cash', 'other');
create type public.installment_trigger as enum ('date', 'delivery', 'milestone');
create type public.installment_status as enum ('pending', 'paid', 'cancelled');
create type public.task_type as enum ('delivery', 'measurement', 'installation', 'payment', 'paperwork', 'access', 'other');
create type public.task_status as enum ('planned', 'in_progress', 'done', 'cancelled');
create type public.document_kind as enum (
  'receipt', 'nf', 'contract', 'budget', 'photo', 'quote',
  'building_manual', 'building_procedures', 'assembly_minutes', 'other'
);
create type public.inbox_channel as enum ('upload', 'whatsapp', 'chat_export', 'email');
create type public.inbox_status as enum ('received', 'extracting', 'proposed', 'confirmed', 'discarded', 'failed');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', null))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- buildings (shared across owners in the same building)
-- ---------------------------------------------------------------------------
create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  neighborhood text,
  city text not null default 'São Paulo',
  -- {"mon":[["08:00","17:00"]], ..., "sat":[["08:00","12:00"]], "sun":[], "holidays": false}
  work_hours jsonb not null default '{
    "mon": [["08:00","17:00"]], "tue": [["08:00","17:00"]], "wed": [["08:00","17:00"]],
    "thu": [["08:00","17:00"]], "fri": [["08:00","17:00"]], "sat": [["08:00","12:00"]],
    "sun": [], "holidays": false
  }'::jsonb,
  approval_process jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger buildings_updated_at before update on public.buildings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- obras and members
-- ---------------------------------------------------------------------------
create table public.obras (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings (id) on delete restrict,
  owner_id uuid not null references auth.users (id) on delete restrict,
  unit text,
  title text not null,
  start_date date,
  status public.obra_status not null default 'planning',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index obras_building_idx on public.obras (building_id);
create index obras_owner_idx on public.obras (owner_id);
create trigger obras_updated_at before update on public.obras
  for each row execute function public.set_updated_at();

create table public.obra_members (
  obra_id uuid not null references public.obras (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (obra_id, user_id)
);
create index obra_members_user_idx on public.obra_members (user_id);

-- The creator of an obra becomes its owner member automatically.
create or replace function public.handle_new_obra()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.obra_members (obra_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end $$;
create trigger on_obra_created after insert on public.obras
  for each row execute function public.handle_new_obra();

-- Membership checks used by every policy. SECURITY DEFINER avoids recursive RLS on obra_members.
create or replace function public.is_obra_member(p_obra_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.obra_members m
    where m.obra_id = p_obra_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.obra_role(p_obra_id uuid)
returns public.member_role language sql stable security definer set search_path = public as $$
  select m.role from public.obra_members m
  where m.obra_id = p_obra_id and m.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_building_member(p_building_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.obras o
    join public.obra_members m on m.obra_id = o.id
    where o.building_id = p_building_id and m.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- documents (files in private storage)
-- ---------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references public.obras (id) on delete cascade,
  building_id uuid references public.buildings (id) on delete cascade,
  storage_path text not null unique,
  kind public.document_kind not null default 'other',
  original_name text not null,
  mime_type text,
  size_bytes bigint,
  extracted_text text,
  pages integer,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint documents_owner_chk check (obra_id is not null or building_id is not null)
);
create index documents_obra_idx on public.documents (obra_id);
create index documents_building_idx on public.documents (building_id);

-- ---------------------------------------------------------------------------
-- suppliers
-- ---------------------------------------------------------------------------
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id) on delete cascade,
  name text not null,
  cnpj text,
  category text,
  contact_name text,
  phone text,
  whatsapp_number text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index suppliers_obra_idx on public.suppliers (obra_id);
create trigger suppliers_updated_at before update on public.suppliers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- contracts and installments
-- ---------------------------------------------------------------------------
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  document_id uuid references public.documents (id) on delete set null,
  title text not null,
  total_centavos bigint not null check (total_centavos >= 0),
  signed_at date,
  issued_at date,
  -- {"validity_days":15,"tacit_approval_days":5,"hourly_rate_centavos":70000,
  --  "shutdowns":[{"start":"2026-12-19","end":"2027-01-05"}],"warranty":"..."}
  terms jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contracts_obra_idx on public.contracts (obra_id);
create index contracts_supplier_idx on public.contracts (supplier_id);
create trigger contracts_updated_at before update on public.contracts
  for each row execute function public.set_updated_at();

create table public.installments (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id) on delete cascade,
  contract_id uuid not null references public.contracts (id) on delete cascade,
  label text not null,
  amount_centavos bigint not null check (amount_centavos >= 0),
  due_date date,
  trigger public.installment_trigger not null default 'date',
  trigger_note text,
  status public.installment_status not null default 'pending',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index installments_obra_idx on public.installments (obra_id);
create index installments_contract_idx on public.installments (contract_id);
create index installments_due_idx on public.installments (due_date) where status = 'pending';
create trigger installments_updated_at before update on public.installments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- budget lines
-- ---------------------------------------------------------------------------
create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id) on delete cascade,
  supplier_id uuid references public.suppliers (id) on delete set null,
  contract_id uuid references public.contracts (id) on delete set null,
  category text not null,
  description text not null,
  qty numeric(14, 3),
  unit text,
  budgeted_centavos bigint not null default 0 check (budgeted_centavos >= 0),
  contracted_centavos bigint check (contracted_centavos is null or contracted_centavos >= 0),
  source_document_id uuid references public.documents (id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index budget_lines_obra_idx on public.budget_lines (obra_id);
create index budget_lines_supplier_idx on public.budget_lines (supplier_id);
create trigger budget_lines_updated_at before update on public.budget_lines
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  installment_id uuid references public.installments (id) on delete set null,
  budget_line_id uuid references public.budget_lines (id) on delete set null,
  amount_centavos bigint not null check (amount_centavos > 0),
  paid_at date not null,
  method public.payment_method not null default 'pix',
  receipt_document_id uuid references public.documents (id) on delete set null,
  nf_status public.nf_status not null default 'pending',
  nf_document_id uuid references public.documents (id) on delete set null,
  nf_received_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_obra_idx on public.payments (obra_id);
create index payments_supplier_idx on public.payments (supplier_id);
create index payments_nf_pending_idx on public.payments (obra_id, paid_at) where nf_status = 'pending';
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tasks and dependencies (finish-to-start)
-- ---------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id) on delete cascade,
  supplier_id uuid references public.suppliers (id) on delete set null,
  title text not null,
  type public.task_type not null default 'other',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.task_status not null default 'planned',
  outside_work_hours boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_range_chk check (ends_at >= starts_at)
);
create index tasks_obra_idx on public.tasks (obra_id, starts_at);
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

create table public.task_dependencies (
  task_id uuid not null references public.tasks (id) on delete cascade,
  depends_on_task_id uuid not null references public.tasks (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, depends_on_task_id),
  constraint task_dependencies_self_chk check (task_id <> depends_on_task_id)
);
create index task_dependencies_depends_idx on public.task_dependencies (depends_on_task_id);

-- ---------------------------------------------------------------------------
-- inbox (one queue for every channel)
-- ---------------------------------------------------------------------------
create table public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id) on delete cascade,
  channel public.inbox_channel not null default 'upload',
  document_id uuid references public.documents (id) on delete set null,
  raw_text text,
  status public.inbox_status not null default 'received',
  proposal jsonb,
  confidence numeric(4, 3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  error text,
  attempts integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index inbox_items_obra_status_idx on public.inbox_items (obra_id, status, created_at desc);
create trigger inbox_items_updated_at before update on public.inbox_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- events (append-only)
-- ---------------------------------------------------------------------------
create table public.events (
  id bigint generated always as identity primary key,
  obra_id uuid not null references public.obras (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  source_document_id uuid references public.documents (id) on delete set null,
  created_at timestamptz not null default now()
);
create index events_obra_idx on public.events (obra_id, created_at desc);

create or replace function public.events_append_only()
returns trigger language plpgsql as $$
begin
  raise exception 'events is append-only (% not allowed)', tg_op;
end $$;
create trigger events_no_update before update on public.events
  for each row execute function public.events_append_only();
create trigger events_no_delete before delete on public.events
  for each row execute function public.events_append_only();
-- Belt and braces: the API roles cannot even try.
revoke update, delete, truncate on public.events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- ai_calls (token and cost log per obra)
-- ---------------------------------------------------------------------------
create table public.ai_calls (
  id bigint generated always as identity primary key,
  obra_id uuid references public.obras (id) on delete set null,
  inbox_item_id uuid references public.inbox_items (id) on delete set null,
  purpose text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  cost_usd_micros bigint not null default 0,
  duration_ms integer,
  ok boolean not null default true,
  created_at timestamptz not null default now()
);
create index ai_calls_obra_idx on public.ai_calls (obra_id, created_at desc);

-- ---------------------------------------------------------------------------
-- reminder settings (one row per obra)
-- ---------------------------------------------------------------------------
create table public.reminder_settings (
  obra_id uuid primary key references public.obras (id) on delete cascade,
  email text,
  enabled boolean not null default true,
  pending_nf_days integer not null default 7 check (pending_nf_days >= 0),
  digest_hour integer not null default 8 check (digest_hour between 0 and 23),
  worker_registration_days integer not null default 2,
  last_sent_at timestamptz,
  updated_at timestamptz not null default now()
);
create trigger reminder_settings_updated_at before update on public.reminder_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.buildings enable row level security;
alter table public.obras enable row level security;
alter table public.obra_members enable row level security;
alter table public.documents enable row level security;
alter table public.suppliers enable row level security;
alter table public.contracts enable row level security;
alter table public.installments enable row level security;
alter table public.budget_lines enable row level security;
alter table public.payments enable row level security;
alter table public.tasks enable row level security;
alter table public.task_dependencies enable row level security;
alter table public.inbox_items enable row level security;
alter table public.events enable row level security;
alter table public.ai_calls enable row level security;
alter table public.reminder_settings enable row level security;

-- profiles: only your own row
create policy profiles_select on public.profiles for select using (id = auth.uid());
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- buildings: visible to members of any obra in it (and to its creator until an obra exists)
create policy buildings_select on public.buildings for select
  using (public.is_building_member(id) or created_by = auth.uid());
create policy buildings_insert on public.buildings for insert to authenticated
  with check (created_by = auth.uid());
create policy buildings_update on public.buildings for update
  using (public.is_building_member(id) or created_by = auth.uid())
  with check (public.is_building_member(id) or created_by = auth.uid());

-- obras
create policy obras_select on public.obras for select using (public.is_obra_member(id));
create policy obras_insert on public.obras for insert to authenticated with check (owner_id = auth.uid());
create policy obras_update on public.obras for update
  using (public.obra_role(id) in ('owner', 'partner'))
  with check (public.obra_role(id) in ('owner', 'partner'));

-- obra_members: members see the member list; changes only via triggers/service role in v0
create policy obra_members_select on public.obra_members for select using (public.is_obra_member(obra_id));

-- Generic "member of the obra" policies for obra-scoped tables.
-- v0 has only owners; v2 narrows write policies per role.
create policy documents_select on public.documents for select
  using ((obra_id is not null and public.is_obra_member(obra_id))
      or (building_id is not null and public.is_building_member(building_id)));
create policy documents_insert on public.documents for insert to authenticated
  with check ((obra_id is not null and public.is_obra_member(obra_id))
           or (building_id is not null and public.is_building_member(building_id)));
create policy documents_update on public.documents for update
  using (obra_id is not null and public.is_obra_member(obra_id));
create policy documents_delete on public.documents for delete
  using (obra_id is not null and public.obra_role(obra_id) in ('owner', 'partner'));

create policy suppliers_all on public.suppliers for all
  using (public.is_obra_member(obra_id)) with check (public.is_obra_member(obra_id));
create policy contracts_all on public.contracts for all
  using (public.is_obra_member(obra_id)) with check (public.is_obra_member(obra_id));
create policy installments_all on public.installments for all
  using (public.is_obra_member(obra_id)) with check (public.is_obra_member(obra_id));
create policy budget_lines_all on public.budget_lines for all
  using (public.is_obra_member(obra_id)) with check (public.is_obra_member(obra_id));
create policy payments_all on public.payments for all
  using (public.is_obra_member(obra_id)) with check (public.is_obra_member(obra_id));
create policy tasks_all on public.tasks for all
  using (public.is_obra_member(obra_id)) with check (public.is_obra_member(obra_id));
create policy task_dependencies_all on public.task_dependencies for all
  using (exists (select 1 from public.tasks t where t.id = task_id and public.is_obra_member(t.obra_id)))
  with check (exists (select 1 from public.tasks t where t.id = task_id and public.is_obra_member(t.obra_id)));
create policy inbox_items_all on public.inbox_items for all
  using (public.is_obra_member(obra_id)) with check (public.is_obra_member(obra_id));
create policy reminder_settings_all on public.reminder_settings for all
  using (public.is_obra_member(obra_id)) with check (public.is_obra_member(obra_id));

-- events: members read and append; never update or delete (no policy + trigger + revoke)
create policy events_select on public.events for select using (public.is_obra_member(obra_id));
create policy events_insert on public.events for insert to authenticated
  with check (public.is_obra_member(obra_id));

-- ai_calls: members read their obra's cost; writes only by the service role
create policy ai_calls_select on public.ai_calls for select
  using (obra_id is not null and public.is_obra_member(obra_id));

-- ---------------------------------------------------------------------------
-- Storage: one private bucket, paths are <obra_id>/<uuid>-<name>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 26214400)  -- 25 MB
on conflict (id) do nothing;

create policy documents_bucket_select on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.is_obra_member(((storage.foldername(name))[1])::uuid));
create policy documents_bucket_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.is_obra_member(((storage.foldername(name))[1])::uuid));
create policy documents_bucket_delete on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and public.obra_role(((storage.foldername(name))[1])::uuid) in ('owner', 'partner'));
