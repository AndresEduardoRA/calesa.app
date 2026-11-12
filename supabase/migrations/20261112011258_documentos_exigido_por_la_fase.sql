-- Documentos: no se quita el que exige la fase actual (paso 6.05, C14–C15; decisiones D11, D12).
--
-- Un documento aprobado y vivo que hoy hace cumplir un requisito bloqueante de la fase en que está su unidad no se elimina, ni se rechaza, ni se le
-- acorta el vencimiento a una fecha pasada, si sin él el requisito deja de cumplirse: primero se sube el reemplazo. Que venza solo no pasa por aquí (la
-- unidad queda «fuera de regla»), ni el borrado real en cascada al purgar la unidad (no es un update). Dos quitas del mismo requisito se serializan
-- con un candado por unidad y tipo: la segunda ve lo que confirmó la primera. La unidad se toma `for share`: un cambio de fase que ya la tomó termina
-- antes (la carrera de mover mientras se quita, con `cambiar_fase` evaluando antes de tomar la unidad, la cierra 6.02: D12).

create function public.documento_exigido() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_fase uuid; v_unidad uuid := coalesce(old.vehiculo_id, old.repuesto_id); r record; n int; v_min int; v_despues boolean;
begin
  if old.vehiculo_id is not null then
    select v.fase_id into v_fase from public.vehiculos v where v.id = old.vehiculo_id for share;
  else
    select i.fase_id into v_fase from public.repuestos_items i where i.id = old.repuesto_id for share;
  end if;
  -- Sin fase, o el documento ya no contaba (vencido): no hay nada que proteger.
  if v_fase is null or (old.vence_el is not null and old.vence_el < current_date) then
    return new;
  end if;
  v_despues := new.estado = 'aprobado' and new.eliminado_en is null and (new.vence_el is null or new.vence_el >= current_date);
  perform pg_advisory_xact_lock(hashtextextended('documento_exigido:' || v_unidad::text || ':' || old.tipo_documento_id::text, 0));
  for r in select q.min_archivos, q.max_archivos, q.formatos, f.nombre as fase_nombre
           from public.fases_requisitos q join public.fases f on f.id = q.fase_id
           where q.fase_id = v_fase and q.tipo = 'documento' and q.bloqueante and q.tipo_documento_id = old.tipo_documento_id loop
    -- Con el predicado de evaluar_requisitos (base.sql:11152): aprobado, vivo, sin vencer y con un formato del requisito.
    if (r.formatos is null or old.mime is null or old.mime = any (r.formatos))
       and not (v_despues and (r.formatos is null or new.mime is null or new.mime = any (r.formatos))) then
      v_min := coalesce(r.min_archivos, 1);
      -- Se cuentan a lo sumo max + 1 (o min + 1): basta para saber si hoy cumple y si sin éste deja de cumplir.
      select count(*) into n from (
        select 1 from public.documentos doc
        where doc.vehiculo_id is not distinct from old.vehiculo_id and doc.repuesto_id is not distinct from old.repuesto_id
          and doc.tipo_documento_id = old.tipo_documento_id and doc.estado = 'aprobado' and doc.eliminado_en is null
          and (doc.vence_el is null or doc.vence_el >= current_date)
          and (r.formatos is null or doc.mime is null or doc.mime = any (r.formatos))
        limit coalesce(r.max_archivos, v_min) + 1) t;
      if n >= v_min and (r.max_archivos is null or n <= r.max_archivos) and n - 1 < v_min then
        raise exception 'La fase «%» exige este documento. Sube el reemplazo antes de quitarlo.', r.fase_nombre using errcode = '23514';
      end if;
    end if;
  end loop;
  return new;
end;
$$;

comment on function public.documento_exigido() is 'Trigger before update de documentos (un aprobado vivo que cambia): si hoy hace cumplir un requisito bloqueante de la fase actual de su unidad y sin él deja de cumplirse, 23514 «La fase «…» exige este documento.». Toma la unidad for share y un candado por unidad y tipo. 6.05.';
revoke all on function public.documento_exigido() from public, anon, authenticated;

create trigger trg_documento_exigido before update on public.documentos
  for each row when (old.estado = 'aprobado' and old.eliminado_en is null)
  execute function public.documento_exigido();
