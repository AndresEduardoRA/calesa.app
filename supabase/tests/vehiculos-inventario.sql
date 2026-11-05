-- `vehiculos_inventario()` (paso 4.16-2a), lo que devuelve: lo mismo que la policy «vehiculos: leer» le entrega a cada persona (L2) y el cursor, el orden, el tamaño, la
-- portada y `limpieza_el` (L4). La forma, en `vehiculos-inventario-forma.sql`; los filtros, en `vehiculos-inventario-filtros.sql`. Corre antes de
-- `vehiculos-visibilidad.sql`; la dueña es `…0001` (la crea `humo.sql`). Cada bloque abre su transacción y la revierte, y sus ayudantes `pg_temp.vi_*` nacen dentro de
-- ella. Los teléfonos son fijos (`7270xxxx`, que nadie más usa) y se comprueba que estén libres; los uuids de las personas, `…0e7x`. Compara ids, nunca texto.

-- @test vehiculos_inventario: L2 cada persona recibe, página a página, lo mismo que la policy (al principio, tras transferir, tras revocar y con el umbral de la cartera en 0)
begin;
-- Sin `humo.sql` (con SOLO=…), la dueña nace aquí: la primera cuenta es la dueña.
insert into auth.users (id, email) select '00000000-0000-0000-0000-000000000001', 'duena@ejemplo.com' where not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-000000000001');
create function pg_temp.vi_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_quien::text, ''), true), set_config('request.jwt.claim.role', 'authenticated', true),
          set_config('request.jwt.claims', case when p_quien is null then '{"role": "authenticated"}' else json_build_object('sub', p_quien, 'role', 'authenticated')::text end, true);
end $f$;
create function pg_temp.vi_persona(p_id uuid, p_concesiones jsonb) returns void language plpgsql as $f$
declare v_rol uuid; c jsonb;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('vi_' || substr(p_id::text, 30, 7), 'VI ' || substr(p_id::text, 30, 7)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  for c in select * from jsonb_array_elements(p_concesiones) loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, c ->> 'clave', nullif(c ->> 'origen', '')::uuid, coalesce(c ->> 'alcance', 'todos')::public.alcance_permiso);
  end loop;
end $f$;
-- Todas las páginas de la función como esa persona, de a `p_tamano`, de la más nueva a la más vieja. Falla si una página trae de más, si el orden no es
-- `(creado_en desc, id desc)` estricto o si una fila sale dos veces.
create function pg_temp.vi_recorrer(p_quien uuid, p_origen uuid, p_tamano int) returns uuid[] language plpgsql as $f$
declare v_ids uuid[] := '{}'; v_en timestamptz; v_id uuid; r record; v_n int; v_vueltas int := 0;
begin
  perform pg_temp.vi_como(p_quien);
  loop
    v_n := 0;
    set local role authenticated;
    for r in select x.id, x.creado_en from public.vehiculos_inventario(p_origen, p_tamano, '[]', v_en, v_id) x loop
      v_n := v_n + 1;
      exit when v_n > p_tamano;
      if v_en is not null and (r.creado_en, r.id) >= (v_en, v_id) then raise exception 'el inventario no va en (creado_en desc, id desc): % tras %', r.id, v_id; end if;
      if r.id = any (v_ids) then raise exception 'el inventario repite %', r.id; end if;
      v_ids := v_ids || r.id; v_en := r.creado_en; v_id := r.id;
    end loop;
    reset role;
    exit when v_n <= p_tamano;
    v_vueltas := v_vueltas + 1;
    if v_vueltas > 1000 then raise exception 'el recorrido no termina'; end if;
  end loop;
  return v_ids;
exception when others then
  reset role;
  raise;
end $f$;
-- Lo que la policy le entrega a esa persona de ese origen, en el orden del inventario: la referencia.
create function pg_temp.vi_ve(p_quien uuid, p_origen uuid) returns uuid[] language plpgsql as $f$
declare v uuid[];
begin
  perform pg_temp.vi_como(p_quien);
  set local role authenticated;
  select coalesce(array_agg(x.id order by x.creado_en desc, x.id desc), '{}') into v from public.vehiculos x where x.origen_id = p_origen;
  reset role;
  return v;
exception when others then
  reset role;
  raise;
