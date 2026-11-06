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

## 2026-10-30 — 4.14-2a6: la vuelta del foco en configuración y el guardián sin pendientes

- **Qué:** `usePanelDeOrigen`, `usePanelDeTipo` y `usePanelDeTipoDeSeguimiento` abren con `abrirConVuelta()` y llaman a `useVueltaDelFoco()`. En la edición, «ya abierto»
  mira el id. Se borró `scripts/guardas/paneles-con-vuelta.ts`, y su test exige las dos funciones en cada `history: 'push'` de `src/` (salvo `usePanelPorUrl()`). F6
  («Salir de este lead») suma su e2e al spec de la ficha. Cierra 4-49 y 4-44 (a) (`docs/DECISIONES.md` › «Paso 4.14 (2a6)»).
- **La sonda (C0)**, contra HEAD y en los dos proyectos (`.piloto/salidas/4.14-2a6/medicion-0.jsonl`):
  - m1 y m2 dan bien en todos los casos.
  - Los 9 casos de configuración dejan el foco en `body` a los 500 ms a más tardar (O1, T1 y G1 desde los 0; O3 y T2 en escritorio, desde los 500)
    y llevan e2e. O2s, sin recargar, vuelve al «⋯».
  - F6 vuelve al botón, y F6m (con M7) deja `body`. No se dio S1 ni S2 y no nace 4-64.
- **Verificación:**
  - En verde: lint, typecheck, test (5.748) y `mapa.sh --check`. Saltadas nuevas: 0.
  - El completo de escritorio sobre los tres commits de código (Nivel 2, por `src/shared`): 849 en verde, 16 saltadas y ninguna caída, 30,8 min.
  - En móvil: los specs de la vuelta, los que abren los modales de configuración, `leads-confirmar-por-url` y `leads-cartera` (20 specs), 102 en verde.
  - JS en frío: `/perfil` 418 KB de 440, `/leads` 509,1 de 530, `/vehiculos` 473,5 de 500 y `/cotizaciones/nuevo` 433,2 de 460.
  - Rojos contra HEAD: 27 de Vitest, la guarda nueva (lista los 3 hooks) y 18 e2e (los 9 casos en los dos proyectos). La guardia O2s queda en verde.
  - Mutaciones: en Vitest caen las 8 (M1 a M8). En el e2e corrieron M1, M2, M5 y M7 en una tanda, y caen O1, O2, O3, G1, G2, G3 y F6. O2s no cae con ninguna: es una
    guardia sin caída demostrable (DECISIONES).
- **Commits:** `baea6897` (los 3 hooks de configuración), `ef48909c` (el guardián sin lista) y `a6fdf76d` (F6).
  e2e completo: sí (4.14-2a6, shared, Nivel 2)

## 2026-10-30 — 4.14-2b: el historial del elegido, «Cotizado (n)» y «Cotizar» desde el resumen

La barra del vehículo de la hoja dice «Cotizado (n)» y el panel trae, en la región «Elegido», el historial de cotizaciones plegado: se lee al desplegarlo, de a 20 con «Ver más»
hasta 500, con la RLS de quien mira (P2) y sin función de base. Lo une `src/app` (la barra recibe el historial armado). El resumen de un vehículo suma «Cotizar», sin lead (P1), con
`origenesParaCotizar()`. Con P3 (la persona), el tope de bytes del historial se fijó en lo medido (5.250 B, no los 4.000 de la estimación). `docs/DECISIONES.md` › «Paso 4.14 (2b)».

- **Verificación:**
  - En verde: lint, typecheck (sin warnings), Vitest de los módulos (1.597) y `mapa.sh --check`. `pnpm test` completo lo corre el bucle.
  - e2e dirigidos (25 specs, escritorio y móvil, más `presupuesto-js`): 306 en verde y 5 saltadas (`.piloto/salidas/4.14-2b/verde-e2e-dirigidos-2.txt`).
  - Rojos contra HEAD: Vitest (los tres bloques, `rojo-vitest-1|2|3.txt`) y los dos specs nuevos (`rojo-e2e-*.txt`). Sin mutaciones: paso de pantalla.
  - Medido: el historial con 21 filas pesa 4.972 B (escritorio) y 4.867 (móvil) y 61 nodos. JS en frío de `/cotizaciones/nuevo` 433,5 KB de 460 (la primera versión sumó 20,4: la lectura
    reexportada por `composicion.client.ts` y `<Badge>` en la barra; ver DECISIONES), `/vehiculos` 473,5 de 500, `/perfil` 418 de 440.
- **Commits:** `ba111574` (la lectura), `7d7df7c` (el historial y la insignia) y `b2921c3` («Cotizar»).
  e2e completo: no (4.14-2b, pantalla, 1 de 3)

## 2026-10-30 — 4.14-2c1: buscar, traer, «+», crear y elegir desde el panel del vehículo

El panel del vehículo de la hoja de cotizar tiene arriba un campo que busca por nombre, VIN o lote y trae un enlace de Copart o IAAI, un VIN o un lote; «+» carga a mano. Los dos abren el alta del inventario dentro
del panel y «Crear y elegir» crea el vehículo y la hoja lo elige, sin guardar la cotización (P1). El layout del alta se lee del navegador al abrirla (P2: en el documento de la hoja sumaba 69.098 B).
El 4.14-2c se partió en tres; el 4.14-2c1 no cierra 4-10. `docs/DECISIONES.md` › «Paso 4.14 (2c)».

- **Verificación:**
  - En verde: lint, typecheck (sin warnings), Vitest completo (5.839 pruebas en 479 archivos) y `mapa.sh --check`.
  - e2e dirigidos (22 specs, escritorio y móvil, más `presupuesto-js`): 267 en verde, 5 saltadas y 2 en rojo (el tope de bytes del panel: la búsqueda pedía `creado_en` también en las pestañas, 5.627 B); arreglado, los tres specs que lo tocan se repitieron: 38 en verde (`.piloto/salidas/4.14-2c1/dirigidos.txt`, `dirigidos-2.txt`).
  - Rojos contra el estado anterior: Vitest (`rojo-vitest-1|2|3.txt`) y el spec nuevo (`rojo-e2e-*.txt`; es serial: cae B2 y los demás quedan sin correr). Sin mutaciones: paso de pantalla.
  - Medido: el panel con el buscador, 295 nodos y 4.681 B (topes 299 y 4.900); JS en frío de `/cotizaciones/nuevo` 443,9 KB de 460 y de `/vehiculos` 476,3 de 500; el documento de la dueña +17.373 B sobre el de un rol sin
    `vehiculos.crear` (tope 40.000); tarea de oro 2 con el panel, 28 teclas, KLM 20,8 s / 19,4 s.
- **Commits:** `3f834f78` (la búsqueda), `487a37c1` (crear y elegir, con el layout del alta en `origenes`) y `f33fb12f` (la tarea de oro con el panel).
  e2e completo: no (4.14-2c1, pantalla, 2 de 3)

## 2026-10-30 — 4.14-2c2: el dato del vehículo de una celda de tabla

La celda de un nodo `tabla` que quien cotiza ve, en `cotizacion_hoja()`, lleva `dato_del_vehiculo: {tabla, columnas: [{columna, campo}]}`: qué columna de su tabla casa con qué dato del vehículo
(`tipo` ← `tipo_vehiculo` en el transporte sembrado). Las filas para elegirlo las da `cotizacion_tabla()`. Lo arma `_hoja_datos_del_vehiculo()` (invoker, de nadie) una vez por lectura. Compuerta `datos`
aprobada (P1 y P2); P3 queda para el 2c3. No cierra 4-10. `docs/DECISIONES.md` › «Paso 4.14 (2c2)».

- **Verificación:**
  - Cadena db: `db:reset`, `db:types` (suma el ayudante), `db:probar` (454 en verde), `db:lint` (sin avisos nuevos) y `db:medir`. `db:carreras` no aplica (lectura `STABLE`).
  - En verde: lint, typecheck (sin warnings), Vitest completo (5.842 pruebas en 480 archivos) y `mapa.sh --check`.
  - Rojos contra HEAD: T1–T5 de `cotizacion-hoja-dato-del-vehiculo.sql` (T5 sólo en el ayudante) y las 3 de `hoja-dato-del-vehiculo.test.ts` (`.piloto/salidas/4.14-2c2/rojo-*.txt`).
  - Mutaciones: 17 en SQL y 4 en TS, cada una con su prueba. M16 (sin `collate "C"`) no la veía PGlite (colación C) y sí cambia el orden con ICU: T5 lo vigila desde el `fix` (`2827e6df`).
  - Medido: la hoja de la dueña 10.630 → 10.866 B (+236), la asesora 6.198 → 6.434, `planilla_usa` 9.750 → 9.986; 4,6 ms; sintéticas 12,4 y 161,4 ms (razón 13,0).
  - e2e dirigidos (9 specs, escritorio): una caída de `cotizar-hoja.spec.ts:145` (la variante, con la máquina cargada) que pasa al repetir el spec (14 de 14). Completo de escritorio: 866 en
    verde, 16 saltadas y ninguna caída, 32,7 min.
- **Commits:** `3c51b571` (la base), `faa0e802` (el tipo de la hoja) y `2827e6df` (el `fix` de la auditoría del informe).
  e2e completo: sí (4.14-2c2)

## 2026-10-30 — 4.14-2c3: el tipo de vehículo en el panel

Con un vehículo elegido, «Elegido» del panel ofrece el dato que casa con una tabla de la hoja (el tipo de vehículo del transporte de `subasta_usa`) entre las filas de la tabla, tal cual salen de ella y
con el del vehículo marcado; un toque lo guarda en el vehículo (`guardarDatoDelVehiculo` por `vehiculo_guardar`), cierra el panel y la hoja recalcula. Quien no puede editar el vehículo lo ve sin elegir;
la celda sin valor dice que se elige en «Vehículo». La tarea de oro 2 con un enlace de Copart lo recorre sólo con el teclado. Cierra 4-10. `docs/DECISIONES.md` › «Paso 4.14 (2c3)».

- **Verificación:**
  - En verde: lint y typecheck (sin warnings), Vitest completo (5.887 pruebas en 488 archivos) y `mapa.sh --check`.
  - Rojos contra HEAD: Vitest de los 7 archivos nuevos (`.piloto/salidas/4.14-2c3/rojo-vitest.txt`). Los e2e nuevos no se corrieron contra HEAD (no hay grupo que buscar). Sin mutaciones: paso de pantalla.
  - e2e dirigidos (15 specs, escritorio y móvil, con `presupuesto-js`): 153 en verde y 5 saltadas (`.piloto/salidas/4.14-2c3/dirigidos-1.txt`).
  - Medido: el grupo con 1.000 claves por tabla, 56 nodos (tope 59) y ≈ 55.100 B por lectura; JS en frío de `/cotizaciones/nuevo` 444,7 KB de 460; la tarea de oro con enlace, 32 teclas, KLM 39,5 s.
- **Commits:** `65841c37` (la lectura de las opciones), `da63e3df` (elegir en el panel) y `f95a7d4b` (la tarea de oro con enlace).
  e2e completo: no (4.14-2c3, pantalla, 1 de 3)

## 2026-10-31 — 4.14-3a: «míos» del panel del cliente por lo más reciente

La cartera de una persona se lee ahora ordenada por lo más reciente de cada lead (el último seguimiento vivo o, sin ninguno, el alta) con un índice y sin ordenar: `leads_asesores.lead_reciente_en` es una copia
que mantienen triggers en todas las filas del lead (también las revocadas), y `leads_vista` y `leads_cartera_vista` la exponen como `reciente_en`. Es la base del panel del cliente (4.14-3b). Cierra 4-53.
`docs/DECISIONES.md` › «Paso 4.14 (3a)».

- **Verificación:**
  - En verde: `pnpm lint`, `pnpm typecheck` (sin warnings), `pnpm test` (5.892 pruebas en 489 archivos), `bash scripts/mapa.sh --check`, `pnpm db:probar` (466 ✓), `pnpm db:lint` y `pnpm db:carreras` (con las carreras K1–K3 nuevas).
  - Rojos contra HEAD: `cartera-reciente.sql` cae en 10 de sus 11 bloques (el primero sólo arma ayudantes), `derivados-leads.sql` en 9 (`rojo-derivados.txt`) y las carreras caen por la columna que no existe (`.piloto/salidas/4.14-3a/rojo-probar.txt`, `rojo-carreras.txt`).
  - Mutaciones: M1–M10 hacen caer su prueba (`.piloto/salidas/4.14-3a/mut/`); M11 (la migración no apaga el trigger de la cartera en el relleno) sobrevive por diseño (`M11-sin-apagarlo.txt`), y dejarlo apagado tras el relleno cae en T10 y en 36 pruebas más (`M11-dejarlo-apagado.txt`).
  - Nivel 2 (estructura): `pnpm test:e2e:completo --project=escritorio`, 873 en verde, 16 saltadas, 31,4 min (`.piloto/salidas/4.14-3a/e2e-completo.txt`).
  - Medido con 62.000 y 212.000 (`db:medir:volumen`, `.piloto/salidas/4.14-3a/f50-medir.txt` y `f200-medir.txt`): página 1 y profunda 1,6–2,2 ms y 485–733 buffers; la pestaña por clase de la dueña 1.535–1.551
    buffers (tope 2.500); la clase ausente 66 ms y 289 ms (tope 400, límite declarado); un seguimiento cuesta +0,1 ms y +144/+147 buffers; el relleno de 201.600 filas, 10,7 s.
