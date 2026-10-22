-- @test comparaciones-candidatos (4.03, 5a-9 y 5a-34): el terreno
-- El texto y el rango de un campo, público y privado, se filtran por la ventana de candidatos (`leads_candidatos` con `comparaciones` y `comparaciones_privadas`, migración `…004700`)
-- y no por la vista (`ilike` y `->>` recorrían `leads_listado_idx` o la cartera entera; un privado pagaba `atributos_lead()` por lead). Quién ve qué no cambia: para cada persona, cada
-- filtro y cada ventana, la ruta de ahora tiene que dar las MISMAS filas enteras, en el mismo orden, que la de siempre (la vista con `ilike`, `>=` y `->`/`->>` como los arma PostgREST),
-- y un campo privado no revela nada de lo que no es de la cartera de quien filtra. Corre después de `privados-candidatos.sql`: usa los ayudantes de `busqueda-leads.sql` (`bl_como`,
-- `bl_viejo`, `bl_nuevo`, `bl_recorre`) y sus personas (f1 a f7 y la dueña).
--
-- Los campos: `ciudad` (texto) y `edad` (número) de fábrica, públicos; `direccion` (texto) de fábrica, privado; y tres que se suman acá y se quitan al final: `llegada` (fecha,
-- pública), `ingreso` (número, privado) y `nacio` (fecha, privada).
do $$ begin
  if to_regprocedure('pg_temp.bl_nuevo(uuid,text,uuid[],boolean,jsonb,text,integer,boolean,timestamptz,uuid)') is null then
    raise exception 'comparaciones-candidatos.sql corre después de busqueda-leads.sql: usa sus ayudantes (bl_como, bl_viejo, bl_nuevo, bl_recorre)';
  end if;
end $$;
insert into public.leads_campos (clave, etiqueta, tipo, opciones, filtrable, en_tabla, solo_cartera, orden, grupo) values
  ('llegada', 'Llegada', 'fecha', '[]', true, false, false, 910, 'Comparaciones'),
  ('ingreso', 'Ingreso', 'numero', '[]', true, false, true, 920, 'Comparaciones'),
  ('nacio', 'Nació', 'fecha', '[]', true, false, true, 930, 'Comparaciones');
do $$ declare
  v_web uuid := (select id from public.origenes_lead where clave = 'web');
  f2 constant uuid := '00000000-0000-0000-0000-0000000009f2'; f3 constant uuid := '00000000-0000-0000-0000-0000000009f3';
  f4 constant uuid := '00000000-0000-0000-0000-0000000009f4'; f5 constant uuid := '00000000-0000-0000-0000-0000000009f5';
  f6 constant uuid := '00000000-0000-0000-0000-0000000009f6'; d1 constant uuid := '00000000-0000-0000-0000-000000000001';
  v_duenos uuid[] := array[f4, f4, f4, f4, f4, f4, f4, f4, f3, f3, f3, f3, f2, f2, f5, f6, d1, d1, d1, d1, f4, f3, d1, f5];
  v_ciudades text[] := array['Sucre', 'sucre', 'Oruro', 'La Paz', 'Cruz del Sur', 'a_bcd', 'axbcd', 'Ñandú', '50% desc', 'Santa Cruz'];
  v_edades int[] := array[5, 17, 18, 30, 45, 99];
  v_llegadas text[] := array['2026-09-30', '2026-10-01', '2026-10-05', '2026-10-31', '2026-11-01', '2026-11-15'];
  v_direcciones text[] := array['Calle del Sol 1', 'Calle de la Luna 2', 'Calle del Rayo 3'];
  v_ingresos int[] := array[100, 500, 900, 1000];
  v_nacieron text[] := array['1980-05-05', '1999-12-31', '2000-01-01', '2005-07-07'];
  i int; v_atr jsonb;
begin
  for i in 1..24 loop
    v_atr := jsonb_build_object('ciudad', v_ciudades[1 + (i - 1) % array_length(v_ciudades, 1)]);
    if i % 5 <> 0 then v_atr := v_atr || jsonb_build_object('edad', v_edades[1 + (i * 7) % array_length(v_edades, 1)]); end if;
    if i % 7 <> 0 then v_atr := v_atr || jsonb_build_object('llegada', v_llegadas[1 + (i * 5) % array_length(v_llegadas, 1)]); end if;
    if i % 3 <> 0 then v_atr := v_atr || jsonb_build_object('direccion', v_direcciones[1 + (i - 1) % array_length(v_direcciones, 1)]); end if;
    if i % 4 <> 0 then v_atr := v_atr || jsonb_build_object('ingreso', v_ingresos[1 + (i * 3) % array_length(v_ingresos, 1)]); end if;
    if i % 6 <> 0 then v_atr := v_atr || jsonb_build_object('nacio', v_nacieron[1 + (i * 5) % array_length(v_nacieron, 1)]); end if;
    insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
      values ('Comparación ' || lpad(i::text, 2, '0'), '7897' || lpad(i::text, 4, '0'), v_duenos[i], v_web, v_atr);
  end loop;
  -- Fechas entreveradas: el orden del listado no es el de inserción.
  update public.leads set creado_en = now() - make_interval(mins => (abs(hashtext(nombre)) % 6500)) where nombre like 'Comparación %';
  -- Ocho leads de la dueña, los más nuevos de todos, con un valor que casi todos los de arriba comparten: un valor denso, para que el tope no lo alcance (`Densa`).
  for i in 1..8 loop
    insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos, creado_en)
      values ('Comparación densa ' || i, '7898' || lpad(i::text, 4, '0'), d1, v_web, '{"ciudad": "Densa"}', now() + make_interval(mins => i));
  end loop;
  update public.leads set eliminado_en = now() where nombre = 'Comparación 02';
  update public.leads_asesores set revocado_en = now(), revocado_por = f3 where lead_id = (select id from public.leads where nombre = 'Comparación 11');
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por)
    select id, f4, 'compartido', f3 from public.leads where nombre = 'Comparación 10';
  insert into public.leads_tachados (lead_id, usuario_id) select id, f4 from public.leads where nombre in ('Comparación 01', 'Comparación 05');
  insert into public.leads_favoritos (lead_id, usuario_id) select id, f4 from public.leads where nombre in ('Comparación 03', 'Comparación 06');
  if (select count(*) from public.leads where nombre like 'Comparación %' and atributos_publicos ? 'llegada') < 10
     or exists (select 1 from public.leads where nombre like 'Comparación %' and atributos_publicos ? 'ingreso') then
    raise exception 'el terreno no quedó como se pensó: llegada tiene que ser pública e ingreso privado';
  end if;
