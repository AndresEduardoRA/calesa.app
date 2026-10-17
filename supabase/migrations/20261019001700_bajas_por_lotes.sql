-- La baja de una persona con muchos leads, por lotes reanudables (cierre 1 de la Fase 3).
--
-- Medido (9h): la baja revocaba en una sentencia todas las filas de `leads_asesores` de la persona y el trigger de la cartera
-- reescribía la fila de cada lead (~70 µs): 113 ms con 7.000 leads, 6,7 s con 80.000 y, pasados ~95.000, el corte de 8 s de
-- `authenticated`. Una sola transacción larga, además, deja bloqueados todos esos leads mientras corre.
--
-- Ahora la baja va en dos tiempos:
-- - `equipo_dar_de_baja` hace lo instantáneo (la cuenta, la cola de la web) y anota la baja en `equipo_bajas`; corre el
--   primer lote en la misma llamada (una base chica termina acá) y devuelve `{ terminada, leads_al_limbo }`.
-- - `_baja_lote(persona, n)` toma primero **los leads** (`order by id … for update skip locked`: el mismo orden que compartir y
--   transferir, `leads` y después `leads_asesores`; el lote nunca espera un lead, así que no se interbloquea), revoca las filas
--   de la persona en esos leads, cuenta los que quedaron sin nadie y cancela de a n sus oportunidades abiertas. Lo pendiente lo
--   dicen los datos: cortado a la mitad, el lote se revierte entero y el siguiente sigue sin duplicar ni perder.
-- - El job `equipo-bajas` (cada minuto, hasta 10 lotes por corrida) termina lo que quede.
--
-- Mientras dura, nadie ve un estado a medias: `_bajas_en_curso()` (un InitPlan sobre `equipo_bajas`, casi siempre vacío)
-- entra a la regla de visibilidad, que pasa de «cartera no vacía» a «alguien de la cartera que no está en baja»
-- (`not (cartera <@ fuera)`; con `fuera = '{}'` es lo mismo que antes). `lead_en_limbo`, «Quién lo tiene», el dueño, la
-- verificación del teléfono y la vista previa cuentan a quien está en baja como ya fuera. Lo que escribe la cartera
-- (compartir, transferir, quitar acceso, salir y adoptar del limbo) aplica primero la baja a ese lead, con el lead ya
-- bloqueado (`_lead_aplicar_bajas`), y sigue sobre el estado final. Compartir o transferir **a** quien se está dando de baja
-- toma su perfil `for share`: espera a la baja y falla con el mensaje de siempre.

-- ---------------------------------------------------------------------------------------------------------------------
-- La tabla (en schemas/02_equipo) y quién la lee.
-- ---------------------------------------------------------------------------------------------------------------------
-- En una base viva (la base generada ya los trae).
create table if not exists public.equipo_bajas (
  usuario_id               uuid primary key references public.perfiles (id) on delete cascade,
  por                      uuid references public.perfiles (id) on delete set null,
  empezada_en              timestamptz not null default now(),
  terminada_en             timestamptz,
  leads_al_limbo           integer not null default 0 check (leads_al_limbo >= 0),
  oportunidades_canceladas integer not null default 0 check (oportunidades_canceladas >= 0)
);
create index if not exists equipo_bajas_en_curso_idx on public.equipo_bajas (usuario_id) where terminada_en is null;
create index if not exists equipo_bajas_por_idx on public.equipo_bajas (por);
alter table public.equipo_bajas enable row level security;
create index if not exists oportunidades_abiertas_usuario_idx on public.oportunidades (usuario_id, id) where estado = 'abierta';

revoke all on table public.equipo_bajas from anon, authenticated;
grant select on table public.equipo_bajas to authenticated;
grant select, insert, update, delete on table public.equipo_bajas to service_role;
drop policy if exists "equipo_bajas: leer" on public.equipo_bajas;
create policy "equipo_bajas: leer" on public.equipo_bajas for select to authenticated
  using ((select public.tiene_permiso('equipo.usuarios.ver')));

-- Quienes están en baja en curso. Casi siempre vacío; en una policy va como `(select …)`: una vez por consulta.
create or replace function public._bajas_en_curso()
returns uuid[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(b.usuario_id order by b.usuario_id), '{}'::uuid[])
    from public.equipo_bajas b
   where b.terminada_en is null;
$$;
revoke all on function public._bajas_en_curso() from public, anon;
grant execute on function public._bajas_en_curso() to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------------------
-- La regla, con quien está en baja ya fuera de la cartera.
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public._lead_visible_para(p_eliminado_en timestamptz, p_cartera uuid[], p_alcance public.alcance_permiso, p_yo uuid, p_fuera uuid[])
returns boolean language sql immutable parallel safe as $$
  select p_eliminado_en is null
     and not (p_cartera <@ p_fuera)
     and nullif(case p_alcance when 'todos' then true when 'propios' then p_yo = any (p_cartera) end, false) is not null