- **Commits:** `31219462` (4-53), `c39cef65` (la migración, sus pruebas, las carreras y los tipos) y `b8b9e959` (la medición con volumen) y `4d7e6041` (el `fix` de la auditoría: K3 de salir en el otro orden).
  e2e completo: sí (4.14-3a)

## 2026-10-31 — 4.14-3b: el panel del cliente sobre la hoja

La barra «Cliente», debajo de la del vehículo, abre `?panel=cliente`: «míos» por lo más reciente en las pestañas «Todos», «Prospecto» y «Cliente», o la búsqueda por nombre o `#n` entre los leads que quien
cotiza ve, por cursor y sin ir al servidor, con el tipo de cada lead como texto. Elegir o quitar escribe `?lead=` y conserva lo tipeado; un lead que no se ve se suelta. Cierra 4-65 (límite aceptado).
`docs/DECISIONES.md` › «Paso 4.14 (3b)».

- **Verificación:**
  - En verde: `pnpm lint`, `pnpm typecheck` (sin warnings), `pnpm test` (5.932 pruebas en 493 archivos) y `bash scripts/mapa.sh --check`.
  - Rojos contra HEAD (`.piloto/salidas/4.14-3b/rojo-vitest.txt`): los módulos nuevos no existen y `claves-de-la-hoja.test.ts` cae (seis claves de borrador y no cinco).
  - e2e dirigidos en `escritorio` y `movil` (`.piloto/salidas/4.14-3b/dirigidos-escritorio.txt`, `dirigidos-movil.txt`, `guardar-esc.txt`, `final-*.txt`): el spec nuevo (10 pruebas), todos los `cotizar-*`, `paneles-foco-al-volver`,
    `vehiculos-resumen-cotizar` y `presupuesto-js` (JS de `/cotizaciones/nuevo` 452,9 KB de 460). Las tareas de oro miden 25, 29 y 33 teclas de control.
  - Medido con 62.000 y 212.000 (`medir-cartera-reciente.sql`, `f50b-medir.txt` y `f200-medir.txt`): página 1 y profunda 2,0–3,1 ms y 515–1.009 buffers; la clase cliente de la dueña 3,3–3,5 ms y 1.849–2.042 buffers;
    la clase ausente 72 y 285 ms (tope 400). El `db:medir:volumen` entero con 62.000 cayó en `medir-importacion-volumen.sql` (el tiempo por fila de la pasada 2 fue 0,67 veces el de la 1, con la máquina a carga 4–5; no toca
    este paso) y con 212.000 pasó entero; la de «míos» se repitió sola con 62.000.
  - Panel en pantalla: 151 nodos y 4.988–5.030 bytes con 20 filas (topes 159 y 5.282). Resumen al 200 % con las dos barras y la página arriba: 227 px (escritorio) y 157,6 (celular) bajo el borde (4-50).
- **Commits:** `dc315de5` (las lecturas), `94932b22` (conservar lo tipeado) y `98a16e17` (la barra, el panel y sus pruebas).
  e2e completo: no (4.14-3b, pantalla, 1 de 3)

## 2026-10-31 — 4.14-3c: «Nuevo lead» desde el panel, «Cotizar» en la ficha y la tarea de oro del cliente

El panel del cliente de la hoja suma «+», que abre «Nuevo lead» (el del shell) con `?elegir=lead`; al guardar, el alta se cierra, la hoja elige al creado conservando lo tipeado y el foco vuelve a la barra «Cliente».
«Guardar» sin cliente dice «Para guardar, elige el cliente en «Cliente».». La cabecera de la ficha del lead suma «Cotizar», entre «Editar» y el «⋯», que abre la hoja con ese lead en el primer origen donde quien mira cotiza.
La tarea de oro 2 suma su tramo del cliente (uno que existe y uno nuevo). Cierra el 4.14. `docs/DECISIONES.md` › «Paso 4.14 (3c)».

- **Verificación:**
  - En verde: `pnpm lint`, `pnpm typecheck` (sin warnings), `pnpm test` (5.947 pruebas en 495 archivos) y `bash scripts/mapa.sh --check`. Sin esquema: ni `db:*`.
  - Rojos contra HEAD (`.piloto/salidas/4.14-3c/rojo-vitest.txt`, `rojo-vitest-c2.txt`, `rojo-vitest-c3.txt`): 7 pruebas del «+» y de `?elegir=`, las dos del texto de «Guardar» y las dos del enlace «Cotizar» de la ficha; los e2e nuevos no se corren contra HEAD (no hay «+» ni «Cotizar»).
  - e2e dirigidos en `escritorio` y `movil` (`.piloto/salidas/4.14-3c/e2e-commit1b.txt`, `e2e-commit2.txt`, `e2e-commit3.txt`): los tres specs nuevos (`cotizar-panel-nuevo-lead`, `cotizar-tarea-de-oro-cliente`, `leads-ficha-cotizar`), `cotizar-panel-del-cliente`,
    `leads-alta*`, `paneles-foco-al-volver*`, las tareas de oro 2 y 4, `cotizar-guardar*`, `cotizar-hoja`, `leads-ficha*`, `vehiculos-resumen-cotizar` y `presupuesto-js`.
  - Medido: panel del cliente 156 nodos con el «+» (tope 159) y 5.030 bytes; JS en frío de `/cotizaciones/nuevo` 453,1 KB de 460, `/perfil` 418,4 de 440, `/vehiculos` 476,3 de 500 y `/leads` 510,7 de 530; tarea de oro 4 en 32 y 31 teclas (tope 32); tarea de oro 2 del cliente 29 y 30
    teclas de control en los dos proyectos (KLM 17,2 y 28,3 s).
  - Un hallazgo: el panel del cliente devolvía el foco a su barra un instante después de pasar al alta y se lo quitaba al teléfono a media palabra (la tarea de oro del cliente nuevo perdía letras en varias corridas y medía de 30 a 35 teclas);
    arreglado en el mismo commit y medido 6 veces seguidas en 30.
  - Una caída ajena: `cotizar-guardar-d2` cayó una vez en la corrida grande del commit 2 y pasó sola al repetirla (la máquina, a carga 4–8 por el escritorio de la persona).
- **Commits:** `75393f8e` (el «+» y elegir al creado), `9b8bdb8b` (el texto de «Guardar» y la tarea de oro del cliente) y `d5686178` («Cotizar» en la ficha).
  e2e completo: no (4.14-3c, pantalla, 2 de 3)

## 2026-11-04 — 4.15-1: 4-26 medido, `puede_cotizacion` con un alcance, guardar pide ver y `totales` por clave

El 4.15 se partió en 3 (`docs/PLAN.md` › 4.15). Este primero es de base:

- **4-26** se midió antes de tocar nada y se cierra «no reproducida».
- `puede_cotizacion()` mira el alcance una vez (cierra 4-24).
- `cotizacion_guardar` pide ver y editar en `_cotizacion_puede_guardar()`, antes y después del candado (cierra 4-34).
- La revisión guarda `totales` por clave, cada grupo entero, y su lectura saca el grupo que el recorte deja igual y un `grupos` vacío.
- Plan aprobado por la persona en la compuerta `datos`. `docs/DECISIONES.md` › «Paso 4.15 (1 de 3)».

- **4-26** (`.piloto/salidas/4.15-1/4-26/`):
  - `leads-exportar` corrió 10 veces y respondió de 273 a 359 ms. El bloque 2 corrió dos veces desde `db:reset` y respondió en 321 y 299 ms.
  - Lo que pasó de 1 s fue la siembra (de 1,2 a 3,6 s por lote de 1.000) y el arnés.
  - Checkpoints con `sync` de 0,40 a 0,54 s. No hubo esperas de candado. La siembra escribe ≈ 37 MB de WAL.
  - Hallazgo (4-67): tras `analyze`, la primera página del conteo de exportar de una cartera recién sembrada tarda 3,1 s (`Seq Scan on leads` en un `Nested Loop`), medido en SQL y no por la e2e.
  - Las dos corridas del bloque 2 tenían ya aplicadas las migraciones nuevas del paso, que no tocan leads.
- **Verificación:**
  - En verde: `pnpm lint`, `pnpm typecheck`, `pnpm test` (5.947 en 495 archivos), `db:reset`, `db:types` (el ayudante), `db:probar` (467), `db:lint` (sin avisos nuevos), `db:carreras` (174, con g10b) y `db:medir`.
  - `cotizacion_guardar`: la dueña 6,6 ms y 305 buffers, la asesora 6,7 y 311, con 50.000.
  - La medición con volumen de la lectura: Ana pedía `alcance_de` 2 veces y ahora 1.
  - Rojos contra HEAD (`.piloto/salidas/4.15-1/rojo-*.txt`): T1, T3, T4 (PT409 con quién y cuándo, 22023 del vehículo, del intento y del título), T8, T9a, `:1303` y g10b (57014).
  - 15 mutaciones, cada una con su prueba (`.piloto/salidas/4.15-1/mut/`). M11 sobrevivía como estaba escrita (un solo lado); simétrica, cae, y T8 suma «lo que se va».
  - Sin e2e dirigidos: ningún spec usa lo que cambia.
- **Commits:** `ffb39d58` (`puede_cotizacion` con un alcance), `91d65e12` (guardar pide ver) y `9b9062ac` (`totales` por clave en la revisión).
  e2e completo: no (4.15-1, base, Nivel 1)

## 2026-11-04 — 4.15-2: la hoja de una guardada, revisiones con autor y cotizar encima

El 2 de 3 del 4.15, de base. P1–P13 contestadas con la recomendada; plan aprobado en la compuerta `datos`. `docs/DECISIONES.md` › «Paso 4.15 (2 de 3)».

- `cotizacion_hoja_guardada()`: SU versión, lo editable sólo para quien la guarda (`_cotizacion_puede_guardar()`; quien sólo ve, en sólo lectura), la publicada, la
  vigencia (`ajustes_empresa.vigencia_dias`, «vencida» por día en la zona de la empresa) y la cadena (la anterior; la nueva, o sólo que existe).
- `cotizacion_revisiones` nombra al autor y trae las etiquetas de lo que viaja recortado en la página.
- `cotizacion_encima()`: la N+1 en el acto, preventa, una viva por anterior (`cotizaciones_encima_unica`), con lo tipeado de los nodos que siguen (también lo oculto).
- **Verificación** (`.piloto/salidas/4.15-2/`, informe en `.piloto/informes/4.15-2.md`, auditado: observaciones, atendidas):
  - En verde: `lint`, `typecheck`, `test` (5.947 en 495), `db:probar` (491), `db:lint`, `db:carreras` (k1–k5 nuevas), `db:medir` y la lectura de revisiones con volumen.
  - `cotizacion_hoja_guardada` 6,2 a 7,1 ms y `cotizacion_encima` 7,8 a 8,3 ms con 250.000, sin recorrer `cotizaciones`; las dos guardas, ≈ 112 ms y un recorrido.
  - Rojos contra HEAD (`rojo-*.txt`) y 33 mutaciones que caen (`mut/`); M21 sobrevivía hasta sumar a E4 los casos «con una nueva ya creada».
  - Nivel 2 por estructura (la columna y el índice): el completo de escritorio, 890 en verde, 16 saltados, ninguna caída, 33,9 min.
- **Commits:** `da93a3a8` (la hoja de una guardada), `58dd4ea0` (revisiones con autor) y `7b38f9b4` (cotizar encima).
  e2e completo: sí (4.15-2, base, Nivel 2)

## 2026-11-04 — 4.15-3a: abrir y guardar una cotización guardada en `/cotizaciones/[id]`

El 3a de 4 del 4.15, de pantalla (Nivel 1, rigor de pantalla con una escritura de dinero). P1 y P2 contestadas con la recomendada; plan auditado en dos rondas y aprobado en la
compuerta `datos`. `docs/DECISIONES.md` › «Paso 4.15 (3a de 4)».

- `/cotizaciones/[id]`: la hoja de SU versión (sólo lectura para quien no la guarda), «Guardar» con la versión esperada, el conflicto con quién y cuándo, `intento_reusado`, y
  «Total guardado» con el aviso cuando lo de hoy no es lo guardado; se llega desde el historial del vehículo y la tarjeta de lo guardado. El vehículo no se cambia (P1; 4-71).
