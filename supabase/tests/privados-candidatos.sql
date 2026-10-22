-- @test privados-candidatos (5a-10, paso 4.03): el terreno
-- Un campo privado se filtra por la ventana de candidatos (`leads_candidatos` con `privados`, migración `…004400`) y no por la vista, que llamaba a `atributos_lead()` en
-- cada lead de la cartera. Quién ve qué no cambia: para cada persona, cada valor y cada estado del campo, la ruta de ahora tiene que dar las MISMAS filas enteras, en el mismo
-- orden, que la de siempre (`en_cartera = true and atributos @> …` por la vista), y no revelar nada de lo que no es de la cartera de quien filtra: **una fuga de un campo
-- privado es un fallo**. Corre después de `busqueda-leads.sql`: usa sus ayudantes (`bl_como`, `bl_viejo`, `bl_nuevo`, `bl_recorre`) y sus personas (f1 a f7 y la dueña).
--
-- «La cuenta sin la concesión del campo privado»: no hay una concesión por campo, lo privado lo decide la cartera. Esa cuenta es f5, que ve «todos» (puede mirar todos los leads)
-- y tiene dos propios: sus leads los lee; los demás, que ve, no le entregan el campo, y filtrar por él no los encuentra. Lo mismo la dueña, con «todos» y 20 propios.
--
-- Los tres valores: V1 está en la cartera de casi todos (visible), V2 sólo en leads de f3, f2 y la dueña (no visible para f4, f5 ni f1…) y V3 únicamente en leads de f3 (para la
-- dueña y f5, que los ven con «todos», no está en su cartera). Y uno que no existe.
do $$ begin
  if to_regprocedure('pg_temp.bl_nuevo(uuid,text,uuid[],boolean,jsonb,text,integer,boolean,timestamptz,uuid)') is null then
    raise exception 'privados-candidatos.sql corre después de busqueda-leads.sql: usa sus ayudantes (bl_como, bl_viejo, bl_nuevo, bl_recorre)';
  end if;
end $$;
do $$ declare
  v_web uuid := (select id from public.origenes_lead where clave = 'web');
  f2 constant uuid := '00000000-0000-0000-0000-0000000009f2'; f3 constant uuid := '00000000-0000-0000-0000-0000000009f3';
  f4 constant uuid := '00000000-0000-0000-0000-0000000009f4'; f5 constant uuid := '00000000-0000-0000-0000-0000000009f5';
  f6 constant uuid := '00000000-0000-0000-0000-0000000009f6'; d1 constant uuid := '00000000-0000-0000-0000-000000000001';
