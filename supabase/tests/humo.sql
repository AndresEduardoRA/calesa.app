-- @test el primer usuario nace dueño y el registro cerrado bloquea al segundo
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000001', 'duena@ejemplo.com');
do $$ begin
  if not exists (select 1 from public.usuarios_roles ur join public.roles r on r.id = ur.rol_id where ur.usuario_id = '00000000-0000-0000-0000-000000000001' and r.clave = 'dueno') then raise exception 'el primero no es dueño'; end if;
  -- El chequeo de registro es diferido (corre al cerrar la transacción): acá se adelanta.
  set constraints all immediate;
  begin
    insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000002', 'colada@ejemplo.com');
    raise exception 'el registro cerrado dejó pasar un signup';
  exception when insufficient_privilege then null; end;
  insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-0000-0000-000000000002', 'asesor@ejemplo.com', '{"invitado": true}');
  insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-0000-0000-000000000003', 'logistica@ejemplo.com', '{"invitado": true}');
end $$;
update public.perfiles set nombre = 'Sofía Ramos', handle = 'sofia', whatsapp_web = '+59170000000', publico_web = true where id = '00000000-0000-0000-0000-000000000002';
update public.perfiles set nombre = 'Rosa Mamani' where id = '00000000-0000-0000-0000-000000000003';

-- @test Auth inserta la cuenta y después le pone app_metadata: la invitada pasa igual
begin;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000005', 'invitada@ejemplo.com');
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"invitado": true}' where id = '00000000-0000-0000-0000-000000000005';
commit;
do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-000000000005') then raise exception 'la invitada no nació'; end if;
  if exists (select 1 from public.usuarios_roles where usuario_id = '00000000-0000-0000-0000-000000000005') then raise exception 'una invitada nace sin rol: se lo da quien la invita'; end if;
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-000000000005' and invitado_en is not null and invitacion_aceptada_en is null) then raise exception 'la invitación no quedó pendiente'; end if;
  if exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-000000000001' and invitado_en is not null) then raise exception 'la dueña no es una invitada'; end if;
end $$;
-- Aceptar es sobre la fila propia: la dueña no acepta por nadie, la invitada sí por sí misma.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
select public.equipo_aceptar_invitacion();
reset role;
do $$ begin
  if exists (select 1 from public.perfiles where invitacion_aceptada_en is not null) then raise exception 'alguien aceptó una invitación ajena'; end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);
set role authenticated;
select public.equipo_aceptar_invitacion();
reset role;
do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-000000000005' and invitacion_aceptada_en is not null) then raise exception 'la invitada no pudo aceptar su invitación'; end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);

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

-- @test empresa: los ajustes se guardan por RPC con versión, permiso y reglas; sin datos la moneda base cambia
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ declare v timestamptz; v2 timestamptz; a public.ajustes_empresa; rechazo boolean; begin
  select actualizado_en into v from public.ajustes_empresa;
  begin update public.ajustes_empresa set registro_abierto = true; raise exception 'el update directo de ajustes_empresa pasó';
  exception when insufficient_privilege then null; end;
  begin perform public.empresa_guardar_ajustes('{"nombre": "X"}', v - interval '1 second'); raise exception 'guardó con una versión vieja';
  exception when others then if sqlstate <> 'PT409' then raise; end if; end;
  v2 := public.empresa_guardar_ajustes('{"nombre": "  Importadora Andina  ", "nit": "", "color_acento": "#0B7285", "zona_horaria": "America/Santiago", "papelera_dias": 45, "iconos": {"192": "iconos/a.png"}}', v);
  select * into a from public.ajustes_empresa;
  if a.nombre <> 'Importadora Andina' or a.nit is not null or a.color_acento <> '#0b7285' or a.zona_horaria <> 'America/Santiago' or a.papelera_dias <> 45 then raise exception 'no guardó lo pedido: %', a; end if;
  if a.locale <> 'es-BO' or a.actividad_dias <> 14 or a.registro_abierto then raise exception 'tocó lo que no venía en los cambios: %', a; end if;
  if a.actualizado_por is distinct from '00000000-0000-0000-0000-000000000001'::uuid then raise exception 'no selló quién cambió los ajustes'; end if;
  if v2 is distinct from a.actualizado_en then raise exception 'no devolvió la versión nueva'; end if;
  if public.storage_refcount('marca', 'iconos/a.png') <> 1 then raise exception 'storage_refcount no cuenta los íconos'; end if;
  -- Un valor nulo vacía la columna; una clave ausente no la toca.
  perform public.empresa_guardar_ajustes('{"iconos": null, "color_acento": null}', null);
  select * into a from public.ajustes_empresa;
  if a.iconos is not null or a.color_acento is not null or a.nombre <> 'Importadora Andina' then raise exception 'nulo debía vaciar y ausente no tocar: %', a; end if;
  -- Reglas que un CHECK no expresa.
  rechazo := false; begin perform public.empresa_guardar_ajustes('{"zona_horaria": "Marte/Olympus"}', null); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'aceptó una zona horaria que no existe'; end if;
  rechazo := false; begin perform public.empresa_guardar_ajustes('{"id": 2}', null); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'dejó cambiar una columna que no es editable'; end if;
  rechazo := false; begin perform public.empresa_guardar_ajustes('{"nombre": "   "}', null); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'dejó el nombre vacío'; end if;
  rechazo := false; begin perform public.empresa_guardar_ajustes('{"moneda_base": "EUR"}', null); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'aceptó como base una moneda que no existe'; end if;
  -- Todavía no hay vehículos, cotizaciones ni gastos: la moneda base se puede cambiar.
  if public.empresa_con_datos_cargados() then raise exception 'no debería haber datos cargados todavía'; end if;
  perform public.empresa_guardar_ajustes('{"moneda_base": "BOB"}', null);
  if (select moneda_base from public.ajustes_empresa) <> 'BOB' then raise exception 'sin datos, la moneda base debía cambiar'; end if;
  perform public.empresa_guardar_ajustes('{"moneda_base": "USD", "nombre": "Mi importadora", "zona_horaria": "America/La_Paz", "papelera_dias": 30}', null);
