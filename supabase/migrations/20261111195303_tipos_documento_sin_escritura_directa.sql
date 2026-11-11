-- Tipos de documento: sin escritura directa (paso 5.03, C13). Desde aquí se escriben sólo por tipo_documento_crear, _guardar, _mover y _eliminar
-- (security definer, con el permiso del grupo). Queda la lectura para todo authenticated («tipos_documento: leer»).

drop policy "tipos_documento: crear" on public.tipos_documento;
drop policy "tipos_documento: editar" on public.tipos_documento;
revoke insert, update, delete on table public.tipos_documento from authenticated;

comment on table public.tipos_documento is
  'Catálogo de documentos del ciclo (título, BL, DUI, factura, evidencia…). Global (flujo_id NULL) o propio de un flujo. Un tipo en uso no se borra: se desactiva. Se escribe sólo por tipo_documento_crear, tipo_documento_guardar, tipo_documento_mover y tipo_documento_eliminar; tipos_documento_con_uso cuenta su uso.';

-- El catálogo dice dónde se aplica ahora la clave (la nube no corre el seed; el seed dice lo mismo).
update public.permisos
   set aplicado_en = 'policy puertos, navieras, categorias_gasto; tipo_documento_* (globales)'
 where clave = 'logistica.catalogos.gestionar';
