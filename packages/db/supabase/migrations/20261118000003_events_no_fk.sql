-- The event log is append-only, so it must never be touched by cascades from other tables.
-- Keep the reference columns, drop the foreign keys: an event may point at a document or user
-- that was later deleted, and that is exactly what a log is for.
alter table public.events drop constraint if exists events_source_document_id_fkey;
alter table public.events drop constraint if exists events_actor_id_fkey;
