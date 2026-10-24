-- Los niveles de acceso de la hoja (`…20261019006100_niveles_de_acceso.sql`, paso 4.09 prompt 1; docs/COTIZADOR.md › «En la base (4.09-1)»): la siembra, el tope,
-- crear, renombrar, retirar y eliminar por RPC, los permisos que genera cada nivel y su concesión al dueño, la estructura que ata permisos y niveles
-- (check, FK, trigger diferido), el uso que impide eliminar, `_niveles_de_cotizacion()` desde la tabla y la actividad sin contenido de fórmula.
-- Corre al final de `db:probar`, después de `humo.sql`: la dueña es `…0001`. El enforcement de los permisos (`_nodos_visibles`) está en `permisos-enforcement.sql`.
-- Cada bloque abre su transacción y la revierte: deja la base como la encontró.

create or replace function pg_temp.motivo(p_sql text) returns text language plpgsql as $$
declare v_e text; v_d text; v_h text; v_m text;
begin
  execute p_sql;
  return 'sin error';
exception when others then
  get stacked diagnostics v_d = pg_exception_detail, v_h = pg_exception_hint, v_m = message_text;
  v_e := sqlstate;
  return v_e || ':' || coalesce(nullif(v_d, ''), '-') || '@' || coalesce(v_h, '') || ' ' || v_m;
end $$;

-- Falla con ese estado y ese texto en el mensaje (y, si se da, ese hint y ese detail).
create or replace function pg_temp.falla_con(p_sql text, p_estado text, p_texto text, p_hint text default null, p_detail text default null) returns void language plpgsql as $$
declare v text := pg_temp.motivo(p_sql);
begin
  if v = 'sin error' or left(v, 5) <> p_estado or position(p_texto in v) = 0
     or (p_hint is not null and position('@' || p_hint || ' ' in v) = 0) or (p_detail is not null and position(':' || p_detail || '@' in v) = 0) then
    raise exception '% debía fallar con % y «%» (hint %, detail %), dio «%»', p_sql, p_estado, p_texto, p_hint, p_detail, v;
  end if;
end $$;

-- Una persona activa con un rol propio y estas concesiones ('clave', todos los orígenes).
create or replace function pg_temp.persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('nivel_' || substr(v_id::text, 1, 8), 'Nivel ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.como(p_persona uuid) returns void language sql as $$ select set_config('request.jwt.claim.sub', p_persona::text, true) $$;

-- Una versión de fórmula de ese origen que nombra el nivel: `k` de sus cuatro entradas van en una sección de ese nivel (ver y editar), el resto en una abierta.
create or replace function pg_temp.version(p_origen uuid, p_nivel text, p_estado text, p_version int, p_k int) returns uuid language plpgsql as $f$
declare
  v_def jsonb := '{"nodos": [{"id": "tc", "tipo": "tipo_cambio", "clave": "oficial", "etiqueta": "TC", "formato": "raw"},
      {"id": "a", "tipo": "input", "etiqueta": "A", "bucket": "origen"}, {"id": "b", "tipo": "input", "etiqueta": "B", "bucket": "origen"},
      {"id": "c", "tipo": "input", "etiqueta": "C", "bucket": "origen"}, {"id": "d", "tipo": "input", "etiqueta": "D", "bucket": "origen"},
      {"id": "total", "tipo": "calculo", "op": "suma", "de": ["a", "b", "c", "d"], "etiqueta": "Total", "salida": "total", "bucket": "origen"}], "buckets": {"origen": "tc"}}';
  v_nodos text[] := array['a', 'b', 'c', 'd'];
  v_sec jsonb := '[]'::jsonb; v_dis jsonb; v_id uuid; v_vis jsonb;
begin
  if p_k > 0 then
    v_sec := v_sec || jsonb_build_array(jsonb_build_object('id', 'del_nivel', 'presentacion', 'principal', 'nivel_ver', p_nivel, 'nivel_editar', p_nivel,
      'items', (select jsonb_agg(jsonb_build_object('tipo', 'celda', 'nodo', v_nodos[i], 'ancho', 'completo') order by i) from generate_series(1, p_k) i)));
  end if;
  if p_k < 4 then
    v_sec := v_sec || jsonb_build_array(jsonb_build_object('id', 'abierta', 'presentacion', 'principal',
      'items', (select jsonb_agg(jsonb_build_object('tipo', 'celda', 'nodo', v_nodos[i], 'ancho', 'completo') order by i) from generate_series(p_k + 1, 4) i)));
  end if;
  v_dis := jsonb_build_object('cabecera', '{"modos": [], "ver_total_bs": false}'::jsonb, 'secciones', v_sec, 'tarjeta_total', '{"nodo": "total", "secundarios": []}'::jsonb);
  if p_estado = 'borrador' then
    insert into public.formulas (origen_id, estado, definicion, params, diseno) values (p_origen, 'borrador', v_def, '{}', v_dis) returning id into v_id;
  else
    v_vis := public._preparar_publicacion(v_def, '{}', v_dis, false);
    insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
    values (p_origen, p_version, p_estado::public.estado_version, v_def, '{}', v_dis, v_vis) returning id into v_id;
  end if;
  return v_id;
end $f$;

-- @test niveles: la siembra (todos y costos), los permisos de costos con su concesión al dueño, y el tope de 10
do $$
declare v_n int;
begin
  if (select string_agg(clave || '=' || nombre, ',' order by clave) from public.cotizaciones_niveles) <> 'costos=Costos,todos=Todos' then raise exception 'la siembra: %', (select jsonb_agg(to_jsonb(n)) from public.cotizaciones_niveles n); end if;
  if exists (select 1 from public.cotizaciones_niveles where retirado_en is not null) then raise exception 'un nivel sembrado nace retirado'; end if;
  if (select string_agg(clave, ',' order by clave) from public.permisos where nivel_clave is not null) <> 'cotizaciones.nivel.costos.editar,cotizaciones.nivel.costos.ver' then raise exception '«todos» no genera permisos y «costos» genera dos'; end if;
  if exists (select 1 from public.permisos p where p.nivel_clave = 'costos' and not (p.por_origen and not p.con_alcance and p.modulo = 'cotizaciones' and p.aplicado_en like '_nodos_visibles%')) then
    raise exception 'los permisos de nivel nacen por origen, sin alcance y con su enforcement: %', (select jsonb_agg(to_jsonb(p)) from public.permisos p where nivel_clave = 'costos'); end if;
  -- El dueño los tiene concedidos para todos los orígenes (origen nulo) con alcance «todos».
  select count(*) into v_n from public.roles_permisos rp join public.roles r on r.id = rp.rol_id
   where r.clave = 'dueno' and rp.permiso_clave like 'cotizaciones.nivel.costos.%' and rp.origen_id is null and rp.alcance = 'todos';
  if v_n <> 2 then raise exception 'el dueño tiene % de las 2 concesiones de costos', v_n; end if;
  if public._niveles_tope() <> 10 then raise exception 'el tope: %', public._niveles_tope(); end if;
  if (select (public._niveles_lista() ->> 'tope')::int) <> 10 or jsonb_array_length(public._niveles_lista() -> 'niveles') <> 2 then raise exception 'la lista: %', public._niveles_lista(); end if;
  -- «todos» va primero en la lista.
  if public._niveles_lista() #>> '{niveles,0,clave}' <> 'todos' then raise exception '«todos» no va primero'; end if;
