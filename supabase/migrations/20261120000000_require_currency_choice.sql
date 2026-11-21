-- New accounts must choose a display currency before entering money.
-- Existing preferences, including USD, remain unchanged.
ALTER TABLE public.profiles ALTER COLUMN currency DROP DEFAULT;