end $f$;
create temp table vi_v (nombre text primary key, id uuid not null unique);
-- Cada persona y cada origen: la función (de a 3) contra la referencia. Los nombres van al mensaje.
create function pg_temp.vi_verificar(p_cuando text) returns void language plpgsql as $f$
declare q record; o record; v_fn uuid[]; v_ref uuid[];
begin
  for q in select * from (values ('00000000-0000-0000-0000-000000000001'::uuid, 'la dueña'), ('00000000-0000-0000-0000-000000000e71', 'P'), ('00000000-0000-0000-0000-000000000e72', 'Q'),
                                 ('00000000-0000-0000-0000-000000000e73', 'T'), ('00000000-0000-0000-0000-000000000e74', 'S'), (null, 'sin sesión')) x (id, nombre) loop
    for o in select id, clave from public.origenes where clave in ('vi_a', 'vi_b') order by clave loop
      v_fn := pg_temp.vi_recorrer(q.id, o.id, 3);
      v_ref := pg_temp.vi_ve(q.id, o.id);
      if v_fn is distinct from v_ref then
        raise exception 'L2 (%): % en % recibe % y la policy le entrega %', p_cuando, q.nombre, o.clave,
          (select array_agg(coalesce(n.nombre, x::text) order by k) from unnest(v_fn) with ordinality u (x, k) left join vi_v n on n.id = x),
          (select array_agg(coalesce(n.nombre, x::text) order by k) from unnest(v_ref) with ordinality u (x, k) left join vi_v n on n.id = x);
      end if;
    end loop;
  end loop;
end $f$;
do $$
declare
  d constant uuid := '00000000-0000-0000-0000-000000000001'; p constant uuid := '00000000-0000-0000-0000-000000000e71';
  q constant uuid := '00000000-0000-0000-0000-000000000e72'; t constant uuid := '00000000-0000-0000-0000-000000000e73'; s constant uuid := '00000000-0000-0000-0000-000000000e74';
  v_web uuid := (select id from public.origenes_lead where clave = 'web');
  o_a uuid; o_b uuid; l_p uuid; l_comp uuid; l_ajeno uuid; l_pap uuid; l_trans uuid; o uuid; k text;