end $$;

-- @test niveles: crear (reintento, clave del nombre con tildes y dígitos, permisos y concesión al dueño) y lo que rechaza
begin;
do $$
declare
  v_duena constant uuid := '00000000-0000-0000-0000-000000000001'; v_id uuid := gen_random_uuid(); r jsonb; v_clave text;
begin
  perform pg_temp.como(v_duena);
  set local role authenticated;
  r := public.nivel_crear(v_id, '  Ñandú   Ción 2 ');
  reset role;
  if r ->> 'clave' <> 'nandu_cion_2' or r ->> 'repetido' <> 'false' then raise exception 'crear: %', r; end if;
  if (select nombre from public.cotizaciones_niveles where id = v_id) <> 'Ñandú Ción 2' then raise exception 'el nombre no se normalizó'; end if;
  if (select count(*) from public.permisos where nivel_clave = 'nandu_cion_2') <> 2 then raise exception 'sin sus dos permisos'; end if;
  if (select nombre from public.permisos where clave = 'cotizaciones.nivel.nandu_cion_2.ver') <> 'Ver el nivel «Ñandú Ción 2»' then raise exception 'el nombre del permiso'; end if;
  if (select count(*) from public.roles_permisos rp join public.roles ro on ro.id = rp.rol_id
       where ro.clave = 'dueno' and rp.permiso_clave like 'cotizaciones.nivel.nandu_cion_2.%' and rp.origen_id is null and rp.alcance = 'todos') <> 2 then raise exception 'el dueño no recibe sus dos permisos'; end if;
  -- El reintento con el mismo id no duplica.
  set local role authenticated;
  r := public.nivel_crear(v_id, 'Ñandú Ción 2');
  reset role;
  if r ->> 'repetido' <> 'true' or (select count(*) from public.cotizaciones_niveles where clave = 'nandu_cion_2') <> 1 or (select count(*) from public.permisos where nivel_clave = 'nandu_cion_2') <> 2 then raise exception 'el reintento duplicó: %', r; end if;
  -- Un nombre que empieza con dígito lleva «n_» delante.
  set local role authenticated;
  v_clave := public.nivel_crear(gen_random_uuid(), '2da planta') ->> 'clave';
  reset role;
  if v_clave <> 'n_2da_planta' then raise exception 'la clave de «2da planta»: %', v_clave; end if;
  -- La clave sale del nombre cortada en 30.
  set local role authenticated;
  v_clave := public.nivel_crear(gen_random_uuid(), 'abcdefghijklmnopqrstuvwxyz0123456789') ->> 'clave';
  reset role;
  if v_clave <> 'abcdefghijklmnopqrstuvwxyz0123' then raise exception 'la clave larga: %', v_clave; end if;
  -- La lista que devuelve trae los de ahora, «todos» primero.
  if jsonb_array_length(r -> 'lista' -> 'niveles') <> 3 then raise exception 'la lista: %', r -> 'lista'; end if;
end $$;
rollback;

-- @test niveles: crear rechaza el nombre repetido, la clave repetida (también la de uno retirado y «todos»), el nombre vacío o largo y la clave corta
begin;
do $$
declare v_duena constant uuid := '00000000-0000-0000-0000-000000000001';
begin
  perform pg_temp.como(v_duena);
  set local role authenticated;
  perform pg_temp.falla_con($f$select public.nivel_crear(gen_random_uuid(), 'costos')$f$, '23505', 'Ya hay un nivel «costos»', 'nombre');
  perform pg_temp.falla_con($f$select public.nivel_crear(gen_random_uuid(), '  COSTOS ')$f$, '23505', 'Ya hay un nivel «COSTOS»', 'nombre');
  -- La misma clave con otro nombre: «Costos!» y «Cóstos» dan la clave «costos».
  perform pg_temp.falla_con($f$select public.nivel_crear(gen_random_uuid(), 'Costos!')$f$, '23505', 'Ya hay un nivel con la clave «costos»: elige otro nombre', 'nombre');
  perform pg_temp.falla_con($f$select public.nivel_crear(gen_random_uuid(), 'Cóstos')$f$, '23505', 'Ya hay un nivel con la clave «costos»: elige otro nombre', 'nombre');
  perform pg_temp.falla_con($f$select public.nivel_crear(gen_random_uuid(), 'TODOS!')$f$, '23505', 'Ya hay un nivel con la clave «todos»: elige otro nombre', 'nombre');
  perform pg_temp.falla_con($f$select public.nivel_crear(gen_random_uuid(), '')$f$, '22023', 'Escribe el nombre del nivel', 'nombre');
  perform pg_temp.falla_con($f$select public.nivel_crear(gen_random_uuid(), '   ')$f$, '22023', 'Escribe el nombre del nivel', 'nombre');
  perform pg_temp.falla_con($f$select public.nivel_crear(gen_random_uuid(), null)$f$, '22023', 'Escribe el nombre del nivel', 'nombre');
  perform pg_temp.falla_con($f$select public.nivel_crear(gen_random_uuid(), repeat('a', 41))$f$, '22023', 'hasta 40 caracteres', 'nombre');
  perform pg_temp.falla_con($f$select public.nivel_crear(gen_random_uuid(), '!')$f$, '22023', 'al menos dos letras o números', 'nombre');
  perform pg_temp.falla_con($f$select public.nivel_crear(gen_random_uuid(), 'a')$f$, '22023', 'al menos dos letras o números', 'nombre');
  perform pg_temp.falla_con($f$select public.nivel_crear(null, 'Uno')$f$, '22023', 'Falta el identificador');
  reset role;
  -- Con «costos» retirado, su clave sigue ocupada: se rechaza limpio y no queda un nivel sin permisos.
  update public.cotizaciones_niveles set retirado_en = now() where clave = 'costos';
  set local role authenticated;
  perform pg_temp.falla_con($f$select public.nivel_crear(gen_random_uuid(), 'Costos!')$f$, '23505', 'Ya hay un nivel con la clave «costos» (retirado): elige otro nombre', 'nombre');
  reset role;
  if (select count(*) from public.cotizaciones_niveles) <> 2 or (select count(*) from public.permisos where nivel_clave is not null) <> 2 then raise exception 'un rechazo dejó filas'; end if;
end $$;
rollback;