end $$;
reset role;
-- Sofía (asesora) lee los ajustes pero no los guarda.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
set role authenticated;
do $$ begin
  if (select nombre from public.ajustes_empresa) <> 'Mi importadora' then raise exception 'una asesora debía leer los ajustes'; end if;
  begin perform public.empresa_guardar_ajustes('{"nombre": "Otra"}', null); raise exception 'guardó los ajustes sin permiso';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

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

-- @test acceso: ajustes sin sesión con las columnas contadas; mi_sesion dice el estado de la cuenta
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claim.role', 'anon', false);
set role anon;
do $$ declare a record; begin
  select * into a from web.ajustes_acceso();
  if a.nombre is null or a.moneda_base <> 'USD' then raise exception 'ajustes_acceso incompleto: %', a; end if;
  if a.registro_abierto or a.primer_registro then raise exception 'con personas y registro cerrado no se ofrece crear cuenta: %', a; end if;
  begin
    perform 1 from public.ajustes_empresa;
    raise exception 'anon leyó ajustes_empresa';
  exception when insufficient_privilege then null; end;
  begin
    perform public.mi_sesion();
    raise exception 'anon ejecutó mi_sesion';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
insert into public.preferencias_usuario (usuario_id, clave, valor) values ('00000000-0000-0000-0000-000000000001', 'densidad', '"comoda"');
do $$ declare s jsonb; begin
  s := public.mi_sesion();
  if s ->> 'estado' <> 'activa' then raise exception 'la dueña debía estar activa: %', s ->> 'estado'; end if;
  if s -> 'roles' -> 0 ->> 'clave' <> 'dueno' then raise exception 'sin el rol dueño: %', s -> 'roles'; end if;
  if jsonb_array_length(s -> 'permisos') = 0 then raise exception 'la dueña sin permisos'; end if;
  if s -> 'preferencias' ->> 'densidad' <> 'comoda' then raise exception 'sin la preferencia: %', s -> 'preferencias'; end if;
  perform public.equipo_bloquear('00000000-0000-0000-0000-000000000003', true, 'prueba');
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
set role authenticated;
do $$ declare s jsonb; begin
  s := public.mi_sesion();
  if s ->> 'estado' <> 'bloqueada' then raise exception 'esperaba bloqueada: %', s ->> 'estado'; end if;
  if jsonb_array_length(s -> 'permisos') <> 0 then raise exception 'una cuenta bloqueada no tiene permisos'; end if;
  if (select count(*) from public.perfiles) <> 0 then raise exception 'una cuenta bloqueada no lee perfiles'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
set role authenticated;
do $$ begin
  if public.mi_sesion() ->> 'estado' <> 'baja' then raise exception 'esperaba baja: %', public.mi_sesion() ->> 'estado'; end if;
end $$;
reset role;

