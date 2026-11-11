-- La limpieza avisa antes (paso 7.01-2): a quien creó un importado de subasta le llega un `limpieza_pronto` cuando el vehículo entra en la
-- ventana de «Se limpiará pronto» (3 días, `VENTANA_DE_AVISO_DIAS`), una sola vez por vehículo, para que decida «Conservar».
--   · La marca durable es `limpieza_avisos` (una fila por vehículo avisado): una columna en `vehiculos` movería `actualizado_en` (PT409 a quien
--     tiene la ficha abierta) y un `exists` sobre `notificaciones` se pierde cuando la persona borra el aviso o lo purga la purga.
--   · `limpieza_avisar()` sigue el recorrido de `limpieza_automatica_correr` por `vehiculos_limpieza_orden_idx`, con una cota superior (lo que
--     termina después no puede caer en la ventana), y decide con la regla de `limpieza_el` (`_limpieza_fecha`: interruptor, ancla, vence).
--     Con el interruptor general apagado no lee vehículos ni escribe marcas. Tope: 200 avisos por corrida.
--   · Job propio, `limpieza-avisar`, una vez al día (13:15 UTC): no se recrea `limpieza_automatica_correr`.
-- Lo prueba `supabase/tests/areas/notificaciones/avisos-de-cartera.sql` (L1–L4).

-- La ventana del aviso en la base. Es la misma de `VENTANA_DE_AVISO_DIAS` (`src/modules/vehiculos/entities/limpieza.ts`): si cambia una,
-- cambia la otra.
create or replace function public._limpieza_ventana_de_aviso() returns integer
  language sql immutable
  set search_path = ''
as $$ select 3 $$;

revoke all on function public._limpieza_ventana_de_aviso() from public, anon, authenticated;
grant execute on function public._limpieza_ventana_de_aviso() to service_role;

create table public.limpieza_avisos (
  vehiculo_id uuid primary key references public.vehiculos (id) on delete cascade,
  fecha date not null,
  avisado_en timestamptz not null default now()
);

comment on table public.limpieza_avisos is
  'Un vehículo ya avisado antes de la limpieza automática (limpieza_avisar): se avisa una vez. fecha = el día de limpieza que se avisó. Interna: sólo service_role.';

alter table public.limpieza_avisos enable row level security;
revoke all on table public.limpieza_avisos from anon, authenticated;
grant all on table public.limpieza_avisos to service_role;

create or replace function public.limpieza_avisar(p_ahora timestamptz default now(), p_origenes uuid[] default null) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  a public.ajustes_empresa; v public.vehiculos; r record;
  v_hoy date; v_proxima date; v_hasta date; v_fecha date; v_marcado uuid;
  v_tope constant int := 200;
  v_avisados int := 0; v_pendientes boolean := false;
begin
  select * into a from public.ajustes_empresa e where e.id = 1;
  if not a.limpieza_automatica then
    return jsonb_build_object('estado', 'apagada');
  end if;
  v_hoy := (p_ahora at time zone a.zona_horaria)::date;
  v_proxima := public._limpieza_proxima(p_ahora);
  v_hasta := v_hoy + public._limpieza_ventana_de_aviso();

  -- Por `vehiculos_limpieza_orden_idx`. La cota: para caer en la ventana, término + gracia tiene que llegar antes de las 03:00 de hoy + 3
  -- (en la zona), que siempre es antes de ahora + ventana + 2 días − gracia.
  for r in
    select x.id from public.vehiculos x join public.origenes o on o.id = x.origen_id
    where x.eliminado_en is null and x.importado_apibara and o.tipo = 'subasta'
      and (p_origenes is null or x.origen_id = any (p_origenes))
      and (x.subasta_en is not null or x.subasta_fin_en is not null or x.estado_subasta in ('terminada', 'vendida'))
      and coalesce(x.subasta_fin_en, x.subasta_en, x.apibara_sync_en)
          < p_ahora + make_interval(days => public._limpieza_ventana_de_aviso() + 2 - a.limpieza_dias_gracia)
      and not exists (select 1 from public.limpieza_avisos m where m.vehiculo_id = x.id)
    order by coalesce(x.subasta_fin_en, x.subasta_en, x.apibara_sync_en), x.id
  loop
    if v_avisados >= v_tope then
      v_pendientes := true;
      exit;
    end if;
    select * into v from public.vehiculos x where x.id = r.id and x.eliminado_en is null;
    continue when not found;
    v_fecha := public._limpieza_fecha(v, p_ahora, v_proxima);
    continue when v_fecha is null or v_fecha > v_hasta;
    -- La marca primero: una corrida a la vez que tomó el mismo vehículo espera y salta.
    insert into public.limpieza_avisos (vehiculo_id, fecha) values (v.id, v_fecha)
    on conflict (vehiculo_id) do nothing returning vehiculo_id into v_marcado;
    continue when v_marcado is null;
    v_marcado := null;
    -- La marca queda aunque no haya creador o la puerta lo descarte (de baja): así no se relee cada día.
    if v.creado_por is not null then
      perform public.notificar(v.creado_por, 'limpieza_pronto', 'Se limpiará pronto: ' || left(v.titulo, 80),
        'Va a la papelera en la limpieza automática de los próximos días. Si lo quieres, ábrelo y toca «Conservar».',
        'vehiculo', v.id, '/vehiculos/' || v.id, true);
    end if;
    v_avisados := v_avisados + 1;
  end loop;
  return jsonb_build_object('estado', 'corrida', 'avisados', v_avisados, 'pendientes', v_pendientes);
end;
$$;

revoke all on function public.limpieza_avisar(timestamptz, uuid[]) from public, anon, authenticated;
grant execute on function public.limpieza_avisar(timestamptz, uuid[]) to service_role;

select cron.schedule('limpieza-avisar', '15 13 * * *', 'select public.limpieza_avisar()');
