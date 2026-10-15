-- Teléfonos de un lead (Fase 3, parte 4b). Escrito a mano.
--
-- 1. `cambiar_telefono_lead(p_lead, p_actualizado_en_esperado, p_cc, p_tel)` reemplaza a la de tres
--    parámetros, que no llevaba versión, pedía `leads.editar` sin mirar la cartera (quien tiene
--    «todos» podía cambiar el teléfono de un lead ajeno), guardaba el código crudo, daba el duplicado
--    como excepción y no dejaba constancia. Sólo la cartera; un número que ya existe es un valor; el
--    mismo número es «sin cambios»; el anterior queda como extra «Anterior».
-- 2. `verificar_telefono_de_lead(p_lead, p_cc, p_tel)`: la verificación al tipear de la ficha. Exige la
--    cartera y se excluye a sí misma.
-- 3. `_lead_verificar(p_tel, p_excluir)` avisa, sin bloquear, que un número libre figura como teléfono
--    extra de otro lead (`alterno`).
-- 4. `lead_telefono_guardar()` y `lead_telefono_quitar()`: los extras, por fila e idempotentes por id.
--    No mueven la versión del lead (viven en otra tabla) y por eso no llevan versión propia: operan
--    sobre una fila, no sobre un documento que dos personas editan a la vez.
--
-- Idempotente: el índice también está en `supabase/schemas/05_leads/01_leads.sql`.

create index if not exists leads_telefonos_telefono_idx on public.leads_telefonos (telefono);

comment on table public.leads_telefonos is 'Teléfonos extra de un lead (alternos: sin unicidad entre leads, hasta 10 por lead). RLS no esconde columnas: la app no lee ni escribe esta tabla; los lee lead_telefonos(), que da el número completo a la cartera y enmascarado al resto, y los escriben sólo lead_telefono_guardar(), lead_telefono_quitar() y cambiar_telefono_lead() (el principal que se reemplaza queda aquí con la etiqueta «Anterior»).';

