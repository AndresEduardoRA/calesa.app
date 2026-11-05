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
  n := (public.equipo_dar_de_baja('00000000-0000-0000-0000-000000000002') ->> 'leads_al_limbo')::int;
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
do $$ declare v uuid; l uuid; o uuid; r jsonb; begin
  select id into v from public.vehiculos where lote = '58741223';
  select id into l from public.leads_vista where nombre = 'Ana Quispe';
  select id into o from public.origenes where clave = 'subasta_usa';
  -- Desde el 4.10-2 una cotización se crea por `cotizacion_crear()`: la base calcula con la fórmula publicada. El vehículo de este humo no trae el tipo de
  -- vehículo que casa con la tabla del transporte (queda sin valor y se tipea, como dice la ficha de cotizaciones): se tipea, y la nacionalización, que cualquiera edita.
  r := public.cotizacion_crear(gen_random_uuid(), o, l, '{"inputs": {"remate": 14200}, "overrides": {"transporte_bolivia": 3000, "nacionalizacion": 1201}}',
                               public.cotizacion_hoja(o) ->> 'abierta', v);   -- la hoja que «abrió» (D2): la firma la base, para él y para ese origen
  if (r -> 'cotizacion' ->> 'total_base')::numeric <= 0 or r ->> 'repetido' <> 'false' then raise exception 'cotizacion_crear no calculó el total: %', r; end if;
  perform set_config('humo.cotizacion', r -> 'cotizacion' ->> 'id', false);
  -- La policy de lectura decide por fila (4.10-1): quien la creó la lee. Que otra persona sin su lead no la lea lo prueba `cotizaciones-visibilidad.sql`.
  if (select count(*) from public.cotizaciones where id = (r -> 'cotizacion' ->> 'id')::uuid) <> 1 then raise exception 'quien creó la cotización no la lee'; end if;
end $$;
reset role;
-- Un cambio de la fila deja su revisión con el diff (el trigger, que sigue siendo `definer`: desde el 4.10-2 nadie edita `cotizaciones` directo; la edición por RPC es del prompt 3).
update public.cotizaciones set notas = 'ajuste' where id = current_setting('humo.cotizacion')::uuid;
do $$ begin
  if (select count(*) from public.cotizaciones_revisiones where cotizacion_id = current_setting('humo.cotizacion')::uuid) <> 1 then raise exception 'sin revisión con diff'; end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare c uuid; v uuid; f_comp uuid; h bigint; res jsonb; begin
  c := current_setting('humo.cotizacion')::uuid;
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

-- @test portal: otorgar, login con clave, bloqueo tras 5 fallos, snapshot sin costos (lo demás: portal-cliente.sql)
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', false);
set role authenticated;
do $$ declare l uuid; r jsonb; begin
  select id into l from public.leads_vista where nombre = 'Ana Quispe';
  r := public.otorgar_portal(l, 'clave-segura-123', null);
  if r ->> 'codigo' !~ '^[A-Z]{2,4}-[2-9A-HJ-NP-Z]{5}$' then raise exception 'código mal: %', r; end if;
  if r ? 'clave' then raise exception 'devolvió una clave que no generó: %', r; end if;
end $$;
reset role;
do $$ declare l uuid; cod text; en timestamptz; i int; snap jsonb; begin
  select lead_id, codigo, otorgado_en into l, cod, en from public.accesos_portal;
  if (select count(*) from web.portal_login(cod, 'clave-segura-123')) <> 1 then raise exception 'login válido falló'; end if;
  for i in 1..5 loop perform web.portal_login(cod, 'mala'); end loop;
  if (select count(*) from web.portal_login(cod, 'clave-segura-123')) <> 0 then raise exception 'debía estar bloqueado'; end if;
  snap := web.portal_snapshot(l, en);
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
-- La semilla trae el diseño de cada fórmula (4.08-3): el ⚙ lo copia a la v2 y vuelve a validarlo.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare o uuid; f2 uuid; d text; begin
  select id into o from public.origenes where clave = 'subasta_usa';
  f2 := public.formula_cambiar_constante(o, 'flete', 1500);
  if (select version from public.formulas where id = f2) <> 2 or (select estado from public.formulas where id = f2) <> 'publicada' then raise exception 'v2 no publicada'; end if;
  if (select count(*) from public.formulas where origen_id = o and estado = 'archivada') <> 1 then raise exception 'v1 no archivada'; end if;
  if (select diseno from public.formulas where id = f2) is null or (select visibilidad from public.formulas where id = f2) is null then raise exception 'la v2 no lleva el diseño ni su visibilidad'; end if;
  -- Con la forma completa (con su etiqueta), para que el rechazo sea por la referencia y no por la forma.
  begin
    perform public.formula_guardar_borrador(o, '{"nodos": [{"id": "a", "tipo": "calculo", "op": "suma", "de": ["zzz"], "etiqueta": "A", "salida": "total"}]}', '{}', null);
    raise exception 'aceptó referencia inexistente';
  exception when invalid_parameter_value then
    get stacked diagnostics d = pg_exception_detail;
    if d is distinct from 'referencia_inexistente' then raise exception 'rechazó por «%», no por la referencia inexistente', d; end if;
  end;
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
  begin perform public.cotizacion_guardar(current_setting('humo.cotizacion')::uuid, gen_random_uuid(), null, '{}', null, null, null, (select c.vehiculo_id from public.cotizaciones c where c.id = current_setting('humo.cotizacion')::uuid), false); raise exception 'guardó una cotización sin versión';
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
-- Compartir exige que el destino vea leads: la invitada es asesora mientras dura este bloque.
insert into public.usuarios_roles (usuario_id, rol_id)
select '00000000-0000-0000-0000-000000000005', r.id from public.roles r where r.clave = 'asesor';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ declare propio uuid; compartido uuid; begin
  propio := (public.crear_lead(gen_random_uuid(), '{"nombre": "Luis Choque", "telefono_cc": "+591", "telefono_principal": "70000021"}') ->> 'id')::uuid;
  compartido := (public.crear_lead(gen_random_uuid(), '{"nombre": "Marta Vaca", "telefono_cc": "+591", "telefono_principal": "70000022"}') ->> 'id')::uuid;
  perform public.lead_compartir(compartido, '00000000-0000-0000-0000-000000000005');
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
  mandados := (public.equipo_dar_de_baja('00000000-0000-0000-0000-000000000004') ->> 'leads_al_limbo')::int;
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
delete from public.usuarios_roles where usuario_id = '00000000-0000-0000-0000-000000000005';

-- @test baja en curso (cierre 1): mientras sus leads se pasan por lotes, todos ven el estado final
-- P (6) tiene tres leads: uno sólo suyo, uno compartido con Q (7) y otro también compartido con Q. R (8) es otra asesora.
-- La baja se deja «en curso» a mano (la cuenta apagada y la fila de equipo_bajas sin lotes): es lo que ve el resto entre el
-- primer lote y el último.
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000001b6', 'baja-p@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000001b7', 'baja-q@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000001b8', 'baja-r@ejemplo.com', '{"invitado": true}');
update public.perfiles set nombre = 'Pía Baja' where id = '00000000-0000-0000-0000-0000000001b6';
update public.perfiles set nombre = 'Quique Comparte' where id = '00000000-0000-0000-0000-0000000001b7';
update public.perfiles set nombre = 'Raquel Toma' where id = '00000000-0000-0000-0000-0000000001b8';
insert into public.usuarios_roles (usuario_id, rol_id, es_principal)
select u, r.id, true from public.roles r,
  unnest(array['00000000-0000-0000-0000-0000000001b6', '00000000-0000-0000-0000-0000000001b7', '00000000-0000-0000-0000-0000000001b8']::uuid[]) u
 where r.clave = 'asesor';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000001b6', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ declare l2 uuid; l3 uuid; begin
  perform public.crear_lead(gen_random_uuid(), '{"nombre": "Baja Solo", "telefono_cc": "+591", "telefono_principal": "70000031"}');
  l2 := (public.crear_lead(gen_random_uuid(), '{"nombre": "Baja Compartido", "telefono_cc": "+591", "telefono_principal": "70000032"}') ->> 'id')::uuid;
  l3 := (public.crear_lead(gen_random_uuid(), '{"nombre": "Baja Otro", "telefono_cc": "+591", "telefono_principal": "70000033"}') ->> 'id')::uuid;
  perform public.lead_compartir(l2, '00000000-0000-0000-0000-0000000001b7');
  perform public.lead_compartir(l3, '00000000-0000-0000-0000-0000000001b7');
end $$;
reset role;
update public.perfiles set activo = false, baja_en = now(), baja_por = '00000000-0000-0000-0000-000000000001' where id = '00000000-0000-0000-0000-0000000001b6';
insert into public.equipo_bajas (usuario_id, por) values ('00000000-0000-0000-0000-0000000001b6', '00000000-0000-0000-0000-000000000001');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare l2 uuid; l3 uuid; c jsonb; begin
  -- La dueña ve «todos»: el lead sólo de P ya es limbo; los compartidos siguen, sin P en «Quién lo tiene».
  if (select count(*) from public.leads_vista where nombre = 'Baja Solo') <> 0 then raise exception 'un lead sólo de quien está en baja se ve: ya es limbo'; end if;
  select id into l2 from public.leads_vista where nombre = 'Baja Compartido';
  select id into l3 from public.leads_vista where nombre = 'Baja Otro';
  if l2 is null or l3 is null then raise exception 'los compartidos con alguien que se queda se siguen viendo'; end if;
  if public.puede_lead((select id from public.leads where nombre = 'Baja Solo'), 'leads.ver') then raise exception 'puede_lead ve el limbo en curso'; end if;
  if (public.verificar_telefono('+591', '70000031') ->> 'estado') <> 'limbo' then raise exception 'el teléfono del lead sólo de P no dice limbo'; end if;
  c := public.lead_cartera(l2);
  if jsonb_array_length(c) <> 1 or (c -> 0 ->> 'usuario_id') <> '00000000-0000-0000-0000-0000000001b7' then raise exception 'quien está en baja sigue en «Quién lo tiene»: %', c; end if;
  if (public.equipo_vista_previa_baja('00000000-0000-0000-0000-0000000001b7') ->> 'leads_al_limbo')::int <> 2 then raise exception 'para la vista previa de Q, P ya no cuenta: sus dos compartidos irían al limbo'; end if;
  -- Compartir con quien está en baja: no está activa.
  begin perform public.lead_compartir(l2, '00000000-0000-0000-0000-0000000001b6'); raise exception 'compartió con alguien en baja';
  exception when sqlstate '22023' then null; end;
  -- Transferir con el dueño viejo choca; sin dueño (el estado final), pasa y aplica la baja a ese lead.
  begin perform public.lead_transferir(l2, '00000000-0000-0000-0000-0000000001b8', '00000000-0000-0000-0000-0000000001b6'); raise exception 'transfirió con un dueño que ya no está';
  exception when sqlstate 'PT409' then null; end;
  perform public.lead_transferir(l2, '00000000-0000-0000-0000-0000000001b8', null);
  if exists (select 1 from public.leads_asesores where lead_id = l2 and usuario_id = '00000000-0000-0000-0000-0000000001b6' and revocado_en is null) then raise exception 'transferir no aplicó la baja al lead'; end if;
  if (select cartera from public.leads where id = l2) <> array['00000000-0000-0000-0000-0000000001b7', '00000000-0000-0000-0000-0000000001b8']::uuid[] then raise exception 'la cartera de l2 no quedó con Q y R'; end if;
  -- Quitar a Q de l3 lo dejaría sin nadie (P ya no cuenta): se rechaza.
  begin perform public.lead_revocar_acceso(l3, '00000000-0000-0000-0000-0000000001b7'); raise exception 'quitar acceso creó un limbo';
  exception when sqlstate '23514' then null; end;
end $$;
-- Una asesora, con la baja a medias, ve el estado final también en el dueño: la vista, la cabecera de la ficha («Lo tiene …»)
-- y el «Quién lo tiene» dicen lo mismo, y lo que `_bajas_en_curso()` le deja saber lo entrega `perfiles` a toda cuenta activa.
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000001b7', false);
set role authenticated;
do $$ declare l3 uuid; f jsonb; begin
  select id into l3 from public.leads_vista where nombre = 'Baja Otro';
  if l3 is null then raise exception 'Q no ve el lead que comparte con quien está en baja'; end if;
  if (select dueno_id from public.leads_vista where id = l3) is not null then raise exception 'leads_vista.dueno_id nombra a quien está en baja'; end if;
  -- La tabla misma (PostgREST la lee con `authenticated`): tampoco entrega la fila de quien está en baja (cierre 3, 0a).
  if exists (select 1 from public.leads_asesores where lead_id = l3 and usuario_id = '00000000-0000-0000-0000-0000000001b6') then raise exception 'leads_asesores entrega la fila de quien está en baja'; end if;
  if (select count(*) from public.leads_asesores where lead_id = l3 and revocado_en is null) <> 1 then raise exception 'Q debería leer sólo su propia fila vigente del lead'; end if;
  f := public.lead_ficha(l3);
  if f ->> 'tiene_id' is distinct from '00000000-0000-0000-0000-0000000001b7' then raise exception 'la ficha dice que lo tiene quien está en baja, no Q: %', f ->> 'tiene_nombre'; end if;
  if (select count(*) from jsonb_array_elements(public.lead_cartera(l3)) c where c ->> 'usuario_id' = '00000000-0000-0000-0000-0000000001b6') <> 0 then raise exception 'Quién lo tiene nombra a quien está en baja'; end if;
  if not (public._bajas_en_curso() <@ array(select p.id from public.perfiles p)) then raise exception '_bajas_en_curso() dice más de lo que perfiles entrega'; end if;
  if public._bajas_en_curso() <> array['00000000-0000-0000-0000-0000000001b6']::uuid[] then raise exception 'una cuenta activa no ve la baja en curso: %', public._bajas_en_curso(); end if;
end $$;
reset role;
-- Una cuenta que ya no está activa (la de quien se va, con su sesión todavía abierta, y una bloqueada) no se entera de quién más
-- está en baja: lo que devuelve `_bajas_en_curso()` es siempre un subconjunto de lo que `perfiles` le entrega.
insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-0000-0000-0000000001b9', 'baja-bloqueada@ejemplo.com', '{"invitado": true}');
update public.perfiles set bloqueado = true, bloqueado_en = now(), bloqueo_motivo = 'prueba' where id = '00000000-0000-0000-0000-0000000001b9';
do $$ declare u text; begin
  foreach u in array array['00000000-0000-0000-0000-0000000001b6', '00000000-0000-0000-0000-0000000001b9'] loop
    perform set_config('request.jwt.claim.sub', u, true);
    set local role authenticated;
    if public._bajas_en_curso() <> '{}'::uuid[] then raise exception 'una cuenta que no está activa (%) ve las bajas en curso: %', u, public._bajas_en_curso(); end if;
    if exists (select 1 from public.perfiles) then raise exception 'una cuenta que no está activa lee perfiles'; end if;
    if exists (select 1 from public.leads_vista) then raise exception 'una cuenta que no está activa lee leads'; end if;
    reset role;
  end loop;
  perform set_config('request.jwt.claim.sub', '', true);
  -- Sin sesión (los jobs, service_role) sigue viendo la lista entera.
  if public._bajas_en_curso() <> array['00000000-0000-0000-0000-0000000001b6']::uuid[] then raise exception 'sin sesión no ve la baja en curso: %', public._bajas_en_curso(); end if;
end $$;
-- Como la base: la vista y la fuente (`_lead_dueno`) dicen lo mismo para todo lead mientras dura la baja.
do $$ begin
  if exists (select 1 from public.leads_vista v where v.dueno_id is distinct from public._lead_dueno(v.id)) then raise exception 'leads_vista.dueno_id y _lead_dueno() no coinciden con una baja en curso'; end if;
end $$;
-- R adopta el lead sólo de P al registrar su teléfono: no choca con el dueño único y se cuenta en la baja.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000001b8', false);
set role authenticated;
do $$ declare r jsonb; begin
  r := public.crear_lead(gen_random_uuid(), '{"nombre": "Baja Solo", "telefono_cc": "+591", "telefono_principal": "70000031", "adoptar": true}');
  if r ->> 'resultado' <> 'adoptado' then raise exception 'esperaba adoptado: %', r; end if;
end $$;
reset role;
do $$ declare b public.equipo_bajas; begin
  if (select leads_al_limbo from public.equipo_bajas where usuario_id = '00000000-0000-0000-0000-0000000001b6') <> 1 then raise exception 'el lead que pasó por el limbo al adoptarlo no se contó'; end if;
  -- El job termina lo que queda (l3: Q se queda con él).
  perform public.equipo_bajas_continuar();
  select * into b from public.equipo_bajas where usuario_id = '00000000-0000-0000-0000-0000000001b6';
  if b.terminada_en is null then raise exception 'el job no terminó la baja'; end if;
  if b.leads_al_limbo <> 1 then raise exception 'esperaba 1 lead al limbo en total, hubo %', b.leads_al_limbo; end if;
  if exists (select 1 from public.leads_asesores where usuario_id = '00000000-0000-0000-0000-0000000001b6' and revocado_en is null) then raise exception 'quedaron filas vigentes de quien se dio de baja'; end if;
  if exists (select 1 from public.leads l where l.cartera is distinct from public._lead_cartera_calcular(l.id)) then raise exception 'una cartera no coincide con su fuente'; end if;
  if not exists (select 1 from public.actividad where accion = 'usuario.baja_terminada' and registro_id = '00000000-0000-0000-0000-0000000001b6') then raise exception 'sin constancia del final de la baja'; end if;
  if public.equipo_bajas_continuar() <> '{"lotes": 0, "terminadas": 0}'::jsonb then raise exception 'sin bajas en curso el job no hace nada'; end if;
end $$;
-- Quien gestiona el equipo lee la baja; una asesora, no.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000001b7', false);
set role authenticated;
do $$ begin
  if exists (select 1 from public.equipo_bajas) then raise exception 'una asesora lee las bajas'; end if;
  begin insert into public.equipo_bajas (usuario_id) values ('00000000-0000-0000-0000-0000000001b7'); raise exception 'una asesora escribió una baja';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test baja en curso: toda lectura de la cartera que nombra a una persona dice quién se queda (inventario)
-- Una función o vista de `public`/`web` que lee las filas vigentes de `leads_asesores` y no mira `_bajas_en_curso()` tiene que
-- estar acá con su motivo: o decide desde quien llama, o escribe después de aplicar la baja al lead que bloqueó, o es de la baja.
-- Una nueva que nombra a alguien sin el filtro hace fallar esta prueba (cierre 2: `dueno_id`, la ficha y el portal lo hacían).
do $$ declare r record; v_faltan text[] := '{}'; v_listadas constant text[] := array[
  -- desde quien llama (su propia fila de la cartera)
  '_lead_vivo_en_mi_cartera', 'en_cartera', 'mis_leads', 'telefono_lead', 'leads_cartera_corta',
  -- escriben la cartera tras `_lead_aplicar_bajas` sobre el lead que bloquearon, o la revocan ellas mismas
  'lead_compartir', 'lead_revocar_acceso', 'lead_salir', 'lead_transferir', 'lead_cartera_candidatos',
  -- la propia baja y el cálculo de la cartera (la fuente, con todos los vigentes)
  '_baja_lote_desde', '_baja_terminar', '_lead_aplicar_bajas', '_lead_cartera_calcular', '_leads_cartera_recalcular',
  -- decide por permisos propios, sin nombrar a nadie
  '_lead_motivo_para_deshacer', '_leads_vista_crear',
  -- desde quien llama: sólo SUS filas vigentes de la cartera (`usuario_id = auth.uid()`), unidas a `leads_vista` (que cuenta la baja) y
  -- bajo las policies de `leads` y de `leads_asesores` (invoker), que filtran a quien está en una baja en curso (5a-fix-1a)
  'leads_cartera_vista',
  -- arma la consulta de los candidatos con `p_fuera` (= `_bajas_en_curso()`, lo calcula `leads_candidatos`) dentro de `_lead_visible_para()` y recorre la cartera de quien llama (5a-fix-1b)
  '_leads_candidatos_sql'];
begin
  for r in select n.nspname, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname in ('public', 'web') and p.prokind = 'f'
              and p.prosrc ~* 'leads_asesores' and p.prosrc ~* 'revocado_en is null' and p.prosrc !~ '_bajas_en_curso'
              and p.proname <> all (v_listadas) loop
    v_faltan := v_faltan || (r.nspname || '.' || r.proname);
  end loop;
  for r in select n.nspname, c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname in ('public', 'web') and c.relkind = 'v'
              and pg_get_viewdef(c.oid) ~* 'leads_asesores' and pg_get_viewdef(c.oid) !~ '_bajas_en_curso'
              and c.relname <> all (v_listadas) loop
    v_faltan := v_faltan || ('vista ' || r.nspname || '.' || r.relname);
  end loop;
  if cardinality(v_faltan) > 0 then
    raise exception 'leen la cartera vigente sin mirar _bajas_en_curso() ni figurar en el inventario: %', v_faltan;
  end if;
end $$;

-- @test baja en curso: toda policy que lee la cartera filtra a quien está en baja (inventario de pg_policies, cierre 3)
-- Lo mismo que el inventario de arriba, para las policies: una que lee `leads_asesores` (la tabla, o a través de una subconsulta
-- de otra) y no mira `_bajas_en_curso()` tiene que figurar acá con su motivo. La de la propia tabla lo hacía mal desde la 4b y
-- el inventario de funciones y vistas no la veía.
do $$ declare r record; v_faltan text[] := '{}'; v_listadas constant text[] := array[
  -- «leads: leer» no nombra la tabla: usa `leads.cartera` (la copia de la fila), que ya cuenta a quien está en baja como fuera
  ]::text[];
begin
  for r in select p.schemaname, p.tablename, p.policyname from pg_policies p
            where (coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '')) ~* 'leads_asesores'
              and (coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '')) !~ '_bajas_en_curso'
              and p.schemaname || '.' || p.tablename || ': ' || p.policyname <> all (v_listadas) loop
    v_faltan := v_faltan || (r.schemaname || '.' || r.tablename || ': ' || r.policyname);
  end loop;
  if cardinality(v_faltan) > 0 then
    raise exception 'policies que leen leads_asesores sin mirar _bajas_en_curso() ni figurar en el inventario: %', v_faltan;
  end if;
  if not exists (select 1 from pg_policies p where p.tablename = 'leads_asesores' and p.qual ~ '_bajas_en_curso') then
    raise exception 'la policy de leads_asesores dejó de filtrar a quien está en baja';
  end if;
end $$;

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
  if h.valor_anterior <> 11.68 or h.valor_nuevo <> 6.97 or h.cambiado_por is distinct from '00000000-0000-0000-0000-000000000001'::uuid then raise exception 'el historial no registró el cambio: %', h; end if;
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

  -- Interesados: ver el vehículo y poder editar el lead. Marcar es poner: la misma nota no cambia nada,
  -- otra la reemplaza (nunca se ignora en silencio).
  r := public.vehiculo_interesado_marcar(ajeno, suyo, '  Lo quiere en blanco  ');
  if r ->> 'resultado' <> 'marcado' or r ->> 'nota' <> 'Lo quiere en blanco' then raise exception 'marcar: %', r; end if;
  r := public.vehiculo_interesado_marcar(ajeno, suyo, 'Lo quiere en blanco');
  if r ->> 'resultado' <> 'sin_cambios' then raise exception 'marcar dos veces lo mismo: %', r; end if;
  r := public.vehiculo_interesado_marcar(ajeno, suyo, 'Lo quiere en rojo');
  if r ->> 'resultado' <> 'nota_cambiada' then raise exception 'otra nota: %', r; end if;
  if (select count(*) from public.vehiculo_interesados(ajeno) i where i.lead_nombre = 'Lead de Irene' and i.nota = 'Lo quiere en rojo' and i.por_nombre = 'Irene Paz') <> 1 then raise exception 'la lectura de interesados no trae lo marcado'; end if;
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
do $$ declare v uuid := 'bbbbbbbb-0000-4000-8000-000000000001'; de_bruno uuid := 'cccccccc-0000-4000-8000-000000000009'; usa uuid; r jsonb; begin
  -- Reemplazar le quita el vehículo a la cartera de Irene: Bruno no la tiene, así que no puede (y no se
  -- le dice cuál lead es). Lo desvincula (es una acción sobre el vehículo) y recién ahí lo vincula.
  begin perform public.vehiculo_vincular(v, (select actualizado_en from public.vehiculos where id = v), de_bruno); raise exception 'reemplazó el lead de un vehículo sin tener el actual';
  exception when check_violation then null; end;
  r := public.vehiculo_vincular(v, (select actualizado_en from public.vehiculos where id = v), null);
  if r ->> 'resultado' <> 'desvinculado' then raise exception 'desvincular: %', r; end if;
  r := public.vehiculo_vincular(v, (select actualizado_en from public.vehiculos where id = v), de_bruno);
  if r ->> 'resultado' <> 'vinculado' then raise exception 'vincular: %', r; end if;
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
  -- Los números se comparan como hojas y la foto por su nombre entero: «3333» suelto calzaba con los microsegundos de `actualizado_en` (4.10-3b).
  if exists (select 1 from jsonb_path_query(to_jsonb(w), 'strict $.**') h
              where (jsonb_typeof(h) = 'number' and (h #>> '{}')::numeric in (17999, 18500, 45123)) or (jsonb_typeof(h) = 'string' and h #>> '{}' in ('17999', '18500', '45123')))
     or to_jsonb(w)::text ~ ('JTFVTR|' || repeat('3', 64)) then raise exception 'se filtró un dato que no es público: %', to_jsonb(w); end if;
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
  if not exists (select 1 from cron.job j where j.jobname = 'papelera-purgar' and j.schedule = '30 * * * *' and j.command like '%papelera_purgar_vencidos()%') then raise exception 'la purga automática no quedó programada'; end if;
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
  perform public.lead_compartir((select id from public.leads where nombre = 'Privado Humo'), '00000000-0000-0000-0000-000000000001');
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
  perform public.lead_revocar_acceso((select id from public.leads where nombre = 'Privado Humo'), '00000000-0000-0000-0000-000000000001');
  -- Al dueño no se le revoca, y el mensaje habla de tú.
  rechazo := false;
  begin perform public.lead_revocar_acceso((select id from public.leads where nombre = 'Privado Humo'), '00000000-0000-0000-0000-000000000030');
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
  perform public.lead_transferir((select id from public.leads where nombre = 'Privado Humo'), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000030');
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

  -- La función de una migración vieja recrea `leads_vista` con `drop view`: `leads_cartera_vista` (5a-fix-1a) y `leads_vista_por_ids` (5a-fix-1b)
  -- dependen de ella y se rehacen junto con ella más abajo, con `_leads_vista_crear()`.
  drop function if exists public.leads_vista_por_ids(uuid[]);  -- devuelve el tipo de `leads_vista` (5a-fix-1b): también la rehace `_leads_vista_crear()`
  drop view if exists public.leads_cartera_vista;
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
       jsonb_build_object('tipo_id', v_wa, 'titulo', 'Pidió precio del RAV4', 'detalle', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Lo vio en Facebook."}]}]}'::jsonb),
       jsonb_build_object('recordar_en', v_manana));
  if r ->> 'resultado' <> 'creado' or (r ->> 'repetido')::boolean or r ->> 'numero_propio' is null or r ->> 'numero' is not null then raise exception 'alta: %', r; end if;
  v_id := (r ->> 'id')::uuid;
  if v_id <> v_intento then raise exception 'el lead debía nacer con el id del intento'; end if;
  if (select telefono_principal from public.leads_vista where id = v_id) <> '59171000001' then raise exception 'teléfono normalizado'; end if;
  if (select telefono_cc from public.leads_vista where id = v_id) <> '+591' then raise exception 'código de país del lead'; end if;
  if (select nombre from public.leads_vista where id = v_id) <> 'Lead Alta Humo' then raise exception 'el nombre se guarda sin espacios sobrantes'; end if;
  if (select count(*) from public.seguimientos where lead_id = v_id and titulo = 'Pidió precio del RAV4' and detalle_texto = 'Lo vio en Facebook.' and detalle_doc is not null and visibilidad = 'privado') <> 1 then
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
  if r2 ->> 'resultado' <> 'existe' or (r2 -> 'verificacion' ->> 'es_mio')::boolean is not true or (r2 -> 'verificacion' ->> 'numero_propio') <> r ->> 'numero_propio' or r2 -> 'verificacion' ->> 'numero' is not null then
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
  -- Cierre 5a-fix-2: el intento adoptado sólo se busca si el alta trae `adoptar`. El mismo intento SIN la bandera ya no dice «adoptado,
  -- repetido»: es un alta normal de un teléfono que ya es suyo («existe»), y no adopta, ni crea, ni suma nada.
  r := public.crear_lead(v_intento, v_datos, jsonb_build_object('tipo_id', v_wa, 'titulo', 'Retomado'), null);
  if r ->> 'resultado' <> 'existe' or r ? 'id' then raise exception 'el mismo intento sin adoptar: %', r; end if;
  if (select count(*) from public.seguimientos where lead_id = v_id and titulo = 'Retomado') <> 1 then raise exception 'sin adoptar sumó un seguimiento'; end if;
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

-- @test listado de leads: «míos» es la cartera, «todos» ve lo ajeno enmascarado y sin privados, y el limbo y la papelera no aparecen
-- Dos campos: una cédula (nace «solo la cartera») y un color (lo ve quien ve el lead).
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ begin
  perform public.lead_campo_crear('listado_ci', 'Cédula del listado', 'documento');
  perform public.lead_campo_crear('listado_color', 'Color del listado', 'texto');
  if not (select solo_cartera from public.leads_campos where clave = 'listado_ci') then raise exception 'la cédula debía nacer privada'; end if;
end $$;
reset role;
-- Dos asesores («propios») crean uno cada uno; la dueña («todos») no está en ninguna cartera.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare v_web uuid := (select id from public.origenes_lead where clave = 'web'); r jsonb; begin
  r := public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'Listado Propio', 'telefono_principal', '72000001', 'origen_lead_id', v_web,
        'atributos', '{"listado_ci": "CI-777", "listado_color": "rojo"}'::jsonb));
  if r ->> 'resultado' <> 'creado' then raise exception 'alta A: %', r; end if;
  r := public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'Listado Limbo', 'telefono_principal', '72000003', 'origen_lead_id', v_web));
  if r ->> 'resultado' <> 'creado' then raise exception 'alta limbo: %', r; end if;
  r := public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'Listado Papelera', 'telefono_principal', '72000004', 'origen_lead_id', v_web));
  if r ->> 'resultado' <> 'creado' then raise exception 'alta papelera: %', r; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000041', false);
