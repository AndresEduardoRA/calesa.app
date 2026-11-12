-- 9.07 · Tablero: las métricas de leads en la base.
-- Una RPC por grupo de widgets (ésta y `tablero_cotizaciones`): cada widget carga y falla solo, y el 9.11 suma las suyas sin reescribir éstas.
-- Excepción escrita a «un número que se muestra nunca es un total exacto» (D1, `.claude/rules/escala.md`): un agregado de un período cerrado se
-- cuenta en la base, con ventana de hasta 366 días y por índice de fecha; su motivo está en `supabase/tests/escala.sql`. Sólo cuentas, ningún monto.

-- La ventana del período: fechas inclusivas en la zona de la empresa (D10), como intervalo semiabierto [ini, fin).
create function public._tablero_ventana(p_desde date, p_hasta date)
  returns table (zona text, ini timestamptz, fin timestamptz)
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  v_zona text;
  v_sin_desde boolean := p_desde is null;
  v_sin_hasta boolean := p_hasta is null;
begin
  if v_sin_desde or v_sin_hasta then
    raise exception 'Elige el período.' using errcode = '22023', hint = case when v_sin_desde then 'p_desde' else 'p_hasta' end;
  end if;
  if p_hasta < p_desde then
    raise exception 'El período termina antes de empezar.' using errcode = '22023', hint = 'p_hasta';
  end if;
  if p_hasta - p_desde + 1 > 366 then
    raise exception 'El período puede tener hasta 366 días.' using errcode = '22023', hint = 'p_hasta';
  end if;
  select e.zona_horaria into v_zona from public.ajustes_empresa e where e.id = 1;
  v_zona := coalesce(v_zona, 'America/La_Paz');
  return query select v_zona, p_desde::timestamp at time zone v_zona, (p_hasta + 1)::timestamp at time zone v_zona;
end;
$$;

revoke all on function public._tablero_ventana(date, date) from public, anon, authenticated;
grant execute on function public._tablero_ventana(date, date) to service_role;

-- {desde, hasta, zona, creados, convertidos, tasa, conversion_desde, por_dia[], por_origen[], por_origen_hay_mas, por_asesor[], por_asesor_hay_mas}
--   creados: leads creados en el período. convertidos: leads con `cliente_desde` en el período (D2). tasa: convertidos / creados, nula sin creados.
--   por_origen: hasta 10, por el origen del lead (el grupo sin origen va con id y nombre nulos, D8). por_asesor: hasta 20, por el dueño vigente
--   (un lead sin dueño, o cuyo dueño está en una baja en curso, cuenta en el total y no aquí, D7). Orden (D11): más creados, más convertidos, nombre, id. Toda la empresa (D9): la clave es global.
create function public.tablero_leads(p_desde date, p_hasta date)
  returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  v_zona text;
  v_ini timestamptz;
  v_fin timestamptz;
  v jsonb;
