-- Skema Pasar Pintar di Supabase (PostgreSQL). Padanan apps/api/db.py.
--
-- KEAMANAN: semua tabel memakai Row Level Security (RLS) TANPA kebijakan untuk anon/authenticated,
-- sehingga tabel tidak bisa dibaca/ditulis langsung dari peramban. Semua akses lewat Edge Function
-- "api" yang memakai kunci service role (rahasia, hanya di server). Aturan kunci jawaban, poin,
-- dan privasi anak dijaga oleh fungsi itu.
--
-- PRIVASI ANAK: tidak ada kolom e-mail, nomor HP, tanggal lahir, atau nama lengkap.

create table public.pengguna (
  id bigint generated always as identity primary key,
  username varchar(20) not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  nama_panggilan varchar(15) not null,
  password_hash varchar(200) not null,
  peran varchar(10) not null default 'siswa' check (peran in ('siswa', 'guru')),
  kelas_id bigint,
  dibuat timestamptz not null default now()
);

create table public.kelas (
  id bigint generated always as identity primary key,
  nama varchar(40) not null,
  kode varchar(6) not null unique,
  guru_id bigint not null references public.pengguna (id) on delete cascade,
  dibuat timestamptz not null default now()
);

alter table public.pengguna
  add constraint pengguna_kelas_id_fkey foreign key (kelas_id) references public.kelas (id) on delete set null;

create table public.jawaban (
  id bigint generated always as identity primary key,
  pengguna_id bigint not null references public.pengguna (id) on delete cascade,
  modul_id varchar(20) not null,
  soal_id varchar(40) not null,
  jawaban varchar(40) not null,
  status varchar(12) not null check (status in ('benar', 'salah', 'tidak_valid')),
  kode_kesalahan varchar(40) not null,
  petunjuk_dipakai smallint not null default 0 check (petunjuk_dipakai between 0 and 3),
  poin smallint not null default 0,
  waktu timestamptz not null default now(),
  tanggal date not null
);
create index jawaban_pengguna_soal on public.jawaban (pengguna_id, soal_id);
create index jawaban_pengguna_modul on public.jawaban (pengguna_id, modul_id);

create table public.pesan_asisten (
  id bigint generated always as identity primary key,
  pengguna_id bigint not null references public.pengguna (id) on delete cascade,
  soal_id varchar(40) not null,
  peran varchar(10) not null check (peran in ('siswa', 'asisten')),
  isi varchar(800) not null,
  status_cek varchar(12) not null default '',
  minta_bantuan smallint not null default 0,
  sumber varchar(10) not null default '',
  waktu timestamptz not null default now(),
  tanggal date not null
);
create index pesan_asisten_pengguna_soal on public.pesan_asisten (pengguna_id, soal_id);
create index pesan_asisten_pengguna_tanggal on public.pesan_asisten (pengguna_id, tanggal);

-- Papan peringkat: hanya nama panggilan + poin (security_invoker agar RLS tetap berlaku).
create view public.v_peringkat with (security_invoker = true) as
  select p.id, p.nama_panggilan, p.kelas_id, coalesce(sum(j.poin), 0)::int as poin
  from public.pengguna p
  left join public.jawaban j on j.pengguna_id = p.id
  where p.peran = 'siswa'
  group by p.id, p.nama_panggilan, p.kelas_id;

-- Row Level Security: menyala di semua tabel, tanpa kebijakan publik (tolak semua akses langsung).
alter table public.pengguna enable row level security;
alter table public.kelas enable row level security;
alter table public.jawaban enable row level security;
alter table public.pesan_asisten enable row level security;

-- Lapis kedua: cabut hak akses peran publik Supabase.
revoke all on public.pengguna, public.kelas, public.jawaban, public.pesan_asisten, public.v_peringkat
  from anon, authenticated;

-- Akun demo untuk uji coba (kata sandi diketahui umum: guru12345 / siswa12345).
-- Untuk sekolah sungguhan, buat akun guru sendiri dan hapus akun demo ini.
insert into public.pengguna (username, nama_panggilan, password_hash, peran)
  values ('guru_demo', 'Bu Guru', 'pbkdf2_sha256$310000$LHthk7/ZI4YikpJb+J69xA==$WltEWxoVtJXXrHRn5/Ery9uGCVsSz/35YAqklKeW7UM=', 'guru');
insert into public.kelas (nama, kode, guru_id)
  select 'VII A (demo)', 'DEMO77', id from public.pengguna where username = 'guru_demo';
insert into public.pengguna (username, nama_panggilan, password_hash, peran, kelas_id)
  select 'siswa_demo', 'Siswa Demo', 'pbkdf2_sha256$310000$lHBEfxLDaDKqPktbE9pc4Q==$m38EZw0C2TK7n0Nvo0FDps4qHZENE4LNYKVswr7gqLI=', 'siswa', id from public.kelas where kode = 'DEMO77';
