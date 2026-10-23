-- Los tachados de quien llama entran a la ventana de candidatos (paso 4.03, `docs/PLAN.md` 5a-34).
--
-- Los «tachados ocultos» son los leads de la cartera que cumplen los filtros y que quien mira tachó: el aviso «N leads que coinciden están ocultos» (`contarLeadsHasta(…, 50)`) y, con la
-- misma forma, el conteo de la exportación. Con un campo privado filtrado ese conteo leía `leads_vista` (`atributos_lead()` por lead): la dueña con 212.000 leads, 280 ms para 4.000 tachados.
-- Ahora el conteo pasa por los candidatos, y para que no recorra la cartera hasta juntar los tachados que cumplen —en la siembra todos los de la dueña tienen el mismo valor de campo—, `tachados: true`
-- pide sólo los leads que quien llama tachó, como `etiquetas` pide sólo las suyas (5a-7):
--  · la etapa W lleva un `exists` por `leads_tachados_pkey` y la etapa I parte de los tachados de quien llama (`l.id = any (array(select …))`);
--  · un valor de `tachados` que no es `true` no filtra, y nunca es de otra persona: la marca es de quien llama, no del pedido;
--  · cuenta como algo que buscarle a la ventana, y si quien llama tiene como mucho S tachados la ventana va directo al índice, sin recorrer antes el orden del listado (`v_solo_indice`).
-- Quién ve qué no cambia: la visibilidad y la cartera se piden igual, y la página sigue repitiendo la condición de la marca. Ni tabla, ni policy, ni función nueva (`database.types.ts` no cambia).

create or replace function public._leads_candidatos_indexable(p_filtros jsonb)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select coalesce(nullif(p_filtros ->> 'texto', '') ~ '[[:alnum:]]{3}', false)
      or coalesce(jsonb_array_length(case when jsonb_typeof(p_filtros -> 'atributos') = 'array' then p_filtros -> 'atributos' end), 0) > 0
      or coalesce(jsonb_array_length(case when jsonb_typeof(p_filtros -> 'etiquetas') = 'array' then p_filtros -> 'etiquetas' end), 0) > 0
      or coalesce(jsonb_array_length(case when jsonb_typeof(p_filtros -> 'privados') = 'array' then p_filtros -> 'privados' end), 0) > 0
      or coalesce(p_filtros -> 'tachados' = 'true'::jsonb, false)
      or exists (select 1 from jsonb_array_elements(case when jsonb_typeof(p_filtros -> 'comparaciones') = 'array' then p_filtros -> 'comparaciones' else '[]'::jsonb end) e
                  where jsonb_typeof(e) = 'object' and jsonb_typeof(e -> 'clave') = 'string' and (e ->> 'clave') ~ '^[a-z][a-z0-9_]{1,40}$'
         and case e ->> 'tipo'
               when 'texto' then jsonb_typeof(e -> 'texto') = 'string' and (e ->> 'texto') ~ '[[:alnum:]]{3}'
               when 'rango_numero' then jsonb_typeof(e -> 'min') = 'number' or jsonb_typeof(e -> 'max') = 'number'
               when 'rango_texto' then jsonb_typeof(e -> 'desde') = 'string' or jsonb_typeof(e -> 'antes_de') = 'string'
               else false end)
      or exists (select 1 from jsonb_array_elements(case when jsonb_typeof(p_filtros -> 'comparaciones_privadas') = 'array' then p_filtros -> 'comparaciones_privadas' else '[]'::jsonb end) e
                  where jsonb_typeof(e) = 'object' and jsonb_typeof(e -> 'clave') = 'string' and (e ->> 'clave') ~ '^[a-z][a-z0-9_]{1,40}$'
         and case e ->> 'tipo'
               when 'texto' then jsonb_typeof(e -> 'texto') = 'string' and (e ->> 'texto') ~ '[[:alnum:]]{3}'
               when 'rango_numero' then jsonb_typeof(e -> 'min') = 'number' or jsonb_typeof(e -> 'max') = 'number'
               when 'rango_texto' then jsonb_typeof(e -> 'desde') = 'string' or jsonb_typeof(e -> 'antes_de') = 'string'
               else false end)
