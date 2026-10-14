-- Fase 3, parte 2: el alta rápida de un lead con su primer seguimiento.
--
-- Qué cambia y por qué (docs/DECISIONES.md, 2026-10-14 «El alta rápida es una sola RPC»):
--   1. El código de país sale de la empresa (`ajustes_empresa.telefono_cc`), no del código: el
--      «+591» fijo de `crear_lead` y de la columna `leads.telefono_cc` se va.
--   2. `normalizar_telefono` entiende lo que se pega: espacios, guiones, paréntesis, «+», «00» y
--      números de otro país; rechaza con el motivo lo que no es un teléfono.
--   3. `crear_lead(p_id, p_lead, p_seguimiento, p_recordatorio)`: el lead, su primer seguimiento y el
--      recordatorio entran juntos o no entra nada; un reintento con el mismo `p_id` no duplica; el
--      duplicado es un VALOR (`existe`, `de_otro`, `limbo`), no una excepción.
--   4. Adoptar del limbo exige el consentimiento (`adoptar`), deja a quien adopta de DUEÑO y no pisa
--      lo que el lead ya tiene.
--   5. `verificar_telefono` exige `leads.crear` (era un oráculo de «de quién es este número» para
--      cualquier cuenta) y devuelve lo mínimo; `lead_alta_contexto()` trae lo que el drawer necesita.
-- Se aplica sobre una base viva (hay una cuenta real): todo es idempotente. 0 leads al escribirla.

-- ---------------------------------------------------------------------------
-- Estructura (espejo de schemas/, para la base que ya existe)
-- ---------------------------------------------------------------------------
alter table public.ajustes_empresa add column if not exists telefono_cc text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'ajustes_empresa_telefono_cc_check') then
    alter table public.ajustes_empresa
      add constraint ajustes_empresa_telefono_cc_check check (telefono_cc ~ '^\+[1-9][0-9]{0,2}$');
  end if;
end $$;
comment on column public.ajustes_empresa.telefono_cc is 'Código de país de los teléfonos de los leads (+ y 1 a 3 dígitos). Con él se completa un número escrito sin «+» ni «00».';

alter table public.leads alter column telefono_cc drop not null;
alter table public.leads alter column telefono_cc drop default;
comment on column public.leads.telefono_cc is 'El código de país del número, cuando es el de la empresa; nulo si el número vino con otro. El número completo está en telefono_principal.';

-- La instalación que ya existía llevaba +591 como valor implícito (default de la columna): se conserva
-- como dato de la empresa, sólo si nadie lo cargó y es la de Bolivia que sembró el seed.
update public.ajustes_empresa set telefono_cc = '+591'
 where id = 1 and telefono_cc is null and pais = 'Bolivia';

-- ---------------------------------------------------------------------------
-- Teléfono: la fuente de la normalización (espejo: leads/entities/telefono.ts)
-- ---------------------------------------------------------------------------
-- Teléfono normalizado: sólo dígitos, con el código de país adelante (entre 8 y 15). Es la fuente:
-- `leads/entities/telefono.ts` la espeja y un test compara las dos con la misma tabla de casos.
-- - Con «+» al inicio o con «00» es internacional: el número ya trae su código y `p_cc` se ignora.
-- - Sin ellos es nacional: lleva el código `p_cc` (el de la empresa) y pierde un 0 troncal inicial.
-- - Espacios, guiones, puntos y paréntesis se admiten; una letra o un «+» en medio, no.
-- Lo que no pasa se rechaza con el motivo y `hint = 'telefono_principal'`.
create or replace function public.normalizar_telefono(p_cc text, p_tel text)
returns text language plpgsql immutable set search_path = '' as $$
declare
  v_tel text := btrim(coalesce(p_tel, ''));
  v_cc text := regexp_replace(coalesce(p_cc, ''), '\D', '', 'g');
  v_d text;
  v_internacional boolean;
  v_n text;
