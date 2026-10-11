-- @test el primer usuario nace dueño y el registro cerrado bloquea al segundo
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000001', 'duena@ejemplo.com');
do $$ begin
  if not exists (select 1 from public.usuarios_roles ur join public.roles r on r.id = ur.rol_id where ur.usuario_id = '00000000-0000-0000-0000-000000000001' and r.clave = 'dueno') then raise exception 'el primero no es dueño'; end if;
  begin
    insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000002', 'colada@ejemplo.com');
    raise exception 'el registro cerrado dejó pasar un signup';
  exception when insufficient_privilege then null; end;
  insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-0000-0000-000000000002', 'asesor@ejemplo.com', '{"invitado": true}');
  insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-0000-0000-000000000003', 'logistica@ejemplo.com', '{"invitado": true}');
end $$;
update public.perfiles set nombre = 'Sofía Ramos', handle = 'sofia', whatsapp_web = '+59170000000', publico_web = true where id = '00000000-0000-0000-0000-000000000002';
update public.perfiles set nombre = 'Rosa Mamani' where id = '00000000-0000-0000-0000-000000000003';

-- @test la dueña asigna roles con dominancia y el guardián protege
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
select public.rbac_asignar_rol('00000000-0000-0000-0000-000000000002', (select id from public.roles where clave = 'asesor'), true);
select public.rbac_asignar_rol('00000000-0000-0000-0000-000000000003', (select id from public.roles where clave = 'logistica'), true);
do $$ begin
  set constraints all immediate;
  begin
    perform public.rbac_revocar((select id from public.roles where clave = 'dueno'), 'equipo.roles.gestionar');
    raise exception 'el guardián dejó al dueño sin equipo.roles.gestionar';
  exception when check_violation then null; end;
end $$;

-- @test crear lead, verificar teléfono, compartir, enmascarado para la dueña
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
set role authenticated;
select public.crear_lead('{"nombre": "Ana Quispe", "telefono_cc": "+591", "telefono_principal": "7 000 0001", "ciudad": "Santa Cruz"}');
do $$ declare r jsonb; v_id uuid; begin
  r := public.verificar_telefono('+591', '70000001');
  if r ->> 'estado' <> 'existe' or (r ->> 'es_mio')::boolean is not true then raise exception 'verificar_telefono mío: %', r; end if;
  if (public.verificar_telefono('+591', '70000009') ->> 'estado') <> 'libre' then raise exception 'debía estar libre'; end if;
  begin
    perform public.crear_lead('{"nombre": "Otra", "telefono_cc": "+591", "telefono_principal": "70000001"}');
    raise exception 'dejó duplicar el teléfono';
  exception when unique_violation then null; end;
  select id into v_id from public.leads_vista where nombre = 'Ana Quispe';
  if (select telefono_principal from public.leads_vista where id = v_id) <> '59170000001' then raise exception 'la cartera debe ver el teléfono completo'; end if;
end $$;
reset role;
-- la dueña (todos) ve el lead pero enmascarado
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare t text; r jsonb; begin
  select telefono_principal into t from public.leads_vista where nombre = 'Ana Quispe';
  if t is null then raise exception 'la dueña debe ver el lead'; end if;
  if t = '59170000001' then raise exception 'la dueña NO debe ver el teléfono completo: %', t; end if;
  r := public.verificar_telefono('+591', '70000001');
  if r ->> 'estado' <> 'existe' then raise exception 'esperaba existe (alcance todos): %', r; end if;
end $$;
reset role;
-- Rosa (logística, sin leads.ver) no ve nada
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
set role authenticated;
do $$ declare r jsonb; begin
  if (select count(*) from public.leads_vista) <> 0 then raise exception 'logística no debería ver leads'; end if;
  r := public.verificar_telefono('+591', '70000001');
  if r ->> 'estado' <> 'de_otro' or r ->> 'dueno' <> 'Sofía Ramos' then raise exception 'esperaba de_otro con el nombre de la dueña del lead: %', r; end if;
end $$;
reset role;

