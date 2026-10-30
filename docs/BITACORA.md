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

## 2026-10-29 — 4.14-1: la base del panel del vehículo

El 4.14 se parte en tres. El 4.14-2 dibuja el panel del vehículo y el 4.14-3, el del cliente.

- **`vehiculos.cotizado_en`.** La escribe el trigger `trg_vehiculo_cotizado` de `cotizaciones` al crear con un vehículo (también «a mano») y al pasarle una cotización. Nunca
  retrocede. Cuando sólo cambia ella, ni se mueve la versión de la ficha ni se escribe en `actividad` (P1). El relleno, `_vehiculos_cotizado_rellenar()`, queda en la base.
- **`vehiculos.cierre_subasta_en`**, la primera columna generada: el cierre de una subasta abierta o en vivo, `coalesce(subasta_fin_en, subasta_en)` (P5, P7).
- **Tres índices:**
  - `vehiculos_cotizado_idx`, para «Últ. cotización»;
  - `vehiculos_cierre_subasta_idx`, para «Cierre subasta»;
  - `cotizaciones_vehiculo_creado_idx`, el historial, que reemplaza a `cotizaciones_vehiculo_idx`.
- **Medido con 50.000 y 250.000.** Las dos listas, de 0,3 a 0,9 ms y de 71 a 246 buffers; el historial, 0,35 ms y 77. Sin `Sort` y sin crecer con N. Cotizar con la reescritura del
  vehículo en cada corrida suma 0,2 ms y de 50 a 140 buffers.
- **Verificación.** En verde: lint, typecheck, test (5.527), `db:probar` (448), `db:medir` y `db:medir:volumen`, los 9 specs dirigidos en escritorio (40) y el completo de
  escritorio: 795 en verde, 16 saltadas (0 nuevas), 28,6 min, con las carreras en verde. Los rojos de las pruebas y de las mediciones, contra HEAD y contra cada commit, quedaron
  guardados. Caen las 15 mutaciones de las dos primeras migraciones, M10 y M13 de los índices y M18a/M18b; los índices de la fila del PLAN, que son las guardas de cada medición, rompen sus asserts.
- **El historial se siembra con 100 vehículos.** Con 1.000, el plan genérico a veces ordenaba la página profunda.
- **`db:sembrar-volumen` está roto en HEAD** (falta un import): se sembró con una copia fuera del repo y queda el abierto 4-53. También son nuevos 4-51 y 4-52.
- **Commits:** `6cc27730`, `b0b3c2dd` y `6a924d8f`.
  e2e completo: sí (4.14-1, base, Nivel 2)

## 2026-10-29 — 4.14-2a: el panel del vehículo

El 4.14-2 se parte en tres (2a, 2b y 2c) y, por P4, se suma el 4.14-2a2 (4-49).

- **El cursor por cualquier columna**, en `src/shared`: `Cursor.instante` (antes `creadoEn`, con la misma codificación), `OrdenDeCursor` con `POR_ALTA`, `ordenarPorCursor()`
  y `armarPaginaPor()`. `<Paginacion alIr>` cambia de página sin ir al servidor.
- **La barra del vehículo**, sobre la hoja de cotizar y fuera de `[data-hoja]`, abre `?panel=vehiculo` con «Últ. cotización» y, en un origen de subasta, «Cierre subasta»
  (las vivas desde hace 24 h). Se lee desde el navegador por cursor. Elegir o quitar escribe el vehículo en la URL de la hoja por `nuqs`, cierra el panel y reemplaza la entrada de
  abrirlo. Con el panel abierto, Ctrl+S no guarda.
- **Medido:** JS de `/cotizaciones/nuevo` 432 KB (antes 429,5; tope 460); el panel con 20 tarjetas, 284 nodos y 4.660 bytes (presupuestos de 370 y 12.000; topes de 299 y
  4.900); la tarea de oro 2 pasa a 24 teclas de control; los nodos de la hoja no cambian.
