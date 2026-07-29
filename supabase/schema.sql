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
add column if not exists premium_extra_titulo text;

alter table public.servicios
add column if not exists premium_extra_detalle text;

alter table public.servicios
add column if not exists premium_extra_galeria text[];

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
add column if not exists premium_galeria text[];

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

alter table public.cursos
add column if not exists edad_destino text default 'todas_las_edades';

alter table public.cursos
add column if not exists categoria text;

alter table public.cursos
add column if not exists lugar text;

alter table public.cursos
add column if not exists dias_semana text[] default '{}';

alter table public.cursos
add column if not exists hora_inicio time;

alter table public.cursos
add column if not exists hora_fin time;

alter table public.cursos
add column if not exists horarios jsonb default '[]'::jsonb;

alter table public.cursos
add column if not exists costo_tipo text default 'gratis';

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
add column if not exists servicio_id bigint;

alter table public.eventos
add column if not exists comercio_id bigint;

alter table public.eventos
add column if not exists web_url text;

alter table public.eventos
add column if not exists instagram_url text;

alter table public.eventos
add column if not exists facebook_url text;

alter table public.eventos
add column if not exists ciudad text;

alter table public.eventos
add column if not exists mostrar_ciudades_cercanas boolean not null default false;

alter table public.instituciones
add column if not exists usa_whatsapp boolean default true;

alter table public.instituciones
add column if not exists destacado boolean default false;

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

alter table public.instituciones
add column if not exists plan_suscripcion text;

alter table public.instituciones
add column if not exists estado_suscripcion text default 'pendiente';

alter table public.instituciones
add column if not exists suscripcion_actualizada_at timestamp with time zone;

alter table public.instituciones
add column if not exists mp_preapproval_id text;

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

alter table public.sitio
add column if not exists mostrar_juegos_home boolean not null default true;

alter table public.sitio
add column if not exists mostrar_ranking_juego_home boolean not null default false;

alter table public.sitio
add column if not exists mostrar_oportunidades_laborales_home boolean not null default true;

alter table public.sitio
add column if not exists mostrar_galeria_home boolean not null default false;

alter table public.sitio
add column if not exists galeria_home text[] not null default '{}';

alter table public.sitio
add column if not exists cursos_home_tagline text;

alter table public.sitio
add column if not exists cursos_home_titulo text;

alter table public.sitio
add column if not exists cursos_home_texto text;

alter table public.sitio
add column if not exists cursos_home_boton text;

alter table public.sitio
add column if not exists cursos_home_imagen_url text;

alter table public.sitio
add column if not exists instituciones_home_tagline text;

alter table public.sitio
add column if not exists instituciones_home_titulo text;

alter table public.sitio
add column if not exists instituciones_home_texto text;

alter table public.sitio
add column if not exists instituciones_home_boton text;

alter table public.sitio
add column if not exists instituciones_home_imagen_url text;

alter table public.sitio
add column if not exists burbuja_home_activa boolean not null default false;

alter table public.sitio
add column if not exists burbuja_home_titulo text;

alter table public.sitio
add column if not exists burbuja_home_texto text;

alter table public.sitio
add column if not exists burbuja_home_visible_desde timestamp with time zone;

alter table public.sitio
add column if not exists burbuja_home_visible_hasta timestamp with time zone;

