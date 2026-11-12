-- Alertas de demora por lotes que reabren el mismo aviso (paso 6.12-1, C3–C5 y C11).
--
-- Hasta aquí `alertas_demora()` recorría todas las unidades demoradas de una vez, avisaba a todo el que tuviera `flujos.mover` (sin mirar el alcance ni si
-- podía abrir la unidad) y nadie la programaba. Ahora: por pares (origen, fase) que alertan (`_logistica_dias`), cada uno por `vehiculos_cadena_idx` con
-- cursor `(fase_desde, id)` de a 200 y hasta 2.000 unidades por corrida; los destinatarios se calculan una vez por origen; un aviso abierto se reabre
-- (la misma fila: el antispam `notificaciones_antispam` deja una abierta por persona, tipo y unidad) pasado `fases.alerta_cada_horas` (nulo = 72 h).
-- Sin candado (D9): las escrituras repiten en la misma sentencia que la unidad sigue en esa fase con ese `fase_desde`.

-- El alcance de una persona dada (como `alcance_de`, que mira a `auth.uid()`): lo usan los jobs, que corren sin sesión. Con origen nulo, nulo: un permiso
-- de un solo origen nunca vale como global.
create function public._alcance_de_usuario(p_usuario uuid, p_clave text, p_origen uuid) returns public.alcance_permiso
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select case when p_origen is null then null
              when bool_or(rp.alcance = 'todos') then 'todos'::public.alcance_permiso
              when bool_or(true) then 'propios'::public.alcance_permiso
         end
  from public.usuarios_roles ur
  join public.roles_permisos rp on rp.rol_id = ur.rol_id
  join public.perfiles p on p.id = ur.usuario_id
  where ur.usuario_id = p_usuario
    and p.activo and not p.bloqueado
    and rp.permiso_clave = p_clave
    and (rp.origen_id is null or rp.origen_id = p_origen);
$$;