-- @test niveles: el tope de 10 niveles (con «todos» y los retirados): se llena con los de prueba, el siguiente se rechaza
begin;
do $$
declare v_duena constant uuid := '00000000-0000-0000-0000-000000000001'; i int;
begin
  perform pg_temp.como(v_duena);
  set local role authenticated;
  for i in 1 .. 8 loop perform public.nivel_crear(gen_random_uuid(), 'Relleno ' || i); end loop;
  if (select count(*) from public.cotizaciones_niveles) <> 10 then raise exception 'el tope: % niveles', (select count(*) from public.cotizaciones_niveles); end if;
  perform pg_temp.falla_con($f$select public.nivel_crear(gen_random_uuid(), 'Uno de más')$f$, '22023', 'Ya hay 10 niveles, que es el máximo', 'nombre');
  reset role;
  -- Un retirado cuenta para el tope.
  update public.cotizaciones_niveles set retirado_en = now() where clave = 'relleno_1';
  set local role authenticated;
  perform pg_temp.falla_con($f$select public.nivel_crear(gen_random_uuid(), 'Otro de más')$f$, '22023', 'que es el máximo', 'nombre');
  -- El reintento de un intento ya hecho no cae en el tope.
  if (public.nivel_crear((select id from public.cotizaciones_niveles where clave = 'relleno_2'), 'Relleno 2') ->> 'repetido') <> 'true' then raise exception 'el reintento'; end if;
  reset role;
  if jsonb_array_length(public._niveles_lista() -> 'niveles') <> 10 then raise exception 'la lista lleva los 10'; end if;
end $$;
rollback;

-- @test niveles: renombrar cambia el nombre y el de sus permisos, no la clave ni las concesiones; pide versión; «todos» no
begin;
do $$
declare
  v_duena constant uuid := '00000000-0000-0000-0000-000000000001'; v_id uuid := gen_random_uuid(); r jsonb; v_v timestamptz; v_rol uuid; v_conc int;
begin
  perform pg_temp.como(v_duena);
  set local role authenticated;
  r := public.nivel_crear(v_id, 'Gerencia');
  v_v := (r ->> 'actualizado_en')::timestamptz;
  r := public.nivel_renombrar(v_id, v_v, 'Dirección');
  reset role;
  if (select clave from public.cotizaciones_niveles where id = v_id) <> 'gerencia' then raise exception 'la clave cambió'; end if;
  if (select nombre from public.cotizaciones_niveles where id = v_id) <> 'Dirección' then raise exception 'el nombre no cambió'; end if;
  if (select nombre from public.permisos where clave = 'cotizaciones.nivel.gerencia.editar') <> 'Editar el nivel «Dirección»' then raise exception 'el permiso conserva el nombre viejo'; end if;
  if (r ->> 'actualizado_en')::timestamptz <= v_v then raise exception 'la versión no se movió'; end if;
  -- Una versión vieja es PT409, una nula también (con su mensaje); un id que no existe es PT409.
  set local role authenticated;
  perform pg_temp.falla_con(format($f$select public.nivel_renombrar(%L, %L, 'Otra')$f$, v_id, v_v), 'PT409', 'Otra persona cambió este nivel');
  perform pg_temp.falla_con(format($f$select public.nivel_renombrar(%L, null, 'Otra')$f$, v_id), 'P0001', 'Falta la versión');
  perform pg_temp.falla_con($f$select public.nivel_renombrar(gen_random_uuid(), now(), 'Otra')$f$, 'PT409', 'ya no existe');
  -- «todos» no se renombra; un nombre repetido se rechaza; «costos» sí se renombra.
  perform pg_temp.falla_con(format($f$select public.nivel_renombrar(%L, %L, 'Otro')$f$, (select id from public.cotizaciones_niveles where clave = 'todos'),
                               (select actualizado_en from public.cotizaciones_niveles where clave = 'todos')), '22023', '«Todos» no se renombra');
  perform pg_temp.falla_con(format($f$select public.nivel_renombrar(%L, %L, ' costos ')$f$, v_id, (r ->> 'actualizado_en')::timestamptz), '23505', 'Ya hay un nivel «costos»', 'nombre');
  r := public.nivel_renombrar((select id from public.cotizaciones_niveles where clave = 'costos'), (select actualizado_en from public.cotizaciones_niveles where clave = 'costos'), 'Costos internos');
  reset role;
  if (select nombre from public.permisos where clave = 'cotizaciones.nivel.costos.ver') <> 'Ver el nivel «Costos internos»' then raise exception 'costos se renombra con sus permisos'; end if;
  -- Renombrar no le devuelve al dueño lo que alguien le haya quitado.
  select id into v_rol from public.roles where clave = 'dueno';
  delete from public.roles_permisos where rol_id = v_rol and permiso_clave = 'cotizaciones.nivel.gerencia.ver';
  set local role authenticated;
  perform public.nivel_renombrar(v_id, (select actualizado_en from public.cotizaciones_niveles where id = v_id), 'Dirección general');
  reset role;
  select count(*) into v_conc from public.roles_permisos where rol_id = v_rol and permiso_clave = 'cotizaciones.nivel.gerencia.ver';
  if v_conc <> 0 then raise exception 'renombrar volvió a conceder'; end if;
  -- Guardar el mismo nombre no mueve la versión.
  set local role authenticated;
  v_v := (select actualizado_en from public.cotizaciones_niveles where id = v_id);
  perform public.nivel_renombrar(v_id, v_v, 'Dirección general');
  reset role;
  if (select actualizado_en from public.cotizaciones_niveles where id = v_id) <> v_v then raise exception 'la versión se movió sin cambios'; end if;
end $$;
rollback;

-- @test niveles: retirar deja el nivel, sus permisos y sus concesiones; entra a la lista de retirados y publicar lo rechaza; «todos» no se retira
begin;
do $$
declare
  v_duena constant uuid := '00000000-0000-0000-0000-000000000001'; v_id uuid := gen_random_uuid(); r jsonb; v_v timestamptz; v_o uuid; n record; v_ret timestamptz;
