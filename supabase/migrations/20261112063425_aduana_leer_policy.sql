-- Aduana: leer la cabecera de una declaración sólo con un vehículo que se ve (paso 6.07-3, D41, D2). Con `tiene_permiso('logistica.ver')` en cualquier
-- origen, un select directo por PostgREST leía toda cabecera (número, despachante, depósito, notas, canal), también la de una declaración que sólo tiene
-- vehículos de otro origen, y desmentía que declaracion_leer no distinga «no existe» de «no la ves» (D33). Ahora: con logistica.aduana.gestionar, toda
-- cabecera; si no, la que tiene un vehículo vivo que se ve con logistica.ver. No se revoca el select: lo leen la policy de declaraciones_vehiculos y, como definer,
-- _requisito_dato_cumplido (regla aduana.canal). Volumen bajo: el exists por fila se acepta (D34). La de declaraciones_vehiculos no
-- cambia: ya es por vehículo.
drop policy "declaraciones_aduana: leer" on public.declaraciones_aduana;
create policy "declaraciones_aduana: leer" on public.declaraciones_aduana for select to authenticated
  using (
    (select public.tiene_permiso('logistica.aduana.gestionar'))
    or exists (
      select 1 from public.declaraciones_vehiculos dv
       where dv.declaracion_id = declaraciones_aduana.id and dv.removido_en is null
         and public.puede_vehiculo(dv.vehiculo_id, 'logistica.ver')
    )
  );

-- D42 · la clave de gestionar se aplica también en las lecturas y en esta policy.
update public.permisos
   set aplicado_en = 'declaracion_guardar, declaracion_vehiculos_poner, declaracion_canal, declaraciones_listar, declaracion_leer, policy declaraciones_aduana: leer'
 where clave = 'logistica.aduana.gestionar';