begin
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos) values
    ('Privado f4 a', '78960001', f4, v_web, '{"direccion": "Calle del Sol 1", "ciudad": "Sucre"}'),
    ('Privado f4 b', '78960002', f4, v_web, '{"direccion": "Calle del Sol 1", "ciudad": "Oruro"}'),
    ('Privado f4 tachado', '78960003', f4, v_web, '{"direccion": "Calle del Sol 1", "ciudad": "Sucre"}'),
    ('Privado f4 favorito', '78960004', f4, v_web, '{"direccion": "Calle del Sol 1"}'),
    ('Privado f4 sin dirección', '78960005', f4, v_web, '{"ciudad": "Sucre"}'),
    ('Privado f4 otra calle', '78960006', f4, v_web, '{"direccion": "Calle de otro", "ciudad": "Sucre"}'),
    ('Privado f4 papelera', '78960007', f4, v_web, '{"direccion": "Calle del Sol 1"}'),
    ('Privado f4 c', '78960008', f4, v_web, '{"direccion": "Calle del Sol 1", "ciudad": "Oruro"}'),
    ('Privado f3 a', '78960011', f3, v_web, '{"direccion": "Calle del Sol 1", "ciudad": "Sucre"}'),
    ('Privado f3 luna', '78960012', f3, v_web, '{"direccion": "Calle de la Luna 2"}'),
    ('Privado f3 rayo', '78960013', f3, v_web, '{"direccion": "Calle del Rayo 3", "ciudad": "Sucre"}'),
    ('Privado f3 limbo', '78960014', f3, v_web, '{"direccion": "Calle del Sol 1"}'),
    ('Privado f3 compartido con f4', '78960015', f3, v_web, '{"direccion": "Calle del Sol 1", "ciudad": "Sucre"}'),
    ('Privado f2 luna', '78960021', f2, v_web, '{"direccion": "Calle de la Luna 2", "ciudad": "Oruro"}'),
    ('Privado f2 sol', '78960022', f2, v_web, '{"direccion": "Calle del Sol 1"}'),
    ('Privado f5 sol', '78960031', f5, v_web, '{"direccion": "Calle del Sol 1", "ciudad": "Sucre"}'),
    ('Privado f6 sol', '78960041', f6, v_web, '{"direccion": "Calle del Sol 1"}'),
    ('Privado d1 sol', '78960051', d1, v_web, '{"direccion": "Calle del Sol 1", "ciudad": "Sucre"}'),
    ('Privado d1 sol b', '78960052', d1, v_web, '{"direccion": "Calle del Sol 1"}'),
    ('Privado d1 luna', '78960053', d1, v_web, '{"direccion": "Calle de la Luna 2", "ciudad": "Sucre"}');
  -- Fechas entreveradas: el orden del listado no es el de inserción.
  update public.leads set creado_en = now() - make_interval(mins => (abs(hashtext(nombre)) % 6000)) where nombre like 'Privado %';
  update public.leads set eliminado_en = now() where nombre = 'Privado f4 papelera';
  update public.leads_asesores set revocado_en = now(), revocado_por = f3 where lead_id = (select id from public.leads where nombre = 'Privado f3 limbo');
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por)
    select id, f4, 'compartido', f3 from public.leads where nombre = 'Privado f3 compartido con f4';
  insert into public.leads_tachados (lead_id, usuario_id) select id, f4 from public.leads where nombre = 'Privado f4 tachado';
  insert into public.leads_favoritos (lead_id, usuario_id) select id, f4 from public.leads where nombre = 'Privado f4 favorito';
  update public.leads set tipo_lead_id = (select id from public.tipos_lead where clase = 'cliente' and activo order by orden limit 1) where nombre in ('Privado f4 b', 'Privado d1 sol b');
  -- El campo privado de la semilla de pruebas es «direccion» (`solo_cartera`). Si no lo es, esta prueba no prueba lo que dice.
  if not (select solo_cartera and solo_cartera_pendiente is null from public.leads_campos where clave = 'direccion') then
    raise exception 'direccion no es un campo privado en el layout de la prueba';
  end if;
end $$;

-- El estado del campo: 0 privado, 1 camino a privado (`a_privado`, la copia pública todavía lo tiene) y 2 camino a público (`a_publico`).
create or replace function pg_temp.pc_estado(p_estado int) returns void language plpgsql as $$
begin
  update public.leads_campos set solo_cartera = (p_estado = 0), solo_cartera_pendiente = case p_estado when 0 then null when 1 then true else false end where clave = 'direccion';
end $$;
create or replace function pg_temp.pc_valor(p_valor text) returns jsonb language sql immutable as $$ select jsonb_build_object('direccion', p_valor) $$;

-- @test privados-candidatos: cada persona, cada valor, cada filtro y cada estado del campo dan las mismas filas enteras que la consulta de siempre, con cada ventana
do $$ declare
  v_tope_original text := pg_get_functiondef('public._leads_candidatos_tope()'::regprocedure);
  v_recorrido_original text := pg_get_functiondef('public._leads_candidatos_recorrido()'::regprocedure);
  d1 constant uuid := '00000000-0000-0000-0000-000000000001';
  p record; t text; f record; c record; e int; v_viejo jsonb; v_nuevo jsonb; v_cmp int := 0; v_con_filas int := 0; v_pat text; v_donde text; v_resto text;
  v_tipo uuid := (select id from public.tipos_lead where clase = 'cliente' and activo order by orden limit 1);
  v_sol constant jsonb := '{"direccion": "Calle del Sol 1"}'; v_luna constant jsonb := '{"direccion": "Calle de la Luna 2"}'; v_rayo constant jsonb := '{"direccion": "Calle del Rayo 3"}';
