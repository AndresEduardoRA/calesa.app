-- Cambiar la privacidad de un campo de los leads, por lotes (9h). Segunda de tres partes (`…001400` guardó los atributos
-- públicos en la fila; `…001600` los expone).
--
-- `leads.atributos_publicos` es una copia que lee quien ve el lead sin la cartera. Pasar un campo a privado tiene que
-- quitar su clave de esa copia en todos los leads, y en una sentencia no cabe: con 200.000 leads cuesta 9 a 21 s (10 s aun
-- sin los triggers por fila) y el `statement_timeout` de `authenticated` es de 8 s. Hacerlo de a poco con el campo ya
-- privado dejaría la clave legible en la copia mientras tanto. Por eso:
--
-- - **A privado**: `solo_cartera_pendiente = true` y `solo_cartera` sigue en false (el campo se sigue viendo como hasta
--   ahora). Desde ese momento ningún lead nuevo ni editado lleva la clave en los atributos públicos (la regla de
--   `_lead_atributos_publicos` cuenta lo pendiente como privado), así que los que la llevan sólo disminuyen. Cada lote la
--   quita de hasta 5.000; cuando no queda ninguno, `solo_cartera = true` y el pendiente se borra.
-- - **A público**: inmediato (`solo_cartera = false`: hacer público no expone nada que no se quiera) y
--   `solo_cartera_pendiente = false` mientras los lotes completan la copia de los leads que ya tenían el dato. La app
--   filtra ese campo por `atributos` (lo enmascarado) hasta que termina.
--
-- `lead_campo_guardar` corre el primer lote en la misma llamada (una base chica termina ahí) y el job
-- `leads-campos-privacidad` sigue cada minuto, hasta 10 lotes por corrida. Cada lote toma el campo `for share` (un cambio
-- de privacidad que llega a la vez espera) y los leads con `skip locked` (no espera a nadie; lo que salta, el siguiente).

alter table public.leads_campos add column if not exists solo_cartera_pendiente boolean;
comment on column public.leads_campos.solo_cartera_pendiente is 'A dónde va un cambio de privacidad que se aplica por lotes: true, a privado (solo_cartera sigue en false hasta quitar la clave de leads.atributos_publicos); false, a público (solo_cartera ya es false y se completa la copia). NULL: nada pendiente.';

-- Lo público, sin lo que va camino a privado.
create or replace function public._lead_atributos_publicos(p_atributos jsonb)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
    from jsonb_each(coalesce(p_atributos, '{}'::jsonb)) e
   where exists (select 1 from public.leads_campos c
                  where c.clave = e.key and not c.solo_cartera and c.solo_cartera_pendiente is not true);
$$;
revoke all on function public._lead_atributos_publicos(jsonb) from public, anon, authenticated;

