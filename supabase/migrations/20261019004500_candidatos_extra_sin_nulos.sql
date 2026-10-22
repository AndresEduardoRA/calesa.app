-- El lead del número buscado entra a los candidatos aunque el pedido no traiga etiquetas (paso 4.03, `docs/PLAN.md` 5a-35).
--
-- Un número de 3 o más dígitos escrito sin «#» (482) se pide a `leads_candidatos()` como el texto más `extra`, el lead que tiene ese número: tiene que entrar aunque ningún nombre lo
-- contenga. Desde `…20261019003500` (5a-7, 2026-10-19) no entraba nunca si el pedido no traía la clave `etiquetas`: `v_con_etiquetas := jsonb_typeof(p_filtros -> 'etiquetas') = 'array'`
-- vale NULL cuando la clave no está (`jsonb_typeof(NULL)` es NULL), `not v_con_etiquetas or exists (…)` vale NULL y la cláusula de `extra` descartaba la fila. Con `…20261019003300`
-- (2026-10-18), antes de 5a-7, funcionaba. En la pantalla: la dueña buscando 482, «Nada coincide con los filtros».
--
-- Se pasa por `coalesce(…, false)` en las dos funciones donde aparece (`_leads_candidatos_sql` y `leads_candidatos`; en la primera todos los usos eran seguros —`if`, `case`—, pero un
-- booleano que puede ser nulo no se deja). Quién ve qué no cambia: el lead del número entra sólo si pasa `_lead_visible_para()` (cartera, o lo que ve quien ve «todos»), y sigue exigiendo
-- las etiquetas y los campos privados cuando vienen. Sin función nueva en `public`: las firmas son las de antes y `database.types.ts` no cambia. El costo de 5a-10 no cambia: la
-- cláusula de `extra` sólo corre si el pedido trae `extra`.

create or replace function public._leads_candidatos_sql(p_etapa text, p_filtros jsonb, p_yo uuid, p_alcance public.alcance_permiso, p_fuera uuid[])
returns text language plpgsql stable set search_path = '' as $$
declare
  v_k int := public._leads_candidatos_tope();
  v_s int := public._leads_candidatos_recorrido();
  v_texto text := nullif(p_filtros ->> 'texto', '');
  v_patron text;
  -- Un campo privado sólo lo tiene la cartera de quien llama (`atributos_lead()` no le entrega ese dato a nadie más): filtrar por uno es leer «míos», lo pida o no el cliente.
  v_con_privados boolean := coalesce(jsonb_array_length(case when jsonb_typeof(p_filtros -> 'privados') = 'array' then p_filtros -> 'privados' end), 0) > 0;
  v_mios boolean := coalesce((p_filtros ->> 'mios')::boolean, false) or p_alcance = 'propios' or v_con_privados;
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
  v_etapa text := p_etapa;
  v_limite int := v_s;
