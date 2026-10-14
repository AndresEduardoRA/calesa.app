-- Campos configurables de los leads: el layout y las RPC que lo escriben. Escrito a mano.
--
-- Hasta acá un lead tenía seis datos fijos como columna (edad, ciudad, país, dirección, género y
-- notas). Pasan a ser campos de fábrica de un layout que cada empresa arma, igual que el de los
-- orígenes de vehículos, sobre el mismo motor (`_campo_*`, de `…000600`). Nombre, teléfono, tipo y
-- origen siguen siendo columnas: no se apagan ni se borran.
--
-- Esta migración sólo crea el layout y lo siembra. Mover las seis columnas a `leads.atributos`, el
-- recorte por cartera y `crear_lead` van en la siguiente. Se aplica sobre una base viva: todo es
-- idempotente y la estructura también vive en `supabase/schemas/`.

-- ---------------------------------------------------------------------------
-- Estructura (espejo de schemas/, para la base que ya existe)
-- ---------------------------------------------------------------------------
alter table public.leads
  add column if not exists atributos jsonb not null default '{}'::jsonb check (jsonb_typeof(atributos) = 'object');

create table if not exists public.leads_campos (
  id            uuid primary key default gen_random_uuid(),
  clave         text not null unique check (clave ~ '^[a-z][a-z0-9_]{1,40}$'),
  etiqueta      text not null,
  tipo          public.tipo_campo not null,
  opciones      jsonb not null default '[]'::jsonb,
  requerido     boolean not null default false,
  valor_defecto jsonb,
  valor_defecto_empresa text check (valor_defecto_empresa in ('ciudad', 'pais')),
  grupo         text,
  orden         smallint not null default 0,
  en_tabla      boolean not null default false,
  filtrable     boolean not null default false,
  solo_cartera  boolean not null default false,
  es_sistema    boolean not null default false,
  activo        boolean not null default true,
  actualizado_en timestamptz not null default now(),
  constraint leads_campos_tipo_de_lead check (tipo not in ('vin', 'lote')),
  constraint leads_campos_defecto_excluyente check (valor_defecto_empresa is null or (valor_defecto is null and tipo = 'texto'))
);

-- Un vehículo no lleva correo ni documento.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'origenes_campos_tipo_de_vehiculo' and conrelid = 'public.origenes_campos'::regclass) then
    alter table public.origenes_campos
      add constraint origenes_campos_tipo_de_vehiculo check (tipo not in ('correo', 'documento'));
  end if;
end $$;

-- Sólo lectura para la app (los formularios la necesitan): se escribe por las RPC de abajo.
alter table public.leads_campos enable row level security;
revoke all on table public.leads_campos from anon, authenticated;
grant select, insert, update, delete on table public.leads_campos to service_role;
grant select on table public.leads_campos to authenticated;
drop policy if exists "leads_campos: leer" on public.leads_campos;
create policy "leads_campos: leer" on public.leads_campos for select to authenticated using (true);

drop trigger if exists trg_actualizado_en on public.leads_campos;
create trigger trg_actualizado_en before update on public.leads_campos for each row execute function public.set_actualizado_en();
drop trigger if exists trg_auditar on public.leads_campos;
create trigger trg_auditar after insert or update or delete on public.leads_campos for each row execute function public.auditar();

-- ---------------------------------------------------------------------------
-- Campos de fábrica: lo que eran las seis columnas
-- ---------------------------------------------------------------------------
-- Las claves son las de las columnas viejas: así el mismo recorte cubre lo que ya hay en `actividad`.
insert into public.leads_campos (clave, etiqueta, tipo, opciones, grupo, orden, en_tabla, filtrable, solo_cartera, es_sistema, valor_defecto_empresa) values
  ('edad', 'Edad', 'numero', '[]', 'Datos personales', 10, false, true, false, true, null),
  ('genero', 'Género', 'opcion',
   '[{"clave": "femenino", "etiqueta": "Femenino"}, {"clave": "masculino", "etiqueta": "Masculino"}, {"clave": "otro", "etiqueta": "Otro"}]',
   'Datos personales', 20, false, true, false, true, null),
  ('ciudad', 'Ciudad', 'texto', '[]', 'Ubicación', 30, true, true, false, true, 'ciudad'),
  ('pais', 'País', 'texto', '[]', 'Ubicación', 40, false, true, false, true, 'pais'),
  ('direccion', 'Dirección', 'texto', '[]', 'Ubicación', 50, false, false, true, true, null),
  ('notas', 'Notas', 'texto_largo', '[]', 'Notas', 60, false, false, false, true, null)
