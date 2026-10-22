-- @test búsqueda-leads (5a-fix-1b): el terreno
-- La búsqueda por candidatos (`leads_candidatos` + `leads_vista_por_ids`, migración `…003300`) tiene que devolver, para cada persona, cada término y cada
-- filtro, las MISMAS filas —las filas enteras, en el mismo orden— que la consulta de siempre (`leads_vista` o `leads_cartera_vista` con `ilike`), y no revelar
-- nada de lo que quien busca no ve. Corre después de `listado-cartera.sql`: usa sus personas (f1 a f6, la dueña) y sus leads, y suma los suyos con los nombres
-- «no felices»: comodines, barra, comillas, tildes, ñ y mayúsculas, la papelera, el limbo, una baja en curso y más coincidencias que la ventana.
insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-0000-0000-0000000009f7', 'busqueda-sin-permiso@ejemplo.com', '{"invitado": true}');
do $$ declare
  v_web uuid := (select id from public.origenes_lead where clave = 'web');
  f2 constant uuid := '00000000-0000-0000-0000-0000000009f2'; f3 constant uuid := '00000000-0000-0000-0000-0000000009f3';
  f4 constant uuid := '00000000-0000-0000-0000-0000000009f4'; f6 constant uuid := '00000000-0000-0000-0000-0000000009f6';
  d1 constant uuid := '00000000-0000-0000-0000-000000000001'; i int;
begin
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos) values
    ('Búsqueda Ñandú 50% desc_uento', '78940001', f4, v_web, '{"ciudad": "Sucre"}'),
    ('Búsqueda barra \ y "comillas" d''Angelo', '78940002', f4, v_web, '{"ciudad": "Oruro"}'),
    ('Búsqueda Gómez Acentuado', '78940003', f3, v_web, '{"ciudad": "Sucre"}'),
    ('Búsqueda GOMEZ mayúsculas', '78940004', f3, v_web, '{}'),
    ('Búsqueda gomez minúsculas', '78940005', f2, v_web, '{"ciudad": "Sucre"}'),
    ('Búsqueda papelera Gómez', '78940006', f4, v_web, '{}'),
    ('Búsqueda limbo Gómez', '78940007', f3, v_web, '{}'),
    ('Búsqueda de quien se va Gómez', '78940008', f6, v_web, '{}'),
    ('Búsqueda 124', '78940009', f2, v_web, '{}'),
    ('Búsqueda de la dueña Gómez', '78940010', d1, v_web, '{"ciudad": "Sucre"}');
  for i in 1..14 loop
    insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
      values ('Búsqueda masiva ' || i, '7895' || lpad(i::text, 4, '0'), case when i % 3 = 0 then f3 else f4 end, v_web,
              case when i % 2 = 0 then '{"ciudad": "Sucre"}'::jsonb else '{"ciudad": "Oruro"}'::jsonb end);
  end loop;
  -- Fechas entreveradas: el orden del listado no es el de inserción.
  update public.leads set creado_en = now() - make_interval(mins => (abs(hashtext(nombre)) % 7000)) where nombre like 'Búsqueda %';
  update public.leads set eliminado_en = now() where nombre = 'Búsqueda papelera Gómez';
  update public.leads_asesores set revocado_en = now(), revocado_por = f3 where lead_id = (select id from public.leads where nombre = 'Búsqueda limbo Gómez');
  -- Las marcas de f4 para combinar filtros.
  insert into public.leads_tachados (lead_id, usuario_id) select id, f4 from public.leads where nombre in ('Búsqueda masiva 2', 'Búsqueda masiva 5');
  insert into public.leads_favoritos (lead_id, usuario_id) select id, f4 from public.leads where nombre in ('Búsqueda masiva 1', 'Búsqueda masiva 4', 'Búsqueda Ñandú 50% desc_uento');
  -- Un lead con otro tipo para el filtro de tipo.
  update public.leads set tipo_lead_id = (select id from public.tipos_lead where clase = 'cliente' and activo order by orden limit 1) where nombre in ('Búsqueda masiva 3', 'Búsqueda masiva 6');
end $$;

-- La sesión de una persona para una sentencia (como PostgREST).
create or replace function pg_temp.bl_como(p_quien uuid, p_sql text) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  execute p_sql into r;
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  return r;
exception when others then
  reset role;
  raise;
end $$;

-- La consulta de siempre: la vista que elige `fuenteDelListado()` y las condiciones tal cual (`ilike` incluido).
create or replace function pg_temp.bl_viejo(p_quien uuid, p_rel text, p_donde text, p_tamano int, p_atras boolean, p_cursor_en timestamptz, p_cursor_id uuid) returns jsonb language sql as $$
  select pg_temp.bl_como(p_quien, format($q$select coalesce(jsonb_agg(to_jsonb(v) order by v.creado_en %s, v.id %s), '[]') from
      (select * from public.%I x where (%s) and %s order by x.creado_en %s, x.id %s limit %s) v$q$,
    case when p_atras then 'asc' else 'desc' end, case when p_atras then 'asc' else 'desc' end, p_rel, p_donde,
    case when p_cursor_en is null then 'true' when p_atras then format('(x.creado_en >= %L and (x.creado_en > %L or x.id > %L))', p_cursor_en, p_cursor_en, p_cursor_id)
         else format('(x.creado_en <= %L and (x.creado_en < %L or x.id < %L))', p_cursor_en, p_cursor_en, p_cursor_id) end,
    case when p_atras then 'asc' else 'desc' end, case when p_atras then 'asc' else 'desc' end, p_tamano + 1));
$$;

-- Lo que hace la app (`leerPorCandidatos`): pide una ventana, lee la página de sus ids con lo que queda, y si no se llenó y había más, pide la que sigue.
-- `p_empuja` es lo que va al paso 1 además del texto (tipos, orígenes, campos públicos) y `p_resto` lo que la página sigue aplicando.
create or replace function pg_temp.bl_nuevo(p_quien uuid, p_texto text, p_extra uuid[], p_mios boolean, p_empuja jsonb, p_resto text, p_tamano int, p_atras boolean, p_cursor_en timestamptz, p_cursor_id uuid)
returns jsonb language plpgsql as $$
declare
  v_juntas jsonb := '[]'; v_en timestamptz := p_cursor_en; v_id uuid := p_cursor_id; v_r jsonb; v_ids uuid[]; v_ventanas int := 0;
  v_dir text := case when p_atras then 'asc' else 'desc' end;
  v_cursor text := case when p_cursor_en is null then 'true' when p_atras then format('(x.creado_en >= %L and (x.creado_en > %L or x.id > %L))', p_cursor_en, p_cursor_en, p_cursor_id)
                        else format('(x.creado_en <= %L and (x.creado_en < %L or x.id < %L))', p_cursor_en, p_cursor_en, p_cursor_id) end;
