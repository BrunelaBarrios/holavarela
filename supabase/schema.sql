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

alter table public.comercios
add column if not exists plan_suscripcion text;

alter table public.comercios
add column if not exists estado_suscripcion text default 'pendiente';

alter table public.comercios
add column if not exists suscripcion_actualizada_at timestamp with time zone;

alter table public.comercios
add column if not exists mp_preapproval_id text;

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

alter table public.servicios
add column if not exists plan_suscripcion text;

alter table public.servicios
add column if not exists estado_suscripcion text default 'pendiente';

alter table public.servicios
add column if not exists suscripcion_actualizada_at timestamp with time zone;

alter table public.servicios
add column if not exists mp_preapproval_id text;

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

alter table public.cursos
add column if not exists plan_suscripcion text;

alter table public.cursos
add column if not exists estado_suscripcion text default 'pendiente';

alter table public.eventos
add column if not exists fecha_fin date;

alter table public.cursos
add column if not exists suscripcion_actualizada_at timestamp with time zone;

alter table public.cursos
add column if not exists mp_preapproval_id text;

alter table public.cursos
add column if not exists institucion_id bigint;

alter table public.cursos
add column if not exists servicio_id bigint;

alter table public.eventos
add column if not exists fecha_solo_mes boolean default false;

alter table public.eventos
add column if not exists telefono text;

alter table public.eventos
add column if not exists usa_whatsapp boolean default true;

alter table public.eventos
add column if not exists owner_email text;

alter table public.eventos
add column if not exists institucion_id bigint;

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

alter table public.instituciones
add column if not exists premium_detalle text;

alter table public.instituciones
add column if not exists premium_galeria text[];

alter table public.instituciones
add column if not exists premium_extra_titulo text;

alter table public.instituciones
add column if not exists premium_extra_detalle text;

alter table public.instituciones
add column if not exists premium_extra_galeria text[];

alter table public.instituciones
add column if not exists premium_activo boolean default false;

alter table public.instituciones
add column if not exists premium_cursos_activo boolean default false;

alter table public.instituciones
add column if not exists premium_cursos_titulo text;

alter table public.sitio
add column if not exists plan_presencia_titulo text;

alter table public.sitio
add column if not exists plan_presencia_tagline text;

alter table public.sitio
add column if not exists plan_presencia_descripcion text;

alter table public.sitio
add column if not exists plan_presencia_precio text;

alter table public.sitio
add column if not exists plan_presencia_features text;

alter table public.sitio
add column if not exists plan_destacado_titulo text;

alter table public.sitio
add column if not exists plan_destacado_tagline text;

alter table public.sitio
add column if not exists plan_destacado_descripcion text;

alter table public.sitio
add column if not exists plan_destacado_precio text;

alter table public.sitio
add column if not exists plan_destacado_features text;

alter table public.sitio
add column if not exists plan_destacado_plus_titulo text;

alter table public.sitio
add column if not exists plan_destacado_plus_tagline text;

alter table public.sitio
add column if not exists plan_destacado_plus_descripcion text;

alter table public.sitio
add column if not exists plan_destacado_plus_precio text;

alter table public.sitio
add column if not exists plan_destacado_plus_features text;