-- @test guardián: suma los roles de la persona, no cuenta invitaciones pendientes y cuida equipo.* del dueño
reset role;
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-000000000006', 'gestora@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000007', 'pendiente@ejemplo.com', '{"invitado": true}');
update public.perfiles set nombre = 'Gabriela Flores', invitacion_aceptada_en = now() where id = '00000000-0000-0000-0000-000000000006';
update public.perfiles set nombre = 'Pablo Rojas' where id = '00000000-0000-0000-0000-000000000007';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ declare r1 uuid; r2 uuid; begin
  set constraints all immediate;
  -- El dueño no pierde NINGÚN permiso de equipo, no sólo el de roles.
  begin
    perform public.rbac_revocar((select id from public.roles where clave = 'dueno'), 'equipo.usuarios.ver');
    raise exception 'el rol dueño perdió equipo.usuarios.ver';
  exception when check_violation then null; end;
  -- Dos roles que sumados dan los dos permisos de administración, y una segunda dueña sin aceptar.
  r1 := public.rbac_crear_rol('humo_roles', 'Humo roles');
  r2 := public.rbac_crear_rol('humo_personas', 'Humo personas');
  perform public.rbac_otorgar(r1, 'equipo.roles.gestionar');
  perform public.rbac_otorgar(r2, 'equipo.usuarios.gestionar');
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-000000000006', r1, true);
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-000000000006', r2);
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-000000000007', (select id from public.roles where clave = 'dueno'), true);
end $$;
reset role;
-- Gabriela (dos roles que suman) alcanza para que la dueña pueda ser bloqueada.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000006', false);
set role authenticated;
do $$ begin
  set constraints all immediate;
  perform public.equipo_bloquear('00000000-0000-0000-0000-000000000001', true, 'humo');
  perform public.equipo_bloquear('00000000-0000-0000-0000-000000000001', false);
end $$;
reset role;
-- Sin uno de sus dos roles, Gabriela ya no administra: la única que queda es la dueña. Pablo
-- tiene el rol dueño pero no aceptó su invitación: no cuenta.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
select public.rbac_quitar_rol('00000000-0000-0000-0000-000000000006', (select id from public.roles where clave = 'humo_roles'));
do $$ begin
  set constraints all immediate;
  begin
    perform public.rbac_quitar_rol('00000000-0000-0000-0000-000000000001', (select id from public.roles where clave = 'dueno'));
    raise exception 'la última que administra se quedó sin su rol';
  exception when check_violation then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000006', false);
set role authenticated;
do $$ begin
  set constraints all immediate;
  begin
    perform public.equipo_bloquear('00000000-0000-0000-0000-000000000001', true, 'humo');
    raise exception 'se bloqueó a la última que administra';
  exception when check_violation then null; end;
  begin
    perform public.equipo_dar_de_baja('00000000-0000-0000-0000-000000000001');
    raise exception 'se dio de baja a la última que administra';
  exception when check_violation then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test dominancia: quien gestiona roles sólo otorga, edita y asigna lo que tiene
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
-- Gabriela vuelve a gestionar roles, y además ve vehículos sólo de Oficina y sólo los propios.
select public.rbac_asignar_rol('00000000-0000-0000-0000-000000000006', (select id from public.roles where clave = 'humo_roles'));
select public.rbac_otorgar((select id from public.roles where clave = 'humo_roles'), 'vehiculos.ver', (select id from public.origenes where clave = 'oficina'), 'propios');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000006', false);
set role authenticated;
do $$ declare r uuid; asesor uuid; oficina uuid; usa uuid; begin
  select id into asesor from public.roles where clave = 'asesor';
  select id into oficina from public.origenes where clave = 'oficina';
  select id into usa from public.origenes where clave = 'subasta_usa';
  r := public.rbac_crear_rol('humo_ventas', 'Humo ventas');
  begin
    perform public.rbac_crear_rol('humo_ventas', 'Humo ventas');
    raise exception 'creó dos roles con la misma clave';
  exception when unique_violation then null; end;
  -- Lo que tiene, lo otorga.
  perform public.rbac_otorgar(r, 'equipo.roles.gestionar');
  perform public.rbac_otorgar(r, 'vehiculos.ver', oficina, 'propios');
  -- Lo que no tiene, no: ni el permiso, ni otro origen, ni todos los orígenes, ni más alcance.
  begin perform public.rbac_otorgar(r, 'leads.crear'); raise exception 'otorgó un permiso que no tiene';
  exception when insufficient_privilege then null; end;
  begin perform public.rbac_otorgar(r, 'vehiculos.ver', usa, 'propios'); raise exception 'otorgó en un origen que no tiene';
  exception when insufficient_privilege then null; end;
  begin perform public.rbac_otorgar(r, 'vehiculos.ver', null, 'propios'); raise exception 'otorgó en todos los orígenes teniendo uno';
  exception when insufficient_privilege then null; end;
  begin perform public.rbac_otorgar(r, 'vehiculos.ver', oficina, 'todos'); raise exception 'otorgó «todos» teniendo «propios»';
  exception when insufficient_privilege then null; end;
  -- Un rol con permisos que no tiene no lo edita, no lo asigna, no lo quita y no lo elimina.
  begin perform public.rbac_otorgar(asesor, 'equipo.roles.ver'); raise exception 'editó un rol que no domina';
  exception when insufficient_privilege then null; end;
  begin perform public.rbac_revocar(asesor, 'leads.crear'); raise exception 'revocó en un rol que no domina';
  exception when insufficient_privilege then null; end;
  begin perform public.rbac_asignar_rol('00000000-0000-0000-0000-000000000005', asesor, true); raise exception 'asignó un rol que no domina';
  exception when insufficient_privilege then null; end;
  begin perform public.rbac_quitar_rol('00000000-0000-0000-0000-000000000004', asesor); raise exception 'quitó un rol que no domina';
  exception when insufficient_privilege then null; end;
  begin perform public.rbac_eliminar_rol(asesor); raise exception 'eliminó un rol que no domina';
  exception when insufficient_privilege then null; end;
  -- El que sí domina, lo asigna.
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-000000000005', r, true);
end $$;
reset role;

