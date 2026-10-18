-- Parte 9j: el enum `tipo_lead` y la columna `leads.tipo` ya no están en `schemas/` (los tipos de lead son una tabla,
-- `tipos_lead`, y `leads.tipo_lead_id` la apunta), pero las migraciones que siguen —las ya comprometidas— los nombran: un
-- `grant select (…, tipo, …)`, una vista, el cuerpo de varias funciones. Esta migración los crea de nuevo, con la fecha de antes
-- de todas ellas, para que se apliquen tal como se escribieron sin editarlas (aún no hubo `db push`; docs/DECISIONES.md, 2026-10-11).
--
-- Es andamiaje de la transición: `…20261019003000_tipo_lead_sin_enum.sql` quita la columna y el enum. Nada de la app los lee ni los
-- escribe desde `…002900`.
create type public.tipo_lead as enum ('prospecto', 'cliente');
alter table public.leads add column tipo public.tipo_lead not null default 'prospecto';
comment on column public.leads.tipo is 'LEGADO (9j): el enum que reemplazó tipos_lead. Lo quita 20261019003000_tipo_lead_sin_enum.sql.';