create table if not exists public.cursos (
  id bigint generated always as identity primary key,
  nombre text not null,
  descripcion text not null,
  responsable text not null,
  contacto text not null,
  institucion_id bigint,
  plan_suscripcion text,
  estado_suscripcion text default 'pendiente',
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
  plan_suscripcion text,
  estado_suscripcion text default 'pendiente',
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
  plan_presencia_titulo text,
  plan_presencia_tagline text,
  plan_presencia_descripcion text,
  plan_presencia_precio text,
  plan_presencia_features text,
  plan_destacado_titulo text,
  plan_destacado_tagline text,
  plan_destacado_descripcion text,
  plan_destacado_precio text,
  plan_destacado_features text,
  plan_destacado_plus_titulo text,
  plan_destacado_plus_tagline text,
  plan_destacado_plus_descripcion text,
  plan_destacado_plus_precio text,
  plan_destacado_plus_features text,
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

create table if not exists public.password_reset_requests (
  id bigint generated always as identity primary key,
  user_id uuid,
  email text not null,
  contact_name text,
  phone text,
  message text,
  status text not null default 'pending',
  resolved_at timestamp with time zone,
  resolved_by text,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone default now()
);

alter table public.usuarios_registrados enable row level security;

alter table public.password_reset_requests enable row level security;

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

create policy if not exists "Admins can read password reset requests"
on public.password_reset_requests
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

create table if not exists public.content_visits (
  id bigint generated always as identity primary key,
  section text not null,
  item_id text not null,
  item_title text,
  browser_key text not null,
  created_at timestamp with time zone default now()
);

alter table public.content_visits enable row level security;

drop policy if exists "Allow public insert on content_visits"
on public.content_visits;

create policy "Allow public insert on content_visits"
on public.content_visits
for insert
to anon, authenticated
with check (true);

drop policy if exists "Allow public read on content_visits"
on public.content_visits;

create policy "Allow public read on content_visits"
on public.content_visits
for select
to anon, authenticated
using (true);

create table if not exists public.sorteo_popup_config (
  id bigint generated by default as identity primary key,
  titulo text not null default '',
  activo boolean not null default false,
  descripcion text not null default '',
  participante_tipo_1 text,
  participante_id_1 bigint,
  participante_tipo_2 text,
  participante_id_2 bigint,
  comercio_id_1 bigint references public.comercios(id) on delete set null,
  comercio_id_2 bigint references public.comercios(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.sorteo_participaciones (
  id bigint generated always as identity primary key,
  sorteo_id bigint references public.sorteo_popup_config(id) on delete cascade,
  browser_key text not null,
  nombre text not null,
  telefono text not null,
  total_likes integer not null default 0,
  created_at timestamp with time zone default now()
);

alter table public.sorteo_popup_config
add column if not exists titulo text not null default '';

alter table public.sorteo_popup_config
add column if not exists created_at timestamp with time zone default now();

alter table public.sorteo_popup_config
add column if not exists participante_tipo_1 text;

alter table public.sorteo_popup_config
add column if not exists participante_id_1 bigint;

alter table public.sorteo_popup_config
add column if not exists participante_tipo_2 text;

alter table public.sorteo_popup_config
add column if not exists participante_id_2 bigint;

alter table public.sorteo_participaciones
add column if not exists sorteo_id bigint references public.sorteo_popup_config(id) on delete cascade;

drop index if exists public.sorteo_participaciones_browser_key_key;

drop index if exists sorteo_participaciones_browser_key_key;

create unique index if not exists sorteo_participaciones_sorteo_browser_key_key
on public.sorteo_participaciones (sorteo_id, browser_key);

alter table public.sorteo_popup_config enable row level security;
alter table public.sorteo_participaciones enable row level security;

drop policy if exists "Allow public read on sorteo_popup_config"
on public.sorteo_popup_config;

create policy "Allow public read on sorteo_popup_config"
on public.sorteo_popup_config
for select
to anon, authenticated
using (true);

drop policy if exists "Allow public insert on sorteo_popup_config"
on public.sorteo_popup_config;

create policy "Allow public insert on sorteo_popup_config"
on public.sorteo_popup_config
for insert
to anon, authenticated
with check (true);

drop policy if exists "Allow public update on sorteo_popup_config"
on public.sorteo_popup_config;

create policy "Allow public update on sorteo_popup_config"
on public.sorteo_popup_config
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Allow public read on sorteo_participaciones"
on public.sorteo_participaciones;

create policy "Allow public read on sorteo_participaciones"
on public.sorteo_participaciones
for select
to anon, authenticated
using (true);

drop policy if exists "Allow public insert on sorteo_participaciones"
on public.sorteo_participaciones;

create policy "Allow public insert on sorteo_participaciones"
on public.sorteo_participaciones
for insert
to anon, authenticated
with check (true);

create table if not exists public.desafio_participaciones (
  id bigint generated always as identity primary key,
  browser_key text not null,
  nombre text not null,
  telefono text not null,
  puntaje_total integer not null default 0,
  puntos_sopa integer not null default 0,
  puntos_memoria integer not null default 0,
  puntos_pelicula integer not null default 0,
  sopa_nombre text,
  memoria_nombre text,
  pelicula_nombre text,
  created_at timestamp with time zone default now()
);

create table if not exists public.desafio_sorteos (
  id bigint generated always as identity primary key,
  cantidad_ganadores integer not null default 1,
  created_at timestamp with time zone default now()
);

create table if not exists public.desafio_sorteo_ganadores (
  id bigint generated always as identity primary key,
  sorteo_id bigint not null references public.desafio_sorteos(id) on delete cascade,
  participacion_id bigint not null references public.desafio_participaciones(id) on delete cascade,
  entregado boolean not null default false,
  entregado_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

alter table public.desafio_sorteo_ganadores
  add column if not exists entregado boolean not null default false;

alter table public.desafio_sorteo_ganadores
  add column if not exists entregado_at timestamp with time zone;

alter table public.desafio_participaciones enable row level security;
alter table public.desafio_sorteos enable row level security;
alter table public.desafio_sorteo_ganadores enable row level security;

drop policy if exists "Allow public read on desafio_participaciones"
on public.desafio_participaciones;

create policy "Allow public read on desafio_participaciones"
on public.desafio_participaciones
for select
to anon, authenticated
using (true);

drop policy if exists "Allow public insert on desafio_participaciones"
on public.desafio_participaciones;

create policy "Allow public insert on desafio_participaciones"
on public.desafio_participaciones
for insert
to anon, authenticated
with check (true);

drop policy if exists "Allow public read on desafio_sorteos"
on public.desafio_sorteos;

create policy "Allow public read on desafio_sorteos"
on public.desafio_sorteos
for select
to anon, authenticated
using (true);

drop policy if exists "Allow public insert on desafio_sorteos"
on public.desafio_sorteos;

create policy "Allow public insert on desafio_sorteos"
on public.desafio_sorteos
for insert
to anon, authenticated
with check (true);

drop policy if exists "Allow public read on desafio_sorteo_ganadores"
on public.desafio_sorteo_ganadores;

create policy "Allow public read on desafio_sorteo_ganadores"
on public.desafio_sorteo_ganadores
for select
to anon, authenticated
using (true);

drop policy if exists "Allow public insert on desafio_sorteo_ganadores"
on public.desafio_sorteo_ganadores;

create policy "Allow public insert on desafio_sorteo_ganadores"
on public.desafio_sorteo_ganadores
for insert
to anon, authenticated
with check (true);

drop policy if exists "Allow public update on desafio_sorteo_ganadores"
on public.desafio_sorteo_ganadores;

create policy "Allow public update on desafio_sorteo_ganadores"
on public.desafio_sorteo_ganadores
for update
to anon, authenticated
using (true)
with check (true);