begin
  loop
    v_r := pg_temp.bl_como(p_quien, format('select public.leads_candidatos(%L::jsonb)',
      (jsonb_build_object('sentido', case when p_atras then 'anterior' else 'siguiente' end, 'mios', p_mios) || p_empuja
        || case when p_texto is null then '{}'::jsonb else jsonb_build_object('texto', p_texto) end
        || case when v_en is null then '{}'::jsonb else jsonb_build_object('cursor', jsonb_build_object('creado_en', v_en, 'id', v_id)) end
        || case when p_extra is null then '{}'::jsonb else jsonb_build_object('extra', to_jsonb(p_extra)) end)::text));
    v_ids := array(select jsonb_array_elements_text(v_r -> 'ids'))::uuid[];
    if cardinality(v_ids) > 0 then
      v_juntas := v_juntas || pg_temp.bl_como(p_quien, format($q$select coalesce(jsonb_agg(to_jsonb(v) order by v.creado_en %s, v.id %s), '[]') from
          (select * from public.leads_vista_por_ids(%L::uuid[]) x where (%s) and %s order by x.creado_en %s, x.id %s limit %s) v$q$,
        v_dir, v_dir, v_ids, p_resto, v_cursor, v_dir, v_dir, p_tamano + 1 - jsonb_array_length(v_juntas)));
    end if;
    exit when jsonb_array_length(v_juntas) > p_tamano or (v_r ->> 'completa')::boolean;
    v_en := (v_r #>> '{hasta,creado_en}')::timestamptz; v_id := (v_r #>> '{hasta,id}')::uuid;
    v_ventanas := v_ventanas + 1;
    if v_ventanas > 400 or v_en is null then raise exception 'las ventanas no terminan (% ventanas) para %', v_ventanas, v_r; end if;
  end loop;
  return v_juntas;
end $$;

-- Una pasada completa por el listado, de a `p_tamano`, con el cursor que arma `armarPagina`: la última fila mostrada (hacia atrás, la primera al revés).
create or replace function pg_temp.bl_recorre(p_nuevo boolean, p_quien uuid, p_rel text, p_donde text, p_texto text, p_extra uuid[], p_mios boolean, p_empuja jsonb, p_resto text, p_tamano int, p_atras boolean)
returns jsonb language plpgsql as $$
declare v_todas jsonb := '[]'; v_pag jsonb; v_en timestamptz; v_id uuid; v_ultima jsonb; v_paginas int := 0;
begin
  loop
    v_pag := case when p_nuevo then pg_temp.bl_nuevo(p_quien, p_texto, p_extra, p_mios, p_empuja, p_resto, p_tamano, p_atras, v_en, v_id)
                  else pg_temp.bl_viejo(p_quien, p_rel, p_donde, p_tamano, p_atras, v_en, v_id) end;
    v_paginas := v_paginas + 1;
    v_todas := v_todas || (select coalesce(jsonb_agg(e order by o), '[]') from jsonb_array_elements(v_pag) with ordinality x(e, o) where o <= p_tamano);
    exit when jsonb_array_length(v_pag) <= p_tamano or v_paginas > 60;
    v_ultima := v_pag -> (p_tamano - 1);
    v_en := (v_ultima ->> 'creado_en')::timestamptz; v_id := (v_ultima ->> 'id')::uuid;
  end loop;
  return jsonb_build_object('filas', v_todas, 'paginas', v_paginas);
end $$;

-- @test búsqueda-leads: cada persona, cada término y cada filtro dan las mismas filas enteras que la consulta de siempre, con ventanas de 2, de 3 y de las de verdad
do $$ declare
  v_tope_original text := pg_get_functiondef('public._leads_candidatos_tope()'::regprocedure);
  v_recorrido_original text := pg_get_functiondef('public._leads_candidatos_recorrido()'::regprocedure);
  p record; t text; f record; c record; v_viejo jsonb; v_nuevo jsonb; v_cmp int := 0; v_con_filas int := 0;
  v_tipo uuid := (select id from public.tipos_lead where clase = 'prospecto' and activo order by orden limit 1);
  v_origen uuid := (select id from public.origenes_lead where clave = 'web');
  v_pat text; v_donde text; v_resto text;
begin
  for c in select * from (values (2, 3), (2, 100), (300, 4000)) x (k, s) loop
    execute format('create or replace function public._leads_candidatos_tope() returns integer language sql immutable parallel safe set search_path = %L as $f$ select %s $f$', '', c.k);
    execute format('create or replace function public._leads_candidatos_recorrido() returns integer language sql immutable parallel safe set search_path = %L as $f$ select %s $f$', '', c.s);
    for p in select * from (values
      ('sin leads', '00000000-0000-0000-0000-0000000009f1'::uuid, 'leads_cartera_vista', true),
      ('con uno', '00000000-0000-0000-0000-0000000009f2'::uuid, 'leads_cartera_vista', true),
      ('con tres', '00000000-0000-0000-0000-0000000009f3'::uuid, 'leads_cartera_vista', true),
      ('con muchos', '00000000-0000-0000-0000-0000000009f4'::uuid, 'leads_cartera_vista', true),
      ('«todos» con dos propios, en «míos»', '00000000-0000-0000-0000-0000000009f5'::uuid, 'leads_vista', true),
      ('«todos» con dos propios, en «todos»', '00000000-0000-0000-0000-0000000009f5'::uuid, 'leads_vista', false),
      ('que se va', '00000000-0000-0000-0000-0000000009f6'::uuid, 'leads_cartera_vista', true),
      ('la dueña, en «míos»', '00000000-0000-0000-0000-000000000001'::uuid, 'leads_vista', true),
      ('la dueña, en «todos»', '00000000-0000-0000-0000-000000000001'::uuid, 'leads_vista', false)) x (nombre, id, rel, mios) loop
      foreach t in array array['Búsqueda', 'Cartera', 'gómez', 'Gómez', 'GÓMEZ', 'gomez', 'GOMEZ', '50%', 'desc_uento', '\', 'y "comillas"', 'd''Angelo', 'Ñandú', 'ñandú',
                               'masiva', 'masiva 1', 'masiva 12', 'siete 2', 'zzzz', 'x', 'ab', 'a', 'o', '%', '_', 'a*a', '*', 'quien se va', 'Búsqueda 124'] loop
        v_pat := public._lead_busqueda_patron(t);
        for f in select * from (values
          ('sin más', 'true', '{}'::jsonb, 'true'),
          ('tachados ocultos', 'esta_tachado = false', '{}', 'esta_tachado = false'),
          ('sólo favoritos', 'es_favorito = true', '{}', 'es_favorito = true'),
          ('un tipo', format('tipo_lead_id = any (array[%L]::uuid[])', v_tipo), jsonb_build_object('tipos', jsonb_build_array(v_tipo)), format('tipo_lead_id = any (array[%L]::uuid[])', v_tipo)),
          ('un origen y tachados ocultos', format('origen_lead_id = any (array[%L]::uuid[]) and esta_tachado = false', v_origen), jsonb_build_object('origenes', jsonb_build_array(v_origen)),
             format('origen_lead_id = any (array[%L]::uuid[]) and esta_tachado = false', v_origen)),
          ('un campo público', 'atributos_publicos @> ''{"ciudad": "Sucre"}''', '{"atributos": [[{"ciudad": "Sucre"}]]}'::jsonb, 'true'),
          ('un campo público u otro', 'atributos_publicos @> ''{"ciudad": "Sucre"}'' or atributos_publicos @> ''{"ciudad": "Oruro"}''', '{"atributos": [[{"ciudad": "Sucre"}, {"ciudad": "Oruro"}]]}'::jsonb, 'true'),
          -- Un campo privado lo cumplen los candidatos, sólo de la cartera de quien filtra (5a-10, `privados-candidatos.sql` lo prueba a fondo): la página ya no lo repite.
          ('un campo privado', 'atributos @> ''{"direccion": "Calle privada 9"}''', '{"privados": [[{"direccion": "Calle privada 9"}]]}'::jsonb, 'true')) x (nombre, donde, empuja, resto) loop
          v_donde := format('nombre ilike %L and %s%s', v_pat, case when p.mios then 'en_cartera = true and ' else '' end, '(' || f.donde || ')');
          v_viejo := pg_temp.bl_viejo(p.id, p.rel, v_donde, 4, false, null, null);
          v_nuevo := pg_temp.bl_nuevo(p.id, t, null, p.mios, f.empuja, case when p.mios then 'en_cartera = true and ' else '' end || '(' || f.resto || ')', 4, false, null, null);
          v_cmp := v_cmp + 1;
          if jsonb_array_length(v_viejo) > 0 then v_con_filas := v_con_filas + 1; end if;
          if v_viejo is distinct from v_nuevo then
            raise exception E'% | término «%» | filtro «%» | ventana K=%, S=%: la búsqueda por candidatos no da lo de siempre\n  siempre: %\n  ahora:   %',
              p.nombre, t, f.nombre, c.k, c.s, (select jsonb_agg(e ->> 'nombre') from jsonb_array_elements(v_viejo) e), (select jsonb_agg(e ->> 'nombre') from jsonb_array_elements(v_nuevo) e);
          end if;
        end loop;
      end loop;
    end loop;
  end loop;
  execute v_tope_original; execute v_recorrido_original;
  if v_con_filas < 200 then raise exception 'la prueba casi no encontró nada (% de % comparaciones con filas): no prueba', v_con_filas, v_cmp; end if;
  raise notice 'búsqueda-leads: % comparaciones, % con filas', v_cmp, v_con_filas;
end $$;

-- @test búsqueda-leads: el recorrido entero por cursor, hacia los dos lados, da las mismas filas por los dos caminos (y cada fila una sola vez)
do $$ declare
  v_tope_original text := pg_get_functiondef('public._leads_candidatos_tope()'::regprocedure);
  v_recorrido_original text := pg_get_functiondef('public._leads_candidatos_recorrido()'::regprocedure);
  p record; t text; f record; c record; a jsonb; b jsonb; v_tam int; v_atras boolean; v_pat text; v_donde text; v_resto text; v_n int := 0; v_filas int := 0;
begin
  for c in select * from (values (2, 3), (3, 100), (300, 4000)) x (k, s) loop
    execute format('create or replace function public._leads_candidatos_tope() returns integer language sql immutable parallel safe set search_path = %L as $f$ select %s $f$', '', c.k);
    execute format('create or replace function public._leads_candidatos_recorrido() returns integer language sql immutable parallel safe set search_path = %L as $f$ select %s $f$', '', c.s);
    for p in select * from (values
      ('con muchos', '00000000-0000-0000-0000-0000000009f4'::uuid, 'leads_cartera_vista', true),
      ('con tres', '00000000-0000-0000-0000-0000000009f3'::uuid, 'leads_cartera_vista', true),
      ('la dueña, en «todos»', '00000000-0000-0000-0000-000000000001'::uuid, 'leads_vista', false),
      ('«todos» con dos propios, en «míos»', '00000000-0000-0000-0000-0000000009f5'::uuid, 'leads_vista', true)) x (nombre, id, rel, mios) loop
      foreach t in array array['Búsqueda', 'masiva', 'gómez', 'Cartera', 'zzzz', 'a'] loop
        v_pat := public._lead_busqueda_patron(t);
        for f in select * from (values ('sin más', 'true', 'true'), ('tachados ocultos', 'esta_tachado = false', 'esta_tachado = false')) x (nombre, donde, resto) loop
          v_donde := format('nombre ilike %L and %s(%s)', v_pat, case when p.mios then 'en_cartera = true and ' else '' end, f.donde);
          v_resto := case when p.mios then 'en_cartera = true and ' else '' end || '(' || f.resto || ')';
          foreach v_tam in array array[2, 5] loop
            foreach v_atras in array array[false, true] loop
              a := pg_temp.bl_recorre(false, p.id, p.rel, v_donde, null, null, p.mios, '{}', v_resto, v_tam, v_atras);
              b := pg_temp.bl_recorre(true, p.id, p.rel, v_donde, t, null, p.mios, '{}', v_resto, v_tam, v_atras);
              v_n := v_n + 1; v_filas := v_filas + jsonb_array_length(a -> 'filas');
              if a is distinct from b then
                raise exception E'% | «%» | % | de a % | % | K=%, S=%: el recorrido por candidatos no es el de siempre\n  siempre: % páginas, %\n  ahora:   % páginas, %', p.nombre, t, f.nombre, v_tam,
                  case when v_atras then 'hacia atrás' else 'hacia adelante' end, c.k, c.s, a ->> 'paginas', (select jsonb_agg(e ->> 'nombre') from jsonb_array_elements(a -> 'filas') e),
                  b ->> 'paginas', (select jsonb_agg(e ->> 'nombre') from jsonb_array_elements(b -> 'filas') e);
              end if;
              if (select count(distinct e ->> 'id') from jsonb_array_elements(b -> 'filas') e) <> jsonb_array_length(b -> 'filas') then
                raise exception '% | «%»: una fila salió dos veces al recorrer por ventanas', p.nombre, t;
              end if;
            end loop;
          end loop;
        end loop;
      end loop;
    end loop;
  end loop;
  execute v_tope_original; execute v_recorrido_original;
  if v_filas < 200 then raise exception 'los recorridos casi no trajeron filas (%): la prueba no prueba', v_filas; end if;
  raise notice 'búsqueda-leads: % recorridos, % filas', v_n, v_filas;
end $$;

-- @test búsqueda-leads: el texto es literal, sin importar el camino (un oráculo que no usa ilike: la posición del texto en el nombre)
do $$ declare p record; t text; v_esperados text; v_ids text; v_pat text;
begin
  for p in select * from (values
    ('00000000-0000-0000-0000-0000000009f4'::uuid, true), ('00000000-0000-0000-0000-0000000009f3'::uuid, true), ('00000000-0000-0000-0000-000000000001'::uuid, false)) x (id, mios) loop
    foreach t in array array['50%', '50', 'desc_uento', 'descuento', '\', 'y "comillas"', 'd''Angelo', 'barra \ y', 'masiva 1', 'Gómez', 'búsqueda', '%', '_', 'zzzz', 'a b'] loop
      -- lo que quien busca ve y contiene el texto, por posición (no por patrón)
      v_esperados := coalesce((select string_agg(id::text, ',' order by creado_en desc, id desc) from jsonb_to_recordset(pg_temp.bl_como(p.id,
          format($q$select coalesce(jsonb_agg(jsonb_build_object('id', id, 'creado_en', creado_en, 'nombre', nombre)), '[]') from public.leads_vista where %s(position(lower(%L) in lower(nombre)) > 0)$q$,
            case when p.mios then 'en_cartera and ' else '' end, t))) as x(id uuid, creado_en timestamptz, nombre text)), '');
      v_ids := coalesce((select string_agg(e ->> 'id', ',' order by (e ->> 'creado_en')::timestamptz desc, e ->> 'id' desc) from jsonb_array_elements(
          pg_temp.bl_nuevo(p.id, t, null, p.mios, '{}', case when p.mios then 'en_cartera' else 'true' end, 200, false, null, null)) e), '');
      if v_esperados is distinct from v_ids then
        raise exception 'persona % | «%»: por posición salen [%] y por candidatos [%]', p.id, t, v_esperados, v_ids;
      end if;
    end loop;
  end loop;
end $$;

-- @test búsqueda-leads: sin oráculo — lo que no se ve contesta lo mismo que un término sin nada: ni los ids, ni «completa», ni «hasta», ni un error
do $$ declare
  f2 constant uuid := '00000000-0000-0000-0000-0000000009f2'; f4 constant uuid := '00000000-0000-0000-0000-0000000009f4'; f7 constant uuid := '00000000-0000-0000-0000-0000000009f7';
  d1 constant uuid := '00000000-0000-0000-0000-000000000001'; nada jsonb; r jsonb; t text; q uuid; v_oculto uuid; v_ids uuid[]; v_mal jsonb;
begin
  nada := '{"ids": [], "completa": true, "hasta": null}';
  foreach q in array array[f2, f4, d1] loop
    for t in select unnest(array['papelera Gómez', 'limbo Gómez', 'quien se va Gómez', 'tres a', 'zzzz-nada-que-ver']) loop
      for r in select pg_temp.bl_como(q, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('texto', t, 'sentido', 'siguiente', 'mios', mios))) from (values (true), (false)) m (mios) loop
        -- «tres a» es de f3: lo ve sólo f3 y la dueña (con «todos»)
        if q = d1 and t = 'tres a' and not (r = nada) then continue; end if;
        if r is distinct from nada then
          raise exception 'persona % | «%»: debía contestar «nada» y contestó %', q, t, r;
        end if;
      end loop;
    end loop;
  end loop;
  -- El teléfono nunca se busca: los dígitos de un teléfono (de un lead que se ve o no) no encuentran nada.
  foreach q in array array[f4, d1] loop
    foreach t in array array['78940001', '7894', '78930011', '5895'] loop
      r := pg_temp.bl_como(q, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('texto', t, 'sentido', 'siguiente')));
      if r is distinct from nada then raise exception 'persona % | «%»: los dígitos de un teléfono encontraron algo: %', q, t, r; end if;
    end loop;
  end loop;
  -- Un lead que no se ve no entra como «el del número»: un id ajeno en `extra` no vuelve.
  select id into v_oculto from public.leads where nombre = 'Cartera tres a';
  r := pg_temp.bl_como(f2, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('texto', 'zzzz', 'extra', jsonb_build_array(v_oculto), 'sentido', 'siguiente')));
  if r is distinct from nada then raise exception 'un lead ajeno entró por «extra»: %', r; end if;
  select id into v_oculto from public.leads where nombre = 'Búsqueda papelera Gómez';
  r := pg_temp.bl_como(d1, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('texto', 'zzzz', 'extra', jsonb_build_array(v_oculto), 'sentido', 'siguiente')));
  if r is distinct from nada then raise exception 'un lead de la papelera entró por «extra»: %', r; end if;
  -- Todo id que sale es de un lead que quien busca ve (lo que ve la vista, que aplica la RLS).
  foreach q in array array[f2, f4, d1, '00000000-0000-0000-0000-0000000009f3'::uuid, '00000000-0000-0000-0000-0000000009f5'::uuid] loop
    foreach t in array array['Búsqueda', 'Gómez', 'masiva', 'Cartera', 'a', 'o'] loop
      r := pg_temp.bl_como(q, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('texto', t, 'sentido', 'siguiente')));
      v_ids := array(select jsonb_array_elements_text(r -> 'ids'))::uuid[];
      if (select count(*) from jsonb_array_elements_text(pg_temp.bl_como(q, format('select coalesce(jsonb_agg(id), ''[]'') from public.leads_vista where id = any (%L::uuid[])', v_ids))) ) <> cardinality(v_ids) then
        raise exception 'persona % | «%»: salieron ids que quien busca no ve', q, t;
      end if;
    end loop;
  end loop;
  -- Sin permiso para ver leads, o sin sesión: nada, y nunca un error.
  r := pg_temp.bl_como(f7, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('texto', 'Gómez', 'sentido', 'siguiente')));
  if r is distinct from nada then raise exception 'quien no puede ver leads recibió %', r; end if;
  if has_function_privilege('anon', 'public.leads_candidatos(jsonb)', 'execute') then raise exception 'anon puede llamar leads_candidatos'; end if;
  if not has_function_privilege('authenticated', 'public.leads_candidatos(jsonb)', 'execute') then raise exception 'authenticated no puede llamar leads_candidatos'; end if;
  -- Formas raras: nunca un error, siempre la misma respuesta de «nada».
  foreach v_mal in array array['null'::jsonb, '[]', '"x"', '5', '{}', '{"texto": 5}', '{"texto": ""}', '{"tipos": "x"}', '{"atributos": 3}', '{"extra": "x"}', '{"sentido": "otro"}'] loop
    r := pg_temp.bl_como(f4, format('select public.leads_candidatos(%L::jsonb)', v_mal));
    if jsonb_typeof(r -> 'ids') <> 'array' or jsonb_typeof(r -> 'completa') <> 'boolean' then raise exception 'forma rara %: contestó %', v_mal, r; end if;
  end loop;