begin
  for e in 0..2 loop
    perform pg_temp.pc_estado(e);
    for c in select * from (values (2, 3), (2, 100), (300, 4000)) x (k, s) loop
      execute format('create or replace function public._leads_candidatos_tope() returns integer language sql immutable parallel safe set search_path = %L as $f$ select %s $f$', '', c.k);
      execute format('create or replace function public._leads_candidatos_recorrido() returns integer language sql immutable parallel safe set search_path = %L as $f$ select %s $f$', '', c.s);
      for p in select * from (values
        ('sin leads', '00000000-0000-0000-0000-0000000009f1'::uuid, 'leads_cartera_vista'),
        ('con uno', '00000000-0000-0000-0000-0000000009f2'::uuid, 'leads_cartera_vista'),
        ('con tres', '00000000-0000-0000-0000-0000000009f3'::uuid, 'leads_cartera_vista'),
        ('con muchos («propios»)', '00000000-0000-0000-0000-0000000009f4'::uuid, 'leads_cartera_vista'),
        ('«todos» con dos propios, por la vista', '00000000-0000-0000-0000-0000000009f5'::uuid, 'leads_vista'),
        ('«todos» con dos propios, por la cartera', '00000000-0000-0000-0000-0000000009f5'::uuid, 'leads_cartera_vista'),
        ('que se va', '00000000-0000-0000-0000-0000000009f6'::uuid, 'leads_cartera_vista'),
        ('sin permiso para ver leads', '00000000-0000-0000-0000-0000000009f7'::uuid, 'leads_vista'),
        ('la dueña, por la vista', d1, 'leads_vista'),
        ('la dueña, por la cartera', d1, 'leads_cartera_vista')) x (nombre, id, rel) loop
        foreach t in array array[null, 'Privado', 'sol', 'zzzz'] loop
          v_pat := case when t is null then null else public._lead_busqueda_patron(t) end;
          for f in select * from (values
            ('V1', 'atributos @> ' || quote_literal(v_sol), jsonb_build_object('privados', jsonb_build_array(jsonb_build_array(v_sol))), 'true'),
            ('V2', 'atributos @> ' || quote_literal(v_luna), jsonb_build_object('privados', jsonb_build_array(jsonb_build_array(v_luna))), 'true'),
            ('V3, sólo de f3', 'atributos @> ' || quote_literal(v_rayo), jsonb_build_object('privados', jsonb_build_array(jsonb_build_array(v_rayo))), 'true'),
            ('un valor que no existe', 'atributos @> ''{"direccion": "Nada"}''', '{"privados": [[{"direccion": "Nada"}]]}'::jsonb, 'true'),
            ('V1 o V2', '(atributos @> ' || quote_literal(v_sol) || ' or atributos @> ' || quote_literal(v_luna) || ')',
               jsonb_build_object('privados', jsonb_build_array(jsonb_build_array(v_sol, v_luna))), 'true'),
            ('V1 y una ciudad pública', 'atributos @> ' || quote_literal(v_sol) || ' and atributos_publicos @> ''{"ciudad": "Sucre"}''',
               jsonb_build_object('privados', jsonb_build_array(jsonb_build_array(v_sol)), 'atributos', jsonb_build_array(jsonb_build_array('{"ciudad": "Sucre"}'::jsonb))), 'true'),
            ('V1 y V2 a la vez (ninguno tiene los dos)', 'atributos @> ' || quote_literal(v_sol) || ' and atributos @> ' || quote_literal(v_luna),
               jsonb_build_object('privados', jsonb_build_array(jsonb_build_array(v_sol), jsonb_build_array(v_luna))), 'true'),
            ('V1 con tachados ocultos', 'atributos @> ' || quote_literal(v_sol) || ' and esta_tachado = false', jsonb_build_object('privados', jsonb_build_array(jsonb_build_array(v_sol))), 'esta_tachado = false'),
            ('V1 sólo favoritos', 'atributos @> ' || quote_literal(v_sol) || ' and es_favorito = true', jsonb_build_object('privados', jsonb_build_array(jsonb_build_array(v_sol))), 'es_favorito = true'),
            ('V1 y un tipo', 'atributos @> ' || quote_literal(v_sol) || format(' and tipo_lead_id = any (array[%L]::uuid[])', v_tipo),
               jsonb_build_object('privados', jsonb_build_array(jsonb_build_array(v_sol)), 'tipos', jsonb_build_array(v_tipo)), format('tipo_lead_id = any (array[%L]::uuid[])', v_tipo))) x (nombre, donde, empuja, resto) loop
            -- Lo que manda la app con un privado: `en_cartera` siempre (lo suma `condicionesDeLeads`). La de siempre lo lee de la vista; la de ahora, de los candidatos y de la página sin el privado.
            v_donde := case when t is null then 'true' else format('nombre ilike %L', v_pat) end || ' and en_cartera = true and (' || f.donde || ')';
            v_resto := 'en_cartera = true and (' || f.resto || ')';
            v_viejo := pg_temp.bl_viejo(p.id, p.rel, v_donde, 4, false, null, null);
            v_nuevo := pg_temp.bl_nuevo(p.id, t, null, true, f.empuja, v_resto, 4, false, null, null);
            v_cmp := v_cmp + 1;
            if jsonb_array_length(v_viejo) > 0 then v_con_filas := v_con_filas + 1; end if;
            if v_viejo is distinct from v_nuevo then
              raise exception E'% | estado %, término «%» | filtro «%» | ventana K=%, S=%: el campo privado por candidatos no da lo de siempre\n  siempre: %\n  ahora:   %',
                p.nombre, e, t, f.nombre, c.k, c.s, (select jsonb_agg(x ->> 'nombre') from jsonb_array_elements(v_viejo) x), (select jsonb_agg(x ->> 'nombre') from jsonb_array_elements(v_nuevo) x);
            end if;
          end loop;
        end loop;
      end loop;
    end loop;
  end loop;
  perform pg_temp.pc_estado(0);
  execute v_tope_original; execute v_recorrido_original;
  if v_con_filas < 300 then raise exception 'la prueba casi no encontró nada (% de % comparaciones con filas): no prueba', v_con_filas, v_cmp; end if;
  raise notice 'privados-candidatos: % comparaciones, % con filas', v_cmp, v_con_filas;
