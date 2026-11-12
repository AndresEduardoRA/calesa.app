-- Los ajustes de la web se guardan por RPC (8.01-1, C9–C12): `web_ajustes_guardar(versión, cambios)` con permisos por grupo de columnas
-- y `PT409`; `legales` lleva su HTML derivado por trigger, escriba quien escriba; `authenticated` deja de poder hacer `update` directo.
--
-- D3: la política de la cola (`cola_activa`, `ttl_contacto_minutos`, `dias_pegajoso`, `max_abiertas_default`, `max_intentos`) la cambia quien
-- tenga web.cola.gestionar o web.ajustes.gestionar; lo demás, sólo web.ajustes.gestionar. El permiso se mira por las claves que llegan.

-- C12 · el trigger de legales: en INSERT, o si `legales` cambió, valida y rehace `html` y `actualizado_en` de cada clave.
create or replace function public.web_ajustes_legales() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.legales is distinct from old.legales then
    new.legales := public._web_legales_validar(new.legales, case when tg_op = 'INSERT' then '{}'::jsonb else old.legales end);
  end if;
  return new;
end;
$$;

revoke all on function public.web_ajustes_legales() from public, anon, authenticated;
grant execute on function public.web_ajustes_legales() to service_role;

-- Lo guardado antes, cuando authenticated podía escribir `legales` a mano: pasa por la misma validación y su `html` se rehace. Si una
-- clave no valida, la migración se detiene con el motivo: nunca queda HTML ajeno en `web.ajustes` (en la nube no hubo pantalla de legales).
do $$
begin
  update public.ajustes_web set legales = public._web_legales_validar(legales, legales);
exception when sqlstate '22023' then
  raise exception 'ajustes_web.legales no cumple la forma {terminos|privacidad: {titulo, doc}} (8.01-1): %. Corrígelo a mano y vuelve a aplicar.', sqlerrm;
end $$;

create trigger trg_web_ajustes_legales before insert or update on public.ajustes_web
  for each row execute function public.web_ajustes_legales();

-- La fila única: la crea el seed en un despliegue nuevo; aquí, por si una base la perdió (la RPC no la crea: daría PT409).
insert into public.ajustes_web (id) values (1) on conflict do nothing;

-- C9 · la RPC.
create or replace function public.web_ajustes_guardar(p_actualizado_en_esperado timestamptz, p_cambios jsonb) returns timestamptz
language plpgsql security definer
set search_path = ''
as $$
declare
  v_sitio constant text[] := array['nombre_sitio', 'lema', 'whatsapp_respaldo', 'horario', 'redes', 'mostrar_moneda_secundaria',
                                   'origenes_visibles', 'legales', 'seo', 'direccion_publica'];
  v_cola constant text[] := array['cola_activa', 'ttl_contacto_minutos', 'dias_pegajoso', 'max_abiertas_default', 'max_intentos'];
  v_objetos constant text[] := array['redes', 'seo', 'origenes_visibles', 'legales'];
  k text;
  v_valor jsonb;
  w public.ajustes_web;
  n public.ajustes_web;
  v_fila jsonb;
begin
  perform public.assert_activo();
  if jsonb_typeof(p_cambios) is distinct from 'object' then
    raise exception 'Los cambios no tienen un formato válido.' using errcode = '22023', hint = 'cambios';
  end if;
  for k in select jsonb_object_keys(p_cambios) loop
    if not (k = any (v_sitio || v_cola)) then
      raise exception 'No se cambia «%».', k using errcode = '22023', hint = k;
    end if;
  end loop;

  -- C10 · permisos por grupo: web.ajustes.gestionar cubre los dos.
  if exists (select 1 from jsonb_object_keys(p_cambios) c where c = any (v_sitio)) then
    perform public.assert_permiso('web.ajustes.gestionar');
  end if;
  if exists (select 1 from jsonb_object_keys(p_cambios) c where c = any (v_cola))
     and not public.tiene_permiso('web.ajustes.gestionar')
     and not public.tiene_permiso('web.cola.gestionar') then
    raise exception 'No tienes permiso para cambiar la política de la cola.' using errcode = '42501';
  end if;

  select * into w from public.ajustes_web where id = 1 for update;
  perform public._exigir_version(w.actualizado_en, p_actualizado_en_esperado,
    'Alguien cambió los ajustes de la web mientras los veías. Recarga para seguir.');

  -- C11 · cada clave, validada y normalizada, sobre una copia de la fila.
  v_fila := to_jsonb(w);
  for k, v_valor in select e.key, e.value from jsonb_each(p_cambios) e loop
    v_fila := jsonb_set(v_fila, array[k], case
      when k = any (v_objetos) then public._web_ajustes_objeto(k, v_valor, v_fila -> k)
      else public._web_ajustes_valor(k, v_valor) end);
  end loop;
  n := jsonb_populate_record(w, v_fila);
  if n is not distinct from w then
    return w.actualizado_en;
  end if;

  update public.ajustes_web set
    nombre_sitio = n.nombre_sitio, lema = n.lema, whatsapp_respaldo = n.whatsapp_respaldo, horario = n.horario, redes = n.redes,
    mostrar_moneda_secundaria = n.mostrar_moneda_secundaria, origenes_visibles = n.origenes_visibles, legales = n.legales, seo = n.seo,
    direccion_publica = n.direccion_publica, cola_activa = n.cola_activa, ttl_contacto_minutos = n.ttl_contacto_minutos,
    dias_pegajoso = n.dias_pegajoso, max_abiertas_default = n.max_abiertas_default, max_intentos = n.max_intentos,
    actualizado_por = (select auth.uid())
   where id = 1
  returning actualizado_en into w.actualizado_en;
  return w.actualizado_en;
end;
$$;

revoke all on function public.web_ajustes_guardar(timestamptz, jsonb) from public, anon;
grant execute on function public.web_ajustes_guardar(timestamptz, jsonb) to authenticated, service_role;

comment on function public.web_ajustes_guardar(timestamptz, jsonb) is
  'Guarda los ajustes de la web: claves ausentes no cambian. Sitio: web.ajustes.gestionar; política de la cola: web.cola.gestionar o web.ajustes.gestionar. PT409 con versión vieja. Devuelve la versión. 8.01-1.';

-- authenticated sólo lee la fila y escribe por la RPC.
drop policy "ajustes_web: editar" on public.ajustes_web;
revoke update on public.ajustes_web from authenticated;

-- Dónde se aplica cada permiso (dato de catálogo: la nube no vuelve a correr el seed).
update public.permisos set aplicado_en = 'web_ajustes_guardar' where clave = 'web.ajustes.gestionar';
update public.permisos set aplicado_en = 'cola_web_configurar, web_ajustes_guardar (política de la cola)' where clave = 'web.cola.gestionar';
