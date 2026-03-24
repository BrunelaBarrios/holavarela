alter table public.comercios
add column if not exists destacado boolean default false;

alter table public.servicios
add column if not exists destacado boolean default false;

alter table public.cursos
add column if not exists destacado boolean default false;

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
  radio_titulo text not null default 'Delta FM 88.3',
  radio_descripcion text not null default 'Escucha Delta FM 88.3 en vivo desde Jose Pedro Varela.',
  radio_stream_url text,
  radio_is_live boolean not null default false,
  updated_at timestamp with time zone default now()
);

alter table public.sitio
add column if not exists radio_titulo text not null default 'Delta FM 88.3';

alter table public.sitio
add column if not exists radio_descripcion text not null default 'Escucha Delta FM 88.3 en vivo desde Jose Pedro Varela.';

alter table public.sitio
add column if not exists radio_stream_url text;

alter table public.sitio
add column if not exists radio_is_live boolean not null default false;

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
