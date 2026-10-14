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
-- Sin origen de lead activo `crear_lead` no pide uno: los bloques viejos no lo eligen. El bloque
-- «alta rápida» del final los vuelve a encender y prueba que sí se pide.
update public.origenes_lead set activo = false;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
set role authenticated;
select public.crear_lead(gen_random_uuid(), '{"nombre": "Ana Quispe", "telefono_cc": "+591", "telefono_principal": "7 000 0001", "atributos": {"ciudad": "Santa Cruz"}}');
do $$ declare r jsonb; v_id uuid; begin
  r := public.verificar_telefono('+591', '70000001');
  if r ->> 'estado' <> 'existe' or (r ->> 'es_mio')::boolean is not true then raise exception 'verificar_telefono mío: %', r; end if;
  if (public.verificar_telefono('+591', '70000009') ->> 'estado') <> 'libre' then raise exception 'debía estar libre'; end if;
  r := public.crear_lead(gen_random_uuid(), '{"nombre": "Otra", "telefono_cc": "+591", "telefono_principal": "70000001"}');
  if r ->> 'resultado' <> 'existe' or (select count(*) from public.leads_vista where telefono_principal = '59170000001') <> 1 then
    raise exception 'duplicar el teléfono debía dar «existe» sin crear nada: %', r; end if;
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
  -- Sin leads.crear no hay oráculo de «de quién es este número».
  begin perform public.verificar_telefono('+591', '70000001'); raise exception 'verificó un teléfono sin leads.crear';
  exception when insufficient_privilege then null; end;
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
  v := (public.crear_lead(gen_random_uuid(), '{"nombre": "Ana Quispe", "telefono_cc": "+591", "telefono_principal": "70000001", "adoptar": true}') ->> 'id')::uuid;
  if not exists (select 1 from public.leads_asesores where lead_id = v and usuario_id = '00000000-0000-0000-0000-000000000004' and tipo_acceso = 'dueno' and revocado_en is null) then raise exception 'no adoptó'; end if;
  if (select count(*) from public.leads_vista where nombre = 'Ana Quispe') <> 1 then raise exception 'el adoptado debe verlo'; end if;
end $$;
reset role;
do $$ begin
  if not exists (select 1 from public.actividad where accion = 'lead.adoptado_del_limbo') then raise exception 'sin registro de adopción'; end if;
end $$;

-- @test vehículo de subasta: alta sólo por RPC, atributos validados, fotos y vitrina sólo por RPC
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
  begin
    insert into public.vehiculos_imagenes (vehiculo_id, hash, ruta, ruta_miniatura, ancho, alto, bytes) values (v, repeat('0', 64), v || '/' || repeat('a', 64) || '.webp', v || '/' || repeat('b', 64) || '.webp', 1, 1, 1);
    raise exception 'insertó una foto sin pasar por vehiculo_fotos_agregar';
  exception when insufficient_privilege then null; end;
  begin
    update public.vehiculos set publicado_web = true where id = v;
    raise exception 'dejó publicar por UPDATE directo';
  exception when insufficient_privilege then null; end;
  begin
    update public.vehiculos set titulo = 'Pisado' where id = v;
    raise exception 'dejó editar por UPDATE directo, sin versión';
  exception when insufficient_privilege then null; end;
  begin
    perform public.vehiculo_vitrina(v, (select actualizado_en from public.vehiculos where id = v), true, null, null, null, false);
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

-- @test papelera: las genéricas ya no aceptan vehículos; con un comprobante emitido un vehículo no entra
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare v uuid; r jsonb; begin
  select id into v from public.vehiculos where lote = '58741223';
  begin perform public.papelera_enviar('vehiculos', array[v]); raise exception 'la genérica mandó un vehículo a la papelera';
  exception when invalid_parameter_value then null; end;
  begin perform 1 from public.papelera_listar('vehiculos'); raise exception 'la genérica listó vehículos';
  exception when invalid_parameter_value then null; end;
  perform public.comprobante_emitir((select id from public.cotizaciones where clase = 'final'), 'A', '{"cliente": "Ana Quispe"}');
  r := public.vehiculos_papelera_enviar(jsonb_build_array(jsonb_build_object('id', v, 'actualizado_en', (select actualizado_en from public.vehiculos where id = v))));
  if r ->> 'lote' is not null or jsonb_array_length(r -> 'enviados') <> 0 or r -> 'rechazados' -> 0 ->> 'codigo' <> '23514' then raise exception 'un vehículo vendido entró a la papelera: %', r; end if;
  if (select count(*) from public.vehiculos where id = v) <> 1 then raise exception 'el vehículo rechazado dejó de verse'; end if;
end $$;
reset role;
do $$ begin
  if exists (select 1 from public.lotes_papelera where tipo = 'vehiculos') then raise exception 'un envío sin ningún vehículo dejó un lote vacío'; end if;
end $$;

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
  propio := (public.crear_lead(gen_random_uuid(), '{"nombre": "Luis Choque", "telefono_cc": "+591", "telefono_principal": "70000021"}') ->> 'id')::uuid;
  compartido := (public.crear_lead(gen_random_uuid(), '{"nombre": "Marta Vaca", "telefono_cc": "+591", "telefono_principal": "70000022"}') ->> 'id')::uuid;
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
  perform public.integracion_guardar('apibara', v2, p_activa => true, p_config => '{"endpoint": "https://apibara.tech/api/v1/vehicle-auction", "plataformas": ["copart"]}');
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
-- El catálogo de apibara es interno: se cuenta como dueño de la base y se lee de acá.
create temp table catalogo_humo as select count(*)::int as n, count(clave_apibara)::int as con_ruta from public._apibara_catalogo();
grant select on catalogo_humo to authenticated;
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

  -- Manual: un flujo, nueve reglas (sin aduana), ocho campos de fábrica, sin fórmula ni fases.
  r := public.origen_crear('corea_humo', '  Corea  ', 'Vehículo', 'm', 'manual');
  o := (r ->> 'id')::uuid;
  if (select count(*) from public.flujos where origen_id = o and ambito = 'vehiculos') <> 1 then raise exception 'el origen manual debía nacer con un flujo'; end if;
  if (select nombre from public.flujos where origen_id = o) <> 'Logística Corea' then raise exception 'el flujo no lleva el nombre del origen'; end if;
  if (select count(*) from public.flujos_reglas fr join public.flujos f on f.id = fr.flujo_id where f.origen_id = o) <> 9
     or exists (select 1 from public.flujos_reglas fr join public.flujos f on f.id = fr.flujo_id where f.origen_id = o and fr.regla = 'aduana') then
    raise exception 'las reglas del origen manual no son las nueve sin aduana'; end if;
  if (select count(*) from public.origenes_campos where origen_id = o and es_sistema) <> 8 or (select count(*) from public.origenes_campos where origen_id = o) <> 8 then
    raise exception 'el origen manual debía nacer con ocho campos de fábrica'; end if;
  if exists (select 1 from public.origenes_campos where origen_id = o and clave_apibara is not null) then raise exception 'un campo manual lleva clave de apibara'; end if;
  if exists (select 1 from public.formulas where origen_id = o) or exists (select 1 from public.fases f join public.flujos fl on fl.id = f.flujo_id where fl.origen_id = o) then
    raise exception 'un origen nuevo no trae fórmula ni fases'; end if;
  if (select nombre || '/' || sustantivo from public.origenes where id = o) <> 'Corea/vehículo' then raise exception 'no limpió el nombre ni el sustantivo'; end if;

  -- Subasta: el catálogo de apibara entero (los 17 de siempre y cada dato normalizado) y la regla de aduana.
  r := public.origen_crear('japon_humo', 'Japón', 'lote', 'm', 'subasta', '#7A5AF8', array['copart']);
  o := (r ->> 'id')::uuid;
  if (select n from catalogo_humo) < 100 then raise exception 'el catálogo de apibara quedó incompleto'; end if;
  if (select count(*) from public.origenes_campos where origen_id = o) <> (select n from catalogo_humo)
     or (select count(*) from public.origenes_campos where origen_id = o and es_sistema) <> 17
     or (select count(clave_apibara) from public.origenes_campos where origen_id = o) <> (select con_ruta from catalogo_humo) then
    raise exception 'el origen de subasta debía nacer con el catálogo de apibara'; end if;
  if exists (select 1 from public.origenes_campos where origen_id = o and not activo) then raise exception 'un campo del catálogo nació apagado'; end if;
  if exists (select 1 from public.origenes_campos where origen_id = o and not es_sistema and (publico_web or en_tarjeta or filtrable)) then
    raise exception 'un dato extra de apibara nació público, en tarjeta o filtrable'; end if;
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
  if not rechazo then raise exception 'cambió el tipo de un campo de fábrica'; end if;
  begin perform public.origen_campo_eliminar(sist, (select actualizado_en from public.origenes_campos where id = sist)); raise exception 'eliminó un campo de fábrica';
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

-- @test limpieza de storage: sólo se reclama lo viejo y sin referencias; lo reclamado no se vuelve a referenciar
reset role;
select set_config('request.jwt.claim.sub', '', false);
do $$ declare n int; r record; begin
  delete from public.cola_gc_storage;
  -- Un huérfano viejo, uno reciente (una subida en curso) y uno viejo que sí tiene quien lo use.
  insert into storage.objects (bucket_id, name, created_at) values
    ('vehiculos', 'gc/viejo.webp', now() - interval '3 days'),
    ('vehiculos', 'gc/reciente.webp', now() - interval '1 hour'),
    ('avatares', 'gc/en-uso.webp', now() - interval '3 days');
  update public.perfiles set avatar_ruta = 'gc/en-uso.webp' where id = '00000000-0000-0000-0000-000000000001';
  insert into public.cola_gc_storage (bucket, ruta, encolado_en) values
    ('avatares', 'gc/en-uso.webp', now() - interval '2 days'),
    ('vehiculos', 'gc/recien-encolado.webp', now());

  n := 0;
  for r in select * from public.storage_gc_reclamar(100) loop
    n := n + 1;
    if (r.bucket, r.ruta) <> ('vehiculos', 'gc/viejo.webp') then raise exception 'reclamó lo que no debía: %/%', r.bucket, r.ruta; end if;
  end loop;
  if n <> 1 then raise exception 'esperaba reclamar sólo el huérfano viejo, reclamó %', n; end if;
  if exists (select 1 from public.cola_gc_storage where ruta = 'gc/en-uso.webp') then raise exception 'lo que tiene referencias debía salir de la cola'; end if;
  if exists (select 1 from public.cola_gc_storage where ruta = 'gc/reciente.webp') then raise exception 'encoló un objeto recién subido'; end if;
  if (select reclamado_en from public.cola_gc_storage where ruta = 'gc/recien-encolado.webp') is not null then raise exception 'reclamó algo que acaba de entrar a la cola'; end if;

  -- Lo reclamado no se vuelve a reclamar enseguida, y nadie puede referenciarlo.
  if exists (select 1 from public.storage_gc_reclamar(100)) then raise exception 'reclamó dos veces lo mismo'; end if;
  begin
    perform public.storage_gc_rescatar('vehiculos', 'gc/viejo.webp');
    raise exception 'dejó referenciar un objeto que se está borrando';
  exception when raise_exception then
    if sqlerrm not like 'Ese archivo se está limpiando%' then raise; end if;
  end;
  -- Lo encolado y sin reclamar se rescata: sale de la cola.
  perform public.storage_gc_rescatar('vehiculos', 'gc/recien-encolado.webp');
  if exists (select 1 from public.cola_gc_storage where ruta = 'gc/recien-encolado.webp') then raise exception 'rescatar no sacó la ruta de la cola'; end if;
  perform public.storage_gc_rescatar('vehiculos', 'gc/nunca-estuvo.webp');

  -- Un reclamo que nadie confirmó en una hora se vuelve a ofrecer; confirmar sólo saca lo reclamado.
  update public.cola_gc_storage set reclamado_en = now() - interval '2 hours' where ruta = 'gc/viejo.webp';
  if (select count(*) from public.storage_gc_reclamar(100)) <> 1 then raise exception 'un reclamo vencido no se volvió a ofrecer'; end if;
  insert into public.cola_gc_storage (bucket, ruta) values ('vehiculos', 'gc/sin-reclamar.webp');
  n := public.storage_gc_confirmar('vehiculos', array['gc/viejo.webp', 'gc/sin-reclamar.webp']);
  if n <> 1 then raise exception 'confirmar debía sacar sólo lo reclamado, sacó %', n; end if;
  if not exists (select 1 from public.cola_gc_storage where ruta = 'gc/sin-reclamar.webp') then raise exception 'confirmó algo que nadie había reclamado'; end if;

  update public.perfiles set avatar_ruta = null where id = '00000000-0000-0000-0000-000000000001';
  delete from storage.objects where name like 'gc/%';
  delete from public.cola_gc_storage;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ begin
  begin
    perform public.storage_gc_reclamar(1);
    raise exception 'una persona de la app pudo reclamar la limpieza';
  exception when insufficient_privilege then null; end;
  begin
    perform public.storage_gc_confirmar('vehiculos', array['x']);
    raise exception 'una persona de la app pudo confirmar la limpieza';
  exception when insufficient_privilege then null; end;
  begin
    perform public.storage_gc_rescatar('vehiculos', 'x');
    raise exception 'una persona de la app pudo tocar la cola';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.cola_gc_storage;
    raise exception 'la cola se lee desde la app';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- @test fotos: sólo por RPC, sin repetir, una portada, orden relativo, versión propia y deshacer
reset role;
select set_config('request.jwt.claim.sub', '', false);
-- La foto número n de un vehículo, como la manda la app después de subir sus dos objetos.
create or replace function pg_temp.foto(v uuid, n int) returns jsonb language sql as $$
  select jsonb_build_object('hash', lpad(to_hex(n), 64, '0'),
    'ruta', v || '/' || lpad(to_hex(n), 64, 'a') || '.webp', 'ruta_miniatura', v || '/' || lpad(to_hex(n), 64, 'b') || '.webp',
    'ancho', 1600, 'alto', 1200, 'bytes', 300000) $$;
create or replace function pg_temp.fotos(v uuid, desde int, hasta int) returns jsonb language sql as $$
  select jsonb_agg(pg_temp.foto(v, n) order by n) from generate_series(desde, hasta) n $$;
create or replace function pg_temp.foto_id(v uuid, n int) returns uuid language sql as $$
  select id from public.vehiculos_imagenes where vehiculo_id = v and hash = lpad(to_hex(n), 64, '0') $$;
create or replace function pg_temp.orden_de(v uuid) returns text language sql as $$
  select coalesce(string_agg(ltrim(hash, '0'), ',' order by orden), '') from public.vehiculos_imagenes where vehiculo_id = v $$;
-- Los objetos ya están en Storage (los sube el navegador antes de registrar la fila).
insert into storage.objects (bucket_id, name)
select 'vehiculos', f ->> clave from public.vehiculos v, generate_series(1, 27) n, lateral pg_temp.foto(v.id, n) f, unnest(array['ruta', 'ruta_miniatura']) clave
where v.id = 'bbbbbbbb-0000-4000-8000-000000000001' or v.titulo in ('Humo oficina ajeno', 'Humo subasta ajeno');
delete from storage.objects where name like 'bbbbbbbb-0000-4000-8000-000000000001/' || lpad(to_hex(27), 64, 'a') || '%';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000008', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ declare v uuid := 'bbbbbbbb-0000-4000-8000-000000000001'; r jsonb; ver timestamptz; m text; begin
  r := public.vehiculo_fotos_agregar(v, pg_temp.fotos(v, 1, 3));
  if jsonb_array_length(r -> 'agregadas') <> 3 then raise exception 'esperaba 3 agregadas: %', r; end if;
  if pg_temp.orden_de(v) <> '1,2,3' then raise exception 'no quedaron en el orden en que llegaron: %', pg_temp.orden_de(v); end if;
  if (select hash from public.vehiculos_imagenes where vehiculo_id = v and es_portada) <> lpad('1', 64, '0') then raise exception 'la primera foto no nació portada'; end if;
  ver := (r ->> 'actualizado_en')::timestamptz;
  if ver is distinct from (select actualizado_en from public.vehiculos_imagenes_version where vehiculo_id = v) then raise exception 'agregar no devolvió la versión de las fotos'; end if;
  -- Subir fotos no mueve la versión de la ficha: quien la edita no ve un conflicto.
  if exists (select 1 from public.actividad a where a.tabla = 'vehiculos' and a.registro_id = v::text and a.creado_en >= ver - interval '1 second' and a.accion = 'vehiculos.update') then raise exception 'agregar fotos tocó la fila del vehículo'; end if;

  -- La misma foto no entra dos veces, y reintentar no cambia nada.
  r := public.vehiculo_fotos_agregar(v, pg_temp.fotos(v, 2, 3));
  if jsonb_array_length(r -> 'repetidas') <> 2 or jsonb_array_length(r -> 'agregadas') <> 0 then raise exception 'no detectó la foto repetida: %', r; end if;
  if (r ->> 'actualizado_en')::timestamptz is distinct from ver then raise exception 'un reintento movió la versión'; end if;

  -- Una ruta de la carpeta de otro vehículo, o un objeto que no terminó de subir, no entran.
  begin
    perform public.vehiculo_fotos_agregar(v, jsonb_build_array(pg_temp.foto(v, 9) || jsonb_build_object('ruta', (select id from public.vehiculos where titulo = 'Humo oficina ajeno') || '/' || lpad('9', 64, 'a') || '.webp')));
    raise exception 'aceptó una foto de la carpeta de otro vehículo';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.vehiculo_fotos_agregar(v, jsonb_build_array(pg_temp.foto(v, 27)));
    raise exception 'aceptó una foto cuyo objeto no está en Storage';
  exception when raise_exception then
    get stacked diagnostics m = message_text;
    if m not like 'La foto no terminó de subir%' then raise; end if;
  end;

  -- Mover: sin versión no, con la vigente sí, y es relativo («después de»).
  begin perform public.vehiculo_foto_mover(v, null, pg_temp.foto_id(v, 3)); raise exception 'movió sin versión';
  exception when others then get stacked diagnostics m = message_text; if m not like 'Falta la versión%' then raise; end if; end;
  r := public.vehiculo_foto_mover(v, ver, pg_temp.foto_id(v, 3));
  if pg_temp.orden_de(v) <> '3,1,2' then raise exception 'mover al principio dejó %', pg_temp.orden_de(v); end if;
  if (r ->> 'actualizado_en')::timestamptz is not distinct from ver then raise exception 'mover no cambió la versión'; end if;
  ver := (r ->> 'actualizado_en')::timestamptz;
  r := public.vehiculo_foto_mover(v, ver, pg_temp.foto_id(v, 3), pg_temp.foto_id(v, 2));
  if pg_temp.orden_de(v) <> '1,2,3' then raise exception 'mover después de la última dejó %', pg_temp.orden_de(v); end if;
  ver := (r ->> 'actualizado_en')::timestamptz;
  -- Pedir lo que ya está no es un conflicto, aunque la versión sea vieja.
  r := public.vehiculo_foto_mover(v, ver - interval '1 hour', pg_temp.foto_id(v, 2), pg_temp.foto_id(v, 1));
  if (r ->> 'actualizado_en')::timestamptz is distinct from ver then raise exception 'un movimiento que no mueve nada cambió la versión'; end if;

  -- Portada: una sola.
  begin perform public.vehiculo_foto_portada(v, null, pg_temp.foto_id(v, 2)); raise exception 'fijó portada sin versión';
  exception when others then get stacked diagnostics m = message_text; if m not like 'Falta la versión%' then raise; end if; end;
  r := public.vehiculo_foto_portada(v, ver, pg_temp.foto_id(v, 2));
  if (select count(*) from public.vehiculos_imagenes where vehiculo_id = v and es_portada) <> 1 or not (select es_portada from public.vehiculos_imagenes where id = pg_temp.foto_id(v, 2)) then raise exception 'la portada no quedó en la foto 2, sola'; end if;
end $$;
-- Bruno las reordena; Irene, con la versión que tenía, se entera de quién fue.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000009', false);
do $$ declare v uuid := 'bbbbbbbb-0000-4000-8000-000000000001'; begin
  perform public.vehiculo_foto_mover(v, (select actualizado_en from public.vehiculos_imagenes_version where vehiculo_id = v), pg_temp.foto_id(v, 3));
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000008', false);
do $$ declare v uuid := 'bbbbbbbb-0000-4000-8000-000000000001'; vieja timestamptz; ver timestamptz; r jsonb; f jsonb; m text; e text; begin
  select actualizado_en into ver from public.vehiculos_imagenes_version where vehiculo_id = v;
  vieja := ver - interval '1 second';
  begin
    perform public.vehiculo_foto_mover(v, vieja, pg_temp.foto_id(v, 1));
    raise exception 'movió con una versión vieja';
  exception when others then
    get stacked diagnostics m = message_text, e = returned_sqlstate;
    if e <> 'PT409' then raise; end if;
    if m not like 'Bruno Lima cambió las fotos de este vehículo hace %' then raise exception 'el conflicto de fotos no dice quién ni cuándo: %', m; end if;
  end;
  begin perform public.vehiculo_foto_portada(v, vieja, pg_temp.foto_id(v, 1)); raise exception 'fijó portada con una versión vieja';
  exception when others then get stacked diagnostics e = returned_sqlstate; if e <> 'PT409' then raise; end if; end;
  begin perform public.vehiculo_foto_eliminar(v, vieja, pg_temp.foto_id(v, 1)); raise exception 'eliminó con una versión vieja';
  exception when others then get stacked diagnostics e = returned_sqlstate; if e <> 'PT409' then raise; end if; end;
  begin perform public.vehiculo_foto_eliminar(v, null, pg_temp.foto_id(v, 1)); raise exception 'eliminó sin versión';
  exception when others then get stacked diagnostics m = message_text; if m not like 'Falta la versión%' then raise; end if; end;
  if pg_temp.orden_de(v) <> '3,1,2' then raise exception 'un conflicto movió las fotos: %', pg_temp.orden_de(v); end if;

  -- Eliminar la portada: la primera que queda asciende, y sus dos objetos van a la cola.
  if public.storage_refcount('vehiculos', pg_temp.foto(v, 2) ->> 'ruta') <> 1 or public.storage_refcount('vehiculos', pg_temp.foto(v, 2) ->> 'ruta_miniatura') <> 1 then raise exception 'el refcount no cuenta las dos rutas de una foto'; end if;
  r := public.vehiculo_foto_eliminar(v, ver, pg_temp.foto_id(v, 2));
  f := r -> 'foto';
  if pg_temp.orden_de(v) <> '3,1' then raise exception 'eliminar dejó %', pg_temp.orden_de(v); end if;
  if (select hash from public.vehiculos_imagenes where vehiculo_id = v and es_portada) <> lpad('3', 64, '0') then raise exception 'al eliminar la portada no ascendió la primera'; end if;
  if (f ->> 'orden')::int <> 3 or not (f ->> 'es_portada')::boolean then raise exception 'eliminar no devolvió la foto como estaba: %', f; end if;
  if public.storage_refcount('vehiculos', f ->> 'ruta') <> 0 then raise exception 'la foto eliminada sigue contando'; end if;
  -- Repetir el eliminar (se perdió la respuesta) no es un error.
  if (public.vehiculo_foto_eliminar(v, ver, gen_random_uuid()) -> 'foto') <> 'null'::jsonb then raise exception 'eliminar lo que ya no está debía ser inocuo'; end if;
