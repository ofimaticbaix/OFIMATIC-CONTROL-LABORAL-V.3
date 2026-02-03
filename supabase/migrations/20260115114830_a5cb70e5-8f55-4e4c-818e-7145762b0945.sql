-- Add access_code column to profiles table for storing worker PIN codes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS access_code TEXT;