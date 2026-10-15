-- Vehículos en la ficha del lead (Fase 3, parte 6b).
--
-- 1. `vehiculo_vincular` dejaba distinguir un vehículo que no se ve de uno inexistente (`42501` contra
--    `PT409`), tomaba el lock del vehículo antes de mirar el permiso, decía «ya está» antes de mirar la
--    cartera y no bloqueaba el lead: con la papelera enviando el lead a la vez, el lead quedaba en la
--    papelera con un vehículo vinculado. Ahora: lo que no se ve da el mismo mensaje que lo inexistente,
--    el lead se bloquea y se vuelve a mirar (`_lead_mio(…, true)`), y reemplazar el lead de un vehículo
--    exige tener también el actual en la cartera.
-- 2. Marcar y quitar interés devuelven qué pasó (y la nota, para «Deshacer»); marcar otra vez con otra
--    nota la reemplaza en vez de ignorarla. Las dos bloquean el lead como el resto de la clase 1.
-- 3. Dos lecturas para la ficha del lead (`lead_vehiculos`, `vehiculos_para_lead`), de invocador: lo que
--    la persona no ve no llega ni se cuenta.
-- 4. `lead_ficha()` dice cuántos vinculados ve quien mira; la papelera distingue un vehículo que no ves.
-- 5. `vehiculo_id` en seguimientos y recordatorios: se elige uno que se ve; si después deja de verse,
--    sigue sin nombre.

-- ---------------------------------------------------------------------------
-- Piezas comunes
-- ---------------------------------------------------------------------------
-- Lo que la ficha del lead muestra de un vehículo. De invocador: la portada y el origen se leen con la
-- RLS de quien mira (quien llega acá ya ve el vehículo).
create or replace function public._vehiculo_resumen(v public.vehiculos)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', v.id, 'numero', v.numero, 'titulo', v.titulo, 'actualizado_en', v.actualizado_en,
    'origen_id', v.origen_id, 'origen_nombre', (select o.nombre from public.origenes o where o.id = v.origen_id),
    'portada', (select i.ruta_miniatura from public.vehiculos_imagenes i where i.vehiculo_id = v.id and i.es_portada limit 1),
    'editable', public.puede_vehiculo(v.id, 'vehiculos.editar'));
$$;
revoke all on function public._vehiculo_resumen(public.vehiculos) from public, anon;
grant execute on function public._vehiculo_resumen(public.vehiculos) to authenticated;

-- El vehículo de un seguimiento o un recordatorio: uno que quien escribe ve. Lo que no se ve, lo que está
-- en la papelera y lo inexistente dan el mismo mensaje.
create or replace function public._vehiculo_para_nota(p_vehiculo uuid, p_hint text default 'vehiculo_id')
returns uuid language plpgsql stable security definer set search_path = '' as $$
begin
  if p_vehiculo is null then
    return null;
  end if;
  if not public.puede_vehiculo(p_vehiculo, 'vehiculos.ver') then
    raise exception 'Ese vehículo no existe o no tienes acceso.' using errcode = '42501', hint = p_hint;
  end if;
  return p_vehiculo;
end;
$$;
revoke all on function public._vehiculo_para_nota(uuid, text) from public, anon;
grant execute on function public._vehiculo_para_nota(uuid, text) to authenticated;

