alter table public.comercios
add column if not exists destacado boolean default false;

alter table public.servicios
add column if not exists destacado boolean default false;

alter table public.cursos
add column if not exists destacado boolean default false;

alter table public.eventos
add column if not exists fecha_fin date;

create table if not exists public.cursos (
  id bigint generated always as identity primary key,
  nombre text not null,
  descripcion text not null,
  responsable text not null,
  contacto text not null,
  imagen text,
  estado text default 'activo',
  created_at timestamp with time zone default now()
);

create table if not exists public.servicios (
  id bigint generated always as identity primary key,
  nombre text not null,
  categoria text not null,
  descripcion text,
  responsable text,
  contacto text,
  direccion text,
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

create table if not exists public.contacto_solicitudes (
  id bigint generated always as identity primary key,
  nombre text not null,
  email text not null,
  telefono text not null,
  mensaje text not null,
  created_at timestamp with time zone default now()
);
