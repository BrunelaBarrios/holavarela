create table if not exists public.emprendimientos_varela (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique,
  descripcion text,
  whatsapp text not null,
  instagram_url text,
  redes_url text,
  modalidad_entrega text,
  logo_url text,
  activo boolean not null default true,
  orden integer not null default 0,
  creado_at timestamptz not null default now(),
  actualizado_at timestamptz not null default now()
);

create table if not exists public.productos_varela (
  id uuid primary key default gen_random_uuid(),
  emprendimiento_id uuid not null references public.emprendimientos_varela(id) on delete cascade,
  nombre text not null,
  slug text not null unique,
  descripcion_breve text,
  descripcion text,
  categoria text not null check (categoria in ('Artesanías','Decoración','Regalos','Tejidos y textiles','Accesorios','Alimentos artesanales','Cuidado personal','Otros')),
  precio numeric(12,2),
  consultar_precio boolean not null default false,
  imagenes text[] not null default '{}',
  variantes text[] not null default '{}',
  informacion_entrega text,
  activo boolean not null default true,
  destacado boolean not null default false,
  orden integer not null default 0,
  creado_at timestamptz not null default now(),
  actualizado_at timestamptz not null default now()
);

create index if not exists productos_varela_publicos_idx on public.productos_varela (activo, destacado desc, orden, creado_at desc);
create index if not exists productos_varela_emprendimiento_idx on public.productos_varela (emprendimiento_id, activo, orden);

alter table public.emprendimientos_varela enable row level security;
alter table public.productos_varela enable row level security;
drop policy if exists "Public read active Varela ventures" on public.emprendimientos_varela;
create policy "Public read active Varela ventures" on public.emprendimientos_varela for select to anon, authenticated using (activo = true);
drop policy if exists "Public read active Varela products" on public.productos_varela;
create policy "Public read active Varela products" on public.productos_varela for select to anon, authenticated using (activo = true);
