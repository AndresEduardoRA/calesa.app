-- Parte 9j (2 de 3): los tipos de lead se escriben por RPC, y un lead no guarda un tipo apagado.
--
-- `tipos_lead` es de sólo lectura para la app: se escribe por `tipo_lead_crear|guardar|mover|eliminar` con `leads.configurar` (el
-- mismo permiso de los campos y los orígenes: no hay permiso nuevo), con versión y `PT409`. Es el patrón de los orígenes del lead
-- (`…20261019000700` y `…000800`) con dos cosas propias:
--
--  1. Cada tipo es de una CLASE fija —«prospecto» o «cliente»— que se elige al crearlo y no cambia nunca.
--  2. Siempre queda al menos un tipo ACTIVO de cada clase, y lo impone la base: un trigger de `tipos_lead` mira, con un candado
--     por clase (`pg_advisory_xact_lock`), que apagar o eliminar uno no deje a su clase sin activos. Las RPC además toman el
--     candado de la tabla (como las de los orígenes), pero el trigger vale también para quien escriba sin ellas, y el candado
--     por clase —no uno de tabla tomado dentro del trigger, que entre dos sesiones sería un interbloqueo— decide la carrera de
--     dos personas que apagan a la vez los dos últimos de una clase: la segunda ve que ya no queda otro y falla con el mensaje.
--
-- Un lead tampoco guarda un tipo apagado, aunque la desactivación llegue a la vez que un alta: `lead_tipo_vigente()` lo mira con
-- `for share` (la FK sólo toma `for key share`, que no choca con la desactivación). Un lead sin tipo ya recibió el de por defecto
-- (`trg_lead_tipo_por_defecto`, de `…002800`: el primero activo de la clase «prospecto» por orden).
--
-- Se reescriben para `tipo_lead_id` lo que antes leía o escribía `leads.tipo`: `_lead_crear`, `lead_guardar`,
-- `leads_importar_lote`, `_lead_verificar`, `lead_ficha` y `lead_alta_contexto`, que además trae los tipos activos
-- y el de por defecto. `leads_catalogos()` entrega los orígenes y los tipos (también los apagados, para nombrar a los leads que los
-- tienen) en un solo pedido: el listado, la ficha y la exportación no suman uno por traer los nombres.

-- ---------------------------------------------------------------------------
-- Piezas internas
-- ---------------------------------------------------------------------------
-- El tope de tipos (activos o no): UN solo punto. Lo usan `tipo_lead_crear` y su mensaje, y `tipos_lead_con_uso()` lo entrega
-- a la pantalla; el TypeScript no escribe el número.
create or replace function public._tipos_lead_tope()
returns integer language sql immutable set search_path = '' as $$ select 100; $$;
revoke all on function public._tipos_lead_tope() from public, anon, authenticated;

-- El nombre, sin espacios de más: «  Cliente   VIP » es «Cliente VIP».
create or replace function public._tipo_lead_nombre(p_texto text)
returns text language plpgsql immutable set search_path = '' as $$
declare v text := btrim(regexp_replace(coalesce(p_texto, ''), '\s+', ' ', 'g'));
begin
  if v = '' then
    raise exception 'Escribe el nombre del tipo.' using errcode = '22023', hint = 'nombre';
  end if;
  if char_length(v) > 40 then
    raise exception 'El nombre del tipo admite hasta 40 caracteres.' using errcode = '22023', hint = 'nombre';
  end if;
  return v;
end;
$$;
revoke all on function public._tipo_lead_nombre(text) from public, anon, authenticated;

-- La clave sale del nombre (sin acentos, minúsculas, guion bajo) y no cambia nunca; si choca con otra se le suma un número. La
-- importación acepta el nombre o la clave, y `?tipo=` de la URL la usa.
create or replace function public._tipo_lead_clave(p_nombre text)
returns text language plpgsql stable set search_path = '' as $$
declare v text; v_base text; n int := 1;
begin
  v := btrim(regexp_replace(
         translate(lower(p_nombre), 'áàäâéèëêíìïîóòöôúùüûñ', 'aaaaeeeeiiiioooouuuun'),
         '[^a-z0-9]+', '_', 'g'), '_');
  if v !~ '^[a-z]' then
    v := 't_' || v;
  end if;
  v := rtrim(left(v, 30), '_');
  if char_length(v) < 2 then
    v := 'tipo';
  end if;
  v_base := v;
  while exists (select 1 from public.tipos_lead t where t.clave = v) loop
    n := n + 1;
    v := left(v_base, 30 - char_length(n::text) - 1) || '_' || n;
  end loop;
  return v;
end;
$$;
revoke all on function public._tipo_lead_clave(text) from public, anon, authenticated;

