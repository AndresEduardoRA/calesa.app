-- Triggers: actualizado_en, auditoría genérica, invariantes que una CHECK no puede expresar.

-- ---------------------------------------------------------------------------
-- actualizado_en en toda tabla que tenga la columna
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  for t in select c.table_name from information_schema.columns c
           where c.table_schema = 'public' and c.column_name = 'actualizado_en'
             and exists (select 1 from pg_class k join pg_namespace n on n.oid = k.relnamespace where n.nspname = 'public' and k.relname = c.table_name and k.relkind = 'r') loop
    execute format('drop trigger if exists trg_actualizado_en on public.%I', t);
    execute format('create trigger trg_actualizado_en before update on public.%I for each row execute function public.set_actualizado_en()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Auditoría genérica: antes/después en las tablas que importan
-- ---------------------------------------------------------------------------
create or replace function public.auditar()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_id text;
begin
  v_id := coalesce((to_jsonb(coalesce(new, old)) ->> 'id'), (to_jsonb(coalesce(new, old)) ->> 'usuario_id'));
  insert into public.actividad (accion, actor_id, tabla, registro_id, antes, despues)
  values (tg_table_name || '.' || lower(tg_op), (select auth.uid()), tg_table_name, v_id,
          case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) - 'clave_hash' - 'apibara_raw' end,
          case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) - 'clave_hash' - 'apibara_raw' end);
  return null;
