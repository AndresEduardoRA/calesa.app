-- 4.23-1: las tablas de referencia tienen versión y se escriben sólo publicando (D5). Hasta aquí `authenticated` las escribía por PostgREST con
-- `cotizaciones.configurar` (seis policies): un `update` directo cambiaba los precios de toda fórmula que leía la viva, sin versión ni N+1. Desde
-- aquí la única escritura es `tabla_referencia_publicar()` (la migración siguiente), que reemplaza las filas, sube la versión y publica la N+1 de
-- cada fórmula que la usa. Leer sigue igual. `service_role` y el rol de la base no cambian (semillas, e2e por psql). docs/COTIZADOR.md › «Las
-- tablas congeladas (D5)».

alter table public.tablas_referencia
  add column version integer not null default 1 constraint tablas_referencia_version_check check (version >= 1),
  add column nota text,
  add column publicado_por uuid references public.perfiles (id) on delete set null,
  add column publicado_en timestamptz;

create index tablas_referencia_publicado_por_idx on public.tablas_referencia (publicado_por);

comment on column public.tablas_referencia.version is
  'La versión de la tabla: 1 al crearla; tabla_referencia_publicar() la sube en uno. Es la esperada al publicar (PT409 si otra persona publicó antes).';
comment on column public.tablas_referencia.nota is 'La nota de la última publicación (nula en la versión 1).';
comment on column public.tablas_referencia.publicado_por is 'Quién publicó la versión vigente (nulo en la versión 1 o si la cuenta se borró).';
comment on column public.tablas_referencia.publicado_en is 'Cuándo se publicó la versión vigente (nulo en la versión 1).';
comment on table public.tablas_referencia is
  'Tablas que alimentan los nodos tabla y tramo y el cálculo depreciar de la fórmula (impuestos por tipo, tramos por año y cilindrada, tarifas de transporte por ruta, depreciación por año). Las lee quien tiene cotizaciones.configurar; se escriben sólo con tabla_referencia_publicar() (4.23-1), que publica la N+1 de cada fórmula que la usa con la copia congelada.';

drop policy "tablas_referencia: borrar" on public.tablas_referencia;
drop policy "tablas_referencia: crear" on public.tablas_referencia;
drop policy "tablas_referencia: editar" on public.tablas_referencia;
drop policy "tablas_referencia_filas: borrar" on public.tablas_referencia_filas;
drop policy "tablas_referencia_filas: crear" on public.tablas_referencia_filas;
drop policy "tablas_referencia_filas: editar" on public.tablas_referencia_filas;

revoke insert, update, delete on table public.tablas_referencia from authenticated;
revoke insert, update, delete on table public.tablas_referencia_filas from authenticated;
