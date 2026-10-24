-- El diseño de la hoja entra a la fórmula (paso 4.08, prompt 2; docs/COTIZADOR.md › «El diseño de la hoja»). Las columnas `formulas.diseno` y
-- `formulas.visibilidad` viven en `schemas/07_cotizaciones`. Acá:
--
--  - `formula_guardar_borrador(origen, definición, params, diseño, nota)`: guarda el diseño con el borrador. Valida la fórmula y sólo la FORMA del
--    diseño: el borrador puede estar a medio camino entre una y otro. Un diseño nulo es «todavía no hay». La firma de cuatro parámetros se borra.
--  - `formula_publicar()` y el ⚙ (`formula_cambiar_constante()`) publican por `_publicar_formula()`: validan la fórmula y el diseño completo
--    (`validar_diseno()`, con los niveles, los retirados y los tonos de verdad) y compilan `formulas.visibilidad`. **Publicar exige el diseño.**
--    El ⚙ copia el diseño de la publicada y publica con `retirados` vacío: lo que ya usa un nivel retirado se sigue filtrando igual (D7).
--  - `_niveles_de_cotizacion()`: el único lugar donde se dice qué niveles existen. Hoy es «costos»; el 4.09 cambia sólo su cuerpo (lee
--    `cotizaciones_niveles`). «todos» no figura: siempre existe y nunca se retira.
--  - `_compilar_visibilidad()`: del diseño a `{nodo: {ver, editar}}` con claves de nivel, no permisos (los permisos nacen en el 4.09). Lo que no
--    se dibuja no viaja, salvo el total y lo `aparte`, que la base siempre manda.
--  - `_nivel_en_uso()`: la sonda de «¿lo nombra el diseño de alguna versión?», para que el 4.09 no elimine un nivel en uso.
--
-- Los ayudantes no son de nadie (`revoke … from public, anon, authenticated`): una función nueva nace con EXECUTE para PUBLIC y PostgREST la
-- expone. Y no llevan el prefijo `_formula_` ni `_diseno_`: `validar-formula.sql` y `validar-diseno.sql` cuentan las que lo llevan.

-- ---------------------------------------------------------------------------
-- Los niveles que existen (el punto que el 4.09 reemplaza)
-- ---------------------------------------------------------------------------
create or replace function public._niveles_de_cotizacion(out niveles text[], out retirados text[])
language sql stable set search_path = '' as $$
  select array['costos']::text[], '{}'::text[];
$$;
revoke all on function public._niveles_de_cotizacion() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- ¿Lo nombra el diseño de alguna versión? (borrador, publicada y archivada: las cotizaciones viejas se leen con su versión)
-- ---------------------------------------------------------------------------
-- Los niveles que nombra un diseño: el de cada sección y el de cada ítem, para ver y para editar. Un arreglo angosto para indexar, no el diseño
-- entero (un `jsonb_path_ops` sobre el diseño indexaría cada hoja de un JSON de miles de ítems).
create or replace function public._niveles_del_diseno(p_diseno jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_path_query_array(p_diseno, '$.secciones[*].nivel_ver'), '[]'::jsonb)
      || coalesce(jsonb_path_query_array(p_diseno, '$.secciones[*].nivel_editar'), '[]'::jsonb)
      || coalesce(jsonb_path_query_array(p_diseno, '$.secciones[*].items[*].nivel_ver'), '[]'::jsonb)
      || coalesce(jsonb_path_query_array(p_diseno, '$.secciones[*].items[*].nivel_editar'), '[]'::jsonb);
$$;
revoke all on function public._niveles_del_diseno(jsonb) from public, anon, authenticated;
create index if not exists formulas_niveles_idx on public.formulas using gin (public._niveles_del_diseno(diseno) jsonb_path_ops);

-- El nombre del origen de una fórmula cuyo diseño nombra el nivel (el primero por nombre), o nulo. Definer: lee `formulas` aunque quien llama
-- no tenga cotizaciones.configurar de ese origen.
create or replace function public._nivel_en_uso(p_clave text)
returns text language sql stable security definer set search_path = '' as $$
  -- Materializada, como en _tono_en_uso: el índice conduce.
  with u as materialized (
    select distinct f.origen_id from public.formulas f
     where public._niveles_del_diseno(f.diseno) @> jsonb_build_array(p_clave)  -- formulas_niveles_idx
  )
  select o.nombre from u join public.origenes o on o.id = u.origen_id order by o.nombre limit 1;
