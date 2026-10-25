-- La revisión de una cotización guarda el cambio POR NODO y el intento del guardado (paso 4.10, prompt 3; D7: «guardar conserva lo que quien guarda no ve»).
--
-- Hasta acá `cotizacion_revision()` guardaba, de `valores` y `fuentes`, los DOS snapshots enteros de cada edición: con 200 nodos, medio mega por guardado, y para saber qué
-- cambió había que compararlos. Ahora guarda sólo los nodos que cambiaron (`{de: {nodo: …}, a: {nodo: …}}`; un nodo que aparece o desaparece figura en un solo lado), incluidos los
-- ocultos que cambian por derivación: es el diff real. `totales` y `tipos_cambio` siguen enteros (son chicos y salen de un cálculo). `cotizacion_revisiones()` ya recorta cada
-- columna por nodo (`_cotizacion_diff_recortado`) y lee las dos formas: las revisiones que ya existen, con dos snapshots enteros, se siguen leyendo igual.
--
-- Y la revisión lleva el `intento` y la `huella` del guardado, que `cotizacion_guardar()` deja en `importadora.guardado` (un ajuste local de la transacción) antes del `update`: repetir
-- el mismo intento devuelve lo guardado y no vuelve a escribir. Ninguna de las dos columnas se lee directo: `…006800` dio `select` de «todas las columnas menos el diff» leyendo el
-- catálogo, y estas nacieron en el esquema base antes que esa migración, así que entraron; la huella resume lo que tipeó quien guardó y se podría adivinar por fuerza bruta.

revoke select (intento, huella) on public.cotizaciones_revisiones from public, anon, authenticated;

create or replace function public.cotizacion_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  d jsonb := '{}'::jsonb; k text; a jsonb := to_jsonb(old); b jsonb := to_jsonb(new);
  v_de jsonb; v_a jsonb; v_g jsonb;
begin
  for k in select jsonb_object_keys(b) loop
    if k in ('actualizado_en', 'reportes_count', 'favoritos_count') or a -> k is not distinct from b -> k then continue; end if;
    if k in ('valores', 'fuentes') and jsonb_typeof(a -> k) = 'object' and jsonb_typeof(b -> k) = 'object' then
      -- Sólo los nodos que cambiaron (`-> clave` da el jsonb null de un valor nulo y el SQL null de una clave que no está).
      select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_de from jsonb_each(a -> k) e where (b -> k) -> e.key is distinct from e.value;
      select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_a from jsonb_each(b -> k) e where (a -> k) -> e.key is distinct from e.value;
      d := d || jsonb_build_object(k, jsonb_build_object('de', v_de, 'a', v_a));
    else
      d := d || jsonb_build_object(k, jsonb_build_object('de', a -> k, 'a', b -> k));
    end if;
  end loop;
  if d <> '{}'::jsonb then
    -- Lo deja `cotizacion_guardar()`; un ajuste que alguna vez se fijó en la sesión vuelve como texto vacío, no como nulo.
    v_g := nullif(current_setting('importadora.guardado', true), '')::jsonb;
    insert into public.cotizaciones_revisiones (cotizacion_id, usuario_id, diff, intento, huella)
    values (new.id, (select auth.uid()), d, (v_g ->> 'intento')::uuid, v_g ->> 'huella');
  end if;
  return null;
end;
$$;
comment on function public.cotizacion_revision() is
  'Trigger de cotizaciones: una revisión por cambio, con el diff por columna ({de, a}; en valores y fuentes sólo los nodos que cambiaron) y el intento y la huella de cotizacion_guardar. docs/COTIZADOR.md › «Cómo se guarda (4.10-3)».';
