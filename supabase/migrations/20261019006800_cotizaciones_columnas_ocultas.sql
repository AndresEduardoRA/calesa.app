-- Lo que no se ve no viaja (D7; paso 4.10, prompt 1): `authenticated` deja de leer directo el snapshot de una cotización.
--
-- Hasta acá `_rls()` daba `select` de tabla entero: cualquier sesión con `cotizaciones.ver` (y el alcance de la fila) pedía a PostgREST
-- `valores`, `fuentes`, `totales` y `tipos_cambio`, o el `diff` de sus revisiones, y se llevaba los nodos de «costos» aunque la hoja no los dibujara.
-- Un `revoke select (columna)` no hace nada mientras exista el `select` de tabla (un grant de tabla cubre todas las columnas), así que se hace el
-- patrón de `leads`: se quita el `select` de tabla y se da `select` de las columnas que sí se leen.
--
--   cotizaciones            no se leen: valores, fuentes, totales, tipos_cambio (el total de cada moneda, `total_base`, sigue legible)
--   cotizaciones_revisiones no se lee:  diff (de/a de cada columna cambiada, el mismo snapshot)
--
-- Se leen por `cotizacion_leer()` y `cotizacion_revisiones()` (migraciones siguientes), que recortan por nivel con `_nodos_visibles()`. Las funciones
-- definer y los triggers siguen leyéndolas con los derechos de la base. Una columna que se agregue mañana nace sin grant (falla cerrada):
-- `cotizaciones-visibilidad.sql` compara la lista exacta de columnas legibles y obliga a decidir.
--
-- Los `grant update` no se tocan: escribir es de `cotizacion_crear|guardar` (4.10, prompts 2 y 3). Un `update … set valores = …` sin `where` sobre
-- valores ya no puede leerlos para filtrar ni devolverlos (`returning`), pero sí escribirlos hasta que ese prompt revoque el `update`.

do $$
declare
  v_cotizaciones text;
  v_revisiones text;
begin
  select string_agg(quote_ident(a.attname), ', ' order by a.attnum) into v_cotizaciones
    from pg_attribute a
   where a.attrelid = 'public.cotizaciones'::regclass and a.attnum > 0 and not a.attisdropped
     and a.attname <> all (array['valores', 'fuentes', 'totales', 'tipos_cambio']);
  select string_agg(quote_ident(a.attname), ', ' order by a.attnum) into v_revisiones
    from pg_attribute a
   where a.attrelid = 'public.cotizaciones_revisiones'::regclass and a.attnum > 0 and not a.attisdropped
     and a.attname <> all (array['diff']);

  revoke select on table public.cotizaciones from anon, authenticated;
  execute format('grant select (%s) on table public.cotizaciones to authenticated', v_cotizaciones);
  revoke select on table public.cotizaciones_revisiones from anon, authenticated;
  execute format('grant select (%s) on table public.cotizaciones_revisiones to authenticated', v_revisiones);
end $$;

comment on column public.cotizaciones.valores is 'Oculta a authenticated: se lee por cotizacion_leer(), recortada por nivel (docs/COTIZADOR.md › «Niveles de acceso»).';
comment on column public.cotizaciones.fuentes is 'Oculta a authenticated: se lee por cotizacion_leer(), recortada por nivel.';
comment on column public.cotizaciones.totales is 'Oculta a authenticated: se lee por cotizacion_leer(), recortada por nivel (los subtotales por grupo viajan sólo si se ve todo el grupo).';
comment on column public.cotizaciones.tipos_cambio is 'Oculta a authenticated: se lee por cotizacion_leer(); un tipo de cambio de un nodo restringido no viaja.';
comment on column public.cotizaciones_revisiones.diff is 'Oculta a authenticated: se lee por cotizacion_revisiones(), recortada por nodo.';