end $$;

-- @test comparaciones-candidatos: cada persona, cada filtro y cada ventana dan las mismas filas enteras que la consulta de siempre
-- «Lo de siempre» es la vista con el predicado que arma PostgREST: `ilike` con el patrón de `patronContiene()` sobre `->>`, el rango de número como jsonb contra jsonb sobre `->` (un valor
-- de texto ordena antes que cualquier número) y el de fecha sobre `->>` con el final exclusivo. Con un campo privado, `en_cartera = true` siempre (lo suma `condicionesDeLeads`). La ventana
-- de «todos» se pide `sin_tope`: el tope (probado aparte) deja de ser «las mismas filas» por diseño.
do $$ declare
  v_tope_original text := pg_get_functiondef('public._leads_candidatos_tope()'::regprocedure);
  v_recorrido_original text := pg_get_functiondef('public._leads_candidatos_recorrido()'::regprocedure);
  p record; t text; f record; c record; v_viejo jsonb; v_nuevo jsonb; v_cmp int := 0; v_con_filas int := 0; v_donde text; v_resto text; v_mios boolean; v_pat text;
  ci constant text := 'atributos_publicos ->> ''ciudad''';
begin
  for c in select * from (values (2, 3), (2, 100), (300, 4000)) x (k, s) loop
    execute format('create or replace function public._leads_candidatos_tope() returns integer language sql immutable parallel safe set search_path = %L as $f$ select %s $f$', '', c.k);
    execute format('create or replace function public._leads_candidatos_recorrido() returns integer language sql immutable parallel safe set search_path = %L as $f$ select %s $f$', '', c.s);
    for p in select * from (values
      ('sin leads', '00000000-0000-0000-0000-0000000009f1'::uuid, 'leads_cartera_vista', true),
      ('con uno', '00000000-0000-0000-0000-0000000009f2'::uuid, 'leads_cartera_vista', true),
      ('con tres', '00000000-0000-0000-0000-0000000009f3'::uuid, 'leads_cartera_vista', true),
      ('con muchos («propios»)', '00000000-0000-0000-0000-0000000009f4'::uuid, 'leads_cartera_vista', true),
      ('«todos» con dos propios, por la vista', '00000000-0000-0000-0000-0000000009f5'::uuid, 'leads_vista', false),
      ('«todos» con dos propios, por la cartera', '00000000-0000-0000-0000-0000000009f5'::uuid, 'leads_cartera_vista', true),
      ('que se va', '00000000-0000-0000-0000-0000000009f6'::uuid, 'leads_cartera_vista', true),
      ('sin permiso para ver leads', '00000000-0000-0000-0000-0000000009f7'::uuid, 'leads_vista', false),
      ('la dueña, por la vista', '00000000-0000-0000-0000-000000000001'::uuid, 'leads_vista', false),
      ('la dueña, por la cartera', '00000000-0000-0000-0000-000000000001'::uuid, 'leads_cartera_vista', true)) x (nombre, id, rel, mios) loop
      foreach t in array array[null, 'Comparación'] loop
        v_pat := case when t is null then null else public._lead_busqueda_patron(t) end;
        for f in select * from (values
          -- campo público
          ('ciudad «sucre»', false, ci || ' ilike ' || quote_literal(public._lead_busqueda_patron('sucre')),
             '{"comparaciones": [{"tipo": "texto", "clave": "ciudad", "texto": "sucre"}]}'::jsonb, 'true'),
          ('ciudad «a_bcd» (el guion bajo es literal: no «axbcd»)', false, ci || ' ilike ' || quote_literal(public._lead_busqueda_patron('a_bcd')),
             '{"comparaciones": [{"tipo": "texto", "clave": "ciudad", "texto": "a_bcd"}]}', 'true'),
          ('ciudad «ñand» (la «Ñ» y la tilde)', false, ci || ' ilike ' || quote_literal(public._lead_busqueda_patron('ñand')),
             '{"comparaciones": [{"tipo": "texto", "clave": "ciudad", "texto": "ñand"}]}', 'true'),
          ('ciudad «50% desc» (el porcentaje es literal)', false, ci || ' ilike ' || quote_literal(public._lead_busqueda_patron('50% desc')),
             '{"comparaciones": [{"tipo": "texto", "clave": "ciudad", "texto": "50% desc"}]}', 'true'),
          ('ciudad sin resultados', false, ci || ' ilike ' || quote_literal(public._lead_busqueda_patron('zzzz')),
             '{"comparaciones": [{"tipo": "texto", "clave": "ciudad", "texto": "zzzz"}]}', 'true'),
          ('edad desde 18', false, 'atributos_publicos -> ''edad'' >= ''18''::jsonb',
             '{"comparaciones": [{"tipo": "rango_numero", "clave": "edad", "min": 18}]}', 'true'),
          ('edad hasta 17', false, 'atributos_publicos -> ''edad'' <= ''17''::jsonb',
             '{"comparaciones": [{"tipo": "rango_numero", "clave": "edad", "max": 17}]}', 'true'),
          ('edad de 18 a 45', false, 'atributos_publicos -> ''edad'' >= ''18''::jsonb and atributos_publicos -> ''edad'' <= ''45''::jsonb',
             '{"comparaciones": [{"tipo": "rango_numero", "clave": "edad", "min": 18, "max": 45}]}', 'true'),
          ('edad desde 1000 (nadie)', false, 'atributos_publicos -> ''edad'' >= ''1000''::jsonb',
             '{"comparaciones": [{"tipo": "rango_numero", "clave": "edad", "min": 1000}]}', 'true'),
          ('llegada de octubre (el final exclusivo)', false, 'atributos_publicos ->> ''llegada'' >= ''2026-10-01'' and atributos_publicos ->> ''llegada'' < ''2026-11-01''',
             '{"comparaciones": [{"tipo": "rango_texto", "clave": "llegada", "desde": "2026-10-01", "antes_de": "2026-11-01"}]}', 'true'),
          ('llegada desde el 31', false, 'atributos_publicos ->> ''llegada'' >= ''2026-10-31''',
             '{"comparaciones": [{"tipo": "rango_texto", "clave": "llegada", "desde": "2026-10-31"}]}', 'true'),
          ('llegada antes del 5', false, 'atributos_publicos ->> ''llegada'' < ''2026-10-05''',
             '{"comparaciones": [{"tipo": "rango_texto", "clave": "llegada", "antes_de": "2026-10-05"}]}', 'true'),
          ('ciudad «sucre» y edad desde 18 (las dos)', false, ci || ' ilike ' || quote_literal(public._lead_busqueda_patron('sucre')) || ' and atributos_publicos -> ''edad'' >= ''18''::jsonb',
             '{"comparaciones": [{"tipo": "texto", "clave": "ciudad", "texto": "sucre"}, {"tipo": "rango_numero", "clave": "edad", "min": 18}]}', 'true'),
          ('ciudad «sucre» y una ciudad exacta', false, ci || ' ilike ' || quote_literal(public._lead_busqueda_patron('sucre')) || ' and atributos_publicos @> ''{"ciudad": "Sucre"}''',
             '{"comparaciones": [{"tipo": "texto", "clave": "ciudad", "texto": "sucre"}], "atributos": [[{"ciudad": "Sucre"}]]}', 'true'),
          ('ciudad «sucre» con tachados ocultos', false, ci || ' ilike ' || quote_literal(public._lead_busqueda_patron('sucre')) || ' and esta_tachado = false',
             '{"comparaciones": [{"tipo": "texto", "clave": "ciudad", "texto": "sucre"}]}', 'esta_tachado = false'),
          -- campo privado: sólo la cartera de quien filtra
          ('dirección «sol»', true, 'atributos ->> ''direccion'' ilike ' || quote_literal(public._lead_busqueda_patron('sol')),
             '{"comparaciones_privadas": [{"tipo": "texto", "clave": "direccion", "texto": "sol"}]}', 'true'),
          ('dirección «luna»', true, 'atributos ->> ''direccion'' ilike ' || quote_literal(public._lead_busqueda_patron('luna')),
             '{"comparaciones_privadas": [{"tipo": "texto", "clave": "direccion", "texto": "luna"}]}', 'true'),
          ('ingreso desde 500', true, 'atributos -> ''ingreso'' >= ''500''::jsonb',
             '{"comparaciones_privadas": [{"tipo": "rango_numero", "clave": "ingreso", "min": 500}]}', 'true'),
          ('ingreso hasta 900', true, 'atributos -> ''ingreso'' <= ''900''::jsonb',
             '{"comparaciones_privadas": [{"tipo": "rango_numero", "clave": "ingreso", "max": 900}]}', 'true'),
          ('nació antes del 2000', true, 'atributos ->> ''nacio'' < ''2000-01-01''',
             '{"comparaciones_privadas": [{"tipo": "rango_texto", "clave": "nacio", "antes_de": "2000-01-01"}]}', 'true'),
          ('dirección «sol» e ingreso desde 500', true, 'atributos ->> ''direccion'' ilike ' || quote_literal(public._lead_busqueda_patron('sol')) || ' and atributos -> ''ingreso'' >= ''500''::jsonb',
             '{"comparaciones_privadas": [{"tipo": "texto", "clave": "direccion", "texto": "sol"}, {"tipo": "rango_numero", "clave": "ingreso", "min": 500}]}', 'true'),
          ('dirección «sol» y una ciudad pública «sucre»', true, 'atributos ->> ''direccion'' ilike ' || quote_literal(public._lead_busqueda_patron('sol')) || ' and ' || ci || ' ilike ' || quote_literal(public._lead_busqueda_patron('sucre')),
             '{"comparaciones_privadas": [{"tipo": "texto", "clave": "direccion", "texto": "sol"}], "comparaciones": [{"tipo": "texto", "clave": "ciudad", "texto": "sucre"}]}', 'true'),
          ('dirección «sol» con tachados ocultos', true, 'atributos ->> ''direccion'' ilike ' || quote_literal(public._lead_busqueda_patron('sol')) || ' and esta_tachado = false',
             '{"comparaciones_privadas": [{"tipo": "texto", "clave": "direccion", "texto": "sol"}]}', 'esta_tachado = false')) x (nombre, privado, donde, empuja, resto) loop
          -- Un campo privado es siempre «míos» (lo suma `condicionesDeLeads`); uno público, sólo si la lectura es la de la cartera.
          v_mios := p.mios or f.privado;
          v_donde := case when t is null then 'true' else format('nombre ilike %L', v_pat) end || case when v_mios then ' and en_cartera = true' else '' end || ' and (' || f.donde || ')';
          v_resto := case when v_mios then 'en_cartera = true and ' else '' end || '(' || f.resto || ')';
          v_viejo := pg_temp.bl_viejo(p.id, p.rel, v_donde, 4, false, null, null);
          v_nuevo := pg_temp.bl_nuevo(p.id, t, null, v_mios, f.empuja || '{"sin_tope": true}'::jsonb, v_resto, 4, false, null, null);
          v_cmp := v_cmp + 1;
          if jsonb_array_length(v_viejo) > 0 then v_con_filas := v_con_filas + 1; end if;
          if v_viejo is distinct from v_nuevo then
            raise exception E'% | término «%» | filtro «%» | ventana K=%, S=%: por candidatos no da lo de siempre\n  siempre: %\n  ahora:   %',
              p.nombre, t, f.nombre, c.k, c.s, (select jsonb_agg(x ->> 'nombre') from jsonb_array_elements(v_viejo) x), (select jsonb_agg(x ->> 'nombre') from jsonb_array_elements(v_nuevo) x);
          end if;
        end loop;
      end loop;
    end loop;
  end loop;
  execute v_tope_original; execute v_recorrido_original;
  if v_con_filas < 250 then raise exception 'la prueba casi no encontró nada (% de % comparaciones con filas): no prueba', v_con_filas, v_cmp; end if;
  raise notice 'comparaciones-candidatos: % comparaciones, % con filas', v_cmp, v_con_filas;