end $$;

-- @test privados-candidatos: sin fuga — lo que no es de la cartera de quien filtra contesta lo mismo que un valor que no existe, y lo que sale es exactamente lo de su cartera
-- La regla, escrita a mano y sin la vista: vivo, con quien filtra en su cartera, con el valor. Quien ve «todos» ve más leads, pero el campo privado de los que no son suyos no le llega:
-- ni el valor ni que exista se le puede preguntar. Quien no tiene permiso, o se va, no recibe nada.
do $$ declare
  d1 constant uuid := '00000000-0000-0000-0000-000000000001'; nada jsonb := '{"ids": [], "completa": true, "hasta": null}';
  p record; v text; r jsonb; v_esperados uuid[]; v_ids uuid[]; v_n int := 0; v_con_ids int := 0; e int;
begin
  for e in 0..2 loop
    perform pg_temp.pc_estado(e);
    for p in select * from (values
      ('f1, sin leads', '00000000-0000-0000-0000-0000000009f1'::uuid, true), ('f2', '00000000-0000-0000-0000-0000000009f2'::uuid, true),
      ('f3', '00000000-0000-0000-0000-0000000009f3'::uuid, true), ('f4, con muchos', '00000000-0000-0000-0000-0000000009f4'::uuid, true),
      ('f5, «todos»', '00000000-0000-0000-0000-0000000009f5'::uuid, true), ('f6, que se va', '00000000-0000-0000-0000-0000000009f6'::uuid, false),
      ('f7, sin permiso', '00000000-0000-0000-0000-0000000009f7'::uuid, false), ('la dueña, «todos»', d1, true)) x (nombre, id, ve) loop
      foreach v in array array['Calle del Sol 1', 'Calle de la Luna 2', 'Calle del Rayo 3', 'Calle de otro', 'Nada'] loop
        -- Pida «míos» o no: con un campo privado siempre es la cartera.
        for r in select pg_temp.bl_como(p.id, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('sentido', 'siguiente', 'mios', m,
                   'privados', jsonb_build_array(jsonb_build_array(jsonb_build_object('direccion', v)))))) from (values (true), (false)) q (m) loop
          v_ids := array(select jsonb_array_elements_text(r -> 'ids'))::uuid[];
          v_esperados := case when not p.ve then '{}'::uuid[] else
            coalesce((select array_agg(l.id) from public.leads l where l.eliminado_en is null and l.cartera @> array[p.id] and l.atributos @> jsonb_build_object('direccion', v)), '{}'::uuid[]) end;
          v_n := v_n + 1;
          if cardinality(v_ids) > 0 then v_con_ids := v_con_ids + 1; end if;
          if (select array_agg(x order by x) from unnest(v_ids) x) is distinct from (select array_agg(x order by x) from unnest(v_esperados) x) then
            raise exception 'FUGA o pérdida | % | estado % | «%»: salen % candidatos y los de su cartera con el valor son %', p.nombre, e, v, cardinality(v_ids), cardinality(v_esperados);
          end if;
          if not (r ->> 'completa')::boolean then raise exception '% | «%»: dice que hay más y son % de 300 como mucho', p.nombre, v, cardinality(v_ids); end if;
          -- El valor de otras personas, que quien filtra vea o no, no se distingue de uno que no existe: la respuesta es la misma, bit a bit.
          if cardinality(v_esperados) = 0 and r is distinct from nada then
            raise exception 'ORÁCULO | % | estado % | «%»: sin nada en su cartera contestó % y no «nada»', p.nombre, e, v, r;
          end if;
        end loop;
      end loop;
    end loop;
  end loop;
  perform pg_temp.pc_estado(0);
  if v_con_ids < 30 then raise exception 'casi nadie encontró nada (% de %): la prueba no prueba', v_con_ids, v_n; end if;
  raise notice 'privados-candidatos (sin fuga): % consultas, % con candidatos', v_n, v_con_ids;
