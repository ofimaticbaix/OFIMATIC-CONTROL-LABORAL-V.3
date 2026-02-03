-- Add pause tracking columns to time_entries
ALTER TABLE public.time_entries
ADD COLUMN IF NOT EXISTS is_paused boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS total_paused_minutes double precision NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS pause_started_at timestamp with time zone DEFAULT NULL;