-- @test conflictos: editar un rol con una versión vieja o bloquear a quien ya lo está es PT409
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare r uuid; v timestamptz; v2 timestamptz; begin
  select id, actualizado_en into r, v from public.roles where clave = 'humo_ventas';
  begin perform public.rbac_otorgar(r, 'equipo.usuarios.ver', null, 'todos', v - interval '1 second'); raise exception 'otorgó con una versión vieja';
  exception when others then if sqlstate <> 'PT409' then raise; end if; end;
  begin perform public.rbac_revocar(r, 'equipo.roles.gestionar', null, v - interval '1 second'); raise exception 'revocó con una versión vieja';
  exception when others then if sqlstate <> 'PT409' then raise; end if; end;
  begin perform public.rbac_eliminar_rol(r, v - interval '1 second'); raise exception 'eliminó con una versión vieja';
  exception when others then if sqlstate <> 'PT409' then raise; end if; end;
  -- Con la versión que tiene, pasa y devuelve la nueva.
  v2 := public.rbac_otorgar(r, 'equipo.usuarios.ver', null, 'todos', v);
  if v2 is null or v2 is distinct from (select actualizado_en from public.roles where id = r) then raise exception 'otorgar no devolvió la versión nueva del rol'; end if;
  v2 := public.rbac_revocar(r, 'equipo.usuarios.ver', null, v2);
  -- Con una persona adentro no se elimina; sin ella sí, y eliminarlo dos veces es un conflicto.
  begin perform public.rbac_eliminar_rol(r, v2); raise exception 'eliminó un rol que alguien tiene';
  exception when foreign_key_violation then null; end;
  perform public.rbac_quitar_rol('00000000-0000-0000-0000-000000000005', r);
  perform public.rbac_eliminar_rol(r, v2);
  begin perform public.rbac_eliminar_rol(r); raise exception 'eliminó un rol que ya no existe';
  exception when others then if sqlstate <> 'PT409' then raise; end if; end;
  -- Rosa ya estaba bloqueada (prueba de acceso) y Sofía dada de baja.
  begin perform public.equipo_bloquear('00000000-0000-0000-0000-000000000003', true); raise exception 'bloqueó a quien ya estaba bloqueada';
  exception when others then if sqlstate <> 'PT409' then raise; end if; end;
  begin perform public.equipo_bloquear('00000000-0000-0000-0000-000000000002', true); raise exception 'bloqueó a quien ya no está en el equipo';
  exception when others then if sqlstate <> 'PT409' then raise; end if; end;
  begin perform public.equipo_bloquear('00000000-0000-0000-0000-000000000001', true); raise exception 'se bloqueó a sí misma';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test limbo: la vista previa cuenta lo mismo que manda la baja, y un lead compartido no se cuenta