end $$;

-- @test búsqueda-leads: la página se lee con `leads_vista_por_ids` inlineable, y el índice y las funciones son los que se pensaron
do $$ declare r record; v_plan text; v_ids uuid[]; v_n int;
begin
  -- Si pierde una de estas cinco cosas, Postgres deja de inlinearla y calcula las columnas caras de TODOS los ids (un `Function Scan`).
  select p.prosecdef, p.provolatile, p.proisstrict, p.proconfig, l.lanname, p.prorettype::regtype::text as ret into r
    from pg_proc p join pg_language l on l.oid = p.prolang where p.oid = 'public.leads_vista_por_ids(uuid[])'::regprocedure;
  if r.prosecdef then raise exception 'leads_vista_por_ids es security definer: no se inlinea'; end if;
  if r.provolatile <> 's' then raise exception 'leads_vista_por_ids no es stable (%): no se inlinea', r.provolatile; end if;
  if r.proisstrict then raise exception 'leads_vista_por_ids es strict: no se inlinea'; end if;
  if r.proconfig is not null then raise exception 'leads_vista_por_ids tiene SET (%): no se inlinea', r.proconfig; end if;
  if r.lanname <> 'sql' then raise exception 'leads_vista_por_ids no es SQL: no se inlinea'; end if;
  if r.ret <> 'leads_vista' then raise exception 'leads_vista_por_ids devuelve %, no leads_vista', r.ret; end if;
  if has_function_privilege('anon', 'public.leads_vista_por_ids(uuid[])', 'execute') then raise exception 'anon puede llamar leads_vista_por_ids'; end if;
  if not has_function_privilege('authenticated', 'public.leads_vista_por_ids(uuid[])', 'execute') then raise exception 'authenticated no puede llamar leads_vista_por_ids'; end if;
  -- Y se nota en el plan: sin `Function Scan`, con la tabla leída por su clave.
  select coalesce(array_agg(id), '{}') into v_ids from (select id from public.leads where eliminado_en is null limit 20) x;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  set local role authenticated;
  v_plan := '';
  for r in execute format('explain select id, creado_en from public.leads_vista_por_ids(%L::uuid[]) where esta_tachado = false order by creado_en desc, id desc limit 5', v_ids) loop
    v_plan := v_plan || E'\n' || r."QUERY PLAN";
  end loop;
  reset role;
  if v_plan ~* 'Function Scan' then raise exception E'leads_vista_por_ids aparece como un Function Scan (no se inlinea):%', v_plan; end if;
  -- El índice nuevo reemplaza al de nombre entero.
  if to_regclass('public.leads_nombre_trgm') is not null then raise exception 'sigue leads_nombre_trgm: el índice de nombre entero se reemplazó'; end if;
  if to_regclass('public.leads_busqueda_idx') is null then raise exception 'falta leads_busqueda_idx'; end if;
  select count(*) into v_n from pg_indexes where indexname = 'leads_busqueda_idx' and indexdef ~ 'USING gin' and indexdef ~ 'cartera' and indexdef ~ 'gin_trgm_ops' and indexdef ~ 'atributos_publicos'
     and indexdef ~ 'eliminado_en IS NULL';
  if v_n <> 1 then raise exception 'leads_busqueda_idx no es el parcial (cartera, nombre trigram, atributos_publicos): %', (select indexdef from pg_indexes where indexname = 'leads_busqueda_idx'); end if;
  -- Los ayudantes no los llama nadie desde afuera.
  for r in select p.oid::regprocedure::text as f from pg_proc p where p.proname in ('_lead_busqueda_patron', '_leads_candidatos_tope', '_leads_candidatos_recorrido', '_leads_candidatos_sql') and p.pronamespace = 'public'::regnamespace loop
    if has_function_privilege('authenticated', r.f::regprocedure, 'execute') or has_function_privilege('anon', r.f::regprocedure, 'execute') then
      raise exception '% lo puede llamar quien no debe', r.f;
    end if;
  end loop;
