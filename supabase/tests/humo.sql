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
    perform public.rbac_revocar((select id from public.roles where clave = 'dueno'), 'equipo.roles.gestionar', (select actualizado_en from public.roles where clave = 'dueno'));
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
  perform public.empresa_guardar_ajustes('{"iconos": null, "color_acento": null}', (select actualizado_en from public.ajustes_empresa));
  select * into a from public.ajustes_empresa;
  if a.iconos is not null or a.color_acento is not null or a.nombre <> 'Importadora Andina' then raise exception 'nulo debía vaciar y ausente no tocar: %', a; end if;
  -- Reglas que un CHECK no expresa.
  rechazo := false; begin perform public.empresa_guardar_ajustes('{"zona_horaria": "Marte/Olympus"}', (select actualizado_en from public.ajustes_empresa)); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'aceptó una zona horaria que no existe'; end if;
  rechazo := false; begin perform public.empresa_guardar_ajustes('{"locale": "es_BO; drop"}', (select actualizado_en from public.ajustes_empresa)); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'aceptó un formato regional sin forma de locale'; end if;
  rechazo := false; begin perform public.empresa_guardar_ajustes('{"id": 2}', (select actualizado_en from public.ajustes_empresa)); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'dejó cambiar una columna que no es editable'; end if;
  rechazo := false; begin perform public.empresa_guardar_ajustes('{"nombre": "   "}', (select actualizado_en from public.ajustes_empresa)); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'dejó el nombre vacío'; end if;
  rechazo := false; begin perform public.empresa_guardar_ajustes('{"moneda_base": "EUR"}', (select actualizado_en from public.ajustes_empresa)); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'aceptó como base una moneda que no existe'; end if;
  -- Todavía no hay vehículos, cotizaciones ni gastos: la moneda base se puede cambiar.
  if public.empresa_con_datos_cargados() then raise exception 'no debería haber datos cargados todavía'; end if;
  perform public.empresa_guardar_ajustes('{"moneda_base": "BOB"}', (select actualizado_en from public.ajustes_empresa));
  if (select moneda_base from public.ajustes_empresa) <> 'BOB' then raise exception 'sin datos, la moneda base debía cambiar'; end if;
  perform public.empresa_guardar_ajustes('{"moneda_base": "USD", "nombre": "Mi importadora", "zona_horaria": "America/La_Paz", "papelera_dias": 30}', (select actualizado_en from public.ajustes_empresa));
end $$;
reset role;
-- Sofía (asesora) lee los ajustes pero no los guarda.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
set role authenticated;
do $$ begin
  if (select nombre from public.ajustes_empresa) <> 'Mi importadora' then raise exception 'una asesora debía leer los ajustes'; end if;
  begin perform public.empresa_guardar_ajustes('{"nombre": "Otra"}', (select actualizado_en from public.ajustes_empresa)); raise exception 'guardó los ajustes sin permiso';
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

-- @test vehículo de subasta: alta sólo por RPC, atributos validados, 24 fotos, vitrina sólo por RPC
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', false);
set role authenticated;
do $$ declare o uuid; v uuid; i int; begin
  select id into o from public.origenes where clave = 'subasta_usa';
  begin
    insert into public.vehiculos (origen_id, titulo, creado_por) values (o, 'Directo', '00000000-0000-0000-0000-000000000004');
    raise exception 'insertó un vehículo sin pasar por vehiculo_crear';
  exception when insufficient_privilege then null; end;
  begin
    perform public.vehiculo_crear(gen_random_uuid(), o, '{"titulo": "Mal", "atributos": {"cilindros": "cuatro"}}');
    raise exception 'aceptó un atributo con tipo incorrecto';
  exception when invalid_parameter_value then null; end;
  v := (public.vehiculo_crear('aaaaaaaa-0000-4000-8000-000000000001', o,
    '{"titulo": "2021 Toyota RAV4 XLE", "marca": "Toyota", "modelo": "RAV4", "anio": 2021, "vin": "JTMW1RFV8MD012345", "lote": "58741223", "plataforma": "copart", "atributos": {"color": "Gris", "cilindros": 4, "enciende_y_anda": true}}') ->> 'id')::uuid;
  if (select creado_por from public.vehiculos where id = v) <> '00000000-0000-0000-0000-000000000004' then raise exception 'el alta no selló quién lo creó'; end if;
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
    update public.vehiculos set titulo = 'Pisado' where id = v;
    raise exception 'dejó editar por UPDATE directo, sin versión';
  exception when insufficient_privilege then null; end;
  begin
    perform public.vehiculo_vitrina(v, true);
    raise exception 'el asesor no tiene vehiculos.vitrina';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- @test motor de flujos: inicial, requisitos bloqueantes, cotización final, PT409, lote parcial
insert into public.vehiculos (origen_id, titulo, creado_por)
select id, 'Sin fase de humo', '00000000-0000-0000-0000-000000000001' from public.origenes where clave = 'subasta_usa';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
set role authenticated;
do $$ declare v uuid; sin_fase uuid; f_sub uuid; f_comp uuid; pre jsonb; h bigint; res jsonb; begin
  select id into v from public.vehiculos where lote = '58741223';
  select id into sin_fase from public.vehiculos where titulo = 'Sin fase de humo';
  select f.id into f_sub from public.fases f join public.flujos fl on fl.id = f.flujo_id join public.origenes o on o.id = fl.origen_id where o.clave = 'subasta_usa' and f.nombre = 'En subasta';
  select f.id into f_comp from public.fases f join public.flujos fl on fl.id = f.flujo_id join public.origenes o on o.id = fl.origen_id where o.clave = 'subasta_usa' and f.nombre = 'Comprado';
  -- Uno que quedó sin fase (lo que pasa con cero o varias iniciales) entra por cambiar_fase.
  pre := public.previsualizar_cambio_fase(sin_fase, null, f_comp);
  if (pre ->> 'ok')::boolean then raise exception 'sin fase no se puede ir a Comprado'; end if;
  h := public.cambiar_fase(sin_fase, null, f_sub, null, null);
  if (select fase_id from public.vehiculos where id = sin_fase) <> f_sub then raise exception 'no entró a la inicial'; end if;
  -- El que se dio de alta por la RPC ya nació en la única inicial del flujo, con su historial.
  if (select fase_id from public.vehiculos where id = v) is distinct from f_sub then raise exception 'el alta no lo dejó en la fase inicial'; end if;
  if (select count(*) from public.historial_fases where vehiculo_id = v and de_fase_id is null and a_fase_id = f_sub) <> 1 then raise exception 'la entrada a la inicial no quedó en el historial'; end if;
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
    perform public.rbac_revocar((select id from public.roles where clave = 'dueno'), 'equipo.usuarios.ver', (select actualizado_en from public.roles where clave = 'dueno'));
    raise exception 'el rol dueño perdió equipo.usuarios.ver';
  exception when check_violation then null; end;
  -- Dos roles que sumados dan los dos permisos de administración, y una segunda dueña sin aceptar.
  r1 := public.rbac_crear_rol('humo_roles', 'Humo roles');
  r2 := public.rbac_crear_rol('humo_personas', 'Humo personas');
  perform public.rbac_otorgar(r1, 'equipo.roles.gestionar', (select actualizado_en from public.roles where id = r1));
  perform public.rbac_otorgar(r2, 'equipo.usuarios.gestionar', (select actualizado_en from public.roles where id = r2));
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
select public.rbac_otorgar((select id from public.roles where clave = 'humo_roles'), 'vehiculos.ver', (select actualizado_en from public.roles where clave = 'humo_roles'), p_origen => (select id from public.origenes where clave = 'oficina'), p_alcance => 'propios');
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
  perform public.rbac_otorgar(r, 'equipo.roles.gestionar', (select actualizado_en from public.roles where id = r));
  perform public.rbac_otorgar(r, 'vehiculos.ver', (select actualizado_en from public.roles where id = r), p_origen => oficina, p_alcance => 'propios');
  -- Lo que no tiene, no: ni el permiso, ni otro origen, ni todos los orígenes, ni más alcance.
  begin perform public.rbac_otorgar(r, 'leads.crear', (select actualizado_en from public.roles where id = r)); raise exception 'otorgó un permiso que no tiene';
  exception when insufficient_privilege then null; end;
  begin perform public.rbac_otorgar(r, 'vehiculos.ver', (select actualizado_en from public.roles where id = r), p_origen => usa, p_alcance => 'propios'); raise exception 'otorgó en un origen que no tiene';
  exception when insufficient_privilege then null; end;
  begin perform public.rbac_otorgar(r, 'vehiculos.ver', (select actualizado_en from public.roles where id = r), p_alcance => 'propios'); raise exception 'otorgó en todos los orígenes teniendo uno';
  exception when insufficient_privilege then null; end;
  begin perform public.rbac_otorgar(r, 'vehiculos.ver', (select actualizado_en from public.roles where id = r), p_origen => oficina, p_alcance => 'todos'); raise exception 'otorgó «todos» teniendo «propios»';
  exception when insufficient_privilege then null; end;
  -- Un rol con permisos que no tiene no lo edita, no lo asigna, no lo quita y no lo elimina.
  begin perform public.rbac_otorgar(asesor, 'equipo.roles.ver', (select actualizado_en from public.roles where id = asesor)); raise exception 'editó un rol que no domina';
  exception when insufficient_privilege then null; end;
  begin perform public.rbac_revocar(asesor, 'leads.crear', (select actualizado_en from public.roles where id = asesor)); raise exception 'revocó en un rol que no domina';
  exception when insufficient_privilege then null; end;
  begin perform public.rbac_asignar_rol('00000000-0000-0000-0000-000000000005', asesor, true); raise exception 'asignó un rol que no domina';
  exception when insufficient_privilege then null; end;
  begin perform public.rbac_quitar_rol('00000000-0000-0000-0000-000000000004', asesor); raise exception 'quitó un rol que no domina';
  exception when insufficient_privilege then null; end;
  begin perform public.rbac_eliminar_rol(asesor, (select actualizado_en from public.roles where id = asesor)); raise exception 'eliminó un rol que no domina';
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
  begin perform public.rbac_otorgar(r, 'equipo.usuarios.ver', v - interval '1 second'); raise exception 'otorgó con una versión vieja';
  exception when others then if sqlstate <> 'PT409' then raise; end if; end;
  begin perform public.rbac_revocar(r, 'equipo.roles.gestionar', v - interval '1 second'); raise exception 'revocó con una versión vieja';
  exception when others then if sqlstate <> 'PT409' then raise; end if; end;
  begin perform public.rbac_eliminar_rol(r, v - interval '1 second'); raise exception 'eliminó con una versión vieja';
  exception when others then if sqlstate <> 'PT409' then raise; end if; end;
  -- Con la versión que tiene, pasa y devuelve la nueva.
  v2 := public.rbac_otorgar(r, 'equipo.usuarios.ver', v);
  if v2 is null or v2 is distinct from (select actualizado_en from public.roles where id = r) then raise exception 'otorgar no devolvió la versión nueva del rol'; end if;
  v2 := public.rbac_revocar(r, 'equipo.usuarios.ver', v2);
  -- Con una persona adentro no se elimina; sin ella sí, y eliminarlo dos veces es un conflicto.
  begin perform public.rbac_eliminar_rol(r, v2); raise exception 'eliminó un rol que alguien tiene';
  exception when foreign_key_violation then null; end;
  perform public.rbac_quitar_rol('00000000-0000-0000-0000-000000000005', r);
  perform public.rbac_eliminar_rol(r, v2);
  begin perform public.rbac_eliminar_rol(r, v2); raise exception 'eliminó un rol que ya no existe';
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