-- nuevo@ (4) tiene el lead que adoptó; suma uno propio y otro que además comparte con la invitada (5).
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ declare propio uuid; compartido uuid; begin
  propio := public.crear_lead('{"nombre": "Luis Choque", "telefono_cc": "+591", "telefono_principal": "70000021"}');
  compartido := public.crear_lead('{"nombre": "Marta Vaca", "telefono_cc": "+591", "telefono_principal": "70000022"}');
  perform public.compartir_lead(compartido, '00000000-0000-0000-0000-000000000005');
  -- Sin el permiso de gestionar personas, la vista previa no responde.
  begin perform public.equipo_vista_previa_baja('00000000-0000-0000-0000-000000000001'); raise exception 'un asesor vio la vista previa de una baja';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare antes jsonb; mandados int; begin
  antes := public.equipo_vista_previa_baja('00000000-0000-0000-0000-000000000004');
  if (antes ->> 'leads_al_limbo')::int <> 2 then raise exception 'esperaba 2 leads al limbo (el adoptado y el propio; el compartido no): %', antes; end if;
  mandados := public.equipo_dar_de_baja('00000000-0000-0000-0000-000000000004');
  if mandados <> (antes ->> 'leads_al_limbo')::int then raise exception 'la baja mandó % y la vista previa dijo %', mandados, antes; end if;
  if (public.verificar_telefono('+591', '70000021') ->> 'estado') <> 'limbo' then raise exception 'el lead propio no quedó en el limbo'; end if;
  if (public.verificar_telefono('+591', '70000022') ->> 'estado') = 'limbo' then raise exception 'el lead compartido cayó al limbo'; end if;
  if (public.equipo_vista_previa_baja('00000000-0000-0000-0000-000000000004') ->> 'leads_al_limbo')::int <> 0 then raise exception 'después de la baja no queda nada por mandar'; end if;
  begin perform public.equipo_dar_de_baja('00000000-0000-0000-0000-000000000004'); raise exception 'dio de baja dos veces';
  exception when others then if sqlstate <> 'PT409' then raise; end if; end;
  begin perform public.equipo_dar_de_baja('00000000-0000-0000-0000-000000000001'); raise exception 'se dio de baja a sí misma';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test perspectiva: los permisos efectivos nunca exceden los reales y RLS no se entera
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
select public.rbac_asignar_rol('00000000-0000-0000-0000-000000000005', (select id from public.roles where clave = 'asesor'), true);
do $$ declare asesor uuid; s jsonb; begin
  select id into asesor from public.roles where clave = 'asesor';
  -- Sin perspectiva, o con un rol que no existe, son los reales.
  if (select count(*) from public.permisos_efectivos()) <> (select count(*) from public.mis_permisos()) then raise exception 'sin perspectiva deben ser los reales'; end if;
  if (select count(*) from public.permisos_efectivos(gen_random_uuid())) <> (select count(*) from public.mis_permisos()) then raise exception 'un rol inexistente no cambia nada'; end if;
  -- La dueña mirando como asesor: exactamente lo del asesor, y nada que ella no tenga.
  if (select count(*) from public.permisos_efectivos(asesor)) <> (select count(*) from public.roles_permisos where rol_id = asesor) then raise exception 'la dueña como asesor debería ver lo del asesor'; end if;
  if exists (select 1 from public.permisos_efectivos(asesor) e where not public.concesion_dominada(e.clave, e.origen_id, e.alcance)) then raise exception 'un permiso efectivo excede los reales'; end if;
  if exists (select 1 from public.permisos_efectivos(asesor) e where e.clave like 'equipo.%') then raise exception 'como asesor no se dibuja nada de equipo'; end if;
  s := public.mi_sesion(asesor);
  if s -> 'perspectiva' -> 'rol' ->> 'nombre' <> 'Asesor' or not (s -> 'perspectiva' ->> 'disponible')::boolean then raise exception 'mi_sesion no dice la perspectiva: %', s -> 'perspectiva'; end if;
  if jsonb_array_length(s -> 'perspectiva' -> 'roles') = 0 then raise exception 'sin roles para elegir'; end if;
  if s -> 'roles' -> 0 ->> 'clave' <> 'dueno' then raise exception 'los roles de la sesión son los reales: %', s -> 'roles'; end if;
  if (public.mi_sesion() -> 'perspectiva' -> 'rol') <> 'null'::jsonb then raise exception 'sin perspectiva, el rol viene nulo'; end if;
  -- Sólo interfaz: con la perspectiva puesta, la base sigue respondiendo con el rol real.
  if not public.tiene_permiso('equipo.roles.gestionar') then raise exception 'la perspectiva no toca tiene_permiso()'; end if;