begin
  -- Etiquetas pedidas y ninguna es de quien mira (una que nadie tiene, una ajena, un id que no existe): no hay candidatos, y no se recorre nada. Lo mismo que «ninguna»: nadie
  -- sabe, por el tiempo ni por lo que vuelve, si la etiqueta existe o es de otra persona.
  if v_con_etiquetas and cardinality(v_etiquetas) = 0 then
    return 'select ''{}''::uuid[], 0';
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
  if v_texto is not null then
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
  if v_etapa = 'recorrer' then
    -- Hasta S filas visibles en el orden del listado, y de ellas las que cumplen. «Míos» y «propios» por la cartera de quien mira
    -- (`leads_asesores_listado_idx`, como `leads_cartera_vista`); «todos» por `leads_listado_idx`. Dice cuántas recorrió (menos de S = recorrió todo).
    if v_mios and v_limite = 2147483647 then
      -- Sin tope (un término sin nada que buscarle al índice): los primeros K + 1 que cumplen, **cortando al juntarlos**. Si la unión se agregara entera (el `array_agg … filter` de abajo), un
      -- término denso de 1 o 2 caracteres recorrería toda la cartera de la dueña (212 ms con 212.000 leads) en vez de parar en la primera página.
      return format($q$select coalesce(array_agg(w.id order by w.creado_en %s, w.id %s), '{}'::uuid[]), count(*)::int
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
      return format($q$select coalesce((array_agg(w.id order by w.creado_en %s, w.id %s) filter (where w.m))[1:%s], '{}'::uuid[]), count(*)::int
          from (select x.lead_id as id, x.lead_creado_en as creado_en, l.m
                  from (select la.lead_id, la.lead_creado_en from public.leads_asesores la
                         where la.usuario_id = %L::uuid and la.revocado_en is null and %s
                         order by la.lead_creado_en %s, la.lead_id %s limit %s) x
                  left join lateral (select (%s) as m from public.leads l where l.id = x.lead_id and %s limit 1) l on true) w$q$,
        v_dir, v_dir, v_k + 1, p_yo, v_cursor_la, v_dir, v_dir, v_limite, coalesce(nullif(array_to_string(v_m, ' and '), ''), 'true'), v_visible);
    end if;
    return format($q$select coalesce((array_agg(w.id order by w.creado_en %s, w.id %s) filter (where w.m))[1:%s], '{}'::uuid[]), count(*)::int
        from (select l.id, l.creado_en, (%s) as m from public.leads l where %s and %s
               order by l.creado_en %s, l.id %s limit %s) w$q$,
      v_dir, v_dir, v_k + 1, coalesce(nullif(array_to_string(v_m, ' and '), ''), 'true'), v_visible, v_cursor_l, v_dir, v_dir, v_limite);
  end if;
  -- El índice: los primeros K + 1 que cumplen, en el orden. Con «míos» la cartera entra al índice y las filas ajenas no se leen.
  return format($q$select coalesce(array_agg(x.id order by x.creado_en %s, x.id %s), '{}'::uuid[]), count(*)::int
      from (select l.id, l.creado_en from public.leads l where %s and %s %s %s
             order by l.creado_en %s, l.id %s limit %s) x$q$,
    v_dir, v_dir, v_visible, v_cursor_l,
    case when v_mios then format('and l.cartera @> array[%L]::uuid[]', p_yo) else '' end
    -- Con etiquetas, el índice de `leads_etiquetas` (por `etiqueta_id`) dice cuáles son: sin esto el planificador camina `leads_listado_idx` y calcula las etiquetas de cada fila (368 ms).
    || case when v_con_etiquetas then format('and l.id = any (array(select le.lead_id from public.leads_etiquetas le where le.etiqueta_id = any (%L::uuid[])))', v_etiquetas) else '' end,
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
  v_ids uuid[]; v_scanned int; v_completa boolean; v_hasta jsonb;
  v_extra uuid[]; v_mas uuid[]; v_atras boolean := (p_filtros ->> 'sentido') = 'anterior';
  v_en timestamptz := nullif(p_filtros #>> '{cursor,creado_en}', '')::timestamptz;
  v_id uuid := nullif(p_filtros #>> '{cursor,id}', '')::uuid;
  v_hasta_en timestamptz; v_hasta_id uuid;
  v_con_etiquetas boolean := coalesce(jsonb_typeof(p_filtros -> 'etiquetas') = 'array', false);
  v_etiquetas uuid[] := public._leads_candidatos_etiquetas(p_filtros, (select auth.uid()));
  v_con_privados boolean := coalesce(jsonb_array_length(case when jsonb_typeof(p_filtros -> 'privados') = 'array' then p_filtros -> 'privados' end), 0) > 0;
  v_solo_indice boolean := false;
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
  -- Sin nada que buscarle al índice, un solo recorrido sin tope (no dos: el de S filas y después el entero).
  if public._leads_candidatos_indexable(p_filtros) and not v_solo_indice then
    execute public._leads_candidatos_sql('recorrer', p_filtros, v_yo, v_alcance, v_fuera) into v_ids, v_scanned;
  else
    v_ids := '{}'::uuid[]; v_scanned := v_s;
  end if;
  if coalesce(cardinality(v_ids), 0) <= v_k and v_scanned >= v_s then
    execute public._leads_candidatos_sql('indice', p_filtros, v_yo, v_alcance, v_fuera) into v_ids, v_scanned;
  end if;
  v_ids := coalesce(v_ids, '{}'::uuid[]);
  v_completa := cardinality(v_ids) <= v_k;
  if not v_completa then
    select l.creado_en, l.id into v_hasta_en, v_hasta_id from public.leads l where l.id = v_ids[v_k];
    v_hasta := jsonb_build_object('creado_en', v_hasta_en, 'id', v_hasta_id);
    v_ids := v_ids[1:v_k];
  end if;
  -- Los ids que cuentan aunque el nombre no coincida (el lead con el número buscado): los visibles que caen en la ventana.
  if jsonb_typeof(p_filtros -> 'extra') = 'array' then
    v_extra := array(select jsonb_array_elements_text(p_filtros -> 'extra'))::uuid[];
    select coalesce(array_agg(l.id), '{}'::uuid[]) into v_mas
      from public.leads l
     where l.id = any (v_extra) and l.eliminado_en is null and l.cartera <> '{}'
       and public._lead_visible_para(l.eliminado_en, l.cartera, v_alcance, v_yo, v_fuera)
       and (not v_con_etiquetas or exists (select 1 from public.leads_etiquetas le where le.lead_id = l.id and le.etiqueta_id = any (v_etiquetas)))
       -- La página ya no repite un campo privado (5a-10): el lead del número tiene que estar en la cartera de quien llama y cumplirlo, como los demás candidatos.
       and (not v_con_privados or (v_yo = any (l.cartera)
            -- un Y de Os de `@>` sobre `atributos`, como la consulta de la ventana; un grupo vacío o que no es un arreglo no filtra
            and not exists (select 1 from jsonb_array_elements(p_filtros -> 'privados') g
                             where jsonb_typeof(g) = 'array' and jsonb_array_length(g) > 0
                               and not exists (select 1 from jsonb_array_elements(g) a where l.atributos @> a))))
       and (v_en is null or v_id is null or case when v_atras then (l.creado_en, l.id) > (v_en, v_id) else (l.creado_en, l.id) < (v_en, v_id) end)
       and (v_completa or case when v_atras then (l.creado_en, l.id) <= (v_hasta_en, v_hasta_id) else (l.creado_en, l.id) >= (v_hasta_en, v_hasta_id) end);
    v_ids := array(select distinct u from unnest(v_ids || v_mas) u);
  end if;
  return jsonb_build_object('ids', to_jsonb(v_ids), 'completa', v_completa, 'hasta', v_hasta);
end $$;
revoke all on function public.leads_candidatos(jsonb) from public, anon;
grant execute on function public.leads_candidatos(jsonb) to authenticated;
comment on function public.leads_candidatos(jsonb) is 'Los candidatos de una búsqueda del listado de leads (5a-fix-1b): los primeros K que cumplen, en el orden del listado y después del cursor, sólo de lo que quien llama ve, con si hay más y hasta dónde llegó. Sólo acota: la página la arma leads_vista_por_ids con las condiciones de siempre.';
