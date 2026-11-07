-- 4.19-1: descartar el borrador de la plantilla de la tarjeta, con la versión que se vio en pantalla. Hasta hoy un borrador olvidado sólo se pisaba o se
-- publicaba; la fórmula ya lo tiene (4.20-2b). Pasa por el mismo candado por origen que guardar y publicar (migración anterior): descartar mientras otra
-- persona publica no borra la plantilla ya publicada. docs/COTIZADOR.md › «Versiones de la plantilla (4.19-1)».

create function public.plantilla_descartar_borrador(p_origen uuid, p_actualizado_en_esperado timestamptz) returns void
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_b public.plantillas_tarjeta;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  if p_actualizado_en_esperado is null then perform public._exigir_version(null, null, null); end if;
  perform pg_advisory_xact_lock(hashtextextended('plantillas:' || p_origen::text, 0));
  select * into v_b from public.plantillas_tarjeta where origen_id = p_origen and estado = 'borrador' for update;
  if v_b.id is null then perform public._plantilla_borrador_ausente(p_origen, p_actualizado_en_esperado); end if;
  perform public._exigir_version(v_b.actualizado_en, p_actualizado_en_esperado,
    'El borrador de esta plantilla cambió ' || public._hace(v_b.actualizado_en) || ', mientras lo editabas.');
  delete from public.plantillas_tarjeta where id = v_b.id;
end;
$$;

revoke all on function public.plantilla_descartar_borrador(uuid, timestamptz) from public, anon;
grant execute on function public.plantilla_descartar_borrador(uuid, timestamptz) to authenticated, service_role;
comment on function public.plantilla_descartar_borrador(uuid, timestamptz) is
  'Borra el borrador de la plantilla de la tarjeta de un origen (cotizaciones.configurar del origen), con la versión que se vio (PT409 si cambió o ya no está). Candado por origen. docs/COTIZADOR.md › «Versiones de la plantilla (4.19-1)».';