- **Verificación** (`.piloto/salidas/4.15-3a/`, informe en `.piloto/informes/4.15-3a.md`, auditado: observaciones; la 1.ª se arregló en un `fix`):
  - En verde, lo mínimo local de cada commit: eslint, `vitest related` (2.300 en 116 archivos tras el 3) y `typecheck`; `lint` y `test` enteros los corre el CI.
  - e2e dirigidos en escritorio y móvil, 0 caídas: los dos specs nuevos (26 pasadas), los del guardado y la hoja (94) y, tras el `fix`, los de C1 (146).
  - Rojos contra HEAD (`rojo-*.txt`) y 5 mutaciones que caen (`mutaciones.txt`); la M2 en e2e cae por la lectura, no por el guardado.
  - JS en frío: `/cotizaciones/[id]` 440,3 KB (tope 448) y `/cotizaciones/nuevo` 456,2 (tope 460; subió 3,1: 4-73).
- Hallazgo de la auditoría: «Recargar» tras `nodo_no_editable` no volvía a montar la hoja y lo rechazado se reenviaba; ahora la lectura que pidió suma a la `key`.
- **Commits:** `9df08f05` (la hoja calcula por su origen o su cotización), `47ce6f8a` (abrir una guardada), `4d5a868a` (guardar) y `c141e3a3` (el `fix`: volver a montar al recargar).
  e2e completo: no (4.15-3a, pantalla, 1 de 3)

## 2026-11-04 — 4.15-3b: las revisiones, la cadena y «Cotizar encima» en `/cotizaciones/[id]`

El 3b de 4 del 4.15, de pantalla (Nivel 1, rigor de pantalla con una escritura de dinero). P1 y P2 contestadas con la recomendada; plan auditado una vez (observaciones, las 13 atendidas)
y aprobado en la compuerta `datos`. No toca la base. `docs/DECISIONES.md` › «Paso 4.15 (3b de 4)».

- La cabecera de una guardada suma «Revisiones» (`?panel=revisiones`: un panel de sólo lectura, de a 20 por cursor hasta 500), la cadena («Versión V de la n.º N», «Hay una versión nueva») y,
  si usa otra versión de la fórmula que la de hoy o venció, un aviso con «Cotizar encima», que crea la versión nueva en el acto (`cotizacion_encima`, intento sólo tras una pérdida) y espera si hay cambios sin guardar.
- **Verificación** (`.piloto/salidas/4.15-3b/`, informe en `.piloto/informes/4.15-3b.md`):
  - En verde: `pnpm lint`, `pnpm typecheck` y `pnpm test` (516 archivos, 6.141 pruebas) tras el último commit de código (`410339dd`).
  - e2e dirigidos en escritorio y móvil, 0 caídas: los dos specs nuevos (revisiones 3 y encima 7, por proyecto), los de la página (`cotizar-guardada`, `cotizar-guardada-guardar`) y `presupuesto-js` (54 pasadas, 6 saltadas).
  - Rojos contra HEAD (`rojo-*.txt`) y 8 mutaciones que caen con Vitest (`mutaciones.txt`: M1 a M6 del plan y F3 y F6 del `fix`).
  - JS en frío: `/cotizaciones/[id]` 442,3 KB (tope 448) y `/cotizaciones/nuevo` 456,2 (tope 460, sin cambio). El panel: 241 nodos y 11.907 B con 20 filas (topes 254 y 12.503).
- **El previo de nodos del panel (200) no alcanzó:** 281 en la primera corrida, 241 tras quitar un envoltorio; topes 254 y 12.503 B fijados por la sesión (`docs/RENDIMIENTO.md`). Los dirigidos de la hoja que el plan dejó al CI no se corrieron en local.
- **4-73** atribuido (el chunk de la guardada que también carga la hoja nueva) y abierto nuevo **4-75** (el camino a lo antiguo de las revisiones, 4.17).
- **Commits:** `73cb967f` (el panel de revisiones), `189c9966` (la cadena), `38c11a0b` (cotizar encima) y `410339dd` (el `fix` de la auditoría del informe).
  e2e completo: no (4.15-3b, pantalla, 2 de 3)

## 2026-11-05 — 4.16-1: la lectura del listado de cotizaciones por cursor y por alcance (4-14)

El 1 de 4 del 4.16, de base (Nivel 2 por estructura, rigor máximo). P1 («Mías» son las que creó quien mira) y P2 (todas las versiones salen) contestadas con la recomendada.
El paso paró una vez en su parada (4): los índices por clase no servían bajo la RLS (`enum_eq` no es leakproof). La persona eligió replanificar, y el plan se corrigió con lo
medido y se auditó dos veces más. `docs/DECISIONES.md` › «Paso 4.16 (1 de 4)».

- `cotizaciones_listado()`: invocadora, por cursor, con «Vencida» y los filtros origen, clase, «mías» y vehículo. «Todos» va por el índice del orden o por origen (la final por
  parciales con la clase literal), lo propio por `creado_por` y la cartera de `mis_leads()` por lead. `lead_id` y `origen_id` quedan con un solo índice entero al frente.
  Máximo: 100. El lector `leerListadoDeCotizaciones()`.
- **Verificación** (`.piloto/salidas/4.16-1/`, informe en `.piloto/informes/4.16-1.md`, auditado: observaciones, atendidas):
  - En verde: `lint`, `typecheck`, `test` (517 archivos, 6.149 pruebas), `db:probar` (498), `db:lint`, `db:medir` y `db:medir:volumen` entero (desde `db:reset` y siembra limpia).
  - Rojos contra HEAD (`rojo-*.txt`): con 250.000, «lo de hoy» tarda 1,7 s Ana y 2,2 s la «chica». Con la función, 18,6 y 1,6 ms, sin crecer con N; la dueña, ≤ 105 bloques de
    `cotizaciones` en cada filtro.
  - 19 mutaciones que caen (`mutaciones.txt`; M2 sobrevivió una vez y se sumó la comprobación de una página entera).
  - Crear y guardar contra HEAD: +5 a +10 buffers, con el mismo tiempo.
- **Tropiezos del entorno:**
  - Las mediciones que cayeron a mitad dejaron 398 MB de filas revertidas, y `origenes_resumen` pasó a 365 ms; tras `vacuum`, verde.
  - `medir-bajas.sql` cayó una vez por checkpoints (5a-42) y dejó sus 200.000 leads.
  - La carga llegó a 19, con otra sesión y unos bucles de CPU huérfanos.
- Abierto nuevo **4-77**: el costo fijo de ≈ 160–240 buffers por lectura con la policy de cotizaciones, de `mis_permisos()`.
- **Commits:** `33252377` (la base), `2fc8ad5d` (la medición) y `f5667be4` (el lector).
  e2e completo: sí (4.16-1, base, Nivel 2: escritorio, 914 en verde, 16 saltados, 0 caídas, 33,2 min)

## 2026-11-05 — 4.16-2a: el inventario por rutas, con los filtros del layout en SQL (4-23, la base)

El 4.16-2 se partió en 2a (la base) y 2b (la app, que cierra 4-23), tras tres sondas con volumen y dos compuertas de la persona (P-parada, P-limpieza).
`docs/DECISIONES.md` › «Paso 4.16-2a».

- `vehiculos_inventario()`: invocadora, con rutas por índice (el origen, lo creado y la cartera corta por lead), los filtros `Condicion[]` en SQL dinámico sin valores en el
  texto y `limpieza_el` sin releer la fila. Índice nuevo `vehiculos_creador_idx`; se van `vehiculos_creado_por_idx` y `vehiculos_lead_idx`.
- **Verificación** (`.piloto/salidas/4.16-2a/`; informe en `.piloto/informes/4.16-2.md`, auditado: observaciones, atendidas con un `fix`):
  - En verde: `lint`, `typecheck`, `test` (523 archivos, 6.178 pruebas), `db:probar` (508), `db:lint`, `db:medir` y `db:medir:volumen` entero.
  - Los dirigidos (23) y el e2e de equivalencia con PostgREST (47 casos).
  - Rojos contra HEAD: PGlite (7 ✗), el e2e (`PGRST202`) y la medición contra hoy (la chica de 7,0 a 32,1 ms).
  - Las 33 mutaciones muerden.
- Con 250.000: la chica de 32,3 a 2,5 ms y Vera de 78,5 a 28,1. Beto (6,3 → 8,1) y Pía (5,0 → 6,0) pagan algo, dentro de 10 ms. 4-77, medido: no crece con las concesiones.
- Abierto nuevo **4-78**: las listas del panel del vehículo de quien ve «propios» recorren el origen.
- **Commits:** `bce960bf` (la base), `8918e044` (el e2e), `c6e2b63d` (la medición) y `6b85221d` (el `fix` de la auditoría).
  e2e completo: sí (4.16-2a, base, Nivel 2: escritorio, 915 en verde, 16 saltados, 0 caídas, 32,9 min)

## 2026-11-05 — 4.16-2b: la pantalla lee el inventario de «propios» por `vehiculos_inventario()` (4-23, cerrado)

`docs/DECISIONES.md` › «Paso 4.16-2b». Sin base: ninguna migración, ni `db:types`, ni medición nueva (los números son los del 4.16-2a).

- `fuenteDelInventario()` elige el camino (quien ve «propios» en el origen, por la función; el resto, por la tabla) y viaja en el pedido de `buscarVehiculos()`.
  `leerPorLaFuncion()` (Zod en el pedido y en las filas) hace una llamada; si la base rechaza los filtros, esa página se lee por la tabla, una vez. `vehiculosDelInventario()` da el
  mismo `Vehiculo`. La entrada del registro de páginas es una guarda tocada.
- **Verificación** (`.piloto/salidas/4.16-2b/`; informe en `.piloto/informes/4.16-2b.md`, auditado: observaciones, sin `fix` de código):
  - En verde: `lint`, `typecheck`, `test` (526 archivos, 6.207 pruebas), `vehiculos-propios.spec.ts` (E1 a E4, escritorio y móvil: 8), los dirigidos de vehículos en los dos proyectos (46, 1 saltada de antes) y la equivalencia con PostgREST.
  - Rojos contra HEAD: Vitest (4 archivos, 9 pruebas), el e2e (E4: la página no llamaba a la función) y el registro de páginas sin su entrada.
  - Sin mutaciones: no es un paso de rigor máximo. Sin `verde-head-e1-e3.txt` por separado: en `serial` el primero que cae corta los demás.
  - `mapa.sh --check` pasó sobre el árbol de trabajo; los commits de código citan `DECISIONES.md`, que va en el commit de docs: por sí solos fallarían.
- 4-23 se cierra. 4-77 y 4-78 siguen abiertos.
- **Commits:** `f244143c` (la fuente), `dc5f9fa5` (la lectura por la función) y `7af6fe49` (el e2e de pantalla).
  e2e completo: no (4.16-2b, pantalla, 1 de 3)

## 2026-11-05 — 4.16-3: la siembra de cotizaciones del volumen y las mediciones que vacían la tabla en su transacción

`docs/DECISIONES.md` › «Paso 4.16-3». Sin migración, sin `src/`, sin `db:types`.

- `pnpm db:sembrar-volumen` siembra además 50.000 cotizaciones (`sembrar-cotizaciones.sql`, en un archivo aparte para no pasar de 300 líneas) y llena `cotizado_en` (7.120 vehículos).
  Las cuatro mediciones que sembraban las suyas vacían la tabla en su transacción. `medir-escala.sql` mide `cotizaciones_listado()` sobre la siembra.
- **Verificación** (`.piloto/salidas/4.16-3/`; informe en `.piloto/informes/4.16-3.md`):
  - En verde: `lint`, `typecheck`, `test` (526 archivos, 6.207 pruebas), `db:probar`, `mapa.sh --check` y `db:medir:volumen` entero desde `db:reset` + `db:sembrar-volumen`.
    Después de medir siguen las 50.000 (`despues-de-medir.txt`). Al final, `db:reset`.
  - Rojos contra HEAD: `medir-escala.sql` nuevo sobre la siembra de HEAD cae por la guarda (R1) y, con la guarda puenteada, por las seis páginas vacías (R1b). Las cuatro
    mediciones de HEAD con la siembra nueva caen con «la base ya trae cotizaciones» (R2). La siembra se niega la segunda vez (R3).
  - Sin mutaciones: no es un paso de rigor máximo. Que `db:medir:volumen` esté verde en el estado de los commits 1 y 2 se razona y no se midió: lo medido es el estado final.
- Medido: la dueña 1,4–1,5 ms en los cinco casos; Ana 7,6–11,5 ms («mías» 1,5). `origenes_resumen()` 7,5 ms. La carga estaba entre 2 y 5 (otra sesión de otro proyecto).
- Abierto nuevo **4-79**: Configuración › Orígenes dibuja un total exacto de cotizaciones por origen.
- **Commits:** `f20a8aae` (el truncate), `d30cb63c` (la siembra) y `addf0b2a` (la fila de `medir-escala.sql`).
  e2e completo: no (4.16-3, siembra y medición, Nivel 1)