$$;
comment on function public._lead_visible_para(timestamptz, uuid[], public.alcance_permiso, uuid, uuid[]) is
  'La regla de quién ve un lead (9h; cierre 1): vivo, con alguien en la cartera que no está en baja (p_fuera = _bajas_en_curso()) y con «todos», o con «propios» y en la cartera. Se inlinea en la policy de leads; la usan también puede_lead() y atributos_lead(). La forma con nullif … is not null es para que el planificador la estime en ~1 (docs/DECISIONES.md, 9h).';

alter policy "leads: leer" on public.leads
  using (public._lead_visible_para(eliminado_en, cartera, (select public.alcance_de('leads.ver')), (select auth.uid()),
                                   (select public._bajas_en_curso())));

create or replace function public.puede_lead(p_lead uuid, p_clave text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.leads l
     where l.id = p_lead
       and public._lead_visible_para(l.eliminado_en, l.cartera, public.alcance_de(p_clave), (select auth.uid()),
                                     (select public._bajas_en_curso()))
  );
$$;

create or replace function public.atributos_lead(p_lead uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_yo uuid := (select auth.uid());
  -- Fuera de la consulta: llamada desde adentro, la función SQL se vuelve a planificar en cada llamada (265 µs contra 66).
  v_alcance public.alcance_permiso := public.alcance_de('leads.ver');
  v_fuera uuid[] := public._bajas_en_curso();
  v_atributos jsonb;
  v_cartera boolean;
  v_visible boolean;
begin
  select l.atributos, v_yo = any (l.cartera), public._lead_visible_para(l.eliminado_en, l.cartera, v_alcance, v_yo, v_fuera)
    into v_atributos, v_cartera, v_visible
  from public.leads l
  where l.id = p_lead;
  if not found or not v_visible then
    return null;
  end if;
  if v_cartera then
    return v_atributos;
  end if;
  return coalesce((
    select jsonb_object_agg(e.key, e.value)
    from jsonb_each(v_atributos) e
    where exists (select 1 from public.leads_campos c where c.clave = e.key and not c.solo_cartera)
  ), '{}'::jsonb);
end;
$$;
alter function public.atributos_lead(uuid) cost 20000;

drop function if exists public._lead_visible_para(timestamptz, uuid[], public.alcance_permiso, uuid);

-- La regla de siempre (la fuente con la que `derivados-leads.sql` compara), con la misma excepción.
create or replace function public.lead_en_limbo(p_lead uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.leads_asesores la
                      where la.lead_id = p_lead and la.revocado_en is null
                        and la.usuario_id <> all ((select public._bajas_en_curso())::uuid[]));
$$;

create or replace function public._lead_dueno(p_lead uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select a.usuario_id from public.leads_asesores a
  where a.lead_id = p_lead and a.tipo_acceso = 'dueno' and a.revocado_en is null
    and a.usuario_id <> all ((select public._bajas_en_curso())::uuid[]);
$$;

-- Quién tiene un lead: nombres y tipo de acceso. Nada de correo ni teléfono. Quien está en baja ya no figura.
create or replace function public._lead_cartera_json(p_lead uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'usuario_id', a.usuario_id,
      'nombre', coalesce(nullif(btrim(p.nombre), ''), 'Sin nombre'),
      'tipo_acceso', a.tipo_acceso,
      'desde', a.desde,
      'compartido_por', nullif(btrim(q.nombre), ''),
      'es_yo', a.usuario_id = (select auth.uid()))
    order by (a.tipo_acceso = 'dueno') desc, a.desde, a.usuario_id), '[]'::jsonb)
  from public.leads_asesores a
  join public.perfiles p on p.id = a.usuario_id
  left join public.perfiles q on q.id = a.compartido_por
  where a.lead_id = p_lead and a.revocado_en is null
    and a.usuario_id <> all ((select public._bajas_en_curso())::uuid[]);
$$;