end $$;
reset role;
do $$ declare v uuid := 'bbbbbbbb-0000-4000-8000-000000000001'; begin
  if (select count(*) from public.cola_gc_storage where bucket = 'vehiculos' and ruta in (pg_temp.foto(v, 2) ->> 'ruta', pg_temp.foto(v, 2) ->> 'ruta_miniatura') and reclamado_en is null) <> 2 then raise exception 'eliminar no encoló los dos objetos'; end if;
  -- Recién encolado: la limpieza no lo toca (el «Deshacer» cae siempre adentro).
  if exists (select 1 from public.storage_gc_reclamar(100)) then raise exception 'la limpieza reclamó una foto recién eliminada'; end if;
end $$;
set role authenticated;
do $$ declare v uuid := 'bbbbbbbb-0000-4000-8000-000000000001'; r jsonb; begin
  -- Deshacer: vuelve a su lugar y a ser portada, y sale de la cola.
  r := public.vehiculo_fotos_agregar(v, jsonb_build_array(pg_temp.foto(v, 2) || '{"orden": 3, "es_portada": true}'));
  if pg_temp.orden_de(v) <> '3,1,2' then raise exception 'deshacer no devolvió la foto a su lugar: %', pg_temp.orden_de(v); end if;
  if (select count(*) from public.vehiculos_imagenes where vehiculo_id = v and es_portada) <> 1 or not (select es_portada from public.vehiculos_imagenes where id = pg_temp.foto_id(v, 2)) then raise exception 'deshacer no devolvió la portada'; end if;
end $$;
reset role;
do $$ begin
  if exists (select 1 from public.cola_gc_storage where bucket = 'vehiculos') then raise exception 'deshacer no sacó los objetos de la cola'; end if;
end $$;

-- @test fotos: el tope de 24 lo pone la base, y lo que la limpieza reclamó no vuelve a entrar
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000008', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ declare v uuid := 'bbbbbbbb-0000-4000-8000-000000000001'; r jsonb; begin
  -- Tiene 3. Llegan 23: entran, en orden, las 21 que caben.
  r := public.vehiculo_fotos_agregar(v, pg_temp.fotos(v, 4, 26));
  if jsonb_array_length(r -> 'agregadas') <> 21 or jsonb_array_length(r -> 'sin_lugar') <> 2 then raise exception 'esperaba 21 y 2: %', r; end if;
  if r -> 'sin_lugar' <> jsonb_build_array(lpad(to_hex(25), 64, '0'), lpad(to_hex(26), 64, '0')) then raise exception 'debían quedar afuera las dos últimas: %', r -> 'sin_lugar'; end if;
  if (select count(*) from public.vehiculos_imagenes where vehiculo_id = v) <> 24 then raise exception 'no quedaron 24'; end if;
  r := public.vehiculo_fotos_agregar(v, pg_temp.fotos(v, 25, 25));
  if jsonb_array_length(r -> 'sin_lugar') <> 1 then raise exception 'la 25.ª entró: %', r; end if;
  begin
    perform public.vehiculo_fotos_agregar(v, pg_temp.fotos(v, 1, 25));
    raise exception 'aceptó un pedido de más de 24 fotos';
  exception when check_violation then null; end;
end $$;
reset role;
do $$ declare v uuid := 'bbbbbbbb-0000-4000-8000-000000000001'; f jsonb; begin
  -- El trigger es el respaldo para quien escribe sin pasar por la RPC.
  f := pg_temp.foto(v, 25);
  begin
    insert into public.vehiculos_imagenes (vehiculo_id, hash, ruta, ruta_miniatura, ancho, alto, bytes) values (v, f ->> 'hash', f ->> 'ruta', f ->> 'ruta_miniatura', 1, 1, 1);
    raise exception 'el trigger dejó pasar la foto 25';
  exception when check_violation then null; end;
  -- Queda lugar y la limpieza reclamó ese objeto: la fila no nace.
  delete from public.vehiculos_imagenes where vehiculo_id = v and hash = lpad(to_hex(24), 64, '0');
  insert into public.cola_gc_storage (bucket, ruta, reclamado_en) values ('vehiculos', f ->> 'ruta_miniatura', now());
end $$;
set role authenticated;
do $$ declare v uuid := 'bbbbbbbb-0000-4000-8000-000000000001'; m text; begin
  begin
    perform public.vehiculo_fotos_agregar(v, pg_temp.fotos(v, 25, 25));
    raise exception 'nació una foto sobre un objeto que la limpieza está borrando';
  exception when raise_exception then
    get stacked diagnostics m = message_text;
    if m not like 'Ese archivo se está limpiando%' then raise; end if;
  end;
  -- Una foto de menos de 480 px: la completa y la miniatura son el mismo objeto. Entra, cuenta
  -- por las dos columnas y al eliminarla se encola una sola vez.
  declare chica jsonb; r jsonb; begin
    chica := pg_temp.foto(v, 26) || jsonb_build_object('ruta_miniatura', pg_temp.foto(v, 26) ->> 'ruta');
    r := public.vehiculo_fotos_agregar(v, jsonb_build_array(chica));
    if jsonb_array_length(r -> 'agregadas') <> 1 then raise exception 'no entró la foto chica: %', r; end if;
    if public.storage_refcount('vehiculos', chica ->> 'ruta') <> 2 then raise exception 'la foto chica debía contar por sus dos columnas'; end if;
    r := public.vehiculo_foto_eliminar(v, (r ->> 'actualizado_en')::timestamptz, pg_temp.foto_id(v, 26));
    if (r -> 'foto' ->> 'ruta') is distinct from (chica ->> 'ruta') then raise exception 'no eliminó la foto chica: %', r; end if;
  end;
end $$;
reset role;
do $$ declare v uuid := 'bbbbbbbb-0000-4000-8000-000000000001'; begin
  if (select count(*) from public.cola_gc_storage where ruta = pg_temp.foto(v, 26) ->> 'ruta') <> 1 then raise exception 'la foto chica debía quedar una vez en la cola'; end if;
end $$;
delete from public.cola_gc_storage;

-- @test fotos: RLS por origen en las tablas y en storage; editar lo decide la base
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000009', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ declare ajeno uuid; usa uuid; begin
  select id into ajeno from public.vehiculos where titulo = 'Humo oficina ajeno';
  select id into usa from public.vehiculos where titulo = 'Humo subasta ajeno';
  -- Bruno edita todo en todos los orígenes: la misma foto en dos vehículos son dos filas y dos objetos.
  perform public.vehiculo_fotos_agregar(ajeno, pg_temp.fotos(ajeno, 1, 1));
  perform public.vehiculo_fotos_agregar(usa, pg_temp.fotos(usa, 1, 2));
end $$;
-- Irene: ve todo y edita lo propio, sólo en Oficina.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000008', false);
do $$ declare v uuid := 'bbbbbbbb-0000-4000-8000-000000000001'; ajeno uuid; usa uuid; n int; begin
  select id into ajeno from public.vehiculos where titulo = 'Humo oficina ajeno';
  -- El de la subasta no lo ve: su id sale de las fotos que tampoco ve.
  if exists (select 1 from public.vehiculos where titulo = 'Humo subasta ajeno') then raise exception 'Irene ve un vehículo de otro origen'; end if;
  if (select count(*) from public.vehiculos_imagenes where vehiculo_id = ajeno) <> 1 then raise exception 'no ve las fotos de un vehículo que sí ve'; end if;
  if (select count(distinct vehiculo_id) from public.vehiculos_imagenes) <> 2 then raise exception 've fotos de un vehículo de un origen donde no tiene permiso'; end if;
  if (select count(*) from public.vehiculos_imagenes_version) <> 2 then raise exception 've la versión de las fotos de un vehículo que no ve'; end if;
  -- Con alcance «propios» no toca las fotos de lo que creó otra persona.
  begin perform public.vehiculo_fotos_agregar(ajeno, pg_temp.fotos(ajeno, 2, 2)); raise exception 'agregó fotos a un vehículo ajeno';
  exception when insufficient_privilege then null; end;
  begin perform public.vehiculo_foto_eliminar(ajeno, now(), pg_temp.foto_id(ajeno, 1)); raise exception 'eliminó una foto de un vehículo ajeno';
  exception when insufficient_privilege then null; end;
  if (select array_agg(x) from public.vehiculos_editables(array[v, ajeno, gen_random_uuid()]) x) <> array[v] then raise exception 'vehiculos_editables no devolvió sólo el propio'; end if;

  -- Storage: sube a la carpeta de lo que puede editar, y a ninguna otra.
  insert into storage.objects (bucket_id, name) values ('vehiculos', v || '/' || repeat('c', 64) || '.webp');
  begin insert into storage.objects (bucket_id, name) values ('vehiculos', ajeno || '/' || repeat('c', 64) || '.webp'); raise exception 'subió a la carpeta de un vehículo que no puede editar';
  exception when insufficient_privilege then null; end;
  begin insert into storage.objects (bucket_id, name) values ('vehiculos', 'sueltas/' || repeat('c', 64) || '.webp'); raise exception 'subió a una carpeta que no es de un vehículo';
  exception when insufficient_privilege then null; end;
  begin insert into storage.objects (bucket_id, name) values ('vehiculos', repeat('c', 64) || '.webp'); raise exception 'subió a la raíz del bucket';
  exception when insufficient_privilege then null; end;
  -- Lista lo de los vehículos que ve (los dos de Oficina), no lo del otro origen.
  if exists (select 1 from storage.objects o where o.bucket_id = 'vehiculos' and split_part(o.name, '/', 1) not in (v::text, ajeno::text)) then raise exception 'lista objetos de un vehículo que no ve'; end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'vehiculos' and o.name like ajeno || '/%') then raise exception 'no lista los objetos de un vehículo que ve'; end if;
  -- Nadie borra ni pisa objetos de este bucket desde la app.
  delete from storage.objects where bucket_id = 'vehiculos' and name like v || '/%';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'borró % objetos del bucket vehiculos desde la app', n; end if;
  update storage.objects set name = name || 'x' where bucket_id = 'vehiculos' and name like v || '/%';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'pisó % objetos del bucket vehiculos', n; end if;
end $$;
reset role;
insert into storage.objects (bucket_id, name) values ('marca', 'logos/humo.png');
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claim.role', 'anon', false);
set role anon;
do $$ begin
  if exists (select 1 from storage.objects where bucket_id = 'vehiculos') then raise exception 'sin sesión se lista el bucket de vehículos'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'marca') then raise exception 'el bucket de la marca dejó de listarse'; end if;
end $$;
reset role;
delete from storage.objects where name = 'logos/humo.png';

-- @test alcance «propios»: tener leads en la cartera no abre los vehículos ajenos sin vínculo
reset role;
select set_config('request.jwt.claim.sub', '', false);
-- Irene y Bruno llevan cada uno su cartera: ven y editan sólo sus leads.
insert into public.roles_permisos (rol_id, permiso_clave, alcance)
select r.id, x.clave, 'propios' from public.roles r, (values ('leads.ver'), ('leads.editar')) as x (clave)
where r.clave in ('humo_inventario', 'humo_inventario_todo');
insert into public.leads (id, nombre, telefono_principal, creado_por) values
  ('cccccccc-0000-4000-8000-000000000008', 'Lead de Irene', '59170000108', '00000000-0000-0000-0000-000000000008'),
  ('cccccccc-0000-4000-8000-000000000009', 'Lead de Bruno', '59170000109', '00000000-0000-0000-0000-000000000009');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000008', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ declare ajeno uuid; begin
  select id into ajeno from public.vehiculos where titulo = 'Humo oficina ajeno';
  if (select count(*) from public.mis_leads()) <> 1 then raise exception 'Irene debía tener un lead en su cartera'; end if;
  -- El vehículo no tiene lead: `lead_id in (mis leads)` da nulo, y eso no puede leerse como «sí».
  begin perform public.vehiculo_guardar(ajeno, (select actualizado_en from public.vehiculos where id = ajeno), '{"marca": "Pisada"}'); raise exception 'con un lead en la cartera editó un vehículo ajeno sin vínculo';
  exception when insufficient_privilege then null; end;
  begin perform public.vehiculo_fotos_agregar(ajeno, pg_temp.fotos(ajeno, 2, 2)); raise exception 'con un lead en la cartera cambió las fotos de un vehículo ajeno sin vínculo';
  exception when insufficient_privilege then null; end;
  if exists (select 1 from public.vehiculos_editables(array[ajeno])) then raise exception 'vehiculos_editables da por editable un vehículo ajeno sin vínculo'; end if;
end $$;
reset role;

-- @test vínculo e interesados: sólo por RPC, con versión, un vínculo abierto, y el nombre sólo de los leads que se ven
reset role;
select set_config('request.jwt.claim.sub', '', false);
-- Las carteras de Irene y Bruno (un lead cada uno) vienen de la prueba anterior.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000008', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ declare v uuid := 'bbbbbbbb-0000-4000-8000-000000000001'; suyo uuid := 'cccccccc-0000-4000-8000-000000000008'; de_bruno uuid := 'cccccccc-0000-4000-8000-000000000009';
  ajeno uuid; ver timestamptz; r jsonb; m text; e text; begin
  select id into ajeno from public.vehiculos where titulo = 'Humo oficina ajeno';
  select actualizado_en into ver from public.vehiculos where id = v;
  begin perform public.vehiculo_vincular(v, null, suyo); raise exception 'vinculó sin versión';
  exception when others then get stacked diagnostics m = message_text; if m not like 'Falta la versión%' then raise; end if; end;
  begin perform public.vehiculo_vincular(v, ver, de_bruno); raise exception 'vinculó a un lead que no es de su cartera';
  exception when insufficient_privilege then null; end;
  begin perform public.vehiculo_vincular(ajeno, now(), suyo); raise exception 'vinculó un vehículo que no puede editar';
  exception when insufficient_privilege then null; end;
  begin perform public.vehiculo_vincular(v, ver - interval '1 second', suyo); raise exception 'vinculó con una versión vieja';
  exception when others then get stacked diagnostics e = returned_sqlstate; if e <> 'PT409' then raise; end if; end;

  r := public.vehiculo_vincular(v, ver, suyo);
  if (select lead_id from public.vehiculos where id = v) is distinct from suyo then raise exception 'no quedó vinculado'; end if;
  if (r ->> 'actualizado_en')::timestamptz is distinct from (select actualizado_en from public.vehiculos where id = v) then raise exception 'vincular no devolvió la versión nueva'; end if;
  if not exists (select 1 from public.vehiculos_vinculos k where k.vehiculo_id = v and k.lead_id = suyo and k.hasta is null and k.usuario_id = '00000000-0000-0000-0000-000000000008') then raise exception 'el historial no registró el vínculo ni quién lo hizo'; end if;
  -- Pedir lo que ya está no es un conflicto.
  perform public.vehiculo_vincular(v, ver - interval '1 hour', suyo);
  if (select count(*) from public.vehiculo_vinculos(v) k where k.lead_nombre = 'Lead de Irene' and k.hasta is null and k.por_nombre = 'Irene Paz') <> 1 then raise exception 'la lectura del vínculo no trae al lead ni a quien lo vinculó'; end if;

  -- Interesados: ver el vehículo y poder editar el lead. Marcar dos veces es marcar una.
  perform public.vehiculo_interesado_marcar(ajeno, suyo, '  Lo quiere en blanco  ');
  perform public.vehiculo_interesado_marcar(ajeno, suyo, 'otra nota');
  if (select count(*) from public.vehiculo_interesados(ajeno) i where i.lead_nombre = 'Lead de Irene' and i.nota = 'Lo quiere en blanco' and i.por_nombre = 'Irene Paz') <> 1 then raise exception 'la lectura de interesados no trae lo marcado'; end if;
  begin perform public.vehiculo_interesado_marcar(ajeno, de_bruno); raise exception 'marcó el interés de un lead ajeno';
  exception when insufficient_privilege then null; end;
  begin perform public.vehiculo_interesado_marcar((select id from public.vehiculos_imagenes limit 0), suyo); raise exception 'marcó interés sin vehículo';
  exception when insufficient_privilege then null; end;
  begin perform public.vehiculo_interesado_marcar(ajeno, suyo, repeat('x', 501)); raise exception 'aceptó una nota de más de 500 caracteres';
  exception when invalid_parameter_value then null; end;
  begin insert into public.vehiculos_interesados (vehiculo_id, lead_id, usuario_id) values (v, suyo, '00000000-0000-0000-0000-000000000008'); raise exception 'insertó un interesado sin pasar por la RPC';
  exception when insufficient_privilege then null; end;
  begin delete from public.vehiculos_interesados where lead_id = suyo; raise exception 'borró un interesado sin pasar por la RPC';
  exception when insufficient_privilege then null; end;
end $$;
-- Bruno edita todo: lo pasa a su lead. El vínculo anterior se cierra y queda uno solo abierto.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000009', false);
do $$ declare v uuid := 'bbbbbbbb-0000-4000-8000-000000000001'; de_bruno uuid := 'cccccccc-0000-4000-8000-000000000009'; usa uuid; begin
  perform public.vehiculo_vincular(v, (select actualizado_en from public.vehiculos where id = v), de_bruno);
  if (select count(*) from public.vehiculos_vinculos where vehiculo_id = v) <> 2 or (select count(*) from public.vehiculos_vinculos where vehiculo_id = v and hasta is null) <> 1 then raise exception 'cambiar el vínculo no cerró el anterior'; end if;
  -- Ve el historial entero, pero el nombre sólo del lead que está en su cartera.
  if (select count(*) from public.vehiculo_vinculos(v)) <> 2 then raise exception 'no ve el historial del vínculo'; end if;
  if (select lead_nombre from public.vehiculo_vinculos(v) limit 1) <> 'Lead de Bruno' then raise exception 'el vínculo vigente no viene primero'; end if;
  if (select count(*) from public.vehiculo_vinculos(v) k where k.lead_nombre is null and k.hasta is not null) <> 1 then raise exception 'leyó el nombre de un lead que no ve'; end if;
  -- El interés de un lead que no ve no le aparece.
  if exists (select 1 from public.vehiculo_interesados((select id from public.vehiculos where titulo = 'Humo oficina ajeno'))) then raise exception 've el interés de un lead ajeno'; end if;
  -- Quitar el vínculo.
  perform public.vehiculo_vincular(v, (select actualizado_en from public.vehiculos where id = v), null);
  if (select lead_id from public.vehiculos where id = v) is not null or exists (select 1 from public.vehiculos_vinculos where vehiculo_id = v and hasta is null) then raise exception 'quitar el vínculo dejó uno abierto'; end if;
  -- Marca el interés de su lead en un vehículo de otro origen, que él sí ve.
  select id into usa from public.vehiculos where titulo = 'Humo subasta ajeno';
  perform public.vehiculo_interesado_marcar(usa, de_bruno);
  perform public.vehiculo_interesado_quitar(usa, de_bruno);
  perform public.vehiculo_interesado_quitar(usa, de_bruno);
  if exists (select 1 from public.vehiculo_interesados(usa)) then raise exception 'quitar no quitó el interés'; end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000008', false);
do $$ declare ajeno uuid; begin
  select id into ajeno from public.vehiculos where titulo = 'Humo oficina ajeno';
  begin perform public.vehiculo_interesado_marcar((select id from public.vehiculos where titulo = 'Humo subasta ajeno'), 'cccccccc-0000-4000-8000-000000000008'); raise exception 'marcó interés en un vehículo que no ve';
  exception when insufficient_privilege then null; end;
  -- Con alcance «propios» todavía no puede editar lo que creó otra persona…
  if exists (select 1 from public.vehiculos_editables(array[ajeno])) then raise exception 'edita un vehículo ajeno sin vínculo'; end if;
end $$;
reset role;
-- …hasta que ese vehículo queda vinculado a un lead de su cartera.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000009', false);
set role authenticated;
do $$ declare ajeno uuid; begin
  select id into ajeno from public.vehiculos where titulo = 'Humo oficina ajeno';
  begin perform public.vehiculo_vincular(ajeno, (select actualizado_en from public.vehiculos where id = ajeno), 'cccccccc-0000-4000-8000-000000000008'); raise exception 'Bruno vinculó a un lead que no es suyo';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.vehiculos set lead_id = 'cccccccc-0000-4000-8000-000000000008' where titulo = 'Humo oficina ajeno';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000008', false);
set role authenticated;
do $$ declare ajeno uuid; begin
  select id into ajeno from public.vehiculos where titulo = 'Humo oficina ajeno';
  if (select array_agg(x) from public.vehiculos_editables(array[ajeno]) x) is distinct from array[ajeno] then raise exception 'lo vinculado a un lead de su cartera debía ser editable'; end if;
  perform public.vehiculo_fotos_agregar(ajeno, pg_temp.fotos(ajeno, 2, 2));
  -- Y puede soltarlo, aunque al hacerlo deje de poder editarlo.
  perform public.vehiculo_vincular(ajeno, (select actualizado_en from public.vehiculos where id = ajeno), null);
  if exists (select 1 from public.vehiculos_editables(array[ajeno])) then raise exception 'sin el vínculo debía dejar de ser editable'; end if;
end $$;
reset role;
do $$ declare v uuid := 'bbbbbbbb-0000-4000-8000-000000000001'; begin
  insert into public.vehiculos_vinculos (vehiculo_id, lead_id) values (v, 'cccccccc-0000-4000-8000-000000000008');
  begin
    insert into public.vehiculos_vinculos (vehiculo_id, lead_id) values (v, 'cccccccc-0000-4000-8000-000000000009');
    raise exception 'un vehículo quedó con dos vínculos abiertos';
  exception when unique_violation then null; end;
  delete from public.vehiculos_vinculos where vehiculo_id = v and hasta is null;
end $$;

-- @test vitrina: el anónimo ve sólo lo publicado, con lo público y la portada; publicar pide permiso por origen, versión y ver el vehículo
reset role;
select set_config('request.jwt.claim.sub', '', false);
-- Vera: ve todo el inventario y publica sólo en Oficina.
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'vera@ejemplo.com', '{"invitado": true}');
update public.perfiles set nombre = 'Vera Soto', invitacion_aceptada_en = now() where id = '00000000-0000-0000-0000-00000000000a';
insert into public.roles (clave, nombre) values ('humo_vitrina', 'Humo vitrina');
insert into public.usuarios_roles (usuario_id, rol_id) select '00000000-0000-0000-0000-00000000000a', id from public.roles where clave = 'humo_vitrina';
insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
select r.id, 'vehiculos.ver', null, 'todos' from public.roles r where r.clave = 'humo_vitrina';
insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
select r.id, 'vehiculos.vitrina', o.id, 'todos' from public.roles r, public.origenes o where r.clave = 'humo_vitrina' and o.clave = 'oficina';
-- Un campo público y uno que no lo es.
insert into public.origenes_campos (origen_id, clave, etiqueta, tipo, publico_web)
select o.id, x.clave, x.etiqueta, 'texto', x.publico
from public.origenes o, (values ('humo_color', 'Color', true), ('humo_costo', 'Costo de compra', false)) as x (clave, etiqueta, publico)
where o.clave = 'oficina';
insert into public.vehiculos (id, origen_id, titulo, marca, modelo, anio, vin, precio, kilometraje, fase_id, atributos, creado_por)
select x.id::uuid, o.id, x.titulo, 'Toyota', 'Hilux', 2022, x.vin, 18500, 45123, case when x.con_fase then f.id end,
       '{"humo_color": "Blanco", "humo_costo": "17999"}', '00000000-0000-0000-0000-000000000001'