create table if not exists public.destacados_home (
  id bigint generated always as identity primary key,
  imagen_url text not null,
  entidad_tipo text not null check (entidad_tipo in ('comercio', 'servicio', 'institucion')),
  entidad_id bigint not null,
  activo boolean not null default false,
  delay_seconds integer not null default 12,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.cursos (
  id bigint generated always as identity primary key,
  nombre text not null,
  descripcion text not null,
  responsable text not null,
  contacto text not null,
  edad_destino text default 'todas_las_edades',
  categoria text,
  lugar text,
  dias_semana text[] default '{}',
  hora_inicio time,
  hora_fin time,
  horarios jsonb default '[]'::jsonb,
  costo_tipo text default 'gratis',
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
  premium_extra_titulo text,
  premium_extra_detalle text,
  premium_extra_galeria text[],
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
  mostrar_juegos_home boolean not null default true,
  mostrar_ranking_juego_home boolean not null default false,
  mostrar_galeria_home boolean not null default false,
  galeria_home text[] not null default '{}',
  cursos_home_tagline text,
  cursos_home_titulo text,
  cursos_home_texto text,
  cursos_home_boton text,
  cursos_home_imagen_url text,
  instituciones_home_tagline text,
  instituciones_home_titulo text,
  instituciones_home_texto text,
  instituciones_home_boton text,
  instituciones_home_imagen_url text,
  burbuja_home_activa boolean not null default false,
  burbuja_home_titulo text,
  burbuja_home_texto text,
  burbuja_home_visible_desde timestamp with time zone,
  burbuja_home_visible_hasta timestamp with time zone,
  updated_at timestamp with time zone default now()
);

create table if not exists public.destacados_home (
  id bigint generated always as identity primary key,
  imagen_url text not null,
  entidad_tipo text not null check (entidad_tipo in ('comercio', 'servicio', 'institucion')),
  entidad_id bigint not null,
  activo boolean not null default false,
  delay_seconds integer not null default 12,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.destacados_home
add column if not exists imagen_url text;

alter table public.destacados_home
add column if not exists entidad_tipo text;

alter table public.destacados_home
add column if not exists entidad_id bigint;

alter table public.destacados_home
add column if not exists activo boolean not null default false;

alter table public.destacados_home
add column if not exists delay_seconds integer not null default 12;

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

alter table public.destacados_home enable row level security;

drop policy if exists "Allow public read on destacados_home"
on public.destacados_home;

create policy "Allow public read on destacados_home"
on public.destacados_home
for select
to anon, authenticated
using (true);

create table if not exists public.sorteo_popup_config (
  id bigint generated by default as identity primary key,
  titulo text not null default '',
  activo boolean not null default false,
  mostrar_popup_home boolean not null default true,
  titulo_popup_home text,
  descripcion text not null default '',
  descripcion_popup_home text,
  boton_texto text not null default 'Participar',
  visible_desde timestamp with time zone,
  visible_hasta timestamp with time zone,
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
add column if not exists mostrar_popup_home boolean not null default true;

alter table public.sorteo_popup_config
add column if not exists titulo_popup_home text;

alter table public.sorteo_popup_config
add column if not exists descripcion_popup_home text;

alter table public.sorteo_popup_config
add column if not exists boton_texto text not null default 'Participar';

alter table public.sorteo_popup_config
add column if not exists visible_desde timestamp with time zone;

alter table public.sorteo_popup_config
add column if not exists visible_hasta timestamp with time zone;

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

alter table public.sorteo_participaciones
add column if not exists origen text not null default 'corazones';

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
  puntos_puzzle integer not null default 0,
  puntos_laberinto integer not null default 0,
  sopa_nombre text,
  memoria_nombre text,
  pelicula_nombre text,
  puzzle_nombre text,
  laberinto_nombre text,
  created_at timestamp with time zone default now()
);

create table if not exists public.desafio_config (
  id bigint primary key default 1 check (id = 1),
  activo boolean not null default true,
  juegos_activos text[] not null default array['sopa', 'memoria', 'pelicula', 'puzzle', 'laberinto'],
  sopa_palabras text[] not null default array[]::text[],
  memoria_modo text not null default 'palabras',
  memoria_logos text[] not null default array[]::text[],
  puzzle_imagenes text[] not null default array[]::text[],
  slug text,
  titulo text,
  updated_at timestamp with time zone default now()
);

alter table public.desafio_config
  add column if not exists slug text;

alter table public.desafio_config
  add column if not exists titulo text;

alter table public.desafio_config
  add column if not exists sopa_palabras text[] not null default array[]::text[];

alter table public.desafio_config
  add column if not exists memoria_modo text not null default 'palabras';

alter table public.desafio_config
  add column if not exists memoria_logos text[] not null default array[]::text[];

alter table public.desafio_config
  add column if not exists puzzle_imagenes text[] not null default array[]::text[];

insert into public.desafio_config (id, activo, juegos_activos, slug, titulo)
values (
  1,
  true,
  array['sopa', 'memoria', 'pelicula', 'puzzle', 'laberinto'],
  'desafio-inicial',
  'Desafio inicial'
)
on conflict (id) do nothing;

update public.desafio_config
set
  slug = coalesce(slug, 'desafio-' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 8)),
  titulo = coalesce(titulo, 'Desafio inicial')
where id = 1;

create unique index if not exists desafio_config_slug_key
on public.desafio_config (slug)
where slug is not null;

create table if not exists public.desafio_ediciones (
  slug text primary key,
  titulo text not null,
  activo boolean not null default true,
  juegos_activos text[] not null default array['sopa', 'memoria', 'pelicula', 'puzzle', 'laberinto'],
  sopa_palabras text[] not null default array[]::text[],
  memoria_modo text not null default 'palabras',
  memoria_logos text[] not null default array[]::text[],
  puzzle_imagenes text[] not null default array[]::text[],
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.desafio_ediciones
  add column if not exists sopa_palabras text[] not null default array[]::text[];

alter table public.desafio_ediciones
  add column if not exists memoria_modo text not null default 'palabras';

alter table public.desafio_ediciones
  add column if not exists memoria_logos text[] not null default array[]::text[];

alter table public.desafio_ediciones
  add column if not exists puzzle_imagenes text[] not null default array[]::text[];

insert into public.desafio_ediciones (slug, titulo, activo, juegos_activos, sopa_palabras, memoria_modo, memoria_logos, puzzle_imagenes, created_at, updated_at)
select
  slug,
  coalesce(titulo, slug),
  activo,
  juegos_activos,
  coalesce(sopa_palabras, array[]::text[]),
  coalesce(memoria_modo, 'palabras'),
  coalesce(memoria_logos, array[]::text[]),
  coalesce(puzzle_imagenes, array[]::text[]),
  coalesce(updated_at, now()),
  coalesce(updated_at, now())
from public.desafio_config
where slug is not null
on conflict (slug) do update
set
  titulo = excluded.titulo,
  activo = excluded.activo,
  juegos_activos = excluded.juegos_activos,
  sopa_palabras = excluded.sopa_palabras,
  memoria_modo = excluded.memoria_modo,
  memoria_logos = excluded.memoria_logos,
  puzzle_imagenes = excluded.puzzle_imagenes,
  updated_at = excluded.updated_at;

alter table public.desafio_participaciones
  add column if not exists puntos_puzzle integer not null default 0;

alter table public.desafio_participaciones
  add column if not exists puzzle_nombre text;

alter table public.desafio_participaciones
  add column if not exists puntos_laberinto integer not null default 0;

alter table public.desafio_participaciones
  add column if not exists laberinto_nombre text;

alter table public.desafio_participaciones
  add column if not exists desafio_slug text;

update public.desafio_participaciones
set desafio_slug = (select slug from public.desafio_config where id = 1)
where desafio_slug is null;

update public.desafio_config
set juegos_activos = array(select distinct unnest(juegos_activos || array['puzzle']))
where id = 1 and not ('puzzle' = any(juegos_activos));

update public.desafio_config
set juegos_activos = array(select distinct unnest(juegos_activos || array['laberinto']))
where id = 1 and not ('laberinto' = any(juegos_activos));

create table if not exists public.desafio_sorteos (
  id bigint generated always as identity primary key,
  desafio_slug text,
  cantidad_ganadores integer not null default 1,
  created_at timestamp with time zone default now()
);

alter table public.desafio_sorteos
  add column if not exists desafio_slug text;

update public.desafio_sorteos
set desafio_slug = (select slug from public.desafio_config where id = 1)
where desafio_slug is null;

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
alter table public.desafio_config enable row level security;
alter table public.desafio_ediciones enable row level security;
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

drop policy if exists "Allow public read on desafio_config"
on public.desafio_config;

create policy "Allow public read on desafio_config"
on public.desafio_config
for select
to anon, authenticated
using (true);

drop policy if exists "Allow public read on desafio_ediciones"
on public.desafio_ediciones;

create policy "Allow public read on desafio_ediciones"
on public.desafio_ediciones
for select
to anon, authenticated
using (true);

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

create index if not exists comercios_public_active_id_desc_idx
on public.comercios (id desc)
where estado is null or estado = 'activo';

create index if not exists servicios_public_active_id_desc_idx
on public.servicios (id desc)
where estado is null or estado = 'activo';

create index if not exists cursos_public_active_id_desc_idx
on public.cursos (id desc)
where estado is null or estado = 'activo';

create index if not exists instituciones_public_active_id_desc_idx
on public.instituciones (id desc)
where estado is null or estado = 'activo';

create index if not exists eventos_public_active_fecha_idx
on public.eventos (fecha, fecha_fin)
where estado is null or estado = 'activo';

create index if not exists content_visits_section_created_at_idx
on public.content_visits (section, created_at desc);

create index if not exists content_visits_section_item_browser_idx
on public.content_visits (section, item_id, browser_key);

create index if not exists share_events_section_created_at_idx
on public.share_events (section, created_at desc);

create index if not exists whatsapp_clicks_section_created_at_idx
on public.whatsapp_clicks (section, created_at desc);

create index if not exists view_more_clicks_section_created_at_idx
on public.view_more_clicks (section, created_at desc);

create index if not exists event_likes_created_at_idx
on public.event_likes (created_at desc);

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

create table if not exists public.juego_gol_config (
  id bigint primary key default 1 check (id = 1),
  activo boolean not null default false,
  titulo text not null default 'Desafio del Gol',
  texto_banner text not null default 'Jugá al Desafío del Gol',
  mostrar_ranking_home boolean not null default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.juego_gol_config
add column if not exists activo boolean not null default false;

alter table public.juego_gol_config
add column if not exists titulo text not null default 'Desafio del Gol';

alter table public.juego_gol_config
add column if not exists texto_banner text not null default 'Jugá al Desafío del Gol';

alter table public.juego_gol_config
add column if not exists mostrar_ranking_home boolean not null default false;

alter table public.juego_gol_config
add column if not exists created_at timestamp with time zone default now();

alter table public.juego_gol_config
add column if not exists updated_at timestamp with time zone default now();

insert into public.juego_gol_config (id, activo, titulo, texto_banner, mostrar_ranking_home)
values (1, false, 'Desafio del Gol', 'Jugá al Desafío del Gol', false)
on conflict (id) do nothing;

create table if not exists public.juego_gol_participaciones (
  id bigint generated always as identity primary key,
  nombre text not null check (char_length(trim(nombre)) > 0 and char_length(nombre) <= 30),
  puntaje integer not null default 0 check (puntaje >= 0),
  created_at timestamp with time zone default now()
);

create index if not exists juego_gol_participaciones_ranking_idx
on public.juego_gol_participaciones (puntaje desc, created_at asc);

alter table public.juego_gol_config enable row level security;
alter table public.juego_gol_participaciones enable row level security;

drop policy if exists "Allow public read on juego_gol_config"
on public.juego_gol_config;

create policy "Allow public read on juego_gol_config"
on public.juego_gol_config
for select
to anon, authenticated
using (true);

drop policy if exists "Allow public read on juego_gol_participaciones"
on public.juego_gol_participaciones;

create policy "Allow public read on juego_gol_participaciones"
on public.juego_gol_participaciones
for select
to anon, authenticated
using (true);

drop policy if exists "Allow public insert on juego_gol_participaciones"
on public.juego_gol_participaciones;

create policy "Allow public insert on juego_gol_participaciones"
on public.juego_gol_participaciones
for insert
to anon, authenticated
with check (char_length(trim(nombre)) > 0 and char_length(nombre) <= 30 and puntaje >= 0);

-- Oportunidades laborales: las publicaciones públicas siempre ingresan a moderación.
create table if not exists public.oportunidades_laborales (
  id uuid primary key default gen_random_uuid(),
  tipo_publicacion text not null check (tipo_publicacion in ('oferta', 'busqueda')),
  nombre_publicante text not null,
  titulo text not null,
  categoria text not null,
  descripcion text not null,
  requisitos text,
  experiencia text,
  habilidades text,
  tipo_jornada text,
  horario text,
  disponibilidad text,
  localidad text not null default 'José Pedro Varela',
  telefono text,
  email text,
  forma_postulacion text,
  enlace_url text,
  imagen_url text,
  cv_url text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'activa', 'rechazada', 'vencida')),
  fecha_creacion timestamptz not null default now(),
  fecha_vencimiento date,
  user_id uuid references auth.users(id) on delete set null
);

alter table public.oportunidades_laborales
add column if not exists enlace_url text;

create index if not exists oportunidades_laborales_public_idx on public.oportunidades_laborales (estado, fecha_creacion desc);
create index if not exists oportunidades_laborales_filters_idx on public.oportunidades_laborales (tipo_publicacion, categoria, tipo_jornada, localidad);
alter table public.oportunidades_laborales enable row level security;
drop policy if exists "Public read active job opportunities" on public.oportunidades_laborales;
create policy "Public read active job opportunities" on public.oportunidades_laborales for select to anon, authenticated using (estado = 'activa');
drop policy if exists "Public submit job opportunities" on public.oportunidades_laborales;
create policy "Public submit job opportunities" on public.oportunidades_laborales for insert to anon, authenticated with check (estado = 'pendiente');

-- Mensajes breves de la comunidad, siempre sujetos a moderacion.
create table if not exists public.mensajes_comunidad (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  nombre text not null check (char_length(trim(nombre)) between 1 and 80),
  mensaje text not null check (char_length(trim(mensaje)) between 1 and 500),
  institucion_id bigint references public.instituciones(id) on delete set null,
  fecha_creacion timestamptz not null default now(),
  fecha_programada timestamptz,
  fecha_publicacion timestamptz,
  fecha_vencimiento timestamptz,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'programado', 'activo', 'vencido', 'rechazado', 'cancelado')),
  check (fecha_programada is null or fecha_programada >= fecha_creacion)
);

