-- @test permisos: toda clave del catálogo tiene un punto de enforcement en la base (una función, una policy o una vista que la nombra)
-- «Un permiso existe sólo si hay un punto de enforcement» (`docs/DECISIONES.md`, 2026-10-11) era una regla sin cinturón: una clave sembrada
-- que nadie consulta es un interruptor de la matriz que no protege nada. Este bloque la comprueba. Las que hoy no tienen enforcement en la base
-- (su `aplicado_en` dice UI, vistas o una función edge) figuran acá, cada una con su motivo; si una de ellas llega a tenerlo, el bloque falla
-- y la excepción se borra. Una excepción nueva es una deuda a la vista: lleva su motivo y su fase.
create or replace function pg_temp.con_enforcement(p_clave text) returns boolean language sql stable as $$
  select exists (select 1 from pg_proc f join pg_namespace n on n.oid = f.pronamespace
                  where n.nspname !~ '^pg_' and n.nspname <> 'information_schema' and f.prosrc like '%''' || p_clave || '''%')
      or exists (select 1 from pg_policies c where coalesce(c.qual, '') || coalesce(c.with_check, '') like '%''' || p_clave || '''%')
      or exists (select 1 from pg_views v where v.schemaname !~ '^pg_' and v.schemaname <> 'information_schema' and v.definition like '%''' || p_clave || '''%');
$$;

do $$
declare
  r record; v_sin text[] := '{}'; v_sobran text[] := '{}';
  v_excepciones constant jsonb := jsonb_build_object(
    'datos.exportar.todo', 'UI + queries: la exportación de los datos de todos llega con la Fase 9 (Datos)',
    'logistica.pagos.confirmar', 'la RPC pago_confirmar llega con la Fase 6 (Logística)',
    'notificaciones.push', 'función edge de push (Fase 7): vive fuera de la base',
    'tablero.metricas.ver', 'UI + vistas del tablero de equipo (Fase 9)');
begin
  -- El autotest: una clave inventada no tiene enforcement y una real sí; si no, el detector no detecta.
  if pg_temp.con_enforcement('inventada.clave_que_nadie_consulta') then raise exception 'el detector da por enforzada una clave inventada'; end if;
  if not pg_temp.con_enforcement('web.cola.participar') or not pg_temp.con_enforcement('leads.ver') then raise exception 'el detector no ve el enforcement de claves que sí lo tienen'; end if;

  -- Los `cotizaciones.nivel.<clave>.ver|editar` los genera nivel_crear(): su enforcement no nombra la clave, la arma `_nodos_visibles()`. Los cubre el caso
  -- genérico de abajo, que recorre los niveles de la tabla (los sembrados y uno creado en la prueba).
  for r in select clave from public.permisos where nivel_clave is null order by clave loop
    if not pg_temp.con_enforcement(r.clave) and not v_excepciones ? r.clave then v_sin := v_sin || r.clave; end if;
  end loop;
  if cardinality(v_sin) > 0 then
    raise exception 'permisos sin ningún punto de enforcement (una función, una policy o una vista que los nombre): %. Crea el enforcement en la misma migración o, si de verdad vive fuera de la base, súmalo a las excepciones con su motivo', v_sin;
  end if;

  for r in select k as clave from jsonb_object_keys(v_excepciones) k loop
    if not exists (select 1 from public.permisos where clave = r.clave) then v_sobran := v_sobran || (r.clave || ' (ya no está en el catálogo)');
    elsif pg_temp.con_enforcement(r.clave) then v_sobran := v_sobran || (r.clave || ' (ya tiene enforcement)'); end if;
  end loop;
  if cardinality(v_sobran) > 0 then raise exception 'excepciones que ya no hacen falta, bórralas: %', v_sobran; end if;
end $$;

-- @test permisos: los de un nivel de acceso (cotizaciones.nivel.<clave>.ver|editar) tienen su nivel, y lo que los aplica es _nodos_visibles, que arma la clave
-- «Un permiso existe sólo si tiene su enforcement» (D7, 4.09): el enforcement de estos es estructural. Acá se prueba que lo es: (1) la estructura, y (2) el
-- comportamiento por cada nivel de la tabla, los sembrados y uno creado en este bloque con nivel_crear, sin una lista de claves en la prueba.
begin;
do $$
declare r record;
begin
  -- Estructura. Todo permiso `cotizaciones.nivel.%` tiene su nivel (check + FK) y todo nivel salvo «todos» tiene los dos (trigger diferido, aquí adelantado).
  if exists (select 1 from public.permisos p where (p.clave like 'cotizaciones.nivel.%') <> (p.nivel_clave is not null)) then raise exception 'un permiso de nivel sin nivel, o al revés'; end if;
  if exists (select 1 from public.permisos p where p.nivel_clave is not null and not exists (select 1 from public.cotizaciones_niveles n where n.clave = p.nivel_clave)) then
    raise exception 'un permiso de nivel sin su nivel'; end if;
  for r in select n.clave from public.cotizaciones_niveles n where n.clave <> 'todos' loop
    if (select count(*) from public.permisos p where p.nivel_clave = r.clave) <> 2
       or not exists (select 1 from public.permisos p where p.clave = 'cotizaciones.nivel.' || r.clave || '.ver')
       or not exists (select 1 from public.permisos p where p.clave = 'cotizaciones.nivel.' || r.clave || '.editar') then
      raise exception 'el nivel «%» no tiene sus dos permisos', r.clave; end if;
  end loop;
  if exists (select 1 from public.permisos p where p.nivel_clave = 'todos') then raise exception '«todos» no genera permisos'; end if;
  -- El enforcement arma la clave: la función existe, no es de nadie, y su texto lleva el prefijo.
  if not exists (select 1 from pg_proc f where f.proname = '_nodos_visibles' and f.prosrc like '%''cotizaciones.nivel.''%') then raise exception '_nodos_visibles no arma las claves de nivel'; end if;
  if not exists (select 1 from public.cotizaciones_niveles where clave = 'costos') or not exists (select 1 from public.cotizaciones_niveles where clave = 'todos') then raise exception 'faltan los niveles sembrados'; end if;
end $$;

-- Una fórmula publicada por el camino de publicar, con tres secciones para el nivel X: la del nivel (ver y editar), la de ver abierto y editar del nivel, y la abierta.
create or replace function pg_temp.formula_de_nivel(p_origen uuid, p_nivel text) returns uuid language plpgsql as $f$
declare
  v_def jsonb := '{"nodos": [{"id": "tc", "tipo": "tipo_cambio", "clave": "oficial", "etiqueta": "TC", "formato": "raw"},
      {"id": "a", "tipo": "input", "etiqueta": "A", "bucket": "origen"}, {"id": "b", "tipo": "input", "etiqueta": "B", "bucket": "origen"},
      {"id": "c", "tipo": "input", "etiqueta": "C", "bucket": "origen"},
      {"id": "total", "tipo": "calculo", "op": "suma", "de": ["a", "b", "c"], "etiqueta": "Total", "salida": "total", "bucket": "origen"}], "buckets": {"origen": "tc"}}';
  v_dis jsonb := jsonb_build_object('cabecera', '{"modos": [], "ver_total_bs": false}'::jsonb, 'secciones', jsonb_build_array(
      jsonb_build_object('id', 'del_nivel', 'presentacion', 'principal', 'nivel_ver', p_nivel, 'nivel_editar', p_nivel, 'items', jsonb_build_array(jsonb_build_object('tipo', 'celda', 'nodo', 'a', 'ancho', 'completo'))),
      jsonb_build_object('id', 'solo_editar', 'presentacion', 'principal', 'nivel_editar', p_nivel, 'items', jsonb_build_array(jsonb_build_object('tipo', 'celda', 'nodo', 'b', 'ancho', 'completo'))),
      jsonb_build_object('id', 'abierta', 'presentacion', 'principal', 'items', jsonb_build_array(jsonb_build_object('tipo', 'celda', 'nodo', 'c', 'ancho', 'completo')))),
    'tarjeta_total', '{"nodo": "total", "secundarios": []}'::jsonb);
  v_id uuid;
begin
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (p_origen, 1, 'publicada', v_def, '{}', v_dis, public._preparar_publicacion(v_def, '{}', v_dis, false)) returning id into v_id;
  return v_id;
end $f$;

-- Lo que llega a una persona: «nodo:e» (se edita) o «nodo:v» (sólo se ve), ordenado.
create or replace function pg_temp.llega(p_persona uuid, p_formula uuid) returns text language plpgsql as $f$
declare v text;
begin
  perform set_config('request.jwt.claim.sub', p_persona::text, true);
  select coalesce(string_agg(n.nodo || ':' || case when n.editar then 'e' else 'v' end, ',' order by n.nodo), '-') into v from public._nodos_visibles(p_formula) n;
  return v;
end $f$;

-- Una persona activa con un rol propio y estas concesiones: 'clave' (todos los orígenes) o 'clave@origen'.
create or replace function pg_temp.persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('nivel_' || substr(v_id::text, 1, 8), 'Nivel ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, 'todos');
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.espera_llega(p_que text, p_persona uuid, p_formula uuid, p_esperado text) returns void language plpgsql as $f$
declare v text := pg_temp.llega(p_persona, p_formula);
begin
  if v <> p_esperado then raise exception '%: llega «%» y tenía que llegar «%»', p_que, v, p_esperado; end if;
end $f$;

do $$
declare
  v_duena constant uuid := '00000000-0000-0000-0000-000000000001';
  v_o uuid; v_otro uuid; v_f uuid; r record; v_n int := 0; v_nuevo uuid := gen_random_uuid(); v_ver text; v_edi text; v_p uuid; v_l text;
  v_base constant text[] := array['cotizaciones.ver', 'cotizaciones.crear'];
begin
  insert into public.origenes (clave, nombre) values ('prueba_nivel', 'Prueba nivel') returning id into v_o;
  insert into public.origenes (clave, nombre) values ('prueba_nivel_otro', 'Prueba nivel otro') returning id into v_otro;
  -- Un nivel creado por la RPC, como lo haría quien gestiona roles, además de los sembrados.
  perform set_config('request.jwt.claim.sub', v_duena::text, true);
  set local role authenticated;
  perform public.nivel_crear(v_nuevo, 'Gerencia 2');
  reset role;
  for r in select n.clave from public.cotizaciones_niveles n where n.clave <> 'todos' order by n.clave loop
    v_n := v_n + 1;
    v_l := r.clave;
    v_ver := 'cotizaciones.nivel.' || v_l || '.ver';
    v_edi := 'cotizaciones.nivel.' || v_l || '.editar';
    delete from public.formulas where origen_id = v_o;
    v_f := pg_temp.formula_de_nivel(v_o, v_l);
    -- La versión armada tiene un nodo restringido por nivel en cada lugar: si no, la prueba no probaría nada.
    if (select visibilidad -> 'a' ->> 'ver' from public.formulas where id = v_f) <> v_l or (select visibilidad -> 'a' ->> 'editar' from public.formulas where id = v_f) <> v_l
       or (select visibilidad -> 'b' ->> 'ver' from public.formulas where id = v_f) <> 'todos' or (select visibilidad -> 'b' ->> 'editar' from public.formulas where id = v_f) <> v_l then
      raise exception 'la versión armada no tiene los nodos restringidos del nivel %: %', v_l, (select visibilidad from public.formulas where id = v_f); end if;

    -- Sin el nivel: lo abierto llega y se edita, lo de ver abierto y editar del nivel llega sin poderse editar, lo del nivel no llega; el total se ve.
    perform pg_temp.espera_llega(v_l || ': sin el nivel', pg_temp.persona(v_base), v_f, 'b:v,c:e,total:v');
    -- Con el ver del nivel: llega lo suyo, sin editarse.
    perform pg_temp.espera_llega(v_l || ': con el ver', pg_temp.persona(v_base || v_ver), v_f, 'a:v,b:v,c:e,total:v');
    -- Con el editar del nivel y sin su ver: se edita lo de ver abierto, y lo del nivel no llega (no se edita lo que no se ve).
    perform pg_temp.espera_llega(v_l || ': con el editar y sin el ver', pg_temp.persona(v_base || v_edi), v_f, 'b:e,c:e,total:v');
    -- Con los dos: se edita todo.
    perform pg_temp.espera_llega(v_l || ': con los dos', pg_temp.persona(v_base || v_ver || v_edi), v_f, 'a:e,b:e,c:e,total:v');
    -- Concedido para otro origen: no cuenta en éste.
    perform pg_temp.espera_llega(v_l || ': el nivel de otro origen', pg_temp.persona(v_base || (v_ver || '@' || v_otro) || (v_edi || '@' || v_otro)), v_f, 'b:v,c:e,total:v');
    -- Concedido a este origen: cuenta.
    perform pg_temp.espera_llega(v_l || ': el nivel de este origen', pg_temp.persona(v_base || (v_ver || '@' || v_o) || (v_edi || '@' || v_o)), v_f, 'a:e,b:e,c:e,total:v');
    -- Sin cotizaciones.ver el nivel no abre nada, y sin crear ni editar nada se edita aunque se tenga el nivel.
    perform pg_temp.espera_llega(v_l || ': el nivel sin cotizaciones.ver', pg_temp.persona(array['cotizaciones.crear', v_ver, v_edi]), v_f, '-');
    perform pg_temp.espera_llega(v_l || ': sólo ver', pg_temp.persona(array['cotizaciones.ver', v_ver, v_edi]), v_f, 'a:v,b:v,c:v,total:v');
    -- Quien configura recibe lo que la visibilidad no nombra (aquí el tipo de cambio), sin poder editarlo; el total, que se ve con cotizaciones.ver, no.
    perform pg_temp.espera_llega(v_l || ': quien configura', pg_temp.persona(array['cotizaciones.configurar']), v_f, 'tc:v');
    -- Sin permisos, y bloqueada con todos: nada.
    perform pg_temp.espera_llega(v_l || ': sin permisos', pg_temp.persona('{}'), v_f, '-');
    v_p := pg_temp.persona(v_base || array[v_ver, v_edi, 'cotizaciones.configurar']);
    update public.perfiles set bloqueado = true where id = v_p;
    perform pg_temp.espera_llega(v_l || ': bloqueada', v_p, v_f, '-');
    -- Una fórmula que no existe no devuelve nada.
    perform pg_temp.espera_llega(v_l || ': fórmula inexistente', pg_temp.persona(v_base), gen_random_uuid(), '-');
  end loop;
  -- «costos» (sembrado) y el creado en este bloque: «todos» no genera permisos.
  if v_n < 2 or v_n <> (select count(*) from public.cotizaciones_niveles n where n.clave <> 'todos') or v_nuevo is null
     or not exists (select 1 from public.cotizaciones_niveles n where n.id = v_nuevo) then
    raise exception 'el caso genérico no recorrió los niveles sembrados y el creado (%)', v_n; end if;
end $$;
rollback;