from public.origenes o join public.flujos fl on fl.origen_id = o.id join public.fases f on f.flujo_id = fl.id and f.nombre = 'Disponible',
  (values ('dddddddd-0000-4000-8000-000000000001', 'Vitrina publicado', 'JTFVTR00000000001', true),
          ('dddddddd-0000-4000-8000-000000000002', 'Vitrina sin publicar', 'JTFVTR00000000002', true),
          ('dddddddd-0000-4000-8000-000000000003', 'Vitrina sin fase', 'JTFVTR00000000003', false)) as x (id, titulo, vin, con_fase)
where o.clave = 'oficina';
-- Dos fotos en el publicado (la segunda no es portada) y una en el que no se publica.
insert into storage.objects (bucket_id, name)
select 'vehiculos', v || '/' || repeat(letra, 64) || '.webp'
from unnest(array['dddddddd-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000002']) v, unnest(array['1', '2', '3', '4']) letra;
insert into public.vehiculos_imagenes (vehiculo_id, hash, ruta, ruta_miniatura, ancho, alto, bytes, orden, es_portada)
select v::uuid, repeat(x.completa, 64), v || '/' || repeat(x.completa, 64) || '.webp', v || '/' || repeat(x.mini, 64) || '.webp', 1600, 1200, 300000, x.orden, x.portada
from unnest(array['dddddddd-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000002']) v,
  (values ('1', '2', 1, true), ('3', '4', 2, false)) as x (completa, mini, orden, portada)
where v = 'dddddddd-0000-4000-8000-000000000001' or x.portada;
update public.integraciones set activa = true where clave = 'web_publica';
update public.ajustes_web set origenes_visibles = array(select id from public.origenes where clave in ('oficina', 'subasta_usa')) where id = 1;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ declare v1 uuid := 'dddddddd-0000-4000-8000-000000000001'; v2 uuid := 'dddddddd-0000-4000-8000-000000000002'; v3 uuid := 'dddddddd-0000-4000-8000-000000000003';
  ajeno uuid; ver timestamptz; r jsonb; m text; e text; begin
  select actualizado_en into ver from public.vehiculos where id = v1;
  begin perform public.vehiculo_vitrina(v1, null, true, 21500, null, null, false); raise exception 'publicó sin versión';
  exception when others then get stacked diagnostics m = message_text; if m not like 'Falta la versión%' then raise; end if; end;
  begin perform public.vehiculo_vitrina(v1, ver - interval '1 second', true, 21500, null, null, false); raise exception 'publicó con una versión vieja';
  exception when others then get stacked diagnostics e = returned_sqlstate; if e <> 'PT409' then raise; end if; end;
  begin perform public.vehiculo_vitrina(v1, ver, true, -1, null, null, false); raise exception 'aceptó un precio público negativo';
  exception when invalid_parameter_value then null; end;
  begin perform public.vehiculo_vitrina(v1, ver, true, 21500, 20000, null, false); raise exception 'aceptó un «hasta» menor que el precio';
  exception when invalid_parameter_value then null; end;
  begin perform public.vehiculo_vitrina(v1, ver, true, null, 20000, null, false); raise exception 'aceptó un «hasta» sin precio';
  exception when invalid_parameter_value then null; end;
  select id into ajeno from public.vehiculos where titulo = 'Humo subasta ajeno';
  if ajeno is null then raise exception 'falta el vehículo de subasta de las pruebas'; end if;
  begin perform public.vehiculo_vitrina(ajeno, (select actualizado_en from public.vehiculos where id = ajeno), true, null, null, null, false);
    raise exception 'publicó en un origen donde no tiene vehiculos.vitrina';
  exception when insufficient_privilege then null; end;

  r := public.vehiculo_vitrina(v1, ver, true, 21500, 23000, '  IVA incluido  ', true);
  if not (select publicado_web and destacado_web and precio_web = 21500 and precio_web_hasta = 23000 and precio_web_nota = 'IVA incluido' from public.vehiculos where id = v1) then
    raise exception 'publicar no guardó la marca, el precio y la nota';
  end if;
  if (r ->> 'actualizado_en')::timestamptz is distinct from (select actualizado_en from public.vehiculos where id = v1) then raise exception 'publicar no devolvió la versión nueva'; end if;
  -- Lo que ya está guardado no es un conflicto, aunque la versión sea vieja.
  perform public.vehiculo_vitrina(v1, ver - interval '1 hour', true, 21500, 23000, 'IVA incluido', true);

  -- La vista previa es, campo por campo, lo que ve el visitante.
  r := public.vehiculo_vitrina_previa(v1);
  if not (r ->> 'visible')::boolean then raise exception 'el publicado debía verse: %', r; end if;
  if r -> 'tarjeta' is distinct from (select to_jsonb(w) from web.vehiculos w where w.id = v1) then raise exception 'la vista previa no es lo que ve el visitante: %', r; end if;
  -- Sin publicar: hay tarjeta (lo que se vería) y dice que no está publicado.
  r := public.vehiculo_vitrina_previa(v2);
  if (r ->> 'publicado')::boolean or (r ->> 'visible')::boolean or r -> 'tarjeta' ->> 'titulo' <> 'Vitrina sin publicar' then raise exception 'vista previa de uno sin publicar: %', r; end if;
  -- Publicado sin fase: la marca queda, y no se ve.
  perform public.vehiculo_vitrina(v3, (select actualizado_en from public.vehiculos where id = v3), true, null, null, null, false);
  r := public.vehiculo_vitrina_previa(v3);
  if not (r ->> 'publicado')::boolean or (r ->> 'con_fase')::boolean or (r ->> 'visible')::boolean then raise exception 'publicado sin fase: %', r; end if;
  -- Despublicar apaga también el destacado.
  perform public.vehiculo_vitrina(v3, (select actualizado_en from public.vehiculos where id = v3), false, 9000, null, null, true);
  if (select publicado_web or destacado_web or precio_web is distinct from 9000 from public.vehiculos where id = v3) then raise exception 'despublicar debía apagar el destacado y conservar el precio que se le mandó'; end if;
end $$;
reset role;

-- Sin `vehiculos.vitrina` no se publica; con el permiso pero sin ver el vehículo, tampoco.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000008', false);
set role authenticated;
do $$ declare v1 uuid := 'dddddddd-0000-4000-8000-000000000001'; begin
  begin perform public.vehiculo_vitrina(v1, (select actualizado_en from public.vehiculos where id = v1), false, null, null, null, false);
    raise exception 'despublicó sin vehiculos.vitrina';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.roles_permisos set alcance = 'propios' where permiso_clave = 'vehiculos.ver' and rol_id = (select id from public.roles where clave = 'humo_vitrina');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
set role authenticated;
do $$ declare v1 uuid := 'dddddddd-0000-4000-8000-000000000001'; begin
  if public.vehiculo_vitrina_previa(v1) is not null then raise exception 'la vista previa respondió por un vehículo que no ve'; end if;
  begin perform public.vehiculo_vitrina(v1, now(), false, null, null, null, false);
    raise exception 'despublicó un vehículo que no ve';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.roles_permisos set alcance = 'todos' where permiso_clave = 'vehiculos.ver' and rol_id = (select id from public.roles where clave = 'humo_vitrina');

-- El visitante.
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claim.role', 'anon', false);
set role anon;
do $$ declare w record; columnas text[]; v1 uuid := 'dddddddd-0000-4000-8000-000000000001';
  esperadas constant text[] := array['id', 'numero', 'origen', 'origen_nombre', 'titulo', 'marca', 'modelo', 'anio', 'categoria', 'precio', 'precio_hasta',
    'precio_nota', 'destacado', 'atributos', 'imagen', 'miniatura', 'actualizado_en']; begin
  if (select count(*) from web.vehiculos) <> 1 then raise exception 'la vitrina debía mostrar un vehículo y muestra %', (select count(*) from web.vehiculos); end if;
  select * into w from web.vehiculos;
  select array_agg(k) into columnas from jsonb_object_keys(to_jsonb(w)) k;
  if not (columnas @> esperadas and columnas <@ esperadas) then raise exception 'web.vehiculos expone otras columnas: %', columnas; end if;
  if w.id <> v1 or w.titulo <> 'Vitrina publicado' or w.precio <> 21500 or w.precio_hasta <> 23000 or w.precio_nota <> 'IVA incluido' or not w.destacado then raise exception 'la fila pública no es la esperada: %', to_jsonb(w); end if;
  if w.atributos <> '{"humo_color": "Blanco"}'::jsonb then raise exception 'atributos debía traer sólo el campo público: %', w.atributos; end if;
  if w.imagen <> v1 || '/' || repeat('1', 64) || '.webp' or w.miniatura <> v1 || '/' || repeat('2', 64) || '.webp' then raise exception 'la portada no es la esperada: % / %', w.imagen, w.miniatura; end if;
  -- Ni el costo, ni el precio de lista, ni el VIN, ni el kilometraje, ni la otra foto.
  if to_jsonb(w)::text ~ '17999|18500|JTFVTR|45123|3333' then raise exception 'se filtró un dato que no es público: %', to_jsonb(w); end if;
  begin perform 1 from interno.vitrina_vehiculos; raise exception 'anon leyó el esquema interno';
  exception when insufficient_privilege then null; end;
  begin perform public.vehiculo_vitrina_previa(v1); raise exception 'anon pidió la vista previa';
  exception when insufficient_privilege then null; end;
  begin perform public.vitrina_del_origen(v1); raise exception 'anon preguntó por la vitrina de un origen';
  exception when insufficient_privilege then null; end;
  begin perform public.vehiculo_vitrina(v1, now(), false, null, null, null, false); raise exception 'anon despublicó';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.vehiculos; raise exception 'anon leyó vehiculos';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.vehiculos_imagenes; raise exception 'anon leyó las fotos';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.vehiculos_interesados; raise exception 'anon leyó los interesados';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Las condiciones que no son del vehículo: lo que dice `vitrina_del_origen()` es lo que aplica la vista.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
do $$ declare oficina uuid; d jsonb; v1 uuid := 'dddddddd-0000-4000-8000-000000000001'; begin
  select id into oficina from public.origenes where clave = 'oficina';
  d := public.vitrina_del_origen(oficina);
  if not ((d ->> 'web_activa')::boolean and (d ->> 'origen_activo')::boolean and (d ->> 'origen_visible')::boolean) or jsonb_array_length(d -> 'fases_que_publican') <> 1 then
    raise exception 'vitrina_del_origen: %', d;
  end if;
  if exists (
    select 1 from interno.vitrina_vehiculos t join public.vehiculos v on v.id = t.id
    where t.origen_id = oficina and t.visible is distinct from (t.publicado and (d ->> 'web_activa')::boolean and (d ->> 'origen_activo')::boolean
      and (d ->> 'origen_visible')::boolean and coalesce(v.fase_id::text in (select jsonb_array_elements_text(d -> 'fases_que_publican')), false))) then
    raise exception 'vitrina_del_origen no coincide con lo que la vista deja ver';
  end if;
  -- Lo que está en la papelera no se ve, y vuelve a verse al salir.
  update public.vehiculos set eliminado_en = now() where id = v1;
  if (select count(*) from web.vehiculos) <> 0 then raise exception 'un vehículo en la papelera seguía en la vitrina'; end if;
  update public.vehiculos set eliminado_en = null where id = v1;
  -- El origen deja de estar visible, o la web se apaga: nada se ve.
  update public.ajustes_web set origenes_visibles = array(select id from public.origenes where clave = 'subasta_usa') where id = 1;
  if (select count(*) from web.vehiculos) <> 0 or (public.vitrina_del_origen(oficina) ->> 'origen_visible')::boolean then raise exception 'un origen no visible seguía en la vitrina'; end if;
  update public.ajustes_web set origenes_visibles = array(select id from public.origenes where clave in ('oficina', 'subasta_usa')) where id = 1;
  update public.integraciones set activa = false where clave = 'web_publica';
  if (select count(*) from web.vehiculos) <> 0 then raise exception 'con la web apagada la vitrina seguía mostrando'; end if;
  update public.integraciones set activa = true where clave = 'web_publica';
  if (select count(*) from web.vehiculos) <> 1 then raise exception 'la vitrina no volvió a mostrar el publicado'; end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test papelera de vehículos: enviar con versión y resultado parcial, lo que bloquea, despublicar, y restaurar entero o por partes
reset role;
select set_config('request.jwt.claim.sub', '', false);
-- Irene pasa a poder enviar a la papelera lo propio, en Oficina.
insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
select r.id, 'vehiculos.eliminar', o.id, 'propios' from public.roles r, public.origenes o where r.clave = 'humo_inventario' and o.clave = 'oficina';
insert into public.vehiculos (id, origen_id, titulo, vin, fase_id, lead_id, creado_por)
select x.id::uuid, o.id, x.titulo, x.vin,
       case x.fase when 'inicial' then (select f.id from public.fases f where f.flujo_id = fl.id and f.es_inicial)
                   when 'otra' then (select f.id from public.fases f where f.flujo_id = fl.id and f.nombre = 'Reservado') end,
       x.lead::uuid, x.creador::uuid
from public.origenes o join public.flujos fl on fl.origen_id = o.id,
  (values ('eeeeeeee-0000-4000-8000-000000000001', 'Papelera de Irene', 'JTFPAP00000000001', 'inicial', null, '00000000-0000-0000-0000-000000000008'),
          ('eeeeeeee-0000-4000-8000-000000000002', 'Papelera con lead', null, 'inicial', 'cccccccc-0000-4000-8000-000000000008', '00000000-0000-0000-0000-000000000001'),
          ('eeeeeeee-0000-4000-8000-000000000003', 'Papelera en otra fase', null, 'otra', null, '00000000-0000-0000-0000-000000000001'),
          ('eeeeeeee-0000-4000-8000-000000000004', 'Papelera con pago', null, null, null, '00000000-0000-0000-0000-000000000001'),
          ('eeeeeeee-0000-4000-8000-000000000005', 'Papelera con declaración', null, null, null, '00000000-0000-0000-0000-000000000001'),
          ('eeeeeeee-0000-4000-8000-000000000006', 'Papelera con repuestos', null, null, null, '00000000-0000-0000-0000-000000000001')
  ) as x (id, titulo, vin, fase, lead, creador)
where o.clave = 'oficina';
insert into public.pagos (vehiculo_id, concepto, moneda, monto, monto_base) values ('eeeeeeee-0000-4000-8000-000000000004', 'Seña', 'USD', 500, 500);
insert into public.declaraciones_aduana (id, numero) values ('eeeeeeee-0000-4000-8000-0000000000d1', 'HUMO-PAP-1');
insert into public.declaraciones_vehiculos (declaracion_id, vehiculo_id) values ('eeeeeeee-0000-4000-8000-0000000000d1', 'eeeeeeee-0000-4000-8000-000000000005');
insert into public.repuestos_proyectos (vehiculo_id, creado_por) values ('eeeeeeee-0000-4000-8000-000000000006', '00000000-0000-0000-0000-000000000001');
insert into public.vehiculos_interesados (vehiculo_id, lead_id) values ('dddddddd-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000000009');

-- Irene: lo propio sí, lo ajeno no; sin versión o con una vieja, tampoco.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000008', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ declare suyo uuid := 'eeeeeeee-0000-4000-8000-000000000001'; ajeno uuid := 'dddddddd-0000-4000-8000-000000000002';
  ver timestamptz; r jsonb; l jsonb; begin
  select actualizado_en into ver from public.vehiculos where id = suyo;
  if (select array_agg(x) from public.vehiculos_con_permiso(array[suyo, ajeno], 'vehiculos.eliminar') x) is distinct from array[suyo] then raise exception 'vehiculos_con_permiso debía dar sólo el propio'; end if;
  if exists (select 1 from public.vehiculos_con_permiso(array[suyo], 'leads.ver')) then raise exception 'vehiculos_con_permiso respondió por un permiso que no es de vehículos'; end if;

  r := public.vehiculos_papelera_enviar(jsonb_build_array(jsonb_build_object('id', suyo), jsonb_build_object('id', ajeno, 'actualizado_en', now())));
  if r ->> 'lote' is not null or jsonb_array_length(r -> 'rechazados') <> 2 then raise exception 'sin versión y sin permiso no debía enviar nada: %', r; end if;
  if not exists (select 1 from jsonb_array_elements(r -> 'rechazados') x where x ->> 'id' = suyo::text and x ->> 'motivo' like 'Falta la versión%') then raise exception 'sin versión debía decirlo: %', r; end if;
  if not exists (select 1 from jsonb_array_elements(r -> 'rechazados') x where x ->> 'id' = ajeno::text and x ->> 'codigo' = '42501' and x ->> 'titulo' = 'Vitrina sin publicar') then raise exception 'lo ajeno debía rechazarse por permiso, con su título: %', r; end if;
  r := public.vehiculos_papelera_enviar(jsonb_build_array(jsonb_build_object('id', suyo, 'actualizado_en', ver - interval '1 second')));
  if r -> 'rechazados' -> 0 ->> 'codigo' <> 'PT409' then raise exception 'una versión vieja debía ser PT409: %', r; end if;
  if r::text ~ suyo::text and r -> 'rechazados' -> 0 ->> 'motivo' ~ '[0-9a-f]{8}-[0-9a-f]{4}' then raise exception 'el motivo lleva un uuid: %', r; end if;
  begin perform public.vehiculos_papelera_enviar('[]'::jsonb); raise exception 'aceptó un envío vacío';
  exception when invalid_parameter_value then null; end;
  begin perform public.vehiculos_papelera_enviar('[{"id": "no-es-un-id"}]'::jsonb); raise exception 'aceptó un id que no lo es';
  exception when invalid_parameter_value then null; end;

  r := public.vehiculos_papelera_enviar(jsonb_build_array(jsonb_build_object('id', suyo, 'actualizado_en', ver), jsonb_build_object('id', ajeno, 'actualizado_en', now())));
  if jsonb_array_length(r -> 'enviados') <> 1 or jsonb_array_length(r -> 'rechazados') <> 1 or r ->> 'lote' is null then raise exception 'esperaba uno enviado y uno rechazado: %', r; end if;
  if (select count(*) from public.vehiculos where id = suyo) <> 0 then raise exception 'la RESTRICTIVE debe esconder lo enviado'; end if;
  if (select count(*) from public.vehiculos where id = ajeno) <> 1 then raise exception 'el rechazado dejó de verse'; end if;
  l := public.vehiculos_papelera_listar();
  if jsonb_array_length(l) <> 1 or l -> 0 ->> 'id' <> r ->> 'lote' or not (l -> 0 ->> 'es_mio')::boolean or l -> 0 ->> 'creado_por_nombre' <> 'Irene Paz'
     or l -> 0 ->> 'actualizado_en' <> r ->> 'actualizado_en' or jsonb_array_length(l -> 0 -> 'vehiculos') <> 1 or l -> 0 -> 'vehiculos' -> 0 ->> 'titulo' <> 'Papelera de Irene' then
    raise exception 'la papelera de Irene no trae su lote: %', l;
  end if;
  if (l -> 0 ->> 'purga_el')::timestamptz <> (l -> 0 ->> 'creado_en')::timestamptz + make_interval(days => 30) then raise exception 'purga_el no es creado_en + papelera_dias: %', l; end if;
  begin perform public._vehiculo_a_papelera(ajeno, now(), gen_random_uuid()); raise exception 'una persona de la app llamó a la función interna';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- La dueña: lo que bloquea, lo que despublica, y lo que se conserva.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare publicado uuid := 'dddddddd-0000-4000-8000-000000000001'; r jsonb; l jsonb; m text; begin
  r := public.vehiculos_papelera_enviar((
    select jsonb_agg(jsonb_build_object('id', v.id, 'actualizado_en', v.actualizado_en))
    from public.vehiculos v where v.id = publicado or v.titulo like 'Papelera con %' or v.titulo = 'Papelera en otra fase'));
  if jsonb_array_length(r -> 'enviados') <> 1 or r -> 'enviados' -> 0 ->> 'id' <> publicado::text or not (r -> 'enviados' -> 0 ->> 'despublicado')::boolean then raise exception 'sólo debía entrar el publicado, y decir que se despublicó: %', r; end if;
  if jsonb_array_length(r -> 'rechazados') <> 5 or exists (select 1 from jsonb_array_elements(r -> 'rechazados') x where x ->> 'codigo' <> '23514') then raise exception 'esperaba cinco bloqueados: %', r; end if;
  select string_agg(x ->> 'motivo', ' | ' order by x ->> 'id') into m from jsonb_array_elements(r -> 'rechazados') x;
  if m not like 'Está vinculado a un lead%| Está en «Reservado»%| Tiene pagos o gastos%| Está en una declaración aduanera%| Tiene un proyecto de repuestos%' then raise exception 'los motivos no son los esperados: %', m; end if;
  -- Ve toda la papelera: su lote y el de Irene.
  l := public.vehiculos_papelera_listar();
  if jsonb_array_length(l) <> 2 then raise exception 'quien puede vaciar la papelera debía ver los dos lotes: %', l; end if;
end $$;
reset role;
do $$ declare publicado uuid := 'dddddddd-0000-4000-8000-000000000001'; begin
  if (select publicado_web or destacado_web or precio_web is distinct from 21500 from public.vehiculos where id = publicado) then raise exception 'enviar debía despublicar y conservar el precio'; end if;
  if (select count(*) from web.vehiculos) <> 0 then raise exception 'lo enviado a la papelera seguía en la vitrina'; end if;
  if (select count(*) from public.vehiculos_interesados where vehiculo_id = publicado) <> 1 then raise exception 'enviar a la papelera perdió a los interesados'; end if;
  if (select count(*) from public.lotes_papelera where tipo = 'vehiculos') <> 2 then raise exception 'debían quedar dos lotes, uno por envío'; end if;
  -- Otro vehículo toma el VIN del que Irene mandó a la papelera.
  insert into public.vehiculos (id, origen_id, titulo, vin, creado_por)
  select 'eeeeeeee-0000-4000-8000-000000000009', origen_id, 'Papelera con el VIN tomado', 'JTFPAP00000000001', '00000000-0000-0000-0000-000000000001' from public.vehiculos where id = publicado;
end $$;
select set_config('humo.lote_de_la_duena', (select l.id::text from public.lotes_papelera l where l.tipo = 'vehiculos' and l.creado_por = '00000000-0000-0000-0000-000000000001'), false);

