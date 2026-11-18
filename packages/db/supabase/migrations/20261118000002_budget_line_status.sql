-- Budget lines carry an approval status. Imported quotes start as 'quoted'; only 'approved' and
-- 'contracted' lines count in the obra totals. 'rejected' lines stay visible for the record.
create type public.budget_line_status as enum ('quoted', 'approved', 'rejected', 'contracted');

alter table public.budget_lines
  add column status public.budget_line_status not null default 'quoted',
  add column status_changed_at timestamptz,
  add column rejection_reason text;

-- Lines that existed before this migration were entered deliberately: treat them as approved,
-- or contracted when a contracted amount was already recorded.
update public.budget_lines set status = 'contracted', status_changed_at = now() where contracted_centavos is not null;
update public.budget_lines set status = 'approved', status_changed_at = now() where status = 'quoted';

create index budget_lines_obra_status_idx on public.budget_lines (obra_id, status);