-- Que un tipo exista y esté activo, con el mismo texto que dice el trigger de `leads`: lo llaman `_lead_crear` y `lead_guardar` para
-- avisar con el campo antes de llegar al insert o al update (el trigger sigue siendo quien lo asegura contra la carrera).
create or replace function public._tipo_lead_exigir_activo(p_id uuid)
returns void language plpgsql stable set search_path = '' as $$
declare v_activo boolean;
begin
  select t.activo into v_activo from public.tipos_lead t where t.id = p_id;
  if not found then
    raise exception 'Ese tipo de lead ya no existe: elige otro.' using errcode = '22023', hint = 'tipo_lead_id';
  end if;
  if not v_activo then
    raise exception 'Ese tipo de lead se desactivó: elige otro.' using errcode = '22023', hint = 'tipo_lead_id';
  end if;
end;
$$;
revoke all on function public._tipo_lead_exigir_activo(uuid) from public, anon, authenticated;

-- La lista que devuelven todas las escrituras y `tipos_lead_con_uso()`: hasta `_tipos_lead_tope()` filas, cada una con su clase y
-- si algún lead la usa (también en la papelera: la FK los cuenta) por una sonda sobre el índice de la FK, nunca un conteo.
-- La sonda por rango (`>= x and <= x`) y no `= x`: ver `…20261019000800_origen_lead_uso_por_indice.sql`.
create or replace function public._tipos_lead_lista()
returns jsonb language sql security definer set search_path = '' as $$
  select jsonb_build_object(
    'tope', public._tipos_lead_tope(),
    'tipos', coalesce((select jsonb_agg(jsonb_build_object(
           'id', t.id, 'clave', t.clave, 'nombre', t.nombre, 'clase', t.clase, 'activo', t.activo, 'orden', t.orden,
           'actualizado_en', t.actualizado_en,
           'con_leads', exists (select 1 from public.leads l where l.tipo_lead_id >= t.id and l.tipo_lead_id <= t.id)
         ) order by t.orden, t.nombre) from public.tipos_lead t), '[]'::jsonb));
$$;
revoke all on function public._tipos_lead_lista() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Versión y auditoría (como los orígenes)
-- ---------------------------------------------------------------------------
-- La versión es de lo que se edita (nombre y activo). Reordenar renumera filas que nadie editó: no la mueve.
create or replace function public.tipo_lead_version()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.nombre, new.activo) is distinct from (old.nombre, old.activo) then
    new.actualizado_en := greatest(clock_timestamp(), old.actualizado_en + interval '1 microsecond');
  else
    new.actualizado_en := old.actualizado_en;
  end if;
  return new;
end;
$$;
revoke all on function public.tipo_lead_version() from public, anon, authenticated;
drop trigger if exists trg_tipo_lead_version on public.tipos_lead;
create trigger trg_tipo_lead_version before update on public.tipos_lead
  for each row execute function public.tipo_lead_version();

create or replace function public.tipo_lead_auditar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.actualizado_en is not distinct from old.actualizado_en then
    return null;
  end if;
  insert into public.actividad (accion, actor_id, tabla, registro_id, antes, despues)
  values ('tipos_lead.' || lower(tg_op), (select auth.uid()), 'tipos_lead', coalesce(new.id, old.id)::text,
          case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end);
  return null;
end;
$$;
revoke all on function public.tipo_lead_auditar() from public, anon, authenticated;
drop trigger if exists trg_tipo_lead_auditar on public.tipos_lead;
create trigger trg_tipo_lead_auditar after insert or update or delete on public.tipos_lead
  for each row execute function public.tipo_lead_auditar();

-- ---------------------------------------------------------------------------
-- Siempre queda un tipo activo de cada clase, y la clase no cambia
-- ---------------------------------------------------------------------------
-- Vale para quien sea que escriba la tabla. El candado es uno por clase, tomado antes de mirar si queda otro: dos sesiones que
-- apagan a la vez los dos últimos de una clase se ponen en fila, y la segunda —que mira después de que la primera confirmó— no
-- encuentra a nadie más y falla. (`pg_advisory_xact_lock` se suelta al terminar la transacción.)
create or replace function public.tipo_lead_clase_vigente()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.clase is distinct from old.clase then
    raise exception 'La clase de un tipo no cambia: crea otro de la clase que necesitas.' using errcode = '22023', hint = 'clase';
  end if;
  if old.activo and (tg_op = 'DELETE' or not new.activo) then
    perform pg_advisory_xact_lock(hashtextextended('tipos_lead:' || old.clase::text, 0));
    if not exists (select 1 from public.tipos_lead t where t.clase = old.clase and t.activo and t.id <> old.id) then
      raise exception 'Es el único tipo activo de la clase «%»: activa o crea otro antes.', old.clase
        using errcode = '22023', hint = 'activo';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
revoke all on function public.tipo_lead_clase_vigente() from public, anon, authenticated;
drop trigger if exists trg_tipo_lead_clase_vigente on public.tipos_lead;
create trigger trg_tipo_lead_clase_vigente before update or delete on public.tipos_lead
  for each row execute function public.tipo_lead_clase_vigente();