set role authenticated;
do $$ declare v_web uuid := (select id from public.origenes_lead where clave = 'web'); r jsonb; begin
  r := public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'Listado Ajeno', 'telefono_principal', '72000002', 'origen_lead_id', v_web,
        'atributos', '{"listado_ci": "CI-888", "listado_color": "azul"}'::jsonb));
  if r ->> 'resultado' <> 'creado' then raise exception 'alta B: %', r; end if;
end $$;
reset role;
-- Uno al limbo (sin cartera vigente) y uno a la papelera: ni «todos» los ve.
update public.leads_asesores set revocado_en = now() where lead_id = (select id from public.leads where nombre = 'Listado Limbo');
update public.leads set eliminado_en = now() where nombre = 'Listado Papelera';
-- Los números globales, tomados como la base: la app ya no los lee de `leads`.
select set_config('humo.num_ajeno', (select numero::text from public.leads where nombre = 'Listado Ajeno'), false),
       set_config('humo.num_limbo', (select numero::text from public.leads where nombre = 'Listado Limbo'), false),
       set_config('humo.num_papelera', (select numero::text from public.leads where nombre = 'Listado Papelera'), false);

-- «Propios»: sólo lo suyo, y todo lo que ve está en su cartera.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare n int; begin
  select count(*) into n from public.leads_vista where nombre like 'Listado %';
  if n <> 1 then raise exception '«propios» debía ver 1 de los suyos, vio %', n; end if;
  if exists (select 1 from public.leads_vista where en_cartera is not true) then raise exception '«propios» vio un lead que no es de su cartera'; end if;
  if exists (select 1 from public.leads_vista v where v.en_cartera <> (v.id in (select public.mis_leads()))) then
    raise exception 'en_cartera debía coincidir con mis_leads()'; end if;
  if (select telefono_principal from public.leads_vista where nombre = 'Listado Propio') <> '59172000001' then raise exception 'su teléfono, completo'; end if;
  if (select atributos ->> 'listado_ci' from public.leads_vista where nombre = 'Listado Propio') is distinct from 'CI-777' then raise exception 'su privado, completo'; end if;
  -- Lo ajeno no se alcanza ni por número ni por nombre.
  if exists (select 1 from public.leads_vista where numero = current_setting('humo.num_ajeno')::bigint or numero_visible = current_setting('humo.num_ajeno')::bigint) then raise exception 'vio lo ajeno por número'; end if;
  -- Sin leads.numero_global.ver nunca llega un global; el propio, sólo del que creó.
  if exists (select 1 from public.leads_vista where numero is not null) then raise exception '«propios» vio un número global'; end if;
  if (select numero_propio from public.leads_vista where nombre = 'Listado Propio') is null then raise exception 'no vio su propio número'; end if;
  if exists (select 1 from public.leads_vista where nombre = 'Listado Limbo' or nombre = 'Listado Papelera') then raise exception 'vio un lead en limbo o en la papelera'; end if;
end $$;
reset role;

-- «Todos»: ve lo ajeno con el teléfono enmascarado, sin la cédula, y «míos» queda vacío.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare n int; a jsonb; t text; begin
  select count(*) into n from public.leads_vista where nombre in ('Listado Propio', 'Listado Ajeno');
  if n <> 2 then raise exception '«todos» debía ver los 2, vio %', n; end if;
  if exists (select 1 from public.leads_vista where nombre like 'Listado %' and en_cartera) then raise exception 'la dueña no está en esas carteras'; end if;
  if exists (select 1 from public.leads_vista v where v.en_cartera <> (v.id in (select public.mis_leads()))) then
    raise exception 'en_cartera debía coincidir con mis_leads()'; end if;
  select telefono_principal, atributos into t, a from public.leads_vista where nombre = 'Listado Ajeno';
  if t = '59172000002' or t not like '%•%' or t not like '591%02' then raise exception 'el teléfono ajeno debía llegar enmascarado: %', t; end if;
  if a ? 'listado_ci' then raise exception 'llegó la cédula ajena: %', a; end if;
  if a ->> 'listado_color' is distinct from 'azul' then raise exception 'el color sí lo ve quien ve el lead: %', a; end if;
  -- Filtrar también es leer: por la cédula ajena, ni exacta ni por contención ni por clave.
  if exists (select 1 from public.leads_vista where atributos ->> 'listado_ci' = 'CI-888') then raise exception 'filtró por la cédula ajena (->>)'; end if;
  if exists (select 1 from public.leads_vista where atributos @> '{"listado_ci": "CI-888"}') then raise exception 'filtró por la cédula ajena (@>)'; end if;
  if exists (select 1 from public.leads_vista where atributos ? 'listado_ci' and nombre = 'Listado Ajeno') then raise exception 'filtró por la clave ajena (?)'; end if;
  -- Y sí encuentra por lo que ve: el color.
  if (select count(*) from public.leads_vista where atributos ->> 'listado_color' = 'azul') <> 1 then raise exception 'por el color'; end if;
  -- Ni el limbo ni la papelera, tampoco para «todos» ni por número.
  if exists (select 1 from public.leads_vista where nombre in ('Listado Limbo', 'Listado Papelera')) then raise exception '«todos» vio un lead en limbo o en la papelera'; end if;
  if exists (select 1 from public.leads_vista where numero in (current_setting('humo.num_limbo')::bigint, current_setting('humo.num_papelera')::bigint)) then
    raise exception 'los encontró por número'; end if;
  -- Con el permiso (el dueño lo tiene) ve el global y el propio de lo ajeno.
  if (select numero from public.leads_vista where nombre = 'Listado Ajeno') is distinct from current_setting('humo.num_ajeno')::bigint then raise exception '«todos» con el permiso no vio el global'; end if;
  if (select numero_propio from public.leads_vista where nombre = 'Listado Ajeno') is null then raise exception '«todos» con el permiso no vio el propio ajeno'; end if;
end $$;
reset role;

-- Sin leads.ver: nada, ni por número.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
set role authenticated;
do $$ begin
  if (select count(*) from public.leads_vista) <> 0 then raise exception 'sin leads.ver no hay filas'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test alcance_de: la lectura barata dice lo mismo que mis_permisos() para cada permiso y origen
do $$
declare
  u uuid; r record; esperado public.alcance_permiso; obtenido public.alcance_permiso; n int := 0;
begin
  for u in select id from public.perfiles where id in (
      '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000030',
      '00000000-0000-0000-0000-000000000040') loop
    perform set_config('request.jwt.claim.sub', u::text, true);
    set local role authenticated;
    for r in
      select p.clave, o.origen_id
      from public.permisos p
      cross join (select null::uuid as origen_id union all select id from public.origenes) o
    loop
      select case when bool_or(m.alcance = 'todos') then 'todos'::public.alcance_permiso
                  when count(*) > 0 then 'propios'::public.alcance_permiso end
        into esperado
      from public.mis_permisos() m
      where m.clave = r.clave and (m.origen_id is null or r.origen_id is null or m.origen_id = r.origen_id);
      obtenido := public.alcance_de(r.clave, r.origen_id);
      n := n + 1;
      if obtenido is distinct from esperado then
        reset role;
        raise exception 'alcance_de(%, %) para %: % y mis_permisos dice %', r.clave, r.origen_id, u, obtenido, esperado;
      end if;
    end loop;
    reset role;
  end loop;
  if n < 100 then raise exception 'la prueba casi no comparó nada: %', n; end if;
  -- Una persona bloqueada o sin rol no tiene alcance.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000ff', true);
  set local role authenticated;
  if public.alcance_de('leads.ver') is not null then reset role; raise exception 'un desconocido tiene alcance'; end if;
  reset role;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test ficha del lead: lead_ficha, teléfonos y telefono_lead recortan según la cartera, y leads_telefonos no se lee directo
-- Una cédula (privada por tipo) y un color; dos asesores («propios») con un lead cada uno; la dueña («todos»).
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ begin
  perform public.lead_campo_crear('ficha_ci', 'Cédula de la ficha', 'documento');
  perform public.lead_campo_crear('ficha_color', 'Color de la ficha', 'texto');
end $$;
reset role;
update public.perfiles set nombre = 'Berta Ficha' where id = '00000000-0000-0000-0000-000000000040';
-- 42: sólo ve (leads.ver «todos»). 43: asesor («propios») sin ningún lead. 44: sin rol.
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-000000000042', 'lectora-ficha@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000043', 'asesor-sin-leads-ficha@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000044', 'sin-rol-ficha@ejemplo.com', '{"invitado": true}');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
select public.rbac_asignar_rol('00000000-0000-0000-0000-000000000043', (select id from public.roles where clave = 'asesor'), true);
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare v_web uuid := (select id from public.origenes_lead where clave = 'web'); r jsonb; begin
  r := public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'Ficha Propia', 'telefono_principal', '73000001', 'origen_lead_id', v_web,
        'atributos', '{"ficha_ci": "CI-111", "ficha_color": "rojo"}'::jsonb));
  if r ->> 'resultado' <> 'creado' then raise exception 'alta A: %', r; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000041', false);
set role authenticated;
do $$ declare v_web uuid := (select id from public.origenes_lead where clave = 'web'); r jsonb; begin
  r := public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'Ficha Ajena', 'telefono_principal', '73000002', 'origen_lead_id', v_web,
        'atributos', '{"ficha_ci": "CI-222", "ficha_color": "azul"}'::jsonb));
  if r ->> 'resultado' <> 'creado' then raise exception 'alta B: %', r; end if;
end $$;
reset role;
-- Dos extras de uno y diez del otro, escritos como dueño de la base: la app no los escribe todavía.
insert into public.leads_telefonos (lead_id, telefono, etiqueta, creado_en)
select (select id from public.leads where nombre = 'Ficha Propia'), '59173100001', 'Casa', now() - interval '2 minutes'
union all select (select id from public.leads where nombre = 'Ficha Propia'), '59173100002', null, now() - interval '1 minute';
insert into public.leads_telefonos (lead_id, telefono, etiqueta, creado_en)
select (select id from public.leads where nombre = 'Ficha Ajena'), '5917320000' || g, 'Extra ' || g, now() - make_interval(mins => 20 - g) from generate_series(1, 9) g
union all select (select id from public.leads where nombre = 'Ficha Ajena'), '59173200010', 'Extra 10', now() - interval '1 minute';

-- La tabla no admite un duplicado dentro del lead, una etiqueta vacía ni un número mal formado; el
-- mismo número en otro lead sí vale (son alternos: no hay unicidad entre leads).
do $$ declare v uuid := (select id from public.leads where nombre = 'Ficha Propia'); o uuid := (select id from public.leads where nombre = 'Ficha Ajena'); begin
  begin insert into public.leads_telefonos (lead_id, telefono) values (v, '59173100001'); raise exception 'aceptó un duplicado dentro del lead';
  exception when unique_violation then null; end;
  begin insert into public.leads_telefonos (lead_id, telefono, etiqueta) values (v, '59173100003', ''); raise exception 'aceptó una etiqueta vacía';
  exception when check_violation then null; end;
  begin insert into public.leads_telefonos (lead_id, telefono) values (v, 'no-es-un-numero'); raise exception 'aceptó un número mal formado';
  exception when check_violation then null; end;
  begin insert into public.leads_telefonos (lead_id, telefono, etiqueta) values (v, '59173100004', repeat('x', 41)); raise exception 'aceptó una etiqueta de 41';
  exception when check_violation then null; end;
  insert into public.leads_telefonos (lead_id, telefono) values (o, '59173100001');
  delete from public.leads_telefonos where lead_id = o and telefono = '59173100001';
end $$;

-- La cartera recibe todo.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare f jsonb; begin
  f := public.lead_ficha((select id from public.leads where nombre = 'Ficha Propia'));
  if f is null then raise exception 'la cartera no vio su ficha'; end if;
  if not (f ->> 'en_cartera')::boolean then raise exception 'en_cartera'; end if;
  if f ->> 'telefono' <> '59173000001' then raise exception 'el principal, completo: %', f ->> 'telefono'; end if;
  if jsonb_array_length(f -> 'telefonos') <> 2 or f #>> '{telefonos,0,telefono}' <> '59173100001' or f #>> '{telefonos,0,etiqueta}' <> 'Casa' then
    raise exception 'los extras, completos y con su etiqueta: %', f -> 'telefonos'; end if;
  if f #>> '{atributos,ficha_ci}' is distinct from 'CI-111' then raise exception 'su privado: %', f -> 'atributos'; end if;
  if f ->> 'tiene_nombre' is distinct from 'Berta Ficha' then raise exception 'quién lo tiene: %', f ->> 'tiene_nombre'; end if;
  if (select count(*) from public.lead_telefonos((select id from public.leads where nombre = 'Ficha Propia'))) <> 2 then raise exception 'lead_telefonos de la cartera'; end if;
  if public.telefono_lead((select id from public.leads where nombre = 'Ficha Propia')) <> '59173000001' then raise exception 'telefono_lead de la cartera'; end if;
  -- La tabla no se lee directo, tampoco la propia.
  begin perform 1 from public.leads_telefonos limit 1; raise exception 'leyó leads_telefonos directo';
  exception when insufficient_privilege then null; end;
  begin insert into public.leads_telefonos (lead_id, telefono) values ((select id from public.leads where nombre = 'Ficha Propia'), '59173999999'); raise exception 'escribió leads_telefonos directo';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- La dueña («todos») ve el lead ajeno con todo enmascarado y sin la cédula.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare f jsonb; t record; n int; begin
  f := public.lead_ficha((select id from public.leads where nombre = 'Ficha Ajena'));
  if f is null then raise exception '«todos» no vio la ficha ajena'; end if;
  if (f ->> 'en_cartera')::boolean then raise exception 'la dueña no está en esa cartera'; end if;
  if f ->> 'telefono' = '59173000002' or f ->> 'telefono' not like '%•%' then raise exception 'el principal, enmascarado: %', f ->> 'telefono'; end if;
  if f -> 'atributos' ? 'ficha_ci' then raise exception 'llegó la cédula ajena: %', f -> 'atributos'; end if;
  if f #>> '{atributos,ficha_color}' is distinct from 'azul' then raise exception 'el color sí: %', f -> 'atributos'; end if;
  if jsonb_array_length(f -> 'telefonos') <> 10 then raise exception 'los 10 extras: %', jsonb_array_length(f -> 'telefonos'); end if;
  for t in select x ->> 'telefono' as telefono from jsonb_array_elements(f -> 'telefonos') x loop
    if t.telefono not like '%•%' or t.telefono like '5917320000_' then raise exception 'un extra ajeno sin enmascarar: %', t.telefono; end if;
  end loop;
  if public.telefono_lead((select id from public.leads where nombre = 'Ficha Ajena')) not like '%•%' then raise exception 'telefono_lead de lo ajeno, enmascarado'; end if;
  -- Lo que se entrega de una ficha con 10 extras sigue siendo chico.
  if octet_length(f::text) > 8192 then raise exception 'la ficha pesa % bytes', octet_length(f::text); end if;
  select count(*) into n from public.lead_telefonos((select id from public.leads where nombre = 'Ficha Ajena'));
  if n <> 10 then raise exception 'lead_telefonos de «todos»: %', n; end if;
end $$;
reset role;

-- Quien no ve el lead (propios fuera de su cartera, sin leads.ver, inexistente, limbo y papelera): nada, y nulo.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000041', false);
set role authenticated;
do $$ declare v_propia uuid := (select id from public.leads where nombre = 'Ficha Propia'); begin
  if public.lead_ficha(v_propia) is not null then raise exception '«propios» vio la ficha de otra cartera'; end if;
  if public.telefono_lead(v_propia) is not null then raise exception 'telefono_lead dio el teléfono de otra cartera'; end if;
  if (select count(*) from public.lead_telefonos(v_propia)) <> 0 then raise exception 'lead_telefonos dio los extras de otra cartera'; end if;
  if public.lead_ficha(gen_random_uuid()) is not null then raise exception 'inventó una ficha'; end if;
  if public.telefono_lead(gen_random_uuid()) is not null then raise exception 'telefono_lead de un id inventado'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
set role authenticated;
do $$ declare v_propia uuid := (select id from public.leads where nombre = 'Ficha Propia'); begin
  if public.lead_ficha(v_propia) is not null then raise exception 'sin leads.ver vio una ficha'; end if;
  if public.telefono_lead(v_propia) is not null then raise exception 'sin leads.ver, telefono_lead dio un número'; end if;
  if (select count(*) from public.lead_telefonos(v_propia)) <> 0 then raise exception 'sin leads.ver, lead_telefonos dio filas'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);
-- Limbo y papelera: ni la dueña los ve.
insert into public.leads (id, nombre, telefono_principal, creado_por) values ('00000000-0000-0000-0000-00000000f001', 'Ficha Limbo', '59173000003', null);
insert into public.leads (id, nombre, telefono_principal, creado_por, eliminado_en) values ('00000000-0000-0000-0000-00000000f002', 'Ficha Papelera', '59173000004', '00000000-0000-0000-0000-000000000040', now());
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ begin
  if public.lead_ficha('00000000-0000-0000-0000-00000000f001') is not null then raise exception 'vio la ficha de un lead en el limbo'; end if;
  if public.lead_ficha('00000000-0000-0000-0000-00000000f002') is not null then raise exception 'vio la ficha de un lead en la papelera'; end if;
  if public.telefono_lead('00000000-0000-0000-0000-00000000f001') is not null or public.telefono_lead('00000000-0000-0000-0000-00000000f002') is not null then
    raise exception 'telefono_lead dio un número del limbo o de la papelera'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test ficha del lead: leads_asesores sólo muestra a quien lo tiene a quien ve el lead sin estar en la cartera
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare r uuid; v uuid; begin
  r := public.rbac_crear_rol('humo_ficha_lectura', 'Humo ficha lectura');
  perform public.rbac_otorgar(r, 'leads.ver', (select actualizado_en from public.roles where id = r), p_alcance => 'todos');
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-000000000042', r, true);
  -- La dueña lo comparte con otra persona: ahora la cartera de «Ficha Propia» son dos.
  perform public.lead_compartir((select id from public.leads where nombre = 'Ficha Propia'), '00000000-0000-0000-0000-000000000041');
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000042', false);
set role authenticated;
do $$ declare v_id uuid := (select id from public.leads where nombre = 'Ficha Propia'); n int; begin
  select count(*) into n from public.leads_asesores where lead_id = v_id;
  if n <> 1 then raise exception 'quien ve sin estar en la cartera debía ver sólo al dueño, vio % filas', n; end if;
  if (select tipo_acceso from public.leads_asesores where lead_id = v_id) <> 'dueno' then raise exception 'la fila visible es la del dueño'; end if;
  if (public.lead_ficha(v_id) ->> 'tiene_nombre') is distinct from 'Berta Ficha' then raise exception 'quién lo tiene sigue a la vista'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare v_id uuid := (select id from public.leads where nombre = 'Ficha Propia'); begin
  if (select count(*) from public.leads_asesores where lead_id = v_id) <> 2 then raise exception 'la cartera ve a las dos personas'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test ficha del lead: lead_guardar, la única puerta, con permiso, versión y los mismos mensajes
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare
  v_id uuid := (select id from public.leads where nombre = 'Ficha Propia');
  v0 timestamptz; v1 timestamptz; r jsonb; m text; s text;
begin
  v0 := (public.lead_ficha(v_id) ->> 'actualizado_en')::timestamptz;
  -- El UPDATE directo ya no existe.
  begin update public.leads set nombre = 'Directo' where id = v_id; raise exception 'actualizó directo';
  exception when insufficient_privilege then null; end;
  -- La versión es obligatoria.
  begin perform public.lead_guardar(v_id, null, '{"nombre": "Sin versión"}'); raise exception 'guardó sin versión';
  exception when raise_exception then
    if sqlerrm not like 'Falta la versión%' then raise; end if;
  end;
  -- Una clave suelta se rechaza diciendo dónde va.
  begin perform public.lead_guardar(v_id, v0, '{"ciudad": "La Paz"}'); raise exception 'aceptó una clave suelta';
  exception when others then
    if sqlstate <> '22023' or sqlerrm not like '%atributos%' then raise; end if;
  end;
  begin perform public.lead_guardar(v_id, v0, '{"telefono_principal": "59170000000"}'); raise exception 'cambió el teléfono por lead_guardar';
  exception when others then
    if sqlstate <> '22023' then raise; end if;
  end;
  -- El nombre, sin espacios ni vacío ni larguísimo.
  begin perform public.lead_guardar(v_id, v0, '{"nombre": "   "}'); raise exception 'aceptó un nombre vacío';
  exception when others then
    if sqlstate <> '22023' then raise; end if;
  end;
  begin perform public.lead_guardar(v_id, v0, jsonb_build_object('nombre', repeat('x', 121))); raise exception 'aceptó un nombre largo';
  exception when others then
    if sqlstate <> '22023' then raise; end if;
  end;
  begin perform public.lead_guardar(v_id, v0, '{"tipo_lead_id": "marciano"}'); raise exception 'aceptó un tipo que no es un identificador';
  exception when others then
    if sqlstate <> '22023' then raise; end if;
  end;
  begin perform public.lead_guardar(v_id, v0, '{"tipo_lead_id": "00000000-0000-4000-8000-00000000ffff"}'); raise exception 'aceptó un tipo inexistente';
  exception when others then
    if sqlstate <> '22023' or sqlerrm not like '%ya no existe%' then raise; end if;
  end;
  -- Un guardado real: nombre, tipo y un atributo; otro se quita con null.
  r := public.lead_guardar(v_id, v0, jsonb_build_object('nombre', '  Ficha Propia 2 ', 'tipo_lead_id', (select id from public.tipos_lead where clave = 'cliente'), 'atributos', '{"ficha_color": "verde"}'::jsonb));
  v1 := (r ->> 'actualizado_en')::timestamptz;
  if v1 <= v0 then raise exception 'guardar debía mover la versión'; end if;
  r := public.lead_ficha(v_id);
  if r ->> 'nombre' <> 'Ficha Propia 2' or r ->> 'tipo_lead_id' <> (select id from public.tipos_lead where clave = 'cliente')::text or r #>> '{atributos,ficha_color}' <> 'verde' or r #>> '{atributos,ficha_ci}' <> 'CI-111' then
    raise exception 'lo guardado: %', r; end if;
  -- El mismo parche con la versión de antes: no choca consigo mismo.
  r := public.lead_guardar(v_id, v0, jsonb_build_object('nombre', 'Ficha Propia 2', 'tipo_lead_id', (select id from public.tipos_lead where clave = 'cliente'), 'atributos', '{"ficha_color": "verde"}'::jsonb));
  if (r ->> 'actualizado_en')::timestamptz <> v1 then raise exception 'el reintento debía devolver la versión vigente'; end if;
  r := public.lead_guardar(v_id, v1, '{"atributos": {"ficha_color": null}}');
  if public.lead_ficha(v_id) #> '{atributos,ficha_color}' is not null then raise exception 'null quita la clave'; end if;
  -- Vaciarlo otra vez no cambia nada y no mueve la versión.
  v1 := (r ->> 'actualizado_en')::timestamptz;
  r := public.lead_guardar(v_id, v1, '{"atributos": {"ficha_color": null}}');
  if (r ->> 'actualizado_en')::timestamptz <> v1 then raise exception 'sin cambios no se mueve la versión'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test ficha del lead: seguimientos, compartir y transferir no mueven la versión; la papelera sí; el conflicto nombra a quien editó
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ begin
  perform public.lead_campo_crear('ficha_ver', 'Campo de la versión', 'texto');
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);
do $$ declare
  v_id uuid := (select id from public.leads where nombre = 'Ficha Ajena');
  v0 timestamptz; v1 timestamptz; v2 timestamptz; m text;
