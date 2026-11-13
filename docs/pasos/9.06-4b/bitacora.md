## Paso 9.06 · Datos: importar todo, parte 5 de 6: la pantalla hasta lanzar (2026-11-12)

- **`leads`:** `preparadorDeFilas` prepara por tramos con lo visto de teléfonos cruzando las llamadas (`prepararFilas` lo llama de una vez:
  `/leads` no cambia); `filas.ts` se partió en `catalogo.ts` y `repetidos.ts`; `emparejarColumnas(…, numeroDe)` dice «un vehículo» en la
  importación de vehículos (V32 de la 4). `client.ts` suma `preparadorDeFilas`, `origenInicial` y `EntradaDePreparacion`.
- **`datos`, lo puro:** `convertir-por-tramos.ts` (D45), `intento.ts` (D46), `entities/opciones-de-importar.ts` (quién importa qué), `secciones.ts`
  con las dos pestañas (D42) e `infra/personas.ts` (destinos, D44).
- **La pantalla:** `/datos` con la barra; `src/app/(app)/datos/importar.tsx` lee el contexto de la entidad de la URL (D43); la sección, diferida
  (D49): «Qué importas» → Archivo → Columnas → Vista previa (500) → Importando hasta «La importación empezó: puedes seguir en otra pantalla.».
- **Pruebas:** tramos de `leads` (`filas-tramos.test.ts`: repetidos que cruzan el borde y numeración), `convertir-por-tramos.test.ts` (leads con el
  repetido entre tramos, vehículos, avance, cesión y cancelación; cae si se numera sin `desde`), `intento.test.ts`, `opciones-de-importar.test.ts` y
  `secciones.test.ts`. Recorrido de la IA (spec temporal, borrado): la dueña importa 3 leads con un teléfono repetido y una columna «N.º» hasta
  «La importación empezó»; la función local la procesó (`importar-csv: … terminada 3/3`).
- **Auditoría:** plan con observaciones (partir `filas.ts`, el id por intento en el commit de lo puro, la ficha con cada commit, el repetido entre
  tramos en la prueba de `datos`, el tope de destinos), atendidas.
- **Lo que sigue (para el coordinador: encolar 9.06-5, la última parte):**

| Parte      | Alcance                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Archivos                                                                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **9.06-5** | Lo de `.piloto/planes/9.06-3.md:56`. El paso «Importando» (`paso-importando.tsx`) hoy dice «La importación empezó…»: la 5 lo cambia por el avance leído cada pocos segundos de la importación `id` (lo da la fase `lanzada` de `use-lanzar-importacion`), el resultado, «Descargar las rechazadas» (la fila `n` del archivo normalizado es la `n + 1` de la persona, D32, con las celdas de `archivo.filas`, que siguen en memoria) y «Importaciones» debajo del asistente; `revalidatePath`; `e2e/datos-importar.spec.ts` recorre Leads → Destino → archivo → Columnas → Vista previa → «Importar 3 filas» | `src/modules/datos/features/importar/{components,hooks}/*`, `infra/importar.ts`, `src/app/(app)/datos/importar.tsx`, `e2e/datos-importar.spec.ts` |

- e2e completo: no (9.06-4b, Nivel 2 del paso: el completo lo corre el CI del PR; dirigidos: datos-exportar en escritorio)
