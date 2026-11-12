## 2026-11-11 — Paso 6.11-2: el hueco «Pagos» (parte 2 de 4 del 6.11)

- **D1 · Anular va en un `<Drawer>` con motivo** (`?panel=anular-pago&pago=<id>`): el `<Confirmar>` no tiene campo de texto. Motivo de 1 a 500 letras con el error junto al campo; el rechazo general de la
  base (la fase actual pide pagos confirmados, `23514`) se dice dentro del drawer, que no se cierra.
- **D2 · Confirmar y eliminar van con `<Confirmar>` en su URL** (`?panel=confirmar-pago|eliminar-pago&pago=<id>`) que nombra el concepto en el título y muestra el monto con `<Monto>` adentro (con el
  Modo Live un monto escrito en el título se vería). «Confirmar pago» dice «Queda sellado: no se podrá editar. Si te equivocas, se anula con un motivo.» Eliminar no ofrece «Deshacer».
- **D3 · El lead no se elige en esta parte.** El alta manda `p_lead = null` y la edición no toca `lead_id`: el disparador `trg_lead_visible` rechaza con 42501 un lead que quien escribe no ve, y un asesor
  sin acceso al lead vinculado no podría registrar el pago. El margen no depende del lead. **Abierto:** «vincular el pago a un lead» para quien lo pida.
- **D4 · Un confirmado es de sólo lectura:** sin «Editar» ni «Eliminar» aunque quien mira lo pueda todo; ofrece «Ver comprobante» y, con `logistica.pagos.confirmar`, «Anular pago» en `⋯`. Qué botones
  salen lo decide una sola función pura, `accionesDelPago`; la base lo vuelve a exigir.
- **D5 · Quien no puede confirmar no ve el botón** (`logistica.pagos.confirmar` es global). Un conflicto al confirmar («Ana ya lo confirmó hace 2 min»), al eliminar (ya confirmado) o al anular no es un
  error para quien actuaba: se cierra el diálogo, se dice con el mensaje de la base y se vuelve a leer.
- **D6 · Sello:** «Confirmado por <nombre> el <fecha y hora>» en la zona de la empresa; si `perfiles` no da el nombre (persona dada de baja, lectura caída), «Confirmado por otra persona el …». Los nombres
  se leen en una sola consulta por todos los pagos de la lista.
- **D7 · Monto de un pago: mayor que cero con a lo sumo dos decimales** (D16 de 6.10-1); el de un gasto sigue siendo ≥ 0. La lectura del texto tipeado se extrajo a `entities/dinero/monto-tipeado.ts` y
  la usan los dos formularios.
- **D8 · Tipo de cambio:** igual que el gasto (lo elige quien carga; con la moneda base no hay campo). El equivalente en base lo devuelve la base: nunca se calcula en el navegador.
- **D9 · Se reutiliza lo de 6.11-1** (`campo-de-comprobante`, `use-comprobante`, `useOpcionesDeGasto`, las memorias de lectura); «Ver comprobante» salió a `components/ver-comprobante.ts` para las dos
  filas. El rechazo de la base por campo (`falloDeLaBase`) pasó a `infra/dinero/rpc.ts` y lo comparten gastos y pagos.
- **D10 · La lista de pagos de una unidad es una lectura directa** (`pagos_vehiculo_idx`, tope 50 + 1, más recientes primero), no `pagos_listar` (de 6.11-3).
- **D11 · El e2e no sube comprobante ni anula:** lo de anular lo cubren vitest y las pruebas SQL de 6.10; el e2e registra, confirma con otra cuenta y mira el margen. Los tres diálogos de URL declaran su
  `usePanelPorUrl` en su propio archivo (lo exige `confirmar-con-url.test.ts`) y comparten la revisión de `usePagoPorUrl`.
