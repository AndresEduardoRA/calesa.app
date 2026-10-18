-- @test listado-cartera (5a-fix-1a): «míos» por la cartera de quien mira ve exactamente lo que ve «míos» por la vista de siempre
-- `leads_cartera_vista` (la cartera de quien mira, recorrida por `leads_asesores_listado_idx`) tiene que devolver, para cada persona y
-- con cada filtro, las MISMAS filas, en el mismo orden y con el mismo contenido que `leads_vista where en_cartera`: ni una de más
-- (nadie ve una fila que hoy no ve) ni una de menos. La regla de visibilidad sigue escrita una sola vez (la policy de `leads`,
-- `_lead_visible_para()`): acá se prueba que la vista nueva no la reescribe ni la salta. Corre al final: usa los roles de
-- `matriz-leads.sql` (`humo_matriz_propios` y `humo_matriz_todos`) y la dueña de la semilla.
--
-- Personas: f1 sin leads, f2 con uno, f3 con tres (una página exacta de 3), f4 con siete visibles (más de dos páginas: seis
-- propios, uno de ellos con un campo privado, uno compartido por f3 y uno más suyo en la papelera que no se ve), f5 con «todos»
-- y dos propios, f6 que se va (baja en curso) y comparte un lead con f2.
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000009f1', 'cartera-l0@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000009f2', 'cartera-l1@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000009f3', 'cartera-l3@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000009f4', 'cartera-l7@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000009f5', 'cartera-todos2@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000009f6', 'cartera-se-va@ejemplo.com', '{"invitado": true}');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ declare i int; begin
  for i in 1..6 loop
    perform public.rbac_asignar_rol(('00000000-0000-0000-0000-0000000009f' || i)::uuid,
      (select id from public.roles where clave = case when i = 5 then 'humo_matriz_todos' else 'humo_matriz_propios' end), true);
  end loop;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- La sesión de una persona para una sentencia (como PostgREST).
create or replace function pg_temp.como_f(p_quien uuid, p_sql text) returns jsonb language plpgsql as $$
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

-- La lista de ids de una relación del listado, con el filtro y el orden de la app: `en_cartera = true` siempre (es lo que manda
-- «míos»), `creado_en desc, id desc`.
create or replace function pg_temp.ids_de(p_quien uuid, p_rel text, p_donde text default 'true') returns jsonb language sql as $$
  select pg_temp.como_f(p_quien, format('select coalesce(jsonb_agg(id order by creado_en desc, id desc), ''[]'') from public.%I where en_cartera = true and (%s)', p_rel, p_donde));
$$;