## 2026-11-05 — Paso 4.16-4a: la pantalla `/cotizaciones`, «Nueva cotización» y el camino desde el historial del vehículo

`docs/DECISIONES.md` › «Paso 4.16-4a». Sin migración, sin `db:types`. El 4.16-4 se partió: el resumen `?cotizacion=` queda para el 4.16-4b.

- `/cotizaciones` dibuja `cotizaciones_listado()` con los filtros origen, clase, «Cuáles» y vehículo, cursor, «Vencida» y los nombres del cliente, el vehículo y el autor
  (tres lecturas por clave primaria sobre la página, con la RLS de quien mira; lo que no se ve es «—»). La entrada «Cotizaciones» del menú se enciende, «Nueva cotización» y
  la tecla `N` abren la hoja, y el tope de 500 del historial del vehículo dice «Ver todas en Cotizaciones» (`?vehiculo=`).
- **Verificación** (`.piloto/salidas/4.16-4a/`; informe en `.piloto/informes/4.16-4.md`):
  - En verde: `lint`, `typecheck`, `test` (529 archivos, 6.234 pruebas), `mapa.sh --check`, `cotizaciones-listado.spec.ts` (E1 a E7, 18 en los dos proyectos), los dirigidos
    de menú, historial y presupuestos en los dos proyectos (150, 12 saltadas de antes) y el volumen (14: dueña y Ana con 100 filas, 37,5 KB y 2.024 nodos).
  - Rojos contra HEAD: la prueba de `navegacion.test.ts`, los módulos de `filtros-del-listado` y `filas-del-listado`, la ruta y el tope del historial, y E1 del e2e.
  - Sin mutaciones: no es un paso de rigor máximo.
  - Nivel 2 por `navegacion.ts` (layout): el completo de escritorio dio 928 en verde, 16 saltados y **1 caída**, `leads-etiquetas.spec.ts:216`, ajena al paso y verde 3 de 3 sola
    sobre el mismo build (`etiquetas-1.txt` a `-3`); abierto **4-80**. Una prueba de `scripts/piloto/auto-carriles.test.ts` cayó una vez por su tope de 5 s con la carga en 10 y pasa sola.
- Topes nuevos: JS de `/cotizaciones` 358,4 KB de 380; con 100 filas y 50.000 cotizaciones, 39.500 B y 2.130 nodos.
- **Commits:** `c63d3991` (la pantalla y la navegación), `91b94b7e` (el filtro por vehículo y el camino del historial) y `07347edc` (la medición con volumen).
  e2e completo: sí (4.16-4a, layout, Nivel 2: escritorio, 928 en verde, 16 saltados, 1 caída, 35,3 min)

## 2026-11-05 — Paso 4.16-4b: el resumen `?cotizacion=` del listado de cotizaciones

`docs/DECISIONES.md` › «Paso 4.16-4b». Sin migración, sin `db:types`. Pantalla pura (Nivel 1, interfaz): plan auditado una vez (observaciones, atendidas), sin mutaciones y sin informe auditado.

- La fila y la tarjeta de `/cotizaciones` abren el resumen (`?cotizacion=`, `history: 'push'`, vuelta del foco con `abrirConVuelta`, drawer por `diferido()`): lo que trae la fila y
  «Abrir cotización» a `/cotizaciones/[id]`. El número «N.º n» pasa a ser el botón `<AbrirResumen>`. La que no está en la página (recargar, un enlace, «Siguiente» con el resumen abierto)
  la lee el servidor en `page.tsx` (`leerUnaDelListado()`: su fila por clave primaria y `cotizaciones_listado()` de tamaño 1 con el cursor `(creado_en, id + 1)`); si tampoco llega,
  `usePedidoAlServidor()` pide la página una vez y, si sigue sin llegar, «Reintentar». Una que no existe o que quien mira no ve dice lo mismo.
- **Verificación** (`.piloto/salidas/4.16-4b/`):
  - En verde: `lint`, `typecheck`, `test` (534 archivos, 6.276 pruebas), `mapa.sh --check`; `cotizaciones-listado-resumen.spec.ts` (R1 a R5 con R4b, 12 en los dos proyectos), los dirigidos
    `cotizaciones-listado`, `cotizar-historial-del-vehiculo` y `presupuesto-js` (37 en verde, 7 saltadas de antes) y el volumen (`E2E_VOLUMEN=1`, 14: la dueña y Ana con 100 filas,
    35,4 KB y 1.979 nodos en escritorio y 34,4 KB y 2.024 en el celular; antes 37,5 KB).
  - Rojos contra HEAD guardados: `entities`, `infra`, el hook, el pedido y el componente (el módulo no existe) y R1 del e2e (el clic en la fila no abre nada).
  - Sin mutaciones ni sondas: no es un paso de rigor máximo.
- Topes: JS de `/cotizaciones` 359 KB de 380 (antes 358,4); `/cotizaciones/nuevo` 456,3 de 460 y `/cotizaciones/[id]` 442,4 de 448, sin cambio relevante.
- **Commits:** `eefe148e` (leer una cotización del listado por su id) y `4f27b04f` (abrir el resumen desde el listado).
  e2e completo: no (4.16-4b, pantalla, 1 de 3)

## 2026-11-05 — Paso 4.17-1: las oportunidades de un lead por cursor, en la base (la lectura de 5a-12)

`docs/DECISIONES.md` › «Paso 4.17 (1 de 5)». Migración `20261105211442_lead_oportunidades_por_cursor.sql`, con `db:reset`, `db:types` y `db:probar` en el mismo commit. Paso de rigor máximo: plan
auditado una vez (observaciones, atendidas en `.piloto/planes/4.17.respuestas.md`), rojos contra HEAD, mutaciones, volumen e informe. El ruteo decía Nivel 1: el `create index` lo sube a **Nivel 2** (`nivel.mjs`
lo detecta con la migración escrita) y corrió el completo de escritorio.

- `lead_oportunidades()` lee de a `p_tamano` (20 por defecto, máximo 100) con el cursor `p_antes_abierta`, `p_antes_en`, `p_antes_id`: las abiertas primero y cada grupo por `ultima_actividad_en desc, id desc`,
  tres rutas, cada una por su parcial (`oportunidades_lead_abiertas_idx` y `_cerradas_idx`); de invocadora y con los mismos privilegios; el JSON sobre las filas leídas (53 líneas). La sección de la ficha pide
  100 sin cursor (`TOPE_DE_OPORTUNIDADES_DEL_LEAD`), así que la pantalla no cambia. Entra al registro de páginas (`paginas-en-la-base.ts`) y a la auditoría de leads.
- **Verificación** (`.piloto/salidas/4.17-1/`):
  - En verde: `db:reset`, `db:types`, `db:probar` (todo, `verde-probar.txt`), `db:lint` (sin avisos de `lead_oportunidades`), `lint`, `typecheck`, `scripts/guardas` (928), `mapa.sh --check` y `db:medir:volumen` entero
    (`medir-volumen.txt`; las dos primeras corridas cayeron en mediciones ajenas que miden tiempos: `medir-vehiculos-inventario.sql` y `medir-importacion-volumen.sql`, con la máquina ocupada; la tercera y la cuarta pasaron; la de inventario es 4-82 y la de importación ya era 5a-43).
  - `pnpm test`: 6.271 en verde y 5 caídas, todas de `scripts/piloto/auto-carriles.test.ts` (`auto-carriles.sh` responde «parado»: hay un archivo `PARAR` del piloto en su carpeta de estado); no tocan este paso (4-83: el test no es hermético) y
    no se tocó ese archivo, que es de la persona.
  - Rojos contra HEAD (`rojo-head-probar-solo.txt`, `rojo-head-paginas.txt`): T1 a T7 caen por la firma de cinco argumentos que no existe, y `paginas.test.ts` por «no acota p_tamano». (El `rojo-head-probar.txt` completo
    trae además un terreno que chocaba con otro test —el teléfono y los usuarios—; se arregló antes de la corrida válida.)
  - Mutaciones (`mutaciones.txt`): M1 a M7 y M9 a M13 caen por sus pruebas (M1 → T3; M2 → T2 y T3; M3 → T1 a T4; M4 → T2 y T3; M5 → T4; M6 → T1 a T5 y `matriz-leads`; M7 → T5 y T7; M9 → T7; M10 → T1, T2, T4 y T5;
    M11 → T4; M12 → T6; M13 → T5 y `auditoria-leads.sql`). M8 (índices sin `usuario_id`) cae en el Assert 1 de la medición: 21 filas descartadas por ruta. M14 (releer las filas por id para armar el JSON) cae en el Assert 2: 40 bloques de `oportunidades_pkey` en cada página. Dos de las previstas cayeron en otras pruebas que las
    del plan (M2 y M4: T2 y T3, no T1).
  - Volumen: ≈ 3 ms por página y 4 a 8 bloques de `oportunidades` (la 1, la 13, la 25, la 26 y la 50 de a 20), sin crecer con la profundidad; la fila de `medir-escala.sql` ≈ 1 ms (tope 150); la guarda («sin los dos parciales») cae.
  - e2e completo de escritorio (`e2e-completo.txt`): 933 en verde, 16 saltados y 1 caída (`cotizar-tarea-de-oro-cliente.spec.ts:116`, inestable: 3 de 3 sola, y su hermana `serial`, «did not run» en el completo, 3 de 3 sola; 4-81), 35,2 min. Los cinco dirigidos de oportunidades
    (`leads-oportunidades`, `-ver-todas`, `paneles-salida-con-aviso`, `paneles-foco-al-volver-ficha`, `leads-mover-con-motivo`) pasaron todos.
- **Commits:** `8b6fc9e7` (leer las oportunidades de un lead por cursor), `2a541e14` (medir las oportunidades de un lead con volumen) y `15b46cf8` (el `fix` que pidió la auditoría del informe: la medición mira también la clave primaria).
  e2e completo: sí (4.17-1, estructura, Nivel 2: escritorio, 933 en verde, 16 saltados, 1 caída, 35,2 min)

## 2026-11-05 — Paso 4.15-4: `cotizaciones` partido por área para los carriles B y C

`docs/DECISIONES.md` › «Paso 4.15-4». Refactor sin conducta visible (no es rigor máximo): plan auditado dos veces (bloqueó y después dio observaciones, atendidas), tres decisiones de la persona (P1 a P3,
con la recomendada) y plan aprobado antes de ejecutar. Nivel 1 con interfaz, sin completo.

- **Lo hecho:** 10 áreas y un núcleo; las entradas de cada una en `areas/<x>/{index,client,composicion}.ts`; las tres de la raíz, sólo `export *`; las 8 actions del núcleo importan
  `areas/nucleo/composicion`; las carpetas y la pantalla vacías de cada área; el listado en `entities/listado/` e `infra/listado/` (12 `git mv`, más tres rutas de fuera); `mapa.sh` sigue los `export *`;
  la guarda `scripts/guardas/areas-de-cotizaciones{,-plan}.ts` con su test (39 pruebas); el lint de `client.ts` también para `areas/*/client.ts`; y `docs/plan.yaml`: B y C con sus `areas/<x>/`, el B con
  las 37 rutas del compilador y los validadores, los pasos 4.15-5 y 4.15-6 y sus dependencias (el coordinador da al A 4.15-3, 4.15-4, 4.15-5, 4.16, 4.15-6, 4.17, y a B y C «esperar» hasta el 4.15-5 y el 4.15-6).
