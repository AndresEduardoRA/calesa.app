## 2026-11-12 · Decisiones del paso 8.13-3 (la Cadena y el hueco del vehículo)

- **D1 · El filtro `proyecto` sólo va por URL**, sin selector: lo usarán los «Ver todas» de Inicio (parte 4); con él puesto, aviso «Mostrando un solo proyecto» con «Ver todos». Un selector se agrega después sin cambiar la URL.
- **D2 · Lectura sin migración:** una consulta por fase (≤ 30) en paralelo, `limit 51`, por `repuestos_items_fase_id_idx`; el proyecto va embebido (`!inner`: un ítem de un proyecto que la RLS no deja ver ni de la papelera no sale). Abierto 8-13c.
- **D3 · Orden:** fases no finales, las que llevan más tiempo primero; fases finales (Recibido, Perdido), las más recientes primero; «Sin fase» por `id`.
- **D4 · La tarjeta** no lleva el vehículo ni foto (leerlos pagaría otra pasada de la RLS por tarjeta); el proyecto lleva a su hoja.
- **D5 · `entities/flujo/cadena.ts` y `cadena-filas.ts`** copian lo mínimo de la cadena de `logistica` (un módulo no importa a otro), con su prueba; los días en la fase usan `diaEnZona` de `shared`.
- **D6 · El panel del ítem es el de la parte 2:** `PanelDelItem` pasa a un archivo propio de `src/app/(app)/repuestos/`, que importan la hoja y la Cadena.
- **D7 · El hueco lee con una Server Action** (`leerEsperasDelVehiculo`): `esperasQueDestraban` es de servidor y el hueco, de cliente.
- **D8 · El hueco** pide `repuestos.ver` y la regla `esperas`, sin variante de repuesto. No escucha `logistica:unidad-cambio` (es de `logistica`): se relee al cambiar la fase del vehículo y al volver a abrir el bloque.
- **D9 · Tipo estructural del hueco:** `repuestos` declara el suyo; `ComponentType` no es asignable por `defaultProps`, así que el cast va en `src/app/(app)/logistica/huecos-de-la-unidad.tsx`, no en el módulo.
- **D10 · El e2e** usa las fases «En tránsito» y «Recibido» de la semilla y un origen propio con la espera; «Recibido» no pide nada, así que «Qué falta» del ítem no marca «Cumplido» (sólo lo hace el vehículo, que tiene un requisito).