end $$;

-- @test búsqueda-leads (5a-7): la etiqueta da las mismas filas enteras que `etiquetas && …` por la vista de siempre, con cada ventana, y no revela de quién es una etiqueta
-- Las etiquetas son privadas de cada persona. Cada persona pide las suyas, una ajena (la de otra persona), una que no existe y varias a la vez, sola y con un nombre, con tachados
-- ocultos y con un tipo. Una etiqueta ajena o inexistente da lo mismo que «ninguna»: ni los ids, ni «completa», ni un error, ni el tiempo la distinguen.
do $$ declare
  v_tope_original text := pg_get_functiondef('public._leads_candidatos_tope()'::regprocedure);
  v_recorrido_original text := pg_get_functiondef('public._leads_candidatos_recorrido()'::regprocedure);
  f3 constant uuid := '00000000-0000-0000-0000-0000000009f3'; f4 constant uuid := '00000000-0000-0000-0000-0000000009f4'; f5 constant uuid := '00000000-0000-0000-0000-0000000009f5';
  d1 constant uuid := '00000000-0000-0000-0000-000000000001';
  e_llamar uuid := gen_random_uuid(); e_seguir uuid := gen_random_uuid(); e_vip uuid := gen_random_uuid(); e_tres uuid := gen_random_uuid(); e_cinco uuid := gen_random_uuid();
  v_fantasma constant uuid := '00000000-0000-0000-0000-00000000dead';
  v_tipo uuid := (select id from public.tipos_lead where clase = 'prospecto' and activo order by orden limit 1);
  p record; c record; s record; t text; v_viejo jsonb; v_nuevo jsonb; v_cmp int := 0; v_con_filas int := 0; v_donde text; v_resto text; v_pat text; v_ids jsonb;
