-- Drop the existing check constraint
ALTER TABLE public.incidents DROP CONSTRAINT incidents_type_check;

-- Add new check constraint with all incident types from the frontend
ALTER TABLE public.incidents ADD CONSTRAINT incidents_type_check 
CHECK (type = ANY (ARRAY[
  'break'::text, 
  'lunch'::text, 
  'medical'::text, 
  'early_departure'::text, 
  'delay'::text, 
  'meeting'::text, 
  'personal_call'::text, 
  'family'::text, 
  'wellness'::text, 
  'absence'::text, 
  'other'::text
]));