begin
  perform pg_temp.como(v_duena);
  set local role authenticated;
  r := public.nivel_crear(v_id, 'Gerencia');
  v_v := (r ->> 'actualizado_en')::timestamptz;
  r := public.nivel_retirar(v_id, v_v);
  reset role;
  if (select retirado_en from public.cotizaciones_niveles where id = v_id) is null then raise exception 'no se retiró'; end if;
  if (r ->> 'actualizado_en')::timestamptz <= v_v then raise exception 'la versión no se movió'; end if;
  if (select count(*) from public.permisos where nivel_clave = 'gerencia') <> 2 then raise exception 'retirar borró permisos'; end if;
  if (select count(*) from public.roles_permisos where permiso_clave like 'cotizaciones.nivel.gerencia.%') <> 2 then raise exception 'retirar borró concesiones'; end if;
  select * into n from public._niveles_de_cotizacion();
  if n.niveles <> array['costos', 'gerencia'] or n.retirados <> array['gerencia'] then raise exception 'los niveles: % y %', n.niveles, n.retirados; end if;
  -- Retirar otra vez es lo mismo: la fecha de retiro no se pisa (se la envejece sin disparar triggers, porque `now()` no cambia dentro de la transacción).
  set local session_replication_role = replica;
  update public.cotizaciones_niveles set retirado_en = now() - interval '1 day' where id = v_id;
  set local session_replication_role = origin;
  v_ret := (select retirado_en from public.cotizaciones_niveles where id = v_id);
  set local role authenticated;
  perform public.nivel_retirar(v_id, (select actualizado_en from public.cotizaciones_niveles where id = v_id));
  reset role;
  if (select retirado_en from public.cotizaciones_niveles where id = v_id) is distinct from v_ret then raise exception 'retirar otra vez pisó la fecha'; end if;
  -- Versión vieja, PT409; «todos», 22023.
  set local role authenticated;
  perform pg_temp.falla_con(format($f$select public.nivel_retirar(%L, %L)$f$, v_id, v_v), 'PT409', 'Otra persona cambió este nivel');
  perform pg_temp.falla_con(format($f$select public.nivel_retirar(%L, %L)$f$, (select id from public.cotizaciones_niveles where clave = 'todos'),
                               (select actualizado_en from public.cotizaciones_niveles where clave = 'todos')), '22023', '«Todos» no se retira');
  perform pg_temp.falla_con($f$select public.nivel_retirar(gen_random_uuid(), now())$f$, 'PT409', 'ya no existe');
  reset role;
  -- Publicar un diseño que lo nombra se rechaza (nivel_retirado); el ⚙ no (copia el diseño y pasa los retirados vacíos).
  insert into public.origenes (clave, nombre) values ('prueba_retirar', 'Prueba retirar') returning id into v_o;
  perform pg_temp.falla_con(format($f$select pg_temp.version(%L, 'gerencia', 'publicada', 1, 2)$f$, v_o), '22023', '', 'del_nivel', 'nivel_retirado');
  -- «costos» retirado: el seed ya no puede volver a publicar a quien lo nombre.
  update public.cotizaciones_niveles set retirado_en = now() where clave = 'costos';
  perform pg_temp.falla_con(format($f$select pg_temp.version(%L, 'costos', 'publicada', 1, 2)$f$, v_o), '22023', '', 'del_nivel', 'nivel_retirado');
end $$;
rollback;

-- @test niveles: eliminar uno sin uso borra el nivel, sus dos permisos y sus concesiones; «todos» y «costos» no; la versión se pide
begin;
do $$
declare
  v_duena constant uuid := '00000000-0000-0000-0000-000000000001'; v_id uuid := gen_random_uuid(); r jsonb; v_v timestamptz; v_p uuid; v_rol uuid; v_rol_v timestamptz;
begin
  perform pg_temp.como(v_duena);
  set local role authenticated;
  r := public.nivel_crear(v_id, 'Gerencia');
  v_v := (r ->> 'actualizado_en')::timestamptz;
  reset role;
  -- Una concesión de otro rol (por origen) también cae.
  v_p := pg_temp.persona(array['cotizaciones.nivel.gerencia.ver']);
  select ur.rol_id into v_rol from public.usuarios_roles ur where ur.usuario_id = v_p;
  -- `now()` no cambia dentro de la transacción: se envejece el rol sin disparar su trigger de versión para ver que eliminar lo mueve.
  set local session_replication_role = replica;
  update public.roles set actualizado_en = now() - interval '1 hour' where id = v_rol;
  set local session_replication_role = origin;
  select actualizado_en into v_rol_v from public.roles where id = v_rol;
  perform pg_temp.como(v_duena);
  set local role authenticated;
  perform pg_temp.falla_con(format($f$select public.nivel_eliminar(%L, %L)$f$, v_id, v_v - interval '1 second'), 'PT409', 'Otra persona cambió este nivel');
  perform pg_temp.falla_con(format($f$select public.nivel_eliminar(%L, null)$f$, v_id), 'P0001', 'Falta la versión');
  r := public.nivel_eliminar(v_id, v_v);
  reset role;
  if exists (select 1 from public.cotizaciones_niveles where clave = 'gerencia') then raise exception 'el nivel sigue'; end if;
  if exists (select 1 from public.permisos where nivel_clave = 'gerencia' or clave like 'cotizaciones.nivel.gerencia.%') then raise exception 'sus permisos siguen'; end if;
  if exists (select 1 from public.roles_permisos where permiso_clave like 'cotizaciones.nivel.gerencia.%') then raise exception 'sus concesiones siguen'; end if;
  if (select actualizado_en from public.roles where id = v_rol) <= v_rol_v then raise exception 'el rol que lo tenía no vio una versión nueva'; end if;
  if jsonb_array_length(r -> 'lista' -> 'niveles') <> 2 then raise exception 'la lista: %', r -> 'lista'; end if;
  -- La actividad: sin contenido de fórmula, con cuántas concesiones se fueron.
  if not exists (select 1 from public.actividad a where a.accion = 'nivel.eliminar' and a.registro_id = v_id::text and a.antes ->> 'clave' = 'gerencia' and (a.detalle ->> 'concesiones')::int = 3) then
    raise exception 'la actividad de eliminar: %', (select jsonb_agg(to_jsonb(a)) from public.actividad a where a.accion = 'nivel.eliminar'); end if;
  -- Un nivel que ya no existe, «todos» y «costos».
  set local role authenticated;
  perform pg_temp.falla_con(format($f$select public.nivel_eliminar(%L, %L)$f$, v_id, v_v), 'PT409', 'ya no existe');
  perform pg_temp.falla_con(format($f$select public.nivel_eliminar(%L, %L)$f$, (select id from public.cotizaciones_niveles where clave = 'todos'),
                               (select actualizado_en from public.cotizaciones_niveles where clave = 'todos')), '22023', '«Todos» no se elimina');
  perform pg_temp.falla_con(format($f$select public.nivel_eliminar(%L, %L)$f$, (select id from public.cotizaciones_niveles where clave = 'costos'),
                               (select actualizado_en from public.cotizaciones_niveles where clave = 'costos')), '22023', 'no se elimina. Puedes retirarlo');
  reset role;
end $$;
rollback;

-- @test niveles: eliminar uno que una versión nombra (borrador, publicada o archivada) responde cuántas celdas de cuántos orígenes y ofrece retirar
begin;
do $$
declare
  v_duena constant uuid := '00000000-0000-0000-0000-000000000001'; v_id uuid := gen_random_uuid(); v_v timestamptz; v_o1 uuid; v_o2 uuid; v_o3 uuid; v_msg text;