begin
  if exists (select 1 from public.leads where telefono_principal like '7270%' and eliminado_en is null) then raise exception 'ya hay leads vivos con 7270…: los teléfonos chocarían'; end if;
  insert into public.origenes (clave, nombre) values ('vi_a', 'VI A') returning id into o_a;
  insert into public.origenes (clave, nombre) values ('vi_b', 'VI B') returning id into o_b;
  perform pg_temp.vi_persona(p, '[{"clave": "vehiculos.ver", "alcance": "propios"}, {"clave": "leads.ver", "alcance": "propios"}, {"clave": "leads.transferir", "alcance": "propios"}]');
  perform pg_temp.vi_persona(q, '[{"clave": "vehiculos.ver", "alcance": "propios"}, {"clave": "leads.ver", "alcance": "propios"}, {"clave": "leads.compartir", "alcance": "propios"}]');
  perform pg_temp.vi_persona(t, jsonb_build_array(jsonb_build_object('clave', 'vehiculos.ver', 'origen', o_a)));
  perform pg_temp.vi_persona(s, '[{"clave": "leads.ver", "alcance": "propios"}]');
  -- Los leads (el trigger le da la cartera a quien lo crea): de P; de Q compartido con P; de Q solo; de P en la papelera (sigue en su cartera, como para
  -- `en_cartera()`); y uno de P que transfiere después.
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos) values
    ('VI lead de P', '72700001', p, v_web, '{}') returning id into l_p;
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos) values ('VI lead compartido', '72700002', q, v_web, '{}') returning id into l_comp;
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos) values ('VI lead ajeno', '72700003', q, v_web, '{}') returning id into l_ajeno;
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos) values ('VI lead en la papelera', '72700004', p, v_web, '{}') returning id into l_pap;
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos) values ('VI lead que se transfiere', '72700005', p, v_web, '{}') returning id into l_trans;
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por) values (l_comp, p, 'compartido', q);
  update public.leads set eliminado_en = now() where id = l_pap;
  -- En A y en B, cada clase; los instantes se repiten de a tres (empates de creado_en). «mío» lo creó P; «de S», S; «sin creador», nadie (creado_por admite nulo).
  foreach o in array array[o_a, o_b] loop
    k := case o when o_a then 'A' else 'B' end;
    insert into public.vehiculos (origen_id, titulo, creado_por, lead_id, eliminado_en, creado_en)
    select o, x.n || '·' || k, x.c, x.l, x.e, timestamptz '2026-05-01 12:00:00+00' + (x.i % 4) * interval '1 minute' + case k when 'A' then interval '0' else interval '1 hour' end
      from (values (1, 'mío', p, null::uuid, null::timestamptz), (2, 'mío con cartera', p, l_p, null), (3, 'cartera', d, l_p, null), (4, 'sin creador', null, l_p, null),
                   (5, 'compartido', d, l_comp, null), (6, 'ajeno', d, l_ajeno, null), (7, 'sin lead', d, null, null), (8, 'mío en la papelera', p, null, now()),
                   (9, 'lead en la papelera', d, l_pap, null), (10, 'transferido', d, l_trans, null), (11, 'de S', s, null, null)) x (i, n, c, l, e);
  end loop;
  insert into vi_v select titulo, id from public.vehiculos where origen_id in (o_a, o_b);
  -- El terreno muerde: la referencia de P en A es la de la regla (y no está vacía).
  if (select array_agg(n.nombre order by n.nombre) from unnest(pg_temp.vi_ve(p, o_a)) x join vi_v n on n.id = x)
     is distinct from array['cartera·A', 'compartido·A', 'lead en la papelera·A', 'mío con cartera·A', 'mío·A', 'sin creador·A', 'transferido·A'] then
    raise exception 'L2: el terreno no es el esperado: P ve %', (select array_agg(n.nombre order by n.nombre) from unnest(pg_temp.vi_ve(p, o_a)) x join vi_v n on n.id = x);
  end if;
  perform pg_temp.vi_verificar('al principio');
  if cardinality(pg_temp.vi_recorrer(s, o_b, 3)) <> 0 or cardinality(pg_temp.vi_recorrer(null, o_a, 3)) <> 0 or cardinality(pg_temp.vi_recorrer(t, o_b, 3)) <> 0 then
    raise exception 'L2: S en B, sin sesión o T en B reciben algo';
  end if;
  -- P transfiere su lead a Q (y queda como compartida); después Q le quita el acceso.
  perform pg_temp.vi_como(p);
  set local role authenticated;
  perform public.lead_transferir(l_trans, q, p);
  reset role;
  perform pg_temp.vi_verificar('tras transferir');
  perform pg_temp.vi_como(q);
  set local role authenticated;
  perform public.lead_revocar_acceso(l_trans, p);
  reset role;
  if (select n.id from vi_v n where n.nombre = 'transferido·A') = any (pg_temp.vi_ve(p, o_a)) then raise exception 'L2: tras revocar, P sigue viendo lo transferido'; end if;
  perform pg_temp.vi_verificar('tras revocar');
  -- Con el umbral de la cartera en 0, quien ve «propios» va por el origen (R1) y la RLS decide fila a fila: lo mismo.
  create or replace function public._leads_cartera_corta_tope() returns integer language sql immutable parallel safe set search_path = '' as $c$ select 0 $c$;
  perform pg_temp.vi_como(p);
  set local role authenticated;
  if public.leads_cartera_corta() then reset role; raise exception 'L2: con el umbral en 0, la cartera de P sigue siendo corta'; end if;
  reset role;
  perform pg_temp.vi_verificar('con el umbral en 0');
end $$;
rollback;

-- @test vehiculos_inventario: L4 el cursor hacia adelante y hacia atrás con empates, el tamaño acotado, la portada y limpieza_el de cada ruta (R1, R2 y R3)
begin;
-- Sin `humo.sql` (con SOLO=…), la dueña nace aquí: la primera cuenta es la dueña.
insert into auth.users (id, email) select '00000000-0000-0000-0000-000000000001', 'duena@ejemplo.com' where not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-000000000001');
create function pg_temp.vi_pagina(p_quien uuid, p_origen uuid, p_tamano int, p_en timestamptz default null, p_id uuid default null, p_atras boolean default false)
  returns table (id uuid, creado_en timestamptz, limpieza_el date, portada_ruta text) language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true), set_config('request.jwt.claim.role', 'authenticated', true),
          set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  return query select x.id, x.creado_en, x.limpieza_el, x.portada_ruta from public.vehiculos_inventario(p_origen, p_tamano, '[]', p_en, p_id, p_atras) x;
  reset role;
exception when others then
  reset role;
  raise;