-- Restaurar: quién, con qué versión, y qué pasa con un VIN que ya tomó otro.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000008', false);
set role authenticated;
do $$ declare suyo uuid := 'eeeeeeee-0000-4000-8000-000000000001'; l jsonb; mio jsonb; r jsonb; m text; e text; begin
  l := public.vehiculos_papelera_listar();
  mio := l -> 0;
  begin perform public.vehiculos_papelera_restaurar((mio ->> 'id')::uuid, null); raise exception 'restauró sin versión';
  exception when others then get stacked diagnostics m = message_text; if m not like 'Falta la versión%' then raise; end if; end;
  begin perform public.vehiculos_papelera_restaurar((mio ->> 'id')::uuid, (mio ->> 'actualizado_en')::timestamptz - interval '1 second'); raise exception 'restauró con una versión vieja';
  exception when others then get stacked diagnostics m = message_text, e = returned_sqlstate;
    if e <> 'PT409' or m not like 'Cambiaste este lote de la papelera%' then raise exception 'conflicto del lote: % %', e, m; end if; end;
  begin perform public.vehiculos_papelera_restaurar(current_setting('humo.lote_de_la_duena')::uuid, now()); raise exception 'restauró un lote que no envió';
  exception when insufficient_privilege then null; end;

  r := public.vehiculos_papelera_restaurar((mio ->> 'id')::uuid, (mio ->> 'actualizado_en')::timestamptz);
  if jsonb_array_length(r -> 'restaurados') <> 0 or (r ->> 'quedan')::int <> 1 or r -> 'pendientes' -> 0 ->> 'motivo' not like 'Ya hay un vehículo con el VIN JTFPAP00000000001%' then raise exception 'con el VIN tomado debía quedar pendiente: %', r; end if;
  if r ->> 'actualizado_en' <> mio ->> 'actualizado_en' then raise exception 'sin restaurar nada, la versión del lote no debía moverse'; end if;
  if (select count(*) from public.vehiculos where id = suyo) <> 0 then raise exception 'restauró pese al VIN repetido'; end if;
end $$;
reset role;
delete from public.vehiculos where id = 'eeeeeeee-0000-4000-8000-000000000009';
set role authenticated;
do $$ declare suyo uuid := 'eeeeeeee-0000-4000-8000-000000000001'; mio jsonb; r jsonb; begin
  mio := public.vehiculos_papelera_listar() -> 0;
  r := public.vehiculos_papelera_restaurar((mio ->> 'id')::uuid, (mio ->> 'actualizado_en')::timestamptz);
  if jsonb_array_length(r -> 'restaurados') <> 1 or (r ->> 'quedan')::int <> 0 or r ->> 'actualizado_en' = mio ->> 'actualizado_en' then raise exception 'debía restaurar y mover la versión: %', r; end if;
  if (select count(*) from public.vehiculos where id = suyo and lote_papelera_id is null) <> 1 then raise exception 'el restaurado no volvió al inventario'; end if;
  if jsonb_array_length(public.vehiculos_papelera_listar()) <> 0 then raise exception 'un lote sin nada adentro seguía en la papelera'; end if;
end $$;
reset role;

-- El lote de la dueña vuelve por partes, y sin publicar. Las genéricas no lo tocan.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare publicado uuid := 'dddddddd-0000-4000-8000-000000000001'; v2 uuid := 'dddddddd-0000-4000-8000-000000000002'; v3 uuid := 'dddddddd-0000-4000-8000-000000000003';
  r jsonb; l jsonb; lote uuid; begin
  r := public.vehiculos_papelera_enviar((select jsonb_agg(jsonb_build_object('id', v.id, 'actualizado_en', v.actualizado_en)) from public.vehiculos v where v.id in (v2, v3)));
  if jsonb_array_length(r -> 'enviados') <> 2 then raise exception 'esperaba un lote de dos: %', r; end if;
  lote := (r ->> 'lote')::uuid;
  begin perform public.papelera_restaurar(lote); raise exception 'la genérica restauró un lote de vehículos';
  exception when invalid_parameter_value then null; end;
  begin perform public.papelera_purgar(lote); raise exception 'la genérica purgó un lote de vehículos';
  exception when invalid_parameter_value then null; end;
  r := public.vehiculos_papelera_restaurar(lote, (r ->> 'actualizado_en')::timestamptz, array[v2]);
  if jsonb_array_length(r -> 'restaurados') <> 1 or (r ->> 'quedan')::int <> 1 then raise exception 'restaurar una parte: %', r; end if;
  if (select count(*) from public.vehiculos where id in (v2, v3)) <> 1 then raise exception 'debía volver uno solo'; end if;
  -- El otro sigue adentro y el lote, abierto. Se restaura para dejar el inventario como estaba.
  r := public.vehiculos_papelera_restaurar(lote, (r ->> 'actualizado_en')::timestamptz);
  if (r ->> 'quedan')::int <> 0 then raise exception 'el lote debía quedar vacío: %', r; end if;

  select x into l from jsonb_array_elements(public.vehiculos_papelera_listar()) x where x -> 'vehiculos' -> 0 ->> 'id' = publicado::text;
  r := public.vehiculos_papelera_restaurar((l ->> 'id')::uuid, (l ->> 'actualizado_en')::timestamptz);
  if (select publicado_web from public.vehiculos where id = publicado) then raise exception 'un vehículo restaurado volvió publicado'; end if;
  if (select count(*) from public.vehiculos_interesados where vehiculo_id = publicado) <> 1 then raise exception 'restaurar perdió a los interesados'; end if;
end $$;
reset role;
do $$ begin
  if exists (select 1 from public.lotes_papelera l where l.tipo = 'vehiculos' and l.restaurado_en is null) then raise exception 'un lote vacío no quedó cerrado'; end if;
  if exists (select 1 from public.lotes_papelera l where l.tipo = 'vehiculos' and (l.resumen ->> 'restaurados')::int <> (l.resumen ->> 'cantidad')::int) then raise exception 'el resumen del lote no cuenta lo restaurado'; end if;
  if exists (select 1 from public.vehiculos where eliminado_en is not null or lote_papelera_id is not null) then raise exception 'quedó algo en la papelera'; end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claim.role', 'anon', false);
set role anon;
do $$ begin
  begin perform public.vehiculos_papelera_listar(); raise exception 'anon listó la papelera';
  exception when insufficient_privilege then null; end;
  begin perform public.vehiculos_papelera_enviar('[]'::jsonb); raise exception 'anon envió a la papelera';
  exception when insufficient_privilege then null; end;
  begin perform public.vehiculos_papelera_restaurar(gen_random_uuid(), now()); raise exception 'anon restauró';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test purga: pide permiso y la versión del lote, no se lleva dinero, encola sólo lo que nadie más usa, y la automática no purga lo que la manual bloquea
reset role;
select set_config('request.jwt.claim.sub', '', false);
delete from public.cola_gc_storage;
-- En la carpeta del publicado queda además un objeto sin fila (una subida que no se registró).
insert into storage.objects (bucket_id, name) values ('vehiculos', 'dddddddd-0000-4000-8000-000000000001/' || repeat('9', 64) || '.webp');
-- Y otra fila usa su portada: el objeto no se puede limpiar mientras exista.
alter table public.vehiculos_imagenes disable trigger trg_vehiculo_imagen_integridad;
insert into public.vehiculos_imagenes (vehiculo_id, hash, ruta, ruta_miniatura, ancho, alto, bytes, orden)
values ('dddddddd-0000-4000-8000-000000000002', repeat('7', 64), 'dddddddd-0000-4000-8000-000000000001/' || repeat('1', 64) || '.webp',
        'dddddddd-0000-4000-8000-000000000002/' || repeat('2', 64) || '.webp', 1600, 1200, 300000, 2);
alter table public.vehiculos_imagenes enable trigger trg_vehiculo_imagen_integridad;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ declare r jsonb; begin
  -- Un lote de tres: el publicado (con fotos), el de Irene y el que después va a tener un pago.
  r := public.vehiculos_papelera_enviar((
    select jsonb_agg(jsonb_build_object('id', v.id, 'actualizado_en', v.actualizado_en)) from public.vehiculos v
    where v.id in ('dddddddd-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000003', 'eeeeeeee-0000-4000-8000-000000000001')));
  if jsonb_array_length(r -> 'enviados') <> 3 then raise exception 'esperaba un lote de tres: %', r; end if;
  perform set_config('humo.lote', r ->> 'lote', false);
  perform set_config('humo.version', r ->> 'actualizado_en', false);
end $$;
reset role;
-- Mientras está en la papelera, a uno le registran un pago.
insert into public.pagos (vehiculo_id, concepto, moneda, monto, monto_base) values ('dddddddd-0000-4000-8000-000000000003', 'Seña', 'USD', 300, 300);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000008', false);
set role authenticated;
do $$ begin
  begin perform public.vehiculos_papelera_purgar(current_setting('humo.lote')::uuid, current_setting('humo.version')::timestamptz); raise exception 'purgó sin vehiculos.papelera.purgar';
  exception when insufficient_privilege then null; end;
  begin perform public._papelera_purgar_vehiculos(current_setting('humo.lote')::uuid, null); raise exception 'una persona de la app llamó a la purga interna';
  exception when insufficient_privilege then null; end;
  begin perform public.papelera_purgar_vencidos(); raise exception 'una persona de la app corrió la purga automática';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare lote uuid := current_setting('humo.lote')::uuid; ver timestamptz := current_setting('humo.version')::timestamptz;
  publicado uuid := 'dddddddd-0000-4000-8000-000000000001'; con_pago uuid := 'dddddddd-0000-4000-8000-000000000003'; r jsonb; l jsonb; m text; e text; begin
  begin perform public.vehiculos_papelera_purgar(lote, null); raise exception 'purgó sin versión';
  exception when others then get stacked diagnostics m = message_text; if m not like 'Falta la versión%' then raise; end if; end;
  -- El que tiene un pago no se purga, y lo dice la lista.
  select x into l from jsonb_array_elements(public.vehiculos_papelera_listar()) x where x ->> 'id' = lote::text;
  if not exists (select 1 from jsonb_array_elements(l -> 'vehiculos') x where x ->> 'id' = con_pago::text and x ->> 'motivo_de_bloqueo' like 'Tiene pagos%') then raise exception 'la lista no dice que uno no se purga: %', l; end if;
  if (select (x ->> 'fotos')::int from jsonb_array_elements(l -> 'vehiculos') x where x ->> 'id' = publicado::text) <> 2 then raise exception 'la lista no cuenta las fotos: %', l; end if;

  r := public.vehiculos_papelera_purgar(lote, ver, array[publicado, con_pago]);
  if jsonb_array_length(r -> 'purgados') <> 1 or r -> 'purgados' -> 0 ->> 'titulo' <> 'Vitrina publicado' or (r ->> 'quedan')::int <> 2
     or r -> 'bloqueados' -> 0 ->> 'motivo' not like 'Tiene pagos%' then raise exception 'purgar una parte: %', r; end if;
  -- Quien tenía la lista de antes ya no purga con ella: otra persona (acá, ella misma) cambió el lote.
  begin perform public.vehiculos_papelera_purgar(lote, ver); raise exception 'purgó con la versión de antes';
  exception when others then get stacked diagnostics m = message_text, e = returned_sqlstate;
    if e <> 'PT409' or m not like '%este lote de la papelera%' then raise exception 'conflicto de la purga: % %', e, m; end if; end;
  perform set_config('humo.version', r ->> 'actualizado_en', false);
end $$;
reset role;
-- Lo que sigue corre sin sesión, como el job.
select set_config('request.jwt.claim.sub', '', false);
do $$ declare publicado uuid := 'dddddddd-0000-4000-8000-000000000001'; n int; r record; begin
  if exists (select 1 from public.vehiculos where id = publicado) or exists (select 1 from public.vehiculos_imagenes where vehiculo_id = publicado) then raise exception 'la purga no borró el vehículo y sus fotos'; end if;
  if (select count(*) from public.pagos where vehiculo_id = 'dddddddd-0000-4000-8000-000000000003') <> 1 then raise exception 'la purga se llevó un pago'; end if;
  -- En la cola: la miniatura, la segunda foto (dos objetos) y el objeto sin fila. La portada no: otra fila la usa.
  select count(*) into n from public.cola_gc_storage c where c.bucket = 'vehiculos' and c.ruta like publicado || '/%';
  if n <> 4 then raise exception 'esperaba 4 objetos encolados y hay %: %', n, (select array_agg(left(split_part(ruta, '/', 2), 2)) from public.cola_gc_storage); end if;
  if exists (select 1 from public.cola_gc_storage c where c.ruta = publicado || '/' || repeat('1', 64) || '.webp') then raise exception 'encoló un objeto que otra fila sigue usando'; end if;
  -- Y se reclaman ya, sin esperar las 24 h.
  n := 0;
  for r in select * from public.storage_gc_reclamar(100) loop
    n := n + 1;
    if r.ruta not like publicado || '/%' then raise exception 'reclamó algo que no era de la purga: %', r.ruta; end if;
  end loop;
  if n <> 4 then raise exception 'lo purgado debía reclamarse de inmediato: reclamó %', n; end if;
  if public.storage_gc_confirmar('vehiculos', (select array_agg(ruta) from public.cola_gc_storage where reclamado_en is not null)) <> 4 then raise exception 'no confirmó lo reclamado'; end if;
  delete from public.vehiculos_imagenes where hash = repeat('7', 64);

  -- La automática: sólo lo vencido, y nunca lo que la manual bloquea.
  if public.papelera_purgar_vencidos() <> 0 then raise exception 'la purga automática se llevó un lote que no venció'; end if;
  update public.lotes_papelera set creado_en = now() - interval '31 days' where id = current_setting('humo.lote')::uuid;
  if public.papelera_purgar_vencidos() <> 1 then raise exception 'la purga automática debía purgar uno solo'; end if;
  if exists (select 1 from public.vehiculos where id = 'eeeeeeee-0000-4000-8000-000000000001') then raise exception 'la automática no purgó el vencido'; end if;
  if not exists (select 1 from public.vehiculos where id = 'dddddddd-0000-4000-8000-000000000003' and eliminado_en is not null) then raise exception 'la automática purgó (o sacó de la papelera) uno con un pago'; end if;
  if (select purgado_en is not null or (resumen ->> 'purgados')::int <> 2 from public.lotes_papelera where id = current_setting('humo.lote')::uuid) then raise exception 'el lote con un bloqueado no debía cerrarse, y debía contar dos purgados'; end if;
  if not exists (select 1 from public.actividad a where a.tabla = 'lotes_papelera' and a.registro_id = current_setting('humo.lote') and a.actor_id is null and (a.detalle ->> 'automatica')::boolean) then raise exception 'la purga automática no quedó registrada como tal'; end if;
  -- Corre otra vez y no se rompe ni purga nada.
  if public.papelera_purgar_vencidos() <> 0 then raise exception 'la automática volvió a purgar'; end if;
  -- Sin el pago, el último se purga y el lote se cierra.
  delete from public.pagos where vehiculo_id = 'dddddddd-0000-4000-8000-000000000003';
  if public.papelera_purgar_vencidos() <> 1 then raise exception 'sin el pago debía purgarse'; end if;
  if (select purgado_en is null from public.lotes_papelera where id = current_setting('humo.lote')::uuid) then raise exception 'el lote vacío no quedó cerrado'; end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claim.role', 'anon', false);
set role anon;
do $$ begin
  begin perform public.vehiculos_papelera_purgar(gen_random_uuid(), now()); raise exception 'anon purgó';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test storage-gc: el pase vale una vez y diez minutos, los jobs quedan programados, y nadie de la app dispara ni canjea
reset role;
select set_config('request.jwt.claim.sub', '', false);
do $$ declare n bigint; p uuid; direccion constant text := 'http://api.local:8000/functions/v1/storage-gc'; begin
  if not exists (select 1 from cron.job j where j.jobname = 'papelera-purgar' and j.schedule = '30 3 * * *' and j.command like '%papelera_purgar_vencidos()%') then raise exception 'la purga automática no quedó programada'; end if;
  begin perform public.storage_gc_disparar('http://otro.sitio/llevarse-el-pase'); raise exception 'mandó un pase a una dirección que no es la función';
  exception when invalid_parameter_value then null; end;
  begin perform public.storage_gc_programar(null); raise exception 'programó sin dirección';
  exception when invalid_parameter_value then null; end;
  perform public.storage_gc_programar('http://vieja.local/functions/v1/storage-gc');
  perform public.storage_gc_programar(direccion);
  if (select count(*) from cron.job j where j.jobname = 'storage-gc') <> 1 or (select j.command from cron.job j where j.jobname = 'storage-gc') <> format('select public.storage_gc_disparar(%L)', direccion) then
    raise exception 'reprogramar debía reemplazar el job: %', (select jsonb_agg(to_jsonb(j)) from cron.job j);
  end if;

  n := public.storage_gc_disparar(direccion);
  select (x.body ->> 'pase')::uuid into p from net.pedidos x where x.id = n and x.url = direccion;
  if p is null or not exists (select 1 from public.cola_gc_pases c where c.pase = p and c.usado_en is null) then raise exception 'disparar no mandó un pase vigente'; end if;
  if public.storage_gc_abrir(gen_random_uuid()) then raise exception 'aceptó un pase inventado'; end if;
  if not public.storage_gc_abrir(p) then raise exception 'rechazó el pase que acababa de emitir'; end if;
  if public.storage_gc_abrir(p) then raise exception 'el mismo pase valió dos veces'; end if;
  n := public.storage_gc_disparar(direccion);
  select (x.body ->> 'pase')::uuid into p from net.pedidos x where x.id = n;
  update public.cola_gc_pases set creado_en = now() - interval '11 minutes' where pase = p;
  if public.storage_gc_abrir(p) then raise exception 'aceptó un pase vencido'; end if;
  -- Los pases viejos se van solos.
  update public.cola_gc_pases set creado_en = now() - interval '8 days' where pase = p;
  perform public.storage_gc_disparar(direccion);
  if exists (select 1 from public.cola_gc_pases c where c.pase = p) then raise exception 'no limpió los pases viejos'; end if;
end $$;
select set_config('request.jwt.claim.role', 'service_role', false);
set role service_role;
do $$ begin
  if public.storage_gc_abrir(gen_random_uuid()) then raise exception 'service_role canjeó un pase inventado'; end if;
end $$;
reset role;
-- Irene no dispara, no canjea, no programa, no mira los pases, y no se entera de la cola.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000008', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ begin
  begin perform public.storage_gc_disparar('http://api.local:8000/functions/v1/storage-gc'); raise exception 'una persona de la app disparó la limpieza';
  exception when insufficient_privilege then null; end;
  begin perform public.storage_gc_abrir(gen_random_uuid()); raise exception 'una persona de la app canjeó un pase';
  exception when insufficient_privilege then null; end;
  begin perform public.storage_gc_programar('http://api.local:8000/functions/v1/storage-gc'); raise exception 'una persona de la app programó el job';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.cola_gc_pases; raise exception 'una persona de la app leyó los pases';
  exception when insufficient_privilege then null; end;
  if public.storage_gc_pendiente() is not null then raise exception 'sin vehiculos.papelera.purgar no debía saber de la cola'; end if;
end $$;
reset role;
-- La dueña sí: nada pendiente, hasta que algo lleva más de tres horas pudiendo borrarse.
delete from public.cola_gc_storage;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ begin
  if (public.storage_gc_pendiente() ->> 'objetos')::int <> 0 then raise exception 'con la cola vacía no hay nada pendiente'; end if;
end $$;
reset role;
insert into public.cola_gc_storage (bucket, ruta, encolado_en) values
  ('vehiculos', 'gc/recien-reclamable.webp', now() - interval '25 hours'),
  ('vehiculos', 'gc/atrasado.webp', now() - interval '30 hours');
set role authenticated;
do $$ declare d jsonb := public.storage_gc_pendiente(); begin
  if (d ->> 'objetos')::int <> 1 or (d ->> 'desde')::timestamptz > now() - interval '5 hours' then raise exception 'esperaba un objeto atrasado desde hace seis horas: %', d; end if;
end $$;
reset role;
delete from public.cola_gc_storage;
select set_config('request.jwt.claim.sub', '', false);

-- @test apibara: estado y fecha derivados, alta y refresco por RPC con versión, repetidos, contexto y datos nuevos
reset role;
-- Las reglas internas (nadie de la app las ejecuta): se prueban como dueño de la base.
do $$ declare raw jsonb := '{"auction": {"state": "open", "auction_at": "2030-01-05T18:00:00+00:00"}}'; o uuid; begin
  if public._vehiculo_subasta_desde(raw) ->> 'estado_subasta' <> 'abierta' then raise exception 'una subasta futura debía estar abierta'; end if;
  if public._vehiculo_subasta_desde('{"auction": {"state": "open", "lot_sub_status": "Live"}}') ->> 'estado_subasta' <> 'en_vivo' then raise exception 'esperaba en vivo'; end if;
  if public._vehiculo_subasta_desde('{"auction": {"state": "open", "outcome_status": "Not Sold"}}') ->> 'estado_subasta' <> 'terminada' then raise exception 'esperaba terminada'; end if;
  if public._vehiculo_subasta_desde('{"auction": {"state": "open", "lot_removed": true}}') ->> 'estado_subasta' <> 'terminada' then raise exception 'un lote retirado terminó'; end if;
  if public._vehiculo_subasta_desde('{"auction": {"state": "open", "auction_ended_at": "2026-10-01T10:00:00+00:00", "outcome_status": "Sold"}}') ->> 'estado_subasta' <> 'vendida' then raise exception 'vendida gana a terminada'; end if;
  if public._vehiculo_subasta_desde('{"auction": {"state": "open", "sold_buy_now": true}}') ->> 'estado_subasta' <> 'vendida' then raise exception 'la compra inmediata vendió'; end if;
  if public._vehiculo_subasta_desde('{}') ->> 'estado_subasta' is not null then raise exception 'sin datos no hay estado'; end if;
  if public._vehiculo_subasta_desde('{"auction": {"auction_at": "no es fecha"}}') ->> 'subasta_en' is not null then raise exception 'una fecha rota no debía tumbar el alta'; end if;
  select id into o from public.origenes where clave = 'subasta_usa';
  begin
    insert into public.origenes_campos (origen_id, clave, etiqueta, tipo, clave_apibara) values (o, 'repetido_humo', 'Repetido', 'texto', 'vehicle_specs.exterior_color');
    raise exception 'dos campos del mismo origen llenaron la misma ruta de apibara';
  exception when unique_violation then null; end;
  if public.origen_apibara_completar(o) <> 0 then raise exception 'completar un origen completo no debía sumar nada'; end if;
  if public.origen_apibara_completar((select id from public.origenes where clave = 'oficina')) <> 0 then raise exception 'un origen manual no recibe el catálogo'; end if;
