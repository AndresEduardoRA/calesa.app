## 2026-11-12 · Decisiones del paso 8.12-3 (la pestaña «Cotizaciones» y la hoja en sólo lectura)

- **D30 · La pestaña, la hoja y crear piden `repuestos.cotizar`** (además de `repuestos.ver`): quien sólo tiene `repuestos.costos.ver`, que la RLS deja leer,
  no las ve. Es lo que dice la fila; abrirlas después es sumar una clave.
- **D31 · La moneda se elige en la misma barra que «Nueva cotización»**, sin modal: crear no destruye nada y pide un solo dato; con una moneda activa no hay elección.
- **D32 · Crear lleva directo a la cotización nueva.** El id lo genera el cliente una vez por intento y se reusa al reintentar (la RPC es idempotente por id);
  se renueva al salir bien y al cambiar la moneda: la pantalla conserva su estado al volver y el mismo id devolvería la ya creada (auditoría del plan, obs. 1).
- **D33 · Con el proyecto cerrado, «Nueva cotización» se ve apagado con el texto de la base**; la base vuelve a decidir.
- **D34 · No se lee la configuración antes de crear:** sin configuración, el 23514 `config` dice el mensaje de la base y, sólo con `repuestos.configurar`, el
  enlace a `?seccion=cotizador`.
- **D35 · La lista de un proyecto va con tope 50 y `<AvisoDeTope>`**, de la más nueva, sin cursor: son decenas por proyecto.
- **D36 · La hoja muestra los montos que guardó la base y su total;** no los recalcula, no suma subtotales por bloque ni muestra el unitario. `calcularLinea`
  sólo dice qué le falta a una línea sin total; si la fórmula daría total y la base no lo guardó, el motivo queda sin decir (auditoría del plan, obs. 2).
- **D37 · La hoja dice con qué configuración se calculó** (factor, recargo, redondeo y desde cuándo); los tramos y cajas del snapshot no se listan. Sin snapshot
  válido sólo pide «anúlala y crea otra» en borrador (obs. 3).
- **D38 · Los montos llegan como texto y pasan a `Number` sólo al entrar a `<Monto>`** (como D20): arriba de ~9·10¹³ el último centavo podría redondearse al
  dibujarse; nada se calcula ni se escribe con ese número.
- **D39 · El e2e siembra configuración y líneas por SQL** como `postgres` (escribir líneas es de 8.12-4) y `borrarPersonasDePrueba()` borra antes las
  cotizaciones de repuestos de las cuentas de prueba (la FK de `creado_por` no tiene `on delete`).
- **D40 · La ruta de la hoja no lleva `loading.tsx` propio:** la cubre el `<Suspense>` de la página (un `loading.tsx` más con el barril de pantallas duplica el
  chunk en frío).
