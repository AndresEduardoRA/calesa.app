# Bitácora

Una entrada por paso cerrado, la más nueva al final: `## AAAA-MM-DD — <paso>: <qué se hizo>`, con lo verificado y su marcador
`e2e completo: sí|no (<tarea>…)`, que lee `scripts/piloto/cuenta-e2e.mjs` para la cuenta `n de 3` (`.claude/rules/e2e.md`). La fecha sale
de `TZ=America/La_Paz date +%F`. La escribe sólo el carril A; el B anota en su archivo de carril.

La bitácora completa hasta el 2026-10-27 (158 entradas, del arranque al 4.13-3c) está en `docs/archivo/BITACORA.md`: sólo con grep.

## 2026-10-27 — 4.13-3c: el último paso de la bitácora anterior

Un candado por lado del par en la `XCell` y un solo lector de números con el locale de la empresa (4-25). Su completo de escritorio
corrió en verde: 749 pruebas y 16 saltadas, 0 fallos, ≈ 28 min. e2e completo: sí (4.13-3c)

## 2026-10-28 — Preparación para Orca: base aplastada, entornos, docs livianos y dos carriles

La rama `preparar-orca` (`docs/PREPARACION.md`): las 146 migraciones en una base que no se edita, los entornos validados, los docs vivos
livianos, un stack de Supabase por carril y el flujo de los dos carriles (`docs/ORCA.md`). Verde: lint, typecheck, test (5.426),
`db:probar`, `db:lint` y el completo con los dos proyectos y las funciones servidas: 1.281 pruebas y 34 saltadas, 0 fallos, 46,3 min.
e2e completo: sí (preparar-orca)

## 2026-10-28 — 4-42: la ficha sin red espera el envío fallido antes de reconectar

La prueba «se cae la conexión al guardar» (`e2e/leads-ficha-edicion.spec.ts`) esperaba «No hay conexión», que sale de la red y está antes del
clic; ahora espera el aviso del envío fallido. Verde: 20 de 20 con `--repeat-each=20`, el spec entero (10), lint, typecheck y test (5.427).
Contra HEAD con el fallo demorado 1 s cae (M1); esperar el `requestfailed` (M2) pasó 20 de 20, así que no cambia la elección.
Commit `da341ed6`. e2e completo: no (4-42, sólo un spec e2e)

## 2026-10-28 — 4.13-4a: «Avanzado» en un modal con URL y la ayuda de texto

El prompt 4 del 4.13 se partió en 4a a 4d. El 4a: las secciones `avanzado` de la hoja van detrás de un botón «Avanzado» (en el lugar de la
primera, con «Hay datos por revisar.» si una celda tiene un aviso) que abre un modal con `?panel=avanzado`; Ctrl+S confirma también la celda
abierta del modal; la ayuda de texto de una celda abre un panel con `?ayuda=texto&nodo=` y devuelve el foco a su botón, y la de «Avanzado» se
abre encima del modal. Verde: lint, typecheck, test (5.451) y 107 e2e dirigidos en escritorio y celular (`.piloto/informes/4.13-4.md`).
Nodos de la hoja con el modal: 434 al abrir y 453 usada (tope 460); JS en frío de la ruta, 426,8 KB (era 423,8). Commits `c009f538` y
`e6578ee3`. e2e completo: no (4.13-4a, pantalla, 1 de 3)

## 2026-10-29 — 4.13-4b1: «Ver total Bs» se guarda con la cotización

El 4b se partió en 4b1 (la base) y 4b2 (la pantalla). El 4b1: `cotizaciones.ver_total_bs` (`not null default false`, legible como `modo_tc`), el ayudante
`_cotizacion_ver_total_bs()` (nulo o no ofrecido por el diseño de la versión es 22023) y las dos RPC (`cotizacion_crear` con default falso, `cotizacion_guardar` sin
default, en la huella, en «nada cambió» y en el `update`), en dos migraciones y dos commits. Verde: `db:probar` (430), `db:reset`, `db:types`, `db:lint` (47 avisos, los de
antes), `db:carreras`, `db:medir` (crear 6-7 ms y 233-344 buffers; guardar 5,5-6,3 ms y 267-301, sin cambios 149-156, sintética 42 ms y 409-414; 0 recorridos), lint, typecheck, test (5.451), 3 specs de guardado en
escritorio y el completo de escritorio por su Nivel 2: 769 pruebas y 16 saltadas, 0 fallos, 28,0 min. Rojo contra HEAD y 11 mutaciones (M2 en dos archivos), cada una con su prueba.
e2e completo: sí (4.13-4b1, base, Nivel 2)
