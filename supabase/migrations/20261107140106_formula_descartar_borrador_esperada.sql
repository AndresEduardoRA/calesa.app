-- 4.21-2: descartar el borrador de la fórmula con su versión esperada (4-8). Con la actualizado_en que leyó, borra sólo ese borrador: si cambió o ya no
-- está (se publicó o se descartó), PT409. Sin hora borra el que haya y, si no hay, no hace nada (lo de hoy, P1 del 4.20-2c), hasta que la app la mande
-- (4.21-3b). El permiso va primero; después el candado del origen, como guardar y publicar. docs/COTIZADOR.md › «Versiones (4.20-1)».

drop function public.formula_descartar_borrador(uuid);
create function public.formula_descartar_borrador(p_origen uuid, p_actualizado_en_esperado timestamptz default null) returns void
  language plpgsql security definer
  set search_path = ''
as $$
declare v_b public.formulas;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  perform pg_advisory_xact_lock(hashtextextended('formulas:' || p_origen::text, 0));
  select * into v_b from public.formulas where origen_id = p_origen and estado = 'borrador' for update;   -- formulas_borrador_unico
  perform public._exigir_borrador_formula(v_b, p_actualizado_en_esperado);
  delete from public.formulas where id = v_b.id;
end;
$$;

revoke all on function public.formula_descartar_borrador(uuid, timestamptz) from public, anon;
grant execute on function public.formula_descartar_borrador(uuid, timestamptz) to authenticated, service_role;
comment on function public.formula_descartar_borrador(uuid, timestamptz) is
  'Descarta el borrador de un origen (cotizaciones.configurar). Con p_actualizado_en_esperado, sólo si es la del borrador (PT409 si cambió o ya no está); sin ella, el que haya. docs/COTIZADOR.md › «Versiones (4.20-1)».';