begin
  if v_tel = '' then
    raise exception 'Escribe el teléfono.' using errcode = '22023', hint = 'telefono_principal';
  end if;
  if v_tel ~ '[^0-9+[:space:]().-]' then
    raise exception 'El teléfono sólo lleva números; se admiten espacios, guiones, paréntesis y un «+» al inicio.'
      using errcode = '22023', hint = 'telefono_principal';
  end if;
  if v_tel ~ '.\+' then
    raise exception 'El «+» va sólo al inicio del teléfono.' using errcode = '22023', hint = 'telefono_principal';
  end if;
  v_d := regexp_replace(v_tel, '\D', '', 'g');
  v_internacional := v_tel ~ '^\+';
  if not v_internacional and v_d ~ '^00' then
    v_internacional := true;
    v_d := substr(v_d, 3);
  end if;
  if v_d = '' then
    raise exception 'Escribe el teléfono.' using errcode = '22023', hint = 'telefono_principal';
  end if;
  if v_internacional then
    if v_d ~ '^0' then
      raise exception 'El código de país no empieza con 0.' using errcode = '22023', hint = 'telefono_principal';
    end if;
    v_n := v_d;
  else
    if v_cc = '' then
      raise exception 'Escribe el número completo, con «+» y el código de país.'
        using errcode = '22023', hint = 'telefono_principal';
    end if;
    v_n := v_cc || regexp_replace(v_d, '^0', '');
  end if;
  if length(v_n) < 8 then
    raise exception 'Al teléfono le faltan dígitos: con el código de país lleva entre 8 y 15.'
      using errcode = '22023', hint = 'telefono_principal';
  end if;
  if length(v_n) > 15 then
    raise exception 'Al teléfono le sobran dígitos: con el código de país lleva entre 8 y 15.'
      using errcode = '22023', hint = 'telefono_principal';
  end if;
  return v_n;
end;
$$;


-- ---------------------------------------------------------------------------
-- Ajustes de la empresa: el código de país entra a lo que se edita
-- ---------------------------------------------------------------------------
create or replace function public.empresa_guardar_ajustes(p_cambios jsonb, p_actualizado_en_esperado timestamptz)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  v public.ajustes_empresa;
  v_clave text;
  v_nueva timestamptz;
  v_editables constant text[] := array['nombre', 'razon_social', 'nit', 'direccion', 'ciudad', 'pais', 'telefono', 'whatsapp', 'email',
    'logo_ruta', 'color_acento', 'iconos', 'locale', 'zona_horaria', 'moneda_base', 'registro_abierto', 'papelera_dias', 'actividad_dias',
    'limpieza_automatica', 'limpieza_dias_gracia', 'telefono_cc'];
  v_obligatorias constant text[] := array['nombre', 'pais', 'locale', 'zona_horaria', 'moneda_base', 'registro_abierto', 'papelera_dias', 'actividad_dias',
    'limpieza_automatica', 'limpieza_dias_gracia'];
