
-- Add archetype column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS archetype text DEFAULT null;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS character_created boolean DEFAULT false;

-- Create workouts table
CREATE TABLE public.workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  muscle_group text NOT NULL DEFAULT 'full_body',
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  duration_minutes integer NOT NULL DEFAULT 0,
  xp_earned integer NOT NULL DEFAULT 20,
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own workouts" ON public.workouts
  FOR ALL TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
