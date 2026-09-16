-- Los emprendimientos existentes se clasifican inicialmente como Varela.
-- Se puede ejecutar más de una vez sin borrar datos.
alter table public.emprendimientos_varela
  add column if not exists origen text not null default 'varela'
  constraint emprendimientos_varela_origen_check
  check (origen in ('varela', 'region'));

notify pgrst, 'reload schema';