end $$;

-- @test comparaciones-candidatos: sin fuga — un texto o un rango privado sólo encuentra lo de la cartera de quien filtra, y lo demás contesta lo mismo que un valor que no existe
-- La regla, escrita a mano y sin la vista: vivo, con quien filtra en su cartera y con el dato. Quien ve «todos» ve más leads, pero el campo privado de los que no son suyos no le llega: ni el
-- valor ni que exista se le puede preguntar. Quien no tiene permiso, o se va, no recibe nada. Pida «míos» o no, con un campo privado siempre es la cartera.
do $$ declare
  nada jsonb := '{"ids": [], "completa": true, "hasta": null}';
  p record; f record; m boolean; r jsonb; v_esperados uuid[]; v_ids uuid[]; v_n int := 0; v_con_ids int := 0;
begin
  for p in select * from (values
    ('f1, sin leads', '00000000-0000-0000-0000-0000000009f1'::uuid, true), ('f2', '00000000-0000-0000-0000-0000000009f2'::uuid, true),
    ('f3', '00000000-0000-0000-0000-0000000009f3'::uuid, true), ('f4, con muchos', '00000000-0000-0000-0000-0000000009f4'::uuid, true),
    ('f5, «todos»', '00000000-0000-0000-0000-0000000009f5'::uuid, true), ('f6, que se va', '00000000-0000-0000-0000-0000000009f6'::uuid, false),
    ('f7, sin permiso', '00000000-0000-0000-0000-0000000009f7'::uuid, false), ('la dueña, «todos»', '00000000-0000-0000-0000-000000000001'::uuid, true)) x (nombre, id, ve) loop
    for f in select * from (values
      ('dirección «sol»', '{"comparaciones_privadas": [{"tipo": "texto", "clave": "direccion", "texto": "sol"}]}'::jsonb, '(l.atributos ->> ''direccion'') ilike ''%sol%'''),
      ('dirección «luna»', '{"comparaciones_privadas": [{"tipo": "texto", "clave": "direccion", "texto": "luna"}]}', '(l.atributos ->> ''direccion'') ilike ''%luna%'''),
      ('dirección «rayo»', '{"comparaciones_privadas": [{"tipo": "texto", "clave": "direccion", "texto": "rayo"}]}', '(l.atributos ->> ''direccion'') ilike ''%rayo%'''),
      ('ingreso desde 500', '{"comparaciones_privadas": [{"tipo": "rango_numero", "clave": "ingreso", "min": 500}]}', '(l.atributos -> ''ingreso'') >= ''500''::jsonb'),
      ('ingreso hasta 900', '{"comparaciones_privadas": [{"tipo": "rango_numero", "clave": "ingreso", "max": 900}]}', '(l.atributos -> ''ingreso'') <= ''900''::jsonb'),
      ('nació antes del 2000', '{"comparaciones_privadas": [{"tipo": "rango_texto", "clave": "nacio", "antes_de": "2000-01-01"}]}', '(l.atributos ->> ''nacio'') < ''2000-01-01'''),
      ('un texto que nadie tiene', '{"comparaciones_privadas": [{"tipo": "texto", "clave": "direccion", "texto": "zzzz"}]}', '(l.atributos ->> ''direccion'') ilike ''%zzzz%'''),
      ('un ingreso que nadie tiene', '{"comparaciones_privadas": [{"tipo": "rango_numero", "clave": "ingreso", "min": 5000}]}', '(l.atributos -> ''ingreso'') >= ''5000''::jsonb')) x (nombre, filtro, regla) loop
      foreach m in array array[true, false] loop
        r := pg_temp.bl_como(p.id, format('select public.leads_candidatos(%L::jsonb)', f.filtro || jsonb_build_object('sentido', 'siguiente', 'mios', m)));
        v_ids := array(select jsonb_array_elements_text(r -> 'ids'))::uuid[];
        execute format('select coalesce(array_agg(l.id), ''{}''::uuid[]) from public.leads l where l.eliminado_en is null and l.cartera @> array[%L]::uuid[] and %s', p.id, f.regla) into v_esperados;
        if not p.ve then v_esperados := '{}'; end if;
        v_n := v_n + 1;
        if cardinality(v_ids) > 0 then v_con_ids := v_con_ids + 1; end if;
        if (select array_agg(x order by x) from unnest(v_ids) x) is distinct from (select array_agg(x order by x) from unnest(v_esperados) x) then
          raise exception 'FUGA o pérdida | % | «%» | míos %: salen % candidatos y los de su cartera son %', p.nombre, f.nombre, m, cardinality(v_ids), cardinality(v_esperados);
        end if;
        if not (r ->> 'completa')::boolean or r ? 'acotada' then raise exception '% | «%»: un campo privado dice que hay más o que se acotó: %', p.nombre, f.nombre, r; end if;
        if cardinality(v_esperados) = 0 and r is distinct from nada then
          raise exception 'ORÁCULO | % | «%» | míos %: sin nada en su cartera contestó % y no «nada»', p.nombre, f.nombre, m, r;
        end if;
      end loop;
    end loop;
  end loop;
  if v_con_ids < 30 then raise exception 'casi nadie encontró nada (% de %): la prueba no prueba', v_con_ids, v_n; end if;
  raise notice 'comparaciones-candidatos (sin fuga): % consultas, % con candidatos', v_n, v_con_ids;