begin
  insert into public.etiquetas (id, usuario_id, nombre) values (e_llamar, f4, 'Llamar'), (e_seguir, f4, 'Seguir'), (e_vip, d1, 'Vip'), (e_tres, f3, 'Tres'), (e_cinco, f5, 'Cinco');
  -- f4 etiqueta lo suyo (con un solapamiento, uno tachado, uno de la papelera, uno de quien se va); la dueña etiqueta lo de f4 y lo de f3 (lo ve con «todos»); f3 y f5 lo suyo.
  insert into public.leads_etiquetas (lead_id, etiqueta_id)
    select id, e_llamar from public.leads where nombre in ('Búsqueda masiva 1', 'Búsqueda masiva 2', 'Búsqueda masiva 4', 'Búsqueda masiva 7', 'Búsqueda masiva 8', 'Búsqueda papelera Gómez', 'Búsqueda Ñandú 50% desc_uento')
    union all select id, e_seguir from public.leads where nombre in ('Búsqueda masiva 4', 'Búsqueda masiva 6', 'Búsqueda masiva 9', 'Búsqueda masiva 10', 'Cartera siete 1')
    union all select id, e_vip from public.leads where nombre in ('Búsqueda masiva 2', 'Búsqueda masiva 3', 'Búsqueda masiva 12', 'Búsqueda de la dueña Gómez', 'Búsqueda Gómez Acentuado', 'Cartera siete 1', 'Búsqueda limbo Gómez')
    union all select id, e_tres from public.leads where nombre in ('Búsqueda masiva 3', 'Búsqueda masiva 6', 'Búsqueda masiva 9', 'Búsqueda limbo Gómez', 'Búsqueda Gómez Acentuado')
    union all select id, e_cinco from public.leads where nombre in ('Cartera todos 1', 'Cartera todos 2');
  for c in select * from (values (2, 3), (2, 100), (300, 4000)) x (k, s) loop
    execute format('create or replace function public._leads_candidatos_tope() returns integer language sql immutable parallel safe set search_path = %L as $f$ select %s $f$', '', c.k);
    execute format('create or replace function public._leads_candidatos_recorrido() returns integer language sql immutable parallel safe set search_path = %L as $f$ select %s $f$', '', c.s);
    for p in select * from (values
      ('con muchos', f4, 'leads_cartera_vista', true, array[e_llamar], array[e_seguir]),
      ('con tres', f3, 'leads_cartera_vista', true, array[e_tres], array[e_llamar]),
      ('«todos» con dos propios, en «míos»', f5, 'leads_vista', true, array[e_cinco], array[e_vip]),
      ('«todos» con dos propios, en «todos»', f5, 'leads_vista', false, array[e_cinco], array[e_vip]),
      ('la dueña, en «míos»', d1, 'leads_vista', true, array[e_vip], array[e_llamar]),
      ('la dueña, en «todos»', d1, 'leads_vista', false, array[e_vip], array[e_llamar])) x (nombre, id, rel, mios, propias, ajenas) loop
      foreach t in array array[null, 'masiva', 'Búsqueda', 'gómez', 'zzzz'] loop
        v_pat := case when t is null then null else public._lead_busqueda_patron(t) end;
        for s in select * from (values
          ('una propia', to_jsonb(p.propias)),
          ('las dos de f4 (sólo f4 tiene dos)', to_jsonb(p.propias || case when p.id = f4 then array[e_seguir] else array[]::uuid[] end)),
          ('una propia y una ajena', to_jsonb(p.propias || p.ajenas)),
          ('una ajena', to_jsonb(p.ajenas)),
          ('una que no existe', to_jsonb(array[v_fantasma])),
          ('una propia y una que no existe', to_jsonb(p.propias || array[v_fantasma])),
          ('ninguna', '[]'::jsonb)) x (nombre, ids) loop
          foreach v_resto in array array['true', 'esta_tachado = false', format('tipo_lead_id = %L', v_tipo)] loop
            -- La consulta de siempre: la vista con `etiquetas && ids` (las etiquetas de la columna son sólo las de quien mira) y lo demás.
            v_donde := case when t is null then 'true' else format('nombre ilike %L', v_pat) end || ' and ' || case when p.mios then 'en_cartera = true and ' else '' end
              || format('etiquetas && %L::uuid[] and (%s)', array(select jsonb_array_elements_text(s.ids))::uuid[], v_resto);
            v_viejo := pg_temp.bl_viejo(p.id, p.rel, v_donde, 4, false, null, null);
            v_nuevo := pg_temp.bl_nuevo(p.id, t, null, p.mios, jsonb_build_object('etiquetas', s.ids), case when p.mios then 'en_cartera = true and ' else '' end || '(' || v_resto || ')', 4, false, null, null);
            v_cmp := v_cmp + 1;
            if jsonb_array_length(v_viejo) > 0 then v_con_filas := v_con_filas + 1; end if;
            if v_viejo is distinct from v_nuevo then
              raise exception E'% | término «%» | etiquetas «%» | filtro «%» | ventana K=%, S=%: la etiqueta por candidatos no da lo de siempre\n  siempre: %\n  ahora:   %',
                p.nombre, t, s.nombre, v_resto, c.k, c.s, (select jsonb_agg(e ->> 'nombre') from jsonb_array_elements(v_viejo) e), (select jsonb_agg(e ->> 'nombre') from jsonb_array_elements(v_nuevo) e);
            end if;
          end loop;
        end loop;
      end loop;
    end loop;
  end loop;
  execute v_tope_original; execute v_recorrido_original;
  if v_con_filas < 100 then raise exception 'la prueba de etiquetas casi no encontró nada (% de % comparaciones con filas): no prueba', v_con_filas, v_cmp; end if;
  raise notice 'búsqueda-leads (etiquetas): % comparaciones, % con filas', v_cmp, v_con_filas;

  -- El recorrido entero por cursor, hacia los dos lados, de la etiqueta sola.
  for p in select * from (values ('f4, Llamar', f4, 'leads_cartera_vista', true, e_llamar), ('f4, Seguir', f4, 'leads_cartera_vista', true, e_seguir), ('la dueña, Vip', d1, 'leads_vista', false, e_vip)) x (nombre, id, rel, mios, e) loop
    for c in select * from (values (2, 3), (3, 100), (300, 4000)) x (k, s) loop
      execute format('create or replace function public._leads_candidatos_tope() returns integer language sql immutable parallel safe set search_path = %L as $f$ select %s $f$', '', c.k);
      execute format('create or replace function public._leads_candidatos_recorrido() returns integer language sql immutable parallel safe set search_path = %L as $f$ select %s $f$', '', c.s);
      for s in select * from (values (2, false), (2, true), (5, false), (5, true)) x (tam, atras) loop
        v_donde := case when p.mios then 'en_cartera = true and ' else '' end || format('etiquetas && array[%L]::uuid[]', p.e);
        v_viejo := pg_temp.bl_recorre(false, p.id, p.rel, v_donde, null, null, p.mios, '{}', 'true', s.tam, s.atras);
        v_nuevo := pg_temp.bl_recorre(true, p.id, p.rel, v_donde, null, null, p.mios, jsonb_build_object('etiquetas', jsonb_build_array(p.e)), case when p.mios then 'en_cartera = true' else 'true' end, s.tam, s.atras);
        if v_viejo is distinct from v_nuevo then
          raise exception '% | K=%, S=% | de a % | %: el recorrido por la etiqueta no es el de siempre (% filas contra %)', p.nombre, c.k, c.s, s.tam, case when s.atras then 'hacia atrás' else 'hacia adelante' end,
            jsonb_array_length(v_viejo -> 'filas'), jsonb_array_length(v_nuevo -> 'filas');
        end if;
      end loop;
    end loop;
  end loop;
  execute v_tope_original; execute v_recorrido_original;

  -- Sin oráculo: la etiqueta de otra persona, una que no existe y una mal escrita contestan «nada», sin error, y los leads que la etiqueta ajena marca no entran.
  v_ids := '{"ids": [], "completa": true, "hasta": null}'::jsonb;
  foreach t in array array['mios', 'todos'] loop
    for v_nuevo in select pg_temp.bl_como(q.quien, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('sentido', 'siguiente', 'mios', t = 'mios', 'etiquetas', q.etiquetas)))
                     from (values (f4, to_jsonb(array[e_vip])), (f4, to_jsonb(array[v_fantasma])), (f4, '["no-es-un-uuid"]'::jsonb), (f4, '[5, null, {"a": 1}]'::jsonb), (f4, '[]'::jsonb),
                                  (f3, to_jsonb(array[e_llamar, e_vip])), (d1, to_jsonb(array[e_llamar, e_tres, e_cinco]))) q (quien, etiquetas) loop
      if v_nuevo is distinct from v_ids then raise exception 'una etiqueta que no es de quien busca (o rara) no contestó «nada»: %', v_nuevo; end if;
    end loop;
  end loop;
  -- `etiquetas` que no es una lista no es un filtro: se ignora, como cualquier forma rara.
  v_nuevo := pg_temp.bl_como(f4, format('select public.leads_candidatos(%L::jsonb)', '{"sentido": "siguiente", "etiquetas": "x"}'));
  if jsonb_typeof(v_nuevo -> 'ids') <> 'array' then raise exception 'etiquetas "x" rompió la respuesta: %', v_nuevo; end if;
  -- El lead que llega por su número (`extra`) también tiene que tener la etiqueta.
  select to_jsonb(array[id]) into v_ids from public.leads where nombre = 'Búsqueda masiva 12';  -- de f4, sin la etiqueta Llamar
  v_nuevo := pg_temp.bl_como(f4, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('sentido', 'siguiente', 'etiquetas', jsonb_build_array(e_llamar), 'extra', v_ids)));
  if (v_nuevo -> 'ids') @> v_ids then raise exception 'un lead sin la etiqueta entró por «extra»: %', v_nuevo; end if;
  select to_jsonb(array[id]) into v_ids from public.leads where nombre = 'Búsqueda masiva 8';   -- de f4, con Llamar
  v_nuevo := pg_temp.bl_como(f4, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('sentido', 'siguiente', 'texto', 'zzzz', 'etiquetas', jsonb_build_array(e_llamar), 'extra', v_ids)));
  if not (v_nuevo -> 'ids') @> v_ids then raise exception 'un lead con la etiqueta no entró por «extra»: %', v_nuevo; end if;
  -- Ni la papelera ni el limbo ni quien se va entran por la etiqueta (el lead de la papelera lleva Llamar de f4).
  v_nuevo := pg_temp.bl_como(f4, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('sentido', 'siguiente', 'etiquetas', jsonb_build_array(e_llamar))));
  if (v_nuevo -> 'ids') @> (select to_jsonb(array[id]) from public.leads where nombre = 'Búsqueda papelera Gómez') then raise exception 'un lead de la papelera entró por su etiqueta'; end if;
  v_nuevo := pg_temp.bl_como(d1, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('sentido', 'siguiente', 'etiquetas', jsonb_build_array(e_vip))));
  if (v_nuevo -> 'ids') @> (select to_jsonb(array[id]) from public.leads where nombre = 'Búsqueda limbo Gómez') then raise exception 'un lead del limbo entró por su etiqueta'; end if;
  -- El ayudante no lo llama nadie desde afuera.
  if has_function_privilege('authenticated', 'public._leads_candidatos_etiquetas(jsonb, uuid)', 'execute') or has_function_privilege('anon', 'public._leads_candidatos_etiquetas(jsonb, uuid)', 'execute') then
    raise exception '_leads_candidatos_etiquetas lo puede llamar quien no debe';
  end if;