$$;
revoke all on function public._leads_candidatos_indexable(jsonb) from public, anon, authenticated;

create or replace function public._leads_candidatos_sql(p_etapa text, p_filtros jsonb, p_yo uuid, p_alcance public.alcance_permiso, p_fuera uuid[])
returns text language plpgsql stable set search_path = '' as $$
declare
  v_k int := public._leads_candidatos_tope();
  v_s int := public._leads_candidatos_recorrido();
  v_texto text := nullif(p_filtros ->> 'texto', '');
  v_patron text;
  -- Un campo privado sólo lo tiene la cartera de quien llama (`atributos_lead()` no le entrega ese dato a nadie más): filtrar por uno es leer «míos», lo pida o no el cliente.
  v_con_privados boolean := coalesce(jsonb_array_length(case when jsonb_typeof(p_filtros -> 'privados') = 'array' then p_filtros -> 'privados' end), 0) > 0;
  -- Un texto o un rango sobre un campo privado también se lee sólo de la cartera de quien llama (`atributos_lead()` no le entrega ese dato a nadie más): cuenta sólo si el elemento es válido.
  v_con_comp_privadas boolean := exists (select 1 from jsonb_array_elements(case when jsonb_typeof(p_filtros -> 'comparaciones_privadas') = 'array' then p_filtros -> 'comparaciones_privadas' else '[]'::jsonb end) e
                                          where jsonb_typeof(e) = 'object' and jsonb_typeof(e -> 'clave') = 'string' and (e ->> 'clave') ~ '^[a-z][a-z0-9_]{1,40}$'
         and case e ->> 'tipo'
               when 'texto' then jsonb_typeof(e -> 'texto') = 'string' and (e ->> 'texto') ~ '[[:alnum:]]{3}'
               when 'rango_numero' then jsonb_typeof(e -> 'min') = 'number' or jsonb_typeof(e -> 'max') = 'number'
               when 'rango_texto' then jsonb_typeof(e -> 'desde') = 'string' or jsonb_typeof(e -> 'antes_de') = 'string'
               else false end);
  v_mios boolean := coalesce((p_filtros ->> 'mios')::boolean, false) or p_alcance = 'propios' or v_con_privados or v_con_comp_privadas;
  v_atras boolean := (p_filtros ->> 'sentido') = 'anterior';
  v_dir text := case when v_atras then 'asc' else 'desc' end;
  v_cmp text := case when v_atras then '>' else '<' end;
  v_en timestamptz := nullif(p_filtros #>> '{cursor,creado_en}', '')::timestamptz;
  v_id uuid := nullif(p_filtros #>> '{cursor,id}', '')::uuid;
  v_visible text;
  v_cursor_l text := 'true';
  v_cursor_la text := 'true';
  v_m text[] := '{}'::text[];
  v_con_etiquetas boolean := coalesce(jsonb_typeof(p_filtros -> 'etiquetas') = 'array', false);
  v_etiquetas uuid[] := public._leads_candidatos_etiquetas(p_filtros, p_yo);
  v_grupo jsonb; v_alt jsonb; v_alts text[];
  v_clave_de_comparaciones text; v_ref text; v_comp jsonb; v_hay_comparacion boolean := false;
  v_con_tachados boolean := coalesce(p_filtros -> 'tachados' = 'true'::jsonb, false);
  v_etapa text := p_etapa;
  -- `recorrido` es interno: `leads_candidatos()` lo usa para seguir un recorrido acotado (cuántas filas mirar, no más de 2,5 veces la ventana). Un valor que no es un entero cuenta como ausente.
  v_limite int := case when coalesce(p_filtros ->> 'recorrido', '') ~ '^[0-9]{1,7}$'
                       then least(greatest((p_filtros ->> 'recorrido')::int, 1), (v_s * 5) / 2) else v_s end;
begin
  -- Etiquetas pedidas y ninguna es de quien mira (una que nadie tiene, una ajena, un id que no existe): no hay candidatos, y no se recorre nada. Lo mismo que «ninguna»: nadie
  -- sabe, por el tiempo ni por lo que vuelve, si la etiqueta existe o es de otra persona.
  if v_con_etiquetas and cardinality(v_etiquetas) = 0 then
    return 'select ''{}''::uuid[], 0, null::uuid';
  end if;
  -- La segunda etapa sin nada que buscarle al índice es el mismo recorrido por el orden del listado, sin tope: por la cartera de quien mira o por `leads_listado_idx`.
  -- Con el GIN de la cartera era peor (Ana, 8.000 leads: 97 ms contra 43 de antes): cada lead de la cartera es una lectura al azar del heap, y el recorrido ordenado
  -- lee `leads` por su clave en ~2,5 µs.
  -- Quien ve «todos» no necesita el `lateral` ni en «míos»: su cartera es de un 40 % de la tabla, y el planificador camina `leads_listado_idx` con el filtro y corta en K + 1
  -- (la dueña, «míos» sin resultados: 133 ms hoy y con esta forma; con el `lateral`, 272).
  if p_etapa = 'indice' and v_mios and p_alcance = 'propios' and not public._leads_candidatos_indexable(p_filtros) then
    v_etapa := 'recorrer';
    v_limite := 2147483647;
  end if;
  v_visible := format('l.eliminado_en is null and l.cartera <> %L::uuid[] and public._lead_visible_para(l.eliminado_en, l.cartera, %L::public.alcance_permiso, %L::uuid, %L::uuid[])',
                      '{}', p_alcance, p_yo, p_fuera);
  if v_en is not null and v_id is not null then
    v_cursor_l := format('l.creado_en %s= %L and (l.creado_en %s %L or l.id %s %L)', v_cmp, v_en, v_cmp, v_en, v_cmp, v_id);
    v_cursor_la := format('la.lead_creado_en %s= %L and (la.lead_creado_en %s %L or la.lead_id %s %L)', v_cmp, v_en, v_cmp, v_en, v_cmp, v_id);
  end if;
  if v_texto is not null and p_etapa <> 'extra' then
    v_patron := public._lead_busqueda_patron(v_texto);
    -- Con un tramo de 3 letras o dígitos, el patrón entero va al índice trigram (sus trigramas se cruzan solos). Sin él el índice no tiene
    -- nada que buscar y recorrería la columna entera: `(nombre || '')` no es una columna indexada y el filtro queda para quien ya recorre.
    v_m := v_m || case when p_etapa = 'indice' and v_texto ~ '[[:alnum:]]{3}'
                       then format('l.nombre ilike %L', v_patron) else format('(l.nombre || %L) ilike %L', '', v_patron) end;
  end if;
  if jsonb_typeof(p_filtros -> 'tipos') = 'array' then
    v_m := v_m || format('l.tipo_lead_id = any (%L::uuid[])', array(select jsonb_array_elements_text(p_filtros -> 'tipos'))::uuid[]);
  end if;
  if jsonb_typeof(p_filtros -> 'origenes') = 'array' then
    v_m := v_m || format('l.origen_lead_id = any (%L::uuid[])', array(select jsonb_array_elements_text(p_filtros -> 'origenes'))::uuid[]);
  end if;
  if v_con_etiquetas then
    v_m := v_m || format('exists (select 1 from public.leads_etiquetas le where le.lead_id = l.id and le.etiqueta_id = any (%L::uuid[]))', v_etiquetas);
  end if;
  -- Sólo los tachados de quien llama (5a-34): la marca es suya, no del pedido.
  if v_con_tachados then
    v_m := v_m || format('exists (select 1 from public.leads_tachados t where t.lead_id = l.id and t.usuario_id = %L::uuid)', p_yo);
  end if;
  if jsonb_typeof(p_filtros -> 'atributos') = 'array' then
    for v_grupo in select * from jsonb_array_elements(p_filtros -> 'atributos') loop
      v_alts := '{}';
      for v_alt in select * from jsonb_array_elements(v_grupo) loop
        v_alts := v_alts || format('l.atributos_publicos @> %L::jsonb', v_alt);
      end loop;
      if cardinality(v_alts) > 0 then v_m := v_m || ('(' || array_to_string(v_alts, ' or ') || ')'); end if;
    end loop;
  end if;
  -- Un campo privado (5a-10): la misma forma que un público, sobre `atributos` (lo que `atributos_lead()` le daría a quien llama, porque es de su cartera) y sólo en su
  -- cartera (`v_mios`). Un grupo vacío o que no es un arreglo no filtra, como en un campo público.
  if v_con_privados then
    for v_grupo in select * from jsonb_array_elements(p_filtros -> 'privados') loop
      v_alts := '{}';
      for v_alt in select * from jsonb_array_elements(case when jsonb_typeof(v_grupo) = 'array' then v_grupo else '[]'::jsonb end) loop
        v_alts := v_alts || format('l.atributos @> %L::jsonb', v_alt);
      end loop;
      if cardinality(v_alts) > 0 then v_m := v_m || ('(' || array_to_string(v_alts, ' or ') || ')'); end if;
    end loop;
  end if;
  -- Un texto o un rango sobre un campo (4.03, 5a-9 y 5a-34): `comparaciones` sobre la copia de lo público y `comparaciones_privadas` sobre `atributos`, sólo de la cartera (`v_mios`). Lo mal formado se ignora.
  foreach v_clave_de_comparaciones in array array['comparaciones', 'comparaciones_privadas'] loop
    v_ref := case v_clave_de_comparaciones when 'comparaciones' then 'l.atributos_publicos' else 'l.atributos' end;
    for v_comp in select e from jsonb_array_elements(case when jsonb_typeof(p_filtros -> v_clave_de_comparaciones) = 'array' then p_filtros -> v_clave_de_comparaciones else '[]'::jsonb end) e loop
      continue when jsonb_typeof(v_comp) <> 'object' or jsonb_typeof(v_comp -> 'clave') <> 'string' or (v_comp ->> 'clave') !~ '^[a-z][a-z0-9_]{1,40}$';
      case v_comp ->> 'tipo'
        when 'texto' then
          if jsonb_typeof(v_comp -> 'texto') = 'string' and (v_comp ->> 'texto') ~ '[[:alnum:]]{3}' then
            v_m := v_m || format('(%s ->> %L) ilike %L', v_ref, v_comp ->> 'clave', public._lead_busqueda_patron(v_comp ->> 'texto'));
            v_hay_comparacion := true;
          end if;
        when 'rango_numero' then
          -- jsonb contra jsonb, como PostgREST con `->`: un valor de texto ordena antes que cualquier número.
          if jsonb_typeof(v_comp -> 'min') = 'number' then v_m := v_m || format('(%s -> %L) >= %L::jsonb', v_ref, v_comp ->> 'clave', v_comp -> 'min'); v_hay_comparacion := true; end if;
          if jsonb_typeof(v_comp -> 'max') = 'number' then v_m := v_m || format('(%s -> %L) <= %L::jsonb', v_ref, v_comp ->> 'clave', v_comp -> 'max'); v_hay_comparacion := true; end if;
        when 'rango_texto' then
          if jsonb_typeof(v_comp -> 'desde') = 'string' then v_m := v_m || format('(%s ->> %L) >= %L', v_ref, v_comp ->> 'clave', v_comp ->> 'desde'); v_hay_comparacion := true; end if;
          if jsonb_typeof(v_comp -> 'antes_de') = 'string' then v_m := v_m || format('(%s ->> %L) < %L', v_ref, v_comp ->> 'clave', v_comp ->> 'antes_de'); v_hay_comparacion := true; end if;
        else null;
      end case;
    end loop;
  end loop;
  -- El lead del número (`extra`): las mismas condiciones que la ventana, sin la del nombre. $1 los ids, $2 si esta ventana es la última, $3 y $4 hasta dónde llegó.
  if p_etapa = 'extra' then
    return format($q$select coalesce(array_agg(l.id), '{}'::uuid[]), count(*)::int, null::uuid from public.leads l
        where l.id = any ($1) and %s and %s %s %s and ($2 or (l.creado_en, l.id) %s ($3, $4))$q$,
      v_visible, v_cursor_l, case when v_mios then format('and l.cartera @> array[%L]::uuid[]', p_yo) else '' end,
      case when cardinality(v_m) > 0 then 'and ' || array_to_string(v_m, ' and ') else '' end, case when v_atras then '<=' else '>=' end);
  end if;
  if v_etapa = 'recorrer' then
    -- Hasta S filas visibles en el orden del listado, y de ellas las que cumplen. «Míos» y «propios» por la cartera de quien mira
    -- (`leads_asesores_listado_idx`, como `leads_cartera_vista`); «todos» por `leads_listado_idx`. Dice cuántas recorrió (menos de S = recorrió todo).
    if v_mios and v_limite = 2147483647 then
      -- Sin tope (un término sin nada que buscarle al índice): los primeros K + 1 que cumplen, **cortando al juntarlos**. Si la unión se agregara entera (el `array_agg … filter` de abajo), un
      -- término denso de 1 o 2 caracteres recorrería toda la cartera de la dueña (212 ms con 212.000 leads) en vez de parar en la primera página.
      return format($q$select coalesce(array_agg(w.id order by w.creado_en %s, w.id %s), '{}'::uuid[]), count(*)::int, null::uuid
          from (select x.lead_id as id, x.lead_creado_en as creado_en
                  from public.leads_asesores x
                  join lateral (select 1 from public.leads l where l.id = x.lead_id and %s and %s limit 1) l on true
                 where x.usuario_id = %L::uuid and x.revocado_en is null and %s
                 order by x.lead_creado_en %s, x.lead_id %s limit %s) w$q$,
        v_dir, v_dir, v_visible, coalesce(nullif(array_to_string(v_m, ' and '), ''), 'true'), p_yo, replace(replace(v_cursor_la, 'la.', 'x.'), 'x.lead_creado_en', 'x.lead_creado_en'),
        v_dir, v_dir, v_k + 1);
    end if;
    if v_mios then
      -- `lateral … limit 1` (el id es único, da lo mismo): sin la valla, el planificador aplana la unión y lee `leads` entera (un `Hash Join`, 24 ms con 62.000) en vez de buscar cada fila de la cartera por su clave.
      return format($q$select coalesce((array_agg(w.id order by w.creado_en %s, w.id %s) filter (where w.m))[1:%s], '{}'::uuid[]), count(*)::int,
                (array_agg(w.id order by w.creado_en %s, w.id %s))[count(*)::int]
          from (select x.lead_id as id, x.lead_creado_en as creado_en, l.m
                  from (select la.lead_id, la.lead_creado_en from public.leads_asesores la
                         where la.usuario_id = %L::uuid and la.revocado_en is null and %s
                         order by la.lead_creado_en %s, la.lead_id %s limit %s) x
                  left join lateral (select (%s) as m from public.leads l where l.id = x.lead_id and %s limit 1) l on true) w$q$,
        v_dir, v_dir, v_k + 1, v_dir, v_dir, p_yo, v_cursor_la, v_dir, v_dir, v_limite, coalesce(nullif(array_to_string(v_m, ' and '), ''), 'true'), v_visible);
    end if;
    return format($q$select coalesce((array_agg(w.id order by w.creado_en %s, w.id %s) filter (where w.m))[1:%s], '{}'::uuid[]), count(*)::int,
              (array_agg(w.id order by w.creado_en %s, w.id %s))[count(*)::int]
        from (select l.id, l.creado_en, (%s) as m from public.leads l where %s and %s
               order by l.creado_en %s, l.id %s limit %s) w$q$,
      v_dir, v_dir, v_k + 1, v_dir, v_dir, coalesce(nullif(array_to_string(v_m, ' and '), ''), 'true'), v_visible, v_cursor_l, v_dir, v_dir, v_limite);
  end if;
  -- Un texto o un rango con «míos»: el planificador no tiene estadísticas de `->`/`->>` y estima un rango de un lado en un tercio de la cartera, así que camina `leads_listado_idx` entero (Berta, 28.000
  -- leads, rango de número sin resultados: 88 ms y 172.737 buffers con 212.000). Con la valla (`materialized`) elige por la cartera: 14 ms y 925 buffers. Sólo con «míos»: la consulta de quien ve
  -- «todos» no tiene cartera que la acote.
  if v_mios and v_hay_comparacion then
    return format($q$with c as materialized (select l.id, l.creado_en from public.leads l where %s and %s %s %s)
        select coalesce(array_agg(x.id order by x.creado_en %s, x.id %s), '{}'::uuid[]), count(*)::int, null::uuid
          from (select * from c order by creado_en %s, id %s limit %s) x$q$,
      v_visible, v_cursor_l,
    case when v_mios then format('and l.cartera @> array[%L]::uuid[]', p_yo) else '' end
    -- Con etiquetas, el índice de `leads_etiquetas` (por `etiqueta_id`) dice cuáles son: sin esto el planificador camina `leads_listado_idx` y calcula las etiquetas de cada fila (368 ms).
    || case when v_con_etiquetas then format('and l.id = any (array(select le.lead_id from public.leads_etiquetas le where le.etiqueta_id = any (%L::uuid[])))', v_etiquetas) else '' end
    || case when v_con_tachados then format('and l.id = any (array(select t.lead_id from public.leads_tachados t where t.usuario_id = %L::uuid))', p_yo) else '' end,
    case when cardinality(v_m) > 0 then 'and ' || array_to_string(v_m, ' and ') else '' end,
      v_dir, v_dir, v_dir, v_dir, v_k + 1);
  end if;
  -- El índice: los primeros K + 1 que cumplen, en el orden. Con «míos» la cartera entra al índice y las filas ajenas no se leen.
  return format($q$select coalesce(array_agg(x.id order by x.creado_en %s, x.id %s), '{}'::uuid[]), count(*)::int, null::uuid
      from (select l.id, l.creado_en from public.leads l where %s and %s %s %s
             order by l.creado_en %s, l.id %s limit %s) x$q$,
    v_dir, v_dir, v_visible, v_cursor_l,
    case when v_mios then format('and l.cartera @> array[%L]::uuid[]', p_yo) else '' end
    -- Con etiquetas, el índice de `leads_etiquetas` (por `etiqueta_id`) dice cuáles son: sin esto el planificador camina `leads_listado_idx` y calcula las etiquetas de cada fila (368 ms).
    || case when v_con_etiquetas then format('and l.id = any (array(select le.lead_id from public.leads_etiquetas le where le.etiqueta_id = any (%L::uuid[])))', v_etiquetas) else '' end
    || case when v_con_tachados then format('and l.id = any (array(select t.lead_id from public.leads_tachados t where t.usuario_id = %L::uuid))', p_yo) else '' end,
    case when cardinality(v_m) > 0 then 'and ' || array_to_string(v_m, ' and ') else '' end,
    v_dir, v_dir, v_k + 1);
end $$;
revoke all on function public._leads_candidatos_sql(text, jsonb, uuid, public.alcance_permiso, uuid[]) from public, anon, authenticated;

create or replace function public.leads_candidatos(p_filtros jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_yo uuid := (select auth.uid());
  v_alcance public.alcance_permiso := public.alcance_de('leads.ver');
  v_fuera uuid[] := public._bajas_en_curso();
  v_k int := public._leads_candidatos_tope();
  v_s int := public._leads_candidatos_recorrido();
  v_ids uuid[]; v_scanned int; v_completa boolean; v_hasta jsonb; v_ultimo uuid; v_acotada boolean := false; v_ids_tramo uuid[]; v_scanned_tramo int; v_ultimo_tramo uuid;
  v_extra uuid[]; v_mas uuid[]; v_atras boolean := (p_filtros ->> 'sentido') = 'anterior';
  v_en timestamptz := nullif(p_filtros #>> '{cursor,creado_en}', '')::timestamptz;
  v_id uuid := nullif(p_filtros #>> '{cursor,id}', '')::uuid;
  v_hasta_en timestamptz; v_hasta_id uuid;
  v_con_etiquetas boolean := coalesce(jsonb_typeof(p_filtros -> 'etiquetas') = 'array', false);
  v_etiquetas uuid[] := public._leads_candidatos_etiquetas(p_filtros, (select auth.uid()));
  v_solo_indice boolean := false;
  -- El tope de un campo público (ver `_leads_candidatos_sql`): quien ve «todos» y filtra sólo por el texto o el rango de un campo público recorre como mucho 2,5 ventanas.
  v_acotado boolean := v_alcance = 'todos'
    and public._leads_candidatos_indexable(jsonb_build_object('comparaciones', p_filtros -> 'comparaciones'))
    and not public._leads_candidatos_indexable(p_filtros - 'comparaciones')
    and coalesce(p_filtros -> 'sin_tope' is distinct from 'true'::jsonb, true);
  v_recorrido int := case when v_acotado then (v_s * 5) / 2 else v_s end;
  v_n_mas int;
begin
  -- Sin sesión, sin permiso o sin forma: nada (y lo mismo que cuando no coincide nadie).
  if v_yo is null or v_alcance is null or p_filtros is null or jsonb_typeof(p_filtros) <> 'object' then
    return jsonb_build_object('ids', '[]'::jsonb, 'completa', true, 'hasta', null);
  end if;
  -- Una etiqueta con pocos leads (como mucho S) se resuelve por su índice, sin recorrer antes el orden del listado: cuesta lo que tiene la etiqueta, no lo que haya que caminar
  -- hasta encontrarlos (Ana, con una etiqueta en 300 de sus 9.500 leads, caminaba 4.000 filas: 22 ms, y 147 cuando las estadísticas de `leads_etiquetas` no estaban al día).
  if v_con_etiquetas and cardinality(v_etiquetas) > 0 then
    v_solo_indice := (select count(*) from (select 1 from public.leads_etiquetas le where le.etiqueta_id = any (v_etiquetas) limit v_s + 1) x) <= v_s;
  end if;
  -- Lo mismo con los tachados de quien llama (5a-34): si son pocos, se resuelve por ellos sin recorrer antes el orden del listado.
  if coalesce(p_filtros -> 'tachados' = 'true'::jsonb, false) then
    v_solo_indice := v_solo_indice or (select count(*) from (select 1 from public.leads_tachados t where t.usuario_id = v_yo limit v_s + 1) x) <= v_s;
  end if;
  -- Sin nada que buscarle al índice, un solo recorrido sin tope (no dos: el de S filas y después el entero).
  if public._leads_candidatos_indexable(p_filtros) and not v_solo_indice then
    execute public._leads_candidatos_sql('recorrer', p_filtros, v_yo, v_alcance, v_fuera) into v_ids, v_scanned, v_ultimo;
  else
    v_ids := '{}'::uuid[]; v_scanned := v_s;
  end if;
  -- El tope de un campo público: si las S primeras filas no juntaron los candidatos, el recorrido sigue desde donde quedó hasta 2,5 ventanas en total (un valor denso no paga más que antes:
  -- corta en las S primeras). Los candidatos del tramo van después de los primeros, en el mismo orden.
  if v_acotado and cardinality(v_ids) <= v_k and v_scanned >= v_s and v_ultimo is not null then
    select l.creado_en into v_hasta_en from public.leads l where l.id = v_ultimo;
    execute public._leads_candidatos_sql('recorrer', p_filtros || jsonb_build_object('cursor', jsonb_build_object('creado_en', v_hasta_en, 'id', v_ultimo), 'recorrido', v_recorrido - v_s), v_yo, v_alcance, v_fuera)
      into v_ids_tramo, v_scanned_tramo, v_ultimo_tramo;
    v_ids := (v_ids || v_ids_tramo)[1:v_k + 1];
    v_scanned := v_scanned + v_scanned_tramo;
    v_ultimo := coalesce(v_ultimo_tramo, v_ultimo);
  end if;
  -- Con el tope no hay segunda etapa: lo que no se recorrió se dice (`acotada`) y se sigue desde `hasta`.
  if coalesce(cardinality(v_ids), 0) <= v_k and v_scanned >= v_s and not v_acotado then
    execute public._leads_candidatos_sql('indice', p_filtros, v_yo, v_alcance, v_fuera) into v_ids, v_scanned, v_ultimo;
  end if;
  v_ids := coalesce(v_ids, '{}'::uuid[]);
  v_acotada := v_acotado and cardinality(v_ids) <= v_k and v_scanned >= v_recorrido and v_ultimo is not null;
  v_completa := cardinality(v_ids) <= v_k and not v_acotada;
  if v_acotada then
    -- Hasta dónde llegó el recorrido: el último lead que miró, en el orden del listado.
    select l.creado_en, l.id into v_hasta_en, v_hasta_id from public.leads l where l.id = v_ultimo;
    v_hasta := jsonb_build_object('creado_en', v_hasta_en, 'id', v_hasta_id);
  elsif not v_completa then
    select l.creado_en, l.id into v_hasta_en, v_hasta_id from public.leads l where l.id = v_ids[v_k];
    v_hasta := jsonb_build_object('creado_en', v_hasta_en, 'id', v_hasta_id);
    v_ids := v_ids[1:v_k];
  end if;
  -- Los ids que cuentan aunque el nombre no coincida (el lead con el número buscado): los visibles que caen en la ventana y cumplen lo mismo que ella.
  if jsonb_typeof(p_filtros -> 'extra') = 'array' then
    v_extra := array(select jsonb_array_elements_text(p_filtros -> 'extra'))::uuid[];
    execute public._leads_candidatos_sql('extra', p_filtros, v_yo, v_alcance, v_fuera) into v_mas, v_n_mas, v_ultimo using v_extra, v_completa, v_hasta_en, v_hasta_id;
    v_ids := array(select distinct u from unnest(v_ids || v_mas) u);
  end if;
  return jsonb_build_object('ids', to_jsonb(v_ids), 'completa', v_completa, 'hasta', v_hasta)
         || case when v_acotada then jsonb_build_object('acotada', true, 'recorridos', v_scanned) else '{}'::jsonb end;
end $$;
revoke all on function public.leads_candidatos(jsonb) from public, anon;
grant execute on function public.leads_candidatos(jsonb) to authenticated;
comment on function public.leads_candidatos(jsonb) is 'Los candidatos de una búsqueda del listado de leads (5a-fix-1b): los primeros K que cumplen, en el orden del listado y después del cursor, sólo de lo que quien llama ve, con si hay más y hasta dónde llegó. Sólo acota: la página la arma leads_vista_por_ids con las condiciones de siempre.';