-- Lo que devuelven las filas enteras (no sólo los ids): su huella.
create or replace function pg_temp.huella_de(p_quien uuid, p_rel text, p_donde text default 'true') returns text language sql as $$
  select pg_temp.como_f(p_quien, format('select to_jsonb(md5(coalesce(string_agg(to_jsonb(v)::text, '','' order by v.creado_en desc, v.id desc), ''''))) from public.%I v where v.en_cartera = true and (%s)', p_rel, p_donde)) #>> '{}';
$$;

-- Una pasada por el listado de a `p_tam`, como la app: pide `tam + 1`, muestra `tam`, y el cursor es la última fila mostrada
-- (hacia adelante: `<` en el orden del listado; hacia atrás: `>`, recorriendo del más viejo al más nuevo). Devuelve los ids
-- en el orden en que se ven y cuántas páginas hizo.
create or replace function pg_temp.recorre(p_quien uuid, p_rel text, p_tam int, p_atras boolean, p_donde text default 'true') returns jsonb language plpgsql as $$
declare v_ids jsonb := '[]'; v_paginas int := 0; v_en timestamptz; v_id uuid; v_pag jsonb; v_n int; v_cursor text := 'true'; v_orden text := case when p_atras then 'asc' else 'desc' end;
begin
  loop
    v_pag := pg_temp.como_f(p_quien, format($q$select coalesce(jsonb_agg(jsonb_build_array(t.id, t.creado_en) order by t.creado_en %s, t.id %s), '[]')
      from (select id, creado_en from public.%I where en_cartera = true and (%s) and %s order by creado_en %s, id %s limit %s) t$q$,
      v_orden, v_orden, p_rel, p_donde, v_cursor, v_orden, v_orden, p_tam + 1));
    v_n := jsonb_array_length(v_pag);
    v_paginas := v_paginas + 1;
    exit when v_n = 0 and v_paginas = 1;
    select coalesce(jsonb_agg(e -> 0), '[]') into v_pag from (select e from jsonb_array_elements(v_pag) with ordinality x(e, o) order by o limit p_tam) y;
    -- v_pag ahora son los ids mostrados; el cursor es el último
    v_ids := v_ids || v_pag;
    exit when v_n <= p_tam;
    select (e ->> 1)::timestamptz, (e ->> 0)::uuid into v_en, v_id
      from (select e from jsonb_array_elements(pg_temp.como_f(p_quien, format($q$select coalesce(jsonb_agg(jsonb_build_array(t.id, t.creado_en) order by t.creado_en %s, t.id %s), '[]')
        from (select id, creado_en from public.%I where en_cartera = true and (%s) and %s order by creado_en %s, id %s limit %s) t$q$,
        v_orden, v_orden, p_rel, p_donde, v_cursor, v_orden, v_orden, p_tam))) with ordinality x(e, o) order by o desc limit 1) z;
    v_cursor := case when p_atras
      then format('(creado_en >= %L and (creado_en > %L or id > %L))', v_en, v_en, v_id)
      else format('(creado_en <= %L and (creado_en < %L or id < %L))', v_en, v_en, v_id) end;
  end loop;
  return jsonb_build_object('ids', v_ids, 'paginas', v_paginas);
end $$;

-- El terreno, como `postgres`.
do $$ declare
  v_web uuid := (select id from public.origenes_lead where clave = 'web');
  f2 constant uuid := '00000000-0000-0000-0000-0000000009f2'; f3 constant uuid := '00000000-0000-0000-0000-0000000009f3';
  f4 constant uuid := '00000000-0000-0000-0000-0000000009f4'; f5 constant uuid := '00000000-0000-0000-0000-0000000009f5';
  f6 constant uuid := '00000000-0000-0000-0000-0000000009f6'; v_et uuid; i int;
begin
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos) values
    ('Cartera uno', '78930001', f2, v_web, '{"ciudad": "Sucre"}'),
    ('Cartera tres a', '78930011', f3, v_web, '{"ciudad": "Sucre"}'),
    ('Cartera tres b', '78930012', f3, v_web, '{"ciudad": "Oruro"}'),
    ('Cartera tres c', '78930013', f3, v_web, '{"ciudad": "Sucre"}'),
    ('Cartera siete 1', '78930021', f4, v_web, '{"ciudad": "Sucre"}'),
    ('Cartera siete 2', '78930022', f4, v_web, '{"ciudad": "Oruro"}'),
    ('Cartera siete 3', '78930023', f4, v_web, '{"ciudad": "Sucre"}'),
    ('Cartera siete 4', '78930024', f4, v_web, '{}'),
    ('Cartera siete 5', '78930025', f4, v_web, '{"direccion": "Calle privada 9", "ciudad": "Sucre"}'),
    ('Cartera siete 6', '78930027', f4, v_web, '{"ciudad": "Oruro"}'),
    ('Cartera siete papelera', '78930026', f4, v_web, '{}'),
    ('Cartera todos 1', '78930031', f5, v_web, '{"ciudad": "Sucre"}'),
    ('Cartera todos 2', '78930032', f5, v_web, '{}'),
    ('Cartera de quien se va', '78930041', f6, v_web, '{}'),
    ('Cartera compartida con quien se va', '78930042', f2, v_web, '{}'),
    ('Cartera en el limbo', '78930043', f3, v_web, '{}');
  -- creado_en entreverado: el orden del listado no es el de inserción.
  update public.leads set creado_en = now() - make_interval(mins => (abs(hashtext(nombre)) % 5000)) where nombre like 'Cartera %';
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por)
    select id, f4, 'compartido', f3 from public.leads where nombre = 'Cartera tres c';
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por)
    select id, f6, 'compartido', f2 from public.leads where nombre = 'Cartera compartida con quien se va';
  update public.leads set eliminado_en = now() where nombre = 'Cartera siete papelera';
  update public.leads_asesores set revocado_en = now(), revocado_por = f3 where lead_id = (select id from public.leads where nombre = 'Cartera en el limbo');
  -- Las marcas de f4 (tachado, favorito, etiqueta) para combinar filtros.
  insert into public.leads_tachados (lead_id, usuario_id) select id, f4 from public.leads where nombre = 'Cartera siete 2';
  insert into public.leads_favoritos (lead_id, usuario_id) select id, f4 from public.leads where nombre in ('Cartera siete 3', 'Cartera siete 5');
  v_et := gen_random_uuid();
  insert into public.etiquetas (id, usuario_id, nombre) values (v_et, f4, 'Cartera etiqueta');
  insert into public.leads_etiquetas (lead_id, etiqueta_id) select id, v_et from public.leads where nombre in ('Cartera siete 1', 'Cartera siete 3');
  -- La baja en curso de f6: la cuenta apagada y su fila sin terminar (lo que se ve entre el primer lote y el último).
  update public.perfiles set activo = false, baja_en = now(), baja_por = '00000000-0000-0000-0000-000000000001' where id = f6;
  insert into public.equipo_bajas (usuario_id, por) values (f6, '00000000-0000-0000-0000-000000000001');
end $$;

-- @test listado-cartera: cada persona ve lo mismo por las dos vistas, y lo que se espera (con filas concretas)
do $$ declare p record; a jsonb; b jsonb;
begin
  for p in select * from (values
    ('sin leads', '00000000-0000-0000-0000-0000000009f1'::uuid, 0),
    ('con uno', '00000000-0000-0000-0000-0000000009f2'::uuid, 2),   -- el suyo y el compartido con quien se va
    ('con una página exacta', '00000000-0000-0000-0000-0000000009f3'::uuid, 3),
    ('con siete', '00000000-0000-0000-0000-0000000009f4'::uuid, 7),
    ('con «todos» y dos propios', '00000000-0000-0000-0000-0000000009f5'::uuid, 2),
    ('que se va (baja en curso)', '00000000-0000-0000-0000-0000000009f6'::uuid, 0),
    ('la dueña', '00000000-0000-0000-0000-000000000001'::uuid, null)) t(nombre, id, esperados) loop
    a := pg_temp.ids_de(p.id, 'leads_vista');
    b := pg_temp.ids_de(p.id, 'leads_cartera_vista');
    if a is distinct from b then raise exception '% : leads_cartera_vista dice % y leads_vista (en_cartera) %', p.nombre, b, a; end if;
    if p.esperados is not null and jsonb_array_length(b) <> p.esperados then
      raise exception '% : se esperaban % leads en «míos» y salieron % (%)', p.nombre, p.esperados, jsonb_array_length(b), b;
    end if;
    -- Las filas enteras, no sólo los ids: todo lo que trae la vista (teléfono completo, atributos, marcas, números).
    if pg_temp.huella_de(p.id, 'leads_vista') is distinct from pg_temp.huella_de(p.id, 'leads_cartera_vista') then
      raise exception '% : las filas de leads_cartera_vista no son las de leads_vista (en_cartera)', p.nombre;
    end if;
  end loop;
  -- Que la comparación no sea vacía: la persona con siete ve siete, y el teléfono y los privados le llegan completos.
  if pg_temp.como_f('00000000-0000-0000-0000-0000000009f4', $q$select to_jsonb(count(*)) from public.leads_cartera_vista where en_cartera and telefono_visible and telefono_principal like '7893%'$q$)::int <> 7 then
    raise exception 'el teléfono de la cartera no llega completo por leads_cartera_vista';
  end if;
  if pg_temp.como_f('00000000-0000-0000-0000-0000000009f4', $q$select to_jsonb(count(*)) from public.leads_cartera_vista where atributos @> '{"direccion": "Calle privada 9"}'$q$)::int <> 1 then
    raise exception 'el campo privado no llega a su cartera por leads_cartera_vista';
  end if;
end $$;

-- @test listado-cartera: la papelera, el limbo y la baja en curso no salen, aunque la fila de la cartera siga vigente
do $$ declare
  f2 constant uuid := '00000000-0000-0000-0000-0000000009f2'; f4 constant uuid := '00000000-0000-0000-0000-0000000009f4';
  f6 constant uuid := '00000000-0000-0000-0000-0000000009f6'; v_papelera uuid; v_limbo uuid; v_se_va uuid; v_compartido uuid;
begin
  select id into v_papelera from public.leads where nombre = 'Cartera siete papelera';
  select id into v_limbo from public.leads where nombre = 'Cartera en el limbo';
  select id into v_se_va from public.leads where nombre = 'Cartera de quien se va';
  select id into v_compartido from public.leads where nombre = 'Cartera compartida con quien se va';
  -- La fila de la cartera de la papelera sigue vigente (el índice de la cartera no puede ser parcial por `eliminado_en`)…
  if not exists (select 1 from public.leads_asesores where lead_id = v_papelera and usuario_id = f4 and revocado_en is null) then
    raise exception 'el supuesto de la prueba cambió: la fila de un lead en la papelera ya no sigue vigente';
  end if;
  -- …y aun así no se ve: lo decide la policy de leads.
  if pg_temp.como_f(f4, format('select to_jsonb(count(*)) from public.leads_cartera_vista where id = %L', v_papelera))::int <> 0 then
    raise exception 'un lead en la papelera se ve por leads_cartera_vista';
  end if;
  if pg_temp.como_f(f4, format('select to_jsonb(count(*)) from public.leads_cartera_vista where nombre like %L', 'Cartera siete%'))::int <> 6 then
    raise exception 'la persona con siete debería ver sus seis propios y no el de la papelera (el compartido es de otro nombre)';
  end if;
  -- El limbo (nadie vigente) y el lead que sólo tenía quien se va (la baja en curso lo cuenta fuera): invisibles para todos.
  if pg_temp.como_f(f6, format('select to_jsonb(count(*)) from public.leads_cartera_vista where id in (%L, %L)', v_se_va, v_limbo))::int <> 0 then
    raise exception 'quien se va ve su lead por leads_cartera_vista';
  end if;
  if pg_temp.como_f('00000000-0000-0000-0000-000000000001', format('select to_jsonb(count(*)) from public.leads_cartera_vista where id in (%L, %L)', v_se_va, v_limbo))::int <> 0 then
    raise exception 'la dueña ve el limbo o el lead de quien se va por leads_cartera_vista';
  end if;
  -- El compartido con quien se va lo sigue viendo quien lo comparte (queda en su cartera), por las dos vistas.
  if pg_temp.como_f(f2, format('select to_jsonb(count(*)) from public.leads_cartera_vista where id = %L', v_compartido))::int <> 1
     or pg_temp.como_f(f2, format('select to_jsonb(count(*)) from public.leads_vista where en_cartera and id = %L', v_compartido))::int <> 1 then
    raise exception 'quien comparte con quien se va deja de ver su lead';
  end if;
end $$;

-- @test listado-cartera: sin oráculo — un lead ajeno, de la papelera o inexistente responde lo mismo (cero filas, sin error)
do $$ declare
  f2 constant uuid := '00000000-0000-0000-0000-0000000009f2'; v_ajeno uuid; v_papelera uuid; v_nada constant uuid := '00000000-0000-0000-0000-00000000dead';
  v_ids uuid[]; v_id uuid; v_n int;
begin
  select id into v_ajeno from public.leads where nombre = 'Cartera tres a';
  select id into v_papelera from public.leads where nombre = 'Cartera siete papelera';
  v_ids := array[v_ajeno, v_papelera, v_nada];
  foreach v_id in array v_ids loop
    v_n := pg_temp.como_f(f2, format('select to_jsonb(count(*)) from public.leads_cartera_vista where id = %L', v_id))::int;
    if v_n <> 0 then raise exception 'leads_cartera_vista devuelve el lead % a quien no lo tiene', v_id; end if;
    -- La vista tampoco se deja leer con otro sentido que el de quien mira: pedir por el id de la cartera ajena no trae nada.
    if pg_temp.como_f(f2, format('select to_jsonb(count(*)) from public.leads_cartera_vista where id = %L and nombre is not null', v_id))::int <> 0 then
      raise exception 'filtrar por un lead ajeno devuelve algo';
    end if;
  end loop;
  -- Una persona sin ninguna fila en la cartera tampoco ve nada con un filtro que no filtra.
  if pg_temp.como_f('00000000-0000-0000-0000-0000000009f1', 'select to_jsonb(count(*)) from public.leads_cartera_vista')::int <> 0 then
    raise exception 'quien no tiene leads ve algo en leads_cartera_vista';
  end if;
  -- Quien no está en el equipo (anon) no la lee, y un asesor no la lee con el alcance de otro.
  if has_table_privilege('anon', 'public.leads_cartera_vista', 'select') then raise exception 'anon puede leer leads_cartera_vista'; end if;
  if not has_table_privilege('authenticated', 'public.leads_cartera_vista', 'select') then raise exception 'authenticated no puede leer leads_cartera_vista'; end if;
  if has_table_privilege('authenticated', 'public.leads_cartera_vista', 'insert') or has_table_privilege('authenticated', 'public.leads_cartera_vista', 'update')
     or has_table_privilege('authenticated', 'public.leads_cartera_vista', 'delete') then
    raise exception 'authenticated puede escribir leads_cartera_vista';
  end if;
end $$;

-- @test listado-cartera: la paginación por cursor, hacia los dos lados, con una página exacta y con una de más
do $$ declare p record; a jsonb; b jsonb; c jsonb; d jsonb; v_tam int;
begin
  for p in select * from (values
    ('sin leads', '00000000-0000-0000-0000-0000000009f1'::uuid, 0),
    ('con uno', '00000000-0000-0000-0000-0000000009f2'::uuid, 2),
    ('con una página exacta', '00000000-0000-0000-0000-0000000009f3'::uuid, 3),
    ('con siete', '00000000-0000-0000-0000-0000000009f4'::uuid, 7)) t(nombre, id, n) loop
    foreach v_tam in array array[1, 3, 4, 7] loop
      -- Hacia adelante (lo más nuevo primero) por las dos vistas.
      a := pg_temp.recorre(p.id, 'leads_vista', v_tam, false);
      b := pg_temp.recorre(p.id, 'leads_cartera_vista', v_tam, false);
      if a is distinct from b then raise exception '% (de a %): hacia adelante, leads_cartera_vista %, leads_vista %', p.nombre, v_tam, b, a; end if;
      if jsonb_array_length(b -> 'ids') <> p.n then raise exception '% (de a %): se esperaban % leads y se recorrieron %', p.nombre, v_tam, p.n, b -> 'ids'; end if;
      -- Cuántas páginas: una persona sin nada ve una (vacía); una cartera que cabe justo en la página, una sola.
      if (b ->> 'paginas')::int <> greatest(1, ceil(p.n::numeric / v_tam)::int) then
        raise exception '% (de a %): se esperaban % páginas y fueron %', p.nombre, v_tam, greatest(1, ceil(p.n::numeric / v_tam)::int), b ->> 'paginas';
      end if;
      -- Hacia atrás (lo más viejo primero) es lo mismo al revés.
      c := pg_temp.recorre(p.id, 'leads_vista', v_tam, true);
      d := pg_temp.recorre(p.id, 'leads_cartera_vista', v_tam, true);
      if c is distinct from d then raise exception '% (de a %): hacia atrás, leads_cartera_vista %, leads_vista %', p.nombre, v_tam, d, c; end if;
      if (select coalesce(jsonb_agg(e order by o desc), '[]') from jsonb_array_elements(d -> 'ids') with ordinality x(e, o)) is distinct from b -> 'ids' then
        raise exception '% (de a %): recorrida hacia atrás no es la de adelante al revés', p.nombre, v_tam;
      end if;
    end loop;
  end loop;
end $$;

-- @test listado-cartera: los filtros combinados dan lo mismo por las dos vistas
do $$ declare f4 constant uuid := '00000000-0000-0000-0000-0000000009f4'; f5 constant uuid := '00000000-0000-0000-0000-0000000009f5';
  v_filtro text; v_quien uuid; v_antes jsonb; v_ahora jsonb; v_vistos int := 0;
  v_origen uuid := (select id from public.origenes_lead where clave = 'web'); v_tipo uuid; v_et uuid;
begin
  select id into v_tipo from public.tipos_lead where clase = 'prospecto' and activo order by orden limit 1;
  select id into v_et from public.etiquetas where nombre = 'Cartera etiqueta';
  foreach v_quien in array array[f4, f5, '00000000-0000-0000-0000-000000000001'::uuid] loop
    foreach v_filtro in array array[
      'esta_tachado = false',
      'esta_tachado = true',
      'es_favorito = true',
      'es_favorito = true and esta_tachado = false',
      format('etiquetas && array[%L::uuid]', v_et),
      format('etiquetas && array[%L::uuid] and esta_tachado = false', v_et),
      'atributos_publicos @> ''{"ciudad": "Sucre"}''',
      'atributos_publicos @> ''{"ciudad": "Sucre"}'' and esta_tachado = false and es_favorito = true',
      'atributos_publicos @> ''{"ciudad": "Nada"}''',
      'atributos @> ''{"direccion": "Calle privada 9"}''',
      'atributos @> ''{"direccion": "Nada"}''',
      format('tipo_lead_id = any (array[%L]::uuid[])', v_tipo),
      format('origen_lead_id = any (array[%L]::uuid[]) and esta_tachado = false', v_origen),
      'nombre ilike ''%siete%''',
      'nombre ilike ''%siete%'' and atributos_publicos @> ''{"ciudad": "Sucre"}''',
      'nombre ilike ''%zzzz%'''
    ] loop
      v_antes := pg_temp.ids_de(v_quien, 'leads_vista', v_filtro);
      v_ahora := pg_temp.ids_de(v_quien, 'leads_cartera_vista', v_filtro);
      if v_antes is distinct from v_ahora then
        raise exception 'filtro «%» como %: leads_cartera_vista %, leads_vista %', v_filtro, v_quien, v_ahora, v_antes;
      end if;
      if jsonb_array_length(v_ahora) > 0 then v_vistos := v_vistos + 1; end if;
    end loop;
  end loop;
  if v_vistos < 10 then raise exception 'los filtros casi no devolvieron nada (%): la prueba no prueba', v_vistos; end if;
end $$;

-- @test listado-cartera: la fecha de creación de la cartera sigue a la del lead, y nadie más la escribe
do $$ declare
  f2 constant uuid := '00000000-0000-0000-0000-0000000009f2'; f4 constant uuid := '00000000-0000-0000-0000-0000000009f4';
  v_lead uuid; v_viejo timestamptz; v_nuevo timestamptz := '2001-02-03 04:05:06+00'; v_malo uuid := gen_random_uuid();
begin
  -- Ninguna fila de la cartera difiere de su lead.
  if exists (select 1 from public.leads_asesores la join public.leads l on l.id = la.lead_id where la.lead_creado_en is distinct from l.creado_en) then
    raise exception 'hay filas de leads_asesores con una lead_creado_en distinta de la del lead';
  end if;
  -- Insertar con otro valor: manda el lead.
  select id, creado_en into v_lead, v_viejo from public.leads where nombre = 'Cartera uno';
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por, lead_creado_en)
    values (v_lead, f4, 'compartido', f2, '1999-01-01 00:00:00+00');
  if (select lead_creado_en from public.leads_asesores where lead_id = v_lead and usuario_id = f4) is distinct from v_viejo then
    raise exception 'la cartera guardó la fecha que mandó quien insertó y no la del lead';
  end if;
  -- Si el lead cambia de fecha, todas sus filas lo siguen.
  update public.leads set creado_en = v_nuevo where id = v_lead;
  if exists (select 1 from public.leads_asesores where lead_id = v_lead and lead_creado_en is distinct from v_nuevo) then
    raise exception 'una fila de la cartera no siguió al lead cuando cambió su fecha de creación';
  end if;
  -- Y el orden del listado «míos» lo refleja (el más viejo de f2 queda al final).
  if (pg_temp.ids_de(f2, 'leads_cartera_vista') ->> -1)::uuid is distinct from v_lead then
    raise exception 'el lead con la fecha más vieja no quedó al final de leads_cartera_vista';
  end if;
  if pg_temp.ids_de(f2, 'leads_cartera_vista') is distinct from pg_temp.ids_de(f2, 'leads_vista') then
    raise exception 'tras cambiar la fecha de un lead, las dos vistas ya no coinciden';
  end if;
  -- Nadie la cambia a mano, ni cambia el lead al que apunta una fila.
  begin update public.leads_asesores set lead_creado_en = now() where lead_id = v_lead and usuario_id = f4; raise exception 'se pudo cambiar lead_creado_en a mano';
  exception when sqlstate '23514' then null; end;
  begin update public.leads_asesores set lead_id = (select id from public.leads where nombre = 'Cartera tres a') where lead_id = v_lead and usuario_id = f4; raise exception 'se pudo cambiar lead_id de una fila de la cartera';
  exception when sqlstate '23514' then null; end;
  -- Un lead que no existe falla por su clave foránea, no por un nulo.
  begin insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso) values (v_malo, f2, 'compartido'); raise exception 'se insertó una fila para un lead inexistente';
  exception when foreign_key_violation then null; end;
  update public.leads set creado_en = v_viejo where id = v_lead;
  delete from public.leads_asesores where lead_id = v_lead and usuario_id = f4;
end $$;
