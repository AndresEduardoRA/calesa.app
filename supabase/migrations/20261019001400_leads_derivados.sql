-- La cartera y los atributos públicos en la fila del lead (9h). Primera de tres partes: las columnas, quién las mantiene
-- y el relleno de lo que ya existía. La policy de `leads` y `leads_vista` todavía no las leen (`…001600`).
--
-- Por qué: con 50.000 leads el planificador estima que la policy de `leads` deja pasar ~150 filas (pasan 50.000 para
-- quien ve «todos»). La rama «todos» dentro de un `OR` vale 0,005 y el limbo, un SubPlan por fila, 0,5; y cada fila
-- cuesta caro (`lead_en_limbo()`, `en_cartera()` y, si se filtra por un atributo, `atributos_lead()`, ~80 µs). Con la
-- cartera y los atributos públicos en la fila, la policy y los filtros son expresiones sobre columnas (`docs/DECISIONES.md`, 9h).
--
-- - `cartera`: los `usuario_id` vigentes de `leads_asesores` (dueño y compartidos), ordenados. Vacía = limbo. La recalcula
--   un trigger por sentencia de `leads_asesores` (insert, update, delete), así que la mueve todo camino: transferir,
--   compartir, revocar, salir, tomar del limbo, la baja de una persona, el alta, importar y deshacer. El trigger bloquea
--   los leads en orden de id **antes** de recalcular, en otra sentencia: en READ COMMITTED esa sentencia ve lo que otra
--   transacción confirmó mientras esperaba (un compartir que llegó a la vez no se pierde).
-- - `atributos_publicos`: `atributos` sin las claves que `leads_campos` no conoce como públicas (falla cerrada, la regla de
--   `atributos_lead()`). La recalcula un trigger `before` de `leads` al escribir `atributos`, que toma `for share` los
--   campos que lee: un cambio de privacidad que llega a la vez espera, o este alta ve el campo ya cambiado.
--
-- Sobre una base viva grande: las columnas entran nulas (en una base nueva ya vienen de `schemas/`, `not null`), los
-- triggers mantienen lo que cambia y `_leads_derivados_rellenar(p_lote)` llena lo demás por lotes, reanudable. Esta
-- migración lo llama sólo si hay hasta 50.000 leads; si no, avisa: hay que llamarlo hasta que devuelva 0 antes de `…001600`,
-- que se niega si queda algo por llenar.

alter table public.leads add column if not exists cartera uuid[];
alter table public.leads add column if not exists atributos_publicos jsonb;

-- La cartera de un lead, de la fuente (`leads_asesores`). La usan el trigger, el relleno y la prueba de consistencia.
create or replace function public._lead_cartera_calcular(p_lead uuid)
returns uuid[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(la.usuario_id order by la.usuario_id), '{}')
    from public.leads_asesores la
   where la.lead_id = p_lead and la.revocado_en is null;
$$;
revoke all on function public._lead_cartera_calcular(uuid) from public, anon, authenticated;

