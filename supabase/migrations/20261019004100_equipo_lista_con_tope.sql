-- La lista del equipo tiene tope y se busca en el servidor (5a-21, `docs/PLAN.md`).
--
-- Antes la página leía `perfiles` entera y filtraba en el cliente: `max_rows` = 1.000 la cortaba en silencio desde la persona 1.001 y el
-- buscador no la alcanzaba. Ahora `equipo_lista(texto, estado, límite)` devuelve los ids de las primeras personas por nombre (a lo sumo 101: el
-- tope de la lista, 100, y una de más para saber si hay otras) y la página lee esas filas con sus roles por `id`.
--
-- Por qué es una RPC `security definer` y no un `ilike` por PostgREST: bajo RLS ni `like` ni la función que pliega las tildes son _leakproof_, así
-- que el planificador no puede usar un índice para ellos (la misma razón que `leads_candidatos`, `…003300`). Devuelve ids y nada más; comprueba
-- que quien llama puede ver al equipo (`equipo.usuarios.ver` o `.gestionar`, lo que ya pide la página) y lee las filas después, con su RLS.
--
-- Tildes: el filtro de la lista las ignoraba («jose» encuentra «José», «nunez» a «Núñez») y `ilike` no. `_sin_tildes()` es `unaccent` + minúsculas,
-- lo mismo que hacía `sinAcentos()` en el cliente, y el índice trigram se arma sobre ese texto (nombre y correo juntos, como antes).
--
-- Dos etapas, como `leads_candidatos` (`…003300`), con los valores como LITERALES (no un plan genérico):
--  W  recorrer, de a una y sin pasar de las primeras S = 2.000 personas del estado, en el orden de la lista, y quedarse con las que cumplen el texto. Si junta el
--     límite, termina: un término común aparece enseguida (216 buffers con 100.000 personas). (Una sola consulta con `order by … limit` no sirve: con «maria» el planificador camina el índice del
--     orden y lee 49.000 filas de 100.000 hasta juntar 101, porque las Maria vienen después de las Ana, las Carla y las Elías.)
--  I  si no, el trigram: las que contienen el texto, ordenadas, las primeras. Cuesta lo que coincide, que a esta altura es poco (menos del 5 % del estado). Una
--     tabla chica (menos de S personas) también termina en W o en I sin costo: no hace falta saber si W vio todo.
--  Un texto sin un tramo de 3 caracteres («jo», «%») no tiene qué buscar en el trigram: sigue recorriendo el orden, sin tope. Los índices:
--   · `perfiles_vigentes_orden_idx`  (nombre, email, id) donde activo       → «En el equipo» y su orden
--   · `perfiles_estado_orden_idx`    (estado, nombre, email, id)            → cada estado y su orden
--   · `perfiles_busqueda_idx`        gin trigram sobre nombre + correo      → el texto
-- Lo que cuesta cada camino, con 100.000 personas, está medido en `docs/RENDIMIENTO.md` (fila «Equipo, lista») y lo asserta `supabase/tests/medir-equipo.sql`.

create extension if not exists unaccent with schema extensions;

-- Minúsculas y sin tildes (la ñ también: «ñ» → «n», como la normalización NFD del cliente). `unaccent` es `stable` porque su diccionario puede
-- cambiar; con la forma de dos argumentos y el diccionario por nombre se puede declarar `immutable` para el índice. Si el diccionario cambia
-- (una actualización de la extensión), el índice se rehace: `reindex index public.perfiles_busqueda_idx`.
create or replace function public._sin_tildes(p_texto text)
returns text language sql immutable parallel safe strict set search_path = '' as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, p_texto))
$$;

-- El estado de una persona, el mismo que calcula `estadoDePersona()` (`entities/persona.ts`): baja > bloqueada > invitación pendiente > activa. Un caso de
-- `equipo-lista.sql` compara las cuatro ramas con la lista de estados de la interfaz.
create or replace function public._estado_de_persona(p_activo boolean, p_bloqueado boolean, p_invitado_en timestamptz, p_aceptada_en timestamptz)
returns text language sql immutable parallel safe set search_path = '' as $$
  select case when not p_activo then 'baja'
              when p_bloqueado then 'bloqueada'
              when p_invitado_en is not null and p_aceptada_en is null then 'invitacion_pendiente'
              else 'activa' end