-- ---------------------------------------------------------------------------
-- Verificar un teléfono: ahora también dice si figura como extra de otro lead
-- ---------------------------------------------------------------------------
-- `p_tel` ya normalizado; `p_excluir` es un lead que no cuenta (el que se está editando).
-- Libre / existe (con su número y si es mío) / de otro (sólo quién lo tiene, nunca el lead) / en
-- limbo (sin dueño: no dice nada del lead). Si el principal está libre pero el número es un teléfono
-- extra de otro lead vivo, el resultado sigue siendo `libre` y lleva `alterno` con la misma regla de
-- qué se dice. No bloquea: un extra no tiene unicidad.
drop function if exists public._lead_verificar(text);
create or replace function public._lead_verificar(p_tel text, p_excluir uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare l record; d record; a record;
begin
  select x.id, x.numero, x.nombre, x.tipo into l
    from public.leads x
   where x.telefono_principal = p_tel and x.eliminado_en is null and x.id is distinct from p_excluir;
  if not found then
    select x.id, x.numero, x.nombre into a
      from public.leads_telefonos t join public.leads x on x.id = t.lead_id
     where t.telefono = p_tel and x.eliminado_en is null and x.id is distinct from p_excluir
       and not public.lead_en_limbo(x.id)
     order by public.puede_lead(x.id, 'leads.ver') desc, public.en_cartera(x.id) desc, t.creado_en, t.id
     limit 1;
    if not found then
      return jsonb_build_object('estado', 'libre');
    end if;
    if public.puede_lead(a.id, 'leads.ver') then
      return jsonb_build_object('estado', 'libre', 'alterno', jsonb_build_object(
        'estado', 'existe', 'lead_id', a.id, 'numero', a.numero, 'nombre', a.nombre,
        'es_mio', public.en_cartera(a.id)));
    end if;
    select p.nombre into d
      from public.leads_asesores la join public.perfiles p on p.id = la.usuario_id
     where la.lead_id = a.id and la.revocado_en is null
     order by (la.tipo_acceso = 'dueno') desc, la.desde
     limit 1;
    return jsonb_build_object('estado', 'libre', 'alterno', jsonb_build_object('estado', 'de_otro', 'dueno', d.nombre));
  end if;
  if public.lead_en_limbo(l.id) then
    return jsonb_build_object('estado', 'limbo');
  end if;
  if public.puede_lead(l.id, 'leads.ver') then
    return jsonb_build_object('estado', 'existe', 'lead_id', l.id, 'numero', l.numero, 'nombre', l.nombre,
                              'tipo', l.tipo, 'es_mio', public.en_cartera(l.id));
  end if;
  select p.id, p.nombre into d
    from public.leads_asesores la join public.perfiles p on p.id = la.usuario_id
   where la.lead_id = l.id and la.revocado_en is null
   order by (la.tipo_acceso = 'dueno') desc, la.desde
   limit 1;
  return jsonb_build_object('estado', 'de_otro', 'dueno', d.nombre, 'dueno_id', d.id);
end;
$$;
revoke all on function public._lead_verificar(text, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Piezas internas: el lead de la cartera y lo que se devuelve
-- ---------------------------------------------------------------------------
-- Quien no ve el lead (inexistente, limbo, papelera, ajeno) recibe el mismo mensaje; quien lo ve pero
-- no lo tiene en su cartera, o no puede editar, recibe el suyo. Bloquea la fila del lead (sin
-- cambiarla: no mueve la versión) para que dos personas no pasen del tope de extras a la vez.
create or replace function public._lead_de_cartera(p_lead uuid)
returns public.leads language plpgsql security definer set search_path = '' as $$
declare l public.leads;
begin
  perform public.assert_activo();
  if not public.puede_lead(p_lead, 'leads.ver') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  select * into l from public.leads x where x.id = p_lead and x.eliminado_en is null for update;
  if not found then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  if not public.puede_lead(l.id, 'leads.editar') or not public.en_cartera(l.id) then
    raise exception 'Sólo quien tiene este lead en su cartera puede cambiar sus teléfonos.' using errcode = '42501';
  end if;
  return l;
end;
$$;
revoke all on function public._lead_de_cartera(uuid) from public, anon, authenticated;

-- El estado de los teléfonos del lead tal como lo ve quien lo tiene en su cartera (completos).
create or replace function public._lead_telefonos_estado(p_lead uuid, p_resultado text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'resultado', p_resultado,
    'actualizado_en', l.actualizado_en,
    'telefono_cc', l.telefono_cc,
    'telefono', l.telefono_principal,
    'telefonos', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'telefono', t.telefono, 'etiqueta', t.etiqueta,
                                          'creado_en', t.creado_en) order by t.creado_en, t.id)
        from public.leads_telefonos t where t.lead_id = l.id), '[]'::jsonb))
  from public.leads l where l.id = p_lead;
