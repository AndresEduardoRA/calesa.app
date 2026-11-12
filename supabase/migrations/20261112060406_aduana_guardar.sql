-- Aduana: la versión propia de la cabecera y guardar una declaración (paso 6.07-2, C1–C6). Crear y editar por una sola RPC con la esperada, como el
-- transporte (6.07-1). El canal no se guarda aquí (va por declaracion_canal, que congela la composición).

-- C1 · la versión propia: se mueve en cada cambio, también dos veces en una transacción (set_actualizado_en pone now()). Así poner o quitar vehículos
-- (que toca la cabecera) mueve la versión aunque el cambio sea en la tabla hija (D20).
drop trigger trg_actualizado_en on public.declaraciones_aduana;

create function public.declaracion_version() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := greatest(clock_timestamp(), old.actualizado_en + interval '1 microsecond');
  return new;
end;
$$;

comment on function public.declaracion_version() is
  'Trigger before update de declaraciones_aduana: la versión con greatest(clock_timestamp(), anterior + 1 µs), para que se mueva dos veces en una transacción. 6.07-2.';
revoke all on function public.declaracion_version() from public, anon, authenticated;
grant execute on function public.declaracion_version() to service_role;

create trigger trg_declaracion_version before update on public.declaraciones_aduana
  for each row execute function public.declaracion_version();

-- C2 · aplica `p_datos` sobre `o`: JSON null = vaciar, clave ausente = no cambia. Un valor que no se convierte da 22023 con la clave en `hint`, nunca
-- 22P02 (D22).
create function public._declaracion_datos(o public.declaraciones_aduana, p_datos jsonb) returns public.declaraciones_aduana
language plpgsql stable
set search_path = ''
as $$
declare n public.declaraciones_aduana := o; k text; v text;
begin
  if p_datos is null then
    return n;
  end if;
  if jsonb_typeof(p_datos) <> 'object' then
    raise exception 'Los datos van como un objeto.' using errcode = '22023', hint = 'datos';
  end if;
  for k in select x from jsonb_object_keys(p_datos) x order by x loop
    if k not in ('numero', 'aceptada_el', 'vence_tributos_el', 'despachante', 'deposito', 'notas') then
      raise exception 'No se cambia «%».', k using errcode = '22023', hint = k;
    end if;
    if jsonb_typeof(p_datos -> k) not in ('string', 'null') then
      raise exception 'El valor de «%» no es válido.', k using errcode = '22023', hint = k;
    end if;
    v := p_datos ->> k;
    if k = 'numero' then
      v := nullif(btrim(v), '');
      if v is null then
        raise exception 'El número es obligatorio.' using errcode = '22023', hint = 'numero';
      end if;
      if length(v) > 60 then
        raise exception 'El número lleva hasta 60 caracteres.' using errcode = '22023', hint = 'numero';
      end if;
      n.numero := v;
    elsif k in ('aceptada_el', 'vence_tributos_el') then
      -- Sólo AAAA-MM-DD: `date` acepta también 'today', 'epoch' o 'infinity'.
      if v is not null and (v !~ '^\d{4}-\d{2}-\d{2}$' or not pg_input_is_valid(v, 'date')) then
        raise exception 'La fecha de «%» no es válida.', k using errcode = '22023', hint = k;
      end if;
      if k = 'aceptada_el' then n.aceptada_el := v::date; else n.vence_tributos_el := v::date; end if;
    elsif k in ('despachante', 'deposito') then
      v := nullif(btrim(v), '');
      if length(v) > 200 then
        raise exception 'El % lleva hasta 200 caracteres.', k using errcode = '22023', hint = k;
      end if;
      if k = 'despachante' then n.despachante := v; else n.deposito := v; end if;
    else
      v := nullif(btrim(v), '');
      if length(v) > 2000 then
        raise exception 'Las notas llevan hasta 2.000 caracteres.' using errcode = '22023', hint = 'notas';
      end if;
      n.notas := v;
    end if;
  end loop;
  return n;