end $$;
-- Las consultas las guarda la edge function (service_role) a nombre de quien consultó: así sólo
-- ella origina el bruto del que la base deriva fecha y estado.
do $$ declare usa uuid; oficina uuid; raw jsonb; bruno uuid := '00000000-0000-0000-0000-000000000009'; begin
  select id into usa from public.origenes where clave = 'subasta_usa';
  select id into oficina from public.origenes where clave = 'oficina';
  raw := jsonb_build_object('lot_number', '77700001', 'novedad', jsonb_build_object('dato', 5),
    'auction', jsonb_build_object('state', 'open', 'auction_at', '2030-01-05T18:00:00+00:00'),
    'pricing', jsonb_build_object('current_bid_usd', 2500));
  perform set_config('humo.c_alta', public.apibara_consulta_guardar(bruno, usa, raw)::text, false);
  perform set_config('humo.c_otro', public.apibara_consulta_guardar(bruno, usa, raw)::text, false);
  perform set_config('humo.c_vendida', public.apibara_consulta_guardar(bruno, usa,
    jsonb_set(jsonb_set(raw, '{auction,outcome_status}', '"Sold"'), '{pricing,current_bid_usd}', '4100'))::text, false);
  perform set_config('humo.c_ajena', public.apibara_consulta_guardar('00000000-0000-0000-0000-000000000001', usa, raw)::text, false);
  perform set_config('humo.c_vieja', public.apibara_consulta_guardar(bruno, usa, raw)::text, false);
  update public.apibara_consultas set creado_en = now() - interval '25 hours' where id = current_setting('humo.c_vieja')::uuid;
  -- Lo que la función no puede guardar: un origen manual, algo que no es un objeto, algo desmesurado.
  begin perform public.apibara_consulta_guardar(bruno, oficina, raw); raise exception 'guardó una consulta de un origen manual';
  exception when invalid_parameter_value then null; end;
  begin perform public.apibara_consulta_guardar(bruno, usa, '[1, 2]'); raise exception 'aceptó una respuesta que no es un objeto';
  exception when invalid_parameter_value then null; end;
  begin perform public.apibara_consulta_guardar(bruno, usa, jsonb_build_object('relleno', repeat('x', 600000))); raise exception 'aceptó una respuesta de más de 512 KB';
  exception when invalid_parameter_value then null; end;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000009', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ declare
  usa uuid; oficina uuid; v uuid := 'cccccccc-0000-4000-8000-000000000001'; r jsonb; ver timestamptz; raw jsonb; n int;
  c_alta uuid := current_setting('humo.c_alta')::uuid; c_vendida uuid := current_setting('humo.c_vendida')::uuid;
