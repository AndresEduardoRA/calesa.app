-- Vínculo e interesados de un vehículo: escritura por RPC y lectura con nombre. Escrito a mano.
--
-- `vehiculos.lead_id` es el vínculo activo: con alcance «propios», da ver y editar el vehículo a
-- quien tiene ese lead en su cartera. Al cerrar la tabla quedó sin escritor (sólo lo ponía
-- `cotizacion_marcar_final`, y sólo si estaba vacío). Los interesados se escribían con INSERT y
-- DELETE directos. Ahora:
--   vehiculo_vincular()           — pone, cambia o quita el vínculo, con la versión del vehículo
--   vehiculo_interesado_marcar()  — idempotente; la nota se pone al marcar
--   vehiculo_interesado_quitar()  — idempotente
--   vehiculo_vinculos(), vehiculo_interesados() — lectura con el nombre del lead, bajo la RLS de
--                                   quien llama: un lead que no ve llega sin nombre
-- La interfaz que escribe llega con la ficha del lead (Fase 3).

-- ---------------------------------------------------------------------------
-- Índices que faltaban (FK y columnas que usa una policy)
-- ---------------------------------------------------------------------------
create index if not exists vehiculos_lead_idx on public.vehiculos (lead_id) where lead_id is not null;
create index if not exists vehiculos_vinculos_vehiculo_idx on public.vehiculos_vinculos (vehiculo_id, desde desc);
create index if not exists vehiculos_vinculos_lead_idx on public.vehiculos_vinculos (lead_id);
create index if not exists vehiculos_interesados_lead_idx on public.vehiculos_interesados (lead_id);