-- Un uuid que llega dentro de un jsonb: lo que no es uuid es un dato mal formado, con su campo.
create or replace function public._uuid_de(p_valor jsonb, p_hint text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  if p_valor is null or p_valor = 'null'::jsonb then
    return null;
  end if;
  if jsonb_typeof(p_valor) <> 'string' then
    raise exception 'Ese dato no es válido.' using errcode = '22023', hint = p_hint;
  end if;
  return nullif(p_valor #>> '{}', '')::uuid;
exception when invalid_text_representation then
  raise exception 'Ese dato no es válido.' using errcode = '22023', hint = p_hint;
end;
$$;
revoke all on function public._uuid_de(jsonb, text) from public, anon;
grant execute on function public._uuid_de(jsonb, text) to authenticated;

-- Cómo se ve el vehículo de un seguimiento o un recordatorio: sólo si quien mira lo ve. A su autor se le
-- dice que había uno (para no pisarlo al editar), sin nombrarlo.
create or replace function public._vehiculo_de_nota_json(p_vehiculo uuid, p_es_mio boolean)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case
    when p_vehiculo is null then jsonb_build_object('vehiculo', null, 'vehiculo_oculto', false)
    when public.puede_vehiculo(p_vehiculo, 'vehiculos.ver') then jsonb_build_object(
      'vehiculo', (select jsonb_build_object('id', v.id, 'titulo', v.titulo, 'numero', v.numero)
                     from public.vehiculos v where v.id = p_vehiculo),
      'vehiculo_oculto', false)
    else jsonb_build_object('vehiculo', null, 'vehiculo_oculto', coalesce(p_es_mio, false))
  end;
$$;
revoke all on function public._vehiculo_de_nota_json(uuid, boolean) from public, anon;
grant execute on function public._vehiculo_de_nota_json(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Vincular y desvincular
-- ---------------------------------------------------------------------------
create or replace function public.vehiculo_vincular(p_vehiculo uuid, p_actualizado_en_esperado timestamptz, p_lead uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.vehiculos; v_resultado text;
begin
  perform public.assert_activo();
  -- Primero se mira, sin bloquear: lo que no se ve (también la papelera y lo inexistente) da lo mismo.
  if p_vehiculo is null or not public.puede_vehiculo(p_vehiculo, 'vehiculos.ver') then
    raise exception 'Ese vehículo no existe o no tienes acceso.' using errcode = '42501';
  end if;
  if not public.puede_vehiculo(p_vehiculo, 'vehiculos.editar') then
    raise exception 'No tienes permiso para editar este vehículo.' using errcode = '42501';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.' using errcode = '22023';
  end if;
  -- Vincular le da el vehículo a la cartera de ese lead: exige tenerlo en la propia. El lead se bloquea
  -- (y se vuelve a mirar) antes que el vehículo: así la papelera, que bloquea el lead, no lo envía con un
  -- vínculo a medio escribir. Desvincular (p_lead nulo) es una acción sobre el vehículo.
  if p_lead is not null then
    perform public._lead_mio(p_lead, 'leads.editar', true);
  end if;
  select * into v from public.vehiculos x where x.id = p_vehiculo and x.eliminado_en is null for update;
  -- Con el vehículo bloqueado se vuelve a mirar: pudo irse a la papelera, o perderse el lead que daba el acceso.
  if not found or not public.puede_vehiculo(p_vehiculo, 'vehiculos.ver') then
    raise exception 'Ese vehículo no existe o no tienes acceso.' using errcode = '42501';
  end if;
  if not public.puede_vehiculo(p_vehiculo, 'vehiculos.editar') then
    raise exception 'No tienes permiso para editar este vehículo.' using errcode = '42501';
  end if;
  -- Ya está como se pidió: un reintento no choca consigo mismo.
  if v.lead_id is not distinct from p_lead then
    return jsonb_build_object('resultado', 'sin_cambios', 'actualizado_en', v.actualizado_en, 'limpieza_el', public.limpieza_el(v));
  end if;
  if v.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('vehiculos', v.id, v.actualizado_en, 'este vehículo');
  end if;
  -- Reemplazar le quita el vehículo a la cartera del lead actual: sólo quien también lo tiene en la suya
  -- (y puede nombrarlo). Si no, se desvincula primero, desde el vehículo. No se dice cuál es.
  if p_lead is not null and v.lead_id is not null and not public.puede_actuar_lead(v.lead_id, 'leads.editar') then
    raise exception 'Este vehículo ya está vinculado a otro lead. Para cambiarlo, desvincúlalo desde la ficha del vehículo.'
      using errcode = '23514';
  end if;
  v_resultado := case when p_lead is null then 'desvinculado' when v.lead_id is null then 'vinculado' else 'reemplazado' end;
  update public.vehiculos x set lead_id = p_lead where x.id = v.id returning * into v;
  return jsonb_build_object('resultado', v_resultado, 'actualizado_en', v.actualizado_en, 'limpieza_el', public.limpieza_el(v));
end;
$$;
revoke all on function public.vehiculo_vincular(uuid, timestamptz, uuid) from public, anon;
grant execute on function public.vehiculo_vincular(uuid, timestamptz, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Interesados
-- ---------------------------------------------------------------------------
drop function if exists public.vehiculo_interesado_marcar(uuid, uuid, text);
create function public.vehiculo_interesado_marcar(p_vehiculo uuid, p_lead uuid, p_nota text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_nota text := nullif(btrim(p_nota), ''); i public.vehiculos_interesados;
begin
  perform public.assert_activo();
  if p_vehiculo is null or not public.puede_vehiculo(p_vehiculo, 'vehiculos.ver') then
    raise exception 'Ese vehículo no existe o no tienes acceso.' using errcode = '42501';
  end if;
  perform public._lead_mio(p_lead, 'leads.editar', true);
  if char_length(v_nota) > 500 then
    raise exception 'La nota no puede pasar de 500 caracteres.' using errcode = '22023', hint = 'nota';
  end if;
  -- Poner, no alternar: la misma nota es `sin_cambios`; otra la reemplaza.
  select * into i from public.vehiculos_interesados x where x.vehiculo_id = p_vehiculo and x.lead_id = p_lead for update;
  if found then
    if i.nota is not distinct from v_nota then
      return jsonb_build_object('resultado', 'sin_cambios', 'nota', i.nota);
    end if;
    update public.vehiculos_interesados x set nota = v_nota where x.vehiculo_id = p_vehiculo and x.lead_id = p_lead;
    return jsonb_build_object('resultado', 'nota_cambiada', 'nota', v_nota);
  end if;
  insert into public.vehiculos_interesados (vehiculo_id, lead_id, usuario_id, nota)
  values (p_vehiculo, p_lead, (select auth.uid()), v_nota)
  on conflict (vehiculo_id, lead_id) do update set nota = excluded.nota;
  return jsonb_build_object('resultado', 'marcado', 'nota', v_nota);
end;
$$;
revoke all on function public.vehiculo_interesado_marcar(uuid, uuid, text) from public, anon;
grant execute on function public.vehiculo_interesado_marcar(uuid, uuid, text) to authenticated;

drop function if exists public.vehiculo_interesado_quitar(uuid, uuid);
create function public.vehiculo_interesado_quitar(p_vehiculo uuid, p_lead uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_nota text;
begin
  perform public.assert_activo();
  if p_vehiculo is null or not public.puede_vehiculo(p_vehiculo, 'vehiculos.ver') then
    raise exception 'Ese vehículo no existe o no tienes acceso.' using errcode = '42501';
  end if;
  perform public._lead_mio(p_lead, 'leads.editar', true);
  delete from public.vehiculos_interesados x where x.vehiculo_id = p_vehiculo and x.lead_id = p_lead
  returning x.nota into v_nota;
  if not found then
    return jsonb_build_object('resultado', 'sin_cambios', 'nota', null);
  end if;
  -- La nota vuelve para que «Deshacer» la reponga.
  return jsonb_build_object('resultado', 'quitado', 'nota', v_nota);
end;
$$;
revoke all on function public.vehiculo_interesado_quitar(uuid, uuid) from public, anon;
grant execute on function public.vehiculo_interesado_quitar(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Lecturas para la ficha del lead
-- ---------------------------------------------------------------------------
-- Los vehículos de un lead que quien mira ve: vinculados (el vínculo activo), interesados (con su nota) y
-- los vínculos que ya se cerraron (sin personas). De invocador: la RLS de `vehiculos` decide qué llega, y
-- lo que no se ve no se cuenta. Un lead que no se ve devuelve listas vacías.
create or replace function public.lead_vehiculos(p_lead uuid)
returns jsonb language plpgsql stable set search_path = '' as $$
begin
  if not public.puede_lead(p_lead, 'leads.ver') then
    return jsonb_build_object('vinculados', '[]'::jsonb, 'interesados', '[]'::jsonb, 'historial', '[]'::jsonb,
                              'puedo_actuar', false);
  end if;
  return jsonb_build_object(
    'vinculados', coalesce((
      select jsonb_agg(public._vehiculo_resumen(v) || jsonb_build_object(
               'desde', (select k.desde from public.vehiculos_vinculos k where k.vehiculo_id = v.id and k.hasta is null))
             order by v.numero desc)
        from (select * from public.vehiculos x where x.lead_id = p_lead order by x.numero desc limit 100) v), '[]'::jsonb),
    'interesados', coalesce((
      select jsonb_agg(public._vehiculo_resumen(v) || jsonb_build_object(
               'nota', i.nota, 'marcado_en', i.creado_en, 'vinculado_aqui', v.lead_id is not distinct from p_lead)
             order by i.creado_en desc, v.id)
        from (select * from public.vehiculos_interesados y where y.lead_id = p_lead order by y.creado_en desc limit 100) i
        join public.vehiculos v on v.id = i.vehiculo_id), '[]'::jsonb),
    'historial', coalesce((
      select jsonb_agg(jsonb_build_object('vehiculo_id', v.id, 'titulo', v.titulo, 'numero', v.numero,
                                          'desde', k.desde, 'hasta', k.hasta)
             order by k.hasta desc, k.id desc)
        from (select * from public.vehiculos_vinculos z where z.lead_id = p_lead and z.hasta is not null
               order by z.hasta desc, z.id desc limit 50) k
        join public.vehiculos v on v.id = k.vehiculo_id), '[]'::jsonb),
    'puedo_actuar', public.puede_actuar_lead(p_lead, 'leads.editar'));
end;
$$;
revoke all on function public.lead_vehiculos(uuid) from public, anon;
grant execute on function public.lead_vehiculos(uuid) to authenticated;
comment on function public.lead_vehiculos(uuid) is 'Los vehículos de un lead que quien mira ve (vinculados, interesados y vínculos cerrados), y si puede actuar sobre el lead. De invocador: lo que no se ve no llega ni se cuenta.';

-- Buscar entre los vehículos que quien mira ve, para vincularlos o marcar interés desde el lead: por
-- título, VIN, lote o número (`#12`). Sin texto, los más nuevos. Cada uno dice cómo está frente a ese lead.
-- El lead dueño de un vehículo vinculado a otro se nombra sólo si quien mira lo ve (la RLS de `leads`).
create or replace function public.vehiculos_para_lead(p_lead uuid, p_texto text default null)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_texto text := nullif(btrim(left(coalesce(p_texto, ''), 60)), '');
  v_numero bigint;
  v_patron text;
begin
  if not public.puede_lead(p_lead, 'leads.ver') then
    return '[]'::jsonb;
  end if;
  if v_texto ~ '^#?[0-9]{1,12}$' then
    v_numero := ltrim(v_texto, '#')::bigint;
  end if;
  v_patron := '%' || replace(replace(replace(coalesce(v_texto, ''), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return coalesce((
    select jsonb_agg(public._vehiculo_resumen(v) || jsonb_build_object(
             'vinculado_aqui', v.lead_id is not distinct from p_lead,
             'vinculado_a_otro', v.lead_id is not null and v.lead_id <> p_lead,
             'otro_lead', case when v.lead_id is not null and v.lead_id <> p_lead then
                            (select jsonb_build_object('nombre', l.nombre, 'numero', l.numero) from public.leads l where l.id = v.lead_id) end,
             'reemplazable', v.lead_id is not null and v.lead_id <> p_lead and public.puede_actuar_lead(v.lead_id, 'leads.editar'),
             'interesado', exists (select 1 from public.vehiculos_interesados i where i.vehiculo_id = v.id and i.lead_id = p_lead))
           order by v.creado_en desc, v.id desc)
      from (select * from public.vehiculos x
             where v_texto is null
                or x.numero = v_numero
                or x.titulo ilike v_patron or x.vin ilike v_patron or x.lote ilike v_patron
             order by x.creado_en desc, x.id desc
             limit 20) v), '[]'::jsonb);
end;
$$;
revoke all on function public.vehiculos_para_lead(uuid, text) from public, anon;
grant execute on function public.vehiculos_para_lead(uuid, text) to authenticated;
comment on function public.vehiculos_para_lead(uuid, text) is 'Hasta 20 vehículos que quien mira ve (por título, VIN, lote o #número), con su estado frente al lead. De invocador.';

-- ---------------------------------------------------------------------------
-- La ficha y la papelera
-- ---------------------------------------------------------------------------
-- La ficha suma cuántos vehículos vinculados ve quien mira (invocador: la RLS de `vehiculos`). Con eso la
-- pantalla adelanta que no va a la papelera y avisa al compartir o transferir; los que no ve no se cuentan.
create or replace function public.lead_ficha(p_lead uuid)
returns jsonb language plpgsql stable set search_path = '' as $$
declare v record; t record;
begin
  select * into v from public.leads_vista lv where lv.id = p_lead;
  if not found then
    return null;
  end if;
  select la.usuario_id as id, nullif(btrim(p.nombre), '') as nombre into t
    from public.leads_asesores la join public.perfiles p on p.id = la.usuario_id
   where la.lead_id = p_lead and la.revocado_en is null
   order by (la.tipo_acceso = 'dueno') desc, la.desde
   limit 1;
  return jsonb_build_object(
    'id', v.id, 'numero', v.numero, 'nombre', v.nombre,
    'telefono_cc', v.telefono_cc, 'telefono', v.telefono_principal, 'en_cartera', v.en_cartera,
    'tipo', v.tipo, 'origen_lead_id', v.origen_lead_id,
    'atributos', coalesce(v.atributos, '{}'::jsonb),
    'creado_en', v.creado_en, 'actualizado_en', v.actualizado_en,
    'tiene_id', t.id, 'tiene_nombre', t.nombre,
    'telefonos', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'telefono', x.telefono, 'etiqueta', x.etiqueta)
                       order by x.creado_en, x.id)
        from public.lead_telefonos(p_lead) x), '[]'::jsonb),
    'recordatorios_vencidos', (
      select count(*) from public.recordatorios r
       where r.lead_id = p_lead and r.usuario_id = (select auth.uid())
         and r.completado_en is null and r.eliminado_en is null and r.recordar_en <= now()),
    'vehiculos_vinculados', (select count(*) from public.vehiculos x where x.lead_id = p_lead),
    'es_favorito', v.es_favorito, 'esta_tachado', v.esta_tachado,
    'etiquetas', to_jsonb(v.etiquetas));
end;
$$;
revoke all on function public.lead_ficha(uuid) from public, anon;
grant execute on function public.lead_ficha(uuid) to authenticated;

-- Al enviar, el motivo dice si el vehículo que lo impide es uno que quien envía ve: si no lo ve, no puede
-- desvincularlo, y tiene que saber que lo hace otra persona. Que existe ya lo decía antes; cuál, no.
create or replace function public._lead_motivo_de_bloqueo(l public.leads, p_al_enviar boolean)
returns text language plpgsql stable security definer set search_path = '' as $$
begin
  if exists (select 1 from public.vehiculos v where v.lead_id = l.id and (not p_al_enviar or v.eliminado_en is null)) then
    if not p_al_enviar then
      return 'Tiene un vehículo vinculado: desvincúlalo antes de purgarlo.';
    end if;
    if exists (select 1 from public.vehiculos v where v.lead_id = l.id and v.eliminado_en is null
                and not public.puede_vehiculo(v.id, 'vehiculos.ver')) then
      return 'Tiene un vehículo vinculado que no ves: quien lo gestiona tiene que desvincularlo antes.';
    end if;
    return 'Tiene un vehículo vinculado: desvincúlalo en «Vehículos» antes de enviarlo.';
  end if;
  if not p_al_enviar then
    if exists (select 1 from public.pagos p where p.lead_id = l.id) then
      return 'Tiene pagos registrados.';
    end if;
    if exists (select 1 from public.accesos_portal a where a.lead_id = l.id and a.habilitado) then
      return 'Tiene el acceso al portal vigente.';
    end if;
  end if;
  return null;
end;
$$;
revoke all on function public._lead_motivo_de_bloqueo(public.leads, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seguimientos con vehículo
-- ---------------------------------------------------------------------------
create or replace function public._seguimiento_json(s public.seguimientos)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', s.id, 'lead_id', s.lead_id,
    'tipo_id', s.tipo_id, 'tipo_nombre', t.nombre, 'tipo_icono', t.icono,
    'titulo', s.titulo, 'detalle_doc', s.detalle_doc, 'detalle_texto', s.detalle_texto,
    'visibilidad', s.visibilidad, 'ocurrido_en', s.ocurrido_en, 'actualizado_en', s.actualizado_en,
    'eliminado', s.eliminado_en is not null,
    'autor_id', s.usuario_id, 'autor_nombre', nullif(btrim(p.nombre), ''),
    'es_mio', s.usuario_id = (select auth.uid()))
    || public._vehiculo_de_nota_json(s.vehiculo_id, s.usuario_id = (select auth.uid()))
  from public.tipos_seguimiento t, public.perfiles p
  where t.id = s.tipo_id and p.id = s.usuario_id;
$$;

create or replace function public.lead_seguimientos(p_lead uuid, p_antes_en timestamptz default null,
                                                    p_antes_id uuid default null, p_tamano int default 20)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_tamano int := least(greatest(coalesce(p_tamano, 20), 1), 50);
  v_puedo boolean;
  v_filas jsonb;
  v_hay_mas boolean;
begin
  v_puedo := public.en_cartera(p_lead) and public.puede_lead(p_lead, 'leads.editar');
  with pagina as (
    select s.*, t.nombre as tipo_nombre, t.icono as tipo_icono, nullif(btrim(p.nombre), '') as autor_nombre,
           v.id as veh_id, v.titulo as veh_titulo, v.numero as veh_numero
      from public.seguimientos s
      join public.tipos_seguimiento t on t.id = s.tipo_id
      left join public.perfiles p on p.id = s.usuario_id
      -- La RLS de `vehiculos` vacía el join si quien mira no ve ese vehículo.
      left join public.vehiculos v on v.id = s.vehiculo_id
     where s.lead_id = p_lead
       and (p_antes_en is null or (s.ocurrido_en, s.id) < (p_antes_en, p_antes_id))
     order by s.ocurrido_en desc, s.id desc
     limit v_tamano + 1
  ), numeradas as (
    select pagina.*, row_number() over (order by ocurrido_en desc, id desc) as n from pagina
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', x.id, 'lead_id', x.lead_id,
           'tipo_id', x.tipo_id, 'tipo_nombre', x.tipo_nombre, 'tipo_icono', x.tipo_icono,
           'titulo', x.titulo, 'detalle_doc', x.detalle_doc, 'detalle_texto', x.detalle_texto,
           'visibilidad', x.visibilidad, 'ocurrido_en', x.ocurrido_en, 'actualizado_en', x.actualizado_en,
           'eliminado', false,
           'autor_id', x.usuario_id, 'autor_nombre', x.autor_nombre,
           'es_mio', x.usuario_id = (select auth.uid()),
           'vehiculo', case when x.veh_id is not null then
                         jsonb_build_object('id', x.veh_id, 'titulo', x.veh_titulo, 'numero', x.veh_numero) end,
           'vehiculo_oculto', x.vehiculo_id is not null and x.veh_id is null and x.usuario_id = (select auth.uid()))
           order by x.ocurrido_en desc, x.id desc) filter (where x.n <= v_tamano), '[]'::jsonb),
         coalesce(bool_or(x.n > v_tamano), false)
    into v_filas, v_hay_mas
    from numeradas x;
  return jsonb_build_object('seguimientos', v_filas, 'hay_mas', v_hay_mas, 'puedo_anotar', v_puedo);
end;
$$;
revoke all on function public.lead_seguimientos(uuid, timestamptz, uuid, int) from public, anon;
grant execute on function public.lead_seguimientos(uuid, timestamptz, uuid, int) to authenticated;

create or replace function public.seguimiento_crear(p_id uuid, p_lead uuid, p_seguimiento jsonb, p_recordatorio jsonb default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  l public.leads;
  s public.seguimientos;
  r public.recordatorios;
  v_tipo uuid;
  v_titulo text;
  v_doc jsonb;
  v_texto text;
  v_visibilidad public.visibilidad_seguimiento := 'privado';
  v_ocurrido timestamptz := now();
  v_recordar timestamptz;
  v_vehiculo uuid;
  v_k text;
begin
  l := public._lead_mio(p_lead);
  if p_id is null then
    raise exception 'Falta el identificador del seguimiento.' using errcode = '22023';
  end if;
  select * into s from public.seguimientos x where x.id = p_id;
  if found then
    if s.usuario_id = (select auth.uid()) and s.lead_id = l.id then
      return jsonb_build_object('resultado', 'repetido', 'seguimiento', public._seguimiento_json(s), 'recordatorio', null);
    end if;
    raise exception 'No pudimos guardar este seguimiento. Vuelve a intentarlo.' using errcode = '22023';
  end if;

  if p_seguimiento is null or jsonb_typeof(p_seguimiento) <> 'object' then
    raise exception 'Escribe un resumen del seguimiento.' using errcode = '22023', hint = 'titulo';
  end if;
  for v_k in select jsonb_object_keys(p_seguimiento) loop
    if v_k not in ('tipo_id', 'titulo', 'detalle', 'visibilidad', 'ocurrido_en', 'vehiculo_id') then
      raise exception 'El dato «%» no es de un seguimiento.', v_k using errcode = '22023', hint = v_k;
    end if;
  end loop;

  begin
    v_tipo := nullif(p_seguimiento ->> 'tipo_id', '')::uuid;
  exception when invalid_text_representation then
    v_tipo := null;
  end;
  if v_tipo is null or not exists (select 1 from public.tipos_seguimiento t where t.id = v_tipo and t.activo) then
    raise exception 'Elige un tipo de seguimiento que esté activo.' using errcode = '22023', hint = 'tipo_id';
  end if;
  v_titulo := public._seguimiento_titulo(p_seguimiento -> 'titulo', 'titulo');
  v_doc := p_seguimiento -> 'detalle';
  v_texto := public._seguimiento_detalle(v_doc);
  if v_texto is null then
    v_doc := null;
  end if;
  if p_seguimiento ? 'visibilidad' then
    v_visibilidad := public._seguimiento_visibilidad(p_seguimiento -> 'visibilidad');
  end if;
  if p_seguimiento ? 'ocurrido_en' and p_seguimiento -> 'ocurrido_en' <> 'null'::jsonb then
    v_ocurrido := public._seguimiento_fecha(p_seguimiento -> 'ocurrido_en');
  end if;
  v_vehiculo := public._vehiculo_para_nota(public._uuid_de(p_seguimiento -> 'vehiculo_id', 'vehiculo_id'));

  if p_recordatorio is not null and p_recordatorio <> 'null'::jsonb then
    if jsonb_typeof(p_recordatorio) <> 'object' then
      raise exception 'Elige cuándo recordarlo.' using errcode = '22023', hint = 'recordatorio.recordar_en';
    end if;
    begin
      v_recordar := (p_recordatorio ->> 'recordar_en')::timestamptz;
    exception when others then
      v_recordar := null;
    end;
    v_recordar := public._recordatorio_cuando(v_recordar, 'recordatorio.recordar_en');
  end if;

  begin
    insert into public.seguimientos (id, lead_id, usuario_id, tipo_id, titulo, detalle_doc, detalle_texto,
                                     visibilidad, ocurrido_en, vehiculo_id, actualizado_en)
    values (p_id, l.id, (select auth.uid()), v_tipo, v_titulo, v_doc, v_texto, v_visibilidad, v_ocurrido, v_vehiculo,
            clock_timestamp())
    returning * into s;
  exception when unique_violation then
    -- El mismo intento llegó dos veces a la vez (doble clic): el otro ya lo guardó.
    select * into s from public.seguimientos x where x.id = p_id;
    if s.usuario_id = (select auth.uid()) and s.lead_id = l.id then
      return jsonb_build_object('resultado', 'repetido', 'seguimiento', public._seguimiento_json(s), 'recordatorio', null);
    end if;
    raise exception 'No pudimos guardar este seguimiento. Vuelve a intentarlo.' using errcode = '22023';
  end;

  -- El recordatorio que nace con el seguimiento lleva su mismo vehículo.
  if v_recordar is not null then
    insert into public.recordatorios (usuario_id, lead_id, vehiculo_id, titulo, recordar_en, actualizado_en)
    values ((select auth.uid()), l.id, v_vehiculo,
            public._recordatorio_titulo(coalesce(nullif(btrim(p_recordatorio ->> 'titulo'), ''), v_titulo), 'recordatorio.titulo'),
            v_recordar, clock_timestamp())
    returning * into r;
  end if;

  perform public.registrar_actividad('lead.seguimiento_creado', 'leads', l.id::text, null, null,
    jsonb_build_object('seguimiento', s.id, 'tipo', s.tipo_id, 'visibilidad', s.visibilidad));
  return jsonb_build_object('resultado', 'creado', 'seguimiento', public._seguimiento_json(s),
    'recordatorio', case when r.id is not null then public._recordatorio_json(r) end);
end;
$$;

create or replace function public.seguimiento_guardar(p_id uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s public.seguimientos;
  n public.seguimientos;
  v_tipo uuid;
  v_titulo text;
  v_doc jsonb;
  v_texto text;
  v_visibilidad public.visibilidad_seguimiento;
  v_ocurrido timestamptz;
  v_vehiculo uuid;
  v_k text;
begin
  s := public._seguimiento_mio(p_id);
  if s.eliminado_en is not null then
    raise exception 'No encontramos este seguimiento o no tienes acceso.' using errcode = '42501';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Los cambios de un seguimiento tienen que ser un objeto.' using errcode = '22023';
  end if;
  for v_k in select jsonb_object_keys(p_cambios) loop
    if v_k not in ('tipo_id', 'titulo', 'detalle', 'visibilidad', 'ocurrido_en', 'vehiculo_id') then
      raise exception 'El dato «%» no es de un seguimiento.', v_k using errcode = '22023', hint = v_k;
    end if;
  end loop;

  v_tipo := s.tipo_id;
  v_titulo := s.titulo;
  v_doc := s.detalle_doc;
  v_texto := s.detalle_texto;
  v_visibilidad := s.visibilidad;
  v_ocurrido := s.ocurrido_en;
  v_vehiculo := s.vehiculo_id;

  if p_cambios ? 'tipo_id' then
    begin
      v_tipo := nullif(p_cambios ->> 'tipo_id', '')::uuid;
    exception when invalid_text_representation then
      v_tipo := null;
    end;
    if v_tipo is distinct from s.tipo_id
       and (v_tipo is null or not exists (select 1 from public.tipos_seguimiento t where t.id = v_tipo and t.activo)) then
      raise exception 'Elige un tipo de seguimiento que esté activo.' using errcode = '22023', hint = 'tipo_id';
    end if;
  end if;
  if p_cambios ? 'titulo' then
    v_titulo := public._seguimiento_titulo(p_cambios -> 'titulo', 'titulo');
  end if;
  if p_cambios ? 'detalle' then
    v_doc := p_cambios -> 'detalle';
    v_texto := public._seguimiento_detalle(v_doc);
    if v_texto is null then
      v_doc := null;
    end if;
  end if;
  if p_cambios ? 'visibilidad' then
    v_visibilidad := public._seguimiento_visibilidad(p_cambios -> 'visibilidad');
  end if;
  if p_cambios ? 'ocurrido_en' then
    v_ocurrido := public._seguimiento_fecha(p_cambios -> 'ocurrido_en');
  end if;
  -- El vehículo sólo se mira si cambia: uno que su autor dejó de ver se conserva al editar lo demás.
  if p_cambios ? 'vehiculo_id' then
    v_vehiculo := public._uuid_de(p_cambios -> 'vehiculo_id', 'vehiculo_id');
    if v_vehiculo is distinct from s.vehiculo_id then
      v_vehiculo := public._vehiculo_para_nota(v_vehiculo);
    end if;
  end if;

  if (v_tipo, v_titulo, v_doc, v_texto, v_visibilidad, v_ocurrido, v_vehiculo)
     is not distinct from (s.tipo_id, s.titulo, s.detalle_doc, s.detalle_texto, s.visibilidad, s.ocurrido_en, s.vehiculo_id) then
    return jsonb_build_object('resultado', 'sin_cambios', 'seguimiento', public._seguimiento_json(s));
  end if;
  if s.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._seguimiento_conflicto(s.actualizado_en);
  end if;

  update public.seguimientos x set
    tipo_id = v_tipo, titulo = v_titulo, detalle_doc = v_doc, detalle_texto = v_texto,
    visibilidad = v_visibilidad, ocurrido_en = v_ocurrido, vehiculo_id = v_vehiculo,
    actualizado_en = greatest(clock_timestamp(), s.actualizado_en + interval '1 microsecond')
  where x.id = s.id
  returning * into n;
  perform public.registrar_actividad('lead.seguimiento_editado', 'leads', n.lead_id::text, null, null,
    jsonb_build_object('seguimiento', n.id, 'tipo', n.tipo_id, 'visibilidad', n.visibilidad));
  return jsonb_build_object('resultado', 'guardado', 'seguimiento', public._seguimiento_json(n));
end;
$$;

-- ---------------------------------------------------------------------------
-- Recordatorios con vehículo
-- ---------------------------------------------------------------------------
create or replace function public._recordatorio_json(r public.recordatorios)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', r.id, 'titulo', r.titulo, 'recordar_en', r.recordar_en,
    'notificado_en', r.notificado_en, 'completado_en', r.completado_en,
    'eliminado', r.eliminado_en is not null, 'actualizado_en', r.actualizado_en,
    'lead_id', case when v then r.lead_id end,
    'lead_nombre', case when v then (select l.nombre from public.leads l where l.id = r.lead_id) end,
    'lead_numero', case when v then (select l.numero from public.leads l where l.id = r.lead_id) end)
    -- Un recordatorio es de su dueño: si ya no ve el vehículo, se le dice que había uno.
    || public._vehiculo_de_nota_json(r.vehiculo_id, true)
  from (select r.lead_id is not null and public.puede_lead(r.lead_id, 'leads.ver') as v) x;
$$;

drop function if exists public.recordatorio_crear(uuid, uuid, text, timestamptz);
create function public.recordatorio_crear(p_id uuid, p_lead uuid, p_titulo text, p_recordar_en timestamptz,
                                          p_vehiculo uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.recordatorios; v_lead uuid; v_titulo text; v_cuando timestamptz; v_vehiculo uuid;
begin
  perform public.assert_activo();
  if p_lead is not null then
    v_lead := (public._lead_mio(p_lead)).id;
  end if;
  if p_id is null then
    raise exception 'Falta el identificador del recordatorio.' using errcode = '22023';
  end if;
  select * into r from public.recordatorios x where x.id = p_id;
  if found then
    if r.usuario_id = (select auth.uid()) and r.lead_id is not distinct from v_lead then
      return jsonb_build_object('resultado', 'repetido', 'recordatorio', public._recordatorio_json(r));
    end if;
    raise exception 'No pudimos guardar este recordatorio. Vuelve a intentarlo.' using errcode = '22023';
  end if;
  v_titulo := public._recordatorio_titulo(p_titulo, 'titulo');
  v_cuando := public._recordatorio_cuando(p_recordar_en, 'recordar_en');
  v_vehiculo := public._vehiculo_para_nota(p_vehiculo);
  begin
    insert into public.recordatorios (id, usuario_id, lead_id, vehiculo_id, titulo, recordar_en, actualizado_en)
    values (p_id, (select auth.uid()), v_lead, v_vehiculo, v_titulo, v_cuando, clock_timestamp())
    returning * into r;
  exception when unique_violation then
    select * into r from public.recordatorios x where x.id = p_id;
    if r.usuario_id = (select auth.uid()) and r.lead_id is not distinct from v_lead then
      return jsonb_build_object('resultado', 'repetido', 'recordatorio', public._recordatorio_json(r));
    end if;
    raise exception 'No pudimos guardar este recordatorio. Vuelve a intentarlo.' using errcode = '22023';
  end;
  return jsonb_build_object('resultado', 'creado', 'recordatorio', public._recordatorio_json(r));
end;
$$;
revoke all on function public.recordatorio_crear(uuid, uuid, text, timestamptz, uuid) from public, anon;
grant execute on function public.recordatorio_crear(uuid, uuid, text, timestamptz, uuid) to authenticated;

create or replace function public.recordatorio_guardar(p_id uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.recordatorios; n public.recordatorios; v_titulo text; v_cuando timestamptz; v_vehiculo uuid; v_k text;
begin
  r := public._recordatorio_mio(p_id);
  if r.eliminado_en is not null then
    raise exception 'No encontramos este recordatorio.' using errcode = '42501';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Los cambios de un recordatorio tienen que ser un objeto.' using errcode = '22023';
  end if;
  for v_k in select jsonb_object_keys(p_cambios) loop
    if v_k not in ('titulo', 'recordar_en', 'vehiculo_id') then
      raise exception 'El dato «%» no es de un recordatorio.', v_k using errcode = '22023', hint = v_k;
    end if;
  end loop;
  v_titulo := r.titulo;
  v_cuando := r.recordar_en;
  v_vehiculo := r.vehiculo_id;
  if p_cambios ? 'titulo' then
    v_titulo := public._recordatorio_titulo(p_cambios ->> 'titulo', 'titulo');
  end if;
  if p_cambios ? 'recordar_en' then
    begin
      v_cuando := (p_cambios ->> 'recordar_en')::timestamptz;
    exception when others then
      v_cuando := null;
    end;
    if v_cuando is distinct from r.recordar_en then
      v_cuando := public._recordatorio_cuando(v_cuando, 'recordar_en');
    end if;
  end if;
  -- Como en los seguimientos: el vehículo sólo se mira si cambia.
  if p_cambios ? 'vehiculo_id' then
    v_vehiculo := public._uuid_de(p_cambios -> 'vehiculo_id', 'vehiculo_id');
    if v_vehiculo is distinct from r.vehiculo_id then
      v_vehiculo := public._vehiculo_para_nota(v_vehiculo);
    end if;
  end if;
  if (v_titulo, v_cuando, v_vehiculo) is not distinct from (r.titulo, r.recordar_en, r.vehiculo_id) then
    return jsonb_build_object('resultado', 'sin_cambios', 'recordatorio', public._recordatorio_json(r));
  end if;
  if r.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._recordatorio_conflicto(r.actualizado_en);
  end if;
  update public.recordatorios x set
    titulo = v_titulo, recordar_en = v_cuando, vehiculo_id = v_vehiculo,
    notificado_en = case when v_cuando is distinct from r.recordar_en then null else r.notificado_en end,
    actualizado_en = greatest(clock_timestamp(), r.actualizado_en + interval '1 microsecond')
  where x.id = r.id
  returning * into n;
  return jsonb_build_object('resultado', 'guardado', 'recordatorio', public._recordatorio_json(n));
end;
$$;

-- Los míos y vivos (la RLS). El lead y el vehículo salen sólo si todavía los veo (la RLS de cada tabla
-- vacía su `left join`); `vehiculo_oculto` dice que había uno que ya no veo, sin nombrarlo.
create or replace view public.recordatorios_vista with (security_invoker = true) as
select r.id, r.titulo, r.recordar_en, r.notificado_en, r.completado_en, r.creado_en, r.actualizado_en,
       l.id as lead_id, l.nombre as lead_nombre, l.numero as lead_numero,
       v.id as vehiculo_id, v.titulo as vehiculo_titulo, v.numero as vehiculo_numero,
       (r.vehiculo_id is not null and v.id is null) as vehiculo_oculto
  from public.recordatorios r
  left join public.leads l on l.id = r.lead_id
  left join public.vehiculos v on v.id = r.vehiculo_id;
revoke all on public.recordatorios_vista from anon, authenticated;
grant select on public.recordatorios_vista to authenticated;
comment on view public.recordatorios_vista is 'Los recordatorios de quien mira (vivos). El lead y el vehículo son nulos si ya no los ve: el recordatorio sigue siendo suyo, sin nombrar lo que no ve (`vehiculo_oculto` dice que había un vehículo).';

-- Las piezas internas no se llaman desde la app: sólo las usan las RPC de arriba.
revoke all on function public._uuid_de(jsonb, text) from authenticated;
revoke all on function public._vehiculo_para_nota(uuid, text) from authenticated;
revoke all on function public._vehiculo_de_nota_json(uuid, boolean) from authenticated;
