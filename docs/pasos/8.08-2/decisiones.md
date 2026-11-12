# 8.08-2: decisiones (2026-11-12)

- **D19 · Los nombres de los cuatro catálogos son fijos.** Las claves son el `check` del esquema (`repuestos_catalogos_catalogo_check`), no un dato de la
  empresa, como `PROPOSITOS_DE_CATEGORIA` (6.11-4). `catalogo.test.ts` (K1) ata la lista a la última migración que define el `check`; los valores salen de
  la base. `modo_transporte` se muestra como «Vía de transporte» (glosario).
- **D20 · La guarda de áreas va en `scripts/guardas/areas-c/`**, que es del carril. En `logistica` y `flujos` la dejó el A en la raíz de `scripts/guardas/`.
  Es una copia adaptada, no se generaliza (generalizarla es editar archivos del A); unificarla queda para el A.
- **D21 · «Ordenar» es el campo «Orden» del formulario**, con las flechas apagadas y su motivo, como «Categorías de gasto». Mover con flechas sin RPC son dos
  `UPDATE` no atómicos. Reversible: una RPC `repuesto_catalogo_mover` y las flechas, más adelante.
- **D22 · Tope de 200 valores por catálogo**, como las categorías de gasto, con `limit 201` y `cortarAlTope`.
- **D23 · Escritura directa bajo RLS, sin RPC**, como las categorías de gasto (6.11-4, D9): un valor de catálogo no otorga permisos, y «en uso» lo protege el
  trigger del 8.08-1.
- **D24 · Cero filas: sin permiso o «ya no existe».** Una relectura por id lo distingue (la policy de lectura es `true`), en vez de decir siempre «sin permiso».
- **D25 · La columna «Uso» no tiene dato** para quien sólo configura (la RLS de ítems pide `repuestos.ver`). La 8.08-3 escribe «—», y el motivo lo da el
  error al borrar.
- **D26 · Las actions comprueban `repuestos.configurar` antes de escribir**, aunque no salgan por `client.ts`: da el texto propio y deja la RLS como la
  protección (probada en K2 y K3).
- **D27 · Ninguna action sale por los barriles.** Los componentes de la 8.08-3 viven en el mismo módulo y las importan en relativo (`modulos.md`).