end $$;
reset role;
-- Gabriela (gestiona roles, y ve vehículos sólo de Oficina y sólo los propios) mirando como dueño:
-- el rol tiene todo, pero ella no gana nada.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000006', false);
set role authenticated;
do $$ declare dueno uuid; asesor uuid; oficina uuid; begin
  select id into dueno from public.roles where clave = 'dueno';
  select id into asesor from public.roles where clave = 'asesor';
  select id into oficina from public.origenes where clave = 'oficina';
  if exists (select 1 from public.permisos_efectivos(dueno) e where not public.concesion_dominada(e.clave, e.origen_id, e.alcance)) then raise exception 'mirar como dueño dio un permiso que no tiene'; end if;
  if (select count(*) from public.permisos_efectivos(dueno)) <> (select count(*) from (select distinct * from public.mis_permisos()) m) then raise exception 'mirar como un rol que tiene todo debe dejar exactamente lo propio'; end if;
  if exists (select 1 from public.permisos_efectivos(dueno) e where e.clave = 'leads.ver') then raise exception 'apareció leads.ver, que no tiene'; end if;
  -- El asesor ve vehículos de todos los orígenes y todos; ella sólo Oficina y propios: queda lo angosto.
  if not exists (select 1 from public.permisos_efectivos(asesor) e where e.clave = 'vehiculos.ver' and e.origen_id = oficina and e.alcance = 'propios') then raise exception 'la intersección no dejó el origen y el alcance más angostos'; end if;
  if exists (select 1 from public.permisos_efectivos(asesor) e where e.clave = 'vehiculos.ver' and (e.origen_id is null or e.alcance = 'todos')) then raise exception 'la intersección amplió el origen o el alcance'; end if;