-- ---------------------------------------------------------------------------
-- Un lead no guarda un tipo apagado
-- ---------------------------------------------------------------------------
-- Lo que ya tiene un lead no se toca (el tipo apagado que conserva): sólo cuenta cuando el tipo entra o cambia. `for share` choca
-- con el `update` de desactivar: o la desactivación espera a que el alta termine, o el alta ve el tipo ya apagado y falla.
create or replace function public.lead_tipo_vigente()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_activo boolean;
begin
  if new.tipo_lead_id is null then
    raise exception 'Elige el tipo de lead.' using errcode = '22023', hint = 'tipo_lead_id';
  end if;
  if tg_op = 'UPDATE' and new.tipo_lead_id is not distinct from old.tipo_lead_id then
    return new;
  end if;
  select t.activo into v_activo from public.tipos_lead t where t.id = new.tipo_lead_id for share;
  if not found then
    raise exception 'Ese tipo de lead ya no existe: elige otro.' using errcode = '22023', hint = 'tipo_lead_id';
  end if;
  if not v_activo then
    raise exception 'Ese tipo de lead se desactivó: elige otro.' using errcode = '22023', hint = 'tipo_lead_id';
  end if;
  return new;
end;
$$;
revoke all on function public.lead_tipo_vigente() from public, anon, authenticated;
drop trigger if exists trg_lead_tipo_vigente on public.leads;
create trigger trg_lead_tipo_vigente before insert or update of tipo_lead_id on public.leads
  for each row execute function public.lead_tipo_vigente();

-- ---------------------------------------------------------------------------
-- RPC
-- ---------------------------------------------------------------------------
-- Los tipos con su clase y si tienen leads. Es lo que lee la pantalla de configuración.
create or replace function public.tipos_lead_con_uso()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_permiso('leads.configurar');
  return public._tipos_lead_lista();
end;
$$;
revoke all on function public.tipos_lead_con_uso() from public, anon;
grant execute on function public.tipos_lead_con_uso() to authenticated;

-- Crea uno al final, de la clase que se elige y que no cambia. El id lo genera el navegador: reintentar no duplica. Tope de
-- `_tipos_lead_tope()` (activos e inactivos). El candado de la tabla ordena el «último + 10» y el tope de dos altas a la vez.
create or replace function public.tipo_lead_crear(p_id uuid, p_nombre text, p_clase text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_nombre text; v_version timestamptz; v_clase public.clase_tipo_lead; v_tope integer := public._tipos_lead_tope();
begin
  perform public.assert_permiso('leads.configurar');
  lock table public.tipos_lead in share row exclusive mode;
  if p_id is null then
    raise exception 'Falta el identificador del intento.' using errcode = '22023';
  end if;
  select t.actualizado_en into v_version from public.tipos_lead t where t.id = p_id;
  if found then
    return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'repetido', true, 'lista', public._tipos_lead_lista());
  end if;
  v_nombre := public._tipo_lead_nombre(p_nombre);
  if p_clase is null or p_clase not in ('prospecto', 'cliente') then
    raise exception 'Elige la clase del tipo: prospecto o cliente.' using errcode = '22023', hint = 'clase';
  end if;
  v_clase := p_clase::public.clase_tipo_lead;
  if (select count(*) from (select 1 from public.tipos_lead limit v_tope) t) >= v_tope then
    raise exception 'Ya hay % tipos de lead, que es el máximo. Elimina uno sin leads o desactiva los que no uses.', v_tope
      using errcode = '22023', hint = 'nombre';
  end if;
  if exists (select 1 from public.tipos_lead t where lower(btrim(t.nombre)) = lower(v_nombre)) then
    raise exception 'Ya hay un tipo «%».', v_nombre using errcode = '23505', hint = 'nombre';
  end if;
  insert into public.tipos_lead (id, clave, nombre, clase, orden)
  values (p_id, public._tipo_lead_clave(v_nombre), v_nombre, v_clase,
          coalesce((select max(t.orden) + 10 from public.tipos_lead t), 10))
  returning actualizado_en into v_version;
  return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'repetido', false, 'lista', public._tipos_lead_lista());
end;
$$;
revoke all on function public.tipo_lead_crear(uuid, text, text) from public, anon;
grant execute on function public.tipo_lead_crear(uuid, text, text) to authenticated;

