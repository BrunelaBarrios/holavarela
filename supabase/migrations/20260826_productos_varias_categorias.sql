alter table public.productos_varela
add column if not exists categorias text[] not null default '{}';

update public.productos_varela
set categorias = array[categoria]
where cardinality(categorias) = 0;
