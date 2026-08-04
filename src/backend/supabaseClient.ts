import { createClient } from '@supabase/supabase-js'

/**
 * Erstes Backend der App (Teil: Online-Duelle) - bisher war alles rein lokal (localStorage, siehe
 * storage/localStorageService.ts). Der anon-Key ist bewusst im Client-Code sichtbar, das ist bei
 * Supabase so vorgesehen: die eigentliche Absicherung passiert über Row-Level-Security-Policies in
 * der Datenbank (siehe supabase/migrations/0001_duels.sql), nicht über Geheimhaltung des Keys.
 * Passend zum Rest der App (nur PIN-Schutz, "keine echte Sicherheit, nur eine Hürde", siehe
 * storage/localStorageService.ts) sind diese Policies bewusst offen für die kleine Freundesgruppe.
 */
const SUPABASE_URL = 'https://ocodaikjnomrdvgqoaov.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jb2RhaWtqbm9tcmR2Z3FvYW92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4MjY0MzUsImV4cCI6MjEwMTQwMjQzNX0.L_bhazkG4i2rCypQjoJTwdBDdW3IWjrCflSCZzSkacQ'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