end;
$$;
do $$
declare t text;
begin
  foreach t in array array['leads', 'vehiculos', 'cotizaciones', 'fases', 'fases_requisitos', 'fases_transiciones', 'roles_permisos', 'usuarios_roles', 'ajustes_empresa', 'ajustes_web', 'formulas', 'plantillas_tarjeta', 'documentos', 'pagos', 'gastos', 'transportes', 'declaraciones_aduana', 'accesos_portal', 'origenes', 'origenes_campos', 'tipos_cambio', 'integraciones', 'cola_web_asesores', 'repuestos_items', 'repuestos_compras', 'comprobantes'] loop
    execute format('drop trigger if exists trg_auditar on public.%I', t);
    execute format('create trigger trg_auditar after insert or update or delete on public.%I for each row execute function public.auditar()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- empresa
-- ---------------------------------------------------------------------------
create or replace function public.tipos_cambio_historial_trg()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.valor <> old.valor then
    insert into public.tipos_cambio_historial (tipo_cambio_id, valor_anterior, valor_nuevo, cambiado_por)
    values (new.id, case when tg_op = 'UPDATE' then old.valor end, new.valor, (select auth.uid()));
  end if;
  return null;
end;
$$;
create trigger trg_tipos_cambio_historial after insert or update on public.tipos_cambio for each row execute function public.tipos_cambio_historial_trg();

create or replace function public.tipos_cambio_sello()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.actualizado_por := (select auth.uid());
  return new;
end;
$$;
create trigger trg_tipos_cambio_sello before insert or update on public.tipos_cambio for each row execute function public.tipos_cambio_sello();

-- ---------------------------------------------------------------------------
-- orígenes: cada origen nace con su flujo y sus reglas por defecto
-- ---------------------------------------------------------------------------
create or replace function public.origen_crear_flujo()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_flujo uuid;
begin
  insert into public.flujos (ambito, origen_id, nombre) values ('vehiculos', new.id, 'Logística ' || new.nombre) returning id into v_flujo;
  insert into public.flujos_reglas (flujo_id, regla, activa)
  select v_flujo, r, true from unnest(array['logistica', 'alerta_demora', 'vitrina_web', 'portal_cliente', 'transporte', 'contenedor', 'gastos', 'pagos', 'esperas']) r;
  if new.tipo = 'subasta' then
    insert into public.flujos_reglas (flujo_id, regla, activa) values (v_flujo, 'aduana', true);
  end if;
  return new;
end;
$$;
create trigger trg_origen_crear_flujo after insert on public.origenes for each row execute function public.origen_crear_flujo();

-- Campos de la preconfiguración según el tipo del origen (se pueden editar; los de sistema no se borran).
create or replace function public.origen_preconfigurar_campos()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.tipo = 'subasta' then
    insert into public.origenes_campos (origen_id, clave, etiqueta, tipo, requerido, grupo, orden, en_tarjeta, filtrable, publico_web, clave_apibara, es_sistema) values
      (new.id, 'color', 'Color', 'texto', false, 'Vehículo', 10, true, true, true, 'color', true),
      (new.id, 'transmision', 'Transmisión', 'opcion', false, 'Vehículo', 20, true, true, true, 'transmission', true),
      (new.id, 'combustible', 'Combustible', 'opcion', false, 'Vehículo', 30, false, true, true, 'fuel_type', true),
      (new.id, 'motor', 'Motor', 'texto', false, 'Vehículo', 40, false, false, true, 'engine_type', true),
      (new.id, 'cilindros', 'Cilindros', 'numero', false, 'Vehículo', 50, false, true, true, 'cylinders', true),
      (new.id, 'traccion', 'Tracción', 'opcion', false, 'Vehículo', 60, false, true, true, 'drivetrain', true),
      (new.id, 'carroceria', 'Carrocería', 'opcion', false, 'Vehículo', 70, false, true, true, 'body_style', true),
      (new.id, 'tipo_vehiculo', 'Tipo', 'opcion', false, 'Vehículo', 80, false, true, true, 'vehicle_type', true),
      (new.id, 'codigo_titulo', 'Código de título', 'texto', false, 'Subasta', 90, true, true, true, 'title_code', true),
      (new.id, 'dano_principal', 'Daño principal', 'texto', false, 'Subasta', 100, true, true, true, 'primary_damage', true),
      (new.id, 'dano_secundario', 'Daño secundario', 'texto', false, 'Subasta', 110, false, true, true, 'secondary_damage', true),
      (new.id, 'enciende_y_anda', 'Enciende y anda', 'booleano', false, 'Subasta', 120, true, true, true, 'run_and_drive', true),
      (new.id, 'tiene_llave', 'Tiene llave', 'booleano', false, 'Subasta', 130, false, true, true, 'has_key', true),
      (new.id, 'valor_mercado', 'Valor de mercado (USD)', 'moneda', false, 'Subasta', 140, false, false, true, 'estimated_retail_value', true),
      (new.id, 'ubicacion', 'Ubicación', 'texto', false, 'Subasta', 150, true, true, true, 'location', true),
      (new.id, 'nota_subasta', 'Nota de la subasta', 'texto_largo', false, 'Subasta', 160, false, false, true, 'auction_note', true),
      (new.id, 'banderas_subasta', 'Banderas', 'multi_opcion', false, 'Subasta', 170, false, true, true, 'sale_flags', true);
  else
    insert into public.origenes_campos (origen_id, clave, etiqueta, tipo, requerido, grupo, orden, en_tarjeta, filtrable, publico_web, es_sistema) values
      (new.id, 'color', 'Color', 'texto', false, 'Vehículo', 10, true, true, true, true),
      (new.id, 'transmision', 'Transmisión', 'opcion', false, 'Vehículo', 20, true, true, true, true),
      (new.id, 'combustible', 'Combustible', 'opcion', false, 'Vehículo', 30, false, true, true, true),
      (new.id, 'motor', 'Motor', 'texto', false, 'Vehículo', 40, false, false, true, true),
      (new.id, 'traccion', 'Tracción', 'opcion', false, 'Vehículo', 50, false, true, true, true),
      (new.id, 'carroceria', 'Carrocería', 'opcion', false, 'Vehículo', 60, false, true, true, true),
      (new.id, 'condicion', 'Condición', 'opcion', false, 'Venta', 70, true, true, true, true),
      (new.id, 'descripcion', 'Descripción comercial', 'texto_largo', false, 'Venta', 80, false, false, true, true);
  end if;
  return new;
end;
$$;
create trigger trg_origen_preconfigurar_campos after insert on public.origenes for each row execute function public.origen_preconfigurar_campos();

-- ---------------------------------------------------------------------------
-- vehículos: atributos válidos contra el layout, máximo 24 imágenes, historial del vínculo
-- ---------------------------------------------------------------------------
create or replace function public.vehiculo_validar_atributos()
returns trigger language plpgsql security definer set search_path = '' as $$
declare c record; v jsonb;
begin
  if jsonb_typeof(new.atributos) <> 'object' then
    raise exception 'atributos debe ser un objeto JSON' using errcode = '22023';
  end if;
  for c in select clave, tipo, requerido, opciones from public.origenes_campos where origen_id = new.origen_id and activo loop
    v := new.atributos -> c.clave;
    if c.requerido and (v is null or v = 'null'::jsonb or (jsonb_typeof(v) = 'string' and v #>> '{}' = '')) then
      raise exception 'Falta el campo requerido «%»', c.clave using errcode = '23502';
    end if;
    if v is not null and v <> 'null'::jsonb then
      case c.tipo
        when 'numero', 'moneda' then if jsonb_typeof(v) <> 'number' then raise exception 'El campo «%» debe ser numérico', c.clave using errcode = '22023'; end if;
        when 'booleano' then if jsonb_typeof(v) <> 'boolean' then raise exception 'El campo «%» debe ser verdadero/falso', c.clave using errcode = '22023'; end if;
        when 'multi_opcion' then if jsonb_typeof(v) <> 'array' then raise exception 'El campo «%» debe ser una lista', c.clave using errcode = '22023'; end if;
        else if jsonb_typeof(v) not in ('string', 'number') then raise exception 'El campo «%» debe ser texto', c.clave using errcode = '22023'; end if;
      end case;
    end if;
  end loop;
  return new;
end;
$$;
create trigger trg_vehiculo_validar_atributos before insert or update of atributos, origen_id on public.vehiculos for each row execute function public.vehiculo_validar_atributos();

create or replace function public.vehiculo_imagenes_tope()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.vehiculos_imagenes where vehiculo_id = new.vehiculo_id) >= 24 then
    raise exception 'Un vehículo admite hasta 24 imágenes.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger trg_vehiculo_imagenes_tope before insert on public.vehiculos_imagenes for each row execute function public.vehiculo_imagenes_tope();

create or replace function public.vehiculo_vinculo_historial()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.lead_id is distinct from old.lead_id then
    update public.vehiculos_vinculos set hasta = now() where vehiculo_id = new.id and hasta is null;
    if new.lead_id is not null then
      insert into public.vehiculos_vinculos (vehiculo_id, lead_id, usuario_id) values (new.id, new.lead_id, (select auth.uid()));
    end if;
  elsif tg_op = 'INSERT' and new.lead_id is not null then
    insert into public.vehiculos_vinculos (vehiculo_id, lead_id, usuario_id) values (new.id, new.lead_id, (select auth.uid()));
  end if;
  return new;
end;
$$;
create trigger trg_vehiculo_vinculo_historial after insert or update of lead_id on public.vehiculos for each row execute function public.vehiculo_vinculo_historial();

-- ---------------------------------------------------------------------------
-- flujos: reglas apagadas no se marcan; requisitos justificables; una fase no cambia de flujo
-- ---------------------------------------------------------------------------
create or replace function public.flujo_regla_activa(p_flujo uuid, p_regla text)
returns boolean language sql stable set search_path = '' as $$
  select coalesce((select activa from public.flujos_reglas where flujo_id = p_flujo and regla = p_regla), false);
$$;

create or replace function public.fase_validar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.flujo_id <> old.flujo_id then
    raise exception 'Una fase no cambia de flujo.' using errcode = '23514';
  end if;
  if new.publica_web and not public.flujo_regla_activa(new.flujo_id, 'vitrina_web') then
    raise exception 'La vitrina web está apagada en este flujo.' using errcode = '23514';
  end if;
  if new.visible_portal and not public.flujo_regla_activa(new.flujo_id, 'portal_cliente') then
    raise exception 'El portal del cliente está apagado en este flujo.' using errcode = '23514';
  end if;
  if new.permite_aduana and not public.flujo_regla_activa(new.flujo_id, 'aduana') then
    raise exception 'La aduana está apagada en este flujo.' using errcode = '23514';
  end if;
  if new.es_logistica and not public.flujo_regla_activa(new.flujo_id, 'logistica') then
    raise exception 'La logística está apagada en este flujo.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger trg_fase_validar before insert or update on public.fases for each row execute function public.fase_validar();

create or replace function public.flujo_regla_apagar_validar()
returns trigger language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.activa and not new.activa) then
    select count(*) into n from public.fases f where f.flujo_id = old.flujo_id and (
      (old.regla = 'vitrina_web' and f.publica_web) or (old.regla = 'portal_cliente' and f.visible_portal)
      or (old.regla = 'aduana' and f.permite_aduana) or (old.regla = 'logistica' and f.es_logistica));
    if n > 0 then
      raise exception 'No se puede apagar «%»: % fase(s) la tienen marcada.', old.regla, n using errcode = '23514';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;
create trigger trg_flujo_regla_apagar_validar before update or delete on public.flujos_reglas for each row execute function public.flujo_regla_apagar_validar();

-- Claves de dato que el código sabe evaluar (ver _requisito_dato_cumplido en rpc_flujos).
create or replace function public.claves_dato_requisito(p_ambito public.ambito_flujo)
returns text[] language sql immutable set search_path = '' as $$
  select case p_ambito
    when 'vehiculos' then array['vehiculo.vin', 'vehiculo.lead', 'vehiculo.cotizacion_final', 'transporte.naviera', 'transporte.contenedor', 'transporte.booking', 'transporte.zarpe', 'transporte.eta', 'transporte.arribo', 'aduana.declaracion', 'aduana.canal', 'aduana.tributos_pagados', 'pagos.umbral_pct', 'pagos.confirmado']
    else array['repuesto.tracking', 'repuesto.precio', 'proyecto.pago_cliente', 'transporte.contenedor', 'transporte.arribo'] end;
$$;

create or replace function public.fase_requisito_validar()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_flujo uuid; v_ambito public.ambito_flujo; v_ambito_espera public.ambito_flujo; v_formatos text[];
begin
  select f.flujo_id, fl.ambito into v_flujo, v_ambito from public.fases f join public.flujos fl on fl.id = f.flujo_id where f.id = new.fase_id;
  if new.tipo = 'dato' and not (new.clave_dato = any (public.claves_dato_requisito(v_ambito))) then
    raise exception 'Clave de dato desconocida para este flujo: %', new.clave_dato using errcode = '22023';
  end if;
  if new.tipo = 'dato' and new.clave_dato = 'pagos.umbral_pct' and coalesce((new.config ->> 'pct')::numeric, -1) not between 0 and 100 then
    raise exception 'pagos.umbral_pct necesita config.pct entre 0 y 100' using errcode = '22023';
  end if;
  if new.tipo = 'documento' then
    select formatos into v_formatos from public.tipos_documento where id = new.tipo_documento_id;
    if new.formatos is not null and not (new.formatos <@ v_formatos) then
      raise exception 'Los formatos del requisito deben estar entre los del tipo de documento.' using errcode = '22023';
    end if;
    if exists (select 1 from public.tipos_documento td where td.id = new.tipo_documento_id and td.flujo_id is not null and td.flujo_id <> v_flujo) then
      raise exception 'El tipo de documento pertenece a otro flujo.' using errcode = '22023';
    end if;
  end if;
  if new.tipo = 'espera' then
    if not public.flujo_regla_activa(v_flujo, 'esperas') then raise exception 'Las esperas están apagadas en este flujo.' using errcode = '23514'; end if;
    select fl.ambito into v_ambito_espera from public.fases f join public.flujos fl on fl.id = f.flujo_id where f.id = new.espera_fase_id;
    if v_ambito_espera = v_ambito then raise exception 'Una espera apunta a una fase de OTRO flujo (vehículos ↔ repuestos).' using errcode = '22023'; end if;
    if (v_ambito = 'vehiculos' and new.espera_ambito <> 'hijos') or (v_ambito = 'repuestos' and new.espera_ambito <> 'padre') then
      raise exception 'Un vehículo espera a sus hijos (repuestos); un repuesto espera a su padre (vehículo).' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;
create trigger trg_fase_requisito_validar before insert or update on public.fases_requisitos for each row execute function public.fase_requisito_validar();

-- ---------------------------------------------------------------------------
-- leads: creador = dueño en cartera; ultimo_seguimiento_en denormalizado
-- ---------------------------------------------------------------------------
create or replace function public.lead_crear_dueno()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.creado_por is not null then
    insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso) values (new.id, new.creado_por, 'dueno') on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger trg_lead_crear_dueno after insert on public.leads for each row execute function public.lead_crear_dueno();