-- @test versión obligatoria: toda RPC de edición rechaza una versión nula con un mensaje legible
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ declare r uuid := (select id from public.roles where clave = 'humo_personas'); m text; begin
  begin perform public.rbac_otorgar(r, 'equipo.usuarios.ver', null); raise exception 'otorgó sin versión';
  exception when raise_exception then
    get stacked diagnostics m = message_text;
    if m not like 'Falta la versión%' then raise; end if;
  end;
  begin perform public.rbac_revocar(r, 'equipo.usuarios.gestionar', null); raise exception 'revocó sin versión';
  exception when raise_exception then
    get stacked diagnostics m = message_text;
    if m not like 'Falta la versión%' then raise; end if;
  end;
  begin perform public.rbac_eliminar_rol(r, null); raise exception 'eliminó un rol sin versión';
  exception when raise_exception then
    get stacked diagnostics m = message_text;
    if m not like 'Falta la versión%' then raise; end if;
  end;
  begin perform public.empresa_guardar_ajustes('{"nombre": "X"}', null); raise exception 'guardó los ajustes sin versión';
  exception when raise_exception then
    get stacked diagnostics m = message_text;
    if m not like 'Falta la versión%' then raise; end if;
  end;
  begin perform public.moneda_guardar('USD', null, p_nombre => 'Dólar'); raise exception 'guardó una moneda sin versión';
  exception when raise_exception then
    get stacked diagnostics m = message_text;
    if m not like 'Falta la versión%' then raise; end if;
  end;
  begin perform public.tipo_cambio_guardar((select id from public.tipos_cambio where clave = 'oficial'), null, p_valor => 7); raise exception 'guardó un tipo de cambio sin versión';
  exception when raise_exception then
    get stacked diagnostics m = message_text;
    if m not like 'Falta la versión%' then raise; end if;
  end;
  begin perform public.integracion_guardar('apibara', null, p_activa => false); raise exception 'guardó una integración sin versión';
  exception when raise_exception then
    get stacked diagnostics m = message_text;
    if m not like 'Falta la versión%' then raise; end if;
  end;
  begin perform public.integracion_guardar_secreto('apibara', 'humo-secreto-sin-version-1', null); raise exception 'guardó un secreto sin versión';
  exception when raise_exception then
    get stacked diagnostics m = message_text;
    if m not like 'Falta la versión%' then raise; end if;
  end;
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
  perform public.tipo_cambio_guardar(oficial, (select actualizado_en from public.tipos_cambio where id = oficial), p_nombre => 'Oficial BCB');
  if (select count(*) from public.tipos_cambio_historial where tipo_cambio_id = oficial) <> 2 then raise exception 'renombrar no debía escribir historial'; end if;
  -- Uno por defecto entre dos monedas: marcar otro desmarca al anterior; no se puede dejar sin ninguno.
  perform public.tipo_cambio_guardar(paralelo, (select actualizado_en from public.tipos_cambio where id = paralelo), p_es_default => true);
  if (select count(*) from public.tipos_cambio where moneda_de = 'USD' and moneda_a = 'BOB' and es_default) <> 1 or not (select es_default from public.tipos_cambio where id = paralelo) then raise exception 'debía quedar sólo el paralelo por defecto'; end if;
  rechazo := false; begin perform public.tipo_cambio_guardar(paralelo, (select actualizado_en from public.tipos_cambio where id = paralelo), p_es_default => false); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'dejó al par sin tipo de cambio por defecto'; end if;
  rechazo := false; begin perform public.tipo_cambio_guardar(paralelo, (select actualizado_en from public.tipos_cambio where id = paralelo), p_activo => false); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'desactivó el tipo de cambio por defecto'; end if;
  perform public.tipo_cambio_guardar(oficial, (select actualizado_en from public.tipos_cambio where id = oficial), p_es_default => true);
  -- Crear: el segundo del par no nace por defecto; la clave no se repite ni lleva espacios.
  banco := public.tipo_cambio_crear('banco', 'Banco', 'usd', 'bob', 9.5);
  if (select es_default from public.tipos_cambio where id = banco) then raise exception 'el tercero del par no nace por defecto'; end if;
  if not exists (select 1 from public.tipos_cambio_historial where tipo_cambio_id = banco and valor_anterior is null and valor_nuevo = 9.5) then raise exception 'crear no dejó el primer valor en el historial'; end if;
  begin perform public.tipo_cambio_crear('banco', 'Otro', 'USD', 'BOB', 9); raise exception 'repitió la clave de un tipo de cambio';
  exception when unique_violation then null; end;
  rechazo := false; begin perform public.tipo_cambio_guardar(banco, (select actualizado_en from public.tipos_cambio where id = banco), p_valor => 'NaN'); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'aceptó NaN como valor de un tipo de cambio'; end if;
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
  rechazo := false; begin perform public.moneda_guardar('USD', (select actualizado_en from public.monedas where codigo = 'USD'), p_activa => false); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'desactivó la moneda base'; end if;
  rechazo := false; begin perform public.moneda_guardar('BOB', (select actualizado_en from public.monedas where codigo = 'BOB'), p_activa => false); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'desactivó una moneda con tipos de cambio activos'; end if;
  -- Con vehículos y cotizaciones cargados, la moneda base ya no cambia.
  if not public.empresa_con_datos_cargados() then raise exception 'a esta altura hay datos cargados'; end if;
  rechazo := false; begin perform public.empresa_guardar_ajustes('{"moneda_base": "BOB"}', (select actualizado_en from public.ajustes_empresa)); exception when raise_exception then rechazo := true; end;
  if not rechazo or (select moneda_base from public.ajustes_empresa) <> 'USD' then raise exception 'cambió la moneda base con datos cargados'; end if;
