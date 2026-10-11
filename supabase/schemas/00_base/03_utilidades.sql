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

-- Teléfono normalizado: sólo dígitos, con el código de país adelante.
create or replace function public.normalizar_telefono(p_cc text, p_tel text)
returns text language sql immutable set search_path = '' as $$
  select regexp_replace(coalesce(p_cc, ''), '\D', '', 'g') || regexp_replace(coalesce(p_tel, ''), '\D', '', 'g');
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