end $$;
reset role;
-- La invitada (asesora, no gestiona roles) no puede usar la perspectiva: el parámetro se ignora.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);
set role authenticated;
do $$ declare dueno uuid; s jsonb; begin
  select id into dueno from public.roles where clave = 'dueno';
  if (select count(*) from public.permisos_efectivos(dueno)) <> (select count(*) from public.mis_permisos()) then raise exception 'sin equipo.roles.gestionar la perspectiva se ignora'; end if;
  if exists (select 1 from public.permisos_efectivos(dueno) e where e.clave like 'equipo.%') then raise exception 'una asesora ganó permisos de equipo mirando como dueño'; end if;
  s := public.mi_sesion(dueno);
  if (s -> 'perspectiva' ->> 'disponible')::boolean or (s -> 'perspectiva' -> 'rol') <> 'null'::jsonb or jsonb_array_length(s -> 'perspectiva' -> 'roles') <> 0 then raise exception 'la perspectiva no está disponible para ella: %', s -> 'perspectiva'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test empresa: tipos de cambio y monedas por RPC, un valor vigente y uno por defecto, historial con autor; con datos la moneda base no cambia
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ declare oficial uuid; paralelo uuid; banco uuid; v timestamptz; v2 timestamptz; h public.tipos_cambio_historial; rechazo boolean; begin
  select id, actualizado_en into oficial, v from public.tipos_cambio where clave = 'oficial';
  select id into paralelo from public.tipos_cambio where clave = 'paralelo';
  begin update public.tipos_cambio set valor = 1 where id = oficial; raise exception 'el update directo de tipos_cambio pasó';
  exception when insufficient_privilege then null; end;
  begin insert into public.monedas (codigo, nombre, simbolo) values ('XXX', 'x', 'x'); raise exception 'el insert directo de monedas pasó';
  exception when insufficient_privilege then null; end;
  begin perform public.tipo_cambio_guardar(oficial, v - interval '1 second', p_valor => 7); raise exception 'guardó un tipo de cambio con una versión vieja';
  exception when others then if sqlstate <> 'PT409' then raise; end if; end;
  -- Cambiar el valor: sigue habiendo una sola fila por clave y el trigger deja el historial con autor.
  v2 := public.tipo_cambio_guardar(oficial, v, p_valor => 6.97);
  if v2 is distinct from (select actualizado_en from public.tipos_cambio where id = oficial) then raise exception 'no devolvió la versión nueva del tipo de cambio'; end if;
  if (select count(*) from public.tipos_cambio where clave = 'oficial') <> 1 or (select valor from public.tipos_cambio where id = oficial) <> 6.97 then raise exception 'debía quedar un solo valor vigente'; end if;
  select * into h from public.tipos_cambio_historial where tipo_cambio_id = oficial order by id desc limit 1;
  if h.valor_anterior <> 6.96 or h.valor_nuevo <> 6.97 or h.cambiado_por is distinct from '00000000-0000-0000-0000-000000000001'::uuid then raise exception 'el historial no registró el cambio: %', h; end if;
  -- Cambiar sólo el nombre no escribe historial.
  perform public.tipo_cambio_guardar(oficial, null, p_nombre => 'Oficial BCB');
  if (select count(*) from public.tipos_cambio_historial where tipo_cambio_id = oficial) <> 2 then raise exception 'renombrar no debía escribir historial'; end if;
  -- Uno por defecto entre dos monedas: marcar otro desmarca al anterior; no se puede dejar sin ninguno.
  perform public.tipo_cambio_guardar(paralelo, null, p_es_default => true);
  if (select count(*) from public.tipos_cambio where moneda_de = 'USD' and moneda_a = 'BOB' and es_default) <> 1 or not (select es_default from public.tipos_cambio where id = paralelo) then raise exception 'debía quedar sólo el paralelo por defecto'; end if;
  rechazo := false; begin perform public.tipo_cambio_guardar(paralelo, null, p_es_default => false); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'dejó al par sin tipo de cambio por defecto'; end if;
  rechazo := false; begin perform public.tipo_cambio_guardar(paralelo, null, p_activo => false); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'desactivó el tipo de cambio por defecto'; end if;
  perform public.tipo_cambio_guardar(oficial, null, p_es_default => true);
  -- Crear: el segundo del par no nace por defecto; la clave no se repite ni lleva espacios.
  banco := public.tipo_cambio_crear('banco', 'Banco', 'usd', 'bob', 9.5);
  if (select es_default from public.tipos_cambio where id = banco) then raise exception 'el tercero del par no nace por defecto'; end if;
  if not exists (select 1 from public.tipos_cambio_historial where tipo_cambio_id = banco and valor_anterior is null and valor_nuevo = 9.5) then raise exception 'crear no dejó el primer valor en el historial'; end if;
  begin perform public.tipo_cambio_crear('banco', 'Otro', 'USD', 'BOB', 9); raise exception 'repitió la clave de un tipo de cambio';
  exception when unique_violation then null; end;
  rechazo := false; begin perform public.tipo_cambio_crear('Con Espacios', 'Mal', 'USD', 'BOB', 9); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'aceptó una clave con espacios'; end if;
  rechazo := false; begin perform public.tipo_cambio_crear('euro', 'Euro', 'USD', 'EUR', 0.9); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'creó un tipo de cambio con una moneda que no existe'; end if;
  -- Monedas: se crean y se editan; la base y las que usa un tipo de cambio activo no se desactivan.
  perform public.moneda_crear('eur', 'Euro', '€');
  if not exists (select 1 from public.monedas where codigo = 'EUR' and activa and decimales = 2) then raise exception 'no creó la moneda'; end if;
  begin perform public.moneda_crear('EUR', 'Euro', '€'); raise exception 'repitió una moneda';
  exception when unique_violation then null; end;
  perform public.moneda_guardar('EUR', (select actualizado_en from public.monedas where codigo = 'EUR'), p_simbolo => 'EUR', p_activa => false);
  if (select activa from public.monedas where codigo = 'EUR') or (select simbolo from public.monedas where codigo = 'EUR') <> 'EUR' then raise exception 'no editó la moneda'; end if;
  rechazo := false; begin perform public.moneda_guardar('USD', null, p_activa => false); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'desactivó la moneda base'; end if;
  rechazo := false; begin perform public.moneda_guardar('BOB', null, p_activa => false); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'desactivó una moneda con tipos de cambio activos'; end if;
  -- Con vehículos y cotizaciones cargados, la moneda base ya no cambia.
  if not public.empresa_con_datos_cargados() then raise exception 'a esta altura hay datos cargados'; end if;
  rechazo := false; begin perform public.empresa_guardar_ajustes('{"moneda_base": "BOB"}', null); exception when raise_exception then rechazo := true; end;
  if not rechazo or (select moneda_base from public.ajustes_empresa) <> 'USD' then raise exception 'cambió la moneda base con datos cargados'; end if;
