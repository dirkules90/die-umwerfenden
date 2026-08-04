-- Duell-Feature (Teil: Asynchrones 1:1/Gruppen-Duell mit Münz-Einsatz).
-- Einmalig im Supabase SQL Editor ausführen. Diese App hat kein echtes Auth-System (nur
-- clientseitiger PIN-Schutz, siehe src/ui/components/PinGate.tsx), deshalb sind die RLS-Policies
-- bewusst offen für die anon-Rolle - konsistent mit dem Rest der App ("keine echte Sicherheit,
-- nur eine Hürde", siehe storage/localStorageService.ts).

create extension if not exists pgcrypto;

-- Wallet: ab jetzt die massgebliche Münz-Quelle geräteübergreifend (bisher nur localStorage,
-- siehe game/types.ts CharacterCosmetics.coins). localStorage bleibt als schneller lokaler Cache
-- bestehen, wird aber bei jeder Änderung hierher gespiegelt (siehe backend/wallet.ts).
create table public.wallets (
  character_id text primary key,
  coins integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Vollständige Münz-Historie, unabhängig vom Grund (Spiel, Achievement, Shop-Kauf, Duell, ...).
create table public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  character_id text not null,
  amount integer not null,
  reason text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index coin_transactions_character_id_idx on public.coin_transactions (character_id, created_at desc);

-- Ein Duell: fixer Einsatz pro Teilnehmer, ein Spielmodus, optionale Pott-Aufteilung ab 4/5
-- Teilnehmern (siehe backend/duels.ts für die Aufteilungs-Logik).
create table public.duels (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  challenger_id text not null,
  mode text not null check (mode in ('hausnummer_hoch', 'hausnummer_niedrig', 'tannenbaum')),
  stake integer not null check (stake > 0),
  split_mode text not null default 'winner_takes_all'
    check (split_mode in ('winner_takes_all', 'top2', 'top3')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled', 'completed')),
  resolved_at timestamptz
);

create table public.duel_participants (
  duel_id uuid not null references public.duels (id) on delete cascade,
  character_id text not null,
  is_challenger boolean not null default false,
  response text not null default 'pending' check (response in ('pending', 'accepted', 'declined')),
  score numeric,
  played_at timestamptz,
  payout integer,
  seen boolean not null default false,
  primary key (duel_id, character_id)
);

create index duel_participants_character_id_idx on public.duel_participants (character_id);

alter table public.wallets enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.duels enable row level security;
alter table public.duel_participants enable row level security;

create policy "public read wallets" on public.wallets for select using (true);
create policy "public write wallets" on public.wallets for all using (true) with check (true);

create policy "public read transactions" on public.coin_transactions for select using (true);
create policy "public insert transactions" on public.coin_transactions for insert with check (true);

create policy "public read duels" on public.duels for select using (true);
create policy "public write duels" on public.duels for all using (true) with check (true);

create policy "public read participants" on public.duel_participants for select using (true);
create policy "public write participants" on public.duel_participants for all using (true) with check (true);

-- Atomarer Münz-Buchungsbaustein: sorgt dafür, dass Kontostand-Änderung + Historien-Eintrag nie
-- auseinanderfallen (z. B. bei gleichzeitigen Duell-Abschlüssen von zwei Geräten), und dass ein
-- Kontostand nie unter 0 fällt (bricht die ganze Transaktion ab statt eines Negativsaldos).
create or replace function public.apply_coin_transaction(
  p_character_id text,
  p_amount integer,
  p_reason text,
  p_meta jsonb default null
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance integer;
begin
  insert into public.wallets (character_id, coins)
  values (p_character_id, 0)
  on conflict (character_id) do nothing;

  update public.wallets
  set coins = coins + p_amount, updated_at = now()
  where character_id = p_character_id
  returning coins into new_balance;

  if new_balance < 0 then
    raise exception 'Kontostand von % würde negativ werden (%)', p_character_id, new_balance;
  end if;

  insert into public.coin_transactions (character_id, amount, reason, meta)
  values (p_character_id, p_amount, p_reason, p_meta);

  return new_balance;
end;
$$;

grant execute on function public.apply_coin_transaction to anon;

-- Wochenpunkte-Bonus aus gewonnenen Duellen (Teil: Wochenbewertung) - separat von der lokalen
-- weeklyPoints-Berechnung (siehe state/gameStore.ts), weil Duelle geräteübergreifend sind, das
-- restliche Wochenpunkte-System aber lokal je Gerät bleibt. week_key ist der Montag der Woche
-- (siehe game/dateKey.ts weekKeyFor), damit sich der Bonus sauber pro Kalenderwoche trennt.
create table public.weekly_duel_points (
  character_id text not null,
  week_key text not null,
  points numeric not null default 0,
  primary key (character_id, week_key)
);

alter table public.weekly_duel_points enable row level security;
create policy "public read weekly duel points" on public.weekly_duel_points for select using (true);
create policy "public write weekly duel points" on public.weekly_duel_points for all using (true) with check (true);

create or replace function public.add_weekly_duel_points(
  p_character_id text,
  p_week_key text,
  p_points numeric
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.weekly_duel_points (character_id, week_key, points)
  values (p_character_id, p_week_key, p_points)
  on conflict (character_id, week_key) do update set points = weekly_duel_points.points + excluded.points;
end;
$$;

grant execute on function public.add_weekly_duel_points to anon;
