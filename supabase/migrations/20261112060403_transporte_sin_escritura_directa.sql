-- Transporte: sin escritura directa (paso 6.07-1, C13). Se escribe sólo por `transporte_guardar` (y `transporte_grupo_aplicar`, que suma su nombre a
-- `aplicado_en` en su migración): sin las policies de crear y editar y sin insert, update ni delete para authenticated. Quedan la policy de leer y el
-- select. El comentario de la tabla deja de nombrar la vista `embarques`, que no existe.

drop policy "transportes: crear" on public.transportes;
drop policy "transportes: editar" on public.transportes;

revoke insert, update, delete on table public.transportes from authenticated;

comment on table public.transportes is
  'Transporte 1:1 por unidad. «Embarque» y «contenedor» no son entidades: son grupos por booking o contenedor sobre esta tabla. Escritura sólo por transporte_guardar y transporte_grupo_aplicar.';

update public.permisos set aplicado_en = 'transporte_guardar' where clave = 'logistica.transporte.editar';