- **Verificación** (`.piloto/salidas/4.15-4/`):
  - **S1** (la API, con el compilador de TypeScript): los nombres de `index.ts` (86), `client.ts` (4) y las cuatro pantallas son los mismos que en HEAD; sólo aparecen las 9 pantallas vacías (`exports-diff.txt`).
  - **S2** (`presupuesto-js.spec.ts`, en HEAD y al final): las seis rutas pesan igual, al décimo de KB: `/cotizaciones` 359, `/cotizaciones/nuevo` 456,3, `/cotizaciones/[id]` 442,4, `/vehiculos` 476,7,
    `/perfil` 417,2 y `/leads` 509,6 (`js-head.txt`, `js-despues.txt`).
  - **S3**: las 20 rutas del módulo que nombran `scripts/`, `e2e/`, `supabase/tests/`, las fichas y los docs existen, salvo un ejemplo inventado de `e2e-dirigidos.test.ts:65` que tampoco existía en HEAD (`rutas.txt`).
  - Rojos contra HEAD: la guarda cae en T11 (el árbol) y T12 (`plan.yaml`) y pasan las 37 de fixtures (`rojo-head-guarda.txt`); T13 pasa en HEAD (`mapa-head.txt`) y cae en el árbol del commit 1 con el
    `mapa.sh` de HEAD («`* ./areas/nucleo/index`, … +1», `rojo-mapa.txt`). La primera versión de la guarda confundía `entities/diseno.ts` (núcleo) con la carpeta del área: ahora resuelve contra lo que existe, con su prueba.
  - D1 a D4 (`demostraciones.txt`): un import de `listado` a `formula` y un `export` de más en `index.ts` hacen caer T11 (`tsc`, verde); `export * from '../../composicion'` en `areas/formula/client.ts` y un
    import de `infra/` que no es `*.client` hacen caer `pnpm lint`; un `*.client` pasa.
  - `lint`, `typecheck` y `mapa.sh --check` en verde en cada commit; `pnpm test` entero: 6.316 en verde (536 archivos; sin `.piloto/PARAR`).
  - **Dirigidos**, en escritorio y móvil: los 32 de `e2e-dirigidos.mjs` y, a mano, los 4 `configuracion-cotizacion-niveles*` y `leads-ficha-cotizar` (`dirigidos.txt`): 369 en verde, 7 saltados (entre
    ellos `listas-por-pagina-volumen`, que pide `E2E_VOLUMEN=1`: su cambio es la ruta de un import, que mira `tsc`), 3 caídas y 13 sin correr (hermanas `serial` de las caídas). Las tres, 3 de 3 verdes
    solas (`repetir-*.txt`), y sus specs enteros verdes (`hermanas-*.txt`: 16 y 9). Dos son carreras de la prueba (**4-85**: esperan algo que ya se cumplía); la tercera, en móvil con la carga en 7 a 11 por
    otro stack que se reiniciaba, sin causa medida (**4-86**). 4-81 no cayó.
- **Commits:** `f7afd5a8` (las entradas por área), `a68efe96` (el listado a su área) y `b78cb428` (la guarda).
  e2e completo: no (4.15-4, pantalla, 1 de 3)

## 2026-11-05 — Paso 4.15-5: la guarda de carriles lee docs/plan.yaml

- **Hecho:** `scripts/guardas/carriles.mjs` ya no sabe de «B»: lee `docs/plan.yaml` de la base del PR (`git show <base>:docs/plan.yaml`; sin él, todo PR cae). Un carril que no es base no edita ESTADO, PLAN, DECISIONES ni BITACORA (lo escribe en `docs/pasos/<paso>/`) y crea sólo migraciones de sus dominios (`migraciones` en `plan.yaml`, validadas por `plan-migraciones.mjs`: b `formula, diseno, tablas`; c `papelera, final, comprobantes, comentarios`). P1: en `plan.yaml` sólo suma a su `dueno_de` archivos de las familias del compilador que el PR crea (`carriles-plan.mjs`, `familias-del-compilador.mjs`). P2: sólo toca su `dueno_de`, `docs/` y `compartido` (agrega y edita, no borra). El job `carriles` instala dependencias y corre la guarda de la base en `.guarda-base`.
- **Verificación** (`.piloto/salidas/4.15-5/`): rojos contra HEAD (`rojo-head-plan.txt`, `rojo-head-guarda.txt`); `lint`, `typecheck` y `pnpm test` en verde (537 archivos, 6.330 pruebas); `mapa.sh --check`; la CLI sobre el repo real, ✓ en `b/`, `c/`, `a/` (`cli.txt`); `e2e-dirigidos`: ninguno. Mutaciones del job: sin `preparar` y con la guarda del PR caen en `workflows.test.ts` (`mutacion-preparar.txt`, `mutacion-guarda-del-pr.txt`). El job en CI se mira cuando el PR corra.
- **Abiertos:** 4-84 cerrado; 4-87 (claves del 4.24, del A) y 4-88 (el job lo define el `ci.yml` del PR) nuevos; 4-64 suma `plan.mjs`.
- **Commits:** `0c51e347` (los dominios en `plan.yaml`), `2ab4a2af` (la guarda lee el plan, el job) y `d4e965d6` (lo que un carril no base puede tocar).
  e2e completo: no (4.15-5, scripts y CI, Nivel 1)

## 2026-11-05 — Paso 4.15-6a: los huecos de la hoja (el ⚙ y el enlace de la fórmula)

- **Hecho:** el 4.15-6 se partió en 6a, 6b y 6c (a un commit por intención eran 8). Este 6a: la hoja dibuja el ⚙ de una celda sólo si un área llenó el hueco (`ContextoDelAjuste`, que llena el `Proveedor` del área) y la base le dio `ajustes` a la celda o a su secundario; se abre en `?ajuste=celda&nodo=` y su lugar va con las secciones principales y dentro del modal «Avanzado» (`celdaConAjuste`, que espeja a `celdaConAyuda`); guardar lo suelta; sin proveedor no se llama ningún hook ni cambia el DOM. `<FormulaSinPublicar>` recibe el enlace como `accion` y el de hoy pasa a `features/formula` (`pantallas/formula-hoja.ts`); `nuevo/page.tsx` pierde `BarraConHistorial` (282 líneas) y las dos páginas de la hoja envuelven la pantalla con `ConProveedorDeLaHoja`. `plan.yaml`: tres pasos en cadena y el 4.15-7 (4-87); el 4.17, el 4.20 y el 4.24 dependen del 4.15-6c.
- **Verificación** (`.piloto/salidas/4.15-6a/`): rojos contra HEAD (`rojo-head-sin-publicar.txt`, `rojo-head-ajuste.txt`); `lint`, `typecheck` y `pnpm test` en verde (539 archivos, 6.352 pruebas); `mapa.sh --check` y `coordinador validar`; e2e dirigidos en escritorio y móvil (`e2e-dirigidos.txt`: `cotizar-hoja`, `-ayuda`, `-ayuda-tabla`, `-avanzado`, `-par`, `cotizar-guardada`, `-guardar` y `cotizar-panel-del-cliente`): 138 en verde; `presupuesto-js.spec.ts` al final, sin sonda contra HEAD (`js-despues.txt`): `/cotizaciones` 359 KB, `/cotizaciones/nuevo` 456,8 de 460 (456,7 antes) y `/cotizaciones/[id]` 435,6 de 448; las entradas de la raíz de `cotizaciones` no cambian (`exports-diff.txt`).
- **Abiertos:** 4-87 pasa al 4.15-7; 4-89 nuevo (las pestañas de área de Empresa, para el 4.26); 4-73 sigue (456,8 de 460).
- **Commits:** `8d7d314d` (la barra con historial a su archivo), `96677f42` (el enlace de la fórmula al área formula) y `c72ca8a5` (el hueco del ajuste en la hoja).
  e2e completo: no (4.15-6a, pantalla, 2 de 3)

## 2026-11-06 — Paso 4.15-6b: los huecos de la guardada y del listado, y la guarda de las segundas pantallas

- **Hecho:** la cabecera de una guardada recibe `acciones` (después de «Revisiones», en la misma fila) y `/cotizaciones/[id]` dibuja otro hueco bajo la hoja y fuera del proveedor del ⚙, con lo que exporten `pantallas/{final,comprobantes,comentarios,papelera}-cotizacion.ts`, ordenados en `[id]/huecos-de-la-guardada.tsx` (la papelera, la última); `<ListadoDeCotizaciones>` recibe `junto`, antes de «Nueva cotización», y `/cotizaciones` lo llena desde `pantallas/papelera-listado.ts`. Los cinco son un objeto vacío (`features/<área>/components/huecos-en-*.ts`; se borran los cuatro `.gitkeep`) y nada cambia de pantalla. La guarda de áreas hace caer el árbol con una `pantallas/<área>-<pantalla>.ts` que el carril de su área no posee, y su mensaje dice que la suma el carril base; `areas-de-cotizaciones.test.ts` pasó de 330 a 230 líneas (el plan real y T14, a `areas-de-cotizaciones-plan.test.ts`; el recorrido del árbol, a `areas-de-cotizaciones-arbol.ts`). `plan.yaml`: las cinco pantallas, y `comprobantes-empresa.ts` adelantada, en el `dueno_de` del C; los pasos 4.24 a 4.27 las nombran en sus `modulos`.
- **CI de HEAD al empezar:** el run `42157351490` de `5b27881b` tenía en verde el job Nivel 1 (el rojo de `690e7540` no se repitió); el log de aquel no se pudo leer, y las pruebas de `scripts/guardas` y `scripts/coordinador` pasaron en HEAD (`rojo-head-guarda.txt`: 63 de 64, y sólo cayó T14).
- **Verificación** (`.piloto/salidas/4.15-6b/`): rojos contra HEAD (`rojo-head-guarda.txt`, `rojo-head-cabecera.txt`, `rojo-head-huecos-guardada.txt`, `rojo-head-listado.txt`); D1, T12 cae con los cuatro `*-cotizacion.ts` sin sumar a `plan.yaml` (`demostracion-t12.txt`); `lint`, `typecheck`, `pnpm test` (542 archivos, 6.367 pruebas) y `coordinador validar`; las entradas de la raíz no cambian (`exports-diff.txt`). Dirigidos (`cotizar-guardada`, `-guardar`, `-revisiones`, `cotizar-encima`, `cotizaciones-listado`, `-listado-resumen`, `cotizar-historial-del-vehiculo`) en escritorio y móvil: 39 en verde y 1 caída en cada proyecto, `cotizar-guardada-guardar.spec.ts:128`, por el 4-90 (un cero final en los microsegundos; sola, escritorio dio 1 caída y 2 verdes de 3 y móvil 1 caída y 1 verde de 2, y en el completo pasó). e2e completo de escritorio (`completo.txt`): 935 en verde, 16 saltados (los mismos que en el 4.17-1) y 0 caídas, 35,0 min. JS en frío sin cambio (`js-despues.txt`): `/cotizaciones` 359, `/cotizaciones/nuevo` 456,8 de 460 y `/cotizaciones/[id]` 435,6 de 448.
- **Abiertos:** 4-90 nuevo (la regex de microsegundos de `cotizar-guardada-guardar.spec.ts:142`); 4-87, 4-89 y 4-73 siguen.
- **Commits:** `432488f5` (vigilar las segundas pantallas de cada carril), `f94de531` (abrir los huecos de una cotización guardada) y `5c21fd27` (abrir el hueco junto a nueva cotización).
  e2e completo: sí (4.15-6b, pantalla, 3 de 3: escritorio, 935 en verde, 16 saltados, 0 caídas, 35,0 min)

## 2026-11-06 — Paso 4.15-6c: Configuración › Cotización desde la carpeta del B, las pestañas de Empresa de un área y `empresa/client.ts`

- **Hecho:** la entrada Cotización del hub sale de `configuracion/cotizacion/seccion.ts` (`SECCION_DE_COTIZACION`, con sus dos permisos de hoy); las pestañas de Empresa llevan sus permisos (`PestanaDeEmpresa`, `PESTANAS_DE_LA_EMPRESA` y la lista de un área, `PESTANAS_DE_COMPROBANTES`, vacía, en `configuracion/empresa/comprobantes/pestanas.ts`, del C), la página dibuja las que la persona puede abrir (`pestanasVisibles()`, `alMenosUna()`, `pestanaDe()`) y la sección de un área sale de `comprobantes/seccion.tsx` (da `null`); la entrada Empresa del hub usa `PERMISOS_DE_EMPRESA`; la barra arma sus parsers con las claves que recibe y conserva la URL de hoy; `src/modules/empresa/client.ts` reexporta `guardarTipoCambio` y `EntradaDeGuardarTipoCambio` (el tipo se creó: el plan madre lo daba por exportado), y la regla de `client.ts` (`modulos.md`, `eslint.config.mjs`) admite una Server Action sólo en la raíz de un módulo. `plan.yaml`: la carpeta `configuracion/empresa/comprobantes/` en el `dueno_de` del C y en los `modulos` del 4.26. Sin cambio visible para ningún rol de hoy.
- **CI de HEAD al empezar:** el run `42166198125` de `24e2e40f` cayó sólo en `cotizar-guardada-guardar.spec.ts:128` (el 4-90, que este paso no toca); lint, base, carriles y nivel 1 en verde (`.piloto/salidas/4.15-6c/ci-head.log`).
- **Verificación** (`.piloto/salidas/4.15-6c/`): rojos contra HEAD (`rojo-head-seccion.txt`, `-secciones.txt`, `-pestanas.txt`, `-barra.txt`, `-client.txt`); `lint` y `typecheck` en cada commit; `pnpm test` (545 archivos, 6.385 pruebas, `test-completo.txt`); `mapa.sh --check` y `coordinador validar`; `index.ts` y `pantallas/configuracion-empresa.ts` de `empresa` sin cambio (`git diff`). Dirigidos sin los `-capturas` (`specs-dirigidos.txt`, 37 specs) en escritorio (`e2e-escritorio.txt`: 207 en verde, 3 saltados, 0 caídas, 7,5 min) y en móvil (`e2e-movil.txt`: 158 en verde, 1 saltado, 0 caídas, 5,7 min); corrieron con las funciones levantadas. Sin mutaciones ni informe auditado (pantalla pura). Al lanzar el móvil había un `playwright` de otro checkout (`…/ip/`); no interfirió.
- **Abiertos:** 4-89 suma la pestaña en `configuracion/empresa/comprobantes/` y el límite de la URL; 4-90 sigue (cayó en el CI de HEAD, no en estas corridas); 4-87 y 4-73 siguen.
- **Commits:** `cc90af83` (llevar la sección cotización a la carpeta del carril b), `52b7c3eb` (abrir empresa a las pestañas de un área) y `0574c343` (sacar la action del tipo de cambio por client.ts).
  e2e completo: no (4.15-6c, pantalla, 1 de 3)