- **P5:** con la barra encima, al 200 % y con la página arriba de todo, el resumen fijo queda debajo del borde de la ventana (107 px en escritorio, 37,6 en el celular). La persona lo
  aceptó por ahora y 4-50 endurece su assert. En el celular al 200 %, las tarjetas del panel se pasaban del ancho: una sola columna y `<PestanasConDesborde>`.
- **Verificación:**
  - En verde: lint, typecheck y test (5.559).
  - El completo de escritorio sobre el código final: 802 en verde y 16 saltadas (0 nuevas), 29,2 min, con las carreras.
  - Los dirigidos en móvil: 148 en verde y 8 saltadas. El volumen, 5 en verde, sembrado con la copia arreglada del 4.14-1 (4-53 sigue abierto).
  - Tras el `fix` de la auditoría: el panel, el resumen y el JS, 39 en verde.
  - Los rojos quedaron guardados contra HEAD y caen las 13 mutaciones.
- **Abiertos nuevos:** 4-54 (elegir otro vehículo mientras se guarda), 4-55 (el título de la cotización, para el 4.18) y 4-56 (`cotizar-formula.ts`, 330 líneas).
- **Commits:** `314f28d5`, `fba04e51`, `1a7ff3a2` y el `fix` `ee93b46a`.
  e2e completo: sí (4.14-2a, shared, Nivel 2)

## 2026-10-29 — 4.14-2a2: el foco vuelve a quien abrió el panel

- **La causa, medida contra HEAD antes del código** (`.piloto/salidas/4.14-2a2/medicion-0.json`, en los dos proyectos y en `?panel=avanzado`, `?panel=nuevo-nivel` y
  `?panel=vehiculo`):
  - m1: el documento no se recarga. m2: el botón y la página no se montan de nuevo. m3: sale un pedido RSC de la entrada de antes.
  - m4 y m4b: una clave propia en `history.state` sobrevive en las dos entradas a la escritura de `nuqs`, a recargar y a ir y volver.
  - m5: no aplica (el botón está conectado desde el `popstate`). m6: en los dos modales, el foco queda en `body` desde los 100–500 ms; en el drawer del vehículo vuelve a la barra.
  - El modal se cierra montado y Base UI no llama a `focus()` sobre el botón tras recargar; sin recargar, sí.
  - No se dio S1 ni S2. S3 sólo en el drawer del vehículo, porque los dos modales reproducen el defecto: se siguió y E3 queda como no regresión.
- **La vuelta del foco** (`src/shared/ui/vuelta-del-foco.ts`), en `usePanelPorUrl()` y en «Nuevo nivel». Los 19 hooks propios quedan en
  `PENDIENTES` de `scripts/guardas/paneles-con-vuelta.ts` para el 4.14-2a3 (P1), que cierra 4-49.
- **Verificación:**
  - En verde: lint, typecheck y test (5.585, tras el `fix` de la auditoría).
  - El completo de escritorio sobre los tres commits de código: 806 en verde y 16 saltadas (0 nuevas), 29,2 min, con las carreras. Tras el `fix`, el spec nuevo en los
    dos proyectos (8) y Vitest.
  - Los 34 dirigidos en escritorio y móvil: 330 en verde y 5 saltadas. JS de `/cotizaciones/nuevo` 432,9 KB de 460.
  - Rojos contra HEAD: E1 y E2 (el foco inactivo), E4 en su tercera secuencia y Vitest por el import. Caen las 23 mutaciones en Vitest; M14 no cae en el e2e, porque Next le
    vuelve a copiar `__NA`.
- **Commits:** `ae332fb2`, `2869854b`, `854bb1f3` y el `fix` `234b3147` (la auditoría del informe: soltar la escritura pendiente si falla).
  e2e completo: sí (4.14-2a2, shared, Nivel 2)

## 2026-10-30 — 4.14-2a3: la vuelta del foco desde un menú, en los filtros y en vehículos