-- Un lote de la transición de un campo. Devuelve true si terminó (o no había nada pendiente).
create or replace function public._lead_campo_privacidad_lote(p_campo uuid, p_lote int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare c public.leads_campos; v_n int;
begin
  select * into c from public.leads_campos x where x.id = p_campo for share;
  if not found or c.solo_cartera_pendiente is null then
    return true;
  end if;
  if c.solo_cartera_pendiente then
    -- A privado: quitar la clave. El trigger de `leads` la recalcula igual (con el pendiente, ya no es pública).
    with lote as (
      select l.id from public.leads l where l.atributos_publicos ? c.clave
       order by l.id limit greatest(coalesce(p_lote, 0), 1) for update skip locked
    )
    update public.leads l set atributos_publicos = l.atributos_publicos - c.clave from lote where l.id = lote.id;
    get diagnostics v_n = row_count;
    if exists (select 1 from public.leads l where l.atributos_publicos ? c.clave) then
      return false;
    end if;
    update public.leads_campos x set solo_cartera = true, solo_cartera_pendiente = null where x.id = c.id;
    return true;
  end if;
  -- A público: completar la copia de los que tienen el dato.
  with lote as (
    select l.id from public.leads l where l.atributos ? c.clave and not l.atributos_publicos ? c.clave
     order by l.id limit greatest(coalesce(p_lote, 0), 1) for update skip locked
  )
  update public.leads l set atributos_publicos = l.atributos_publicos || jsonb_build_object(c.clave, l.atributos -> c.clave)
    from lote where l.id = lote.id;
  get diagnostics v_n = row_count;
  if exists (select 1 from public.leads l where l.atributos ? c.clave and not l.atributos_publicos ? c.clave) then
    return false;
  end if;
  update public.leads_campos x set solo_cartera_pendiente = null where x.id = c.id;
  return true;
end;
$$;
revoke all on function public._lead_campo_privacidad_lote(uuid, int) from public, anon, authenticated;

-- El job: cada campo con algo pendiente, hasta 10 lotes de 5.000 por corrida. Cada lote es su propia llamada a la función
-- de arriba dentro de la misma corrida; lo que no entra queda para el minuto siguiente.
create or replace function public.leads_campos_privacidad_aplicar()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_campo uuid; v_lotes int := 0; v_terminados int := 0; v_listo boolean;
begin
  for v_campo in select x.id from public.leads_campos x where x.solo_cartera_pendiente is not null order by x.id loop
    loop
      v_listo := public._lead_campo_privacidad_lote(v_campo, 5000);
      v_lotes := v_lotes + 1;
      exit when v_listo or v_lotes >= 10;
    end loop;
    if v_listo then v_terminados := v_terminados + 1; end if;
    exit when v_lotes >= 10;
  end loop;
  return jsonb_build_object('lotes', v_lotes, 'campos_terminados', v_terminados);
end;
$$;
revoke all on function public.leads_campos_privacidad_aplicar() from public, anon, authenticated;

do $$
begin
  if to_regprocedure('cron.schedule(text, text, text)') is null then
    return;
  end if;
  perform cron.schedule('leads-campos-privacidad', '* * * * *', 'select public.leads_campos_privacidad_aplicar()');
end $$;

create or replace function public.lead_campo_guardar(p_campo uuid, p_actualizado_en_esperado timestamp with time zone, p_cambios jsonb)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  c public.leads_campos; v_clave text; v_nueva timestamptz;
  v_editables constant text[] := array['etiqueta', 'tipo', 'opciones', 'requerido', 'grupo', 'en_tabla', 'filtrable',
    'solo_cartera', 'activo', 'valor_defecto', 'valor_defecto_empresa'];
  v_tipo public.tipo_campo; v_opciones jsonb; v_grupo text; v_con int; v_orden smallint; v_defecto jsonb; v_empresa text;
  v_privado boolean := (p_cambios ->> 'solo_cartera')::boolean; v_pendiente boolean;
begin
  perform public.assert_permiso('leads.configurar');
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Faltan los cambios a guardar.';
  end if;
  for v_clave in select jsonb_object_keys(p_cambios) loop
    if not (v_clave = any (v_editables)) then
      raise exception 'El dato «%» no se cambia desde el layout de campos.', v_clave;
    end if;
    if v_clave in ('etiqueta', 'tipo', 'opciones', 'requerido', 'en_tabla', 'filtrable', 'solo_cartera', 'activo')
       and p_cambios -> v_clave = 'null'::jsonb then
      raise exception 'El dato «%» no puede quedar vacío.', v_clave;
    end if;
  end loop;

  lock table public.leads_campos in share row exclusive mode;
  select * into c from public.leads_campos x where x.id = p_campo for update;
  if not found then raise exception 'Ese campo ya no existe.' using errcode = 'PT409'; end if;
  perform public._exigir_version(c.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este campo mientras lo editabas.');

  v_tipo := coalesce((p_cambios ->> 'tipo')::public.tipo_campo, c.tipo);
  if v_tipo is distinct from c.tipo then
    if c.es_sistema then
      raise exception 'El tipo de «%» no cambia: es un campo de fábrica.', c.etiqueta;
    end if;
    if v_tipo in ('vin', 'lote') then
      raise exception 'Un lead no lleva campos de ese tipo.';
    end if;
    v_con := public._lead_campo_con_valor(c.clave);
    if v_con > 0 then
      raise exception '% % ya tienen un valor en «%»: no se puede cambiar su tipo. Desactívalo y crea otro campo.',
        v_con, case when v_con = 1 then 'lead' else 'leads' end, c.etiqueta;
    end if;
  end if;

  v_opciones := coalesce(p_cambios -> 'opciones', c.opciones);
  if v_tipo not in ('opcion', 'multi_opcion') then
    v_opciones := '[]'::jsonb;
  else
    perform public._campo_opciones_validas(v_opciones);
    if jsonb_array_length(v_opciones) = 0 then
      raise exception 'Un campo de opciones necesita al menos una opción.';
    end if;
  end if;

  if p_cambios ? 'valor_defecto' then
    v_defecto := public._campo_valor_defecto(v_tipo, v_opciones, p_cambios -> 'valor_defecto');
  elsif v_tipo is distinct from c.tipo then
    v_defecto := null;
  else
    begin
      v_defecto := public._campo_valor_defecto(v_tipo, v_opciones, c.valor_defecto);
    exception when invalid_parameter_value then
      v_defecto := null;
    end;
  end if;

  -- «La de la empresa»: si ahora hay un valor fijo se va solo; si el tipo ya no es texto, también.
  if p_cambios ? 'valor_defecto_empresa' then
    v_empresa := public._lead_defecto_empresa(v_tipo, v_defecto, p_cambios ->> 'valor_defecto_empresa');
  elsif v_tipo <> 'texto' or v_defecto is not null then
    v_empresa := null;
  else
    v_empresa := c.valor_defecto_empresa;
  end if;

  v_grupo := case when p_cambios ? 'grupo' then nullif(btrim(p_cambios ->> 'grupo'), '') else c.grupo end;
  if v_grupo is not null and length(v_grupo) > 40 then raise exception 'El nombre del grupo no puede pasar de 40 caracteres.'; end if;

  -- Cambiar de grupo lo manda al final del grupo nuevo.
  v_orden := c.orden;
  if v_grupo is distinct from c.grupo then
    select max(x.orden) + 1 into v_orden from public.leads_campos x where x.id <> c.id and x.grupo is not distinct from v_grupo;
    v_orden := coalesce(v_orden, (select coalesce(max(x.orden), 0) + 10 from public.leads_campos x));
  end if;

  update public.leads_campos x set
    etiqueta = case when p_cambios ? 'etiqueta' then public._campo_nombre_valido(p_cambios ->> 'etiqueta', 'el nombre del campo', 60) else x.etiqueta end,
    tipo = v_tipo,
    opciones = v_opciones,
    requerido = coalesce((p_cambios ->> 'requerido')::boolean, x.requerido),
    grupo = v_grupo,
    en_tabla = coalesce((p_cambios ->> 'en_tabla')::boolean, x.en_tabla),
    filtrable = coalesce((p_cambios ->> 'filtrable')::boolean, x.filtrable),
    -- 9h: pasar a privado no cambia `solo_cartera` hasta quitar la clave de los atributos públicos de todos los leads
    -- (por lotes, `_lead_campo_privacidad_lote`); pasar a público es inmediato y deja completar los atributos públicos.
    solo_cartera = case when v_privado is null or v_privado then x.solo_cartera else false end,
    solo_cartera_pendiente = case
      when v_privado is null then x.solo_cartera_pendiente
      when v_privado and x.solo_cartera and x.solo_cartera_pendiente is null then null
      when v_privado then true
      when not x.solo_cartera and x.solo_cartera_pendiente is null then null
      else false end,
    activo = coalesce((p_cambios ->> 'activo')::boolean, x.activo),
    valor_defecto = v_defecto,
    valor_defecto_empresa = v_empresa,
    orden = v_orden
  where x.id = p_campo
  returning x.actualizado_en, x.solo_cartera_pendiente into v_nueva, v_pendiente;
  if v_orden is distinct from c.orden then
    perform public._lead_campos_renumerar();
  end if;
  -- El primer lote, en esta misma llamada: una base chica termina acá. Lo que quede lo sigue el job.
  if v_pendiente is not null then
    perform public._lead_campo_privacidad_lote(p_campo, 5000);
  end if;
  return v_nueva;
end;
$$;
revoke all on function public.lead_campo_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.lead_campo_guardar(uuid, timestamptz, jsonb) to authenticated;
