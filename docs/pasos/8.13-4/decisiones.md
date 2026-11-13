## 2026-11-12 · Decisiones del paso 8.13-4 (bloques de repuestos de Inicio y enlace en Configuración)

- **D1 · «Repuestos por mover» = ítems en vuelo**, no «listos»: en una fase no final, sin stock, de un proyecto vivo; el que más lleva en su fase, primero. «Listo» exigiría evaluar los roles por transición ítem por ítem (N+1); la fila abre el
  panel del ítem, donde «Qué falta» y los botones lo dicen. Los ítems «sin fase» no entran (los muestra la Cadena).
- **D2 · «Esperas que destraban vehículos»** = lo mismo, sólo de proyectos con vehículo y nombrado por el vehículo. Sin el cruce con la fase del vehículo (`repuestos_pendientes_de_vehiculo` es por vehículo: N+1): abierto 8-13a.
- **D3 · «Ver todas»** de los dos va a `rutaDeLaCadena()` sin filtros; no se inventa un filtro «con vehículo» en la Cadena.
- **D4 · Lectura por PostgREST, sin RPC ni migración**, bajo la RLS de `repuestos.ver` (quien tiene `repuestos.mover` sin `repuestos.ver` ve el vacío). El orden `fase_desde` no tiene índice propio: se suma al abierto 8-13c.
- **D5 · El título del vehículo se lee embebido** (`vehiculo:vehiculos(titulo)`), no de `vehiculo_etiqueta`: un proyecto de un vehículo no copia el título (la RPC deja la etiqueta nula) y la e2e lo mostró. Si quien mira no ve el vehículo, la fila
  dice sólo el repuesto.
- **D6 · Las lecturas y los textos viven en `repuestos`** (un módulo no consulta tablas ajenas); los bloques de `tablero` sólo componen `ListaDeBloque`.
- **D7 · `inicio-bandeja.spec.ts`** deja de afirmar el vacío de «Esperas…» (la base compartida puede traer ítems de otro spec): comprueba que el bloque se dibuja y no cae a su error.
