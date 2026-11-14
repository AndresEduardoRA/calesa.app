-- Las tarifas que vio la hoja abierta (4-33): `cotizacion_hoja()` firma en `abierta` la huella de las tarifas que la fórmula nombra tal como valían al
-- abrir, y `cotizacion_crear()` la compara con las que reconstruye del historial a esa hora. Un cambio que confirma después de abrir la hoja con un
-- `cambiado_en` anterior (una transacción larga: `now()` es la hora de su comienzo) no cuenta como visto. No depende de otro archivo
-- (`SOLO=areas/cotizaciones/tarifa-vista.sql`); cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   T1. Una tarifa que cambia con `cambiado_en` anterior a la apertura, después de firmada la hoja: PT409 `desactualizada` (`tipo_cambio`), sin guardar.
--   T2. Con «Guardar con la N»: 22023 con `hint abierta` (la hoja pide recargar), sin guardar ni congelar una tarifa que la hoja no mostró.
--   T3. La misma hoja firmada después del cambio guarda, con y sin «con la N»: la huella no da falsos avisos.
--   T4. La huella va firmada: cambiarla en el texto es `abierta_invalida`.

create or replace function pg_temp.tv_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('tv_' || substr(v_id::text, 1, 8), 'TV ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- La hoja abierta de esa persona a esa hora, firmada como la firmaría `cotizacion_hoja()` con lo que la base ve ahora.
create or replace function pg_temp.tv_abrir(p_quien uuid, e jsonb, p_cuando timestamptz) returns text language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  return public._cotizacion_abierta_firmar((e ->> 'o')::uuid, (e ->> 'f')::uuid, p_cuando);
end $f$;

-- `cotizacion_crear` como esa persona con esa hoja abierta. Devuelve la respuesta, o {error, mensaje, detail, hint}.
create or replace function pg_temp.tv_crear(p_quien uuid, e jsonb, p_abierta text, p_con_la_abierta boolean) returns jsonb language plpgsql as $f$
declare v jsonb; v_m text; v_e text; v_d text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    v := public.cotizacion_crear(gen_random_uuid(), (e ->> 'o')::uuid, (e ->> 'l')::uuid, '{"inputs": {"visible": 10}}'::jsonb, p_abierta, (e ->> 'v')::uuid,
                                 p_con_la_abierta => p_con_la_abierta);
  exception when others then
    get stacked diagnostics v_m = message_text, v_d = pg_exception_detail, v_h = pg_exception_hint;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'detail', nullif(v_d, ''), 'hint', nullif(v_h, ''));
  end;
  reset role;
  return v;
end $f$;