-- ---------------------------------------------------------------------------
-- Vínculo
-- ---------------------------------------------------------------------------
-- Exige poder editar el vehículo (misma regla que `vehiculo_guardar`) y, para poner un lead, poder
-- editar ese lead. `p_lead` nulo quita el vínculo. El historial lo escribe el trigger
-- `vehiculo_vinculo_historial`.
create or replace function public.vehiculo_vincular(p_vehiculo uuid, p_actualizado_en_esperado timestamptz, p_lead uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.vehiculos; v_version timestamptz;
begin
  perform public.assert_activo();
  select * into v from public.vehiculos x where x.id = p_vehiculo and x.eliminado_en is null for update;
  if not found then
    raise exception 'Ese vehículo ya no existe o está en la papelera.' using errcode = 'PT409';
  end if;
  if not public.puede_vehiculo(v.id, 'vehiculos.editar') then
    raise exception 'No tienes permiso para vincular este vehículo.' using errcode = '42501';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  -- Ya está como se lo pidió: un reintento no choca consigo mismo.
  if v.lead_id is not distinct from p_lead then
    return jsonb_build_object('actualizado_en', v.actualizado_en);
  end if;
  if p_lead is not null and not public.puede_lead(p_lead, 'leads.editar') then
    raise exception 'No tienes permiso sobre ese lead.' using errcode = '42501';
  end if;
  if v.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('vehiculos', v.id, v.actualizado_en, 'este vehículo');
  end if;
  update public.vehiculos x set lead_id = p_lead where x.id = v.id returning x.actualizado_en into v_version;
  return jsonb_build_object('actualizado_en', v_version);
end;
$$;
revoke all on function public.vehiculo_vincular(uuid, timestamptz, uuid) from public, anon;
grant execute on function public.vehiculo_vincular(uuid, timestamptz, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Interesados
-- ---------------------------------------------------------------------------
-- La regla que ya tenían las policies: ver el vehículo y poder editar el lead. Marcar y quitar
-- no editan nada (la nota se pone al marcar), por eso no llevan versión.
create or replace function public.vehiculo_interesado_marcar(p_vehiculo uuid, p_lead uuid, p_nota text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_nota text := nullif(btrim(p_nota), '');
begin
  perform public.assert_activo();
  if not public.puede_vehiculo(p_vehiculo, 'vehiculos.ver') then
    raise exception 'Ese vehículo no existe o no tienes acceso.' using errcode = '42501';
  end if;
  if not public.puede_lead(p_lead, 'leads.editar') then
    raise exception 'No tienes permiso sobre ese lead.' using errcode = '42501';
  end if;
  if char_length(v_nota) > 500 then
    raise exception 'La nota no puede pasar de 500 caracteres.' using errcode = '22023', hint = 'nota';
  end if;
  insert into public.vehiculos_interesados (vehiculo_id, lead_id, usuario_id, nota)
  values (p_vehiculo, p_lead, (select auth.uid()), v_nota)
  on conflict (vehiculo_id, lead_id) do nothing;
end;
$$;
revoke all on function public.vehiculo_interesado_marcar(uuid, uuid, text) from public, anon;
grant execute on function public.vehiculo_interesado_marcar(uuid, uuid, text) to authenticated;

create or replace function public.vehiculo_interesado_quitar(p_vehiculo uuid, p_lead uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_activo();
  if not public.puede_lead(p_lead, 'leads.editar') then
    raise exception 'No tienes permiso sobre ese lead.' using errcode = '42501';
  end if;
  delete from public.vehiculos_interesados i where i.vehiculo_id = p_vehiculo and i.lead_id = p_lead;
end;
$$;
revoke all on function public.vehiculo_interesado_quitar(uuid, uuid) from public, anon;
grant execute on function public.vehiculo_interesado_quitar(uuid, uuid) to authenticated;

-- Una sola puerta: se quita la escritura directa.
drop policy "vehiculos_interesados: crear" on public.vehiculos_interesados;
drop policy "vehiculos_interesados: borrar" on public.vehiculos_interesados;
revoke insert, update, delete on table public.vehiculos_interesados from authenticated;

-- ---------------------------------------------------------------------------
-- Lectura, con el nombre del lead
-- ---------------------------------------------------------------------------
-- `security invoker`: corren con la RLS de quien llama. El historial del vínculo se ve si se ve
-- el vehículo; el nombre del lead sólo llega si además ve ese lead (si no, nulo: la interfaz dice
-- «un lead que no está en tu cartera»). De `leads` sólo se leen columnas con grant: nunca el teléfono.
create or replace function public.vehiculo_vinculos(p_vehiculo uuid)
returns table (lead_id uuid, lead_nombre text, lead_numero bigint, desde timestamptz, hasta timestamptz, por_nombre text)
language sql stable security invoker set search_path = '' as $$
  select k.lead_id, l.nombre, l.numero, k.desde, k.hasta, p.nombre
  from public.vehiculos_vinculos k
  left join public.leads l on l.id = k.lead_id
  left join public.perfiles p on p.id = k.usuario_id
  where k.vehiculo_id = p_vehiculo
  -- El vigente primero; después, del más reciente al más viejo.
  order by (k.hasta is not null), k.desde desc, k.id desc
  limit 50;
$$;
revoke all on function public.vehiculo_vinculos(uuid) from public, anon;
grant execute on function public.vehiculo_vinculos(uuid) to authenticated;

-- La policy de `vehiculos_interesados` ya pide ver el vehículo y el lead: acá el nombre siempre está.
create or replace function public.vehiculo_interesados(p_vehiculo uuid)
returns table (lead_id uuid, lead_nombre text, lead_numero bigint, nota text, creado_en timestamptz, por_nombre text)
language sql stable security invoker set search_path = '' as $$
  select i.lead_id, l.nombre, l.numero, i.nota, i.creado_en, p.nombre
  from public.vehiculos_interesados i
  join public.leads l on l.id = i.lead_id
  left join public.perfiles p on p.id = i.usuario_id
  where i.vehiculo_id = p_vehiculo
  order by i.creado_en desc, i.lead_id
  limit 100;
$$;
revoke all on function public.vehiculo_interesados(uuid) from public, anon;
grant execute on function public.vehiculo_interesados(uuid) to authenticated;