on conflict (clave) do nothing;

-- ---------------------------------------------------------------------------
-- Ayudas internas (nadie las llama desde la app)
-- ---------------------------------------------------------------------------
-- Claves que son columnas de `leads` o datos fijos: un campo propio con ese nombre se prestaría a
-- confusión. Espejo de `CLAVES_RESERVADAS_DE_LEAD` en `leads/entities/campo.ts`.
create or replace function public._lead_clave_reservada(p_clave text)
returns boolean language sql immutable set search_path = '' as $$
  select p_clave = any (array['id', 'numero', 'nombre', 'telefono', 'telefonos', 'telefono_cc', 'telefono_principal',
    'tipo', 'origen', 'origen_lead_id', 'atributos', 'cartera', 'dueno', 'creado_por', 'creado_en', 'actualizado_en',
    'eliminado_en', 'eliminado_por', 'ultimo_seguimiento_en', 'lote_papelera_id']);
$$;
revoke all on function public._lead_clave_reservada(text) from public, anon, authenticated;

-- ¿Cuántos leads tienen valor en este campo? Cuenta también los de la papelera.
create or replace function public._lead_campo_con_valor(p_clave text)
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.leads l where public._campo_tiene_valor(l.atributos -> p_clave);
$$;
revoke all on function public._lead_campo_con_valor(text) from public, anon, authenticated;

create or replace function public._lead_campos_renumerar()
returns void language sql security definer set search_path = '' as $$
  update public.leads_campos c set orden = n.orden_nuevo
  from public._campos_renumerar((
    select jsonb_agg(jsonb_build_object('id', x.id, 'clave', x.clave, 'orden', x.orden)) from public.leads_campos x)) n
  where c.id = n.campo_id and c.orden <> n.orden_nuevo;
$$;
revoke all on function public._lead_campos_renumerar() from public, anon, authenticated;

-- «La de la empresa» sólo tiene sentido en un campo de texto sin otro valor por defecto.
create or replace function public._lead_defecto_empresa(p_tipo public.tipo_campo, p_defecto jsonb, p_empresa text)
returns text language plpgsql immutable set search_path = '' as $$
begin
  if p_empresa is null or p_empresa = '' then return null; end if;
  if p_empresa not in ('ciudad', 'pais') then
    raise exception 'De la empresa sólo se toma la ciudad o el país.' using errcode = '22023';
  end if;
  if p_tipo <> 'texto' then
    raise exception 'El dato de la empresa sólo se usa en un campo de texto.' using errcode = '22023';
  end if;
  if p_defecto is not null then
    raise exception 'Un campo lleva un valor por defecto o el de la empresa, no los dos.' using errcode = '22023';
  end if;
  return p_empresa;