$$;
revoke all on function public._lead_telefonos_estado(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- La verificación al tipear de la ficha
-- ---------------------------------------------------------------------------
-- `p_cc` vacío = el de la empresa. `mismo`: es el principal de este lead (nada que cambiar). Lo
-- demás es `_lead_verificar` sin contarse a sí mismo; `es_extra` dice que ya es un extra de este lead
-- (al cambiarlo, sale de los extras).
create or replace function public.verificar_telefono_de_lead(p_lead uuid, p_cc text, p_tel text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare l public.leads; v_tel text; v jsonb;
begin
  perform public.assert_activo();
  if not public.puede_lead(p_lead, 'leads.ver') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  select * into l from public.leads x where x.id = p_lead and x.eliminado_en is null;
  if not found then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  if not public.puede_lead(l.id, 'leads.editar') or not public.en_cartera(l.id) then
    raise exception 'Sólo quien tiene este lead en su cartera puede cambiar sus teléfonos.' using errcode = '42501';
  end if;
  v_tel := public.normalizar_telefono(
    coalesce(nullif(btrim(p_cc), ''), (select e.telefono_cc from public.ajustes_empresa e where e.id = 1)), p_tel);
  if v_tel = l.telefono_principal then
    return jsonb_build_object('estado', 'mismo');
  end if;
  v := public._lead_verificar(v_tel, l.id);
  if (v ->> 'estado') = 'libre'
     and exists (select 1 from public.leads_telefonos t where t.lead_id = l.id and t.telefono = v_tel) then
    v := v || jsonb_build_object('es_extra', true);
  end if;
  return v;
end;
$$;
revoke all on function public.verificar_telefono_de_lead(uuid, text, text) from public, anon;
grant execute on function public.verificar_telefono_de_lead(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Cambiar el principal
-- ---------------------------------------------------------------------------
drop function if exists public.cambiar_telefono_lead(uuid, text, text);

-- Devuelve `{resultado, actualizado_en, telefono_cc, telefono, telefonos}`. `resultado`:
--   `cambiado`, `sin_cambios` (ya era ese: también el reintento tras una respuesta perdida, que llega
--   con la versión de antes), o `existe` / `de_otro` / `limbo` con la `verificacion` (nada cambia y
--   nadie adopta). Una versión vieja con un número libre es `PT409`.
-- El anterior queda como extra «Anterior» (si ya era extra no se duplica ni cambia su etiqueta), y si el
-- nuevo era extra de este lead sale de los extras. El tope de 10 lo aplica «agregar», no esto.
create or replace function public.cambiar_telefono_lead(p_lead uuid, p_actualizado_en_esperado timestamptz, p_cc text, p_tel text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  l public.leads;
  v_cc text;
  v_cc_digitos text;
  v_tel text;
  v_verif jsonb;
  v_estado text;
begin
  l := public._lead_de_cartera(p_lead);
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  v_cc := coalesce(nullif(btrim(p_cc), ''), (select e.telefono_cc from public.ajustes_empresa e where e.id = 1));
  v_tel := public.normalizar_telefono(v_cc, p_tel);
  -- El mismo número no es un conflicto aunque la versión sea otra: un reintento no choca consigo mismo.
  if v_tel = l.telefono_principal then
    return public._lead_telefonos_estado(l.id, 'sin_cambios');
  end if;
  v_verif := public._lead_verificar(v_tel, l.id);
  v_estado := v_verif ->> 'estado';
  if v_estado in ('existe', 'de_otro', 'limbo') then
    return jsonb_build_object('resultado', v_estado, 'verificacion', v_verif);
  end if;
  if l.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._lead_conflicto(l.id, l.actualizado_en);
  end if;

  v_cc_digitos := regexp_replace(coalesce(v_cc, ''), '\D', '', 'g');
  begin
    update public.leads x set
      telefono_cc = case when v_cc_digitos <> '' and v_tel like v_cc_digitos || '%' then '+' || v_cc_digitos end,
      telefono_principal = v_tel
    where x.id = l.id;
  exception when unique_violation then
    -- Otra persona tomó ese número justo ahora: se dice como valor, no como error.
    v_verif := public._lead_verificar(v_tel, l.id);
    v_estado := v_verif ->> 'estado';
    if v_estado in ('existe', 'de_otro', 'limbo') then
      return jsonb_build_object('resultado', v_estado, 'verificacion', v_verif);
    end if;
    raise exception 'Ese teléfono cambió mientras guardabas. Vuelve a intentarlo.' using errcode = 'PT409';
  end;

  delete from public.leads_telefonos t where t.lead_id = l.id and t.telefono = v_tel;
  insert into public.leads_telefonos (lead_id, telefono, etiqueta)
  values (l.id, l.telefono_principal, 'Anterior')
  on conflict (lead_id, telefono) do nothing;

  perform public.registrar_actividad('lead.telefono_cambiado', 'leads', l.id::text, null, null,
    jsonb_build_object('anterior', public.enmascarar_telefono(l.telefono_principal),
                       'nuevo', public.enmascarar_telefono(v_tel)));
  return public._lead_telefonos_estado(l.id, 'cambiado');
end;
$$;
revoke all on function public.cambiar_telefono_lead(uuid, timestamptz, text, text) from public, anon;
grant execute on function public.cambiar_telefono_lead(uuid, timestamptz, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Los extras
-- ---------------------------------------------------------------------------
-- Agregar, rotular y restituir son la misma operación, por id: un id nuevo agrega; uno que ya está,
-- con el mismo número, cambia la etiqueta (o no cambia nada: un reintento); con otro número se
-- rechaza. `p_creado_en` deja a un «Deshacer» volver a su lugar en la lista (nunca en el futuro).
-- Devuelve `{resultado: agregado | rotulado | sin_cambios, …el estado de los teléfonos}`.
create or replace function public.lead_telefono_guardar(
  p_lead uuid, p_id uuid, p_cc text, p_tel text, p_etiqueta text default null, p_creado_en timestamptz default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  l public.leads;
  t public.leads_telefonos;
  v_cc text;
  v_tel text;
  v_etiqueta text;
  v_msg text;
begin
  l := public._lead_de_cartera(p_lead);
  if p_id is null then
    raise exception 'Falta el identificador del teléfono.' using errcode = '22023';
  end if;
  v_etiqueta := nullif(btrim(coalesce(p_etiqueta, '')), '');
  if char_length(v_etiqueta) > 40 then
    raise exception 'La etiqueta admite hasta 40 caracteres.' using errcode = '22023', hint = 'etiqueta';
  end if;
  v_cc := coalesce(nullif(btrim(p_cc), ''), (select e.telefono_cc from public.ajustes_empresa e where e.id = 1));
  begin
    v_tel := public.normalizar_telefono(v_cc, p_tel);
  exception when sqlstate '22023' then
    get stacked diagnostics v_msg = message_text;
    raise exception '%', v_msg using errcode = '22023', hint = 'telefono';
  end;

  select * into t from public.leads_telefonos x where x.id = p_id;
  if found then
    if t.lead_id <> l.id then
      raise exception 'No pudimos guardar este teléfono. Vuelve a intentarlo.' using errcode = '22023';
    end if;
    if t.telefono <> v_tel then
      raise exception 'Para cambiar el número, quita este teléfono y agrega el nuevo.'
        using errcode = '22023', hint = 'telefono';
    end if;
    if t.etiqueta is distinct from v_etiqueta then
      update public.leads_telefonos x set etiqueta = v_etiqueta where x.id = t.id;
      perform public.registrar_actividad('lead.telefono_extra_rotulado', 'leads', l.id::text, null, null,
        jsonb_build_object('telefono', public.enmascarar_telefono(v_tel)));
      return public._lead_telefonos_estado(l.id, 'rotulado');
    end if;
    return public._lead_telefonos_estado(l.id, 'sin_cambios');
  end if;

  if v_tel = l.telefono_principal
     or exists (select 1 from public.leads_telefonos x where x.lead_id = l.id and x.telefono = v_tel) then
    raise exception 'Ese número ya está en este lead.' using errcode = '22023', hint = 'telefono';
  end if;
  if (select count(*) from public.leads_telefonos x where x.lead_id = l.id) >= 10 then
    raise exception 'Un lead admite hasta 10 teléfonos extra. Quita uno para agregar otro.'
      using errcode = '22023', hint = 'telefono';
  end if;
  insert into public.leads_telefonos (id, lead_id, telefono, etiqueta, creado_en)
  values (p_id, l.id, v_tel, v_etiqueta, least(coalesce(p_creado_en, now()), now()));
  perform public.registrar_actividad('lead.telefono_extra_agregado', 'leads', l.id::text, null, null,
    jsonb_build_object('telefono', public.enmascarar_telefono(v_tel)));
  return public._lead_telefonos_estado(l.id, 'agregado');
end;
$$;
revoke all on function public.lead_telefono_guardar(uuid, uuid, text, text, text, timestamptz) from public, anon;
grant execute on function public.lead_telefono_guardar(uuid, uuid, text, text, text, timestamptz) to authenticated;

-- Quitar uno que ya no está (o que es de otro lead) no es un error ni dice nada: `sin_cambios`.
-- Devuelve `{resultado: quitado | sin_cambios, quitado: {id, telefono, etiqueta, creado_en} | null, …}`:
-- con eso se restituye (mismo id, etiqueta y lugar).
create or replace function public.lead_telefono_quitar(p_lead uuid, p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  l public.leads;
  t public.leads_telefonos;
begin
  l := public._lead_de_cartera(p_lead);
  delete from public.leads_telefonos x where x.id = p_id and x.lead_id = l.id returning * into t;
  if not found then
    return public._lead_telefonos_estado(l.id, 'sin_cambios') || jsonb_build_object('quitado', null);
  end if;
  perform public.registrar_actividad('lead.telefono_extra_quitado', 'leads', l.id::text, null, null,
    jsonb_build_object('telefono', public.enmascarar_telefono(t.telefono)));
  return public._lead_telefonos_estado(l.id, 'quitado') || jsonb_build_object('quitado',
    jsonb_build_object('id', t.id, 'telefono', t.telefono, 'etiqueta', t.etiqueta, 'creado_en', t.creado_en));
end;
$$;
revoke all on function public.lead_telefono_quitar(uuid, uuid) from public, anon;
grant execute on function public.lead_telefono_quitar(uuid, uuid) to authenticated;