begin
  select id into usa from public.origenes where clave = 'subasta_usa';
  select id into oficina from public.origenes where clave = 'oficina';
  raw := jsonb_build_object('lot_number', '77700001', 'novedad', jsonb_build_object('dato', 5),
    'auction', jsonb_build_object('state', 'open', 'auction_at', '2030-01-05T18:00:00+00:00'),
    'pricing', jsonb_build_object('current_bid_usd', 2500));

  -- Quien crea o edita no escribe el bruto ni lo que la base deriva de él: ni por la tabla ni por
  -- la de consultas, que no lee ni escribe.
  if has_column_privilege('authenticated', 'public.vehiculos', 'apibara_raw', 'UPDATE')
     or has_column_privilege('authenticated', 'public.vehiculos', 'estado_subasta', 'UPDATE')
     or has_column_privilege('authenticated', 'public.vehiculos', 'subasta_en', 'UPDATE')
     or has_column_privilege('authenticated', 'public.vehiculos', 'subasta_fin_en', 'UPDATE')
     or has_column_privilege('authenticated', 'public.vehiculos', 'apibara_sync_en', 'UPDATE')
     or has_column_privilege('authenticated', 'public.vehiculos', 'importado_apibara', 'UPDATE')
     or has_column_privilege('authenticated', 'public.vehiculos', 'apibara_raw', 'INSERT') then
    raise exception 'authenticated puede escribir el bruto o las columnas de la subasta'; end if;
  begin perform 1 from public.apibara_consultas limit 1; raise exception 'Bruno leyó las consultas';
  exception when insufficient_privilege then null; end;
  begin insert into public.apibara_consultas (origen_id, creado_por, raw) values (usa, (select auth.uid()), '{}'); raise exception 'Bruno guardó una consulta';
  exception when insufficient_privilege then null; end;
  begin perform public.apibara_consulta_guardar((select auth.uid()), usa, '{}'); raise exception 'Bruno llamó a la función que guarda consultas';
  exception when insufficient_privilege then null; end;
  -- La vieja firma (el bruto como parámetro) ya no existe.
  if to_regprocedure('public.vehiculo_crear(uuid, uuid, jsonb, jsonb)') is not null
     or to_regprocedure('public.vehiculo_subasta_refrescar(uuid, timestamptz, jsonb, jsonb)') is not null then
    raise exception 'quedó la firma que recibía el bruto del navegador'; end if;

  -- Lo que se rechaza al crear: una consulta en un origen manual, ajena, vencida o inventada.
  begin perform public.vehiculo_crear(gen_random_uuid(), oficina, '{"titulo": "Manual con consulta"}', c_alta); raise exception 'un origen manual guardó datos de apibara';
  exception when invalid_parameter_value then null; end;
  begin perform public.vehiculo_crear(gen_random_uuid(), usa, '{"titulo": "Consulta ajena"}', current_setting('humo.c_ajena')::uuid); raise exception 'usó la consulta de otra persona';
  exception when invalid_parameter_value then null; end;
  begin perform public.vehiculo_crear(gen_random_uuid(), usa, '{"titulo": "Consulta vieja"}', current_setting('humo.c_vieja')::uuid); raise exception 'usó una consulta vencida';
  exception when invalid_parameter_value then null; end;
  begin perform public.vehiculo_crear(gen_random_uuid(), usa, '{"titulo": "Consulta inventada"}', gen_random_uuid()); raise exception 'usó una consulta que no existe';
  exception when invalid_parameter_value then null; end;
  -- Sin consulta, el alta es manual aunque el origen sea de subasta: sin bruto y no importado.
  r := public.vehiculo_crear(gen_random_uuid(), usa, '{"titulo": "Subasta a mano"}');
  if (select apibara_raw is not null or importado_apibara or estado_subasta is not null from public.vehiculos where id = (r ->> 'id')::uuid) then
    raise exception 'un alta sin consulta quedó con datos de apibara'; end if;

  -- El alta con la consulta: fecha, estado y último refresco en sus columnas, el bruto entero y
  -- la marca de importado.
  r := public.vehiculo_crear(v, usa,
    '{"titulo": "2030 Apibara Humo", "vin": "JTMW1RFV8MD099999", "lote": "77700001", "plataforma": "copart", "atributos": {"color": "Gris"}}', c_alta);
  raw := public.apibara_consulta_leer(c_alta);
  if not (select importado_apibara from public.vehiculos where id = v) then raise exception 'el alta con consulta no quedó importada'; end if;
  if (select estado_subasta::text from public.vehiculos where id = v) <> 'abierta' then raise exception 'el alta no dejó el estado'; end if;
  if (select subasta_en from public.vehiculos where id = v) <> '2030-01-05T18:00:00+00:00'::timestamptz then raise exception 'el alta no dejó la fecha'; end if;
  if (select apibara_sync_en from public.vehiculos where id = v) is null then raise exception 'el alta no selló el último refresco'; end if;
  if (select apibara_raw from public.vehiculos where id = v) is distinct from raw then raise exception 'el alta no guardó el bruto entero'; end if;
  -- Reintentar tras perder la respuesta devuelve el mismo vehículo, sin duplicar.
  if (public.vehiculo_crear(v, usa, '{"titulo": "2030 Apibara Humo"}', c_alta) ->> 'id')::uuid <> v then raise exception 'reintentar el alta no devolvió el mismo vehículo'; end if;
  -- La misma consulta no sirve para otro vehículo.
  begin perform public.vehiculo_crear(gen_random_uuid(), usa, '{"titulo": "Otra con la misma"}', c_alta); raise exception 'una consulta sirvió para dos vehículos';
  exception when invalid_parameter_value then null; end;

  -- Refrescar: con la versión, lo que la app decidió actualizar, y fecha, estado y bruto siempre.
  ver := (r ->> 'actualizado_en')::timestamptz;
  begin perform public.vehiculo_subasta_refrescar(v, null, c_vendida); raise exception 'refrescó sin versión';
  exception when raise_exception then if sqlerrm not like 'Falta la versión%' then raise; end if; end;
  begin perform public.vehiculo_subasta_refrescar(v, ver - interval '1 day', c_vendida); raise exception 'refrescó con una versión vieja';
  exception when sqlstate 'PT409' then null; end;
  begin perform public.vehiculo_subasta_refrescar(v, ver, c_vendida, '{"fase_id": "00000000-0000-0000-0000-000000000000"}'); raise exception 'refrescar aceptó fase_id';
  exception when invalid_parameter_value then null; end;
  begin perform public.vehiculo_subasta_refrescar(v, ver, null); raise exception 'refrescó sin consulta';
  exception when invalid_parameter_value then null; end;
  begin perform public.vehiculo_subasta_refrescar(v, ver, current_setting('humo.c_ajena')::uuid); raise exception 'refrescó con la consulta de otra persona';
  exception when invalid_parameter_value then null; end;
  begin perform public.apibara_consulta_leer(current_setting('humo.c_ajena')::uuid); raise exception 'Bruno leyó la consulta de otra persona';
  exception when invalid_parameter_value then null; end;
  r := public.vehiculo_subasta_refrescar(v, ver, c_vendida, '{"atributos": {"color": "Negro"}}');
  if (r ->> 'estado_subasta') <> 'vendida' or (select estado_subasta::text from public.vehiculos where id = v) <> 'vendida' then raise exception 'refrescar no dejó el estado nuevo'; end if;
  if (select atributos ->> 'color' from public.vehiculos where id = v) <> 'Negro' then raise exception 'refrescar no aplicó lo que la app decidió actualizar'; end if;
  if (select apibara_raw #>> '{pricing,current_bid_usd}' from public.vehiculos where id = v) <> '4100' then raise exception 'refrescar no guardó el bruto nuevo'; end if;
  if (r ->> 'actualizado_en')::timestamptz < ver then raise exception 'refrescar devolvió una versión anterior'; end if;
  -- Un vehículo de un origen manual no se refresca desde apibara.
  r := public.vehiculo_crear(gen_random_uuid(), oficina, '{"titulo": "Oficina sin subasta"}');
  begin perform public.vehiculo_subasta_refrescar((r ->> 'id')::uuid, (r ->> 'actualizado_en')::timestamptz, current_setting('humo.c_otro')::uuid); raise exception 'refrescó un vehículo manual';
  exception when invalid_parameter_value then null; end;

  -- Repetidos: por VIN en cualquier origen y por lote en éste. Lo que no está, no vuelve.
  select count(*) into n from public.vehiculos_repetidos(usa,
    '[{"vin": "JTMW1RFV8MD099999"}, {"vin": "JTMW1RFV8MD088888"}, {"lote": "77700001", "plataforma": "copart"}, {"lote": "77700001", "plataforma": "iaai"}]');
  if n <> 2 then raise exception 'esperaba dos repetidos (VIN y lote), vinieron %', n; end if;
  if (select count(*) from public.vehiculos_repetidos(usa, '[{"vin": "JTMW1RFV8MD099999"}]') x where x.vehiculo_id = v and x.visible) <> 1 then
    raise exception 'el repetido visible no trajo el vehículo'; end if;
  begin perform public.vehiculos_repetidos(usa, '"no es lista"'); raise exception 'aceptó claves que no son una lista';
  exception when invalid_parameter_value then null; end;

  -- Contexto: qué puede hacer quien llama con apibara en cada origen.
  r := public.apibara_contexto(usa);
  if not (r ->> 'aplica')::boolean or not (r ->> 'puede_crear')::boolean then raise exception 'el contexto de un origen de subasta: %', r; end if;
  if (r ->> 'puede_ver_uso')::boolean then raise exception 'Bruno no gestiona los ajustes de la empresa'; end if;
  if (public.apibara_contexto(oficina) ->> 'aplica')::boolean then raise exception 'apibara no aplica a un origen manual'; end if;
  if (public.apibara_contexto(gen_random_uuid()) ->> 'aplica')::boolean then raise exception 'apibara no aplica a un origen que no existe'; end if;

  -- Sin origenes.gestionar no se lee ni se agrega lo que trajo la API.
  begin perform public.origen_apibara_rutas_sin_campo(usa); raise exception 'Bruno vio las rutas sin campo';
  exception when insufficient_privilege then null; end;
  begin perform public.origen_apibara_agregar(usa, array['novedad.dato']); raise exception 'Bruno agregó un campo';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Los dos objetos de la foto ya están en Storage (los sube el navegador antes de registrar la fila).
insert into storage.objects (bucket_id, name) values
  ('vehiculos', 'cccccccc-0000-4000-8000-000000000001/' || repeat('d', 64) || '.webp'),
  ('vehiculos', 'cccccccc-0000-4000-8000-000000000001/' || repeat('e', 64) || '.webp');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000009', false);
set role authenticated;
do $$ declare v uuid := 'cccccccc-0000-4000-8000-000000000001'; r jsonb; begin
  r := public.vehiculo_fotos_agregar(v, jsonb_build_array(jsonb_build_object('hash', repeat('c', 64),
    'ruta', v || '/' || repeat('d', 64) || '.webp', 'ruta_miniatura', v || '/' || repeat('e', 64) || '.webp',
    'ancho', 960, 'alto', 720, 'bytes', 70000, 'es_portada', true,
    'origen_url', 'https://cs.copart.com/v1/AUTH_svc/lpp/0626/abc_ful.jpg')));
  if jsonb_array_length(r -> 'agregadas') <> 1 then raise exception 'no registró la foto: %', r; end if;
  if (select origen_url from public.vehiculos_imagenes where vehiculo_id = v) <> 'https://cs.copart.com/v1/AUTH_svc/lpp/0626/abc_ful.jpg' then
    raise exception 'la foto no guardó de dónde vino'; end if;
  begin
    perform public.vehiculo_fotos_agregar(v, jsonb_build_array(jsonb_build_object('hash', repeat('f', 64), 'origen_url', 'javascript:alert(1)',
      'ruta', v || '/' || repeat('d', 64) || '.webp', 'ruta_miniatura', v || '/' || repeat('e', 64) || '.webp', 'ancho', 1, 'alto', 1, 'bytes', 1)));
    raise exception 'aceptó una dirección de origen que no es http';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;

-- Lo que la API trajo después y el origen no tiene como campo: la dueña lo ve y lo agrega.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare usa uuid; n int; c record; begin
  select id into usa from public.origenes where clave = 'subasta_usa';
  select * into c from public.origen_apibara_rutas_sin_campo(usa) x where x.ruta = 'novedad.dato';
  if not found or c.tipo <> 'number' then raise exception 'no encontró el dato nuevo que trajo apibara'; end if;
  if exists (select 1 from public.origen_apibara_rutas_sin_campo(usa) x where x.ruta in ('details', 'media.items', 'auction.countdown.days', 'lot_number')) then
    raise exception 'ofreció como campo algo que no se ofrece'; end if;
  begin perform public.origen_apibara_agregar(usa, array['ruta.inventada']); n := 0;
  exception when others then n := -1; end;
  if n <> 0 then raise exception 'una ruta que ningún vehículo trajo no debía fallar sino no sumar nada'; end if;
  if public.origen_apibara_agregar(usa, array['ruta.inventada']) <> 0 then raise exception 'creó un campo para una ruta inventada'; end if;
  if public.origen_apibara_agregar(usa, array['novedad.dato']) <> 1 then raise exception 'no agregó el dato nuevo'; end if;
  if (select tipo::text || '/' || activo::text from public.origenes_campos where origen_id = usa and clave_apibara = 'novedad.dato') <> 'numero/true' then
    raise exception 'el campo nuevo no nació numérico y activo'; end if;
  if public.origen_apibara_agregar(usa, array['novedad.dato']) <> 0 then raise exception 'agregar dos veces creó dos campos'; end if;
  if not (public.apibara_contexto(usa) ->> 'puede_ver_uso')::boolean then raise exception 'la dueña ve el uso de apibara'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test limpieza automática: la regla, cada ancla, el borde de las 03:00 y que los manuales no se tocan
reset role;
select set_config('request.jwt.claim.sub', '', false);
-- Estado conocido: encendida, 7 días, zona de La Paz (UTC−4, sin horario de verano).
update public.ajustes_empresa set limpieza_automatica = true, limpieza_dias_gracia = 7, zona_horaria = 'America/La_Paz' where id = 1;
-- Una fase que no es la inicial, en el flujo de la subasta de EE. UU.
insert into public.fases (flujo_id, nombre) select fl.id, 'Humo posterior' from public.flujos fl join public.origenes o on o.id = fl.origen_id where o.clave = 'subasta_usa';
-- «ahora» de esta prueba: 2030-06-15 08:00 en La Paz. Subasta terminada hace 10 días = vence el 13.
insert into public.vehiculos (id, origen_id, titulo, importado_apibara, subasta_en, subasta_fin_en, estado_subasta, apibara_sync_en,
  creado_por, fase_id, lead_id, publicado_web)
select x.id::uuid, o.id, x.titulo, x.importado, x.subasta_en::timestamptz, null, x.estado::public.estado_subasta, x.sync::timestamptz,
  '00000000-0000-0000-0000-000000000009',
  case x.fase when 'posterior' then (select f.id from public.fases f join public.flujos fl on fl.id = f.flujo_id where fl.origen_id = o.id and f.nombre = 'Humo posterior') end,
  x.lead::uuid, x.publicado
from public.origenes o,
  (values
    ('ffffffff-0000-4000-8000-000000000001', 'Limpieza vencida',           true,  '2030-06-05 12:00:00+00', 'terminada', '2030-06-05 12:00:00+00', null, null, false),
    ('ffffffff-0000-4000-8000-000000000002', 'Limpieza reciente',          true,  '2030-06-12 12:00:00+00', 'terminada', '2030-06-12 12:00:00+00', null, null, false),
    ('ffffffff-0000-4000-8000-000000000003', 'Limpieza con fecha futura',  true,  '2030-06-17 12:00:00+00', 'terminada', '2030-06-01 12:00:00+00', null, null, false),
    ('ffffffff-0000-4000-8000-000000000004', 'Limpieza sin fecha, terminal', true, null,                     'vendida',   '2030-06-01 12:00:00+00', null, null, false),
    ('ffffffff-0000-4000-8000-000000000005', 'Limpieza sin fecha ni estado terminal', true, null,             'abierta',   '2030-06-01 12:00:00+00', null, null, false),
    ('ffffffff-0000-4000-8000-000000000006', 'Limpieza manual con fecha vieja', false, '2030-01-01 12:00:00+00', 'terminada', null,                  null, null, false),
    ('ffffffff-0000-4000-8000-000000000007', 'Ancla vínculo',              true,  '2030-06-05 12:00:00+00', 'terminada', '2030-06-05 12:00:00+00', null, 'cccccccc-0000-4000-8000-000000000008', false),
    ('ffffffff-0000-4000-8000-000000000008', 'Ancla fase posterior',       true,  '2030-06-05 12:00:00+00', 'terminada', '2030-06-05 12:00:00+00', 'posterior', null, false),
    ('ffffffff-0000-4000-8000-000000000009', 'Ancla documentos',           true,  '2030-06-05 12:00:00+00', 'terminada', '2030-06-05 12:00:00+00', null, null, false),
    ('ffffffff-0000-4000-8000-00000000000a', 'Ancla gastos',               true,  '2030-06-05 12:00:00+00', 'terminada', '2030-06-05 12:00:00+00', null, null, false),
    ('ffffffff-0000-4000-8000-00000000000b', 'Ancla pagos',                true,  '2030-06-05 12:00:00+00', 'terminada', '2030-06-05 12:00:00+00', null, null, false),
    ('ffffffff-0000-4000-8000-00000000000c', 'Ancla vitrina',              true,  '2030-06-05 12:00:00+00', 'terminada', '2030-06-05 12:00:00+00', null, null, true),
    ('ffffffff-0000-4000-8000-00000000000d', 'Ancla conservar',            true,  '2030-06-05 12:00:00+00', 'terminada', '2030-06-05 12:00:00+00', null, null, false),
    ('ffffffff-0000-4000-8000-00000000000e', 'Interesados no anclan',      true,  '2030-06-05 12:00:00+00', 'terminada', '2030-06-05 12:00:00+00', null, null, false),
    ('ffffffff-0000-4000-8000-00000000000f', 'Borde 03:00 en punto',       true,  '2030-05-13 07:00:00+00', 'terminada', '2030-05-13 07:00:00+00', null, null, false),
    ('ffffffff-0000-4000-8000-000000000010', 'Borde 03:00 y un segundo',   true,  '2030-05-13 07:00:01+00', 'terminada', '2030-05-13 07:00:01+00', null, null, false)
  ) as x (id, titulo, importado, subasta_en, estado, sync, fase, lead, publicado)
where o.clave = 'subasta_usa';
insert into public.documentos (vehiculo_id, tipo_documento_id) select 'ffffffff-0000-4000-8000-000000000009', id from public.tipos_documento limit 1;
insert into public.gastos (vehiculo_id, categoria_id, moneda, monto, monto_base)
select 'ffffffff-0000-4000-8000-00000000000a', id, 'USD', 10, 10 from public.categorias_gasto limit 1;
insert into public.pagos (vehiculo_id, concepto, moneda, monto, monto_base) values ('ffffffff-0000-4000-8000-00000000000b', 'Seña', 'USD', 100, 100);
insert into public.vehiculos_conservados (vehiculo_id, conservado_por) values ('ffffffff-0000-4000-8000-00000000000d', '00000000-0000-0000-0000-000000000001');
insert into public.vehiculos_interesados (vehiculo_id, lead_id) values ('ffffffff-0000-4000-8000-00000000000e', 'cccccccc-0000-4000-8000-000000000009');

do $$
declare ahora constant timestamptz := '2030-06-15 12:00:00+00'; hoy constant date := '2030-06-15';
  v public.vehiculos; e record;
begin
  -- Cada ancla, por separado, retiene. Y sólo ella.
  for e in
    select * from (values
      ('ffffffff-0000-4000-8000-000000000007'::uuid, 'vinculo'), ('ffffffff-0000-4000-8000-000000000008', 'fase'),
      ('ffffffff-0000-4000-8000-000000000009', 'documentos'), ('ffffffff-0000-4000-8000-00000000000a', 'gastos'),
      ('ffffffff-0000-4000-8000-00000000000b', 'pagos'), ('ffffffff-0000-4000-8000-00000000000c', 'vitrina'),
      ('ffffffff-0000-4000-8000-00000000000d', 'conservar')) as t (id, ancla)
  loop
    select * into v from public.vehiculos where id = e.id;
    if public._limpieza_ancla(v) is distinct from e.ancla then
      raise exception '% debía estar retenido por «%» y dio «%»', v.titulo, e.ancla, public._limpieza_ancla(v); end if;
    if public._limpieza_fecha(v, ahora, hoy) is not null then raise exception '% tiene ancla y aun así tiene fecha de limpieza', v.titulo; end if;
  end loop;
  -- Lo que no es ancla: los interesados, estar sin fase, y no tener nada.
  select * into v from public.vehiculos where id = 'ffffffff-0000-4000-8000-00000000000e';
  if public._limpieza_ancla(v) is not null then raise exception 'un interesado anclaba el vehículo'; end if;
  if public._limpieza_fecha(v, ahora, hoy) is distinct from '2030-06-13'::date and public._limpieza_fecha(v, ahora, hoy) is distinct from hoy then
    raise exception 'sin ancla debía tener fecha'; end if;

  -- Vencida: terminó el 5, 7 días de gracia = el 12 a las 08:00 locales, pasadas las 03:00 → el 13.
  select * into v from public.vehiculos where id = 'ffffffff-0000-4000-8000-000000000001';
  if public._limpieza_vence(v, ahora) <> '2030-06-13' then raise exception 'vencida: vence el %', public._limpieza_vence(v, ahora); end if;
  -- Una fecha que ya pasó se dice como la próxima corrida: es cuando de verdad se va.
  if public._limpieza_fecha(v, ahora, hoy) <> hoy then raise exception 'una fecha pasada debía decirse como la próxima corrida'; end if;
  -- Reciente: aún en gracia.
  select * into v from public.vehiculos where id = 'ffffffff-0000-4000-8000-000000000002';
  if public._limpieza_fecha(v, ahora, hoy) <> '2030-06-20' then raise exception 'reciente: vence el %', public._limpieza_fecha(v, ahora, hoy); end if;
  -- Fecha en el futuro: no es basura aunque el estado diga «terminada».
  select * into v from public.vehiculos where id = 'ffffffff-0000-4000-8000-000000000003';
  if public._limpieza_fecha(v, ahora, hoy) is not null or public._limpieza_termino(v, ahora) is not null then
    raise exception 'una subasta con fecha futura no terminó'; end if;
  -- Sin fecha y estado terminal: cuenta desde la última consulta (el 1 + 7 → el 9).
  select * into v from public.vehiculos where id = 'ffffffff-0000-4000-8000-000000000004';
  if public._limpieza_vence(v, ahora) <> '2030-06-09' then raise exception 'terminal sin fecha: vence el %', public._limpieza_vence(v, ahora); end if;
  -- Sin fecha y sin estado terminal: nunca.
  select * into v from public.vehiculos where id = 'ffffffff-0000-4000-8000-000000000005';
  if public._limpieza_vence(v, ahora) is not null or public._limpieza_fecha(v, ahora, hoy) is not null then
    raise exception 'sin fecha ni estado terminal se limpió'; end if;
  -- Un manual con fecha vieja no se toca.
  select * into v from public.vehiculos where id = 'ffffffff-0000-4000-8000-000000000006';
  if public._limpieza_aplica(v) or public._limpieza_fecha(v, ahora, hoy) is not null then raise exception 'se contó un vehículo manual'; end if;
  -- El borde: lo que cumple a las 03:00 en punto va esa madrugada; un segundo después, a la siguiente.
  select * into v from public.vehiculos where id = 'ffffffff-0000-4000-8000-00000000000f';
  if public._limpieza_vence(v, ahora) <> '2030-05-20' then raise exception 'borde 03:00: vence el %', public._limpieza_vence(v, ahora); end if;
  select * into v from public.vehiculos where id = 'ffffffff-0000-4000-8000-000000000010';
  if public._limpieza_vence(v, ahora) <> '2030-05-21' then raise exception 'borde 03:00:01: vence el %', public._limpieza_vence(v, ahora); end if;
  -- Un origen que apibara ya no sirve cuenta igual: decide cómo nació, no la integración.
  update public.integraciones set activa = false where clave = 'apibara';
  select * into v from public.vehiculos where id = 'ffffffff-0000-4000-8000-000000000001';
  if public._limpieza_fecha(v, ahora, hoy) is null then raise exception 'apagar apibara dejó al vehículo fuera de la limpieza'; end if;
  update public.integraciones set activa = true where clave = 'apibara';
end $$;

-- @test limpieza automática: el job, el interruptor, los días de gracia y que correr dos veces no duplica
reset role;
select set_config('request.jwt.claim.sub', '', false);
do $$
declare ahora constant timestamptz := '2030-06-15 12:00:00+00'; hoy constant date := '2030-06-15'; r jsonb; v public.vehiculos;
  el_lote uuid; n int; viejo int;
begin
  -- Cambiar los días de gracia mueve igual la fecha que dice el banner y la del job: el 2 pasa del 20 al 16.
  select * into v from public.vehiculos where id = 'ffffffff-0000-4000-8000-000000000002';
  if public._limpieza_fecha(v, ahora, hoy) <> '2030-06-20' then raise exception 'con 7 días el 2 vence el 20'; end if;
  update public.ajustes_empresa set limpieza_dias_gracia = 3 where id = 1;
  if public._limpieza_fecha(v, ahora, hoy) <> '2030-06-16' then raise exception 'con 3 días el 2 vence el 16, dio %', public._limpieza_fecha(v, ahora, hoy); end if;

  -- Madrugada de la empresa: a la 01:00 locales no hace nada ni deja corrida.
  r := public.limpieza_automatica_correr('2030-06-15 05:00:00+00', null);
  if r ->> 'estado' <> 'temprano' then raise exception 'a la 01:00 locales debía esperar: %', r; end if;
  if exists (select 1 from public.limpieza_corridas where fecha = hoy) then raise exception 'dejó una corrida antes de hora'; end if;

  -- Interruptor apagado: no se mueve nada, no hay fecha ni corrida.
  update public.ajustes_empresa set limpieza_automatica = false where id = 1;
  select * into v from public.vehiculos where id = 'ffffffff-0000-4000-8000-000000000001';
  if public._limpieza_fecha(v, ahora, hoy) is not null or public.limpieza_el(v) is not null then raise exception 'apagada: sigue dando fecha'; end if;
  r := public.limpieza_automatica_correr('2030-06-15 12:00:00+00', null);
  if r ->> 'estado' <> 'apagada' then raise exception 'apagada: %', r; end if;
  if exists (select 1 from public.vehiculos where lote_papelera_id is not null and eliminado_en is not null and id::text like 'ffffffff-%') then
    raise exception 'apagada: movió algo'; end if;
  if exists (select 1 from public.limpieza_corridas where fecha = hoy) then raise exception 'apagada: dejó corrida'; end if;
  update public.ajustes_empresa set limpieza_automatica = true where id = 1;

  -- La noche del 15 (08:00 locales).
  r := public.limpieza_automatica_correr('2030-06-15 12:00:00+00', null);
  if r ->> 'estado' <> 'corrida' then raise exception 'la corrida: %', r; end if;
  el_lote := (r ->> 'lote')::uuid;
  if el_lote is null then raise exception 'no armó el lote'; end if;
  if not (select es_limpieza and creado_por is null and tipo = 'vehiculos' from public.lotes_papelera where id = el_lote) then
    raise exception 'el lote no es de limpieza o tiene autor'; end if;
  -- Se fueron los que debían (1, 4, 14, 15 y los dos del borde) y se quedaron los demás.
  if (select count(*) from public.vehiculos where id::text like 'ffffffff-%' and eliminado_en is not null) <> 5 then
    raise exception 'esperaba 5 vehículos en la papelera, hay %', (select count(*) from public.vehiculos where id::text like 'ffffffff-%' and eliminado_en is not null); end if;
  if exists (select 1 from public.vehiculos where id in (
      'ffffffff-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000004', 'ffffffff-0000-4000-8000-00000000000e',
      'ffffffff-0000-4000-8000-00000000000f', 'ffffffff-0000-4000-8000-000000000010') and eliminado_en is null) then
    raise exception 'un vehículo vencido y sin ancla no se fue'; end if;
  if exists (select 1 from public.vehiculos where eliminado_en is not null and lote_papelera_id = el_lote and (
      id::text not like 'ffffffff-%' and id <> 'cccccccc-0000-4000-8000-000000000001')) then
    raise exception 'la limpieza movió algo que no era suyo'; end if;
  -- Ninguno de los retenidos, el reciente, el de fecha futura, el sin estado ni el manual se movió.
  if exists (select 1 from public.vehiculos where eliminado_en is not null and id in (
      'ffffffff-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000005',
      'ffffffff-0000-4000-8000-000000000006', 'ffffffff-0000-4000-8000-000000000007', 'ffffffff-0000-4000-8000-000000000008',
      'ffffffff-0000-4000-8000-000000000009', 'ffffffff-0000-4000-8000-00000000000a', 'ffffffff-0000-4000-8000-00000000000b',
      'ffffffff-0000-4000-8000-00000000000c', 'ffffffff-0000-4000-8000-00000000000d')) then
    raise exception 'la limpieza movió un vehículo con ancla o que no le tocaba'; end if;
  -- Lo que dejó dicho: cuántos movió, y por qué ancla se quedó cada uno.
  if (r ->> 'movidos')::int <> (select count(*) from public.vehiculos where lote_papelera_id = el_lote) then raise exception 'movidos no cuadra con el lote'; end if;
  if (select resumen ->> 'cantidad' from public.lotes_papelera where id = el_lote)::int <> (r ->> 'movidos')::int then raise exception 'el resumen del lote no cuadra'; end if;
  if coalesce((r -> 'saltados' ->> 'documentos')::int, 0) < 1 or coalesce((r -> 'saltados' ->> 'gastos')::int, 0) < 1
     or coalesce((r -> 'saltados' ->> 'pagos')::int, 0) < 1 or coalesce((r -> 'saltados' ->> 'vitrina')::int, 0) < 1
     or coalesce((r -> 'saltados' ->> 'fase')::int, 0) < 1 or coalesce((r -> 'saltados' ->> 'vinculo')::int, 0) < 1
     or coalesce((r -> 'saltados' ->> 'conservar')::int, 0) < 1 then
    raise exception 'los saltados no dicen por qué ancla: %', r -> 'saltados'; end if;
  if (select movidos from public.limpieza_corridas where fecha = hoy and not parcial) <> (r ->> 'movidos')::int then raise exception 'la corrida no quedó registrada'; end if;
  if not exists (select 1 from public.actividad where accion = 'limpieza.corrida' and actor_id is null and registro_id = (r ->> 'corrida')) then
    raise exception 'la corrida no quedó en la actividad, sin autor'; end if;

  -- Correr otra vez la misma noche no duplica lotes ni movimientos.
  select count(*) into n from public.lotes_papelera where es_limpieza;
  viejo := (select count(*) from public.vehiculos where eliminado_en is not null);
  r := public.limpieza_automatica_correr('2030-06-15 14:00:00+00', null);
  if r ->> 'estado' <> 'ya_corrio' then raise exception 'la segunda corrida del día: %', r; end if;
  if (select count(*) from public.lotes_papelera where es_limpieza) <> n or (select count(*) from public.vehiculos where eliminado_en is not null) <> viejo
     or (select count(*) from public.limpieza_corridas where fecha = hoy and not parcial) <> 1 then
    raise exception 'correr dos veces duplicó algo'; end if;

  -- La noche del 16: el que la fecha del banner decía (el 2) se va, y sólo él de lo de esta prueba.
  r := public.limpieza_automatica_correr('2030-06-16 12:00:00+00', null);
  if r ->> 'estado' <> 'corrida' then raise exception 'la corrida del 16: %', r; end if;
  if (select eliminado_en is null from public.vehiculos where id = 'ffffffff-0000-4000-8000-000000000002') then
    raise exception 'el 2 no se fue el día que decía el banner'; end if;
  if (r ->> 'lote')::uuid is not distinct from el_lote then raise exception 'el lote del 16 es el del 15'; end if;
  if (select count(*) from public.lotes_papelera where es_limpieza) <> n + 1 then raise exception 'esperaba un lote por noche'; end if;
end $$;

-- @test limpieza automática: restaurar el lote lo devuelve y lo marca «Conservar»; sin permiso nadie conserva ni corre el job
reset role;
select set_config('request.jwt.claim.sub', '', false);
update public.ajustes_empresa set limpieza_dias_gracia = 7 where id = 1;
-- La dueña restaura el primer lote de limpieza.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$
declare el_lote uuid; r jsonb; ver timestamptz; v public.vehiculos; ya timestamptz;
begin
  -- Se busca por la RPC de la papelera, como la app: la RLS de vehiculos esconde lo eliminado.
  select (x ->> 'id')::uuid, (x ->> 'actualizado_en')::timestamptz into el_lote, ver
  from jsonb_array_elements(public.vehiculos_papelera_listar()) x
  where (x ->> 'es_limpieza')::boolean
    and exists (select 1 from jsonb_array_elements(x -> 'vehiculos') y where y ->> 'id' = 'ffffffff-0000-4000-8000-000000000001');
  if el_lote is null then raise exception 'no encontré el lote del vehículo 1'; end if;
  -- Un lote que armó el sistema lo ve y lo restaura quien puede vaciar la papelera; trae su marca y
  -- no tiene autor.
  if (select (x ->> 'creado_por_nombre') is not null from jsonb_array_elements(public.vehiculos_papelera_listar()) x where (x ->> 'id')::uuid = el_lote) then
    raise exception 'el lote de la limpieza tiene autor'; end if;
  r := public.vehiculos_papelera_restaurar(el_lote, ver);
  if jsonb_array_length(r -> 'restaurados') < 1 then raise exception 'no restauró: %', r; end if;
  if (select count(*) from public.vehiculos_conservados c join public.vehiculos x on x.id = c.vehiculo_id
      where x.lote_papelera_id is null and x.eliminado_en is null and x.id::text like 'ffffffff-%' and c.conservado_por = (select auth.uid())) < 4 then
    raise exception 'los restaurados no quedaron conservados'; end if;
  if exists (select 1 from public.vehiculos where id = 'ffffffff-0000-4000-8000-000000000001' and (eliminado_en is not null or publicado_web)) then
    raise exception 'restaurar no devolvió el vehículo sin publicar'; end if;
  -- Conservar no mueve la versión de la ficha, es idempotente y se puede quitar.
  select actualizado_en into ya from public.vehiculos where id = 'ffffffff-0000-4000-8000-000000000001';
  r := public.vehiculo_conservar('ffffffff-0000-4000-8000-000000000001', true);
  if not (r ->> 'conservado')::boolean then raise exception 'conservar'; end if;
  if (select actualizado_en from public.vehiculos where id = 'ffffffff-0000-4000-8000-000000000001') <> ya then raise exception 'conservar movió la versión de la ficha'; end if;
  r := public.vehiculo_limpieza('ffffffff-0000-4000-8000-000000000001');
  if not (r ->> 'conservado')::boolean or r ->> 'fecha' is not null or not (r ->> 'conservado_por_mi')::boolean then raise exception 'la ficha no dice que se conserva: %', r; end if;
  r := public.vehiculo_conservar('ffffffff-0000-4000-8000-000000000001', false);
  if (r ->> 'conservado')::boolean then raise exception 'no quitó la marca'; end if;
  -- Un manual (no importado) no se conserva: no se limpia nunca.
  begin perform public.vehiculo_conservar('ffffffff-0000-4000-8000-000000000006', true); raise exception 'conservó un manual';
  exception when invalid_parameter_value then null; end;
  -- La ficha de un manual dice que no aplica.
  if (public.vehiculo_limpieza('ffffffff-0000-4000-8000-000000000006') ->> 'aplica')::boolean then raise exception 'la limpieza aplicó a un manual'; end if;
  -- La última noche, para quien puede vaciar la papelera.
  if (public.limpieza_ultima() ->> 'fecha') <> '2030-06-16' then raise exception 'la última corrida: %', public.limpieza_ultima(); end if;
  -- Los ajustes: rango de los días y encendido, con permiso.
  select actualizado_en into ver from public.ajustes_empresa where id = 1;
  begin perform public.empresa_guardar_ajustes('{"limpieza_dias_gracia": 0}', ver); raise exception 'aceptó 0 días';
  exception when invalid_parameter_value then null; end;
  begin perform public.empresa_guardar_ajustes('{"limpieza_dias_gracia": 91}', ver); raise exception 'aceptó 91 días';
  exception when invalid_parameter_value then null; end;
  perform public.empresa_guardar_ajustes('{"limpieza_dias_gracia": 10, "limpieza_automatica": true}', ver);
  if (select limpieza_dias_gracia from public.ajustes_empresa where id = 1) <> 10 then raise exception 'no guardó los días de gracia'; end if;
  select actualizado_en into ver from public.ajustes_empresa where id = 1;
  perform public.empresa_guardar_ajustes('{"limpieza_dias_gracia": 7}', ver);
end $$;
reset role;

-- Bruno (un asesor): conserva lo suyo, no lo ajeno; no ve la corrida ni corre el job.
-- Uno que creó la dueña: importado, sin vínculo y fuera de la cartera de Bruno.
insert into public.vehiculos (id, origen_id, titulo, importado_apibara, subasta_en, estado_subasta, apibara_sync_en, creado_por)
select 'ffffffff-0000-4000-8000-000000000011', o.id, 'Limpieza ajeno', true, '2030-06-14 12:00:00+00', 'terminada', '2030-06-14 12:00:00+00',
  '00000000-0000-0000-0000-000000000001'
from public.origenes o where o.clave = 'subasta_usa';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000009', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$
begin
  begin perform public.vehiculo_conservar('ffffffff-0000-4000-8000-000000000009', null); raise exception 'aceptó un estado nulo';
  exception when invalid_parameter_value then null; end;
  -- De Bruno (lo creó él): puede.
  perform public.vehiculo_conservar('ffffffff-0000-4000-8000-000000000009', true);
  perform public.vehiculo_conservar('ffffffff-0000-4000-8000-000000000009', false);
  if public.limpieza_ultima() is not null then raise exception 'un asesor vio la última limpieza'; end if;
  begin perform public.limpieza_automatica_correr(now(), null); raise exception 'un asesor corrió el job';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.limpieza_corridas limit 1; raise exception 'un asesor leyó las corridas';
  exception when insufficient_privilege then null; end;
  begin perform public.empresa_guardar_ajustes('{"limpieza_automatica": false}', now()); raise exception 'un asesor apagó la limpieza';
  exception when insufficient_privilege then null; end;
  begin insert into public.vehiculos_conservados (vehiculo_id) values ('ffffffff-0000-4000-8000-000000000009'); raise exception 'un asesor escribió la marca directo';
  exception when insufficient_privilege then null; end;
  begin perform public._limpieza_ancla((select v from public.vehiculos v where v.id = 'ffffffff-0000-4000-8000-000000000009')); raise exception 'un asesor ejecutó la regla interna';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Irene no tiene permisos sobre este origen: ni conserva ni quita la marca de lo ajeno.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000008', false);
set role authenticated;
do $$ begin
  begin perform public.vehiculo_conservar('ffffffff-0000-4000-8000-000000000011', true); raise exception 'Irene conservó un vehículo que no puede editar';
  exception when insufficient_privilege then null; end;
  begin perform public.vehiculo_conservar('ffffffff-0000-4000-8000-000000000011', false); raise exception 'Irene quitó la marca de un vehículo que no puede editar';
  exception when insufficient_privilege then null; end;
  if public.vehiculo_limpieza('ffffffff-0000-4000-8000-000000000011') is not null then raise exception 'Irene vio la limpieza de un vehículo que no ve'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test limpieza automática: una corrida parcial no espera la hora ni tapa la de verdad; el job queda programado
reset role;
select set_config('request.jwt.claim.sub', '', false);
do $$
declare r jsonb; oficina uuid; n int;
begin
  select id into oficina from public.origenes where clave = 'oficina';
  -- Acotada a un origen manual: no hay nada que mover, y deja su propia fila parcial.
  r := public.limpieza_automatica_correr('2030-06-18 05:00:00+00', array[oficina]);
  if r ->> 'estado' <> 'corrida' or (r ->> 'movidos')::int <> 0 then raise exception 'la parcial: %', r; end if;
  if not exists (select 1 from public.limpieza_corridas where fecha = '2030-06-18' and parcial) then raise exception 'la parcial no dejó su fila'; end if;
  -- La de verdad de ese día sigue pudiendo correr.
  r := public.limpieza_automatica_correr('2030-06-18 12:00:00+00', null);
  if r ->> 'estado' <> 'corrida' then raise exception 'la parcial tapó la corrida del día: %', r; end if;
  select count(*) into n from public.limpieza_corridas where fecha = '2030-06-18' and not parcial;
  if n <> 1 then raise exception 'esperaba una corrida de verdad el 18, hay %', n; end if;
  -- Lo que se restauró y quedó «Conservar» no vuelve a irse...
  if exists (select 1 from public.vehiculos where id = 'ffffffff-0000-4000-8000-000000000004' and eliminado_en is not null) then
    raise exception 'el restaurado volvió a irse'; end if;
  -- ...y quien le quitó la marca a mano (el 1, en la prueba anterior) lo deja otra vez a la limpieza.
  if not exists (select 1 from public.vehiculos where id = 'ffffffff-0000-4000-8000-000000000001' and eliminado_en is not null) then
    raise exception 'quitar «Conservar» no lo devolvió a la limpieza'; end if;
  -- El job está programado, cada hora (la madrugada es de la empresa, el cron es UTC).
  if not exists (select 1 from cron.job where jobname = 'limpieza-automatica' and schedule = '7 * * * *' and command like '%limpieza_automatica_correr%') then
    raise exception 'el job de la limpieza no está programado'; end if;
end $$;

-- @test leads: el layout de fábrica, y crear, ordenar, desactivar y eliminar un campo con sus reglas
-- Dos asesores propios de estas pruebas: los de antes ya se dieron de baja.
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-000000000030', 'asesora-leads@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000031', 'asesor-leads@ejemplo.com', '{"invitado": true}');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare
  r jsonb; c uuid; v timestamptz; v2 timestamptz; rechazo boolean; claves text[]; privado uuid;
begin
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-000000000030', (select id from public.roles where clave = 'asesor'), true);
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-000000000031', (select id from public.roles where clave = 'asesor'), true);
  select array_agg(clave order by orden) into claves from public.leads_campos where es_sistema;
  if claves <> array['edad', 'genero', 'ciudad', 'pais', 'direccion', 'notas'] then raise exception 'los campos de fábrica: %', claves; end if;
  if (select count(*) from public.leads_campos where solo_cartera) <> 1 or not (select solo_cartera from public.leads_campos where clave = 'direccion') then
    raise exception 'sólo la dirección nace «solo la cartera»'; end if;
  if (select valor_defecto_empresa from public.leads_campos where clave = 'ciudad') is distinct from 'ciudad'
     or (select valor_defecto_empresa from public.leads_campos where clave = 'pais') is distinct from 'pais' then
    raise exception 'la ciudad y el país nacen con los de la empresa'; end if;

  -- Un campo propio nace al final, activo y no de fábrica.
  r := public.lead_campo_crear('signo_humo', 'Signo zodiacal', 'opcion',
    '[{"clave": "aries", "etiqueta": "Aries"}, {"clave": "leo", "etiqueta": "Leo"}]', p_grupo => 'Datos personales');
  c := (r ->> 'id')::uuid;
  if (select es_sistema or not activo or solo_cartera or orden <> 70 from public.leads_campos where id = c) then
    raise exception 'el campo propio nace al final, activo y visible para quien ve el lead'; end if;

  -- Clave reservada, repetida, tipo que un lead no lleva, opciones faltantes.
  rechazo := false; begin perform public.lead_campo_crear('telefono_principal', 'Teléfono', 'texto'); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'creó un campo con la clave de una columna'; end if;
  rechazo := false; begin perform public.lead_campo_crear('atributos', 'Atributos', 'texto'); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'creó un campo con la clave «atributos»'; end if;
  begin perform public.lead_campo_crear('signo_humo', 'Otro signo', 'texto'); raise exception 'repitió la clave de un campo';
  exception when unique_violation then null; end;
  rechazo := false; begin perform public.lead_campo_crear('chasis_humo', 'Chasis', 'vin'); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'un lead aceptó un campo VIN'; end if;
  rechazo := false; begin perform public.lead_campo_crear('sin_opciones', 'Sin opciones', 'opcion'); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'creó un campo de opciones sin opciones'; end if;

  -- El correo y el documento nacen «solo la cartera»; el valor de la empresa sólo en texto y sin valor fijo.
  privado := (public.lead_campo_crear('correo_hum', 'Correo', 'correo') ->> 'id')::uuid;
  if not (select solo_cartera from public.leads_campos where id = privado) then raise exception 'el correo debía nacer privado'; end if;
  rechazo := false; begin perform public.lead_campo_crear('doc_humo', 'Documento', 'documento', p_valor_defecto => '"123"'); exception when invalid_parameter_value then rechazo := true; end;
  if not rechazo then raise exception 'un documento aceptó un valor por defecto'; end if;
  rechazo := false; begin perform public.lead_campo_crear('dato_humo', 'Dato', 'numero', p_valor_defecto_empresa => 'ciudad'); exception when invalid_parameter_value then rechazo := true; end;
  if not rechazo then raise exception 'un número aceptó el dato de la empresa'; end if;
  rechazo := false; begin perform public.lead_campo_crear('dato_humo', 'Dato', 'texto', p_valor_defecto => '"x"', p_valor_defecto_empresa => 'ciudad'); exception when invalid_parameter_value then rechazo := true; end;
  if not rechazo then raise exception 'aceptó un valor fijo y el de la empresa a la vez'; end if;

  -- Editar pide la versión: una vieja es PT409 y nada cambia.
  select actualizado_en into v from public.leads_campos where id = c;
  begin perform public.lead_campo_guardar(c, v - interval '1 second', '{"filtrable": true}'); raise exception 'guardó con una versión vieja';
  exception when others then if sqlstate <> 'PT409' then raise; end if; end;
  v2 := public.lead_campo_guardar(c, v, '{"filtrable": true, "en_tabla": true, "grupo": "Extras"}');
  if not (select filtrable and en_tabla and grupo = 'Extras' from public.leads_campos where id = c) then raise exception 'no guardó las banderas'; end if;
  rechazo := false; begin perform public.lead_campo_guardar(c, v2, '{"clave": "otra"}'); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'dejó cambiar la clave de un campo'; end if;
  rechazo := false; begin perform public.lead_campo_guardar(c, v2, '{"etiqueta": null}'); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'dejó vaciar el nombre'; end if;

  -- Uno de fábrica se edita, pero no cambia de tipo ni se elimina.
  select id, actualizado_en into privado, v from public.leads_campos where clave = 'edad';
  perform public.lead_campo_guardar(privado, v, '{"filtrable": false, "etiqueta": "Años"}');
  if (select etiqueta from public.leads_campos where id = privado) <> 'Años' then raise exception 'no renombró un campo de fábrica'; end if;
  rechazo := false; begin perform public.lead_campo_guardar(privado, (select actualizado_en from public.leads_campos where id = privado), '{"tipo": "texto"}'); exception when raise_exception then rechazo := true; end;
  if not rechazo then raise exception 'cambió el tipo de un campo de fábrica'; end if;
  begin perform public.lead_campo_eliminar(privado, (select actualizado_en from public.leads_campos where id = privado)); raise exception 'eliminó un campo de fábrica';
  exception when foreign_key_violation then null; end;
  perform public.lead_campo_guardar(privado, (select actualizado_en from public.leads_campos where id = privado), '{"etiqueta": "Edad", "filtrable": true}');

  -- Orden relativo: «primero» y «después de X»; los números quedan en 10, 20, 30…
  perform public.lead_campo_mover(c, (select actualizado_en from public.leads_campos where id = c));
  if (select id from public.leads_campos order by orden limit 1) <> c then raise exception 'no lo puso primero'; end if;
  perform public.lead_campo_mover(c, (select actualizado_en from public.leads_campos where id = c), p_despues_de => (select id from public.leads_campos where clave = 'genero'));
  select array_agg(clave order by orden) into claves from public.leads_campos;
  if claves[1:3] <> array['edad', 'genero', 'signo_humo'] then raise exception 'no lo puso después de género: %', claves; end if;
  if exists (select 1 from public.leads_campos where orden % 10 <> 0) then raise exception 'el orden no quedó en 10, 20, 30…'; end if;
  begin perform public.lead_campo_mover(c, (select actualizado_en from public.leads_campos where id = c), p_despues_de => c); raise exception 'lo puso después de sí mismo';
  exception when raise_exception then if sqlerrm like 'lo puso%' then raise; end if; end;

  -- Sin leads, el impacto es cero y un campo propio se elimina.
  if (public.lead_campo_impacto(c) ->> 'con_valor')::int <> 0 then raise exception 'no había leads con signo'; end if;
  perform public.lead_campo_eliminar(c, (select actualizado_en from public.leads_campos where id = c));
  if exists (select 1 from public.leads_campos where clave = 'signo_humo') then raise exception 'no eliminó el campo sin datos'; end if;
  perform public.lead_campo_eliminar(
    (select id from public.leads_campos where clave = 'correo_hum'),
    (select actualizado_en from public.leads_campos where clave = 'correo_hum'));
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test leads: sin leads.configurar nadie escribe el layout ni cuenta; leerlo es de toda cuenta
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000030', false);
set role authenticated;
do $$ declare c uuid; v timestamptz;
begin
  select id, actualizado_en into c, v from public.leads_campos where clave = 'edad';
  if (select count(*) from public.leads_campos) < 6 then raise exception 'una asesora debía leer el layout'; end if;
  begin perform public.lead_campo_crear('x_humo', 'X', 'texto'); raise exception 'creó un campo sin permiso';
  exception when insufficient_privilege then null; end;
  begin perform public.lead_campo_guardar(c, v, '{"filtrable": false}'); raise exception 'editó un campo sin permiso';
  exception when insufficient_privilege then null; end;
  begin perform public.lead_campo_mover(c, v); raise exception 'movió un campo sin permiso';
  exception when insufficient_privilege then null; end;
  begin perform public.lead_campo_eliminar(c, v); raise exception 'eliminó un campo sin permiso';
  exception when insufficient_privilege then null; end;
  begin perform public.lead_campo_impacto(c); raise exception 'contó sin permiso';
  exception when insufficient_privilege then null; end;
  begin insert into public.leads_campos (clave, etiqueta, tipo) values ('directo_humo', 'Directo', 'texto'); raise exception 'insertó directo';
  exception when insufficient_privilege then null; end;
  begin update public.leads_campos set etiqueta = 'X' where id = c; raise exception 'actualizó directo';
  exception when insufficient_privilege then null; end;
  begin delete from public.leads_campos where id = c; raise exception 'borró directo';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Quien no tiene rol tampoco; y sin sesión no se ve ni se escribe.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);