begin
  perform public.assert_permiso('empresa.ajustes.gestionar');
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Faltan los cambios a guardar.';
  end if;
  for v_clave in select jsonb_object_keys(p_cambios) loop
    if not (v_clave = any (v_editables)) then
      raise exception 'El dato «%» no se cambia desde los ajustes de la empresa.', v_clave;
    end if;
    if v_clave = any (v_obligatorias) and nullif(btrim(p_cambios ->> v_clave), '') is null then
      raise exception 'El dato «%» no puede quedar vacío.', v_clave;
    end if;
  end loop;

  select * into v from public.ajustes_empresa where id = 1 for update;
  perform public._exigir_version(v.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió los ajustes de la empresa mientras los editabas.');

  if p_cambios ? 'zona_horaria' then
    begin
      perform now() at time zone (p_cambios ->> 'zona_horaria');
    exception when others then
      raise exception 'La zona horaria «%» no existe.', p_cambios ->> 'zona_horaria';
    end;
  end if;
  -- Con el locale se formatea cada número de la app: uno con otra forma rompería todas las pantallas.
  if p_cambios ? 'locale' and btrim(p_cambios ->> 'locale') !~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$' then
    raise exception 'El formato regional «%» no tiene la forma esperada, como es-BO.', p_cambios ->> 'locale';
  end if;
  if p_cambios ? 'iconos' and jsonb_typeof(p_cambios -> 'iconos') not in ('object', 'null') then
    raise exception 'Los íconos no tienen la forma esperada.';
  end if;
  if p_cambios ? 'telefono_cc' and nullif(btrim(p_cambios ->> 'telefono_cc'), '') is not null
     and btrim(p_cambios ->> 'telefono_cc') !~ '^\+[1-9][0-9]{0,2}$' then
    raise exception 'El código de país lleva un «+» y de 1 a 3 dígitos.' using errcode = '22023', hint = 'telefono_cc';
  end if;
  if p_cambios ? 'limpieza_dias_gracia'
     and (btrim(p_cambios ->> 'limpieza_dias_gracia') !~ '^[0-9]{1,3}$' or (p_cambios ->> 'limpieza_dias_gracia')::int not between 1 and 90) then
    raise exception 'Los días de gracia de la limpieza van de 1 a 90.' using errcode = '22023', hint = 'limpieza_dias_gracia';
  end if;
  if p_cambios ? 'limpieza_automatica' and (p_cambios ->> 'limpieza_automatica') not in ('true', 'false') then
    raise exception 'La limpieza automática se enciende o se apaga.' using errcode = '22023', hint = 'limpieza_automatica';
  end if;
  if p_cambios ? 'moneda_base' and (p_cambios ->> 'moneda_base') is distinct from v.moneda_base::text then
    if not exists (select 1 from public.monedas m where m.codigo::text = p_cambios ->> 'moneda_base' and m.activa) then
      raise exception 'La moneda base tiene que ser una de las monedas activas.';
    end if;
    if public.empresa_con_datos_cargados() then
      raise exception 'La moneda base no se cambia con datos cargados: los montos ya están guardados en %.', v.moneda_base;
    end if;
  end if;

  update public.ajustes_empresa e set
    nombre = case when p_cambios ? 'nombre' then btrim(p_cambios ->> 'nombre') else e.nombre end,
    razon_social = case when p_cambios ? 'razon_social' then nullif(btrim(p_cambios ->> 'razon_social'), '') else e.razon_social end,
    nit = case when p_cambios ? 'nit' then nullif(btrim(p_cambios ->> 'nit'), '') else e.nit end,
    direccion = case when p_cambios ? 'direccion' then nullif(btrim(p_cambios ->> 'direccion'), '') else e.direccion end,
    ciudad = case when p_cambios ? 'ciudad' then nullif(btrim(p_cambios ->> 'ciudad'), '') else e.ciudad end,
    pais = case when p_cambios ? 'pais' then btrim(p_cambios ->> 'pais') else e.pais end,
    telefono = case when p_cambios ? 'telefono' then nullif(btrim(p_cambios ->> 'telefono'), '') else e.telefono end,
    telefono_cc = case when p_cambios ? 'telefono_cc' then nullif(btrim(p_cambios ->> 'telefono_cc'), '') else e.telefono_cc end,
    whatsapp = case when p_cambios ? 'whatsapp' then nullif(btrim(p_cambios ->> 'whatsapp'), '') else e.whatsapp end,
    email = case when p_cambios ? 'email' then nullif(btrim(p_cambios ->> 'email'), '') else e.email end,
    logo_ruta = case when p_cambios ? 'logo_ruta' then nullif(p_cambios ->> 'logo_ruta', '') else e.logo_ruta end,
    color_acento = case when p_cambios ? 'color_acento' then nullif(lower(p_cambios ->> 'color_acento'), '') else e.color_acento end,
    iconos = case when p_cambios ? 'iconos' then nullif(p_cambios -> 'iconos', 'null'::jsonb) else e.iconos end,
    locale = case when p_cambios ? 'locale' then btrim(p_cambios ->> 'locale') else e.locale end,
    zona_horaria = case when p_cambios ? 'zona_horaria' then btrim(p_cambios ->> 'zona_horaria') else e.zona_horaria end,
    moneda_base = case when p_cambios ? 'moneda_base' then (p_cambios ->> 'moneda_base')::char(3) else e.moneda_base end,
    registro_abierto = case when p_cambios ? 'registro_abierto' then (p_cambios ->> 'registro_abierto')::boolean else e.registro_abierto end,
    papelera_dias = case when p_cambios ? 'papelera_dias' then (p_cambios ->> 'papelera_dias')::int else e.papelera_dias end,
    actividad_dias = case when p_cambios ? 'actividad_dias' then (p_cambios ->> 'actividad_dias')::int else e.actividad_dias end,
    limpieza_automatica = case when p_cambios ? 'limpieza_automatica' then (p_cambios ->> 'limpieza_automatica')::boolean else e.limpieza_automatica end,
    limpieza_dias_gracia = case when p_cambios ? 'limpieza_dias_gracia' then (p_cambios ->> 'limpieza_dias_gracia')::int else e.limpieza_dias_gracia end,
    actualizado_por = (select auth.uid())
  where e.id = 1
  returning e.actualizado_en into v_nueva;
  return v_nueva;
end;
$$;
revoke all on function public.empresa_guardar_ajustes(jsonb, timestamptz) from public, anon;
grant execute on function public.empresa_guardar_ajustes(jsonb, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Atributos: completar sin pisar (la adopción del limbo)
-- ---------------------------------------------------------------------------
-- Valida y limpia `p_nuevos` igual que `_atributos_fusionar`, pero lo que `p_actuales` ya tiene gana:
-- el lead de otra persona no se reescribe con lo que tipea quien lo adopta.
create or replace function public._atributos_completar(p_actuales jsonb, p_nuevos jsonb, p_activas text[], p_msg_objeto text, p_msg_clave text)
returns jsonb language sql immutable set search_path = '' as $$
  select public._atributos_fusionar('{}'::jsonb, p_nuevos, p_activas, p_msg_objeto, p_msg_clave) || p_actuales;
$$;
revoke all on function public._atributos_completar(jsonb, jsonb, text[], text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Verificar un teléfono: el resultado, sin excepciones
-- ---------------------------------------------------------------------------
-- `p_tel` ya normalizado. Libre / existe (con su número y si es mío) / de otro (sólo quién lo tiene,
-- nunca el lead) / en limbo (sin dueño: no dice nada del lead).
create or replace function public._lead_verificar(p_tel text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare l record; d record;
begin
  select id, numero, nombre, tipo into l from public.leads where telefono_principal = p_tel and eliminado_en is null;
  if not found then
    return jsonb_build_object('estado', 'libre');
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
revoke all on function public._lead_verificar(text) from public, anon, authenticated;

-- `p_cc` nulo = el de la empresa. Sólo para quien da de alta leads.
create or replace function public.verificar_telefono(p_cc text, p_tel text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_permiso('leads.crear');
  return public._lead_verificar(public.normalizar_telefono(
    coalesce(nullif(btrim(p_cc), ''), (select e.telefono_cc from public.ajustes_empresa e where e.id = 1)), p_tel));
end;
$$;
revoke all on function public.verificar_telefono(text, text) from public, anon;
grant execute on function public.verificar_telefono(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Lo que el drawer «Nuevo lead» necesita, en un solo viaje
-- ---------------------------------------------------------------------------
create or replace function public.lead_alta_contexto()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
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
    'ultimo_origen_id', (select o.id from public.origenes_lead o where o.id::text = v_ultimo and o.activo));
end;
$$;
revoke all on function public.lead_alta_contexto() from public, anon;
grant execute on function public.lead_alta_contexto() to authenticated;

-- ---------------------------------------------------------------------------
-- Crear un lead con su primer seguimiento: una transacción, un reintento que no duplica
-- ---------------------------------------------------------------------------
-- `p_id`: lo genera el navegador al abrir el drawer y lo conserva en cada reintento.
-- `p_lead`: nombre, telefono_principal (y telefono_cc si no es el de la empresa), tipo, origen_lead_id,
--   atributos (los campos del layout, por su clave) y adoptar (true = «Tomar lead»).
-- `p_seguimiento`: tipo_id, titulo y detalle (texto plano). `p_recordatorio`: recordar_en y, si no,
--   el título del seguimiento.
-- Devuelve {resultado: 'creado' | 'adoptado', id, numero, repetido} o, si no se pudo y no es un
-- error, {resultado: 'existe' | 'de_otro' | 'limbo', verificacion}. Un error (permiso, un dato que no
-- pasa) es una excepción con el campo en `hint`; nada de lo escrito queda.
create or replace function public.crear_lead(p_id uuid, p_lead jsonb, p_seguimiento jsonb default null, p_recordatorio jsonb default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
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
  v_numero bigint;
  v_adoptado boolean := false;
  v_tipo_seg uuid;
  v_titulo text;
  v_detalle text;
  v_recordar timestamptz;
  v_titulo_rec text;
begin
  perform public.assert_permiso('leads.crear');
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
  select l.id, l.numero into v_id, v_numero from public.leads l where l.id = p_id and l.creado_por = v_yo;
  if found then
    return jsonb_build_object('resultado', 'creado', 'id', v_id, 'numero', v_numero, 'repetido', true);
  end if;
  select l.id, l.numero into v_id, v_numero
    from public.actividad a join public.leads l on l.id::text = a.registro_id
   where a.accion = 'lead.adoptado_del_limbo' and a.actor_id = v_yo and a.detalle ->> 'intento' = p_id::text
   order by a.id desc limit 1;
  if found then
    return jsonb_build_object('resultado', 'adoptado', 'id', v_id, 'numero', v_numero, 'repetido', true);
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
    begin
      v_tipo_seg := nullif(p_seguimiento ->> 'tipo_id', '')::uuid;
    exception when invalid_text_representation then
      v_tipo_seg := null;
    end;
    if v_tipo_seg is null or not exists (select 1 from public.tipos_seguimiento t where t.id = v_tipo_seg and t.activo) then
      raise exception 'Elige un tipo de seguimiento que esté activo.' using errcode = '22023', hint = 'seguimiento.tipo_id';
    end if;
    v_titulo := btrim(coalesce(p_seguimiento ->> 'titulo', ''));
    if v_titulo = '' then
      raise exception 'Escribe un resumen del seguimiento.' using errcode = '22023', hint = 'seguimiento.titulo';
    end if;
    if char_length(v_titulo) > 120 then
      raise exception 'El resumen admite hasta 120 caracteres.' using errcode = '22023', hint = 'seguimiento.titulo';
    end if;
    v_detalle := nullif(btrim(coalesce(p_seguimiento ->> 'detalle', '')), '');
    if char_length(v_detalle) > 5000 then
      raise exception 'El detalle admite hasta 5000 caracteres.' using errcode = '22023', hint = 'seguimiento.detalle';
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
    select l.id, l.numero into v_id, v_numero from public.leads l
     where l.telefono_principal = v_tel and l.eliminado_en is null for update;
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
      returning id, numero into v_id, v_numero;
    exception when unique_violation then
      -- Dos personas guardaron el mismo teléfono a la vez (o este mismo intento, dos veces): el que
      -- llegó segundo ve su estado «existe», no un error.
      select l.id, l.numero into v_id, v_numero from public.leads l where l.id = p_id and l.creado_por = v_yo;
      if found then
        return jsonb_build_object('resultado', 'creado', 'id', v_id, 'numero', v_numero, 'repetido', true);
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
    insert into public.seguimientos (lead_id, usuario_id, tipo_id, titulo, detalle_texto)
    values (v_id, v_yo, v_tipo_seg, v_titulo, v_detalle);
  end if;
  if p_recordatorio is not null then
    insert into public.recordatorios (usuario_id, lead_id, titulo, recordar_en)
    values (v_yo, v_id, v_titulo_rec, v_recordar);
  end if;
  if v_origen is not null then
    insert into public.preferencias_usuario (usuario_id, clave, valor)
    values (v_yo, 'leads.ultimo_origen_lead', to_jsonb(v_origen::text))
    on conflict (usuario_id, clave) do update set valor = excluded.valor, actualizado_en = now();
  end if;

  return jsonb_build_object('resultado', case when v_adoptado then 'adoptado' else 'creado' end,
                            'id', v_id, 'numero', v_numero, 'repetido', false);
end;
$$;
revoke all on function public.crear_lead(uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.crear_lead(uuid, jsonb, jsonb, jsonb) to authenticated;
drop function if exists public.crear_lead(jsonb);