end $f$;
-- Todas las páginas, de a `p_tamano`: hacia adelante desde el principio, o hacia atrás desde el cursor (cada página en orden ascendente, como la pide `armarPagina`).
-- Devuelve los ids de lo más nuevo a lo más viejo; falla si una página trae de más, si el orden no es estricto o si una fila sale dos veces.
create function pg_temp.vi_recorrer(p_quien uuid, p_origen uuid, p_tamano int, p_en timestamptz default null, p_id uuid default null, p_atras boolean default false)
  returns uuid[] language plpgsql as $f$
declare v_ids uuid[] := '{}'; v_pag uuid[]; v_en timestamptz := p_en; v_id uuid := p_id; r record; v_n int; v_ant_en timestamptz; v_ant_id uuid;
begin
  loop
    v_n := 0; v_pag := '{}'; v_ant_en := null;
    for r in select * from pg_temp.vi_pagina(p_quien, p_origen, p_tamano, v_en, v_id, p_atras) loop
      v_n := v_n + 1;
      exit when v_n > p_tamano;
      if v_ant_en is not null and ((not p_atras and (r.creado_en, r.id) >= (v_ant_en, v_ant_id)) or (p_atras and (r.creado_en, r.id) <= (v_ant_en, v_ant_id))) then
        raise exception 'el inventario no va en orden (hacia atrás: %): % tras %', p_atras, r.id, v_ant_id;
      end if;
      if r.id = any (v_ids) or r.id = any (v_pag) then raise exception 'el inventario repite %', r.id; end if;
      v_pag := v_pag || r.id; v_ant_en := r.creado_en; v_ant_id := r.id;
    end loop;
    v_ids := case when p_atras then (select array_agg(x order by k desc) from unnest(v_pag) with ordinality u (x, k)) || v_ids else v_ids || v_pag end;
    exit when v_n <= p_tamano;
    v_en := v_ant_en; v_id := v_ant_id;
  end loop;
  return v_ids;
end $f$;
do $$
declare
  d constant uuid := '00000000-0000-0000-0000-000000000001'; p constant uuid := '00000000-0000-0000-0000-000000000e75';
  o uuid; l_p uuid; v_ref uuid[]; v_ids uuid[]; q uuid; v_tam int; r record; v_ult record; v_rutas text[] := '{}'; v_ruta text;
  v_foto2 uuid; v_foto1 uuid; v_foto3 uuid;
