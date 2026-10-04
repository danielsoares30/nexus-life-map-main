CREATE TABLE public.workout_schedule (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  planned_date date NOT NULL DEFAULT CURRENT_DATE,
  name text NOT NULL,
  muscle_group text NOT NULL DEFAULT 'full_body',
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  estimated_duration integer NOT NULL DEFAULT 45,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_schedule TO authenticated;
GRANT ALL ON public.workout_schedule TO service_role;

ALTER TABLE public.workout_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own workout schedule"
  ON public.workout_schedule FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_workout_schedule_updated_at
  BEFORE UPDATE ON public.workout_schedule
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_workout_schedule_user_date ON public.workout_schedule(user_id, planned_date);