end $$;

-- @test búsqueda-leads (5a-35): el lead del número (`extra`) entra a los candidatos sin etiquetas, sólo si quien llama lo ve, y da lo mismo que la consulta de siempre
-- Un número de 3 o más dígitos sin «#» se pide como el texto más el lead que tiene ese número (`extra`): tiene que entrar aunque el nombre no coincida. Con `…003500` (5a-7) no entraba
-- nunca si el pedido no traía etiquetas (`v_con_etiquetas` nulo). Lo que quien llama no ve —papelera, limbo, quien se va, el lead de otra persona con «propios»— no entra, ni cambia la respuesta.
do $$ declare
  f4 constant uuid := '00000000-0000-0000-0000-0000000009f4'; f5 constant uuid := '00000000-0000-0000-0000-0000000009f5'; f7 constant uuid := '00000000-0000-0000-0000-0000000009f7';
  d1 constant uuid := '00000000-0000-0000-0000-000000000001'; nada constant jsonb := '{"ids": [], "completa": true, "hasta": null}';
  v_suyo uuid := (select id from public.leads where nombre = 'Búsqueda masiva 1');                  -- de f4
  v_de_f3 uuid := (select id from public.leads where nombre = 'Búsqueda Gómez Acentuado');          -- de f3: f4 no lo ve, la dueña sí
  v_papelera uuid := (select id from public.leads where nombre = 'Búsqueda papelera Gómez');
  v_limbo uuid := (select id from public.leads where nombre = 'Búsqueda limbo Gómez');
  v_se_va uuid := (select id from public.leads where nombre = 'Búsqueda de quien se va Gómez');
  r jsonb; v_en timestamptz; v_id uuid; v_todos uuid[];
