-- Separate application links from schedules, preserving existing posters.
alter table public.oportunidades_laborales
  add column if not exists enlace_url text;

update public.oportunidades_laborales
set enlace_url = coalesce(enlace_url, horario), horario = null
where horario ~* '^https?://';

-- Migrate the compatibility envelope used by deployments before this column.
update public.oportunidades_laborales
set enlace_url = coalesce(enlace_url, horario::jsonb ->> 'enlace_url'),
    horario = horario::jsonb ->> 'horario'
where horario like '{"job_contact_version":1,%';