begin
  perform pg_temp.como(v_duena);
  set local role authenticated;
  v_v := (public.nivel_crear(v_id, 'Gerencia') ->> 'actualizado_en')::timestamptz;
  reset role;
  insert into public.origenes (clave, nombre) values ('prueba_uso_1', 'Prueba uso 1') returning id into v_o1;
  insert into public.origenes (clave, nombre) values ('prueba_uso_2', 'Prueba uso 2') returning id into v_o2;
  insert into public.origenes (clave, nombre) values ('prueba_uso_3', 'Prueba uso 3') returning id into v_o3;

  -- Sólo un borrador lo nombra (2 celdas).
  perform pg_temp.version(v_o1, 'gerencia', 'borrador', null, 2);
  set local role authenticated;
  perform pg_temp.falla_con(format($f$select public.nivel_eliminar(%L, %L)$f$, v_id, v_v), '23503', 'Está en 2 celdas de 1 origen (en alguna versión de su fórmula): no se elimina. Puedes retirarlo', 'retirar', 'nivel_en_uso');
  reset role;
  -- Sólo una archivada lo nombra: la publicada de ese origen ya no. Cuenta igual (las cotizaciones viejas se leen con su versión).
  delete from public.formulas where origen_id = v_o1;
  perform pg_temp.version(v_o1, 'gerencia', 'archivada', 1, 3);
  perform pg_temp.version(v_o1, 'costos', 'publicada', 2, 1);
  set local role authenticated;
  perform pg_temp.falla_con(format($f$select public.nivel_eliminar(%L, %L)$f$, v_id, v_v), '23503', 'Está en 3 celdas de 1 origen', 'retirar', 'nivel_en_uso');
  reset role;
  -- Sólo cuenta la versión más nueva de cada origen que lo nombra, no cada ⚙ archivada: v1 con 3 y v2 con 1 dan 1; más un segundo origen con la publicada (4 celdas).
  perform pg_temp.version(v_o1, 'gerencia', 'archivada', 3, 1);
  perform pg_temp.version(v_o2, 'gerencia', 'publicada', 1, 4);
  perform pg_temp.version(v_o3, 'costos', 'publicada', 1, 2);          -- este origen no lo nombra
  set local role authenticated;
  perform pg_temp.falla_con(format($f$select public.nivel_eliminar(%L, %L)$f$, v_id, v_v), '23503', 'Está en 5 celdas de 2 orígenes', 'retirar', 'nivel_en_uso');
  -- Retirarlo no lo libera: lo que ya lo usa se sigue filtrando igual.
  v_v := (public.nivel_retirar(v_id, v_v) ->> 'actualizado_en')::timestamptz;
  perform pg_temp.falla_con(format($f$select public.nivel_eliminar(%L, %L)$f$, v_id, v_v), '23503', 'no se elimina', 'retirar', 'nivel_en_uso');
  reset role;
  -- Con sus versiones fuera, sí se elimina.
  delete from public.formulas where origen_id in (v_o1, v_o2);
  set local role authenticated;
  perform public.nivel_eliminar(v_id, v_v);
  reset role;
  if exists (select 1 from public.cotizaciones_niveles where clave = 'gerencia') then raise exception 'no se eliminó'; end if;
  -- Un ítem de atajos no dibuja un valor (va sobre la celda de su nodo): no cuenta como celda.
  set local role authenticated;
  v_v := (public.nivel_crear(v_id, 'Gerencia') ->> 'actualizado_en')::timestamptz;
  reset role;
  insert into public.formulas (origen_id, estado, definicion, diseno)
  values (v_o1, 'borrador', '{"nodos": []}', '{"secciones": [{"id": "s", "nivel_ver": "gerencia", "nivel_editar": "gerencia", "items": [{"tipo": "celda", "nodo": "a"}, {"tipo": "atajos", "nodo": "a"}]}]}');
  if (public._nivel_uso('gerencia') ->> 'celdas')::int <> 1 then raise exception 'los atajos cuentan como celda: %', public._nivel_uso('gerencia'); end if;
  delete from public.formulas where origen_id = v_o1;
  set local role authenticated;
  perform public.nivel_eliminar(v_id, v_v);
  reset role;
  -- Una sección sin ítems que lo nombra también es uso, y el mensaje habla de secciones.
  set local role authenticated;
  v_v := (public.nivel_crear(v_id, 'Gerencia') ->> 'actualizado_en')::timestamptz;
  reset role;
  insert into public.formulas (origen_id, estado, definicion, diseno)
  values (v_o1, 'borrador', '{"nodos": []}', '{"secciones": [{"id": "vacia", "nivel_ver": "gerencia", "nivel_editar": "gerencia", "items": []}]}');
  set local role authenticated;
  perform pg_temp.falla_con(format($f$select public.nivel_eliminar(%L, %L)$f$, v_id, v_v), '23503', 'Está en 1 sección de 1 origen', 'retirar', 'nivel_en_uso');
  reset role;
end $$;
rollback;

-- @test niveles: la estructura ata permisos y niveles en los dos sentidos (check, FK y trigger diferido) y protege «todos», la clave y «costos»
begin;
do $$
begin
  -- Un permiso de nivel sin nivel_clave, o con otro, o de «todos», o con una clave que no es del nivel, se rechaza (check).
  perform pg_temp.falla_con($f$insert into public.permisos (clave, modulo, nombre, descripcion, aplicado_en) values ('cotizaciones.nivel.costos.otro', 'cotizaciones', 'x', 'x', 'x')$f$, '23514', 'permisos_nivel_check');
  perform pg_temp.falla_con($f$insert into public.permisos (clave, modulo, nombre, descripcion, aplicado_en, nivel_clave) values ('cotizaciones.nivel.costos.ver', 'cotizaciones', 'x', 'x', 'x', null) on conflict (clave) do update set nivel_clave = null$f$, '23514', 'permisos_nivel_check');
  perform pg_temp.falla_con($f$insert into public.permisos (clave, modulo, nombre, descripcion, aplicado_en, nivel_clave) values ('cotizaciones.nivel.todos.ver', 'cotizaciones', 'x', 'x', 'x', 'todos')$f$, '23514', 'permisos_nivel_check');
  perform pg_temp.falla_con($f$insert into public.permisos (clave, modulo, nombre, descripcion, aplicado_en, nivel_clave) values ('cotizaciones.nivel.costos.ver2', 'cotizaciones', 'x', 'x', 'x', 'costos')$f$, '23514', 'permisos_nivel_check');
  perform pg_temp.falla_con($f$insert into public.permisos (clave, modulo, nombre, descripcion, aplicado_en, nivel_clave) values ('leads.nivel', 'leads', 'x', 'x', 'x', 'costos')$f$, '23514', 'permisos_nivel_check');
  -- Un permiso de un nivel que no existe (FK).
  perform pg_temp.falla_con($f$insert into public.permisos (clave, modulo, nombre, descripcion, aplicado_en, nivel_clave) values ('cotizaciones.nivel.fantasma.ver', 'cotizaciones', 'x', 'x', 'x', 'fantasma')$f$, '23503', 'permisos_nivel_fk');
  -- Un nivel con permisos no se borra (FK restrict), aunque se saltee la RPC.
  perform pg_temp.falla_con($f$delete from public.cotizaciones_niveles where clave = 'costos'$f$, '22023', 'no se elimina');
  insert into public.cotizaciones_niveles (clave, nombre) values ('rapido', 'Rápido');
  insert into public.permisos (clave, modulo, nombre, descripcion, aplicado_en, nivel_clave) values
    ('cotizaciones.nivel.rapido.ver', 'cotizaciones', 'x', 'x', 'x', 'rapido'), ('cotizaciones.nivel.rapido.editar', 'cotizaciones', 'x', 'x', 'x', 'rapido');
  perform pg_temp.falla_con($f$delete from public.cotizaciones_niveles where clave = 'rapido'$f$, '23001', 'permisos_nivel_fk');
  -- El trigger diferido: un nivel al que se le quita un permiso no sobrevive al cierre de la transacción. Primero se consumen los eventos del alta (el
  -- nivel y sus dos permisos, completo) para que sólo quede el del borrado, el del trigger de `permisos`.
  set constraints all immediate;
  set constraints all deferred;
  delete from public.permisos where clave = 'cotizaciones.nivel.rapido.editar';
  perform pg_temp.falla_con($f$set constraints all immediate$f$, '23514', 'tiene que tener sus dos permisos');
