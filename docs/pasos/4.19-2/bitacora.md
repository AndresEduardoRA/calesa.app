## 2026-11-07 — Paso 4.19-2: validarPlantilla() de TS y el aviso del tono

- **Hecho:** `validarPlantilla(entrada, contexto | null)` en `entities/plantilla/` espeja `validar_plantilla()` (20261106185900): las 9 reglas en su orden, el mismo `donde`
  y el mismo mensaje (`rechazoDePlantilla()`), sobre lo que viaja como JSON (una propiedad `undefined` es una clave ausente; lo que no es JSON, `forma@definicion`, como un
  nulo de SQL). Sin contexto valida sólo la forma; sin `tonos`, no mira el catálogo; nunca lanza. Piezas: `forma-de-plantilla.ts` (F1–F15 de `_plantilla_forma`),
  `nodos-de-plantilla.ts` (`_plantilla_nodos`: lo nombrado, lo dibujado y el tipo de cambio por la clave `(d, modo·1000 + n.º, bucket)`), `json-de-la-base.ts` (code points,
  `btrim` sólo espacios, orden `collate "C"` por code point, bytes del texto jsonb con `", "` y `": "`), `motivos-de-plantilla.ts`. `tonosQueYaNoEstan()` es el único predicado
  del aviso del tono (4.19-3) y de `tono_inexistente`. Nada lo importa todavía: sin cambio visible ni en las entradas del área.
- **El juego común suma 17 casos «borde: …»** (`casos-de-plantilla.json`, 47 → 64) que cazan una trampa del espejo cada uno (`btrim` frente a `.trim()` con un tabulador y
  U+00A0, 40 y 160 emojis, un emoji con tono de piel = 2, «Ａ» antes que «🚗» y «Z» antes que «a», un diccionario clave por clave, `__proto__` y `constructor`, nulo frente a
  ausente, las columnas en otro orden) y la lista `octetos`: T1 de `plantilla-validar.sql` comprueba `octet_length(valor::text)` de cada uno y cae si falta o está vacía. Los 17
  dieron lo esperado contra la base de HEAD a la primera (ningún caso se corrigió).
- **Verificación** (`.piloto/salidas/4.19-2/`): `verde-head-juego.txt` (los casos nuevos contra la base, antes del código); `sonda-octetos.txt` (un `bytes` mal esperado hace caer
  T1); `rojo-head-ts.txt` (los seis tests de TS sin el código: «Failed to resolve import»); `verde-ts.txt` (6 archivos, 143 pruebas); `sondas-espejo.txt` (`.trim()`, `.length`,
  orden UTF-16 y `localeCompare` hacen caer su caso del juego); lint y `typecheck.txt` sin avisos; `guardas.txt` (32 archivos, 1003); `mapa.sh --check` en verde; `db:probar`
  completo en verde en el hook del commit del juego (`commit-1.txt`). No es de rigor máximo (la base vuelve a validar al guardar y al publicar): sin mutaciones formales.
  e2e completo: no (4.19-2, entities, Nivel 1)
- **Abiertos:** ninguno nuevo; 4-74 sigue abierto (aquí sólo se aplica su lección).
- **Commits:** `bad7a2bc` test(cotizaciones): sumar casos de borde al juego de la plantilla · `266b0746` feat(cotizaciones): decir qué tono de la plantilla ya no está ·
  `58146ba3` feat(cotizaciones): validar la plantilla de la tarjeta como la base · y el de docs. Sigue el **4.19-3** (el editor, pestaña «Tarjeta»).
