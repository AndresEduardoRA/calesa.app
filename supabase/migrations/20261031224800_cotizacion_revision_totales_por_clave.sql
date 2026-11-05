-- La revisión guarda en `totales` sólo lo que cambió (4.15-1), y su lectura no delata lo que un nivel esconde.
--
-- `cotizacion_revision()` ya guardaba `valores` y `fuentes` por nodo (4.10-3); `totales` iba `{de, a}` entero en cada edición. Ahora, cuando
-- los dos lados son objetos, va por clave: las de primer nivel menos `grupos` (`bs`, `usd`, `suma_usd`…) una por una, y en `grupos` cada grupo
-- ENTERO si cambió. Una clave o un grupo de un solo lado figura de ese lado. Las revisiones ya escritas no se reescriben: se leen igual.
--
-- `_cotizacion_diff_recortado()`: con `totales` por clave, un grupo visible cuyo único cambio es su `bs` llegaría igual en `de` y en `a` a quien
-- tiene un tipo de cambio oculto (el recorte le quita el `bs`) y le diría que el Bs de ESE grupo cambió. Por eso, ya recortados los dos lados,
-- sale todo grupo que queda igual en los dos, y una clave `grupos` que queda vacía (por el recorte o por eso) sale de su lado: un `grupos: {}`
-- diría «cambió un grupo que no ves». Ninguna policy, grant ni RPC nueva (`create or replace` conserva los grants).

create or replace function public.cotizacion_revision() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
declare
  d jsonb := '{}'::jsonb; k text; a jsonb := to_jsonb(old); b jsonb := to_jsonb(new);
  v_de jsonb; v_a jsonb; v_g jsonb; v_gde jsonb; v_ga jsonb;
begin
  for k in select jsonb_object_keys(b) loop
    if k in ('actualizado_en', 'reportes_count', 'favoritos_count') or a -> k is not distinct from b -> k then continue; end if;
    if k in ('valores', 'fuentes') and jsonb_typeof(a -> k) = 'object' and jsonb_typeof(b -> k) = 'object' then
      -- Sólo los nodos que cambiaron (`-> clave` da el jsonb null de un valor nulo y el SQL null de una clave que no está).
      select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_de from jsonb_each(a -> k) e where (b -> k) -> e.key is distinct from e.value;
      select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_a from jsonb_each(b -> k) e where (a -> k) -> e.key is distinct from e.value;
      d := d || jsonb_build_object(k, jsonb_build_object('de', v_de, 'a', v_a));
    elsif k = 'totales' and jsonb_typeof(a -> k) = 'object' and jsonb_typeof(b -> k) = 'object' then
      -- Las claves de primer nivel que cambiaron (menos `grupos`), y de `grupos` cada grupo entero que cambió.
      select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_de from jsonb_each(a -> k) e where e.key <> 'grupos' and (b -> k) -> e.key is distinct from e.value;
      select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_a from jsonb_each(b -> k) e where e.key <> 'grupos' and (a -> k) -> e.key is distinct from e.value;
      if jsonb_typeof(a -> k -> 'grupos') = 'object' and jsonb_typeof(b -> k -> 'grupos') = 'object' then
        select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_gde from jsonb_each(a -> k -> 'grupos') e where (b -> k -> 'grupos') -> e.key is distinct from e.value;
        select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_ga from jsonb_each(b -> k -> 'grupos') e where (a -> k -> 'grupos') -> e.key is distinct from e.value;
        if v_gde <> '{}'::jsonb then v_de := v_de || jsonb_build_object('grupos', v_gde); end if;
        if v_ga <> '{}'::jsonb then v_a := v_a || jsonb_build_object('grupos', v_ga); end if;
      elsif (a -> k -> 'grupos') is distinct from (b -> k -> 'grupos') then
        -- `grupos` de un solo lado (o que no es un objeto): entero, del lado donde está.
        if (a -> k) ? 'grupos' then v_de := v_de || jsonb_build_object('grupos', a -> k -> 'grupos'); end if;
        if (b -> k) ? 'grupos' then v_a := v_a || jsonb_build_object('grupos', b -> k -> 'grupos'); end if;
      end if;
      d := d || jsonb_build_object(k, jsonb_build_object('de', v_de, 'a', v_a));
    else
      d := d || jsonb_build_object(k, jsonb_build_object('de', a -> k, 'a', b -> k));
    end if;
  end loop;
  if d <> '{}'::jsonb then
    -- Lo deja `cotizacion_guardar()`; un ajuste que alguna vez se fijó en la sesión vuelve como texto vacío, no como nulo.
    v_g := nullif(current_setting('importadora.guardado', true), '')::jsonb;
    insert into public.cotizaciones_revisiones (cotizacion_id, usuario_id, diff, intento, huella)
    values (new.id, (select auth.uid()), d, (v_g ->> 'intento')::uuid, v_g ->> 'huella');
  end if;
  return null;