end $$;
rollback;

-- @test niveles: un nivel insertado sin sus permisos cae al cerrar la transacción; «todos» no los necesita; la clave no cambia y «todos» no se toca
begin;
do $$
begin
  insert into public.cotizaciones_niveles (clave, nombre) values ('suelto', 'Suelto');
  perform pg_temp.falla_con($f$set constraints all immediate$f$, '23514', 'El nivel «suelto» tiene que tener sus dos permisos');
end $$;
rollback;
begin;
do $$
begin
  perform pg_temp.falla_con($f$update public.cotizaciones_niveles set clave = 'otra' where clave = 'costos'$f$, '22023', 'La clave de un nivel no cambia');
  perform pg_temp.falla_con($f$update public.cotizaciones_niveles set nombre = 'Otro' where clave = 'todos'$f$, '22023', '«Todos» no se cambia');
  perform pg_temp.falla_con($f$update public.cotizaciones_niveles set retirado_en = now() where clave = 'todos'$f$, '22023', '«Todos» no se cambia');
  perform pg_temp.falla_con($f$delete from public.cotizaciones_niveles where clave = 'todos'$f$, '22023', 'no se elimina');
  -- «todos» no genera permisos, y uno que se inserta con su nombre se rechaza.
  set constraints all immediate;
  if exists (select 1 from public.permisos where nivel_clave = 'todos') then raise exception '«todos» tiene permisos'; end if;
  -- El nombre es único sin importar mayúsculas ni espacios, y la clave tiene su forma.
  perform pg_temp.falla_con($f$insert into public.cotizaciones_niveles (clave, nombre) values ('dos', ' COSTOS ')$f$, '23505', 'cotizaciones_niveles_nombre_unico');
  perform pg_temp.falla_con($f$insert into public.cotizaciones_niveles (clave, nombre) values ('A', 'Mala')$f$, '23514', 'cotizaciones_niveles_clave_check');
end $$;
rollback;

-- @test niveles: sin equipo.roles.gestionar no se crea, renombra, retira ni elimina; nadie escribe directo; todos leen; los ayudantes no son de nadie
begin;
do $$
declare
  v_sin uuid; v_con uuid; v_id uuid := (select id from public.cotizaciones_niveles where clave = 'costos'); v_v timestamptz := (select actualizado_en from public.cotizaciones_niveles where clave = 'costos');
  r record;
begin
  -- Quien configura cotizaciones pero no gestiona roles.
  v_sin := pg_temp.persona(array['cotizaciones.configurar', 'cotizaciones.ver', 'equipo.roles.ver']);
  perform pg_temp.como(v_sin);
  set local role authenticated;
  perform pg_temp.falla_con($f$select public.nivel_crear(gen_random_uuid(), 'Gerencia')$f$, '42501', 'No tienes el permiso «equipo.roles.gestionar»');
  perform pg_temp.falla_con(format($f$select public.nivel_renombrar(%L, %L, 'Otro')$f$, v_id, v_v), '42501', 'No tienes el permiso');
  perform pg_temp.falla_con(format($f$select public.nivel_retirar(%L, %L)$f$, v_id, v_v), '42501', 'No tienes el permiso');
  perform pg_temp.falla_con(format($f$select public.nivel_restaurar(%L, %L)$f$, v_id, v_v), '42501', 'No tienes el permiso');
  perform pg_temp.falla_con(format($f$select public.nivel_eliminar(%L, %L)$f$, v_id, v_v), '42501', 'No tienes el permiso');
  -- Todos leen la tabla; nadie la escribe directo.
  if (select count(*) from public.cotizaciones_niveles) <> 2 then raise exception 'no lee los niveles'; end if;
  perform pg_temp.falla_con($f$insert into public.cotizaciones_niveles (clave, nombre) values ('directo', 'Directo')$f$, '42501', 'permission denied');
  perform pg_temp.falla_con($f$update public.cotizaciones_niveles set nombre = 'Otro'$f$, '42501', 'permission denied');
  perform pg_temp.falla_con($f$delete from public.cotizaciones_niveles$f$, '42501', 'permission denied');
  perform pg_temp.falla_con($f$insert into public.permisos (clave, modulo, nombre, descripcion, aplicado_en) values ('cotizaciones.directo', 'cotizaciones', 'x', 'x', 'x')$f$, '42501', 'permission denied');
  reset role;
  -- Quien gestiona roles sí puede (y no necesita ser el dueño ni configurar).
  v_con := pg_temp.persona(array['equipo.roles.gestionar']);
  perform pg_temp.como(v_con);
  set local role authenticated;
  perform public.nivel_crear(gen_random_uuid(), 'Gerencia');
  reset role;
  if not exists (select 1 from public.cotizaciones_niveles where clave = 'gerencia') then raise exception 'quien gestiona roles no creó el nivel'; end if;
  -- Las RPC son de authenticated y de nadie más; los ayudantes y el enforcement, de nadie.
  for r in select p.proname, p.oid, pg_get_function_identity_arguments(p.oid) as args from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('nivel_crear', 'nivel_renombrar', 'nivel_retirar', 'nivel_restaurar', 'nivel_eliminar') loop
    if has_function_privilege('anon', r.oid, 'execute') or not has_function_privilege('authenticated', r.oid, 'execute') then raise exception '%(%) tiene los grants mal', r.proname, r.args; end if;
  end loop;
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('nivel_crear', 'nivel_renombrar', 'nivel_retirar', 'nivel_restaurar', 'nivel_eliminar')) <> 5 then raise exception 'faltan RPC'; end if;
  for r in select p.proname, p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('_niveles_tope', '_nivel_nombre', '_nivel_clave', '_nivel_permisos_crear', '_nivel_con_permisos', '_nivel_protegido', 'nivel_version',
                                                         '_niveles_lista', '_nivel_uso', '_nodos_visibles', '_niveles_de_cotizacion', '_preparar_publicacion', '_nivel_en_uso') loop
    if has_function_privilege('anon', r.oid, 'execute') or has_function_privilege('authenticated', r.oid, 'execute') then raise exception '% es ejecutable por quien no debe', r.proname; end if;
  end loop;
