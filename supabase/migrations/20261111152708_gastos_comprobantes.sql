-- Comprobantes de gastos y pagos: se leen por la fila que los nombra y se suben a la carpeta de su unidad (paso 6.10-2, C1–C4).
--   Antes, «comprobantes: leer» abría el bucket entero a quien tuviera `logistica.gastos.ver`, `logistica.pagos.ver` o `repuestos.costos.ver` en un origen
--   cualquiera, y «subir» a quien pudiera editar en cualquiera. Ahora (D1–D3):
--   C1. `_comprobante_unidad(nombre)`: la unidad (vehículo, ítem de repuesto o proyecto) del primer tramo, sólo en la forma `<uuid>/<64 hex>.<ext>`; si
--       no, nulo (nunca 22P02).
--   C2. `comprobante_puede(nombre, acción)`: «subir» pide poder editar gastos o pagos de esa unidad viva; «ver» pide ver la fila viva que nombra el objeto
--       (un gasto con `gastos.ver` de su unidad, un pago como «pagos: leer», una compra con `repuestos.costos.ver`), o, si ninguna fila lo nombra todavía
--       (recién subido), poder subir a esa carpeta. Un prorrateo se lee desde cualquier vehículo del lote.
--   C3. Las dos policies de `storage.objects`, con ese ayudante. Sin update ni delete: borra `storage-gc` con service_role.
--   C4. Índices parciales sobre `comprobante_ruta` para el `exists` por objeto (y para `storage_refcount`).

create function public._comprobante_unidad(p_nombre text) returns uuid
  language sql immutable
  set search_path = ''
as $_$
  select case
    when p_nombre ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{64}\.[a-z0-9]{1,8}$'
      then split_part(p_nombre, '/', 1)::uuid
  end;
$_$;

comment on function public._comprobante_unidad(text) is 'La unidad de un objeto del bucket comprobantes (el primer tramo de <unidad>/<sha-256>.<ext>); nulo fuera de esa forma, nunca 22P02. Inmutable y de invocador: no lee tablas. La llama comprobante_puede (6.10-2).';
revoke all on function public._comprobante_unidad(text) from public, anon, authenticated;
grant execute on function public._comprobante_unidad(text) to service_role;

-- C2 · usa gastos_comprobante_ruta_idx, pagos_comprobante_ruta_idx y repuestos_compras_comprobante_ruta_idx (C4).
create function public.comprobante_puede(p_nombre text, p_accion text) returns boolean
  language plpgsql stable security definer
  set search_path = ''
as $$
declare u uuid := public._comprobante_unidad(p_nombre);
begin
  if u is null then
    return false;
  end if;
  if p_accion = 'subir' then
    return public.puede_vehiculo(u, 'logistica.gastos.editar') or public.puede_vehiculo(u, 'logistica.pagos.editar')
        or public.puede_repuesto(u, 'repuestos.costos.editar')
        or (exists (select 1 from public.repuestos_proyectos pr where pr.id = u and pr.eliminado_en is null) and public.tiene_permiso('repuestos.costos.editar'));
  end if;
  if p_accion <> 'ver' then
    return false;
  end if;
  if exists (select 1 from public.gastos g
              where g.comprobante_ruta = p_nombre and g.eliminado_en is null
                and public.puede_unidad(g.vehiculo_id, g.repuesto_id, 'logistica.gastos.ver', 'repuestos.costos.ver'))
     or exists (select 1 from public.pagos p
                 where p.comprobante_ruta = p_nombre and p.eliminado_en is null
                   and case when p.vehiculo_id is not null then public.puede_vehiculo(p.vehiculo_id, 'logistica.pagos.ver')
                            else public.tiene_permiso('repuestos.costos.ver') end)
     or exists (select 1 from public.repuestos_compras rc
                 where rc.comprobante_ruta = p_nombre and rc.eliminado_en is null and public.tiene_permiso('repuestos.costos.ver')) then
    return true;
  end if;
  -- D2 · recién subido: ninguna fila (viva o borrada) lo nombra; lo lee quien puede subir a esa carpeta.
  return not exists (select 1 from public.gastos g where g.comprobante_ruta = p_nombre)
     and not exists (select 1 from public.pagos p where p.comprobante_ruta = p_nombre)
     and not exists (select 1 from public.repuestos_compras rc where rc.comprobante_ruta = p_nombre)
     and public.comprobante_puede(p_nombre, 'subir');
end;
$$;

comment on function public.comprobante_puede(text, text) is 'Si quien llama puede «ver» o «subir» ese objeto del bucket comprobantes. Subir: poder editar gastos o pagos de la unidad viva de la carpeta. Ver: ver la fila viva que lo nombra (gasto: logistica.gastos.ver de su unidad; pago: como «pagos: leer»; compra: repuestos.costos.ver), o, si ninguna fila lo nombra, poder subir a esa carpeta. Nunca nula. La llaman las policies de storage.objects (6.10-2, D1–D3).';
revoke all on function public.comprobante_puede(text, text) from public, anon;
grant execute on function public.comprobante_puede(text, text) to authenticated, service_role;

drop policy "comprobantes: leer" on storage.objects;
create policy "comprobantes: leer" on storage.objects as permissive for select to authenticated
  using (bucket_id = 'comprobantes' and (select public.comprobante_puede(objects.name, 'ver')));

drop policy "comprobantes: subir" on storage.objects;
create policy "comprobantes: subir" on storage.objects as permissive for insert to authenticated
  with check (bucket_id = 'comprobantes' and (select public.comprobante_puede(objects.name, 'subir')));

create index gastos_comprobante_ruta_idx on public.gastos (comprobante_ruta) where comprobante_ruta is not null;
create index pagos_comprobante_ruta_idx on public.pagos (comprobante_ruta) where comprobante_ruta is not null;
create index repuestos_compras_comprobante_ruta_idx on public.repuestos_compras (comprobante_ruta) where comprobante_ruta is not null;

update public.permisos set aplicado_en = 'policy gastos, comprobante_puede' where clave = 'logistica.gastos.ver';
update public.permisos set aplicado_en = 'policy pagos, comprobante_puede' where clave = 'logistica.pagos.ver';
