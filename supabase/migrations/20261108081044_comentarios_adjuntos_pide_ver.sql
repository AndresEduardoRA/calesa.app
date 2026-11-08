-- Adjuntar a una cotización pide verla (4.27-1, cierra 4-69).
--
-- Las policies «cotizaciones: subir» (storage.objects) y «cotizaciones_adjuntos: crear» pedían `cotizaciones.editar` sin `ver`: quien edita sin ver
-- subía a la carpeta de una cotización que no ve. Ahora piden lo que pide guardarla (`_cotizacion_puede_guardar`): una preventa, ver y editar por su
-- alcance; una final, ver y `cotizaciones.final.gestionar` del origen. «Borrar» un adjunto pide ver, y al autor además poder adjuntar todavía (como
-- `cotizacion_adjunto_quitar`, más adelante en este paso); quien modera sigue pudiendo con ver.
-- «cotizaciones: leer» casteaba el primer tramo a uuid (22P02 con un objeto fuera de una carpeta de cotización): ahora lo lee `_cotizacion_de_objeto`,
-- que da nulo y la policy, falso.

create function public._cotizacion_de_objeto(p_nombre text) returns uuid
  language sql immutable
  set search_path = ''
as $_$
  select case
    when split_part(p_nombre, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and strpos(p_nombre, '/') > 0
      then split_part(p_nombre, '/', 1)::uuid
  end;
$_$;

comment on function public._cotizacion_de_objeto(text) is 'La cotización de un objeto del bucket cotizaciones (el primer tramo de su ruta, si es un uuid); nulo fuera de una carpeta. Inmutable y de invocador: no lee tablas. La llaman las policies de storage.objects (4.27-1).';
revoke all on function public._cotizacion_de_objeto(text) from public, anon;
grant execute on function public._cotizacion_de_objeto(text) to authenticated, service_role;

create function public.cotizacion_puede_adjuntar(p_cot uuid) returns boolean
  language sql stable security definer
  set search_path = ''
as $$
  select coalesce((
    select public._cotizacion_puede_guardar(c.id, c.clase, c.origen_id)
      from public.cotizaciones c
     where c.id = p_cot and c.eliminado_en is null
  ), false);
$$;

comment on function public.cotizacion_puede_adjuntar(uuid) is 'Si quien llama puede adjuntar a esa cotización: lo que pide guardarla (preventa: cotizaciones.ver y cotizaciones.editar por su alcance; final: cotizaciones.ver y cotizaciones.final.gestionar del origen). Falso si no existe o está en la papelera; nunca nula. La llaman las policies de adjuntos y cotizacion_adjuntar (4.27-1, cierra 4-69).';
revoke all on function public.cotizacion_puede_adjuntar(uuid) from public, anon;
grant execute on function public.cotizacion_puede_adjuntar(uuid) to authenticated, service_role;

drop policy "cotizaciones: leer" on storage.objects;
create policy "cotizaciones: leer" on storage.objects as permissive for select to authenticated
  using (bucket_id = 'cotizaciones' and (select public.puede_cotizacion(public._cotizacion_de_objeto(objects.name), 'cotizaciones.ver')));

drop policy "cotizaciones: subir" on storage.objects;
create policy "cotizaciones: subir" on storage.objects as permissive for insert to authenticated
  with check (bucket_id = 'cotizaciones' and (select public.cotizacion_puede_adjuntar(public._cotizacion_de_objeto(objects.name))));

drop policy "cotizaciones_adjuntos: crear" on public.cotizaciones_adjuntos;
create policy "cotizaciones_adjuntos: crear" on public.cotizaciones_adjuntos for insert to authenticated
  with check (subido_por = (select auth.uid()) and (select public.cotizacion_puede_adjuntar(cotizaciones_adjuntos.cotizacion_id)));

drop policy "cotizaciones_adjuntos: borrar" on public.cotizaciones_adjuntos;
create policy "cotizaciones_adjuntos: borrar" on public.cotizaciones_adjuntos for delete to authenticated
  using ((select public.puede_cotizacion(cotizaciones_adjuntos.cotizacion_id, 'cotizaciones.ver'))
         and ((subido_por = (select auth.uid()) and (select public.cotizacion_puede_adjuntar(cotizaciones_adjuntos.cotizacion_id)))
              or (select public.tiene_permiso('cotizaciones.moderar'))));