revoke all on function public._alcance_de_usuario(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public._alcance_de_usuario(uuid, text, uuid) to service_role;

-- A quién se avisa de una unidad de un origen: las personas activas con `p_clave` en el origen que además pueden abrir la unidad (`logistica.ver` y
-- `vehiculos.ver`). `todos` si las tres son `todos`; si no, la unidad entra sólo si la creó o su lead está en su cartera (el predicado de la cadena).
-- Con origen nulo, nadie.
create function public._alertas_destinatarios(p_clave text, p_origen uuid) returns table (usuario_id uuid, todos boolean)
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select x.u, x.c = 'todos' and x.l = 'todos' and x.v = 'todos'
    from (
      select c.u,
             public._alcance_de_usuario(c.u, p_clave, p_origen) as c,
             public._alcance_de_usuario(c.u, 'logistica.ver', p_origen) as l,
             public._alcance_de_usuario(c.u, 'vehiculos.ver', p_origen) as v
        from (select distinct ur.usuario_id as u
                from public.usuarios_roles ur
                join public.roles_permisos rp on rp.rol_id = ur.rol_id
               where rp.permiso_clave = p_clave and (rp.origen_id is null or rp.origen_id = p_origen)) c
    ) x
   where p_origen is not null and x.c is not null and x.l is not null and x.v is not null;
$$;

revoke all on function public._alertas_destinatarios(text, uuid) from public, anon, authenticated;
grant execute on function public._alertas_destinatarios(text, uuid) to service_role;

-- Un aviso de demora para una persona y una unidad: nada si ya hay uno suyo de esta fase dentro de `p_horas` (abierto, leído o accionado); si hay uno
-- abierto más viejo, lo reabre (sin leer, `creado_en = now()`, texto al día); si no, uno nuevo por `notificar()`. Devuelve 1 si escribió o reabrió
-- (un intento: la puerta de 7.01 puede descartarlo en silencio). «Ya avisé» y «abierto» van por `notificaciones_referencia_idx`.
create function public._alerta_demora_avisar(
  p_vehiculo uuid, p_titulo text, p_fase uuid, p_fase_nombre text, p_fase_desde timestamptz, p_dias integer, p_horas integer, p_usuario uuid
) returns integer
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_titulo text := 'Vehículo demorado en «' || p_fase_nombre || '»';
  v_cuerpo text := p_titulo || ' lleva ' || floor(extract(epoch from now() - p_fase_desde) / 86400)::int || ' días en la fase (el límite es '
                   || p_dias || ')';
begin
  if exists (select 1 from public.notificaciones n
              where n.referencia_id = p_vehiculo and n.tipo = 'demora_fase' and n.usuario_id = p_usuario
                and n.creado_en > greatest(p_fase_desde, now() - make_interval(hours => p_horas))) then
    return 0;
  end if;
  update public.notificaciones n
     set leida_en = null, creado_en = now(), titulo = v_titulo, cuerpo = v_cuerpo
   where n.referencia_id = p_vehiculo and n.tipo = 'demora_fase' and n.usuario_id = p_usuario and n.accionada_en is null
     and exists (select 1 from public.vehiculos v
                  where v.id = p_vehiculo and v.fase_id = p_fase and v.fase_desde = p_fase_desde and v.eliminado_en is null);
  if found then
    return 1;
  end if;
  perform public.notificar(p_usuario, 'demora_fase', v_titulo, v_cuerpo, 'vehiculo', p_vehiculo, '/logistica/vehiculo/' || p_vehiculo, true)
     from public.vehiculos v
    where v.id = p_vehiculo and v.fase_id = p_fase and v.fase_desde = p_fase_desde and v.eliminado_en is null;
  return case when found then 1 else 0 end;
end;
$$;

revoke all on function public._alerta_demora_avisar(uuid, text, uuid, text, timestamptz, integer, integer, uuid) from public, anon, authenticated;
grant execute on function public._alerta_demora_avisar(uuid, text, uuid, text, timestamptz, integer, integer, uuid) to service_role;

-- Misma firma (D13): devuelve cuántos avisos intentó escribir o reabrir.
create or replace function public.alertas_demora() returns integer
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  c_lote constant int := 200;
  c_tope constant int := 2000;
  p record; w record;
  v_origen uuid; v_usuarios uuid[]; v_todos boolean[];
  v_ids uuid[]; v_desde timestamptz; v_id uuid;
  v_vistas int := 0; v_n int := 0;
  -- Quien está en una baja en curso deja de contar su cartera (la unidad propia, sí).
  v_fuera constant uuid[] := public._bajas_en_curso();
begin
  for p in
    select fl.origen_id, f.id as fase_id, f.nombre, x.dias, coalesce(f.alerta_cada_horas, 72) as horas
      from public.flujos fl
      join public.fases f on f.flujo_id = fl.id
      cross join lateral (select public._logistica_dias(f.id) as dias) x
     where fl.ambito = 'vehiculos' and fl.origen_id is not null and x.dias is not null
     order by fl.origen_id, f.orden, f.id
  loop
    exit when v_vistas >= c_tope;
    if v_origen is distinct from p.origen_id then
      v_origen := p.origen_id;
      select coalesce(array_agg(d.usuario_id order by d.usuario_id), '{}'), coalesce(array_agg(d.todos order by d.usuario_id), '{}')
        into v_usuarios, v_todos from public._alertas_destinatarios('flujos.mover', p.origen_id) d;
    end if;
    continue when cardinality(v_usuarios) = 0;
    v_id := null;
    loop
      -- vehiculos_cadena_idx: (origen_id, fase_id) fijos, rango de fase_desde; con cursor, desde (fase_desde, id).
      if v_id is null then
        v_ids := array(select v.id from public.vehiculos v
                        where v.origen_id = p.origen_id and v.fase_id = p.fase_id and v.eliminado_en is null
                          and v.fase_desde < now() - make_interval(days => p.dias)
                        order by v.fase_desde, v.id limit least(c_lote, c_tope - v_vistas));
      else
        v_ids := array(select v.id from public.vehiculos v
                        where v.origen_id = p.origen_id and v.fase_id = p.fase_id and v.eliminado_en is null
                          and v.fase_desde < now() - make_interval(days => p.dias) and (v.fase_desde, v.id) > (v_desde, v_id)
                        order by v.fase_desde, v.id limit least(c_lote, c_tope - v_vistas));
      end if;
      exit when cardinality(v_ids) = 0;
      v_vistas := v_vistas + cardinality(v_ids);
      for w in select x.id, x.titulo, x.fase_desde, x.creado_por, x.lead_id from public.vehiculos x
                where x.id = any (v_ids) order by x.fase_desde, x.id loop
        for i in 1 .. cardinality(v_usuarios) loop
          if v_todos[i] or w.creado_por = v_usuarios[i]
             or (w.lead_id is not null and v_usuarios[i] <> all (v_fuera) and exists (select 1 from public.leads_asesores la
                  where la.lead_id = w.lead_id and la.usuario_id = v_usuarios[i] and la.revocado_en is null)) then
            v_n := v_n + public._alerta_demora_avisar(w.id, w.titulo, p.fase_id, p.nombre, w.fase_desde, p.dias, p.horas, v_usuarios[i]);
          end if;
        end loop;
        v_desde := w.fase_desde; v_id := w.id;
      end loop;
      exit when cardinality(v_ids) < c_lote or v_vistas >= c_tope;
    end loop;
  end loop;
  return v_n;
end;
$$;

comment on function public.alertas_demora() is
  'Alertas (6.12): job alertas-demora cada hora. Por pares (origen, fase) que alertan, de a 200 y hasta 2.000 unidades por corrida; avisa demora_fase a quien tiene flujos.mover, logistica.ver y vehiculos.ver del origen (el menor alcance) y reabre el mismo aviso pasado alerta_cada_horas (nulo = 72 h). Devuelve los intentos.';

-- Cada hora en el minuto 12: el 7 es de limpieza-automatica.
select cron.schedule('alertas-demora', '12 * * * *', 'select public.alertas_demora()');
