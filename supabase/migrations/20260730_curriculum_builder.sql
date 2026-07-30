create table if not exists public.curriculums_generados (
  id uuid primary key default gen_random_uuid(),
  codigo uuid not null unique default gen_random_uuid(),
  nombre text not null,
  email text not null,
  telefono text not null,
  datos jsonb not null default '{}'::jsonb,
  modelo text not null default 'modern' check (modelo in ('classic', 'modern', 'simple')),
  estado_pago text not null default 'draft' check (estado_pago in ('draft', 'pending', 'approved', 'rejected')),
  codigo_promocional text,
  descuento_porcentaje integer not null default 0,
  monto_pago integer not null default 200,
  mp_preference_id text,
  mp_payment_id text,
  numero_operacion text,
  comprobante text,
  pago_enviado_at timestamptz,
  aprobado_at timestamptz,
  editable_hasta timestamptz not null default (now() + interval '30 days'),
  creado_at timestamptz not null default now(),
  actualizado_at timestamptz not null default now()
);

create index if not exists curriculums_generados_busqueda_idx
on public.curriculums_generados (creado_at desc, estado_pago);

alter table public.curriculums_generados enable row level security;

alter table public.curriculums_generados add column if not exists codigo_promocional text;
alter table public.curriculums_generados add column if not exists descuento_porcentaje integer not null default 0;
alter table public.curriculums_generados add column if not exists monto_pago integer not null default 200;
alter table public.curriculums_generados add column if not exists mp_preference_id text;
alter table public.curriculums_generados add column if not exists mp_payment_id text;
