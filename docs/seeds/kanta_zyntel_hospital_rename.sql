-- Run in Kanta Supabase SQL Editor (adjust UUID if your demo hospital differs)
UPDATE public.hospitals
SET
  name = 'Zyntel Hospital',
  city = 'Kampala',
  country = 'Uganda'
WHERE id = '6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5';