end $$;
reset role;
-- La invitada (asesora) ve los tipos de cambio vigentes, pero no el historial ni puede cambiarlos.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);
set role authenticated;
do $$ begin
  if (select count(*) from public.tipos_cambio where activo) < 2 then raise exception 'una asesora debía leer los tipos de cambio'; end if;
  if (select count(*) from public.tipos_cambio_historial) <> 0 then raise exception 'leyó el historial sin permiso'; end if;
  begin perform public.tipo_cambio_guardar((select id from public.tipos_cambio where clave = 'oficial'), (select actualizado_en from public.tipos_cambio where clave = 'oficial'), p_valor => 1); raise exception 'cambió un tipo de cambio sin permiso';
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
  -- La dirección no puede apuntar fuera de apibara.tech: ahí viaja la clave.
  rechazo := false; begin perform public.integracion_guardar('apibara', (select actualizado_en from public.integraciones where clave = 'apibara'), p_config => '{"endpoint": "https://atacante.example", "plataformas": ["copart"]}'); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'dejó apuntar apibara a otro sitio'; end if;
  rechazo := false; begin perform public.integracion_guardar('apibara', (select actualizado_en from public.integraciones where clave = 'apibara'), p_config => '{"endpoint": "https://apibara.tech.atacante.example/x", "plataformas": ["copart"]}'); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'dejó apuntar apibara a un dominio que sólo empieza igual'; end if;
  rechazo := false; begin perform public.integracion_guardar('apibara', (select actualizado_en from public.integraciones where clave = 'apibara'), p_config => '{"plataformas": ["copart"]}'); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'dejó guardar la configuración de apibara sin su dirección'; end if;
  perform public.integracion_guardar('apibara', (select actualizado_en from public.integraciones where clave = 'apibara'), p_config => '{"endpoint": "https://apibara.tech/api/v1", "plataformas": ["copart"]}');
  -- Reemplazar no crea un segundo secreto.
  perform public.integracion_guardar_secreto('apibara', 'humo-secreto-segundo-456', (select actualizado_en from public.integraciones where clave = 'apibara'));
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
  begin perform public.integracion_guardar_secreto('apibara', 'humo-secreto-ajeno-789', (select actualizado_en from public.integraciones where clave = 'apibara')); raise exception 'guardó un secreto sin permiso';
  exception when insufficient_privilege then null; end;
  begin perform public.integracion_guardar('apibara', (select actualizado_en from public.integraciones where clave = 'apibara'), p_activa => false); raise exception 'apagó una integración sin permiso';
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

-- @test origenes: crear es atómico y trae su flujo, sus reglas y sus campos; el nombre no se repite
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ declare r jsonb; o uuid; rechazo boolean; begin
  begin insert into public.origenes (clave, nombre) values ('directo', 'Directo'); raise exception 'el insert directo de origenes pasó';
  exception when insufficient_privilege then null; end;
  begin update public.origenes set nombre = 'Otro'; raise exception 'el update directo de origenes pasó';
  exception when insufficient_privilege then null; end;
  begin insert into public.origenes_campos (origen_id, clave, etiqueta, tipo) select id, 'x', 'X', 'texto' from public.origenes limit 1; raise exception 'el insert directo de campos pasó';
  exception when insufficient_privilege then null; end;
  begin insert into public.categorias (origen_id, nombre) select id, 'X' from public.origenes limit 1; raise exception 'el insert directo de categorías pasó';
  exception when insufficient_privilege then null; end;

  -- Manual: un flujo, nueve reglas (sin aduana), ocho campos de sistema, sin fórmula ni fases.
  r := public.origen_crear('corea_humo', '  Corea  ', 'Vehículo', 'm', 'manual');
  o := (r ->> 'id')::uuid;
  if (select count(*) from public.flujos where origen_id = o and ambito = 'vehiculos') <> 1 then raise exception 'el origen manual debía nacer con un flujo'; end if;
  if (select nombre from public.flujos where origen_id = o) <> 'Logística Corea' then raise exception 'el flujo no lleva el nombre del origen'; end if;
  if (select count(*) from public.flujos_reglas fr join public.flujos f on f.id = fr.flujo_id where f.origen_id = o) <> 9
     or exists (select 1 from public.flujos_reglas fr join public.flujos f on f.id = fr.flujo_id where f.origen_id = o and fr.regla = 'aduana') then
    raise exception 'las reglas del origen manual no son las nueve sin aduana'; end if;
  if (select count(*) from public.origenes_campos where origen_id = o and es_sistema) <> 8 or (select count(*) from public.origenes_campos where origen_id = o) <> 8 then
    raise exception 'el origen manual debía nacer con ocho campos de sistema'; end if;
  if exists (select 1 from public.origenes_campos where origen_id = o and clave_apibara is not null) then raise exception 'un campo manual lleva clave de apibara'; end if;
  if exists (select 1 from public.formulas where origen_id = o) or exists (select 1 from public.fases f join public.flujos fl on fl.id = f.flujo_id where fl.origen_id = o) then
    raise exception 'un origen nuevo no trae fórmula ni fases'; end if;
  if (select nombre || '/' || sustantivo from public.origenes where id = o) <> 'Corea/vehículo' then raise exception 'no limpió el nombre ni el sustantivo'; end if;

  -- Subasta: diecisiete campos con su clave de apibara y la regla de aduana.
  r := public.origen_crear('japon_humo', 'Japón', 'lote', 'm', 'subasta', '#7A5AF8', array['copart']);
  o := (r ->> 'id')::uuid;
  if (select count(*) from public.origenes_campos where origen_id = o) <> 17 or (select count(clave_apibara) from public.origenes_campos where origen_id = o) <> 17 then
    raise exception 'el origen de subasta debía nacer con diecisiete campos mapeados'; end if;
  if not exists (select 1 from public.flujos_reglas fr join public.flujos f on f.id = fr.flujo_id where f.origen_id = o and fr.regla = 'aduana') then raise exception 'la subasta nace con la regla de aduana'; end if;
  if (select color || '/' || apibara_plataformas::text from public.origenes where id = o) <> '#7a5af8/{copart}' then raise exception 'no guardó color ni plataformas'; end if;

  -- Nombre y clave no se repiten (el nombre, sin importar mayúsculas ni espacios).
  begin perform public.origen_crear('otra_clave', ' COREA ', 'vehículo', 'm', 'manual'); raise exception 'repitió el nombre de un origen';
  exception when unique_violation then if sqlerrm not like 'Ya existe un origen llamado%' then raise; end if; end;
  -- Mismo nombre y misma clave a la vez: cuenta el nombre.
  begin perform public.origen_crear('corea_humo', 'corea', 'vehículo', 'm', 'manual'); raise exception 'repitió nombre y clave';
  exception when unique_violation then if sqlerrm not like 'Ya existe un origen llamado%' then raise; end if; end;
  -- Otro nombre con la misma clave: se dice la clave.
  begin perform public.origen_crear('corea_humo', 'Corea del Sur', 'vehículo', 'm', 'manual'); raise exception 'repitió la clave de un origen';
  exception when unique_violation then if sqlerrm not like '%nombre muy parecido%' then raise; end if; end;
  -- Reglas que un CHECK no expresa.
  rechazo := false; begin perform public.origen_crear('Mala Clave', 'Algo', 'vehículo', 'm', 'manual'); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'aceptó una clave con mayúsculas y espacios'; end if;
  rechazo := false; begin perform public.origen_crear('vacio_humo', '   ', 'vehículo', 'm', 'manual'); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'aceptó un nombre vacío'; end if;
  rechazo := false; begin perform public.origen_crear('plataf_humo', 'Plataformas', 'vehículo', 'm', 'manual', null, array['copart']); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'un origen manual aceptó plataformas de apibara'; end if;
end $$;
reset role;

