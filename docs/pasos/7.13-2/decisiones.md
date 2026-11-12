## 2026-11-12 — 7.13-2

- **D4 · Un texto que parece teléfono no pide la sección de leads.** `pareceTelefono` (≥ 7 dígitos, sólo separadores, sin `#`) la omite y el estado `listo` trae `porTelefono`
  para decir «No se busca por teléfono». Vehículos (VIN, lote) y cotizaciones sí se piden. Costo: un número de lead de 7 o más dígitos sin `#` no se encuentra por su número; con `#` sí. Reversible borrando una línea del hook.
- **D5 · «Últimos abiertos» sin memoria:** se releen cada vez que la paleta se abre, porque las visitas cambian con cada ficha.
- **D6 · `reposo` y no «vacío»:** bajo el mínimo (o cerrada) se muestran «Últimos abiertos» y acciones; la parte 3 no necesita un estado «mínimo».
- **D7 · El estado se deriva** de lo guardado y de una clave en vez de un `setState` en el efecto: sin parpadeo de la lista vieja y sin `react-hooks/set-state-in-effect`.
- **D8 · Las acciones se filtran en `entities`, sin mínimo y sin base:** valen sin red y con texto corto.
- **D9 · Los hooks reciben las lecturas por argumento** (con `composicion.client.ts` por defecto): el test no mockea módulos.
- **«Sin conexión» no es un código de `ErrorApp`:** `errorDePostgrest` da `inesperado` y cambia sólo el mensaje; se decide con `!navigator.onLine` o `MENSAJE_SIN_CONEXION` (`estadoDeError`). `MENSAJE_SIN_RESPUESTA` queda como `error` con «Reintentar».
- **El test del hook mockea `server-only`:** `leads/client` reexporta una Server Action y en Vitest el import llega entero (el mismo `vi.mock` que usan otras pruebas).