end;
$$;

comment on function public.cotizacion_revision() is 'Trigger de cotizaciones: una revisión por cambio, con el diff por columna ({de, a}; en valores y fuentes sólo los nodos que cambiaron; en totales, las claves y los grupos que cambiaron, cada grupo entero) y el intento y la huella de cotizacion_guardar. docs/COTIZADOR.md › «Cómo se guarda (4.10-3)».';

create or replace function public._cotizacion_diff_recortado(p_diff jsonb, p_ctx jsonb, p_legibles text[]) returns jsonb
  language plpgsql stable
  set search_path = ''
as $$
declare
  v_out jsonb := '{}'::jsonb; e record; v_de jsonb; v_a jsonb; v_gde jsonb; v_ga jsonb;
begin
  if jsonb_typeof(p_diff) is distinct from 'object' then return '{}'::jsonb; end if;
  for e in select d.key, d.value from jsonb_each(p_diff) d loop
    if e.key = any (p_legibles) then
      v_out := v_out || jsonb_build_object(e.key, e.value);
    elsif e.key in ('valores', 'fuentes', 'totales', 'tipos_cambio') and jsonb_typeof(e.value) = 'object' then
      v_de := public._cotizacion_recorte(jsonb_build_object(e.key, e.value -> 'de'), p_ctx) -> e.key;
      v_a := public._cotizacion_recorte(jsonb_build_object(e.key, e.value -> 'a'), p_ctx) -> e.key;
      if e.key = 'totales' then
        -- Ya recortados: sale el grupo que quedó igual en los dos lados (su cambio era lo que no se ve), y un `grupos` vacío sale de su lado.
        v_gde := case when jsonb_typeof(v_de -> 'grupos') = 'object' then v_de -> 'grupos' end;
        v_ga := case when jsonb_typeof(v_a -> 'grupos') = 'object' then v_a -> 'grupos' end;
        if v_gde is not null then
          v_de := jsonb_set(v_de, '{grupos}', coalesce((select jsonb_object_agg(g.key, g.value) from jsonb_each(v_gde) g where v_ga -> g.key is distinct from g.value), '{}'::jsonb));
          if v_de -> 'grupos' = '{}'::jsonb then v_de := v_de - 'grupos'; end if;
        end if;
        if v_ga is not null then
          v_a := jsonb_set(v_a, '{grupos}', coalesce((select jsonb_object_agg(g.key, g.value) from jsonb_each(v_ga) g where v_gde -> g.key is distinct from g.value), '{}'::jsonb));
          if v_a -> 'grupos' = '{}'::jsonb then v_a := v_a - 'grupos'; end if;
        end if;
      end if;
      if v_de is distinct from v_a then
        v_out := v_out || jsonb_build_object(e.key, jsonb_build_object('de', v_de, 'a', v_a));
      end if;
    end if;
  end loop;
  return v_out;
end $$;

comment on function public._cotizacion_diff_recortado(jsonb, jsonb, text[]) is 'El diff de una revisión sin lo que quien lee no ve (las columnas legibles tal cual; valores, fuentes, totales y tipos_cambio por _cotizacion_recorte; si sólo cambió lo oculto, la columna no figura). En totales, sin los grupos que el recorte deja iguales en los dos lados ni un grupos vacío. De nadie.';