-- Si un trigger falla después de crear el flujo y los campos, no queda nada de nada.
create function public._humo_origen_falla() returns trigger language plpgsql as $$ begin raise exception 'humo: falla a propósito'; end; $$;
create trigger trg_zz_humo_origen_falla after insert on public.origenes for each row execute function public._humo_origen_falla();
set role authenticated;
do $$ declare m text; begin
  begin perform public.origen_crear('fallida_humo', 'Fallida', 'vehículo', 'm', 'manual'); raise exception 'creó un origen con un trigger que falla';
  exception when raise_exception then
    get stacked diagnostics m = message_text;
    if m <> 'humo: falla a propósito' then raise; end if;
  end;
end $$;
reset role;
drop trigger trg_zz_humo_origen_falla on public.origenes;
drop function public._humo_origen_falla();
do $$ begin
  if exists (select 1 from public.origenes where clave = 'fallida_humo')
     or exists (select 1 from public.flujos where nombre = 'Logística Fallida')
     or exists (select 1 from public.origenes_campos c where not exists (select 1 from public.origenes o where o.id = c.origen_id)) then
    raise exception 'un origen a medias: crear no es atómico';
  end if;
end $$;

-- @test origenes: versión, tipo inmutable, renombrar acompaña al flujo y un origen inactivo no recibe vehículos
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare o uuid; v timestamptz; v2 timestamptz; rechazo boolean; begin
  select id, actualizado_en into o, v from public.origenes where clave = 'corea_humo';
  begin perform public.origen_guardar(o, v - interval '1 second', p_color => '#112233'); raise exception 'guardó con una versión vieja';
  exception when others then if sqlstate <> 'PT409' then raise; end if; end;
  rechazo := false; begin perform public.origen_guardar(o, null, p_color => '#112233'); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'guardó sin versión'; end if;
  v2 := public.origen_guardar(o, v, p_nombre => 'Corea del Sur', p_sustantivo => 'Unidad', p_genero => 'f');
  if v2 is distinct from (select actualizado_en from public.origenes where id = o) then raise exception 'no devolvió la versión nueva'; end if;
  if (select nombre || '/' || sustantivo || '/' || genero from public.origenes where id = o) <> 'Corea del Sur/unidad/f' then raise exception 'no guardó el nombre, el sustantivo y el género'; end if;
  if (select nombre from public.flujos where origen_id = o) <> 'Logística Corea del Sur' then raise exception 'el flujo no acompañó al nombre'; end if;
  begin perform public.origen_guardar(o, v2, p_nombre => 'Subasta EE. UU.'); raise exception 'repitió el nombre de otro origen';
  exception when unique_violation then null; end;
  rechazo := false; begin perform public.origen_guardar(o, v2, p_apibara_plataformas => array['iaai']); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'un origen manual aceptó plataformas de apibara'; end if;
  begin update public.origenes set tipo = 'subasta' where id = o; raise exception 'el update directo del tipo pasó';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Aunque se escriba sin pasar por la RPC (el rol de servicio), el tipo no cambia.
do $$ begin
  begin update public.origenes set tipo = 'subasta' where clave = 'corea_humo'; raise exception 'el tipo de un origen cambió';
  exception when raise_exception then if sqlstate <> 'P0001' or sqlerrm like 'el tipo de un origen cambió' then raise; end if; end;
end $$;
set role authenticated;
do $$ declare o uuid; v timestamptz; begin
  select id, actualizado_en into o, v from public.origenes where clave = 'corea_humo';
  perform public.origen_guardar(o, v, p_activo => false);
  if (select activo from public.origenes where id = o) then raise exception 'no desactivó el origen'; end if;
end $$;
reset role;
do $$ declare o uuid; begin
  select id into o from public.origenes where clave = 'corea_humo';
  begin insert into public.vehiculos (origen_id, titulo, creado_por) values (o, 'No debería entrar', '00000000-0000-0000-0000-000000000001'); raise exception 'un origen inactivo recibió un vehículo';
  exception when check_violation then null; end;
end $$;
set role authenticated;
do $$ declare o uuid; v timestamptz; begin
  select id, actualizado_en into o, v from public.origenes where clave = 'corea_humo';
  perform public.origen_guardar(o, v, p_activo => true);
end $$;
reset role;

-- @test origenes: campos, tipo y datos de un campo, orden relativo, y quitar es desactivar cuando hay datos
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare
  o uuid; r jsonb; c uuid; sist uuid; v timestamptz; v2 timestamptz; rechazo boolean; ordenes int[]; n int; imp jsonb;
begin
  select id into o from public.origenes where clave = 'corea_humo';
  r := public.origen_campo_crear(o, 'kit_humo', 'Kit de extras', 'opcion', '[{"clave": "basico", "etiqueta": "Básico"}, {"clave": "full", "etiqueta": "Full"}]', p_grupo => 'Venta', p_filtrable => true);
  c := (r ->> 'id')::uuid;
  if (select es_sistema or orden <> 90 from public.origenes_campos where id = c) then raise exception 'el campo propio nace al final y no es de sistema'; end if;
  begin perform public.origen_campo_crear(o, 'kit_humo', 'Otro', 'texto'); raise exception 'repitió la clave de un campo';
  exception when unique_violation then null; end;
  rechazo := false; begin perform public.origen_campo_crear(o, 'vin', 'VIN', 'texto'); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'creó un campo con la clave de una columna de vehículos'; end if;
  rechazo := false; begin perform public.origen_campo_crear(o, 'sin_opciones', 'Sin opciones', 'opcion'); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'creó un campo de opciones sin opciones'; end if;
  rechazo := false; begin perform public.origen_campo_crear(o, 'apibara_mal', 'Mal', 'texto', p_clave_apibara => 'color'); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'un origen manual aceptó una clave de apibara'; end if;

  -- Banderas y grupo, con versión.
  select actualizado_en into v from public.origenes_campos where id = c;
  begin perform public.origen_campo_guardar(c, v - interval '1 second', '{"en_tarjeta": true}'); raise exception 'guardó con una versión vieja';
  exception when others then if sqlstate <> 'PT409' then raise; end if; end;
  v2 := public.origen_campo_guardar(c, v, '{"en_tarjeta": true, "grupo": "Extras", "publico_web": true}');
  if not (select en_tarjeta and publico_web and grupo = 'Extras' and filtrable and not requerido from public.origenes_campos where id = c) then raise exception 'no guardó las banderas'; end if;
  rechazo := false; begin perform public.origen_campo_guardar(c, v2, '{"clave": "otra"}'); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'dejó cambiar la clave de un campo'; end if;

  -- Campo de sistema: sus banderas se editan, su tipo y su existencia no.
  select id, actualizado_en into sist, v from public.origenes_campos where origen_id = o and clave = 'color';
  perform public.origen_campo_guardar(sist, v, '{"filtrable": false}');
  rechazo := false; begin perform public.origen_campo_guardar(sist, (select actualizado_en from public.origenes_campos where id = sist), '{"tipo": "numero"}'); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'cambió el tipo de un campo de sistema'; end if;
  begin perform public.origen_campo_eliminar(sist, (select actualizado_en from public.origenes_campos where id = sist)); raise exception 'eliminó un campo de sistema';
  exception when foreign_key_violation then null; end;

  -- Orden relativo: «después de X» y «primero»; los números quedan en 10, 20, 30…
  perform public.origen_campo_mover(c, (select actualizado_en from public.origenes_campos where id = c));
  if (select id from public.origenes_campos where origen_id = o order by orden limit 1) <> c then raise exception 'no lo puso primero'; end if;
  perform public.origen_campo_mover(c, (select actualizado_en from public.origenes_campos where id = c), p_despues_de => sist);
  select array_agg(orden order by orden) into ordenes from public.origenes_campos where origen_id = o;
  if ordenes <> array[10, 20, 30, 40, 50, 60, 70, 80, 90] then raise exception 'el orden no quedó en 10, 20, 30…: %', ordenes; end if;
  if (select clave from public.origenes_campos where origen_id = o order by orden offset 1 limit 1) <> 'kit_humo' then raise exception 'no lo puso después de color'; end if;
  begin perform public.origen_campo_mover(c, (select actualizado_en from public.origenes_campos where id = c), p_despues_de => c); raise exception 'lo puso después de sí mismo';
  exception when raise_exception then if sqlerrm like 'lo puso%' then raise; end if; end;
  select count(*) into n from public.origenes_campos where origen_id = o and orden = 10;
  if n <> 1 then raise exception 'orden repetido'; end if;
