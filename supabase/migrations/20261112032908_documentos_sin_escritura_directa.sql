-- Documentos: sin escritura directa (paso 6.05, C12–C13). Desde aquí se escriben sólo por documento_registrar, documento_revisar, documento_editar y
-- documento_eliminar (security definer, con la clave de la unidad). Queda la lectura («documentos: leer»: vivas, con logistica.ver o repuestos.ver).

drop policy "documentos: crear" on public.documentos;
drop policy "documentos: editar" on public.documentos;
revoke insert, update, delete on table public.documentos from authenticated;

comment on table public.documentos is
  'Archivos del ciclo de una unidad. Borrado suave; el objeto de Storage nunca se borra desde la fila (puede estar compartido: un objeto, N filas). Un requisito cuenta aprobados, vivos y no vencidos. Se escribe sólo por documento_registrar, documento_revisar, documento_editar y documento_eliminar.';

-- El catálogo dice dónde se aplica ahora cada clave (la nube no corre el seed; el seed dice lo mismo).
update public.permisos set aplicado_en = 'documento_registrar, documento_editar, documento_eliminar; policy storage documentos'
 where clave in ('logistica.documentos.subir', 'repuestos.documentos.subir');
update public.permisos set aplicado_en = 'documento_revisar, documento_editar (visible_portal), documento_eliminar'
 where clave in ('logistica.documentos.aprobar', 'repuestos.documentos.aprobar');