-- Actualiza el limite si la tabla ya existia con el maximo anterior.
alter table public.mensajes_comunidad
  drop constraint if exists mensajes_comunidad_mensaje_check;
alter table public.mensajes_comunidad
  add constraint mensajes_comunidad_mensaje_check
  check (char_length(trim(mensaje)) between 1 and 500);

create or replace function public.set_mensaje_comunidad_vencimiento()
returns trigger language plpgsql as $$
begin
  new.fecha_vencimiento := case
    when new.fecha_publicacion is null then null
    else new.fecha_publicacion + interval '24 hours'
  end;
  return new;
end;
$$;

drop trigger if exists mensajes_comunidad_set_vencimiento on public.mensajes_comunidad;
create trigger mensajes_comunidad_set_vencimiento
before insert or update of fecha_publicacion on public.mensajes_comunidad
for each row execute function public.set_mensaje_comunidad_vencimiento();

create index if not exists mensajes_comunidad_publicos_idx
on public.mensajes_comunidad (estado, fecha_publicacion desc, fecha_vencimiento);
create index if not exists mensajes_comunidad_moderacion_idx
on public.mensajes_comunidad (fecha_creacion desc);

alter table public.mensajes_comunidad enable row level security;
drop policy if exists "Public read active community messages" on public.mensajes_comunidad;
create policy "Public read active community messages"
on public.mensajes_comunidad for select to anon, authenticated
using (estado = 'activo' and fecha_publicacion <= now() and fecha_vencimiento > now());
