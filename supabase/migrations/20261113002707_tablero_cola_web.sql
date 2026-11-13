-- 9.11 · Tablero: la cola web del período en la base (la otra RPC del 9.11; ver `tablero_margen`).
-- {desde, hasta, zona, total, por_estado, directas, asignadas, contactadas, tasa, mediana_minutos, por_persona[], por_persona_hay_mas}
--   El período va por `asignada_en` (cada intento es una fila con la suya, y no se reescribe), con los días en la zona de la empresa.
--   por_estado: las cinco claves del enum, siempre (0 si no hay). directas: las que el visitante pidió a una persona (`es_directa`).
--   asignadas (D7): no directas con persona, en cualquier estado (el espejo de `asignadas_total` de 8.04). contactadas: de ésas, las `contactada`.
--   tasa = contactadas / asignadas con 4 decimales, nula sin asignadas: las directas no cuentan. mediana_minutos: de asignada a «Contacté», sobre
--   las contactadas no directas, con 1 decimal; nula si no hay. por_persona: hasta 20, todos los que tuvieron asignadas en el período (estén o no
--   hoy en la rueda), por asignadas, contactadas, nombre e id. Nunca el token, la UTM, el lead ni el WhatsApp.

-- El rango de `asignada_en` (no había índice por esa columna).
create index solicitudes_contacto_web_asignada_idx on public.solicitudes_contacto_web (asignada_en);

create function public.tablero_cola_web(p_desde date, p_hasta date)
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
  perform public.assert_permiso('web.cola.gestionar');
  select w.zona, w.ini, w.fin into v_zona, v_ini, v_fin from public._tablero_ventana(p_desde, p_hasta) w;

  with del_periodo as materialized (
    -- solicitudes_contacto_web_asignada_idx: rango de asignada_en.
    select s.usuario_id, s.estado, s.es_directa,
           (not s.es_directa and s.usuario_id is not null) as asignada,
           (not s.es_directa and s.usuario_id is not null and s.estado = 'contactada') as contactada,
           case when not s.es_directa and s.usuario_id is not null and s.estado = 'contactada' and s.contactada_en is not null
                then extract(epoch from s.contactada_en - s.asignada_en) / 60 end as minutos
      from public.solicitudes_contacto_web s
     where s.asignada_en >= v_ini and s.asignada_en < v_fin
  ), por_persona as (
    select d.usuario_id, p.nombre, count(*)::int as asignadas, count(*) filter (where d.contactada)::int as contactadas,
           round((percentile_cont(0.5) within group (order by d.minutos))::numeric, 1) as mediana,
           row_number() over (order by count(*) desc, count(*) filter (where d.contactada) desc, p.nombre nulls last, d.usuario_id) as n
      from del_periodo d
      left join public.perfiles p on p.id = d.usuario_id
     where d.asignada
     group by d.usuario_id, p.nombre
  ), totales as (
    select count(*)::int as total,
           count(*) filter (where d.es_directa)::int as directas,
           count(*) filter (where d.asignada)::int as asignadas,
           count(*) filter (where d.contactada)::int as contactadas,
           round((percentile_cont(0.5) within group (order by d.minutos))::numeric, 1) as mediana
      from del_periodo d
  )
  select jsonb_build_object(
           'desde', p_desde, 'hasta', p_hasta, 'zona', v_zona,
           'total', t.total,
           'por_estado', (select jsonb_object_agg(e.estado::text, (select count(*)::int from del_periodo d where d.estado = e.estado))
                            from unnest(enum_range(null::public.estado_solicitud_web)) e (estado)),
           'directas', t.directas, 'asignadas', t.asignadas, 'contactadas', t.contactadas,
           'tasa', case when t.asignadas = 0 then null else round(t.contactadas::numeric / t.asignadas, 4) end,
           'mediana_minutos', t.mediana,
           'por_persona', (select coalesce(jsonb_agg(jsonb_build_object('usuario_id', pp.usuario_id, 'nombre', pp.nombre,
                                                                       'asignadas', pp.asignadas, 'contactadas', pp.contactadas,
                                                                       'tasa', round(pp.contactadas::numeric / pp.asignadas, 4),
                                                                       'mediana_minutos', pp.mediana) order by pp.n), '[]'::jsonb)
                             from por_persona pp where pp.n <= 20),
           'por_persona_hay_mas', exists (select 1 from por_persona pp where pp.n > 20))
    into v
    from totales t;
  return v;
end;
$$;

comment on function public.tablero_cola_web(date, date) is 'Cola web del período (por asignada_en): {desde, hasta, zona, total, por_estado (las cinco claves), directas, asignadas (no directas con persona), contactadas, tasa (nula sin asignadas; sin las directas), mediana_minutos (hasta «Contacté»), por_persona (hasta 20), por_persona_hay_mas}. Pide web.cola.gestionar (9.11, D7–D8).';

revoke all on function public.tablero_cola_web(date, date) from public, anon, authenticated;
grant execute on function public.tablero_cola_web(date, date) to authenticated, service_role;

update public.permisos
   set aplicado_en = 'cola_web_configurar, cola_web_tablero, cola_web_solicitudes, web_ajustes_guardar (política de la cola), tablero_cola_web'
 where clave = 'web.cola.gestionar';
