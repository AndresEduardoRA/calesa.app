## 2026-11-07 — Paso 4.19-2

- **El espejo va a mano, no con Zod:** la base fija el orden de las reglas y el `donde` de cada rechazo (el primero manda), y Zod da los suyos. Como `validarDiseno()`.
- **Se valida lo que viaja:** la entrada pasa por `JSON.stringify`/`JSON.parse`. Una propiedad `undefined` es una clave ausente; un ciclo, un `BigInt`, una función o `undefined`
  dan `forma@definicion`, lo que la base hace con un nulo.
- **Los números en `bytesComoJsonb()`:** se cuentan como los escribe JS; la base guarda su texto (`1.50`, `1e21`). En una plantilla un número siempre es `forma`, así que sólo
  puede cambiar el `donde` de una plantilla ya inválida que roza los 32 KB.
- **La 4.ª rama de `nodo_restringido` en la base (lo nombrado, `:110`) no se espeja:** tras `nodo_sin_lugar` todo lo nombrado ya está entre los miembros, el total o lo aparte, y
  nunca puede ser la primera. Lo dice un comentario en `nodos-de-plantilla.ts`.
- **`tonosQueYaNoEstan()` es el único predicado:** `tono_inexistente` es su primero; el editor (4.19-3) avisa con la lista entera, y su texto es del 4.19-3.
- **Los mensajes son los de la base** (`rechazoDePlantilla()`): el editor los puede mostrar al tipear sin una segunda tabla de textos.
- **`octetos` en el juego común:** el tope de 32 KB se cuenta en bytes del texto de `jsonb::text`; la lista fija ese texto para la base y para TS, y la prueba cae si falta.
- **El soporte del juego no lee el archivo:** `juego-de-plantilla.soporte.ts` sólo parsea con Zod (`plantilla: z.unknown()`, para no perder `__proto__`); la lectura con
  `node:fs` queda en los `.test.ts` (`entities/` sin I/O). `casos-de-plantilla.json` pasa las 300 líneas (2.756) como `casos-de-formula.json`: es un juego de datos.
- **Sin mutaciones formales:** no es de rigor máximo (sin dinero, RLS, permisos ni migración; la base vuelve a validar). Cada trampa conocida tiene su caso en el juego, que corre
  también la base, y cuatro sondas (`.trim()`, `.length`, orden UTF-16, `localeCompare`) confirmaron que caen.
- **Para el 4.19-3:** un texto con un surrogate suelto (`\ud800`) o con `\u0000` no lo rechaza `validar_plantilla()` sino la base al leer el JSON (22P02, 22P05): lo tiene
  que atajar la action del editor.
