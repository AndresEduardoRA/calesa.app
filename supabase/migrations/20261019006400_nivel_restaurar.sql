-- Restaurar un nivel retirado (paso 4.09, prompt 2; `docs/PLAN.md` 4-12): lo que `nivel_retirar()` no podía deshacer.
--
-- Quita `retirado_en`. No cambia la clave, el nombre, los dos permisos, sus concesiones ni el tope (un retirado ya contaba): sólo vuelve a ofrecerse.
-- Mismas convenciones que las otras tres: `equipo.roles.gestionar`, el candado de la fila (`for no key update`, sin candado de tabla: no toca el tope,
-- el nombre ni la clave), la versión esperada (PT409) y `actividad`.
--
-- Lo que ya está hecho no choca (como `lead_guardar` y `cambiar_telefono_lead`): si el nivel no está retirado —«todos» nunca lo está— responde
-- `sin_cambios` sin mirar la versión y sin escribir nada, así un doble «Deshacer» no da conflicto. Uno retirado sí exige la versión.

create or replace function public.nivel_restaurar(p_id uuid, p_actualizado_en_esperado timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.cotizaciones_niveles; v_version timestamptz;
begin
  perform public.assert_permiso('equipo.roles.gestionar');
  select * into o from public.cotizaciones_niveles x where x.id = p_id for no key update;
  if not found then
    raise exception 'Ese nivel ya no existe.' using errcode = 'PT409';
  end if;
  if o.retirado_en is null then
    return jsonb_build_object('id', p_id, 'actualizado_en', o.actualizado_en, 'sin_cambios', true, 'lista', public._niveles_lista());
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este nivel mientras lo editabas.');
  update public.cotizaciones_niveles set retirado_en = null where id = p_id returning actualizado_en into v_version;
  perform public.registrar_actividad('nivel.restaurar', 'cotizaciones_niveles', p_id::text, jsonb_build_object('nombre', o.nombre), jsonb_build_object('clave', o.clave));
  return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'lista', public._niveles_lista());
end;
$$;
revoke all on function public.nivel_restaurar(uuid, timestamptz) from public, anon;
grant execute on function public.nivel_restaurar(uuid, timestamptz) to authenticated;
