CREATE TABLE public.game_rooms (
  code TEXT PRIMARY KEY,
  host_name TEXT NOT NULL,
  guest_name TEXT,
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.game_rooms TO anon;
GRANT SELECT, INSERT, UPDATE ON public.game_rooms TO authenticated;
GRANT ALL ON public.game_rooms TO service_role;

ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rooms" ON public.game_rooms FOR SELECT USING (true);
CREATE POLICY "Anyone can create rooms" ON public.game_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update rooms" ON public.game_rooms FOR UPDATE USING (true) WITH CHECK (true);

CREATE TABLE public.leaderboard_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  time_remaining INTEGER NOT NULL DEFAULT 0,
  result TEXT NOT NULL DEFAULT 'WIN',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX leaderboard_entries_score_idx ON public.leaderboard_entries (score DESC);

GRANT SELECT, INSERT ON public.leaderboard_entries TO anon;
GRANT SELECT, INSERT ON public.leaderboard_entries TO authenticated;
GRANT ALL ON public.leaderboard_entries TO service_role;

ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view leaderboard" ON public.leaderboard_entries FOR SELECT USING (true);
CREATE POLICY "Anyone can add leaderboard entries" ON public.leaderboard_entries FOR INSERT WITH CHECK (true);