-- Recalcula la cartera de esos leads. Primero los bloquea (en orden de id: dos sentencias que tocan los mismos leads no se
-- interbloquean); la sentencia que recalcula empieza después, con una foto nueva.
create or replace function public._leads_cartera_recalcular(p_leads uuid[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_leads is null or cardinality(p_leads) = 0 then
    return;
  end if;
  perform 1 from public.leads l where l.id = any (p_leads) order by l.id for update;
  update public.leads l set cartera = c.cartera
    from (select x.id, coalesce(array_agg(la.usuario_id order by la.usuario_id) filter (where la.usuario_id is not null), '{}') as cartera
            from unnest(p_leads) as x (id)
            left join public.leads_asesores la on la.lead_id = x.id and la.revocado_en is null
           group by x.id) c
   where l.id = c.id and l.cartera is distinct from c.cartera;
end;
$$;
revoke all on function public._leads_cartera_recalcular(uuid[]) from public, anon, authenticated;

-- Los tres triggers de `leads_asesores`: por sentencia, con la tabla de transición (una baja de 7.000 leads es una llamada).
create or replace function public.leads_asesores_cartera_alta()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public._leads_cartera_recalcular(array(select distinct n.lead_id from nuevas n));
  return null;
end;
$$;
create or replace function public.leads_asesores_cartera_cambio()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public._leads_cartera_recalcular(array(select n.lead_id from nuevas n union select v.lead_id from viejas v));
  return null;
end;
$$;
create or replace function public.leads_asesores_cartera_baja()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public._leads_cartera_recalcular(array(select distinct v.lead_id from viejas v));
  return null;
end;
$$;
revoke all on function public.leads_asesores_cartera_alta() from public, anon, authenticated;
revoke all on function public.leads_asesores_cartera_cambio() from public, anon, authenticated;
revoke all on function public.leads_asesores_cartera_baja() from public, anon, authenticated;

drop trigger if exists trg_leads_asesores_cartera_alta on public.leads_asesores;
drop trigger if exists trg_leads_asesores_cartera_cambio on public.leads_asesores;
drop trigger if exists trg_leads_asesores_cartera_baja on public.leads_asesores;
create trigger trg_leads_asesores_cartera_alta after insert on public.leads_asesores
  referencing new table as nuevas for each statement execute function public.leads_asesores_cartera_alta();
create trigger trg_leads_asesores_cartera_cambio after update on public.leads_asesores
  referencing old table as viejas new table as nuevas for each statement execute function public.leads_asesores_cartera_cambio();
create trigger trg_leads_asesores_cartera_baja after delete on public.leads_asesores
  referencing old table as viejas for each statement execute function public.leads_asesores_cartera_baja();

-- Los atributos públicos de unos atributos: sólo las claves de un campo que no es `solo_cartera`. Una clave que el layout no
-- conoce no pasa (falla cerrada).
create or replace function public._lead_atributos_publicos(p_atributos jsonb)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
    from jsonb_each(coalesce(p_atributos, '{}'::jsonb)) e
   where exists (select 1 from public.leads_campos c where c.clave = e.key and not c.solo_cartera);
$$;
revoke all on function public._lead_atributos_publicos(jsonb) from public, anon, authenticated;

-- Al crear un lead o cambiar sus atributos: la cartera nace vacía (la llena el trigger de `leads_asesores` cuando entra el
-- dueño) y los atributos públicos se calculan. Nadie los escribe a mano: lo que venga en la fila se pisa.
create or replace function public.lead_derivados()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.cartera := '{}';
  end if;
  -- Los campos que se leen, `for share`: un cambio de privacidad (que toma el campo `for update`) espera a que este lead
  -- se confirme, o este lead espera y lee el campo ya cambiado.
  perform 1 from public.leads_campos c
   where c.clave in (select jsonb_object_keys(coalesce(new.atributos, '{}'::jsonb)))
   order by c.id for share;
  new.atributos_publicos := public._lead_atributos_publicos(new.atributos);
  return new;
end;
$$;
revoke all on function public.lead_derivados() from public, anon, authenticated;
drop trigger if exists trg_lead_derivados on public.leads;
create trigger trg_lead_derivados before insert or update of atributos, atributos_publicos on public.leads
  for each row execute function public.lead_derivados();

-- El relleno: hasta `p_lote` leads sin calcular, en orden de id, saltando lo que otra transacción tiene tomado. Devuelve
-- cuántos llenó; se llama hasta que devuelva 0 (cada llamada es su transacción: se puede cortar y seguir). Con 212.000
-- leads, 43 lotes de 5.000 a ~450 ms cada uno.
create or replace function public._leads_derivados_rellenar(p_lote int)
returns int language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  with pendientes as (
    select l.id from public.leads l
     where l.cartera is null or l.atributos_publicos is null
     order by l.id limit greatest(coalesce(p_lote, 0), 1)
     for update skip locked
  )
  update public.leads l
     set cartera = public._lead_cartera_calcular(l.id),
         atributos_publicos = public._lead_atributos_publicos(l.atributos)
    from pendientes p
   where l.id = p.id;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function public._leads_derivados_rellenar(int) from public, anon, authenticated;

do $$
declare v_total bigint; v_n int;
begin
  select count(*) into v_total from public.leads where cartera is null or atributos_publicos is null;
  if v_total <= 50000 then
    loop
      v_n := public._leads_derivados_rellenar(5000);
      exit when v_n = 0;
    end loop;
  else
    raise notice 'Hay % leads sin la cartera ni los atributos públicos: llama select public._leads_derivados_rellenar(5000) hasta que devuelva 0 antes de aplicar …001600.', v_total;
  end if;
end $$;