end $$;
rollback;

-- @test niveles: la actividad de cada RPC lleva el nivel y nunca contenido de fórmula ni de diseño
begin;
do $$
declare
  v_duena constant uuid := '00000000-0000-0000-0000-000000000001'; v_id uuid := gen_random_uuid(); v_v timestamptz; r record; v_o uuid;
begin
  insert into public.origenes (clave, nombre) values ('prueba_act', 'Prueba act') returning id into v_o;
  perform pg_temp.version(v_o, 'costos', 'publicada', 1, 2);
  perform pg_temp.como(v_duena);
  set local role authenticated;
  v_v := (public.nivel_crear(v_id, 'Gerencia') ->> 'actualizado_en')::timestamptz;
  v_v := (public.nivel_renombrar(v_id, v_v, 'Dirección') ->> 'actualizado_en')::timestamptz;
  v_v := (public.nivel_retirar(v_id, v_v) ->> 'actualizado_en')::timestamptz;
  v_v := (public.nivel_restaurar(v_id, v_v) ->> 'actualizado_en')::timestamptz;
  v_v := (public.nivel_retirar(v_id, v_v) ->> 'actualizado_en')::timestamptz;
  perform public.nivel_eliminar(v_id, v_v);
  reset role;
  if (select string_agg(a.accion, ',' order by a.id) from public.actividad a where a.tabla = 'cotizaciones_niveles' and a.registro_id = v_id::text) <> 'nivel.crear,nivel.renombrar,nivel.retirar,nivel.restaurar,nivel.retirar,nivel.eliminar' then
    raise exception 'la actividad: %', (select string_agg(a.accion, ',' order by a.id) from public.actividad a where a.tabla = 'cotizaciones_niveles' and a.registro_id = v_id::text); end if;
  for r in select a.* from public.actividad a where a.accion like 'nivel.%' loop
    if (select count(*) from jsonb_object_keys(coalesce(r.antes, '{}') || coalesce(r.despues, '{}') || coalesce(r.detalle, '{}')) k where k not in ('clave', 'nombre', 'concesiones')) > 0 then
      raise exception 'la actividad % lleva algo más que el nivel: %', r.accion, to_jsonb(r); end if;
  end loop;
  -- Ni siquiera crear, renombrar o eliminar un nivel copia la fórmula a actividad.
  if exists (select 1 from public.actividad a where a.accion like 'nivel.%' and (a.antes::text like '%nodos%' or a.despues::text like '%nodos%' or a.detalle::text like '%nodos%')) then raise exception 'la fórmula está en actividad'; end if;
end $$;
rollback;

-- @test niveles: _niveles_de_cotizacion() sale de la tabla, publicar toma los niveles del diseño, y ninguna versión publicada o archivada nombra un nivel que no existe
begin;
do $$
declare
  v_duena constant uuid := '00000000-0000-0000-0000-000000000001'; v_id uuid := gen_random_uuid(); n record; v_o uuid; v_f uuid;
begin
  select * into n from public._niveles_de_cotizacion();
  if n.niveles <> array['costos'] or n.retirados <> '{}'::text[] then raise exception 'los niveles de hoy: % y %', n.niveles, n.retirados; end if;
  perform pg_temp.como(v_duena);
  set local role authenticated;
  perform public.nivel_crear(v_id, 'Gerencia');
  reset role;
  select * into n from public._niveles_de_cotizacion();
  if n.niveles <> array['costos', 'gerencia'] or n.retirados <> '{}'::text[] then raise exception 'con uno creado: % y %', n.niveles, n.retirados; end if;
  -- Un diseño que nombra uno que no existe no publica (nivel_inexistente), y uno que existe sí.
  insert into public.origenes (clave, nombre) values ('prueba_niv', 'Prueba niv') returning id into v_o;
  perform pg_temp.falla_con(format($f$select pg_temp.version(%L, 'fantasma', 'publicada', 1, 2)$f$, v_o), '22023', '', 'del_nivel', 'nivel_inexistente');
  v_f := pg_temp.version(v_o, 'gerencia', 'publicada', 1, 2);
  if (select visibilidad -> 'a' ->> 'ver' from public.formulas where id = v_f) <> 'gerencia' then raise exception 'la visibilidad: %', (select visibilidad from public.formulas where id = v_f); end if;
  -- El invariante: ninguna versión publicada o archivada nombra, en su diseño o su visibilidad, un nivel que no existe.
  if exists (select 1 from public.formulas f, jsonb_array_elements_text(public._niveles_del_diseno(f.diseno)) x
              where f.estado <> 'borrador' and x not in ('todos') and not exists (select 1 from public.cotizaciones_niveles c where c.clave = x)) then raise exception 'una versión nombra un nivel que no existe'; end if;
  if exists (select 1 from public.formulas f, jsonb_each(f.visibilidad) e, unnest(array[e.value ->> 'ver', e.value ->> 'editar']) x
              where f.estado <> 'borrador' and x is not null and x <> 'todos' and not exists (select 1 from public.cotizaciones_niveles c where c.clave = x)) then raise exception 'una visibilidad nombra un nivel que no existe'; end if;
end $$;
rollback;

-- @test niveles: restaurar quita el retiro y mueve la versión, y deja intactos la clave, los permisos, sus nombres, las concesiones, el tope y el orden de la lista; deja su actividad
begin;
do $$
declare
  v_duena constant uuid := '00000000-0000-0000-0000-000000000001'; v_id uuid := gen_random_uuid(); r jsonb; v_v timestamptz; v_rol uuid; v_n int; v_tope int; v_conc int;