end $$;
reset role;
-- Un vehículo con ese dato: el tipo queda bloqueado, eliminar también, y desactivar conserva el valor.
do $$ declare o uuid; begin
  select id into o from public.origenes where clave = 'corea_humo';
  insert into public.vehiculos (origen_id, titulo, creado_por, atributos) values (o, 'Con kit', '00000000-0000-0000-0000-000000000001', '{"kit_humo": "full"}');
  insert into public.vehiculos (origen_id, titulo, creado_por, atributos) values (o, 'Sin kit', '00000000-0000-0000-0000-000000000001', '{}');
end $$;
set role authenticated;
do $$ declare o uuid; c uuid; imp jsonb; rechazo boolean; v timestamptz; begin
  select id into o from public.origenes where clave = 'corea_humo';
  select id into c from public.origenes_campos where origen_id = o and clave = 'kit_humo';
  imp := public.origen_campo_impacto(c);
  if (imp ->> 'total')::int <> 2 or (imp ->> 'con_valor')::int <> 1 or (imp ->> 'sin_valor')::int <> 1 or imp -> 'por_opcion' <> '{"full": 1}'::jsonb then raise exception 'impacto mal contado: %', imp; end if;
  rechazo := false; begin perform public.origen_campo_guardar(c, (select actualizado_en from public.origenes_campos where id = c), '{"tipo": "numero"}'); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'cambió el tipo de un campo con datos'; end if;
  begin perform public.origen_campo_eliminar(c, (select actualizado_en from public.origenes_campos where id = c)); raise exception 'eliminó un campo con datos';
  exception when foreign_key_violation then null; end;
  -- Volverlo requerido no toca los vehículos: el trigger sólo mira cuando se escribe uno.
  perform public.origen_campo_guardar(c, (select actualizado_en from public.origenes_campos where id = c), '{"requerido": true}');
  if (select count(*) from public.vehiculos where origen_id = o) <> 2 then raise exception 'volver requerido tocó vehículos'; end if;
  perform public.origen_campo_guardar(c, (select actualizado_en from public.origenes_campos where id = c), '{"activo": false}');
  if (select activo from public.origenes_campos where id = c) then raise exception 'no desactivó el campo'; end if;
  if not exists (select 1 from public.vehiculos where origen_id = o and atributos ->> 'kit_humo' = 'full') then raise exception 'desactivar el campo perdió el dato'; end if;
  perform public.origen_campo_guardar(c, (select actualizado_en from public.origenes_campos where id = c), '{"activo": true}');
end $$;
reset role;

-- @test origenes: categorías de un solo nivel, sin repetir nombre ni entre raíces, y eliminar con uso se rechaza
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare o uuid; padre uuid; hija uuid; otra uuid; v timestamptz; rechazo boolean; begin
  select id into o from public.origenes where clave = 'corea_humo';
  padre := (public.categoria_crear(o, 'Sedán') ->> 'id')::uuid;
  otra := (public.categoria_crear(o, 'SUV') ->> 'id')::uuid;
  hija := (public.categoria_crear(o, 'Compacto', padre) ->> 'id')::uuid;
  begin perform public.categoria_crear(o, 'sedán'); raise exception 'repitió una raíz';
  exception when unique_violation then null; end;
  -- Mismo nombre en otro lugar sí vale.
  perform public.categoria_crear(o, 'Compacto', otra);
  rechazo := false; begin perform public.categoria_crear(o, 'Nieta', hija); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'anidó más de un nivel'; end if;
  rechazo := false; begin perform public.categoria_guardar(padre, (select actualizado_en from public.categorias where id = padre), p_activa => false); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'desactivó una categoría con subcategorías activas'; end if;
  begin perform public.categoria_eliminar(padre, (select actualizado_en from public.categorias where id = padre)); raise exception 'eliminó una categoría con subcategorías';
  exception when foreign_key_violation then null; end;
  begin perform public.categoria_guardar(padre, (select actualizado_en from public.categorias where id = padre) - interval '1 second', p_nombre => 'X'); raise exception 'guardó con una versión vieja';
  exception when others then if sqlstate <> 'PT409' then raise; end if; end;
  -- Orden entre hermanas: SUV pasa primero.
  perform public.categoria_mover(otra, (select actualizado_en from public.categorias where id = otra));
  if (select id from public.categorias where origen_id = o and padre_id is null order by orden limit 1) <> otra then raise exception 'no la puso primera'; end if;
  begin perform public.categoria_mover(otra, (select actualizado_en from public.categorias where id = otra), p_despues_de => hija); raise exception 'la puso entre hermanas de otro padre';
  exception when others then if sqlstate <> 'PT409' then raise; end if; end;
  perform public.categoria_eliminar(hija, (select actualizado_en from public.categorias where id = hija));
end $$;
reset role;

-- @test origenes: eliminar sólo sin uso (cae con su flujo y sus campos); sin permiso nadie escribe ni cuenta
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare o uuid; j uuid; r record; begin
  -- Con vehículos: no.
  select id into o from public.origenes where clave = 'corea_humo';
  begin perform public.origen_eliminar(o, (select actualizado_en from public.origenes where id = o)); raise exception 'eliminó un origen con vehículos';
  exception when foreign_key_violation then null; end;
  begin perform public.origen_eliminar(o, (select actualizado_en from public.origenes where id = o) - interval '1 second'); raise exception 'eliminó con una versión vieja';
  exception when others then if sqlstate <> 'PT409' then raise; end if; end;
  -- Con fórmula publicada, fases y vehículos: no, y el mensaje dice por qué.
  select id into o from public.origenes where clave = 'subasta_usa';
  begin perform public.origen_eliminar(o, (select actualizado_en from public.origenes where id = o)); raise exception 'eliminó un origen con fórmula publicada';
  exception when foreign_key_violation then
    if sqlerrm not like '%vehículo%' or sqlerrm not like '%fórmula publicada%' then raise exception 'el motivo no cuenta lo que lo ata: %', sqlerrm; end if;
  end;
  -- Uno sin uso: sí, y con él cae todo lo que colgaba.
  select id into o from public.origenes where clave = 'japon_humo';
  select id into j from public.flujos where origen_id = o;
  perform public.origen_eliminar(o, (select actualizado_en from public.origenes where id = o));
  if exists (select 1 from public.origenes_campos where origen_id = o) or exists (select 1 from public.flujos where id = j)
     or exists (select 1 from public.flujos_reglas where flujo_id = j) then raise exception 'eliminar no se llevó el flujo y los campos'; end if;
  -- El resumen: una fila por origen, con los conteos de uso.
  select * into r from public.origenes_resumen() x where x.origen_id = (select id from public.origenes where clave = 'corea_humo');
  if r.vehiculos <> 2 or r.campos_activos <> 9 or r.categorias <> 3 or r.fases <> 0 or r.formula_publicada then raise exception 'resumen mal contado: %', r; end if;
  select * into r from public.origenes_resumen() x where x.origen_id = (select id from public.origenes where clave = 'subasta_usa');
  if not r.formula_publicada or r.fases <> 7 then raise exception 'el resumen de subasta_usa no ve su fórmula y sus fases: %', r; end if;
end $$;
reset role;
-- La asesora no escribe, no cuenta ni mide el impacto; sin sesión, tampoco.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);
set role authenticated;
do $$ declare o uuid; c uuid; begin
  select id into o from public.origenes where clave = 'corea_humo';
  select id into c from public.origenes_campos where origen_id = o limit 1;
  begin perform public.origen_crear('asesora_humo', 'Asesora', 'vehículo', 'm', 'manual'); raise exception 'creó un origen sin permiso';
  exception when insufficient_privilege then null; end;
  begin perform public.origen_guardar(o, (select actualizado_en from public.origenes where id = o), p_nombre => 'Otro'); raise exception 'editó un origen sin permiso';
  exception when insufficient_privilege then null; end;
  begin perform public.origen_campo_guardar(c, (select actualizado_en from public.origenes_campos where id = c), '{"requerido": true}'); raise exception 'editó un campo sin permiso';
  exception when insufficient_privilege then null; end;
  begin perform public.categoria_crear(o, 'Intrusa'); raise exception 'creó una categoría sin permiso';
  exception when insufficient_privilege then null; end;
  begin perform public.origenes_resumen(); raise exception 'contó el uso de los orígenes sin permiso';
  exception when insufficient_privilege then null; end;
  begin perform public.origen_campo_impacto(c); raise exception 'midió el impacto sin permiso';
  exception when insufficient_privilege then null; end;
  -- La lectura de los orígenes sí es de todos: los selectores la necesitan.
  if (select count(*) from public.origenes) < 2 then raise exception 'una asesora debía leer los orígenes'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claim.role', 'anon', false);