end;
$$;
revoke all on function public._lead_defecto_empresa(public.tipo_campo, jsonb, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC del layout (permiso `leads.configurar`)
-- ---------------------------------------------------------------------------
-- Si no viene `p_solo_cartera`, lo decide el tipo: el correo y el documento nacen privados.
create or replace function public.lead_campo_crear(
  p_clave text, p_etiqueta text, p_tipo public.tipo_campo, p_opciones jsonb default '[]'::jsonb,
  p_requerido boolean default false, p_grupo text default null, p_en_tabla boolean default false,
  p_filtrable boolean default false, p_solo_cartera boolean default null, p_valor_defecto jsonb default null,
  p_valor_defecto_empresa text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_etiqueta text; v_grupo text := nullif(btrim(p_grupo), ''); v_id uuid; v_version timestamptz;
  v_defecto jsonb; v_empresa text;
begin
  perform public.assert_permiso('leads.configurar');
  -- El orden es del layout entero: el candado también ordena el «último + 10» de dos altas a la vez.
  lock table public.leads_campos in share row exclusive mode;
  if p_clave is null or p_clave !~ '^[a-z][a-z0-9_]{1,40}$' then
    raise exception 'La clave del campo usa minúsculas, números y guion bajo, y empieza con una letra.';
  end if;
  if public._lead_clave_reservada(p_clave) then
    raise exception '«%» ya es un dato fijo de todos los leads: no se crea como campo propio.', p_clave;
  end if;
  if p_tipo in ('vin', 'lote') then
    raise exception 'Un lead no lleva campos de ese tipo.';
  end if;
  v_etiqueta := public._campo_nombre_valido(p_etiqueta, 'el nombre del campo', 60);
  perform public._campo_opciones_validas(coalesce(p_opciones, '[]'::jsonb));
  if p_tipo in ('opcion', 'multi_opcion') and jsonb_array_length(coalesce(p_opciones, '[]'::jsonb)) = 0 then
    raise exception 'Un campo de opciones necesita al menos una opción.';
  end if;
  if p_tipo not in ('opcion', 'multi_opcion') and jsonb_array_length(coalesce(p_opciones, '[]'::jsonb)) > 0 then
    raise exception 'Sólo un campo de opciones lleva opciones.';
  end if;
  if v_grupo is not null and length(v_grupo) > 40 then raise exception 'El nombre del grupo no puede pasar de 40 caracteres.'; end if;
  v_defecto := public._campo_valor_defecto(p_tipo, coalesce(p_opciones, '[]'::jsonb), p_valor_defecto);
  v_empresa := public._lead_defecto_empresa(p_tipo, v_defecto, p_valor_defecto_empresa);
  begin
    insert into public.leads_campos (clave, etiqueta, tipo, opciones, requerido, grupo, orden, en_tabla, filtrable,
                                     solo_cartera, es_sistema, valor_defecto, valor_defecto_empresa)
    values (p_clave, v_etiqueta, p_tipo, coalesce(p_opciones, '[]'::jsonb), coalesce(p_requerido, false), v_grupo,
            coalesce((select max(c.orden) + 10 from public.leads_campos c), 10),
            coalesce(p_en_tabla, false), coalesce(p_filtrable, false),
            coalesce(p_solo_cartera, p_tipo in ('correo', 'documento')), false, v_defecto, v_empresa)
    returning id, actualizado_en into v_id, v_version;
  exception when unique_violation then
    raise exception 'Ya hay un campo con la clave «%».', p_clave using errcode = '23505';
  end;
  return jsonb_build_object('id', v_id, 'actualizado_en', v_version);
end;
$$;
revoke all on function public.lead_campo_crear(text, text, public.tipo_campo, jsonb, boolean, text, boolean, boolean, boolean, jsonb, text) from public, anon;
grant execute on function public.lead_campo_crear(text, text, public.tipo_campo, jsonb, boolean, text, boolean, boolean, boolean, jsonb, text) to authenticated;

-- Lo que cambiaría una edición, contado antes de hacerla: la pantalla lo muestra y, al confirmar, la
-- misma regla vuelve a correr en `lead_campo_guardar`. Cuenta también los leads de la papelera. Son
-- agregados: nunca un valor.
create or replace function public.lead_campo_impacto(p_campo uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c public.leads_campos;
begin
  perform public.assert_permiso('leads.configurar');
  select * into c from public.leads_campos x where x.id = p_campo;
  if not found then raise exception 'Ese campo ya no existe.' using errcode = 'PT409'; end if;
  return public._campo_impacto(array(select l.atributos -> c.clave from public.leads l), c.tipo);
end;
$$;
revoke all on function public.lead_campo_impacto(uuid) from public, anon;
grant execute on function public.lead_campo_impacto(uuid) to authenticated;

-- Cambia sólo las claves presentes en `p_cambios`; un valor nulo vacía la columna (grupo, valor por
-- defecto). Devuelve la versión nueva del campo. Un valor por defecto que deja de servir (cambió el
-- tipo, se sacó su opción) se limpia solo; uno que viene mal en `p_cambios` se rechaza.
create or replace function public.lead_campo_guardar(p_campo uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  c public.leads_campos; v_clave text; v_nueva timestamptz;
  v_editables constant text[] := array['etiqueta', 'tipo', 'opciones', 'requerido', 'grupo', 'en_tabla', 'filtrable',
    'solo_cartera', 'activo', 'valor_defecto', 'valor_defecto_empresa'];
  v_tipo public.tipo_campo; v_opciones jsonb; v_grupo text; v_con int; v_orden smallint; v_defecto jsonb; v_empresa text;
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
    solo_cartera = coalesce((p_cambios ->> 'solo_cartera')::boolean, x.solo_cartera),
    activo = coalesce((p_cambios ->> 'activo')::boolean, x.activo),
    valor_defecto = v_defecto,
    valor_defecto_empresa = v_empresa,
    orden = v_orden
  where x.id = p_campo
  returning x.actualizado_en into v_nueva;
  if v_orden is distinct from c.orden then
    perform public._lead_campos_renumerar();
  end if;
  return v_nueva;
end;
$$;
revoke all on function public.lead_campo_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.lead_campo_guardar(uuid, timestamptz, jsonb) to authenticated;

-- «Ponlo después de X» (nulo = primero). Relativo y no por posición: si alguien agregó un campo
-- entre tanto, el campo queda donde la persona lo quiso, junto a su vecino.
create or replace function public.lead_campo_mover(p_campo uuid, p_actualizado_en_esperado timestamptz, p_despues_de uuid default null)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare c public.leads_campos; v_nueva timestamptz;
begin
  perform public.assert_permiso('leads.configurar');
  -- El orden es del layout entero: el candado hace que dos reordenamientos vayan en fila.
  lock table public.leads_campos in share row exclusive mode;
  select * into c from public.leads_campos x where x.id = p_campo for update;
  if not found then raise exception 'Ese campo ya no existe.' using errcode = 'PT409'; end if;
  perform public._exigir_version(c.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este campo mientras lo editabas.');
  if p_despues_de is not null then
    if p_despues_de = p_campo then raise exception 'Un campo no puede ir después de sí mismo.'; end if;
    if not exists (select 1 from public.leads_campos x where x.id = p_despues_de) then
      raise exception 'Ese campo ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
    end if;
  end if;

  update public.leads_campos x set orden = n.orden_nuevo
  from public._campos_reordenar((
    select jsonb_agg(jsonb_build_object('id', y.id, 'clave', y.clave, 'orden', y.orden)) from public.leads_campos y),
    p_campo, p_despues_de) n
  where x.id = n.campo_id and x.orden <> n.orden_nuevo;

  select x.actualizado_en into v_nueva from public.leads_campos x where x.id = p_campo;
  return v_nueva;
end;
$$;
revoke all on function public.lead_campo_mover(uuid, timestamptz, uuid) from public, anon;
grant execute on function public.lead_campo_mover(uuid, timestamptz, uuid) to authenticated;

-- Sólo un campo propio que ningún lead usa. Si no, se desactiva y el dato se conserva.
create or replace function public.lead_campo_eliminar(p_campo uuid, p_actualizado_en_esperado timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.leads_campos; v_con int;
begin
  perform public.assert_permiso('leads.configurar');
  select * into c from public.leads_campos x where x.id = p_campo for update;
  if not found then raise exception 'Ese campo ya no existe.' using errcode = 'PT409'; end if;
  perform public._exigir_version(c.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este campo mientras lo editabas.');
  if c.es_sistema then
    raise exception '«%» es un campo de fábrica: no se elimina. Puedes desactivarlo.', c.etiqueta using errcode = '23503';
  end if;
  v_con := public._lead_campo_con_valor(c.clave);
  if v_con > 0 then
    raise exception '% % tienen un valor en «%». Desactívalo para conservarlo.',
      v_con, case when v_con = 1 then 'lead' else 'leads' end, c.etiqueta using errcode = '23503';
  end if;
  delete from public.leads_campos where id = p_campo;
end;
$$;
revoke all on function public.lead_campo_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.lead_campo_eliminar(uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- El permiso ya existía: ahora también gobierna los campos
-- ---------------------------------------------------------------------------
update public.permisos
set descripcion = 'Los campos de los leads, los orígenes de lead y los tipos de seguimiento',
    aplicado_en = 'lead_campo_*, policy origenes_lead, tipos_seguimiento'
where clave = 'leads.configurar';
