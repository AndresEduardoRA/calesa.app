-- La búsqueda por nombre no depende de cuántos leads hay (cierre 5a-fix-1b, `docs/PLAN.md` 5a-1).
--
-- Medido (`docs/RENDIMIENTO.md` › «Cierre 5a», A1 y «Cierre 5a-fix-1b»): la búsqueda por nombre era un `Seq Scan` de `leads` con la visibilidad y `ilike` como filtros
-- (207 ms la dueña con 212.000 leads). `ilike` y `@>` no son _leakproof_: bajo RLS no se evalúan antes que la policy y ningún índice los sostiene; y el plan genérico no
-- conoce a quien mira (`auth.uid()` es un InitPlan), así que ni siquiera recorre su cartera. Un término común (`Volumen`) ordenaba y calculaba las columnas caras de todo.
--
-- Dos pasos, como `#n`:
--  1. `leads_candidatos(p_filtros)` (`security definer`, clase L): saca de la fila los candidatos —los primeros K, en el orden del listado, después del cursor— y dice
--     si hay más y hasta dónde llegó. Quien mira, su alcance y las bajas en curso se calculan una vez y entran a la consulta como LITERALES: así el planificador conoce
--     el tamaño de la cartera. Sólo devuelve lo que `_lead_visible_para()` (la policy de `leads`) deja ver: ni los ids, ni `completa`, ni `hasta` salen de otra fila.
--     Dos etapas: (W) recorrer hasta S filas en el orden del listado (por la cartera de quien mira, o por `leads_listado_idx` si ve «todos») y quedarse con las que
--     cumplen; si junta K + 1 o recorrió todo, termina (un término común no pasa por el índice trigram, que no corta en K). Si no, (I) el índice.
--  2. `leads_vista_por_ids(p_leads)` (invocador, SQL inlineable): la página, con las mismas condiciones de siempre, también el `ilike`, que PostgREST suma. Lo correcto vive
--     en este paso; los candidatos sólo lo acotan, nunca de menos.
--
-- Índice: el de `nombre` pasa a incluir la cartera (las filas ajenas no llegan al heap: el tiempo de una búsqueda no cuenta cuántos leads de otras personas coinciden) y
-- `atributos_publicos` (un filtro por una columna común, 5a-fix-1a/1b). Parcial: sin lo de la papelera ni el limbo. `fastupdate = on` con `gin_pending_list_limit = 256` kB: con
-- `off` cada update de `leads` (casi ninguno es HOT) mete sus ~30 claves directo en los árboles y la baja de 200.000 tardaba 11 corridas del job (18 s) contra 6 (10 s) sin
-- el índice nuevo; con la lista pendiente de 256 kB, 9 (15 s) e importar 500 filas 1.165 ms (razón entre pasadas 1,04). Una búsqueda lee, como mucho, esos 256 kB de más (el
-- predeterminado son 4 MB). Sin n-gramas: servir términos de 1 y 2 caracteres con un índice multiplicaba por 2,5 el costo de un alta (500 altas de 1,1–1,7 s a 2,8–3,7 s) y rompía el tope de
-- la importación. Los términos sin un tramo de 3 caracteres recorren la cartera (`docs/PLAN.md`).