begin
  perform public.assert_activo();
  if not public.tiene_permiso('tablero.metricas.ver') then
    raise exception 'No tienes permiso para ver las métricas.' using errcode = '42501';
  end if;
  select w.zona, w.ini, w.fin into v_zona, v_ini, v_fin from public._tablero_ventana(p_desde, p_hasta) w;

  with creados as materialized (
    -- leads_listado_idx: rango de creado_en, sin papelera.
    select l.id, l.origen_lead_id, (l.creado_en at time zone v_zona)::date as dia
      from public.leads l
     where l.eliminado_en is null and l.creado_en >= v_ini and l.creado_en < v_fin
  ), convertidos as materialized (
    -- leads_cliente_desde_idx: rango de cliente_desde, sin papelera.
    select l.id, l.origen_lead_id, (l.cliente_desde at time zone v_zona)::date as dia
      from public.leads l
     where l.eliminado_en is null and l.cliente_desde >= v_ini and l.cliente_desde < v_fin
  ), todos as materialized (
    select c.id, c.origen_lead_id, c.dia, 1 as cr, 0 as cv from creados c
    union all
    select v.id, v.origen_lead_id, v.dia, 0, 1 from convertidos v
  ), dias as (
    select d::date as dia from generate_series(p_desde::timestamp, p_hasta::timestamp, interval '1 day') d
  ), por_dia as (
    select d.dia, coalesce(sum(t.cr), 0)::int as creados, coalesce(sum(t.cv), 0)::int as convertidos
      from dias d left join todos t on t.dia = d.dia
     group by d.dia
  ), por_origen as (
    select g.origen_lead_id, o.nombre, g.creados, g.convertidos,
           row_number() over (order by g.creados desc, g.convertidos desc, o.nombre nulls last, g.origen_lead_id nulls last) as n
      from (select t.origen_lead_id, sum(t.cr)::int as creados, sum(t.cv)::int as convertidos from todos t group by t.origen_lead_id) g
      left join public.origenes_lead o on o.id = g.origen_lead_id
  ), por_asesor as (
    -- El dueño vigente de cada lead por leads_asesores_dueno_unico (una sonda por lead del período). Quien está en una baja en curso no se
    -- queda con el lead: no entra al ranking y su lead cuenta sólo en el total, como uno sin dueño (D7).
    select g.usuario_id, p.nombre, g.creados, g.convertidos,
           row_number() over (order by g.creados desc, g.convertidos desc, p.nombre nulls last, g.usuario_id) as n
      from (select a.usuario_id, sum(t.cr)::int as creados, sum(t.cv)::int as convertidos
              from todos t
              join public.leads_asesores a on a.lead_id = t.id and a.tipo_acceso = 'dueno' and a.revocado_en is null
                                              and a.usuario_id <> all ((select public._bajas_en_curso())::uuid[])
             group by a.usuario_id) g
      left join public.perfiles p on p.id = g.usuario_id
  ), cuentas as (
    select coalesce(sum(t.cr), 0)::int as creados, coalesce(sum(t.cv), 0)::int as convertidos from todos t
  )
  select jsonb_build_object(
           'desde', p_desde, 'hasta', p_hasta, 'zona', v_zona,
           'creados', c.creados, 'convertidos', c.convertidos,
           'tasa', case when c.creados = 0 then null else round(c.convertidos::numeric / c.creados, 4) end,
           'conversion_desde', public._tablero_conversion_desde(),
           'por_dia', (select coalesce(jsonb_agg(jsonb_build_object('dia', d.dia, 'creados', d.creados, 'convertidos', d.convertidos) order by d.dia), '[]'::jsonb)
                         from por_dia d),
           'por_origen', (select coalesce(jsonb_agg(jsonb_build_object('origen_lead_id', o.origen_lead_id, 'nombre', o.nombre,
                                                                      'creados', o.creados, 'convertidos', o.convertidos) order by o.n), '[]'::jsonb)
                            from por_origen o where o.n <= 10),
           'por_origen_hay_mas', exists (select 1 from por_origen o where o.n > 10),
           'por_asesor', (select coalesce(jsonb_agg(jsonb_build_object('usuario_id', a.usuario_id, 'nombre', a.nombre,
                                                                      'creados', a.creados, 'convertidos', a.convertidos) order by a.n), '[]'::jsonb)
                            from por_asesor a where a.n <= 20),
           'por_asesor_hay_mas', exists (select 1 from por_asesor a where a.n > 20))
    into v
    from cuentas c;
  return v;
end;
$$;

revoke all on function public.tablero_leads(date, date) from public, anon, authenticated;
grant execute on function public.tablero_leads(date, date) to authenticated, service_role;

-- El permiso gana su punto de enforcement (antes: «UI + vistas», sin enforcement en la base).
insert into public.permisos (clave, modulo, nombre, descripcion, por_origen, con_alcance, aplicado_en, orden)
values ('tablero.metricas.ver', 'tablero', 'Ver métricas', 'Tablero con métricas y gráficas', false, false, 'tablero_leads', 660)
on conflict (clave) do update set aplicado_en = excluded.aplicado_en;