end $$;

-- @test privados-candidatos: el lead del número (`extra`) también está en la cartera de quien filtra y tiene el valor, porque la página ya no repite el campo privado
-- Hoy `leads_candidatos` sólo deja entrar al lead del número cuando el pedido trae `etiquetas` (`v_con_etiquetas` es nulo sin ellas y descarta la fila: `docs/PLAN.md` 5a-35, un defecto
-- de 5a-7 que no es de este paso). Por eso el lead entra acá por una etiqueta propia de quien busca: la cláusula de los privados es la que se prueba, y seguirá valiendo cuando 5a-35 se arregle.
do $$ declare
  d1 constant uuid := '00000000-0000-0000-0000-000000000001'; f4 constant uuid := '00000000-0000-0000-0000-0000000009f4'; f5 constant uuid := '00000000-0000-0000-0000-0000000009f5';
  e_f4 uuid := gen_random_uuid(); e_d1 uuid := gen_random_uuid(); e_f5 uuid := gen_random_uuid();
  v_sol jsonb := jsonb_build_array(jsonb_build_array('{"direccion": "Calle del Sol 1"}'::jsonb));
  v_a uuid := (select id from public.leads where nombre = 'Privado f4 a');                      -- de f4, con V1
  v_sin uuid := (select id from public.leads where nombre = 'Privado f4 sin dirección');       -- de f4, sin el valor
  v_f3 uuid := (select id from public.leads where nombre = 'Privado f3 a');                    -- de f3, con V1: lo ven la dueña y f5 con «todos»; no es de su cartera
  v_comp uuid := (select id from public.leads where nombre = 'Privado f3 compartido con f4');  -- de f3 compartido con f4: es de la cartera de f4
  v_papelera uuid := (select id from public.leads where nombre = 'Privado f4 papelera');
  nada constant jsonb := '{"ids": [], "completa": true, "hasta": null}';
  r jsonb; i int;
