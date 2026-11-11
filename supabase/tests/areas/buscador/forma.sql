-- El buscador, la forma (paso 7.12-1): lo que se lee del catálogo, sin terreno. No depende de otro archivo (`SOLO=areas/buscador/forma.sql`).
--
-- Qué asegura:
--   B5. `buscador_cotizaciones` no devuelve montos: sus columnas son las de la sección y su cuerpo no nombra nada oculto.
--   B8. Privilegios: authenticated sí, anon y PUBLIC no; sólo `buscador_cotizaciones` es definer, y todas con search_path vacío.

-- @test buscador forma: B5 buscador_cotizaciones no devuelve montos ni nada oculto
do $$
declare v_oid oid := 'public.buscador_cotizaciones(text, integer)'::regprocedure;
begin
  if pg_get_function_result(v_oid) is distinct from
     'TABLE(id uuid, numero bigint, origen_id uuid, titulo text, clase clase_cotizacion, estado estado_cotizacion, creado_en timestamp with time zone)' then
    raise exception 'B5: las columnas no son las de la sección: %', pg_get_function_result(v_oid);
  end if;
  if (select prosrc from pg_proc where oid = v_oid) ~ '(total_base|moneda_mostrar|valores|fuentes|totales|tipos_cambio)' then
    raise exception 'B5: el cuerpo nombra una columna oculta';
  end if;
end $$;

-- @test buscador forma: B8 privilegios: authenticated sí, anon y PUBLIC no; sólo buscador_cotizaciones es definer; search_path vacío en todas
do $$
declare f text; v_oid oid;
begin
  foreach f in array array['public._buscador_interpretar(text)', 'public.buscador_leads(text, integer)', 'public.buscador_vehiculos(text, integer)',
                           'public.buscador_cotizaciones(text, integer)'] loop
    v_oid := f::regprocedure;
    if not has_function_privilege('authenticated', v_oid, 'execute') then raise exception 'B8: authenticated no ejecuta %', f; end if;
    if has_function_privilege('anon', v_oid, 'execute') then raise exception 'B8: anon ejecuta %', f; end if;
    if exists (select 1 from aclexplode((select proacl from pg_proc where oid = v_oid)) a where a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      raise exception 'B8: PUBLIC ejecuta %', f;
    end if;
    if not coalesce((select proconfig from pg_proc where oid = v_oid) @> array['search_path=""'], false) then raise exception 'B8: % sin search_path vacío', f; end if;
    if (select prosecdef from pg_proc where oid = v_oid) is distinct from (f = 'public.buscador_cotizaciones(text, integer)') then
      raise exception 'B8: % no tiene el security que corresponde', f;
    end if;
  end loop;
end $$;