create or replace function public.seguimiento_actualizar_lead()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.leads set ultimo_seguimiento_en = (select max(ocurrido_en) from public.seguimientos s where s.lead_id = coalesce(new.lead_id, old.lead_id) and s.eliminado_en is null)
  where id = coalesce(new.lead_id, old.lead_id);
  return null;
end;
$$;
create trigger trg_seguimiento_actualizar_lead after insert or update or delete on public.seguimientos for each row execute function public.seguimiento_actualizar_lead();

create or replace function public.oportunidad_historial()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_etapa record;
begin
  if tg_op = 'INSERT' or new.etapa_id <> old.etapa_id then
    select es_ganada, es_perdida into v_etapa from public.embudos_etapas where id = new.etapa_id;
    insert into public.oportunidades_historial (oportunidad_id, de_etapa_id, a_etapa_id, usuario_id)
    values (new.id, case when tg_op = 'UPDATE' then old.etapa_id end, new.etapa_id, (select auth.uid()));
    update public.oportunidades set estado = case when v_etapa.es_ganada then 'ganada' when v_etapa.es_perdida then 'perdida' else 'abierta' end::public.estado_oportunidad,
      ultima_actividad_en = now() where id = new.id;
  end if;
  return null;
end;
$$;
create trigger trg_oportunidad_historial after insert or update of etapa_id on public.oportunidades for each row execute function public.oportunidad_historial();

