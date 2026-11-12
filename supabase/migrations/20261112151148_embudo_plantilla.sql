-- 9.04-4 (plantillas por empresa, C5–C6): la plantilla del embudo se guarda por `embudo_plantilla_guardar(p_etapas, p_actualizado_en_esperado)`, con
-- `leads.configurar` y PT409. Valida con las reglas y los textos de `embudo_etapas_guardar` (22023, hint `etapas`); no guarda ids (D6). Null restablece
-- las seis de fábrica (D3). Orden: permiso → validación → candado y versión → sin cambios (D7). Sólo afecta a los embudos que nacen después.
-- La prueba: `supabase/tests/areas/plantillas/plantillas.sql` y la fila de `supabase/tests/matriz-leads.sql`.

-- ---------------------------------------------------------------------------------------------------
-- C5 · validar y normalizar. Un booleano presente que no es `boolean` llega incompleto (22023, no 22P02); un null de JSON cuenta como ausente (false),
-- como en `_embudo_insertar`. STABLE y no IMMUTABLE: `jsonb_build_object` es STABLE (`db:lint`).
-- ---------------------------------------------------------------------------------------------------
create or replace function public._embudo_plantilla_normalizar(p_etapas jsonb) returns jsonb
language plpgsql stable
set search_path = ''
as $$
declare
  x jsonb; v_n int; v_nombres text[] := '{}'::text[]; v_nombre text; v_color text; b text;
  v_es_ini boolean; v_es_gan boolean; v_es_per boolean; v_ini int := 0; v_gan int := 0; v_per int := 0; v_nueva jsonb := '[]'::jsonb;
begin
  if p_etapas is null or jsonb_typeof(p_etapas) <> 'array' then
    raise exception 'Las etapas tienen que ser una lista.' using errcode = '22023', hint = 'etapas';
  end if;
  v_n := jsonb_array_length(p_etapas);
  if v_n < 3 or v_n > 12 then
    raise exception 'Un embudo lleva entre 3 y 12 etapas.' using errcode = '22023', hint = 'etapas';
  end if;
  for x in select * from jsonb_array_elements(p_etapas) loop
    if jsonb_typeof(x) <> 'object' then
      raise exception 'Una de las etapas llegó incompleta. Recarga e intenta de nuevo.' using errcode = '22023', hint = 'etapas';
    end if;
    foreach b in array array['es_inicial', 'es_ganada', 'es_perdida'] loop
      if jsonb_typeof(x -> b) not in ('boolean', 'null') then
        raise exception 'Una de las etapas llegó incompleta. Recarga e intenta de nuevo.' using errcode = '22023', hint = 'etapas';
      end if;
    end loop;
    v_nombre := btrim(coalesce(x ->> 'nombre', ''));
    if char_length(v_nombre) not between 1 and 30 then
      raise exception 'El nombre de una etapa lleva entre 1 y 30 caracteres.' using errcode = '22023', hint = 'etapas';
    end if;
    if exists (select 1 from unnest(v_nombres) n where lower(n) = lower(v_nombre)) then
      raise exception 'Hay dos etapas «%». Cámbiale el nombre a una.', v_nombre using errcode = '22023', hint = 'etapas';
    end if;
    v_color := x ->> 'color';
    if v_color is null or not (v_color = any (public._etiquetas_paleta())) then
      raise exception 'Elige un color de la paleta para «%».', v_nombre using errcode = '22023', hint = 'etapas';
    end if;
    v_es_ini := coalesce((x ->> 'es_inicial')::boolean, false);
    v_es_gan := coalesce((x ->> 'es_ganada')::boolean, false);
    v_es_per := coalesce((x ->> 'es_perdida')::boolean, false);
    if v_es_gan and v_es_per then
      raise exception '«%» no puede ser ganada y perdida a la vez.', v_nombre using errcode = '22023', hint = 'etapas';
    end if;
    if v_es_ini and (v_es_gan or v_es_per) then
      raise exception 'La etapa inicial no puede ser ganada ni perdida.' using errcode = '22023', hint = 'etapas';
    end if;
    v_ini := v_ini + case when v_es_ini then 1 else 0 end;
    v_gan := v_gan + case when v_es_gan then 1 else 0 end;
    v_per := v_per + case when v_es_per then 1 else 0 end;
    v_nombres := v_nombres || v_nombre;
    v_nueva := v_nueva || jsonb_build_object('nombre', v_nombre, 'color', v_color,
      'es_inicial', v_es_ini, 'es_ganada', v_es_gan, 'es_perdida', v_es_per);
  end loop;
  if v_ini <> 1 then
    raise exception 'Marca una sola etapa como inicial.' using errcode = '22023', hint = 'etapas';
  end if;
  if v_gan < 1 then
    raise exception 'Hace falta al menos una etapa ganada.' using errcode = '22023', hint = 'etapas';
  end if;
  if v_per < 1 then
    raise exception 'Hace falta al menos una etapa perdida.' using errcode = '22023', hint = 'etapas';
  end if;
  return v_nueva;
end;
$$;

revoke all on function public._embudo_plantilla_normalizar(jsonb) from public, anon, authenticated;
grant execute on function public._embudo_plantilla_normalizar(jsonb) to service_role;

-- ---------------------------------------------------------------------------------------------------
-- C6 · guardar. La versión se mueve con `greatest(clock_timestamp(), anterior + 1 µs)`: dos guardados en una transacción no la repiten.
-- ---------------------------------------------------------------------------------------------------
create or replace function public.embudo_plantilla_guardar(p_etapas jsonb, p_actualizado_en_esperado timestamptz) returns timestamptz
language plpgsql security definer
set search_path = ''
as $$
declare a public.ajustes_leads; v_nueva jsonb;
begin
  perform public.assert_permiso('leads.configurar');
  v_nueva := case when p_etapas is null then null else public._embudo_plantilla_normalizar(p_etapas) end;
  select * into a from public.ajustes_leads where id = 1 for update;
  perform public._exigir_version(a.embudo_actualizado_en, p_actualizado_en_esperado,
    'Alguien cambió la plantilla del embudo mientras la veías. Recarga para seguir.');
  if v_nueva is not distinct from a.embudo_etapas then
    return a.embudo_actualizado_en;
  end if;
  update public.ajustes_leads
     set embudo_etapas = v_nueva,
         embudo_actualizado_en = greatest(clock_timestamp(), a.embudo_actualizado_en + interval '1 microsecond')
   where id = 1
  returning embudo_actualizado_en into a.embudo_actualizado_en;
  return a.embudo_actualizado_en;
end;
$$;

revoke all on function public.embudo_plantilla_guardar(jsonb, timestamptz) from public, anon;
grant execute on function public.embudo_plantilla_guardar(jsonb, timestamptz) to authenticated, service_role;

comment on function public.embudo_plantilla_guardar(jsonb, timestamptz) is
  'Guarda las etapas con que nace un embudo nuevo (null = las seis de fábrica). leads.configurar; 22023 con hint etapas; PT409 con versión vieja. Devuelve la versión. 9.04-4.';