begin
  insert into public.etiquetas (id, usuario_id, nombre) values (e_f4, f4, 'Privado f4'), (e_d1, d1, 'Privado d1'), (e_f5, f5, 'Privado f5');
  insert into public.leads_etiquetas (lead_id, etiqueta_id) values (v_a, e_f4), (v_sin, e_f4), (v_papelera, e_f4), (v_comp, e_f4), (v_f3, e_d1), (v_f3, e_f5);
  -- f4 busca por número uno suyo con el valor: entra aunque el nombre no coincida («zzzz»).
  r := pg_temp.bl_como(f4, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('sentido', 'siguiente', 'texto', 'zzzz', 'etiquetas', jsonb_build_array(e_f4), 'privados', v_sol, 'extra', jsonb_build_array(v_a))));
  if not (r -> 'ids') @> to_jsonb(array[v_a]) then raise exception 'el lead del número, de la cartera y con el valor, no entró: %', r; end if;
  -- Uno suyo con la etiqueta pero sin el valor no entra, ni la papelera.
  r := pg_temp.bl_como(f4, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('sentido', 'siguiente', 'texto', 'zzzz', 'etiquetas', jsonb_build_array(e_f4), 'privados', v_sol, 'extra', jsonb_build_array(v_sin, v_papelera))));
  if r is distinct from nada then raise exception 'entró un lead que no cumple por «extra»: %', r; end if;
  -- Compartido por f3: está en la cartera de f4, así que cuenta.
  r := pg_temp.bl_como(f4, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('sentido', 'siguiente', 'texto', 'zzzz', 'etiquetas', jsonb_build_array(e_f4), 'privados', v_sol, 'extra', jsonb_build_array(v_comp))));
  if not (r -> 'ids') @> to_jsonb(array[v_comp]) then raise exception 'el compartido, que es de su cartera, debía entrar: %', r; end if;
  -- La dueña y f5 (ven «todos») piden por número el lead de f3 que tiene el valor y que ellas etiquetaron: lo ven, pero su campo privado no les llega. No entra.
  foreach i in array array[1, 2] loop
    r := pg_temp.bl_como(case i when 1 then d1 else f5 end, format('select public.leads_candidatos(%L::jsonb)',
      jsonb_build_object('sentido', 'siguiente', 'texto', 'zzzz', 'etiquetas', jsonb_build_array(case i when 1 then e_d1 else e_f5 end), 'privados', v_sol, 'extra', jsonb_build_array(v_f3))));
    if r is distinct from nada then raise exception 'ORÁCULO: quien ve «todos» encontró el campo privado de un lead que no es suyo por «extra»: %', r; end if;
    -- Y sin el campo privado, el mismo pedido sí lo trae (se ve con «todos»): lo que lo deja afuera es el privado.
    r := pg_temp.bl_como(case i when 1 then d1 else f5 end, format('select public.leads_candidatos(%L::jsonb)',
      jsonb_build_object('sentido', 'siguiente', 'texto', 'zzzz', 'etiquetas', jsonb_build_array(case i when 1 then e_d1 else e_f5 end), 'extra', jsonb_build_array(v_f3))));
    if not (r -> 'ids') @> to_jsonb(array[v_f3]) then raise exception 'el control no funciona: sin el campo privado el lead del número debía entrar: %', r; end if;
  end loop;
  -- Todo junto, como lo hace la app: el número buscado, una etiqueta y un campo privado dan lo mismo por los dos caminos.
  if pg_temp.bl_nuevo(f4, 'zzzz', array[v_a, v_sin, v_comp, v_papelera], true, jsonb_build_object('etiquetas', jsonb_build_array(e_f4), 'privados', v_sol), 'en_cartera = true', 4, false, null, null)
       is distinct from pg_temp.bl_viejo(f4, 'leads_cartera_vista', 'en_cartera = true and (nombre ilike ''%zzzz%'' or id = any (' || quote_literal(array[v_a, v_sin, v_comp, v_papelera]) || '::uuid[]))'
                                          || format(' and etiquetas && array[%L]::uuid[]', e_f4) || ' and atributos @> ''{"direccion": "Calle del Sol 1"}''', 4, false, null, null) then
    raise exception 'el número buscado, una etiqueta y un campo privado no dan lo de siempre';
  end if;
