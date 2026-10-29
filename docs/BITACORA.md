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

## 2026-10-29 — 4.13-4b2: la moneda del total en Bs sale de la lectura de la hoja

Con P4 (la moneda `a` del tipo de cambio de `total_en`) el 4b2 de la fila pasó a ser la base y la pantalla se llama ahora 4b3. `cotizacion_hoja()` suma `cabecera.moneda_bs`
(recreando `_cotizacion_hoja()` con sus permisos de siempre) y `hojaDesde()` la lee como `cabecera.monedaBs`. Verde: `db:probar` (431), `db:reset`, `db:types` (sin diff), `db:lint`
(47 avisos, los de antes), `db:carreras`, `db:medir` (la hoja de las capturas 4,4 ms y 10,6 KB, `planilla_usa` 4,4 ms; 0 bloques de `cotizaciones`), lint, typecheck, test (5.452) y
3 specs de escritorio (23 pruebas). Rojo contra HEAD y 11 mutaciones (8 en la migración, 3 en la lectura), cada una con su prueba. Commits `cfd3bad0` y `b9b06347`.
e2e completo: no (4.13-4b2, base, Nivel 1)

## 2026-10-29 — 4.13-4b3: los modos, «Ver total Bs» y el resumen fijo

La hoja de cotizar abre con el primero de los modos de tipo de cambio marcado (P1; los radios sólo con dos o más), ofrece «Ver total en moneda local» apagado al nacer (P5; sin
`cabecera.moneda_bs` no se dibuja y se guarda en falso, P6) y deja el resumen fijo: al costado y pegado bajo la barra desde 56 rem de la hoja, al pie en el celular, con el modo, la
garantía y un botón Live. Verde: lint, typecheck, test (5.486), 125 e2e dirigidos (10 specs, escritorio y celular) y 17 mutaciones con su prueba (M13 sobrevivió con la prueba del
plan y se arregló la prueba). **Nodos:** el peor caso mide 459 al abrir y 481 usada; más un 5 % son 506, sobre el techo de 500 de P7: se paró, la persona contestó P8 y el tope quedó en 500. JS en frío de `/cotizaciones/nuevo`: 428,1 KB (426,8 antes). Dicho con claridad: el primer e2e del commit 1 cayó (la subasta sembrada no da total sin vehículo y el spec pasó a la
fórmula de prueba con dos modos) y los rojos de Vitest de los commits 2 y 3 se sacaron al final (`rojo-c2.txt`, `rojo-c3.txt`). La auditoría del informe halló un fallo real (la consulta
de contenedor del `scroll-margin` la resolvía la sección, no la hoja): `fix` aparte, con su prueba. Commits `52830e1d`, `c85a1ed0`, `72c540f6` y el `fix` `b2bcea5e`.
e2e completo: no (4.13-4b3, pantalla, 1 de 3)

## 2026-10-29 — 4.13-4c1: la tabla de una ayuda se lee con la versión de la hoja abierta

`cotizacion_tabla()` recibe `p_abierta`: por origen lee la versión con que calcula la hoja abierta (su definición, su copia congelada y lo que deja ver), no la publicada, y pide
`cotizaciones.crear` y `cotizaciones.ver` del origen (P3, P10). La firma de tres se borra; la versión y la puerta las resuelve `_cotizacion_tabla_version()`, de nadie. Compuerta
`datos` aprobada antes de ejecutar. Verde: 7 pruebas nuevas en `cotizacion-tabla.sql` (rojas contra HEAD: T1 por lo que dice, las demás por la firma), 11 mutaciones con su prueba,
`db:probar` (438), `db:lint` (47 avisos, los de antes), `db:medir`, lint, typecheck y test (5.486). **Medición:** con 1.000 filas, 2,0 ms la dueña y 6,2 una asesora con «costos»; la
firma suma 0,2–0,3 ms; 542.240 y 50.240 bytes. El tope provisional de la asesora (48 KB) no cabía: se paró y la persona contestó P9 (52.752, lo medido más un 5 %). Dicho con claridad:
una tercera `db:medir` sin `db:reset` cayó en `cotizacion_guardar` (buffers con 250.000; no lo toca este paso) y pasó tras el reset. Sin e2e dirigidos (nadie en la app llama a
`cotizacion_tabla`); en CI el PR corre el completo por la migración. Commit `b408ed49`. Sigue el 4.13-4c2 (la pantalla).
e2e completo: no (4.13-4c1, base, Nivel 1)