end $$;

-- @test comparaciones-candidatos: el lead del número (`extra`) también cumple el texto o el rango, y da lo mismo que la consulta de siempre
-- La página ya no repite un campo (público o privado) que los candidatos cumplen, así que el lead del número tiene que cumplirlo él: sale de las mismas condiciones de la ventana.
do $$ declare
  f4 constant uuid := '00000000-0000-0000-0000-0000000009f4'; f5 constant uuid := '00000000-0000-0000-0000-0000000009f5'; d1 constant uuid := '00000000-0000-0000-0000-000000000001';
  v_ids uuid[] := array(select id from public.leads where nombre like 'Comparación %' order by nombre);
  p record; f record; v_viejo jsonb; v_nuevo jsonb; v_n int := 0; v_con int := 0; v_mios boolean; v_donde text;
begin
  for p in select * from (values ('f4, «propios»', f4, 'leads_cartera_vista', true), ('f5, «todos»', f5, 'leads_vista', false), ('la dueña, por la cartera', d1, 'leads_cartera_vista', true), ('la dueña, por la vista', d1, 'leads_vista', false)) x (nombre, id, rel, mios) loop
    for f in select * from (values
      ('ciudad «sucre»', false, 'atributos_publicos ->> ''ciudad'' ilike ''%sucre%''', '{"comparaciones": [{"tipo": "texto", "clave": "ciudad", "texto": "sucre"}]}'::jsonb),
      ('edad desde 18', false, 'atributos_publicos -> ''edad'' >= ''18''::jsonb', '{"comparaciones": [{"tipo": "rango_numero", "clave": "edad", "min": 18}]}'),
      ('dirección «sol»', true, 'atributos ->> ''direccion'' ilike ''%sol%''', '{"comparaciones_privadas": [{"tipo": "texto", "clave": "direccion", "texto": "sol"}]}'),
      ('ingreso desde 500', true, 'atributos -> ''ingreso'' >= ''500''::jsonb', '{"comparaciones_privadas": [{"tipo": "rango_numero", "clave": "ingreso", "min": 500}]}')) x (nombre, privado, donde, empuja) loop
      v_mios := p.mios or f.privado;
      v_donde := case when v_mios then 'en_cartera = true and ' else '' end || '(nombre ilike ''%zzzz%'' or id = any (' || quote_literal(v_ids) || '::uuid[])) and (' || f.donde || ')';
      v_viejo := pg_temp.bl_viejo(p.id, p.rel, v_donde, 4, false, null, null);
      v_nuevo := pg_temp.bl_nuevo(p.id, 'zzzz', v_ids, v_mios, f.empuja || '{"sin_tope": true}'::jsonb, case when v_mios then 'en_cartera = true' else 'true' end, 4, false, null, null);
      v_n := v_n + 1;
      if jsonb_array_length(v_viejo) > 0 then v_con := v_con + 1; end if;
      if v_viejo is distinct from v_nuevo then
        raise exception E'% | «%»: el lead del número con un texto o un rango no da lo de siempre\n  siempre: %\n  ahora:   %', p.nombre, f.nombre,
          (select jsonb_agg(x ->> 'nombre') from jsonb_array_elements(v_viejo) x), (select jsonb_agg(x ->> 'nombre') from jsonb_array_elements(v_nuevo) x);
      end if;
    end loop;
  end loop;
  if v_con < 8 then raise exception 'el lead del número casi no encontró nada (% de %)', v_con, v_n; end if;
