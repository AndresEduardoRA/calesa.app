-- Estructura de conversaciones (paso 7.08-1, C1–C4): una directa por par, la hora del último mensaje, el canal global sembrado y los
-- miembros a realtime.
--
-- Reglas:
--   - `par_directo` es el par ordenado de una directa (`[menor, mayor]`). Único parcial: A→B y B→A son la misma conversación. Una directa
--     vieja duplicada (de antes de esta migración) queda con nulo: sus miembros la siguen leyendo, pero `chat_directa` no la devuelve (D2).
--   - `ultimo_mensaje_en` lo mueve un trigger en cada mensaje insertado, por cualquier camino (D10); nunca retrocede.
--   - El canal global se siembra aquí (la nube no corre el seed) con el nombre del seed, «Equipo» (D11).
--   - `conversaciones_miembros` entra a `supabase_realtime` sólo si la publicación existe (PGlite no la tiene, D12). Realtime no aplica RLS a
--     los DELETE: quien escuche la tabla sólo debe suscribirse a INSERT y UPDATE filtrados por su `usuario_id` (D19).

-- C1 · una directa por par
alter table public.conversaciones add column par_directo uuid[];
alter table public.conversaciones add constraint conversaciones_par_directo_check check (
  par_directo is null
  or (tipo = 'directa' and cardinality(par_directo) = 2 and par_directo[1] is not null and par_directo[2] is not null and par_directo[1] < par_directo[2])
);

-- Relleno: la directa más antigua de cada par (con exactamente dos miembros distintos) recibe su par; desempate por id. Antes del índice único.
with pares as (
  select c.id, c.creado_en, array_agg(m.usuario_id order by m.usuario_id) as par
    from public.conversaciones c
    join public.conversaciones_miembros m on m.conversacion_id = c.id
   where c.tipo = 'directa'
   group by c.id, c.creado_en
  having count(distinct m.usuario_id) = 2 and count(*) = 2
), primeras as (
  select distinct on (par) id, par from pares order by par, creado_en, id
)
update public.conversaciones c set par_directo = p.par from primeras p where c.id = p.id;

create unique index conversaciones_par_directo_unico on public.conversaciones (par_directo) where par_directo is not null;

-- C2 · la hora del último mensaje (la lista de conversaciones de 7.08-3 ordena por ella)
alter table public.conversaciones add column ultimo_mensaje_en timestamptz not null default now();
update public.conversaciones c
   set ultimo_mensaje_en = coalesce((select max(m.creado_en) from public.mensajes m where m.conversacion_id = c.id), c.creado_en);
create index conversaciones_ultimo_mensaje_idx on public.conversaciones (ultimo_mensaje_en desc, id desc);

-- C3 · cada mensaje insertado mueve la hora de su conversación hacia adelante
create or replace function public._chat_mover_ultimo_mensaje() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
begin
  update public.conversaciones c set ultimo_mensaje_en = new.creado_en
   where c.id = new.conversacion_id and c.ultimo_mensaje_en < new.creado_en;
  return null;
end;
$$;
revoke all on function public._chat_mover_ultimo_mensaje() from public, anon, authenticated;

create trigger trg_chat_ultimo_mensaje after insert on public.mensajes for each row execute function public._chat_mover_ultimo_mensaje();

-- C4 · el canal global existe siempre (nadie lo crea desde la app)
insert into public.conversaciones (tipo, nombre, es_global) values ('grupo', 'Equipo', true) on conflict (es_global) where es_global do nothing;

do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_catalog.pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversaciones_miembros'
     ) then
    alter publication supabase_realtime add table public.conversaciones_miembros;
  end if;
end;
$$;
