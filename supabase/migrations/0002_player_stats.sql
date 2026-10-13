-- Geräteübergreifende Spieler-Statistiken + Allzeit-Bestenliste (Teil: Statistik-Cloud-Sync).
-- Einmalig im Supabase SQL Editor ausführen, analog zu 0001_duels.sql. Bisher lagen Bestwerte,
-- Achievements, Serien UND die Allzeit-Punktesumme nur in localStorage - komplett verloren bei
-- Browser-Reset/Geräte-Wechsel, obwohl Duelle/Münzen längst geräteübergreifend liefen. Wie überall
-- in dieser App: keine echte Auth, RLS-Policies bewusst offen für die anon-Rolle ("keine echte
-- Sicherheit, nur eine Hürde", siehe storage/localStorageService.ts).

-- Ein JSONB-Snapshot pro Charakter statt einzelner Spalten - PlayerStatistics (src/game/types.ts)
-- hat viele Felder und wächst gelegentlich (siehe loginStreak/lastLoginStreakDate, erst kürzlich
-- ergänzt); ein Blob vermeidet eine eigene Migration für jedes neue Feld. Der Merge der
-- Bestwerte/Achievements/Serien passiert bewusst in TypeScript (siehe backend/playerStats.ts
-- mergePlayerStatistics, dort auch unit-getestet), nicht hier in SQL - leichter nachvollziehbar
-- und zu testen als verschachtelte JSONB-Vergleiche in PL/pgSQL.
create table public.player_stats (
  character_id text primary key,
  stats jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.player_stats enable row level security;
create policy "public read player stats" on public.player_stats for select using (true);
create policy "public write player stats" on public.player_stats for all using (true) with check (true);

-- Allzeit-Punktesumme + Wochensiege, bisher nur lokal (siehe
-- state/gameStore.ts processDailyAndWeeklyRollover). Additiv statt Snapshot, analog zu
-- weekly_duel_points: vermeidet jede Merge-Mehrdeutigkeit, die ein Snapshot-Abgleich bei zwei
-- nahezu gleichzeitigen Wochenabschlüssen auf zwei Geräten hätte - ein einfaches "+=" in einer
-- Transaktion ist immer korrekt, unabhängig von der Reihenfolge.
create table public.alltime_board (
  character_id text primary key,
  points numeric not null default 0,
  weekly_wins numeric not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.alltime_board enable row level security;
create policy "public read alltime board" on public.alltime_board for select using (true);
create policy "public write alltime board" on public.alltime_board for all using (true) with check (true);

create or replace function public.add_alltime_progress(
  p_character_id text,
  p_points numeric,
  p_weekly_wins numeric
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.alltime_board (character_id, points, weekly_wins)
  values (p_character_id, p_points, p_weekly_wins)
  on conflict (character_id) do update
    set points = alltime_board.points + excluded.points,
        weekly_wins = alltime_board.weekly_wins + excluded.weekly_wins,
        updated_at = now();
end;
$$;

grant execute on function public.add_alltime_progress to anon;