end $$;

-- @test privados-candidatos: el recorrido entero por cursor, hacia los dos lados, da las mismas filas por los dos caminos (y cada fila una sola vez)
do $$ declare
  v_tope_original text := pg_get_functiondef('public._leads_candidatos_tope()'::regprocedure);
  v_recorrido_original text := pg_get_functiondef('public._leads_candidatos_recorrido()'::regprocedure);
  p record; f record; c record; a jsonb; b jsonb; v_tam int; v_atras boolean; v_n int := 0; v_filas int := 0;
  v_sol constant jsonb := '{"direccion": "Calle del Sol 1"}';
begin
  for c in select * from (values (2, 3), (3, 100), (300, 4000)) x (k, s) loop
    execute format('create or replace function public._leads_candidatos_tope() returns integer language sql immutable parallel safe set search_path = %L as $f$ select %s $f$', '', c.k);
    execute format('create or replace function public._leads_candidatos_recorrido() returns integer language sql immutable parallel safe set search_path = %L as $f$ select %s $f$', '', c.s);
    for p in select * from (values
      ('con muchos', '00000000-0000-0000-0000-0000000009f4'::uuid, 'leads_cartera_vista'),
      ('la dueña, por la vista', '00000000-0000-0000-0000-000000000001'::uuid, 'leads_vista'),
      ('«todos» con dos propios', '00000000-0000-0000-0000-0000000009f5'::uuid, 'leads_vista')) x (nombre, id, rel) loop
      for f in select * from (values ('V1', 'atributos @> ' || quote_literal(v_sol), 'true'), ('V1 con tachados ocultos', 'atributos @> ' || quote_literal(v_sol) || ' and esta_tachado = false', 'esta_tachado = false')) x (nombre, donde, resto) loop
        foreach v_tam in array array[2, 3] loop
          foreach v_atras in array array[false, true] loop
            a := pg_temp.bl_recorre(false, p.id, p.rel, 'en_cartera = true and (' || f.donde || ')', null, null, true, '{}', 'true', v_tam, v_atras);
            b := pg_temp.bl_recorre(true, p.id, p.rel, null, null, null, true, jsonb_build_object('privados', jsonb_build_array(jsonb_build_array(v_sol))), 'en_cartera = true and (' || f.resto || ')', v_tam, v_atras);
            v_n := v_n + 1; v_filas := v_filas + jsonb_array_length(a -> 'filas');
            if a is distinct from b then
              raise exception E'% | % | de a % | % | K=%, S=%: el recorrido por candidatos no es el de siempre\n  siempre: % páginas, %\n  ahora:   % páginas, %', p.nombre, f.nombre, v_tam,
                case when v_atras then 'hacia atrás' else 'hacia adelante' end, c.k, c.s, a ->> 'paginas', (select jsonb_agg(e ->> 'nombre') from jsonb_array_elements(a -> 'filas') e),
                b ->> 'paginas', (select jsonb_agg(e ->> 'nombre') from jsonb_array_elements(b -> 'filas') e);
            end if;
            if (select count(distinct e ->> 'id') from jsonb_array_elements(b -> 'filas') e) <> jsonb_array_length(b -> 'filas') then
              raise exception '% | %: una fila salió dos veces al recorrer por ventanas', p.nombre, f.nombre;
            end if;
          end loop;
        end loop;
      end loop;
    end loop;
  end loop;
  execute v_tope_original; execute v_recorrido_original;
  if v_filas < 60 then raise exception 'los recorridos casi no trajeron filas (%): la prueba no prueba', v_filas; end if;
  raise notice 'privados-candidatos: % recorridos, % filas', v_n, v_filas;
