alter table public.comercios
add column if not exists destacado boolean default false;

alter table public.comercios
add column if not exists owner_email text;

alter table public.comercios
add column if not exists web_url text;

alter table public.comercios
add column if not exists instagram_url text;

alter table public.comercios
add column if not exists facebook_url text;

alter table public.comercios
add column if not exists premium_detalle text;

alter table public.comercios
add column if not exists premium_galeria text[];

alter table public.comercios
add column if not exists premium_activo boolean default false;

alter table public.servicios
add column if not exists destacado boolean default false;

alter table public.servicios
add column if not exists owner_email text;

alter table public.servicios
add column if not exists web_url text;

alter table public.servicios
add column if not exists instagram_url text;

alter table public.servicios
add column if not exists facebook_url text;

alter table public.servicios
add column if not exists premium_detalle text;

alter table public.servicios
add column if not exists premium_galeria text[];

alter table public.servicios
add column if not exists premium_activo boolean default false;

alter table public.cursos
add column if not exists destacado boolean default false;

alter table public.cursos
add column if not exists owner_email text;

alter table public.cursos
add column if not exists web_url text;

alter table public.cursos
add column if not exists instagram_url text;

alter table public.cursos
add column if not exists facebook_url text;

alter table public.eventos
add column if not exists fecha_fin date;

alter table public.eventos
add column if not exists telefono text;

alter table public.eventos
add column if not exists usa_whatsapp boolean default true;

alter table public.eventos
add column if not exists owner_email text;

alter table public.eventos
add column if not exists web_url text;

alter table public.eventos
add column if not exists instagram_url text;

alter table public.eventos
add column if not exists facebook_url text;

alter table public.instituciones
add column if not exists usa_whatsapp boolean default true;

alter table public.instituciones
add column if not exists estado text default 'activo';

alter table public.instituciones
add column if not exists owner_email text;

alter table public.instituciones
add column if not exists web_url text;

alter table public.instituciones
add column if not exists instagram_url text;

alter table public.instituciones
add column if not exists facebook_url text;

create table if not exists public.cursos (
  id bigint generated always as identity primary key,
  nombre text not null,
  descripcion text not null,
  responsable text not null,
  contacto text not null,
  web_url text,
  instagram_url text,
  facebook_url text,
  imagen text,
  estado text default 'activo',
  created_at timestamp with time zone default now()
);

create table if not exists public.servicios (
  id bigint generated always as identity primary key,
  nombre text not null,
  categoria text not null,
  descripcion text,
  premium_detalle text,
  premium_galeria text[],
  premium_activo boolean default false,
  responsable text,
  contacto text,
  direccion text,
  web_url text,
  instagram_url text,
  facebook_url text,
  imagen text,
  estado text default 'activo',
  created_at timestamp with time zone default now()
);

create table if not exists public.sitio (
  id integer primary key,
  titulo text not null default 'Jose Pedro Varela',
  texto_1 text not null default '',
  texto_2 text not null default '',
  texto_3 text not null default '',
  imagen_url text,
  updated_at timestamp with time zone default now()
);

create table if not exists public.administradores (
  id bigint generated always as identity primary key,
  nombre text not null,
  usuario text not null unique,
  contrasena text not null,
  rol text not null default 'admin',
  activo boolean not null default true,
  created_at timestamp with time zone default now()
);

create table if not exists public.admin_actividad (
  id bigint generated always as identity primary key,
  admin_username text not null,
  admin_nombre text not null,
  admin_rol text not null,
  accion text not null,
  seccion text not null,
  objetivo text,
  detalle text,
  created_at timestamp with time zone default now()
);

create table if not exists public.share_events (
  id bigint generated always as identity primary key,
  section text not null,
  item_id text not null,
  item_title text,
  created_at timestamp with time zone default now()
);

alter table public.share_events enable row level security;

create policy if not exists "Allow public insert on share_events"
on public.share_events
for insert
to anon, authenticated
with check (true);

create policy if not exists "Allow public read on share_events"
on public.share_events
for select
to anon, authenticated
using (true);

create table if not exists public.whatsapp_clicks (
  id bigint generated always as identity primary key,
  section text not null,
  item_id text not null,
  item_title text,
  created_at timestamp with time zone default now()
);

create table if not exists public.view_more_clicks (
  id bigint generated always as identity primary key,
  section text not null,
  item_id text not null,
  item_title text,
  created_at timestamp with time zone default now()
);

alter table public.view_more_clicks enable row level security;

drop policy if exists "Allow public insert on view_more_clicks"
on public.view_more_clicks;

create policy "Allow public insert on view_more_clicks"
on public.view_more_clicks
for insert
to anon, authenticated
with check (true);

drop policy if exists "Allow public read on view_more_clicks"
on public.view_more_clicks;

create policy "Allow public read on view_more_clicks"
on public.view_more_clicks
for select
to anon, authenticated
using (true);

create table if not exists public.contacto_solicitudes (
  id bigint generated always as identity primary key,
  nombre text not null,
  email text,
  telefono text not null,
  mensaje text not null,
  created_at timestamp with time zone default now()
);

alter table public.contacto_solicitudes
alter column email drop not null;

alter table public.contacto_solicitudes
add column if not exists visto boolean default false;

create table if not exists public.usuarios_registrados (
  id bigint generated always as identity primary key,
  user_id uuid unique,
  email text not null unique,
  created_at timestamp with time zone default now()
);

alter table public.usuarios_registrados enable row level security;

create policy if not exists "Users can insert their own registered profile"
on public.usuarios_registrados
for insert
to authenticated
with check (auth.uid() = user_id);

create policy if not exists "Users can view their own registered profile"
on public.usuarios_registrados
for select
to authenticated
using (auth.uid() = user_id);

create policy if not exists "Admins can read registered users"
on public.usuarios_registrados
for select
to anon, authenticated
using (true);

create table if not exists public.event_likes (
  id bigint generated always as identity primary key,
  event_id text not null,
  browser_key text not null,
  event_title text,
  created_at timestamp with time zone default now(),
  constraint event_likes_event_browser_unique unique (event_id, browser_key)
);

alter table public.event_likes enable row level security;

create policy if not exists "Allow public insert on event_likes"
on public.event_likes
for insert
to anon, authenticated
with check (true);

create policy if not exists "Allow public read on event_likes"
on public.event_likes
for select
to anon, authenticated
using (true);