-- Renombra o activa/desactiva. `p_cambios` lleva `nombre` y/o `activo`; la clase no se cambia. Lo ya guardado no es un conflicto.
-- Apagar el último activo de su clase lo rechaza el trigger `tipo_lead_clase_vigente`.
create or replace function public.tipo_lead_guardar(p_id uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.tipos_lead; v_k text; v_nombre text; v_activo boolean;
begin
  perform public.assert_permiso('leads.configurar');
  lock table public.tipos_lead in share row exclusive mode;
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Los cambios de un tipo tienen que ser un objeto.' using errcode = '22023';
  end if;
  for v_k in select jsonb_object_keys(p_cambios) loop
    if v_k = 'clase' then
      raise exception 'La clase de un tipo no cambia: crea otro de la clase que necesitas.' using errcode = '22023', hint = 'clase';
    end if;
    if v_k not in ('nombre', 'activo') then
      raise exception 'El dato «%» de un tipo no se cambia.', v_k using errcode = '22023', hint = v_k;
    end if;
  end loop;
  select * into o from public.tipos_lead x where x.id = p_id for update;
  if not found then
    raise exception 'Ese tipo ya no existe.' using errcode = 'PT409';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;

  v_nombre := o.nombre;
  v_activo := o.activo;
  if p_cambios ? 'nombre' then
    if jsonb_typeof(p_cambios -> 'nombre') <> 'string' then
      raise exception 'Escribe el nombre del tipo.' using errcode = '22023', hint = 'nombre';
    end if;
    v_nombre := public._tipo_lead_nombre(p_cambios ->> 'nombre');
  end if;
  if p_cambios ? 'activo' then
    if jsonb_typeof(p_cambios -> 'activo') <> 'boolean' then
      raise exception 'Activo es sí o no.' using errcode = '22023', hint = 'activo';
    end if;
    v_activo := (p_cambios ->> 'activo')::boolean;
  end if;

  if (v_nombre, v_activo) is not distinct from (o.nombre, o.activo) then
    return jsonb_build_object('id', p_id, 'actualizado_en', o.actualizado_en, 'sin_cambios', true, 'lista', public._tipos_lead_lista());
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este tipo mientras lo editabas.');
  if exists (select 1 from public.tipos_lead x where x.id <> p_id and lower(btrim(x.nombre)) = lower(v_nombre)) then
    raise exception 'Ya hay un tipo «%».', v_nombre using errcode = '23505', hint = 'nombre';
  end if;
  update public.tipos_lead x set nombre = v_nombre, activo = v_activo where x.id = p_id
  returning x.actualizado_en into o.actualizado_en;
  return jsonb_build_object('id', p_id, 'actualizado_en', o.actualizado_en, 'sin_cambios', false, 'lista', public._tipos_lead_lista());
end;
$$;
revoke all on function public.tipo_lead_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.tipo_lead_guardar(uuid, timestamptz, jsonb) to authenticated;

-- Lo mueve después de otro (nulo = primero), no a una posición. Renumera 10, 20, 30… tocando sólo las filas que cambian. El
-- orden es el del alta y el del filtro, y de él sale el tipo que el alta propone.
create or replace function public.tipo_lead_mover(p_id uuid, p_actualizado_en_esperado timestamptz, p_despues_de uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.tipos_lead;
begin
  perform public.assert_permiso('leads.configurar');
  lock table public.tipos_lead in share row exclusive mode;
  select * into o from public.tipos_lead x where x.id = p_id for update;
  if not found then
    raise exception 'Ese tipo ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este tipo mientras lo editabas.');
  if p_despues_de is not null then
    if p_despues_de = p_id then
      raise exception 'Un tipo no puede ir después de sí mismo.' using errcode = '22023';
    end if;
    if not exists (select 1 from public.tipos_lead x where x.id = p_despues_de) then
      raise exception 'Ese tipo ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
    end if;
  end if;

  update public.tipos_lead x set orden = n.orden_nuevo
  from public._campos_reordenar((
    select jsonb_agg(jsonb_build_object('id', y.id, 'clave', y.clave, 'orden', y.orden)) from public.tipos_lead y),
    p_id, p_despues_de) n
  where x.id = n.campo_id and x.orden <> n.orden_nuevo;

  perform public.registrar_actividad('tipos_lead.movido', 'tipos_lead', p_id::text, null, null,
    jsonb_build_object('nombre', o.nombre, 'despues_de', p_despues_de));
  return jsonb_build_object('id', p_id, 'actualizado_en', (select x.actualizado_en from public.tipos_lead x where x.id = p_id),
                            'lista', public._tipos_lead_lista());
end;
$$;
revoke all on function public.tipo_lead_mover(uuid, timestamptz, uuid) from public, anon;
grant execute on function public.tipo_lead_mover(uuid, timestamptz, uuid) to authenticated;

-- Sólo uno que ningún lead usa (la papelera cuenta: la FK es `restrict`). Con leads se desactiva. Un alta que gana la carrera cae
-- en el `foreign_key_violation` y recibe el mismo mensaje. El último activo de su clase tampoco se elimina (el trigger).
create or replace function public.tipo_lead_eliminar(p_id uuid, p_actualizado_en_esperado timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.tipos_lead; v_mensaje text;
begin
  perform public.assert_permiso('leads.configurar');
  lock table public.tipos_lead in share row exclusive mode;
  select * into o from public.tipos_lead x where x.id = p_id for update;
  if not found then
    raise exception 'Ese tipo ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este tipo mientras lo editabas.');
  v_mensaje := format('«%s» ya tiene leads: no se elimina. Desactívalo para que no se ofrezca a los nuevos.', o.nombre);
  if exists (select 1 from public.leads l where l.tipo_lead_id >= p_id and l.tipo_lead_id <= p_id) then
    raise exception '%', v_mensaje using errcode = '23503';
  end if;
  begin
    delete from public.tipos_lead x where x.id = p_id;
  exception when foreign_key_violation then
    raise exception '%', v_mensaje using errcode = '23503';
  end;
  return jsonb_build_object('lista', public._tipos_lead_lista());
end;
$$;
revoke all on function public.tipo_lead_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.tipo_lead_eliminar(uuid, timestamptz) to authenticated;

-- Los orígenes y los tipos de lead, con los apagados (para nombrar a los leads que los tienen), en un solo pedido: el listado, la
-- ficha y la exportación lo leen en vez de un pedido por catálogo. Invoker: la RLS de las dos tablas decide (las lee toda sesión).
create or replace function public.leads_catalogos()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'origenes', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'clave', o.clave, 'nombre', o.nombre, 'activo', o.activo)
                                           order by o.orden, o.nombre) from public.origenes_lead o), '[]'::jsonb),
    'tipos', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'clave', t.clave, 'nombre', t.nombre, 'clase', t.clase, 'activo', t.activo)
                                           order by t.orden, t.nombre) from public.tipos_lead t), '[]'::jsonb));