begin
  perform pg_temp.como(v_duena);
  set local role authenticated;
  v_v := (public.nivel_crear(v_id, 'Gerencia') ->> 'actualizado_en')::timestamptz;
  r := public.nivel_retirar(v_id, v_v);
  v_v := (r ->> 'actualizado_en')::timestamptz;
  v_n := jsonb_array_length(r -> 'lista' -> 'niveles'); v_tope := (r -> 'lista' ->> 'tope')::int;
  reset role;
  -- Al dueño se le quitó el «ver» antes de restaurar: restaurar no se lo devuelve (ni toca lo demás).
  select id into v_rol from public.roles where clave = 'dueno';
  delete from public.roles_permisos where rol_id = v_rol and permiso_clave = 'cotizaciones.nivel.gerencia.ver';
  select count(*) into v_conc from public.roles_permisos where permiso_clave like 'cotizaciones.nivel.%';
  set local role authenticated;
  r := public.nivel_restaurar(v_id, v_v);
  reset role;
  if (select retirado_en from public.cotizaciones_niveles where id = v_id) is not null then raise exception 'no se restauró'; end if;
  if (r ->> 'actualizado_en')::timestamptz <= v_v then raise exception 'la versión no se movió'; end if;
  if (r ->> 'actualizado_en')::timestamptz is distinct from (select actualizado_en from public.cotizaciones_niveles where id = v_id) then raise exception 'la versión devuelta no es la de la fila'; end if;
  if (r ->> 'sin_cambios') is not null and (r ->> 'sin_cambios')::boolean then raise exception 'dijo sin_cambios al restaurar de verdad'; end if;
  if (select clave from public.cotizaciones_niveles where id = v_id) <> 'gerencia' or (select nombre from public.cotizaciones_niveles where id = v_id) <> 'Gerencia' then raise exception 'cambió la clave o el nombre'; end if;
  if (select count(*) from public.permisos where nivel_clave = 'gerencia') <> 2 then raise exception 'cambiaron los permisos'; end if;
  if (select nombre from public.permisos where clave = 'cotizaciones.nivel.gerencia.ver') <> 'Ver el nivel «Gerencia»' then raise exception 'cambió el nombre del permiso'; end if;
  if (select count(*) from public.roles_permisos where permiso_clave like 'cotizaciones.nivel.%') <> v_conc then raise exception 'restaurar tocó las concesiones'; end if;
  if exists (select 1 from public.roles_permisos where rol_id = v_rol and permiso_clave = 'cotizaciones.nivel.gerencia.ver') then raise exception 'restaurar volvió a conceder'; end if;
  -- El tope y la lista: los mismos niveles, el mismo tope, y el nivel ya no figura retirado.
  if jsonb_array_length(r -> 'lista' -> 'niveles') is distinct from v_n or (r -> 'lista' ->> 'tope')::int is distinct from v_tope then raise exception 'cambió el tope o la cuenta'; end if;
  if (select e ->> 'retirado_en' from jsonb_array_elements(r -> 'lista' -> 'niveles') e where e ->> 'clave' = 'gerencia') is not null then raise exception 'la lista lo sigue dando por retirado'; end if;
  -- Sigue contando para el tope y su clave sigue ocupada: crear otro con el mismo nombre se rechaza.
  set local role authenticated;
  perform pg_temp.falla_con($f$select public.nivel_crear(gen_random_uuid(), 'gerencia')$f$, '23505', 'Ya hay un nivel «gerencia»', 'nombre');
  reset role;
  -- Una acción en actividad, con el nombre antes y la clave después, nada de fórmula.
  if (select count(*) from public.actividad a where a.accion = 'nivel.restaurar' and a.registro_id = v_id::text) <> 1 then raise exception 'la actividad de restaurar'; end if;
  if (select a.antes ->> 'nombre' from public.actividad a where a.accion = 'nivel.restaurar' and a.registro_id = v_id::text) is distinct from 'Gerencia'
     or (select a.despues ->> 'clave' from public.actividad a where a.accion = 'nivel.restaurar' and a.registro_id = v_id::text) is distinct from 'gerencia' then raise exception 'la actividad de restaurar lleva otra cosa'; end if;
end $$;
rollback;

-- @test niveles: restaurar uno que no está retirado (y «todos») responde sin error ni cambio —sin mirar la versión—, y un retirado exige la versión
begin;
do $$
declare
  v_duena constant uuid := '00000000-0000-0000-0000-000000000001'; v_id uuid := gen_random_uuid(); r jsonb; v_v timestamptz; v_todos uuid := (select id from public.cotizaciones_niveles where clave = 'todos'); v_vt timestamptz;
begin
  perform pg_temp.como(v_duena);
  set local role authenticated;
  v_v := (public.nivel_crear(v_id, 'Gerencia') ->> 'actualizado_en')::timestamptz;
  -- Vivo: sin cambios, con la versión al día, con una vieja y con ninguna.
  r := public.nivel_restaurar(v_id, v_v);
  if not coalesce((r ->> 'sin_cambios')::boolean, false) then raise exception 'no dijo sin_cambios: %', r; end if;
  if (r ->> 'actualizado_en')::timestamptz is distinct from v_v then raise exception 'sin_cambios devolvió otra versión'; end if;
  if jsonb_typeof(r -> 'lista' -> 'niveles') is distinct from 'array' then raise exception 'sin lista'; end if;
  perform public.nivel_restaurar(v_id, v_v - interval '1 day');
  perform public.nivel_restaurar(v_id, null);
  -- «Todos» nunca está retirado: responde igual.
  v_vt := (select actualizado_en from public.cotizaciones_niveles where id = v_todos);
  r := public.nivel_restaurar(v_todos, v_vt);
  if not coalesce((r ->> 'sin_cambios')::boolean, false) then raise exception '«todos» no dijo sin_cambios'; end if;
  reset role;
  if (select actualizado_en from public.cotizaciones_niveles where id = v_id) <> v_v then raise exception 'la versión se movió sin cambios'; end if;
  if (select actualizado_en from public.cotizaciones_niveles where id = v_todos) <> v_vt then raise exception 'la versión de «todos» se movió'; end if;
  if exists (select 1 from public.actividad a where a.accion = 'nivel.restaurar') then raise exception 'dejó actividad sin cambiar nada'; end if;
  -- Retirado: la versión vieja es PT409, la nula también (con su mensaje), y un id que no existe es PT409.
  set local role authenticated;
  v_v := (public.nivel_retirar(v_id, v_v) ->> 'actualizado_en')::timestamptz;
  perform pg_temp.falla_con(format($f$select public.nivel_restaurar(%L, %L)$f$, v_id, v_v - interval '1 second'), 'PT409', 'Otra persona cambió este nivel');
  perform pg_temp.falla_con(format($f$select public.nivel_restaurar(%L, null)$f$, v_id), 'P0001', 'Falta la versión');
  perform pg_temp.falla_con($f$select public.nivel_restaurar(gen_random_uuid(), now())$f$, 'PT409', 'ya no existe');
  reset role;
  if (select retirado_en from public.cotizaciones_niveles where id = v_id) is null then raise exception 'un rechazo restauró'; end if;
  -- Restaurar dos veces con la misma versión: la segunda ya no está retirado y responde sin cambios (un doble «Deshacer» no da conflicto).
  set local role authenticated;
  r := public.nivel_restaurar(v_id, v_v);
  r := public.nivel_restaurar(v_id, v_v);
  reset role;
  if not coalesce((r ->> 'sin_cambios')::boolean, false) then raise exception 'el segundo restaurar no dijo sin_cambios'; end if;
  if (select count(*) from public.actividad a where a.accion = 'nivel.restaurar') <> 1 then raise exception 'el segundo restaurar dejó actividad'; end if;
end $$;
rollback;