-- @test baja del asesor → lead al limbo → nadie lo ve → otro lo adopta al registrar el teléfono
insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-0000-0000-000000000004', 'nuevo@ejemplo.com', '{"invitado": true}');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare n int; r jsonb; v uuid; begin
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-000000000004', (select id from public.roles where clave = 'asesor'), true);
  n := public.equipo_dar_de_baja('00000000-0000-0000-0000-000000000002');
  if n <> 1 then raise exception 'esperaba 1 lead al limbo, hubo %', n; end if;
  if (select count(*) from public.leads_vista where nombre = 'Ana Quispe') <> 0 then raise exception 'un lead en limbo no se ve ni para la dueña'; end if;
  r := public.verificar_telefono('+591', '70000001');
  if r ->> 'estado' <> 'limbo' then raise exception 'esperaba limbo: %', r; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', false);
set role authenticated;
do $$ declare v uuid; begin
  v := public.crear_lead('{"nombre": "Ana Quispe", "telefono_cc": "+591", "telefono_principal": "70000001"}');
  if not exists (select 1 from public.leads_asesores where lead_id = v and usuario_id = '00000000-0000-0000-0000-000000000004' and tipo_acceso = 'adoptado') then raise exception 'no adoptó'; end if;
  if (select count(*) from public.leads_vista where nombre = 'Ana Quispe') <> 1 then raise exception 'el adoptado debe verlo'; end if;
end $$;
reset role;
do $$ begin
  if not exists (select 1 from public.actividad where accion = 'lead.adoptado_del_limbo') then raise exception 'sin registro de adopción'; end if;
end $$;

-- @test vehículo de subasta: atributos validados, 24 fotos, vitrina sólo por RPC
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', false);
set role authenticated;
do $$ declare o uuid; v uuid; i int; begin
  select id into o from public.origenes where clave = 'subasta_usa';
  begin
    insert into public.vehiculos (origen_id, titulo, atributos, creado_por) values (o, 'Mal', '{"cilindros": "cuatro"}', '00000000-0000-0000-0000-000000000004');
    raise exception 'aceptó un atributo con tipo incorrecto';
  exception when invalid_parameter_value then null; end;
  insert into public.vehiculos (origen_id, titulo, marca, modelo, anio, vin, lote, plataforma, atributos, creado_por)
  values (o, '2021 Toyota RAV4 XLE', 'Toyota', 'RAV4', 2021, 'JTMW1RFV8MD012345', '58741223', 'copart', '{"color": "Gris", "cilindros": 4, "enciende_y_anda": true}', '00000000-0000-0000-0000-000000000004') returning id into v;
  for i in 1..24 loop insert into public.vehiculos_imagenes (vehiculo_id, ruta, orden) values (v, v || '/' || i || '.webp', i); end loop;
  begin
    insert into public.vehiculos_imagenes (vehiculo_id, ruta, orden) values (v, v || '/25.webp', 25);
    raise exception 'aceptó la imagen 25';
  exception when check_violation then null; end;
  begin
    update public.vehiculos set publicado_web = true where id = v;
    raise exception 'dejó publicar por UPDATE directo';
  exception when insufficient_privilege then null; end;
  begin
    perform public.vehiculo_vitrina(v, true);
    raise exception 'el asesor no tiene vehiculos.vitrina';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- @test motor de flujos: inicial, requisitos bloqueantes, cotización final, PT409, lote parcial
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
set role authenticated;
do $$ declare v uuid; f_sub uuid; f_comp uuid; pre jsonb; h bigint; res jsonb; begin
  select id into v from public.vehiculos where lote = '58741223';
  select f.id into f_sub from public.fases f join public.flujos fl on fl.id = f.flujo_id join public.origenes o on o.id = fl.origen_id where o.clave = 'subasta_usa' and f.nombre = 'En subasta';
  select f.id into f_comp from public.fases f join public.flujos fl on fl.id = f.flujo_id join public.origenes o on o.id = fl.origen_id where o.clave = 'subasta_usa' and f.nombre = 'Comprado';
  pre := public.previsualizar_cambio_fase(v, null, f_comp);
  if (pre ->> 'ok')::boolean then raise exception 'sin fase no se puede ir a Comprado'; end if;
  h := public.cambiar_fase(v, null, f_sub, null, null);
  if (select fase_id from public.vehiculos where id = v) <> f_sub then raise exception 'no entró a la inicial'; end if;
  pre := public.previsualizar_cambio_fase(v, null, f_comp);
  if (pre ->> 'ok')::boolean or jsonb_array_length(pre -> 'faltan') <> 2 then raise exception 'esperaba 2 requisitos faltantes: %', pre; end if;
  begin
    perform public.cambiar_fase(v, null, f_comp, 'x', null);
    raise exception 'movió sin requisitos';
  exception when check_violation then null; end;
  begin
    perform public.cambiar_fase(v, null, f_sub, null, f_comp);
    raise exception 'no detectó conflicto de fase esperada';
  exception when others then if sqlstate <> 'PT409' then raise; end if; end;
