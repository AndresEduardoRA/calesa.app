-- El texto de una fila en la fórmula (paso 4.07, prompt 2; espejo de `MAXIMO_DE_TEXTO` y `deTexto` de `nodos.ts`).
--
-- Una `constante` o un `calculo` puede llevar `texto`: la fórmula escrita como se tecleó (`=(remate+fees)*4%`), para que el editor
-- (4.21) la muestre y la recompile. Es un texto de 1 a 2.000 caracteres (`char_length`, como el `.max(2000)` de Zod: caracteres, no
-- bytes). `compilarExpresion()` no lo lee ni lo escribe, y el motor lo ignora (no revisa las claves de un nodo). En otro tipo de nodo
-- sigue siendo una clave de más (`forma`).
--
-- `_formula_forma_nodo()` se redefine ENTERA (…004900 ya está commiteada y no se edita): el cuerpo es el de …004900 con `texto` en
-- las claves de `constante` y `calculo`, la comprobación `/*F70*/` tras `sobrescribible`, y STABLE como la dejó …005100.
-- Los grants no cambian (un `create or replace` los conserva).

create or replace function public._formula_forma_nodo(p_n jsonb)
returns text language plpgsql stable set search_path = '' as $$
declare
  c_id constant text := '^[a-z][a-z0-9_]{0,40}$';
  c_campo constant text := '^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$';
  c_base constant text[] := array['id', 'etiqueta', 'formato', 'descripcion', 'seccion', 'color', 'salida', 'bucket', 'grupo', 'tipo'];
  v_tipo text;
  v_op text;
  v_permitidas text[];
  v_x jsonb;
  v_o jsonb;
  v_min int;
  v_max int;
  v_num numeric;
  v_f float8;
  k int;
