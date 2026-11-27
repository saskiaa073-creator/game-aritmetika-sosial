-- Izin tabel untuk peran service_role (dipakai HANYA oleh Edge Function "api" di server).
-- Proyek Supabase baru tidak lagi memberi izin ini otomatis, sehingga fungsi mendapat
-- "permission denied for table". Peran publik (anon, authenticated) TETAP tidak diberi izin,
-- dan RLS tetap menyala tanpa kebijakan publik.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.pengguna, public.kelas, public.jawaban, public.pesan_asisten to service_role;
grant select on public.v_peringkat to service_role;
grant usage, select on all sequences in schema public to service_role;