-- ---------------------------------------------------------------------------
-- cotizaciones: fórmula publicada al crear, revisiones con diff, contadores
-- ---------------------------------------------------------------------------
create or replace function public.cotizacion_validar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and not exists (select 1 from public.formulas f where f.id = new.formula_id and f.origen_id = new.origen_id and f.estado = 'publicada') then
    raise exception 'La cotización debe nacer de la fórmula PUBLICADA de su origen.' using errcode = '23514';
  end if;
  if new.clase = 'final' and new.vehiculo_id is null then
    raise exception 'Una cotización final exige un vehículo vinculado.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger trg_cotizacion_validar before insert or update on public.cotizaciones for each row execute function public.cotizacion_validar();

create or replace function public.cotizacion_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
declare d jsonb := '{}'::jsonb; k text; a jsonb := to_jsonb(old); b jsonb := to_jsonb(new);
begin
  for k in select jsonb_object_keys(b) loop
    if k not in ('actualizado_en', 'reportes_count', 'favoritos_count') and a -> k is distinct from b -> k then
      d := d || jsonb_build_object(k, jsonb_build_object('de', a -> k, 'a', b -> k));
    end if;
  end loop;
  if d <> '{}'::jsonb then
    insert into public.cotizaciones_revisiones (cotizacion_id, usuario_id, diff) values (new.id, (select auth.uid()), d);
  end if;
  return null;
