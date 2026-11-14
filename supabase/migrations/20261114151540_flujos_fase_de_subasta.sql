-- La fase de subasta: `fases.es_subasta` dice qué fase de un flujo es la subasta («Es la subasta» en Datos de la fase). Mientras un vehículo
-- está en ella (o sin fase en un origen cuyo flujo tiene una), su situación depende de la subasta: «En subasta» o «Sin resolver». Sólo vale
-- en el flujo de un origen de tipo subasta (23514) y nunca en la fase final (22023). Puede haber varias.
-- «Revisar» avisa `sin_fase_de_subasta` cuando el flujo de un origen de subasta no tiene ninguna.
-- Datos: marca la candidata única de cada flujo de subasta (inicial, activa, fuera de logística y con «subasta» en el nombre); si no hay
-- exactamente una, no marca nada y lo pide «Revisar».
-- Pruebas: supabase/tests/areas/flujos/fases-subasta.sql y supabase/tests/flujos-revisar.sql.

alter table public.fases add column es_subasta boolean not null default false;

comment on column public.fases.es_subasta is 'Es la subasta del flujo: dentro de ella (o sin fase en un origen cuyo flujo tiene alguna), la situación del vehículo es «En subasta» o «Sin resolver» según su subasta. Sólo en el flujo de un origen de tipo subasta; nunca con es_final.';

create or replace function public._fase_forma(p_datos jsonb, p_vacio_vale boolean) returns void
    language plpgsql immutable
    set search_path = ''
    as $_$
declare
  v_clave text;
  v_tipo text;
  v_valor jsonb;
  v_booleanos constant text[] := array['es_inicial', 'es_final', 'es_logistica', 'nota_obligatoria', 'permite_contenedor', 'permite_aduana',
    'cuenta_llegada_repuestos', 'publica_web', 'visible_portal', 'es_subasta'];
  v_enteros constant text[] := array['demora_dias', 'alerta_cada_horas'];
  v_textos_obligatorios constant text[] := array['nombre', 'color'];
  v_textos constant text[] := array['descripcion', 'icono', 'alias_portal', 'descripcion_portal'];
  v_bien boolean;