end $$;

-- @test privados-candidatos: formas raras no rompen nada, y no hay funciones nuevas ni abiertas
do $$ declare
  f4 constant uuid := '00000000-0000-0000-0000-0000000009f4'; r jsonb; v_mal jsonb;
begin
  -- `privados` que no es una lista de listas de objetos: nunca un error, siempre la forma de siempre. Un grupo vacío o que no es una lista no filtra (como en un campo público).
  foreach v_mal in array array['"x"'::jsonb, '5', '[]', '[[]]', '[5]', '["x"]', '[[5]]', '[["x"]]', '[[null]]', '[[{"direccion": 5}]]', '[[{}]]', '[[{"direccion": ["a"]}]]', 'null'] loop
    r := pg_temp.bl_como(f4, format('select public.leads_candidatos(%L::jsonb)', jsonb_build_object('sentido', 'siguiente', 'privados', v_mal)));
    if jsonb_typeof(r -> 'ids') <> 'array' or jsonb_typeof(r -> 'completa') <> 'boolean' then raise exception 'privados %: contestó %', v_mal, r; end if;
  end loop;
  -- Un valor que no es texto (un número, un arreglo) no encuentra nada, pero no falla.
  r := pg_temp.bl_como(f4, format('select public.leads_candidatos(%L::jsonb)', '{"sentido": "siguiente", "privados": [[{"direccion": 5}]]}'));
  if r is distinct from '{"ids": [], "completa": true, "hasta": null}'::jsonb then raise exception 'un valor numérico encontró algo: %', r; end if;
  -- Las firmas son las de antes (no hay ninguna función nueva) y los ayudantes siguen sin poder llamarse desde afuera.
  if has_function_privilege('authenticated', 'public._leads_candidatos_indexable(jsonb)', 'execute') or has_function_privilege('anon', 'public._leads_candidatos_indexable(jsonb)', 'execute') then
    raise exception '_leads_candidatos_indexable lo puede llamar quien no debe';
  end if;
  if (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname like '\_leads\_candidatos\_%') <> 5 then
    raise exception 'cambió el conjunto de funciones _leads_candidatos_*: %', (select string_agg(oid::regprocedure::text, ', ') from pg_proc where pronamespace = 'public'::regnamespace and proname like '\_leads\_candidatos\_%');
  end if;
  -- Sin sesión: nada, y la misma forma.
  r := pg_temp.bl_como('00000000-0000-0000-0000-0000000009f7', format('select public.leads_candidatos(%L::jsonb)', '{"sentido": "siguiente", "privados": [[{"direccion": "Calle del Sol 1"}]]}'));
  if r is distinct from '{"ids": [], "completa": true, "hasta": null}'::jsonb then raise exception 'quien no puede ver leads recibió %', r; end if;
end $$;
