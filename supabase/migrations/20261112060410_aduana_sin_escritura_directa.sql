-- Aduana: sin escritura directa (paso 6.07-2, C20). Desde aquí declaraciones_aduana y declaraciones_vehiculos se escriben sólo por declaracion_guardar,
-- declaracion_vehiculos_poner y declaracion_canal (security definer, con logistica.aduana.gestionar): sin las policies de crear y editar y sin insert,
-- update ni delete para authenticated. Quedan las policies de leer y el select (D30).

drop policy "declaraciones_aduana: crear" on public.declaraciones_aduana;
drop policy "declaraciones_aduana: editar" on public.declaraciones_aduana;
drop policy "declaraciones_vehiculos: crear" on public.declaraciones_vehiculos;
drop policy "declaraciones_vehiculos: editar" on public.declaraciones_vehiculos;

revoke insert, update, delete on table public.declaraciones_aduana, public.declaraciones_vehiculos from authenticated;

comment on table public.declaraciones_aduana is
  'DUI como dato estructurado y delgado: el archivo va en documentos, los tributos en gastos (categoría con propósito tributos), el avance en fases. Composición congelada al asignarse canal de aforo. Se escribe sólo por declaracion_guardar, declaracion_vehiculos_poner y declaracion_canal; la composición queda congelada por trg_declaracion_vehiculo_proteger.';

-- El catálogo dice dónde se aplica ahora la clave (la nube no corre el seed; el seed dice lo mismo).
update public.permisos set aplicado_en = 'declaracion_guardar, declaracion_vehiculos_poner, declaracion_canal' where clave = 'logistica.aduana.gestionar';