-- El terreno: un origen con una fórmula publicada que nombra la tarifa `oficial`, quien cotiza, su lead y un vehículo. Los cambios de tarifa que ya había
-- pasaron hace días, para que la hoja se abra «después» de ellos.
create or replace function pg_temp.tv_preparar() returns jsonb language plpgsql as $f$
declare o uuid; f uuid; a uuid; l uuid; v uuid;
begin
  a := pg_temp.tv_persona(array['cotizaciones.ver', 'cotizaciones.crear', 'leads.ver', 'vehiculos.ver']);
  insert into public.origenes (clave, nombre) values ('tv_' || substr(gen_random_uuid()::text, 1, 8), 'TV origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', jsonb_build_object('nodos', jsonb_build_array(
            jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', 'oficial', 'etiqueta', 'TC', 'formato', 'raw'),
            jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
            jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')),
            'buckets', jsonb_build_object('origen', 'tc')),
          '{}', '{}', jsonb_build_object('tc', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'),
                                         'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  insert into public.leads (nombre, telefono_principal, creado_por)
  values ('TV lead', '59' || lpad((('x' || substr(md5(gen_random_uuid()::text), 1, 7))::bit(28)::int % 100000000)::text, 8, '0'), a)
  returning id into l;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'TV vehículo', 'toyota') returning id into v;
  update public.tipos_cambio_historial set cambiado_en = now() - interval '10 days' where tipo_cambio_id in (select id from public.tipos_cambio);
  return jsonb_build_object('o', o, 'f', f, 'a', a, 'l', l, 'v', v);
end $f$;

-- @test cotizacion_crear: una tarifa que confirma después de abrir la hoja, con un cambiado_en anterior, no cuenta como vista (4-33)
begin;
do $$
declare
  e jsonb := pg_temp.tv_preparar(); a uuid; v_abierta timestamptz := now() - interval '1 hour'; v_tok text; v_tok2 text; v_partes text[];
  v_id_oficial uuid; v_antes numeric; r jsonb; n int; c public.cotizaciones;
begin
  a := (e ->> 'a')::uuid;
  select id, valor into v_id_oficial, v_antes from public.tipos_cambio where clave = 'oficial';
  if v_id_oficial is null then raise exception 'el terreno pide la tarifa oficial'; end if;
  -- La hoja se abre hace una hora y ve la oficial de antes.
  v_tok := pg_temp.tv_abrir(a, e, v_abierta);
  -- Una transacción que empezó antes de abrir la hoja confirma después: su `cambiado_en` es anterior a la apertura.
  update public.tipos_cambio set valor = valor + 1 where id = v_id_oficial;
  update public.tipos_cambio_historial set cambiado_en = v_abierta - interval '1 hour' where tipo_cambio_id = v_id_oficial and valor_nuevo = v_antes + 1;
  select count(*) into n from public.cotizaciones where origen_id = (e ->> 'o')::uuid;

  -- T1.
  r := pg_temp.tv_crear(a, e, v_tok, false);
  if r ->> 'error' is distinct from 'PT409' or r ->> 'detail' is distinct from 'desactualizada' or r ->> 'hint' is distinct from 'tipo_cambio' then
    raise exception 'T1: una tarifa que la hoja no vio debía dar PT409 desactualizada (tipo_cambio): %', r;
  end if;
  -- T2.
  r := pg_temp.tv_crear(a, e, v_tok, true);
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'abierta' then
    raise exception 'T2: con la N y una tarifa que la hoja no vio debía pedir recargar (22023, hint abierta): %', r;
  end if;
  if (select count(*) from public.cotizaciones where origen_id = (e ->> 'o')::uuid) <> n then
    raise exception 'T1/T2: no debía guardar ninguna cotización';
  end if;

  -- T3: la hoja abierta a la misma hora pero firmada después del cambio ya lo vio.
  v_tok2 := pg_temp.tv_abrir(a, e, v_abierta);
  r := pg_temp.tv_crear(a, e, v_tok2, false);
  if r ? 'error' then raise exception 'T3: una hoja que vio la tarifa debía guardar: %', r; end if;
  r := pg_temp.tv_crear(a, e, v_tok2, true);
  if r ? 'error' then raise exception 'T3: con la N, una hoja que vio la tarifa debía guardar: %', r; end if;
  select * into c from public.cotizaciones where id = (r -> 'cotizacion' ->> 'id')::uuid;
  if (c.tipos_cambio ->> 'oficial')::numeric is distinct from v_antes + 1 then
    raise exception 'T3: con la N debía congelar la tarifa que vio (%): %', v_antes + 1, c.tipos_cambio;
  end if;

  -- T4: la huella es la tercera parte del texto; otra huella con la misma firma no vale.
  v_partes := string_to_array(v_tok2, '.');
  if cardinality(v_partes) <> 4 or v_partes[3] !~ '^[0-9a-f]{32}$' then raise exception 'T4: la hoja abierta debía llevar su huella: %', v_tok2; end if;
  r := pg_temp.tv_crear(a, e, v_partes[1] || '.' || v_partes[2] || '.' || md5('otra') || '.' || v_partes[4], false);
  if r ->> 'detail' is distinct from 'abierta_invalida' then raise exception 'T4: una huella cambiada debía ser abierta_invalida: %', r; end if;
end $$;
rollback;