begin
  v0 := (select actualizado_en from public.leads where id = v_id);
  -- Ficha Ajena es de 0041. 0041 edita (v1), después la dueña la comparte y entra un seguimiento.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000041', true);
  set local role authenticated;
  v1 := (public.lead_guardar(v_id, v0, '{"nombre": "Ficha Ajena 2"}') ->> 'actualizado_en')::timestamptz;
  reset role;
  if v1 <= v0 then raise exception 'editar mueve la versión'; end if;
  -- Un seguimiento (lo hace el trigger sobre ultimo_seguimiento_en).
  insert into public.seguimientos (lead_id, usuario_id, tipo_id, titulo)
  values (v_id, '00000000-0000-0000-0000-000000000041', (select id from public.tipos_seguimiento where clave = 'whatsapp'), 'Llamó');
  if (select ultimo_seguimiento_en from public.leads where id = v_id) is null then raise exception 'el seguimiento no marcó el lead'; end if;
  if (select actualizado_en from public.leads where id = v_id) <> v1 then raise exception 'un seguimiento no debe mover la versión'; end if;
  -- Compartir (lo hace la dueña) y transferir (lo hace quien lo tiene).
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  perform public.lead_compartir(v_id, '00000000-0000-0000-0000-000000000040');
  reset role;
  if (select actualizado_en from public.leads where id = v_id) <> v1 then raise exception 'compartir no debe mover la versión'; end if;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000041', true);
  set local role authenticated;
  perform public.lead_transferir(v_id, '00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000041');
  reset role;
  if (select actualizado_en from public.leads where id = v_id) <> v1 then raise exception 'transferir no debe mover la versión'; end if;
  -- 0040 tenía la ficha abierta con v0: choca, y el quién es 0041 (quien editó), no la dueña ni quien transfirió.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', true);
  set local role authenticated;
  begin
    perform public.lead_guardar(v_id, v0, '{"nombre": "Otra cosa"}');
    raise exception 'no hubo conflicto';
  exception when others then
    m := sqlerrm;
    if sqlstate <> 'PT409' then reset role; raise exception 'el conflicto debía ser PT409, fue % (%)', sqlstate, m; end if;
  end;
  reset role;
  -- 0041 no tiene nombre cargado: «Otra persona»; lo que importa es que no nombra a quien transfirió.
  if m not like '% cambió este lead %' then raise exception 'el mensaje del conflicto: %', m; end if;
  if m like 'Berta Ficha%' then raise exception 'el conflicto nombró a quien transfirió, no a quien editó: %', m; end if;
  -- Con la versión que tenía (v1), quien transfirió sí guarda: transferir no le dio un conflicto.
  set local role authenticated;
  v2 := (public.lead_guardar(v_id, v1, '{"nombre": "Ficha Ajena 3"}') ->> 'actualizado_en')::timestamptz;
  reset role;
  if v2 <= v1 then raise exception 'guardar con la versión vigente debía pasar'; end if;
  -- Quien editó en el medio se nombra: 0041 vuelve con v1 y choca con 0040.
  update public.perfiles set nombre = 'Berta Ficha' where id = '00000000-0000-0000-0000-000000000040';
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000041', true);
  set local role authenticated;
  begin
    perform public.lead_guardar(v_id, v1, '{"nombre": "Pisada"}');
    raise exception 'no hubo conflicto';
  exception when others then
    m := sqlerrm;
    if sqlstate <> 'PT409' then reset role; raise exception 'segundo conflicto: % (%)', sqlstate, m; end if;
  end;
  reset role;
  if m not like 'Berta Ficha cambió este lead%' then raise exception 'debía nombrar a Berta Ficha: %', m; end if;
  -- Lo derivado al revés: otro seguimiento y otro cambio de ultimo_seguimiento_en no la mueven.
  update public.leads set ultimo_seguimiento_en = now() where id = v_id;
  if (select actualizado_en from public.leads where id = v_id) <> v2 then raise exception 'ultimo_seguimiento_en no debe mover la versión'; end if;
  -- La papelera sí.
  update public.leads set eliminado_en = now(), eliminado_por = '00000000-0000-0000-0000-000000000040' where id = v_id;
  if (select actualizado_en from public.leads where id = v_id) <= v2 then raise exception 'la papelera debía mover la versión'; end if;
  update public.leads set eliminado_en = null, eliminado_por = null where id = v_id;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test ficha del lead: quién ve y quién edita, con el mismo mensaje para lo que no se ve
do $$ declare
  v_ajeno uuid := (select id from public.leads where nombre = 'Ficha Propia 2');
  v timestamptz := (select actualizado_en from public.leads where nombre = 'Ficha Propia 2');
  v_msg text; v_ref text; v_id uuid; u text; n int := 0;
begin
  v_ref := 'No encontramos este lead o no tienes acceso.';
  -- Sin acceso (propios, sin leads.ver), inexistente, limbo y papelera: el mismo texto y el mismo código.
  for u, v_id in
    select * from (values
      ('00000000-0000-0000-0000-000000000044'::text, v_ajeno),
      ('00000000-0000-0000-0000-000000000043', v_ajeno),
      ('00000000-0000-0000-0000-000000000001', gen_random_uuid()),
      ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000f001'::uuid),
      ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000f002'::uuid)) t (u, id)
  loop
    perform set_config('request.jwt.claim.sub', u, true);
    set local role authenticated;
    begin
      perform public.lead_guardar(v_id, v, '{"nombre": "Intruso"}');
      reset role;
      raise exception 'guardó un lead que no ve (%)', u;
    exception when others then
      reset role;
      if sqlerrm <> v_ref or sqlstate <> '42501' then raise exception 'mensaje distinto para %: % (%)', u, sqlerrm, sqlstate; end if;
      n := n + 1;
    end;
  end loop;
  if n <> 5 then raise exception 'se probaron % de 5 casos', n; end if;
  -- Ve pero no edita (leads.ver sin leads.editar): lo mismo que a quien no lo ve; no hay oráculo.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000042', true);
  set local role authenticated;
  begin
    perform public.lead_guardar(v_ajeno, v, '{"nombre": "Lectora"}');
    reset role;
    raise exception 'quien sólo ve editó';
  exception when others then
    reset role;
    if sqlerrm <> v_ref or sqlstate <> '42501' then raise exception 'sin leads.editar: % (%)', sqlerrm, sqlstate; end if;
  end;
  -- «Todos» no edita lo ajeno: editar es contenido (clase 1) y exige la cartera. Ni lo no privado.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  begin
    perform public.lead_guardar(v_ajeno, v, '{"nombre": "Ficha Propia 3", "atributos": {"ficha_color": "naranja"}}');
    reset role;
    raise exception '«todos» sin cartera editó un lead ajeno';
  exception when others then
    reset role;
    if sqlstate <> '42501' or sqlerrm <> v_ref then raise exception 'todos sin cartera: % (%)', sqlerrm, sqlstate; end if;
  end;
  if (select nombre from public.leads where id = v_ajeno) <> 'Ficha Propia 2' then raise exception 'el nombre cambió'; end if;
  if (select atributos ->> 'ficha_ci' from public.leads where id = v_ajeno) <> 'CI-111' then raise exception 'la cédula cambió'; end if;
  if (select actualizado_en from public.leads where id = v_ajeno) <> v then raise exception 'un rechazo movió la versión'; end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test ficha del lead: un requerido nuevo falta aunque sólo cambie el tipo; el privado no se le exige a quien no lo ve
do $$ declare
  v_id uuid := (select id from public.leads where nombre = 'Ficha Ajena 3');
  v timestamptz := (select actualizado_en from public.leads where nombre = 'Ficha Ajena 3');
  m text;
begin
  -- «Ficha Ajena 3» (de 0040 ahora) no tiene el campo nuevo: pasa a requerido en el layout.
  update public.leads_campos set requerido = true where clave = 'ficha_ver';
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', true);
  set local role authenticated;
  begin
    perform public.lead_guardar(v_id, v, jsonb_build_object('tipo_lead_id', (select id from public.tipos_lead where clave = 'cliente')));
    reset role;
    raise exception 'guardó un lead al que le falta un requerido';
  exception when others then
    reset role;
    if sqlstate <> '23502' or sqlerrm not like '%Campo de la versión%' then raise exception 'el requerido: % (%)', sqlerrm, sqlstate; end if;
  end;
  -- Con el dato, guarda.
  set local role authenticated;
  perform public.lead_guardar(v_id, v, jsonb_build_object('tipo_lead_id', (select id from public.tipos_lead where clave = 'cliente'), 'atributos', '{"ficha_ver": "ya"}'::jsonb));
  reset role;
  -- Una cédula requerida: quien está en la cartera la completa; la dueña, sin ser de la cartera, no edita nada.
  update public.leads_campos set requerido = false where clave = 'ficha_ver';
  update public.leads set atributos = atributos - 'ficha_ci' where id = v_id;
  update public.leads_campos set requerido = true where clave = 'ficha_ci';
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  begin
    perform public.lead_guardar(v_id, (select actualizado_en from public.leads where id = v_id), '{"nombre": "Ficha Ajena 4"}');
    reset role;
    raise exception 'la dueña sin cartera editó';
  exception when others then
    reset role;
    if sqlstate <> '42501' or sqlerrm <> 'No encontramos este lead o no tienes acceso.' then raise exception 'la dueña sin cartera: % (%)', sqlerrm, sqlstate; end if;
  end;
  update public.leads set nombre = 'Ficha Ajena 4' where id = v_id;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', true);
  set local role authenticated;
  begin
    perform public.lead_guardar(v_id, (select actualizado_en from public.leads where id = v_id), '{"nombre": "Ficha Ajena 5"}');
    reset role;
    raise exception 'la cartera guardó sin la cédula requerida';
  exception when others then
    reset role;
    if sqlstate <> '23502' or sqlerrm not like '%Cédula de la ficha%' then raise exception 'la cédula requerida: % (%)', sqlerrm, sqlstate; end if;
  end;
  update public.leads_campos set requerido = false where clave = 'ficha_ci';
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test ficha del lead: un origen o un campo desactivados con dato se conservan; no se pasa a otro desactivado
do $$ declare
  v_id uuid := (select id from public.leads where nombre = 'Ficha Ajena 4');
  v timestamptz; v_off uuid; v_off2 uuid; v_web uuid := (select id from public.origenes_lead where clave = 'web');
begin
  insert into public.origenes_lead (clave, nombre, activo) values ('ficha_off', 'Ficha apagado', true) returning id into v_off;
  insert into public.origenes_lead (clave, nombre, activo) values ('ficha_off2', 'Ficha apagado 2', false) returning id into v_off2;
  update public.leads set origen_lead_id = v_off where id = v_id;
  update public.origenes_lead set activo = false where id = v_off;
  update public.leads set atributos = atributos || '{"ficha_color": "guardado"}' where id = v_id;
  update public.leads_campos set activo = false where clave = 'ficha_color';
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', true);
  set local role authenticated;
  v := (public.lead_ficha(v_id) ->> 'actualizado_en')::timestamptz;
  -- Conservar el origen apagado (no se nombra, o se manda el mismo) no estorba.
  v := (public.lead_guardar(v_id, v, '{"nombre": "Con origen apagado"}') ->> 'actualizado_en')::timestamptz;
  v := (public.lead_guardar(v_id, v, jsonb_build_object('origen_lead_id', v_off, 'nombre', 'Con origen apagado 2')) ->> 'actualizado_en')::timestamptz;
  -- Pasar a otro apagado no.
  begin
    perform public.lead_guardar(v_id, v, jsonb_build_object('origen_lead_id', v_off2));
    reset role;
    raise exception 'pasó a un origen desactivado';
  exception when others then
    reset role;
    if sqlstate <> '22023' then raise exception 'origen apagado: % (%)', sqlerrm, sqlstate; end if;
  end;
  set local role authenticated;
  -- Pasar a uno activo, sí.
  v := (public.lead_guardar(v_id, v, jsonb_build_object('origen_lead_id', v_web)) ->> 'actualizado_en')::timestamptz;
  -- El dato del campo apagado sigue ahí y no se cambia.
  begin
    perform public.lead_guardar(v_id, v, '{"atributos": {"ficha_color": "otro"}}');
    reset role;
    raise exception 'cambió un campo desactivado';
  exception when others then
    reset role;
    if sqlstate <> '22023' then raise exception 'campo apagado: % (%)', sqlerrm, sqlstate; end if;
  end;
  if (select atributos ->> 'ficha_color' from public.leads where id = v_id) <> 'guardado' then raise exception 'el dato del campo apagado se perdió'; end if;
  update public.leads_campos set activo = true where clave = 'ficha_color';
  delete from public.origenes_lead where id in (v_off, v_off2);
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test ficha del lead: la auditoría no guarda el teléfono y un seguimiento no deja constancia de edición
do $$ begin
  if exists (select 1 from public.actividad where tabla = 'leads' and (antes ? 'telefono_principal' or despues ? 'telefono_principal')) then
    raise exception 'la auditoría de leads guardó un teléfono';
  end if;
  if not exists (select 1 from public.actividad where tabla = 'leads' and accion = 'leads.update' and despues ->> 'nombre' = 'Ficha Propia 2') then
    raise exception 'la edición de la ficha debía dejar constancia';
  end if;
  -- Un update que sólo cambia lo derivado no deja fila: contamos antes y después.
end $$;
do $$ declare n0 int; n1 int; v_id uuid := (select id from public.leads where nombre = 'Ficha Ajena 5' or nombre = 'Con origen apagado 2' limit 1); begin
  select count(*) into n0 from public.actividad where tabla = 'leads' and registro_id = v_id::text;
  update public.leads set ultimo_seguimiento_en = now() where id = v_id;
  select count(*) into n1 from public.actividad where tabla = 'leads' and registro_id = v_id::text;
  if n1 <> n0 then raise exception 'lo derivado dejó constancia'; end if;
end $$;

-- Los campos de este bloque se van antes del siguiente: un requerido frenaría a los demás.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
update public.leads_campos set requerido = false where clave like 'ficha_%';
select set_config('request.jwt.claim.sub', '', false);

-- ===========================================================================================
-- Teléfonos de la ficha (parte 4b): cambiar el principal y administrar los extras.
-- Usuarios del bloque anterior: 40 (asesor, «propios»), 41 (otro asesor), 42 (ve «todos», no edita),
-- 43 (asesor sin leads), 44 (sin rol) y 01 (dueña, «todos»). Los números de este bloque empiezan en 7410.
-- ===========================================================================================

-- @test teléfonos de la ficha: los leads de prueba, uno de ellos en el limbo
create or replace function pg_temp.falla(p_sql text) returns text[] language plpgsql as $$
declare m text; h text;
begin
  begin
    execute p_sql;
    return null;
  exception when others then
    get stacked diagnostics m = message_text, h = pg_exception_hint;
    return array[sqlstate, m, coalesce(h, '')];
  end;
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare v_web uuid := (select id from public.origenes_lead where clave = 'web'); r jsonb; n text; t text; begin
  for n, t in select * from (values ('Tel Propio', '74100001'), ('Tel Mio Otro', '74100002'), ('Tel Extras', '74100005'),
                                    ('Tel Compartido', '74100006'), ('Tel Limites', '74100007')) x (n, t) loop
    r := public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', n, 'telefono_principal', t, 'origen_lead_id', v_web));
    if r ->> 'resultado' <> 'creado' then raise exception 'alta %: %', n, r; end if;
  end loop;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000041', false);
set role authenticated;
do $$ declare v_web uuid := (select id from public.origenes_lead where clave = 'web'); r jsonb; n text; t text; begin
  for n, t in select * from (values ('Tel Ajeno', '74100003'), ('Tel Limbo', '74100004')) x (n, t) loop
    r := public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', n, 'telefono_principal', t, 'origen_lead_id', v_web));
    if r ->> 'resultado' <> 'creado' then raise exception 'alta %: %', n, r; end if;
  end loop;
end $$;
reset role;
-- «Tel Limbo» se queda sin cartera: invisible para todos.
update public.leads_asesores set revocado_en = now() where lead_id = (select id from public.leads where nombre = 'Tel Limbo');
select set_config('request.jwt.claim.sub', '', false);

-- @test teléfonos de la ficha: cambiar el principal deja el anterior como «Anterior», mueve la versión y un reintento no duplica
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare
  v_id uuid := (select id from public.leads where nombre = 'Tel Propio');
  v0 timestamptz := (select actualizado_en from public.leads where nombre = 'Tel Propio');
  r jsonb; f jsonb; v1 timestamptz;
begin
  r := public.cambiar_telefono_lead(v_id, v0, '', '74110001');
  if r ->> 'resultado' <> 'cambiado' then raise exception 'debía cambiar: %', r; end if;
  if r ->> 'telefono' <> '59174110001' or r ->> 'telefono_cc' <> '+591' then raise exception 'el principal nuevo: %', r; end if;
  v1 := (r ->> 'actualizado_en')::timestamptz;
  if v1 <= v0 then raise exception 'cambiar el principal debía mover la versión'; end if;
  if jsonb_array_length(r -> 'telefonos') <> 1 or r #>> '{telefonos,0,telefono}' <> '59174100001'
     or r #>> '{telefonos,0,etiqueta}' <> 'Anterior' then
    raise exception 'el anterior debía quedar como extra «Anterior»: %', r -> 'telefonos';
  end if;
  -- La ficha lo ve igual.
  f := public.lead_ficha(v_id);
  if f ->> 'telefono' <> '59174110001' or jsonb_array_length(f -> 'telefonos') <> 1 then raise exception 'lead_ficha: %', f; end if;

  -- El reintento tras una respuesta perdida llega con la versión de antes: «sin cambios», un solo «Anterior».
  r := public.cambiar_telefono_lead(v_id, v0, '', '74110001');
  if r ->> 'resultado' <> 'sin_cambios' then raise exception 'el reintento debía ser sin_cambios: %', r; end if;
  if (r ->> 'actualizado_en')::timestamptz <> v1 or jsonb_array_length(r -> 'telefonos') <> 1 then
    raise exception 'el reintento no debía mover nada: %', r;
  end if;
  -- Escrito de otra forma es el mismo número.
  r := public.cambiar_telefono_lead(v_id, v1, '', '+591 741-10001');
  if r ->> 'resultado' <> 'sin_cambios' then raise exception 'el mismo número, con otro formato: %', r; end if;
end $$;
reset role;
-- La constancia lleva los dos números enmascarados y la actividad del lead no deja ninguno legible.
do $$ declare d jsonb; v_id text := (select id::text from public.leads where nombre = 'Tel Propio'); begin
  select detalle into d from public.actividad where accion = 'lead.telefono_cambiado' and registro_id = v_id order by id desc limit 1;
  if d is null then raise exception 'el cambio no dejó constancia'; end if;
  if d ->> 'anterior' not like '%•%' or d ->> 'nuevo' not like '%•%' then raise exception 'la constancia, enmascarada: %', d; end if;
  if exists (select 1 from public.actividad a where a.registro_id = v_id
               and coalesce(a.antes::text, '') || coalesce(a.despues::text, '') || coalesce(a.detalle::text, '') ~ '591741[0-9]{5}') then
    raise exception 'la actividad del lead dejó un número legible';
  end if;
  if (select count(*) from public.actividad where accion = 'lead.telefono_cambiado' and registro_id = v_id) <> 1 then
    raise exception 'un reintento no debía dejar otra constancia';
  end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test teléfonos de la ficha: un número que ya existe es un valor (mío, de otro o en limbo); no cambia nada ni adopta
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare
  v_id uuid := (select id from public.leads where nombre = 'Tel Propio');
  v0 timestamptz := (select actualizado_en from public.leads where nombre = 'Tel Propio');
  v_limbo uuid := (select id from public.leads where nombre = 'Tel Limbo');
  r jsonb;
begin
  r := public.cambiar_telefono_lead(v_id, v0, '', '74100002');
  if r ->> 'resultado' <> 'existe' or (r #>> '{verificacion,es_mio}')::boolean is not true or r #>> '{verificacion,nombre}' <> 'Tel Mio Otro' then
    raise exception 'uno mío: %', r;
  end if;
  r := public.cambiar_telefono_lead(v_id, v0, '', '74100003');
  if r ->> 'resultado' <> 'de_otro' or r #>> '{verificacion,dueno}' is null or r #>> '{verificacion,nombre}' is not null then
    raise exception 'uno de otro: sólo quién lo tiene: %', r;
  end if;
  r := public.cambiar_telefono_lead(v_id, v0, '', '74100004');
  if r ->> 'resultado' <> 'limbo' then raise exception 'uno en limbo: %', r; end if;
  -- Un valor, no una excepción, y nada cambió (se lee como dueño de la base: la app no lee la tabla).
  reset role;
  if (select telefono_principal from public.leads where id = v_id) <> '59174110001' then raise exception 'cambió el principal'; end if;
  if (select actualizado_en from public.leads where id = v_id) <> v0 then raise exception 'movió la versión'; end if;
  if (select count(*) from public.leads_telefonos where lead_id = v_id) <> 1 then raise exception 'tocó los extras'; end if;
  if exists (select 1 from public.leads_asesores where lead_id = v_limbo and revocado_en is null) then raise exception 'adoptó el limbo'; end if;
  if (select telefono_principal from public.leads where id = v_limbo) <> '59174100004' then raise exception 'cambió el del limbo'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test teléfonos de la ficha: un número inválido se rechaza con su motivo; pegado con formato o de otro país entra
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare
  v_id uuid := (select id from public.leads where nombre = 'Tel Propio');
  v timestamptz := (select actualizado_en from public.leads where nombre = 'Tel Propio');
  t text; f text[]; r jsonb;
begin
  foreach t in array array['123', '71abc', '7+1234567', '', '   ', '12345678901234567890'] loop
    f := pg_temp.falla(format('select public.cambiar_telefono_lead(%L, %L, %L, %L)', v_id, v, '', t));
    if f is null then raise exception 'aceptó «%»', t; end if;
    if f[1] <> '22023' or f[3] <> 'telefono_principal' then raise exception '«%»: % %', t, f[1], f[3]; end if;
  end loop;
  if (select actualizado_en from public.leads where id = v_id) <> v then raise exception 'un rechazo movió la versión'; end if;

  -- Pegado con paréntesis y guiones: es el mismo teléfono nacional.
  r := public.cambiar_telefono_lead(v_id, v, '', '(7) 411-0002');
  if r ->> 'resultado' <> 'cambiado' or r ->> 'telefono' <> '59174110002' then raise exception 'con formato: %', r; end if;
  v := (r ->> 'actualizado_en')::timestamptz;
  -- De otro país: no es el de la empresa, así que el lead no guarda código.
  r := public.cambiar_telefono_lead(v_id, v, '', '+54 9 11 5555 1234');
  if r ->> 'resultado' <> 'cambiado' or r ->> 'telefono' <> '5491155551234' or r ->> 'telefono_cc' is not null then
    raise exception 'de otro país: %', r;
  end if;
  if jsonb_array_length(r -> 'telefonos') <> 3 then raise exception 'los anteriores: %', r -> 'telefonos'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test teléfonos de la ficha: el nuevo era un extra del lead y el anterior ya lo era: nada se duplica
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare
  v_id uuid := (select id from public.leads where nombre = 'Tel Extras');
  r jsonb; v timestamptz;
begin
  r := public.lead_telefono_guardar(v_id, gen_random_uuid(), '', '74120001', 'Trabajo');
  v := (select actualizado_en from public.leads where id = v_id);
  -- Pasa de extra a principal: sale de los extras y entra el anterior.
  r := public.cambiar_telefono_lead(v_id, v, '', '74120001');
  if r ->> 'resultado' <> 'cambiado' then raise exception 'debía cambiar: %', r; end if;
  if jsonb_array_length(r -> 'telefonos') <> 1 or r #>> '{telefonos,0,telefono}' <> '59174100005' or r #>> '{telefonos,0,etiqueta}' <> 'Anterior' then
    raise exception 'el que pasó a principal debía salir de los extras: %', r -> 'telefonos';
  end if;
  -- Dato anterior a la regla: el principal ya figura como extra, con su etiqueta.
  reset role;
  insert into public.leads_telefonos (lead_id, telefono, etiqueta) values (v_id, '59174120001', 'Casa legado');
  set local role authenticated;
  r := public.cambiar_telefono_lead(v_id, (r ->> 'actualizado_en')::timestamptz, '', '74120002');
  if r ->> 'resultado' <> 'cambiado' then raise exception 'debía cambiar: %', r; end if;
  if jsonb_array_length(r -> 'telefonos') <> 2 then raise exception 'sin duplicar: %', r -> 'telefonos'; end if;
  if (select count(*) from jsonb_array_elements(r -> 'telefonos') e where e ->> 'telefono' = '59174120001' and e ->> 'etiqueta' = 'Casa legado') <> 1 then
    raise exception 'conserva la etiqueta que ya tenía: %', r -> 'telefonos';
  end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test teléfonos de la ficha: dos personas a la vez dan PT409, la versión es obligatoria y la cartera compartida también cambia
do $$ declare
  v_id uuid := (select id from public.leads where nombre = 'Tel Compartido');
  v0 timestamptz := (select actualizado_en from public.leads where nombre = 'Tel Compartido');
  f text[]; r jsonb;
begin
  -- Quien lo tiene compartido está en la cartera: edita el nombre y la versión se mueve.
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por)
  values (v_id, '00000000-0000-0000-0000-000000000043', 'compartido', '00000000-0000-0000-0000-000000000040');
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000043', true);
  set local role authenticated;
  perform public.lead_guardar(v_id, v0, '{"nombre": "Tel Compartido 2"}');
  reset role;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', true);
  set local role authenticated;
  f := pg_temp.falla(format('select public.cambiar_telefono_lead(%L, %L, %L, %L)', v_id, v0, '', '74140001'));
  if f is null or f[1] <> 'PT409' or f[2] not like '% cambió este lead %' then raise exception 'conflicto: %', f; end if;
  f := pg_temp.falla(format('select public.cambiar_telefono_lead(%L, null, %L, %L)', v_id, '', '74140001'));
  if f is null or f[2] not like 'Falta la versión%' then raise exception 'la versión es obligatoria: %', f; end if;
  reset role;
  if (select telefono_principal from public.leads where id = v_id) <> '59174100006' then raise exception 'un rechazo cambió el teléfono'; end if;

  -- El compartido también cambia el teléfono.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000043', true);
  set local role authenticated;
  r := public.cambiar_telefono_lead(v_id, (select actualizado_en from public.leads where id = v_id), '', '74140002');
  reset role;
  if r ->> 'resultado' <> 'cambiado' then raise exception 'el compartido debía poder: %', r; end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test teléfonos de la ficha: sin cartera (también la dueña con «todos») las cuatro RPC rechazan, y lo que no se ve da el mismo mensaje
do $$ declare
  v_id uuid := (select id from public.leads where nombre = 'Tel Extras');
  v0 timestamptz := (select actualizado_en from public.leads where nombre = 'Tel Extras');
  v_limbo uuid := (select id from public.leads where nombre = 'Tel Limbo');
  v_nada text := 'No encontramos este lead o no tienes acceso.';
  u text; l uuid; esperado text; sql text; f text[]; n int := 0; antes jsonb; despues jsonb;
begin
  select to_jsonb(x) into antes from (select telefono_principal, actualizado_en, (select jsonb_agg(t order by t.telefono) from public.leads_telefonos t where t.lead_id = v_id) extras from public.leads where id = v_id) x;
  for u, l, esperado in
    select * from (values
      ('00000000-0000-0000-0000-000000000001'::text, v_id, v_nada),
      ('00000000-0000-0000-0000-000000000042', v_id, v_nada),
      ('00000000-0000-0000-0000-000000000041', v_id, v_nada),
      ('00000000-0000-0000-0000-000000000044', v_id, v_nada),
      ('00000000-0000-0000-0000-000000000040', gen_random_uuid(), v_nada),
      ('00000000-0000-0000-0000-000000000001', v_limbo, v_nada)) t (u, l, esperado)
  loop
    foreach sql in array array[
      format('select public.cambiar_telefono_lead(%L, %L, %L, %L)', l, v0, '', '74199999'),
      format('select public.verificar_telefono_de_lead(%L, %L, %L)', l, '', '74199999'),
      format('select public.lead_telefono_guardar(%L, gen_random_uuid(), %L, %L, null)', l, '', '74199999'),
      format('select public.lead_telefono_quitar(%L, gen_random_uuid())', l)] loop
      perform set_config('request.jwt.claim.sub', u, true);
      set local role authenticated;
      f := pg_temp.falla(sql);
      reset role;
      if f is null then raise exception 'aceptó a % en %', u, sql; end if;
      if f[1] <> '42501' or f[2] <> esperado then raise exception '% en %: % (%)', u, sql, f[2], f[1]; end if;
      n := n + 1;
    end loop;
  end loop;
  if n <> 24 then raise exception 'se probaron % de 24 casos', n; end if;
  select to_jsonb(x) into despues from (select telefono_principal, actualizado_en, (select jsonb_agg(t order by t.telefono) from public.leads_telefonos t where t.lead_id = v_id) extras from public.leads where id = v_id) x;
  if antes is distinct from despues then raise exception 'un rechazo cambió el lead'; end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test teléfonos de la ficha: agregar es idempotente por id, la etiqueta es opcional y los duplicados se rechazan junto al campo
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare
  v_id uuid := (select id from public.leads where nombre = 'Tel Limites');
  v_ajeno uuid;
  id1 uuid := gen_random_uuid();
  id2 uuid := gen_random_uuid();
  v0 timestamptz := (select actualizado_en from public.leads where nombre = 'Tel Limites');
  r jsonb; f text[]; t text;
begin
  r := public.lead_telefono_guardar(v_id, id1, '', '74130001', '  Casa ');
  if r ->> 'resultado' <> 'agregado' or jsonb_array_length(r -> 'telefonos') <> 1 or r #>> '{telefonos,0,etiqueta}' <> 'Casa'
     or r #>> '{telefonos,0,telefono}' <> '59174130001' then
    raise exception 'agregar: %', r;
  end if;
  -- El mismo id otra vez (un reintento): no cambia nada.
  r := public.lead_telefono_guardar(v_id, id1, '', '74130001', 'Casa');
  if r ->> 'resultado' <> 'sin_cambios' or jsonb_array_length(r -> 'telefonos') <> 1 then raise exception 'el reintento: %', r; end if;
  -- Rotular: otra etiqueta, y vacía queda nula.
  r := public.lead_telefono_guardar(v_id, id1, '', '74130001', 'Trabajo');
  if r ->> 'resultado' <> 'rotulado' or r #>> '{telefonos,0,etiqueta}' <> 'Trabajo' then raise exception 'rotular: %', r; end if;
  r := public.lead_telefono_guardar(v_id, id1, '', '74130001', '   ');
  if r ->> 'resultado' <> 'rotulado' or r #>> '{telefonos,0,etiqueta}' is not null then raise exception 'la etiqueta vacía es nula: %', r; end if;
  -- Otro número con el mismo id: no se cambia el número de un extra.
  f := pg_temp.falla(format('select public.lead_telefono_guardar(%L, %L, %L, %L, null)', v_id, id1, '', '74130002'));
  if f is null or f[1] <> '22023' or f[3] <> 'telefono' or f[2] not like 'Para cambiar el número%' then raise exception 'otro número, mismo id: %', f; end if;
  -- Duplicado dentro del lead, escrito de otra forma, y el principal: junto al campo.
  foreach t in array array['74130001', '+591 741-30001', '74100007', '074100007'] loop
    f := pg_temp.falla(format('select public.lead_telefono_guardar(%L, %L, %L, %L, null)', v_id, id2, '', t));
    if f is null or f[1] <> '22023' or f[3] <> 'telefono' or f[2] <> 'Ese número ya está en este lead.' then raise exception 'duplicado: %', f; end if;
  end loop;
  -- Etiqueta: 40 entra, 41 no.
  r := public.lead_telefono_guardar(v_id, id2, '', '74130002', repeat('x', 40));
  if r ->> 'resultado' <> 'agregado' then raise exception 'etiqueta de 40: %', r; end if;
  f := pg_temp.falla(format('select public.lead_telefono_guardar(%L, %L, %L, %L, %L)', v_id, gen_random_uuid(), '', '74130003', repeat('x', 41)));
  if f is null or f[3] <> 'etiqueta' then raise exception 'etiqueta de 41: %', f; end if;
  -- Un teléfono que no lo es: el motivo viene con el campo del formulario de un extra.
  f := pg_temp.falla(format('select public.lead_telefono_guardar(%L, %L, %L, %L, null)', v_id, gen_random_uuid(), '', '123'));
  if f is null or f[1] <> '22023' or f[3] <> 'telefono' then raise exception 'número corto: %', f; end if;
  -- El id de un teléfono de otro lead no se toca.
  reset role;
  v_ajeno := (select t.id from public.leads_telefonos t join public.leads l on l.id = t.lead_id where l.nombre = 'Tel Extras' limit 1);
  set local role authenticated;
  f := pg_temp.falla(format('select public.lead_telefono_guardar(%L, %L, %L, %L, %L)', v_id, v_ajeno, '', '74130009', 'Mío'));
  if f is null or f[1] <> '22023' then raise exception 'tocó un teléfono ajeno: %', f; end if;
  r := public.lead_telefono_quitar(v_id, v_ajeno);
  if r ->> 'resultado' <> 'sin_cambios' then raise exception 'quitar un teléfono ajeno: %', r; end if;
  reset role;
  if not exists (select 1 from public.leads_telefonos where id = v_ajeno and etiqueta is distinct from 'Mío') then raise exception 'se tocó el de otro lead'; end if;
  -- Agregar y rotular no mueven la versión del lead.
  if (select actualizado_en from public.leads where id = v_id) <> v0 then raise exception 'los extras movieron la versión'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test teléfonos de la ficha: quitar devuelve lo quitado, deshacer lo restituye tal cual y no mueve la versión
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare
  v_id uuid := (select id from public.leads where nombre = 'Tel Limites');
  v0 timestamptz := (select actualizado_en from public.leads where nombre = 'Tel Limites');
  id2 uuid; q jsonb; r jsonb; f text[];
begin
  select t.id into id2 from public.lead_telefonos(v_id) t where t.telefono = '59174130002';
  r := public.lead_telefono_quitar(v_id, id2);
  q := r -> 'quitado';
  if r ->> 'resultado' <> 'quitado' or (q ->> 'id')::uuid <> id2 or q ->> 'telefono' <> '59174130002' or q ->> 'etiqueta' <> repeat('x', 40) then
    raise exception 'quitar: %', r;
  end if;
  if jsonb_array_length(r -> 'telefonos') <> 1 then raise exception 'la lista tras quitar: %', r -> 'telefonos'; end if;
  -- Quitar lo que ya no está no es un error.
  r := public.lead_telefono_quitar(v_id, id2);
  if r ->> 'resultado' <> 'sin_cambios' or r -> 'quitado' <> 'null'::jsonb then raise exception 'quitar de nuevo: %', r; end if;
  -- Deshacer: mismo id, etiqueta y lugar.
  r := public.lead_telefono_guardar(v_id, id2, '', '+' || (q ->> 'telefono'), q ->> 'etiqueta', (q ->> 'creado_en')::timestamptz);
  if r ->> 'resultado' <> 'agregado' or jsonb_array_length(r -> 'telefonos') <> 2 then raise exception 'restituir: %', r; end if;
  if not exists (select 1 from jsonb_array_elements(r -> 'telefonos') e
                  where (e ->> 'id')::uuid = id2 and (e ->> 'creado_en')::timestamptz = (q ->> 'creado_en')::timestamptz) then
    raise exception 'no volvió a su lugar: %', r -> 'telefonos';
  end if;
  -- Quitado, y mientras tanto alguien agregó el mismo número con otro id: deshacer no duplica.
  perform public.lead_telefono_quitar(v_id, id2);
  perform public.lead_telefono_guardar(v_id, gen_random_uuid(), '', '74130002', null);
  f := pg_temp.falla(format('select public.lead_telefono_guardar(%L, %L, %L, %L, %L)', v_id, id2, '', '+59174130002', q ->> 'etiqueta'));
  if f is null or f[2] <> 'Ese número ya está en este lead.' then raise exception 'deshacer con el número ya agregado: %', f; end if;
  if (select count(*) from public.lead_telefonos(v_id) where telefono = '59174130002') <> 1 then raise exception 'se duplicó'; end if;
  -- Quitar y restituir tampoco mueven la versión del lead.
  reset role;
  if (select actualizado_en from public.leads where id = v_id) <> v0 then raise exception 'quitar movió la versión'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test teléfonos de la ficha: hasta 10 extras; el cambio del principal guarda el «Anterior» aunque haya 10; la actividad no deja números
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare
  v_id uuid := (select id from public.leads where nombre = 'Tel Limites');
  v0 timestamptz;
  g int; r jsonb; f text[]; n int;
begin
  reset role;
  v0 := (select actualizado_en from public.leads where id = v_id);
  set local role authenticated;
  n := (select count(*) from public.lead_telefonos(v_id));
  for g in 1 .. 10 - n loop
    r := public.lead_telefono_guardar(v_id, gen_random_uuid(), '', '7414000' || g, null);
  end loop;
  if (select count(*) from public.lead_telefonos(v_id)) <> 10 then raise exception 'debían ser 10'; end if;
  f := pg_temp.falla(format('select public.lead_telefono_guardar(%L, gen_random_uuid(), %L, %L, null)', v_id, '', '74149999'));
  if f is null or f[1] <> '22023' or f[3] <> 'telefono' or f[2] not like 'Un lead admite hasta 10%' then raise exception 'el número 11: %', f; end if;
  -- Ya con 10, cambiar el principal no se rechaza por el tope: el anterior siempre entra.
  r := public.cambiar_telefono_lead(v_id, v0, '', '74150001');
  if r ->> 'resultado' <> 'cambiado' or jsonb_array_length(r -> 'telefonos') <> 11 then raise exception 'cambiar con 10: %', r; end if;
  if not exists (select 1 from jsonb_array_elements(r -> 'telefonos') e where e ->> 'telefono' = '59174100007' and e ->> 'etiqueta' = 'Anterior') then
    raise exception 'faltó el «Anterior»';
  end if;
  -- Y no se puede agregar otro hasta quitar.
  f := pg_temp.falla(format('select public.lead_telefono_guardar(%L, gen_random_uuid(), %L, %L, null)', v_id, '', '74149998'));
  if f is null or f[2] not like 'Un lead admite hasta 10%' then raise exception 'con 11: %', f; end if;
end $$;
reset role;
do $$ declare
  v_ids text[] := (select array_agg(id::text) from public.leads where nombre like 'Tel %');
begin
  if not exists (select 1 from public.actividad where accion = 'lead.telefono_extra_agregado' and registro_id = any (v_ids)) then
    raise exception 'agregar un extra debía dejar constancia';
  end if;
  if not exists (select 1 from public.actividad where accion = 'lead.telefono_extra_quitado' and registro_id = any (v_ids)) then
    raise exception 'quitar un extra debía dejar constancia';
  end if;
  if not exists (select 1 from public.actividad where accion = 'lead.telefono_extra_rotulado' and registro_id = any (v_ids)) then
    raise exception 'rotular un extra debía dejar constancia';
  end if;
  -- Ninguna constancia de un lead de este bloque deja un número legible (todos empiezan con 591741).
  if exists (select 1 from public.actividad a where a.registro_id = any (v_ids)
               and coalesce(a.antes::text, '') || coalesce(a.despues::text, '') || coalesce(a.detalle::text, '') ~ '591741[0-9]{5}') then
    raise exception 'la actividad dejó un número legible';
  end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test teléfonos de la ficha: un número libre que es extra de otro lead avisa sin bloquear, con la misma regla de qué se dice
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000041', false);
set role authenticated;
do $$ declare v_id uuid := (select id from public.leads where nombre = 'Tel Ajeno'); begin
  perform public.lead_telefono_guardar(v_id, gen_random_uuid(), '', '74160001', 'Casa');
end $$;
-- Quien lo tiene lo ve como suyo.
do $$ declare r jsonb; begin
  r := public.verificar_telefono('', '74160001');
  if r ->> 'estado' <> 'libre' or r #>> '{alterno,estado}' <> 'existe' or (r #>> '{alterno,es_mio}')::boolean is not true
     or r #>> '{alterno,nombre}' <> 'Tel Ajeno' then
    raise exception 'el dueño del lead: %', r;
  end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare r jsonb; v_id uuid; begin
  -- Quien no ve ese lead sólo sabe de quién es.
  r := public.verificar_telefono('', '74160001');
  if r ->> 'estado' <> 'libre' or r #>> '{alterno,estado}' <> 'de_otro' or r #>> '{alterno,dueno}' is null or r #>> '{alterno,nombre}' is not null then
    raise exception 'el de otra persona: sólo quién: %', r;
  end if;
  -- Un número que no es de ningún lead no trae alterno.
  r := public.verificar_telefono('', '74169999');
  if r <> '{"estado": "libre"}'::jsonb then raise exception 'libre sin alterno: %', r; end if;
  -- No bloquea el alta: el lead nuevo entra.
  r := public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'Tel Con Alterno', 'telefono_principal', '74160001',
         'origen_lead_id', (select id from public.origenes_lead where clave = 'web')));
  if r ->> 'resultado' <> 'creado' then raise exception 'el alterno no debía bloquear el alta: %', r; end if;
  v_id := (select id from public.leads where nombre = 'Tel Extras');
  -- Desde la ficha: el propio principal es «mismo»; un extra propio no avisa de sí mismo.
  r := public.verificar_telefono_de_lead(v_id, '', '74120002');
  if r ->> 'estado' <> 'mismo' then raise exception 'el principal: %', r; end if;
  r := public.verificar_telefono_de_lead(v_id, '', '74100005');
  if r ->> 'estado' <> 'libre' or (r ->> 'es_extra')::boolean is not true or r ? 'alterno' then raise exception 'un extra propio: %', r; end if;
  r := public.verificar_telefono_de_lead(v_id, '', '74100002');
  if r ->> 'estado' <> 'existe' or (r ->> 'es_mio')::boolean is not true then raise exception 'uno mío: %', r; end if;
  r := public.verificar_telefono_de_lead(v_id, '', '74100003');
  if r ->> 'estado' <> 'de_otro' then raise exception 'uno de otro: %', r; end if;
  r := public.verificar_telefono_de_lead(v_id, '', '74100004');
  if r ->> 'estado' <> 'limbo' then raise exception 'uno en limbo: %', r; end if;
  -- Un teléfono extra de otro lead también avisa al cambiar.
  r := public.verificar_telefono_de_lead(v_id, '', '74160001');
  if r ->> 'estado' <> 'existe' then raise exception 'ya es principal de «Tel Con Alterno»: %', r; end if;
