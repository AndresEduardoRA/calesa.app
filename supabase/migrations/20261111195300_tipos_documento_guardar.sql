-- Tipos de documento: guardar con versión (paso 5.03, C6, C7, C11 y C14).
--   C6. `tipo_documento_guardar(id, versión, cambios)`: lista cerrada (`proposito`, `orden` y `flujo_id` no se cambian, D2), el permiso del grupo antes
--       que la versión, los datos validados sobre el estado que resulta y PT409 si otra persona lo cambió. Sin diferencia no escribe.
--   C7. Achicar los formatos que pide un requisito falla: primero se quita el formato del requisito.
--   C11. `fase_requisito_validar()` lee los formatos del tipo `for share`: un requisito que se crea mientras otra sesión achica los formatos espera y
--        se valida contra los nuevos (y guardar, con la fila `for update`, ve el requisito ya confirmado).
--   C14. El significado del vencimiento queda escrito en la tabla (D1); lo hace cumplir la Fase 6 en `documentos.vence_el`.

create or replace function public.tipo_documento_guardar(p_id uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare o public.tipos_documento; t public.tipos_documento; v_fase text; v_formato text;
begin
  select * into o from public.tipos_documento x where x.id = p_id;
  if not found then
    raise exception 'Ese tipo de documento ya no existe.' using errcode = 'PT409';
  end if;
  perform public._tipo_documento_exigir_permiso(o.flujo_id);
  lock table public.tipos_documento in share row exclusive mode;
  select * into o from public.tipos_documento x where x.id = p_id for update;
  if not found then
    raise exception 'Ese tipo de documento ya no existe.' using errcode = 'PT409';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  t := public._tipo_documento_validar(public._tipo_documento_de_jsonb(o, p_cambios, false), public._tipos_documento_formatos());
  if (t.nombre, t.descripcion, t.activo, t.formatos, t.modo_vencimiento, t.vigencia_dias, t.aviso_dias, t.visible_portal_permitido)
     is not distinct from
     (o.nombre, o.descripcion, o.activo, o.formatos, o.modo_vencimiento, o.vigencia_dias, o.aviso_dias, o.visible_portal_permitido) then
    return jsonb_build_object('id', p_id, 'actualizado_en', o.actualizado_en, 'sin_cambios', true);
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este tipo de documento mientras lo editabas.');
  if t.nombre is distinct from o.nombre or (t.activo and not o.activo) then
    perform public._tipo_documento_nombre_libre(t.id, t.flujo_id, t.nombre, t.activo);
  end if;
  -- C7 · por fases_requisitos_tipo_documento_id_idx.
  if t.formatos is distinct from o.formatos then
    select f.nombre, (select x from unnest(r.formatos) x where not (x = any (t.formatos)) limit 1) into v_fase, v_formato
    from public.fases_requisitos r join public.fases f on f.id = r.fase_id
    where r.tipo_documento_id = p_id and r.formatos is not null and not (r.formatos <@ t.formatos)
    order by f.orden, f.nombre
    limit 1;
    if found then
      raise exception 'El requisito de «%» pide «%»: quítalo de ese requisito antes.', v_fase, v_formato using errcode = '22023', hint = 'formatos';
    end if;
  end if;
  begin
    update public.tipos_documento x
       set nombre = t.nombre, descripcion = t.descripcion, activo = t.activo, formatos = t.formatos, modo_vencimiento = t.modo_vencimiento,
           vigencia_dias = t.vigencia_dias, aviso_dias = t.aviso_dias, visible_portal_permitido = t.visible_portal_permitido
     where x.id = p_id
    returning x.actualizado_en into t.actualizado_en;
  exception when unique_violation then
    raise exception 'Ya hay un tipo de documento «%».', t.nombre using errcode = '23505', hint = 'nombre';
  end;
  return jsonb_build_object('id', p_id, 'actualizado_en', t.actualizado_en, 'sin_cambios', false);
end;
$$;

revoke all on function public.tipo_documento_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.tipo_documento_guardar(uuid, timestamptz, jsonb) to authenticated, service_role;

-- C11 · desde su definición vigente (la base); el único cambio es `for share` en la lectura de los formatos del tipo.
create or replace function public.fase_requisito_validar() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare v_flujo uuid; v_ambito public.ambito_flujo; v_ambito_espera public.ambito_flujo; v_formatos text[];
begin
  select f.flujo_id, fl.ambito into v_flujo, v_ambito from public.fases f join public.flujos fl on fl.id = f.flujo_id where f.id = new.fase_id;
  if new.tipo = 'dato' and not (new.clave_dato = any (public.claves_dato_requisito(v_ambito))) then
    raise exception 'Clave de dato desconocida para este flujo: %', new.clave_dato using errcode = '22023';
  end if;
  if new.tipo = 'dato' and new.clave_dato = 'pagos.umbral_pct' and coalesce((new.config ->> 'pct')::numeric, -1) not between 0 and 100 then
    raise exception 'pagos.umbral_pct necesita config.pct entre 0 y 100' using errcode = '22023';
  end if;
  if new.tipo = 'documento' then
    select formatos into v_formatos from public.tipos_documento where id = new.tipo_documento_id for share;
    if new.formatos is not null and not (new.formatos <@ v_formatos) then
      raise exception 'Los formatos del requisito deben estar entre los del tipo de documento.' using errcode = '22023';
    end if;
    if exists (select 1 from public.tipos_documento td where td.id = new.tipo_documento_id and td.flujo_id is not null and td.flujo_id <> v_flujo) then
      raise exception 'El tipo de documento pertenece a otro flujo.' using errcode = '22023';
    end if;
  end if;
  if new.tipo = 'espera' then
    if not public.flujo_regla_activa(v_flujo, 'esperas') then raise exception 'Las esperas están apagadas en este flujo.' using errcode = '23514'; end if;
    select fl.ambito into v_ambito_espera from public.fases f join public.flujos fl on fl.id = f.flujo_id where f.id = new.espera_fase_id;
    if v_ambito_espera = v_ambito then raise exception 'Una espera apunta a una fase de OTRO flujo (vehículos ↔ repuestos).' using errcode = '22023'; end if;
    if (v_ambito = 'vehiculos' and new.espera_ambito <> 'hijos') or (v_ambito = 'repuestos' and new.espera_ambito <> 'padre') then
      raise exception 'Un vehículo espera a sus hijos (repuestos); un repuesto espera a su padre (vehículo).' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

-- C14 · el significado del vencimiento (D1).
comment on column public.tipos_documento.modo_vencimiento is
  'ninguno = no vence; solicitar = quien sube el documento escribe su fecha de vencimiento; renovar = vence solo a los vigencia_dias de subido. Lo hace cumplir la Fase 6 en documentos.vence_el.';
comment on column public.tipos_documento.vigencia_dias is 'Sólo con renovar: días desde que se sube hasta que vence.';
comment on column public.tipos_documento.aviso_dias is 'Cuántos días antes de vence_el se avisa; nulo = no avisa. Con renovar, no más que vigencia_dias.';
comment on column public.tipos_documento.proposito is 'Clave interna de la semilla (titulo, bl…); no se edita en la pantalla.';