end $$;

-- @test comparaciones-candidatos: el recorrido por cursor da las mismas filas, sin repetir ninguna, con cada ventana
do $$ declare
  v_tope_original text := pg_get_functiondef('public._leads_candidatos_tope()'::regprocedure);
  v_recorrido_original text := pg_get_functiondef('public._leads_candidatos_recorrido()'::regprocedure);
  p record; f record; c record; z int; atras boolean; v_viejo jsonb; v_nuevo jsonb; v_n int := 0; v_filas int := 0; v_mios boolean; v_donde text;
begin
  for c in select * from (values (2, 3), (2, 100), (300, 4000)) x (k, s) loop
    execute format('create or replace function public._leads_candidatos_tope() returns integer language sql immutable parallel safe set search_path = %L as $f$ select %s $f$', '', c.k);
    execute format('create or replace function public._leads_candidatos_recorrido() returns integer language sql immutable parallel safe set search_path = %L as $f$ select %s $f$', '', c.s);
    for p in select * from (values ('f4, «propios»', '00000000-0000-0000-0000-0000000009f4'::uuid, 'leads_cartera_vista', true),
                                   ('la dueña, por la vista', '00000000-0000-0000-0000-000000000001'::uuid, 'leads_vista', false),
                                   ('la dueña, por la cartera', '00000000-0000-0000-0000-000000000001'::uuid, 'leads_cartera_vista', true)) x (nombre, id, rel, mios) loop
      for f in select * from (values
        ('ciudad «sucre»', false, 'atributos_publicos ->> ''ciudad'' ilike ''%sucre%''', '{"comparaciones": [{"tipo": "texto", "clave": "ciudad", "texto": "sucre"}]}'::jsonb),
        ('edad desde 18', false, 'atributos_publicos -> ''edad'' >= ''18''::jsonb', '{"comparaciones": [{"tipo": "rango_numero", "clave": "edad", "min": 18}]}'),
        ('ingreso desde 500', true, 'atributos -> ''ingreso'' >= ''500''::jsonb', '{"comparaciones_privadas": [{"tipo": "rango_numero", "clave": "ingreso", "min": 500}]}')) x (nombre, privado, donde, empuja) loop
        v_mios := p.mios or f.privado;
        v_donde := case when v_mios then 'en_cartera = true and ' else '' end || '(' || f.donde || ')';
        foreach z in array array[2, 3] loop
          foreach atras in array array[false, true] loop
            v_viejo := pg_temp.bl_recorre(false, p.id, p.rel, v_donde, null, null, v_mios, f.empuja, 'true', z, atras);
            v_nuevo := pg_temp.bl_recorre(true, p.id, p.rel, v_donde, null, null, v_mios, f.empuja || '{"sin_tope": true}'::jsonb, case when v_mios then 'en_cartera = true' else 'true' end, z, atras);
            v_n := v_n + 1;
            v_filas := v_filas + jsonb_array_length(v_viejo -> 'filas');
            if (v_viejo -> 'filas') is distinct from (v_nuevo -> 'filas') then
              raise exception '% | «%» | K=%, S=% | de a % %: el recorrido por cursor no da lo de siempre', p.nombre, f.nombre, c.k, c.s, z, case when atras then 'hacia atrás' else 'hacia adelante' end;
            end if;
            if (select count(distinct x ->> 'id') from jsonb_array_elements(v_nuevo -> 'filas') x) <> jsonb_array_length(v_nuevo -> 'filas') then
              raise exception '% | «%» | K=%, S=%: el recorrido repitió una fila', p.nombre, f.nombre, c.k, c.s;
            end if;
          end loop;
        end loop;
      end loop;
    end loop;
  end loop;
  execute v_tope_original; execute v_recorrido_original;
  if v_filas < 100 then raise exception 'el recorrido casi no encontró filas (% en % recorridos)', v_filas, v_n; end if;