end $$;
reset role;
-- el asesor cotiza y la dueña cierra la final; el vehículo queda vinculado al lead
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', false);
set role authenticated;
do $$ declare v uuid; l uuid; o uuid; f uuid; c uuid; begin
  select id into v from public.vehiculos where lote = '58741223';
  select id into l from public.leads_vista where nombre = 'Ana Quispe';
  select id into o from public.origenes where clave = 'subasta_usa';
  select id into f from public.formulas where origen_id = o and estado = 'publicada';
  insert into public.cotizaciones (origen_id, lead_id, vehiculo_id, creado_por, formula_id, valores, tipos_cambio, totales, total_base)
  values (o, l, v, '00000000-0000-0000-0000-000000000004', f, '{"remate": 14200, "total": 24980}', '{"oficial": 6.96, "paralelo": 12.40}', '{"total_base": 24980}', 24980) returning id into c;
  update public.cotizaciones set notas = 'ajuste' where id = c;
  if (select count(*) from public.cotizaciones_revisiones where cotizacion_id = c) <> 1 then raise exception 'sin revisión con diff'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare c uuid; v uuid; f_comp uuid; h bigint; res jsonb; begin
  select id into c from public.cotizaciones where total_base = 24980;
  perform public.cotizacion_marcar_final(c);
  select id into v from public.vehiculos where lote = '58741223';
  if (select lead_id from public.vehiculos where id = v) is null then raise exception 'la final debía vincular el lead'; end if;
  select f.id into f_comp from public.fases f join public.flujos fl on fl.id = f.flujo_id join public.origenes o on o.id = fl.origen_id where o.clave = 'subasta_usa' and f.nombre = 'Comprado';
  h := public.cambiar_fase(v, null, f_comp, 'Ganado en subasta', (select f.id from public.fases f join public.flujos fl on fl.id = f.flujo_id join public.origenes o on o.id = fl.origen_id where o.clave = 'subasta_usa' and f.nombre = 'En subasta'));
  if (select count(*) from public.notas where historial_fase_id = h) <> 1 then raise exception 'la nota del cambio no quedó en notas'; end if;
  res := public.cambiar_fase_lote(array[v, gen_random_uuid()], (select f.id from public.fases f join public.flujos fl on fl.id = f.flujo_id join public.origenes o on o.id = fl.origen_id where o.clave = 'subasta_usa' and f.nombre = 'En tránsito a puerto USA'), null);
  if (res -> 0 ->> 'ok')::boolean is not true or (res -> 1 ->> 'ok')::boolean is not false then raise exception 'lote parcial mal: %', res; end if;
  if (select count(*) from public.revisar_flujo((select flujo_id from public.fases where id = f_comp)) where nivel = 'error') <> 0 then raise exception 'el flujo de ejemplo no debería tener errores'; end if;
end $$;
reset role;

-- @test cola web: sin asesores → respaldo; con asesora habilitada → turno asignado y notificación; contacté
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claim.role', 'anon', false);
update public.ajustes_web set whatsapp_respaldo = '+59170000099', origenes_visibles = array[(select id from public.origenes where clave = 'subasta_usa')] where id = 1;
set role anon;
do $$ declare r jsonb; begin
  r := web.solicitar_asesor('tokentokentokentoken', 'boton_general');
  if (r ->> 'es_respaldo')::boolean is not true then raise exception 'esperaba respaldo: %', r; end if;
end $$;
reset role;
update public.perfiles set publico_web = true, handle = 'nuevo', whatsapp_web = '+59170000004' where id = '00000000-0000-0000-0000-000000000004';
update public.cola_web_asesores set habilitado = true where usuario_id = '00000000-0000-0000-0000-000000000004';
set role anon;
do $$ declare r jsonb; begin
  r := web.solicitar_asesor('tokentokentokentoken', 'boton_general');
  if (r ->> 'es_respaldo')::boolean then raise exception 'esperaba asignación: %', r; end if;
  if r ->> 'handle' <> 'nuevo' then raise exception 'asignó a otro: %', r; end if;
  -- misma visitante: la misma solicitud, no una nueva
  r := web.solicitar_asesor('tokentokentokentoken', 'ficha_vehiculo');
  if (select count(*) from web.vehiculos) <> 0 then raise exception 'la vitrina requiere publicado_web + integración activa'; end if;