## 2026-10-29 — 4.13-4c2: la ayuda de una tabla en la hoja

El botón «Ayuda de X» ya sale en toda celda con ayuda; el de una tabla abre un panel de sólo lectura en `?ayuda=tabla&nodo=<id>` que lee `cotizacion_tabla` desde el navegador con la
hoja abierta de la hoja montada (nunca la publicada de hoy): columnas declaradas con su etiqueta, año sin separador, cifras de una celda de dinero por `<Monto>` (P13: el Modo Live las tapa;
las de un factor `raw` quedan a la vista), cargando, sin filas, tope de 1.000 filas y fallo con «Reintentar» o «Recargar». El texto se parte (`wrap-anywhere`) y lo que no cabe se desplaza
dentro del panel. Verde: lint, typecheck, test (5.526; +40) y 153 e2e dirigidos (13 specs, escritorio y celular; 4 saltadas, las de antes). **Rojos contra HEAD:** Vitest (23 caen) y el
e2e (sin botón). **Mutaciones:** 14 (13 de Vitest y 2 de e2e; M10 cae en Vitest y en e2e), cada una con su prueba; M14 sobrevivió con el e2e del plan (con el texto partiéndose, 3
columnas caben sin el contenedor) y se sumó la tabla de 9 columnas. **Nodos:** la hoja mide 468 al abrir y 490 usada (≤ 500, 2,0 % de margen; P11); el panel con 1.000 filas, 7.023
(tope 7.374). JS en frío de `/cotizaciones/nuevo`: 428,6 KB → 429,5 KB (+0,9; un chunk más; +1,4 contra los 428,1 de `ed0fe2ef`, que el plan citaba). Un `fix` aparte: las columnas derivadas sin copia viva van como texto (la auditoría del informe halló que un año salía por `<Monto>`). Commits `2b829e0c`, `91233f2a`, `7132e1f5` y el `fix` `168e9537`.
e2e completo: no (4.13-4c2, pantalla, 2 de 3)

## 2026-10-29 — 4.13-4d: la tarea de oro 2, el presupuesto de JS y la hoja entera

Con este paso se cierra el 4.13.

- **4-44 (b).** Al 200 % en el celular, en el modal «Avanzado», las celdas y los chips sobresalían 46 px de su sección. Causa: las 12 pistas colapsan a 0 px y los 11 huecos de 24 px
  suman 264 px contra 218 de contenido. Arreglo: sin huecos de columna bajo `@lg`.
- **La hoja entera.** Los dos diseños de la semilla, a 412 y 1.280 px, al 100 y al 200 %, con el resumen fijo: no desplazan de costado, no cortan texto y cada celda, XCell, atajo y
  chip cabe en su sección. Se miraron las capturas (7 hojas de contacto).
- **La tarea de oro 2, tramo de la hoja.** La asesora de la semilla, con un lead suyo y un vehículo del inventario en la URL, guarda sin un clic: 23 teclas de control, 0,7 s el
  robot y KLM 12,5 s en los dos proyectos. Con Tab se llega a cada lado editable de la hoja y de «Avanzado».
- **JS.** `/cotizaciones/nuevo` tiene presupuesto formal: 460 KB (medido 429,5).
- **Nodos.** Sin cambio: 468 al abrir y 490 usada.
- **Verificación.** En verde: lint, typecheck, test (5.527), los 14 specs dirigidos en el celular (80 en verde y 5 saltadas, las de escritorio de `presupuesto-js`) y el completo de
  escritorio: 795 en verde, 16 saltadas (las de antes, `saltadas.mjs`: 0 nuevas), 28,4 min, con las carreras en verde. El rojo de C1 contra HEAD se guardó, y 4 mutaciones caen con su
  prueba (M5 cayó primero en el build y se repitió).
- **4-44 (a) no se arregló.** Tras recargar, «atrás» pierde el foco también en `?panel=nuevo-nivel`. Es de todos los paneles por URL: el router vuelve a pedir y dibujar la entrada
  de antes. La persona eligió dejarlo para 4-49. Es nuevo también 4-50: al 200 %, el resumen al pie tapa cerca del 40 % del alto.
- **Commits:** `8e05898b`, `da5c2932` y el `fix` de la auditoría del informe, `2b4849ea` (el tope de Tab de la prueba de cada celda, fijado en lo medido: 24 y 28).
  e2e completo: sí (4.13-4d, pantalla, 3 de 3)
