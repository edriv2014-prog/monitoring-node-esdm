-- ESDM PUSDATIN FULL
create extension if not exists pgcrypto;

-- TABLE USER untuk login
create table users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password text not null, -- untuk simple, pakai plain / nanti hash bcrypt
  role text check (role in ('super_admin','admin')) default 'admin',
  nama text,
  created_at timestamp default now()
);

-- seed user default
insert into users (username, password, role, nama) values 
('admin','admin','super_admin','Super Admin ESDM'),
('operator','admin','admin','Operator ESDM'),
('pusdatin','admin','admin','Admin Pusdatin')
on conflict (username) do nothing;

create table monitoring_node (
  id uuid primary key default gen_random_uuid(),
  tanggal date,
  node_pos text,
  link text,
  kendala text,
  durasi int,
  rfo text,
  created_at timestamp default now()
);

create table laphar (
  id uuid primary key default gen_random_uuid(),
  tanggal date,
  node_pos text,
  jumlah_hari_down int,
  rentang_berturut text,
  tanggal_detail text,
  created_at timestamp default now()
);

alter table users enable row level security;
alter table monitoring_node enable row level security;
alter table laphar enable row level security;

create policy "allow all" on users for all using(true) with check(true);
create policy "allow all" on monitoring_node for all using(true) with check(true);
create policy "allow all" on laphar for all using(true) with check(true);