begin
  if exists (select 1 from public.leads where telefono_principal like '7270%' and eliminado_en is null) then raise exception 'ya hay leads vivos con 7270…: los teléfonos chocarían'; end if;
  -- La limpieza encendida y un origen de subasta. La regla de hoy ancla todo vehículo con lead (`vinculo`), así que en R3 `limpieza_el` sería siempre nula y no se
  -- vería si R3 relee: dentro de esta transacción nada ancla, y la referencia (`limpieza_el(v)`) usa la misma regla.
  update public.ajustes_empresa set limpieza_automatica = true, limpieza_dias_gracia = 7 where id = 1;
  create or replace function public._limpieza_ancla(v public.vehiculos) returns text language sql stable security definer set search_path = '' as $c$ select null::text $c$;
  insert into public.origenes (clave, nombre, tipo) values ('vi_s', 'VI subasta', 'subasta') returning id into o;
  insert into auth.users (id, email, raw_app_meta_data) values (p, p || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('vi_0000e75', 'VI 0000e75') returning id into q;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p, q, true);
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (q, 'vehiculos.ver', null, 'propios'), (q, 'leads.ver', null, 'propios');
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('VI lead de P (L4)', '72700101', p, (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l_p;
  -- 105 vivos, de a cuatro con el mismo instante. Un tercio lo creó P (R2), un tercio es de la dueña con el lead de P (R3), un tercio sólo de la dueña. Los pares,
  -- importados de una subasta que terminó hace 30 días (limpieza no nula); los impares, no. Y uno en la papelera.
  insert into public.vehiculos (origen_id, titulo, creado_por, lead_id, importado_apibara, subasta_en, estado_subasta, creado_en)
  select o, 'VI ' || i, case when i % 3 = 0 then p else d end, case when i % 3 = 1 then l_p end, i % 2 = 0, case when i % 2 = 0 then now() - interval '30 days' end,
         case when i % 2 = 0 then 'terminada'::public.estado_subasta end, timestamptz '2026-05-01 12:00:00+00' + (i / 4) * interval '1 second'
    from generate_series(1, 105) i;
  insert into public.vehiculos (origen_id, titulo, creado_por, eliminado_en) values (o, 'VI en la papelera', p, now());
  -- Fotos: el de dos (la que no es portada va primero), uno de P con portada y uno de la cartera con portada.
  select id into v_foto2 from public.vehiculos where origen_id = o and titulo = 'VI 98';
  select id into v_foto1 from public.vehiculos where origen_id = o and titulo = 'VI 99';
  select id into v_foto3 from public.vehiculos where origen_id = o and titulo = 'VI 100';
  insert into storage.objects (bucket_id, name) select 'vehiculos', x || '/' || repeat(h, 64) || '.webp' from (values (v_foto2, 'a'), (v_foto2, 'b'), (v_foto1, 'c'), (v_foto3, 'd')) f (x, h);
  insert into public.vehiculos_imagenes (vehiculo_id, hash, ruta, ruta_miniatura, ancho, alto, bytes, orden, es_portada)
  select x, repeat(h, 64), x || '/' || repeat(h, 64) || '.webp', x || '/' || repeat(h, 64) || '.webp', 1, 1, 1, k, por
    from (values (v_foto2, 'a', 0, false), (v_foto2, 'b', 1, true), (v_foto1, 'c', 0, true), (v_foto3, 'd', 0, true)) f (x, h, k, por);
  -- El cursor: la dueña (R1) y P (R2 y R3), hacia adelante de a 7 y de a 4, y de vuelta desde el último.
  foreach q in array array[d, p] loop
    v_ref := (select array_agg(x.id order by x.creado_en desc, x.id desc) from public.vehiculos x
               where x.origen_id = o and x.eliminado_en is null and (q = d or x.creado_por = p or x.lead_id = l_p));
    foreach v_tam in array array[7, 4] loop
      v_ids := pg_temp.vi_recorrer(q, o, v_tam);
      if v_ids is distinct from v_ref then raise exception 'L4: hacia adelante de a % (%) da % de %', v_tam, q, cardinality(v_ids), cardinality(v_ref); end if;
      select x.creado_en, x.id into v_ult from public.vehiculos x where x.id = v_ref[cardinality(v_ref)];
      v_ids := pg_temp.vi_recorrer(q, o, v_tam, v_ult.creado_en, v_ult.id, true);
      if v_ids is distinct from v_ref[1:cardinality(v_ref) - 1] then raise exception 'L4: hacia atrás de a % (%) da % de %', v_tam, q, cardinality(v_ids), cardinality(v_ref) - 1; end if;
    end loop;
  end loop;
  -- El tamaño: nulo y 5.000 dan el máximo + 1 (105 vivos para la dueña).
  foreach v_tam in array array[null, 5000] loop
    if (select count(*) from pg_temp.vi_pagina(d, o, v_tam)) <> 101 then raise exception 'L4: con tamaño % salen % filas (debían 101)', v_tam, (select count(*) from pg_temp.vi_pagina(d, o, v_tam)); end if;
  end loop;
  -- La portada y limpieza_el, por id, en la primera página de la dueña (R1) y de P (R2 y R3); con una fila de limpieza no nula en cada ruta.
  foreach q in array array[d, p] loop
    for r in select g.*, v.creado_por, v.lead_id, (select public.limpieza_el(v)) as esperada,
                    (select i.ruta_miniatura from public.vehiculos_imagenes i where i.vehiculo_id = g.id and i.es_portada) as portada
               from pg_temp.vi_pagina(q, o, 100) g join public.vehiculos v on v.id = g.id loop
      if r.limpieza_el is distinct from r.esperada then raise exception 'L4: limpieza_el de % es % (limpieza_el(v) da %)', r.id, r.limpieza_el, r.esperada; end if;
      if r.portada_ruta is distinct from r.portada then raise exception 'L4: la portada de % es % (debía %)', r.id, r.portada_ruta, r.portada; end if;
      v_ruta := case when q = d then 'R1' when r.creado_por = p then 'R2' else 'R3' end;
      if r.limpieza_el is not null and not v_ruta = any (v_rutas) then v_rutas := v_rutas || v_ruta; end if;
    end loop;
  end loop;
  if (select array_agg(x order by x) from unnest(v_rutas) x) is distinct from array['R1', 'R2', 'R3'] then raise exception 'L4: el terreno no tiene limpieza no nula en cada ruta: %', v_rutas; end if;
  if (select portada_ruta from pg_temp.vi_pagina(d, o, 100) where id = v_foto2) is distinct from v_foto2 || '/' || repeat('b', 64) || '.webp' then raise exception 'L4: el de dos fotos no da su portada'; end if;
end $$;
rollback;