set role anon;
do $$ begin
  begin perform public.origen_crear('anon_humo', 'Anon', 'vehículo', 'm', 'manual'); raise exception 'anon creó un origen';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- @test vehículos: la lectura se limita por origen y por alcance, con una policy de InitPlan
reset role;
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-000000000008', 'inventario@ejemplo.com', '{"invitado": true}');
update public.perfiles set nombre = 'Irene Paz', invitacion_aceptada_en = now() where id = '00000000-0000-0000-0000-000000000008';
insert into public.roles (clave, nombre) values ('humo_inventario', 'Humo inventario');
insert into public.usuarios_roles (usuario_id, rol_id) select '00000000-0000-0000-0000-000000000008', id from public.roles where clave = 'humo_inventario';
insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
select r.id, 'vehiculos.ver', o.id, 'propios' from public.roles r, public.origenes o where r.clave = 'humo_inventario' and o.clave = 'oficina';
insert into public.vehiculos (origen_id, titulo, creado_por)
select o.id, x.titulo, x.creador::uuid from public.origenes o join (values
  ('oficina', 'Humo oficina propio', '00000000-0000-0000-0000-000000000008'),
  ('oficina', 'Humo oficina ajeno', '00000000-0000-0000-0000-000000000001'),
  ('subasta_usa', 'Humo subasta ajeno', '00000000-0000-0000-0000-000000000001')
) as x (origen, titulo, creador) on x.origen = o.clave;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000008', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ declare o uuid; linea text; plan text := ''; begin
  -- Con alcance «propios» en un solo origen: lo suyo de ese origen y nada más.
  if (select count(*) from public.vehiculos where titulo like 'Humo %') <> 1 then raise exception 'con alcance «propios» debía ver sólo el suyo'; end if;
  if not exists (select 1 from public.vehiculos where titulo = 'Humo oficina propio') then raise exception 'no ve el que creó'; end if;
  if public.origenes_con_alcance('vehiculos.ver', 'todos') <> '{}' then raise exception 'no tiene «todos» en ningún origen'; end if;
  if cardinality(public.origenes_con_alcance('vehiculos.ver', 'propios')) <> 1 then raise exception 'tiene el permiso en un solo origen'; end if;
  -- La policy compara la fila con lo ya calculado: ninguna función de permisos corre por fila.
  select id into o from public.origenes where clave = 'oficina';
  for linea in execute format('explain (verbose, costs off) select id from public.vehiculos where origen_id = %L order by creado_en desc, id desc limit 51', o) loop
    plan := plan || linea || E'\n';
  end loop;
  if plan !~ 'origen_id = ANY \(\(InitPlan' then raise exception 'la policy de lectura dejó de ser de InitPlan: %', plan; end if;
  if plan ~ 'alcance_de' then raise exception 'la policy volvió a llamar alcance_de() por fila: %', plan; end if;
end $$;
reset role;
-- Con «todos» en ese origen ve los dos de ahí, y sigue sin ver el otro origen.
update public.roles_permisos set alcance = 'todos' where rol_id = (select id from public.roles where clave = 'humo_inventario') and permiso_clave = 'vehiculos.ver';
set role authenticated;
do $$ begin
  if (select count(*) from public.vehiculos where titulo like 'Humo oficina %') <> 2 then raise exception 'con «todos» en Oficina debía ver los dos de Oficina'; end if;
  if exists (select 1 from public.vehiculos where titulo = 'Humo subasta ajeno') then raise exception 'leyó un vehículo de un origen donde no tiene permiso'; end if;
  if cardinality(public.origenes_con_alcance('vehiculos.ver', 'todos')) <> 1 then raise exception '«todos» vale en un solo origen'; end if;
end $$;
reset role;
-- Una concesión sin origen vale en todos.
update public.roles_permisos set origen_id = null where rol_id = (select id from public.roles where clave = 'humo_inventario') and permiso_clave = 'vehiculos.ver';
set role authenticated;
do $$ begin
  if (select count(*) from public.vehiculos where titulo like 'Humo %') <> 3 then raise exception 'sin origen en la concesión debía ver los tres'; end if;
  if cardinality(public.origenes_con_alcance('vehiculos.ver', 'todos')) <> (select count(*) from public.origenes) then raise exception 'sin origen vale en todos, inactivos incluidos'; end if;
end $$;
reset role;

-- @test vehículos: el alta valida, no se duplica y entra a la única fase inicial
reset role;
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-000000000009', 'bruno@ejemplo.com', '{"invitado": true}');
update public.perfiles set nombre = 'Bruno Lima', invitacion_aceptada_en = now() where id = '00000000-0000-0000-0000-000000000009';
-- Irene: crea y edita lo propio, sólo en Oficina. Bruno: crea y edita todo, en todos los orígenes.
delete from public.roles_permisos where rol_id = (select id from public.roles where clave = 'humo_inventario');
insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
select r.id, x.clave, o.id, x.alcance::public.alcance_permiso from public.roles r, public.origenes o,
  (values ('vehiculos.ver', 'todos'), ('vehiculos.crear', 'todos'), ('vehiculos.editar', 'propios')) as x (clave, alcance)
where r.clave = 'humo_inventario' and o.clave = 'oficina';
insert into public.roles (clave, nombre) values ('humo_inventario_todo', 'Humo inventario todo');
insert into public.usuarios_roles (usuario_id, rol_id) select '00000000-0000-0000-0000-000000000009', id from public.roles where clave = 'humo_inventario_todo';
insert into public.roles_permisos (rol_id, permiso_clave, alcance)
select r.id, x.clave, 'todos' from public.roles r, (values ('vehiculos.ver'), ('vehiculos.crear'), ('vehiculos.editar')) as x (clave) where r.clave = 'humo_inventario_todo';
insert into public.origenes (clave, nombre, tipo) values ('humo_sin_fases', 'Humo sin fases', 'manual');
insert into public.categorias (origen_id, nombre) select id, 'Humo ajena' from public.origenes where clave = 'subasta_usa';
insert into public.categorias (origen_id, nombre) select id, 'Humo propia' from public.origenes where clave = 'oficina';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000008', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ declare oficina uuid; usa uuid; r jsonb; v uuid := 'bbbbbbbb-0000-4000-8000-000000000001'; f uuid; n int; begin
  select id into oficina from public.origenes where clave = 'oficina';
  select id into usa from public.origenes where clave = 'subasta_usa';
  select fa.id into f from public.fases fa join public.flujos fl on fl.id = fa.flujo_id where fl.origen_id = oficina and fa.es_inicial;
  begin perform public.vehiculo_crear(gen_random_uuid(), usa, '{"titulo": "Colado"}'); raise exception 'creó en un origen donde no tiene permiso';
  exception when insufficient_privilege then null; end;
  -- Lo que antes dejaba pasar el INSERT directo: fase, vitrina, dueño.
  begin perform public.vehiculo_crear(gen_random_uuid(), oficina, jsonb_build_object('titulo', 'Colado', 'fase_id', f)); raise exception 'aceptó fase_id en el alta';
  exception when invalid_parameter_value then null; end;
  begin perform public.vehiculo_crear(gen_random_uuid(), oficina, '{"titulo": "Colado", "publicado_web": true}'); raise exception 'aceptó publicado_web en el alta';
  exception when invalid_parameter_value then null; end;
  begin perform public.vehiculo_crear(gen_random_uuid(), oficina, '{"titulo": "Colado", "creado_por": "00000000-0000-0000-0000-000000000001"}'); raise exception 'aceptó creado_por en el alta';
  exception when invalid_parameter_value then null; end;
  begin perform public.vehiculo_crear(gen_random_uuid(), oficina, '{"marca": "Sin título"}'); raise exception 'creó un vehículo sin título';
  exception when not_null_violation then null; end;
  begin perform public.vehiculo_crear(gen_random_uuid(), oficina, '{"titulo": "Año malo", "anio": 99999}'); raise exception 'aceptó un año fuera de rango';
  exception when invalid_parameter_value then null; end;
  begin perform public.vehiculo_crear(gen_random_uuid(), oficina, '{"titulo": "VIN malo", "vin": "OOOO"}'); raise exception 'aceptó un VIN mal formado';
  exception when invalid_parameter_value then null; end;
  begin perform public.vehiculo_crear(gen_random_uuid(), oficina, jsonb_build_object('titulo', 'Categoría ajena', 'categoria_id', (select id from public.categorias where nombre = 'Humo ajena'))); raise exception 'aceptó una categoría de otro origen';
  exception when invalid_parameter_value then null; end;
  begin perform public.vehiculo_crear(gen_random_uuid(), oficina, '{"titulo": "Campo ajeno", "atributos": {"cilindros": 4}}'); raise exception 'aceptó un atributo que no es del layout de ese origen';
  exception when invalid_parameter_value then null; end;

  r := public.vehiculo_crear(v, oficina, jsonb_build_object('titulo', '  2020 Kia Rio  ', 'marca', 'Kia', 'anio', 2020, 'vin', 'kmhd35le5du123456', 'precio', 9800.456,
    'categoria_id', (select id from public.categorias where nombre = 'Humo propia'), 'atributos', '{"color": "Rojo", "motor": "1.6", "descripcion": ""}'::jsonb));
  if (r ->> 'id')::uuid <> v or (r ->> 'fase_id')::uuid is distinct from f then raise exception 'el alta no devolvió el vehículo en su fase inicial: %', r; end if;
  if not exists (select 1 from public.vehiculos x where x.id = v and x.titulo = '2020 Kia Rio' and x.vin = 'KMHD35LE5DU123456' and x.precio = 9800.46
      and x.creado_por = '00000000-0000-0000-0000-000000000008' and x.atributos = '{"color": "Rojo", "motor": "1.6"}'::jsonb and x.fase_desde is not null) then
    raise exception 'el alta no normalizó lo que guardó: %', (select to_jsonb(x) - 'apibara_raw' from public.vehiculos x where x.id = v);
  end if;
  -- Reintentar con el mismo id (se perdió la respuesta) devuelve el mismo: no duplica.
  select count(*) into n from public.vehiculos;
  r := public.vehiculo_crear(v, oficina, '{"titulo": "2020 Kia Rio"}');
  if (r ->> 'id')::uuid <> v or (select count(*) from public.vehiculos) <> n then raise exception 'repetir el alta con el mismo id duplicó el vehículo'; end if;
  -- El VIN es único entre los vehículos vivos; el lote, por origen, también sin plataforma.
  begin perform public.vehiculo_crear(gen_random_uuid(), oficina, '{"titulo": "VIN repetido", "vin": "KMHD35LE5DU123456"}'); raise exception 'aceptó un VIN repetido';
  exception when unique_violation then null; end;
  perform public.vehiculo_crear(gen_random_uuid(), oficina, '{"titulo": "Lote uno", "lote": "L-1"}');
  begin perform public.vehiculo_crear(gen_random_uuid(), oficina, '{"titulo": "Lote dos", "lote": "L-1"}'); raise exception 'aceptó un lote repetido sin plataforma';
  exception when unique_violation then null; end;
