-- 0) Agregar nuevo valor al enum
ALTER TYPE public.tournament_format ADD VALUE IF NOT EXISTS 'league';

-- 1) matches.metadata jsonb
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2) participants.updated_at
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 3) Trigger updated_at genérico
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_matches_updated_at ON public.matches;
CREATE TRIGGER trg_matches_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_tournaments_updated_at ON public.tournaments;
CREATE TRIGGER trg_tournaments_updated_at
BEFORE UPDATE ON public.tournaments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_participants_updated_at ON public.participants;
CREATE TRIGGER trg_participants_updated_at
BEFORE UPDATE ON public.participants
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Índices útiles
CREATE INDEX IF NOT EXISTS idx_matches_tournament_stage_round_match
  ON public.matches (tournament_id, stage, round_number, match_number);

CREATE INDEX IF NOT EXISTS idx_participants_tournament_seed
  ON public.participants (tournament_id, seed);