-- El patrón «contiene» de un `ilike`: lo escrito es literal; `*` es «un carácter». Espejo de `patronContiene()` (`shared/lib/supabase/consultas.ts`); un caso de
-- `busqueda-leads.sql` y un test de Vitest sobre PGlite los comparan.
create or replace function public._lead_busqueda_patron(p_texto text)
returns text language sql immutable parallel safe set search_path = '' as $$
  select '%' || replace(replace(replace(replace(p_texto, '\', '\\'), '%', '\%'), '_', '\_'), '*', '_') || '%'
$$;
revoke all on function public._lead_busqueda_patron(text) from public, anon, authenticated;

-- Los dos números de la búsqueda, en un solo lugar. K: cuántos candidatos por ventana (la página más grande son 100 + 1, y los filtros de quien mira —tachados— quitan algunos);
-- S: hasta cuántas filas se recorren en el orden del listado antes de ir al índice (K / S = la densidad desde la cual el índice, que no corta en K, cuesta menos que recorrer).
create or replace function public._leads_candidatos_tope() returns integer language sql immutable parallel safe set search_path = '' as $$ select 300 $$;
create or replace function public._leads_candidatos_recorrido() returns integer language sql immutable parallel safe set search_path = '' as $$ select 4000 $$;
revoke all on function public._leads_candidatos_tope(), public._leads_candidatos_recorrido() from public, anon, authenticated;

-- ¿Tiene el índice algo que buscar? Un tramo de 3 letras o dígitos en el texto (sus trigramas) o un campo público. Sin eso (`x`, `zq`, `a_b`, `%`) un GIN
-- recorrería su columna entera: la búsqueda es un recorrido por el orden del listado, una sola vez y sin tope (`leads_candidatos`).
create or replace function public._leads_candidatos_indexable(p_filtros jsonb)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select coalesce(nullif(p_filtros ->> 'texto', '') ~ '[[:alnum:]]{3}', false)
      or coalesce(jsonb_array_length(case when jsonb_typeof(p_filtros -> 'atributos') = 'array' then p_filtros -> 'atributos' end), 0) > 0
$$;
revoke all on function public._leads_candidatos_indexable(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- El índice
-- ---------------------------------------------------------------------------------------------------------------------
drop index if exists public.leads_nombre_trgm;
create index if not exists leads_busqueda_idx on public.leads
  using gin (cartera, nombre extensions.gin_trgm_ops, atributos_publicos jsonb_path_ops) with (fastupdate = on, gin_pending_list_limit = 256)
  where eliminado_en is null and cartera <> '{}';

-- ---------------------------------------------------------------------------------------------------------------------
-- Paso 1: el texto de cada etapa y la función
-- ---------------------------------------------------------------------------------------------------------------------
-- Las condiciones de `p_filtros` (todas opcionales; todas sólo acotan, el paso 2 las vuelve a aplicar):
--   texto (el nombre que se busca), mios, tipos [uuid], origenes [uuid], atributos [[{…}, {…}], …] (un Y de Os de `@>` sobre `atributos_publicos`),
--   cursor {creado_en, id} y sentido ('siguiente' | 'anterior'), extra [uuid] (ids que cuentan aunque no coincida el nombre: el lead con el número buscado).
-- `p_etapa`: 'recorrer' (W) o 'indice' (I). Devuelve la consulta; `leads_candidatos` la ejecuta y la prueba la explica.
create or replace function public._leads_candidatos_sql(p_etapa text, p_filtros jsonb, p_yo uuid, p_alcance public.alcance_permiso, p_fuera uuid[])
returns text language plpgsql stable set search_path = '' as $$
declare
  v_k int := public._leads_candidatos_tope();
  v_s int := public._leads_candidatos_recorrido();
  v_texto text := nullif(p_filtros ->> 'texto', '');
  v_patron text;
  v_mios boolean := coalesce((p_filtros ->> 'mios')::boolean, false) or p_alcance = 'propios';
  v_atras boolean := (p_filtros ->> 'sentido') = 'anterior';
  v_dir text := case when v_atras then 'asc' else 'desc' end;
  v_cmp text := case when v_atras then '>' else '<' end;
  v_en timestamptz := nullif(p_filtros #>> '{cursor,creado_en}', '')::timestamptz;
  v_id uuid := nullif(p_filtros #>> '{cursor,id}', '')::uuid;
  v_visible text;
  v_cursor_l text := 'true';
  v_cursor_la text := 'true';
  v_m text[] := '{}'::text[];
  v_grupo jsonb; v_alt jsonb; v_alts text[];
  v_etapa text := p_etapa;
  v_limite int := v_s;
begin
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
  if jsonb_typeof(p_filtros -> 'atributos') = 'array' then
    for v_grupo in select * from jsonb_array_elements(p_filtros -> 'atributos') loop
      v_alts := '{}';
      for v_alt in select * from jsonb_array_elements(v_grupo) loop
        v_alts := v_alts || format('l.atributos_publicos @> %L::jsonb', v_alt);
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
    case when v_mios then format('and l.cartera @> array[%L]::uuid[]', p_yo) else '' end,
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
begin
  -- Sin sesión, sin permiso o sin forma: nada (y lo mismo que cuando no coincide nadie).
  if v_yo is null or v_alcance is null or p_filtros is null or jsonb_typeof(p_filtros) <> 'object' then
    return jsonb_build_object('ids', '[]'::jsonb, 'completa', true, 'hasta', null);
  end if;
  -- Sin nada que buscarle al índice, un solo recorrido sin tope (no dos: el de S filas y después el entero).
  if public._leads_candidatos_indexable(p_filtros) then
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
       and (v_en is null or v_id is null or case when v_atras then (l.creado_en, l.id) > (v_en, v_id) else (l.creado_en, l.id) < (v_en, v_id) end)
       and (v_completa or case when v_atras then (l.creado_en, l.id) <= (v_hasta_en, v_hasta_id) else (l.creado_en, l.id) >= (v_hasta_en, v_hasta_id) end);
    v_ids := array(select distinct u from unnest(v_ids || v_mas) u);
  end if;
  return jsonb_build_object('ids', to_jsonb(v_ids), 'completa', v_completa, 'hasta', v_hasta);
end $$;
revoke all on function public.leads_candidatos(jsonb) from public, anon;
grant execute on function public.leads_candidatos(jsonb) to authenticated;
comment on function public.leads_candidatos(jsonb) is 'Los candidatos de una búsqueda del listado de leads (5a-fix-1b): los primeros K que cumplen, en el orden del listado y después del cursor, sólo de lo que quien llama ve, con si hay más y hasta dónde llegó. Sólo acota: la página la arma leads_vista_por_ids con las condiciones de siempre.';

-- ---------------------------------------------------------------------------------------------------------------------
-- Paso 2: la función entra a `_leads_vista_crear()` (una función que devuelve el tipo de `leads_vista` impide borrarla)
-- ---------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._leads_vista_crear()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_columnas text;
begin
  drop function if exists public.leads_vista_por_ids(uuid[]);
  drop view if exists public.leads_cartera_vista;
  drop view if exists public.leads_vista;
  create view public.leads_vista with (security_invoker = true) as
  select l.id,
         (select g.numero from public.leads_numeros_globales g where g.lead_id = l.id) as numero,
         l.nombre, l.telefono_cc,
         public.telefono_lead(l.id) as telefono_principal,
         coalesce((select auth.uid()) = any (l.cartera), false) as telefono_visible,
         l.tipo_lead_id, l.origen_lead_id,
         public.atributos_lead(l.id) as atributos,
         l.creado_por, l.ultimo_seguimiento_en, l.creado_en, l.actualizado_en,
         (fav.lead_id is not null) as es_favorito,
         (tach.lead_id is not null) as esta_tachado,
         (select la.usuario_id from public.leads_asesores la where la.lead_id = l.id and la.tipo_acceso = 'dueno' and la.revocado_en is null
                                                         and la.usuario_id <> all ((select public._bajas_en_curso())::uuid[])) as dueno_id,
         coalesce((select auth.uid()) = any (l.cartera), false) as en_cartera,
         array(select le.etiqueta_id from public.leads_etiquetas le join public.etiquetas e on e.id = le.etiqueta_id
                where le.lead_id = l.id and e.usuario_id = (select auth.uid()) order by le.etiqueta_id) as etiquetas,
         (select np.numero from public.leads_numeros_propios np where np.lead_id = l.id) as numero_propio,
         (select np.creado_por from public.leads_numeros_propios np where np.lead_id = l.id) as numero_propio_de,
         (select coalesce((select nullif(btrim(p.nombre), '') from public.perfiles p where p.id = np.creado_por), 'Otra persona')
            from public.leads_numeros_propios np
           where np.lead_id = l.id and np.creado_por <> (select auth.uid())) as numero_propio_creador,
         coalesce((select g.numero from public.leads_numeros_globales g where g.lead_id = l.id),
                  (select np.numero::bigint from public.leads_numeros_propios np where np.lead_id = l.id)) as numero_visible,
         l.atributos_publicos
  from public.leads l
  left join public.leads_favoritos fav on fav.lead_id = l.id and fav.usuario_id = (select auth.uid())
  left join public.leads_tachados tach on tach.lead_id = l.id and tach.usuario_id = (select auth.uid());
  grant select on public.leads_vista to authenticated;
  comment on view public.leads_vista is 'Lo que la app lee de los leads: teléfono enmascarado y atributos recortados según la cartera (atributos), y la copia de lo público (atributos_publicos, para filtrar un campo público). en_cartera = el lead está en la cartera de quien mira («míos»), de leads.cartera. Las marcas son de quien mira. security_invoker: la RLS de leads decide qué filas hay.';

  -- «Míos» por la cartera de quien mira: las mismas columnas, en el mismo orden, con `id` y `creado_en` de la fila de la cartera.
  select string_agg(
           case a.attname
             when 'id' then 'la.lead_id as id'
             when 'creado_en' then 'la.lead_creado_en as creado_en'
             when 'en_cartera' then 'true as en_cartera'
             when 'telefono_visible' then 'true as telefono_visible'
             else 'v.' || quote_ident(a.attname)
           end, ', ' order by a.attnum)
    into v_columnas
    from pg_attribute a
   where a.attrelid = 'public.leads_vista'::regclass and a.attnum > 0 and not a.attisdropped;
  execute 'create view public.leads_cartera_vista with (security_invoker = true) as select ' || v_columnas
       || ' from public.leads_asesores la join public.leads_vista v on v.id = la.lead_id'
       || ' where la.usuario_id = (select auth.uid()) and la.revocado_en is null';
  revoke all on public.leads_cartera_vista from anon;
  grant select on public.leads_cartera_vista to authenticated;
  comment on view public.leads_cartera_vista is 'leads_vista de los leads que están en la cartera de quien mira («míos»), recorridos por su cartera (leads_asesores_listado_idx) y no por la tabla: cuesta lo que pesa la cartera de quien mira, no cuántos leads hay (cierre 5a-fix-1a). Mismas columnas que leads_vista; id y creado_en salen de la fila de la cartera y en_cartera y telefono_visible son verdaderas por construcción. security_invoker: la regla de visibilidad (la policy de leads) se aplica igual. Lo que no es «míos» se lee de leads_vista.';
  -- La página de una búsqueda por candidatos (5a-fix-1b): `leads_vista` de los leads con esos ids. Invocador y SQL puro, `stable`, sin `strict`, sin `set` y sin
  -- `security definer`: así Postgres la inlinea en la consulta de PostgREST y los filtros, el cursor, el orden y el límite que le suma la app se empujan adentro
  -- (las columnas caras sólo se calculan para las filas que salen). Con cualquiera de esas cinco cosas deja de inlinearse y calcula todas las filas de los ids.
  -- Una prueba del catálogo (`busqueda-leads.sql`) falla si pierde esa forma. La RLS de `leads` decide, como siempre, qué filas hay.
  create function public.leads_vista_por_ids(p_leads uuid[]) returns setof public.leads_vista
    language sql stable as $por_ids$ select * from public.leads_vista v where v.id = any (p_leads) $por_ids$;
  revoke all on function public.leads_vista_por_ids(uuid[]) from public, anon;
  grant execute on function public.leads_vista_por_ids(uuid[]) to authenticated;
  comment on function public.leads_vista_por_ids(uuid[]) is 'leads_vista de los leads con esos ids (el segundo paso de la búsqueda por candidatos, 5a-fix-1b). Invocador: la RLS de leads decide qué filas hay. Se inlinea en la consulta de PostgREST: no le pongas strict, search_path, security definer ni volatile.';
end;
$function$;

revoke all on function public._leads_vista_crear() from public, anon, authenticated;
select public._leads_vista_crear();

analyze public.leads;