end $$;
reset role;
-- El historial lo lee quien ve la logística: se comprueba sin RLS.
do $$ begin
  if (select count(*) from public.historial_fases h where h.vehiculo_id = 'bbbbbbbb-0000-4000-8000-000000000001' and h.de_fase_id is null
      and h.usuario_id = '00000000-0000-0000-0000-000000000008') <> 1 then raise exception 'la entrada a la inicial no quedó en el historial'; end if;
end $$;
-- El id de otra persona no se «reintenta».
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000009', false);
set role authenticated;
do $$ declare o uuid; r jsonb; begin
  begin perform public.vehiculo_crear('bbbbbbbb-0000-4000-8000-000000000001', (select id from public.origenes where clave = 'oficina'), '{"titulo": "Ajeno"}'); raise exception 'devolvió el vehículo de otra persona';
  exception when unique_violation then null; end;
  -- Un origen sin fases: nace sin fase.
  select id into o from public.origenes where clave = 'humo_sin_fases';
  r := public.vehiculo_crear(gen_random_uuid(), o, '{"titulo": "Sin dónde entrar"}');
  if r -> 'fase_id' <> 'null'::jsonb then raise exception 'entró a una fase en un flujo sin fases: %', r; end if;
end $$;
reset role;
-- Con dos iniciales no hay nada que decidir por la persona: nace sin fase. Un origen inactivo no recibe.
insert into public.fases (flujo_id, nombre, es_inicial) select fl.id, x.nombre, true from public.flujos fl join public.origenes o on o.id = fl.origen_id, (values ('Humo A'), ('Humo B')) as x (nombre) where o.clave = 'humo_sin_fases';
set role authenticated;
do $$ declare o uuid; r jsonb; begin
  select id into o from public.origenes where clave = 'humo_sin_fases';
  r := public.vehiculo_crear(gen_random_uuid(), o, '{"titulo": "Dos puertas"}');
  if r -> 'fase_id' <> 'null'::jsonb then raise exception 'eligió sola entre dos fases iniciales: %', r; end if;
end $$;
reset role;
update public.fases set activa = false where nombre = 'Humo B';
update public.fases set nota_obligatoria = true where nombre = 'Humo A';
set role authenticated;
do $$ declare o uuid; r jsonb; begin
  select id into o from public.origenes where clave = 'humo_sin_fases';
  r := public.vehiculo_crear(gen_random_uuid(), o, '{"titulo": "Pide nota"}');
  if r -> 'fase_id' <> 'null'::jsonb then raise exception 'entró a una inicial que pide nota: %', r; end if;
end $$;
reset role;
update public.fases set nota_obligatoria = false where nombre = 'Humo A';
insert into public.fases_roles (fase_id, rol_id) select f.id, r.id from public.fases f, public.roles r where f.nombre = 'Humo A' and r.clave = 'dueno';
set role authenticated;
do $$ declare o uuid; r jsonb; begin
  select id into o from public.origenes where clave = 'humo_sin_fases';
  r := public.vehiculo_crear(gen_random_uuid(), o, '{"titulo": "Otro rol"}');
  if r -> 'fase_id' <> 'null'::jsonb then raise exception 'entró a una inicial reservada a otro rol: %', r; end if;
end $$;
reset role;
delete from public.fases_roles where fase_id = (select id from public.fases where nombre = 'Humo A');
set role authenticated;
do $$ declare o uuid; r jsonb; begin
  select id into o from public.origenes where clave = 'humo_sin_fases';
  r := public.vehiculo_crear(gen_random_uuid(), o, '{"titulo": "Ahora sí"}');
  if (r ->> 'fase_id')::uuid is distinct from (select id from public.fases where nombre = 'Humo A') then raise exception 'con una sola inicial activa debía entrar: %', r; end if;
end $$;
reset role;
update public.origenes set activo = false where clave = 'humo_sin_fases';
set role authenticated;
do $$ begin
  begin perform public.vehiculo_crear(gen_random_uuid(), (select id from public.origenes where clave = 'humo_sin_fases'), '{"titulo": "Tarde"}'); raise exception 'un origen inactivo recibió un vehículo';
  exception when check_violation then null; end;
end $$;
reset role;

-- @test vehículos: editar pide la versión, dice quién lo cambió, respeta el alcance y no pierde datos
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000008', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ declare v uuid := 'bbbbbbbb-0000-4000-8000-000000000001'; ver timestamptz; r jsonb; m text; begin
  select actualizado_en into ver from public.vehiculos where id = v;
  begin perform public.vehiculo_guardar(v, null, '{"marca": "X"}'); raise exception 'guardó sin versión';
  exception when others then get stacked diagnostics m = message_text; if m not like 'Falta la versión%' then raise; end if; end;
  begin perform public.vehiculo_guardar(v, ver, '{"fase_id": null}'); raise exception 'aceptó fase_id al editar';
  exception when invalid_parameter_value then null; end;
  begin perform public.vehiculo_guardar(v, ver, '{"lead_id": null}'); raise exception 'aceptó lead_id al editar';
  exception when invalid_parameter_value then null; end;
  -- Una clave ausente no se toca; un nulo vacía; vaciar un atributo quita la clave.
  r := public.vehiculo_guardar(v, ver, '{"marca": "Hyundai", "anio": null, "atributos": {"color": null}}');
  if not exists (select 1 from public.vehiculos x where x.id = v and x.marca = 'Hyundai' and x.anio is null and x.titulo = '2020 Kia Rio'
      and x.vin = 'KMHD35LE5DU123456' and x.atributos = '{"motor": "1.6"}'::jsonb) then
    raise exception 'la edición no respetó ausente/nulo: %', (select to_jsonb(x) - 'apibara_raw' from public.vehiculos x where x.id = v);
  end if;
  if (r ->> 'actualizado_en')::timestamptz is distinct from (select actualizado_en from public.vehiculos where id = v) then raise exception 'guardar no devolvió la versión nueva'; end if;
  -- Guardar lo que ya está guardado no es un conflicto, aunque la versión sea vieja (un reintento).
  r := public.vehiculo_guardar(v, ver - interval '1 hour', '{"marca": "Hyundai"}');
  if (r ->> 'actualizado_en')::timestamptz is distinct from (select actualizado_en from public.vehiculos where id = v) then raise exception 'lo ya guardado debía devolver la versión vigente'; end if;
  -- Con alcance «propios» no edita lo que creó otra persona.
  begin perform public.vehiculo_guardar((select id from public.vehiculos where titulo = 'Humo oficina ajeno'), now(), '{"marca": "X"}'); raise exception 'editó un vehículo ajeno con alcance «propios»';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Un campo desactivado conserva su dato aunque el vehículo se siga editando, y no se escribe.
