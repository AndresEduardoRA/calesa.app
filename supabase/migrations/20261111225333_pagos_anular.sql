-- Pagos: anular uno confirmado sin romper lo que pide la fase (paso 6.10-2, C12–C15; cierra el abierto 6-3).
--   C12. `pago_anular(id, versión, motivo)`: `logistica.pagos.confirmar` primero (42501), un motivo de 1 a 500, el pago vivo (PT409), verlo (42501, el
--        mismo texto para uno ajeno o inexistente), sólo de vehículo (los de un proyecto, en el paso de repuestos) y sólo confirmado (uno sin confirmar
--        se elimina).
--   C13. El candado: los pagos confirmados vivos del vehículo, en orden de id, con `for update`: dos anulaciones a la vez no dejan cero (K4) y el orden fijo
--        evita el 40P01. Después, la versión.
--   C14. Un requisito `pagos.confirmado` o `pagos.umbral_pct` de la fase actual (bloqueante o no) que se cumplía y deja de cumplirse da 23514, y el `raise`
--        revierte el borrado suave. Límite conocido: no cubre la anulación a la vez que un cambio de fase (como los tributos de 6.10-1).
--        Deja `pago.anulado` en `actividad`, con el motivo. Sin columnas nuevas.
--   C15. `pago_sellado()`: un pago confirmado y anulado no vuelve (su `eliminado_en` sólo va de nulo a una fecha, D10).

create or replace function public.pago_sellado() returns trigger
language plpgsql
set search_path = ''
as $$
declare v_libres constant text[] := array['eliminado_en', 'actualizado_en', 'lead_id'];
begin
  if old.confirmado then
    if old.eliminado_en is not null and new.eliminado_en is distinct from old.eliminado_en then
      raise exception 'Un pago anulado no vuelve.' using errcode = '23514';
    end if;
    if (to_jsonb(new) - v_libres) is distinct from (to_jsonb(old) - v_libres) or (new.lead_id is distinct from old.lead_id and new.lead_id is not null) then
      raise exception 'Un pago confirmado no se edita.' using errcode = '23514';
    end if;
    return new;
  end if;
  if new.confirmado then
    if (select auth.uid()) is null then
      raise exception 'Confirmar un pago pide una sesión.' using errcode = '42501';
    end if;
    new.confirmado_por := (select auth.uid());
    new.confirmado_en := now();
  else
    new.confirmado_por := null;
    new.confirmado_en := null;
  end if;
  return new;
end;
$$;

-- C14 · lo que piden de pagos los requisitos `dato` de la fase actual del vehículo: {id del requisito: se cumple}. Usa fases_requisitos_fase_id_idx.
create function public._pagos_requisitos_de_fase(p_vehiculo uuid) returns jsonb
language sql stable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(r.id, public._requisito_dato_cumplido(p_vehiculo, null, r.clave_dato, r.config)), '{}'::jsonb)
    from public.vehiculos v join public.fases_requisitos r on r.fase_id = v.fase_id
   where v.id = p_vehiculo and r.tipo = 'dato' and r.clave_dato in ('pagos.confirmado', 'pagos.umbral_pct');
$$;

create function public.pago_anular(p_id uuid, p_actualizado_en_esperado timestamptz, p_motivo text) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare o public.pagos; v_motivo text := btrim(coalesce(p_motivo, '')); v_antes jsonb; v_despues jsonb; v_fase text;
begin
  perform public.assert_permiso('logistica.pagos.confirmar');
  if length(v_motivo) not between 1 and 500 then
    raise exception 'Escribe por qué anulas el pago (hasta 500 caracteres).' using errcode = '22023', hint = 'motivo';
  end if;
  select * into o from public.pagos x where x.id = p_id;
  if not found or o.eliminado_en is not null then
    raise exception 'Ese pago ya no existe.' using errcode = 'PT409';
  end if;
  if not (case when o.vehiculo_id is not null then public.puede_vehiculo(o.vehiculo_id, 'logistica.pagos.ver')
               else public.tiene_permiso('repuestos.costos.ver') end) then
    raise exception 'No encontramos este pago o no tienes acceso.' using errcode = '42501';
  end if;
  if o.vehiculo_id is null then
    raise exception 'Los pagos de un proyecto se anulan en el paso de repuestos.' using errcode = '22023', hint = 'id';
  end if;
  if not o.confirmado then
    raise exception 'Este pago no está confirmado: elimínalo en vez de anularlo.' using errcode = '23514', hint = 'id';
  end if;
  -- C13 · los confirmados vivos del vehículo, en orden de id (la propia incluida). Usa pagos_vehiculo_idx.
  perform 1 from public.pagos x where x.vehiculo_id = o.vehiculo_id and x.confirmado and x.eliminado_en is null order by x.id for update;
  select * into o from public.pagos x where x.id = p_id;
  if o.eliminado_en is not null then
    raise exception 'Ese pago ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este pago mientras lo anulabas.');
  v_antes := public._pagos_requisitos_de_fase(o.vehiculo_id);
  update public.pagos x set eliminado_en = now() where x.id = p_id returning * into o;
  v_despues := public._pagos_requisitos_de_fase(o.vehiculo_id);
  if exists (select 1 from jsonb_each(v_antes) a where a.value = 'true'::jsonb and v_despues -> a.key = 'false'::jsonb) then
    select f.nombre into v_fase from public.vehiculos v join public.fases f on f.id = v.fase_id where v.id = o.vehiculo_id;
    raise exception 'La fase «%» pide pagos confirmados: anular este pago la deja sin cumplir.', v_fase using errcode = '23514', hint = 'id';
  end if;
  perform public.registrar_actividad('pago.anulado', 'pagos', p_id::text, null, null,
                                     jsonb_build_object('motivo', v_motivo, 'monto', o.monto, 'moneda', o.moneda, 'monto_base', o.monto_base,
                                                        'confirmado_por', o.confirmado_por));
  return jsonb_build_object('id', p_id, 'actualizado_en', o.actualizado_en, 'anulado_en', o.eliminado_en);
end;
$$;

comment on function public.pago_anular(uuid, timestamptz, text) is 'Anula un pago confirmado de un vehículo (borrado suave que no vuelve), con motivo y constancia pago.anulado en actividad. Pide logistica.pagos.confirmar y ver el pago; no deja sin cumplir un requisito pagos.confirmado o pagos.umbral_pct de la fase actual (23514). Uno sin confirmar se elimina con pago_eliminar (6.10-2, C12–C14).';
revoke all on function public._pagos_requisitos_de_fase(uuid) from public, anon, authenticated;
grant execute on function public._pagos_requisitos_de_fase(uuid) to service_role;
revoke all on function public.pago_anular(uuid, timestamptz, text) from public, anon;
grant execute on function public.pago_anular(uuid, timestamptz, text) to authenticated, service_role;

update public.permisos set aplicado_en = 'pago_confirmar, pago_anular' where clave = 'logistica.pagos.confirmar';