end;
$$;
create trigger trg_cotizacion_revision after update on public.cotizaciones for each row execute function public.cotizacion_revision();

create or replace function public.cotizacion_contadores()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'cotizaciones_reportes' then
    update public.cotizaciones set reportes_count = (select count(*) from public.cotizaciones_reportes r where r.cotizacion_id = coalesce(new.cotizacion_id, old.cotizacion_id)) where id = coalesce(new.cotizacion_id, old.cotizacion_id);
  else
    update public.cotizaciones set favoritos_count = (select count(*) from public.cotizaciones_favoritos r where r.cotizacion_id = coalesce(new.cotizacion_id, old.cotizacion_id)) where id = coalesce(new.cotizacion_id, old.cotizacion_id);
  end if;
  return null;
end;
$$;
create trigger trg_cotizacion_reportes_count after insert or delete on public.cotizaciones_reportes for each row execute function public.cotizacion_contadores();
create trigger trg_cotizacion_favoritos_count after insert or delete on public.cotizaciones_favoritos for each row execute function public.cotizacion_contadores();

-- ---------------------------------------------------------------------------
-- logística: sellos de quién sube/revisa; un documento aprobado vencido no cuenta (lo evalúa la RPC)
-- ---------------------------------------------------------------------------
create or replace function public.documento_sellos()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.subido_por := (select auth.uid());
    if new.estado = 'aprobado' then new.estado := 'subido'; end if;   -- nadie nace aprobado
  elsif new.estado is distinct from old.estado and new.estado in ('aprobado', 'rechazado') then
    new.revisado_por := (select auth.uid()); new.revisado_en := now();
    if new.estado = 'rechazado' and coalesce(new.motivo_rechazo, '') = '' then
      raise exception 'Rechazar pide motivo.' using errcode = '23514';
    end if;
  end if;
  if new.visible_portal and not exists (select 1 from public.tipos_documento td where td.id = new.tipo_documento_id and td.visible_portal_permitido) then
    raise exception 'Este tipo de documento no puede mostrarse en el portal.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger trg_documento_sellos before insert or update on public.documentos for each row execute function public.documento_sellos();

