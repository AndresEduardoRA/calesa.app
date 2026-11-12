-- Documentos: el objeto compartido se lee por cualquier fila viva (paso 6.05, C16–C17; decisión D1).
--
-- Un objeto, N filas: el archivo vive en la carpeta de la primera unidad y se registra para todas. Quien ve sólo la tercera tiene que poder leerlo:
-- además de la carpeta propia de siempre, lee el objeto quien ve alguna fila viva de documentos con esa ruta. La subconsulta corre bajo la RLS de
-- documentos de quien mira («documentos: leer»: viva y logistica.ver o repuestos.ver de su unidad), sin security definer que la salte.
-- «documentos: subir» no cambia. storage.objects sólo recibe policies.

drop policy "documentos: leer" on storage.objects;
create policy "documentos: leer" on storage.objects as permissive for select to authenticated
  using (bucket_id = 'documentos' and (
    (select public.puede_vehiculo(((storage.foldername(objects.name))[1])::uuid, 'logistica.ver'))
    or (select public.puede_repuesto(((storage.foldername(objects.name))[1])::uuid, 'repuestos.ver'))
    or exists (select 1 from public.documentos d where d.ruta = objects.name and d.eliminado_en is null)
  ));

-- La ruta: la usan la policy de arriba, storage_refcount('documentos', …) y la papelera de vehículos (cierra DECISIONES 2348, punto 4).
create index documentos_ruta_idx on public.documentos (ruta);
comment on index public.documentos_ruta_idx is 'La policy «documentos: leer» de storage.objects (una fila viva con esa ruta), storage_refcount(''documentos'', ruta) y la papelera. 6.05.';

-- La bandeja de lo que falta revisar (6.12): los subidos vivos, del más antiguo.
create index documentos_por_revisar_idx on public.documentos (creado_en, id) where estado = 'subido' and eliminado_en is null;
comment on index public.documentos_por_revisar_idx is 'La bandeja «Documentos por aprobar» (6.12): subidos vivos por antigüedad. 6.05.';