begin
  if jsonb_typeof(p_n) is distinct from 'object' then /*F01*/ return ''; end if;
  v_tipo := case when jsonb_typeof(p_n -> 'tipo') = 'string' then p_n ->> 'tipo' end;
  v_permitidas := case v_tipo
    when 'input' then c_base || array['solo_en', 'condicion', 'sugerido_de', 'requerido_si']
    when 'constante' then c_base || array['solo_en', 'condicion', 'texto']
    when 'tipo_cambio' then c_base || array['clave']
    when 'campo_vehiculo' then c_base || array['solo_en', 'campo']
    when 'bandera' then c_base || array['solo_en']
    when 'opcion' then c_base || array['opciones', 'por_defecto']
    when 'tabla' then c_base || array['solo_en', 'condicion', 'sobrescribible', 'tabla', 'match', 'columna']
    when 'tramo' then c_base || array['solo_en', 'condicion', 'sobrescribible', 'tabla', 'sobre', 'columna']
    when 'calculo' then c_base || array['solo_en', 'condicion', 'sobrescribible', 'texto', 'op', 'de']
  end;
  if v_permitidas is null then /*F02*/ return '.tipo'; end if;
  if v_tipo = 'calculo' then
    v_op := case when jsonb_typeof(p_n -> 'op') = 'string' then p_n ->> 'op' end;
    if (v_op in ('suma', 'porcentaje_de', 'multiplicar', 'restar', 'dividir', 'si', 'depreciar', 'redondear')) is not true then
      /*F03*/ return '.op';
    end if;
    v_permitidas := v_permitidas || case v_op
      when 'porcentaje_de' then array['pct']
      when 'depreciar' then array['tabla', 'sobre', 'columna']
      when 'redondear' then array['n']
      else '{}'::text[]
    end;
  end if;
  -- Una clave que el tipo no lleva (también una mal escrita) es un error, no se ignora.
  if (p_n - v_permitidas) <> '{}'::jsonb then /*F04*/ return ''; end if;

  -- Lo común a todo nodo.
  if (jsonb_typeof(p_n -> 'id') = 'string' and (p_n ->> 'id') ~ c_id) is not true then /*F05*/ return '.id'; end if;
  -- `tablas` es la clave de params donde van las filas congeladas (D5): ninguna constante se llama así.
  if v_tipo = 'constante' and p_n ->> 'id' = 'tablas' then /*F06*/ return '.id'; end if;
  if (jsonb_typeof(p_n -> 'etiqueta') = 'string' and char_length(p_n ->> 'etiqueta') between 1 and 80) is not true then
    /*F07*/ return '.etiqueta';
  end if;
  if p_n ? 'formato' and (jsonb_typeof(p_n -> 'formato') = 'string' and (p_n ->> 'formato') in ('usd', 'pct', 'raw', 'moneda')) is not true then
    /*F08*/ return '.formato';
  end if;
  if p_n ? 'descripcion' and (jsonb_typeof(p_n -> 'descripcion') = 'string' and char_length(p_n ->> 'descripcion') <= 300) is not true then
    /*F09*/ return '.descripcion';
  end if;
  if p_n ? 'seccion' and (jsonb_typeof(p_n -> 'seccion') = 'string' and char_length(p_n ->> 'seccion') between 1 and 60) is not true then
    /*F10*/ return '.seccion';
  end if;
  if p_n ? 'color' and (jsonb_typeof(p_n -> 'color') = 'string' and (p_n ->> 'color') in ('amarillo', 'verde', 'naranja')) is not true then
    /*F11*/ return '.color';
  end if;
  if p_n ? 'salida' and (jsonb_typeof(p_n -> 'salida') = 'string' and (p_n ->> 'salida') in ('total', 'base_imponible', 'aparte')) is not true then
    /*F12*/ return '.salida';
  end if;
  if p_n ? 'bucket' and (jsonb_typeof(p_n -> 'bucket') = 'string' and (p_n ->> 'bucket') ~ c_id) is not true then /*F13*/ return '.bucket'; end if;
  if p_n ? 'grupo' and (jsonb_typeof(p_n -> 'grupo') = 'string' and (p_n ->> 'grupo') ~ c_id) is not true then /*F14*/ return '.grupo'; end if;
  -- Lo que un nodo de valor suma (el tipo ya dijo si lo admite).
  if p_n ? 'solo_en' then
    v_x := p_n -> 'solo_en';
    if (jsonb_typeof(v_x) = 'array' and jsonb_array_length(v_x) >= 1) is not true then /*F15*/ return '.solo_en'; end if;
    for k in 0 .. jsonb_array_length(v_x) - 1 loop
      if (jsonb_typeof(v_x -> k) = 'string' and (v_x ->> k) ~ c_id) is not true then /*F16*/ return '.solo_en.' || k; end if;
    end loop;
  end if;
  if (p_n ? 'condicion' or v_op = 'si')
     and (jsonb_typeof(p_n -> 'condicion') = 'string' and (p_n ->> 'condicion') ~ c_id) is not true then
    /*F17*/ return '.condicion';
  end if;
  if p_n ? 'sobrescribible' and jsonb_typeof(p_n -> 'sobrescribible') is distinct from 'boolean' then /*F18*/ return '.sobrescribible'; end if;
  -- El texto con que se escribió la fila (la raíz de `compilarExpresion()`): una `constante` o un `calculo`, de 1 a 2.000 caracteres.
  if p_n ? 'texto' and (jsonb_typeof(p_n -> 'texto') = 'string' and char_length(p_n ->> 'texto') between 1 and 2000) is not true then
    /*F70*/ return '.texto';
  end if;

  -- Lo propio de cada tipo.
  if v_tipo = 'input' then
    if p_n ? 'sugerido_de' and (jsonb_typeof(p_n -> 'sugerido_de') = 'string' and (p_n ->> 'sugerido_de') ~ c_id) is not true then
      /*F19*/ return '.sugerido_de';
    end if;
    if p_n ? 'requerido_si' and (jsonb_typeof(p_n -> 'requerido_si') = 'string' and (p_n ->> 'requerido_si') ~ c_id) is not true then
      /*F20*/ return '.requerido_si';
    end if;
  elsif v_tipo = 'tipo_cambio' then
    if (jsonb_typeof(p_n -> 'clave') = 'string' and (p_n ->> 'clave') ~ c_id) is not true then /*F21*/ return '.clave'; end if;
  elsif v_tipo = 'campo_vehiculo' then
    if (jsonb_typeof(p_n -> 'campo') = 'string' and char_length(p_n ->> 'campo') <= 80 and (p_n ->> 'campo') ~ c_campo) is not true then
      /*F22*/ return '.campo';
    end if;
  elsif v_tipo = 'opcion' then
    v_x := p_n -> 'opciones';
    if (jsonb_typeof(v_x) = 'array' and jsonb_array_length(v_x) >= 2) is not true then /*F23*/ return '.opciones'; end if;
    for k in 0 .. jsonb_array_length(v_x) - 1 loop
      v_o := v_x -> k;
      if (jsonb_typeof(v_o) = 'object' and (v_o - array['clave', 'etiqueta', 'titulo']) = '{}'::jsonb
          and jsonb_typeof(v_o -> 'clave') = 'string' and (v_o ->> 'clave') ~ c_id
          and jsonb_typeof(v_o -> 'etiqueta') = 'string' and char_length(v_o ->> 'etiqueta') between 1 and 60
          and jsonb_typeof(v_o -> 'titulo') = 'string' and char_length(v_o ->> 'titulo') between 1 and 120) is not true then
        /*F24*/ return '.opciones.' || k;
      end if;
    end loop;
    if p_n ? 'por_defecto' and (jsonb_typeof(p_n -> 'por_defecto') = 'string' and (p_n ->> 'por_defecto') ~ c_id) is not true then
      /*F25*/ return '.por_defecto';
    end if;
  elsif v_tipo = 'tabla' then
    if (jsonb_typeof(p_n -> 'tabla') = 'string' and (p_n ->> 'tabla') ~ c_id) is not true then /*F26*/ return '.tabla'; end if;
    if jsonb_typeof(p_n -> 'match') is distinct from 'object' then /*F27*/ return '.match'; end if;
    -- columna de la tabla → un nodo anterior o un campo del vehículo.
    if exists (
      select 1 from jsonb_each(p_n -> 'match') m
       where (m.key ~ c_id and jsonb_typeof(m.value) = 'string' and char_length(m.value #>> '{}') <= 80
              and (m.value #>> '{}') ~ c_campo) is not true
    ) then
      /*F28*/ return '.match';
    end if;
    if (jsonb_typeof(p_n -> 'columna') = 'string' and (p_n ->> 'columna') ~ c_id) is not true then /*F29*/ return '.columna'; end if;
  elsif v_tipo = 'tramo' then
    if (jsonb_typeof(p_n -> 'tabla') = 'string' and (p_n ->> 'tabla') ~ c_id) is not true then /*F30*/ return '.tabla'; end if;
    if (jsonb_typeof(p_n -> 'sobre') = 'string' and (p_n ->> 'sobre') ~ c_id) is not true then /*F31*/ return '.sobre'; end if;
    if (jsonb_typeof(p_n -> 'columna') = 'string' and (p_n ->> 'columna') ~ c_id) is not true then /*F32*/ return '.columna'; end if;
  elsif v_tipo = 'calculo' then
    -- La aridad de cada operación, cerrada.
    v_min := case v_op when 'multiplicar' then 2 when 'restar' then 2 when 'dividir' then 2
                       when 'si' then 1 when 'depreciar' then 1 when 'redondear' then 1 else 1 end;
    v_max := case v_op when 'dividir' then 2 when 'si' then 1 when 'depreciar' then 1 when 'redondear' then 1 end;
    v_x := p_n -> 'de';
    if (jsonb_typeof(v_x) = 'array' and jsonb_array_length(v_x) >= v_min
        and (v_max is null or jsonb_array_length(v_x) <= v_max)) is not true then
      /*F33*/ return '.de';
    end if;
    for k in 0 .. jsonb_array_length(v_x) - 1 loop
      if (jsonb_typeof(v_x -> k) = 'string' and (v_x ->> k) ~ c_id) is not true then /*F34*/ return '.de.' || k; end if;
    end loop;
    if v_op = 'porcentaje_de' and (jsonb_typeof(p_n -> 'pct') = 'string' and (p_n ->> 'pct') ~ c_id) is not true then
      /*F35*/ return '.pct';
    end if;
    if v_op = 'depreciar' then
      if (jsonb_typeof(p_n -> 'tabla') = 'string' and (p_n ->> 'tabla') ~ c_id) is not true then /*F36*/ return '.tabla'; end if;
      if (jsonb_typeof(p_n -> 'sobre') = 'string' and (p_n ->> 'sobre') ~ c_id) is not true then /*F37*/ return '.sobre'; end if;
      if (jsonb_typeof(p_n -> 'columna') = 'string' and (p_n ->> 'columna') ~ c_id) is not true then /*F38*/ return '.columna'; end if;
    end if;
    if v_op = 'redondear' then
      -- `z.int().min(0).max(6)` sobre el número como lo lee JS: 2.0 y 6.0000000000000001 valen; lo que JS redondea a 0, también.
      if jsonb_typeof(p_n -> 'n') is distinct from 'number' then /*F39*/ return '.n'; end if;
      v_num := (p_n -> 'n')::numeric;
      if abs(v_num) < 1e-300 then
        if abs(v_num) > 2.4703282292062327e-324 then /*F40*/ return '.n'; end if;
      elsif abs(v_num) >= 7 then
        /*F41*/ return '.n';
      else
        v_f := v_num::float8;
        if v_f <> trunc(v_f) or v_f < 0 or v_f > 6 then /*F42*/ return '.n'; end if;
      end if;
    end if;
  end if;
  return null;
end;
$$;