-- El destino de compartir o transferir: existe, activo, no bloqueado y con `leads.ver`. Su perfil `for share`: una baja
-- que llega a la vez lo tiene `for update`, así que esto espera y después ve la cuenta apagada (sin el candado, la fila
-- nueva de `leads_asesores` quedaba vigente para alguien ya dado de baja).
create or replace function public._lead_destino_validar(p_usuario uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_usuario is null then
    raise exception 'No encontramos a esa persona.' using errcode = '22023', hint = 'usuario';
  end if;
  perform 1 from public.perfiles p where p.id = p_usuario for share;
  if not found then
    raise exception 'No encontramos a esa persona.' using errcode = '22023', hint = 'usuario';
  end if;
  if not exists (select 1 from public.perfiles p where p.id = p_usuario and p.activo and not p.bloqueado) then
    raise exception 'Esa persona no está activa en el equipo.' using errcode = '22023', hint = 'usuario';
  end if;
  if not public.usuario_tiene_permiso(p_usuario, 'leads.ver') then
    raise exception 'Esa persona no puede ver leads.' using errcode = '22023', hint = 'usuario';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------
-- Aplicar la baja: a un lead (desde las RPC que escriben la cartera) y por lotes.
-- ---------------------------------------------------------------------------------------------------------------------

-- Con el lead ya bloqueado por quien llama: revoca las filas de quienes están en baja y, si el lead quedó sin nadie, lo
-- cuenta en la baja de la primera de esas personas (un lead se cuenta una vez aunque dos bajas lo toquen).
create or replace function public._lead_aplicar_bajas(p_lead uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_quien uuid;
begin
  with hechas as (
    update public.leads_asesores la set revocado_en = now(), revocado_por = b.por
      from public.equipo_bajas b
     where la.lead_id = p_lead and la.revocado_en is null
       and b.usuario_id = la.usuario_id and b.terminada_en is null
    returning la.usuario_id
  )
  select (array_agg(h.usuario_id order by h.usuario_id))[1] into v_quien from hechas h;
  if v_quien is not null
     and exists (select 1 from public.leads l where l.id = p_lead and l.eliminado_en is null and l.cartera = '{}') then
    update public.equipo_bajas set leads_al_limbo = leads_al_limbo + 1 where usuario_id = v_quien;
  end if;
end;
$$;
revoke all on function public._lead_aplicar_bajas(uuid) from public, anon, authenticated;

-- Un lote de la baja de una persona: hasta p_lote de sus leads, a partir de p_desde (el último lead del lote anterior de
-- la misma corrida; nulo = desde el principio). Devuelve el último lead que tomó, o nulo si no tomó ninguno.
-- **El cursor no es un adorno:** cada lote revoca filas del índice parcial (`revocado_en is null`) y, dentro de la misma
-- transacción, esas entradas no se pueden descartar todavía; un lote que vuelve a empezar desde el principio las recorre
-- todas, y una corrida de 10 lotes crecía con lo hecho (5,6 s con 200.000). Con cursor, cada lote empieza donde quedó el
-- anterior. Con y sin cursor son dos consultas: un `p_desde is null or …` deja de ser condición de índice.
create or replace function public._baja_lote_desde(p_usuario uuid, p_lote int, p_desde uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_baja public.equipo_bajas;
  v_ids uuid[];
  v_leads uuid[];
  v_limbo int := 0;
  v_canceladas int;
  v_n int := greatest(coalesce(p_lote, 0), 1);
begin
  select * into v_baja from public.equipo_bajas b where b.usuario_id = p_usuario and b.terminada_en is null;
  if not found then
    return null;
  end if;
  -- Los ids que siguen, por leads_asesores_usuario_vigente_idx (usuario_id, lead_id) where revocado_en is null: ordenados y
  -- con `limit`, sin unir con `leads` (unidas, con una cartera que es un tercio de la tabla, el planificador prefería
  -- recorrer las dos y ordenar: crece con la tabla, no con la persona).
  if p_desde is null then
    v_ids := array(select la.lead_id from public.leads_asesores la
                    where la.usuario_id = p_usuario and la.revocado_en is null
                    order by la.lead_id limit v_n);
  else
    v_ids := array(select la.lead_id from public.leads_asesores la
                    where la.usuario_id = p_usuario and la.revocado_en is null and la.lead_id > p_desde
                    order by la.lead_id limit v_n);
  end if;
  -- Después los leads, por su clave, en orden de id y sin esperar: uno que otra RPC tiene bloqueado lo toma la corrida
  -- siguiente (el cursor avanza igual: lo saltado no vuelve en esta corrida).
  v_leads := array(select l.id from public.leads l where l.id = any (v_ids) order by l.id for update skip locked);
  if cardinality(v_leads) > 0 then
    -- La sentencia dispara el recálculo de la cartera de esos leads (ya bloqueados: el trigger no espera).
    update public.leads_asesores la set revocado_en = now(), revocado_por = v_baja.por
     where la.lead_id = any (v_leads) and la.usuario_id = p_usuario and la.revocado_en is null;
    select count(*) into v_limbo from public.leads l
     where l.id = any (v_leads) and l.eliminado_en is null and l.cartera = '{}';
  end if;
  -- Sus oportunidades abiertas (sólo las ve su dueña: nadie ve el estado intermedio). oportunidades_abiertas_usuario_idx.
  with lote as (
    select o.id from public.oportunidades o
     where o.usuario_id = p_usuario and o.estado = 'abierta'
     order by o.id limit v_n
       for update skip locked
  )
  update public.oportunidades o set estado = 'cancelada' from lote where o.id = lote.id;
  get diagnostics v_canceladas = row_count;

  if v_limbo > 0 or v_canceladas > 0 then
    update public.equipo_bajas
       set leads_al_limbo = leads_al_limbo + v_limbo, oportunidades_canceladas = oportunidades_canceladas + v_canceladas
     where usuario_id = p_usuario;
  end if;
  return v_ids[cardinality(v_ids)];
end;
$$;
revoke all on function public._baja_lote_desde(uuid, int, uuid) from public, anon, authenticated;

-- Si a la persona ya no le queda nada (ni una fila vigente ni una oportunidad abierta), cierra la baja y lo registra.
create or replace function public._baja_terminar(p_usuario uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_baja public.equipo_bajas;
begin
  if exists (select 1 from public.leads_asesores la where la.usuario_id = p_usuario and la.revocado_en is null)
     or exists (select 1 from public.oportunidades o where o.usuario_id = p_usuario and o.estado = 'abierta') then
    return false;
  end if;
  update public.equipo_bajas set terminada_en = now() where usuario_id = p_usuario and terminada_en is null
  returning * into v_baja;
  if found then
    perform public.registrar_actividad('usuario.baja_terminada', 'perfiles', p_usuario::text, null,
      jsonb_build_object('leads_al_limbo', v_baja.leads_al_limbo, 'oportunidades_canceladas', v_baja.oportunidades_canceladas));
  end if;
  return true;
end;
$$;
revoke all on function public._baja_terminar(uuid) from public, anon, authenticated;

-- Un lote desde el principio, y si con eso terminó: lo que hace la llamada (el primer lote) y lo que usan las pruebas.
create or replace function public._baja_lote(p_usuario uuid, p_lote int)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.equipo_bajas b where b.usuario_id = p_usuario and b.terminada_en is null) then
    return true;
  end if;
  perform public._baja_lote_desde(p_usuario, p_lote, null);
  return public._baja_terminar(p_usuario);
end;
$$;
revoke all on function public._baja_lote(uuid, int) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- La vista previa y la baja.
-- ---------------------------------------------------------------------------------------------------------------------

-- Cuántos leads de una persona quedarían sin nadie, hasta un tope (la pantalla dice «más de 1.000»): un número que se
-- muestra nunca es el total exacto. Quien ya está en baja no cuenta como alguien que se queda con el lead.
drop function if exists public._leads_al_limbo_de(uuid);
create or replace function public._leads_al_limbo_de(p_usuario uuid, p_tope int)
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from (
    select 1 from public.leads_asesores a join public.leads l on l.id = a.lead_id
     where a.usuario_id = p_usuario and a.revocado_en is null and l.eliminado_en is null
       and not exists (select 1 from public.leads_asesores b
                        where b.lead_id = a.lead_id and b.usuario_id <> p_usuario and b.revocado_en is null
                          and b.usuario_id <> all ((select public._bajas_en_curso())::uuid[]))
     limit p_tope + 1
  ) x;
$$;
revoke all on function public._leads_al_limbo_de(uuid, int) from public, anon, authenticated;

create or replace function public.equipo_vista_previa_baja(p_usuario uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_permiso('equipo.usuarios.gestionar');
  -- Hasta 1.001 cada uno: la pantalla dice «más de 1.000» (conteoAcotado).
  return jsonb_build_object(
    'leads_al_limbo', public._leads_al_limbo_de(p_usuario, 1000),
    'oportunidades_abiertas', (select count(*) from (select 1 from public.oportunidades o
                                                       where o.usuario_id = p_usuario and o.estado = 'abierta' limit 1001) x));
end;
$$;

drop function if exists public.equipo_dar_de_baja(uuid);
create function public.equipo_dar_de_baja(p_usuario uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_activo boolean; v_nombre text; v_terminada boolean; v_baja public.equipo_bajas;
begin
  perform public.assert_permiso('equipo.usuarios.gestionar');
  if p_usuario = (select auth.uid()) then raise exception 'No puedes darte de baja a ti mismo.' using errcode = '42501'; end if;
  select activo, coalesce(nullif(nombre, ''), email::text) into v_activo, v_nombre
  from public.perfiles where id = p_usuario for update;
  if not found then raise exception 'Esa persona ya no está en el equipo.' using errcode = 'PT409'; end if;
  if not v_activo then raise exception '% ya no forma parte del equipo.', v_nombre using errcode = 'PT409'; end if;
  update public.perfiles set activo = false, baja_en = now(), baja_por = (select auth.uid()), publico_web = false where id = p_usuario;
  update public.cola_web_asesores set habilitado = false, disponible = false where usuario_id = p_usuario;
  insert into public.equipo_bajas (usuario_id, por) values (p_usuario, (select auth.uid()))
  on conflict (usuario_id) do update set por = excluded.por, empezada_en = now(), terminada_en = null,
    leads_al_limbo = 0, oportunidades_canceladas = 0;
  -- El primer lote, en esta misma llamada: una cartera chica termina acá.
  v_terminada := public._baja_lote(p_usuario, 5000);
  select * into v_baja from public.equipo_bajas where usuario_id = p_usuario;
  perform public.registrar_actividad('usuario.baja', 'perfiles', p_usuario::text, null,
    jsonb_build_object('leads_al_limbo', v_baja.leads_al_limbo, 'terminada', v_terminada));
  return jsonb_build_object('terminada', v_terminada, 'leads_al_limbo', v_baja.leads_al_limbo);
end;
$$;
revoke all on function public.equipo_dar_de_baja(uuid) from public, anon;
grant execute on function public.equipo_dar_de_baja(uuid) to authenticated;

-- El job: termina las bajas en curso, de a lotes de 5.000 (~0,5 s cada uno), la más vieja primero, con el cursor de un
-- lote al siguiente. Corta a los 10 lotes o pasados 1,5 s (el corte se mira antes de cada lote: a lo sumo eso más un lote,
-- ~2,5 s): una corrida es una transacción y retiene los leads que tocó hasta
-- el final. Lo que un lote saltó (un lead bloqueado) lo toma la corrida siguiente, que empieza desde el principio.
create or replace function public.equipo_bajas_continuar()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_lotes int := 0; v_terminadas int := 0; v_persona uuid; v_desde uuid; v_ultimo uuid;
        v_inicio timestamptz := clock_timestamp();
begin
  for v_persona in select b.usuario_id from public.equipo_bajas b where b.terminada_en is null order by b.empezada_en, b.usuario_id loop
    v_desde := null;
    loop
      exit when v_lotes >= 10 or clock_timestamp() - v_inicio > interval '1.5 seconds';
      v_lotes := v_lotes + 1;
      v_ultimo := public._baja_lote_desde(v_persona, 5000, v_desde);
      if v_ultimo is null then
        -- Nada más adelante: termina si no quedó nada saltado.
        if public._baja_terminar(v_persona) then
          v_terminadas := v_terminadas + 1;
        end if;
        exit;
      end if;
      v_desde := v_ultimo;
    end loop;
    exit when v_lotes >= 10 or clock_timestamp() - v_inicio > interval '1.5 seconds';
  end loop;
  return jsonb_build_object('lotes', v_lotes, 'terminadas', v_terminadas);
end;
$$;
revoke all on function public.equipo_bajas_continuar() from public, anon, authenticated;

do $$
begin
  if to_regprocedure('cron.schedule(text, text, text)') is null then
    return;
  end if;
  perform cron.schedule('equipo-bajas', '* * * * *', 'select public.equipo_bajas_continuar()');
end $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- Lo que escribe la cartera aplica primero la baja al lead que bloqueó.
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public._lead_para_mover(p_lead uuid)
returns public.leads language plpgsql security definer set search_path = '' as $$
declare l public.leads;
begin
  perform public.assert_activo();
  if p_lead is null or not public.puede_lead(p_lead, 'leads.ver') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  select * into l from public.leads x where x.id = p_lead and x.eliminado_en is null for update;
  if not found or not public.puede_lead(p_lead, 'leads.ver') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  -- Compartir, transferir y quitar acceso deciden sobre el estado final: sin quien está en baja.
  perform public._lead_aplicar_bajas(l.id);
  select * into l from public.leads x where x.id = p_lead;
  return l;
end;
$$;

create or replace function public.lead_salir(p_lead uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare l public.leads; v_yo uuid := (select auth.uid()); a public.leads_asesores;
begin
  perform public.assert_activo();
  if p_lead is null then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  select * into l from public.leads x
   where x.id = p_lead and x.eliminado_en is null and public.en_cartera(x.id) and not public.lead_en_limbo(x.id)
   for update;
  if not found then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  perform public._lead_aplicar_bajas(l.id);
  select * into a from public.leads_asesores x where x.lead_id = l.id and x.usuario_id = v_yo and x.revocado_en is null;
  if a.tipo_acceso = 'dueno' then
    raise exception 'Eres quien tiene este lead: transfiérelo para dejarlo.' using errcode = '23514';
  end if;
  if not exists (select 1 from public.leads_asesores x where x.lead_id = l.id and x.usuario_id <> v_yo and x.revocado_en is null) then
    raise exception 'Eres la única persona que lo tiene: transfiérelo antes de salir.' using errcode = '23514';
  end if;
  update public.leads_asesores set revocado_en = now(), revocado_por = v_yo
  where lead_id = l.id and usuario_id = v_yo and revocado_en is null;
  perform public.registrar_actividad('lead.salio', 'leads', l.id::text, null, null);
  return jsonb_build_object('resultado', 'salio');
end;
$$;

create or replace function public._lead_verificar(p_tel text, p_excluir uuid DEFAULT NULL::uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path = ''
as $$
declare l record; d record; a record;
  -- El permiso del número se pregunta sólo cuando hay un lead que nombrar («existe»): la papelera llama a esta función una vez
  -- por lead y casi nunca llega acá, y `tiene_permiso` cuesta ~0,25 ms.
  v_ve boolean;
  v_yo uuid := (select auth.uid());
begin
  select x.id, x.numero, x.numero_propio, x.creado_por, x.nombre, x.tipo into l
    from public.leads x
   where x.telefono_principal = p_tel and x.eliminado_en is null and x.id is distinct from p_excluir;
  if not found then
    select x.id, x.numero, x.numero_propio, x.creado_por, x.nombre into a
      from public.leads_telefonos t join public.leads x on x.id = t.lead_id
     where t.telefono = p_tel and x.eliminado_en is null and x.id is distinct from p_excluir
       and not public.lead_en_limbo(x.id)
     order by public.puede_lead(x.id, 'leads.ver') desc, public.en_cartera(x.id) desc, t.creado_en, t.id
     limit 1;
    if not found then
      return jsonb_build_object('estado', 'libre');
    end if;
    if public.puede_lead(a.id, 'leads.ver') then
      v_ve := public.tiene_permiso('leads.numero_global.ver');
      return jsonb_build_object('estado', 'libre', 'alterno', jsonb_build_object(
        'estado', 'existe', 'lead_id', a.id, 'numero', case when v_ve then a.numero end,
        'numero_propio', case when v_ve or a.creado_por = v_yo then a.numero_propio end, 'nombre', a.nombre,
        'es_mio', public.en_cartera(a.id)));
    end if;
    select p.nombre into d
      from public.leads_asesores la join public.perfiles p on p.id = la.usuario_id
     where la.lead_id = a.id and la.revocado_en is null and la.usuario_id <> all ((select public._bajas_en_curso())::uuid[])
     order by (la.tipo_acceso = 'dueno') desc, la.desde
     limit 1;
    return jsonb_build_object('estado', 'libre', 'alterno', jsonb_build_object('estado', 'de_otro', 'dueno', d.nombre));
  end if;
  if public.lead_en_limbo(l.id) then
    return jsonb_build_object('estado', 'limbo');
  end if;
  if public.puede_lead(l.id, 'leads.ver') then
    v_ve := public.tiene_permiso('leads.numero_global.ver');
    return jsonb_build_object('estado', 'existe', 'lead_id', l.id, 'numero', case when v_ve then l.numero end,
                              'numero_propio', case when v_ve or l.creado_por = v_yo then l.numero_propio end, 'nombre', l.nombre,
                              'tipo', l.tipo, 'es_mio', public.en_cartera(l.id));
  end if;
  select p.id, p.nombre into d
    from public.leads_asesores la join public.perfiles p on p.id = la.usuario_id
   where la.lead_id = l.id and la.revocado_en is null and la.usuario_id <> all ((select public._bajas_en_curso())::uuid[])
   order by (la.tipo_acceso = 'dueno') desc, la.desde
   limit 1;
  return jsonb_build_object('estado', 'de_otro', 'dueno', d.nombre, 'dueno_id', d.id);
end;
$$;

create or replace function public._lead_crear(p_id uuid, p_lead jsonb, p_seguimiento jsonb, p_recordatorio jsonb, p_recordar_origen boolean)
 returns jsonb
 language plpgsql
 security definer
 set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_permitidas constant text[] := array['nombre', 'telefono_cc', 'telefono_principal', 'tipo', 'origen_lead_id', 'atributos', 'adoptar'];
  v_k text;
  v_cc text;
  v_cc_digitos text;
  v_tel text;
  v_nombre text;
  v_tipo public.tipo_lead;
  v_origen uuid;
  v_activos text[];
  v_atributos jsonb := '{}'::jsonb;
  v_verif jsonb;
  v_estado text;
  v_id uuid;
  v_adoptado boolean := false;
  v_tipo_seg uuid;
  v_titulo text;
  v_detalle text;
  v_doc jsonb;
  v_id_previo uuid;
  v_ocurrido timestamptz := now();
  v_k2 text;
  v_msg text;
  v_recordar timestamptz;
  v_titulo_rec text;
begin
  if p_id is null then
    raise exception 'Falta el identificador del intento.' using errcode = '22023';
  end if;
  if p_lead is null or jsonb_typeof(p_lead) <> 'object' then
    raise exception 'Los datos del lead tienen que ser un objeto.' using errcode = '22023';
  end if;
  for v_k in select jsonb_object_keys(p_lead) loop
    if not (v_k = any (v_permitidas)) then
      raise exception 'El dato «%» no va suelto: los campos del lead se mandan dentro de «atributos».', v_k
        using errcode = '22023', hint = v_k;
    end if;
  end loop;

  -- ¿Ya entró este intento? Una respuesta perdida y un reintento: devuelve lo mismo, no duplica.
  select l.id into v_id from public.leads l where l.id = p_id and l.creado_por = v_yo;
  if found then
    return jsonb_build_object('resultado', 'creado', 'id', v_id, 'repetido', true) || public._lead_numeros_de(v_id);
  end if;
  select l.id into v_id
    from public.actividad a join public.leads l on l.id::text = a.registro_id
   where a.accion = 'lead.adoptado_del_limbo' and a.actor_id = v_yo and a.detalle ->> 'intento' = p_id::text
   order by a.id desc limit 1;
  if found then
    return jsonb_build_object('resultado', 'adoptado', 'id', v_id, 'repetido', true) || public._lead_numeros_de(v_id);
  end if;

  -- El teléfono, y lo que ya se sabe de él.
  v_cc := coalesce(nullif(btrim(p_lead ->> 'telefono_cc'), ''), (select e.telefono_cc from public.ajustes_empresa e where e.id = 1));
  v_tel := public.normalizar_telefono(v_cc, p_lead ->> 'telefono_principal');
  v_verif := public._lead_verificar(v_tel);
  v_estado := v_verif ->> 'estado';
  if v_estado in ('existe', 'de_otro') or (v_estado = 'limbo' and (p_lead ->> 'adoptar') is distinct from 'true') then
    return jsonb_build_object('resultado', v_estado, 'verificacion', v_verif);
  end if;

  -- Lo demás que tiene que pasar, antes de escribir nada.
  v_nombre := btrim(coalesce(p_lead ->> 'nombre', ''));
  if v_nombre = '' then
    raise exception 'Escribe el nombre.' using errcode = '22023', hint = 'nombre';
  end if;
  if char_length(v_nombre) > 120 then
    raise exception 'El nombre admite hasta 120 caracteres.' using errcode = '22023', hint = 'nombre';
  end if;
  begin
    v_tipo := coalesce(nullif(p_lead ->> 'tipo', ''), 'prospecto')::public.tipo_lead;
  exception when invalid_text_representation then
    raise exception 'El tipo de lead no es uno de los que hay.' using errcode = '22023', hint = 'tipo';
  end;
  begin
    v_origen := nullif(p_lead ->> 'origen_lead_id', '')::uuid;
  exception when invalid_text_representation then
    raise exception 'Ese origen del lead no existe.' using errcode = '22023', hint = 'origen_lead_id';
  end;
  if v_origen is not null then
    if not exists (select 1 from public.origenes_lead o where o.id = v_origen and o.activo) then
      raise exception 'Ese origen del lead está desactivado o ya no existe.' using errcode = '22023', hint = 'origen_lead_id';
    end if;
  elsif exists (select 1 from public.origenes_lead o where o.activo) then
    raise exception 'Elige de dónde viene el lead.' using errcode = '22023', hint = 'origen_lead_id';
  end if;

  select coalesce(array_agg(c.clave), '{}') into v_activos from public.leads_campos c where c.activo;
  if p_lead ? 'atributos' then
    v_atributos := public._atributos_fusionar('{}'::jsonb, p_lead -> 'atributos', v_activos,
      'Los atributos de un lead tienen que ser un objeto.',
      'El campo «%s» no es un campo de los leads o está desactivado.');
  end if;

  if p_seguimiento is not null then
    if jsonb_typeof(p_seguimiento) <> 'object' then
      raise exception 'El seguimiento tiene que ser un objeto.' using errcode = '22023', hint = 'seguimiento.titulo';
    end if;
    -- Las mismas claves que `seguimiento_crear`, menos las que el alta no ofrece (la visibilidad y el
    -- vehículo): una de más se rechaza con su nombre, no pasa callada.
    for v_k2 in select jsonb_object_keys(p_seguimiento) loop
      if v_k2 not in ('tipo_id', 'titulo', 'detalle', 'ocurrido_en') then
        raise exception 'El dato «%» no es del primer seguimiento.', v_k2
          using errcode = '22023', hint = 'seguimiento.' || v_k2;
      end if;
    end loop;
    begin
      v_tipo_seg := nullif(p_seguimiento ->> 'tipo_id', '')::uuid;
    exception when invalid_text_representation then
      v_tipo_seg := null;
    end;
    if v_tipo_seg is null or not exists (select 1 from public.tipos_seguimiento t where t.id = v_tipo_seg and t.activo) then
      raise exception 'Elige un tipo de seguimiento que esté activo.' using errcode = '22023', hint = 'seguimiento.tipo_id';
    end if;
    -- El resumen, el detalle y la fecha se validan con las funciones de `seguimiento_crear`: una sola
    -- regla. El resumen recibe su hint; el detalle y la fecha levantan el de la ficha («detalle»,
    -- «ocurrido_en») y acá se les pone el campo del alta.
    v_titulo := public._seguimiento_titulo(p_seguimiento -> 'titulo', 'seguimiento.titulo');
    begin
      v_doc := p_seguimiento -> 'detalle';
      v_detalle := public._seguimiento_detalle(v_doc);
      if v_detalle is null then
        v_doc := null;
      end if;
    exception when sqlstate '22023' then
      get stacked diagnostics v_msg = message_text;
      raise exception '%', v_msg using errcode = '22023', hint = 'seguimiento.detalle';
    end;
    if p_seguimiento ? 'ocurrido_en' and p_seguimiento -> 'ocurrido_en' <> 'null'::jsonb then
      begin
        v_ocurrido := public._seguimiento_fecha(p_seguimiento -> 'ocurrido_en');
      exception when sqlstate '22023' then
        get stacked diagnostics v_msg = message_text;
        raise exception '%', v_msg using errcode = '22023', hint = 'seguimiento.ocurrido_en';
      end;
    end if;
  end if;
  if p_recordatorio is not null then
    if jsonb_typeof(p_recordatorio) <> 'object' then
      raise exception 'El recordatorio tiene que ser un objeto.' using errcode = '22023', hint = 'recordatorio.recordar_en';
    end if;
    begin
      v_recordar := nullif(p_recordatorio ->> 'recordar_en', '')::timestamptz;
    exception when others then
      v_recordar := null;
    end;
    if v_recordar is null then
      raise exception 'Elige cuándo recordarlo.' using errcode = '22023', hint = 'recordatorio.recordar_en';
    end if;
    if v_recordar <= now() then
      raise exception 'El recordatorio tiene que ser en el futuro.' using errcode = '22023', hint = 'recordatorio.recordar_en';
    end if;
    v_titulo_rec := coalesce(nullif(btrim(p_recordatorio ->> 'titulo'), ''), v_titulo);
    if v_titulo_rec is null then
      raise exception 'Escribe de qué es el recordatorio.' using errcode = '22023', hint = 'recordatorio.titulo';
    end if;
  end if;

  if v_estado = 'limbo' then
    -- «Tomar lead»: queda de dueño y lo que el lead ya tiene no se pisa; lo vacío se completa.
    select l.id into v_id from public.leads l
     where l.telefono_principal = v_tel and l.eliminado_en is null for update;
    -- Otra llamada del MISMO intento pudo adoptarlo mientras esta esperaba el candado (un doble envío):
    -- ya se ve confirmado, y adoptar de nuevo duplicaría el seguimiento y el recordatorio. (Otro intento
    -- de otra persona sobre el mismo lead sigue siendo la carrera de siempre, fuera de esta parte.)
    select l.id into v_id_previo
      from public.actividad a join public.leads l on l.id::text = a.registro_id
     where a.accion = 'lead.adoptado_del_limbo' and a.actor_id = v_yo and a.detalle ->> 'intento' = p_id::text
     order by a.id desc limit 1;
    if found then
      return jsonb_build_object('resultado', 'adoptado', 'id', v_id_previo, 'repetido', true) || public._lead_numeros_de(v_id_previo);
    end if;
    -- Una baja en curso de quien lo tenía se aplica a este lead antes de tomarlo (cierre 1); y si otra persona lo tomó
    -- mientras se esperaba el candado, se dice como al verificar, en vez de chocar con el dueño único.
    perform public._lead_aplicar_bajas(v_id);
    if not public.lead_en_limbo(v_id) then
      v_verif := public._lead_verificar(v_tel);
      return jsonb_build_object('resultado', v_verif ->> 'estado', 'verificacion', v_verif);
    end if;
    insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso)
    values (v_id, v_yo, 'dueno')
    on conflict (lead_id, usuario_id) do update
      set tipo_acceso = 'dueno', desde = now(), revocado_en = null, revocado_por = null, compartido_por = null;
    update public.leads l set
      origen_lead_id = coalesce(l.origen_lead_id, v_origen),
      atributos = public._atributos_completar(l.atributos, v_atributos, v_activos,
        'Los atributos de un lead tienen que ser un objeto.',
        'El campo «%s» no es un campo de los leads o está desactivado.')
     where l.id = v_id;
    v_adoptado := true;
    perform public.registrar_actividad('lead.adoptado_del_limbo', 'leads', v_id::text, null,
      jsonb_build_object('telefono', public.enmascarar_telefono(v_tel)), jsonb_build_object('intento', p_id));
  else
    v_cc_digitos := regexp_replace(coalesce(v_cc, ''), '\D', '', 'g');
    begin
      insert into public.leads (id, nombre, telefono_cc, telefono_principal, tipo, origen_lead_id, atributos, creado_por)
      values (p_id, v_nombre,
              case when v_cc_digitos <> '' and v_tel like v_cc_digitos || '%' then '+' || v_cc_digitos end,
              v_tel, v_tipo, v_origen, v_atributos, v_yo)
      returning id into v_id;
    exception when unique_violation then
      -- Dos personas guardaron el mismo teléfono a la vez (o este mismo intento, dos veces): el que
      -- llegó segundo ve su estado «existe», no un error.
      select l.id into v_id from public.leads l where l.id = p_id and l.creado_por = v_yo;
      if found then
        return jsonb_build_object('resultado', 'creado', 'id', v_id, 'repetido', true) || public._lead_numeros_de(v_id);
      end if;
      v_verif := public._lead_verificar(v_tel);
      if (v_verif ->> 'estado') in ('existe', 'de_otro', 'limbo') then
        return jsonb_build_object('resultado', v_verif ->> 'estado', 'verificacion', v_verif);
      end if;
      raise exception 'Ese teléfono cambió mientras guardabas. Vuelve a intentarlo.' using errcode = 'PT409';
    end;
    perform public.registrar_actividad('lead.creado', 'leads', v_id::text, null,
      jsonb_build_object('nombre', v_nombre), jsonb_build_object('intento', p_id));
  end if;

  if p_seguimiento is not null then
    insert into public.seguimientos (lead_id, usuario_id, tipo_id, titulo, detalle_doc, detalle_texto, ocurrido_en, actualizado_en)
    values (v_id, v_yo, v_tipo_seg, v_titulo, v_doc, v_detalle, v_ocurrido, clock_timestamp());
  end if;
  if p_recordatorio is not null then
    insert into public.recordatorios (usuario_id, lead_id, titulo, recordar_en)
    values (v_yo, v_id, v_titulo_rec, v_recordar);
  end if;
  if p_recordar_origen and v_origen is not null then
    insert into public.preferencias_usuario (usuario_id, clave, valor)
    values (v_yo, 'leads.ultimo_origen_lead', to_jsonb(v_origen::text))
    on conflict (usuario_id, clave) do update set valor = excluded.valor, actualizado_en = now();
  end if;

  return jsonb_build_object('resultado', case when v_adoptado then 'adoptado' else 'creado' end,
                            'id', v_id, 'repetido', false) || public._lead_numeros_de(v_id);
end;
$$;
