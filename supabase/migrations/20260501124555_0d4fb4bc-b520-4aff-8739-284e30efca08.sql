-- cave_challenges
CREATE TABLE public.cave_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  objective TEXT NOT NULL DEFAULT '',
  motivation TEXT NOT NULL DEFAULT '',
  duration_days INTEGER NOT NULL DEFAULT 40,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  rituals JSONB NOT NULL DEFAULT '[]'::jsonb,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cave_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cave challenges"
ON public.cave_challenges FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_cave_challenges_updated_at
BEFORE UPDATE ON public.cave_challenges
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- cave_daily_logs
CREATE TABLE public.cave_daily_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL,
  day_number INTEGER NOT NULL DEFAULT 1,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  rituals_done JSONB NOT NULL DEFAULT '[]'::jsonb,
  rules_broken JSONB NOT NULL DEFAULT '[]'::jsonb,
  focus_hours NUMERIC NOT NULL DEFAULT 0,
  sleep_hours NUMERIC NOT NULL DEFAULT 0,
  trained BOOLEAN NOT NULL DEFAULT false,
  read_today BOOLEAN NOT NULL DEFAULT false,
  rating INTEGER NOT NULL DEFAULT 5,
  reflection TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, date)
);

ALTER TABLE public.cave_daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cave logs"
ON public.cave_daily_logs FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_cave_daily_logs_updated_at
BEFORE UPDATE ON public.cave_daily_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_cave_logs_user_challenge ON public.cave_daily_logs(user_id, challenge_id);