end $$;
reset role;
do $$ begin
  if (select count(*) from public.solicitudes_contacto_web where estado = 'asignada') <> 1 then raise exception 'duplicó la solicitud abierta'; end if;
  if (select count(*) from public.notificaciones where tipo = 'turno_web' and usuario_id = '00000000-0000-0000-0000-000000000004') <> 1 then raise exception 'sin notificación de turno'; end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ declare s uuid; begin
  select id into s from public.solicitudes_contacto_web where estado = 'asignada';
  perform public.web_confirmar_contacto(s, (select id from public.leads_vista where nombre = 'Ana Quispe'));
  if (select estado from public.solicitudes_contacto_web where id = s) <> 'contactada' then raise exception 'no quedó contactada'; end if;
  if (select tasa_contacto_pct from public.estado_cola_web where handle = 'nuevo') <> 100 then raise exception 'tasa de contacto mal'; end if;
end $$;
reset role;

-- @test portal: otorgar, login con clave, bloqueo tras 5 fallos, snapshot sin costos
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', false);
set role authenticated;
do $$ declare l uuid; cod text; begin
  select id into l from public.leads_vista where nombre = 'Ana Quispe';
  cod := public.otorgar_portal(l, 'clave-segura-123');
  if cod !~ '^[A-Z]{2,4}-[2-9A-HJ-NP-Z]{5}$' then raise exception 'código mal: %', cod; end if;
end $$;
reset role;
do $$ declare l uuid; cod text; i int; snap jsonb; begin
  select lead_id, codigo into l, cod from public.accesos_portal;
  if (select count(*) from web.portal_login(cod, 'clave-segura-123')) <> 1 then raise exception 'login válido falló'; end if;
  for i in 1..5 loop perform web.portal_login(cod, 'mala'); end loop;
  begin
    perform web.portal_login(cod, 'clave-segura-123');
    raise exception 'debía estar bloqueado';
  exception when insufficient_privilege then null; end;
  snap := web.portal_snapshot(l);
  if jsonb_array_length(snap -> 'vehiculos') <> 1 then raise exception 'snapshot sin el vehículo: %', snap; end if;
  if snap::text like '%total_base%' or snap::text like '%"ruta"%' then raise exception 'el snapshot filtra datos internos'; end if;
end $$;

-- @test papelera: enviar, listar, restaurar; comprobante emitido bloquea
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare v uuid; v_lote uuid; n int; begin
  select id into v from public.vehiculos where lote = '58741223';
  v_lote := public.papelera_enviar('vehiculos', array[v]);
  if (select count(*) from public.vehiculos where id = v) <> 0 then raise exception 'la RESTRICTIVE debe esconder lo borrado'; end if;
  if (select count(*) from public.papelera_listar('vehiculos')) <> 1 then raise exception 'papelera_listar vacía'; end if;
  n := public.papelera_restaurar(v_lote);
  if (select count(*) from public.vehiculos where id = v) <> 1 then raise exception 'no restauró'; end if;
  perform public.comprobante_emitir((select id from public.cotizaciones where clase = 'final'), 'A', '{"cliente": "Ana Quispe"}');
  begin
    perform public.papelera_enviar('vehiculos', array[v]);
    raise exception 'con comprobante emitido no va a la papelera';
  exception when check_violation then null; end;
end $$;
reset role;

-- @test fórmula: cambiar una constante desde el ⚙ publica v2 y archiva v1
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare o uuid; f2 uuid; begin
  select id into o from public.origenes where clave = 'subasta_usa';
  f2 := public.formula_cambiar_constante(o, 'flete', 1500);
  if (select version from public.formulas where id = f2) <> 2 or (select estado from public.formulas where id = f2) <> 'publicada' then raise exception 'v2 no publicada'; end if;
  if (select count(*) from public.formulas where origen_id = o and estado = 'archivada') <> 1 then raise exception 'v1 no archivada'; end if;
  begin
    perform public.formula_guardar_borrador(o, '{"nodos": [{"id": "a", "tipo": "calculo", "op": "suma", "de": ["zzz"], "salida": "total"}]}', '{}');
    raise exception 'aceptó referencia inexistente';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
