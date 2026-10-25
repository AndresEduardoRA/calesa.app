-- Se cierra la escritura directa de `cotizaciones` y `cotizaciones_revisiones` (paso 4.10, prompt 2; D7: «guardar conserva lo que quien guarda no ve»).
--
-- `…006800` cerró la lectura del snapshot y dejó dicho que los `grant update` no se tocaban hasta acá: `authenticated` todavía tenía el `insert` de tabla entera de `_rls()` y un
-- `update` por columna (`vehiculo_id, titulo, plantilla_id, valores, fuentes, tipos_cambio, totales, total_base, moneda_mostrar, modo_tc, notas, clase`), así que cualquiera con
-- el permiso pisaba un nodo oculto, o una preventa pasaba a final sin la RPC. Desde ahora una cotización se crea con `cotizacion_crear()` y se cambia por RPC
-- (`cotizacion_marcar_final`, `cotizacion_moderar`, la papelera; `cotizacion_guardar` llega en el prompt 3). Las demás RPC que las escriben son `definer`: no cambian.
--
-- Un `revoke … on table` SÍ quita los grants de columna (la documentación de `REVOKE`: al revocar a nivel de tabla, los privilegios de columna correspondientes se revocan en cada
-- columna). Lo que no hace nada es lo contrario: revocar una columna mientras exista el grant de tabla (`…006800`). El bucle por columna se queda como defensa, explícito, leyendo el
-- catálogo, y lo que comprueba el resultado es `has_column_privilege` de cada rol sobre cada columna. `select (columnas legibles)` de `authenticated` no se toca. `service_role` y
-- `postgres` conservan lo suyo.
-- Sin ningún `grant` que las use, las policies de escritura son letra muerta: se quitan (quedan «leer» y la restrictiva de la papelera).

do $$
declare
  v_tabla text;
  v_columnas text;
begin
  foreach v_tabla in array array['cotizaciones', 'cotizaciones_revisiones'] loop
    select string_agg(quote_ident(a.attname), ', ' order by a.attnum) into v_columnas
      from pg_attribute a
     where a.attrelid = ('public.' || v_tabla)::regclass and a.attnum > 0 and not a.attisdropped;
    execute format('revoke insert, update, delete, truncate, references, trigger on table public.%I from public, anon, authenticated', v_tabla);
    execute format('revoke insert (%1$s), update (%1$s), references (%1$s) on table public.%2$I from public, anon, authenticated', v_columnas, v_tabla);
  end loop;
end $$;

drop policy if exists "cotizaciones: crear" on public.cotizaciones;
drop policy if exists "cotizaciones: editar" on public.cotizaciones;
