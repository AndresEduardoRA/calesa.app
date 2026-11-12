-- Mover de fase no edita la ficha (paso 6.02-1, C9). Como al cotizar (`cotizado_en`, migración 20261029184435), cuando cambian `fase_id` o `fase_desde`
-- (sólo los escribe `cambiar_fase`, y nada más en esa sentencia) ni se mueve la versión de la ficha (`actualizado_en`, la que pide `vehiculo_guardar`:
-- quien la tenía abierta no choca con un PT409 por un cambio de fase) ni se escribe `vehiculos.update` en `actividad`: el cambio ya consta una vez como
-- `unidad.fase_cambiada` (y en `historial_fases`). Efecto aparte: el `update` de `fase_id` que hace `vehiculo_crear()` justo después del insert tampoco
-- audita ni toca `actualizado_en` (misma transacción: el alta ya consta como `vehiculos.insert` y `returning` devuelve lo guardado).

drop trigger trg_actualizado_en on public.vehiculos;
create trigger trg_actualizado_en before update on public.vehiculos for each row
  when (old.cotizado_en is not distinct from new.cotizado_en
        and old.fase_id is not distinct from new.fase_id
        and old.fase_desde is not distinct from new.fase_desde)
  execute function public.set_actualizado_en();

drop trigger trg_auditar_cambio on public.vehiculos;
create trigger trg_auditar_cambio after update on public.vehiculos for each row
  when (old.cotizado_en is not distinct from new.cotizado_en
        and old.fase_id is not distinct from new.fase_id
        and old.fase_desde is not distinct from new.fase_desde)
  execute function public.auditar();

comment on table public.vehiculos is 'Inventario. De sólo lectura para la app: se escribe por vehiculo_crear() y vehiculo_guardar(). fase_id y fase_desde los escriben cambiar_fase() y, sólo al nacer, vehiculo_crear() (entrada a la única fase inicial), sin mover la versión ni auditar (el cambio consta como unidad.fase_cambiada; 6.02-1). publicado_web lo escribe vehiculo_vitrina(); que además se vea en la web lo decide interno.vitrina_vehiculos (fase activa que publica, origen activo y visible, integración web activa). cotizado_en lo escribe sólo el trigger trg_vehiculo_cotizado de cotizaciones, sin mover la versión ni auditar. Papelera: eliminado_en + lote; una policy RESTRICTIVE esconde lo borrado a todos.';