end $$;
reset role;
-- Un extra de un lead sin cartera (limbo) no se nombra.
insert into public.leads_telefonos (lead_id, telefono) values ((select id from public.leads where nombre = 'Tel Limbo'), '59174160009');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare r jsonb; begin
  r := public.verificar_telefono('', '74160009');
  if r <> '{"estado": "libre"}'::jsonb then raise exception 'un extra del limbo no se nombra: %', r; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- ===========================================================================================
-- Seguimientos y recordatorios (parte 5a). Mismos usuarios: 40 (asesor, «propios»), 41 (otro
-- asesor), 42 (ve «todos», no edita), 43 (asesor sin leads) y 01 (dueña, «todos»). Números 7510….
-- ===========================================================================================

-- @test seguimientos: los leads de prueba (propio, compartido con 41, ajeno, en limbo y en la papelera)
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare v_web uuid := (select id from public.origenes_lead where clave = 'web'); r jsonb; n text; t text; begin
  for n, t in select * from (values ('Seg Propio', '75100001'), ('Seg Compartido', '75100002'), ('Seg Papelera', '75100003')) x (n, t) loop
    r := public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', n, 'telefono_principal', t, 'origen_lead_id', v_web));
    if r ->> 'resultado' <> 'creado' then raise exception 'alta %: %', n, r; end if;
  end loop;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000041', false);
set role authenticated;
do $$ declare v_web uuid := (select id from public.origenes_lead where clave = 'web'); r jsonb; n text; t text; begin
  for n, t in select * from (values ('Seg Ajeno', '75100004'), ('Seg Limbo', '75100005')) x (n, t) loop
    r := public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', n, 'telefono_principal', t, 'origen_lead_id', v_web));
    if r ->> 'resultado' <> 'creado' then raise exception 'alta %: %', n, r; end if;
  end loop;
end $$;
reset role;
insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por)
select id, '00000000-0000-0000-0000-000000000041', 'compartido', '00000000-0000-0000-0000-000000000040'
  from public.leads where nombre = 'Seg Compartido';
update public.leads_asesores set revocado_en = now() where lead_id = (select id from public.leads where nombre = 'Seg Limbo');
update public.leads set eliminado_en = now() where nombre = 'Seg Papelera';
select set_config('request.jwt.claim.sub', '', false);

-- @test seguimientos: crear es idempotente por id, valida tipo, resumen y fecha, no mueve la versión del lead y deja constancia sin contenido
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare
  v_lead uuid := (select id from public.leads where nombre = 'Seg Propio');
  v_tipo uuid := (select id from public.tipos_seguimiento where clave = 'llamada');
  v_id uuid := gen_random_uuid();
  v0 timestamptz := (select actualizado_en from public.leads where nombre = 'Seg Propio');
  r jsonb; f text[]; v_doc jsonb;