end $$;

-- @test comparaciones-candidatos: el tope de un campo público — quien ve «todos» recorre como mucho 2,5 ventanas y la respuesta lo dice, con hasta dónde llegó
-- Con S = 3 el tope son 7 leads. Vale sólo para quien ve «todos», sólo cuando el texto o el rango de un campo público es lo único que acota el pedido y sin `sin_tope`; un campo privado, el
-- nombre (3 letras), una etiqueta o una opción pública lo acotan por otro lado. Seguir desde `hasta` (el cursor de «Seguir buscando») recorre lo que falta, y todos los tramos juntos
-- son exactamente lo que da la consulta sin tope.
do $$ declare
  v_tope_original text := pg_get_functiondef('public._leads_candidatos_tope()'::regprocedure);
  v_recorrido_original text := pg_get_functiondef('public._leads_candidatos_recorrido()'::regprocedure);
  d1 constant uuid := '00000000-0000-0000-0000-000000000001'; f4 constant uuid := '00000000-0000-0000-0000-0000000009f4'; f5 constant uuid := '00000000-0000-0000-0000-0000000009f5';
  r jsonb; v_hasta jsonb; v_septimo jsonb; v_cursor jsonb; v_juntos uuid[]; v_exactos uuid[]; v_tramos int; f record; m boolean; v_filtros jsonb;
  ciudad_sucre constant jsonb := '{"comparaciones": [{"tipo": "texto", "clave": "ciudad", "texto": "sucre"}]}';
  nunca constant jsonb := '{"comparaciones": [{"tipo": "texto", "clave": "ciudad", "texto": "zzzz"}]}';
