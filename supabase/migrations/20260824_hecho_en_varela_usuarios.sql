create table if not exists public.usuarios_hecho_varela (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username = lower(username)),
  nombre text not null,
  password_hash text not null,
  password_salt text not null,
  role text not null default 'admin' check (role in ('superadmin', 'admin')),
  emprendimiento_id uuid references public.emprendimientos_varela(id) on delete cascade,
  activo boolean not null default true,
  creado_at timestamptz not null default now(),
  actualizado_at timestamptz not null default now(),
  ultimo_acceso timestamptz,
  constraint usuario_admin_emprendimiento check (role = 'superadmin' or emprendimiento_id is not null)
);

alter table public.usuarios_hecho_varela enable row level security;
revoke all on public.usuarios_hecho_varela from anon, authenticated;
