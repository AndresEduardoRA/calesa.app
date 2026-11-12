## 2026-11-11 — Paso 6.11-3: `/logistica/gastos` (parte 3 de 4 del 6.11)

- **D1 · El cursor de `(fecha, id)` viaja como instante** `<fecha>T00:00:00Z` para pasar `leerCursor()` (que sólo acepta instantes completos); la infra manda a la base sólo la fecha. No se tocó `src/shared`.
- **D2 · Sin «Anterior».** Las dos RPC sólo caminan hacia adelante (`(fecha, id) < cursor`). Hay «Siguiente», «Volver a los más recientes» y el «atrás» del navegador; `anterior` es siempre nulo. Sin migración.
- **D3 · La fila abre el panel de la unidad de `/logistica`** (`?vehiculo=`, el mismo `DrawerDeLaUnidad` y `UnidadAbierta`): la página los importa de `src/app`, y pasa la clave al componente del módulo como prop. Abrir suma al historial con la vuelta del foco.
- **D4 · La lista de pagos no nombra a quien confirmó:** `pagos_listar` no lo trae y leer `perfiles` por fila sería N+1. Dice «Confirmado» con «el <fecha>»; el nombre está en el sello del panel de la unidad.
- **D5 · Cambiar de vista («Gastos» ↔ «Pagos») limpia filtros y página:** no son los mismos filtros.
- **D6 · Ninguna suma ni total en la lista.** Cada monto es el de su fila y el equivalente es el `monto_base` que guardó la base; el total de una unidad es su margen.
- **D7 · Sin «Ver comprobante» ni acciones por fila:** abrir la unidad es el camino a corregir, eliminar, confirmar o anular (los diálogos viven en un solo lugar).
- **D8 · La lista no se refresca mientras el panel está abierto;** al cerrarlo, la página se vuelve a pedir (`shallow: false`).
- **D9 · Página fija de `TAMANO_DE_PAGINA_POR_DEFECTO`** (50), sin `?por=`: así lo registra la guarda de tamaño de página.
- **D10 · El enlace «Gastos» pide `logistica.gastos.ver`** (un enlace lleva un solo permiso). Quien sólo ve pagos entra por «Ver todos en Gastos» del hueco «Pagos» o por la URL; la página atiende cualquiera de las dos claves.
- **D11 · `?ver=` o un filtro inválido se descartan, nunca dan error.** El pedido manda a cada RPC sólo las claves que acepta (una de más da 22023); lo cubre `entities/dinero/listas.test.ts`.
- **D12 · Limitación aceptada:** la hoja de filtros del celular usa `?panel=filtros`, la misma clave que los drawers de gasto y de pago (abrir uno cierra el otro). La hoja se cierra al tocar una fila.
- **D13 · Sin filtro por vehículo ni por proveedor:** la base no los tiene (sería una migración). Abierto para quien lo pida.
- **D14 · La prueba de huecos de la unidad** (`huecos-de-la-unidad.test.tsx`) afirmaba que ninguna área declaraba huecos y estaba en rojo desde 6.11-1: ahora afirma que sin permisos no se dibuja ninguno.