## 2026-11-06 — Paso 4.15-7: la clave `cotizaciones.papelera.purgar` y dos huecos para el 4.24

- **Hecho:** la clave `cotizaciones.papelera.purgar` («Vaciar la papelera de cotizaciones», orden 245, global) en la migración `20261106062752_cotizaciones_papelera_purgar.sql`, `seed.sql` y `permisos.ts`; la reciben el dueño y todo rol que tenía `vehiculos.papelera.purgar` (un `notice` dice cuáles), con «todos» y sin origen. `papelera_listar`, `papelera_restaurar` y `papelera_purgar` (la definición de la base con la clave cambiada; sin sesión se sigue purgando) y la rama de cotizaciones de la policy `lotes_papelera: leer` (tres ramas explícitas, sin `else`) la piden; la de vehículos pasa a «Vaciar la papelera de vehículos». `db:probar` corre, tras su lista fija, las pruebas de `supabase/tests/areas/**` (`pruebasEnOrden()`), y `RPC_PAGINADAS` suma `paginas-en-la-base-papelera.ts` (del C, hoy vacío). P1–P4 con la recomendada (compuerta `datos`, «aprobar y ejecutar»).
- **Verificación** (`.piloto/salidas/4.15-7/`): S1 (PGlite ejecuta la migración entera en un `execute`: `s1.txt`); rojos contra HEAD (`rojo-head-sql.txt`, con el mensaje de V en T2; `rojo-head-humo.txt`, con el de V en T5; `rojo-head-scripts.txt`; `rojo-head-catalogo.txt`); 19 corridas de mutación (M1–M17, más M14b y M16b), todas hacen caer su prueba y cada archivo volvió igual (`mutacion-M*.txt`; M17 y D1 en un mismo script, con la demo presente y la salida real de `db:probar`, 1 sin la mutación y 0 con ella: `d1-m17.txt`; la línea «salida» de los demás `mutacion-M*.txt` es la del último comando de la tubería, no la de la corrida); `db:reset`, `db:types` sin diff, `db:probar` (524 bloques, 0 caídas, `verde-db-probar.txt`), `db:lint` sin avisos de la papelera; `lint`, `typecheck` y `pnpm test` (547 archivos, 6.390 pruebas); `mapa.sh --check`, `coordinador validar` y las pruebas de `plan.yaml`; 0 saltadas nuevas. Dirigidos en escritorio (8 specs, 44 en verde, `dirigidos-escritorio.txt`). Completo de escritorio (`completo.txt`): 929 en verde, 16 saltados, 2 caídas, 4 sin correr (la `serial` de una), 35,1 min; las dos caídas (`leads-alta-casos.spec.ts:302` y `vehiculos.spec.ts:106`) no tocan la papelera y pasan 3 de 3 solas (`solas-3x.txt`); el archivo de vehículos entero, 7 de 7 (`vehiculos-spec-entero.txt`).
- **Abiertos:** 4-87 cerrado; 4-91 nuevo (el registro de páginas de otras áreas, 4.27); 4-92 y 4-93 nuevos (las dos inestables del completo).
- **Commits:** `88d73678` (dar a la papelera de cotizaciones su propio permiso de purga), `6da47fda` (correr las pruebas sql de las áreas sin editar la lista) y `2f2f5db8` (abrir el registro de páginas a la papelera de cotizaciones); `751bbf92` (el comentario de la policy en la migración, pedido por la auditoría del informe).
  e2e completo: sí (4.15-7, base, Nivel 2: escritorio, 929 en verde, 16 saltados, 2 caídas, 35,1 min)

## 2026-11-06 — Paso 4.17-2: «Ver más» de las oportunidades de la ficha (cierra 5a-12)

- **Hecho:** la sección «Oportunidades» de la ficha lee 10 en el servidor (`OPORTUNIDADES_VISIBLES_DEL_LEAD`, ahora `TAMANOS_DE_PAGINA[0]`) y «Ver más» trae de a `TAMANO_DE_VER_MAS` (20) desde el navegador con `lead_oportunidades()` y el cursor de la última cargada (`infra/oportunidades.client.ts`), hasta `TOPE_DE_LO_CARGADO` (500); en el tope, «Mostrando las 500 más recientes, las abiertas primero.» y «Buscarlas en tu embudo» (`caminoAlEmbudo()`: el kanban del embudo de la última cargada con `?q=` el nombre del lead). Se fue `?todas=1` con «Ver todas». Lo que vuelve de una action (mover, eliminar, restaurar, crear, guardar) se pone en su lugar con la respuesta, sin `router.refresh()` (`entities/ventana-de-oportunidades.ts` y `useVentanaDeOportunidades`): el orden es el de la base, con los microsegundos del instante (4-90); una página que llega no trae de vuelta una eliminada y se descarta si el servidor cambió lo cargado mientras venía.
- **Preguntas (compuerta `producto`, respondidas con la recomendada):** P1 = 1 (el enlace al embudo), P2 = 1 (se va «Ver todas»), P3 = 1 (recargar con el panel de una oportunidad llegada por «Ver más» abre sólo si está entre las 10).
- **Verificación** (`.piloto/salidas/4.17-2/`): rojos contra HEAD (`rojo-head-commit1.txt`, `rojo-head-vitest-commit2.txt`, `rojo-head-vitest-commit3.txt`, `rojo-head-e2e.txt`: caen E1, E3 y E4 y pasa E2, que no cambia); `lint` y `typecheck` en verde; `pnpm test` (550 archivos, 6.428 pruebas: 6.423 en verde y las 5 de `auto-carriles.test.ts`, 4-83, ajenas al paso; `test-completo.txt`); `mapa.sh --check` y `coordinador validar`. Dirigidos en escritorio y móvil, 65 en verde (`leads-oportunidades`, `leads-mover-con-motivo`, `paneles-salida-con-aviso`, `paneles-foco-al-volver-ficha`; `c2-e2e-dirigidos.txt`) y `leads-oportunidades-ver-todas`, `leads-oportunidades` y `leads-embudo` tras el último commit, 25 en verde (`c3-e2e.txt`).
- **Medido** (E4, 600 abiertas y 400 cerradas): la sección aporta 62,7 KB con 1.000 y 61,7 con 10 (presupuesto 66); cada «Ver más» pesa 15.476 B la 1.ª y 15.465 B la 25.ª; 238 nodos con 10 y 11.509 con 500. Celular: las cuatro pruebas del spec salen IGUAL en escritorio y móvil, pero E4 tiene JS de celular que ninguna otra ejecuta (`huella.txt`, `huella2.json`), así que corre también en el celular y no lleva marca.
- **Abiertos:** 4-83 suma el segundo disparador («todos» con B y C abiertos); 5a-12 cerrado.
- **Commits:** `0fb0f2cf` (poner en su lugar lo que vuelve de una action), `f3dfc7d6` (ver más oportunidades de un lead por cursor) y `4731d681` (llevar al embudo pasadas las 500 oportunidades del lead).
  e2e completo: no (4.17-2, pantalla, 1 de 3)

## 2026-11-06 — Paso 4.17-3: la pestaña «Cotizaciones» de la ficha del vehículo

- **Hecho.** `/vehiculos/[id]` suma la pestaña «Cotizaciones» para quien tiene `cotizaciones.ver` en el origen del vehículo (P1 = 1, contestada con la recomendada; sin la clave no aparece y `?seccion=cotizaciones` abre «Ficha»). Se lee desde
  el navegador al abrirla con `leerHistorialDelVehiculo()` (la ficha no lee cotizaciones), de a 20 con «Ver más» hasta 500 y, en el tope, «Mostrando las 500 más recientes.» con «Ver todas en Cotizaciones». El historial plegable del panel de la hoja
  y la pestaña comparten `usePaginasDelHistorial` y `<ListaDelHistorial>` (commit 1, sin cambio visible). Su cáscara de `diferido()` va en `pestana/diferidos.tsx`. Se ajustó `e2e/vehiculos-alta.spec.ts` (la dueña ve tres pestañas).
- **Verificación** (`.piloto/salidas/4.17-3/`): rojos contra HEAD (`rojo-head-pestanas.txt` y `rojo-head-vitest.txt`: 5 de 6 en Vitest; `rojo-head-e2e.txt`: caen las 4 del spec nuevo); verde en `c1-historial-verde.txt` (12 pruebas del panel antes y después
  del refactor); `lint` y `typecheck` en verde; `pnpm test` (551 archivos, 6.438 pruebas: 6.433 en verde y las 5 de `auto-carriles.test.ts`, 4-83, ajenas; `pnpm-test.txt`); `mapa.sh --check` y `coordinador validar`. Dirigidos en escritorio y móvil:
  157 en verde (`dirigidos.txt`: los 15 specs del plan salvo el nuevo, que tuvo un defecto propio, una prueba que cambiaba de usuario a mitad, y se partió en dos) y el spec nuevo, 10 de 10 (`nuevo-spec.txt`, `medidas.json`). `presupuesto-js` en escritorio, 8 en verde
  (`presupuesto-js.txt`).
- **Medido:** primera respuesta 4.996 bytes en escritorio y 4.912 en móvil (tope 5.250), 61 nodos con 20 (tope 65) y 1.501 con 500 (tope 1.576), la 25.ª respuesta igual a la 1.ª; JS de `/cotizaciones/nuevo` 456,9 KB de 460 (antes 456,8: el reparto del
  commit 1), `/cotizaciones/[id]` 435,6, `/cotizaciones` 359 y `/vehiculos` 476,7.
- **Estado del CI al empezar:** el run de HEAD `c0939a8f` seguía en curso, con Nivel 1, base, carriles y tres de cuatro bloques e2e en verde, y terminó en verde (`success`). El push a `main` del merge del PR #9 (run `42178713690`) había caído en `pnpm test`: su log ya no se pudo leer (`gh run view --log-failed` vacío), así que la causa no está verificada.
- **Abiertos:** 4-94 («Cotizar» desde la ficha del vehículo); 4-73 sigue abierto sin sumarle peso; el pulido del esqueleto doble queda en «Pulido para la Fase 9».
- **Commits:** `54233483` (separar la paginación del historial del pliegue) y `41419f7b` (abrir la pestaña de cotizaciones en la ficha).
  e2e completo: no (4.17-3, pantalla, 2 de 3)

## 2026-11-06 — Paso 4.17-4a: el listado de cotizaciones filtrado por lead, en la base

- **Hecho.**
  - El 4.17-4 se partió en 4a, la base, y 4b, la pantalla: P1 y P2 se contestaron con la recomendada, y el camino tras 500 de la sección del lead es `/cotizaciones?lead=`.
  - `cotizaciones_listado()` suma `p_lead` al final de su firma: `drop` de la de 8 y `create` de la de 9, en `20261106102102_cotizaciones_listado_por_lead.sql`.
  - Con el lead, una sola ruta por `cotizaciones_lead_creado_idx` con la RLS, en los tres bloques, sin la cartera. El vehículo, si llega, es un filtro sobre sus filas.
  - Sigue invocadora y con los mismos privilegios.
  - Las pruebas:
    - L1 con los argumentos;
    - L9: el lead con cada filtro, el cursor en los dos sentidos, la papelera, un lead que no se ve o no existe, «propios» con la cartera compartida;
    - seis casos del lead en `cv_filtros`, contra la regla a mano;
    - la firma de 9 en `auditoria-leads.sql`.
  - La medición:
    - las 5.005 del vehículo muy cotizado son de un lead ajeno;
    - cinco casos del listado por lead;
    - tres de la lectura de la sección del 4b, por PostgREST de a 21.
- **Verificación** (`.piloto/salidas/4.17-4a/`):
  - Rojos contra HEAD:
    - `rojo-head-probar.txt`: 4 caídas con su mensaje, y L3 a L8 en verde;
    - `rojo-head-medir.txt`: cae en el primer caso con `p_lead`.
  - Verde:
    - `db:probar`: 524 en verde (`db-probar.txt`);
    - `db:lint`, `db:carreras` y `db:medir:volumen`;
    - `lint` y `typecheck`;
    - `pnpm test`: 6.433 de 6.438, y las 5 de `auto-carriles.test.ts`, ajenas (4-83);
    - `mapa.sh --check` y `coordinador validar`;
    - los dirigidos en escritorio, 20 en verde (`e2e-dirigidos.txt`), y `listas-por-pagina-volumen.spec.ts` con `E2E_VOLUMEN=1`, 7 en verde (`e2e-volumen.txt`).
  - Mutaciones (`mutaciones.txt`): M1 a M10 caen en `db:probar`, en L1, L9, la visibilidad, la auditoría y `privilegios-de-anon`. M6 y M7 caen también en la medición, por el índice que leen; M7, además, crece de 271 a 42.006 bloques.