end;
$$;

revoke all on function public._declaracion_datos(public.declaraciones_aduana, jsonb) from public, anon, authenticated;
grant execute on function public._declaracion_datos(public.declaraciones_aduana, jsonb) to service_role;

-- C3–C6 · crear (p_id nulo) o editar con la versión. El número repetido, 23505 con hint (por declaraciones_aduana_numero_key).
create function public.declaracion_guardar(p_id uuid, p_actualizado_en_esperado timestamptz, p_datos jsonb)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  d public.declaraciones_aduana; n public.declaraciones_aduana; v_c text;
  v_sujeto constant text := 'esta declaración';
begin
  perform public.assert_activo();
  -- C4 · el permiso no es por origen: antes de leer nada.
  if not (select public.tiene_permiso('logistica.aduana.gestionar')) then
    raise exception 'No tienes el permiso «logistica.aduana.gestionar».' using errcode = '42501';
  end if;
  if p_id is null then
    -- C5 · crear.
    if p_actualizado_en_esperado is not null then
      raise exception 'Para crear, la versión va vacía.' using errcode = '22023', hint = 'version';
    end if;
    n := public._declaracion_datos(d, p_datos);
    if n.numero is null then
      raise exception 'El número es obligatorio.' using errcode = '22023', hint = 'numero';
    end if;
  else
    -- C6 · editar: la cabecera por su PK.
    select * into d from public.declaraciones_aduana x where x.id = p_id for update;
    if not found then
      raise exception 'La declaración ya no existe. Recarga.' using errcode = 'PT409';
    end if;
    if p_actualizado_en_esperado is null then
      perform public._conflicto_de_edicion('declaraciones_aduana', d.id, d.actualizado_en, v_sujeto);
    end if;
    n := public._declaracion_datos(d, p_datos);
    if (n.numero, n.aceptada_el, n.vence_tributos_el, n.despachante, n.deposito, n.notas)
       is not distinct from (d.numero, d.aceptada_el, d.vence_tributos_el, d.despachante, d.deposito, d.notas) then
      return jsonb_build_object('id', d.id, 'actualizado_en', d.actualizado_en, 'sin_cambios', true);
    end if;
    if d.actualizado_en is distinct from p_actualizado_en_esperado then
      perform public._conflicto_de_edicion('declaraciones_aduana', d.id, d.actualizado_en, v_sujeto);
    end if;
  end if;
  begin
    if p_id is null then
      insert into public.declaraciones_aduana (numero, aceptada_el, vence_tributos_el, despachante, deposito, notas, creado_por)
      values (n.numero, n.aceptada_el, n.vence_tributos_el, n.despachante, n.deposito, n.notas, (select auth.uid()))
      returning * into n;
    else
      update public.declaraciones_aduana x
         set numero = n.numero, aceptada_el = n.aceptada_el, vence_tributos_el = n.vence_tributos_el, despachante = n.despachante,
             deposito = n.deposito, notas = n.notas
       where x.id = d.id
      returning * into n;
    end if;
  exception when unique_violation then
    get stacked diagnostics v_c = constraint_name;
    if v_c = 'declaraciones_aduana_numero_key' then
      raise exception 'Ya hay una declaración con el número «%».', n.numero using errcode = '23505', hint = 'numero';
    end if;
    raise;
  end;
  return jsonb_build_object('id', n.id, 'actualizado_en', n.actualizado_en, 'sin_cambios', false);
end;
$$;

revoke all on function public.declaracion_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.declaracion_guardar(uuid, timestamptz, jsonb) to authenticated, service_role;

comment on function public.declaracion_guardar(uuid, timestamptz, jsonb) is
  'Crea (p_id nulo, esperada nula) o edita con la versión una declaración de aduana (paso 6.07-2). p_datos: numero, aceptada_el, vence_tributos_el, '
  'despachante, deposito, notas (null = vaciar). Pide logistica.aduana.gestionar. Devuelve {id, actualizado_en, sin_cambios}.';