update public.origenes_campos set activo = false where clave = 'motor' and origen_id = (select id from public.origenes where clave = 'oficina');
set role authenticated;
do $$ declare v uuid := 'bbbbbbbb-0000-4000-8000-000000000001'; begin
  perform public.vehiculo_guardar(v, (select actualizado_en from public.vehiculos where id = v), '{"modelo": "Accent", "atributos": {"color": "Azul"}}');
  if (select atributos from public.vehiculos where id = v) <> '{"motor": "1.6", "color": "Azul"}'::jsonb then raise exception 'editar perdió el dato de un campo desactivado: %', (select atributos from public.vehiculos where id = v); end if;
  begin perform public.vehiculo_guardar(v, (select actualizado_en from public.vehiculos where id = v), '{"atributos": {"motor": "2.0"}}'); raise exception 'escribió un campo desactivado';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
update public.origenes_campos set activo = true where clave = 'motor' and origen_id = (select id from public.origenes where clave = 'oficina');
-- Bruno lo cambia; Irene, con la versión que tenía, se entera de quién fue.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000009', false);
set role authenticated;
do $$ declare v uuid := 'bbbbbbbb-0000-4000-8000-000000000001'; begin
  perform public.vehiculo_guardar(v, (select actualizado_en from public.vehiculos where id = v), '{"kilometraje": 45000}');
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000008', false);
do $$ declare v uuid := 'bbbbbbbb-0000-4000-8000-000000000001'; m text; e text; begin
  begin
    perform public.vehiculo_guardar(v, (select actualizado_en from public.vehiculos where id = v) - interval '1 second', '{"marca": "Kia"}');
    raise exception 'guardó con una versión vieja';
  exception when others then
    get stacked diagnostics m = message_text, e = returned_sqlstate;
    if e <> 'PT409' then raise; end if;
    if m not like 'Bruno Lima cambió este vehículo hace %' then raise exception 'el conflicto no dice quién ni cuándo: %', m; end if;
  end;
  if (select marca from public.vehiculos where id = v) <> 'Hyundai' then raise exception 'el conflicto pisó el dato'; end if;
  -- Un requerido que falta frena el guardado, dicho con la etiqueta del campo.
end $$;
reset role;
update public.origenes_campos set requerido = true where clave = 'condicion' and origen_id = (select id from public.origenes where clave = 'oficina');
set role authenticated;
do $$ declare v uuid := 'bbbbbbbb-0000-4000-8000-000000000001'; m text; begin
  begin
    perform public.vehiculo_guardar(v, (select actualizado_en from public.vehiculos where id = v), '{"marca": "Kia"}');
    raise exception 'guardó sin un campo requerido';
  exception when not_null_violation then
    get stacked diagnostics m = message_text;
    if m <> 'Falta «Condición».' then raise exception 'el requerido no se dice con la etiqueta: %', m; end if;
  end;
end $$;
reset role;
update public.origenes_campos set requerido = false where clave = 'condicion' and origen_id = (select id from public.origenes where clave = 'oficina');

-- @test origenes: el valor por defecto de un campo se valida contra su tipo y se limpia cuando deja de servir
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ declare o uuid; c uuid; begin
  select id into o from public.origenes where clave = 'oficina';
  begin perform public.origen_campo_crear(o, 'humo_def_mal', 'Humo mal', 'numero', p_valor_defecto => '"siete"'); raise exception 'aceptó un texto como defecto de un número';
  exception when invalid_parameter_value then null; end;
  begin perform public.origen_campo_crear(o, 'humo_def_fecha', 'Humo fecha', 'fecha', p_valor_defecto => '"2026-01-01"'); raise exception 'aceptó un defecto en una fecha';
  exception when invalid_parameter_value then null; end;
  c := (public.origen_campo_crear(o, 'humo_def', 'Humo defecto', 'opcion', '[{"clave": "a", "etiqueta": "A"}, {"clave": "b", "etiqueta": "B"}]', p_valor_defecto => '"a"') ->> 'id')::uuid;
  if (select valor_defecto from public.origenes_campos where id = c) is distinct from '"a"'::jsonb then raise exception 'no guardó el valor por defecto'; end if;
  begin perform public.origen_campo_guardar(c, (select actualizado_en from public.origenes_campos where id = c), '{"valor_defecto": "z"}'); raise exception 'aceptó como defecto algo que no es una opción';
  exception when invalid_parameter_value then null; end;
  -- Tocar otra cosa no lo mueve; sacar la opción que era el defecto lo limpia.
  perform public.origen_campo_guardar(c, (select actualizado_en from public.origenes_campos where id = c), '{"filtrable": true}');
  if (select valor_defecto from public.origenes_campos where id = c) is distinct from '"a"'::jsonb then raise exception 'editar otra cosa movió el valor por defecto'; end if;
  perform public.origen_campo_guardar(c, (select actualizado_en from public.origenes_campos where id = c), '{"opciones": [{"clave": "b", "etiqueta": "B"}]}');
  if (select valor_defecto from public.origenes_campos where id = c) is not null then raise exception 'quedó como defecto una opción que ya no existe'; end if;
  perform public.origen_campo_guardar(c, (select actualizado_en from public.origenes_campos where id = c), '{"valor_defecto": "b"}');
  -- Cambiar el tipo lo limpia, y un nulo explícito también.
  perform public.origen_campo_guardar(c, (select actualizado_en from public.origenes_campos where id = c), '{"tipo": "texto"}');
  if (select valor_defecto from public.origenes_campos where id = c) is not null then raise exception 'cambiar el tipo conservó el valor por defecto'; end if;
  perform public.origen_campo_guardar(c, (select actualizado_en from public.origenes_campos where id = c), '{"valor_defecto": "Sin datos"}');
  perform public.origen_campo_guardar(c, (select actualizado_en from public.origenes_campos where id = c), '{"valor_defecto": null}');
  if (select valor_defecto from public.origenes_campos where id = c) is not null then raise exception 'un nulo no vació el valor por defecto'; end if;
  perform public.origen_campo_eliminar(c, (select actualizado_en from public.origenes_campos where id = c));
end $$;
reset role;

-- @test vistas guardadas: cada persona lee y escribe sólo las suyas, y un nombre repetido reemplaza
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000008', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ begin
  insert into public.vistas_guardadas (usuario_id, pantalla, nombre, params) values ('00000000-0000-0000-0000-000000000008', 'vehiculos', 'Humo de Irene', '{"fase": "a"}');
  insert into public.vistas_guardadas (usuario_id, pantalla, nombre, params) values ('00000000-0000-0000-0000-000000000008', 'vehiculos', 'Humo de Irene', '{"fase": "b"}')
    on conflict (usuario_id, pantalla, nombre) do update set params = excluded.params;
  if (select params from public.vistas_guardadas where nombre = 'Humo de Irene') <> '{"fase": "b"}'::jsonb then raise exception 'guardar con el mismo nombre no reemplazó la vista'; end if;
  begin
    insert into public.vistas_guardadas (usuario_id, pantalla, nombre) values ('00000000-0000-0000-0000-000000000009', 'vehiculos', 'Colada');
    raise exception 'guardó una vista a nombre de otra persona';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000009', false);
do $$ begin
  if exists (select 1 from public.vistas_guardadas) then raise exception 'leyó las vistas de otra persona'; end if;
  update public.vistas_guardadas set nombre = 'Pisada' where nombre = 'Humo de Irene';
  delete from public.vistas_guardadas where nombre = 'Humo de Irene';
end $$;
reset role;
do $$ begin
  if (select count(*) from public.vistas_guardadas where nombre = 'Humo de Irene') <> 1 then raise exception 'otra persona tocó una vista ajena'; end if;
end $$;