- **La sonda C0, contra HEAD antes del código** (`.piloto/salidas/4.14-2a3/medicion-0.json`, en los dos proyectos): K1 (renombrar un nivel), K2 (la hoja de filtros, a
  560 px), K3 (nuevo vehículo), K4 (editar), K5 (el resumen), K6 (agregar vehículo) y K7 (la vitrina).
  - m1: ningún «atrás» recarga el documento. m2: en todos cierra el panel y su clave sale de la URL. m6: en los siete, el foco queda en `body` (0 a 2.000 ms).
  - m7 (K1 y K7, sin recargar): tras «atrás» y tras Esc, Base UI devuelve el foco al «⋯».
  - m8 (la línea de tiempo): en K1, en el instante de la marca (T) el foco está en el ítem, dentro del menú, que sigue en el DOM con su `aria-labelledby` (el «⋯»); el
    «⋯» ya no lleva `aria-controls`. Después: el foco sale (`focusout` sin destino), sale el menú, el foco entra al «⋯» y escribe `nuqs` (T'). K7, sin marca en HEAD,
    da el mismo orden. Es la rama **R1**. No se dio S1, S4, S5 ni S6; los siete casos reproducen el defecto y todos llevan e2e (E1 a E7).
- **Lo que no estaba en el plan:** en los hooks con `shallow: false` (editar lo mostró siempre), Next pone su estado en la entrada del panel al llegar la respuesta del
  servidor y se lleva `vueltaDesde` (medido con un registro de cada escritura del historial); escribirla en `pagehide` no sobrevive a recargar en Chromium. La ficha queda
  también en `sessionStorage` (`docs/DECISIONES.md` › «Paso 4.14 (2a3)»). Está en `vuelta-del-foco.ts`: alcanza a todo panel con la vuelta (`usePanelPorUrl()`, los filtros,
  los niveles y los hooks de `leads` del 2a4), aunque fue en el commit de `vehiculos`, los únicos `shallow: false` del paso.
- **La partición:** los 14 hooks de `leads` y el guardián sin pendientes van al 4.14-2a4 (Nivel 2). La fila del 4.14 pasa a «Prompts: 8 (quedan 4)»: el 6 ya estaba atrasado
  (con 1, 2a y 2a2 hechos y 4 por hacer eran 7) y suma el 2a4; el total de la fase, a 29 pasos y 78 prompts.
- **Verificación:**
  - En verde: lint, typecheck y test (5.615), y `mapa.sh --check`.
  - El completo de escritorio sobre el árbol de los tres commits de código: 813 en verde y 16 saltadas (0 nuevas), 30,4 min, con las carreras.
  - Los 56 dirigidos en escritorio y móvil: 518 en verde y 9 saltadas; dos de escritorio cayeron una vez (`vehiculos-resumen-casos` y `vehiculos-resumen`: una apertura sin
    efecto justo tras cargar o tras cerrar), y repetidos dos veces (24) y en el completo, en verde. La sonda contra HEAD tuvo una del mismo tipo (un clic en «Filtros»
    recién cargado): queda como 4-57. JS de `/cotizaciones/nuevo` 433,2 KB de 460.
  - Rojos contra HEAD: 24 de Vitest (los hooks no marcan), 4 de C1 y E1 a E7 en los dos proyectos (14, el foco inactivo). Caen las 13 mutaciones en Vitest (M1 a M12 y M14,
    la ficha guardada) y las 8 del e2e (M1 dos veces, M3, M5, M7, M9, M10 y M14).
- **Commits:** `fb4e452d`, `0faa58d5`, `7af5d2e5` y el de la auditoría del informe, `612a8e16` (dos pruebas de la ficha guardada: otra URL no se toma y sin
  `sessionStorage` alcanza la del historial; cae la mutación de la condición de la URL).
  e2e completo: sí (4.14-2a3, shared, Nivel 2)

## 2026-10-30 — 4.14-2a4: la vuelta del foco en el listado de leads

- **La sonda C0, contra HEAD antes del código** (`.piloto/salidas/4.14-2a4/medicion-0.json`, en los dos proyectos; dos corridas, la segunda para K4 y para m7 del
  rápido): K1 («Nuevo lead»), K2 y K3 («Gestionar etiquetas» desde los filtros, a 1.280 px, y desde el selector del «⋯»), K4 (exportar desde «CSV»), K5 y K6 (anotar y
  agendar desde el «⋯» de una fila), K7 (el lead rápido desde el nombre), K8 a K10 («Editar», anotar y agendar en el rápido), K11 («Etapas») y K12 («Nuevo embudo»).
  - m1: ningún «atrás» recarga el documento. m2: en todos cierra el panel y su clave sale de la URL (en K8 a K10 queda el rápido).
  - m6: K1 a K4, K7, K11 y K12 dejan el foco en `body` (0 a 2.000 ms): llevan e2e. K5 y K6 vuelven al «⋯» y K8 a «Editar»: no reproducen. K9 y K10 dejan el foco en
    «Editar» (sin recargar, en el «⋯» del resumen): es 4-58.
  - m7 (K3, sin recargar): tras «atrás» y tras Esc, el foco va al «⋯»: rama **R1** (el selector enfoca el «⋯» antes de «Gestionar etiquetas»).
  - m9 (K8): el segundo «atrás» cierra el rápido con el foco en `body`: es 4-59. No se dio S1, S4 ni S5.
- **La partición:** el 2a4 hace el listado (6 hooks); la ficha va al 4.14-2a5 y la configuración con el cierre del guardián al 4.14-2a6. La fila del 4.14 pasa a «Prompts:
  10 (quedan 5)» y el total de la fase a 31 pasos y 80 prompts. `PENDIENTES` marca los 5 de la ficha como «4.14-2a5» y los 3 de configuración como «4.14-2a6».
- **Verificación:**
  - En verde: lint, typecheck y test (5.660), y `mapa.sh --check`. Saltadas nuevas: 0.
  - El completo de escritorio sobre los tres commits de código (los dirigidos eran 85 specs, más de la mitad): 819 en verde, 16 saltadas y una caída,
    `listas-por-pagina-pendiente.spec.ts:102` (la preferencia sin guardar tras volver la red; la traza: la action salió 6 ms antes del corte, falló y no se reintentó), que
    repetida 5 veces pasa: queda como 4-60. 31,2 min, con las carreras.
  - En móvil, por R1, los 6 specs que nombran el selector o «Gestionar etiquetas»: 32 en verde.
  - JS en frío antes y después del commit del alta (corre en el shell): `/perfil` 416,8 → 418,1 KB de 440, `/leads` 508,9 → 509 de 530, `/vehiculos` 475,7 → 473,5 de 500
    y `/cotizaciones/nuevo` 433,2 → 433,3 de 460. El cuerpo de `62a9671c` las da invertidas (antes por después).
  - Rojos contra HEAD: 42 de Vitest (41 de los hooks y el del selector) y E1 a E4, E7, E11 y E12 en los dos proyectos (14, el foco inactivo). Caen las 11 mutaciones en Vitest (M1 a M11)
    y las 6 del e2e (M1, M2, M6, M7, M9 y M11, en dos tandas).
- **Commits:** `62a9671c`, `a54f3ed4` y `ae8c1141`.
  e2e completo: sí (4.14-2a4, leads, Nivel 1; 1 caída: 4-60)

## 2026-10-30 — 4.14-2a5: la vuelta del foco en la ficha del lead

- **La sonda C0, contra HEAD antes del código** (`.piloto/salidas/4.14-2a5/medicion-0.json` y `medicion-0-resumen.txt`, en los dos proyectos): F1 a F17 en la ficha (sin F6),
  R1 a R5, R6 (el segundo «atrás» de R3, `m9`) y R7 y R8 en el lead rápido, y los casos sin recargar F16s, F17s, R3s y R4s; m1, m2, m6, m9 y m10 de R3.
  - m1: ningún «atrás» recarga el documento. m2: en todos cierra el panel y su clave sale de la URL.
  - m6: «Editar», «Cambiar» el teléfono, «Compartir», «Transferir», «Nueva oportunidad», «Editar» una oportunidad, «Dar acceso» y «Revocar» dejan el foco en `body`: llevan e2e.
    «Agregar teléfono», anotar, agendar, sus «Editar» y «Gestionar etiquetas» desde el «⋯» de la ficha ya volvían: sólo Vitest. F16 y F17 (anotar y agendar desde el «⋯»
    de la ficha) dejan `body` tras recargar y sin recargar vuelven al «⋯»: 4-61, con guardia. F17 en escritorio: la sonda no vio el diálogo tras recargar (sin medir).
  - R3 y R4 dejan el foco en «Editar» y el botón de la pestaña ya no está en el DOM (m10 = 0): 4-58. R1 y R2 ya volvían al botón de su pestaña; R5, R1 y R2 dejan `body`
    con el segundo «atrás» (m9): 4-59. R3s y R4s: el «⋯» del resumen. R7 y R8 (Esc y dos «atrás»): el nombre de la fila, ya en HEAD. R6: el segundo «atrás» de R3 y de R4 cierra el rápido con el foco en el «⋯» de la fila, fuera del diálogo (no `body`). No se dio S1 ni S5. F6 no se midió.
- **Las ramas:** C3 (4-58, `enPestana`) y C4 (4-59, `esperaSinPanel`) pasaron su e2e sin tocar `src/shared`; no se movió nada al 2a6. El segundo «atrás» desde el botón de una pestaña
  no se recupera (R1; el e2e que lo mostraba se cambió por el del «⋯» del resumen): 4-62.
- **Verificación:**
  - En verde: lint, typecheck, test (5.721) y `mapa.sh --check`. Saltadas nuevas: 0 (`saltadas.txt`).
  - El completo de escritorio sobre los tres commits de código (los dirigidos eran 86 specs, más de la mitad de 165): 838 en verde, 16 saltadas y ninguna caída, 30,1 min.
  - En móvil, los dos specs de la vuelta y los 15 que nombran los modales de la pestaña: 62 en verde, 5 saltadas (sus marcas `@sin-celular`).
  - JS en frío (`presupuesto-js` en el completo): `/perfil` 418 KB de 440 (antes 418,1), `/leads` 509,1 de 530, `/vehiculos` 473,5 de 500 y `/cotizaciones/nuevo` 433,2 de 460;
    «Datos», «Oportunidades» y «Portal» de la ficha, dentro de su presupuesto de 43 KB (sus specs, en verde).
  - Rojos contra HEAD: 60 de Vitest (56 de `probarLaVuelta`, 3 «quintas» y C4 (a)); 16 e2e de la ficha (8 casos × 2 proyectos) y 8 del rápido (R3, R4, «Editar» con dos «atrás» y el de la pestaña, × 2 proyectos; el de la pestaña se cambió después por el del «⋯» del resumen, cuyo rojo es M10).
    Las guardias (F16s, F17s, R3s, R4s, R7 y R8 y C4 (b)) están en verde en HEAD.
  - Mutaciones: en Vitest caen M3, M4, M6, M7, M10, M11 y M12; en e2e, M1, M5, M8 y M13 corrieron en una tanda (`mut/e2e-A.txt`; caen F1 a F5, F9, F10 y R3, y M13 no cae), M2 y M9 en otra
    (`e2e-B.txt`; caen F2, F4, F5 y R4) y M10 en dos (`e2e-M10-*.txt`). Para M1, M2 y M5 no hay salida de Vitest. **Sobreviven en el e2e** M12 (la compuerta pura de C4: cae su prueba de Vitest)
    y M13 (la ficha con `enPestana`: en la ficha el foco va al «⋯» con `true` y con `false`); las dos, anotadas en DECISIONES.
- **Una caída suelta, sin causa de C4:** «Editar» con dos «atrás» (escritorio) vio el rápido aún abierto con la URL en `/leads` (`e2e-fallos/2026-10-30_12-38/`): 1 de 10 con C4 y 4 de 15 con C4 anulado
  (`repetir-dos-atras.txt`, `mut/repetir-M10-editar.txt`). Queda como 4-63.
- **Commits:** `fc0d8684` (los 5 hooks de la ficha), `aad3bfeb` (4-58) y `e1284c0f` (4-59).
  e2e completo: sí (4.14-2a5, leads, Nivel 1)