$$;
revoke all on function public._nivel_en_uso(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- De un diseño a la visibilidad de cada nodo
-- ---------------------------------------------------------------------------
-- Una entrada por nodo que la hoja dibuja (celda, subtotal, variante, interruptor) con su nivel efectivo —el de la celda, si no el de su
-- sección, si no «todos»—, por separado para ver y para editar; el `pct` de una celda con `secundario` con los mismos niveles; el total y lo
-- `aparte` con `ver: todos` aunque se dibujen en una sección restringida (D7: la base siempre los manda), y los que no se dibujan con
-- `{ver: todos, editar: null}`: lo que no se dibuja no se edita. Los atajos y la tarjeta no agregan nada (los atajos tienen los niveles de su
-- celda; la tarjeta repite lo que la hoja ya dibuja). Lo que no figura no viaja, salvo a quien configura.
-- Va después de `validar_diseno()`: un nodo se dibuja a lo sumo una vez, así que no hay dos entradas por nodo. Lineal: se desarma una vez.
create or replace function public._compilar_visibilidad(p_def jsonb, p_diseno jsonb)
returns jsonb language sql stable set search_path = '' as $$
  with items as (
    select it.value ->> 'nodo' as nodo, it.value ? 'secundario' as con_pct,
           coalesce(it.value ->> 'nivel_ver', s.value ->> 'nivel_ver', 'todos') as ver,
           coalesce(it.value ->> 'nivel_editar', s.value ->> 'nivel_editar', 'todos') as editar
      from jsonb_array_elements(p_diseno -> 'secciones') s(value)
      cross join lateral jsonb_array_elements(s.value -> 'items') it(value)
     where it.value ->> 'tipo' in ('celda', 'subtotal', 'variante', 'interruptor')
  ), nodos as (
    select n.value ->> 'id' as id, n.value ->> 'pct' as pct, n.value ->> 'salida' as salida
      from jsonb_array_elements(p_def -> 'nodos') n(value)
  ), dibujado as (
    select nodo, ver, editar from items
    union all
    select n.pct, i.ver, i.editar from items i join nodos n on n.id = i.nodo where i.con_pct and n.pct is not null
  ), final as (
    select d.nodo, case when n.salida in ('total', 'aparte') then 'todos' else d.ver end as ver, d.editar
      from dibujado d join nodos n on n.id = d.nodo
    union all
    select n.id, 'todos', null from nodos n
     where n.salida in ('total', 'aparte') and not exists (select 1 from dibujado d where d.nodo = n.id)
  )
  select coalesce(jsonb_object_agg(f.nodo, jsonb_build_object('ver', f.ver, 'editar', f.editar)), '{}'::jsonb) from final f;
$$;
revoke all on function public._compilar_visibilidad(jsonb, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Guardar el borrador con su diseño
-- ---------------------------------------------------------------------------
-- La firma de cuatro parámetros se borra: un `create or replace` con un parámetro más es una sobrecarga, y el ⚙ de una base vieja la usaría.
-- `p_diseno` no tiene default: quien se olvida del diseño no lo borra en silencio. Nulo es «todavía no hay» y se admite en un borrador.
-- Todavía sin `p_actualizado_en_esperado` (docs/PLAN.md, 4-8: lo decide el 4.20 junto con revertir y el ⚙).
drop function if exists public.formula_guardar_borrador(uuid, jsonb, jsonb, text);
create or replace function public.formula_guardar_borrador(p_origen uuid, p_def jsonb, p_params jsonb, p_diseno jsonb, p_nota text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  perform public.validar_formula(p_def, p_params);
  if p_diseno is not null then
    perform public._diseno_forma(p_diseno);   -- sólo la forma: cruzarlo con la fórmula es de publicar
  end if;
  insert into public.formulas (origen_id, estado, definicion, params, diseno, nota, creado_por)
  values (p_origen, 'borrador', p_def, p_params, p_diseno, p_nota, (select auth.uid()))
  on conflict (origen_id) where estado = 'borrador' do update
    set definicion = excluded.definicion, params = excluded.params, diseno = excluded.diseno, nota = excluded.nota, visibilidad = null
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.formula_guardar_borrador(uuid, jsonb, jsonb, jsonb, text) from public, anon;
grant execute on function public.formula_guardar_borrador(uuid, jsonb, jsonb, jsonb, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Publicar
-- ---------------------------------------------------------------------------
-- Publicar y el ⚙ pasan por acá. `p_ignorar_retirados` es del ⚙ (y de revertir y de la N+1 de una tabla, que no tocan el diseño): sin él,
-- el diseño que ya usa un nivel retirado no se podría republicar.
-- Orden de los candados: el borrador `for update` (dos publicar a la vez: el segundo no encuentra borrador) y los tonos de sus grupos
-- `for key share` ANTES de leer el catálogo: o publica y `tono_eliminar` ve el uso, o elimina y esto da `tono_inexistente`.
create or replace function public._publicar_formula(p_origen uuid, p_nota text, p_publicada_esperada uuid, p_ignorar_retirados boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_b public.formulas; v_pub uuid; v_ver int; v_niv text[]; v_ret text[]; v_tonos text[]; v_vis jsonb;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  if coalesce(trim(p_nota), '') = '' then raise exception 'Publicar pide una nota.' using errcode = '22023'; end if;
  select * into v_b from public.formulas where origen_id = p_origen and estado = 'borrador' for update;
  select id into v_pub from public.formulas where origen_id = p_origen and estado = 'publicada';
  if p_publicada_esperada is not null and v_pub is distinct from p_publicada_esperada then
    raise exception 'Alguien publicó otra versión mientras editabas. Recarga.' using errcode = 'PT409';
  end if;
  if v_b.id is null then raise exception 'No hay borrador para publicar.' using errcode = '22023'; end if;
  if v_b.diseno is null then
    perform public._formula_rechazar('diseno_faltante', 'diseno', 'Publicar pide el diseño de la hoja.');
  end if;

  perform 1 from public.tonos t where t.clave in (select jsonb_array_elements_text(public._tonos_de_grupos(v_b.definicion))) for key share;
  select coalesce(array_agg(t.clave), '{}') into v_tonos from public.tonos t;
  select n.niveles, case when p_ignorar_retirados then '{}'::text[] else n.retirados end into v_niv, v_ret from public._niveles_de_cotizacion() n;
  perform public.validar_formula(v_b.definicion, v_b.params);
  perform public.validar_diseno(v_b.definicion, v_b.diseno, v_niv, v_ret, v_tonos);
  v_vis := public._compilar_visibilidad(v_b.definicion, v_b.diseno);

  select coalesce(max(version), 0) + 1 into v_ver from public.formulas where origen_id = p_origen;
  update public.formulas set estado = 'archivada' where id = v_pub;
  update public.formulas set estado = 'publicada', version = v_ver, nota = p_nota, visibilidad = v_vis, publicado_por = (select auth.uid()),
         publicado_en = now(), version_origen_id = v_pub where id = v_b.id;
  perform public.registrar_actividad('formula.publicada', 'formulas', v_b.id::text, jsonb_build_object('anterior', v_pub), jsonb_build_object('version', v_ver, 'nota', p_nota));
  return v_b.id;
end;
$$;
revoke all on function public._publicar_formula(uuid, text, uuid, boolean) from public, anon, authenticated;

-- Misma firma y mismos grants que …005000 (`create or replace` los conserva).
create or replace function public.formula_publicar(p_origen uuid, p_nota text, p_publicada_esperada uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  return public._publicar_formula(p_origen, p_nota, p_publicada_esperada, false);
end;
$$;

-- El ⚙: publica la N+1 con otro valor y el MISMO diseño. Pisa el borrador en curso (docs/PLAN.md, 4-8).
create or replace function public.formula_cambiar_constante(p_origen uuid, p_nodo text, p_valor numeric)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_pub public.formulas; v_anterior numeric;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  select * into v_pub from public.formulas where origen_id = p_origen and estado = 'publicada';
  if v_pub.id is null then raise exception 'El origen no tiene fórmula publicada.' using errcode = '22023'; end if;
  v_anterior := (v_pub.params ->> p_nodo)::numeric;
  if v_anterior is null then raise exception 'La fórmula publicada no tiene la constante «%».', p_nodo using errcode = '22023'; end if;
  perform public.formula_guardar_borrador(p_origen, v_pub.definicion, v_pub.params || jsonb_build_object(p_nodo, p_valor), v_pub.diseno, null);
  return public._publicar_formula(p_origen, format('%s: %s → %s, desde el cotizador', p_nodo, v_anterior, p_valor), v_pub.id, true);
end;
$$;
