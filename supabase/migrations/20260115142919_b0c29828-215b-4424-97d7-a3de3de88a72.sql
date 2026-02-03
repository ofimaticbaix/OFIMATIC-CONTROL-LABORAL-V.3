-- Change affected_time from timestamp to text to allow time range strings like "14:00 - 15:00"
ALTER TABLE public.incidents 
ALTER COLUMN affected_time TYPE text 
USING affected_time::text;