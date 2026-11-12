-- Aduana: la tabla protege la composición de una declaración (paso 6.07-2, C17–C19). Vale para todo camino que escriba declaraciones_vehiculos (la RPC,
-- service_role, otra función):
--   · con canal, ningún camino cambia qué vehículos están vivos en la declaración (D27);
--   · no se quita ni se borra una fila viva si la fase actual del vehículo exige aduana.declaracion o aduana.canal como bloqueante (D28);
--   · cambiar declaracion_id o vehiculo_id de una fila no se hace (la composición se cambia con declaracion_vehiculos_poner).
-- La purga en cascada de un vehículo no la frena nada (lo borró esta misma transacción); el borrado en cascada de la cabecera sí lo frena lo exigido.
--
-- Candados: por la RPC, la cabecera (`for update`) y la unidad (`for share`) ya son de la sesión antes de tocar la fila. En un update o delete directo
-- (service_role, superusuario) Postgres toma la fila antes del trigger y el orden queda fila → cabecera → unidad, al revés que la RPC: contra una RPC
-- sobre la misma declaración podría dar 40P01. Después de cerrar la escritura directa nadie escribe así, y la cascada desde la cabecera ya la trae tomada.

create function public.declaracion_vehiculo_proteger() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_cambia boolean; v_antes boolean; v_despues boolean; v_decl uuid; v_veh uuid; v_canal public.canal_aforo; v_hay boolean;
  v_fase uuid; v_clave text; v_nombre text;
begin
  if tg_op = 'UPDATE' then
    v_cambia := new.declaracion_id is distinct from old.declaracion_id or new.vehiculo_id is distinct from old.vehiculo_id;
    if v_cambia then
      raise exception 'La composición se cambia con declaracion_vehiculos_poner.' using errcode = '22023', hint = 'vehiculos';
    end if;
  end if;
  if tg_op = 'INSERT' then
    v_antes := false;
  else
    v_antes := old.removido_en is null;
  end if;
  if tg_op = 'DELETE' then
    v_despues := false;
    v_decl := old.declaracion_id;
    v_veh := old.vehiculo_id;
  else
    v_despues := new.removido_en is null;
    v_decl := new.declaracion_id;
    v_veh := new.vehiculo_id;
  end if;
  if v_antes = v_despues then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;
  -- C18 · la purga en cascada del vehículo: ya no está (por vehiculos_pkey, sin candado) y sale antes de mirar la cabecera.
  if tg_op = 'DELETE' and not exists (select 1 from public.vehiculos v where v.id = v_veh) then
    return old;
  end if;
  -- Congelado. Si la cabecera no está, se borra en cascada: no hay composición que congelar.
  select c.canal into v_canal from public.declaraciones_aduana c where c.id = v_decl for share;
  v_hay := found;
  if v_hay and v_canal is not null then
    raise exception 'La declaración ya tiene canal de aforo: su composición no cambia.' using errcode = '23514', hint = 'canal';
  end if;
  -- C19 · lo exigido, sólo al quitar o borrar una viva. La unidad `for share`: espera y hace esperar a cambiar_fase (for no key update).
  if v_antes and not v_despues then
    select v.fase_id into v_fase from public.vehiculos v where v.id = v_veh for share;
    if v_fase is not null then
      -- Por fases_requisitos_fase_id_idx.
      select q.clave_dato into v_clave from public.fases_requisitos q
       where q.fase_id = v_fase and q.tipo = 'dato' and q.bloqueante and q.clave_dato in ('aduana.declaracion', 'aduana.canal')
       order by q.clave_dato desc
       limit 1;
      if v_clave is not null then
        select f.nombre into v_nombre from public.fases f where f.id = v_fase;
        raise exception 'La fase «%» exige %: no se puede quitar el vehículo.', v_nombre,
          case v_clave when 'aduana.declaracion' then 'la declaración de aduana' else 'el canal de aforo' end
          using errcode = '23514', hint = v_clave;
      end if;
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

comment on function public.declaracion_vehiculo_proteger() is
  'Trigger before insert, delete o update de declaraciones_vehiculos: congela la composición con canal y no deja quitar un vehículo cuya fase exige '
  'aduana.declaracion o aduana.canal como bloqueante. 6.07-2.';
revoke all on function public.declaracion_vehiculo_proteger() from public, anon, authenticated;
grant execute on function public.declaracion_vehiculo_proteger() to service_role;

create trigger trg_declaracion_vehiculo_proteger
  before insert or delete or update of removido_en, declaracion_id, vehiculo_id on public.declaraciones_vehiculos
  for each row execute function public.declaracion_vehiculo_proteger();