- **Medido** (250.000; iguales con 50.000):
  - la dueña, con un lead: 1,1–1,2 ms;
  - Ana, con un lead de su cartera: 2,5 ms; con uno ajeno de 5.005, 50,8 ms (un `en_cartera()` por fila, como el vehículo; tope 100) y 3,7 con «mías»;
  - la sección: la dueña 0,3 ms, Ana 0,9 y Ana con el ajeno 48,1.
- **Estado del CI al empezar:** el run de `c0939a8f` en verde (`success`), según `hechos.json`.
- **Abiertos:** ninguno nuevo. 4-64 suma `cotizaciones-listado.sql` (393), `medir-cotizaciones-listado.sql` (437), `cotizaciones-visibilidad.sql` (1.921) y la función (164 líneas).
- **Commits:** `d7c93e66` (filtrar el listado de cotizaciones por lead) y `f489663a` (medir el listado por lead y la sección del lead).
  e2e completo: no (4.17-4a, base, Nivel 1)

## 2026-11-06 — Paso 4.17-4b: la sección «Cotizaciones» de la ficha del lead y `?lead=` en el listado

- **Qué se hizo.** Pantalla pura, tres commits de código:
  - `/cotizaciones?lead=<guid>` filtra el listado con el `p_lead` del 4.17-4a: fuera del esquema (ni chip ni lo borra «Limpiar»), «Ver todas» lo quita, y el aviso y el vacío salen de `textoDelAviso()` y `textoDelVacio()` (lead, vehículo o los dos; el nombre sólo con `leads.ver`).
  - `leerCotizacionesDelLead()` y el tipo `ListaDe` reparten `usePaginasDelHistorial(de)` y `<ListaDelHistorial de>` entre el panel de la hoja, la pestaña del vehículo y la sección del lead, sin tocar los dos tests del historial.
  - La ficha del lead suma «Cotizaciones» entre «Oportunidades» y «Portal» para quien tiene `cotizaciones.ver` en algún origen (P2: sin origen ni cartera); se lee al abrirla, de a 20 hasta 500, y el tope lleva «Ver todas en Cotizaciones» a `/cotizaciones?lead=` (P1).
- **Estado del CI al empezar:** el run `42209354765` de `dffc62a2` (HEAD), en verde (`success`), leído con `gh run view`.
- **Verificación** (`.piloto/salidas/4.17-4b/`):
  - Rojos contra HEAD: `rojo-head-vitest-1.txt`, `-2.txt` y `-3.txt` (4, 3 y 2 caídas con su mensaje; «otro texto, nada» de `filtros-del-listado.test.ts` y la parte sin clave de E3 pasan contra HEAD, como decía el plan) y `rojo-head-e2e.txt` (E8 y el spec nuevo caen con el `src/` de HEAD).
  - Verde: `lint`, `typecheck`; `pnpm test` 6.453 de 6.458 y las 5 de `auto-carriles.test.ts`, ajenas (4-83; `pnpm-test.txt`); `mapa.sh --check`.
  - Dirigidos, escritorio y celular: el listado (22), el historial (48: `cotizar-historial-del-vehiculo`, `cotizar-panel-del-vehiculo`, `cotizar-guardada`, `vehiculos-cotizaciones`), la ficha, sus presupuestos y `leads-cotizaciones` (10), más `presupuesto-js` en escritorio (`dirigidos-c1c.txt`, `dirigidos-c2.txt`, `dirigidos-c3.txt` y `dirigidos-c3b.txt`; E3 y E8 se partieron en dos por `entrar` con `fresco` dos veces).
  - Completo de escritorio, tras el último cambio de código: 948 en verde, 16 saltados y 0 caídas, 35,3 min (`e2e-completo.txt`).
- **Medido** (`medidas.json`, `medidas-ficha.json`): la sección con 20, 61 nodos y 5.038 B la primera respuesta en escritorio (4.933 en celular); con 500, 1.501 nodos y la 25.ª igual que la 1.ª. Ficha: «Datos» 39,2 KB (sin cambio), «Oportunidades» 37,8 y 61,2 con 1.000, «Portal» 29,7. JS en frío: `/cotizaciones` 359,1, `/cotizaciones/nuevo` 456,9, `/cotizaciones/[id]` 435,7, `/vehiculos` 476,7, `/perfil` 417,2.
- **Abiertos:** ninguno nuevo; 4-75 sigue en el 4.17-5.
- **Commits:** `3c14f037` (filtrar el listado por lead), `cf510328` (paginar las cotizaciones de un lead) y `a790fda8` (abrir la sección de cotizaciones en la ficha).
  e2e completo: sí (4.17-4b, pantalla, 3 de 3: escritorio, 948 en verde, 16 saltados, 0 caídas, 35,3 min)

## 2026-11-06 — Paso 4.17-5a: las revisiones de una cotización desde una fecha, en la base

- **Qué:** el 4.17-5 se partió en 3 (5a la base, 5b `<IrAUnaFecha>` a `src/shared/ui`, 5c la pantalla); este es el 5a. `cotizacion_revisiones()` suma `p_hasta timestamptz` (P1, la recomendada): la página empieza en la más
  nueva de esa cotización con `creado_en < p_hasta`, por el índice nuevo `cotizaciones_revisiones_cotizacion_creado_idx`; sin ninguna antes, va vacía; la guarda va primero. Una sola firma (se borró la de 3).
- **El rojo del CI de HEAD** (run `42220552200`, «Nivel 1»): tres pruebas del tope de 500 del historial agotaban 5.000 ms. `fix` aparte y primero: llegan al tope con dos respuestas y miran por texto, no por rol
  (`.piloto/salidas/4.17-5a/rojo-head-vitest.txt`: caen las tres a 1,5 s con un CPU; `verde-c0.txt`: pasan en 0,6 s).
- **Estado del CI al empezar:** `42220552200` de `155a90c9` (HEAD), en rojo, por esas tres pruebas.
- **Verificación** (`.piloto/salidas/4.17-5a/`):
  - Rojos contra HEAD: F1 a F6 (`rojo-head-probar.txt`: la función de 4 argumentos no existe) y las dos firmas de `auditoria-leads.sql` y `cotizaciones-visibilidad.sql`; los tres Vitest del paso 0.
  - Verde: `lint`, `typecheck`; `pnpm test` 6.452 de 6.458: las 5 de `auto-carriles.test.ts` (ajenas, 4-83) y `mapa.test.ts` T13 por el tiempo con la máquina cargada (5,09 s; pasa sola: `pnpm-test-final.txt`); `db:reset`, `db:types`, `db:probar` (532 pruebas), `db:lint`,
    `db:carreras`, `db:medir` (guardar: 319 buffers y 6,8 ms), `db:medir:volumen`.
  - Mutaciones: M0a y M0b (el hook del historial) y M1 a M9 (la migración), todas caen (`mutaciones.txt`, `mutaciones-sql.txt`).
  - Completo de escritorio (Nivel 2, disparador 6: un índice), tras el último cambio de código: 948 en verde, 16 saltados y 0 caídas, 34,3 min (`completo.txt`).
- **Medido** (`db-medir-volumen.txt`, líneas 1837 a 1859): el salto a una fecha, de 10 a 12 bloques y de 4,7 a 6,7 ms a cualquier profundidad con 5.000 revisiones en la cotización, y lo mismo con 500; sin el índice,
  679 bloques contra 76 (su guarda).
- **Abiertos:** 4-95 (el id de una revisión puede crecer sin `creado_en` en los caminos que escriben sin versión; `statement_timeout` de `authenticated` en la base local: 8 s) y 4-96 (`mapa.test.ts` T13 al borde de 5 s); 4-75 sigue abierto y pasa al 4.17-5c.
- **Commits:** `24d12ed9` (el rojo del CI), `ae981b8b` (la migración y sus pruebas), `846d0c4c` (la medición) y `9af841f4` (F5 y F6 por claves, a pedido de la auditoría del informe).
  e2e completo: sí (4.17-5a, base, Nivel 2: escritorio, 948 en verde, 16 saltados, 0 caídas, 34,3 min)

## 2026-11-06 — Paso 4.17-5b: `<IrAUnaFecha>` y `<DesdeUnaFecha>` a `src/shared/ui`, sin cambio visible

- **Qué:** los dos componentes de la ventana por fecha de la línea de tiempo de leads pasan a `src/shared/ui/ir-a-una-fecha.tsx` y `desde-una-fecha.tsx` (para que el 4.17-5c los use en «Revisiones», 4-75).
  `<IrAUnaFecha>` no cambia y entrega el día (`YYYY-MM-DD`); `<DesdeUnaFecha>` recibe `dia`, `zona`, `ocupado`, `volver` (el texto del botón) y `alVolver` en vez de `Seguimientos`. El aviso del tope se queda en
  `leads` (`aviso-del-tope.tsx`, el `git mv` de `ventana-de-la-linea.tsx`). `diferidos.tsx` pide los tres juntos y una vez (un solo cargador con `Promise.all`), como antes: tras «Ir», «Desde el …» no vuelve a la red.
- **Estado del CI al empezar:** el run `42241262425` de `ec4f4b03` (HEAD), en verde (`success`), leído con `gh run view`.
- **Verificación** (`.piloto/salidas/4.17-5b/`):
  - Pruebas que fijan lo de hoy, en su ruta de hoy y verdes contra HEAD (`verde-head.txt`: 11); llevadas a su ruta nueva, en rojo contra el `src/` de HEAD por el módulo que falta (`rojo-head.txt`: los 3 archivos), y verdes después (`verde.txt`: 13, con `diferidos.test.ts`).
  - El mismo dibujo: una prueba temporal (no commiteada) guarda el `innerHTML` sin ids de los tres componentes con las mismas entradas antes y después; `cmp` sin diferencias (`dibujo-head.txt`, `dibujo.txt`, `e1-cmp.txt`).
  - Verde: `lint`, `typecheck`, `mapa.sh --check`; `pnpm test` 6.462 de 6.468: las 5 de `auto-carriles.test.ts` (ajenas, 4-83) y `mapa.test.ts` T13 por tiempo con la máquina cargada (pasa sola: `mapa-test-sola.txt`; 4-96).
  - Dirigidos, escritorio y celular: `leads-rapido-volumen` (sólo escritorio: en `movil` se salta), `leads-seguimientos` y `leads-rapido-seguimientos`: 22 en verde y 4 saltados (`dirigidos.txt`). En `movil` ningún spec dibuja lo movido: lo cubre el `cmp`.
  - Completo de escritorio (Nivel 2, disparador 1: `src/shared`), tras el último cambio de código: 947 en verde, 16 saltados y 1 caída, 39,7 min (`completo.txt`); la caída, `paneles-foco-al-volver-configuracion.spec.ts:148`, pasa 3 de 3 sola (4-97).
- **Abiertos:** 4-97 nuevo; 4-75 sigue abierto y pasa al 4.17-5c.
- **Commits:** `ee26c849` (las pruebas que fijan lo de hoy) y `a003508d` (el movimiento a `shared/ui`).
  e2e completo: sí (4.17-5b, shared, Nivel 2: escritorio, 947 en verde, 16 saltados, 1 caída, 39,7 min)

## 2026-11-06 — Paso 4.17-5c: «Ir a una fecha» en «Revisiones» de una guardada (cierra 4-75)

- **Qué:** el panel «Revisiones» ofrece «Ir a una fecha» (`<IrAUnaFecha>` de `shared/ui`) mientras hay más hacia atrás o se mira desde una fecha. `hastaDeUnDia()` (`entities/revisiones.ts`, C1) arma el
  `p_hasta` exclusivo; `leerRevisiones` lo manda sólo si llega (C2); `useRevisiones` guarda `desde`, y el salto y «Volver a las más recientes» reemplazan lo leído mientras «Ver más» sigue sin `p_hasta`
  (C3–C5). Un pedido nunca se adelanta a otro: `useTurno` (C6, C7) y `pidiendo` en el estado; si un salto falla, lo leído y su `desde` quedan y «Reintentar» repite ese salto (C8). El hook se parte en
  `ventana-de-revisiones.ts` (puro), `use-turno.ts` y `use-pedidos-de-revisiones.ts`. El panel dibuja «Desde el …» y «Volver a las más recientes» arriba, el aviso del tope con «Para ver anteriores, ve a una
  fecha.», «No hay revisiones hasta esa fecha.» y el error del salto; lo de abajo de la lista es `pie-de-revisiones.tsx`; «Ver más», «Reintentar» e «Ir» quedan apagados con un pedido en vuelo (C9–C12).
