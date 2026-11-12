## 2026-11-12 · Decisiones del paso 8.11-2 (la pestaña «Compras», la lista y el margen)

- **D1 · La clave de URL es `?pestana=compras`,** no `?seccion=` como dice la fila: la barra de `/repuestos/[id]` usa `pestana` desde 8.09-2. La conducta pedida
  (sin permiso cae en «Ítems») es la misma.
- **D2 · Sin `diferido()` para la sección:** se lee y se dibuja en el servidor sólo con la pestaña abierta, y `diferido()` no dibuja en el servidor. No se midió si el
  código de cliente de la lista (≈ 120 líneas) entra al chunk de la ruta; `/repuestos/[id]` no tiene presupuesto de JS. El Drawer de 8.11-3 sí va con `diferido()`.
- **D3 · La celda del comprobante pasa a 8.11-3,** con la subida: verlo pide la URL firmada y hoy ninguna compra puede tener comprobante desde la app.
- **D4 · Con «Compras» abierta se sigue leyendo la hoja:** la cabecera (estado del proyecto, «sin ítems») la necesita; son ≤ 201 filas por índice.
- **D5 · La fila ya trae `item_id`, `notas`, `comprobante_ruta` y `actualizado_en`** para que 8.11-3 edite sin tocar la lectura.
- **D6 · Si la lista o el margen fallan, sube al `error.tsx` con «Reintentar»,** como las demás lecturas de la página.
- **D7 · El permiso de una pestaña es una sola clave opcional (`permiso?`),** no una lista como en Configuración.
- **D8 · Tipo de esta parte: pantalla** sobre permisos y RPC de 8.11-1 (sin migración). Lo de riesgo: quién ve la pestaña (`pestanasLlenas`) y nulo ≠ 0 en pantalla.
- **D9 · El equivalente en la moneda base sale de `monto_base`, leído, nunca calculado;** una fila de antes de 8.11-1 con `monto_base` nulo se lee y no dibuja
  «Equivale a» (la columna admite nulo; auditoría del plan, 1).
- **D10 · El tope de 200 compras por proyecto lleva `<AvisoDeTope>` sin camino** (excepción a «siempre hay un camino a lo antiguo»): compras no es una tabla que
  crece y un proyecto no llega a 200. Si aparece, el camino (filtro por fecha) va a «Pulido para la Fase 9».
