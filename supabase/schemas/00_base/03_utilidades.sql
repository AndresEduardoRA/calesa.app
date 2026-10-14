-- Funciones de utilidad sin dominio. Las de seguridad (RBAC) viven en migrations/…_rbac.

create or replace function public.set_actualizado_en()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

-- Clave estable (slug) a partir de un texto: minúsculas, sin acentos, guiones.
create or replace function public.slugificar(p text)
returns text language sql immutable set search_path = '' as $$
  select trim(both '-' from regexp_replace(
    lower(translate(coalesce(p, ''), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')),
    '[^a-z0-9]+', '-', 'g'));
$$;

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

create or replace function public.enmascarar_telefono(p text)
returns text language sql immutable set search_path = '' as $$
  select case when p is null or length(p) < 6 then '•••••'
              else left(p, 3) || repeat('•', greatest(length(p) - 5, 2)) || right(p, 2) end;
$$;

-- Código dictable por teléfono: alfabeto de 32 símbolos sin I, O, 0 ni 1.
create or replace function public.codigo_dictable(p_largo int default 5)
returns text language plpgsql volatile set search_path = '' as $$
declare
  alfabeto constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  r text := '';
  i int;
begin
  for i in 1..p_largo loop
    r := r || substr(alfabeto, 1 + floor(random() * 32)::int, 1);
  end loop;
  return r;
end;
$$;
