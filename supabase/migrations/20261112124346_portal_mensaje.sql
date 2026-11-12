-- 9.04-4 (plantillas por empresa, C7–C9): el mensaje del portal para WhatsApp se guarda por `portal_mensaje_guardar(p_texto, p_actualizado_en_esperado)`,
-- con `leads.configurar` y PT409. Hasta 1000 caracteres, sólo las variables {cliente}, {empresa}, {codigo}, {clave} y {direccion}, y {codigo} y {clave}
-- obligatorias (D5; 22023, hint `texto`). Null o en blanco restablece el de fábrica, que pone la app (D3). Guardarlo no mueve la versión del embudo (D2).
-- La prueba: `supabase/tests/areas/plantillas/portal.sql` y el caso «sin {codigo}» de `plantillas.sql`.

-- ---------------------------------------------------------------------------------------------------
-- C7 · validar y normalizar. Sólo para las funciones «definer»: `auditoria-leads.sql` cae si `^_portal_` queda al alcance de la app.
-- ---------------------------------------------------------------------------------------------------
create or replace function public._portal_mensaje_normalizar(p_texto text) returns text
language plpgsql immutable
set search_path = ''
as $$
declare v text; v_var text;
begin
  v := btrim(replace(coalesce(p_texto, ''), E'\r\n', E'\n'), E' \t\n\r');
  if v = '' then
    return null;
  end if;
  if char_length(v) > 1000 then
    raise exception 'El mensaje lleva hasta 1000 caracteres.' using errcode = '22023', hint = 'texto';
  end if;
  for v_var in select m[1] from regexp_matches(v, '\{([a-z_]+)\}', 'g') m loop
    if not (v_var = any (array['cliente', 'empresa', 'codigo', 'clave', 'direccion'])) then
      raise exception '{%} no es una variable del mensaje. Usa {cliente}, {empresa}, {codigo}, {clave} o {direccion}.', v_var
        using errcode = '22023', hint = 'texto';
    end if;
  end loop;
  if strpos(v, '{codigo}') = 0 or strpos(v, '{clave}') = 0 then
    raise exception 'El mensaje tiene que llevar {codigo} y {clave}: sin ellos el cliente no puede entrar.' using errcode = '22023', hint = 'texto';
  end if;
  return v;
end;
$$;

revoke all on function public._portal_mensaje_normalizar(text) from public, anon, authenticated;
grant execute on function public._portal_mensaje_normalizar(text) to service_role;

-- ---------------------------------------------------------------------------------------------------
-- C8 · guardar, con la forma de `embudo_plantilla_guardar`.
-- ---------------------------------------------------------------------------------------------------
create or replace function public.portal_mensaje_guardar(p_texto text, p_actualizado_en_esperado timestamptz) returns timestamptz
language plpgsql security definer
set search_path = ''
as $$
declare a public.ajustes_leads; v_nuevo text;
begin
  perform public.assert_permiso('leads.configurar');
  v_nuevo := public._portal_mensaje_normalizar(p_texto);
  select * into a from public.ajustes_leads where id = 1 for update;
  perform public._exigir_version(a.portal_actualizado_en, p_actualizado_en_esperado,
    'Alguien cambió el mensaje del portal mientras lo veías. Recarga para seguir.');
  if v_nuevo is not distinct from a.portal_mensaje then
    return a.portal_actualizado_en;
  end if;
  update public.ajustes_leads
     set portal_mensaje = v_nuevo,
         portal_actualizado_en = greatest(clock_timestamp(), a.portal_actualizado_en + interval '1 microsecond')
   where id = 1
  returning portal_actualizado_en into a.portal_actualizado_en;
  return a.portal_actualizado_en;
end;
$$;

revoke all on function public.portal_mensaje_guardar(text, timestamptz) from public, anon;
grant execute on function public.portal_mensaje_guardar(text, timestamptz) to authenticated, service_role;

comment on function public.portal_mensaje_guardar(text, timestamptz) is
  'Guarda el mensaje del portal para WhatsApp (null o en blanco = el de fábrica). leads.configurar; 22023 con hint texto; PT409 con versión vieja. Devuelve la versión. 9.04-4.';

-- ---------------------------------------------------------------------------------------------------
-- C9 · `leads.configurar` también gobierna las plantillas (el mismo texto en `seed.sql`).
-- ---------------------------------------------------------------------------------------------------
update public.permisos
   set descripcion = 'Los orígenes de lead, los tipos de lead, los tipos de seguimiento y las plantillas del embudo y del mensaje del portal',
       aplicado_en = 'origen_lead_*, origenes_lead_con_uso, tipo_lead_*, tipos_lead_con_uso, tipo_seguimiento_*, tipos_seguimiento_con_uso, embudo_plantilla_guardar, portal_mensaje_guardar'
 where clave = 'leads.configurar';
