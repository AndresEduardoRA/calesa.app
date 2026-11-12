## 6.04-1 · «Qué falta» y mover con nota y conflicto legible (2026-11-12)

Parte 1 de 3 (`parcial: true`). Entró: `flujos/entities/mover/` (`vista-previa.ts`, `requisitos.ts` con una etiqueta por cada clave de dato de la base y su test contra el SQL vigente, `motivos.ts`, `para-mover.ts`, `boton-de-mover.ts`),
`flujos/infra/mover/` (las RPC `logistica_unidad`, `previsualizar_cambio_fase[_lote]`, `cambiar_fase[_lote]` y la lectura de destinos con `tope + 1`), `flujos/features/mover/` (cinco actions: `leerParaMover`,
`previsualizarCambio`, `previsualizarCambioLote`, `cambiarFase`, `cambiarFaseLote`; las del lote ya están, las usa la parte 3) y `areas/mover/`. En `logistica`: `abiertoAlInicio` en el hueco, los avisos del panel
(`unidad-cambio`, `abrir-hueco`), `features/mover/` (el hueco «Qué falta» con destinos, requisitos con texto, atajos, «Fuera de regla», relectura al volver el foco; el formulario de mover con nota, motivo escrito del botón,
`Ctrl+Enter` y aviso de conflicto) y `pantallas/mover-unidad.ts`. Sin migración, policy ni permiso nuevo.

Pruebas: Vitest de `flujos/entities/mover/` (5 archivos nuevos); `vitest run src/modules/flujos src/modules/logistica "src/app/(app)/logistica" scripts/guardas` en verde; `e2e/logistica-mover.spec.ts` (3 pruebas, escritorio y celular) y
`logistica-unidad`, `logistica-cadena`, `logistica-gastos-y-pagos` en verde: 32 pasaron, 5 saltadas por diseño (salidas en `.piloto/salidas/6.04/`).

Sigue **6.04-2** (notas, historial y «Ver en logística») y **6.04-3** (el lote), servidas en `.piloto/planes/6.04.md`. La fila 6.04 de `docs/PLAN.md` pasa a «Partes estimadas: 3» (la edita el carril `a` al consolidar).

- e2e completo: no (6.04-1, Nivel 1: lo corre el CI del PR; dirigidos en verde)

## 6.04-2 · Notas, historial y «Ver en logística» (2026-11-12)

Parte 2 de 3 (`parcial: true`). Entró: `logistica/entities/mover/{notas,historial,hasta-de-un-dia,pagina-de-la-unidad,repositorio-de-notas}.ts` (con test los tres puros), `infra/mover/{notas,historial}.client.ts` y `notas.ts`
(servidor), `areas/mover/{composicion.client,composicion,client}.ts`, `features/mover/` (`useListaDeLaUnidad`, `useEscribirNotas`, `crearNota`, `editarNota`, `CampoDeNota`, `NotaDeLaUnidad`, `CuerpoDeLaLista`, `PieDeLaLista`, `HuecoDeNotas`,
`HuecoDeHistorial`), los dos huecos en `pantallas/mover-unidad.ts` y el enlace «Ver en logística» de la ficha (`src/app/(app)/vehiculos/[id]`). Sin migración, policy ni permiso nuevo.

**Abierto 6-3 (nuevo):** borrar una nota propia exige una RPC `security definer`: el borrado suave por `update` lo rechaza `notas: leer` (42501, probado en `supabase/tests/areas/mover/notas.sql`, N3), así que no hay «Borrar». Sería un paso de datos
(riesgo rojo); además la base deja a la autora cambiar el cuerpo de una nota de cambio de fase (D22, «Deuda de la base»).

Pruebas: Vitest de `entities/mover/` (notas, historial, hasta-de-un-dia); `db:probar` con `notas.sql` (N1 a N5); `e2e/logistica-mover.spec.ts` (prueba 4: historial con quién y nota, notas con escribir y corregir, enlace de la ficha).

Sigue **6.04-3** (el lote), servida en `.piloto/planes/6.04.md` › «Lo que sigue».

- e2e completo: no (6.04-2, Nivel 1: lo corre el CI del PR; dirigidos en verde)

## 6.04-3 · El lote (2026-11-12)

Parte 3 de 3: **6.04 queda completo**. Entró: `logistica/entities/nucleo/seleccion.ts` y `entities/mover/{grupo-del-lote,claves-del-lote}.ts` (con test), `features/mover/lote/{vista-del-lote,resultado-del-lote}.ts` (con test), el contexto de selección del núcleo, la casilla y «Elegir los de esta columna» en la columna de la cadena, el proveedor y la barra, el drawer del lote (`?panel=lote`, destino, vista previa por unidad, nota común, «Mover los N que pueden», resultado entero y «Reintentar»), el lote de un grupo (`?contenedor=` / `?booking=`) y el hueco «Mover el grupo» con «Marcar que llegó» (`pantallas/mover-grupo.ts`, con prueba de componente); en `flujos`, la action `destinosDeLaFase`. Sin migración, policy ni permiso nuevo.

Pruebas: Vitest de `entities/nucleo/seleccion`, `entities/mover/grupo-del-lote` y `features/mover/lote/` (con la frase de cada plural) y del hueco del grupo; `e2e/logistica-lote.spec.ts` (un contenedor de 8, 7 con el BL: «Se movieron 7 de 8.», aprobar y «Reintentar el 1»; y elegir por casilla, mover y limpiar), en escritorio y celular; dirigidos en verde (`logistica-cadena`, `-mover`, `-unidad`, `-gastos-y-pagos`: 38 pasaron, 5 saltadas por diseño); `presupuesto-js` de `/logistica`: 397,4 de 410 KB. Salidas en `.piloto/salidas/6.04/`.

- e2e completo: no (6.04-3, Nivel 1: lo corre el CI del PR; dirigidos en verde)