- **Estado del CI al empezar:** el run de `ec4f4b03` en verde; el de HEAD (`3c9bbfeb`), `42255781852`, seguía en curso al empezar (no estaba en rojo).
- **Plan:** auditado en dos rondas (la 1.ª bloqueó por C6/C7/H4 contradictorios: se decidió sin adelanto, como `enExclusiva` de la línea de tiempo); `.piloto/planes/4.17-5c.md`.
- **Verificación** (`.piloto/salidas/4.17-5c/`):
  - Pruebas en rojo contra HEAD (`rojo-head.txt`: 17 caídas en entities, infra, hook y panel; P2, la guarda de la condición, verde en HEAD) y e2e E1 en rojo contra el `src/` de HEAD (`rojo-head-e2e.txt`: cae
    sólo E1). Verdes después (`verde.txt`; `verde-e2e.txt`: 22 en verde en `escritorio` y `movil`: `cotizar-guardada-revisiones` y `cotizar-encima`).
  - `presupuesto-js.spec.ts` (escritorio, `verde-presupuesto-js.txt`): `/cotizaciones/[id]` 435,7 de 448 KB, sin cambio.
  - Verde: `lint`, `typecheck`, `mapa.sh --check`, `coordinador validar`; `pnpm test` 6.479 de 6.485: las 5 de `auto-carriles.test.ts` (ajenas, 4-83) y `mapa.test.ts` T13 por tiempo (pasa sola:
    `mapa-test-sola.txt`; 4-96).
- **Abiertos:** 4-75 cerrado. Ninguno nuevo.
- **Commits:** `19234bca` (la lectura desde un día y la ventana del hook) y `facd9f2f` (el panel, el e2e y la ficha).
  e2e completo: no (4.17-5c, pantalla, 1 de 3)

<!-- paso:4.20-1 -->

## 2026-11-06 — Paso 4.20-1: el ⚙ y revertir publican desde la publicada sin pisar el borrador

- **Hecho:** el 4.20 se partió en cuatro (4.20-1 la base; 4.20-2 la pestaña «Fórmula» de Configuración › Cotización; 4.20-3 el ⚙ en la hoja; 4.20-4 vigencia y vehículo obligatorio). Este 4.20-1, sólo base: publicar, el ⚙ y revertir de un origen van en serie por un candado del origen; el borrador recuerda su versión de origen (`formulas.version_origen_id`, la escribe `formula_guardar_borrador()` al crearlo) y publicarlo atrasado da PT409; el conflicto dice quién publicó, qué versión y cuándo (`_version_publicada_por()`), sin «Recarga»; el ⚙ (`formula_cambiar_constante(…, p_publicada_esperada uuid default null)`, una sola firma) publica la N+1 como fila nueva (`_publicar_version()`) sin crear ni tocar el borrador, y el mismo valor da 22023; `formula_revertir()` publica la N+1 como copia de una archivada con su definición, sus params y su diseño, y rechaza la publicada, un borrador, una versión ajena, la esperada nula y un nivel retirado (P7). 4-36: `medir-publicar.sql` compacta `formulas` (`vacuum full`) antes de medir. P1–P7 con las recomendadas; la compuerta `datos`, aprobada.
- **Verificación** (`.piloto/salidas/4.20-1/`): rojos contra HEAD (`rojo-head-publicar-diseno.txt`: 7 ✗, T2 de control verde; `rojo-head-dbmedir-2.txt`: la 2.ª `db:medir` seguida cae); la causa del 4-36 reproducida con `vacuum (truncate false)` entre corridas (`causa-4-36-a2.txt`); 17 mutaciones, todas caen (M17 sobrevivió a la primera y destapó un hueco de T8: `proconfig` nulo; arreglado con `is not true`; M6 también tumba «Dos ⚙ a la vez», `mutacion-M6-carreras.txt`); `db:reset`, `db:types`, `db:probar` (525 ✓) y el job `schema` de cada commit; `db:lint` sin avisos nuevos; `db:carreras` en verde; cuatro `pnpm db:medir` seguidas sin `db:reset`, las cuatro en verde (`final-dbmedir-*.txt`); C11 en 3 tandas × 3 (`medir-c11-*.txt`): topes del ⚙ 60 / 550 ms y 2.300 / 5.200 buffers, de revertir 60 / 600 ms y 2.700 / 21.600 (los de ms pasan los de publicar, 55 / 550, sólo por el redondeo de la regla: las medianas son las de publicar); `lint` y `typecheck` en verde; `pnpm test` 6.379 de 6.385: `auto-carriles.test.ts` (5) cae por los carriles abiertos en la máquina y `historial-del-vehiculo.test.tsx` (1) pasa sola (`test-caidas-solas.txt`). `e2e-dirigidos.mjs` da `modo: completo` (migraciones); ningún spec llama a las funciones cambiadas y el completo lo corre el CI del PR.
- **Abiertos:** 4-36 cerrado; para el 4.20-2, la nota en blanco de revertir da «Publicar pide una nota.» sin `hint` (viene de `_publicar_version()`); para el 4.21, la versión de origen es la publicada al primer guardado, no la que el editor cargó (la esperada de `formula_guardar_borrador()` tiene que cubrir también la creación); 4-8 cerrado en lo del ⚙ y revertir (la versión esperada de `formula_guardar_borrador()` pasa al 4.21); nuevos para el A: las carreras mixtas (⚙ contra publicar el borrador, revertir contra ⚙), la ficha de `cotizaciones`, `migraciones.md` y el título de `medir-publicar.sql` en `scripts/mediciones.mjs`; 4-64 suma `publicar-diseno.sql` (621) y `medir-publicar.sql` (417); 4-33, 4-19 y 4-20 al A, 5a-29 y 5a-30 al pulido, 4-30 al 4.22.
- **Commits:** `e250db82` (repetir medir-publicar sin db:reset), `d1644d37` (publicar la fórmula sin pisar lo que otro dejó) y `4488f75d` (revertir la fórmula a una versión con su diseño).
  e2e completo: no (4.20-1, base, Nivel 1 + cadena db; el completo de escritorio lo corre el CI del PR)

<!-- paso:4.20-2a -->

## 2026-11-06 — Paso 4.20-2a: la pestaña «Fórmula» de Configuración › Cotización, de lectura

- **Hecho:** el 4.20-2 se partió en 4.20-2a (lectura) y 4.20-2b (publicar con nota, descartar y revertir). Este 4.20-2a: Configuración › Cotización se abre también con `cotizaciones.configurar` (el hub y la página); cada pestaña lleva sus permisos («Niveles de acceso» con `equipo.roles.*`, primero; «Fórmula» con `cotizaciones.configurar`) y `?seccion=` que no es de las suyas abre la primera de las suyas; la pestaña «Fórmula» tiene el selector de origen (`?origen=`, también los inactivos), la publicada, el borrador con su versión de origen (atrasado si se publicó otra) y las versiones de a 20 por cursor sobre `formulas_origen_id_version_key` hasta 500, con «Ir a la versión»; los autores, una lectura por página. Sin migración: PostgREST bajo la policy `formulas: leer` de hoy. El enlace de «Falta publicar la fórmula» de la hoja lleva a `?seccion=formula&origen=<id>`.
- **Verificación** (`.piloto/salidas/4.20-2a/`): rojos contra HEAD (`rojo-head-vitest.txt`: 10 pruebas y 5 archivos caen; `rojo-head-e2e.txt`: el spec nuevo y el enlace de `cotizar-hoja.spec.ts` caen); `versiones-por-cursor.sql` (verde contra HEAD a propósito: guarda de forma sobre la base de hoy) cae sin el índice (`caer-sin-indice.txt`) y con la clave en el vecino (`caer-con-el-vecino.txt`); `nivel.mjs`: Nivel 1, interfaz (`nivel.txt`); `lint` y `typecheck` en verde; `pnpm test` 6.497 de 6.503: `auto-carriles.test.ts` (5, los carriles abiertos en la máquina, como en el 4.20-1) y T13 de `mapa.test.ts` por tiempo con `db:probar` corriendo a la vez (sola pasa, `mapa-test-sola.txt`); `db:probar` 543 ✓; los 7 e2e dirigidos en escritorio y móvil, 139 ✓ (`e2e-dirigidos.txt`); la guarda de carriles, 33 archivos cumplen.
- **Abiertos:** para el A, el `EXPLAIN` de la lista en `db:medir:volumen`, la ficha de `cotizaciones` y `origenes/pasos.ts` (`decisiones.md`); para el 4.20-2b, la esperada de `formula_descartar_borrador()`.
- **Commits:** `3fd4d363` (mostrar la fórmula del origen en configuración) y `70c8c2c2` (llevar falta publicar a la fórmula del origen).
  e2e completo: no (4.20-2a, pantalla, 1 de 3)

## 2026-11-06 — Paso 4.18-1: la plantilla de la tarjeta validada y la lectura de la tarjeta, en la base

- **Qué:** `plantillas_tarjeta.definicion` pasa a una forma declarativa (los grupos de la fórmula con su tono, etiquetas y leyendas por nodo, el total, la nota, el logo y
  las columnas) y `validar_plantilla()` la valida con nueve reglas y su juego común `entities/plantilla/casos-de-plantilla.json` (47 casos); guardar el borrador valida la
  forma y publicar, contra la fórmula publicada del origen. `cotizacion_tarjeta(p_formula)` (`security definer`) da lo que dibuja la tarjeta de una versión: la plantilla
  publicada revalidada contra ella (si no, `sin_plantilla`) y sólo lo del nivel «todos»; entra al inventario de lo oculto. `plantillas_tarjeta` la lee sólo quien
  configura el origen. La semilla trae la plantilla de cada origen del cotizador (la de `planilla_usa`, sin la columna del tipo de cambio: S0). El 4.18 quedó partido en 3.
- **Estado del CI al empezar:** el de HEAD (`7fd8d5e6`, run `42264981799`) en verde.
- **Plan:** auditado en dos rondas (la 1.ª bloqueó: la tabla legible por todos y una mutación equivalente; la 2.ª, observaciones); compuertas `producto` (P1–P8, todas con
  la recomendada), `datos` (aprobada) y `producto` S0 (la recomendada). `.piloto/planes/4.18-1.md`.
- **Verificación** (`.piloto/salidas/4.18-1/`):
  - Pruebas en rojo contra HEAD (`rojo-head.txt`: 14 caídas, las 12 nuevas, H1 y el inventario) y verdes después (`verde-3.txt`, 127 bloques con K6;
    `db-probar-final.txt`, entero). La auditoría del informe pidió endurecer K5 y rehacer K6 (una versión con el `total_en` a otra moneda): commit `fix` aparte.
  - Mutaciones: las 22 del plan y M23 (la moneda de un bucket) caen con su prueba y su mensaje (`mutaciones.txt`, arnés `mutar.py`).
  - `db:reset`, `db:types`, `db:lint` (0 errores; ningún aviso en las funciones nuevas: `db-lint.txt`); `nivel.mjs --rango`: Nivel 2, disparador `rls` (`nivel.txt`).
  - `lint` y `typecheck` en verde; `pnpm test` 6.526 de 6.531: las 5 de `auto-carriles.test.ts` (ajenas, 4-83); `mapa.sh --check` y `coordinador validar` en verde.
  - El completo de escritorio (`e2e-completo.txt`, con `db:carreras` en verde al empezar; `E2E_PORT=3510`: el 3210 lo tenía el e2e de otro proyecto, `puerto-3210.txt`): 950 en verde, 16 saltados, 1 caída y 3 sin correr (las
    que siguen en el mismo archivo serial), 35,2 min. La caída es el 4-90 (`cotizar-guardada-guardar.spec.ts:128`: «…59.95153+00:00», cinco dígitos de microsegundos);
    ese spec y la tarea de oro, 3 de 3 solos (`e2e-dirigidos-repetir.txt`, 27 en verde).
- **Docs del carril B:** se consolidaron `docs/pasos/4.20-1` y `4.20-2a` (`consolidar-docs.mjs`) antes de esta entrada.
- **Abiertos:** 4-45 y 4-55 decididos (P5, P6), 4-50 a «Pulido para la Fase 9» (P7), 4-64 suma; al 4.19, la versión esperada de las dos RPC de la plantilla, el
  `validarPlantilla()` de TS y el aviso del tono borrado.
- **Commits:** `9dd7ff9c` (validar la plantilla), `b6c1ca62` (leer la tarjeta), `04ff5247` (la policy) y `eec9945` (el `fix` de K5 y K6 que pidió la auditoría del informe).
  e2e completo: sí (4.18-1, base, Nivel 2: escritorio, 950 en verde, 16 saltados, 1 caída, 35,2 min)