set role authenticated;
do $$ begin
  begin perform public.lead_campo_crear('x_humo', 'X', 'texto'); raise exception 'creó un campo sin rol';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);
set role anon;
do $$ begin
  begin perform count(*) from public.leads_campos; raise exception 'anon leyó el layout';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- @test leads: crear_lead rechaza lo que el layout no admite y guarda lo que sí
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ begin
  perform public.lead_campo_crear('req_humo', 'Requerido humo', 'texto', p_requerido => true);
  perform public.lead_campo_crear('correo_humo', 'Correo humo', 'correo');
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000030', false);
set role authenticated;
do $$ declare v_id uuid; hint text;
begin
  -- Una clave suelta se rechaza diciendo dónde va.
  begin perform public.crear_lead(gen_random_uuid(), '{"nombre": "A", "telefono_principal": "70011001", "ciudad": "Cbba", "atributos": {"req_humo": "x"}}'); raise exception 'aceptó una clave suelta';
  exception when invalid_parameter_value then
    if sqlerrm not like '%atributos%' then raise exception 'no dijo dónde va: %', sqlerrm; end if; end;
  -- Un atributo que no existe.
  begin perform public.crear_lead(gen_random_uuid(), '{"nombre": "A", "telefono_principal": "70011001", "atributos": {"req_humo": "x", "no_existe": 1}}'); raise exception 'aceptó un atributo que no existe';
  exception when invalid_parameter_value then
    get stacked diagnostics hint = pg_exception_hint;
    if hint <> 'atributos.no_existe' then raise exception 'el hint no nombra el campo: %', hint; end if; end;
  -- De tipo equivocado.
  begin perform public.crear_lead(gen_random_uuid(), '{"nombre": "A", "telefono_principal": "70011001", "atributos": {"req_humo": "x", "edad": "mucha"}}'); raise exception 'aceptó una edad que no es número';
  exception when invalid_parameter_value then
    if sqlerrm not like '%Edad%' then raise exception 'no nombró el campo: %', sqlerrm; end if; end;
  -- Con una opción que no está.
  begin perform public.crear_lead(gen_random_uuid(), '{"nombre": "A", "telefono_principal": "70011001", "atributos": {"req_humo": "x", "genero": "marciano"}}'); raise exception 'aceptó una opción que no existe';
  exception when invalid_parameter_value then
    if sqlerrm not like '%marciano%' then raise exception 'no dijo cuál: %', sqlerrm; end if; end;
  -- Con un formato que no es.
  begin perform public.crear_lead(gen_random_uuid(), '{"nombre": "A", "telefono_principal": "70011001", "atributos": {"req_humo": "x", "correo_humo": "sin-arroba"}}'); raise exception 'aceptó un correo sin arroba';
  exception when invalid_parameter_value then null; end;
  -- Sin un requerido.
  begin perform public.crear_lead(gen_random_uuid(), '{"nombre": "A", "telefono_principal": "70011001", "atributos": {"edad": 30}}'); raise exception 'creó un lead sin su requerido';
  exception when not_null_violation then
    get stacked diagnostics hint = pg_exception_hint;
    if hint <> 'atributos.req_humo' then raise exception 'el hint no nombra el requerido: %', hint; end if; end;
  -- Ninguna de las rechazadas dejó un lead.
  if exists (select 1 from public.leads_vista where nombre = 'A') then raise exception 'un rechazo dejó el lead a medias'; end if;
  -- Lo válido entra, y vaciar un dato lo quita.
  v_id := (public.crear_lead(gen_random_uuid(), '{"nombre": "Valida Humo", "telefono_principal": "70011002", "atributos": {"req_humo": "x", "edad": 31, "genero": "otro", "correo_humo": "ana@ejemplo.com", "ciudad": ""}}') ->> 'id')::uuid;
  if (select atributos from public.leads_vista v where v.id = v_id) is distinct from '{"edad": 31, "genero": "otro", "req_humo": "x", "correo_humo": "ana@ejemplo.com"}'::jsonb then
    raise exception 'los atributos guardados: %', (select atributos from public.leads_vista v where v.id = v_id); end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ begin
  -- Volver requerido no toca los leads que ya existen.
  perform public.lead_campo_guardar((select id from public.leads_campos where clave = 'edad'), (select actualizado_en from public.leads_campos where clave = 'edad'), '{"requerido": true}');
  if not exists (select 1 from public.leads where nombre = 'Valida Humo') then raise exception 'se perdió el lead'; end if;
  perform public.lead_campo_guardar((select id from public.leads_campos where clave = 'edad'), (select actualizado_en from public.leads_campos where clave = 'edad'), '{"requerido": false}');
end $$;
reset role;
-- Los campos de prueba de este bloque se van antes del siguiente: un requerido frenaría a los demás.
delete from public.leads where nombre = 'Valida Humo';
delete from public.leads_campos where clave in ('req_humo', 'correo_humo');
select set_config('request.jwt.claim.sub', '', false);

-- @test leads: un privado de cartera no llega a quien sólo ve el lead, ni en pantalla ni al filtrar
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ begin
  perform public.lead_campo_crear('ci_humo', 'Cédula', 'documento');
  perform public.lead_campo_crear('hobby_humo', 'Pasatiempo', 'texto');
  if not (select solo_cartera from public.leads_campos where clave = 'ci_humo') then raise exception 'el documento debía nacer privado'; end if;
end $$;
reset role;
-- Sofía crea el lead: queda de dueña y le llega todo.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000030', false);
set role authenticated;
do $$ declare a jsonb; begin
  perform public.crear_lead(gen_random_uuid(), '{"nombre": "Privado Humo", "telefono_principal": "70022001", "atributos": {"ciudad": "Santa Cruz", "direccion": "Calle 5 #12", "notas": "Pidió rojo", "ci_humo": "123456 SC", "hobby_humo": "Ajedrez"}}');
  select atributos into a from public.leads_vista where nombre = 'Privado Humo';
  if a ->> 'direccion' is distinct from 'Calle 5 #12' or a ->> 'ci_humo' is distinct from '123456 SC' then raise exception 'la cartera debía recibir los privados: %', a; end if;
end $$;
reset role;

-- La dueña ve el lead (alcance «todos») pero no está en su cartera: sin los privados.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare a jsonb; n int; rechazo boolean;
begin
  select atributos into a from public.leads_vista where nombre = 'Privado Humo';
  if a is null then raise exception 'la dueña debía ver el lead'; end if;
  if a ->> 'ciudad' is distinct from 'Santa Cruz' or a ->> 'hobby_humo' is distinct from 'Ajedrez' or a ->> 'notas' is null then
    raise exception 'la dueña debía recibir lo que no es privado: %', a; end if;
  if a ? 'direccion' or a ? 'ci_humo' then raise exception 'la dueña recibió un privado: %', a; end if;
  -- Filtrar también es leer: ni por valor, ni por existencia, ni por contención.
  select count(*) into n from public.leads_vista where atributos ->> 'direccion' = 'Calle 5 #12';
  if n <> 0 then raise exception 'filtró por un privado y encontró el lead'; end if;
  select count(*) into n from public.leads_vista where atributos ? 'ci_humo';
  if n <> 0 then raise exception 'preguntó si existía un privado y se lo dijeron'; end if;
  select count(*) into n from public.leads_vista where atributos @> '{"ci_humo": "123456 SC"}';
  if n <> 0 then raise exception 'filtró por contención de un privado'; end if;
  select count(*) into n from public.leads_vista where atributos ->> 'ciudad' = 'Santa Cruz';
  if n <> 1 then raise exception 'sí debía poder filtrar por lo que no es privado'; end if;
  -- La tabla no se lee ni se escribe: ni con select, ni filtrando, ni actualizando.
  rechazo := false; begin perform atributos from public.leads limit 1; exception when insufficient_privilege then rechazo := true; end;
  if not rechazo then raise exception 'leyó leads.atributos'; end if;
  rechazo := false; begin perform id from public.leads where atributos ->> 'direccion' = 'Calle 5 #12'; exception when insufficient_privilege then rechazo := true; end;
  if not rechazo then raise exception 'filtró leads.atributos'; end if;
  rechazo := false; begin update public.leads set atributos = '{}'::jsonb where nombre = 'Privado Humo'; exception when insufficient_privilege then rechazo := true; end;
  if not rechazo then raise exception 'escribió leads.atributos directo'; end if;
  -- Desactivar el campo privado no lo expone.
  perform public.lead_campo_guardar((select id from public.leads_campos where clave = 'direccion'), (select actualizado_en from public.leads_campos where clave = 'direccion'), '{"activo": false}');
  select atributos into a from public.leads_vista where nombre = 'Privado Humo';
  if a ? 'direccion' then raise exception 'desactivar el privado lo expuso'; end if;
  perform public.lead_campo_guardar((select id from public.leads_campos where clave = 'direccion'), (select actualizado_en from public.leads_campos where clave = 'direccion'), '{"activo": true}');
end $$;
-- La actividad ya no entrega la fila entera (ni el teléfono ni los privados).
do $$ declare rechazo boolean; begin
  rechazo := false; begin perform antes from public.actividad limit 1; exception when insufficient_privilege then rechazo := true; end;
  if not rechazo then raise exception 'leyó actividad.antes'; end if;
  rechazo := false; begin perform despues from public.actividad limit 1; exception when insufficient_privilege then rechazo := true; end;
  if not rechazo then raise exception 'leyó actividad.despues'; end if;
  if not exists (select 1 from public.actividad where accion = 'lead.creado') then raise exception 'la actividad debía seguir diciendo qué pasó'; end if;
end $$;
reset role;

-- Quien está fuera de la cartera no cambia un privado (la sesión es la de la dueña; escribe el dueño de la tabla).
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
do $$ begin
  begin update public.leads set atributos = atributos || '{"direccion": "Otra"}' where nombre = 'Privado Humo'; raise exception 'cambió un privado sin ser de la cartera';
  exception when insufficient_privilege then null; end;
  begin update public.leads set atributos = atributos || '{"ci_humo": "999"}' where nombre = 'Privado Humo'; raise exception 'cambió el documento sin ser de la cartera';
  exception when insufficient_privilege then null; end;
  -- Lo que no es privado sí.
  update public.leads set atributos = atributos || '{"hobby_humo": "Ajedrez y damas"}' where nombre = 'Privado Humo';
  if (select atributos ->> 'direccion' from public.leads where nombre = 'Privado Humo') <> 'Calle 5 #12' then raise exception 'se perdió la dirección'; end if;
end $$;

-- Compartir se los da; revocar se los quita.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000030', false);
set role authenticated;
do $$ begin
  perform public.compartir_lead((select id from public.leads where nombre = 'Privado Humo'), '00000000-0000-0000-0000-000000000001');
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ begin
  if (select atributos ->> 'direccion' from public.leads_vista where nombre = 'Privado Humo') is distinct from 'Calle 5 #12' then
    raise exception 'compartir no le dio los privados'; end if;
  if (select count(*) from public.leads_vista where atributos ->> 'direccion' = 'Calle 5 #12') <> 1 then raise exception 'ya en la cartera, debía poder filtrar'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000030', false);
set role authenticated;
do $$ declare rechazo boolean; begin
  perform public.revocar_acceso_lead((select id from public.leads where nombre = 'Privado Humo'), '00000000-0000-0000-0000-000000000001');
  -- Al dueño no se le revoca, y el mensaje habla de tú.
  rechazo := false;
  begin perform public.revocar_acceso_lead((select id from public.leads where nombre = 'Privado Humo'), '00000000-0000-0000-0000-000000000030');
  exception when check_violation then
    if sqlerrm not like '%transfiere%' then raise exception 'el mensaje no habla de tú: %', sqlerrm; end if; rechazo := true; end;
  if not rechazo then raise exception 'revocó al dueño'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ begin
  if (select atributos from public.leads_vista where nombre = 'Privado Humo') ? 'direccion' then raise exception 'revocar no le quitó los privados'; end if;
end $$;
reset role;

-- Transferir se los da a quien recibe el lead.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000030', false);
set role authenticated;
do $$ begin
  perform public.transferir_lead((select id from public.leads where nombre = 'Privado Humo'), '00000000-0000-0000-0000-000000000001');
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ begin
  if (select atributos ->> 'ci_humo' from public.leads_vista where nombre = 'Privado Humo') is distinct from '123456 SC' then
    raise exception 'transferir no le dio los privados al nuevo dueño'; end if;
end $$;
reset role;

-- Adoptar del limbo se los da a quien lo adopta: nadie lo ve hasta que alguien registra el teléfono.
update public.leads_asesores set revocado_en = now() where lead_id = (select id from public.leads where nombre = 'Privado Humo') and revocado_en is null;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000031', false);
set role authenticated;
do $$ declare v uuid; begin
  if exists (select 1 from public.leads_vista where nombre = 'Privado Humo') then raise exception 'un lead en limbo debía ser invisible'; end if;
  v := (public.crear_lead(gen_random_uuid(), '{"nombre": "Privado Humo", "telefono_principal": "70022001", "adoptar": true}') ->> 'id')::uuid;
  if (select atributos ->> 'direccion' from public.leads_vista where id = v) is distinct from 'Calle 5 #12' then
    raise exception 'adoptar no le dio los privados'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test leads: apagar un campo no pierde lo cargado y reactivarlo lo devuelve; con datos no cambia de tipo ni se elimina
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare c uuid; v timestamptz; rechazo boolean; imp jsonb; v2 timestamptz;
begin
  select id into c from public.leads_campos where clave = 'hobby_humo';
  -- Hay un lead con ese dato: el conteo lo dice, y son números, nunca el valor.
  imp := public.lead_campo_impacto(c);
  if (imp ->> 'con_valor')::int <> 1 or (imp ->> 'total')::int < 1 then raise exception 'el impacto no contó: %', imp; end if;
  -- Con datos: el tipo no cambia y no se elimina.
  rechazo := false;
  begin perform public.lead_campo_guardar(c, (select actualizado_en from public.leads_campos where id = c), '{"tipo": "numero"}');
  exception when raise_exception then if sqlerrm not like '%ya tienen un valor%' then raise; end if; rechazo := true; end;
  if not rechazo then raise exception 'cambió el tipo de un campo con datos'; end if;
  rechazo := false;
  begin perform public.lead_campo_eliminar(c, (select actualizado_en from public.leads_campos where id = c));
  exception when foreign_key_violation then rechazo := true; end;
  if not rechazo then raise exception 'eliminó un campo con datos'; end if;
  -- Se desactiva: el dato queda en el lead.
  v := public.lead_campo_guardar(c, (select actualizado_en from public.leads_campos where id = c), '{"activo": false}');
end $$;
reset role;
-- El dato sigue en el lead (se mira como dueño de la tabla: la API no lee `atributos`).
do $$ begin
  if not exists (select 1 from public.leads where atributos ? 'hobby_humo') then raise exception 'apagar el campo perdió lo cargado'; end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000030', false);
set role authenticated;
do $$ declare rechazo boolean; begin
  rechazo := false;
  begin perform public.crear_lead(gen_random_uuid(), '{"nombre": "Apagado", "telefono_principal": "70033001", "atributos": {"hobby_humo": "x"}}');
  exception when invalid_parameter_value then rechazo := true; end;
  if not rechazo then raise exception 'escribió en un campo desactivado'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare c uuid; begin
  select id into c from public.leads_campos where clave = 'hobby_humo';
  perform public.lead_campo_guardar(c, (select actualizado_en from public.leads_campos where id = c), '{"activo": true}');
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000030', false);
set role authenticated;
do $$ declare v uuid; begin
  v := (public.crear_lead(gen_random_uuid(), '{"nombre": "Reactivado", "telefono_principal": "70033002", "atributos": {"hobby_humo": "Lectura"}}') ->> 'id')::uuid;
  if (select atributos ->> 'hobby_humo' from public.leads_vista where id = v) <> 'Lectura' then raise exception 'reactivar el campo no lo devolvió'; end if;
  -- Una asesora con alcance «propios» sólo ve el suyo: el lead de antes es de otra cartera.
  if (select count(*) from public.leads_vista where atributos ->> 'hobby_humo' is not null) <> 1 then raise exception 'sólo debía ver el suyo'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test leads: las seis columnas pasan a atributos, se retiran con su enum y la vista sigue