begin
  execute format('create or replace function public._leads_candidatos_tope() returns integer language sql immutable parallel safe set search_path = %L as $f$ select %s $f$', '', 2);
  execute format('create or replace function public._leads_candidatos_recorrido() returns integer language sql immutable parallel safe set search_path = %L as $f$ select %s $f$', '', 3);
  -- La dueña, «todos», sin resultados: se queda en el tope (7) y dice hasta dónde llegó: el séptimo lead del listado.
  r := pg_temp.bl_como(d1, format('select public.leads_candidatos(%L::jsonb)', nunca || '{"sentido": "siguiente", "mios": false}'));
  if r -> 'ids' <> '[]' or (r ->> 'completa')::boolean or (r ->> 'acotada')::boolean is not true or (r ->> 'recorridos')::int <> 7 or r -> 'hasta' = 'null'::jsonb then
    raise exception 'la dueña, «todos», sin resultados: debía quedarse en el tope con hasta, y contestó %', r;
  end if;
  v_septimo := pg_temp.bl_como(d1, 'select to_jsonb(x) from (select creado_en, id from public.leads_vista order by creado_en desc, id desc offset 6 limit 1) x');
  if (r #>> '{hasta,id}') is distinct from (v_septimo ->> 'id') then raise exception 'hasta no es el séptimo lead del listado: % y es %', r -> 'hasta', v_septimo; end if;
  -- «Míos» de la dueña: lo mismo, por su cartera.
  r := pg_temp.bl_como(d1, format('select public.leads_candidatos(%L::jsonb)', nunca || '{"sentido": "siguiente", "mios": true}'));
  if (r ->> 'acotada')::boolean is not true or (r ->> 'recorridos')::int <> 7 then raise exception 'la dueña, «míos»: debía quedarse en el tope: %', r; end if;
  -- Un valor denso no llega al tope: los más nuevos lo tienen, junta K + 1 enseguida y la respuesta es la de siempre (no acotada, con hasta).
  r := pg_temp.bl_como(d1, format('select public.leads_candidatos(%L::jsonb)', '{"comparaciones": [{"tipo": "texto", "clave": "ciudad", "texto": "densa"}], "sentido": "siguiente", "mios": false}'));
  if r ? 'acotada' or (r ->> 'completa')::boolean or jsonb_array_length(r -> 'ids') <> 2 or r -> 'hasta' = 'null'::jsonb then raise exception 'un valor denso no debía acotarse: %', r; end if;
  -- Lo que no lleva el tope: sin_tope, quien ve sólo lo suyo, un campo privado, el nombre (3 letras), una opción pública, una etiqueta.
  foreach v_filtros in array array[nunca || '{"sin_tope": true}', nunca || '{"texto": "Comparación"}', nunca || '{"atributos": [[{"ciudad": "Sucre"}]]}', nunca || format('{"etiquetas": ["%s"]}', gen_random_uuid())::jsonb] loop
    r := pg_temp.bl_como(d1, format('select public.leads_candidatos(%L::jsonb)', v_filtros || '{"sentido": "siguiente", "mios": false}'));
    if r ? 'acotada' then raise exception 'esto no debía acotarse (%): %', v_filtros, r; end if;
  end loop;
  r := pg_temp.bl_como(d1, format('select public.leads_candidatos(%L::jsonb)', '{"comparaciones_privadas": [{"tipo": "texto", "clave": "direccion", "texto": "zzzz"}], "sentido": "siguiente"}'));
  if r ? 'acotada' then raise exception 'un campo privado no debía acotarse: %', r; end if;
  r := pg_temp.bl_como(f4, format('select public.leads_candidatos(%L::jsonb)', nunca || '{"sentido": "siguiente", "mios": false}'));
  if r ? 'acotada' or r is distinct from '{"ids": [], "completa": true, "hasta": null}'::jsonb then raise exception 'quien ve sólo lo suyo (f4) no debía acotarse: %', r; end if;
  -- Seguir desde `hasta` recorre lo que falta; los tramos juntos son lo que da la consulta sin tope (la dueña, «todos» y «míos»; f5, «todos»).
  for f in select * from (values ('la dueña, «todos»', d1, false), ('la dueña, «míos»', d1, true), ('f5, «todos»', f5, false)) x (nombre, id, mios) loop
    foreach v_filtros in array array[ciudad_sucre, nunca, '{"comparaciones": [{"tipo": "rango_numero", "clave": "edad", "min": 18}]}'::jsonb, '{"comparaciones": [{"tipo": "rango_texto", "clave": "llegada", "desde": "2026-10-05"}]}'::jsonb] loop
      r := pg_temp.bl_como(f.id, format('select public.leads_candidatos(%L::jsonb)', v_filtros || jsonb_build_object('sentido', 'siguiente', 'mios', f.mios, 'sin_tope', true)));
      if not (r ->> 'completa')::boolean or cardinality(array(select jsonb_array_elements_text(r -> 'ids'))) > 2 then
        -- Con K = 2 la ventana exacta tampoco cabe en una: se recorre por sus propios `hasta`, como la app.
        v_exactos := '{}'; v_cursor := null;
        loop
          r := pg_temp.bl_como(f.id, format('select public.leads_candidatos(%L::jsonb)', v_filtros || jsonb_build_object('sentido', 'siguiente', 'mios', f.mios, 'sin_tope', true)
                 || case when v_cursor is null then '{}'::jsonb else jsonb_build_object('cursor', v_cursor) end));
          v_exactos := v_exactos || array(select jsonb_array_elements_text(r -> 'ids'))::uuid[];
          exit when (r ->> 'completa')::boolean;
          v_cursor := r -> 'hasta';
        end loop;
      else
        v_exactos := array(select jsonb_array_elements_text(r -> 'ids'))::uuid[];
      end if;
      v_juntos := '{}'; v_cursor := null; v_tramos := 0;
      loop
        r := pg_temp.bl_como(f.id, format('select public.leads_candidatos(%L::jsonb)', v_filtros || jsonb_build_object('sentido', 'siguiente', 'mios', f.mios)
               || case when v_cursor is null then '{}'::jsonb else jsonb_build_object('cursor', v_cursor) end));
        v_juntos := v_juntos || array(select jsonb_array_elements_text(r -> 'ids'))::uuid[];
        v_tramos := v_tramos + 1;
        if (r ->> 'acotada')::boolean is true and (cardinality(array(select jsonb_array_elements_text(r -> 'ids'))) > 2 or (r ->> 'recorridos')::int <> 7 or r -> 'hasta' = 'null'::jsonb) then
          raise exception '% | %: una respuesta acotada tiene como mucho K candidatos, recorrió el tope y dice hasta dónde: %', f.nombre, v_filtros, r;
        end if;
        exit when (r ->> 'completa')::boolean and not (r ? 'acotada');
        exit when v_tramos > 2000;
        v_cursor := r -> 'hasta';
      end loop;
      if v_tramos > 2000 then raise exception '% | %: seguir buscando no termina', f.nombre, v_filtros; end if;
      if v_juntos is distinct from v_exactos then
        raise exception E'% | %: los tramos juntos no son lo de la consulta sin tope\n  tramos: %\n  sin tope: %', f.nombre, v_filtros, v_juntos, v_exactos;
      end if;
    end loop;
  end loop;
  execute v_tope_original; execute v_recorrido_original;
end $$;

-- @test comparaciones-candidatos: formas raras no rompen nada ni cambian la respuesta, y un texto corto no filtra ni vuelve «míos» la lectura
-- Un elemento que no es un objeto, sin clave o con la clave de otra forma, con un tipo que no existe, con límites de otro tipo JSON, o un texto de menos de 3 letras o dígitos seguidos se
-- ignora: la respuesta es la de un pedido sin él, y no cuenta como algo que buscarle al índice. Nunca un error.
do $$ declare
  d1 constant uuid := '00000000-0000-0000-0000-000000000001'; f4 constant uuid := '00000000-0000-0000-0000-0000000009f4';
  v_mal jsonb; v_clave text; r jsonb; v_sin jsonb; v_c text;
begin
  v_sin := pg_temp.bl_como(d1, format('select public.leads_candidatos(%L::jsonb)', '{"sentido": "siguiente", "mios": false}'));
  foreach v_mal in array array['"x"'::jsonb, '5', '[]', '{}', 'null', '[5]', '["x"]', '[null]', '[[]]', '[{}]', '[{"tipo": "texto"}]', '[{"clave": "ciudad", "texto": "sucre"}]',
      '[{"tipo": "texto", "clave": "ciudad"}]', '[{"tipo": "texto", "clave": "ciudad", "texto": 5}]', '[{"tipo": "texto", "clave": "ciudad", "texto": ["sucre"]}]',
      '[{"tipo": "texto", "clave": "Ciudad", "texto": "sucre"}]', '[{"tipo": "texto", "clave": "a b", "texto": "sucre"}]', '[{"tipo": "texto", "clave": 5, "texto": "sucre"}]',
      '[{"tipo": "texto", "clave": "ciudad", "texto": "su"}]', '[{"tipo": "texto", "clave": "ciudad", "texto": "%%"}]', '[{"tipo": "texto", "clave": "ciudad", "texto": "a_"}]',
      '[{"tipo": "rango_numero", "clave": "edad"}]', '[{"tipo": "rango_numero", "clave": "edad", "min": "18"}]', '[{"tipo": "rango_numero", "clave": "edad", "min": null, "max": null}]',
      '[{"tipo": "rango_texto", "clave": "llegada"}]', '[{"tipo": "rango_texto", "clave": "llegada", "desde": 5}]', '[{"tipo": "otro", "clave": "ciudad", "texto": "sucre"}]',
      '[{"tipo": "texto", "clave": "ciudad''; drop table public.leads; --", "texto": "sucre"}]', '[{"tipo": "texto", "clave": "ciudad", "texto": "sucre", "otra": 1}, 5]'] loop
    foreach v_clave in array array['comparaciones', 'comparaciones_privadas'] loop
      if v_mal = '[{"tipo": "texto", "clave": "ciudad", "texto": "sucre", "otra": 1}, 5]'::jsonb then continue; end if;
      -- La dueña, «todos»: un elemento que no vale no la deja en su cartera ni la acota: es lo mismo que no pedir nada.
      r := pg_temp.bl_como(d1, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object(v_clave, v_mal, 'sentido', 'siguiente', 'mios', false)));
      if r is distinct from v_sin then raise exception '% %: lo mal formado cambió la respuesta: % en vez de %', v_clave, v_mal, r, v_sin; end if;
      if public._leads_candidatos_indexable(jsonb_build_object(v_clave, v_mal)) then raise exception '% %: lo mal formado cuenta como algo que buscarle al índice', v_clave, v_mal; end if;
    end loop;
  end loop;
  -- Un elemento bueno junto a uno malo: el bueno filtra y el malo se ignora.
  r := pg_temp.bl_como(f4, format('select public.leads_candidatos(%L::jsonb)', '{"comparaciones": [{"tipo": "texto", "clave": "ciudad", "texto": "sucre"}, 5, {"tipo": "otro"}], "sentido": "siguiente"}'));
  if r is distinct from pg_temp.bl_como(f4, format('select public.leads_candidatos(%L::jsonb)', '{"comparaciones": [{"tipo": "texto", "clave": "ciudad", "texto": "sucre"}], "sentido": "siguiente"}')) then
    raise exception 'un elemento malo junto a uno bueno cambió la respuesta: %', r;
  end if;
  -- Lo bueno sí cuenta como algo que buscarle al índice, el público y el privado.
  foreach v_c in array array['comparaciones', 'comparaciones_privadas'] loop
    if not public._leads_candidatos_indexable(jsonb_build_object(v_c, '[{"tipo": "texto", "clave": "ciudad", "texto": "sucre"}]'::jsonb))
       or not public._leads_candidatos_indexable(jsonb_build_object(v_c, '[{"tipo": "rango_numero", "clave": "edad", "max": 5}]'::jsonb))
       or not public._leads_candidatos_indexable(jsonb_build_object(v_c, '[{"tipo": "rango_texto", "clave": "llegada", "antes_de": "2026-01-01"}]'::jsonb)) then
      raise exception '% bueno no cuenta como algo que buscarle al índice', v_c;
    end if;
  end loop;
  -- Una clave con una comilla o con SQL no llega a la consulta: nada se rompió y la tabla sigue.
  if to_regclass('public.leads') is null then raise exception 'la tabla leads ya no existe'; end if;
  -- No hay funciones nuevas ni abiertas.
  if (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname like '\_leads\_candidatos\_%') <> 5 then
    raise exception 'cambió el conjunto de funciones _leads_candidatos_*';
  end if;
end $$;

-- @test comparaciones-candidatos: se quitan los campos del terreno
do $$ begin
  update public.leads set atributos = atributos - 'llegada' - 'ingreso' - 'nacio' where atributos ?| array['llegada', 'ingreso', 'nacio'];
  delete from public.leads_campos where clave in ('llegada', 'ingreso', 'nacio');
  if exists (select 1 from public.leads_campos where clave in ('llegada', 'ingreso', 'nacio')) then raise exception 'no se quitaron los campos del terreno'; end if;
end $$;
