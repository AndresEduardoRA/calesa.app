-- Cotizaciones de repuestos: aceptar y anular por RPC, una sola aceptada por proyecto y sin escritura directa (paso 8.12-1, C14–C18).
--   C14. `repuestos_cotizacion_aceptar` pasa a `aceptada` (y la aceptada anterior del proyecto a `anulada`) y copia el unitario de cada línea con
--        ítem vivo a `repuestos_items.precio_cliente`, con la moneda de la cotización. Pide además `repuestos.editar` (D13: fija el precio del ítem).
--   C15. Un índice único parcial: una sola aceptada por proyecto; si dos aceptan a la vez, la segunda recibe PT409.
--   C16. `repuestos_cotizacion_anular` (desde borrador o aceptada); no revierte los precios (D12).
--   C17. Sin las policies de crear, editar y borrar ni insert, update o delete para authenticated: el total y el snapshot los pone la base.
--   D15. Las cotizaciones sin el snapshot de la versión 1 (escritas por el cliente antes de las RPC: el área nunca tuvo pantalla) se anulan antes
--        del índice.

-- D15 · lo escrito por el cliente antes de las RPC.
update public.repuestos_cotizaciones set estado = 'anulada'
 where estado <> 'anulada' and (config_snapshot ->> 'version') is distinct from '1';

-- C15 · una sola aceptada por proyecto.
create unique index repuestos_cotizaciones_una_aceptada on public.repuestos_cotizaciones using btree (proyecto_id) where estado = 'aceptada';

-- C14 · aceptar.
create or replace function public.repuestos_cotizacion_aceptar(p_id uuid, p_actualizado_en_esperado timestamptz) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare c public.repuestos_cotizaciones; v_anulada uuid; v_items integer;
begin
  perform public.assert_permiso('repuestos.cotizar');
  perform public.assert_permiso('repuestos.ver');
  perform public.assert_permiso('repuestos.editar');
  c := public._repuesto_cotizacion_para_cambiar(p_id, p_actualizado_en_esperado);
  if not exists (select 1 from public.repuestos_cotizaciones_lineas l where l.cotizacion_id = p_id)
     or exists (select 1 from public.repuestos_cotizaciones_lineas l where l.cotizacion_id = p_id and l.total is null) then
    raise exception 'Para aceptarla, cada línea necesita su total.' using errcode = '23514', hint = 'lineas';
  end if;

  update public.repuestos_cotizaciones x set estado = 'anulada'
   where x.proyecto_id = c.proyecto_id and x.estado = 'aceptada' and x.id <> p_id
  returning x.id into v_anulada;
  begin
    update public.repuestos_cotizaciones x set estado = 'aceptada', aceptada_en = now() where x.id = p_id returning * into c;
  exception when unique_violation then
    raise exception 'Otra cotización de este proyecto se aceptó recién. Recarga para verla.' using errcode = 'PT409', hint = 'conflicto';
  end;

  -- D2, D11 · el unitario (exacto: el total es unitario × cantidad) a cada ítem vivo, tomados en orden de id como en `guardar`.
  perform 1 from public.repuestos_items x
   where x.id in (select l.item_id from public.repuestos_cotizaciones_lineas l where l.cotizacion_id = p_id) and x.eliminado_en is null
   order by x.id for update;
  update public.repuestos_items x set precio_cliente = l.total / l.cantidad, moneda = c.moneda
    from public.repuestos_cotizaciones_lineas l
   where l.cotizacion_id = p_id and l.item_id = x.id and x.eliminado_en is null;
  get diagnostics v_items = row_count;

  return jsonb_build_object('id', c.id, 'actualizado_en', c.actualizado_en, 'aceptada_en', c.aceptada_en, 'anulada', v_anulada, 'items', v_items);
end;
$$;

-- C16 · anular.
create or replace function public.repuestos_cotizacion_anular(p_id uuid, p_actualizado_en_esperado timestamptz) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare c public.repuestos_cotizaciones;
begin
  perform public.assert_permiso('repuestos.cotizar');
  perform public.assert_permiso('repuestos.ver');
  select * into c from public.repuestos_cotizaciones x where x.id = p_id for update;
  if not found then
    raise exception 'Esta cotización ya no existe.' using errcode = 'PT409', hint = 'conflicto';
  end if;
  perform public._repuesto_cotizacion_proyecto(c.proyecto_id);
  perform public._exigir_version(c.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió esta cotización. Recarga para ver lo nuevo.');
  if c.estado = 'anulada' then
    raise exception 'Esta cotización ya está anulada.' using errcode = '23514', hint = 'estado';
  end if;
  update public.repuestos_cotizaciones x set estado = 'anulada' where x.id = p_id returning * into c;
  return jsonb_build_object('id', c.id, 'actualizado_en', c.actualizado_en, 'estado', c.estado);
end;
$$;

revoke all on function public.repuestos_cotizacion_aceptar(uuid, timestamptz) from public, anon;
revoke all on function public.repuestos_cotizacion_anular(uuid, timestamptz) from public, anon;
grant execute on function public.repuestos_cotizacion_aceptar(uuid, timestamptz) to authenticated, service_role;
grant execute on function public.repuestos_cotizacion_anular(uuid, timestamptz) to authenticated, service_role;

-- C17 · sin escritura directa.
drop policy "repuestos_cotizaciones: crear" on public.repuestos_cotizaciones;
drop policy "repuestos_cotizaciones: editar" on public.repuestos_cotizaciones;
drop policy "repuestos_cotizaciones_lineas: crear" on public.repuestos_cotizaciones_lineas;
drop policy "repuestos_cotizaciones_lineas: editar" on public.repuestos_cotizaciones_lineas;
drop policy "repuestos_cotizaciones_lineas: borrar" on public.repuestos_cotizaciones_lineas;
revoke insert, update, delete on table public.repuestos_cotizaciones from authenticated;
revoke insert, update, delete on table public.repuestos_cotizaciones_lineas from authenticated;

comment on table public.repuestos_cotizaciones is
  'Cotización de repuestos de un proyecto. Se escribe sólo por repuestos_cotizacion_crear, _guardar, _aceptar y _anular: el total y config_snapshot (la configuración congelada al crearla) los pone la base. Una sola aceptada por proyecto.';
comment on table public.repuestos_cotizaciones_lineas is
  'Líneas de una cotización de repuestos. Se escriben sólo por repuestos_cotizacion_guardar, que recalcula la logística sugerida y el total con el snapshot de su cotización.';

-- C18 · dónde se aplica `repuestos.cotizar`.
update public.permisos
   set aplicado_en = 'policy repuestos_cotizaciones, repuestos_cotizacion_crear, repuestos_cotizacion_guardar, repuestos_cotizacion_aceptar, repuestos_cotizacion_anular'
 where clave = 'repuestos.cotizar';