select set_config('request.jwt.claim.sub', '', false);
reset role;
do $$ declare v uuid; n int; a jsonb;
begin
  -- Se arma el estado de antes de la migración: las columnas y el enum, con un lead que las usa.
  create type public.genero_persona as enum ('femenino', 'masculino', 'otro', 'sin_especificar');
  alter table public.leads add column edad smallint, add column ciudad text, add column pais text,
    add column direccion text, add column genero public.genero_persona not null default 'sin_especificar', add column notas text;
  insert into public.leads (nombre, telefono_principal, creado_por, edad, ciudad, pais, direccion, genero, notas)
    values ('Migrado Humo', '59170044001', '00000000-0000-0000-0000-000000000030', 28, ' La Paz ', 'Bolivia', 'Av. 6 de Agosto', 'femenino', 'Dejó su tarjeta')
    returning id into v;
  insert into public.leads (nombre, telefono_principal, creado_por) values ('Sin datos Humo', '59170044002', '00000000-0000-0000-0000-000000000030');
  insert into public.leads (nombre, telefono_principal, creado_por, genero, ciudad) values ('Vacío Humo', '59170044003', '00000000-0000-0000-0000-000000000030', 'sin_especificar', '   ');

  select public._leads_columnas_a_atributos() into n;
  if n < 3 then raise exception 'tocó % leads, esperaba al menos 3', n; end if;
  select atributos into a from public.leads where id = v;
  if a <> '{"edad": 28, "ciudad": "La Paz", "pais": "Bolivia", "direccion": "Av. 6 de Agosto", "genero": "femenino", "notas": "Dejó su tarjeta"}'::jsonb then
    raise exception 'lo copiado: %', a; end if;
  if (select atributos from public.leads where nombre = 'Sin datos Humo') <> '{}'::jsonb then raise exception 'un lead sin datos debía quedar sin atributos'; end if;
  if (select atributos from public.leads where nombre = 'Vacío Humo') <> '{}'::jsonb then raise exception '«sin_especificar» y un texto en blanco son «sin dato»'; end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'leads' and column_name in ('edad', 'ciudad', 'pais', 'direccion', 'genero', 'notas')) then
    raise exception 'las columnas siguen ahí'; end if;
  if exists (select 1 from pg_type where typname = 'genero_persona') then raise exception 'el enum siguió'; end if;
  -- Correrla otra vez no hace nada: ya no hay columnas.
  if public._leads_columnas_a_atributos() <> 0 then raise exception 'la segunda corrida tocó algo'; end if;
  -- La vista se recrea con la misma definición.
  perform public._leads_vista_crear();
  delete from public.leads where nombre in ('Migrado Humo', 'Sin datos Humo', 'Vacío Humo');
end $$;
-- La vista sigue sirviendo a quien tiene el lead.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000030', false);
set role authenticated;
do $$ begin
  if (select count(*) from public.leads_vista where nombre = 'Reactivado') <> 1 then raise exception 'la vista no devolvió el lead'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test alta rápida: el lead, su primer seguimiento y el recordatorio entran juntos, y un reintento no duplica
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-000000000040', 'alta-a@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000041', 'alta-b@ejemplo.com', '{"invitado": true}');
-- Sin campo requerido (los de otros bloques) y con dos orígenes de lead activos.
update public.leads_campos set requerido = false where requerido;
update public.origenes_lead set activo = (clave in ('facebook', 'web'));
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ begin
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-000000000040', (select id from public.roles where clave = 'asesor'), true);
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-000000000041', (select id from public.roles where clave = 'asesor'), true);
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$
declare
  v_web uuid := (select id from public.origenes_lead where clave = 'web');
  v_otro uuid := (select id from public.origenes_lead where clave = 'otro');
  v_wa uuid := (select id from public.tipos_seguimiento where clave = 'whatsapp');
  v_intento uuid := gen_random_uuid();
  v_manana timestamptz := now() + interval '1 day';
  r jsonb; r2 jsonb; ctx jsonb; v_id uuid;
begin
  -- El contexto trae lo activo y el código de país de la empresa.
  ctx := public.lead_alta_contexto();
  if jsonb_array_length(ctx -> 'origenes') <> 2 or jsonb_array_length(ctx -> 'tipos_seguimiento') < 1 or ctx ->> 'telefono_cc' <> '+591' then
    raise exception 'el contexto del alta: %', ctx; end if;
  if ctx -> 'ultimo_origen_id' <> 'null'::jsonb then raise exception 'todavía no hay último origen: %', ctx; end if;
  if not (ctx -> 'empresa' ? 'ciudad' and ctx -> 'empresa' ? 'pais') then raise exception 'el contexto no trae la empresa: %', ctx; end if;
  if (public.verificar_telefono(null, '710 000-01') ->> 'estado') <> 'libre' then raise exception 'debía estar libre'; end if;

  -- Hay orígenes activos: sin elegir uno no entra, y uno desactivado tampoco; el campo va en el hint.
  begin perform public.crear_lead(gen_random_uuid(), '{"nombre": "Sin origen", "telefono_principal": "71000001"}', null);
    raise exception 'creó un lead sin origen';
  exception when invalid_parameter_value then
    declare h text; begin get stacked diagnostics h = pg_exception_hint; if h <> 'origen_lead_id' then raise exception 'hint: %', h; end if; end;
  end;
  begin perform public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'Origen apagado', 'telefono_principal', '71000001', 'origen_lead_id', v_otro), null);
    raise exception 'aceptó un origen desactivado';
  exception when invalid_parameter_value then null; end;
  begin perform public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', '  ', 'telefono_principal', '71000001', 'origen_lead_id', v_web), null);
    raise exception 'aceptó un nombre en blanco';
  exception when invalid_parameter_value then null; end;

  -- Entra todo junto.
  r := public.crear_lead(v_intento, jsonb_build_object('nombre', ' Lead Alta Humo ', 'telefono_principal', '(710) 000-01',
        'origen_lead_id', v_web, 'atributos', '{"ciudad": "Santa Cruz"}'::jsonb),
       jsonb_build_object('tipo_id', v_wa, 'titulo', 'Pidió precio del RAV4', 'detalle', 'Lo vio en Facebook.'),
       jsonb_build_object('recordar_en', v_manana));
  if r ->> 'resultado' <> 'creado' or (r ->> 'repetido')::boolean or r ->> 'numero' is null then raise exception 'alta: %', r; end if;
  v_id := (r ->> 'id')::uuid;
  if v_id <> v_intento then raise exception 'el lead debía nacer con el id del intento'; end if;
  if (select telefono_principal from public.leads_vista where id = v_id) <> '59171000001' then raise exception 'teléfono normalizado'; end if;
  if (select telefono_cc from public.leads_vista where id = v_id) <> '+591' then raise exception 'código de país del lead'; end if;
  if (select nombre from public.leads_vista where id = v_id) <> 'Lead Alta Humo' then raise exception 'el nombre se guarda sin espacios sobrantes'; end if;
  if (select count(*) from public.seguimientos where lead_id = v_id and titulo = 'Pidió precio del RAV4' and detalle_texto = 'Lo vio en Facebook.' and detalle_html is null and visibilidad = 'privado') <> 1 then
    raise exception 'el seguimiento'; end if;
  if (select count(*) from public.recordatorios where lead_id = v_id and titulo = 'Pidió precio del RAV4' and recordar_en = v_manana and usuario_id = '00000000-0000-0000-0000-000000000040') <> 1 then
    raise exception 'el recordatorio (sin título propio usa el del seguimiento)'; end if;
  if (select ultimo_seguimiento_en from public.leads_vista where id = v_id) is null then raise exception 'ultimo_seguimiento_en'; end if;
  if not exists (select 1 from public.leads_asesores where lead_id = v_id and usuario_id = '00000000-0000-0000-0000-000000000040' and tipo_acceso = 'dueno') then
    raise exception 'quien crea queda de dueño'; end if;
  -- El último origen usado se recuerda por persona.
  if (public.lead_alta_contexto() ->> 'ultimo_origen_id')::uuid <> v_web then raise exception 'último origen'; end if;

  -- Se perdió la respuesta y la persona reintenta con el mismo intento: lo mismo, sin duplicar.
  r2 := public.crear_lead(v_intento, jsonb_build_object('nombre', 'Lead Alta Humo', 'telefono_principal', '71000001', 'origen_lead_id', v_web),
        jsonb_build_object('tipo_id', v_wa, 'titulo', 'Pidió precio del RAV4'), null);
  if r2 ->> 'resultado' <> 'creado' or (r2 ->> 'repetido')::boolean is not true or r2 ->> 'id' <> r ->> 'id' then raise exception 'reintento: %', r2; end if;
  if (select count(*) from public.leads_vista where telefono_principal = '59171000001') <> 1 or (select count(*) from public.seguimientos where lead_id = v_id) <> 1 then
    raise exception 'el reintento duplicó'; end if;
  -- Otro intento con el mismo teléfono: existe y es mío, no un error.
  r2 := public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'Otra vez', 'telefono_principal', '+591 71000001', 'origen_lead_id', v_web), null);
  if r2 ->> 'resultado' <> 'existe' or (r2 -> 'verificacion' ->> 'es_mio')::boolean is not true or (r2 -> 'verificacion' ->> 'numero') <> r ->> 'numero' then
    raise exception 'duplicado propio: %', r2; end if;
end $$;
reset role;
-- La constancia (actividad sólo la lee quien tiene actividad.ver).
do $$ begin
  if not exists (select 1 from public.actividad a join public.leads l on l.id::text = a.registro_id
                  where a.accion = 'lead.creado' and l.telefono_principal = '59171000001'
                    and a.actor_id = '00000000-0000-0000-0000-000000000040' and a.detalle ->> 'intento' = l.id::text) then
    raise exception 'sin constancia de la alta'; end if;
end $$;

-- @test alta rápida: si algo falla a mitad no queda un lead sin seguimiento
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$
declare
  v_web uuid := (select id from public.origenes_lead where clave = 'web');
  v_wa uuid := (select id from public.tipos_seguimiento where clave = 'whatsapp');
  v_antes bigint := (select count(*) from public.leads);
  v_seg_antes bigint := (select count(*) from public.seguimientos);
  r jsonb;
begin
  -- Recordatorio con fecha pasada.
  begin perform public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'Pasado', 'telefono_principal', '71000002', 'origen_lead_id', v_web),
        jsonb_build_object('tipo_id', v_wa, 'titulo', 'x'), jsonb_build_object('recordar_en', now() - interval '1 hour'));
    raise exception 'aceptó un recordatorio en el pasado';
  exception when invalid_parameter_value then
    declare h text; begin get stacked diagnostics h = pg_exception_hint; if h <> 'recordatorio.recordar_en' then raise exception 'hint: %', h; end if; end;
  end;
  -- Seguimiento sin resumen, y con un tipo que no existe.
  begin perform public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'Sin resumen', 'telefono_principal', '71000002', 'origen_lead_id', v_web),
        jsonb_build_object('tipo_id', v_wa, 'titulo', '  '));
    raise exception 'aceptó un seguimiento sin resumen';
  exception when invalid_parameter_value then null; end;
  begin perform public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'Tipo', 'telefono_principal', '71000002', 'origen_lead_id', v_web),
        jsonb_build_object('tipo_id', gen_random_uuid(), 'titulo', 'x'));
    raise exception 'aceptó un tipo de seguimiento que no existe';
  exception when invalid_parameter_value then null; end;
  -- Un atributo que no es de ningún campo rechaza todo.
  begin perform public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'Atributo', 'telefono_principal', '71000002', 'origen_lead_id', v_web,
        'atributos', '{"no_existe": 1}'::jsonb), jsonb_build_object('tipo_id', v_wa, 'titulo', 'x'));
    raise exception 'aceptó un atributo que no existe';
  exception when invalid_parameter_value then null; end;
  if (select count(*) from public.leads) <> v_antes or (select count(*) from public.seguimientos) <> v_seg_antes then
    raise exception 'un rechazo dejó algo a medias'; end if;
  -- Un fallo DESPUÉS de escribir el lead (el seguimiento viola una restricción) también lo revierte.
  begin perform public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'Falla tarde', 'telefono_principal', '71000003', 'origen_lead_id', v_web),
        jsonb_build_object('tipo_id', v_wa, 'titulo', repeat('x', 121)));
    raise exception 'aceptó un resumen demasiado largo';
  exception when invalid_parameter_value then null; end;
  if (select count(*) from public.leads_vista where telefono_principal = '59171000003') <> 0 then raise exception 'quedó el lead'; end if;
  -- Sin seguimiento (la importación lo permite): entra sólo el lead.
  r := public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'Sin seguimiento', 'telefono_principal', '71000004', 'origen_lead_id', v_web), null);
  if r ->> 'resultado' <> 'creado' then raise exception 'sin seguimiento: %', r; end if;
end $$;
-- Un tipo de seguimiento desactivado no se ofrece ni se acepta.
reset role;
update public.tipos_seguimiento set activo = false where clave = 'otro';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ begin
  if exists (select 1 from jsonb_array_elements(public.lead_alta_contexto() -> 'tipos_seguimiento') t where t ->> 'clave' = 'otro') then
    raise exception 'ofreció un tipo desactivado'; end if;
  begin perform public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'Apagado', 'telefono_principal', '71000005',
        'origen_lead_id', (select id from public.origenes_lead where clave = 'web')),
        jsonb_build_object('tipo_id', (select id from public.tipos_seguimiento where clave = 'otro'), 'titulo', 'x'));
    raise exception 'aceptó un tipo desactivado';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
update public.tipos_seguimiento set activo = true where clave = 'otro';

-- @test alta rápida: permisos y lo que se ve de un teléfono ajeno
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
set role authenticated;
do $$ begin
  begin perform public.crear_lead(gen_random_uuid(), '{"nombre": "Sin permiso", "telefono_principal": "71000009"}');
    raise exception 'creó un lead sin leads.crear';
  exception when insufficient_privilege then null; end;
  begin perform public.verificar_telefono(null, '71000001'); raise exception 'verificó sin leads.crear';
  exception when insufficient_privilege then null; end;
  begin perform public.lead_alta_contexto(); raise exception 'leyó el contexto sin leads.crear';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000041', false);
set role authenticated;
do $$
declare
  v_web uuid := (select id from public.origenes_lead where clave = 'web');
  r jsonb; v_dueno text := (select nombre from public.perfiles where id = '00000000-0000-0000-0000-000000000040');
begin
  -- Es de otra persona: se sabe de quién y nada más (ni nombre, ni número, ni id del lead).
  r := public.verificar_telefono(null, '71000001');
  if r ->> 'estado' <> 'de_otro' or r ->> 'dueno' is distinct from v_dueno then raise exception 'de otro: %', r; end if;
  if r ? 'lead_id' or r ? 'nombre' or r ? 'numero' or r ? 'tipo' then raise exception 'se filtró algo del lead: %', r; end if;
  r := public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'Intruso', 'telefono_principal', '+591 710 00001', 'origen_lead_id', v_web), null);
  if r ->> 'resultado' <> 'de_otro' or (r -> 'verificacion') ? 'nombre' then raise exception 'crear sobre un teléfono ajeno: %', r; end if;
  -- Y no ve el lead.
  if exists (select 1 from public.leads_vista where nombre = 'Lead Alta Humo') then raise exception 've el lead ajeno'; end if;
end $$;
reset role;
do $$ begin
  if (select count(*) from public.leads where telefono_principal = '59171000001') <> 1 then raise exception 'duplicó un teléfono ajeno'; end if;
end $$;

-- @test alta rápida: adoptar del limbo exige consentimiento, deja de dueño y no pisa lo que el lead ya tiene
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$
declare
  v_web uuid := (select id from public.origenes_lead where clave = 'web');
  v_fb uuid := (select id from public.origenes_lead where clave = 'facebook');
  v_wa uuid := (select id from public.tipos_seguimiento where clave = 'whatsapp');
begin
  perform public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'Del Limbo Humo', 'telefono_principal', '71000010',
    'origen_lead_id', v_web, 'atributos', '{"ciudad": "Santa Cruz"}'::jsonb), null);
end $$;
reset role;
-- La baja de su dueño lo manda al limbo.
update public.leads_asesores set revocado_en = now()
 where lead_id = (select id from public.leads where telefono_principal = '59171000010') and revocado_en is null;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000041', false);
set role authenticated;
do $$
declare
  v_fb uuid := (select id from public.origenes_lead where clave = 'facebook');
  v_web uuid := (select id from public.origenes_lead where clave = 'web');
  v_wa uuid := (select id from public.tipos_seguimiento where clave = 'whatsapp');
  v_intento uuid := gen_random_uuid();
  r jsonb; v_id uuid;
  v_datos jsonb;
begin
  r := public.verificar_telefono(null, '71000010');
  if r <> '{"estado": "limbo"}'::jsonb then raise exception 'el limbo no dice nada del lead: %', r; end if;
  v_datos := jsonb_build_object('nombre', 'Otro Nombre', 'telefono_principal', '71000010', 'origen_lead_id', v_fb,
      'atributos', '{"ciudad": "La Paz", "direccion": "Calle 9"}'::jsonb);
  -- Sin «Tomar lead» no se adopta.
  r := public.crear_lead(gen_random_uuid(), v_datos, null);
  if r ->> 'resultado' <> 'limbo' then raise exception 'adoptó sin consentimiento: %', r; end if;
  if exists (select 1 from public.leads_asesores where usuario_id = '00000000-0000-0000-0000-000000000041') then
    raise exception 'quedó en la cartera sin pedirlo'; end if;
  -- Con él, sí: dueño, constancia, y lo que había no se pisa.
  r := public.crear_lead(v_intento, v_datos || '{"adoptar": true}'::jsonb,
       jsonb_build_object('tipo_id', v_wa, 'titulo', 'Retomado'), null);
  if r ->> 'resultado' <> 'adoptado' then raise exception 'adopción: %', r; end if;
  v_id := (r ->> 'id')::uuid;
  if not exists (select 1 from public.leads_asesores where lead_id = v_id and usuario_id = '00000000-0000-0000-0000-000000000041' and tipo_acceso = 'dueno' and revocado_en is null) then
    raise exception 'quien adopta queda de dueño'; end if;
  if (select nombre from public.leads_vista where id = v_id) <> 'Del Limbo Humo' then raise exception 'pisó el nombre'; end if;
  if (select origen_lead_id from public.leads_vista where id = v_id) <> v_web then raise exception 'pisó el origen'; end if;
  if (select atributos from public.leads_vista where id = v_id) <> '{"ciudad": "Santa Cruz", "direccion": "Calle 9"}'::jsonb then
    raise exception 'los atributos: %', (select atributos from public.leads_vista where id = v_id); end if;
  if (select count(*) from public.seguimientos where lead_id = v_id and titulo = 'Retomado') <> 1 then raise exception 'el seguimiento de la adopción'; end if;
  -- Reintento del mismo intento: lo mismo, sin sumar nada.
  r := public.crear_lead(v_intento, v_datos || '{"adoptar": true}'::jsonb, jsonb_build_object('tipo_id', v_wa, 'titulo', 'Retomado'), null);
  if r ->> 'resultado' <> 'adoptado' or (r ->> 'repetido')::boolean is not true or (r ->> 'id')::uuid <> v_id then raise exception 'reintento de la adopción: %', r; end if;
  if (select count(*) from public.seguimientos where lead_id = v_id and titulo = 'Retomado') <> 1 then raise exception 'el reintento duplicó el seguimiento'; end if;
end $$;
reset role;
do $$ begin
  if (select count(*) from public.actividad a join public.leads l on l.id::text = a.registro_id
       where a.accion = 'lead.adoptado_del_limbo' and l.telefono_principal = '59171000010'
         and a.actor_id = '00000000-0000-0000-0000-000000000041') <> 1 then
    raise exception 'sin constancia de la adopción (o dos: el reintento no suma)'; end if;
end $$;
-- Quien ya fue de la cartera y la perdió vuelve a adoptar (la fila de cartera existe, revocada).
update public.leads_asesores set revocado_en = now()
 where lead_id = (select id from public.leads where telefono_principal = '59171000010') and revocado_en is null;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000041', false);
set role authenticated;
do $$ declare r jsonb; begin
  r := public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'x', 'telefono_principal', '71000010', 'adoptar', true,
        'origen_lead_id', (select id from public.origenes_lead where clave = 'web')), null);
  if r ->> 'resultado' <> 'adoptado' then raise exception 'readopción: %', r; end if;
  if (select count(*) from public.leads_asesores where usuario_id = '00000000-0000-0000-0000-000000000041' and lead_id = (r ->> 'id')::uuid) <> 1 then
    raise exception 'duplicó su fila de cartera'; end if;
end $$;
reset role;

-- @test alta rápida: el teléfono y el código de país de la empresa
do $$ begin
  if public.normalizar_telefono('+591', '70011002') <> '59170011002' then raise exception 'nacional'; end if;
  if public.normalizar_telefono('+591', '0 70011002') <> '59170011002' then raise exception 'sin el 0 troncal'; end if;
  if public.normalizar_telefono('+591', '(7) 001-1002') <> '59170011002' then raise exception 'con paréntesis y guiones'; end if;
  if public.normalizar_telefono('+591', '+54 9 11 5555-0000') <> '5491155550000' then raise exception 'de otro país con +'; end if;
  if public.normalizar_telefono('+591', '0054 9 11 5555-0000') <> '5491155550000' then raise exception 'de otro país con 00'; end if;
  if public.normalizar_telefono(null, '+591 70011002') <> '59170011002' then raise exception 'internacional sin código de empresa'; end if;
  begin perform public.normalizar_telefono('+591', '7001abcd'); raise exception 'aceptó letras';
  exception when invalid_parameter_value then null; end;
  begin perform public.normalizar_telefono('+591', '700'); raise exception 'aceptó uno corto';
  exception when invalid_parameter_value then null; end;
  begin perform public.normalizar_telefono('+591', '1234567890123456'); raise exception 'aceptó uno largo';
  exception when invalid_parameter_value then null; end;
  begin perform public.normalizar_telefono('+591', '7001+1002'); raise exception 'aceptó un + en medio';
  exception when invalid_parameter_value then null; end;
  begin perform public.normalizar_telefono(null, '70011002'); raise exception 'aceptó un nacional sin código de empresa';
  exception when invalid_parameter_value then null; end;
end $$;
-- El código de país se edita en Empresa, con su forma.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare v timestamptz; begin
  v := (select actualizado_en from public.ajustes_empresa);
  begin perform public.empresa_guardar_ajustes('{"telefono_cc": "591"}', v); raise exception 'aceptó un código sin +';
  exception when invalid_parameter_value then null; end;
  v := public.empresa_guardar_ajustes('{"telefono_cc": "+54"}', v);
  if (select telefono_cc from public.ajustes_empresa) <> '+54' then raise exception 'no guardó el código'; end if;
  if public.lead_alta_contexto() ->> 'telefono_cc' <> '+54' then raise exception 'el contexto no lo trae'; end if;
  v := public.empresa_guardar_ajustes('{"telefono_cc": null}', v);
  if (select telefono_cc from public.ajustes_empresa) is not null then raise exception 'no lo vació'; end if;
  perform public.empresa_guardar_ajustes('{"telefono_cc": "+591"}', v);
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);