$$;
revoke all on function public.leads_catalogos() from public, anon;
grant execute on function public.leads_catalogos() to authenticated;


-- ---------------------------------------------------------------------------
-- Lo que leía o escribía `leads.tipo` ahora usa `tipo_lead_id`
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._lead_crear(p_id uuid, p_lead jsonb, p_seguimiento jsonb, p_recordatorio jsonb, p_recordar_origen boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_yo uuid := (select auth.uid());
  v_permitidas constant text[] := array['nombre', 'telefono_cc', 'telefono_principal', 'tipo_lead_id', 'origen_lead_id', 'atributos', 'adoptar'];
  v_k text;
  v_cc text;
  v_cc_digitos text;
  v_tel text;
  v_nombre text;
  v_tipo uuid;
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
    v_tipo := coalesce(nullif(p_lead ->> 'tipo_lead_id', '')::uuid, public._tipo_lead_por_defecto());
  exception when invalid_text_representation then
    raise exception 'Ese tipo de lead no existe.' using errcode = '22023', hint = 'tipo_lead_id';
  end;
  if v_tipo is null then
    raise exception 'Elige el tipo de lead.' using errcode = '22023', hint = 'tipo_lead_id';
  end if;
  perform public._tipo_lead_exigir_activo(v_tipo);
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
      insert into public.leads (id, nombre, telefono_cc, telefono_principal, tipo_lead_id, origen_lead_id, atributos, creado_por)
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
$function$;

CREATE OR REPLACE FUNCTION public.lead_guardar(p_lead uuid, p_actualizado_en_esperado timestamp with time zone, p_cambios jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_permitidas constant text[] := array['nombre', 'tipo_lead_id', 'origen_lead_id', 'atributos'];
  v_k text;
  l public.leads;
  n public.leads;
  v_nombre text;
  v_tipo uuid;
  v_origen uuid;
  v_atributos jsonb;
  e record;
begin
  perform public.assert_activo();
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Los cambios de un lead tienen que ser un objeto.' using errcode = '22023';
  end if;
  for v_k in select jsonb_object_keys(p_cambios) loop
    if not (v_k = any (v_permitidas)) then
      raise exception 'El dato «%» no va suelto: los campos del lead se mandan dentro de «atributos».', v_k
        using errcode = '22023', hint = v_k;
    end if;
  end loop;

  -- Inexistente, limbo, papelera, ajeno y «lo veo pero no es mío»: la misma respuesta.
  l := public._lead_mio(p_lead, 'leads.editar', true);
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;

  v_nombre := l.nombre;
  v_tipo := l.tipo_lead_id;
  v_origen := l.origen_lead_id;
  v_atributos := l.atributos;

  if p_cambios ? 'nombre' then
    if jsonb_typeof(p_cambios -> 'nombre') <> 'string' then
      raise exception 'Escribe el nombre.' using errcode = '22023', hint = 'nombre';
    end if;
    v_nombre := btrim(p_cambios ->> 'nombre');
    if v_nombre = '' then
      raise exception 'Escribe el nombre.' using errcode = '22023', hint = 'nombre';
    end if;
    if char_length(v_nombre) > 120 then
      raise exception 'El nombre admite hasta 120 caracteres.' using errcode = '22023', hint = 'nombre';
    end if;
  end if;

  if p_cambios ? 'tipo_lead_id' then
    begin
      v_tipo := nullif(p_cambios ->> 'tipo_lead_id', '')::uuid;
    exception when invalid_text_representation then
      raise exception 'Ese tipo de lead no existe.' using errcode = '22023', hint = 'tipo_lead_id';
    end;
    if v_tipo is null then
      raise exception 'Elige el tipo de lead.' using errcode = '22023', hint = 'tipo_lead_id';
    end if;
    -- Sólo si cambia: uno desactivado que el lead ya tiene se conserva.
    if v_tipo is distinct from l.tipo_lead_id then
      perform public._tipo_lead_exigir_activo(v_tipo);
    end if;
  end if;

  if p_cambios ? 'origen_lead_id' then
    begin
      v_origen := nullif(p_cambios ->> 'origen_lead_id', '')::uuid;
    exception when invalid_text_representation then
      raise exception 'Ese origen del lead no existe.' using errcode = '22023', hint = 'origen_lead_id';
    end;
    -- Sólo si cambia: uno desactivado que el lead ya tiene se conserva.
    if v_origen is distinct from l.origen_lead_id then
      if v_origen is not null then
        if not exists (select 1 from public.origenes_lead o where o.id = v_origen and o.activo) then
          raise exception 'Ese origen del lead está desactivado o ya no existe.' using errcode = '22023', hint = 'origen_lead_id';
        end if;
      elsif exists (select 1 from public.origenes_lead o where o.activo) then
        raise exception 'Elige de dónde viene el lead.' using errcode = '22023', hint = 'origen_lead_id';
      end if;
    end if;
  end if;

  if p_cambios ? 'atributos' then
    if jsonb_typeof(p_cambios -> 'atributos') <> 'object' then
      raise exception 'Los atributos de un lead tienen que ser un objeto.' using errcode = '22023';
    end if;
    for e in select x.key, x.value from jsonb_each(p_cambios -> 'atributos') x loop
      if e.value = 'null'::jsonb then
        v_atributos := v_atributos - e.key;
      else
        v_atributos := v_atributos || jsonb_build_object(e.key, e.value);
      end if;
    end loop;
  end if;

  -- Guardar lo que ya está guardado no es un conflicto: un reintento tras perder la respuesta no
  -- choca consigo mismo, y quien no cambió nada no pisa a nadie.
  if (v_nombre, v_tipo, v_origen, v_atributos) is not distinct from (l.nombre, l.tipo_lead_id, l.origen_lead_id, l.atributos) then
    return jsonb_build_object('actualizado_en', l.actualizado_en);
  end if;
  if l.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._lead_conflicto(l.id, l.actualizado_en);
  end if;

  -- `atributos` va siempre en el SET: el trigger que valida el layout se dispara por columna
  -- nombrada, así que un lead al que le falta un requerido nuevo no se guarda ni cambiándole
  -- sólo el tipo.
  update public.leads x set
    nombre = v_nombre, tipo_lead_id = v_tipo, origen_lead_id = v_origen, atributos = v_atributos
  where x.id = l.id
  returning * into n;
  return jsonb_build_object('actualizado_en', n.actualizado_en);
end;
$function$;

CREATE OR REPLACE FUNCTION public.leads_importar_lote(p_importacion uuid, p_total integer, p_filas jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_yo uuid := (select auth.uid());
  v_cc text := (select e.telefono_cc from public.ajustes_empresa e where e.id = 1);
  v_dueno uuid;
  v_estado public.estado_importacion;
  v_fila record;
  v_lead jsonb;
  v_res jsonb;
  v_salida jsonb := '[]'::jsonb;
  v_numero_de_fila integer;
  v_sqlstate text;
  v_mensaje text;
  v_hint text;
  v_permitidas constant text[] := array['nombre', 'telefono_principal', 'tipo_lead_id', 'origen_lead_id', 'atributos'];
  v_k text;
  v_ids uuid[] := '{}';
  v_filas integer[] := '{}';
  v_ve boolean := public.tiene_permiso('leads.numero_global.ver');
begin
  perform public.assert_permiso('leads.crear');
  perform public.assert_activo();
  if p_importacion is null then
    raise exception 'Falta el identificador de la importación.' using errcode = '22023';
  end if;
  if p_total is null or p_total < 1 or p_total > 500 then
    raise exception 'Una importación lleva de 1 a 500 filas.' using errcode = '22023';
  end if;
  if p_filas is null or jsonb_typeof(p_filas) <> 'array' or jsonb_array_length(p_filas) < 1 or jsonb_array_length(p_filas) > 50 then
    raise exception 'Un lote lleva de 1 a 50 filas.' using errcode = '22023';
  end if;

  -- La importación es de quien la empieza: retomarla con el mismo id es lo que hace un reintento.
  insert into public.importaciones (id, usuario_id, entidad, archivo_ruta, estado, filas_total, iniciada_en)
  values (p_importacion, v_yo, 'leads', null, 'procesando', p_total, now())
  on conflict (id) do nothing;
  select i.usuario_id, i.estado into v_dueno, v_estado from public.importaciones i where i.id = p_importacion for update;
  if v_dueno is distinct from v_yo or not exists (select 1 from public.importaciones i where i.id = p_importacion and i.entidad = 'leads') then
    raise exception 'No encontramos esta importación.' using errcode = '42501';
  end if;
  if v_estado <> 'procesando' then
    raise exception 'Esta importación ya terminó.' using errcode = '22023';
  end if;

  -- Cada elemento, validado antes de tocar nada: una forma rota es un error del cliente, no de una fila.
  for v_fila in select e.value as v from jsonb_array_elements(p_filas) e loop
    if jsonb_typeof(v_fila.v) <> 'object' or jsonb_typeof(v_fila.v -> 'lead') is distinct from 'object'
       or jsonb_typeof(v_fila.v -> 'id') is distinct from 'string'
       or jsonb_typeof(v_fila.v -> 'fila') is distinct from 'number' then
      raise exception 'Una fila del lote no tiene la forma esperada.' using errcode = '22023';
    end if;
  end loop;

  -- En el orden del teléfono: dos lotes de dos personas que se cruzan toman los candados en el mismo
  -- orden y no se bloquean entre sí.
  for v_fila in
    select e.value as v, e.ordinality as ord
    from jsonb_array_elements(p_filas) with ordinality e
    order by public._telefono_o_nulo(v_cc, e.value -> 'lead' ->> 'telefono_principal') nulls first, e.ordinality
  loop
    v_numero_de_fila := (v_fila.v ->> 'fila')::integer;
    begin
      v_lead := v_fila.v -> 'lead';
      -- Sólo viajan las claves conocidas: `adoptar` y cualquier otra se rechazan, no se ignoran.
      for v_k in select jsonb_object_keys(v_lead) loop
        if not (v_k = any (v_permitidas)) then
          raise exception 'El dato «%» no se puede importar.', v_k using errcode = '22023', hint = v_k;
        end if;
      end loop;
      v_res := public._lead_crear((v_fila.v ->> 'id')::uuid, v_lead, null, null, false);
      if (v_res ->> 'resultado') = 'creado' then
        insert into public.importaciones_leads (importacion_id, lead_id, fila)
        values (p_importacion, (v_res ->> 'id')::uuid, v_numero_de_fila)
        on conflict do nothing;
        -- Los que ya existían (un reintento) conservan el número que tienen: sólo se reparten los de ahora.
        if not coalesce((v_res ->> 'repetido')::boolean, false) then
          v_ids := v_ids || (v_res ->> 'id')::uuid;
          v_filas := v_filas || v_numero_de_fila;
        end if;
        v_salida := v_salida || jsonb_build_array(jsonb_build_object(
          'id', v_fila.v ->> 'id', 'fila', v_numero_de_fila, 'resultado', 'creado',
          'repetido', coalesce((v_res ->> 'repetido')::boolean, false)));
      else
        -- existe, de_otro y limbo se dicen igual: en masa sólo se sabe que el número ya está.
        v_salida := v_salida || jsonb_build_array(jsonb_build_object(
          'id', v_fila.v ->> 'id', 'fila', v_numero_de_fila, 'resultado', 'ya_existe'));
      end if;
    exception when others then
      get stacked diagnostics v_sqlstate = returned_sqlstate, v_mensaje = message_text, v_hint = pg_exception_hint;
      -- Lo que levantan nuestras reglas es humano; lo inesperado no se cuenta.
      if v_sqlstate not in ('22023', '23502', '23514', 'PT409') then
        v_mensaje := 'No pudimos importar esta fila. Inténtalo de nuevo.';
        v_hint := null;
      end if;
      v_salida := v_salida || jsonb_build_array(jsonb_build_object(
        'id', v_fila.v ->> 'id', 'fila', v_numero_de_fila, 'resultado', 'error',
        'campo', nullif(v_hint, ''), 'motivo', v_mensaje));
    end;
  end loop;

  -- Los números propios de lo que entró ahora, repartidos por orden de fila (el menor, a la primera del archivo).
  if cardinality(v_ids) > 1 then
    perform set_config('importadora.numerar_lote', 'si', true);
    with a as (select t.id, row_number() over (order by t.fila) as rn from unnest(v_ids, v_filas) as t(id, fila)),
         n as (select l.numero_propio, row_number() over (order by l.numero_propio) as rn
                 from public.leads l where l.id = any (v_ids)),
         m as (select a.id, n.numero_propio from a join n using (rn))
    update public.leads l set numero_propio = m.numero_propio
      from m where l.id = m.id and l.numero_propio is distinct from m.numero_propio;
    perform set_config('importadora.numerar_lote', 'no', true);
  end if;

  -- Lo que vuelve por fila lleva los números que se ven, con el reparto por fila ya hecho.
  v_salida := coalesce((
    select jsonb_agg(case when t.e ->> 'resultado' = 'creado' then t.e || public._lead_numeros(l, v_ve) else t.e end order by t.ord)
      from jsonb_array_elements(v_salida) with ordinality as t (e, ord)
      left join public.leads l on l.id = case when t.e ->> 'resultado' = 'creado' then (t.e ->> 'id')::uuid end), '[]'::jsonb);

  update public.importaciones i set filas_ok = (select count(*) from public.importaciones_leads x where x.importacion_id = i.id)
   where i.id = p_importacion;
  return jsonb_build_object('importacion', p_importacion, 'filas', v_salida);
end;
$function$;

CREATE OR REPLACE FUNCTION public._lead_verificar(p_tel text, p_excluir uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare l record; d record; a record;
  -- El permiso del número se pregunta sólo cuando hay un lead que nombrar («existe»): la papelera llama a esta función una vez
  -- por lead y casi nunca llega acá, y `tiene_permiso` cuesta ~0,25 ms.
  v_ve boolean;
  v_yo uuid := (select auth.uid());
begin
  select x.id, x.numero, x.numero_propio, x.creado_por, x.nombre into l
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
                              'es_mio', public.en_cartera(l.id));
  end if;
  select p.id, p.nombre into d
    from public.leads_asesores la join public.perfiles p on p.id = la.usuario_id
   where la.lead_id = l.id and la.revocado_en is null and la.usuario_id <> all ((select public._bajas_en_curso())::uuid[])
   order by (la.tipo_acceso = 'dueno') desc, la.desde
   limit 1;
  return jsonb_build_object('estado', 'de_otro', 'dueno', d.nombre, 'dueno_id', d.id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.lead_ficha(p_lead uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare v record; t record;
begin
  select * into v from public.leads_vista lv where lv.id = p_lead;
  if not found then
    return null;
  end if;
  select la.usuario_id as id, nullif(btrim(p.nombre), '') as nombre into t
    from public.leads_asesores la join public.perfiles p on p.id = la.usuario_id
   where la.lead_id = p_lead and la.revocado_en is null
     and la.usuario_id <> all ((select public._bajas_en_curso())::uuid[])
   order by (la.tipo_acceso = 'dueno') desc, la.desde
   limit 1;
  return jsonb_build_object(
    'id', v.id, 'numero', v.numero, 'numero_propio', v.numero_propio, 'numero_propio_de', v.numero_propio_de,
    'numero_propio_creador', v.numero_propio_creador,
    'nombre', v.nombre,
    'telefono_cc', v.telefono_cc, 'telefono', v.telefono_principal, 'en_cartera', v.en_cartera,
    'tipo_lead_id', v.tipo_lead_id, 'origen_lead_id', v.origen_lead_id,
    'atributos', coalesce(v.atributos, '{}'::jsonb),
    'creado_en', v.creado_en, 'actualizado_en', v.actualizado_en,
    'tiene_id', t.id, 'tiene_nombre', t.nombre,
    'telefonos', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'telefono', x.telefono, 'etiqueta', x.etiqueta)
                       order by x.creado_en, x.id)
        from public.lead_telefonos(p_lead) x), '[]'::jsonb),
    'recordatorios_vencidos', (
      select count(*) from (
        select 1 from public.recordatorios r
         where r.usuario_id = (select auth.uid()) and r.lead_id = p_lead
           and r.completado_en is null and r.eliminado_en is null and r.recordar_en <= now()
         order by r.recordar_en limit 21) x),
    -- Hasta 101 (el aviso dice «más de 100»); índice `vehiculos_lead_idx`.
    'vehiculos_vinculados', (select count(*) from (select 1 from public.vehiculos x where x.lead_id = p_lead limit 101) q),
    'es_favorito', v.es_favorito, 'esta_tachado', v.esta_tachado,
    'etiquetas', to_jsonb(v.etiquetas));
end;
$function$;

CREATE OR REPLACE FUNCTION public.lead_alta_contexto()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_ultimo text;
begin
  perform public.assert_permiso('leads.crear');
  select pu.valor #>> '{}' into v_ultimo
    from public.preferencias_usuario pu
   where pu.usuario_id = (select auth.uid()) and pu.clave = 'leads.ultimo_origen_lead';
  return jsonb_build_object(
    'telefono_cc', (select e.telefono_cc from public.ajustes_empresa e where e.id = 1),
    -- La ciudad y el país de la empresa: de ahí salen los valores por defecto «la de la empresa».
    'empresa', (select jsonb_build_object('ciudad', e.ciudad, 'pais', e.pais) from public.ajustes_empresa e where e.id = 1),
    'origenes', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'clave', o.clave, 'nombre', o.nombre) order by o.orden, o.nombre)
        from public.origenes_lead o where o.activo), '[]'::jsonb),
    'tipos_seguimiento', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'clave', t.clave, 'nombre', t.nombre, 'icono', t.icono) order by t.orden, t.nombre)
        from public.tipos_seguimiento t where t.activo), '[]'::jsonb),
    'tipos', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'clave', x.clave, 'nombre', x.nombre, 'clase', x.clase) order by x.orden, x.nombre)
        from public.tipos_lead x where x.activo), '[]'::jsonb),
    'tipo_por_defecto_id', public._tipo_lead_por_defecto(),
    'ultimo_origen_id', (select o.id from public.origenes_lead o where o.id::text = v_ultimo and o.activo));
end;
$function$;

-- ---------------------------------------------------------------------------
-- El permiso ya existía: ahora también gobierna estas RPC
-- ---------------------------------------------------------------------------
update public.permisos
set descripcion = 'Los campos de los leads, los orígenes de lead, los tipos de lead y los tipos de seguimiento',
    aplicado_en = 'lead_campo_*, origen_lead_*, origenes_lead_con_uso, tipo_lead_*, tipos_lead_con_uso, policy tipos_seguimiento'
where clave = 'leads.configurar';
