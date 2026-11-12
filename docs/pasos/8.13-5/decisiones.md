## 2026-11-12 · Decisiones del paso 8.13-5 (los pagos del cliente del proyecto de repuestos)

- **D1 · Una RPC gemela, `pago_registrar_proyecto`**, no un `p_proyecto` en `pago_registrar`: no cambia la firma ni el tipo de la RPC que usa Logística. Pide
  `repuestos.costos.editar` y `repuestos.ver` (como las compras), `security definer`, `set search_path = ''`, idempotente por id (`on conflict do nothing` y relectura).
- **D2 · Sin lead:** el pago de proyecto lo deja nulo; no se amplía la superficie de `leads` (`auditoria-leads.sql` la registra como `X`).
- **D3 · Sin la regla de flujo `pagos`:** el proyecto no tiene fase propia y la fila de la regla del flujo `repuestos` sólo la garantiza el seed. Lo que bloquea es el proyecto cerrado.
- **D4 · Un pago de proyecto confirmado no se anula todavía** (`pago_anular` es de vehículo): queda sellado. La UI no ofrece «Anular» ni por la lista ni por `?panel=anular-pago`, y
  el texto de confirmar lo dice («no se podrá editar, eliminar ni anular por ahora»). **Abierto nuevo 8-13d.**
- **D5 · Proyecto cerrado:** no admite pagos nuevos (23514 «El proyecto está cerrado: reábrelo para registrar pagos.»); los sin confirmar se corrigen y eliminan como hoy. El
  reintento de un id ya guardado devuelve lo guardado aunque el proyecto se haya cerrado después. El proyecto se toma `for share` antes de mirar el pago: eliminarlo o cerrarlo espera.
- **D6 · La UI generaliza con un contexto** (`AmbitoDePagoContext`, por defecto `vehiculo`) y un `CuerpoDePagos` compartido: el hueco del vehículo no cambia de conducta.
- **D7 · Los permisos de los botones del proyecto llegan por props** desde la página (`puede()`), sin leer `mis_permisos` otra vez; la base vuelve a exigirlos.
- **D8 · «Pagos» sólo con `repuestos.costos.ver`** (la policy de lectura); «Registrar», «Editar» y «Eliminar» con `repuestos.costos.editar`; «Confirmar» con `logistica.pagos.confirmar`.
  «Registrar pago» siempre a la vista, apagado con su motivo (como «Registrar compra»).
- **D9 · Nivel 1**, no Nivel 2 como decía la partición del 8.13: `scripts/piloto/nivel.mjs` no ve disparadores (una RPC sin tabla, índice ni policy). Lo que manda el dinero es la
  auditoría (plan e informe), `db:probar` y `db:carreras`.
- **D10 · La gemela rechaza `NaN`** (`'NaN' > 0` es verdadero en PG y `numeric(18,2)` lo guarda). El mismo hueco en `pago_registrar` (vehículo) queda como **abierto 8-13f**.
- **Abierto nuevo 8-13e:** eliminar el último pago vivo sin confirmar de un proyecto puede dejar sin cumplir `proyecto.pago_cliente` de la fase actual de un ítem (el vehículo tiene esa
  guarda para los requisitos de pagos; el proyecto no). Se deja hasta que la persona lo pida.
- `accionesDelPago` y `validarMotivoDeAnulacion` salen de `entities/dinero/pago.ts` (pasaba de 300 líneas) a `acciones-del-pago.ts` y `anulacion-de-pago.ts`.