begin
  v_todos := array[v_suyo, v_de_f3, v_papelera, v_limbo, v_se_va];
  -- f4 («propios») pide los cinco: sólo entra el suyo.
  r := pg_temp.bl_como(f4, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('sentido', 'siguiente', 'texto', 'zzzz', 'extra', to_jsonb(v_todos))));
  if r -> 'ids' is distinct from to_jsonb(array[v_suyo]) then raise exception 'f4 (propios): debía entrar sólo su lead por «extra»: %', r; end if;
  -- La dueña («todos») ve el lead de f4 y el de f3; no ve la papelera, el limbo ni a quien se va.
  r := pg_temp.bl_como(d1, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('sentido', 'siguiente', 'texto', 'zzzz', 'extra', to_jsonb(v_todos))));
  if (select array_agg(x order by x) from jsonb_array_elements_text(r -> 'ids') x) is distinct from (select array_agg(x::text order by x::text) from unnest(array[v_suyo, v_de_f3]) x) then
    raise exception 'la dueña («todos»): debían entrar el lead de f4 y el de f3 por «extra», y nada de la papelera, el limbo ni quien se va: %', r;
  end if;
  -- f5 («todos» con dos propios) lo mismo que la dueña; quien no puede ver leads, nada.
  r := pg_temp.bl_como(f5, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('sentido', 'siguiente', 'texto', 'zzzz', 'extra', to_jsonb(v_todos))));
  if jsonb_array_length(r -> 'ids') <> 2 then raise exception 'f5 («todos»): debían entrar 2 por «extra»: %', r; end if;
  r := pg_temp.bl_como(f7, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('sentido', 'siguiente', 'texto', 'zzzz', 'extra', to_jsonb(v_todos))));
  if r is distinct from nada then raise exception 'quien no puede ver leads recibió %', r; end if;
  -- Con otro texto que no coincide ni con un nombre ni con nada (sin tramo de 3), igual.
  r := pg_temp.bl_como(f4, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('sentido', 'siguiente', 'texto', '48', 'extra', jsonb_build_array(v_suyo))));
  if r -> 'ids' is distinct from to_jsonb(array[v_suyo]) then raise exception 'texto corto: el lead del número no entró: %', r; end if;
  -- El cursor: un lead más nuevo que el cursor (hacia adelante, `<`) no entra, uno más viejo sí.
  select creado_en, id into v_en, v_id from public.leads where id = v_suyo;
  r := pg_temp.bl_como(f4, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('sentido', 'siguiente', 'texto', 'zzzz', 'extra', jsonb_build_array(v_suyo),
        'cursor', jsonb_build_object('creado_en', v_en, 'id', v_id))));
  if r is distinct from nada then raise exception 'con el cursor en el propio lead no debía entrar: %', r; end if;
  r := pg_temp.bl_como(f4, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('sentido', 'siguiente', 'texto', 'zzzz', 'extra', jsonb_build_array(v_suyo),
        'cursor', jsonb_build_object('creado_en', v_en + interval '1 day', 'id', v_id))));
  if r -> 'ids' is distinct from to_jsonb(array[v_suyo]) then raise exception 'con el cursor más nuevo debía entrar: %', r; end if;
  -- Las filas enteras: por los candidatos, con el número buscado, es lo que da la consulta de siempre (`nombre ilike … or id = any (…)`).
  if pg_temp.bl_nuevo(f4, 'zzzz', v_todos, true, '{}', 'en_cartera = true', 4, false, null, null)
       is distinct from pg_temp.bl_viejo(f4, 'leads_cartera_vista', 'en_cartera = true and (nombre ilike ''%zzzz%'' or id = any (' || quote_literal(v_todos) || '::uuid[]))', 4, false, null, null) then
    raise exception 'f4: el número buscado por candidatos no da lo de siempre';
  end if;
  if pg_temp.bl_nuevo(d1, 'zzzz', v_todos, false, '{}', 'true', 4, false, null, null)
       is distinct from pg_temp.bl_viejo(d1, 'leads_vista', '(nombre ilike ''%zzzz%'' or id = any (' || quote_literal(v_todos) || '::uuid[]))', 4, false, null, null) then
    raise exception 'la dueña: el número buscado por candidatos no da lo de siempre';
  end if;