$$;

-- El patrón «contiene» de un `like` sobre el texto ya sin tildes: lo que escribió la persona es literal (`\`, `%` y `_` dejan de ser comodines).
-- No es el de los leads: allí `*` es «un carácter» porque PostgREST lo trata como comodín; acá la búsqueda no pasa por PostgREST.
create or replace function public._equipo_busqueda_patron(p_texto text)
returns text language sql immutable parallel safe strict set search_path = '' as $$
  select '%' || replace(replace(replace(public._sin_tildes(p_texto), '\', '\\'), '%', '\%'), '_', '\_') || '%'
$$;

-- Las funciones de un índice las ejecuta quien escribe la fila (un UPDATE del perfil propio): `authenticated` necesita poder llamarlas.
revoke all on function public._sin_tildes(text), public._estado_de_persona(boolean, boolean, timestamptz, timestamptz) from public, anon;
grant execute on function public._sin_tildes(text), public._estado_de_persona(boolean, boolean, timestamptz, timestamptz) to authenticated, service_role;
revoke all on function public._equipo_busqueda_patron(text) from public, anon, authenticated;

create index if not exists perfiles_vigentes_orden_idx on public.perfiles (nombre, email, id) where activo;
create index if not exists perfiles_estado_orden_idx on public.perfiles
  (public._estado_de_persona(activo, bloqueado, invitado_en, invitacion_aceptada_en), nombre, email, id);
create index if not exists perfiles_busqueda_idx on public.perfiles
  using gin (public._sin_tildes(nombre || ' ' || coalesce(email::text, '')) extensions.gin_trgm_ops);

-- Cuántas personas del estado se recorren, en el orden de la lista, antes de ir al trigram (la etapa W). Con N personas la peor búsqueda cuesta
-- S + 101 · N / S filas: mínimo en S = raíz de 101 · N (3.200 con 100.000). Un solo punto: `medir-equipo.sql` lo lee de acá.
create or replace function public._equipo_lista_recorrido() returns integer language sql immutable parallel safe set search_path = '' as $$ select 2000 $$;
revoke all on function public._equipo_lista_recorrido() from public, anon, authenticated;

-- ¿Tiene el trigram algo que buscar? Un tramo de 3 letras o dígitos en el texto sin tildes (sus trigramas).
create or replace function public._equipo_lista_indexable(p_texto text)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select coalesce(public._sin_tildes(p_texto) ~ '[[:alnum:]]{3}', false)
$$;
revoke all on function public._equipo_lista_indexable(text) from public, anon, authenticated;

-- La consulta de cada etapa, como texto (la prueba de volumen las explica: `medir-equipo.sql`). El estado se valida acá. `p_limite` llega ya acotado por
-- quien llama (`equipo_lista`, con `_acotar_pagina`): este texto no se le entrega a ningún cliente.
--   'recorrer' → una fila con los ids (un arreglo) de las que cumplen entre las primeras S del estado, en orden, hasta `p_limite`
--   'indice'   → los ids por el trigram (index: perfiles_busqueda_idx), ordenados, hasta `p_limite`
--   'todo'     → los ids recorriendo el índice del orden (perfiles_vigentes_orden_idx o perfiles_estado_orden_idx) hasta juntar `p_limite`: sin texto, o con uno
--                que el trigram no sostiene
create or replace function public._equipo_lista_sql(p_texto text, p_estado text, p_limite int, p_etapa text)
returns text language plpgsql stable set search_path = '' as $$
declare
  v_texto text := left(btrim(coalesce(p_texto, '')), 100);
  v_estado text := coalesce(p_estado, 'vigentes');
  v_estado_donde text;
  v_texto_donde text := 'true';
  v_texto_de_w text := 'true';
begin
  if v_estado = 'vigentes' then
    v_estado_donde := 'p.activo';
  elsif v_estado in ('activa', 'invitacion_pendiente', 'bloqueada', 'baja') then
    v_estado_donde := format('public._estado_de_persona(p.activo, p.bloqueado, p.invitado_en, p.invitacion_aceptada_en) = %L', v_estado);
  else
    raise exception 'El estado «%» no existe.', v_estado using errcode = '22023';
  end if;
  if v_texto <> '' then
    v_texto_donde := format('public._sin_tildes(p.nombre || %L || coalesce(p.email::text, %L)) like %L', ' ', '', public._equipo_busqueda_patron(v_texto));
    v_texto_de_w := format('public._sin_tildes(w.nombre || %L || coalesce(w.email::text, %L)) like %L', ' ', '', public._equipo_busqueda_patron(v_texto));
  end if;
  if p_etapa = 'recorrer' then
    -- Sin `materialized`: la subconsulta se lee de a una fila y el `limit` de afuera corta en cuanto junta lo que pide. El `order by` de afuera lo cumple el de adentro
    -- (el planificador lo sabe y no ordena otra vez).
    return format('select array(select w.id from (select p.id, p.nombre, p.email from public.perfiles p where %s order by p.nombre, p.email, p.id limit %s) w '
                  'where %s order by w.nombre, w.email, w.id limit %s) as ids',
                  v_estado_donde, public._equipo_lista_recorrido(), v_texto_de_w, p_limite);
  elsif p_etapa = 'indice' then
    -- `materialized` cierra la subconsulta: sin él el planificador la deshace y camina el índice del orden (el plan de «maria»).
    return format('with m as materialized (select p.id, p.nombre, p.email from public.perfiles p where %s and %s) '
                  'select m.id from m order by m.nombre, m.email, m.id limit %s',
                  v_estado_donde, v_texto_donde, p_limite);
  elsif p_etapa = 'todo' then
    return format('select p.id from public.perfiles p where %s and %s order by p.nombre, p.email, p.id limit %s', v_estado_donde, v_texto_donde, p_limite);
  end if;
  raise exception 'La etapa «%» no existe.', p_etapa;
end;
$$;
revoke all on function public._equipo_lista_sql(text, text, int, text) from public, anon, authenticated;

-- Los ids de las primeras personas por nombre (después por correo y por id: un nombre repetido no mueve el corte), a lo sumo `p_limite` (101).
create or replace function public.equipo_lista(p_texto text default null, p_estado text default 'vigentes', p_limite int default 101)
returns setof uuid language plpgsql stable security definer set search_path = '' as $$
declare
  v_limite int := public._acotar_pagina(p_limite, 101, 101);  -- el tope de la lista, 100, y una más para saber si hay otras
  v_texto text := left(btrim(coalesce(p_texto, '')), 100);
  v_ids uuid[];
begin
  perform public.assert_activo();
  if not (public.tiene_permiso('equipo.usuarios.ver') or public.tiene_permiso('equipo.usuarios.gestionar')) then
    raise exception 'No tienes el permiso «equipo.usuarios.ver».' using errcode = '42501';
  end if;
  if v_texto = '' then
    return query execute public._equipo_lista_sql(null, p_estado, v_limite, 'todo');
    return;
  end if;
  execute public._equipo_lista_sql(v_texto, p_estado, v_limite, 'recorrer') into v_ids;
  -- Juntó el límite: no hay nada más que buscar.
  if cardinality(v_ids) >= v_limite then
    return query select unnest(v_ids);
    return;
  end if;
  return query execute public._equipo_lista_sql(v_texto, p_estado, v_limite,
    case when public._equipo_lista_indexable(v_texto) then 'indice' else 'todo' end);
end;
$$;
revoke all on function public.equipo_lista(text, text, int) from public, anon;
grant execute on function public.equipo_lista(text, text, int) to authenticated;