begin
  v_doc := '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Quiere "},{"type":"text","text":"RAV4","marks":[{"type":"bold"}]}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"2019"}]}]}]}]}';
  r := public.seguimiento_crear(v_id, v_lead, jsonb_build_object('tipo_id', v_tipo, 'titulo', '  Llamó por el RAV4  ', 'detalle', v_doc));
  if r ->> 'resultado' <> 'creado' then raise exception 'debía crearse: %', r; end if;
  if r #>> '{seguimiento,titulo}' <> 'Llamó por el RAV4' or r #>> '{seguimiento,detalle_texto}' <> E'Quiere RAV4\n• 2019'
     or r #>> '{seguimiento,visibilidad}' <> 'privado' or (r #>> '{seguimiento,es_mio}')::boolean is not true then
    raise exception 'lo guardado: %', r;
  end if;
  -- El mismo intento, otra vez: lo mismo, sin duplicar.
  r := public.seguimiento_crear(v_id, v_lead, jsonb_build_object('tipo_id', v_tipo, 'titulo', 'Otra cosa'));
  if r ->> 'resultado' <> 'repetido' or r #>> '{seguimiento,titulo}' <> 'Llamó por el RAV4' then raise exception 'el reintento: %', r; end if;
  if (select count(*) from public.seguimientos where id = v_id) <> 1 then raise exception 'el reintento duplicó'; end if;
  -- La versión de la ficha no se movió; el último seguimiento sí.
  if (select actualizado_en from public.leads where id = v_lead) <> v0 then raise exception 'un seguimiento movió la versión del lead'; end if;
  if (select ultimo_seguimiento_en from public.leads where id = v_lead) is distinct from (r #>> '{seguimiento,ocurrido_en}')::timestamptz then
    raise exception 'ultimo_seguimiento_en';
  end if;
  -- Un documento sólo de párrafos y listas vacías es «sin detalle».
  r := public.seguimiento_crear(gen_random_uuid(), v_lead, jsonb_build_object('tipo_id', v_tipo, 'titulo', 'Sin detalle',
    'detalle', '{"type":"doc","content":[{"type":"paragraph"},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph"}]}]}]}'::jsonb));
  if r #> '{seguimiento,detalle_doc}' <> 'null'::jsonb or r #> '{seguimiento,detalle_texto}' <> 'null'::jsonb then raise exception 'sólo etiquetas: %', r; end if;
  -- Lo que no pasa, junto a su campo.
  f := pg_temp.falla(format('select public.seguimiento_crear(gen_random_uuid(), %L, %L)', v_lead, jsonb_build_object('tipo_id', v_tipo, 'titulo', '   ')));
  if f[3] <> 'titulo' then raise exception 'resumen vacío: %', f; end if;
  f := pg_temp.falla(format('select public.seguimiento_crear(gen_random_uuid(), %L, %L)', v_lead, jsonb_build_object('tipo_id', v_tipo, 'titulo', repeat('a', 121))));
  if f[3] <> 'titulo' then raise exception 'resumen largo: %', f; end if;
  f := pg_temp.falla(format('select public.seguimiento_crear(gen_random_uuid(), %L, %L)', v_lead, jsonb_build_object('tipo_id', gen_random_uuid(), 'titulo', 'x')));
  if f[3] <> 'tipo_id' then raise exception 'tipo inexistente: %', f; end if;
  f := pg_temp.falla(format('select public.seguimiento_crear(gen_random_uuid(), %L, %L)', v_lead,
         jsonb_build_object('tipo_id', v_tipo, 'titulo', 'x', 'ocurrido_en', now() + interval '1 hour')));
  if f[3] <> 'ocurrido_en' or f[2] not like 'Un seguimiento no puede ser en el futuro%' then raise exception 'fecha futura: %', f; end if;
  -- Unos minutos de margen por los relojes, y el pasado vale.
  r := public.seguimiento_crear(gen_random_uuid(), v_lead, jsonb_build_object('tipo_id', v_tipo, 'titulo', 'Reloj adelantado', 'ocurrido_en', now() + interval '2 minutes'));
  r := public.seguimiento_crear(gen_random_uuid(), v_lead, jsonb_build_object('tipo_id', v_tipo, 'titulo', 'La semana pasada', 'ocurrido_en', now() - interval '7 days'));
  f := pg_temp.falla(format('select public.seguimiento_crear(gen_random_uuid(), %L, %L)', v_lead, jsonb_build_object('tipo_id', v_tipo, 'titulo', 'x', 'lead_id', gen_random_uuid())));
  if f[3] <> 'lead_id' then raise exception 'una clave suelta: %', f; end if;
  -- Con recordatorio: entra junto; uno pasado no deja nada.
  r := public.seguimiento_crear(gen_random_uuid(), v_lead, jsonb_build_object('tipo_id', v_tipo, 'titulo', 'Con recordatorio'),
         jsonb_build_object('recordar_en', now() + interval '1 day'));
  if r #>> '{recordatorio,titulo}' <> 'Con recordatorio' or r #>> '{recordatorio,lead_id}' <> v_lead::text then raise exception 'el recordatorio: %', r; end if;
  f := pg_temp.falla(format('select public.seguimiento_crear(gen_random_uuid(), %L, %L, %L)', v_lead,
         jsonb_build_object('tipo_id', v_tipo, 'titulo', 'Recordatorio pasado'), jsonb_build_object('recordar_en', now() - interval '1 minute')));
  if f[3] <> 'recordatorio.recordar_en' then raise exception 'recordatorio pasado: %', f; end if;
  if exists (select 1 from public.seguimientos where titulo = 'Recordatorio pasado') then raise exception 'un rechazo dejó el seguimiento'; end if;
end $$;
reset role;
do $$ begin
  -- La constancia no lleva el contenido.
  if not exists (select 1 from public.actividad a where a.accion = 'lead.seguimiento_creado'
                  and a.registro_id = (select id::text from public.leads where nombre = 'Seg Propio')
                  and a.detalle ? 'seguimiento' and a.detalle ? 'tipo' and not (a.detalle::text like '%RAV4%')) then
    raise exception 'la constancia del seguimiento';
  end if;
  if exists (select 1 from public.actividad a where a.accion = 'leads.update'
              and a.registro_id = (select id::text from public.leads where nombre = 'Seg Propio')) then
    raise exception 'un seguimiento dejó una edición del lead';
  end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test seguimientos: un tipo apagado no se usa para crear ni para cambiar, pero el que ya tiene se conserva
update public.tipos_seguimiento set activo = false where clave = 'visita';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare
  v_lead uuid := (select id from public.leads where nombre = 'Seg Propio');
  v_visita uuid := (select id from public.tipos_seguimiento where clave = 'visita');
  v_nota uuid := (select id from public.tipos_seguimiento where clave = 'nota');
  v_id uuid := gen_random_uuid(); r jsonb; f text[];
begin
  f := pg_temp.falla(format('select public.seguimiento_crear(gen_random_uuid(), %L, %L)', v_lead, jsonb_build_object('tipo_id', v_visita, 'titulo', 'x')));
  if f[3] <> 'tipo_id' then raise exception 'crear con un tipo apagado: %', f; end if;
  r := public.seguimiento_crear(v_id, v_lead, jsonb_build_object('tipo_id', v_nota, 'titulo', 'Nota'));
  reset role;
  -- Como si se hubiera apagado después: el trigger `seguimiento_tipo_vigente` no deja entrar un tipo apagado (se prueba más abajo).
  alter table public.seguimientos disable trigger trg_seguimiento_tipo_vigente;
  update public.seguimientos set tipo_id = v_visita where id = v_id;
  alter table public.seguimientos enable trigger trg_seguimiento_tipo_vigente;
  set local role authenticated;
  r := public.seguimiento_guardar(v_id, (select actualizado_en from public.seguimientos where id = v_id), jsonb_build_object('tipo_id', v_visita, 'titulo', 'Nota 2'));
  if r ->> 'resultado' <> 'guardado' or r #>> '{seguimiento,tipo_id}' <> v_visita::text then raise exception 'conservar el apagado: %', r; end if;
  f := pg_temp.falla(format('select public.seguimiento_guardar(%L, %L, %L)', v_id, r #>> '{seguimiento,actualizado_en}', jsonb_build_object('tipo_id', gen_random_uuid())));
  if f[3] <> 'tipo_id' then raise exception 'pasar a otro inexistente: %', f; end if;
end $$;
reset role;
update public.tipos_seguimiento set activo = true where clave = 'visita';
select set_config('request.jwt.claim.sub', '', false);

-- @test seguimientos: editar con versión (PT409 legible), lo guardado no choca, eliminar y restaurar son idempotentes y el último seguimiento es el máximo de los vivos
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare
  v_lead uuid := (select id from public.leads where nombre = 'Seg Compartido');
  v_tipo uuid := (select id from public.tipos_seguimiento where clave = 'whatsapp');
  v_viejo uuid := gen_random_uuid(); v_nuevo uuid := gen_random_uuid();
  v0 timestamptz; v1 timestamptz; r jsonb; f text[];
  vl timestamptz := (select actualizado_en from public.leads where nombre = 'Seg Compartido');
begin
  r := public.seguimiento_crear(v_viejo, v_lead, jsonb_build_object('tipo_id', v_tipo, 'titulo', 'Viejo', 'ocurrido_en', now() - interval '3 days'));
  r := public.seguimiento_crear(v_nuevo, v_lead, jsonb_build_object('tipo_id', v_tipo, 'titulo', 'Nuevo', 'ocurrido_en', now() - interval '1 hour'));
  v0 := (r #>> '{seguimiento,actualizado_en}')::timestamptz;
  r := public.seguimiento_guardar(v_nuevo, v0, '{"titulo": "Nuevo 2", "visibilidad": "publico"}');
  v1 := (r #>> '{seguimiento,actualizado_en}')::timestamptz;
  if r ->> 'resultado' <> 'guardado' or v1 <= v0 or r #>> '{seguimiento,visibilidad}' <> 'publico' then raise exception 'editar: %', r; end if;
  -- El reintento con la versión vieja y lo mismo: no choca.
  r := public.seguimiento_guardar(v_nuevo, v0, '{"titulo": "Nuevo 2", "visibilidad": "publico"}');
  if r ->> 'resultado' <> 'sin_cambios' then raise exception 'lo guardado no choca: %', r; end if;
  -- Otra cosa con la versión vieja: PT409 y nada cambia.
  f := pg_temp.falla(format('select public.seguimiento_guardar(%L, %L, %L)', v_nuevo, v0, '{"titulo": "Pisado"}'));
  if f[1] <> 'PT409' or f[2] not like 'Cambiaste este seguimiento % desde otra ventana.%' then raise exception 'conflicto: %', f; end if;
  f := pg_temp.falla(format('select public.seguimiento_guardar(%L, null, %L)', v_nuevo, '{"titulo": "x"}'));
  if f[2] not like 'Falta la versión%' then raise exception 'versión nula: %', f; end if;
  -- Un detalle con formato que no se admite, por la RPC directa.
  f := pg_temp.falla(format('select public.seguimiento_guardar(%L, %L, %L)', v_nuevo, v1,
         '{"detalle": {"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"x","marks":[{"type":"link","attrs":{"href":"javascript:alert(1)"}}]}]}]}}'));
  if f[3] <> 'detalle' or f[2] not like 'Ese enlace no se admite%' then raise exception 'javascript: %', f; end if;
  -- Eliminar el más nuevo: el último seguimiento vuelve al viejo; repetirlo no cambia nada.
  r := public.seguimiento_eliminar(v_nuevo, v1);
  if r ->> 'resultado' <> 'eliminado' then raise exception 'eliminar: %', r; end if;
  if (select ultimo_seguimiento_en from public.leads where id = v_lead) <> (select ocurrido_en from public.seguimientos where id = v_viejo) then
    raise exception 'el último seguimiento debía ser el del vivo';
  end if;
  if public.seguimiento_eliminar(v_nuevo, v1) ->> 'resultado' <> 'sin_cambios' then raise exception 'eliminar dos veces'; end if;
  if exists (select 1 from public.seguimientos where id = v_nuevo) then raise exception 'la RLS debía esconder el eliminado'; end if;
  f := pg_temp.falla(format('select public.seguimiento_guardar(%L, %L, %L)', v_nuevo, r #>> '{seguimiento,actualizado_en}', '{"titulo": "x"}'));
  if f[2] <> 'No encontramos este seguimiento o no tienes acceso.' then raise exception 'editar un eliminado: %', f; end if;
  r := public.seguimiento_restaurar(v_nuevo, (r #>> '{seguimiento,actualizado_en}')::timestamptz);
  if r ->> 'resultado' <> 'restaurado' or r #>> '{seguimiento,titulo}' <> 'Nuevo 2' then raise exception 'restaurar: %', r; end if;
  if public.seguimiento_restaurar(v_nuevo, (r #>> '{seguimiento,actualizado_en}')::timestamptz) ->> 'resultado' <> 'sin_cambios' then raise exception 'restaurar dos veces'; end if;
  if (select ultimo_seguimiento_en from public.leads where id = v_lead) <> (select ocurrido_en from public.seguimientos where id = v_nuevo) then
    raise exception 'restaurar debía devolver el último seguimiento';
  end if;
  if (select actualizado_en from public.leads where id = v_lead) <> vl then raise exception 'editar o eliminar movió la versión del lead'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test seguimientos: privado = sólo su autor; el co-asesor y la dueña con «todos» ven sólo los públicos, y revocar la cartera los esconde
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare v_lead uuid := (select id from public.leads where nombre = 'Seg Compartido'); v_tipo uuid := (select id from public.tipos_seguimiento where clave = 'nota'); begin
  perform public.seguimiento_crear(gen_random_uuid(), v_lead, jsonb_build_object('tipo_id', v_tipo, 'titulo', 'Privado de 40'));
end $$;
reset role;
do $$ declare
  v_lead uuid := (select id from public.leads where nombre = 'Seg Compartido');
  r jsonb; v_titulos text;
begin
  -- 41 (co-asesor): sólo los públicos de 40.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000041', true);
  set local role authenticated;
  r := public.lead_seguimientos(v_lead);
  select string_agg(x ->> 'titulo', ',' order by x ->> 'titulo') into v_titulos from jsonb_array_elements(r -> 'seguimientos') x;
  if v_titulos is distinct from 'Nuevo 2' then raise exception 'el co-asesor ve: %', v_titulos; end if;
  if (r ->> 'puedo_anotar')::boolean is not true then raise exception 'el co-asesor anota en su cartera'; end if;
  if r ? 'total' or (select count(*) from public.seguimientos where lead_id = v_lead) <> 1 then raise exception 'ni un conteo'; end if;
  -- 01 (dueña, «todos», sin la cartera): lo mismo, y no anota.
  reset role;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  r := public.lead_seguimientos(v_lead);
  if jsonb_array_length(r -> 'seguimientos') <> 1 or (r ->> 'puedo_anotar')::boolean then raise exception 'la dueña ve: %', r; end if;
  -- 40 (autor): todos los suyos.
  reset role;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', true);
  set local role authenticated;
  if jsonb_array_length(public.lead_seguimientos(v_lead) -> 'seguimientos') <> 3 then raise exception 'el autor ve los suyos'; end if;
  -- Paginado: de a uno, con cursor.
  r := public.lead_seguimientos(v_lead, null, null, 1);
  if jsonb_array_length(r -> 'seguimientos') <> 1 or (r ->> 'hay_mas')::boolean is not true then raise exception 'paginar: %', r; end if;
  r := public.lead_seguimientos(v_lead, (r #>> '{seguimientos,0,ocurrido_en}')::timestamptz, (r #>> '{seguimientos,0,id}')::uuid, 5);
  if jsonb_array_length(r -> 'seguimientos') <> 2 or (r ->> 'hay_mas')::boolean then raise exception 'la segunda página: %', r; end if;
  reset role;
  -- Revocarle la cartera a 41: deja de ver todo, de inmediato.
  update public.leads_asesores set revocado_en = now() where lead_id = v_lead and usuario_id = '00000000-0000-0000-0000-000000000041';
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000041', true);
  set local role authenticated;
  if jsonb_array_length(public.lead_seguimientos(v_lead) -> 'seguimientos') <> 0 then raise exception 'revocado sigue viendo'; end if;
  reset role;
  update public.leads_asesores set revocado_en = null where lead_id = v_lead and usuario_id = '00000000-0000-0000-0000-000000000041';
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test seguimientos: sin la cartera (también la dueña con «todos»), en limbo, en la papelera o inexistente, las cuatro RPC rechazan con el mismo mensaje y no cambian nada
do $$ declare
  v_nada constant text := 'No encontramos este lead o no tienes acceso.';
  v_seg_nada constant text := 'No encontramos este seguimiento o no tienes acceso.';
  v_tipo uuid := (select id from public.tipos_seguimiento where clave = 'nota');
  v_ajeno uuid := (select id from public.leads where nombre = 'Seg Ajeno');
  v_seg uuid := (select id from public.seguimientos where titulo = 'Nuevo 2');
  v_ver timestamptz := (select actualizado_en from public.seguimientos where titulo = 'Nuevo 2');
  c record; f text[]; n int := 0;
  v_antes jsonb := (select jsonb_agg(to_jsonb(s) order by s.id) from public.seguimientos s);
begin
  for c in select * from (values
      ('00000000-0000-0000-0000-000000000001', (select id from public.leads where nombre = 'Seg Ajeno')),      -- dueña, «todos», sin cartera
      ('00000000-0000-0000-0000-000000000042', (select id from public.leads where nombre = 'Seg Ajeno')),      -- ve «todos», no edita
      ('00000000-0000-0000-0000-000000000043', (select id from public.leads where nombre = 'Seg Propio')),     -- asesor sin acceso
      ('00000000-0000-0000-0000-000000000041', (select id from public.leads where nombre = 'Seg Limbo')),      -- su lead, en limbo
      ('00000000-0000-0000-0000-000000000040', (select id from public.leads where nombre = 'Seg Papelera')),   -- su lead, en la papelera
      ('00000000-0000-0000-0000-000000000040', gen_random_uuid()),                                            -- inexistente
      ('00000000-0000-0000-0000-000000000040', v_ajeno)) x (u, lead) loop                                     -- de otro asesor
    perform set_config('request.jwt.claim.sub', c.u, true);
    set local role authenticated;
    f := pg_temp.falla(format('select public.seguimiento_crear(gen_random_uuid(), %L, %L)', c.lead, jsonb_build_object('tipo_id', v_tipo, 'titulo', 'x')));
    if f[1] <> '42501' or f[2] <> v_nada then reset role; raise exception 'crear como % en %: %', c.u, c.lead, f; end if;
    f := pg_temp.falla(format('select public.recordatorio_crear(gen_random_uuid(), %L, %L, %L)', c.lead, 'x', now() + interval '1 day'));
    if f[1] <> '42501' or f[2] <> v_nada then reset role; raise exception 'recordatorio como % en %: %', c.u, c.lead, f; end if;
    n := n + 2;
    reset role;
  end loop;
  -- El seguimiento de 40 lo ve 41 (es público y comparten el lead), pero no lo edita, ni elimina, ni restaura; la dueña, tampoco.
  for c in select * from (values ('00000000-0000-0000-0000-000000000041'), ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000043')) x (u) loop
    perform set_config('request.jwt.claim.sub', c.u, true);
    set local role authenticated;
    f := pg_temp.falla(format('select public.seguimiento_guardar(%L, %L, %L)', v_seg, v_ver, '{"titulo": "x"}'));
    if f[1] <> '42501' or f[2] <> v_seg_nada then reset role; raise exception 'guardar como %: %', c.u, f; end if;
    f := pg_temp.falla(format('select public.seguimiento_eliminar(%L, %L)', v_seg, v_ver));
    if f[1] <> '42501' or f[2] <> v_seg_nada then reset role; raise exception 'eliminar como %: %', c.u, f; end if;
    f := pg_temp.falla(format('select public.seguimiento_restaurar(%L, %L)', v_seg, v_ver));
    if f[1] <> '42501' or f[2] <> v_seg_nada then reset role; raise exception 'restaurar como %: %', c.u, f; end if;
    n := n + 3;
    reset role;
  end loop;
  if n <> 23 then raise exception 'casos: %', n; end if;
  if (select jsonb_agg(to_jsonb(s) order by s.id) from public.seguimientos s) <> v_antes then raise exception 'un rechazo cambió algo'; end if;
  -- El autor que pierde la cartera tampoco edita lo suyo.
  update public.leads_asesores set revocado_en = now()
   where lead_id = (select id from public.leads where nombre = 'Seg Compartido') and usuario_id = '00000000-0000-0000-0000-000000000040';
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', true);
  set local role authenticated;
  f := pg_temp.falla(format('select public.seguimiento_guardar(%L, %L, %L)', v_seg, v_ver, '{"titulo": "x"}'));
  reset role;
  if f[2] <> v_seg_nada then raise exception 'el autor sin cartera: %', f; end if;
  update public.leads_asesores set revocado_en = null
   where lead_id = (select id from public.leads where nombre = 'Seg Compartido') and usuario_id = '00000000-0000-0000-0000-000000000040';
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test seguimientos y recordatorios: la tabla no se escribe directo, sólo se lee
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare v_lead uuid := (select id from public.leads where nombre = 'Seg Propio'); f text[]; begin
  f := pg_temp.falla(format('insert into public.seguimientos (lead_id, usuario_id, tipo_id, titulo) values (%L, %L, %L, %L)',
         v_lead, '00000000-0000-0000-0000-000000000040', (select id from public.tipos_seguimiento where clave = 'nota'), 'directo'));
  if f[1] <> '42501' then raise exception 'insert directo: %', f; end if;
  f := pg_temp.falla(format('update public.seguimientos set lead_id = %L where lead_id = %L', (select id from public.leads where nombre = 'Seg Ajeno'), v_lead));
  if f[1] <> '42501' then raise exception 'update directo: %', f; end if;
  f := pg_temp.falla(format('insert into public.recordatorios (usuario_id, lead_id, titulo, recordar_en) values (%L, %L, %L, now() + interval ''1 day'')',
         '00000000-0000-0000-0000-000000000040', (select id from public.leads where nombre = 'Seg Ajeno'), 'directo'));
  if f[1] <> '42501' then raise exception 'insert directo de un recordatorio: %', f; end if;
  f := pg_temp.falla('update public.recordatorios set notificado_en = now()');
  if f[1] <> '42501' then raise exception 'update directo de un recordatorio: %', f; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test recordatorios: idempotentes, a futuro, completar y reabrir son «poner», editar la hora vuelve a avisar, uno ajeno no existe
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare
  v_lead uuid := (select id from public.leads where nombre = 'Seg Propio');
  v_id uuid := gen_random_uuid(); v_suelto uuid := gen_random_uuid();
  r jsonb; f text[]; v timestamptz;
begin
  f := pg_temp.falla(format('select public.recordatorio_crear(gen_random_uuid(), %L, %L, %L)', v_lead, 'Pasado', now() - interval '1 minute'));
  if f[3] <> 'recordar_en' or f[2] <> 'El recordatorio tiene que ser en el futuro.' then raise exception 'pasado: %', f; end if;
  f := pg_temp.falla(format('select public.recordatorio_crear(gen_random_uuid(), %L, %L, %L)', v_lead, '  ', now() + interval '1 day'));
  if f[3] <> 'titulo' then raise exception 'sin título: %', f; end if;
  r := public.recordatorio_crear(v_id, v_lead, 'Llamar', now() + interval '1 day');
  if r ->> 'resultado' <> 'creado' or r #>> '{recordatorio,lead_nombre}' <> 'Seg Propio' then raise exception 'crear: %', r; end if;
  if public.recordatorio_crear(v_id, v_lead, 'Otra cosa', now() + interval '2 days') ->> 'resultado' <> 'repetido' then raise exception 'el reintento'; end if;
  if (select count(*) from public.recordatorios where id = v_id) <> 1 then raise exception 'duplicado'; end if;
  -- Sin lead: personal.
  r := public.recordatorio_crear(v_suelto, null, 'Personal', now() + interval '1 hour');
  if r #> '{recordatorio,lead_id}' <> 'null'::jsonb then raise exception 'personal: %', r; end if;
  -- Completar dos veces: la segunda no cambia nada; reabrir.
  v := (r #>> '{recordatorio,actualizado_en}')::timestamptz;
  r := public.recordatorio_completar(v_suelto, v, true);
  if r ->> 'resultado' <> 'completado' then raise exception 'completar: %', r; end if;
  if public.recordatorio_completar(v_suelto, v, true) ->> 'resultado' <> 'sin_cambios' then raise exception 'completar dos veces'; end if;
  r := public.recordatorio_completar(v_suelto, (r #>> '{recordatorio,actualizado_en}')::timestamptz, false);
  if r ->> 'resultado' <> 'reabierto' or r #> '{recordatorio,completado_en}' <> 'null'::jsonb then raise exception 'reabrir: %', r; end if;
  f := pg_temp.falla(format('select public.recordatorio_completar(%L, %L, true)', v_suelto, v));
  if f[1] <> 'PT409' then raise exception 'completar con versión vieja: %', f; end if;
  -- Eliminar y restaurar.
  r := public.recordatorio_eliminar(v_suelto, (r #>> '{recordatorio,actualizado_en}')::timestamptz);
  if exists (select 1 from public.recordatorios_vista where id = v_suelto) then raise exception 'la vista muestra el eliminado'; end if;
  r := public.recordatorio_restaurar(v_suelto, (r #>> '{recordatorio,actualizado_en}')::timestamptz);
  if r ->> 'resultado' <> 'restaurado' then raise exception 'restaurar: %', r; end if;
end $$;
reset role;
-- Ya avisado: cambiar sólo el título lo deja avisado; cambiar la hora lo vuelve a dejar por avisar.
update public.recordatorios set notificado_en = now() where titulo = 'Llamar';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare v_id uuid := (select id from public.recordatorios where titulo = 'Llamar'); r jsonb; f text[]; begin
  r := public.recordatorio_guardar(v_id, (select actualizado_en from public.recordatorios where id = v_id), '{"titulo": "Llamar a las 9"}');
  if r #> '{recordatorio,notificado_en}' = 'null'::jsonb then raise exception 'el título no vuelve a avisar'; end if;
  f := pg_temp.falla(format('select public.recordatorio_guardar(%L, %L, %L)', v_id, r #>> '{recordatorio,actualizado_en}',
         jsonb_build_object('recordar_en', now() - interval '1 hour')));
  if f[3] <> 'recordar_en' then raise exception 'mover al pasado: %', f; end if;
  r := public.recordatorio_guardar(v_id, (r #>> '{recordatorio,actualizado_en}')::timestamptz, jsonb_build_object('recordar_en', now() + interval '3 days'));
  if r #> '{recordatorio,notificado_en}' <> 'null'::jsonb then raise exception 'la hora nueva vuelve a avisar: %', r; end if;
  if r ->> 'resultado' <> 'guardado' then raise exception 'guardar: %', r; end if;
end $$;
reset role;
-- El de 40 no existe para 41 ni para la dueña.
do $$ declare v_id uuid := (select id from public.recordatorios where titulo = 'Llamar a las 9'); v timestamptz := (select actualizado_en from public.recordatorios where titulo = 'Llamar a las 9'); f text[]; u text; begin
  foreach u in array array['00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000001'] loop
    perform set_config('request.jwt.claim.sub', u, true);
    set local role authenticated;
    if exists (select 1 from public.recordatorios_vista where id = v_id) then reset role; raise exception '% lo ve', u; end if;
    f := pg_temp.falla(format('select public.recordatorio_completar(%L, %L, true)', v_id, v));
    if f[1] <> '42501' or f[2] <> 'No encontramos este recordatorio.' then reset role; raise exception 'completar ajeno como %: %', u, f; end if;
    f := pg_temp.falla(format('select public.recordatorio_guardar(%L, %L, %L)', v_id, v, '{"titulo": "x"}'));
    if f[2] <> 'No encontramos este recordatorio.' then reset role; raise exception 'guardar ajeno como %: %', u, f; end if;
    f := pg_temp.falla(format('select public.recordatorio_eliminar(%L, %L)', v_id, v));
    if f[2] <> 'No encontramos este recordatorio.' then reset role; raise exception 'eliminar ajeno como %: %', u, f; end if;
    reset role;
  end loop;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test recordatorios: los vencidos se cuentan en la ficha, y quien pierde el lead conserva el recordatorio sin el lead
update public.recordatorios set recordar_en = now() - interval '1 hour' where titulo = 'Con recordatorio';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare v_lead uuid := (select id from public.leads where nombre = 'Seg Propio'); begin
  if (public.lead_ficha(v_lead) ->> 'recordatorios_vencidos')::int <> 1 then raise exception 'vencidos: %', public.lead_ficha(v_lead); end if;
  if (select lead_nombre from public.recordatorios_vista where titulo = 'Con recordatorio') <> 'Seg Propio' then raise exception 'la vista nombra el lead'; end if;
end $$;
reset role;
-- 41 no ve vencidos ajenos en la ficha del lead compartido (cada cual los suyos).
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000041', false);
set role authenticated;
do $$ begin
  if (public.lead_ficha((select id from public.leads where nombre = 'Seg Compartido')) ->> 'recordatorios_vencidos')::int <> 0 then raise exception 'vencidos ajenos'; end if;
end $$;
reset role;
-- 40 pierde «Seg Propio» (se lo transfieren a 43 y le revocan el acceso): el recordatorio sigue, sin el lead.
update public.leads_asesores set revocado_en = now() where lead_id = (select id from public.leads where nombre = 'Seg Propio');
insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso) select id, '00000000-0000-0000-0000-000000000043', 'dueno' from public.leads where nombre = 'Seg Propio';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare r record; v jsonb; begin
  select * into r from public.recordatorios_vista where titulo = 'Con recordatorio';
  if not found then raise exception 'el recordatorio debía seguir'; end if;
  if r.lead_id is not null or r.lead_nombre is not null or r.lead_numero is not null then raise exception 'nombra un lead que no ve: %', to_jsonb(r); end if;
  -- Lo sigue tocando: es suyo.
  v := public.recordatorio_completar(r.id, r.actualizado_en, true);
  if v ->> 'resultado' <> 'completado' or v #> '{recordatorio,lead_id}' <> 'null'::jsonb or v #> '{recordatorio,lead_nombre}' <> 'null'::jsonb then
    raise exception 'completar sin el lead: %', v;
  end if;
end $$;
reset role;
delete from public.leads_asesores where lead_id = (select id from public.leads where nombre = 'Seg Propio') and usuario_id = '00000000-0000-0000-0000-000000000043';
update public.leads_asesores set revocado_en = null where lead_id = (select id from public.leads where nombre = 'Seg Propio');
select set_config('request.jwt.claim.sub', '', false);

-- @test recordatorios: se leen por páginas con su cursor (pendientes y completados), sin conteo, y el aviso de vencidos cuenta hasta 21
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare r jsonb; begin
  r := public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'Rec Paginas', 'telefono_principal', '76090001',
         'origen_lead_id', (select id from public.origenes_lead where clave = 'web')));
  if r ->> 'resultado' <> 'creado' then raise exception 'alta: %', r; end if;
end $$;
reset role;
-- 30 vencidos y 15 por venir; 25 completados; y 5 de 41 sobre el mismo lead (no los ve nadie más).
insert into public.recordatorios (usuario_id, lead_id, titulo, recordar_en, completado_en)
select '00000000-0000-0000-0000-000000000040', l.id, 'Pag ' || lpad(g::text, 2, '0'),
       case when g <= 30 then now() - make_interval(hours => 31 - g) else now() + make_interval(hours => g) end,
       null
  from public.leads l, generate_series(1, 45) g where l.nombre = 'Rec Paginas';
insert into public.recordatorios (usuario_id, lead_id, titulo, recordar_en, completado_en)
select '00000000-0000-0000-0000-000000000040', l.id, 'Hecho ' || lpad(g::text, 2, '0'), now() - interval '1 day', now() - make_interval(mins => 26 - g)
  from public.leads l, generate_series(1, 25) g where l.nombre = 'Rec Paginas';
insert into public.recordatorios (usuario_id, lead_id, titulo, recordar_en)
select '00000000-0000-0000-0000-000000000041', l.id, 'De 41', now() - interval '1 hour'
  from public.leads l, generate_series(1, 5) g where l.nombre = 'Rec Paginas';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$
declare
  v_lead uuid := (select id from public.leads where nombre = 'Rec Paginas');
  p jsonb; v_ultimo jsonb; v_titulos text[] := '{}'; v_vueltas int := 0;
begin
  -- Pendientes: los vencidos primero (el más viejo arriba), de a 20, con su cursor, sin repetir.
  p := public.lead_recordatorios(v_lead, false, null, null, 20);
  if p -> 'recordatorios' -> 0 ->> 'titulo' <> 'Pag 01' then raise exception 'el más viejo primero: %', p -> 'recordatorios' -> 0; end if;
  if not (p ->> 'puedo_agendar')::boolean or not (p ->> 'hay_completados')::boolean then raise exception 'banderas: %', p - 'recordatorios'; end if;
  if p ? 'total' or p ? 'cuantos' then raise exception 'no cuenta: %', p - 'recordatorios'; end if;
  loop
    v_vueltas := v_vueltas + 1;
    v_titulos := v_titulos || array(select x ->> 'titulo' from jsonb_array_elements(p -> 'recordatorios') x);
    exit when not (p ->> 'hay_mas')::boolean or v_vueltas > 5;
    v_ultimo := p -> 'recordatorios' -> -1;
    p := public.lead_recordatorios(v_lead, false, (v_ultimo ->> 'recordar_en')::timestamptz, (v_ultimo ->> 'id')::uuid, 20);
  end loop;
  if v_vueltas <> 3 or cardinality(v_titulos) <> 45 or (select count(distinct t) from unnest(v_titulos) t) <> 45 then
    raise exception 'pendientes por páginas: % vueltas, %', v_vueltas, v_titulos;
  end if;
  if v_titulos[45] <> 'Pag 45' or 'De 41' = any (v_titulos) or exists (select 1 from unnest(v_titulos) t where t like 'Hecho%') then
    raise exception 'orden o mezcla: %', v_titulos;
  end if;
  -- Completados: el último completado arriba, de a 20.
  p := public.lead_recordatorios(v_lead, true, null, null, 20);
  if jsonb_array_length(p -> 'recordatorios') <> 20 or not (p ->> 'hay_mas')::boolean or p -> 'recordatorios' -> 0 ->> 'titulo' <> 'Hecho 25' then
    raise exception 'completados, página 1: %', p;
  end if;
  v_ultimo := p -> 'recordatorios' -> -1;
  p := public.lead_recordatorios(v_lead, true, (v_ultimo ->> 'completado_en')::timestamptz, (v_ultimo ->> 'id')::uuid, 20);
  if jsonb_array_length(p -> 'recordatorios') <> 5 or (p ->> 'hay_mas')::boolean or p -> 'recordatorios' -> -1 ->> 'titulo' <> 'Hecho 01' then
    raise exception 'completados, página 2: %', p;
  end if;
  -- El aviso de vencidos cuenta hasta 21 (son 30): la pantalla dice «más de 20».
  if (public.lead_ficha(v_lead) ->> 'recordatorios_vencidos')::int <> 21 then raise exception 'vencidos con tope: %', public.lead_ficha(v_lead) ->> 'recordatorios_vencidos'; end if;
end $$;
reset role;
-- 41 no ve el lead: ni los suyos sobre él llegan; 42 lo ve («todos») y no agenda.
do $$ declare p jsonb; u text; v_lead uuid := (select id from public.leads where nombre = 'Rec Paginas'); begin
  foreach u in array array['00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000042'] loop
    perform set_config('request.jwt.claim.sub', u, true);
    set local role authenticated;
    p := public.lead_recordatorios(v_lead, false, null, null, 20);
    if jsonb_array_length(p -> 'recordatorios') <> 0 or (p ->> 'puedo_agendar')::boolean or (p ->> 'hay_completados')::boolean then
      reset role; raise exception 'como %: %', u, p;
    end if;
    if jsonb_array_length(public.lead_recordatorios(v_lead, true, null, null, 20) -> 'recordatorios') <> 0 then reset role; raise exception 'completados como %', u; end if;
    reset role;
  end loop;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test seguimientos: la página es la unión de los míos y los públicos, sin repetir ni saltear, y uno se lee por su id con la misma forma
-- Sobre «Seg Compartido» (de 40, compartido con 41): privados y públicos de las dos, entreverados.
insert into public.seguimientos (lead_id, usuario_id, tipo_id, titulo, visibilidad, ocurrido_en)
select l.id, case when g % 3 = 0 then '00000000-0000-0000-0000-000000000041'::uuid else '00000000-0000-0000-0000-000000000040'::uuid end,
       (select id from public.tipos_seguimiento where activo order by orden limit 1), 'Union ' || g,
       (case when g % 2 = 0 then 'publico' else 'privado' end)::public.visibilidad_seguimiento,
       now() - make_interval(mins => g)
  from public.leads l, generate_series(1, 60) g where l.nombre = 'Seg Compartido';
-- Lo que cada una tiene que ver, según la regla (los suyos y los públicos), en el orden de la página.
create temporary table seg_esperado as
select u.usuario, array_agg(s.id order by s.ocurrido_en desc, s.id desc) as ids
  from (values ('00000000-0000-0000-0000-000000000040'::uuid), ('00000000-0000-0000-0000-000000000041'::uuid)) u (usuario)
  join public.seguimientos s on s.lead_id = (select id from public.leads where nombre = 'Seg Compartido')
   and s.eliminado_en is null and (s.usuario_id = u.usuario or s.visibilidad = 'publico')
 group by u.usuario;
grant select on seg_esperado to authenticated;
do $$
declare
  u text; p jsonb; v_ids uuid[]; v_ultimo jsonb; v_vueltas int; v_esperado uuid[]; v_uno jsonb;
  v_lead uuid := (select id from public.leads where nombre = 'Seg Compartido');
  v_privado_de_40 uuid := (select id from public.seguimientos where titulo = 'Union 1');
begin
  foreach u in array array['00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000041'] loop
    perform set_config('request.jwt.claim.sub', u, true);
    set local role authenticated;
    v_esperado := (select ids from seg_esperado where usuario = u::uuid);
    v_ids := '{}'; v_vueltas := 0; v_ultimo := null;
    loop
      v_vueltas := v_vueltas + 1;
      p := case when v_ultimo is null then public.lead_seguimientos(v_lead, null, null, 7)
                else public.lead_seguimientos(v_lead, (v_ultimo ->> 'ocurrido_en')::timestamptz, (v_ultimo ->> 'id')::uuid, 7) end;
      v_ids := v_ids || array(select (x ->> 'id')::uuid from jsonb_array_elements(p -> 'seguimientos') x);
      -- Cada fila de la página es la misma que la lectura por id.
      for v_uno in select x from jsonb_array_elements(p -> 'seguimientos') x loop
        if public.lead_seguimiento(v_lead, (v_uno ->> 'id')::uuid) is distinct from v_uno then
          reset role; raise exception 'como %, por id no es igual: % vs %', u, public.lead_seguimiento(v_lead, (v_uno ->> 'id')::uuid), v_uno;
        end if;
      end loop;
      exit when not (p ->> 'hay_mas')::boolean or v_vueltas > 40;
      v_ultimo := p -> 'seguimientos' -> -1;
    end loop;
    if v_ids is distinct from v_esperado then reset role; raise exception 'como %: % en vez de %', u, v_ids, v_esperado; end if;
    reset role;
  end loop;
  -- 41 no lee por id un privado de 40, ni con otro lead; nadie lee uno eliminado.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000041', true);
  set local role authenticated;
  if public.lead_seguimiento(v_lead, v_privado_de_40) is not null then reset role; raise exception '41 lee un privado de 40'; end if;
  reset role;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', true);
  set local role authenticated;
  if public.lead_seguimiento(v_lead, v_privado_de_40) is null then reset role; raise exception '40 no lee el suyo'; end if;
  if public.lead_seguimiento(gen_random_uuid(), v_privado_de_40) is not null then reset role; raise exception 'con otro lead'; end if;
  reset role;
end $$;
select set_config('humo.union_1', (select id::text from public.seguimientos where titulo = 'Union 1'), false);
select set_config('humo.union_lead', (select lead_id::text from public.seguimientos where titulo = 'Union 1'), false);
update public.seguimientos set eliminado_en = now() where titulo = 'Union 1';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ begin
  if public.lead_seguimiento(current_setting('humo.union_lead')::uuid, current_setting('humo.union_1')::uuid) is not null then
    raise exception 'lee uno eliminado';
  end if;
end $$;
reset role;
delete from public.seguimientos where titulo like 'Union %';
drop table seg_esperado;
select set_config('request.jwt.claim.sub', '', false);

-- ===========================================================================================
-- Marcas por persona (parte 5b): favoritos, tachados y etiquetas.
-- Usuarios de los bloques anteriores: 40 (asesor, «propios»), 41 (otro asesor), 42 (ve «todos», no
-- edita), 43 (asesor sin leads), 44 (sin rol) y 01 (dueña, «todos»). Los números empiezan en 7610.
-- ===========================================================================================

-- @test marcas: los leads de prueba (propio, compartido con 41, ajeno, en limbo y en la papelera)
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare v_web uuid := (select id from public.origenes_lead where clave = 'web'); r jsonb; n text; t text; begin
  for n, t in select * from (values ('Marca Propio', '76100001'), ('Marca Compartido', '76100002'), ('Marca Papelera', '76100003'), ('Marca Topes', '76100006')) x (n, t) loop
    r := public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', n, 'telefono_principal', t, 'origen_lead_id', v_web));
    if r ->> 'resultado' <> 'creado' then raise exception 'alta %: %', n, r; end if;
  end loop;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000041', false);
set role authenticated;
do $$ declare v_web uuid := (select id from public.origenes_lead where clave = 'web'); r jsonb; n text; t text; begin
  for n, t in select * from (values ('Marca Ajeno', '76100004'), ('Marca Limbo', '76100005')) x (n, t) loop
    r := public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', n, 'telefono_principal', t, 'origen_lead_id', v_web));
    if r ->> 'resultado' <> 'creado' then raise exception 'alta %: %', n, r; end if;
  end loop;
end $$;
reset role;
insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por)
select id, '00000000-0000-0000-0000-000000000041', 'compartido', '00000000-0000-0000-0000-000000000040'
  from public.leads where nombre = 'Marca Compartido';
update public.leads_asesores set revocado_en = now() where lead_id = (select id from public.leads where nombre = 'Marca Limbo');
update public.leads set eliminado_en = now() where nombre = 'Marca Papelera';
select set_config('request.jwt.claim.sub', '', false);

-- @test marcas: favorito y tachado son «poner» (idempotentes), privados de cada persona, sin versión ni actividad del lead
do $$ declare
  v_lead uuid := (select id from public.leads where nombre = 'Marca Compartido');
  v_version timestamptz := (select actualizado_en from public.leads where nombre = 'Marca Compartido');
  v_actividad bigint := (select count(*) from public.actividad where registro_id = (select id::text from public.leads where nombre = 'Marca Compartido'));
  r jsonb; v record;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', true);
  set local role authenticated;
  r := public.lead_favorito_poner(v_lead, true);
  if r ->> 'resultado' <> 'puesto' or (r ->> 'valor')::boolean is not true then raise exception 'poner favorito: %', r; end if;
  r := public.lead_favorito_poner(v_lead, true);
  if r ->> 'resultado' <> 'sin_cambios' then raise exception 'repetir favorito: %', r; end if;
  r := public.lead_tachado_poner(v_lead, true);
  if r ->> 'resultado' <> 'puesto' then raise exception 'tachar: %', r; end if;
  select * into v from public.leads_vista where id = v_lead;
  if not v.es_favorito or not v.esta_tachado then raise exception 'la vista no ve las marcas propias'; end if;
  r := public.lead_ficha(v_lead);
  if (r ->> 'es_favorito')::boolean is not true or (r ->> 'esta_tachado')::boolean is not true or r -> 'etiquetas' <> '[]'::jsonb then
    raise exception 'la ficha no trae las marcas: %', r;
  end if;
  -- 41 (co-asesor) no ve las de 40.
  reset role;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000041', true);
  set local role authenticated;
  select * into v from public.leads_vista where id = v_lead;
  if v.es_favorito or v.esta_tachado then raise exception 'el co-asesor ve las marcas de otra persona'; end if;
  if exists (select 1 from public.leads_favoritos) or exists (select 1 from public.leads_tachados) then raise exception 'la tabla deja leer marcas ajenas'; end if;
  -- 42 (ve «todos», no edita) puede marcar: ver alcanza.
  reset role;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000042', true);
  set local role authenticated;
  r := public.lead_favorito_poner(v_lead, true);
  if r ->> 'resultado' <> 'puesto' then raise exception 'quien sólo ve no marca: %', r; end if;
  r := public.lead_favorito_poner(v_lead, false);
  if r ->> 'resultado' <> 'quitado' then raise exception 'quitar: %', r; end if;
  r := public.lead_favorito_poner(v_lead, false);
  if r ->> 'resultado' <> 'sin_cambios' then raise exception 'quitar dos veces: %', r; end if;
  reset role;
  if (select actualizado_en from public.leads where id = v_lead) <> v_version then raise exception 'marcar movió la versión del lead'; end if;
  if (select count(*) from public.actividad where registro_id = v_lead::text) <> v_actividad then raise exception 'marcar dejó actividad'; end if;
  if (select count(*) from public.leads_favoritos where lead_id = v_lead) <> 1 then raise exception 'favoritos: %', (select count(*) from public.leads_favoritos where lead_id = v_lead); end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test marcas: lo que no se ve (ajeno, limbo, papelera, inexistente o sin rol) da el mismo mensaje en las seis RPC, también al quitar, y no cambia nada
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
select public.etiqueta_crear('00000000-0000-0000-0000-0000000e4001', 'De 40');
reset role;
do $$ declare
  v_nada constant text := 'No encontramos este lead o no tienes acceso.';
  v_etq uuid := '00000000-0000-0000-0000-0000000e4001';
  v_antes jsonb := (select jsonb_build_array((select jsonb_agg(to_jsonb(x) order by x.lead_id, x.usuario_id) from public.leads_favoritos x),
                                             (select jsonb_agg(to_jsonb(x) order by x.lead_id, x.usuario_id) from public.leads_tachados x),
                                             (select jsonb_agg(to_jsonb(x) order by x.lead_id, x.etiqueta_id) from public.leads_etiquetas x)));
  c record; f text[]; v_sql text;
begin
  for c in select * from (values
      ('00000000-0000-0000-0000-000000000040', (select id from public.leads where nombre = 'Marca Ajeno')),
      ('00000000-0000-0000-0000-000000000040', (select id from public.leads where nombre = 'Marca Limbo')),
      ('00000000-0000-0000-0000-000000000040', (select id from public.leads where nombre = 'Marca Papelera')),
      ('00000000-0000-0000-0000-000000000040', gen_random_uuid()),
      ('00000000-0000-0000-0000-000000000044', (select id from public.leads where nombre = 'Marca Propio'))) x (u, lead) loop
    perform set_config('request.jwt.claim.sub', c.u, true);
    set local role authenticated;
    foreach v_sql in array array[
        format('select public.lead_favorito_poner(%L, true)', c.lead), format('select public.lead_favorito_poner(%L, false)', c.lead),
        format('select public.lead_tachado_poner(%L, true)', c.lead), format('select public.lead_tachado_poner(%L, false)', c.lead),
        format('select public.lead_etiquetas_poner(%L, array[%L]::uuid[], true)', c.lead, v_etq),
        format('select public.lead_etiquetas_poner(%L, array[%L]::uuid[], false)', c.lead, v_etq)] loop
      f := pg_temp.falla(v_sql);
      if f is null or f[1] <> '42501' or f[2] <> v_nada then reset role; raise exception '% como %: %', v_sql, c.u, f; end if;
    end loop;
    reset role;
  end loop;
  if jsonb_build_array((select jsonb_agg(to_jsonb(x) order by x.lead_id, x.usuario_id) from public.leads_favoritos x),
                       (select jsonb_agg(to_jsonb(x) order by x.lead_id, x.usuario_id) from public.leads_tachados x),
                       (select jsonb_agg(to_jsonb(x) order by x.lead_id, x.etiqueta_id) from public.leads_etiquetas x)) <> v_antes then
    raise exception 'un rechazo cambió algo';
  end if;
end $$;
-- Quitar una marca de un lead que dejó de verse: el mismo mensaje; la marca sigue siendo suya.
do $$ declare v_lead uuid := (select id from public.leads where nombre = 'Marca Compartido'); f text[]; begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000041', true);
  set local role authenticated;
  perform public.lead_tachado_poner(v_lead, true);
  reset role;
  update public.leads_asesores set revocado_en = now() where lead_id = v_lead and usuario_id = '00000000-0000-0000-0000-000000000041';
  set local role authenticated;
  f := pg_temp.falla(format('select public.lead_tachado_poner(%L, false)', v_lead));
  if f is null or f[1] <> '42501' or f[2] <> 'No encontramos este lead o no tienes acceso.' then reset role; raise exception 'quitar sin ver: %', f; end if;
  if exists (select 1 from public.leads_vista where id = v_lead) then reset role; raise exception 'el revocado sigue viendo el lead'; end if;
  if not exists (select 1 from public.leads_tachados where lead_id = v_lead) then reset role; raise exception 'la marca dejó de ser suya'; end if;
  reset role;
  update public.leads_asesores set revocado_en = null where lead_id = v_lead and usuario_id = '00000000-0000-0000-0000-000000000041';
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test marcas: las cuatro tablas no se escriben directo, sólo se leen
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare v_lead uuid := (select id from public.leads where nombre = 'Marca Propio'); f text[]; v_sql text; begin
  foreach v_sql in array array[
      format('insert into public.leads_favoritos (lead_id, usuario_id) values (%L, %L)', v_lead, '00000000-0000-0000-0000-000000000040'),
      format('insert into public.leads_tachados (lead_id, usuario_id) values (%L, %L)', v_lead, '00000000-0000-0000-0000-000000000040'),
      'delete from public.leads_tachados',
      format('insert into public.etiquetas (usuario_id, nombre) values (%L, %L)', '00000000-0000-0000-0000-000000000040', 'directa'),
      'update public.etiquetas set nombre = ''x''',
      'delete from public.etiquetas',
      format('insert into public.leads_etiquetas (lead_id, etiqueta_id) values (%L, %L)', v_lead, '00000000-0000-0000-0000-0000000e4001'),
      'delete from public.leads_etiquetas'] loop
    f := pg_temp.falla(v_sql);
    if f is null or f[1] <> '42501' then raise exception '% : %', v_sql, f; end if;
  end loop;
  if (select count(*) from public.etiquetas) <> 1 then raise exception 'la propia se lee'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test etiquetas: crear es idempotente por id, recorta, rechaza el largo, el repetido sin importar mayúsculas y el color fuera de la paleta, y sugiere el color menos usado
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare r jsonb; f text[]; begin
  -- «De 40» (del bloque anterior) tomó «gris»; la siguiente sin color toma «rojo».
  r := public.etiqueta_crear('00000000-0000-0000-0000-0000000e4002', '  VIP  ');
  if r ->> 'resultado' <> 'creada' or r #>> '{etiqueta,nombre}' <> 'VIP' or r #>> '{etiqueta,color}' <> 'rojo' then raise exception 'crear: %', r; end if;
  r := public.etiqueta_crear('00000000-0000-0000-0000-0000000e4002', 'otra cosa');
  if r ->> 'resultado' <> 'repetido' or r #>> '{etiqueta,nombre}' <> 'VIP' then raise exception 'reintento: %', r; end if;
  f := pg_temp.falla('select public.etiqueta_crear(gen_random_uuid(), ''vip'')');
  if f[1] <> '22023' or f[2] <> 'Ya tienes una etiqueta «VIP».' or f[3] <> 'nombre' then raise exception 'repetido: %', f; end if;
  f := pg_temp.falla('select public.etiqueta_crear(gen_random_uuid(), ''   '')');
  if f[1] <> '22023' or f[3] <> 'nombre' then raise exception 'vacío: %', f; end if;
  f := pg_temp.falla(format('select public.etiqueta_crear(gen_random_uuid(), %L)', repeat('x', 31)));
  if f[1] <> '22023' or f[3] <> 'nombre' then raise exception 'largo: %', f; end if;
  f := pg_temp.falla('select public.etiqueta_crear(gen_random_uuid(), ''Hex'', ''#ff0000'')');
  if f[1] <> '22023' or f[3] <> 'color' then raise exception 'color: %', f; end if;
  r := public.etiqueta_crear('00000000-0000-0000-0000-0000000e4003', 'Urgente', 'verde');
  if r #>> '{etiqueta,color}' <> 'verde' then raise exception 'color elegido: %', r; end if;
end $$;
reset role;
-- El id de otra persona no se reutiliza ni se dice de quién es.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000041', false);
set role authenticated;
do $$ declare f text[]; r jsonb; begin
  f := pg_temp.falla('select public.etiqueta_crear(''00000000-0000-0000-0000-0000000e4002'', ''Mía'')');
  if f[1] <> '22023' or f[2] <> 'No pudimos crear esta etiqueta. Vuelve a intentarlo.' then raise exception 'id ajeno: %', f; end if;
  -- Otra persona puede tener una «VIP» propia.
  r := public.etiqueta_crear('00000000-0000-0000-0000-0000000e4101', 'vip');
  if r ->> 'resultado' <> 'creada' then raise exception 'cada quien sus nombres: %', r; end if;
  if (select count(*) from public.etiquetas) <> 1 then raise exception '41 ve etiquetas ajenas'; end if;
end $$;
reset role;
-- La paleta de la base es la del check.
do $$ begin
  if public._etiquetas_paleta() <> array['gris', 'rojo', 'naranja', 'ambar', 'verde', 'turquesa', 'azul', 'violeta'] then raise exception 'paleta'; end if;
  if pg_get_constraintdef((select oid from pg_constraint where conname = 'etiquetas_color_paleta'))
     not like '%''gris''%''rojo''%''naranja''%''ambar''%''verde''%''turquesa''%''azul''%''violeta''%' then
    raise exception 'el check no es la paleta: %', pg_get_constraintdef((select oid from pg_constraint where conname = 'etiquetas_color_paleta'));
  end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test etiquetas: renombrar y recolorear con versión (PT409 legible), lo guardado no choca, el repetido se rechaza y una ajena no existe
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare
  v_id uuid := '00000000-0000-0000-0000-0000000e4002';
  v_vieja timestamptz := (select actualizado_en from public.etiquetas where id = '00000000-0000-0000-0000-0000000e4002');
  r jsonb; f text[];
begin
  r := public.etiqueta_guardar(v_id, v_vieja, 'Vip', null);
  if r ->> 'resultado' <> 'guardada' or r #>> '{etiqueta,nombre}' <> 'Vip' or r #>> '{etiqueta,color}' <> 'rojo' then raise exception 'renombrar mayúsculas: %', r; end if;
  -- Lo mismo otra vez, con la versión vieja: ya está, no choca.
  r := public.etiqueta_guardar(v_id, v_vieja, 'Vip', 'rojo');
  if r ->> 'resultado' <> 'sin_cambios' then raise exception 'reintento: %', r; end if;
  f := pg_temp.falla(format('select public.etiqueta_guardar(%L, %L, null, ''azul'')', v_id, v_vieja));
  if f[1] <> 'PT409' or f[2] not like 'Cambiaste esta etiqueta % desde otra ventana. Recarga para seguir desde ahí.' then raise exception 'conflicto: %', f; end if;
  f := pg_temp.falla(format('select public.etiqueta_guardar(%L, %L, ''URGENTE'')', v_id, (select actualizado_en from public.etiquetas where id = v_id)));
  if f[1] <> '22023' or f[2] <> 'Ya tienes una etiqueta «Urgente».' or f[3] <> 'nombre' then raise exception 'renombrar a otra: %', f; end if;
  f := pg_temp.falla(format('select public.etiqueta_guardar(%L, null, ''x'')', v_id));
  if f is null or f[2] not like 'Falta la versión%' then raise exception 'sin versión: %', f; end if;
  f := pg_temp.falla(format('select public.etiqueta_guardar(%L, now(), ''x'')', '00000000-0000-0000-0000-0000000e4101'));
  if f[1] <> '42501' or f[2] <> 'No encontramos esta etiqueta. Recarga para ver las tuyas.' then raise exception 'ajena: %', f; end if;
  if (select nombre from public.etiquetas where id = v_id) <> 'Vip' then raise exception 'quedó: %', (select nombre from public.etiquetas where id = v_id); end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test etiquetas: ponerlas en un lead es «poner» por id, una ajena o inexistente se rechaza igual, y cada quien ve las suyas
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000041', false);
set role authenticated;
select public.lead_etiquetas_poner((select id from public.leads where nombre = 'Marca Compartido'), array['00000000-0000-0000-0000-0000000e4101']::uuid[], true);
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare
  v_lead uuid := (select id from public.leads where nombre = 'Marca Compartido');
  v_mias uuid[] := array['00000000-0000-0000-0000-0000000e4002', '00000000-0000-0000-0000-0000000e4003']::uuid[];
  r jsonb; f text[]; v_sql text;
begin
  r := public.lead_etiquetas_poner(v_lead, v_mias, true);
  if r ->> 'resultado' <> 'puesto' or r -> 'etiquetas' <> to_jsonb(v_mias) then raise exception 'poner: %', r; end if;
  r := public.lead_etiquetas_poner(v_lead, v_mias[1:1], true);
  if r ->> 'resultado' <> 'sin_cambios' then raise exception 'repetir: %', r; end if;
  if (select etiquetas from public.leads_vista where id = v_lead) <> v_mias then raise exception 'la vista: %', (select etiquetas from public.leads_vista where id = v_lead); end if;
  if (select count(*) from public.leads_etiquetas where lead_id = v_lead) <> 2 then raise exception '40 lee asignaciones de 41'; end if;
  -- Ajena (de 41, puesta en este mismo lead) e inexistente: el mismo rechazo, y nada cambia.
  foreach v_sql in array array[
      format('select public.lead_etiquetas_poner(%L, array[%L]::uuid[], true)', v_lead, '00000000-0000-0000-0000-0000000e4101'),
      format('select public.lead_etiquetas_poner(%L, array[%L]::uuid[], false)', v_lead, '00000000-0000-0000-0000-0000000e4101'),
      format('select public.lead_etiquetas_poner(%L, array[%L, %L]::uuid[], true)', v_lead, v_mias[1], gen_random_uuid())] loop
    f := pg_temp.falla(v_sql);
    if f[1] <> '22023' or f[2] <> 'No encontramos esa etiqueta. Recarga para ver las tuyas.' or f[3] <> 'etiquetas' then raise exception '%: %', v_sql, f; end if;
  end loop;
  f := pg_temp.falla(format('select public.lead_etiquetas_poner(%L, %L::uuid[], true)', v_lead, '{}'));
  if f[1] <> '22023' or f[3] <> 'etiquetas' then raise exception 'vacío: %', f; end if;
  f := pg_temp.falla(format('select public.lead_etiquetas_poner(%L, array[null]::uuid[], true)', v_lead));
  if f[1] <> '22023' or f[3] <> 'etiquetas' then raise exception 'nulo: %', f; end if;
  r := public.lead_etiquetas_poner(v_lead, v_mias[2:2], false);
  if r ->> 'resultado' <> 'quitado' or r -> 'etiquetas' <> to_jsonb(v_mias[1:1]) then raise exception 'quitar: %', r; end if;
end $$;
reset role;
-- 41 ve sólo la suya en el mismo lead.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000041', false);
set role authenticated;
do $$ begin
  if (select etiquetas from public.leads_vista where nombre = 'Marca Compartido') <> array['00000000-0000-0000-0000-0000000e4101']::uuid[] then
    raise exception '41 ve: %', (select etiquetas from public.leads_vista where nombre = 'Marca Compartido');
  end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test etiquetas: hasta 50 por persona y 20 suyas por lead, y lo rechazado no deja nada
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000043', false);
set role authenticated;
do $$ declare
  v_lead uuid := (select id from public.leads where nombre = 'Marca Topes');
  v_ids uuid[]; f text[]; r jsonb; i int;
begin
  for i in 1..50 loop
    perform public.etiqueta_crear(gen_random_uuid(), 'Tope ' || i);
  end loop;
  f := pg_temp.falla('select public.etiqueta_crear(gen_random_uuid(), ''Tope 51'')');
  if f[1] <> '22023' or f[2] <> 'Puedes tener hasta 50 etiquetas. Elimina una para crear otra.' then raise exception 'tope de 50: %', f; end if;
  if (select count(*) from public.etiquetas) <> 50 then raise exception 'quedaron %', (select count(*) from public.etiquetas); end if;
  -- La paleta se reparte: con 50, ningún color tiene más de 7.
  if (select max(n) from (select count(*) n from public.etiquetas group by color) x) > 7 then raise exception 'colores repartidos'; end if;
  -- 43 no ve «Marca Topes» (es de 40): no puede ponerlas.
  f := pg_temp.falla(format('select public.lead_etiquetas_poner(%L, array[%L]::uuid[], true)', v_lead, (select id from public.etiquetas limit 1)));
  if f[1] <> '42501' then raise exception 'sin ver: %', f; end if;
end $$;
reset role;
-- La dueña («todos») sí lo ve: 20 entran, la 21 no, y el rechazo no deja ninguna.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ declare v_lead uuid := (select id from public.leads where nombre = 'Marca Topes'); v_ids uuid[] := '{}'; f text[]; i int; r jsonb; begin
  for i in 1..21 loop
    v_ids := v_ids || ((public.etiqueta_crear(gen_random_uuid(), 'Dueña ' || i)) #>> '{etiqueta,id}')::uuid;
  end loop;
  f := pg_temp.falla(format('select public.lead_etiquetas_poner(%L, %L::uuid[], true)', v_lead, v_ids));
  if f[1] <> '22023' or f[3] <> 'etiquetas' then raise exception 'pedido de 21: %', f; end if;
  r := public.lead_etiquetas_poner(v_lead, v_ids[1:20], true);
  if jsonb_array_length(r -> 'etiquetas') <> 20 then raise exception 'veinte: %', r; end if;
  f := pg_temp.falla(format('select public.lead_etiquetas_poner(%L, array[%L]::uuid[], true)', v_lead, v_ids[21]));
  if f[1] <> '22023' or f[2] <> 'Un lead admite hasta 20 de tus etiquetas. Quita una para poner otra.' then raise exception 'la 21: %', f; end if;
  if cardinality((select etiquetas from public.leads_vista where id = v_lead)) <> 20 then raise exception 'el rechazo dejó algo'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- @test etiquetas: eliminar pide versión, dice a cuántos leads que ves tocaba, se lleva sus asignaciones y repetirlo no falla
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
do $$ declare
  v_id uuid := '00000000-0000-0000-0000-0000000e4002';
  v_lead uuid := (select id from public.leads where nombre = 'Marca Propio');
  v_version timestamptz; r jsonb; f text[];
begin
  perform public.lead_etiquetas_poner(v_lead, array[v_id], true);
  if (select leads from public.etiquetas_vista where id = v_id) <> 2 then raise exception 'la vista cuenta: %', (select leads from public.etiquetas_vista where id = v_id); end if;
  v_version := (select actualizado_en from public.etiquetas where id = v_id);
  f := pg_temp.falla(format('select public.etiqueta_eliminar(%L, %L)', v_id, v_version - interval '1 second'));
  if f[1] <> 'PT409' then raise exception 'versión vieja: %', f; end if;
  r := public.etiqueta_eliminar(v_id, v_version);
  if r ->> 'resultado' <> 'eliminada' or (r ->> 'leads')::int <> 2 or r #>> '{etiqueta,nombre}' <> 'Vip' then raise exception 'eliminar: %', r; end if;
  r := public.etiqueta_eliminar(v_id, v_version);
  if r ->> 'resultado' <> 'sin_cambios' then raise exception 'otra vez: %', r; end if;
  -- Una ajena también es «sin cambios»: no se distingue.
  r := public.etiqueta_eliminar('00000000-0000-0000-0000-0000000e4101', now());
  if r ->> 'resultado' <> 'sin_cambios' then raise exception 'ajena: %', r; end if;
  if exists (select 1 from public.leads_etiquetas where etiqueta_id = v_id) then raise exception 'quedaron asignaciones'; end if;
  if cardinality((select etiquetas from public.leads_vista where id = v_lead)) <> 0 then raise exception 'el lead la sigue mostrando'; end if;
  -- «Deshacer»: crear con el mismo id la vuelve a traer.
  r := public.etiqueta_crear(v_id, 'Vip', 'rojo');
  if r ->> 'resultado' <> 'creada' then raise exception 'recrear: %', r; end if;
end $$;
reset role;
-- La de 41 sigue.
do $$ begin
  if not exists (select 1 from public.etiquetas where id = '00000000-0000-0000-0000-0000000e4101') then raise exception 'se borró la de 41'; end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test marcas: compartir y transferir un lead no mueve ni muestra las marcas de nadie
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', false);
set role authenticated;
select public.lead_favorito_poner((select id from public.leads where nombre = 'Marca Propio'), true);
select public.lead_etiquetas_poner((select id from public.leads where nombre = 'Marca Propio'), array['00000000-0000-0000-0000-0000000e4003']::uuid[], true);
select public.lead_compartir((select id from public.leads where nombre = 'Marca Propio'), '00000000-0000-0000-0000-000000000043');
reset role;
do $$ declare v_lead uuid := (select id from public.leads where nombre = 'Marca Propio'); v record; begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000043', true);
  set local role authenticated;
  select * into v from public.leads_vista where id = v_lead;
  if not found then reset role; raise exception '43 no recibió el lead'; end if;
  if v.es_favorito or v.esta_tachado or cardinality(v.etiquetas) <> 0 then reset role; raise exception 'compartir mostró marcas: %', to_jsonb(v); end if;
  reset role;
  -- 40 se lo transfiere a 43: las marcas de 40 siguen en su lugar.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000040', true);
  set local role authenticated;
  perform public.lead_transferir(v_lead, '00000000-0000-0000-0000-000000000043', '00000000-0000-0000-0000-000000000040');
  select * into v from public.leads_vista where id = v_lead;
  if not v.es_favorito or v.etiquetas <> array['00000000-0000-0000-0000-0000000e4003']::uuid[] then reset role; raise exception 'transferir movió marcas de 40: %', to_jsonb(v); end if;
  reset role;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000043', true);
  set local role authenticated;
  select * into v from public.leads_vista where id = v_lead;
  if v.es_favorito or cardinality(v.etiquetas) <> 0 then reset role; raise exception 'el nuevo dueño ve marcas ajenas'; end if;
  reset role;
  -- Vuelve a 40.
  delete from public.leads_asesores where lead_id = v_lead and usuario_id = '00000000-0000-0000-0000-000000000043';
  update public.leads_asesores set tipo_acceso = 'dueno' where lead_id = v_lead and usuario_id = '00000000-0000-0000-0000-000000000040';
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test importaciones: la app no las escribe directo (parte 8b); se crean, cierran y deshacen por RPC
do $$ declare v_imp uuid := gen_random_uuid(); begin
  insert into public.importaciones (id, usuario_id, entidad, estado, iniciada_en)
  values (v_imp, '00000000-0000-0000-0000-000000000002', 'leads', 'procesando', now());
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  set local role authenticated;
  begin
    insert into public.importaciones (usuario_id, entidad, estado, terminada_en)
    values ('00000000-0000-0000-0000-000000000002', 'leads', 'terminada', now() + interval '1 year');
    reset role;
    raise exception 'authenticated creó una importación directo (con un plazo inventado)';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.importaciones where id = v_imp;
    reset role;
    raise exception 'authenticated borró su importación directo';
  exception when insufficient_privilege then null; end;
  begin
    update public.importaciones set terminada_en = now() + interval '1 year' where id = v_imp;
    reset role;
    raise exception 'authenticated cambió el plazo de su importación';
  exception when insufficient_privilege then null; end;
  -- Leerla, sí: es suya.
  if not exists (select 1 from public.importaciones where id = v_imp) then reset role; raise exception 'no lee su importación'; end if;
  reset role;
  delete from public.importaciones where id = v_imp;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test orígenes del lead (9f-1): sólo por RPC, con permiso, versión, tope y sin que un alta guarde uno apagado
create or replace function pg_temp.falla(p_sql text, p_estado text, p_texto text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'no falló: %', p_sql;
exception when others then
  if sqlstate <> p_estado or position(p_texto in sqlerrm) = 0 then
    raise exception '% debía fallar con % y «%», falló con % y «%»', p_sql, p_estado, p_texto, sqlstate, sqlerrm;
  end if;
end $$;
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000b1', 'origenes-asesora@ejemplo.com', '{"invitado": true}');
update public.leads_campos set requerido = false where requerido;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ begin
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-0000000000b1', (select id from public.roles where clave = 'asesor'), true);
end $$;
reset role;

-- Quien tiene leads.configurar: nombre normalizado, clave que sale del nombre, repetir el id no duplica.
set role authenticated;
do $$
declare
  r jsonb; v_id uuid := gen_random_uuid(); v_ver timestamptz; v_n int; v_clave text;
  v_a uuid := gen_random_uuid(); v_b uuid := gen_random_uuid(); v_c uuid := gen_random_uuid();
  v_va timestamptz; v_vb timestamptz; v_vc timestamptz;
begin
  r := public.origen_lead_crear(v_id, '   Redes   sociales ');
  v_ver := (r ->> 'actualizado_en')::timestamptz;
  select o.clave into v_clave from public.origenes_lead o where o.id = v_id;
  if v_clave <> 'redes_sociales' or (select nombre from public.origenes_lead where id = v_id) <> 'Redes sociales' then
    raise exception 'el nombre o la clave: %', v_clave; end if;
  if (r ->> 'repetido')::boolean then raise exception 'la primera vez no es un reintento'; end if;
  if (select orden from public.origenes_lead where id = v_id) <> (select max(orden) from public.origenes_lead) then
    raise exception 'el nuevo no quedó al final'; end if;
  -- Un reintento con el mismo id no duplica.
  r := public.origen_lead_crear(v_id, 'Redes sociales');
  if not (r ->> 'repetido')::boolean or (select count(*) from public.origenes_lead where id = v_id) <> 1 then
    raise exception 'el reintento duplicó: %', r; end if;
  -- La lista que vuelve trae el origen, su versión y si tiene leads.
  if not exists (select 1 from jsonb_array_elements(r -> 'origenes') x where x ->> 'id' = v_id::text and (x ->> 'con_leads')::boolean = false) then
    raise exception 'la lista de vuelta: %', r; end if;
  -- Acentos, signos y empezar con un número.
  perform public.origen_lead_crear(v_a, 'Ándale ¡ya!');
  perform public.origen_lead_crear(v_b, '2x1');
  if (select clave from public.origenes_lead where id = v_a) <> 'andale_ya' or (select clave from public.origenes_lead where id = v_b) <> 'o_2x1' then
    raise exception 'claves: % %', (select clave from public.origenes_lead where id = v_a), (select clave from public.origenes_lead where id = v_b); end if;

  -- Nombre vacío, en blanco, largo o repetido (sin importar mayúsculas ni espacios): el hint es «nombre».
  perform pg_temp.falla($f$select public.origen_lead_crear(gen_random_uuid(), '')$f$, '22023', 'Escribe el nombre');
  perform pg_temp.falla($f$select public.origen_lead_crear(gen_random_uuid(), '    ')$f$, '22023', 'Escribe el nombre');
  perform pg_temp.falla(format($f$select public.origen_lead_crear(gen_random_uuid(), %L)$f$, repeat('x', 41)), '22023', 'hasta 40 caracteres');
  perform pg_temp.falla($f$select public.origen_lead_crear(gen_random_uuid(), '  REDES    sociales ')$f$, '23505', 'Ya hay un origen');
  perform pg_temp.falla($f$select public.origen_lead_crear(gen_random_uuid(), 'facebook')$f$, '23505', 'Ya hay un origen');

  -- Renombrar: pide versión, una vieja es PT409 y repetir el nombre de otro no se puede.
  perform pg_temp.falla(format($f$select public.origen_lead_guardar(%L, null, '{"nombre": "Otro nombre"}')$f$, v_id), 'P0001', 'Falta la versión');
  r := public.origen_lead_guardar(v_id, v_ver, '{"nombre": "  Redes  "}');
  if (select nombre from public.origenes_lead where id = v_id) <> 'Redes' or (r ->> 'actualizado_en')::timestamptz = v_ver then
    raise exception 'el renombre no movió la versión: %', r; end if;
  perform pg_temp.falla(format($f$select public.origen_lead_guardar(%L, %L, '{"nombre": "Redes 2"}')$f$, v_id, v_ver), 'PT409', 'Otra persona cambió este origen');
  v_ver := (r ->> 'actualizado_en')::timestamptz;
  perform pg_temp.falla(format($f$select public.origen_lead_guardar(%L, %L, '{"nombre": "Web"}')$f$, v_id, v_ver), '23505', 'Ya hay un origen');
  perform pg_temp.falla(format($f$select public.origen_lead_guardar(%L, %L, '{"clave": "x"}')$f$, v_id, v_ver), '22023', 'no se cambia');
  perform pg_temp.falla(format($f$select public.origen_lead_guardar(%L, %L, '{"activo": "no"}')$f$, v_id, v_ver), '22023', 'sí o no');
  -- Lo que ya está guardado no es un conflicto: un reintento no choca consigo mismo.
  r := public.origen_lead_guardar(v_id, v_ver - interval '1 second', '{"nombre": "Redes"}');
  if not (r ->> 'sin_cambios')::boolean then raise exception 'el reintento chocó consigo mismo: %', r; end if;

  -- Ordenar: «después de». Mover no cambia la versión de nadie, así que la de pantalla sigue sirviendo.
  select actualizado_en into v_va from public.origenes_lead where id = v_a;
  select actualizado_en into v_vb from public.origenes_lead where id = v_b;
  select actualizado_en into v_vc from public.origenes_lead where id = v_id;
  r := public.origen_lead_mover(v_id, v_vc, null);
  if (select (array_agg(t.x ->> 'id' order by t.n))[1] from jsonb_array_elements(r -> 'origenes') with ordinality as t (x, n)) <> v_id::text then
    raise exception 'no quedó primero: %', r; end if;
  r := public.origen_lead_mover(v_id, v_vc, v_a);
  if (select orden from public.origenes_lead where id = v_id) <= (select orden from public.origenes_lead where id = v_a)
     or (select orden from public.origenes_lead where id = v_id) >= (select orden from public.origenes_lead where id = v_b) then
    raise exception 'no quedó entre medio: %', r; end if;
  if (select count(distinct orden) from public.origenes_lead) <> (select count(*) from public.origenes_lead) then
    raise exception 'quedaron dos con el mismo lugar'; end if;
  if (select actualizado_en from public.origenes_lead where id = v_a) <> v_va then raise exception 'mover movió la versión de otro'; end if;
  perform pg_temp.falla(format($f$select public.origen_lead_mover(%L, %L, %L)$f$, v_id, v_vc, v_id), '22023', 'después de sí mismo');
  perform pg_temp.falla(format($f$select public.origen_lead_mover(%L, %L, %L)$f$, v_id, v_vc, gen_random_uuid()), 'PT409', 'ya no existe');
  perform pg_temp.falla(format($f$select public.origen_lead_mover(%L, null, null)$f$, v_id), 'P0001', 'Falta la versión');

  -- Eliminar uno sin leads: sí (pide versión); uno que ya no está: PT409.
  perform pg_temp.falla(format($f$select public.origen_lead_eliminar(%L, %L)$f$, v_b, v_vb - interval '1 second'), 'PT409', 'Otra persona cambió este origen');
  r := public.origen_lead_eliminar(v_b, v_vb);
  if exists (select 1 from public.origenes_lead where id = v_b) then raise exception 'no se eliminó'; end if;
  perform pg_temp.falla(format($f$select public.origen_lead_eliminar(%L, %L)$f$, v_b, v_vb), 'PT409', 'ya no existe');

  -- La lectura de la pantalla.
  if jsonb_array_length(public.origenes_lead_con_uso()) <> (select count(*) from public.origenes_lead) then raise exception 'con_uso incompleto'; end if;
end $$;
reset role;

-- Un origen con leads no se elimina, ni siquiera con el lead en la papelera; se desactiva y deja de ofrecerse.
do $$
declare
  v_o uuid := (select id from public.origenes_lead where clave = 'redes_sociales');
  v_ver timestamptz; v_lead uuid := gen_random_uuid(); r jsonb; v_inactivo uuid;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  r := public.crear_lead(v_lead, jsonb_build_object('nombre', 'Lead Redes 9f', 'telefono_principal', '71909001', 'origen_lead_id', v_o), null);
  if r ->> 'resultado' <> 'creado' then raise exception 'no creó el lead: %', r; end if;
  select actualizado_en into v_ver from public.origenes_lead where id = v_o;
  perform pg_temp.falla(format($f$select public.origen_lead_eliminar(%L, %L)$f$, v_o, v_ver), '23503', 'ya tiene leads');
  if not exists (select 1 from jsonb_array_elements(public.origenes_lead_con_uso()) x where x ->> 'id' = v_o::text and (x ->> 'con_leads')::boolean) then
    raise exception 'con_uso no marca que tiene leads'; end if;
  -- Desactivarlo: el alta ya no lo ofrece ni lo acepta; el lead que lo tiene lo conserva.
  r := public.origen_lead_guardar(v_o, v_ver, '{"activo": false}');
  if exists (select 1 from jsonb_array_elements(public.lead_alta_contexto() -> 'origenes') x where x ->> 'id' = v_o::text) then
    raise exception 'el alta sigue ofreciendo uno desactivado'; end if;
  perform pg_temp.falla(format($f$select public.crear_lead(gen_random_uuid(), '{"nombre": "Apagado", "telefono_principal": "71909002", "origen_lead_id": "%s"}', null)$f$, v_o), '22023', 'desactivado');
  if (select origen_lead_id from public.leads where id = v_lead) is distinct from v_o then raise exception 'el lead perdió su origen'; end if;
  reset role;
  -- El último recurso de la base: pasar un lead a un origen apagado, aunque lo haga quien salta la RLS, no se guarda.
  v_inactivo := v_o;
  begin
    update public.leads set origen_lead_id = v_inactivo where id = (select id from public.leads where origen_lead_id is distinct from v_inactivo limit 1);
    raise exception 'guardó un origen desactivado';
  exception when others then
    if sqlstate <> '22023' or position('se desactivó' in sqlerrm) = 0 then raise exception 'el trigger: % (%)', sqlerrm, sqlstate; end if;
  end;
  -- En la papelera también cuenta (la FK es restrict).
  update public.leads set eliminado_en = now(), eliminado_por = '00000000-0000-0000-0000-000000000001' where id = v_lead;
  set local role authenticated;
  perform pg_temp.falla(format($f$select public.origen_lead_eliminar(%L, %L)$f$, v_o, (select actualizado_en from public.origenes_lead where id = v_o)), '23503', 'ya tiene leads');
  reset role;
  delete from public.leads where id = v_lead;
  -- Sin leads, ahora sí.
  set local role authenticated;
  perform public.origen_lead_eliminar(v_o, (select actualizado_en from public.origenes_lead where id = v_o));
  reset role;
  if exists (select 1 from public.origenes_lead where id = v_o) then raise exception 'no se eliminó'; end if;
end $$;

-- El tope de 100: se dice con el máximo, no se pasa y eliminar uno deja crear otro.
do $$
declare v_n int := (select count(*) from public.origenes_lead); v_id uuid := gen_random_uuid(); r jsonb;
begin
  insert into public.origenes_lead (clave, nombre, activo, orden)
  select 'relleno_' || g, 'Relleno ' || g, false, 500 + g from generate_series(1, 100 - v_n) g;
  if (select count(*) from public.origenes_lead) <> 100 then raise exception 'no quedaron 100'; end if;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  perform pg_temp.falla($f$select public.origen_lead_crear(gen_random_uuid(), 'El ciento uno')$f$, '22023', 'máximo');
  r := public.origen_lead_eliminar((select id from public.origenes_lead where clave = 'relleno_1'),
         (select actualizado_en from public.origenes_lead where clave = 'relleno_1'));
  r := public.origen_lead_crear(v_id, 'El ciento');
  reset role;
  delete from public.origenes_lead where clave like 'relleno\_%' or id = v_id;
end $$;

-- Sin el permiso: nada de esto. Leer, sí (el alta y los filtros lo necesitan); escribir directo, no.
do $$
declare v_o uuid := (select id from public.origenes_lead where clave = 'web'); v_ver timestamptz := (select actualizado_en from public.origenes_lead where clave = 'web');
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
  set local role authenticated;
  perform pg_temp.falla($f$select public.origen_lead_crear(gen_random_uuid(), 'Intruso')$f$, '42501', 'leads.configurar');
  perform pg_temp.falla(format($f$select public.origen_lead_guardar(%L, %L, '{"activo": false}')$f$, v_o, v_ver), '42501', 'leads.configurar');
  perform pg_temp.falla(format($f$select public.origen_lead_mover(%L, %L, null)$f$, v_o, v_ver), '42501', 'leads.configurar');
  perform pg_temp.falla(format($f$select public.origen_lead_eliminar(%L, %L)$f$, v_o, v_ver), '42501', 'leads.configurar');
  perform pg_temp.falla($f$select public.origenes_lead_con_uso()$f$, '42501', 'leads.configurar');
  perform pg_temp.falla($f$insert into public.origenes_lead (clave, nombre) values ('directo', 'Directo')$f$, '42501', 'permission denied');
  perform pg_temp.falla(format($f$update public.origenes_lead set activo = false where id = %L$f$, v_o), '42501', 'permission denied');
  perform pg_temp.falla(format($f$delete from public.origenes_lead where id = %L$f$, v_o), '42501', 'permission denied');
  if (select count(*) from public.origenes_lead) = 0 then raise exception 'no lee los orígenes'; end if;
  reset role;
end $$;

-- Con cero orígenes activos el alta sigue andando, sin origen.
do $$
declare r jsonb;
begin
  update public.origenes_lead set activo = false;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  if jsonb_array_length(public.lead_alta_contexto() -> 'origenes') <> 0 then raise exception 'ofrece orígenes apagados'; end if;
  r := public.crear_lead(gen_random_uuid(), '{"nombre": "Sin origen alguno", "telefono_principal": "71909003"}', null);
  if r ->> 'resultado' <> 'creado' then raise exception 'sin orígenes activos no creó: %', r; end if;
  reset role;
  delete from public.leads where nombre = 'Sin origen alguno';
  update public.origenes_lead set activo = (clave in ('facebook', 'web'));
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test tipos de lead (9j): sólo por RPC, con permiso, versión, tope y clase; siempre uno activo de cada clase; un lead no guarda uno apagado
create or replace function pg_temp.falla(p_sql text, p_estado text, p_texto text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'no falló: %', p_sql;
exception when others then
  if sqlstate <> p_estado or position(p_texto in sqlerrm) = 0 then
    raise exception '% debía fallar con % y «%», falló con % y «%»', p_sql, p_estado, p_texto, sqlstate, sqlerrm;
  end if;
end $$;

-- Lo que la migración deja: los dos tipos de siempre, con las claves del enum, cada uno de su clase, y el de por defecto.
do $$
begin
  if (select string_agg(clave || ':' || nombre || ':' || clase || ':' || activo, ',' order by orden) from public.tipos_lead)
       <> 'prospecto:Prospecto:prospecto:true,cliente:Cliente:cliente:true' then
    raise exception 'los tipos de fábrica: %', (select string_agg(clave, ',') from public.tipos_lead); end if;
  if public._tipo_lead_por_defecto() is distinct from (select id from public.tipos_lead where clave = 'prospecto') then
    raise exception 'el tipo por defecto no es el primero activo de la clase prospecto'; end if;
end $$;

-- Quien tiene leads.configurar: nombre normalizado, clave que sale del nombre, repetir el id no duplica, y la clase se elige y no cambia.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
do $$
declare
  r jsonb; v_id uuid := gen_random_uuid(); v_ver timestamptz; v_clave text;
  v_a uuid := gen_random_uuid(); v_b uuid := gen_random_uuid(); v_c uuid := gen_random_uuid();
  v_va timestamptz; v_vc timestamptz;
begin
  r := public.tipo_lead_crear(v_id, '   Cliente   VIP ', 'cliente');
  v_ver := (r ->> 'actualizado_en')::timestamptz;
  select t.clave into v_clave from public.tipos_lead t where t.id = v_id;
  if v_clave <> 'cliente_vip' or (select nombre from public.tipos_lead where id = v_id) <> 'Cliente VIP'
     or (select clase from public.tipos_lead where id = v_id) <> 'cliente' then
    raise exception 'el nombre, la clave o la clase: %', v_clave; end if;
  if (r ->> 'repetido')::boolean then raise exception 'la primera vez no es un reintento'; end if;
  if (select orden from public.tipos_lead where id = v_id) <> (select max(orden) from public.tipos_lead) then
    raise exception 'el nuevo no quedó al final'; end if;
  -- Un reintento con el mismo id no duplica.
  r := public.tipo_lead_crear(v_id, 'Cliente VIP', 'cliente');
  if not (r ->> 'repetido')::boolean or (select count(*) from public.tipos_lead where id = v_id) <> 1 then
    raise exception 'el reintento duplicó: %', r; end if;
  -- La lista que vuelve trae el tope (de la base), la clase, la versión y si tiene leads.
  if (r -> 'lista' ->> 'tope')::int <> 100 then raise exception 'el tope: %', r -> 'lista' ->> 'tope'; end if;
  if not exists (select 1 from jsonb_array_elements(r -> 'lista' -> 'tipos') x
                  where x ->> 'id' = v_id::text and x ->> 'clase' = 'cliente' and (x ->> 'con_leads')::boolean = false) then
    raise exception 'la lista de vuelta: %', r; end if;
  -- Acentos, signos y empezar con un número.
  perform public.tipo_lead_crear(v_a, 'Ándale ¡ya!', 'prospecto');
  perform public.tipo_lead_crear(v_b, '2x1', 'prospecto');
  if (select clave from public.tipos_lead where id = v_a) <> 'andale_ya' or (select clave from public.tipos_lead where id = v_b) <> 't_2x1' then
    raise exception 'claves: % %', (select clave from public.tipos_lead where id = v_a), (select clave from public.tipos_lead where id = v_b); end if;

  -- Nombre vacío, en blanco, largo o repetido (sin importar mayúsculas ni espacios), y una clase que no es una de las dos.
  perform pg_temp.falla($f$select public.tipo_lead_crear(gen_random_uuid(), '', 'cliente')$f$, '22023', 'Escribe el nombre');
  perform pg_temp.falla($f$select public.tipo_lead_crear(gen_random_uuid(), '    ', 'cliente')$f$, '22023', 'Escribe el nombre');
  perform pg_temp.falla(format($f$select public.tipo_lead_crear(gen_random_uuid(), %L, 'cliente')$f$, repeat('x', 41)), '22023', 'hasta 40 caracteres');
  perform pg_temp.falla($f$select public.tipo_lead_crear(gen_random_uuid(), '  CLIENTE    vip ', 'cliente')$f$, '23505', 'Ya hay un tipo');
  perform pg_temp.falla($f$select public.tipo_lead_crear(gen_random_uuid(), 'prospecto', 'prospecto')$f$, '23505', 'Ya hay un tipo');
  perform pg_temp.falla($f$select public.tipo_lead_crear(gen_random_uuid(), 'Sin clase', null)$f$, '22023', 'Elige la clase');
  perform pg_temp.falla($f$select public.tipo_lead_crear(gen_random_uuid(), 'Otra clase', 'proveedor')$f$, '22023', 'Elige la clase');

  -- Renombrar: pide versión, una vieja es PT409 y repetir el nombre de otro no se puede. La clase no se cambia.
  perform pg_temp.falla(format($f$select public.tipo_lead_guardar(%L, null, '{"nombre": "Otro nombre"}')$f$, v_id), 'P0001', 'Falta la versión');
  r := public.tipo_lead_guardar(v_id, v_ver, '{"nombre": "  VIP  "}');
  if (select nombre from public.tipos_lead where id = v_id) <> 'VIP' or (r ->> 'actualizado_en')::timestamptz = v_ver then
    raise exception 'el renombre no movió la versión: %', r; end if;
  if (select clave from public.tipos_lead where id = v_id) <> 'cliente_vip' then raise exception 'renombrar cambió la clave'; end if;
  perform pg_temp.falla(format($f$select public.tipo_lead_guardar(%L, %L, '{"nombre": "VIP 2"}')$f$, v_id, v_ver), 'PT409', 'Otra persona cambió este tipo');
  v_ver := (r ->> 'actualizado_en')::timestamptz;
  perform pg_temp.falla(format($f$select public.tipo_lead_guardar(%L, %L, '{"nombre": "Cliente"}')$f$, v_id, v_ver), '23505', 'Ya hay un tipo');
  perform pg_temp.falla(format($f$select public.tipo_lead_guardar(%L, %L, '{"clave": "x"}')$f$, v_id, v_ver), '22023', 'no se cambia');
  perform pg_temp.falla(format($f$select public.tipo_lead_guardar(%L, %L, '{"clase": "prospecto"}')$f$, v_id, v_ver), '22023', 'La clase de un tipo no cambia');
  perform pg_temp.falla(format($f$select public.tipo_lead_guardar(%L, %L, '{"activo": "no"}')$f$, v_id, v_ver), '22023', 'sí o no');
  -- Lo que ya está guardado no es un conflicto: un reintento no choca consigo mismo.
  r := public.tipo_lead_guardar(v_id, v_ver - interval '1 second', '{"nombre": "VIP"}');
  if not (r ->> 'sin_cambios')::boolean then raise exception 'el reintento chocó consigo mismo: %', r; end if;

  -- Ordenar: «después de». Mover no cambia la versión de nadie.
  select actualizado_en into v_va from public.tipos_lead where id = v_a;
  select actualizado_en into v_vc from public.tipos_lead where id = v_id;
  r := public.tipo_lead_mover(v_id, v_vc, null);
  if (select (array_agg(t.x ->> 'id' order by t.n))[1] from jsonb_array_elements(r -> 'lista' -> 'tipos') with ordinality as t (x, n)) <> v_id::text then
    raise exception 'no quedó primero: %', r; end if;
  r := public.tipo_lead_mover(v_id, v_vc, v_a);
  if (select orden from public.tipos_lead where id = v_id) <= (select orden from public.tipos_lead where id = v_a)
     or (select orden from public.tipos_lead where id = v_id) >= (select orden from public.tipos_lead where id = v_b) then
    raise exception 'no quedó entre medio: %', r; end if;
  if (select count(distinct orden) from public.tipos_lead) <> (select count(*) from public.tipos_lead) then
    raise exception 'quedaron dos con el mismo lugar'; end if;
  if (select actualizado_en from public.tipos_lead where id = v_a) <> v_va then raise exception 'mover movió la versión de otro'; end if;
  perform pg_temp.falla(format($f$select public.tipo_lead_mover(%L, %L, %L)$f$, v_id, v_vc, v_id), '22023', 'después de sí mismo');
  perform pg_temp.falla(format($f$select public.tipo_lead_mover(%L, %L, %L)$f$, v_id, v_vc, gen_random_uuid()), 'PT409', 'ya no existe');
  perform pg_temp.falla(format($f$select public.tipo_lead_mover(%L, null, null)$f$, v_id), 'P0001', 'Falta la versión');

  -- Eliminar uno sin leads: sí (pide versión); uno que ya no está: PT409.
  perform pg_temp.falla(format($f$select public.tipo_lead_eliminar(%L, %L)$f$, v_b, (select actualizado_en from public.tipos_lead where id = v_b) - interval '1 second'), 'PT409', 'Otra persona cambió este tipo');
  perform public.tipo_lead_eliminar(v_b, (select actualizado_en from public.tipos_lead where id = v_b));
  if exists (select 1 from public.tipos_lead where id = v_b) then raise exception 'no se eliminó'; end if;
  perform pg_temp.falla(format($f$select public.tipo_lead_eliminar(%L, %L)$f$, v_b, now()), 'PT409', 'ya no existe');

  -- La lectura de la pantalla: el tope y todos los tipos.
  r := public.tipos_lead_con_uso();
  if jsonb_array_length(r -> 'tipos') <> (select count(*) from public.tipos_lead) or (r ->> 'tope')::int <> 100 then raise exception 'con_uso incompleto'; end if;
end $$;
reset role;

-- Siempre queda un tipo activo de cada clase: lo dicen las RPC y lo impone la base aunque se escriba sin ellas.
do $$
declare
  v_pro uuid := (select id from public.tipos_lead where clave = 'prospecto');
  v_cli uuid := (select id from public.tipos_lead where clave = 'cliente');
  v_vip uuid := (select id from public.tipos_lead where clave = 'cliente_vip');
  v_andale uuid := (select id from public.tipos_lead where clave = 'andale_ya'); v_solo uuid := gen_random_uuid();
  v_ver timestamptz; r jsonb;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  -- «Prospecto» y «Ándale ya!» son los dos de la clase prospecto: apagar uno, sí; el otro, no.
  r := public.tipo_lead_guardar(v_andale, (select actualizado_en from public.tipos_lead where id = v_andale), '{"activo": false}');
  perform pg_temp.falla(format($f$select public.tipo_lead_guardar(%L, %L, '{"activo": false}')$f$, v_pro, (select actualizado_en from public.tipos_lead where id = v_pro)),
    '22023', 'Es el único tipo activo de la clase «prospecto»');
  -- Con la clase cliente igual: apagado «VIP», «Cliente» es el último.
  perform public.tipo_lead_guardar(v_vip, (select actualizado_en from public.tipos_lead where id = v_vip), '{"activo": false}');
  perform pg_temp.falla(format($f$select public.tipo_lead_guardar(%L, %L, '{"activo": false}')$f$, v_cli, (select actualizado_en from public.tipos_lead where id = v_cli)),
    '22023', 'Es el único tipo activo de la clase «cliente»');
  -- Volver a encender uno apagado siempre se puede; con dos activos, apagar uno vuelve a poderse.
  perform public.tipo_lead_guardar(v_vip, (select actualizado_en from public.tipos_lead where id = v_vip), '{"activo": true}');
  perform public.tipo_lead_guardar(v_cli, (select actualizado_en from public.tipos_lead where id = v_cli), '{"activo": false}');
  perform pg_temp.falla(format($f$select public.tipo_lead_guardar(%L, %L, '{"activo": false}')$f$, v_vip, (select actualizado_en from public.tipos_lead where id = v_vip)),
    '22023', 'Es el único tipo activo de la clase «cliente»');
  perform public.tipo_lead_guardar(v_cli, (select actualizado_en from public.tipos_lead where id = v_cli), '{"activo": true}');
  -- Eliminar el último activo de su clase tampoco (uno sin leads: con leads se desactiva): «Solo» es el único activo cuando «Prospecto» se apaga.
  perform public.tipo_lead_eliminar(v_andale, (select actualizado_en from public.tipos_lead where id = v_andale));
  perform public.tipo_lead_crear(v_solo, 'Solo', 'prospecto');
  perform public.tipo_lead_guardar(v_pro, (select actualizado_en from public.tipos_lead where id = v_pro), '{"activo": false}');
  perform pg_temp.falla(format($f$select public.tipo_lead_eliminar(%L, %L)$f$, v_solo, (select actualizado_en from public.tipos_lead where id = v_solo)),
    '22023', 'Es el único tipo activo de la clase «prospecto»');
  perform public.tipo_lead_guardar(v_pro, (select actualizado_en from public.tipos_lead where id = v_pro), '{"activo": true}');
  perform public.tipo_lead_eliminar(v_solo, (select actualizado_en from public.tipos_lead where id = v_solo));
  reset role;

  -- La base lo impone sin pasar por la RPC (quien salta la RLS): apagar, eliminar y cambiar la clase.
  perform pg_temp.falla(format($f$update public.tipos_lead set activo = false where id = %L$f$, v_pro), '22023', 'Es el único tipo activo');
  perform pg_temp.falla(format($f$delete from public.tipos_lead where id = %L$f$, v_pro), '22023', 'Es el único tipo activo');
  perform pg_temp.falla(format($f$update public.tipos_lead set clase = 'cliente' where id = %L$f$, v_pro), '22023', 'La clase de un tipo no cambia');
  perform pg_temp.falla(format($f$update public.tipos_lead set clase = 'prospecto' where id = %L$f$, v_vip), '22023', 'La clase de un tipo no cambia');
  if (select count(*) from public.tipos_lead where activo and clase = 'prospecto') < 1 or (select count(*) from public.tipos_lead where activo and clase = 'cliente') < 1 then
    raise exception 'quedó una clase sin activos'; end if;
end $$;

-- Un tipo con leads no se elimina, ni siquiera con el lead en la papelera; se desactiva y deja de ofrecerse; el lead que lo tiene lo conserva.
do $$
declare
  v_vip uuid := (select id from public.tipos_lead where clave = 'cliente_vip');
  v_web uuid := (select id from public.origenes_lead where clave = 'web');
  v_lead uuid := gen_random_uuid(); v_ver timestamptz; r jsonb;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  r := public.crear_lead(v_lead, jsonb_build_object('nombre', 'Lead VIP 9j', 'telefono_principal', '71909101', 'origen_lead_id', v_web, 'tipo_lead_id', v_vip), null);
  if r ->> 'resultado' <> 'creado' then raise exception 'no creó el lead: %', r; end if;
  if (select tipo_lead_id from public.leads where id = v_lead) <> v_vip then raise exception 'el lead no quedó con su tipo'; end if;
  if public.lead_ficha(v_lead) ->> 'tipo_lead_id' <> v_vip::text then raise exception 'la ficha no dice el tipo'; end if;
  select actualizado_en into v_ver from public.tipos_lead where id = v_vip;
  perform pg_temp.falla(format($f$select public.tipo_lead_eliminar(%L, %L)$f$, v_vip, v_ver), '23503', 'ya tiene leads');
  if not exists (select 1 from jsonb_array_elements(public.tipos_lead_con_uso() -> 'tipos') x where x ->> 'id' = v_vip::text and (x ->> 'con_leads')::boolean) then
    raise exception 'con_uso no marca que tiene leads'; end if;
  -- Desactivarlo (queda «Cliente»): el alta ya no lo ofrece ni lo acepta; el lead que lo tiene lo conserva y se puede editar.
  perform public.tipo_lead_guardar(v_vip, v_ver, '{"activo": false}');
  if exists (select 1 from jsonb_array_elements(public.lead_alta_contexto() -> 'tipos') x where x ->> 'id' = v_vip::text) then
    raise exception 'el alta sigue ofreciendo uno desactivado'; end if;
  perform pg_temp.falla(format($f$select public.crear_lead(gen_random_uuid(), '{"nombre": "Apagado", "telefono_principal": "71909102", "origen_lead_id": "%s", "tipo_lead_id": "%s"}', null)$f$, v_web, v_vip),
    '22023', 'se desactivó');
  perform pg_temp.falla(format($f$select public.crear_lead(gen_random_uuid(), '{"nombre": "Inexistente", "telefono_principal": "71909103", "origen_lead_id": "%s", "tipo_lead_id": "00000000-0000-4000-8000-00000000ffff"}', null)$f$, v_web),
    '22023', 'ya no existe');
  perform pg_temp.falla(format($f$select public.crear_lead(gen_random_uuid(), '{"nombre": "Mal", "telefono_principal": "71909104", "origen_lead_id": "%s", "tipo_lead_id": "marciano"}', null)$f$, v_web),
    '22023', 'no existe');
  if (select tipo_lead_id from public.leads where id = v_lead) is distinct from v_vip then raise exception 'el lead perdió su tipo'; end if;
  r := public.lead_guardar(v_lead, (select actualizado_en from public.leads where id = v_lead), '{"nombre": "Lead VIP 9j editado"}');
  if (select nombre from public.leads where id = v_lead) <> 'Lead VIP 9j editado' then raise exception 'no se pudo editar un lead con un tipo apagado'; end if;
  -- Pasarlo a otro tipo apagado, no; a uno que no está, no; a uno activo, sí.
  perform pg_temp.falla(format($f$select public.lead_guardar(%L, %L, '{"tipo_lead_id": "00000000-0000-4000-8000-00000000ffff"}')$f$, v_lead, (select actualizado_en from public.leads where id = v_lead)),
    '22023', 'ya no existe');
  reset role;
  -- El último recurso de la base: pasar un lead a un tipo apagado, aunque lo haga quien salta la RLS, no se guarda.
  begin
    update public.leads set tipo_lead_id = v_vip where id = (select id from public.leads where tipo_lead_id is distinct from v_vip limit 1);
    raise exception 'guardó un tipo desactivado';
  exception when others then
    if sqlstate <> '22023' or position('se desactivó' in sqlerrm) = 0 then raise exception 'el trigger: % (%)', sqlerrm, sqlstate; end if;
  end;
  -- En la papelera también cuenta (la FK es restrict).
  update public.leads set eliminado_en = now(), eliminado_por = '00000000-0000-0000-0000-000000000001' where id = v_lead;
  set local role authenticated;
  perform pg_temp.falla(format($f$select public.tipo_lead_eliminar(%L, %L)$f$, v_vip, (select actualizado_en from public.tipos_lead where id = v_vip)), '23503', 'ya tiene leads');
  reset role;
  delete from public.leads where id = v_lead;
  -- Sin leads, ahora sí.
  set local role authenticated;
  perform public.tipo_lead_eliminar(v_vip, (select actualizado_en from public.tipos_lead where id = v_vip));
  reset role;
  if exists (select 1 from public.tipos_lead where id = v_vip) then raise exception 'no se eliminó'; end if;
end $$;

-- El tipo por defecto: el primero activo de la clase prospecto por orden. Un lead sin tipo, de donde sea, lo recibe; ordenar lo cambia.
do $$
declare
  v_pro uuid := (select id from public.tipos_lead where clave = 'prospecto'); v_b uuid := gen_random_uuid(); v_l uuid := gen_random_uuid(); r jsonb;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  if public.lead_alta_contexto() ->> 'tipo_por_defecto_id' <> v_pro::text then raise exception 'el alta no propone el tipo por defecto'; end if;
  r := public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'Sin tipo 9j', 'telefono_principal', '71909105',
         'origen_lead_id', (select id from public.origenes_lead where clave = 'web')), null);
  if (select tipo_lead_id from public.leads where nombre = 'Sin tipo 9j') <> v_pro then raise exception 'un lead sin tipo no recibió el de por defecto'; end if;
  -- Un segundo tipo de la clase prospecto, puesto primero: pasa a ser el de por defecto.
  perform public.tipo_lead_crear(v_b, 'Prospecto B', 'prospecto');
  perform public.tipo_lead_mover(v_b, (select actualizado_en from public.tipos_lead where id = v_b), null);
  if public.lead_alta_contexto() ->> 'tipo_por_defecto_id' <> v_b::text then
    raise exception 'ordenar no cambió el tipo por defecto'; end if;
  reset role;
  -- Sin pasar por una RPC (como las pruebas y la semilla) también.
  insert into public.leads (id, nombre, telefono_principal) values (v_l, 'Sin tipo directo 9j', '71909106');
  if (select tipo_lead_id from public.leads where id = v_l) <> v_b then raise exception 'el insert sin tipo no recibió el de por defecto'; end if;
  delete from public.leads where nombre in ('Sin tipo 9j', 'Sin tipo directo 9j');
  set local role authenticated;
  perform public.tipo_lead_guardar(v_b, (select actualizado_en from public.tipos_lead where id = v_b), '{"activo": false}');
  if public.lead_alta_contexto() ->> 'tipo_por_defecto_id' <> v_pro::text then raise exception 'apagado «B», el de por defecto vuelve a «Prospecto»'; end if;
  perform public.tipo_lead_eliminar(v_b, (select actualizado_en from public.tipos_lead where id = v_b));
  reset role;
end $$;

-- El tope de 100: se dice con el máximo (que pone la base), no se pasa y eliminar uno deja crear otro.
do $$
declare v_n int := (select count(*) from public.tipos_lead); v_id uuid := gen_random_uuid(); r jsonb;
begin
  insert into public.tipos_lead (clave, nombre, clase, activo, orden)
  select 'relleno_' || g, 'Relleno ' || g, 'cliente', false, 500 + g from generate_series(1, 100 - v_n) g;
  if (select count(*) from public.tipos_lead) <> 100 then raise exception 'no quedaron 100'; end if;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  perform pg_temp.falla($f$select public.tipo_lead_crear(gen_random_uuid(), 'El ciento uno', 'cliente')$f$, '22023', 'máximo');
  r := public.tipo_lead_eliminar((select id from public.tipos_lead where clave = 'relleno_1'),
         (select actualizado_en from public.tipos_lead where clave = 'relleno_1'));
  r := public.tipo_lead_crear(v_id, 'El ciento', 'cliente');
  reset role;
  delete from public.tipos_lead where clave like 'relleno\_%' or id = v_id;
end $$;

-- Sin el permiso: nada de esto. Leer, sí (el alta, la ficha y los filtros lo necesitan); escribir directo, no.
do $$
declare v_t uuid := (select id from public.tipos_lead where clave = 'cliente'); v_ver timestamptz := (select actualizado_en from public.tipos_lead where clave = 'cliente');
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
  set local role authenticated;
  perform pg_temp.falla($f$select public.tipo_lead_crear(gen_random_uuid(), 'Intruso', 'cliente')$f$, '42501', 'leads.configurar');
  perform pg_temp.falla(format($f$select public.tipo_lead_guardar(%L, %L, '{"activo": false}')$f$, v_t, v_ver), '42501', 'leads.configurar');
  perform pg_temp.falla(format($f$select public.tipo_lead_mover(%L, %L, null)$f$, v_t, v_ver), '42501', 'leads.configurar');
  perform pg_temp.falla(format($f$select public.tipo_lead_eliminar(%L, %L)$f$, v_t, v_ver), '42501', 'leads.configurar');
  perform pg_temp.falla($f$select public.tipos_lead_con_uso()$f$, '42501', 'leads.configurar');
  perform pg_temp.falla($f$insert into public.tipos_lead (clave, nombre, clase) values ('directo', 'Directo', 'cliente')$f$, '42501', 'permission denied');
  perform pg_temp.falla(format($f$update public.tipos_lead set activo = false where id = %L$f$, v_t), '42501', 'permission denied');
  perform pg_temp.falla(format($f$delete from public.tipos_lead where id = %L$f$, v_t), '42501', 'permission denied');
  if (select count(*) from public.tipos_lead) = 0 then raise exception 'no lee los tipos'; end if;
  -- Los catálogos del listado, la ficha y la exportación: orígenes y tipos (también los apagados) en un solo pedido.
  if jsonb_array_length(public.leads_catalogos() -> 'tipos') <> (select count(*) from public.tipos_lead)
     or jsonb_array_length(public.leads_catalogos() -> 'origenes') <> (select count(*) from public.origenes_lead) then
    raise exception 'leads_catalogos no trae todo'; end if;
  if not exists (select 1 from jsonb_array_elements(public.leads_catalogos() -> 'tipos') x where x ->> 'clave' = 'cliente' and x ->> 'clase' = 'cliente' and (x ->> 'activo')::boolean) then
    raise exception 'leads_catalogos no dice la clase y el estado'; end if;
  reset role;
end $$;

-- La base queda como estaba: los dos tipos de fábrica, activos y en su orden.
do $$
begin
  delete from public.tipos_lead where clave not in ('prospecto', 'cliente');
  update public.tipos_lead set activo = true, orden = case clave when 'prospecto' then 10 else 20 end where clave in ('prospecto', 'cliente');
  if (select string_agg(clave || ':' || activo, ',' order by orden) from public.tipos_lead) <> 'prospecto:true,cliente:true' then
    raise exception 'los tipos no quedaron como estaban'; end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test topes que se dicen (cierre 1): las listas de vehículos que cortaban en silencio leen uno de más
-- Un vehículo con 120 interesados y 60 vínculos cerrados con un mismo lead: la pantalla corta en 100, 50 y 50 y dice que
-- hay más. Como la dueña, que ve todo.
do $$
declare v uuid := (select id from public.vehiculos where eliminado_en is null order by creado_en limit 1);
        duena constant uuid := '00000000-0000-0000-0000-000000000001'; lead uuid; n int;
begin
  if v is null then raise exception 'el terreno no tiene un vehículo'; end if;
  insert into public.leads (nombre, telefono_principal, creado_por)
  select 'Topes ' || g, (75500000 + g)::text, duena from generate_series(1, 120) g;
  insert into public.vehiculos_interesados (vehiculo_id, lead_id, usuario_id, nota)
  select v, l.id, duena, 'tope' from public.leads l where l.nombre like 'Topes %';
  lead := (select id from public.leads where nombre = 'Topes 1');
  insert into public.vehiculos_vinculos (vehiculo_id, lead_id, desde, hasta, usuario_id)
  select v, lead, now() - make_interval(days => 200 - g), now() - make_interval(days => 199 - g), duena from generate_series(1, 60) g;
  perform set_config('request.jwt.claim.sub', duena::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', duena, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.vehiculo_interesados(v);
  if n <> 101 then raise exception 'vehiculo_interesados trajo %, se esperaban 101 (100 y uno de más)', n; end if;
  select count(*) into n from public.vehiculo_vinculos(v);
  if n <> 51 then raise exception 'vehiculo_vinculos trajo %, se esperaban 51 (50 y uno de más)', n; end if;
  n := jsonb_array_length(public.lead_vehiculos(lead) -> 'historial');
  if n <> 51 then raise exception 'lead_vehiculos trajo % vínculos anteriores, se esperaban 51', n; end if;
  n := jsonb_array_length(public.vehiculos_para_lead(lead, null));
  if n <> least(21, (select count(*) from public.vehiculos where eliminado_en is null)) then
    raise exception 'vehiculos_para_lead trajo %, se esperaban hasta 21 (20 y uno de más)', n;
  end if;
  execute 'reset role';
  delete from public.vehiculos_vinculos where vehiculo_id = v and lead_id = lead and hasta is not null;
  delete from public.leads where nombre like 'Topes %';
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test storage-gc (cierre 1): el barrido de huérfanos sigue un cursor por bucket, vuelve a empezar al final y no se salta nada
reset role;
select set_config('request.jwt.claim.sub', '', false);
do $$ declare n int; begin
  delete from public.cola_gc_barrido;
  insert into storage.objects (bucket_id, name, created_at) values
    ('vehiculos', 'cursor/a.webp', now() - interval '3 days'),
    ('vehiculos', 'cursor/b.webp', now() - interval '3 days');
  -- Con el cursor después de los dos, esta pasada no los ve; la ventana no se llena, así que la vuelta termina y reinicia.
  insert into public.cola_gc_barrido (bucket, ultimo_nombre) values ('vehiculos', 'cursor/zzz');
  n := public.storage_gc_encolar_huerfanos('vehiculos', interval '1 day');
  if exists (select 1 from public.cola_gc_storage where ruta like 'cursor/%') then raise exception 'encoló lo que estaba antes del cursor'; end if;
  if (select ultimo_nombre from public.cola_gc_barrido where bucket = 'vehiculos') <> '' then raise exception 'al llegar al final la vuelta no reinició'; end if;
  -- La vuelta siguiente los encuentra.
  n := public.storage_gc_encolar_huerfanos('vehiculos', interval '1 day');
  if (select count(*) from public.cola_gc_storage where ruta like 'cursor/%') <> 2 then raise exception 'la vuelta siguiente no encoló los dos huérfanos'; end if;
  -- Repetirla no duplica.
  n := public.storage_gc_encolar_huerfanos('vehiculos', interval '1 day');
  if n <> 0 then raise exception 'volvió a encolar lo ya encolado: %', n; end if;
  delete from public.cola_gc_storage where ruta like 'cursor/%';
  delete from storage.objects where name like 'cursor/%';
  -- Nadie de la app lee ni escribe el cursor.
  if has_table_privilege('authenticated', 'public.cola_gc_barrido', 'select') or has_table_privilege('anon', 'public.cola_gc_barrido', 'select') then
    raise exception 'la app lee el cursor del barrido';
  end if;
end $$;

-- @test avatar chico (cierre 1): la miniatura es del avatar vigente, la vieja va a la cola y el relleno no pisa un cambio
reset role;
select set_config('request.jwt.claim.sub', '', false);
do $$
declare yo constant uuid := '00000000-0000-0000-0000-000000000001'; a text; m text; n int; v timestamptz;
begin
  a := yo || '/' || repeat('a', 64) || '.webp';
  m := yo || '/' || repeat('b', 64) || '.webp';
  delete from public.cola_gc_storage where bucket = 'avatares';
  update public.perfiles set avatar_ruta = a, avatar_miniatura_ruta = m where id = yo;
  if public.storage_refcount('avatares', m) <> 1 then raise exception 'storage_refcount no cuenta la miniatura'; end if;
  -- Otro avatar sin miniatura nueva: la del anterior se va (nula) y a la cola.
  update public.perfiles set avatar_ruta = yo || '/' || repeat('c', 64) || '.webp' where id = yo;
  if (select avatar_miniatura_ruta from public.perfiles where id = yo) is not null then raise exception 'la miniatura del avatar anterior quedó'; end if;
  if not exists (select 1 from public.cola_gc_storage where bucket = 'avatares' and ruta = m) then raise exception 'la miniatura vieja no se encoló'; end if;
  -- Volver a usarla la rescata de la cola.
  update public.perfiles set avatar_miniatura_ruta = m where id = yo;
  if exists (select 1 from public.cola_gc_storage where bucket = 'avatares' and ruta = m) then raise exception 'la miniatura en uso siguió en la cola'; end if;
  update public.perfiles set avatar_miniatura_ruta = null where id = yo;
  -- La carpeta es la persona.
  begin
    update public.perfiles set avatar_miniatura_ruta = '00000000-0000-0000-0000-000000000002/' || repeat('d', 64) || '.webp' where id = yo;
    raise exception 'aceptó una miniatura de otra carpeta';
  exception when sqlstate '22023' then null; end;
  -- El relleno: está pendiente; con el avatar viejo no guarda, con el vigente sí; un fallo lo saca de los pendientes.
  if not exists (select 1 from public.avatares_miniaturas_pendientes(100) p where p.usuario_id = yo) then raise exception 'no aparece entre los pendientes'; end if;
  if public.avatar_miniatura_guardar(yo, a, m) then raise exception 'guardó la miniatura de un avatar que ya cambió'; end if;
  -- En una sola transacción `now()` no cambia: se lleva la versión hacia atrás (sin el trigger que la sella) para ver si el
  -- relleno la mueve.
  alter table public.perfiles disable trigger trg_actualizado_en;
  update public.perfiles set actualizado_en = actualizado_en - interval '1 minute' where id = yo;
  alter table public.perfiles enable trigger trg_actualizado_en;
  v := (select actualizado_en from public.perfiles where id = yo);
  if not public.avatar_miniatura_guardar(yo, yo || '/' || repeat('c', 64) || '.webp', m) then raise exception 'no guardó la miniatura del avatar vigente'; end if;
  -- El relleno no es una edición: la versión del perfil no se mueve (si no, quien lo tiene abierto recibe un conflicto falso).
  if (select actualizado_en from public.perfiles where id = yo) <> v then raise exception 'guardar la miniatura movió la versión del perfil'; end if;
  if exists (select 1 from public.avatares_miniaturas_pendientes(100) p where p.usuario_id = yo) then raise exception 'con miniatura sigue pendiente'; end if;
  update public.perfiles set avatar_ruta = yo || '/' || repeat('e', 64) || '.webp' where id = yo;
  alter table public.perfiles disable trigger trg_actualizado_en;
  update public.perfiles set actualizado_en = actualizado_en - interval '1 minute' where id = yo;
  alter table public.perfiles enable trigger trg_actualizado_en;
  v := (select actualizado_en from public.perfiles where id = yo);
  if not public.avatar_miniatura_fallo(yo, yo || '/' || repeat('e', 64) || '.webp') then raise exception 'no anotó el fallo'; end if;
  if (select actualizado_en from public.perfiles where id = yo) <> v then raise exception 'anotar el fallo movió la versión del perfil'; end if;
  if exists (select 1 from public.avatares_miniaturas_pendientes(100) p where p.usuario_id = yo) then raise exception 'un fallo anotado se reintenta cada hora'; end if;
  -- Cambiar el avatar borra el fallo: la imagen nueva se intenta.
  update public.perfiles set avatar_ruta = a where id = yo;
  if not exists (select 1 from public.avatares_miniaturas_pendientes(100) p where p.usuario_id = yo) then raise exception 'un avatar nuevo no volvió a pendientes'; end if;
  update public.perfiles set avatar_ruta = null where id = yo;
  delete from public.cola_gc_storage where bucket = 'avatares';
  -- Nadie de la app llama al relleno ni lo dispara.
  if has_function_privilege('authenticated', 'public.avatares_miniaturas_pendientes(int)', 'execute')
     or has_function_privilege('authenticated', 'public.avatar_miniatura_guardar(uuid, text, text)', 'execute')
     or has_function_privilege('authenticated', 'public.avatares_miniaturas_disparar(text)', 'execute') then
    raise exception 'la app puede llamar al relleno de miniaturas';
  end if;
  begin perform public.avatares_miniaturas_disparar('http://otro.sitio/llevarse-el-pase'); raise exception 'mandó un pase a una dirección que no es la función';
  exception when sqlstate '22023' then null; end;
end $$;

-- @test fórmulas: sólo las lee quien tiene cotizaciones.configurar, de los orígenes que le tocan (policy «formulas: leer», …005900)
do $$
declare v_rol uuid := (select id from public.roles where clave = 'asesor'); v_sub uuid := (select id from public.origenes where clave = 'subasta_usa');
        v_total int; v_n int; v_otro int;
begin
  select count(*) into v_total from public.formulas;
  select count(*) into v_otro from public.formulas where origen_id <> v_sub;
  if v_otro = 0 then raise exception 'la prueba necesita una fórmula de otro origen'; end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
  set local role authenticated;
  select count(*) into v_n from public.formulas;
  if v_n <> 0 then raise exception 'la asesora lee % fórmulas sin cotizaciones.configurar', v_n; end if;
  reset role;

  -- Con el permiso de un solo origen: sólo las de ese origen.
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id) values (v_rol, 'cotizaciones.configurar', v_sub);
  set local role authenticated;
  select count(*) into v_n from public.formulas;
  if v_n = 0 or exists (select 1 from public.formulas where origen_id <> v_sub) then raise exception 'con un origen lee % fórmulas, y de otros orígenes', v_n; end if;
  reset role;
  delete from public.roles_permisos where rol_id = v_rol and permiso_clave = 'cotizaciones.configurar' and origen_id = v_sub;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  select count(*) into v_n from public.formulas;
  if v_n <> v_total then raise exception 'la dueña lee % de % fórmulas', v_n, v_total; end if;
  reset role;
end $$;