end $$;
reset role;
-- La invitada (asesora) ve los tipos de cambio vigentes, pero no el historial ni puede cambiarlos.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);
set role authenticated;
do $$ begin
  if (select count(*) from public.tipos_cambio where activo) < 2 then raise exception 'una asesora debía leer los tipos de cambio'; end if;
  if (select count(*) from public.tipos_cambio_historial) <> 0 then raise exception 'leyó el historial sin permiso'; end if;
  begin perform public.tipo_cambio_guardar((select id from public.tipos_cambio where clave = 'oficial'), null, p_valor => 1); raise exception 'cambió un tipo de cambio sin permiso';
  exception when insufficient_privilege then null; end;
  begin perform public.moneda_crear('CLP', 'Peso chileno', '$'); raise exception 'creó una moneda sin permiso';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test empresa: el secreto de una integración va a Vault y ningún rol de la app lo lee
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ declare v timestamptz; v2 timestamptz; i public.integraciones; rechazo boolean; begin
  select actualizado_en into v from public.integraciones where clave = 'apibara';
  begin update public.integraciones set activa = true where clave = 'apibara'; raise exception 'el update directo de integraciones pasó';
  exception when insufficient_privilege then null; end;
  rechazo := false; begin perform public.integracion_guardar('apibara', v, p_activa => true); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'activó apibara sin su clave guardada'; end if;
  rechazo := false; begin perform public.integracion_guardar_secreto('apibara', 'corta', v); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'aceptó una clave demasiado corta'; end if;
  begin perform public.integracion_guardar_secreto('apibara', 'humo-secreto-primero-123', v - interval '1 second'); raise exception 'guardó el secreto con una versión vieja';
  exception when others then if sqlstate <> 'PT409' then raise; end if; end;
  v2 := public.integracion_guardar_secreto('apibara', 'humo-secreto-primero-123', v);
  select * into i from public.integraciones where clave = 'apibara';
  if i.secreto_guardado_en is null or v2 is distinct from i.actualizado_en then raise exception 'no quedó dicho que el secreto está guardado: %', i; end if;
  if to_jsonb(i)::text like '%humo-secreto%' then raise exception 'el secreto quedó en una columna legible'; end if;
  -- Quien lo guardó tampoco lo puede leer.
  begin perform 1 from vault.secrets; raise exception 'un rol de la app leyó vault.secrets';
  exception when insufficient_privilege then null; end;
  begin perform 1 from vault.decrypted_secrets; raise exception 'un rol de la app leyó vault.decrypted_secrets';
  exception when insufficient_privilege then null; end;
  begin perform public.integracion_secreto('apibara'); raise exception 'un rol de la app ejecutó integracion_secreto';
  exception when insufficient_privilege then null; end;
  -- Con la clave guardada sí se activa, y la configuración no secreta se edita.
  perform public.integracion_guardar('apibara', v2, p_activa => true, p_config => '{"endpoint": "https://api.apibara.tech", "plataformas": ["copart"]}');
  select * into i from public.integraciones where clave = 'apibara';
  if not i.activa or i.config -> 'plataformas' <> '["copart"]'::jsonb or i.actualizado_por is distinct from '00000000-0000-0000-0000-000000000001'::uuid then raise exception 'no guardó la integración: %', i; end if;
  -- Reemplazar no crea un segundo secreto.
  perform public.integracion_guardar_secreto('apibara', 'humo-secreto-segundo-456', null);
end $$;
reset role;
do $$ begin
  if (select count(*) from vault.secrets where name = 'integracion:apibara') <> 1 then raise exception 'reemplazar debía dejar un solo secreto en Vault'; end if;
  if exists (select 1 from public.actividad where coalesce(antes::text, '') || coalesce(despues::text, '') || coalesce(detalle::text, '') like '%humo-secreto%') then raise exception 'el secreto quedó en la actividad'; end if;
end $$;
-- Las edge functions (cliente de servicio) sí lo leen.
set role service_role;
do $$ begin
  if public.integracion_secreto('apibara') is distinct from 'humo-secreto-segundo-456' then raise exception 'service_role debía leer el secreto vigente'; end if;
end $$;
reset role;
-- Sin el permiso no se guarda ni se activa; sin sesión, nada.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);
set role authenticated;
do $$ begin
  begin perform public.integracion_guardar_secreto('apibara', 'humo-secreto-ajeno-789', null); raise exception 'guardó un secreto sin permiso';
  exception when insufficient_privilege then null; end;
  begin perform public.integracion_guardar('apibara', null, p_activa => false); raise exception 'apagó una integración sin permiso';
  exception when insufficient_privilege then null; end;
  if not (select activa from public.integraciones where clave = 'apibara') then raise exception 'una asesora debía leer si apibara está activa'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claim.role', 'anon', false);
set role anon;
do $$ begin
  begin perform public.integracion_secreto('apibara'); raise exception 'anon ejecutó integracion_secreto';
  exception when insufficient_privilege then null; end;
  begin perform public.integracion_guardar_secreto('apibara', 'humo-secreto-anon-000', null); raise exception 'anon guardó un secreto';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