end $$;

-- @test búsqueda-leads (5a-38): el lead del número (`extra`) también tiene que cumplir un campo público filtrado, y da lo mismo que la consulta de siempre
-- Un campo público filtrado (`atributos`) va a la ventana de candidatos y la página ya no lo repite (`condicionesDeLaPagina`), pero la cláusula de `extra` de `leads_candidatos()` (`…003300`) sólo miraba
-- la visibilidad y las etiquetas: buscar «482» con un campo público filtrado devolvía el lead del número aunque no cumpliera el campo (de `a34318f`, 2026-10-18, tapado del 2026-10-19 al
-- 2026-10-22 por 5a-35). Con `…004600` la cláusula se arma con las mismas condiciones de la ventana (menos la del nombre).
do $$ declare
  f4 constant uuid := '00000000-0000-0000-0000-0000000009f4'; d1 constant uuid := '00000000-0000-0000-0000-000000000001';
  v_oruro uuid := (select id from public.leads where nombre = 'Búsqueda masiva 1');           -- de f4, ciudad Oruro
  v_sucre uuid := (select id from public.leads where nombre = 'Búsqueda Gómez Acentuado');    -- de f3, ciudad Sucre: f4 no lo ve, la dueña sí
  v_ambos uuid[]; r jsonb;
begin
  v_ambos := array[v_oruro, v_sucre];
  -- f4 («propios») pide su lead de Oruro con el campo en Sucre: no entra. Con Oruro, entra.
  r := pg_temp.bl_como(f4, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('sentido', 'siguiente', 'texto', 'zzzz', 'extra', jsonb_build_array(v_oruro),
        'atributos', jsonb_build_array(jsonb_build_array(jsonb_build_object('ciudad', 'Sucre'))))));
  if jsonb_array_length(r -> 'ids') <> 0 then raise exception 'f4: su lead de Oruro entró por «extra» con el campo público en Sucre: %', r; end if;
  r := pg_temp.bl_como(f4, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('sentido', 'siguiente', 'texto', 'zzzz', 'extra', jsonb_build_array(v_oruro),
        'atributos', jsonb_build_array(jsonb_build_array(jsonb_build_object('ciudad', 'Oruro'))))));
  if r -> 'ids' is distinct from to_jsonb(array[v_oruro]) then raise exception 'f4: su lead de Oruro no entró por «extra» con el campo público en Oruro: %', r; end if;
  -- La dueña («todos») pide los dos con el campo en Sucre: sólo el de Sucre. Con «una u otra» (Sucre u Oruro), los dos.
  r := pg_temp.bl_como(d1, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('sentido', 'siguiente', 'texto', 'zzzz', 'extra', to_jsonb(v_ambos),
        'atributos', jsonb_build_array(jsonb_build_array(jsonb_build_object('ciudad', 'Sucre'))))));
  if r -> 'ids' is distinct from to_jsonb(array[v_sucre]) then raise exception 'la dueña: sólo el lead de Sucre debía entrar por «extra»: %', r; end if;
  r := pg_temp.bl_como(d1, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('sentido', 'siguiente', 'texto', 'zzzz', 'extra', to_jsonb(v_ambos),
        'atributos', jsonb_build_array(jsonb_build_array(jsonb_build_object('ciudad', 'Sucre'), jsonb_build_object('ciudad', 'Oruro'))))));
  if (select array_agg(x order by x) from jsonb_array_elements_text(r -> 'ids') x) is distinct from (select array_agg(x::text order by x::text) from unnest(v_ambos) x) then
    raise exception 'la dueña: con «Sucre u Oruro» debían entrar los dos por «extra»: %', r;
  end if;
  -- Las filas enteras, como la app: el número buscado más un campo público es lo que da la consulta de siempre (`(nombre ilike … or id = any (…)) and atributos_publicos @> …`).
  if pg_temp.bl_nuevo(f4, 'zzzz', v_ambos, true, '{"atributos": [[{"ciudad": "Sucre"}]]}', 'en_cartera = true', 4, false, null, null)
       is distinct from pg_temp.bl_viejo(f4, 'leads_cartera_vista', 'en_cartera = true and (nombre ilike ''%zzzz%'' or id = any (' || quote_literal(v_ambos) || '::uuid[])) and atributos_publicos @> ''{"ciudad": "Sucre"}''', 4, false, null, null) then
    raise exception 'f4: el número buscado con un campo público por candidatos no da lo de siempre';
  end if;
  if pg_temp.bl_nuevo(d1, 'zzzz', v_ambos, false, '{"atributos": [[{"ciudad": "Sucre"}]]}', 'true', 4, false, null, null)
       is distinct from pg_temp.bl_viejo(d1, 'leads_vista', '(nombre ilike ''%zzzz%'' or id = any (' || quote_literal(v_ambos) || '::uuid[])) and atributos_publicos @> ''{"ciudad": "Sucre"}''', 4, false, null, null) then
    raise exception 'la dueña: el número buscado con un campo público por candidatos no da lo de siempre';
  end if;
  if pg_temp.bl_nuevo(d1, 'zzzz', v_ambos, false, '{"atributos": [[{"ciudad": "Oruro"}]]}', 'true', 4, false, null, null)
       is distinct from pg_temp.bl_viejo(d1, 'leads_vista', '(nombre ilike ''%zzzz%'' or id = any (' || quote_literal(v_ambos) || '::uuid[])) and atributos_publicos @> ''{"ciudad": "Oruro"}''', 4, false, null, null) then
    raise exception 'la dueña: el número buscado con el campo público en Oruro no da lo de siempre';
  end if;
end $$;