create or replace function public.pago_sellos()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then new.creado_por := (select auth.uid()); end if;
  return new;
end;
$$;
create trigger trg_pago_sellos before insert on public.pagos for each row execute function public.pago_sellos();

-- ---------------------------------------------------------------------------
-- agenda: quien recibe una tarea tiene que poder recibirla
-- ---------------------------------------------------------------------------
create or replace function public.usuario_tiene_permiso(p_usuario uuid, p_clave text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.usuarios_roles ur join public.roles_permisos rp on rp.rol_id = ur.rol_id where ur.usuario_id = p_usuario and rp.permiso_clave = p_clave);
$$;
revoke all on function public.usuario_tiene_permiso(uuid, text) from public, anon;
grant execute on function public.usuario_tiene_permiso(uuid, text) to authenticated;

create or replace function public.tarea_validar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.responsable_id <> (select auth.uid()) and not public.usuario_tiene_permiso(new.responsable_id, 'agenda.tareas.recibir') then
    raise exception 'Esa persona no puede recibir tareas.' using errcode = '23514';
  end if;
  if new.estado = 'completado' and new.completada_en is null then new.completada_en := now(); end if;
  return new;
end;
$$;
create trigger trg_tarea_validar before insert on public.tareas for each row execute function public.tarea_validar();

-- ---------------------------------------------------------------------------
-- web: publicar una guía exige web.guias.publicar
-- ---------------------------------------------------------------------------
create or replace function public.web_guia_publicar_validar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (tg_op = 'INSERT' and new.publicada_en is not null) or (tg_op = 'UPDATE' and new.publicada_en is distinct from old.publicada_en) then
    if not public.tiene_permiso('web.guias.publicar') then
      raise exception 'Publicar o despublicar una guía exige web.guias.publicar.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger trg_web_guia_publicar_validar before insert or update on public.web_guias for each row execute function public.web_guia_publicar_validar();

-- Cada asesor publicable entra a la rueda al nacer su perfil.
create or replace function public.perfil_cola_web()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.cola_web_asesores (usuario_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
create trigger trg_perfil_cola_web after insert on public.perfiles for each row execute function public.perfil_cola_web();

-- ---------------------------------------------------------------------------
-- chat: sólo el autor edita el cuerpo; «editado» se sella solo
-- ---------------------------------------------------------------------------
create or replace function public.mensaje_editar_validar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.cuerpo is distinct from old.cuerpo then
    if old.autor_id <> (select auth.uid()) then raise exception 'Sólo el autor edita un mensaje.' using errcode = '42501'; end if;
    new.editado_en := now();
  end if;
  return new;
end;
$$;
create trigger trg_mensaje_editar_validar before update on public.mensajes for each row execute function public.mensaje_editar_validar();