begin
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' then
    raise exception 'Faltan los datos de la fase.' using errcode = '22023';
  end if;
  if not p_vacio_vale and p_datos = '{}'::jsonb then
    raise exception 'No hay cambios para guardar.' using errcode = '22023';
  end if;
  for v_clave, v_valor in select key, value from jsonb_each(p_datos) loop
    v_tipo := jsonb_typeof(v_valor);
    if v_clave = any (v_booleanos) then
      v_bien := v_tipo = 'boolean';
    elsif v_clave = any (v_enteros) then
      v_bien := v_tipo = 'null'
        or (v_tipo = 'number' and (v_valor #>> '{}') ~ '^-?[0-9]+$'
            and (v_valor #>> '{}')::numeric between -2147483648 and 2147483647);
    elsif v_clave = any (v_textos_obligatorios) then
      v_bien := v_tipo = 'string';
    elsif v_clave = any (v_textos) then
      v_bien := v_tipo in ('string', 'null');
    else
      raise exception 'El dato «%» no se cambia desde una fase.', v_clave using errcode = '22023', hint = v_clave;
    end if;
    if not v_bien then
      raise exception 'El dato «%» no tiene el formato esperado.', v_clave using errcode = '22023', hint = v_clave;
    end if;
  end loop;
end $_$;

revoke all on function public._fase_forma(jsonb, boolean) from public, anon, authenticated;
grant execute on function public._fase_forma(jsonb, boolean) to service_role;

-- ¿El flujo es el de un origen de tipo subasta? (repuestos no tiene origen: no).
create or replace function public._flujo_de_subasta(p_flujo uuid) returns boolean
    language sql stable security definer
    set search_path = ''
    as $$
  select exists (
    select 1 from public.flujos fl join public.origenes o on o.id = fl.origen_id
    where fl.id = p_flujo and fl.ambito = 'vehiculos' and o.tipo = 'subasta');
$$;

revoke all on function public._flujo_de_subasta(uuid) from public, anon, authenticated;
grant execute on function public._flujo_de_subasta(uuid) to service_role;

comment on function public._flujo_de_subasta(uuid) is 'Verdadero si el flujo es el de un origen de tipo subasta (el tipo de un origen no cambia). Lo usan _fase_validar, fase_validar y revisar_flujo para es_subasta.';

create or replace function public._fase_validar(p_fila public.fases, p_claves text[]) returns void
    language plpgsql stable
    set search_path = ''
    as $_$
begin
  if coalesce(p_fila.nombre, '') = '' then
    raise exception 'La fase necesita un nombre.' using errcode = '22023', hint = 'nombre';
  end if;
  if 'nombre' = any (p_claves) and char_length(p_fila.nombre) > 60 then
    raise exception 'El nombre de la fase tiene hasta 60 caracteres.' using errcode = '22023', hint = 'nombre';
  end if;
  if 'descripcion' = any (p_claves) and char_length(p_fila.descripcion) > 500 then
    raise exception 'La descripción tiene hasta 500 caracteres.' using errcode = '22023', hint = 'descripcion';
  end if;
  if 'descripcion_portal' = any (p_claves) and char_length(p_fila.descripcion_portal) > 500 then
    raise exception 'La descripción tiene hasta 500 caracteres.' using errcode = '22023', hint = 'descripcion_portal';
  end if;
  if 'alias_portal' = any (p_claves) and char_length(p_fila.alias_portal) > 60 then
    raise exception 'El nombre para el cliente tiene hasta 60 caracteres.' using errcode = '22023', hint = 'alias_portal';
  end if;
  if p_fila.color is null or p_fila.color !~ '^#[0-9a-fA-F]{6}$' then
    raise exception 'El color va como #rrggbb.' using errcode = '22023', hint = 'color';
  end if;
  if 'icono' = any (p_claves) and p_fila.icono !~ '^[a-z0-9-]{1,40}$' then
    raise exception 'El ícono no tiene el formato esperado.' using errcode = '22023', hint = 'icono';
  end if;
  if p_fila.demora_dias < 0 then
    raise exception 'La demora va en días enteros, desde 0.' using errcode = '22023', hint = 'demora_dias';
  end if;
  if p_fila.alerta_cada_horas not between 1 and 720 then
    raise exception 'La alerta se repite cada 1 a 720 horas.' using errcode = '22023', hint = 'alerta_cada_horas';
  end if;
  if p_fila.es_inicial and p_fila.es_final then
    raise exception 'Una fase no puede ser inicial y final a la vez.' using errcode = '22023', hint = 'es_final';
  end if;
  if p_fila.es_subasta and p_fila.es_final then
    raise exception 'La subasta no puede ser la fase final.' using errcode = '22023', hint = 'es_subasta';
  end if;
  if p_fila.visible_portal and p_fila.alias_portal is null then
    raise exception 'Para mostrarla en el portal escribe su nombre para el cliente.' using errcode = '22023', hint = 'alias_portal';
  end if;
  if p_fila.publica_web and not public.flujo_regla_activa(p_fila.flujo_id, 'vitrina_web') then
    raise exception 'La vitrina web está apagada en este flujo.' using errcode = '23514', hint = 'publica_web';
  end if;
  if p_fila.visible_portal and not public.flujo_regla_activa(p_fila.flujo_id, 'portal_cliente') then
    raise exception 'El portal del cliente está apagado en este flujo.' using errcode = '23514', hint = 'visible_portal';
  end if;
  if p_fila.permite_aduana and not public.flujo_regla_activa(p_fila.flujo_id, 'aduana') then
    raise exception 'La aduana está apagada en este flujo.' using errcode = '23514', hint = 'permite_aduana';
  end if;
  if p_fila.es_logistica and not public.flujo_regla_activa(p_fila.flujo_id, 'logistica') then
    raise exception 'La logística está apagada en este flujo.' using errcode = '23514', hint = 'es_logistica';
  end if;
  if p_fila.es_subasta and not public._flujo_de_subasta(p_fila.flujo_id) then
    raise exception 'Sólo una fase del flujo de un origen de subasta puede ser la subasta.' using errcode = '23514', hint = 'es_subasta';
  end if;
end $_$;

revoke all on function public._fase_validar(public.fases, text[]) from public, anon, authenticated;
grant execute on function public._fase_validar(public.fases, text[]) to service_role;

create or replace function public.fase_validar() returns trigger
    language plpgsql security definer
    set search_path = ''
    as $$
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
  if new.es_subasta and not public._flujo_de_subasta(new.flujo_id) then
    raise exception 'Sólo una fase del flujo de un origen de subasta puede ser la subasta.' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.fase_validar() from public, anon, authenticated;
grant execute on function public.fase_validar() to service_role;

create or replace function public.fase_crear(p_id uuid, p_flujo uuid, p_actualizado_en_esperado timestamp with time zone, p_datos jsonb) returns timestamp with time zone
    language plpgsql security definer
    set search_path = ''
    as $$
declare
  v public.fases;
  v_restriccion text;
begin
  if p_id is null then
    raise exception 'Falta el id de la fase.' using errcode = '22023', hint = 'id';
  end if;
  perform public._fase_forma(p_datos, true);
  perform public._flujo_para_editar(p_flujo, p_actualizado_en_esperado);

  v.id := p_id;
  v.flujo_id := p_flujo;
  v.color := '#717c93';
  v.orden := (select coalesce(max(f.orden), 0) + 10 from public.fases f where f.flujo_id = p_flujo);
  v.es_inicial := false;
  v.es_final := false;
  v.activa := true;
  v.es_logistica := public.flujo_regla_activa(p_flujo, 'logistica');
  v.nota_obligatoria := false;
  v.permite_contenedor := true;
  v.permite_aduana := false;
  v.cuenta_llegada_repuestos := false;
  v.publica_web := false;
  v.visible_portal := false;
  v.es_subasta := false;
  v.creado_en := now();
  v.actualizado_en := now();
  v := public._fase_aplicar(v, p_datos);
  perform public._fase_validar(v, array(select jsonb_object_keys(p_datos)));

  begin
    insert into public.fases select (v).*;
  exception when unique_violation then
    get stacked diagnostics v_restriccion = constraint_name;
    perform public._fase_unico(v_restriccion, v.nombre);
    raise;
  end;
  return public._flujo_tocar(p_flujo);
end $$;

revoke all on function public.fase_crear(uuid, uuid, timestamp with time zone, jsonb) from public, anon;
grant execute on function public.fase_crear(uuid, uuid, timestamp with time zone, jsonb) to authenticated, service_role;

create or replace function public.fase_guardar(p_fase uuid, p_actualizado_en_esperado timestamp with time zone, p_cambios jsonb) returns timestamp with time zone
    language plpgsql security definer
    set search_path = ''
    as $$
declare
  v public.fases;
  v_antes public.fases;
  v_flujo uuid;
  v_restriccion text;
begin
  perform public._fase_forma(p_cambios, false);
  select flujo_id into v_flujo from public.fases where id = p_fase;
  if v_flujo is null then
    raise exception 'Esta fase ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  perform public._flujo_para_editar(v_flujo, p_actualizado_en_esperado);
  select * into v from public.fases where id = p_fase for no key update;
  if not found then
    raise exception 'Esta fase ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  v_antes := v;

  v := public._fase_aplicar(v, p_cambios);
  perform public._fase_validar(v, array(select jsonb_object_keys(p_cambios)));

  begin
    -- `nombre` (con `flujo_id`, la clave de `fases_flujo_id_nombre_key`) va al update sólo si cambia: asignarlo, aun igual, toma el candado de
    -- clave de la fila y frena el key share de `vehiculos.fase_id` (medido). Renombrar sí espera a quien mueve un vehículo a esa fase.
    if v.nombre is distinct from v_antes.nombre then
      update public.fases f set
        nombre = v.nombre, descripcion = v.descripcion, color = v.color, icono = v.icono, es_inicial = v.es_inicial, es_final = v.es_final,
        es_logistica = v.es_logistica, demora_dias = v.demora_dias, alerta_cada_horas = v.alerta_cada_horas, nota_obligatoria = v.nota_obligatoria,
        permite_contenedor = v.permite_contenedor, permite_aduana = v.permite_aduana, cuenta_llegada_repuestos = v.cuenta_llegada_repuestos,
        publica_web = v.publica_web, visible_portal = v.visible_portal, alias_portal = v.alias_portal, descripcion_portal = v.descripcion_portal,
        es_subasta = v.es_subasta
      where f.id = p_fase;
    else
      update public.fases f set
        descripcion = v.descripcion, color = v.color, icono = v.icono, es_inicial = v.es_inicial, es_final = v.es_final,
        es_logistica = v.es_logistica, demora_dias = v.demora_dias, alerta_cada_horas = v.alerta_cada_horas, nota_obligatoria = v.nota_obligatoria,
        permite_contenedor = v.permite_contenedor, permite_aduana = v.permite_aduana, cuenta_llegada_repuestos = v.cuenta_llegada_repuestos,
        publica_web = v.publica_web, visible_portal = v.visible_portal, alias_portal = v.alias_portal, descripcion_portal = v.descripcion_portal,
        es_subasta = v.es_subasta
      where f.id = p_fase;
    end if;
  exception when unique_violation then
    get stacked diagnostics v_restriccion = constraint_name;
    perform public._fase_unico(v_restriccion, v.nombre);
    raise;
  end;
  return public._flujo_tocar(v_flujo);
end $$;

revoke all on function public.fase_guardar(uuid, timestamp with time zone, jsonb) from public, anon;
grant execute on function public.fase_guardar(uuid, timestamp with time zone, jsonb) to authenticated, service_role;

create or replace function public.revisar_flujo(p_flujo uuid) returns table(nivel text, codigo text, mensaje text, fase_id uuid)
    language plpgsql stable security definer
    set search_path = ''
    as $$
#variable_conflict use_column
declare
  v_ambito public.ambito_flujo;
  v_iniciales uuid[];
  v_inicial public.fases;
  v_motivos text[] := array[]::text[];
begin
  if p_flujo is null or not public.puede_configurar_flujo(p_flujo) then
    return;
  end if;

  return query
  with f as (select * from public.fases fa where fa.flujo_id = p_flujo and fa.activa)
  select 'error', 'sin_inicial', 'El flujo no tiene ninguna fase inicial activa.', null::uuid where not exists (select 1 from f where f.es_inicial)
  union all
  select 'aviso', 'sin_salida', 'La fase «' || f.nombre || '» no tiene salida y no es final.', f.id from f where not f.es_final and not exists (select 1 from public.fases_transiciones t where t.de_fase_id = f.id)
  union all
  select 'aviso', 'inalcanzable', 'La fase «' || f.nombre || '» no es inicial y nadie llega a ella.', f.id from f where not f.es_inicial and not exists (select 1 from public.fases_transiciones t where t.a_fase_id = f.id)
  union all
  select 'aviso', 'orden_duplicado', 'Dos fases comparten el orden ' || f.orden || '.', (array_agg(f.id order by f.nombre))[1] from f group by f.orden having count(*) > 1
  union all
  select 'aviso', 'contenedor_inalcanzable', 'La fase «' || f.nombre || '» exige contenedor pero ninguna fase del flujo permite asignarlo.', f.id
    from f where exists (select 1 from public.fases_requisitos q where q.fase_id = f.id and q.clave_dato = 'transporte.contenedor') and not exists (select 1 from f f2 where f2.permite_contenedor)
  union all
  select 'aviso', 'espera_jubilada', 'La fase «' || f.nombre || '» espera a una fase jubilada.', f.id
    from f where exists (select 1 from public.fases_requisitos q join public.fases e on e.id = q.espera_fase_id where q.fase_id = f.id and not e.activa)
  union all
  select 'aviso', 'espera_cruzada', 'Esperas cruzadas: «' || f.nombre || '» y la fase que espera se esperan mutuamente.', f.id
    from f where exists (
      select 1 from public.fases_requisitos a join public.fases_requisitos b on b.fase_id = a.espera_fase_id
      where a.fase_id = f.id and a.tipo = 'espera' and b.tipo = 'espera' and b.espera_fase_id = f.id)
  union all
  select 'info', 'sin_bloqueantes', 'La fase «' || f.nombre || '» sólo tiene requisitos informativos.', f.id
    from f where exists (select 1 from public.fases_requisitos q where q.fase_id = f.id) and not exists (select 1 from public.fases_requisitos q where q.fase_id = f.id and q.bloqueante)
  union all
  -- C3: la lista de la fase, aunque cada entrada traiga la suya (no replica la precedencia de `_puede_mover`).
  select 'aviso', 'rol_sin_personas', 'Sólo pueden mover a «' || f.nombre || '» roles que nadie tiene.', f.id
    from f where exists (select 1 from public.fases_roles fr where fr.fase_id = f.id)
      and not exists (
        select 1 from public.fases_roles fr
          join public.usuarios_roles ur on ur.rol_id = fr.rol_id
          join public.perfiles p on p.id = ur.usuario_id
        where fr.fase_id = f.id and p.activo and not p.bloqueado)
  union all
  -- C4
  select 'aviso', 'rol_sin_personas', 'Sólo pueden usar la salida de «' || d.nombre || '» a «' || h.nombre || '» roles que nadie tiene.', d.id
    from public.fases_transiciones t join f d on d.id = t.de_fase_id join f h on h.id = t.a_fase_id
    where exists (select 1 from public.fases_transiciones_roles tr where tr.transicion_id = t.id)
      and not exists (
        select 1 from public.fases_transiciones_roles tr
          join public.usuarios_roles ur on ur.rol_id = tr.rol_id
          join public.perfiles p on p.id = ur.usuario_id
        where tr.transicion_id = t.id and p.activo and not p.bloqueado)
  union all
  -- C6
  select 'aviso', 'tipo_documento_inactivo', 'La fase «' || f.nombre || '» pide «' || td.nombre || '», que está desactivado.', f.id
    from f join public.fases_requisitos q on q.fase_id = f.id join public.tipos_documento td on td.id = q.tipo_documento_id
    where not td.activo
  union all
  -- C7
  select 'aviso', 'salida_a_jubilada', 'La fase «' || d.nombre || '» tiene una salida a «' || h.nombre || '», que está jubilada.', d.id
    from public.fases_transiciones t join f d on d.id = t.de_fase_id join public.fases h on h.id = t.a_fase_id
    where not h.activa and h.flujo_id = p_flujo
  union all
  -- C8: la fase de subasta de un origen de subasta (activa o jubilada, como la mira la situación del vehículo).
  select 'aviso', 'sin_fase_de_subasta',
    'Ninguna fase está marcada como la subasta: un vehículo con la subasta terminada nunca figura «Sin resolver».', null::uuid
    where public._flujo_de_subasta(p_flujo)
      and not exists (select 1 from public.fases fa where fa.flujo_id = p_flujo and fa.es_subasta);

  -- C5: espejo de `_vehiculo_fase_de_entrada()`, que sólo existe para vehículos.
  select fl.ambito into v_ambito from public.flujos fl where fl.id = p_flujo;
  if v_ambito is distinct from 'vehiculos' then
    return;
  end if;
  select array_agg(fa.id) into v_iniciales from public.fases fa where fa.flujo_id = p_flujo and fa.es_inicial and fa.activa;
  if coalesce(cardinality(v_iniciales), 0) > 1 then
    return query select 'info', 'entrada_no_automatica', 'Hay más de una fase inicial: los vehículos nuevos nacen «Sin fase».', null::uuid;
    return;
  end if;
  if coalesce(cardinality(v_iniciales), 0) = 0 then
    return;
  end if;
  select * into v_inicial from public.fases fa where fa.id = v_iniciales[1];
  if v_inicial.nota_obligatoria then
    v_motivos := array_append(v_motivos, 'una nota');
  end if;
  if exists (select 1 from public.fases_requisitos q where q.fase_id = v_inicial.id and q.bloqueante) then
    v_motivos := array_append(v_motivos, 'requisitos bloqueantes');
  end if;
  if exists (select 1 from public.fases_roles fr where fr.fase_id = v_inicial.id) then
    v_motivos := array_append(v_motivos, 'un rol');
  end if;
  if cardinality(v_motivos) > 0 then
    return query select 'info', 'entrada_no_automatica',
      'Los vehículos nuevos pueden nacer «Sin fase»: la fase inicial «' || v_inicial.nombre || '» pide '
        || case cardinality(v_motivos)
             when 1 then v_motivos[1]
             when 2 then v_motivos[1] || ' y ' || v_motivos[2]
             else v_motivos[1] || ', ' || v_motivos[2] || ' y ' || v_motivos[3]
           end || '.',
      v_inicial.id;
  end if;
end;
$$;

revoke all on function public.revisar_flujo(uuid) from public, anon;
grant execute on function public.revisar_flujo(uuid) to authenticated, service_role;

comment on function public.revisar_flujo(uuid) is 'Revisa la coherencia de un flujo (5.12). Sólo responde a quien lo configura (puede_configurar_flujo); a los demás, cero filas sin error. Códigos: error sin_inicial; aviso sin_salida, inalcanzable, orden_duplicado, contenedor_inalcanzable, espera_jubilada, espera_cruzada, rol_sin_personas, tipo_documento_inactivo, salida_a_jubilada, sin_fase_de_subasta; info sin_bloqueantes, entrada_no_automatica. Avisa, nunca impide guardar.';

-- Datos: en cada flujo de un origen de subasta, la candidata única (inicial, activa, fuera de logística y con «subasta» en el nombre) pasa
-- a ser la subasta. Con cero o varias candidatas no se marca nada: «Revisar» lo pide con `sin_fase_de_subasta`.
update public.fases f set es_subasta = true
 where f.id in (
   select (array_agg(c.id))[1]
     from public.fases c
     join public.flujos fl on fl.id = c.flujo_id
     join public.origenes o on o.id = fl.origen_id
    where fl.ambito = 'vehiculos' and o.tipo = 'subasta'
      and c.es_inicial and c.activa and not c.es_logistica and c.nombre ~* 'subasta'
    group by c.flujo_id
   having count(*) = 1);
