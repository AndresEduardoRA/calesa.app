# Plan por fases

El plan vivo: sólo lo que falta. Cada fase tiene un criterio de terminado verificable (algo que se puede correr y ver); las metas de las
tareas de oro de `docs/UX.md` son criterio de terminado de su fase y se miden con un e2e. El alcance es todo el brief; no hay MVP: hay orden.
Fases 0 a 4 completas (la 4 cerró el 2026-11-08 con el 4.28; su «Partición» y sus cerrados siguen abajo hasta pasar al archivo): el detalle (lo hecho, lo cerrado y la historia), en `docs/archivo/PLAN.md`
(sólo con grep). **Las fases 5 a 9 están partidas en pasos y abiertas a la vez** («Carriles de las fases 5 a 9», abajo; quién hace cada paso y
de qué depende, en `docs/plan.yaml`): cada carril avanza **un paso a la vez** y sigue con el siguiente **sin parar a reportar**; el reporte
queda en el registro (`.piloto/registro.md`) y en el tablero del coordinador. Un paso que no cierra se aparca y el carril sigue con otro
(`docs/PILOTO.md` › «De corrido»). El cierre de cada fase espera el CI de `main` en verde. Los pasos tachados o cerrados no están aquí.

---

## Fase 4 — Cotizaciones

Módulo `cotizaciones`: motor del grafo en `entities/` (hecho); editor de la fórmula en configuración (nodos, constantes, tablas de
referencia editables inline, borrador / publicar con nota / historial / revertir); `XCell` (hecha); wizard de cotizar (origen → vehículo
por link/inventario/manual → lead → hoja → resumen con modo de TC y Live); guardar preventa con snapshot; editar recalcula con SU versión;
cotizar encima (versión N+1); plantilla de tarjeta versionada y PDF en servidor con `@react-pdf/renderer`; compartir (texto + PDF);
comentarios anidados, adjuntos, favoritos, reportes, revisiones con diff; marcar final (RPC) y comprobantes de venta. **Al marcar la
cotización final, el lead pasa a la clase «cliente» (el primer tipo activo de esa clase por orden): el sistema razona por la clase del
tipo de lead (`tipos_lead.clase`), nunca por su nombre ni su clave, que la empresa configura** (9j).

**Terminado cuando:** cotización completa ≤ 90 s con link de subasta y sólo teclado en la hoja; el total del PDF es la suma de las líneas
del snapshot (e2e lo verifica); cambiar una constante desde el ⚙ publica v2 y la cotización abierta sigue usando v1 hasta recotizar; un
vehículo tiene a lo sumo una final activa; el motor da, al centavo, los totales que guarda el Excel para sus cuatro cotizaciones
(`docs/referencias/excel-de-cotizacion.md`). La entrada por `Ctrl/Cmd+K → «Nueva cotización»` es de la Fase 7 y no entra en este
criterio. **Desde D7:** los dos diseños de la semilla (el del cotizador actual y el del Excel) se dibujan sin sus defectos a 412 y 1.280 px,
al 100 y al 200 %; quien no tiene un nivel no recibe sus valores por ninguna lectura (`cotizaciones-visibilidad.sql`); el recálculo en la
base cumple su tiempo (4.06, hecho).

**Hito 4-A al cerrar el 4.18:** se cotiza de punta a punta con la fórmula y el diseño de la semilla, con su PDF; corre un **Nivel 2** y la
BITACORA lo anota como «hito 4-A».

**Verificación de los pasos de la Fase 4:** los niveles son los de `.claude/rules/e2e.md` (Nivel 1, 2 y 3). «Cadena db» = una migración nueva,
`db:reset`, `db:types` y `db:probar` (más `db:carreras` cuando hay carrera). Cada paso de pantalla anota en la BITACORA su marca
`e2e completo: sí|no (<paso>, <tipo>, N de 3)`: la cuenta de pantallas sin e2e completo vuelve a 0 con cada completo y a los 3 se corre
uno (hoy: **0 de 3**: el 4.28 corrió el Nivel 3 del cierre). Compuerta `dependencia` para subir una dependencia
(el piloto no las sube).

**Decisiones de apertura vigentes** (la persona, 2026-10-22; `docs/DECISIONES.md`, «Apertura de la Fase 4 — Cotizaciones» y «D7»):

- **D1 Sin estado comercial nuevo.** «Vencida» = `creado_en` + `vigencia_dias` de la empresa (7 por defecto). Se ve en el listado, la
  tarjeta y el PDF, y una vencida se recotiza encima (N+1).
- **D2 «Desactualizada»** (no es «vencida»): una nueva cuya fórmula publicada o un tipo de cambio cambió desde que se abrió la hoja. La
  pantalla ofrece «Usar la versión N+1» o «Guardar con la N». Editar una vieja avisa de su versión (P7 del 4.15, hecho en el 4.15-3b): dice cuál usa y cuál es la de hoy, o que venció, y ofrece «Cotizar encima».
- **D3 El lead es obligatorio siempre.** El vehículo también, salvo que el ajuste «Vehículo obligatorio al cotizar» diga que no (por
  defecto dice que sí; lo cambia `cotizaciones.configurar`); una final lo exige siempre. «Cargar a mano» y el link de subasta crean el
  vehículo en el inventario.
- **D4 La hoja replica el Excel** con el grafo como modelo y `validar_formula` como candado: columnas de concepto, monto, tipo de cambio
  por fila o grupo, plazo de pago, USD, Bs, subtotales por grupo y total; varios tipos de cambio; valores sugeridos que el asesor
  sobrescribe; impuestos como nodos; las dos monedas en la hoja y en el PDF; fórmulas como texto con nombres («=(remate+fees)\*4%», SUMA
  de un grupo), compiladas al mismo grafo, sin referencias A1. Los modos los declara el diseño (D7).
- **D5 Editar una tabla de referencia publica la N+1** de cada fórmula de su origen que la usa, con una nota automática y una opcional de
  la persona. La fórmula congela en `params` las filas que usa.
- **D6 Número de cotización global y visible.** Una serie de comprobantes por empresa, configurable en Empresa («A» por defecto).
- **D7 La hoja configurable:** cada origen tiene un **diseño de la hoja**, declarativo y versionado con su fórmula; los **niveles de
  acceso** que crea la empresa (sembrados «todos» y «costos») son permisos de la matriz de Roles, y lo que alguien no puede ver no viaja;
  **la fórmula viaja sólo a quien tiene `cotizaciones.configurar`** y la hoja calcula en la base para todos (`evaluar_formula()`); los
  **tipos de cambio** son una lista de la empresa (oficial, paralelo, unificado, aduana…) y los **modos** los declara el diseño;
  **«Oficina» no es un paso**: es un origen; un **tono por grupo**, de un catálogo que la empresa edita (con validación AA); una fórmula
  por origen con su nodo de **variante**. Inventario de lo que se reproduce: `docs/referencias/cotizador-actual.md`.

**Escala:** unos 100 asesores × 15 por día × 300 días ≈ **450.000 cotizaciones por año**. Se siembra con 50.000 y con 250.000, y se asserta
que la página no crece entre los dos volúmenes. Se mide como la dueña («todos»), una asesora con 5.000 propias, la «chica» con 3, un lead
con 1.000 cotizaciones, un vehículo con 300 preventas y una cotización con 1.000 comentarios y 500 revisiones. El listado no lee el
snapshot.

### Tabla de criterios

Cada criterio de «Terminado cuando» y de la tarea de oro 2 (`docs/UX.md`) con la prueba que lo mide y su resultado en el Nivel 3 del 4.28 (los dos proyectos
salvo donde se dice; «base» = `db:probar` o `db:carreras`, que corren en el CI de cada PR).

| Criterio                                                                              | Prueba                                                                                                                                                                                                                                                                                          | Proyectos      | Resultado                                                                |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------ |
| Cotización completa ≤ 90 s con link de subasta y sólo teclado                         | `cotizar-tarea-de-oro-recorrido.spec.ts` › «E2E R1 la asesora, la tarea de oro 2 entera con un enlace de Copart…»; el tramo, `cotizar-tarea-de-oro-enlace.spec.ts` › «tarea de oro 2 con un enlace de Copart…»                                                                                  | los dos        | verde: escritorio 56 teclas de control y KLM 56,7 s; celular 53 y 54,5 s |
| Quien configura también en ≤ 90 s (ve los ⚙ y «costos»)                               | `cotizar-tarea-de-oro-recorrido.spec.ts` › «E2E R2 la dueña, la misma tarea con un vehículo del inventario…»                                                                                                                                                                                    | los dos        | verde: escritorio 52 teclas y KLM 41,1 s; celular 49 y 37,5 s            |
| Cada celda editable se alcanza con el teclado; el PDF en 1 clic                       | `cotizar-tarea-de-oro.spec.ts` › «cada celda editable de la hoja y de «Avanzado» se alcanza con Tab, en orden» y «tarea de oro 2: de la hoja abierta…» (llega al PDF)                                                                                                                           | los dos        | verde en los dos                                                         |
| El total del PDF es la suma de las líneas del snapshot                                | `cotizar-pdf.spec.ts` › «E2E en «Unificado»… la suma de las filas es el total…» y «E2E si lo de hoy no es lo guardado, el PDF lleva lo guardado»; en «Paralelo» el total es Bs ÷ el tipo de cambio del total (D4): «E2E en «Paralelo» el total del PDF es Bs ÷ el tipo de cambio del total…»    | los dos        | verde en los dos                                                         |
| Cambiar una constante desde el ⚙ publica v2 y la abierta sigue con v1 hasta recotizar | `cotizar-ajuste-constante.spec.ts` › «E1: cambia el valor por defecto sin tocar esta cotización…»; `cotizar-guardada.spec.ts` › «E2E tras publicar la versión siguiente de la fórmula, la guardada sigue dibujando SU versión»                                                                  | los dos        | verde en los dos                                                         |
| Un vehículo tiene a lo sumo una final activa                                          | `supabase/tests/areas/final/crear.sql`, `marcar-candados.sql` › «marcar final: la final anterior baja por id…» y las carreras de `supabase/tests/areas/final/carreras*.mjs`                                                                                                                     | base           | verde en el CI del 4.25 y en el `db:carreras` del completo               |
| Al marcar final el lead pasa a la clase «cliente» (9j)                                | `cotizaciones-final-marcar.spec.ts` › «E1 la dueña la marca: la cabecera dice «Final» y la base quedó como marcar»; `crear-candados.sql` › «crear una final: con el vehículo a mano… el lead pasa a cliente…»                                                                                   | los dos y base | verde en los dos                                                         |
| El motor da al centavo los cuatro totales del Excel                                   | `src/modules/cotizaciones/entities/semilla-cifras.test.ts` › «planilla_usa reproduce los totales que guarda el Excel…»                                                                                                                                                                          | Vitest         | verde (`pnpm test`, hook de Stop)                                        |
| Los dos diseños de la semilla sin defectos a 412 y 1.280 px, al 100 y al 200 %        | `cotizar-hoja-200.spec.ts` › «la hoja de ${clave} al ${zoom} % cabe, no corta nada…»                                                                                                                                                                                                            | los dos        | verde en los dos                                                         |
| Quien no tiene un nivel no recibe sus valores                                         | `supabase/tests/cotizaciones-visibilidad.sql`; `cotizar-hoja-niveles.spec.ts` › «…quien ve «todos» no recibe ni un id, una etiqueta ni un valor…» y «en la fórmula sembrada de la subasta…»; `cotizar-pdf.spec.ts` › «E2E la asesora y la dueña, que ve «costos», descargan las mismas líneas…» | los dos y base | verde en los dos                                                         |
| El recálculo en la base cumple su tiempo                                              | `supabase/tests/medir-evaluar.sql`                                                                                                                                                                                                                                                              | base           | medido en el 4.06; no se repite en el cierre                             |
| Hito 4-A: de punta a punta con la fórmula y el diseño de la semilla, con su PDF       | `docs/BITACORA.md` › el 4.18-3b (completo de escritorio, 980 en verde)                                                                                                                                                                                                                          | escritorio     | hecho en el 4.18                                                         |

La entrada por `Ctrl/Cmd+K → «Nueva cotización»` es de la Fase 7 y no entra en la tabla.

### Cierre de la Fase 4

**Fase 4 cerrada el 2026-11-08** con el Nivel 3 del 4.28, corrido por proyecto (cada uno desde `db:reset` y `db:carreras`) para medir 5a-4b: escritorio,
sobre `d3852065`, 1.046 en verde, 16 saltadas y 0 caídas en 38,6 min (39,5 de reloj); celular, sobre `d3852065`, 763 en verde, 21 saltadas, 2 sin correr y
1 caída en 29,9 min (30,9 de reloj). La caída (`equipo-busqueda-minima.spec.ts:98`, al 200 %) pasó 3 de 3 sola: inestable. Su síntoma destapó un defecto real
—el formulario de ingreso enviado antes de hidratar iba por GET, con la contraseña en la URL—, arreglado en el paso (`2bfef1ed`, `method="post"` en los
cuatro formularios de auth, con su prueba en `acceso.spec.ts`); por tocar auth se repitió el completo de celular sobre `2bfef1ed`: 767 en verde, 21 saltadas y 0 caídas en 29,9 min (30,9 de reloj). La tarea de
oro 2 entera (`cotizar-tarea-de-oro-recorrido.spec.ts`): la asesora con un enlace de Copart, 56 teclas y KLM 56,7 s; la dueña con un vehículo del
inventario, 52 teclas y KLM 41,1 s (escritorio; en el celular, 53 y 54,5 s, 49 y 37,5 s). Los abiertos que quedan, abajo, en «Abiertos de la Fase 4».

### Partición

Un paso, un commit y su verificación; no se para a reportar entre pasos (el registro lo dice); la puerta de fase es el CI en verde. Los niveles son los de `.claude/rules/e2e.md`. Hecho:
4.01 a 4.13 y DEP-1 (ver `docs/archivo/PLAN.md`; el 4.13, abajo hasta que pase al archivo). **Orden fijo: papelera propia (4.24) → marcar final
(4.25) → comprobantes (4.26)** (la final manda las preventas a la papelera, y un comprobante sólo se emite de una final). Lo que ya existe y
los siguientes pasos usan: `cotizacion_hoja(origen)`, `cotizacion_evaluar` (recortada por nivel, con `p_abierta`), `cotizacion_crear`,
`cotizacion_guardar`, `cotizacion_leer`, `cotizacion_revisiones`, `formula_para_cotizar`, `cotizacion_tabla`, `_nodos_visibles()`, los
niveles (`cotizaciones_niveles`, `cotizaciones.nivel.<clave>.ver|editar`), `src/shared/ui/xcell`, `leerNumeroTipeado()`, `?panel=avanzado` y `?ayuda=texto|tabla&nodo=`
de la hoja, la tarea de oro 2 del tramo de la hoja (`e2e/cotizar-tarea-de-oro.spec.ts`) y el presupuesto de JS de `/cotizaciones/nuevo` (460 KB, `e2e/soporte/presupuestos.ts`).

- **4.13** (hecho el 2026-10-29) — La hoja dibujada desde el diseño, en 12 prompts; hechos el 1 (la lectura que abre la hoja), el 2 (la hoja dibujada y el recálculo),
  el 3a (lo que la base da antes de guardar), el 3b (guardar, la pantalla), el 3c (`XCell` y parser) y el 4a («Avanzado» en un modal con
  `?panel=avanzado` y la ayuda de texto con `?ayuda=texto&nodo=`), el 4b1 («Ver total Bs» en la base: `cotizaciones.ver_total_bs`, en
  `cotizacion_crear` y `cotizacion_guardar`; Nivel 2, con el completo de escritorio) y el 4b2 (la moneda del total en Bs en la lectura:
  `cabecera.moneda_bs` de `cotizacion_hoja()`; Nivel 1, base) y el 4b3 (los modos con el primero marcado, «Ver total Bs» en la hoja y el resumen
  fijo, al pie y al costado; Nivel 1) y el 4c1 (`cotizacion_tabla` con la hoja abierta y `cotizaciones.ver`; Nivel 1, base) y el 4c2 (la ayuda de una tabla, la pantalla: el botón «Ayuda de X»,
  `?ayuda=tabla&nodo=`, el panel de sólo lectura con la hoja abierta; Nivel 1) y el 4d (la tarea de oro 2 con teclado, tramo de la hoja; el presupuesto de JS de la hoja, 460 KB;
  los dos diseños a 412 y 1.280 px, al 100 y al 200 %; 4-44 (b); Nivel 1 con el completo de escritorio): hechos; ver archivo y, del 4a
  al 4c2, `docs/DECISIONES.md` › «Paso 4.13 (4a de 9)», «Paso 4.13 (4b1 de 10)», «Paso 4.13 (4b2 de 11)», «Paso 4.13 (4b3 de 11)», «Paso 4.13 (4c1 de 12)»,
  «Paso 4.13 (4c2 de 12)» y «Paso 4.13 (4d de 12)» y BITACORA. Marcas: 4a `1 de 3`; 4b1 `sí`
  (el completo de escritorio por su Nivel 2: la cuenta vuelve a 0); 4b2 `no` (base, Nivel 1: la cuenta sigue en 0); 4b3 `1 de 3`; 4c1 `no` (base, Nivel 1: la cuenta sigue en 1); 4c2 `2 de
3` (hecha); 4d `sí` (el completo de escritorio, por la cuenta: vuelve a 0). El ⚙ no se abre hasta el 4.20 (sin callback la `XCell` no dibuja el botón). Sin paso
  «Oficina». Los paneles de vehículo y cliente son del 4.14: aquí el lead llega preseleccionado desde su ficha y el vehículo, como diga el ajuste
  (la lectura lo trae). Para el prompt 4 (de 3c, `docs/DECISIONES.md`, «Paso 4.13 (3c de 6)»): un número tipeado se lee con
  `leerNumeroTipeado(texto, locale)` (`src/shared/lib/numero-tipeado.ts`) y lo guardado se abre con `formatearParaEditar` y el locale; la `XCell`
  tiene un candado por lado (`secondaryDisabledReason`). El diseño recortado es una lectura propia y está en el inventario de
  `cotizaciones-visibilidad.sql`. Depende de 4.10 y 4.12. Nivel 1 (el 4b1, **2**). Prompts: 12 (hechos).
  - **P1** (contestada el 2026-10-28; hecha en el 4b3): la hoja abre con el primero de los modos que declara el diseño, marcado.
  - **P2** (contestada el 2026-10-28; hecha en el 4b1): «Ver total Bs» se guarda con la cotización (`cotizaciones.ver_total_bs`, `not null default false`).
  - **P4** (contestada el 2026-10-29; hecha en el 4b2): el total en Bs se escribe con la moneda `a` del tipo de cambio de `total_en` de la versión,
    `cabecera.moneda_bs`.
  - **P5** (contestada el 2026-10-29; hecha en el 4b3): «Ver total Bs» nace apagado cuando el diseño lo ofrece.
  - **P6** (contestada el 2026-10-29; hecha en el 4b3: sin `cabecera.moneda_bs` la hoja no dibuja «Ver total Bs» y guarda `ver_total_bs` en falso, la 1): qué hacía la hoja cuando el diseño ofrece «Ver total Bs» y `cabecera.moneda_bs` es nula (la versión no tiene `total_en`, o su
    tipo de cambio no existe o está inactivo; ojo: `totales.bs` puede tener valor igual, porque el Bs sale del tipo de cambio de cada bucket). Hoy
    sólo `subasta_usa` ofrece el interruptor y tiene `total_en`; el diseño lo permitiría. (1) No dibujar el interruptor y guardar `ver_total_bs` en
    falso (recomendada); (2) dibujarlo con la moneda base de la empresa, lo que hace hoy `binding.ts`; (3) una regla nueva del diseño: ofrecerlo
    exige `total_en` (`validar_diseno()` y `validarDiseno()`; cubre una sola de las dos causas y es otro paso de base).
  - **P7** (contestada el 2026-10-29; hecha en el 4b3): el tope de nodos de la hoja es lo medido con la hoja usada en el peor caso (el segundo modo y «Ver total
    Bs» encendido) más un 5 %, con techo 500; si se pasa de 500, se para y se reporta. **P8** (contestada el 2026-10-29; hecha en el 4b3): medido 481 usada
    (506 con el 5 %), el tope queda en el techo, 500 (4,0 % de margen).
  - **P3** (contestada el 2026-10-29; hecha en el 4c1): la lectura recortada por nivel ya existía (`cotizacion_tabla`, 4.10-1, en el inventario de lo oculto); la
    ayuda de una tabla lee **la versión de la hoja abierta** (`p_abierta`, como `cotizacion_evaluar`), no la publicada.
  - **P9** (contestada el 2026-10-29; hecha en el 4c1): el tope de bytes de `cotizacion_tabla` con 1.000 filas para una asesora con «costos» es lo medido más un
    5 %, 52.752 (el provisional de 48 KB no cabía por el relleno de la medición). Las P10 a P12 eran P4 a P6 en el plan del 4c.
  - **P10** (contestada el 2026-10-29; hecha en el 4c1): `cotizacion_tabla` por origen pide también `cotizaciones.ver` del origen, la puerta de la hoja.
  - **P11** (contestada el 2026-10-29; hecha en el 4c2: medido 468 al abrir y 490 usada, 2,0 % de margen): la ayuda de una tabla suma ~3 nodos por celda: sigue si la
    medida queda ≤ 500 y se para sólo si pasa.
  - **P12** (contestada el 2026-10-29; hecha en el 4c2): la ayuda de una tabla es de sólo lectura (no escribe un valor en la celda).
  - **P13** (contestada el 2026-10-29; hecha en el 4c2): con el Modo Live, las cifras de la ayuda de una tabla se tapan como las de la celda que la abre: si es
    dinero, pasan por `<Monto>` con la moneda de la celda; si no (un factor, `raw`), quedan a la vista.
- **4.14** — Los paneles del vehículo y del cliente (cursor, nunca «Página N de M»). Vehículo: link o lote (apibara grabado), un nombre,
  «+» y «cargar a mano», que crean el vehículo (D3); «Últ. cotización» por `vehiculos.cotizado_en` con su índice
  `vehiculos_cotizado_idx (origen_id, cotizado_en desc, id desc)`; «Cierre subasta» por la columna generada `vehiculos.cierre_subasta_en` con
  `vehiculos_cierre_subasta_idx (origen_id, cierre_subasta_en, id)`; el historial del vehículo con `cotizaciones_vehiculo_creado_idx
(vehiculo_id, creado_en desc, id desc)`, que reemplaza a `cotizaciones_vehiculo_idx`; «Cotizado (n)» por `limit n + 1`. Cliente: `leads_candidatos()` (3 letras, `#n`); sin buscar, «míos» por lo más reciente (`reciente_en`: el último seguimiento o el alta); pestañas por clase, el tipo como
  etiqueta y «+» que abre «Nuevo lead». Se entra desde la ficha del lead y desde el resumen del vehículo. Cierra **4-10** (el tipo de
  vehículo de la subasta). Depende de 4.13. Nivel **2** (esquema) + `db:medir:volumen`. Prompts: 12 (quedan 0).
  **Partido en 3** (`docs/DECISIONES.md` › «Paso 4.14 (1 de 3)»): el **4.14-1** (la base del panel del vehículo: `vehiculos.cotizado_en` con su trigger, que no mueve la
  versión de la ficha ni audita; `vehiculos.cierre_subasta_en`, generada; los índices de «Últ. cotización», «Cierre subasta» y el historial; Nivel 2 + `db:medir:volumen`):
  hecho. El **4.14-2** se parte en tres (`docs/DECISIONES.md` › «Paso 4.14 (2a)»): el **4.14-2a** (el cursor por columna en `src/shared`, la barra y el panel del vehículo
  con «Últ. cotización» y «Cierre subasta»; Nivel 2): hecho. El **4.14-2a2** (4-49, el foco tras recargar y «atrás» en un panel por URL, en `src/shared/ui`; Nivel 2):
  hecho. El **4.14-2a3** (la vuelta desde un menú, el panel de filtros y los 4 hooks de `vehiculos`; Nivel 2; `docs/DECISIONES.md` › «Paso 4.14 (2a3)»): hecho. El
  **4.14-2a4** (los paneles del listado de leads: «Nuevo lead», etiquetas, exportar, la acción de fila, el embudo y el lead rápido; Nivel 1; `docs/DECISIONES.md` › «Paso
  4.14 (2a4)»): hecho. El **4.14-2a5** (los 5 hooks de la ficha del lead, con las pestañas del rápido; 4-58 y 4-59; Nivel 1; `docs/DECISIONES.md` › «Paso 4.14 (2a5)»): hecho. El **4.14-2a6** (los 3 hooks de configuración, el guardián sin pendientes y F6; Nivel 2; `docs/DECISIONES.md` › «Paso 4.14 (2a6)»): hecho. El **4.14-2b** (el historial del elegido, «Cotizado (n)» y «Cotizar» desde el resumen del vehículo; Nivel 1; `docs/DECISIONES.md` › «Paso 4.14 (2b)»): hecho. El **4.14-2c** se parte en tres (`docs/DECISIONES.md` › «Paso 4.14 (2c)»): el **4.14-2c1** (buscar por nombre, VIN o lote, traer de la subasta, «+» a mano, crear y elegir, y el tramo del panel de la tarea de oro 2 con un vehículo buscado por nombre; Nivel 1): hecho. El **4.14-2c2** (la celda de tabla dice qué dato del vehículo casa con su tabla, `dato_del_vehiculo`; las filas, por `cotizacion_tabla`; Nivel 1 + cadena db, con el completo; `docs/DECISIONES.md` › «Paso 4.14 (2c2)»): hecho. El **4.14-2c3** (el tipo de vehículo en el panel, P6 y P3; la tarea de oro 2 con un enlace de subasta; cierra 4-10; Nivel 1; `docs/DECISIONES.md` › «Paso 4.14 (2c3)»): hecho. El **4.14-3** se parte en tres (`docs/DECISIONES.md` › «Paso 4.14 (3a)»): el **4.14-3a** («míos» del panel del cliente por lo más reciente: `leads_asesores.lead_reciente_en` con su índice y `reciente_en` en las dos vistas; Nivel 2 + cadena db + `db:carreras` + `db:medir:volumen`): hecho. El **4.14-3b** (el panel del cliente sobre la hoja: «míos» por lo más reciente con pestañas por clase, la búsqueda por nombre o `#n`, el tipo como etiqueta, elegir y quitar; Nivel 1; `docs/DECISIONES.md` › «Paso 4.14 (3b)»): hecho. El **4.14-3c** («Nuevo lead» desde el panel del cliente, que elige al creado; «Cotizar» en la ficha del lead; el texto de «Guardar» sin cliente y el tramo del cliente de la tarea de oro 2; Nivel 1; `docs/DECISIONES.md` › «Paso 4.14 (3c)»): hecho. Con él el 4.14 queda entero; la cuenta, la de `cuenta-e2e.mjs`. Marcas: 4.14-1 `sí`, 4.14-2a `sí`, 4.14-2a2 `sí`, 4.14-2a3 `sí`, 4.14-2a4 `sí`, 4.14-2a5 `sí`, 4.14-2a6 `sí`, 4.14-2b `no` (pantalla, `1 de 3`), 4.14-2c1 `no` (pantalla, `2 de 3`), 4.14-2c2 `sí`, 4.14-2c3 `no` (pantalla, `1 de 3`), 4.14-3a `sí`, 4.14-3b `no` (pantalla, `1 de 3`), 4.14-3c `no` (pantalla, `2 de 3`).
  - **P1** (3a, contestada el 2026-10-31; hecha en el 4.14-3a): «míos» sin buscar se ordena por el último seguimiento del lead y, sin ninguno, por cuándo se creó (`reciente_en`).
  - **P2** (3a, aprobada el 2026-10-31; hecha en el 4.14-3a): el orden se sostiene con una copia en la cartera, `leads_asesores.lead_reciente_en`, con su índice por persona y triggers `security definer`.
  - **P3** (3a, aprobada el 2026-10-31; hecha en el 4.14-3a): no se toca `trg_leads_asesores_cartera_cambio`; se midió su costo (0,1 ms y 144/147 buffers más por seguimiento, tope 250).
  - **T1–T3** (3a, contestadas el 2026-10-31; hechas en el 4.14-3a): los topes de lo medido pasan a 2.500 buffers para la pestaña por clase (1.535–1.551), 250 buffers por seguimiento (144/147) y, para la clase ausente, 400 ms con 212.000 leads (289 ms; 66 con 62.000), un límite que crece con la cartera de quien mira (`docs/RENDIMIENTO.md`; sigue como 4-65 para el 4.14-3b).
  - **P1** (3b, contestada el 2026-10-31; hecha en el 4.14-3b): elegir o cambiar el cliente **conserva lo tipeado**: el borrador de la hoja deja de ir por lead (queda por persona, origen y vehículo) y la hoja vuelve con el aviso «Recuperamos lo que habías escrito y no guardaste.».
  - **P2** (3b, contestada el 2026-10-31; hecha en el 4.14-3b): las pestañas de «míos» son «Todos», «Prospecto» y «Cliente», y abre en «Todos».
  - **P3** (3b, contestada el 2026-10-31; hecha en el 4.14-3b): el campo busca entre los leads que quien cotiza ve, como el listado (con «propios», su cartera; con «todos», todos).
  - **P4** (3b, contestada el 2026-10-31; hecha en el 4.14-3b): el panel ofrece «Quitar» al cliente elegido; guardar vuelve a pedir el cliente (`docs/UX.md`: lo obligatorio es para guardar, no para tipear).
  - **P1** (3c, contestada el 2026-10-31; hecha en el 4.14-3c): al guardar «Nuevo lead» abierto con «+» desde el panel del cliente, **se cierra y la hoja elige al creado**: la barra «Cliente» lo muestra, lo tipeado se conserva y el foco vuelve a la barra; el aviso va sin «Abrir ficha».
  - **P2** (3c, contestada el 2026-10-31; hecha en el 4.14-3c): «Cotizar» en la ficha del lead es un botón de la cabecera, entre «Editar» y el «⋯», que abre la hoja en el primer origen donde quien mira cotiza.
  - **P3** (3c, contestada el 2026-10-31; no se hace, sigue como 4-66): en «Nuevo lead» abierto desde la hoja, un teléfono de un lead que quien cotiza ve no ofrece «Elegir»; se busca en el panel del cliente.
  - **P1** (2c, contestada el 2026-10-30; hecha en el 4.14-2c1): «Cargar a mano» y «Traer de la subasta» desde el panel crean el vehículo **al confirmarlo en el panel** («Crear y elegir», `vehiculo_crear`), no al guardar la cotización; si la cotización no se guarda, el vehículo queda en el inventario.
  - **P2** (2c, contestada el 2026-10-30; hecha en el 4.14-2c1): el layout del origen para el alta se lee **desde el navegador al abrir el alta** (`useLayoutActivo()` de `origenes`), no viaja en el documento de la hoja (sumaba 69.098 B sin comprimir contra 40.000 de presupuesto).
  - **P1** (2b, contestada el 2026-10-30; hecha en el 4.14-2b): «Cotizar» desde el resumen del vehículo abre la hoja con el origen y el vehículo y **sin lead**; guardar espera al cliente (4.14-3).
  - **P2** (2b, contestada el 2026-10-30; hecha en el 4.14-2b): «Cotizado (n)» y el historial cuentan sólo lo que quien mira ve por su alcance (la RLS); sin ninguna dice «Sin cotizaciones que puedas ver.».
  - **P3** (2b, contestada el 2026-10-30; hecha en el 4.14-2b): el tope de bytes del historial desplegado se fija en lo medido más un 5 % (5.250 B), no en los 4.000 B de la estimación.
  - **P1** (contestada el 2026-10-29; hecha en el 4.14-1): `cotizado_en` va en `vehiculos`, y cuando sólo cambia ella ni se mueve la versión de la ficha ni se audita.
  - **P2** (contestada el 2026-10-29; hecha en el 4.14-1): la ve quien ve el vehículo (sólo cuándo, no quién ni cuánto).
  - **P3** (contestada el 2026-10-29; hecha en el 4.14-1): la mueven crear una cotización con el vehículo y guardar una que pasa a él; nunca retrocede.
  - **P4** (contestada el 2026-10-29; hecha en el 4.14-1): «Últ. cotización» lista sólo los cotizados (índice parcial).
  - **P5** (contestada el 2026-10-29; el índice, en el 4.14-1; el margen, en el 4.14-2): «Cierre subasta» lista las abiertas o en vivo con cierre desde ahora menos 24 h,
    la más próxima primero.
  - **P6** (contestada el 2026-10-29; para el 4.14-2, 4-10): en el panel del vehículo se elige el tipo de vehículo entre las filas de la tabla de transporte, con el
    sugerido marcado si el dato de la subasta coincide con una clave.
  - **P7** (contestada el 2026-10-29; hecha en el 4.14-1): el cierre es `coalesce(subasta_fin_en, subasta_en)`, como la limpieza.
  - Del plan del 4.14-2a, contestadas el 2026-10-29: **P1** (hecha): al elegir otro vehículo, lo tipeado queda en el borrador del vehículo de antes y vuelve si se lo elige
    otra vez. **P2** (hecha): elegir o quitar cierra el panel y el foco vuelve a la barra. **P3** (para el 4.14-2c): el tipo de vehículo elegido se guarda en el vehículo
    (`atributos.tipo_vehiculo` por `vehiculo_guardar`, con su versión); quien no puede editarlo ve el sugerido sin elegir. **P4**: 4-49 se arregla en un paso propio, el 4.14-2a2.
    **P5** (de la auditoría del informe): con la barra encima, al 200 % y con la página arriba de todo, el resumen fijo queda debajo del borde de la ventana; se acepta por
    ahora y 4-50 endurece su assert.
  - Del plan del 4.14-2c2 (P1 y P2, contestadas el 2026-10-30 y hechas; P3, contestada el 2026-10-30 y hecha en el 4.14-2c3): **P1** el dato viaja en la celda de `cotizacion_hoja` (`dato_del_vehiculo`) y las filas se leen con `cotizacion_tabla`, sin RPC nueva.
    **P2** cuenta un valor del `match` que no es el id de ningún nodo y que el motor lee para ese origen (columna fija o campo activo); un `campo_vehiculo` no. **P3** (contestada el 2026-10-30; hecha en el 4.14-2c3):
    cada fila se nombra **tal cual sale de la tabla**, como la ayuda de una tabla.
  - Del plan del 4.14-2c3 (contestadas el 2026-10-30; hechas en el 4.14-2c3): **P1** cada fila, tal cual sale de la tabla (la P3 del 2c2). **P2** se eligen sólo campos de texto del layout
    (`texto`, `texto_largo`); una columna fija (año, marca…) se cambia en la ficha. **P3** tras «Crear y elegir» el panel se cierra como siempre y la celda sin valor dice que se elige en
    «Vehículo». **P4** un toque guarda el tipo en el vehículo, cierra el panel y la hoja recalcula.
- **4.15** — Editar con SU versión, cotizar encima (N+1) y revisiones por nodo, recortadas y por páginas. En **4 prompts**:
  el **1** (hecho el 2026-11-04): **4-26** medido antes («no reproducida»), **4-24** (`puede_cotizacion` mira el alcance una vez), **4-34** (guardar pide ver y
  editar, en `_cotizacion_puede_guardar()`) y la revisión que guarda `totales` por clave (los grupos enteros; leída sin delatar lo que un nivel esconde). El **2** (hecho el 2026-11-04): la
  lectura de una guardada (`cotizacion_hoja_guardada`: SU versión, lo editable por `_cotizacion_puede_guardar()`, la vigencia `vigencia_dias` y la cadena), las revisiones
  con autor y etiquetas y cotizar encima (`cotizacion_encima`, la N+1 al tocarla, una viva por anterior; P9–P13); Nivel 2 (estructura) + cadena db + `db:carreras` + `db:medir`.
  El **3a** (hecho el 2026-11-04): `/cotizaciones/[id]` y la hoja de SU versión (sólo lectura para quien no la guarda), «Guardar» (la versión esperada, el conflicto con quién y cuándo,
  `intento_reusado`; P1 y P2) y la entrada desde el historial del vehículo y la tarjeta; pantalla, Nivel 1, sin completo (1 de 3). El **3b** (hecho el 2026-11-04): el panel de revisiones por cursor
  (`?panel=revisiones`, registrado en `RPC_PAGINADAS`), la cadena (la anterior y la nueva) en la cabecera y «Cotizar encima» (P7: el aviso de versión o de vencida; P1 y P2 del 3b); pantalla, Nivel 1, sin completo (2 de 3).
  `cotizacion_guardar` con el mismo intento y otros datos da 22023 `intento_reusado` (lo lleva a la pantalla el 3a). Depende de 4.13. Prompts: 4.
  - Preguntas del plan del 4.15 (contestadas el 2026-11-04, todas con la recomendada; `.piloto/planes/4.15.md` y `4.15-2.md` › «Preguntas abiertas»):
    **P1** qué es cotizar encima (una cotización nueva con `cotizacion_padre_id` y `version` + 1; la anterior no se toca). **P2** qué se lleva (lo tipeado de los nodos
    que siguen, también lo que quien cotiza no ve). **P3** de cuál (de la última de su cadena, una a la vez). **P4** su número (el suyo, «v2 de #123»). **P5** quién
    (quien cotiza en el origen y ve la anterior y su lead). **P6** la anterior queda igual. **P7** dónde se ofrece (al editar una de otra versión, y siempre en una vencida).
    **P8** dónde se edita (`/cotizaciones/[id]`). Del 4.15-2: **P9** la N+1 nace al tocar «Cotizar encima»; **P10** siempre preventa; **P11** quien no ve la N+1 sólo sabe
    que existe; **P12** la vigencia nace ahora (sin pantalla hasta el 4.20); **P13** quien sólo ve abre la hoja de una guardada en sólo lectura.
    Del 4.15-3 (contestadas el 2026-11-04 con la recomendada; `.piloto/planes/4.15-3.md` › «Decisiones contestadas»): **P1** la página de una guardada no cambia el vehículo de una preventa
    (se muestra sin cambiarlo; **4-71**). **P2** al abrir se recalcula y, si no da lo guardado, se avisa y «Total guardado» muestra el de antes con `<Monto>`, con «Guardar» encendido.
    Del 4.15-3b (contestadas el 2026-11-04 con la recomendada; `.piloto/planes/4.15-3b.md` › «Preguntas abiertas»): **P1** con cambios sin guardar (o un guardado pendiente) «Cotizar encima» queda apagado y dice «Guarda o descarta
    tus cambios antes de cotizar encima: la versión nueva lleva lo guardado.». **P2** las revisiones no tienen camino a lo antiguo tras 500 por ahora (**4-75**, para el 4.17); el aviso dice «Mostrando las 500 más recientes.».
- **4.15-4** — **Preparar los carriles en paralelo** (sin cambiar lo que ve la persona): partir las entradas de `src/modules/cotizaciones/` por área
  (`listado`, `tarjeta`, `plantilla`, `formula`, `diseno`, `tablas`, `papelera`, `final`, `comprobantes`, `comentarios`) para que los pasos 4.16 a 4.27
  agreguen archivos propios y no editen los compartidos: carpetas `features/<área>/`, `entities/<área>/`, `infra/<área>/` y `pantallas/<área>.ts`;
  `index.ts`, `client.ts` y `composicion.ts` sólo reexportan por área (un archivo por área) y un paso nuevo no los toca; una guarda de arquitectura
  falla si un área importa a otra. El plan de los carriles está en `docs/plan.yaml` (`dueno_de` por área, `base` para este paso y el 4.28).
  Depende de 4.15-3. Nivel 1 (nada cambia de pantalla: los tests y los e2e existentes siguen verdes). Prompts: 1.
  **Hecho** el 2026-11-05 (`docs/DECISIONES.md` › «Paso 4.15-4»): 10 áreas y un núcleo (lo que comparten: la hoja, guardar, encima, revisiones, el motor, el compilador…), las entradas
  de cada una en `areas/<x>/`, el listado en `entities/listado/` e `infra/listado/`, y `scripts/guardas/areas-de-cotizaciones.test.ts`. Del plan (contestadas el 2026-11-05 con la recomendada,
  `.piloto/planes/4.15-4.md` › «Decisiones contestadas»): **P1** el 4.15-5; **P2** el carril B posee el compilador y los validadores (37 archivos del núcleo), uno por uno; **P3** el 4.15-6.
- **4.15-5** — **La guarda de carriles al día** (**4-84**): `scripts/guardas/carriles.mjs` lee los carriles de `docs/plan.yaml` (las ramas `b/` y `c/` crean migraciones de sus dominios;
  nadie más que el A edita ESTADO, PLAN, DECISIONES ni BITACORA) y `docs/ORCA.md` dice los carriles de la Fase 4. El 4.20 y el 4.24 dependen de él (`docs/plan.yaml`): B y C no reciben paso
  hasta integrarlo, aunque `auto-carriles.sh` los abra. Depende de 4.15-4. Carril A. Nivel 1. Prompts: 1.
  **Hecho** el 2026-11-05 (`docs/DECISIONES.md` › «Paso 4.15-5»; P1 y P2 contestadas con la recomendada): `carriles.mjs` lee los carriles de `docs/plan.yaml` **de la base del PR** (sin él, todo PR cae); un carril que no es base no edita ESTADO, PLAN, DECISIONES ni BITACORA, crea sólo migraciones de sus `migraciones` y no toca fuera de su `dueno_de`, `docs/` y `compartido` (agrega y edita, no borra); en `plan.yaml` sólo suma archivos de las familias del compilador que crea; el job corre la guarda de la base, con dependencias. Cierra 4-84; abre 4-87 y 4-88.
- **4.15-6** — **Los huecos del núcleo para B y C** (sin cambio visible), como el `encima` de `<HojaDeCotizar>`. **Se parte en tres** (el 2026-11-05, en su plan: a un commit por intención eran 8 y no caben en 3
  de código): **4.15-6a**, **4.15-6b** y **4.15-6c**, en cadena (`docs/plan.yaml`); el 4.17, el 4.20 y el 4.24 dependen del **4.15-6c**. Carril A. Nivel 1 con interfaz. Prompts: 1 cada uno.
  - **4.15-6a** — **la hoja**: recibe el ⚙ (que enciende el `Proveedor` de un área por `ContextoDelAjuste`, y que la base da por celda con `ajustes`; se abre en `?ajuste=celda&nodo=` y su lugar va con las secciones
    principales y dentro del modal «Avanzado», como la ayuda) y el enlace de `<FormulaSinPublicar>` pasa a `features/formula` (`pantallas/formula-hoja.ts`); `nuevo/page.tsx` pierde `BarraConHistorial`.
    **Hecho** el 2026-11-05 (`docs/DECISIONES.md` › «Paso 4.15-6a»; P1 contestada con la recomendada: 4-87 es el 4.15-7).
  - **4.15-6b** — **la guardada y el listado**: la cabecera de una guardada recibe un hueco de acciones y `[id]/page.tsx` dibuja otro bajo la hoja con lo que exporten
    `pantallas/{papelera,final,comprobantes,comentarios}-cotizacion.ts` (4.24, 4.25, 4.27); el listado, un hueco junto a «Nueva» (`pantallas/papelera-listado.ts`; la pantalla de la papelera, en
    `src/app/(app)/cotizaciones/papelera/`, del C); la guarda de áreas hace caer una segunda pantalla que el carril de su área no posea y `areas-de-cotizaciones.test.ts` (330 líneas) se parte. Depende de 4.15-6a.
    **Hecho** el 2026-11-06 (`docs/DECISIONES.md` › «Paso 4.15-6b»; `areas-de-cotizaciones.test.ts` quedó en 230 líneas y el plan real y T14 en `areas-de-cotizaciones-plan.test.ts`; la segunda pantalla de un área del C la registra en `plan.yaml` el carril A).
  - **4.15-6c** — **Configuración y Empresa**: la entrada de Configuración › Cotización (`secciones.ts:53-59`) pasa con sus permisos a `configuracion/cotizacion/seccion.ts`, del B, que le suma `cotizaciones.configurar` en el
    4.20; las pestañas de Empresa, la de un área (4.26; **4-89**); y `guardarTipoCambio` sale por un `src/modules/empresa/client.ts` nuevo (el ⚙ de un tipo de cambio), con la regla de `client.ts` ampliada para una
    Server Action. Depende de 4.15-6b.
    **Hecho** el 2026-11-06 (`docs/DECISIONES.md` › «Paso 4.15-6c»; `configuracion/cotizacion/seccion.ts`, las pestañas de Empresa por permiso con `comprobantes/{pestanas.ts,seccion.tsx}` del C, `empresa/client.ts` y la regla de `client.ts` ampliada; sin cambio visible).
- **4.15-7** — **La clave `cotizaciones.papelera.purgar`** (**4-87**, P1 del 4.15-6): el A la da antes del 4.24 (`src/shared/lib/permisos.ts`, su catálogo, `supabase/seed.sql` con los roles que la reciben y, si su RPC por
  lotes lleva tamaño, `scripts/guardas/paginas-en-la-base.ts`). Compuerta `datos` (qué roles la reciben, su etiqueta); rigor máximo (permisos, migración, `db:reset`, `db:types` y `db:probar`). El 4.24 suma el
  4.15-7 a su `depende_de`. Depende de 4.15-6c. Carril A. Prompts: 1.
  **Hecho** el 2026-11-06 (`docs/DECISIONES.md` › «Paso 4.15-7»; P1–P4 contestadas con la recomendada): la clave la tienen el dueño y todo rol que tenía la de vehículos, y gobierna ya `papelera_listar|restaurar|purgar` y la rama de cotizaciones de la policy `lotes_papelera: leer`. Suma además dos huecos que también sirven al B: `db:probar` corre las pruebas de `supabase/tests/areas/**` después de su lista fija (que dejaba al B y al C sin forma de sumar pruebas SQL) y el registro de páginas suma `paginas-en-la-base-papelera.ts`, del C.
- **4.16** — El listado `/cotizaciones` (resumen `?cotizacion=`, «Vencida», cursor, el máximo medido, sin el snapshot), la siembra de
  volumen y `medir-escala.sql`; se enciende la navegación. Cierra **4-14** («todas las que veo» de quien ve «propios») y **4-23** (el
  gemelo en el inventario de vehículos), la entrada a cotizar desde el listado (`docs/UX.md:38`) y el camino a lo antiguo del historial del vehículo (el tope de 500 del 4.14-2b: un
  filtro por vehículo). Depende de 4.10 y 4.13. Nivel **2** (`_shell`) + `db:medir:volumen` + `E2E_VOLUMEN=1`.
  Prompts: 6.
  **Partido en 6** (`docs/DECISIONES.md` › «Paso 4.16 (1 de 4)» y «Paso 4.16-2a»): el **4.16-1** (4-14: `cotizaciones_listado()` por cursor y por alcance, sus índices, su medición y
  `MAXIMO_DE_PAGINA_DE_COTIZACIONES`; Nivel 2 + `db:medir:volumen`): hecho. El **4.16-2** (4-23), **partido en 2** tras las sondas S0, S0' y S0''
  (`docs/DECISIONES.md` › «Paso 4.16-2a»): el **4.16-2a** (`vehiculos_inventario()`: las rutas, el cursor y los filtros del layout en SQL, sus índices, la equivalencia con
  PostgREST, su medición y el número de 4-77; Nivel 2 + `db:medir:volumen`): hecho. El **4.16-2b** (la app: `fuenteDelInventario()`, `buscarVehiculos()` por la función para quien
  ve «propios», el registro de páginas y el e2e de quien ve «propios»; Nivel 1, interfaz; cierra 4-23): hecho. El **4.16-3** (la siembra de cotizaciones de `db:sembrar-volumen` (`sembrar-cotizaciones.sql`), su fila en `medir-escala.sql` y las mediciones que pedían una base sin cotizaciones; Nivel 1 +
  `db:medir:volumen`): hecho. El **4.16-4**, **partido en 2** (`docs/DECISIONES.md` › «Paso 4.16-4a»): el **4.16-4a** (la pantalla `/cotizaciones` sin resumen, la navegación, «Nueva cotización», el filtro por vehículo y el
  enlace desde el tope del historial, y el listado con volumen; Nivel 2 + `E2E_VOLUMEN=1`): hecho. El **4.16-4b** (el resumen `?cotizacion=`: la fila y la tarjeta lo abren, el servidor lee la que no está en la página, estados, `diferido()` y la vuelta del
  foco; Nivel 1, interfaz): hecho. Marcas: 4.16-1 `sí`, 4.16-2a `sí`, 4.16-2b `no`, 4.16-3 `no`, 4.16-4a `sí`, 4.16-4b `no`.
  - **P1** (1, contestada el 2026-11-04 con la recomendada): «Mías» son las que creó quien mira (`creado_por`), para cualquiera; no es «Míos» de leads.
  - **P2** (1, contestada el 2026-11-04 con la recomendada): todas las versiones de una cadena salen en el listado, cada una en su fila.
- **4.17** — **5a-12** y, con el mismo «Ver más», las secciones «Cotizaciones» de la ficha del lead y del vehículo (la del vehículo puede usar la lectura
  `leerHistorialDelVehiculo()` del 4.14-2b y es el camino a lo antiguo de su tope de 500). Depende de 4.13 a
  4.16. Nivel 1 + cadena db + `db:carreras` (el 4.17-1, de base, Nivel 2). Prompts: 9.
  **Partido en 5** (`docs/DECISIONES.md` › «Paso 4.17 (1 de 5)»): el **4.17-1** (la base de 5a-12: `lead_oportunidades()` por cursor de tres valores y `p_tamano`, sus dos parciales, el registro y
  su medición; la pantalla pide 100 todavía; Nivel 2 + `db:medir:volumen`): hecho. El **4.17-2** («Ver más» de la sección «Oportunidades» de la ficha, `leads-oportunidades-ver-todas.spec.ts` con 1.000;
  cierra 5a-12; Nivel 1, interfaz): hecho. El **4.17-3** (la pestaña «Cotizaciones» de `/vehiculos/[id]` con `leerHistorialDelVehiculo()` y su tope «Ver todas en Cotizaciones»; Nivel 1, interfaz): hecho. El **4.17-4**,
  **partido en 2** (`docs/DECISIONES.md` › «Paso 4.17-4a»): el **4.17-4a** (`p_lead` en `cotizaciones_listado()`: la ruta por `cotizaciones_lead_creado_idx`, sus pruebas y la medición de la ruta y de la lectura
  de la sección; Nivel 1 + cadena db + `db:medir:volumen`): hecho. El **4.17-4b** (la sección «Cotizaciones» de `/leads/[id]` con «Ver más» hasta 500 y «Ver todas en Cotizaciones» a `/cotizaciones?lead=`;
  quién la ve, P2; Nivel 1, interfaz): hecho. El **4.17-5**, **partido en 3** (`docs/DECISIONES.md` › «Paso 4.17-5a»): el **4.17-5a** (`p_hasta` en `cotizacion_revisiones()` y `cotizaciones_revisiones_cotizacion_creado_idx`, sus pruebas y su medición; Nivel 2 + cadena db + `db:medir:volumen`): hecho. El **4.17-5b** (`<IrAUnaFecha>` y `<DesdeUnaFecha>` a `src/shared/ui`, sin cambio visible; Nivel 2): hecho. El **4.17-5c** («Ir a una fecha» en «Revisiones», con su ventana, el aviso del tope que la nombra y su e2e con horas distintas; cierra **4-75**; Nivel 1, interfaz): hecho. Marcas: 4.17-1 `sí`, 4.17-2 `no`, 4.17-3 `no`, 4.17-4a `no`, 4.17-4b `sí`, 4.17-5a `sí`, 4.17-5b `sí`, 4.17-5c `no`.
  - **P1** (1, contestada el 2026-11-06 con la recomendada): la pestaña «Cotizaciones» de `/vehiculos/[id]` la ve quien tiene `cotizaciones.ver` (cualquier alcance) en el origen del vehículo; sin la clave no aparece y `?seccion=cotizaciones` abre «Ficha». Coincide con la RLS de `cotizaciones`, que va por el origen.
  - **P1 del 4.17-4** (1, contestada el 2026-11-06 con la recomendada): el camino tras 500 de la sección «Cotizaciones» de `/leads/[id]` es «Ver todas en Cotizaciones» a `/cotizaciones?lead=<id>`, como el del vehículo; pide `p_lead` en `cotizaciones_listado()` y por eso el paso se partió.
  - **P2 del 4.17-4** (1, contestada el 2026-11-06 con la recomendada): la sección la ve quien tiene `cotizaciones.ver` (cualquier alcance) en **algún** origen, como «Vehículos» pide `vehiculos.ver`; la RLS recorta las filas y, si no llega ninguna, se dibuja el estado vacío. Sin la clave en ningún origen no aparece y `?seccion=cotizaciones` abre «Datos». La usa el 4.17-4b.
- **4.18** — La tarjeta, el PDF y compartir: filas por grupo con su tono (el del grupo, o el que la plantilla elija del catálogo), celdas
  combinadas de tipo de cambio y plazo, título de la variante, asesor, logo, nota, leyenda y la garantía condicionada, Live, y el total en Bs
  si `cotizaciones.ver_total_bs`.
  `validar_plantilla` rechaza un nodo que no sea del nivel «todos». e2e: el total del PDF es la suma de las líneas. **Hito 4-A al
  cerrarlo.** Depende de 4.15. Nivel 1; **Nivel 2 del hito**. Prompts: 4. **Partido en 4** (4.18-1, -2, -3a y -3b) (`docs/DECISIONES.md` › «Paso 4.18-1»): el **4.18-1** (la plantilla
  declarativa y `validar_plantilla()` al guardarla y publicarla, con `entities/plantilla/casos-de-plantilla.json`; la semilla de las plantillas; `cotizacion_tarjeta()`,
  la lectura de la tarjeta de una versión sólo con lo del nivel «todos»; `plantillas_tarjeta` sólo para quien configura; Nivel 2: completo de escritorio): hecho. El
  **4.18-2** (la tarjeta en pantalla: la lectura en `infra/tarjeta`, el modelo de vista puro en `entities/tarjeta/` —filas por grupo con su tono, celdas combinadas de
  tipo de cambio y plazo según el modo, título de la variante, asesor, logo, nota, leyenda, la garantía si no está apagada y el total en Bs si la cotización lo pide—,
  `<TarjetaDeCotizacion>` con `<Monto>` y el Modo Live, y «Vista previa» en el resumen de la hoja nueva y de la guardada por `diferido()` —el JS de
  `/cotizaciones/nuevo` está en 456,9 de 460 KB, 4-73—; la tarjeta «por omisión» con `sin_plantilla`; el título según P6 y 4-55; Nivel 1, interfaz): hecho. El **4.18-3**,
  **partido en 2** (`docs/DECISIONES.md` › «Paso 4.18-3a»): el **4.18-3a** (el PDF de una guardada en `GET /cotizaciones/<id>/pdf` con `@react-pdf/renderer` sobre
  `modeloDeLaTarjeta()` y `calculoDeLoGuardado()`, las fuentes TTF, el logo según P2, el lector del PDF de las pruebas y el e2e del total contra sus líneas con dos tipos de cambio;
  Nivel 1, interfaz): hecho. El **4.18-3b** («Copiar texto» y «Descargar PDF» según P5–P7, la tarea de oro 2 con el PDF y el JS de la hoja, 4-73; **hito 4-A**, Nivel 2: completo
  de escritorio): hecho.
  Marcas: 4.18-1 `sí`, 4.18-2 `no`, 4.18-3a `no`, 4.18-3b `sí`.
  - **P1 a P8 del 4.18-1** (contestadas el 2026-11-06, todas con la recomendada): la tarjeta usa la plantilla **publicada hoy**, validada otra vez contra la versión
    de la cotización (P1); la forma es declarativa, sin hex ni plantillas de texto (P2); lleva todos los grupos enteros (P3); lo nuevo llega a quien tiene
    `cotizaciones.ver` del origen (P4); `moneda_mostrar` y `plantilla_id` siguen sin uso hasta un paso de base propio (P5, 4-45); el título es el del vehículo y el
    encabezado el de la variante (P6, 4-55, lo hace el 4.18-2); 4-50 pasa a «Pulido para la Fase 9» (P7); y `plantillas_tarjeta` la lee sólo quien configura (P8).
    **S0** (2026-11-06, la recomendada): `planilla_usa` no dibuja tipos de cambio, y su plantilla de la semilla va sin esa columna.
  - **P1 a P5 del 4.18-2** (contestadas el 2026-11-06, todas con la recomendada): «Vista previa» es un botón de sólo texto en el pie del resumen y el tope de la hoja sigue en 500 nodos (P1);
    «Asesor:» es quien cotiza en la hoja nueva y quien creó la cotización en una guardada (P2); la fecha del encabezado es hoy en la nueva y el día del último guardado en una guardada (P3);
    la tarjeta por omisión lleva sólo el total, sin lo aparte, y se corrige el glosario (P4); y la tarjeta de una guardada dibuja **lo guardado**, con lo de hoy que difiere y los cambios sin
    guardar dichos fuera de la tarjeta (P5). La tarjeta se ve con `?panel=vista-previa`; el PDF del 4.18-3 usa el mismo `modeloDeLaTarjeta()` y `calculoDeLoGuardado()`.
  - **P1 a P8 del 4.18-3** (contestadas el 2026-11-06, todas con la recomendada): las fuentes son Geist Regular y SemiBold en TTF, versionadas con su licencia OFL (P1); el logo va
    si es PNG o JPEG, o un SVG sin lo que react-pdf se salta, y si no el PDF sale sin logo (P2, 4-98); las pruebas leen el PDF con un lector propio, sin dependencia (P3); lo descarga
    quien ve la cotización, sin clave nueva (P4); y los montos van con `formatearMonto()` y siempre con cifras, aunque el Modo Live esté encendido (P8). **Para el 4.18-3b:** dos
    acciones, «Copiar texto» y «Descargar PDF» (P5); en el pie de «Vista previa», más el enlace «Descargar PDF» en la tarjeta de lo guardado de la hoja nueva (P6); y se copia la
    tarjeta entera como texto (P7).
  - **P2 del 4.18-3b** (contestada el 2026-11-06, la recomendada): «Copiar texto» queda apagado mientras el modal dice «Total desactualizado.» o el total no tiene valor. **P1**,
    microdecisión (`.claude/rules/ui.md`): «Descargar PDF» del modal pide el PDF desde el navegador y dice un fallo en el pie con «Reintentar»; el de la hoja nueva es un `<a download>`.
- **4.19** — El editor de la plantilla, con la vista previa en vivo. Depende de 4.18. Nivel 1. Prompts: 2. Suma (4.18-1): `validarPlantilla()` de TS en
  `entities/plantilla/`, espejo de `validar_plantilla()` sobre `casos-de-plantilla.json` (cuenta caracteres, no unidades UTF-16: 4-74); la versión esperada de
  `plantilla_guardar_borrador` y de `plantilla_publicar` (salen de las excepciones de `.claude/rules/migraciones.md`; antes del 4.19-1 dos publicaciones a la vez publicaban
  las dos, no daban un 23505: ver abajo); y el aviso de un tono elegido que ya no está en el catálogo (la lectura cae al tono del grupo).
  **Partido en 6** (`docs/DECISIONES.md` › «Paso 4.19-1» y «Paso 4.19-3a»): el **4.19-1** (la versión esperada y el candado del origen de `plantilla_guardar_borrador` y
  `plantilla_publicar`, `plantilla_descartar_borrador` y la nota de publicar; sus carreras; Nivel 1 + cadena db + `db:carreras`): **hecho** (lo que midió HEAD: dos
  publicaciones a la vez no daban el 23505 de `plantillas_publicada_unica`; la segunda también publicaba y pisaba la nota de la primera). El **4.19-2**
  (`validarPlantilla()` de TS sobre `casos-de-plantilla.json` y el aviso de un tono que ya no está; Nivel 1, sin cambio visible). El **4.19-3a** (lo que lee y escribe la plantilla: `entities/`, `infra/` y las tres actions, con la guarda del texto que la base no lee; sin pantalla; Nivel 1): **hecho**. El **4.19-3b** (la pestaña «Tarjeta» de Configuración › Cotización y el editor que guarda, con el PT409 y el aviso del tono, «Buscar fila» como camino al tope de 500; Nivel 1, interfaz): **hecho**. El **4.19-3c** (publicar con nota y descartar; Nivel 1, interfaz): **hecho**. El **4.19-4** (la vista
  previa en vivo por un hueco que llena el área `tarjeta`, con cifras de ejemplo; Nivel 1, interfaz): **hecho** (el 4.19 queda completo). Marcas: 4.19-1 `no`, 4.19-3a `no`, 4.19-3b `no` (2 de 3), 4.19-3c `no` (3 de 3), 4.19-4 `no` (3 de 3: `cuenta-e2e.mjs` no pide el completo local).
  - **P1 a P6 del 4.19-1** (contestadas el 2026-11-07, todas las recomendadas): P1 el conflicto no dice quién (sin columnas nuevas); P2 el borrador se puede descartar
    (`plantilla_descartar_borrador`, con su versión); P3 `cotizaciones.configurar` del origen, sin clave nueva; P4 publicar pide una nota; **P5 (del 4.19-3)** una pestaña
    «Tarjeta» de Configuración › Cotización, tras «Fórmula» (carpeta del B: el 4.19-3 se integra con cuidado mientras el B hace el 4.21); **P6 (del 4.19-4)** cifras de ejemplo, dichas.
- **4.20** — La fórmula: versiones, publicar con nota, historial, revertir y el ⚙ (una constante publica la N+1 de su origen; un tipo de
  cambio va a `tipo_cambio_guardar` con `empresa.tipos_cambio.gestionar`); «Aplicar también a esta cotización»; el diseño se publica con
  la fórmula (revertir publica una copia **con el diseño**, por `_publicar_formula(…, true)`: **4-8**); `formula_publicar` deja de decir
  «Recargá»; Configuración › Cotización (vigencia, vehículo obligatorio); el enlace de «Falta publicar la fórmula» de la hoja (4.13-2)
  apunta a Configuración › Cotización, que hoy pide `equipo.roles.ver`: quien sólo configura el origen cae en «No tienes permiso» hasta
  que esa pantalla abra con `cotizaciones.configurar`. Cierra **4-8**, **4-33**, **4-36**, **4-19**, **4-20**, **5a-29** y **5a-30**;
  **4-30** aquí o en 4.22. Llena el hueco de la hoja con un `Proveedor` (el ⚙ de una celda y «Aplicar también a esta cotización») y el enlace de «Falta publicar la fórmula» en `pantallas/formula-hoja.ts` (4.15-6a). Depende de 4.12, 4.13 y 4.15 (hasta el 4.15-6c). Nivel 1 + cadena db. Prompts: 2. **Se partió** en 4.20-1, 4.20-2 (a–c) y 4.20-3 (a–d), del B; la vigencia y el vehículo obligatorio pasaron al A como **4.20-4a** y **4.20-4b** (`docs/pasos/4.20-4/decisiones.md`).
- **4.20-4a** — Los ajustes de cotización de la empresa: la RPC con su catálogo y su migración, la lectura, la regla de quién los cambia (`cotizaciones.configurar` concedida en todos los orígenes), la action y las pruebas de la base. Carril A. Nivel 1 + cadena db. Plan: `docs/pasos/4.20-4/plan-del-a.md`. Prompts: 1.
  **Hecho** el 2026-11-08 (`docs/DECISIONES.md` › «Paso 4.20-4a»; P1 y P2 de la compuerta `datos` con la recomendada): `empresa_guardar_ajustes_de_cotizacion()` con `cotizaciones.configurar` sin origen y la versión de la fila; en `empresa`, `leerAjustesDeCotizacion()`, `puedeCambiarAjustesDeCotizacion()` y `guardarAjustesDeCotizacion`. e2e completo: no (1 de 3).
- **4.20-4b** — Configuración › Cotización › Ajustes (`?seccion=ajustes`): el formulario, la pestaña y el hub. Depende de 4.20-4a y 4.20. Carril A. Nivel 1. Plan: `docs/pasos/4.20-4/plan-del-a.md`. Prompts: 1.
  **Hecho** el 2026-11-08 (`docs/DECISIONES.md` › «Paso 4.20-4b»): la pestaña «Ajustes» de Configuración › Cotización con la vigencia y el vehículo obligatorio; la ve quien configura algún origen y la cambia quien la tiene en todos. e2e completo: no.
- **4.21** — El editor de la fórmula como el Excel (filas, grupos, tipo de cambio, plazo; cada fila en texto, compilada por 4.07, que
  guarda `{ ...raíz compilada, texto }`); evalúa con el motor TS, porque quien lo usa ya ve la fórmula. Cierra **4-5** y **4-6**.
  Depende de 4.07 y 4.20. Nivel 1. Prompts: 2. Se parte en 4.21-1 (lo puro del texto de una fila), 4.21-2 (la esperada de guardar y
  descartar el borrador; 4-8), 4.21-3a (el editor en texto con la vista previa; cierra 4-5 y 4-6), 4.21-3b (guardar el borrador) y
  4.21-3c (grupos, plazo y tipo de cambio); cada parte menos la última sale con `parcial`.
- **4.22** — **El editor del diseño**: secciones, celdas, nivel de ver y de editar, qué va a «avanzado», variantes, interruptores,
  atajos, modos y tonos (y editar el catálogo de tonos con su validación AA), con vista previa a 412 y 1.280 px y al 200 % (el mismo
  componente en un contenedor de ese ancho). **Avisa, sin bloquear**, cuando un nodo de un nivel restringido es el único oculto de una
  suma visible («se deduce restando»). `editar_sin_ver` rechaza una sección con sólo `nivel_ver` restringido: el editor pone ver y
  editar juntos. **4-30** (tope de tamaño del diseño) aquí o en 4.20. Depende de 4.09 y 4.20. Nivel 1. Prompts: 3.
- **4.23** — Las tablas de referencia: **primero 5b-7**; editar y reordenar filas; publicar la N+1 (D5; las tablas de referencia hoy no
  tienen versión). Depende de 4.05 y 4.20. Nivel **2** + `db:carreras`. Prompts: 2.
- **4.24** — La papelera propia (`cotizaciones.papelera.purgar`, versión, purga por lotes, «Deshacer»); la clave ya la gobierna (4.15-7),
  sin versión ni purga automática; registra su RPC con tamaño en `scripts/guardas/paginas-en-la-base-papelera.ts` y sus pruebas SQL van en `supabase/tests/areas/papelera/`. Llena `pantallas/papelera-listado.ts` (el enlace junto a «Nueva») y `papelera-cotizacion.ts` (la acción de la cabecera, la última). Depende de 4.10. Nivel **2** + `medir-jobs.sql`. Prompts: 1.
- **4.25** — Marcar final: `cotizacion_marcar_final` mira el lead y la papelera, toma los candados en el orden de vincular (hoy vincula
  el lead antes de tomar el vehículo: posible deadlock; ya toma primero su cotización), pasa el lead a la clase cliente, la cotización
  final como ancla de la limpieza y desvincular con una final. Cierra **4-17** (una final creada con `cotizacion_crear` no hace lo que
  `cotizacion_marcar_final`). Carreras. Llena `pantallas/final-cotizacion.ts`. Depende de 4.10 y **4.24**. Nivel 1 + cadena db + `db:carreras` + `medir-jobs.sql`. Prompts: 2.
- **4.26** — Comprobantes: emitir y anular, la numeración sin huecos, la serie en Empresa (D6); su `datos` sólo con lo del nivel «todos». Llena
  `pantallas/comprobantes-cotizacion.ts` y crea `pantallas/comprobantes-empresa.ts` (ya en el `dueno_de` del C) y llena `configuracion/empresa/comprobantes/{pestanas.ts,seccion.tsx}`, su pestaña de Empresa (4.15-6c). Depende de **4.25**. Nivel **2** + `db:carreras`. Prompts: 2.
- **4.27** — Comentarios anidados, adjuntos, favoritos, reportes y moderar. Llena `pantallas/comentarios-cotizacion.ts`. Depende de 4.10. Nivel **2** (`storage.objects`). Prompts: 2.
- **4.28** (hecho el 2026-11-08; `docs/DECISIONES.md` › «Paso 4.28: el cierre de la Fase 4») — El cierre: el recorrido de la IA con dos cuentas por la tarea de oro 2, la tabla de criterios, **5a-4b** con el tiempo de
  cada proyecto (con la decisión vigente, sin segunda pila local, su assert de 25 min no se cumple en esta fase), **5a-33** (el conteo
  del rol, tapado al 200 % en Roles: queda pulido de la Fase 9), ESTADO y BITACORA. Depende de todo. Nivel **3**. Prompts: 2.

Total de la fase: 48 pasos y 102 prompts, todos hechos (la fase cerró con el 4.28).

### Abiertos de la Fase 4

Lo que la Fase 4 deja abierto, en dos grupos (reconciliado en el cierre, 4.28). Los de otras fases están en su sección: **5a-28** (Fase 9), **6-1** (Fase 6),
**8-1** (Fase 8) y **9-1** a **9-12** (Fase 9); el pulido que salió en la Fase 4, en «Fase 9» › «Pulido para la Fase 9». Las inestables que pasan al
reintentar en CI no son abiertos (`.claude/rules/e2e.md` › «Inestables»).

#### Los decide la persona

- **4-39** (sin fase: lo decide la persona; el original sugiere un refactor sin pantalla antes del 4.16): cuatro archivos de `entities/`
  pasan de 300 líneas — `vehiculos/entities/vitrina.ts` 358, `leads/entities/oportunidad.ts` 321, `leads/entities/alta.ts` 331 y
  `leads/entities/importacion/filas.ts` 333 — `wc -l` de cada uno ≤ 300, partido por responsabilidad (en `vitrina.ts`, el formulario y su
  validación aparte de la vista previa; en `oportunidad.ts`, el formulario aparte del modelo), con sus pruebas al lado y `pnpm test` igual.
- **4-43** (sin fase: lo decide la persona; salió del 4-42): `e2e/leads-ficha-edicion.spec.ts` tiene 331 líneas (> 300) — partirlo por
  responsabilidad (edición, borrador, sin red, permisos). Assert: `wc -l` de cada parte ≤ 300 y las mismas pruebas en verde.
- **4-52** (sin fase, lo decide la persona; del tipo de 4-46): `supabase/tests/medir-cotizacion-guardar.sql` mide 319 líneas (> 300; ya medía 308 antes del 4.14-1). Partirlo por
  responsabilidad (el terreno y las funciones de medición, los casos). Assert: `wc -l` de cada parte ≤ 300 y lo mismo medido en verde.
- **4-64** (sin fase, lo decide la persona; del tipo de 4-52, salió del 4.14-3a): `supabase/tests/derivados-leads.sql` mide 493 líneas y `scripts/carreras.mjs` 355 (> 300; ya medían 470 y 353 antes). Partirlos por tema, o registrar las carreras nuevas desde `scripts/carreras/`. Del 4.15-1: `supabase/tests/cotizaciones-visibilidad.sql` (1.730 → 1.807 líneas), `supabase/tests/cotizacion-guardar.sql` (665 → 762) y `scripts/carreras/cotizaciones-guardar.mjs` (666 → 698); y `cotizacion_guardar` mide 121 líneas de función (> 80): partir una RPC `security definer` mueve su inventario y sus carreras. Del 4.15-2: `cotizaciones-visibilidad.sql` (→ 1.811), `scripts/carreras.mjs` (→ 357), `cotizacion-hoja.sql` (705 → 735), `cotizacion-guardar.sql` (→ 764), `medir-cotizaciones-lectura.sql` (359 → 360); `cotizacion-hoja-dato-del-vehiculo.sql` (340) y `cotizaciones-guardar.mjs` (698) sólo cambian la firma; y las funciones `_cotizacion_hoja` (≈ 127 líneas, recreada igual) y `cotizacion_encima` (106 de cuerpo). Del 4.16-1: `cotizaciones-visibilidad.sql` (→ 1.880), `medir-cotizaciones-listado.sql` (389, nuevo: el runner pasa el SQL por la entrada estándar y `\ir` no sirve), `cotizaciones-listado.sql` (309, nuevo) y la función `cotizaciones_listado()` (149 líneas: tres consultas de siete ramas; partirla en ayudantes les daría EXECUTE y entrarían a la guarda de páginas). Del 4.16-3: `medir-escala.sql` (850 → 892), `medir-cotizaciones-lectura.sql` (343 → 348), `medir-cotizaciones-listado.sql` (389 → 396) y `medir-evaluar.sql` (466 → 471). Del 4.15-4: `eslint.config.mjs` (353 → 391; el bloque de `areas/*/client.ts`). Del 4.15-5: `scripts/coordinador/plan.mjs` (355 → 358; `problemasDeMigraciones` quedó aparte, en `plan-migraciones.mjs`) y `problemasDelPlan` (87 → 88 líneas, sobre el tope de 80). Del 4.17-4a: `cotizaciones-listado.sql` (309 → 393), `medir-cotizaciones-listado.sql` (396 → 437), `cotizaciones-visibilidad.sql` (1.880 → 1.921) y `auditoria-leads.sql` (435 → 436); y la función `cotizaciones_listado()` (149 → 164 líneas: la ruta del lead en los tres bloques). Del 4.19-1: `scripts/carreras.mjs` (357 → 359: un import y una llamada; las carreras nuevas están en `scripts/carreras/plantillas.mjs`, 181). Del 4.18-1: `cotizaciones-visibilidad.sql` (1.921 → 1.923) y `humo.sql` (6.543 → 6.578); `cotizacion-tarjeta.sql` (300, nuevo) usa `pg_temp.pv_formula` y `pv_plantilla_g1` de `plantilla-validar.sql`, que corre antes: al partirlo, los ayudantes a un archivo propio.
- **4-66** (sin fase, lo decide la persona; salió del 4.14-3c, P3): en «Nuevo lead» abierto desde la hoja, un teléfono que ya es de un lead que quien cotiza ve («Ya existe: …», que no deja seguir) no se puede elegir desde el aviso: se busca en el panel del cliente. Hacerlo es un botón junto al aviso con el `leadId` que ya llega (`entities/verificacion.ts`) y la escritura de «elegir al creado»; toca el campo del teléfono del alta, que comparte su aviso con el cambio de teléfono de la ficha.
- **4-67** (sin fase, lo decide la persona; salió del 4.15-1, 4-26): el conteo de exportar (`contarLeadsHasta`, `leads_cartera_vista` de a 1.000) de una cartera recién sembrada de 5.001: tras `analyze leads, leads_asesores` su primera página elige `Nested Loop` con `Seq Scan on leads` adentro (12,5 millones de filas descartadas, 828.878 buffers): 3.095 ms; sin `analyze`, sus páginas crecen con la profundidad (31, 60, 95, 131 y 167 ms). Medido en SQL (`.piloto/salidas/4.15-1/4-26/`), no por la e2e (allí el autoanalyze cayó y la respuesta siguió en 299 ms). Cierre: en `db:medir:volumen`, las páginas del conteo de exportar de una cartera de 5.001, tras `analyze`, sin `Seq Scan on leads` en el bucle, sin crecer con la página y bajo 50 ms cada una.
- **4-71** (sin fase, lo decide la persona; salió del 4.15-3a, P1): cambiar el vehículo de una preventa guardada desde su página `/cotizaciones/[id]`. La base lo deja (`cotizacion_guardar(p_vehiculo)`: una preventa cambia de vehículo y nunca lo quita); la página lo muestra sin cambiarlo y «Guardar» manda el que tiene. Hacerlo es la barra del vehículo de la hoja nueva (un 4.15-3c) o sólo elegir entre los ya cargados.
- **4-72** (sin fase, lo decide la persona; salió del 4.15-3a): quien ve una cotización y no ve su vehículo no la recalcula ni la guarda (`_cotizacion_armar` pide ver el vehículo): la página dice «No se pudo recalcular» y muestra «Total guardado», pero sus cifras de hoy no se ven. Que el recálculo de una guardada no dependa del vehículo que quien mira no ve, o que la pantalla lo diga.
- **4-79** (sin fase, lo decide la persona; salió del 4.16-3): Configuración › Orígenes dibuja un total exacto de cotizaciones y de vehículos por origen (`origenes_resumen()`, `count(*)` por origen; `lista-de-origenes.tsx`), y la regla dice que un número que se muestra nunca es un total exacto (`.claude/rules/escala.md`). Con la siembra de 50.000 cotizaciones, 7,5 ms (`medir-escala.sql`, tope 100); con 250.000, 51.000 buffers (`docs/RENDIMIENTO.md`, el listado). Arreglarlo es `limit n + 1` por origen y `conteoCorto()` en la pantalla, o quitar el número.
- **4-95** (sin fase; salió del 4.17-5a): `creado_en` de una revisión es el `now()` de su transacción y las que escriben sin versión (`cotizacion_moderar`, `cotizacion_marcar_final`, `papelera_enviar`, `papelera_restaurar`, `_vehiculo_a_lote`, `vehiculos_papelera_restaurar`) pueden dejar, en una misma cotización, un id mayor con una hora menor, a lo sumo por lo que dura la transacción que escribe después. Por PostgREST la acota el `statement_timeout` de `authenticated` (8 s en la base local: `select rolconfig from pg_roles where rolname = 'authenticated'`; no está en `migrations/`); `_vehiculo_a_lote` también lo llama `limpieza_automatica_correr` (`base.sql:14167`), un job cuyo rol y `statement_timeout` no se verificaron: ahí la ventana no tiene cota verificada. El salto a una fecha (`p_hasta`) puede dejar del otro lado del borde una revisión de esa ventana; «Ver más» no repite ni salta. Que `creado_en` sea `clock_timestamp()` o que el salto vaya por `(creado_en, id)`: lo decide la persona si alguna vez se ve.
- **4-103** (sin fase; salió del 4.19-4; lo decide la persona): la vista previa del editor de la tarjeta no muestra la `descripcion` del nodo (la leyenda por omisión), el nombre de `tipos_cambio` ni el título de la variante: no viajan al navegador. Llevar la descripción costaría ≈ 40 B por miembro (500 miembros: ≈ 20 KB sobre el tope de 154.900 B del primer HTML).
- **4-94** (sin fase; salió del 4.17-3): «Cotizar» desde la ficha del vehículo (`/vehiculos/[id]`), en la cabecera o en la pestaña «Cotizaciones». Hoy sólo está en el resumen de `/vehiculos` (`paraCotizarDe()`) y en la barra de la hoja. Suma un camino a un flujo: lo decide la persona.
- **4-88** (sin fase, lo decide la persona; salió del 4.15-5): la guarda de carriles corre la versión de la base, pero el job lo define el `ci.yml` del PR: un PR de un carril que no es base que borra o cambia el job `carriles` no se juzga, y el coordinador integra con todos los checks en verde sin pedir uno (`coordinador.mjs:180-191`). Que el coordinador exija el check «Carriles» en el PR de un carril que no es base, o que la persona lo haga requerido en la protección de `main`.
- **4-54** (sin fase, lo decide la persona; salió del 4.14-2a): si una cotización se está guardando cuando se elige otro vehículo en el panel (abrirlo y elegir dentro de lo que
  tarda el guardado), se guarda con el de antes —lo que se veía al guardar— y la hoja pasa al nuevo sin la tarjeta de éxito; quien guardó puede creer que no se guardó y
  guardar otra vez: una cotización de más. La barra queda fuera de `[data-hoja]` y no se apaga con su `inert`. Assert: con el guardado demorado (la action interceptada), abrir
  el panel y elegir otro vehículo; al terminar, o la pantalla dice que se guardó o el panel no dejó elegir, y el lead tiene una sola cotización nueva. Suma (4.14-3b): elegir un cliente mientras se guarda es el mismo caso (el lead también va en la `key` de la hoja). Suma (4.14-3c): crear un lead desde «+» mientras la hoja guarda es el mismo caso (elegir al creado vuelve a montar la hoja).
- **4-56** (sin fase, lo decide la persona; del tipo de 4-43): `e2e/soporte/cotizar-formula.ts` mide 330 líneas (> 300; 315 antes del 4.14-2a, que le sumó el origen de subasta
  y el borrado de sus vehículos). Partirlo por responsabilidad (la fórmula de prueba, los orígenes y su limpieza, lo que se mira en la base). Assert: `wc -l` de cada parte ≤ 300
  y los mismos specs en verde.
- **4-46** (sin fase, lo decide la persona; salió del 4.13-4b2; del tipo de 4-39 y 4-43): `supabase/tests/cotizacion-hoja.sql` tiene 705 líneas (> 300). Partirlo
  por responsabilidad: los ayudantes `pg_temp.ch_*` a un archivo que `scripts/probar-schema.mjs` cargue antes, y la conducta, los niveles y la moneda aparte, con
  `SOLO` sabiendo cargar los ayudantes. Assert: `wc -l` de cada parte ≤ 300 y los mismos `@test` en verde.
- **5a-4b** (lo decide la persona; medido en el cierre, 4.28: el completo por proyecto tarda 38,6 min en escritorio con 1.062 pruebas y 29,9 en el celular con 787, 68,5 min los dos y 70,4 de reloj desde sus `db:reset`; el assert de 25 min queda lejos con una sola pila): la suite completa no baja de 25 min (el Nivel 3 tarda 40,1 min con 1.065 pruebas; el Nivel 2 ≈ 24; el último completo
  de escritorio, ≈ 28 min). Decidido el 2026-10-19: no se monta la segunda pila local; los shards de CI son la salida (`.github/workflows/ci.yml`,
  CI-1: 4 runners, cada uno con su pila y su base; escritorio por defecto y `proyectos: ambos` a mano; los bloques de escritorio suman 5,7 a
  6,5 min de pruebas cada uno). El mecanismo: los dos proyectos comparten la base y corren con un solo worker. Assert original:
  `pnpm test:e2e:completo` con los dos proyectos ≤ 25 min con las mismas pruebas (`node scripts/areas-cubiertas.mjs`); el cierre (4.28)
  anota el tiempo de cada proyecto para que la persona decida con números si vale la segunda pila local (dos pilas de Supabase con otro
  `project_id`, otros puertos y `scripts/e2e-completo.mjs` lanzando los dos a la vez).
- **5a-39** (sin fase: lo decide la persona): Equipo › «Dadas de baja» dice «Por ahora el equipo eres tú. Invita a la primera persona y
  aparece acá.» con una persona en la lista (el aviso de la cabecera cuenta al equipo activo y no mira el filtro) — con un estado que no es
  «En el equipo» y al menos una fila, el aviso no sale o no contradice la lista; lo mira `e2e/equipo.spec.ts`
  (`src/modules/equipo/features/equipo/components/cabecera-equipo.tsx:29`).
- **5a-40** (sin fase: lo decide la persona, después del hito 4-A; toca la estructura de `leads`): la baja de 200.000 sigue en 9 corridas y 15 s
  porque `cartera` está indexada y ningún update de la cartera es HOT (0 de 200.000; cada uno entra a los 11 btree: 11,7 de 15,7 s; con el
  GIN sin la cartera 84 % HOT, 7 corridas y 9.953,8 ms; con `fillfactor` 90, 91 % y 6) — el job de la baja de 200.000 ≤ 6 corridas o ≤ 10,1 s
  **y** `medir-escala.sql` sin una aserción rota (el GIN sin la cartera rompió 41: Berta «Mamani» leía 25.016 leads ajenos del heap); un
  índice que sostenga lo ajeno sin nombrar la cartera, o que la búsqueda de quien tiene «propios» no dependa de ella, entra con su
  `EXPLAIN`. Lugar: `leads_busqueda_idx` y `leads.cartera` (la tabla `leads` en la base, la policy y `_lead_visible_para()`).
  La persona aceptó el número de hoy (5a-11, opción A); `medir-bajas.sql` asserta el job ≤ 12 corridas, ≤ 20.000 ms y la corrida más larga
  ≤ 3.000 ms. Nada queda «a vigilar».
- **5a-42** (sin fase: lo decide la persona): `medir-bajas.sql` cae sin regresión cuando el disco tarda en `fsync`: sus cinco topes (≤ 12
  corridas, ≤ 20.000 ms, ≤ 3.000 ms por corrida, la llamada ≤ 4.000 ms, la vista previa ≤ 300 ms) son de tiempo y ninguno mide el trabajo;
  con presión de disco la guarda cayó 3 de 3 con 40 lotes y 15,6 M buffers (iguales con y sin presión: 15.505.813 a 15.609.065, 0,7 % de
  dispersión); visto otra vez el 2026-10-25 (job 22.516,7 ms con `sync +5.465 ms`; repetido pasó en 15.779,4 ms). Assert propuesto, no
  aplicado: (1) trabajo: el job hace exactamente 40 lotes y ≤ 16.000.000 de buffers, leídos dentro de la guarda por corrida (el lote de
  1.000, 196 lotes, cae); (2) tiempo: los topes de hoy sin cambiar, juzgados sólo si la ventana estuvo sana (ningún checkpoint con `sync`
  de más de 2 s según `pg_stat_checkpointer` antes y después, y la presión de E/S con mediana ≤ 30 %, `/proc/pressure/io` `some avg10`
  muestreada cada segundo por `scripts/medir-listado.mjs`); si no, la guarda termina con un resultado propio («ms no medibles: sync de N s
  en la ventana», con un código distinto del de una regresión, sin contar como verde, sin reintento ni aflojar un tope). Falla primero
  contra HEAD. Lugar: `supabase/tests/medir-bajas.sql` y `scripts/medir-listado.mjs`. Nada queda «a vigilar».
- **5a-43** (sin fase: lo decide la persona): `medir-importacion-volumen.sql` cae sin regresión por su banda de 0,8 a 1,2 cuando la segunda
  pasada es más rápida (visto el 2026-10-25 con 0,77; repetida sola, 1,0) — la razón de la mediana de los lotes no pasa de 1,2, el trabajo
  (buffers por fila) es el mismo en las dos pasadas, y una pasada más rápida no es un fallo.

#### Sin fase, con su disparador

- **4-104** (sin fase; el próximo paso que toque `scripts/coordinador/`; salió del 4.28): `consolidar-docs.mjs` marca un paso con `<!-- paso:<id> -->` la
  primera vez y las partes que su carpeta de `docs/pasos/` suma después no pasan (el 4.25-1b y el 4.25-2 se copiaron a mano en el 4.28) — en
  `consolidar-docs.test.ts`, una carpeta con una sección nueva tras consolidar la pasa en la corrida siguiente, sin duplicar la que ya estaba.
- **4-1** (decidido: no se hace; se reabre si 4.12 o 4.13 piden mostrar el sugerido): «Sugerido: X» junto al valor modificado. Hoy con un
  override el motor no calcula el sugerido, y `docs/UX.md` (tarea de oro 2) y la captura 09 muestran el modificado con anillo y ↺, sin
  sugerido; ↺ quita el override y la base recalcula. Si se reabre: `evaluar()` y `evaluar_formula()` devuelven `sugeridos[id]` sólo para
  los nodos activos con override, con la paridad de `casos-del-motor.json` y sin faltantes nuevos (`entities/motor-sobrescribir.ts`,
  `evaluar_formula()` y el recorte de `cotizacion_evaluar`).
- **4-4** (sin paso: cuando una fórmula real lo pida): `HOY()` no se soporta en una fórmula como texto (decidido por la persona; el
  compilador lo rechaza con `hoy_no_soportado`). Si se reabre, compila a un nodo `fecha_cotizacion` congelado con la cotización, con su
  caso en `casos-de-formula.json`, `casos-del-motor.json`, el compilador y la paridad de `evaluar_formula()`. Hoy el assert es el rechazo:
  `compilador.test.ts` («HOY()», «hoy() en minúsculas…» y «HOY con argumentos»). Lugar: `entities/nodos.ts`,
  `entities/compilador-sintaxis.ts` y `supabase/migrations`.
- **4-33** (A, sin paso: pulido; el ⚙ de un tipo de cambio desde la hoja): un `tipo_cambio_guardar` que empezó antes de abrir la hoja y confirmó después
  cuenta como visto (`tipos_cambio_historial.cambiado_en` es el `now()` de la transacción que escribe; la ventana dura lo que una
  transacción) — una tarifa que confirma después de abrir la hoja y con `cambiado_en` anterior a la apertura da `desactualizada` al
  guardar. Salida sugerida: `abierta` lleva una huella con clave de las tarifas vistas al abrir (el formato opaco la admite sin cambiar
  firmas) y `cotizacion_crear` la compara con las de hoy. Además, quien deja varias hojas abiertas puede elegir, dentro de 24 h, entre
  horas que de verdad abrió (límite aceptado de «Guardar con la N»).
- **4-60** (sin fase, el próximo paso que toque la paginación del listado; salió del 4.14-2a4): en el completo de escritorio,
  `e2e/listas-por-pagina-pendiente.spec.ts:102` cayó una vez: tras volver la red, el listado y la URL quedaron en 25 pero la preferencia guardada siguió en 10 (5 s de
  espera). La traza (`e2e-fallos/2026-10-30_07-04/`): la única POST, la action que guarda la preferencia, salió 6 ms antes de `setOffline(true)`, falló (status −1) y no se
  reintentó al volver la red (103 ms después). Repetido 5 veces, en verde (`.piloto/salidas/4.14-2a4/repetir-listas.txt`): la prueba es una carrera entre el envío y el
  corte. No se descartó que los hooks del 4.14-2a4 en `/leads` cambien el instante del envío. Assert: con la red cortada mientras la action está en vuelo, al volver la
  preferencia queda guardada (el envío se reintenta), y `--repeat-each=20` de ese spec sin caídas.
- **4-51** (sin fase; se mide y se decide en el paso de la purga de vehículos; salió del 4.14-1): el `on delete set null` de `cotizaciones.vehiculo_id` (`base.sql:25020`) no tiene
  un índice que lo sirva: `cotizaciones_vehiculo_creado_idx` (el del 4.14-1) y el de antes son parciales (`eliminado_en is null`), así que purgar un vehículo busca sus
  cotizaciones de la papelera recorriendo. No empeora con el 4.14-1. Assert: purgar un vehículo con 250.000 cotizaciones no recorre `cotizaciones` (`seq_scan` = 0).
- **4-73** (sin fase; salió del 4.15-3a): el JS en frío de `/cotizaciones/nuevo` subió de 453,1 a 456,9 KB tras el 4.15-3a (commit 2) y quedó en 456,2 tras el commit 3, tope 460 (margen 3,8 KB); el plan decía «no sube». Viene de lo compartido que tocaron los commits 1 y 2 (la hoja generalizada: `DeDondeCalcula`, `iniciales`, `abre`); sin atribuir a un commit (habría pedido compilar `9df08f05`). La guardada también viaja con la hoja nueva: `hoja-de-cotizar.tsx` importa su guardado. Antes de sumar peso a la hoja (el 4.15-3b, el 4.19): atribuirlo y, si hace falta, pedir lo de la guardada con `diferido()`. **Atribuido en el 4.15-3b:** los textos que sólo dice la guardada («Al recargar se abre esa versión», «no puedes guardar esta cotización») viajan en el chunk `3e8zry20292r8.js` (10,4 KB con gzip), que carga también `/cotizaciones/nuevo`; el 3b no lo movió (456,2 KB de 460, igual que antes) y suma sólo a `/cotizaciones/[id]` (440,3 → 442,3 de 448). Sigue abierto, sin fase. **Medido en el 4.18-2:** «Vista previa» (el botón, el contexto, el proveedor y la cáscara de `diferido()`) lo subió a 458,5 KB de 460 (456,9 antes; margen 1,5 KB) y `/cotizaciones/[id]` a 437,6 de 448 (435,7); el 4.18-3 suma «Compartir» a la hoja: antes de él, atribuir y pedir con `diferido()` lo que se pueda. **Medido en el 4.18-3a:** react-pdf en el grafo del servidor suma ≈ 0,45 KB al runtime de Turbopack de todas las rutas (el soporte de módulos asíncronos: `@react-pdf/renderer` es sólo ESM); `/cotizaciones/nuevo` queda en 458,9 de 460 y `/cotizaciones/[id]` en 438,0 de 448 (`docs/DECISIONES.md` › «Paso 4.18-3a»). Al 4.18-3b le queda 1,1 KB en la hoja nueva. **Medido en el 4.18-3b:** «Copiar texto» y «Descargar PDF» viajan en el chunk diferido del modal; a la hoja nueva sólo llega el enlace del PDF: `/cotizaciones/nuevo` 459,0 de 460 (margen 1,0 KB) y `/cotizaciones/[id]` 438,0 de 448. Lo próximo que sume a la hoja nueva (el 4.19) atribuye y difiere primero.
- **4-74** (menor, sin fase; salió del 4.15-3a): `schemas/edicion.ts:14` acota `notas` con `.max(2000)`, que cuenta unidades UTF-16 y la base cuenta caracteres (una nota con emoji cerca del tope bloquearía «Guardar»; hoy ninguna pantalla escribe notas); y `e2e/cotizar-guardada-guardar.spec.ts:124` usa `waitForTimeout(600)` para afirmar que no salió ningún guardado (no hay un estado final que esperar sin un guardado centinela).
- **4-76** (menor, sin fase; salió del 4.15-3b): (a) el aviso de versión no sale si la hoja no tiene secciones que dibujar (`hoja-de-cotizar.tsx` corta con `SinDatosQueVer` antes del hueco `encima`), aunque el aviso lo ve todo el que abre la página; (b) `e2e/cotizar-encima.spec.ts` afirma «sin envío» tras un toque forzado sin un centinela (el mismo caso que 4-74); (c) la prueba de «otra persona cotizó encima» usa a la dueña en otra sesión, no a otra persona; (d) falta la prueba de que la hoja nueva no dibuja el aviso (cierto por construcción).
- **4-77** (4.16-2 lo vuelve a medir; arreglarlo es un paso propio con compuerta `datos`; salió del 4.16-1): cada lectura con la policy de `cotizaciones` carga ≈ 160–240 buffers fijos por llamada: `origenes_con_alcance()` → `mis_permisos()` relee `perfiles` ≈ 74 veces (una por fila de su join, `base.sql:14318-14323`) y la policy de cada ruta activa trae sus InitPlan (`.piloto/salidas/4.16-1/sonda-costo-fijo.txt`). No crece con N; probablemente crece con las filas de `roles_permisos` de quien mira (permisos × orígenes: inferencia, sin medir). Es de toda lectura con esa policy, no del listado, y bajarlo toca una `security definer` de todas las policies. El 4.16-2 lo mide con dos roles de distinto tamaño y deja el número. **Medido en el 4.16-2a** (`medir-vehiculos-inventario-costo-fijo.sql`, con `analyze`): `origenes_con_alcance()` con 1, 74 (la dueña) y 122 concesiones da 7 buffers y ≈ 0,3 ms en los tres, y 1 bloque de `perfiles` (8 filas): no crece con las concesiones de quien mira. Los ≈ 160–240 buffers (148 bloques de `perfiles`) del 4.16-1 no se reproducen: su causa sigue sin medir.
- **4-78** (sin fase; salió del 4.16-2): las listas del panel del vehículo de la hoja de cotizar («Últ. cotización», «Cierre subasta» y su búsqueda) leen `from('vehiculos')` desde el navegador: para quien ve «propios» recorren el origen como el inventario antes del 4.16-2a (`medir-panel-*.sql`: «la chica, sin assert (4-23)»). Se arreglan con las rutas de `vehiculos_inventario()` (o una lectura gemela con los índices de cada lista); se decide al planificarlo.
- **4-83** (sin fase; salió del 4.17-1): `scripts/piloto/auto-carriles.test.ts` no es hermético: corre `auto-carriles.sh --una` contra el estado real del piloto (`.piloto/`), y con `.piloto/PARAR` puesto (`auto-carriles.sh:38`) responde «parado» y caen sus 5 pruebas (`pnpm test` local del 4.17-1: 6.271 en verde y esas 5). Con B y C ya abiertos (`auto-carriles.log`: «todos los carriles corren») responde «todos» y caen las mismas 5 (`pnpm test` local del 4.17-2: 6.423 en verde y esas 5; en CI, sin `.piloto/`, pasan). Se arregla dándole al test una carpeta de estado propia (`PILOTO_DIR` temporal, como `comun.sh:13`), no quitando el `PARAR`: ese archivo lo pone la persona. **4.18-3b:** volvió a caer así (5 caídas, `.piloto/salidas/4.18-3b/guardas-docs.txt`).
- **4-98** (sin fase; salió del 4.18-3a, P2): el PDF de una cotización sale sin logo cuando el logo de la empresa es WebP (react-pdf no lo dibuja; un WebP de hasta 1.024 px se guarda tal
  cual al subirlo, `logo.client.ts`) o un SVG con lo que react-pdf se salta o dibuja distinto (`<style>` y clases, `use`, `symbol`, `mask`, `filter`, `pattern`) o con `<image>`
  (`logo-del-pdf.ts`). Se cierra convirtiéndolo a PNG al subirlo, en un paso propio. Assert: con un logo WebP o un SVG con estilos, el PDF lleva una imagen.
- **4-101** (sin fase; salió del 4.19-3b): el editor de la tarjeta no mueve el orden de los grupos ni agrega o quita grupos a mano (el orden es el de la plantilla y la fórmula manda cuáles hay). Suma un camino a un flujo: lo decide la persona con la vista previa del 4.19-4, cuando se vea el efecto.
- **4-102** (sin fase; salió del 4.19-3c): los botones del pie de `<Confirmar>` (`src/shared/ui/confirmar.tsx`) miden 42 px de alto en móvil, bajo los 44 que pide `ui.md`; es de `shared/ui` (Nivel 2). `e2e/configuracion-cotizacion-tarjeta-descartar.spec.ts` E9 no los exige táctiles por eso. Arreglarlo (`min-h-11 md:min-h-9` en los dos botones) con su Nivel 2 y sus capturas.
- **4-57** (sin fase, el próximo paso que toque esas pantallas; salió del 4.14-2a3): en una corrida larga de escritorio, una apertura justo tras cargar la página o tras
  cerrar un panel `shallow: false` no tuvo efecto: `vehiculos-resumen.spec.ts:68` (Enter en el nombre recién cargado `/vehiculos`), `vehiculos-resumen-casos.spec.ts:66` (el
  segundo «Editar» tras «Cancelar») y, contra HEAD, la sonda del 4.14-2a3 (un clic en «Filtros» recién cargado; `.piloto/salidas/4.14-2a3/sonda-c0.txt`). Repetidos, en verde.
  Sin causa todavía (¿la hidratación?, ¿una navegación pendiente que pisa la nueva?). Assert: `--repeat-each=20` de esos dos specs en escritorio, con la página recién
  cargada, sin caídas; si caen, la causa medida y su arreglo.
- **4-45** (sin fase, un paso de base propio; decidido en el 4.18-1, P5; salió del 4.13-4b1): `cotizaciones.moneda_mostrar` (`char(3)`, legible) no la escribe ninguna RPC ni la lee la app, y con
  `ver_total_bs` su propósito queda en duda. Se decide en el 4.18, con la tarjeta y el PDF: se usa o se quita (migración que la borra, con
  su `db:types`).
  Assert: o una prueba de base que la escribe y la lee, o `moneda_mostrar` fuera de `cotizaciones` y de `database.types.ts`.
  Suma (4.13-4b2): la tarjeta y el PDF de una cotización guardada necesitan la moneda del total en Bs; la hoja la lee de `cabecera.moneda_bs`, que sale de
  la versión y del tipo de cambio de hoy. `moneda_mostrar` podría guardarla al crear: se decide aquí. **Decidido (4.18-1, P5):** la tarjeta lee la moneda de SU
  versión (`cotizacion_tarjeta` › `moneda_bs`, la regla de la hoja); `moneda_mostrar` y `cotizaciones.plantilla_id` (P1: la tarjeta usa la plantilla publicada de hoy)
  siguen sin uso y se quitan juntas en un paso de base propio, que recrea `cotizaciones_listado()` sin `moneda_mostrar` y su medición.
- **4-47** (sin fase; quedó del 4.23-3: la tabla de más de 1.000 filas ya llega a todas desde el editor; falta el enlace desde la ayuda y rotular una congelada sin viva, que pide congelar `columnas`, un cambio de base; salió del 4.13-4c2): la ayuda de una tabla dibuja hasta 1.000 filas y dice «Mostrando las 1.000 primeras filas.» sin un camino a las demás (se aparta de
  la regla de `.claude/rules/escala.md`: siempre hay un camino a lo antiguo); el editor de tablas (4.23) lo da. Además, sin copia viva de la tabla, la base manda la clave como
  nombre y `columnas` vacía, y la pantalla deriva las columnas de la primera fila (con la clave de encabezado). Assert: una tabla de más de 1.000 filas llega a todas desde
  el editor, y una tabla congelada sin viva se rotula con etiquetas.
- **4-48** (sin fase; el próximo paso que toque `src/shared`): `src/shared/ui/xcell/CLAUDE.md:38` dice «lo que abran [los botones] pasa sus cifras por `<Monto>`»; con la
  ayuda de una tabla (4.13-4c2, P13) sólo es cierto para una celda de dinero (un factor `raw` queda a la vista). No se corrigió en el 4c2 porque tocar esa ficha da Nivel 2.
  Assert: la línea dice lo que hace la hoja.

### Cerrados en la Fase 4

Lo cerrado (y las inestables, que ya no son abiertos), hasta que pase a `docs/archivo/PLAN.md`: el 4.28 no pudo moverlo porque esta sesión no lee el archivo
(`Read(docs/archivo/**)` en `.claude/settings.json`).

- **4-5** (**cerrado** en el 4.21; 4.28 lo pasa aquí tras verlo en la BITACORA) (4.21): el ⚙ de una constante que nació de un literal deja viejo el texto de su fila. La fila guarda `texto`
  (`=(remate+fees)*4%`) y el compilador crea una `constante` auxiliar por cada número escrito (`total__2` = 4%); el ⚙ publica la N+1 con
  otro valor en `params` y el `texto` sigue diciendo 4%; si el editor recompila, el ⚙ se deshace en silencio — un test del editor: cambiar
  con el ⚙ una constante auxiliar y reabrir la fila muestra el valor nuevo (o avisa que el texto ya no manda); recompilar no pisa el ⚙ sin
  preguntar. Se decide en 4.21: reescribir el literal en el texto, o dejar el ⚙ de una constante auxiliar sólo para quien no tiene texto
  (`formula_cambiar_constante`).
- **4-6** (**cerrado** en el 4.21; 4.28 lo pasa aquí tras verlo en la BITACORA) (4.21): `compilarExpresion` no mira `MAXIMO_DE_TEXTO`; sólo `validarFormula()` y `validar_formula()` rechazan una fila con
  `texto` de más de 2.000 (`forma`, en `definicion.nodos.<i>.texto`) — un e2e o prueba del editor que escribe 2.001 caracteres en una fila
  y ve el error en esa fila, sin llamar a `validarFormula()`; con 2.000 no hay error (`MAXIMO_DE_TEXTO` de `index.ts`).
- **4-8** (**cerrado** en el 4.21; 4.28 lo pasa aquí tras verlo en la BITACORA) (la parte del ⚙ y de revertir, cerrada en el 4.20-1; la del borrador, 4.21): el ⚙ pisa el borrador en curso, y guardar el borrador no pide su versión. `formula_cambiar_constante()` guarda un
  borrador con la definición y el diseño de la publicada y lo publica; `formula_guardar_borrador()` (sin `p_actualizado_en_esperado`,
  excepción de `.claude/rules/migraciones.md`) pisa el de otra persona; publicar toma el borrador más reciente — una carrera o prueba: A
  guarda un borrador, B hace el ⚙ y A ve un conflicto (PT409) al guardar o publicar, o el ⚙ se niega diciendo que hay un borrador;
  `formula_revertir` publica una copia con el diseño de la versión elegida. Se decide en 4.20 si el ⚙ se niega o archiva el borrador.
- **4-10** (**cerrado** en el 4.14-2c3, 2026-10-30; 4.14): el tipo de vehículo que trae la subasta no casa con las claves de la tabla de transporte. El transporte sembrado casa
  `tipo` con el campo `tipo_vehiculo` (`autos`, `motos`, `vagonetas_medianas`…) y apibara guarda otro vocabulario (`AUTOMOBILE`…): el
  transporte queda sin valor (`fila_sin_coincidencia`) — un vehículo creado con la respuesta grabada de apibara (`e2e/fixtures/apibara`)
  da un transporte sugerido en `subasta_usa`, o la persona elige su tipo de las filas de la tabla en el panel del vehículo y el sugerido
  aparece. 4.14 decide si se mapea el vocabulario de la subasta a las claves o si el campo pasa a ser una opción de las filas.
  **Decidido (P6 del 4.14-1, 2026-10-29):** en el panel del vehículo se elige el tipo entre las filas de la tabla, con el sugerido marcado; lo hacen el 4.14-2c2 (la base: la hoja no sabe qué dato casa con qué tabla, la fórmula no viaja a quien cotiza, D7) y el 4.14-2c3 (la pantalla), y se guarda
  en el vehículo (P3 del 4.14-2a). El 4.14-2c2 (la base) está hecho: la celda de tabla dice qué dato del vehículo casa con su tabla y sus filas salen de `cotizacion_tabla`. El 4.14-2c3 lo cierra: «Elegido»
  ofrece las filas, elegir guarda `atributos.tipo_vehiculo` y el transporte toma valor; la tarea de oro 2 con un enlace de Copart lo recorre (`e2e/cotizar-tarea-de-oro-enlace.spec.ts`).
- **4-14** (**cerrado** en el 4.16-1, 2026-11-04: `cotizaciones_listado()`, invocadora, con una ruta por índice; con 250.000, Ana 1,8 s → 18,6 ms y la «chica» 2,3 s → 1,6 ms, sin crecer con N
  y con lo que dice la regla, en `medir-cotizaciones-listado.sql` y `cotizaciones-visibilidad.sql`; 4.16): (suma del 4.14-2b: el historial de Ana en pantalla recorre sólo las cotizaciones del vehículo, de a 21, y no crece con N) «todas las que veo» de quien ve «propios» recorre el índice global. Con 250.000 cotizaciones **Ana** (5.000 propias y
  1.000 de otras personas sobre su cartera) tarda ≈ 1,6 s y ≈ 42.000 buffers y la **«chica»** ≈ 2,0 s y ≈ 58.000 (`cotizaciones_listado_idx`
  entera, descartando lo ajeno; la familia de 5a-2) — en `medir-cotizaciones-lectura.sql`, la página 1 y una profunda por cursor de Ana y
  de la «chica» con 50.000 y 250.000: ≤ 50 ms y un tope de buffers que no crece con N, y lo que devuelve es lo que dice la regla
  (`cotizaciones-visibilidad.sql`). Se escribe al empezar el 4.16 y tiene que caer contra lo de hoy. **Ojo:** en esa medición la «chica»
  tiene 0 cotizaciones, no 3 (la rama de Ana va primero en `pg_temp.rellenar`): su rama va antes, como en `medir-vehiculos-lectura.sql`.
  Salida probable: «propias» por `creado_por` y por la cartera (`leads_asesores_usuario_vigente_idx` hacia `cotizaciones_lead_idx`),
  juntas por `creado_en desc, id desc`, en una función con sus dos consultas y un umbral; se decide con el `EXPLAIN` delante.
  Suma (4.14-1, sin assert): el historial de un vehículo de Ana («propios», ve 5 de sus 5.000 cotizaciones) recorre las del vehículo: 38 ms y 1.452 buffers la página 1,
  igual con 50.000 que con 250.000 (crece con las del vehículo, no con N; `medir-historial-del-vehiculo.sql`). Y con un promedio bajo de cotizaciones por vehículo, el plan
  genérico de la página profunda de un vehículo muy cotizado puede ordenar las suyas (334 buffers, ~1 ms, con 1.000 vehículos y 5.000 en uno): por eso la medición siembra 100.
- **4-17** (**cerrado** en el 4.25-1b; 4.28 lo pasa aquí tras verlo en la BITACORA) (4.25): una final creada con `cotizacion_crear` no hace lo que `cotizacion_marcar_final`. `cotizacion_crear(…,
p_clase := 'final')` exige `cotizaciones.final.gestionar`, un vehículo y el índice de «una final por vehículo» (23505), pero no
  vincula el vehículo al lead ni manda las preventas del vehículo a la papelera, y ninguna de las dos pasa el lead al primer tipo de la
  clase cliente — en `cotizacion-crear.sql`, que crear una final y marcar una preventa como final dejen el mismo estado (vehículo
  vinculado, preventas en la papelera, lead en la clase cliente), o que crear una final sin pasar por la preventa se rechace con su
  motivo. `cotizacion_marcar_final` ya toma primero su cotización.
- **4-23** (**cerrado** en el 4.16-2b, 2026-11-05: la pantalla lee por `vehiculos_inventario()` a quien ve «propios» (`fuenteDelInventario()`); el «sin assert, 4-23» de `medir-vehiculos-lectura.sql` queda: mide la lectura por la tabla. Antes, **resuelto en la base** en el 4.16-2a: la chica 32,3 → 2,5 ms con 250.000; el diseño de las rutas está en `cotizaciones_listado()` del 4.16-1: cada ruta por su índice, uno solo entero por columna que se sondea): el inventario de quien ve «propios» y casi nada es suyo recorre el origen entero: la «chica» (3 propios) 6,8 ms y 1.744
  buffers con 50.000 vehículos y **32,7 ms y 6.647** con 250.000 (no es regresión del 4.11; sólo con `vehiculos.ver` en «propios») — en
  `medir-vehiculos-lectura.sql`, la página 1 y una profunda de la chica con 50.000 y 250.000: ≤ 10 ms y buffers que no crecen con N, y lo
  que devuelve es lo que dice la regla (`vehiculos-visibilidad.sql`); se escribe antes de arreglar y cae contra lo de hoy. Lugar:
  `buscarVehiculos()` (`src/modules/vehiculos/infra/queries/listado.ts`) y una función de lectura con las dos rutas de 4-14 (`creado_por`,
  que no tiene índice, y la cartera hacia `vehiculos_lead_id_idx`), con los filtros del inventario que hoy van por PostgREST; se decide con 4-14.
  Suma (4.14-1, sin assert): la chica recorre también las dos listas del panel del vehículo. Con 50.000 y 250.000, «Últ. cotización» 3,0 y 10,8 ms (1.039 y 4.924 buffers) y
  «Cierre subasta» 2,9 y 11,3 ms (1.010 y 5.191) (`medir-panel-ultima-cotizacion.sql`, `medir-panel-cierre-subasta.sql`).
- **4-24** (**cerrado** en el 4.15-1, 2026-11-04: `case public.alcance_de(…)` como `puede_vehiculo()`; T3 en `medir-cotizaciones-lectura.sql`, Ana pide `alcance_de` 2 veces con HEAD y 1 con el cambio; 4.15): `puede_cotizacion()` mira el alcance dos veces para quien ve «propios» (el `cross join lateral` se aplana; 2 llamadas a
  `alcance_de`, con «todos» 1) — en `medir-cotizaciones-lectura.sql`, `cotizacion_leer` de Ana pide `alcance_de` = 1, y en
  `cotizaciones-visibilidad.sql` el texto de `puede_cotizacion` lo evalúa como argumento de un `case` (como `puede_vehiculo()`; un
  `offset 0` lo rechaza `escala.sql`). Migración nueva sobre `puede_cotizacion()`.
- **4-26** (**cerrado** en el 4.15-1, 2026-11-04, **«no reproducida»**: el spec 10 veces, de 273 a 359 ms, y el bloque 2 dos veces desde `db:reset`, 321 y 299 ms; ninguna sentencia de la respuesta pasó de 250 ms en el log; lo de más de 1 s fue la siembra (1,2 a 3,6 s por lote de 1.000) y el arnés; checkpoints con `sync` de 0,40 a 0,54 s, sin esperas de candado; la siembra escribe ≈ 37 MB de WAL, así que no es 5a-40 ni 5a-42; el autoanalyze cayó 0,6 y 3 s después de la siembra sin atrasar la respuesta. **9-11** queda como el camino para verla en CI. La 3.ª hipótesis sale al revés y va a **4-67**; antes del 4.15): la base se atrasó ~20 s tras sembrar 5.001 leads y una prueba de `leads-exportar` cayó en CI (dispatch
  40320539963, bloque 2, `9dc3653`, `leads-exportar.spec.ts:263`; la prueba ya espera la respuesta con un tope propio de 30 s): se
  desconoce por qué se atrasó la base. Hipótesis sin confirmar: **5a-40** (cada lead sembrado hace un update de `cartera` no HOT), **5a-42**
  (un checkpoint con `sync` de 5 a 17 s) o el conteo de una persona recién sembrada sin `analyze`. Medición (local, base libre, sin
  cambiar el producto): el spec solo 10 veces y el bloque 2 dos veces desde `pnpm db:reset` (`E2E_PROD=1 E2E_COMPLETO=1 pnpm exec
playwright test --shard=2/4 --project=escritorio`), con `log_min_duration_statement = 250`, `log_lock_waits`,
  `log_autovacuum_min_duration = 0` y `log_checkpoints` puestos como `supabase_admin` y revertidos, `pg_stat_statements_reset()`,
  `pg_stat_checkpointer` y `pg_current_wal_lsn()` antes y después, `/proc/pressure/io` cada segundo, y el `explain (analyze, buffers)` del
  conteo recién sembrado con y sin `analyze leads, leads_asesores` — toda corrida con la respuesta sobre 1 s queda explicada por el log de
  su ventana (checkpoint con su `sync`, autovacuum y de qué tabla, sentencia de más de 250 ms, espera de candado), con la causa escrita
  aquí; si es de 5a-40 o 5a-42, se dice cuánto WAL escribe la siembra y se decide junto a ese punto. Si 10 + 2 corridas no la reproducen,
  se cierra «no reproducida» con los números y **9-11** queda como el camino para verla en CI. Nada queda «a vigilar».
- **4-30** (**cerrado** en el 4.22; 4.28 lo pasa aquí tras verlo en la BITACORA) (4.22): un diseño de la hoja no tiene tope de tamaño (`validar_diseno()` no limita los ítems; la hoja más grande real,
  `subasta_usa`, tiene 39 ítems y 430 nodos del DOM; ≈ 15 nodos por celda) — publicar un diseño de más de N ítems es rechazado con la
  regla y su `donde` (N sale de medir: el tope de nodos de la hoja es 460), o la hoja las divide.
- **4-34** (**cerrado** en el 4.15-1, 2026-11-04: `_cotizacion_puede_guardar()` pide ver y editar antes y después del candado. Lo que pasaba de verdad: quien edita sin ver no escribía —`_cotizacion_armar` pide ver—, pero antes de esa línea tomaba el candado y respondía distinto de lo inexistente: PT409 con quién y cuándo, 22023 del vehículo o del título, `intento_reusado`; 4.15): `cotizacion_guardar` deja editar con `cotizaciones.editar` y sin `cotizaciones.ver` (usa
  `puede_cotizacion(id, 'cotizaciones.editar')` y `_nodos_visibles()` pide `ver`: nada se ve ni se edita, y lo guardado se conserva) —
  un rol con sólo `cotizaciones.editar` no puede guardar (42501), como `cotizacion_crear` sin `ver`.
- **4-36** (cerrado en el 4.20-1; publicar la fórmula con su diseño: misma ruta que mide; elegido al integrar el A0): `supabase/tests/medir-publicar.sql`
  no se puede repetir sin `db:reset` — dos `pnpm db:medir` seguidas, sin `db:reset` entre ellas, pasan las dos.
- **4-49** (**cerrado** en el 4.14-2a6, 2026-10-30; hecho en parte en el 4.14-2a2, 2026-10-29, en el 4.14-2a3 y en el 4.14-2a4, 2026-10-30; P4 del 4.14-2a; salió de 4-44 (a), 4.13-4d): tras **recargar** con un panel por URL abierto, «atrás»
  cierra el panel pero el foco queda en `body`. Medido en el 4.14-2a2 (`docs/DECISIONES.md` › «Paso 4.14 (2a2)»): el documento y el botón no se montan de nuevo; el modal se
  cierra montado y Base UI no devuelve el foco; el drawer del vehículo, que le pasa una ref a `focoAlCerrar`, sí lo devuelve. **Hecho** en `usePanelPorUrl()` y en «Nuevo nivel»
  con la vuelta del foco (`src/shared/ui/vuelta-del-foco.ts`; `e2e/paneles-foco-al-volver.spec.ts`, en verde). **Hecho en el 4.14-2a3** (`docs/DECISIONES.md` › «Paso 4.14 (2a3)»):
  desde un menú la vuelta va al «⋯» (también renombrar un nivel), la ficha sobrevive a una navegación del servidor, y `use-filtros.ts` y los 4 hooks de `vehiculos` salen de
  `PENDIENTES` (la sonda midió el defecto en los siete casos; `e2e/paneles-foco-al-volver-vehiculos.spec.ts`). **Hecho en el 4.14-2a4** (`docs/DECISIONES.md` › «Paso 4.14
  (2a4)»): los 6 hooks del listado de leads (alta, etiquetas, exportar, la acción de fila, el embudo y el lead rápido) salen de `PENDIENTES`; la sonda midió el defecto en
  siete de doce casos (`e2e/paneles-foco-al-volver-leads.spec.ts`), y desde el selector del «⋯» el foco va al «⋯» antes de «Gestionar etiquetas». **Hecho en el 4.14-2a5** (`docs/DECISIONES.md` › «Paso
  4.14 (2a5)»): los 5 hooks de la ficha salen de `PENDIENTES`; la sonda midió el defecto en 8 de los 16 casos medidos de la ficha (F6 no se midió), con su e2e (`e2e/paneles-foco-al-volver-ficha.spec.ts`), y en F16 y F17 (4-61), y cierran 4-58
  y 4-59 en el lead rápido. **Cerrado en el 4.14-2a6** (`docs/DECISIONES.md` › «Paso 4.14 (2a6)»): los 3 hooks de Configuración › Leads marcan la vuelta (la sonda midió el defecto en los 9
  casos, `e2e/paneles-foco-al-volver-configuracion.spec.ts`); F6 ya volvía y lleva su e2e porque sin la marca cae; `scripts/guardas/paneles-con-vuelta.ts` se borró y
  el guardián exige `abrirConVuelta` y `useVueltaDelFoco` en cada `history: 'push'` de `src/`. Se cierra también 4-44 (a).
- **4-58** (**cerrado** en el 4.14-2a5, 2026-10-30; salió del 4.14-2a4, K9 y K10 de su sonda): en el lead rápido, anotar o agendar desde el «⋯» del resumen, recargar y «atrás»
  dejaba el foco en «Editar». Medido: el botón de la pestaña ya no está en el DOM y el modal devolvía el foco a lo que lo tenía. Hecho con `enPestana` (`docs/DECISIONES.md` ›
  «Paso 4.14 (2a5)»); `e2e/paneles-foco-al-volver-leads.spec.ts`, en los dos proyectos, en rojo contra HEAD.
- **4-59** (**cerrado** en el 4.14-2a5, 2026-10-30; salió del 4.14-2a4, m9 de su sonda): tras recargar con `?lead=<id>&panel=editar-lead`, el segundo «atrás» cerraba el lead rápido
  con el foco en `body`. Hecho con `esperaSinPanel` en `useDrawerDeLead` (en rojo contra HEAD, en los dos proyectos); queda su límite en 4-62.
- **4-65** (**cerrado** en el 4.14-3b, 2026-10-31: límite aceptado por la T3, declarado en `docs/RENDIMIENTO.md` y con su assert en `medir-cartera-reciente.sql`: 285 ms con 212.000 leads, tope 400; sin fase; salió del 4.14-3a, T3): la pestaña por clase del panel del cliente recorre toda la cartera de quien mira cuando no tiene ningún lead de esa clase (`tipo_lead_id` no está en `leads_asesores_reciente_idx`): 66 ms con 20.000 leads en su cartera y 289 ms con 80.000 (tope declarado 400 ms). Si el 3b lo siente en la pantalla, la salida es copiar también la clase del lead en la cartera, con su índice y sus triggers (otro plan, a auditar). Assert: la pestaña de la clase ausente de `supabase/tests/medir-cartera-reciente.sql`.
- **4-53** (**cerrado** en el 4.14-3a, 2026-10-31: `scripts/sembrar-volumen.mjs` importa `readFileSync`, y `db:sembrar-volumen` y `db:medir:volumen` corren detrás; sin fase; salió del 4.14-1): `pnpm db:sembrar-volumen` cae con `ReferenceError: readFileSync is not defined`:
  `scripts/sembrar-volumen.mjs` lo usa sin importarlo desde `c300ad7b` (el ayudante del stack de cada worktree). El 4.14-1 sembró con una copia que lo importa, fuera del repo.
  Assert: `pnpm db:sembrar-volumen` termina y `pnpm db:medir:volumen` corre detrás.
- **4-68** (**cerrado** en el 4.24; 4.28 lo pasa aquí tras verlo en la BITACORA) (4.24, la papelera propia; salió del 4.15-1): `papelera_enviar` deja mandar una cotización a la papelera con `cotizaciones.editar` y sin `cotizaciones.ver` (el mismo defecto que 4-34, en otra puerta) — que pida ver, con el error de lo inexistente.
- **4-69** (**cerrado** en el 4.27; 4.28 lo pasa aquí tras verlo en la BITACORA) (4.27, adjuntos; salió del 4.15-1): las policies «cotizaciones_adjuntos: crear» y «cotizaciones: subir» (`storage.objects`) piden `editar` sin `ver` — que pidan ver; son policies: su paso corre el Nivel 2.
- **4-70** (**cerrado** en el 4.24; 4.28 lo pasa aquí tras verlo en la BITACORA) (4.24, la papelera propia; salió del 4.15-2): `papelera_restaurar` de una versión nueva (cotizar encima) cuando su anterior ya tiene otra viva da el 23505 de `cotizaciones_encima_unica`, sin texto humano: un PT409 «Esa cotización ya tiene otra versión nueva», o restaurarla sin la marca de anterior.
- **4-75** (**Cerrado en el 4.17-5c**: el panel «Revisiones» ofrece «Ir a una fecha» mientras hay más hacia atrás o se mira desde una fecha; el día elegido va como `p_hasta` = el inicio del día siguiente en la zona de la empresa, exclusivo (`hastaDeUnDia()`); «Desde el …» y «Volver a las más recientes» arriba; el tope dice «… Para ver anteriores, ve a una fecha.»; `cotizar-guardada-revisiones.spec.ts` con 501 revisiones de horas distintas): el panel «Revisiones» de una guardada se detiene en las 500 más recientes (`<AvisoDeTope>`, «Mostrando las 500 más recientes.») y no tiene cómo llegar a las más viejas: el 4.17, que hace los «Ver más» de las secciones «Cotizaciones» y el camino a lo antiguo del historial, suma ahí «Ir a una fecha» al panel. Motivo de no hacerlo ya: 500 ediciones de una sola cotización no es un caso real y la base lee de a 20 por `cotizaciones_revisiones_cotizacion_idx`.
- **4-80** (no es abierto: inestable que pasa al reintentar, regla del 2026-11-08) (sin fase; salió del 4.16-4a): `e2e/leads-etiquetas.spec.ts:216` («Etiquetas…» desde el «⋯» de la fila, con el teclado) cayó una vez en el completo de escritorio del 4.16-4a (la etiqueta no llegó a la base en 5 s) y pasa 3 de 3 sola sobre el mismo build (`.piloto/salidas/4.16-4a/etiquetas-1.txt` a `-3`). Escribe el nombre y pulsa Enter sin esperar que el selector muestre la opción: una carrera con la hidratación o la lectura de etiquetas. Se hace determinista esperando el estado (`soporte/esperas.ts`), no con un reintento.
- **4-84** (**cerrado** en el 4.15-5; 4.28 lo pasa aquí tras verlo en la BITACORA) (4.15-5; salió del 4.15-4, P1): `scripts/guardas/carriles.mjs` (`DOMINIOS_DE_B`) y `docs/ORCA.md` todavía describen el carril B de la Fase 7: una rama `b/…` sólo puede crear migraciones de `agenda|chat|notificaciones|buscador|web`, y las ramas `c/…` no las mira nadie. Con `docs/plan.yaml` el B es la fórmula (el 4.20 y el 4.23 crean migraciones de fórmula y tablas): su primer PR con migración caería. Lo arregla el 4.15-5, del que dependen el 4.20 y el 4.24. **Cerrado en el 4.15-5** (`docs/DECISIONES.md` › «Paso 4.15-5»).
- **4-87** (**Cerrado en el 4.15-7**: la clave, su concesión y los dos huecos de `scripts/`; salió del 4.15-5, P2): el 4.24 necesita del A la clave `cotizaciones.papelera.purgar` en `src/shared/lib/permisos.ts` y `supabase/seed.sql` (su migración de catálogo la puede crear el C, en `compartido`) y, si su RPC por lotes lleva tamaño, su entrada en `scripts/guardas/paginas-en-la-base.ts`: la guarda de carriles hace caer el PR del C que los toque. `cotizaciones.configurar` ya existe y el 4.20 sólo la usa en `seccion.ts`, del B.
- **4-89** (**cerrado** en el 4.26; 4.28 lo pasa aquí tras verlo en la BITACORA) (4.26, su compuerta `datos`; salió del 4.15-6): `configuracion/empresa` tendrá pestañas de un área (4.15-6c) y entra a Empresa quien tenga cualquiera de sus permisos. Para **cualquier** pestaña de área, el 4.26 decide en su compuerta `datos` quién la ve sin los permisos de Empresa, esté o no su clave en `NAVEGACION` (si ya está, un rol de hoy pasaría a ver Empresa con esa sola pestaña). Además, una pestaña de área sólo pide claves de la entrada «Configuración» de `NAVEGACION` (`secciones.test.ts`; `_shell/` es del A y dispara el Nivel 2): `cotizaciones.comprobantes.emitir` no está, y si hace falta la suma el A en un paso suyo. `secciones.test.ts` hace caer una clave que no esté en `NAVEGACION` por `PERMISOS_DE_EMPRESA` (4.15-6c). Límite de la URL: la sección de un área recibe `parametros` y guarda su estado en `?panel=`; otro parámetro (que la barra tendría que limpiar) se le pide al A. La pestaña vive en `configuracion/empresa/comprobantes/{pestanas.ts,seccion.tsx}`, del C.
- **4-91** (**cerrado** en el 4.27; 4.28 lo pasa aquí tras verlo en la BITACORA) (4.27, o el paso del área que lo pida; salió del 4.15-7): el registro de RPC con tamaño (`scripts/guardas/paginas-en-la-base.ts`, del A) sólo tiene el hueco de la papelera (`paginas-en-la-base-papelera.ts`, del C). Comentarios (4.27) u otra área que cree una RPC con tamaño necesita su archivo, que lo abre el A antes: si no, la guarda de carriles hace caer el PR del área que edite el registro.
- **4-92** (no es abierto: inestable que pasa al reintentar, regla del 2026-11-08) (sin fase; salió del 4.15-7): `e2e/leads-alta-casos.spec.ts:302` (dos personas guardan el mismo teléfono a la vez) cayó una vez en el completo de escritorio del 4.15-7 (`.piloto/salidas/4.15-7/completo.txt`, línea 1407: 5 s después de los dos Ctrl+Enter no había ningún lead con ese teléfono) y pasa 3 de 3 sola (`solas-3x.txt`, `--repeat-each=3`). No toca la papelera ni los permisos. Traza: `e2e-fallos/2026-11-06_07-35/`; sin medir la causa.
- **4-97** — **cerrado el 2026-11-08: el spec se borró** (los `paneles-foco-al-volver*`, pulido de la Fase 9; «Pruebas: sólo lo clave»). (sin fase; salió del 4.17-5b): `e2e/paneles-foco-al-volver-configuracion.spec.ts:148` («Tipos, «Nuevo» del encabezado») cayó una vez en el completo de escritorio del 4.17-5b (`.piloto/salidas/4.17-5b/completo.txt`, línea 1423: tras «atrás», el modal «Nuevo tipo» seguía abierto 5 s después) y pasa 3 de 3 sola (`repetir-paneles-foco.txt`, `--repeat-each=3`); en esa repetición, «Tipos de seguimiento, «Nuevo»» cayó una vez en el ingreso (quedó en `/ingreso`) y pasa 3 de 3 sola (`repetir-tipos-de-seguimiento.txt`). Con la máquina cargada por otro proyecto (loadavg 8 a 14). No toca lo movido (Configuración, no la línea de tiempo). Trazas: `e2e-fallos/2026-11-06_16-42/` y `2026-11-06_16-45/`; sin medir la causa.
- **4-99** (no es abierto: inestable que pasa al reintentar, regla del 2026-11-08) (sin fase; salió del 4.18-3b): `e2e/leads-recorrido-cierre-2.spec.ts:213` («Ana · salir de un lead que le comparten») cayó una vez en el completo del hito 4-A: tras el clic en «Salir de este lead» el diálogo no apareció en 5 s (línea 224); 3 de 3 sola (`.piloto/salidas/4.18-3b/completo-repetir-1.txt`). Sin causa medida: la traza, en `e2e-fallos/2026-11-07_03-13/` (sólo local, no se versiona).
- **4-100** (no es abierto: inestable que pasa al reintentar, regla del 2026-11-08) (sin fase; salió del 4.24-2b, estabilizar-2): `e2e/cotizaciones-listado-resumen.spec.ts:87` (R2, sólo en movil) cayó una vez en el CI (corrida 42339363068): `toBeVisible()` del resumen agotó 5 s. No se reprodujo: 0 de 8 a 16× con el navegador frenado, 0 de 6 a 6×, y con 1,5 s y 4 s de latencia en las lecturas de la pantalla y 3 s en los scripts; sin traza. Se cerró el hueco que se lee en el código (tras abrir y tras «atrás» no esperaba la URL: nuqs dibuja el resumen antes de escribir `cotizacion=` y un «atrás» que sale antes vuelve una entrada de más); si vuelve, mirar la traza del CI antes de tocar nada más.
- **4-93** (no es abierto: inestable que pasa al reintentar, regla del 2026-11-08) (sin fase; salió del 4.15-7): `e2e/vehiculos.spec.ts:106` (buscar con comas, filtrar por puertas y limpiar) cayó una vez en el mismo completo (línea 1450: tras «Limpiar filtros» la página decía «Ningún vehículo en Corea todavía»; sus 4 hermanas `serial` quedaron «did not run») y pasa 3 de 3 sola y con el archivo entero (`solas-3x.txt`, `vehiculos-spec-entero.txt`: 7 de 7). Traza: `e2e-fallos/2026-11-06_07-35/`; sin medir la causa. No es otro spec en paralelo (el completo corre con un worker, y `:35` y `:58` acababan de ver «Kia Sportage»): lo que encaja es una carrera dentro de la prueba entre «Limpiar filtros» y la búsqueda vacía.
- **4-55** (cerrado en el 4.18-2; decidido en el 4.18-1, P6; salió del 4.14-2a): la referencia del cotizador pone el título de la cotización en el panel del vehículo; `cotizacion_crear` no recibe título. Se decide con
  la tarjeta y el PDF. Assert: lo que se decida, con su e2e. **Decidido (P6):** la tarjeta titula con el vehículo y el encabezado con el título de la variante; la hoja no pide título. **Cerrado en el 4.18-2:** `e2e/cotizar-vista-previa.spec.ts` (E1) lo prueba: la banda de la tarjeta dice el título del vehículo y el encabezado, el título de la opción elegida de la variante; la hoja no pide título. (Pasa a `docs/archivo/PLAN.md` en la próxima limpieza: esta sesión no puede escribir en `docs/archivo/`.)
- **5a-12** (**Cerrado en el 4.17-2**: la sección «Oportunidades» de la ficha lee 10 en el servidor y «Ver más» de a `TAMANO_DE_VER_MAS` (20) desde el navegador con `lead_oportunidades()` (la base, del 4.17-1), hasta `TOPE_DE_LO_CARGADO` (500), con el aviso «Mostrando las 500 más recientes, las abiertas primero.» y el camino «Buscarlas en tu embudo» (el kanban del embudo de la última cargada con el nombre del lead; P1 = 1); se fue «Ver todas» (`?todas=1`, P2 = 1); `leads-oportunidades-ver-todas.spec.ts` con 1.000 sembradas por SQL: la sección aporta 62,7 KB con 1.000 y 61,7 con 10, cada «Ver más» pesa ≈ 15,5 KB desde la 1.ª hasta la 25.ª y los nodos pasan de 238 a 11.509 con 500): un lead con 1.000 oportunidades llegaba sólo a 100 y cada una pesaba 3,5 KB en el documento.
- **5b-7** (**cerrado** en el 4.23-1; 4.28 lo pasa aquí tras verlo en la BITACORA) (4.23, antes de escribir cómo se reordenan las filas de una tabla de referencia): la carrera «dos personas reordenan tipos de
  seguimiento» no distingue el candado de `tipo_seguimiento_mover`: al quitarle `lock table … share row exclusive` la prueba de
  `scripts/carreras/configuracion-de-leads.mjs` sigue en verde — quitar el candado hace caer `pnpm db:carreras` (una carrera donde B calcule
  su lugar con la lista de antes de que A termine) o, si se demuestra que no hace falta, se quita y la RPC dice por qué en su comentario (en la base, `supabase/migrations/20261028180656_base.sql`).

---

## Carriles de las fases 5 a 9

Partidas el 2026-11-09 para correrlas de corrido, sin compuertas (`docs/PILOTO.md` › «De corrido»). Son **69 pasos y unas 209 partes**
(una parte = una sesión, hasta 6 commits y su PR); al ritmo medido al final de la Fase 4 (10,4 USD y 0,84 h de sesión por parte), unos
2.200 USD de uso equivalente y entre 4 y 6 días de reloj con tres carriles, más lo que se duerma por el límite de uso.

- **Las cinco fases están abiertas a la vez.** Un paso empieza cuando sus dependencias están integradas en `main`, sea de la fase que
  sea (`docs/plan.yaml`), y cada carril toma primero el de camino más largo. Esperar a cerrar una fase para abrir la siguiente dejó a
  los carriles 23 h «sin paso libre» en la Fase 4; la Fase 7 y casi toda la 8 y la 9 no necesitan nada de la 5 ni de la 6.
- **Lo que sí va en orden entre fases** (está en `depende_de`): la base de `logistica` después de la de `flujos` (6.01 tras 5.02); mover
  en la base después de transiciones y requisitos (6.02 tras 5.05 y 5.07: recrean las mismas funciones, y el segundo parte de lo que dejó
  el primero); documentos tras los tipos de documento (6.05 tras 5.03); transporte tras la oferta (6.07 tras 5.10); las alertas tras
  `notificar()` (6.12 tras 7.01); repuestos tras quien recrea `evaluar_requisitos` (8.08 tras 5.07 y 6.02); el flujo de repuestos tras
  las pantallas de flujos y el panel de la unidad (8.13); el rango de un campo tras el campo «principal» (9.04 tras 6.13); el tablero del
  mes tras gastos y la cola (9.11); la auditoría AA y el despliegue en seco tras los cuatro cierres.
- **Carril `a` (base):** el núcleo de cada módulo (sus entradas por área, la pantalla con sus huecos), `src/shared`, el shell,
  `notificaciones`, lo que cruza módulos y los cinco cierres. Es el único que edita ESTADO, PLAN, DECISIONES y BITACORA.
- **Carril `b`:** en `flujos`, las áreas `fases` y `transiciones`; en `logistica`, `documentos` y `transporte`; `agenda`; `buscador`;
  `web` entero; las métricas del `tablero`.
- **Carril `c`:** en `flujos`, `requisitos` y `documentos`; en `logistica`, `aduana`, `dinero` y `alertas`; `chat`; `repuestos` entero;
  `actividad` y `datos`.
- **Un área** vive en `features/<área>/`, `entities/<área>/`, `infra/<área>/`, `areas/<área>/` y `pantallas/<área>*.ts`. El primer paso
  de cada módulo (5.02, 6.01, 8.01, 8.08) deja las entradas de la raíz reexportando cada área y los archivos de **hueco** creados vacíos;
  los siguientes sólo agregan archivos propios. Eso evita lo del 8-11: 21 PR devueltos porque cada carril sumaba su pestaña al mismo
  `pestanas.ts`.
- **Los registros que varios llenan, un archivo por quien llena:** las pruebas SQL en `supabase/tests/areas/<área>/` (se descubren
  solas); los registros de las guardas en `scripts/guardas/areas-<carril>/`; una sección de Configuración en su carpeta
  (`configuracion/<sección>/seccion.ts`, una línea de import en `secciones.ts`); los huecos del shell en
  `src/app/(app)/_shell/huecos/{campana,buscador,chat}.tsx` (los abre el 7.02); y **los bloques de la bandeja de Inicio en
  `src/modules/tablero/features/bandeja/bloques/<clave>.tsx`, que deja el 9.02**: 6.12, 7.07, 8.05 y 8.13 llenan sólo el suyo (donde su
  fila diga `_inicio/`, es este lugar). `database.types.ts` no se une a mano: se regenera con `pnpm db:types`.
- **Lo del núcleo que un paso de `b` o `c` necesita** (una línea en `navegacion.ts` o en `rutas.ts`, un export en la entrada de `leads`,
  la ficha de un módulo) lo agrega o lo edita en su PR, chico y con su prueba; no lo borra. Lo de otro carril que no es base, con una
  compuerta `espera`.
- **Sin dependencias nuevas.** Lo que una fila resuelve sin paquete (gráficas en SVG, la cookie del portal con `node:crypto`, el barrido
  AA por CDP) se hace así: instalar pide una decisión que nadie va a contestar.
- **Lo de afuera se deja hecho hasta donde se puede:** correo (`resend`, `cloudflare`), push (VAPID), la revalidación de la web y el
  despliegue van con su adaptador, su prueba de contrato y su variable en `docs/ENTORNOS.md`. Ningún paso toca producción.

**Lo que queda para la persona** (el piloto no lo hace): integrar un PR que toca las guardas del piloto o `.github/workflows/` (el 9.09
tiene una parte así: va última); producción (variables y secretos de
Vercel y Supabase, `db push`), con la guía y la lista que deja el 9.13; lo que sólo se ve en un teléfono (9-12, las fotos en iPhone); y
un paso que quede aparcado sin reintentos (`node scripts/coordinador/coordinador.mjs tablero`).

| Paso                                                                                                                                                       | Carril | Riesgo | Nivel | Partes | Depende de                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ----- | ------ | ---------------------------------------------------------- |
| **5.01** La base de «Fases»: la versión del flujo y las RPC de fase                                                                                        | b      | rojo   | 2     | 3      | —                                                          |
| **5.02** La pantalla `/configuracion/flujos`: el núcleo, las áreas y los huecos (deja la base del módulo)                                                  | a      | ambar  | 2     | 3      | —                                                          |
| **5.03** La base de «Tipos de documento»                                                                                                                   | c      | rojo   | 2     | 2      | —                                                          |
| **5.04** «Fases»: crear, editar, ordenar, jubilar o eliminar y reactivar                                                                                   | b      | verde  | 1     | 3      | 5.01, 5.02                                                 |
| **5.05** La base de «Transiciones» y de quién mueve                                                                                                        | b      | rojo   | 2     | 2      | 5.01                                                       |
| **5.06** «Salidas y quién mueve» en el inspector                                                                                                           | b      | verde  | 1     | 2      | 5.02, 5.05                                                 |
| **5.07** La base de «Requisitos»: RPC, impacto y «fuera de regla»                                                                                          | c      | rojo   | 2     | 3      | 5.01                                                       |
| **5.08** «Requisitos para entrar», el aviso de impacto y «fuera de regla»                                                                                  | c      | verde  | 1     | 3      | 5.02, 5.07                                                 |
| **5.09** «Documentos»: los tipos de documento de la empresa y del flujo                                                                                    | c      | verde  | 1     | 2      | 5.02, 5.03                                                 |
| **5.10** La base de «Reglas» y de la oferta de transporte                                                                                                  | a      | rojo   | 2     | 2      | 5.01                                                       |
| **5.11** «Reglas» y la oferta de transporte                                                                                                                | a      | verde  | 1     | 2      | 5.02, 5.10                                                 |
| **5.12** «Revisar»: los avisos que faltan y la franja                                                                                                      | a      | rojo   | 1     | 2      | 5.02, 5.06, 5.08                                           |
| **5.13** El cierre de la Fase 5                                                                                                                            | a      | ambar  | 3     | 2      | 5.04, 5.09, 5.11, 5.12                                     |
| **6.01** La base del módulo `logistica`: entradas por área, el panel de la unidad con huecos y las rutas                                                   | a      | ambar  | 2     | 3      | 5.02                                                       |
| **6.02** Mover en la base: el candado, el conflicto con nombre, el lote por unidad y las lecturas de la cadena                                             | a      | rojo   | 2     | 3      | 5.05, 5.07                                                 |
| **6.03** La cadena: `/logistica` como kanban por fase, con filtros en la URL, alerta por demora y «dónde está»                                             | a      | ambar  | 2     | 3      | 6.01, 6.02                                                 |
| **6.04** El panel «qué falta», mover con nota y conflicto legible, notas, historial y el lote con vista previa y resultado parcial (la tarea de oro 3)     | a      | ambar  | 1     | 5      | 6.03                                                       |
| **6.05** Documentos en la base: registrar con commit diferido, revisar con versión, lo que la fase exige y el objeto compartido                            | b      | rojo   | 2     | 3      | 5.03                                                       |
| **6.06** Documentos: subir con la cámara y commit diferido, aprobar o rechazar, vencimiento y «visible en el portal»                                       | b      | verde  | 1     | 3      | 6.01, 6.05                                                 |
| **6.07** Transporte y aduana en la base: guardar con versión, aplicar a un grupo todo o nada, declaraciones y lo que la fase exige                         | b      | rojo   | 2     | 4      | 5.10                                                       |
| **6.08** Transporte: el hueco de la unidad, `/logistica/embarques` (embarques y contenedores) con «editar el grupo», y los catálogos de puertos y navieras | b      | ambar  | 1     | 4      | 6.01, 6.07                                                 |
| **6.09** Aduana: `/logistica/aduana` con las declaraciones, su composición, el canal de aforo y «pagada», y el hueco de la unidad                          | c      | verde  | 1     | 3      | 6.01, 6.07                                                 |
| **6.10** Gastos y pagos en la base: el monto en moneda base lo calcula la base, prorratear, y confirmar un pago como acto sellado                          | c      | rojo   | 2     | 4      | —                                                          |
| **6.11** Gastos, pagos y margen: los huecos de la unidad, `/logistica/gastos`, prorratear a un grupo y las categorías de gasto                             | c      | ambar  | 1     | 4      | 6.01, 6.10                                                 |
| **6.12** Alertas por demora y por vencimiento (cron) y la bandeja de logística en Inicio                                                                   | c      | rojo   | 1     | 3      | 6.02, 6.03, 6.05, 7.01, 9.02                               |
| **6.13** El campo «principal» de un origen (**6-1**): qué identifica a un vehículo en la lista, el resumen y logística                                     | c      | rojo   | 2     | 3      | —                                                          |
| **6.14** El cierre de la Fase 6: el recorrido de la IA por la tarea de oro 3, la tabla de criterios, ESTADO y BITACORA                                     | a      | ambar  | 3     | 2      | 6.04, 6.06, 6.08, 6.09, 6.11, 6.12, 6.13                   |
| **7.01** Notificaciones: la base                                                                                                                           | a      | rojo   | 2     | 2      | —                                                          |
| **7.02** La campana y `/notificaciones`                                                                                                                    | a      | ambar  | 2     | 3      | 7.01                                                       |
| **7.03** Push web: suscribir, disparar y `supabase/functions/push`                                                                                         | a      | rojo   | 2     | 3      | 7.01                                                       |
| **7.04** Preferencias de notificaciones y activar el push                                                                                                  | a      | ambar  | 1     | 2      | 7.02, 7.03                                                 |
| **7.05** Correo de la app: adaptadores `resend` y `cloudflare` (7-1)                                                                                       | c      | ambar  | 2     | 1      | —                                                          |
| **7.06** Agenda: la base                                                                                                                                   | b      | rojo   | 2     | 3      | —                                                          |
| **7.07** La agenda: `/agenda`                                                                                                                              | b      | ambar  | 2     | 4      | 7.06, 9.02                                                 |
| **7.08** Chat: la base                                                                                                                                     | c      | rojo   | 2     | 3      | 7.06                                                       |
| **7.09** El chat: `/chat`                                                                                                                                  | c      | ambar  | 2     | 4      | 7.02, 7.08                                                 |
| **7.10** Menciones `#`, fichas, `/tarea` y `/evento`                                                                                                       | c      | ambar  | 1     | 3      | 7.07, 7.09, 7.12                                           |
| **7.11** Widget flotante, no leídos y «Escribirle por chat»                                                                                                | c      | ambar  | 2     | 3      | 7.02, 7.09                                                 |
| **7.12** Buscador: la base                                                                                                                                 | b      | rojo   | 2     | 2      | —                                                          |
| **7.13** La paleta `Ctrl/Cmd+K` y la lista de atajos `?`                                                                                                   | b      | ambar  | 2     | 3      | 7.02, 7.12                                                 |
| **7.14** Cierre de la Fase 7                                                                                                                               | a      | ambar  | 3     | 2      | 7.04, 7.05, 7.10, 7.11, 7.13                               |
| **8.01** La base de `web`: áreas, `/configuracion/web` con huecos, lo que el contenido escribe por RPC y la pestaña «Ajustes»                              | b      | rojo   | 2     | 4      | —                                                          |
| **8.02** FAQs y testimonios con consentimiento                                                                                                             | b      | verde  | 1     | 2      | 8.01                                                       |
| **8.03** Guías, categorías y legales con el editor                                                                                                         | b      | verde  | 1     | 4      | 8.01                                                       |
| **8.04** Cola web: el tablero, la política y habilitar (8-1)                                                                                               | b      | rojo   | 2     | 3      | 8.01                                                       |
| **8.05** La tarjeta de turno, la disponibilidad y la ficha pública en `/perfil`, y el bloque de Inicio                                                     | b      | ambar  | 1     | 4      | 7.02, 8.01, 9.02                                           |
| **8.06** Revalidar la web pública y encender la integración «Web pública»                                                                                  | a      | rojo   | 2     | 3      | —                                                          |
| **8.07** El portal del cliente por HTTP: `api/portal/*` con cookie firmada y límite por IP                                                                 | a      | rojo   | 2     | 3      | 8.01                                                       |
| **8.08** La base de `repuestos`, sus áreas y los catálogos                                                                                                 | c      | rojo   | 2     | 4      | 5.07, 6.02                                                 |
| **8.09** Proyectos e ítems: `/repuestos` y `/repuestos/[id]` con la hoja                                                                                   | c      | ambar  | 2     | 4      | 8.08                                                       |
| **8.10** Stock y movimientos                                                                                                                               | c      | rojo   | 2     | 3      | 8.09                                                       |
| **8.11** Compras y margen, con el permiso de costos                                                                                                        | c      | rojo   | 2     | 3      | 8.09                                                       |
| **8.12** El cotizador de repuestos: configuración, hoja y aceptar                                                                                          | c      | rojo   | 2     | 5      | 8.09                                                       |
| **8.13** El flujo de repuestos y las esperas que destraban al vehículo                                                                                     | c      | ambar  | 1     | 4      | 5.04, 5.06, 5.08, 6.04, 6.06, 8.09, 8.10, 9.02             |
| **8.14** Cierre de la Fase 8                                                                                                                               | a      | ambar  | 3     | 2      | 8.02, 8.03, 8.04, 8.05, 8.06, 8.07, 8.11, 8.12, 8.13       |
| **9.01** Actividad: lectura recortada, purga y `/actividad`                                                                                                | c      | rojo   | 2     | 4      | —                                                          |
| **9.02** Inicio: la bandeja con huecos y los bloques de lo que ya existe                                                                                   | a      | ambar  | 1     | 2      | —                                                          |
| **9.03** Dominancia sobre la persona (9-1)                                                                                                                 | a      | rojo   | 1     | 2      | —                                                          |
| **9.04** Configuración de leads que quedó: `leads.campos.gestionar` (9-3), el rango de un campo numérico (9-2) y las plantillas por empresa                | a      | rojo   | 2     | 5      | 6.13                                                       |
| **9.05** Datos: exportar todo (`/datos`, primera mitad)                                                                                                    | c      | rojo   | 2     | 3      | —                                                          |
| **9.06** Datos: importar todo con `supabase/functions/importar-csv` (`/datos`, segunda mitad)                                                              | c      | rojo   | 2     | 5      | 9.05                                                       |
| **9.07** Tablero: las métricas en la base                                                                                                                  | b      | rojo   | 2     | 2      | —                                                          |
| **9.08** Tablero: `/tablero` con widgets personalizables                                                                                                   | b      | ambar  | 2     | 3      | 9.07                                                       |
| **9.09** Higiene del e2e, del CI y de los entornos (9-4 a 9-6, 9-8 a 9-11 y 4-41)                                                                          | a      | ambar  | 2     | 4      | 7.05                                                       |
| **9.10** PWA: instalar la app, el `sw.js` y el logo oscuro                                                                                                 | a      | ambar  | 2     | 2      | 7.04                                                       |
| **9.11** Tablero: margen del mes y cola web                                                                                                                | b      | rojo   | 2     | 2      | 6.11, 8.04, 9.08                                           |
| **9.12** Auditoría de accesibilidad AA: el pulido anotado, las transiciones y los esqueletos                                                               | a      | ambar  | 2     | 5      | 5.13, 6.14, 7.14, 8.14, 9.01, 9.02, 9.06, 9.08, 9.10, 9.11 |
| **9.13** Despliegue en seco: splinter y advisors en cero, la guía y la lista de la persona                                                                 | a      | rojo   | 2     | 3      | 5.13, 6.14, 7.14, 8.14, 9.01, 9.03, 9.04, 9.06, 9.09, 9.11 |
| **9.14** El cierre de la Fase 9: las cuatro tareas de oro en celular y escritorio, la tabla de criterios y el Nivel 3                                      | a      | ambar  | 3     | 3      | 9.12, 9.13                                                 |

## Fase 5 — Flujos (configuración)

Módulo `flujos`: configuración por origen (y el de repuestos): fases con todos sus atributos, transiciones con acción y nota obligatoria,
roles por fase y por transición, requisitos (documento con tipo/min/max/formatos, dato con las claves del catálogo, espera a fase de otro
flujo), reglas del flujo (encender/apagar con impacto), tipos de documento globales y por flujo con vencimiento, oferta de transporte,
franja «Revisar» (`revisar_flujo`), jubilar/eliminar fase (`fase_eliminar`), «fuera de regla» y el aviso de impacto antes de volver
bloqueante un requisito.

**Terminado cuando:** el dueño arma desde cero un flujo de 5 fases con requisitos de los tres tipos sin tocar SQL, «Revisar» marca una
fase sin salida y una espera cruzada, y jubilar una fase con historial la saca de los destinos sin romper nada.

### Lo que ya existe y lo que falta (leído el 2026-11-09)

**Resumen:** las tablas, la RLS y el motor de mover existen; **no existe ninguna RPC para configurar** (salvo `fase_eliminar`): hoy la
configuración se escribiría con `.insert()`/`.update()` directo bajo policies, sin versión ni `PT409`, lo que contradice `datos.md` y
`migraciones.md` («toda RPC de edición nace con `p_actualizado_en_esperado`»). En `src/` sólo hay 7 archivos (`leerFasesDeOrigen`).

| Superficie                      | Ya está en la base (archivo:línea)                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Código que hay                                                                                                                                                     | Falta                                                                                                                                                                                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flujo y su nacimiento           | `flujos` B:20811; únicos `flujos_origen_unico`, `flujos_repuestos_unico` B:23411-23415; trigger `trg_origen_crear_flujo` B:24719 → `origen_crear_flujo()` B:15294 (9 reglas, +`aduana` si subasta, sin fases); `puede_configurar_flujo()` B:16194 (`flujos.configurar` del origen, o `repuestos.configurar`)                                                                                                                                                                                  | `origenes/entities/preconfiguraciones.ts` (espejo), `pasos.ts` («Configura el flujo», sin enlace)                                                                  | Versión del flujo para editar (`flujos.actualizado_en` existe, nadie la exige). **El flujo de repuestos sólo lo crea `supabase/seed.sql:206`**, ninguna migración; `flujos` no tiene INSERT para nadie                                                        |
| Fases                           | `fases` B:19960 (22 columnas: color, icono, orden, inicial/final, activa, logística, demora, nota, contenedor, aduana, llegada de repuestos, web, portal con alias); `fases_flujo_id_nombre_key` B:22501; `fases_llegada_repuestos_unica` B:23379; `fase_validar()` B:11257 (regla apagada → 23514); `fase_eliminar(p_fase)` B:11190 (jubila con historial o unidades, borra si no; **sin versión**); policies crear/editar B:26349-26353; grant insert/update B:31358; `trg_auditar` B:24475 | `entities/fase.ts` (`FaseResumen`), `infra/queries/fases.ts`, `composicion.ts`; lo consume `vehiculos` (`src/app/(app)/vehiculos/page.tsx:57`, `[id]/page.tsx:74`) | RPC `fase_crear/guardar/mover/reactivar`, `fase_eliminar` con versión, `fase_impacto`; quitar la escritura directa; toda la pantalla. `fase_eliminar` jubila la única inicial sin decirlo (el chequeo sólo corre al borrar)                                   |
| Transiciones                    | `fases_transiciones` B:20788 (acción, nota obligatoria; único `(de, a)` B:22521; check de ≠); policies B:26398-26410; `trg_auditar` B:24483                                                                                                                                                                                                                                                                                                                                                   | —                                                                                                                                                                  | RPC; **nada impide una transición entre fases de flujos distintos**; pantalla                                                                                                                                                                                 |
| Roles por fase y por transición | `fases_roles` B:20775, `fases_transiciones_roles` B:20802; los lee `_puede_mover()` B:6642 (manda la lista de la transición; vacío = cualquiera con `flujos.mover`) y `_vehiculo_fase_de_entrada()` B:7769                                                                                                                                                                                                                                                                                    | —                                                                                                                                                                  | RPC (deciden quién mueve y **no tienen auditoría**); espejo puro; pantalla. `roles` lo lee cualquiera (B:27024) pero `equipo` no exporta una lista liviana de roles                                                                                           |
| Requisitos                      | `fases_requisitos` B:20746 (check por tipo); `fase_requisito_validar()` B:11219 (clave del catálogo, `pct`, formatos ⊆ tipo, tipo de otro flujo, espera sólo al otro ámbito y con la regla); `claves_dato_requisito()` B:8717 (14 de vehículos, 5 de repuestos); `_requisito_dato_cumplido()` B:6794; `evaluar_requisitos()` B:11140; `unidad_llego_a_fase()` B:18167                                                                                                                         | —                                                                                                                                                                  | RPC; `requisito_impacto` (cuántas unidades quedarían fuera); pantalla; etiquetas humanas de las claves. **Contradicción:** la ficha dice «nace informativo» y la columna es `bloqueante DEFAULT true` (B:20749)                                               |
| Fuera de regla                  | `fuera_de_regla(p_flujo)` B:11446                                                                                                                                                                                                                                                                                                                                                                                                                                                             | nadie la llama                                                                                                                                                     | Es `security definer` **sin chequeo de permiso** (grant a `authenticated` B:29772: devuelve ids de vehículos que quien llama puede no ver) y **sin tope** (evalúa dos veces cada vehículo del flujo). Hay que rehacerla acotada                               |
| Reglas del flujo                | `flujos_reglas` B:20830 (check de 10 claves B:20834); `flujo_regla_activa()` B:11296; `flujo_regla_apagar_validar()` B:11307 (bloquea apagar vitrina/portal/aduana/logística con fases que la marcan; sólo da el número)                                                                                                                                                                                                                                                                      | —                                                                                                                                                                  | RPC con versión; impacto con nombres; apagar «esperas» con esperas vivas pasa en silencio; `transporte`, `contenedor`, `gastos`, `pagos` no las lee nada todavía (Fase 6)                                                                                     |
| Tipos de documento              | `tipos_documento` B:21826 (global si `flujo_id` nulo; formatos, `modo_vencimiento` B:274, `vigencia_dias`, `aviso_dias`, `visible_portal_permitido`, `proposito`); único `(flujo_id, nombre)` B:22951; policies B:27148-27156 (global: `logistica.catalogos.gestionar`; de flujo: quien configura); 6 globales en `seed.sql:141`                                                                                                                                                              | —                                                                                                                                                                  | RPC `crear/guardar/mover/eliminar` (en uso se desactiva); pantalla. **Nadie lee** `modo_vencimiento`, `vigencia_dias`, `aviso_dias` ni `proposito`: su significado no está escrito en ningún lado                                                             |
| Oferta de transporte            | `flujos_transporte_oferta` B:20845; policies B:26466-26474; `puertos` B:21364 (5 en la semilla), `navieras` B:21162 (vacía)                                                                                                                                                                                                                                                                                                                                                                   | —                                                                                                                                                                  | **La tabla no admite ninguna fila:** `puerto_id` y `naviera_id` son `NOT NULL` por la PK (B:22547) y los check B:20850-20851 exigen que uno sea nulo. Rehacer la clave, RPC, pantalla. No hay pantalla ni RPC de puertos y navieras en ningún párrafo de PLAN |
| «Revisar»                       | `revisar_flujo()` B:16734: `sin_inicial` (error), `sin_salida`, `inalcanzable`, `orden_duplicado`, `contenedor_inalcanzable`, `espera_jubilada`, `espera_cruzada` (avisos), `sin_bloqueantes` (info)                                                                                                                                                                                                                                                                                          | —                                                                                                                                                                  | La franja. La ficha promete «roles que nadie tiene» y la base no lo tiene; tampoco avisa por qué un vehículo nace «Sin fase»                                                                                                                                  |
| Pantalla y navegación           | El hub ya se abre con `flujos.configurar`, `logistica.catalogos.gestionar` y `repuestos.configurar` (`_shell/navegacion.ts:149-151`); claves en `src/shared/lib/permisos.ts:42-44,56,65`                                                                                                                                                                                                                                                                                                      | `secciones.ts` sin la sección; `RUTAS` sin la ruta; `origenes/pasos.ts` con `flujo.ruta: null` (y `pasos.test.ts:20-21` lo afirma)                                 | Ruta, sección del hub, enlace de «Siguientes pasos», fila y «estados propios» en `docs/UX.md` (hoy sólo el hub la nombra, línea 89)                                                                                                                           |
| Pruebas                         | `humo.sql:219-276` (mover y `revisar_flujo` sin errores), `:1147-1168` (reglas al nacer), `:1545-1582` (entrada); `escala.sql:19-22` (excepciones de `fase_eliminar`, `fuera_de_regla`, `revisar_flujo`)                                                                                                                                                                                                                                                                                      | —                                                                                                                                                                  | Ninguna prueba de permisos ni de versión de la configuración                                                                                                                                                                                                  |

Otras contradicciones con el párrafo de PLAN: ninguna de alcance. «Encender/apagar con impacto» y «aviso de impacto» no tienen función
en la base (sólo el trigger que cuenta). Sin jobs de cron ni funciones edge en esta fase.

### Tabla de criterios

Cada criterio del «Terminado cuando» y del párrafo de la fase con la prueba que lo mide y su resultado en el Nivel 3 del 5.13-1 (las de Configuración corren
sólo en escritorio; «base» = `db:probar` o `db:carreras`, que corren en el CI de cada PR).

| Criterio                                                                                                   | Prueba                                                                                                                                                                                                                                                                                                                                                                                                                              | Proyectos                      | Resultado                                                                                                 |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| El dueño arma desde cero un flujo de 5 fases con requisitos de los tres tipos sin tocar SQL                | `configuracion-flujos-recorrido.spec.ts` › «E2E 5.13 la dueña crea un origen y arma 5 fases con sus salidas» y «E2E 5.13 la dueña pide un documento, un dato y una espera; Revisar marca la fase sin salida y la espera cruzada, y las corrige»                                                                                                                                                                                     | escritorio                     | verde (3 de 3 dos veces; completo sobre `649e6a8b`)                                                       |
| «Revisar» marca una fase sin salida y una espera cruzada                                                   | el mismo «E2E 5.13 la dueña pide un documento…»; `configuracion-flujos-revisar.spec.ts` › «E2E 5.12 la franja marca la fase sin salida y la espera cruzada, abre la fase y el aviso se va al agregarle la salida»; `supabase/tests/flujos-revisar.sql`                                                                                                                                                                              | escritorio y base              | verde                                                                                                     |
| Jubilar una fase con historial la saca de los destinos sin romper nada                                     | `configuracion-flujos-recorrido.spec.ts` › «E2E 5.13 un vehículo nuevo nace en la inicial, se mueve por SQL y jubilar su fase la saca de los destinos sin dejar de nombrarla» (`previsualizar_cambio_fase` responde «jubilada»; `/vehiculos` y la ficha la siguen nombrando); `configuracion-flujos-fases.spec.ts` › «la dueña jubila una fase con historial y la reactiva»; `areas/flujos/fases-eliminar.sql`, `fases-impacto.sql` | escritorio y base              | verde                                                                                                     |
| Fases con todos sus atributos, ordenar, eliminar sin historial y reactivar                                 | `configuracion-flujos-fases.spec.ts` › «la dueña crea fases, sube una y elimina otra», «la dueña edita los datos de una fase en el inspector», «la dueña jubila una fase con historial y la reactiva»; `areas/flujos/{fases,fases-guardar,fases-mover,fases-reactivar}.sql`                                                                                                                                                         | escritorio y base              | verde                                                                                                     |
| Transiciones con acción y nota obligatoria                                                                 | `configuracion-flujos-transiciones.spec.ts` › «la dueña agrega dos salidas, ve sus chips, recarga y quita una»; `areas/flujos/{transiciones,transiciones-datos}.sql`                                                                                                                                                                                                                                                                | escritorio y base              | verde                                                                                                     |
| Roles por fase y por transición                                                                            | `configuracion-flujos-transiciones.spec.ts` › «la dueña limita la fase a un rol, edita la salida y la limita a un rol»; `areas/flujos/transiciones.sql`                                                                                                                                                                                                                                                                             | escritorio y base              | verde                                                                                                     |
| Requisitos: documento (tipo, mínimo, máximo, formatos), dato y espera a una fase de otro flujo             | `configuracion-flujos-requisitos.spec.ts` › «la dueña agrega dos datos, sube uno y quita el otro», «la dueña agrega un documento y una espera»; `areas/flujos/{requisitos,requisitos-editar,requisitos-lectura}.sql`                                                                                                                                                                                                                | escritorio y base              | verde en la base; «la dueña agrega dos datos…» cayó una vez en el completo y pasó 3 de 3 sola (inestable) |
| Aviso de impacto antes de volver bloqueante un requisito y «fuera de regla»                                | `configuracion-flujos-requisitos.spec.ts` › «la dueña vuelve bloqueante un dato, ve el impacto y las unidades fuera de regla»; `areas/flujos/requisitos.sql` (`requisito_impacto`, `flujo_fuera_de_regla`)                                                                                                                                                                                                                          | escritorio y base              | verde (en el triaje del completo, con el resto del spec serial)                                           |
| Reglas del flujo: encender y apagar con impacto                                                            | `configuracion-flujos-reglas.spec.ts` › «la dueña apaga una regla sin uso con «Deshacer» y guarda la oferta de transporte» (con una fase de aduana, «No se puede apagar «Aduana»»); `supabase/tests/flujos-reglas.sql`                                                                                                                                                                                                              | escritorio y base              | verde                                                                                                     |
| Tipos de documento globales y por flujo, con vencimiento                                                   | `configuracion-flujos-documentos.spec.ts` › «la dueña crea un tipo del flujo con vencimiento, lo edita y lo sube de orden», «desactiva uno en uso (y lee por qué no se elimina) y elimina uno sin uso», «quien sólo configura el flujo ve los tipos de toda la empresa deshabilitados, con el motivo»; `areas/flujos/{tipos-de-documento,tipos-de-documento-datos}.sql`                                                             | escritorio y base              | verde                                                                                                     |
| Oferta de transporte                                                                                       | `configuracion-flujos-reglas.spec.ts` › la misma; `supabase/tests/flujos-oferta.sql`                                                                                                                                                                                                                                                                                                                                                | escritorio y base              | verde                                                                                                     |
| La configuración se escribe sólo por RPC con la versión del flujo (`PT409` legible, sin escritura directa) | `areas/flujos/fases.sql` (versión vieja → `PT409`); la escritura directa da `42501` en `fases-guardar.sql`, `transiciones.sql`, `requisitos.sql` y `tipos-de-documento.sql`; `areas/flujos/carreras.mjs` (dos guardados con la misma versión)                                                                                                                                                                                       | base                           | verde en `db:probar` (1.168 ✓) y en el `db:carreras` de los dos completos                                 |
| Quien no configura no entra; desde Orígenes se llega al flujo                                              | `configuracion-flujos.spec.ts` › «una asesora no ve la pantalla de flujos», «un origen recién creado llega desde Orígenes y su flujo está vacío»; `e2e/origenes.spec.ts` («Siguientes pasos» enlaza al flujo, 5.02)                                                                                                                                                                                                                 | escritorio (Orígenes: los dos) | verde                                                                                                     |

La pantalla de mover es de la Fase 6 (6.04): el recorrido mueve por SQL como la dueña (D4 del 5.13-1).

### Cierre de la Fase 5

**Fase 5 cerrada el 2026-11-12** con el Nivel 3 del 5.13-1, corrido por proyecto (cada uno desde `db:reset` y `db:carreras`, 22,1 s y 17,2 s): escritorio,
sobre `649e6a8b`, 1.107 en verde, 16 saltadas, 2 caídas y 4 sin correr en 43,5 min (44,6 de reloj); celular, sobre `6df82b05`, 791 en verde, 27 saltadas y 0
caídas en 31,0 min (32,0 de reloj). De las dos caídas del escritorio, `vehiculos-resumen-casos` era real (el aviso «Sin conexión» de la campana diferida
chocaba con el del resumen; arreglado en `83c0dada`, y la campana queda como **7-2**) y `configuracion-flujos-requisitos` es inestable (3 de 3 sola). El
primer completo de celular, sobre `83c0dada`, cayó en cascada (105): `borrarPersonasDePrueba` ordenaba `created_at` como texto y borraba a la dueña antes que a
la otra cuenta; arreglado en `6df82b05`. 5a-4b: los dos proyectos suman 76,6 min de reloj (70,4 en el 4.28; la suite de escritorio pasó de 1.046 a 1.107).
`db:probar` 1.168 en verde, `db:lint` sin errores (48 avisos y 69 «extra» en 29 funciones) y `mapa.sh --check` en verde. El recorrido
(`configuracion-flujos-recorrido.spec.ts`): la dueña crea un origen, arma cinco fases con sus salidas, pide un dato, un documento y una espera contra el flujo de
repuestos; «Revisar» marca la fase sin salida y la espera cruzada y se corrigen; el vehículo nace en la inicial y jubilar su fase lo saca de los destinos.
Lo que deja: **6-4** (Fase 6), **7-2** (Fase 7), **9-13** (Fase 9), una línea en «Pulido para la Fase 9» y `flujos.activo` sin lector («Riesgos y huecos»).
La «Partición» sigue aquí hasta que una sesión con permiso la pase a `docs/archivo/PLAN.md`.

### Partición

Un paso, su verificación y su PR; quién lo hace y de qué depende lo dice `docs/plan.yaml` (la tabla de «Carriles de las fases 5 a 9»). Cada fila dice qué entra, su assert y el lugar. Sus «Dudas» ya traen la opción recomendada: sin compuertas, **esa es la decisión**, y quien haga el paso la anota en `docs/DECISIONES.md` (el carril base) o en `docs/pasos/<paso>/decisiones.md`.

Modelo de pantalla que fijan las filas (no hay diseño en `docs/UX.md`): un flujo a la vez (`?origen=<id>` o `?ambito=repuestos`), franja
«Revisar» arriba, pestañas `?seccion=fases|reglas|documentos`, y un **inspector de fase** (`?fase=<id>`, `<Drawer>`) con tres bloques que
llena cada área. Áreas del módulo: `fases`, `transiciones`, `requisitos`, `reglas`, `documentos`, `revisar` (+ `mover`, reservada a la Fase 6).

- **5.01** (hecho el 2026-11-11; `docs/pasos/5.01-1/`, `5.01-2/`) — La base de «Fases»: la versión del flujo y las RPC de fase. Hoy se escribe directo bajo RLS (policies `fases: crear|editar`,
  B:26349-26353). Entra, en migraciones `fases_*`: (1) el contrato de versión, que usan también 5.05, 5.07 y 5.10: `_flujo_para_editar(p_flujo,
p_actualizado_en_esperado)` (bloquea la fila de `flujos` con `for update`, exige `puede_configurar_flujo()` → `42501`, y `_exigir_version()` →
  `PT409` «Otra persona cambió este flujo mientras lo editabas.») y `_flujo_tocar(p_flujo)` (mueve `flujos.actualizado_en` con
  `greatest(clock_timestamp(), anterior + 1 µs)` y la devuelve): **la versión de toda la configuración de un flujo es `flujos.actualizado_en`**;
  (2) RPC `security definer` con `set search_path = ''`, revoke a `public, anon` y grant a `authenticated`: `fase_crear(p_id, p_flujo,
p_actualizado_en_esperado, p_datos jsonb)`, `fase_guardar(p_fase, p_actualizado_en_esperado, p_cambios jsonb)` (lista cerrada: nombre,
  descripcion, color, icono, es_inicial, es_final, es_logistica, demora_dias, alerta_cada_horas, nota_obligatoria, permite_contenedor,
  permite_aduana, cuenta_llegada_repuestos, publica_web, visible_portal, alias_portal, descripcion_portal; `activa`, `orden` y `flujo_id` se
  rechazan; cada error de validación con `hint` = campo; `23505` del nombre con mensaje humano), `fase_mover(p_fase, p_actualizado_en_esperado,
p_despues_de default null)` (renumera `orden` sin duplicados; modelo `categoria_mover`, B:8659), `fase_eliminar(p_fase,
p_actualizado_en_esperado)` (reemplaza a la de B:11190, con `drop` de la firma vieja; misma regla: con historial o unidades jubila, sin ellos
  borra; devuelve `{accion, version}`), `fase_reactivar(p_fase, p_actualizado_en_esperado)` y la lectura `fase_impacto(p_fase)` → `{accion:
jubilar|eliminar|bloqueada, motivo, paradas, hay_historial, esperas, unica_inicial}` con conteos acotados (`limit tope + 1`); todas devuelven la
  versión nueva del flujo; (3) quitar la escritura directa: `revoke insert, update on fases` y `update on flujos` a `authenticated`, y `drop
policy` de «fases: crear», «fases: editar» y «flujos: editar»; (4) el flujo de repuestos garantizado por migración (`insert … where not
exists`, con las 7 reglas de `seed.sql:207`, sin fases). No entra: transiciones, roles, requisitos, reglas ni pantalla. Abiertos: ninguno de
  PLAN. **Assert:** `supabase/tests/areas/flujos/fases.sql`: un asesor y quien tiene `flujos.configurar` de **otro** origen reciben `42501` en
  las seis; `repuestos.configurar` sólo edita el de repuestos; versión vieja → `PT409` y no escribe; clave fuera de la lista → `22023` con su
  `hint`; marcar aduana con la regla apagada → `23514`; eliminar sin historial borra, con historial jubila y la fase deja de ser destino
  (`previsualizar_cambio_fase` dice «jubilada»), con una espera de otro flujo → `23503`, la única inicial al borrar → `23514`; mover no deja dos
  fases con el mismo `orden`; un `insert`/`update` directo de `authenticated` sobre `fases` → `42501` (el caso con usuario simulado va en este
  archivo, no en `humo.sql`). Una carrera en `supabase/tests/areas/flujos/carreras.mjs` (patrón de `areas/final/`): dos `fase_guardar` con la
  misma versión, gana una y la otra recibe `PT409`. Lugar: `supabase/migrations/`, `supabase/tests/areas/flujos/`, `src/shared/types/database.types.ts`,
  `supabase/tests/escala.sql` (la línea de `fase_eliminar`, si la nueva ya no cuenta sin tope), `src/modules/flujos/CLAUDE.md`. Nivel **2**
  (disparador 4: borra policies). Tipo: datos y dinero. Partes estimadas: 3.
  Dudas, con la recomendada: (a) ¿versión por flujo o por fila? Recomiendo **por flujo**: una sola fila bloqueada sirve a las tablas hijas que no tienen `actualizado_en` (transiciones, requisitos, roles, reglas, oferta) y evita cuatro `alter table`; el costo (dos personas configurando el mismo flujo a la vez chocan con `PT409`) es aceptable en una pantalla de dueño. (b) ¿se puede jubilar la única inicial activa? Recomiendo **sí** (como hoy), con `unica_inicial` en `fase_impacto` y el error `sin_inicial` de «Revisar»: prohibirlo impide rehacer un flujo. (c) ¿el flujo de repuestos por migración? Recomiendo **sí**: un despliegue donde el seed no corra queda sin él y nadie puede crearlo.

- **5.02** (hecho el 2026-11-11; `docs/pasos/5.02-1/`, `5.02-2/`) — La pantalla `/configuracion/flujos`: el núcleo, las áreas y los huecos (deja la base del módulo). Entra: la ruta
  `src/app/(app)/configuracion/flujos/` (`page.tsx`, `loading.tsx` con su esqueleto sin importar el barril, `seccion.ts` con
  `SECCION_DE_FLUJOS`, `pestanas.ts` + test, `seccion-abierta.tsx`, y una carpeta por área con su `pestanas.ts` y `seccion.tsx` como
  `empresa/comprobantes/`), `RUTAS.configuracionDeFlujos`, la sección sumada a `secciones.ts`, y `DESTINOS_DE_PASO.flujo.ruta` de
  `origenes/pasos.ts` apuntando a la pantalla con el `?origen=` del origen (cambia `pasos.test.ts:20-21`). El módulo se parte en áreas como
  `cotizaciones` (`src/modules/cotizaciones/CLAUDE.md` › «Áreas»): `areas/<área>/{index,client,composicion}.ts`, `features/<área>/`,
  `entities/<área>/`, `infra/<área>/` y `pantallas/<área>.ts` creados vacíos para `fases`, `transiciones`, `requisitos`, `reglas`, `documentos`,
  `revisar` y `mover`; `index.ts`, `client.ts` y `composicion.ts` de la raíz quedan sólo con `export * from './areas/<x>/…'` (lo de hoy,
  `leerFasesDeOrigen` y `FaseResumen`, pasa a `areas/nucleo/` sin cambiar de nombre). Núcleo: `entities/flujo.ts` (`FlujoParaConfigurar`: flujo,
  versión, ámbito, reglas, fases con todos sus atributos, transiciones, roles por fase y por transición, requisitos; Zod y test),
  `infra/queries/flujo.ts` con `leerFlujoParaConfigurar(flujoId)` y `leerFlujosConfigurables(permisos)` (tablas de configuración, decenas de
  filas: cada lectura con `.limit(tope + 1)` y `cortarAlTope()`, tope 200 fases con `<AvisoDeTope>`; sin cursor ni medición), y
  `features/configuracion/`: `<PantallaDelFlujo>` (selector de flujo con `<PestanasConDesborde>`: los orígenes donde quien entra tiene
  `flujos.configurar`, también los inactivos, y «Repuestos» con `repuestos.configurar`; el hueco de la franja «Revisar»; las pestañas
  `?seccion=`), la **lista de fases de sólo lectura** (en orden, `<Badge>` con el color de la fila y texto, marcas «Inicial», «Final»,
  «Jubilada», y huecos `accionesDeLaLista`, `accionesDeFila`, `salidasDeFila`), el **inspector de fase** `?fase=<id>` (`<Drawer>` con URL,
  montado una vez, con `useCambiosSinGuardar()`; su cuerpo son tres bloques-hueco: «Datos», «Salidas y quién mueve», «Requisitos para entrar») y
  `useVersionDelFlujo()` (la versión que manda cada action y `<AvisoDeConflicto>` «Otra persona cambió este flujo · Recargar» ante `PT409`).
  En `equipo`: `leerRolesParaElegir()` (id, nombre, color; tope 100) para que `src/app` la pase al inspector (`flujos` no importa `equipo`).
  Permisos: entra quien tiene `flujos.configurar` en algún origen, `repuestos.configurar` o `logistica.catalogos.gestionar`; sin ninguno,
  `<EstadoSinPermiso>`; `navegacion.ts` no se toca. Estados de UX: esqueleto, vacío de primera vez («El flujo de <origen> todavía no tiene
  fases.»), error con reintentar, sin permiso, y `?origen=` inválido abre el primero de los suyos. Docs: la fila «Flujos (config)» y la
  cabecera «Flujos: configuración (estados propios)» en UX, y «Versión del flujo» en GLOSARIO, la ficha. No entra: ninguna escritura.
  Abiertos: recoge **4-48** y **4-102** (ya es Nivel 2 por `src/shared`; un commit cada uno). **Assert:** `e2e/configuracion-flujos.spec.ts`
  (escritorio; `// @sin-celular-archivo:`): la dueña entra desde el hub, ve las 7 fases de `subasta_usa` en orden con «Inicial» y «Final»,
  cambia a «Repuestos» y ve 5, abre el inspector de una fase por la URL, un origen recién creado muestra el vacío, y un asesor ve «No tienes
  permiso»; vitest: `entities/flujo.test.ts`, `flujos/pestanas.test.ts`, `secciones.test.ts` y `pasos.test.ts`; `bash scripts/mapa.sh --check`.
  Lugar: `src/app/(app)/configuracion/{flujos/,secciones.ts,origenes/pasos.ts}`, `src/modules/flujos/`, `src/modules/equipo/`,
  `src/shared/lib/rutas.ts`, `e2e/`. Nivel **2** (disparador 1: `src/shared`). Tipo: pantalla. Partes estimadas: 3.
  Dudas, con la recomendada: (a) la ficha planea «camino / lista / historial»: recomiendo **sólo la lista**; el «camino» son las salidas dibujadas como chips en cada fila (5.06) y el «historial» de cambios es `actividad` (Fase 9); un grafo dibujado es pulido. (b) ¿cómo se elige el flujo en la URL? Recomiendo `?origen=<id>` (igual que Configuración › Cotización, y sirve al enlace de Orígenes) y `?ambito=repuestos`. (c) ¿4-48 y 4-102 aquí? Recomiendo sí; si no, siguen «sin fase».

- **5.03** (hecho el 2026-11-11; `docs/pasos/5.03/`) — La base de «Tipos de documento». Entra, en migraciones `tipos_documento_*`: `tipo_documento_crear(p_id, p_flujo, p_datos jsonb)`
  (`p_flujo` nulo = global), `tipo_documento_guardar(p_id, p_actualizado_en_esperado, p_cambios jsonb)` (nombre, descripcion, activo, formatos,
  modo_vencimiento, vigencia_dias, aviso_dias, visible_portal_permitido), `tipo_documento_mover(p_id, p_actualizado_en_esperado, p_despues_de)`,
  `tipo_documento_eliminar(p_id, p_actualizado_en_esperado)` → `{accion: eliminado|desactivado, documentos, requisitos}` (con uso se desactiva:
  FK `restrict` de `documentos` B:25060 y de `fases_requisitos` B:25135) y `tipos_documento_con_uso(p_flujo)` (conteos con `limit tope + 1`).
  Versión por fila (la tabla tiene `actualizado_en`), modelo `tipo_seguimiento_*` (B:17791-17921). Permiso: global con
  `logistica.catalogos.gestionar`; de un flujo con `puede_configurar_flujo()`. Validaciones: `formatos` no vacío y dentro de los cuatro del
  default (B:21838); quitar un formato que un requisito pide → `22023` con el motivo; `renovar` exige `vigencia_dias`; `aviso_dias ≤
vigencia_dias`; un tipo de flujo no repite el nombre de un global activo; `23505` con mensaje humano. `revoke insert, update` y `drop policy`
  de «tipos_documento: crear|editar». `comment on column` que escribe el significado del vencimiento, y «Tipo de documento» en GLOSARIO. No
  entra: `documentos` (Fase 6), ni hacer cumplir el vencimiento. Abiertos: ninguno. **Assert:** `supabase/tests/areas/flujos/tipos-de-documento.sql`:
  sin el permiso `42501` (global para quien sólo configura un flujo; de flujo para quien sólo tiene catálogos); `PT409`; en uso se desactiva y
  sin uso se borra; achicar formatos con un requisito que lo pide falla; escritura directa `42501`. Lugar: `supabase/migrations/`,
  `supabase/tests/areas/flujos/`, `database.types.ts`, `docs/GLOSARIO.md`. Nivel **2** (disparador 4). Tipo: datos y dinero. Partes estimadas: 2.
  Dudas, con la recomendada: (a) qué significan los modos (nada los lee ni los explica): recomiendo `ninguno` = no vence; `solicitar` = quien sube escribe la fecha de vencimiento; `renovar` = vence solo a los `vigencia_dias` de subido; `aviso_dias` = cuántos días antes avisa; la Fase 6 lo hace cumplir en `documentos.vence_el`. (b) `proposito` (texto de la semilla que nada lee): recomiendo no editarlo en la pantalla.

- **5.04** (hecho el 2026-11-12; `docs/pasos/5.04-1/`, `5.04-2/`, `5.04-3/`) — «Fases»: crear, editar, ordenar, jubilar o eliminar y reactivar. Área `fases`, sobre las RPC del 5.01. Llena `pantallas/fases.ts`
  y los huecos del 5.02: «Nueva fase» (`?panel=nueva-fase`: nombre, color, inicial o final); el bloque «Datos» del inspector en `<Bloque>`s
  («Identidad»: nombre, descripción, color, icono con `<SelectorDeIcono>`; «En el flujo»: inicial, final, nota obligatoria, logística; «Alerta
  por demora»: `demora_dias` —vacío hereda el valor de la empresa y lo dice, 0 la apaga— y `alerta_cada_horas`; «Transporte y aduana»:
  contenedor, aduana, llegada de repuestos; «Web y portal»: publica en la web, visible en el portal, alias obligatorio si es visible,
  descripción); un interruptor de una regla apagada va deshabilitado con su motivo («La regla «Aduana» está apagada en este flujo»), con
  `entities/fases/reglas-de-fase.ts` como espejo puro de `fase_validar()` (B:11257) y su test; ordenar con `<BotonesDeOrden>` de
  `shared/ui/lista-de-catalogo` (botones, nunca arrastre); en el «⋯» de la fila «Jubilar o eliminar» (`?eliminar=<fase>`: un `<Confirmar>` con
  URL que lee `fase_impacto()` al abrir y nombra lo que pasará: «Se elimina», «Se jubila: 12 vehículos siguen en ella y deja de ser destino»,
  o el motivo que lo impide) y «Reactivar» en una jubilada. Borrador en `sessionStorage` (más de 6 campos). Actions `crear-fase`, `guardar-fase`,
  `mover-fase`, `eliminar-fase`, `reactivar-fase` con `puede(ctx.permisos, 'flujos.configurar', origenId)` (o `repuestos.configurar` en el de
  repuestos) y `revalidatePath` de la pantalla y de `/vehiculos`. El control de color es del área (no hay uno en `shared` y no se crea).
  Estados: conflicto, error con los valores intactos y el foco en el primer error, sin permiso deshabilitado con motivo. No entra: salidas,
  roles, requisitos, ni editar `demora_dias_default` (queda en la Fase 6, con las alertas). Abiertos: ninguno. **Assert:**
  `e2e/configuracion-flujos-fases.spec.ts` (escritorio; sin celular): sobre un origen que crea el spec, arma 5 fases, marca inicial y final,
  sube una, enciende el portal (pide el alias), elimina una sin historial (desaparece) y jubila otra con historial sembrado por SQL (queda
  «Jubilada» y se reactiva); vitest de `reglas-de-fase.ts` y de los esquemas. Lugar: `src/modules/flujos/{features,entities,infra,areas}/fases/`,
  `pantallas/fases.ts`, `src/app/(app)/configuracion/flujos/fases/`, `scripts/guardas/areas-b/`. Nivel **1**. Tipo: pantalla. Partes estimadas: 3.
  Dudas, con la recomendada: en el flujo de repuestos, web, portal y aduana no existen como regla: recomiendo mostrarlos deshabilitados con el motivo, no esconderlos (patrón de `docs/UX.md`).

- **5.05** (hecho el 2026-11-11; `docs/pasos/5.05/`) — La base de «Transiciones» y de quién mueve. Entra, en migraciones `transiciones_*`: `transicion_crear(p_id, p_flujo,
p_actualizado_en_esperado, p_de, p_a, p_accion, p_nota_obligatoria)`, `transicion_guardar(p_transicion, p_actualizado_en_esperado, p_cambios)`
  (accion, nota_obligatoria), `transicion_eliminar(p_transicion, p_actualizado_en_esperado)`, `fase_roles_poner(p_fase,
p_actualizado_en_esperado, p_roles uuid[])` y `transicion_roles_poner(p_transicion, p_actualizado_en_esperado, p_roles uuid[])` (reemplazo
  todo o nada; lista vacía = cualquiera con `flujos.mover`), todas por `_flujo_para_editar()` del 5.01. Validaciones que hoy faltan: las dos
  fases son del flujo que se edita (hoy nada lo impide), el destino está activo, `23505` de `(de, a)` con mensaje humano. `fases_roles` y
  `fases_transiciones_roles` no tienen `trg_auditar`: las RPC llaman `registrar_actividad()` (B:16722) con antes y después. `revoke` de
  insert, update y delete y `drop policy` de escritura en `fases_transiciones`, `fases_roles` y `fases_transiciones_roles`. No entra: tocar
  `_puede_mover()` ni `cambiar_fase()`. Abiertos: ninguno. **Assert:** `supabase/tests/areas/flujos/transiciones.sql`: `42501` para quien no
  configura ese origen; `PT409`; fases de flujos distintos → `22023`; duplicada → `23505`; tras `fase_roles_poner` con un rol que la persona no
  tiene, `previsualizar_cambio_fase` dice «Tu rol no puede mover a esta fase», y la lista de la transición manda sobre la de la fase; la
  actividad guarda el cambio de roles; escritura directa `42501`. Lugar: `supabase/migrations/`, `supabase/tests/areas/flujos/`,
  `database.types.ts`. Nivel **2** (disparador 4). Tipo: datos y dinero. Partes estimadas: 2.
  Dudas, con la recomendada: ¿quien configura el flujo puede limitar a un rol que no domina (`rol_dominado`)? Recomiendo **sí**: no otorga nada (sigue haciendo falta `flujos.mover`), sólo acota quién mueve.

- **5.06** (hecho el 2026-11-12; `docs/pasos/5.06-1/`, `5.06-2/`) — «Salidas y quién mueve» en el inspector. Área `transiciones`, sobre el 5.05. Llena `pantallas/transiciones.ts`: el bloque del
  inspector con «Quién puede mover a esta fase» (roles; vacío dice «Cualquiera con el permiso de mover»), la lista de **salidas** de la fase
  (destino entre las fases activas del flujo que aún no son salida, la acción que dirá el botón —«Embarcar»—, nota obligatoria, y roles
  propios: vacío hereda los de la fase destino), con alta en línea, edición y quitar por `?eliminar=` (`<Confirmar>` con URL), y «Entradas» de
  sólo lectura; y el hueco `salidasDeFila` de la lista: chips «→ Embarcado · Embarcar». `entities/transiciones/quien-mueve.ts`: espejo puro de
  `_puede_mover()` (B:6642), sólo para decir «Hoy pueden mover: Logística, Dueño» (y para la Fase 6), con test de los mismos casos que la
  prueba SQL. Actions `crear-transicion`, `guardar-transicion`, `eliminar-transicion`, `poner-roles-de-fase`, `poner-roles-de-transicion`.
  Estados: fase sin salidas («Esta fase no tiene salidas: es un final o le falta una»), sin roles que elegir, conflicto. No entra: mover
  unidades. Abiertos: ninguno. **Assert:** `e2e/configuracion-flujos-transiciones.spec.ts` (escritorio; sin celular): crea dos salidas con
  acción y nota, limita una a un rol, recarga y siguen; la fila muestra sus chips; quitar una pide confirmar; vitest de `quien-mueve.ts`.
  Lugar: `src/modules/flujos/{features,entities,infra,areas}/transiciones/`, `pantallas/transiciones.ts`, `scripts/guardas/areas-b/`. Nivel
  **1**. Tipo: pantalla. Partes estimadas: 2.

- **5.07** (hecho el 2026-11-11; `docs/pasos/5.07-1/`, `5.07-2/`) — La base de «Requisitos»: RPC, impacto y «fuera de regla». Entra, en migraciones `requisitos_*`: `requisito_crear(p_id, p_fase,
p_actualizado_en_esperado, p_tipo, p_datos jsonb)` (**nace informativo** siempre; el default de `fases_requisitos.bloqueante` pasa a `false`),
  `requisito_guardar(p_requisito, p_actualizado_en_esperado, p_cambios)` (notas, min_archivos, max_archivos, formatos, `config.pct`,
  bloqueante), `requisito_mover`, `requisito_eliminar`, por `_flujo_para_editar()`; la validación sigue en `fase_requisito_validar()`
  (B:11219) y suma: no se espera a una fase jubilada. `requisito_impacto(p_requisito)` → `{fuera, hay_mas, revisadas}`: cuántas unidades que
  hoy están en la fase no lo cumplen (recorre a lo sumo 1.000 de la fase por `vehiculos_fase_id_idx` o `repuestos_items_fase_id_idx` y corta
  en `tope + 1`). `flujo_fuera_de_regla(p_flujo, p_tope)` reemplaza a `fuera_de_regla()` (B:11446, que no pide permiso ni tiene tope y nadie
  llama): exige `puede_configurar_flujo()`, mira sólo las fases con requisitos bloqueantes, cada una con su `limit`, tamaño por
  `_acotar_pagina()` y alta en `scripts/guardas/areas-c/paginas-en-la-base.ts`; devuelve ids, fase y cuántos faltan, **nunca títulos**. `revoke`
  y `drop policy` de escritura en `fases_requisitos`. No entra: claves de dato nuevas, `evaluar_requisitos()`, los triggers de logística que
  impiden vaciar un dato exigido (Fase 6). Abiertos: ninguno. **Assert:** `supabase/tests/areas/flujos/requisitos.sql`: los tres tipos se crean
  y nacen informativos; clave desconocida `22023`; espera al mismo ámbito `22023`; espera con la regla apagada `23514`; formatos fuera del
  tipo `22023`; con 3 vehículos sembrados en la fase y 2 sin el dato, `requisito_impacto` da 2 y `hay_mas` con tope 1; al volverlo bloqueante,
  `flujo_fuera_de_regla` devuelve esos 2 y `previsualizar_cambio_fase` frena a un cuarto; quien no configura recibe `42501` en todas, también
  en la lectura; escritura directa `42501`. Lugar: `supabase/migrations/`, `supabase/tests/areas/flujos/`, `supabase/tests/escala.sql` (la
  línea de `fuera_de_regla`), `scripts/guardas/areas-c/`, `database.types.ts`. Nivel **2** (disparadores 4 y 6). Tipo: datos y dinero. Partes
  estimadas: 3.
  Dudas, con la recomendada: (a) ¿nace informativo aunque la columna diga `true`? Recomiendo **sí** (lo dice la ficha y es lo que hace posible el aviso de impacto); la semilla sigue insertando bloqueantes a mano. (b) ¿se borra `fuera_de_regla()`? Recomiendo **sí**: hoy filtra ids a quien no ve esos vehículos.

- **5.08** (hecho el 2026-11-11; `docs/pasos/5.08-1/`, `5.08-2/`, `5.08-3/`) — «Requisitos para entrar», el aviso de impacto y «fuera de regla». Área `requisitos`, sobre el 5.07. Llena
  `pantallas/requisitos.ts`: el bloque del inspector con los requisitos de la fase en orden (tipo, descripción humana, `<Badge>` «Bloqueante» o
  «Informativo») y «Agregar requisito» en tres formas: **Documento** (un tipo activo global o del flujo, mínimo y máximo de archivos, formatos
  dentro de los del tipo), **Dato** (una clave de `claves_dato_requisito(ámbito)` con su etiqueta de `entities/requisitos/claves.ts`;
  `pagos.umbral_pct` pide el porcentaje) y **Espera** (sólo con la regla «Esperas» encendida: una fase activa del otro flujo; un vehículo espera
  a sus repuestos y un repuesto a su vehículo). Encender «Bloqueante» llama `requisito_impacto()` y muestra el aviso dentro del panel (patrón
  `<AvisoDeImpacto>` de `shared/ui/campos`: «2 vehículos que ya están en «Embarcado» quedarán fuera de regla. No se mueven: quedan marcados.»)
  y pide confirmar; ordenar con botones; quitar con `?eliminar=`. **Fuera de regla:** un aviso sobre la lista de fases («5 unidades fuera de
  regla» o «50+», de `limit tope + 1`) que abre `?panel=fuera-de-regla`: hasta el tope, con `<AvisoDeTope>` y el camino «Verlas en el
  inventario» (`/vehiculos?origen=&fase=`); los títulos los resuelve `src/app` con `leerTitulosDeVehiculos()` de `vehiculos` (`flujos` no
  importa `vehiculos`) y lo que quien mira no ve dice «Un vehículo que no puedes ver». Estados: sin tipos de documento activos (lleva a
  «Documentos»), esperas apagadas (la opción deshabilitada con motivo), conflicto. No entra: subir documentos ni arreglar la unidad (Fase 6).
  Abiertos: ninguno. **Assert:** `e2e/configuracion-flujos-requisitos.spec.ts` (escritorio; sin celular): agrega uno de cada tipo a una fase;
  con 2 vehículos sembrados en ella sin el dato, encender «Bloqueante» dice «2 vehículos…», se confirma, y el aviso de fuera de regla lista
  sus dos títulos; vitest: `claves.test.ts` (toda clave de `claves_dato_requisito()` del SQL vigente, leído con `definicionSql()`, tiene
  etiqueta) y los esquemas. Lugar: `src/modules/flujos/{features,entities,infra,areas}/requisitos/`, `pantallas/requisitos.ts`,
  `src/app/(app)/configuracion/flujos/requisitos/`, `scripts/guardas/areas-c/`. Nivel **1**. Tipo: pantalla. Partes estimadas: 3.
  Dudas, con la recomendada: una clave de dato cuya regla está apagada (`transporte.*`, `aduana.*`, `pagos.*`): la base la acepta; recomiendo ofrecerla con una nota («La regla «Aduana» está apagada: nadie podrá cumplirlo») y no bloquear, hasta que la Fase 6 decida qué esconde cada regla.

- **5.09** (hecho el 2026-11-11; `docs/pasos/5.09/`) — «Documentos»: los tipos de documento de la empresa y del flujo. Área `documentos`, sobre el 5.03. Llena `pantallas/documentos.ts`
  y la pestaña `?seccion=documentos`: dos grupos, «De toda la empresa» (los cambia `logistica.catalogos.gestionar`; quien sólo configura el
  flujo los ve deshabilitados con motivo) y «Sólo de este flujo» (quien configura el flujo); `<ListaDeCatalogo>` de `shared` con orden por
  botones; alta y edición en modal (`?panel=nuevo-tipo&de=empresa|flujo`, `?panel=editar-tipo&tipo=<id>`): nombre, descripción, formatos
  (casillas), vencimiento (modo, días de vigencia, días de aviso), «Se puede mostrar en el portal» y activo; eliminar (`?panel=eliminar-tipo&tipo=`):
  sin uso se borra, con uso se desactiva y dice por qué con lo que devuelve la base («Lo usan documentos y 2 requisitos»). Estados como
  «Tipos de seguimiento» (`docs/UX.md` › «Leads: configuración»): vacío del grupo del flujo, conflicto, sin permiso. No entra: subir
  documentos. Abiertos: ninguno. **Assert:** `e2e/configuracion-flujos-documentos.spec.ts` (escritorio; sin celular): crea un tipo del flujo
  con vencimiento, lo edita, lo sube de orden, desactiva uno en uso y elimina uno sin uso; quien sólo tiene `flujos.configurar` ve los
  globales deshabilitados. Lugar: `src/modules/flujos/{features,entities,infra,areas}/documentos/`, `pantallas/documentos.ts`,
  `src/app/(app)/configuracion/flujos/documentos/`, `scripts/guardas/areas-c/`. Nivel **1**. Tipo: pantalla. Partes estimadas: 2.
  Dudas, con la recomendada: ninguna (las del vencimiento se deciden en el 5.03).

- **5.10** (hecho el 2026-11-11; `docs/pasos/5.10-1/`, `5.10-2/`) — La base de «Reglas» y de la oferta de transporte. Entra, en migraciones `flujo_regla_*` y `flujo_oferta_*`:
  `flujo_regla_cambiar(p_flujo, p_actualizado_en_esperado, p_regla, p_activa)` (inserta la fila si falta; el catálogo por ámbito: el de
  repuestos no admite `vitrina_web`, `portal_cliente` ni `aduana`) y `flujo_regla_impacto(p_flujo, p_regla)` → `{bloquea, fases: [{id,
nombre}], requisitos: [{id, fase}]}`: las fases que la marcan (lo que hoy sólo cuenta `flujo_regla_apagar_validar()`, B:11307) y, nuevo, los
  requisitos de espera vivos al apagar «esperas» (hoy pasa en silencio y se siguen evaluando: se bloquea igual que las otras); `transporte`,
  `contenedor`, `gastos`, `pagos` y `alerta_demora` no tienen uso que bloquee. **La oferta:** `flujos_transporte_oferta` hoy no admite filas
  (B:20845-20851 con la PK de B:22547): se quita la PK, las dos columnas pasan a nulables y entran dos índices únicos parciales (`(flujo_id,
tipo, puerto_id) where puerto_id is not null` y `(flujo_id, naviera_id) where naviera_id is not null`); `flujo_oferta_guardar(p_flujo,
p_actualizado_en_esperado, p_puertos_origen uuid[], p_puertos_destino uuid[], p_navieras uuid[])` (reemplazo todo o nada; vacío = se ofrece
  todo; sólo con la regla «transporte» encendida) y la lectura `flujo_oferta(p_flujo)`. `revoke` y `drop policy` de escritura en
  `flujos_reglas` y `flujos_transporte_oferta`. La ficha de `logistica` deja de listar la tabla como suya (la lee). No entra: puertos,
  navieras ni categorías de gasto. Abiertos: ninguno. **Assert:** `supabase/tests/flujos-reglas.sql` (en la lista de `probar-schema.mjs`):
  apagar «aduana» con una fase que la permite → `23514` y el impacto la nombra por id; apagar «esperas» con un requisito de espera bloquea;
  apagar y encender sin uso mueve la versión; la oferta guarda 2 puertos de origen y 1 naviera y se relee igual; un id inexistente `23503`;
  `PT409`; `42501`; escritura directa `42501`. Lugar: `supabase/migrations/`, `supabase/tests/`, `scripts/probar-schema.mjs`,
  `database.types.ts`, `src/modules/{flujos,logistica}/CLAUDE.md`. Nivel **2** (disparadores 4 y 6). Tipo: datos y dinero. Partes estimadas: 2.
  Dudas, con la recomendada: puertos y navieras no tienen pantalla ni RPC, y `navieras` nace vacía: recomiendo dejar ese catálogo a la **Fase 6** (es de `logistica`, con `logistica.catalogos.gestionar`) y que el 5.11 lo diga en su vacío; la alternativa (una pestaña «Catálogos» aquí) mete tablas de otro módulo en esta fase.

- **5.11** (hecho el 2026-11-11; `docs/pasos/5.11/`) — «Reglas» y la oferta de transporte. Área `reglas`, sobre el 5.10. Llena `pantallas/reglas.ts` y la pestaña `?seccion=reglas`:
  una fila por regla del catálogo del ámbito con `<Switch>`, nombre y explicación (`entities/reglas/catalogo.ts`: las 10 claves del check
  B:20834 con su texto y qué enciende cada una; test contra el SQL); apagar lee `flujo_regla_impacto()`: con uso no apaga y dice qué fases o
  requisitos la usan, cada una con enlace a su inspector (`?fase=`); sin uso apaga al momento con toast «Deshacer». Bloque «Oferta de
  transporte» (sólo con «Transporte» encendida): puertos de origen, puertos de destino y navieras (los activos), con «Vacío: se ofrecen
  todos», guardado con versión. Estados: sin navieras o puertos («Todavía no hay navieras cargadas. Se cargan en Logística.»), conflicto, sin
  permiso deshabilitado con motivo. No entra: lo que cada regla esconde en Logística (Fase 6). Abiertos: ninguno. **Assert:**
  `e2e/configuracion-flujos-reglas.spec.ts` (escritorio; sin celular): apagar «Aduana» con una fase que la permite no apaga y nombra la fase;
  tras quitarla de la fase, apaga y «Deshacer» la vuelve; la oferta guarda dos puertos y, con una naviera sembrada por SQL, la naviera; vitest
  de `catalogo.ts`. Lugar: `src/modules/flujos/{features,entities,infra,areas}/reglas/`, `pantallas/reglas.ts`,
  `src/app/(app)/configuracion/flujos/reglas/`. Nivel **1**. Tipo: pantalla. Partes estimadas: 2.

- **5.12** (hecho el 2026-11-12; `docs/pasos/5.12-1/`, `5.12-2/`) — «Revisar»: los avisos que faltan y la franja. Dos partes. **Parte 1, base** (migración `revisar_flujo_*`): `create or replace
revisar_flujo()` desde su definición vigente (B:16734, misma firma), que sólo responde a quien configura ese flujo y suma `rol_sin_personas`
  (aviso: una fase o una transición limitada a roles sin ninguna persona activa; la ficha lo promete y no existe), `entrada_no_automatica`
  (info: hay más de una inicial activa, o la única pide nota, requisitos bloqueantes o roles, y por eso los vehículos nacen «Sin fase»; espejo
  de `_vehiculo_fase_de_entrada()`, B:7769), `tipo_documento_inactivo` (aviso: un requisito pide un tipo desactivado) y `salida_a_jubilada`
  (aviso). **Parte 2, pantalla** (área `revisar`, llena `pantallas/revisar.ts` y el hueco del 5.02): la franja sobre el flujo, cerrada con el
  resumen («Todo en orden» o «1 error y 3 avisos») y abierta con la lista por nivel (icono y texto, nunca sólo color), cada aviso con fase
  enlazado a su inspector; se relee tras cada guardado; los textos vienen de la base (nombran fases); `entities/revisar/avisos.ts` (tipos,
  orden error › aviso › info) con test. No entra: arreglar solo, ni contar «fuera de regla» (5.08). Abiertos: ninguno. **Assert:**
  `supabase/tests/flujos-revisar.sql`: un flujo armado por SQL con una fase sin salida y una espera mutua entre vehículos y repuestos da
  exactamente `sin_salida` y `espera_cruzada` en esas fases (por `codigo` y `fase_id`, nunca por texto); un rol sin personas da
  `rol_sin_personas`; dos iniciales dan `entrada_no_automatica`; quien no configura no recibe filas. `e2e/configuracion-flujos-revisar.spec.ts`
  (escritorio; sin celular): la franja marca la fase sin salida y la espera cruzada, el clic abre el inspector de esa fase y, al agregarle la
  salida desde ahí, el aviso se va. Lugar: `supabase/migrations/`, `supabase/tests/`, `supabase/tests/escala.sql` (su línea),
  `src/modules/flujos/{features,entities,infra,areas}/revisar/`, `pantallas/revisar.ts`. Nivel **1** + `db:probar` (cambia una función, ninguna
  policy ni tabla). Tipo: datos y dinero (parte 1), pantalla (parte 2). Partes estimadas: 2.
  Dudas, con la recomendada: ¿«Revisar» frena algo? Recomiendo **no**: avisa y enlaza, nunca impide guardar (un flujo se arma por pasos y a medio armar siempre tiene avisos).

- **5.13** (hecho el 2026-11-12; `docs/pasos/5.13-1/`, `5.13-2/`) — El cierre de la Fase 5. El recorrido de la IA del «Terminado cuando», como `e2e/configuracion-flujos-recorrido.spec.ts` (la
  dueña, sin SQL para configurar): crea un origen (nace sin fases), arma 5 fases con sus salidas, un requisito de documento, uno de dato y uno
  de espera contra el flujo de repuestos; «Revisar» marca una fase sin salida y una espera cruzada y las corrige; un vehículo nuevo nace en
  la inicial, se mueve con `cambiar_fase` por SQL (mover no tiene pantalla hasta la Fase 6) y, al jubilar esa fase con historial, deja de ser
  destino (`previsualizar_cambio_fase` responde «jubilada») mientras `/vehiculos` y la ficha la siguen nombrando. Además: la tabla de
  criterios del párrafo de PLAN, la «Partición» marcada, `docs/ESTADO.md`, `docs/BITACORA.md` (`e2e completo: sí`), `docs/DECISIONES.md` («la
  configuración del flujo se escribe por RPC con la versión del flujo», «la oferta de transporte es de `flujos`», lo decidido en las dudas),
  las fichas de `flujos` y `logistica`, GLOSARIO («Oferta de transporte»), «Siguientes pasos» de Orígenes con su enlace, y lo que quede a
  «Pulido para la Fase 9». No entra: nada nuevo de producto. Abiertos: deja escritos para la Fase 6 los de la sección C. **Assert:** el
  recorrido en verde, `pnpm test:e2e:completo` con los dos proyectos, `db:probar`, `db:lint`, `db:carreras` y `mapa.sh --check`. Lugar:
  `e2e/`, `docs/`, `src/modules/flujos/CLAUDE.md`. Nivel **3** (cierre). Tipo: pantalla. Partes estimadas: 2. Hecho en dos: el **5.13-1** (el recorrido y el Nivel 3) y el **5.13-2** (los docs de cierre).
  Dudas, con la recomendada: ninguna. **Paralelismo.** Arrancan a la vez 5.01 (b), 5.02 (a) y 5.03 (c): no dependen de nada. Después, cada carril en lo suyo sin tocar archivos ajenos: **b** 5.04 → 5.05 → 5.06 (áreas `fases` y `transiciones`); **c** 5.09, 5.07 → 5.08 (áreas `documentos` y `requisitos`); **a** 5.10 → 5.11 → 5.12 → 5.13 (áreas `reglas` y `revisar`, y el núcleo). Las cuatro bases (5.01, 5.05, 5.07, 5.10) son migraciones distintas sobre tablas distintas; 5.05, 5.07 y 5.10 esperan a `_flujo_para_editar()` del 5.01. Las pantallas 5.04, 5.06, 5.08, 5.09 y 5.11 pueden correr juntas (cada una llena su `pantallas/<área>.ts`). **No en paralelo:** 5.02 con ninguna pantalla (crea los huecos); 5.12 va después de 5.06 y 5.08 (su e2e arregla el aviso desde el inspector).

Total de la fase: 13 pasos y 24 partes, todos hechos (la fase cerró con el 5.13, el 2026-11-12).

### Riesgos y huecos

- **No hay diseño de esta pantalla en `docs/UX.md`** (ni estados propios ni tarea de oro): el modelo lista + inspector + pestañas lo fijan
  estas filas. Si la persona quiere el «camino» dibujado, cambia 5.02 y 5.06.
- **La mayor parte del costo es base, no pantalla:** cinco pasos rojos (5.01, 5.03, 5.05, 5.07, 5.10) más la parte 1 del 5.12, todos con
  auditor y cuatro con Nivel 2. Es el precio de sacar la escritura directa; dejarla ahorraría esos pasos y rompería `datos.md`.
- **Decisiones de producto que la base no resuelve** (cada una con su recomendada en el paso): versión por flujo (5.01), significado del
  vencimiento (5.03), requisito que nace informativo (5.07), quién carga puertos y navieras (5.10), si «Revisar» frena (5.12).
- **`flujos_transporte_oferta` no admite filas**: lo deduje de la definición (PK sobre dos columnas que los check quieren nulas); no lo
  ejecuté. El 5.10 lo confirma con un `insert` antes de migrar. (Confirmado y rehecho en el 5.10-2.)
- **El flujo de repuestos depende del seed.** No pude determinar si el proyecto de producción corre `seed.sql`; el 5.01 lo cubre igual.
- **`flujos.activo`**: no encontré quién lo lee. No se edita en esta fase; el 5.13 lo anota. En el cierre (5.13-2): nadie lo lee y ninguna
  pantalla lo edita; queda así hasta que alguien lo necesite.
- **`escala.sql`**: no leí cómo trata una excepción que deja de hacer falta; si falla por «sobrante», el paso borra su línea.
- **Tamaño:** el 5.02 es el más ancho (ruta, áreas, lectura, inspector); si no cabe en 3 partes, la lista de sólo lectura y el inspector
  son su tercera y cuarta. El 5.08 lleva tres formularios distintos: 3 partes justas.
- **e2e:** todos los specs son de Configuración (escritorio, `// @sin-celular-archivo:` con motivo de ≥ 40 caracteres) y no usan apibara ni
  storage (`E2E_SIN_FUNCIONES=1`). Los que crean un origen borran antes sus fases (`borrarFasesDe`, `e2e/soporte/inventario.ts`).
- **Nada depende de afuera del repo:** sin claves, VAPID, correo, dominio ni proyecto de producción. Ninguna variable nueva en `docs/ENTORNOS.md`.
- **No leí** `docs/archivo/` (denegado) ni `docs/COTIZADOR.md`/`PILOTO.md` enteros; de `DECISIONES.md` sólo los títulos y la decisión del
  motor único (2026-10-11): no vi otra decisión sobre el configurador de flujos.

## Fase 6 — Logística

Módulo `logistica`: cadena (kanban por fase con alerta por demora, filtros en URL), panel del vehículo con «qué falta»
(`previsualizar_cambio_fase`), mover con nota y `PT409`, lote con vista previa por unidad y resultado parcial; documentos (subida con
commit diferido, cámara en móvil, aprobar/rechazar con motivo, vencimientos, visible en portal); transporte 1:1 y grupos (embarques por
booking, contenedores), editar grupo todo-o-nada; declaraciones aduaneras (DUI N:M, canal de aforo, «pagada» derivada); gastos y pagos
(confirmar sellado); notas; «dónde está»; cotización final vs real y margen (`margen_vehiculo`); bandeja de logística en inicio; alertas
por demora (cron + notificación).

**Terminado cuando:** mover 1 vehículo ≤ 15 s y marcar llegada de un contenedor de 8 ≤ 60 s con vista previa por unidad; no se puede mover
sin el documento bloqueante y el conflicto da `PT409` legible (e2e); el margen muestra `null` como «Sin venta registrada», nunca $0.

Abiertos que caen aquí (de ESTADO: mover de fase y publicar sin mover la versión de la ficha; la papelera manual no mira `documentos`):

- **6-1** (Fase 6; decidido el 2026-10-21: no se hace antes de cotizaciones): la bandera «principal» de los campos de un origen. Hoy lo que
  identifica a un vehículo en la lista, el resumen y el panel es `en_tarjeta`, que también dice qué se ve en la tarjeta; el panel del
  vehículo y la cadena de logística necesitan un «qué es este vehículo» propio — un campo marcado «principal» es lo que identifica al
  vehículo en la lista, el resumen y el panel de logística (no `en_tarjeta`); como mucho uno por origen, impuesto en la base (índice único
  parcial); sin ninguno, vale el título. Lugar: `origenes_campos` (columna, RPC de edición del campo y su layout), `features/campos` del
  editor y `vehiculos`. **Cerrado en el 6.13** (2026-11-11).

#### Los decide la persona

- **6-4** (Fase 6; salió del 5.08 y el 5.11, anotado en el cierre de la Fase 5): un requisito de dato cuya regla está apagada (`transporte.*`,
  `aduana.*`, `pagos.*`) se puede pedir —la pantalla avisa «nadie podrá cumplirlo» y no lo impide— y su hueco de logística no se dibuja con la
  regla apagada: una unidad en esa fase no puede cumplirlo. Decidir si `revisar_flujo()` lo avisa con un código propio o si la RPC lo rechaza.
  Lo reconcilia el 6.14 si ningún paso antes lo toma. Lugar: `flujos` (área `requisitos` o `revisar`). No lo tomó ningún paso: lo decide la
  persona (6.14-2).
- **6-2** (salió del 6.02-1; lo decide la persona): publicar en la vitrina mueve la versión de la ficha, porque `vehiculo_vitrina` usa
  `vehiculos.actualizado_en` como su versión. La duda 1 de la fila 6.02 propone una columna `vitrina_actualizado_en` que la RPC exige y devuelve. Lugar:
  migración y `vehiculos/features/vitrina`. Paso de datos.
- **6-5** (salió del 6.11-3; lo decide la persona): medir `gastos_listar` y `pagos_listar` con volumen (`supabase/tests/medir-gastos-pagos-listar.sql`,
  ≈ 50.000 filas en dos orígenes, como la dueña con «todos» y como una persona con «propios»), como pide `docs/RENDIMIENTO.md` › «Gastos y pagos (6.11-3)».
- **6-6** (salió del 6.11-4; lo decide la persona): prorratear un gasto por el valor del vehículo u otro criterio (hoy, partes iguales). Base e interfaz.
- **6-7** (salió del 6.04 como «6-3», renumerado en el 6.14 porque 6-3 era `pago_anular`; lo decide la persona): borrar una nota propia con una RPC
  `security definer` (el borrado suave por `update` da `42501` por `notas: leer`, `supabase/tests/areas/mover/notas.sql` N3), que cierre además que su autora
  pueda cambiar el cuerpo de una nota de cambio de fase. Paso de datos (rojo).

Cerrados en la fase: **6-1** (6.13), **6-3** `pago_anular` (6.10-2), la papelera manual con `documentos` y mover sin tocar la versión de la ficha (6.02-1),
el enforcement de `logistica.pagos.confirmar` (6.10).

### Lo que ya existe y lo que falta (leído el 2026-11-09)

En `src/` no hay nada de logística: `src/modules/logistica/` es la ficha y un `index.ts` con `export {}`; `flujos` sólo da `leerFasesDeOrigen()`;
no existe ninguna ruta `/logistica/*` (el menú la declara con `disponible: false`, `_shell/navegacion.ts:79`); los tres bloques de la bandeja
están declarados y vacíos (`tablero/entities/bandeja.ts`); la pestaña «Documentos» de la ficha del vehículo está en `disponible: false`
(`src/app/(app)/vehiculos/[id]/pestanas.ts`). No hay pruebas SQL de logística salvo dos casos de `cambiar_fase` en `humo.sql:219–274`.

| Superficie              | Ya está en la base                                                                                                                                                                                                                                                                                                           | Falta                                                                                                                                                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mover                   | `cambiar_fase` B:8443, `cambiar_fase_lote` B:8484 (≤ 200, `sqlerrm` por unidad), `previsualizar_cambio_fase` B:16146, `evaluar_requisitos` B:11140, `_puede_mover` B:6642, `_requisito_dato_cumplido` B:6794, `claves_dato_requisito` B:8717, `historial_fases` B:20919 (sólo lectura, policy B:26503)                       | Candado antes de leer, PT409 con quién y cuándo, lote con esperada por elemento y código por unidad, vista previa de un lote en una llamada, mover sin tocar `vehiculos.actualizado_en`; todo el TypeScript (actions, entities, panel) |
| Cadena                  | `vehiculos.fase_id/fase_desde`, índice `vehiculos_origen_fase_idx` B:24195; modelo: `embudo_tablero` B:9940 y `embudo_etapa_pagina` B:9714                                                                                                                                                                                   | Lecturas por cursor `(fase_desde, id)` con su índice, filtros, demora por tarjeta; la pantalla                                                                                                                                         |
| Documentos              | tabla B:20531, policies B:26267–26275, `documento_sellos` B:9614 (nadie nace aprobado, rechazar pide motivo, portal sólo si el tipo lo permite), índices B:23291–23323, bucket privado de 25 MB B:32251 con policies por carpeta de la unidad B:32216–32219, `storage_refcount` B:17372, `web.portal_documento_ruta` B:19728 | RPC de registrar (N unidades), revisar con versión, editar y eliminar; trigger «la fase lo exige»; índice de `ruta`; policy de lectura del objeto compartido; job de vencimientos; la pantalla                                         |
| Transporte y grupos     | `transportes` 1:1 B:21922 (únicos B:22997–23002; índices de booking y contenedor B:24079–24083), policies de insert/update directo B:27184–27192, `puertos` B:21364, `navieras` B:21162, `flujos_transporte_oferta` B:20845                                                                                                  | RPC con versión, «aplicar al grupo» todo o nada, lecturas de grupos por cursor; pantallas; catálogos (la semilla trae puertos, `seed.sql:146`, y ninguna naviera)                                                                      |
| Aduana                  | `declaraciones_aduana` B:20498 (número único), `declaraciones_vehiculos` B:20520 (una viva por vehículo B:23287), policies B:26237–26260, enum `canal_aforo` B:141                                                                                                                                                           | RPC, congelar la composición, «pagada» derivada, listado por cursor; pantalla                                                                                                                                                          |
| Gastos y pagos          | `gastos` B:20890, `pagos` B:21272, `categorias_gasto` B:20245, policies B:26488–26496 y B:26748–26756, grants por columna de `pagos` B:31759–31799, `margen_vehiculo` B:14229, bucket `comprobantes` B:32209–32211                                                                                                           | `pago_confirmar` (no existe; `permisos-enforcement.sql:18` lo exime), RPC de gasto con `monto_base` calculado en la base, prorrateo, listados por cursor; pantallas                                                                    |
| Notas                   | `notas` B:21172, policies B:26681–26689; `cambiar_fase` ya escribe la nota del cambio                                                                                                                                                                                                                                        | Índice para leer por unidad en orden; el hueco del panel                                                                                                                                                                               |
| Alertas y bandeja       | `alertas_demora()` B:8071 (sólo `service_role`), `notificaciones` B:21193 con antispam B:23679, `notificar()` B:14653, `fuera_de_regla` B:11446                                                                                                                                                                              | El job de cron (hoy hay ocho y ninguno es este: B:32305–32310 y `20261028183622:48–49`), repetición, cierre al mover, lecturas acotadas de la bandeja                                                                                  |
| Campo «principal» (6-1) | `origenes_campos.en_tarjeta` B:20053, `origen_campo_crear` B:15008, `origen_campo_guardar` B:15081                                                                                                                                                                                                                           | Columna, índice único parcial, RPC, editor, `vehiculos`                                                                                                                                                                                |
| Permisos                | Las 14 claves `flujos.mover*` y `logistica.*` están en `permisos.ts:43–56` y sembradas (`seed.sql:66–79`)                                                                                                                                                                                                                    | Ninguna clave nueva; sólo el enforcement de `logistica.pagos.confirmar`                                                                                                                                                                |
| Semilla                 | El origen `subasta_usa` trae 7 fases, transiciones y requisitos de documento y de dato (`seed.sql:166–184`)                                                                                                                                                                                                                  | Nada: la Fase 6 se prueba sin la pantalla de Flujos                                                                                                                                                                                    |

**Lo que el párrafo de PLAN o las fichas dicen y la base no hace:**

1. `cambiar_fase` «con `FOR UPDATE` y `PT409`» (ficha de `flujos`): el candado se toma **después** de leer la fase (B:8450 lee, B:8463 bloquea): dos
   sesiones con la misma `p_fase_esperada` pasan las dos. El mensaje usa voseo («Recargá», B:8453) y no dice quién.
2. `cambiar_fase_lote` no recibe la fase esperada por unidad (pasa `null`, B:8493) y traga cualquier error con `when others`;
   `.claude/rules/migraciones.md` pide «una de lote, por elemento».
3. «Mientras la unidad esté en una fase no se vacía el dato ni se quita el documento que esa fase exige (triggers)»: no hay ningún trigger así;
   `documentos`, `transportes`, `gastos` y `pagos` sólo tienen `set_actualizado_en`, `auditar` y los sellos (B:24299–24739).
4. «Confirmar un pago es un acto sellado (`pago_sellos`)»: `pago_sellos` sólo pone `creado_por` al insertar (B:15826); `confirmado*` y
   `eliminado_en` no tienen grant ni RPC: hoy nadie puede confirmar ni borrar un pago desde la app.
5. `gastos.monto_base` y `tipo_cambio_aplicado` los escribe el navegador (update de tabla, B:31638): dinero decidido fuera de la base.
6. «Vista `embarques`» (comentario de `transportes`, B:21947): no existe ninguna vista de grupos.
7. «DUI pagada derivada» y «composición congelada al asignarse canal de aforo» (comentario B:20516): sólo existe el dato por vehículo
   `aduana.tributos_pagados`; nada congela.
8. «Alertas por demora (cron)»: la función existe, el job no; no usa `fases.alerta_cada_horas` (B:19973), inserta directo en `notificaciones`
   (la ficha de `notificaciones` dice «sólo `notificar()` inserta» y «cada 72 h»).
9. «Un documento común a 8 vehículos es 1 objeto y 8 filas» (ficha) choca con la policy del bucket, que mira la carpeta de **una** unidad.
10. `tiene_permiso(clave)` sin origen vale con tenerlo en cualquiera (B:17431): así leen `declaraciones_aduana` (B:26245) y el bucket
    `comprobantes` (B:32209). `logistica.aduana.gestionar` y `logistica.pagos.confirmar` no son por origen (`seed.sql:72,77`).
11. `evaluar_requisitos`, `fuera_de_regla` y `unidad_llego_a_fase` son `security definer` con `execute` para `authenticated` y no miran
    permisos (B:29695, B:29772, B:31051); `previsualizar_cambio_fase` no lo mira para un repuesto (B:16158).
12. `_vehiculo_motivo_de_bloqueo` (B:7796) no mira `documentos`: es el arrastre «la papelera manual no mira `documentos`».

### Tabla de criterios

Cada criterio del «Terminado cuando» y del párrafo de la fase con la prueba que lo mide y su resultado en el Nivel 3 del 6.14-2 («base» = `db:probar` o
`db:carreras`, que corren en el CI de cada PR; «unidad» = Vitest; las rutas `areas/…` son de `supabase/tests/`).

| Criterio                                                                        | Prueba                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Proyectos                                          | Resultado                                                      |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| Mover 1 vehículo en ≤ 15 s                                                      | `logistica-tarea-de-oro.spec.ts` › «E2E R1 logística mueve una unidad desde la cadena en ≤ 15 s»; `logistica-mover.spec.ts` › «E2E mover · con la nota obligatoria el botón está apagado y dice por qué; con la nota mueve»                                                                                                                                                                                                                                                       | escritorio y movil                                 | verde en los dos (KLM 11,3 s; el robot, 1,1–1,5 s)             |
| Marcar la llegada de un contenedor de 8 en ≤ 60 s con vista previa por unidad   | `logistica-tarea-de-oro.spec.ts` › «E2E R4 logística marca que llegó un contenedor de 8 desde embarques en ≤ 60 s, viendo antes qué falta en cada uno»; `logistica-lote.spec.ts` › «E2E lote · un contenedor con una unidad sin su documento: mueve las siete y reintenta la que faltaba»; `areas/mover/lote.sql`                                                                                                                                                                 | escritorio, movil y base                           | verde en los dos (KLM 14,6 s; el robot, 2,1–2,8 s)             |
| No se mueve sin el documento bloqueante                                         | `logistica-tarea-de-oro.spec.ts` › «E2E R2 sin el documento bloqueante el botón se apaga y dice cuál»; `logistica-mover.spec.ts` › «E2E mover · un requisito bloqueante sin aprobar apaga el botón y dice cuál; al aprobarlo se habilita»; `areas/mover/mover.sql`, `areas/documentos/exigido.sql`                                                                                                                                                                                | escritorio, movil y base                           | verde (los dos)                                                |
| El conflicto da `PT409` legible, con el nombre de quien movió                   | `logistica-tarea-de-oro.spec.ts` › «E2E R3 si la dueña movió antes, logística lee su nombre y no se mueve nada»; `logistica-mover.spec.ts` › «E2E mover · si otra persona movió antes, el aviso de conflicto la nombra y no se mueve nada»; `areas/mover/version.sql`, `areas/mover/carreras.mjs`                                                                                                                                                                                 | escritorio, movil y base                           | verde (los dos)                                                |
| El margen `null` dice «Sin venta registrada», nunca $0                          | `logistica-tarea-de-oro.spec.ts` › «E2E R5 la dueña ve el margen de una unidad sin venta: «Sin venta registrada», nunca 0»; `logistica-gastos-y-pagos.spec.ts` › «E2E registrar un gasto en otra moneda muestra su equivalente y el margen sin venta»; `src/modules/logistica/entities/dinero/margen.test.ts`; `areas/dinero/margen.sql`                                                                                                                                          | escritorio y movil (R5), escritorio, unidad y base | verde (los dos)                                                |
| Cadena por fase con alerta por demora y filtros en la URL                       | `logistica-cadena.spec.ts` › «las columnas van en el orden de la base con su número y el demorado lo dice con texto», «el clic en una tarjeta abre el panel sobre los filtros, Esc lo cierra y «Limpiar» vuelve a las cinco», «las pestañas de origen: el vecino sin permiso no está y el otro cambia de origen y suelta los filtros», ««Ver más» trae la que falta de una columna de 51 y el número deja de ser «50+»»; `areas/mover/cadena.sql`, `fase-desde.sql`               | escritorio, movil y base                           | verde (los dos)                                                |
| «Dónde está»                                                                    | `logistica-cadena.spec.ts` › «la búsqueda por VIN deja una tarjeta, dice dónde está y sobrevive a recargar»; `areas/mover/donde-esta.sql`                                                                                                                                                                                                                                                                                                                                         | escritorio, movil y base                           | verde (los dos)                                                |
| Panel de la unidad con «qué falta» y sus permisos                               | `logistica-unidad.spec.ts` › «con logistica.ver ve la unidad: título, origen, fase y días en la fase», «?vehiculo=<id> abre el panel de la unidad en un drawer y Esc lo cierra», «con sólo vehiculos.ver ni /logistica ni el drawer muestran la unidad»; el bloqueante de `logistica-mover.spec.ts` (arriba); `areas/mover/unidad.sql`, `permisos.sql`                                                                                                                            | escritorio, movil y base                           | verde (los dos)                                                |
| Lote con vista previa por unidad y resultado parcial                            | `logistica-lote.spec.ts` › «E2E lote · un contenedor con una unidad sin su documento: mueve las siete y reintenta la que faltaba», «E2E lote · elegir una unidad con su casilla, mover a otra fase y limpiar la selección»; `areas/mover/lote.sql`                                                                                                                                                                                                                                | escritorio, movil y base                           | verde (los dos)                                                |
| Notas e historial                                                               | `logistica-mover.spec.ts` › «E2E mover · el historial dice quién movió y con qué nota; las notas se escriben y se corrigen; la ficha enlaza a logística»; `areas/mover/notas.sql`                                                                                                                                                                                                                                                                                                 | escritorio, movil y base                           | verde (los dos)                                                |
| Documentos: commit diferido, aprobar o rechazar con motivo, vencimiento, portal | `logistica-documentos.spec.ts` › «E2E subir un PDF: la bandeja no sube nada hasta «Subir» y la fila queda «Subido»», «E2E quien no puede subir ve la zona apagada y el motivo», «E2E sin la clave de aprobar, «Aprobar» queda apagado y dice por qué», «E2E aprobar el BL: la fila queda «Aprobado» y «Qué falta» cumple el requisito del destino»; `areas/documentos/{registrar,revisar,portal,objeto-compartido,exigido}.sql`, `carreras.mjs`; `areas/alertas/vencimientos.sql` | escritorio y base                                  | verde                                                          |
| Transporte 1:1 y grupos (embarques, contenedores); editar el grupo todo o nada  | `logistica-transporte.spec.ts` › «E2E cargar naviera, contenedor y fechas en el hueco y verlos guardados», «E2E si otra persona cargó el transporte, el aviso conserva lo escrito», «E2E ver el contenedor con sus dos unidades en /logistica/embarques y buscarlo», «E2E «Editar grupo» cambia la ETA de las tres unidades de un contenedor»; `areas/transporte/{guardar,grupo,grupos,exigido,escritura-directa}.sql`, `carreras.mjs`                                            | escritorio y base                                  | verde                                                          |
| Aduana: DUI N:M, canal de aforo, «pagada» derivada                              | `logistica-aduana.spec.ts` › «E2E crear una declaración con dos vehículos, asignarle el canal y verla pagada», «E2E quien no gestiona la aduana ve la lista sin «Nueva declaración»»; `areas/aduana/{composicion,guardar,exigido,leer,listar,escritura-directa}.sql`, `carreras.mjs`                                                                                                                                                                                              | escritorio y base                                  | verde                                                          |
| Gastos y pagos; confirmar un pago es un acto sellado                            | `logistica-gastos-y-pagos.spec.ts` › «E2E registrar un pago, confirmarlo con otra cuenta y ver la venta en el margen», «E2E la lista de /logistica/gastos muestra el gasto y el pago, filtra y abre la unidad», «E2E sin gastos.ver ni pagos.ver /logistica/gastos dice que no hay permiso»; `areas/dinero/{gastos,pagos,anular,prorratear,comprobantes,listar,escritura-directa}.sql`, `carreras.mjs`                                                                            | escritorio y base                                  | verde                                                          |
| Bandeja de logística en Inicio                                                  | `inicio-bandeja-logistica.spec.ts` › «con una unidad demorada y un documento subido, Inicio los muestra y «Ver todas» abre la cadena filtrada»; `areas/alertas/bandeja.sql`                                                                                                                                                                                                                                                                                                       | escritorio, movil y base                           | verde (los dos)                                                |
| Alertas por demora (cron y notificación)                                        | `areas/alertas/demora.sql`, `jobs.sql`                                                                                                                                                                                                                                                                                                                                                                                                                                            | base                                               | verde en `db:probar` (1.343 ✓, 0 caídas) y en el CI de cada PR |
| El campo «principal» identifica al vehículo (6-1)                               | `origenes-campo-principal.spec.ts` › «marcar «Lote interno» como principal lo vuelve el nombre del vehículo en la lista y en logística»; `src/modules/vehiculos/entities/identidad.test.ts`; `areas/origenes/principal.sql`, `carreras.mjs`                                                                                                                                                                                                                                       | escritorio, unidad y base                          | verde                                                          |

El recorrido de la IA (`logistica-tarea-de-oro.spec.ts` › R6, con `E2E_CAPTURAS`) no es un criterio: lo visto está en el informe del 6.14-1 y en «Pulido para la Fase 9».

### Cierre de la Fase 6

**Fase 6 cerrada el 2026-11-12** con el Nivel 3 del 6.14-2, corrido por proyecto (cada uno desde `db:reset` y `db:carreras`, 16,4 s y 18,1 s): escritorio,
sobre `225b1c99`, 1.191 en verde, 16 saltadas, 0 caídas y 0 sin correr en 49,1 min (51,1 de reloj); celular, sobre `225b1c99`, 834 en verde, 27 saltadas y
0 caídas en 38,1 min (39,2 de reloj). Sin triaje: ninguna caída. 5a-4b: los dos proyectos suman 90,3 min de reloj (76,6 en el 5.13-1; la suite de escritorio
pasó de 1.129 a 1.207 pruebas, con las fases 7 a 9 corriendo en paralelo y la máquina cargada por los otros dos carriles). `db:probar` 1.343 ✓ y 0 caídas,
`db:lint` sin errores (59 avisos y 69 «extra» en 35 funciones) y `mapa.sh --check` en verde. La tarea de oro 3 (`e2e/logistica-tarea-de-oro.spec.ts`,
logística y la dueña, en los dos proyectos): mover 1 desde la cadena, KLM 11,3 s de 15; el contenedor de 8 desde `/logistica/embarques` con la vista previa,
KLM 14,6 s de 60; el bloqueante, el conflicto con nombre y el margen sin venta. Lo que deja: **6-2**, **6-4**, **6-5**, **6-6** y **6-7** (los decide la
persona, arriba) y cinco líneas en «Pulido para la Fase 9». La «Partición» sigue aquí hasta que una sesión con permiso la pase a `docs/archivo/PLAN.md`.

### Partición

Un paso, su verificación y su PR; quién lo hace y de qué depende lo dice `docs/plan.yaml` (la tabla de «Carriles de las fases 5 a 9»). Cada fila dice qué entra, su assert y el lugar. Sus «Dudas» ya traen la opción recomendada: sin compuertas, **esa es la decisión**, y quien haga el paso la anota en `docs/DECISIONES.md` (el carril base) o en `docs/pasos/<paso>/decisiones.md`.

**Áreas de `logistica`** (cada una en `features/<área>/`, `entities/<área>/`, `infra/<área>/`, `areas/<área>/{index,client,composicion}.ts` y
`pantallas/<área>*.ts`): `nucleo` (la unidad y su panel), `cadena`, `mover` (qué falta, mover, lote, notas, historial), `documentos`,
`transporte`, `aduana`, `dinero` (gastos, pagos, margen), `alertas` (bandeja y jobs). Un área no importa otra; lo que cruza se compone en
`src/app` por **huecos** (el patrón de `HUECOS_DE_*_EN_LA_GUARDADA` de cotizaciones). En `flujos`, el área `mover` (las actions que llaman a
`cambiar_fase`), separada de lo que haga la Fase 5 en `features/configuracion`.

**Cómo corren los tres carriles.** Arrancan a la vez, sin esperar a nadie: **a** con 6.01, **b** con 6.05 y **c** con 6.13 (ninguno
depende de otro paso; las bases de datos de documentos, transporte y dinero tampoco dependen de la base del módulo). Después: **a** 6.02 →
6.03 → 6.04 → 6.14; **b** 6.07 → 6.06 → 6.08; **c** 6.10 → 6.11 → 6.09 → 6.12. Todo paso de un carril puede correr a la vez que los de
los otros dos, con una salvedad: 6.13 conviene **antes** de 6.03 (la tarjeta de la cadena nace con la identidad del vehículo; si llega
después, 6.13 edita un archivo del área `cadena`). 47 partes: a 14 más 2 del cierre, b 14, c 17.

- **6.01** (hecho el 2026-11-11; `docs/pasos/6.01-1/`, `6.01-2/`, `6.01-3/`, `6.01-4/`, `6.01-5/`) — La base del módulo `logistica`: entradas por área, el panel de la unidad con huecos y las rutas. Sin cambio de datos. Entra:
  (1) las ocho áreas con sus tres entradas vacías y `index.ts`, `client.ts` y `composicion.ts` de la raíz que sólo llevan
  `export * from './areas/<x>/…'` (nadie los vuelve a tocar); la guarda `scripts/guardas/areas-de-logistica.test.ts` (la raíz sólo reexporta,
  un área no importa otra), copiada de `areas-de-cotizaciones`. (2) `entities/nucleo/unidad.ts`: `Unidad` (vehículo o repuesto, uno solo) y
  `HuecoDeLaUnidad` (`clave`, `titulo`, permisos que lo muestran, regla del flujo que lo enciende, componente), con test. (3) Todos los
  archivos de hueco, creados vacíos, que cada paso llena después sin tocar nada compartido: en el panel,
  `pantallas/{mover,documentos,transporte,aduana,dinero}-unidad.ts` (`HUECOS_DE_<ÁREA>_EN_LA_UNIDAD`); en el resumen de un grupo,
  `pantallas/{mover,documentos,dinero}-grupo.ts`; en la sub-navegación, `pantallas/{transporte,aduana,dinero}-enlace.ts` (nulo hasta que su
  página existe); en Configuración, `pantallas/{transporte,dinero}-catalogos.ts`. (4) `src/app/(app)/logistica/layout.tsx` con la
  sub-navegación «Cadena · Embarques · Aduana · Gastos» (sólo dibuja los enlaces llenos, con su permiso), `page.tsx` (exige `logistica.ver`
  en algún origen; hasta el 6.03 dibuja sólo el panel si viene `?vehiculo=`) y `/logistica/vehiculo/[id]/page.tsx` (la ruta que ya escribe
  `alertas_demora`): los dos dibujan `<PanelDeLaUnidad>` — cabecera (el título que da `vehiculos`, origen, `<BadgeDeFase>` de
  `@/modules/vehiculos/client`, «desde hace N días» con `fechas.ts`, «Abrir ficha») y los huecos en orden fijo (qué falta, documentos,
  transporte, aduana, gastos, pagos, margen, notas, historial), cada uno en un `<Bloque>` plegable que lee al abrirse (`diferido()`), visible
  sólo con su permiso `puede(permisos, clave, origenId)` y con su regla de `flujos_reglas` activa. El panel sobre la cadena es un `<Drawer>`
  con URL (`?vehiculo=<id>`, `usePanelPorUrl`). (5) En `flujos`: `areas/mover/` con sus entradas y `leerFlujoDeOrigen(origenId)` (reglas
  activas y, por fase, `nota_obligatoria`, `permite_contenedor`, `permite_aduana`, `demora_dias`), por PostgREST con `.limit`. (6) `RUTAS` de
  `src/shared/lib/rutas.ts` (`logistica`, `unidadDeLogistica(id)`, `embarques`, `aduana`, `gastosDeLogistica`, `configuracionDeLogistica`);
  `/configuracion/logistica/page.tsx` (`logistica.catalogos.gestionar`), que dibuja los huecos de catálogos como pestañas
  `<PestanasConDesborde>` (`?seccion=`), y su entrada en `configuracion/secciones.ts`, que sólo aparece con algún hueco lleno;
  `e2e/soporte/logistica.ts` (un origen `e2e_…` con fases, transiciones y requisitos sembrados por SQL, y dos cuentas con rol de prueba).
  Estados de `docs/UX.md`: esqueleto de detalle, error con «Reintentar», «Este vehículo ya no está disponible: no existe o ya no tienes
  acceso.», sin permiso. NO entra: el kanban, ningún hueco lleno, encender «Logística» en el menú (lo hace 6.03). La ficha
  `src/modules/logistica/CLAUDE.md` gana la sección «Áreas» y `docs/UX.md` la fila de Logística con sus parámetros de URL; GLOSARIO: «Unidad»
  y «Panel de la unidad». **Assert:** `src/app/(app)/logistica/huecos-de-la-unidad.test.tsx` (los huecos se dibujan en su orden, uno vacío
  no dibuja nada, uno sin permiso o con la regla apagada tampoco); la guarda de áreas en verde; `e2e/logistica-unidad.spec.ts`: con
  `logistica.ver` del origen, `/logistica/vehiculo/<id>` muestra la cabecera con la fase y los días, y sin la clave, el estado sin permiso.
  Lugar: `src/modules/logistica/`, `src/modules/flujos/areas/mover/`, `src/modules/flujos/{index,client,composicion}.ts` (una línea cada
  uno), `src/app/(app)/logistica/`, `src/app/(app)/configuracion/{logistica/,secciones.ts}`, `src/shared/lib/rutas.ts`, `scripts/guardas/`,
  `e2e/`. Nivel **2** (`src/shared`). Tipo: pantalla. Partes estimadas: 3.
  Dudas, con la recomendada: (1) ¿El panel de la unidad es un drawer sobre la cadena o siempre una página? Recomiendo los dos con el mismo componente: drawer desde la cadena (UX, Flujo 3: «panel lateral») y página para el enlace de una notificación. (2) Si el paso base de la Fase 5 ya partió `flujos` en áreas, 6.01 sólo suma `areas/mover`; si no, crea `areas/` él y la Fase 5 se suma: lo decide quien llegue primero, sin preguntar.

- **6.02** (hecho el 2026-11-11; `docs/pasos/6.02-1/`, `6.02-2/`, `6.02-3/`) — Mover en la base: el candado, el conflicto con nombre, el lote por unidad y las lecturas de la cadena. Sólo `supabase/` y
  `scripts/carreras/`. Entra: (1) `cambiar_fase` (B:8443) toma `for update` de la unidad **antes** de `previsualizar_cambio_fase`; su PT409
  dice quién y cuándo desde `historial_fases` («Rosa Mamani la movió a «Embarcado» hace 1 min.», con `_hace()`), con tuteo; los rechazos
  llevan `hint` con un código (`requisitos`, `rol`, `transicion`, `nota`). `p_fase_esperada` nulo sigue valiendo sólo para una unidad sin
  fase (deuda aceptada en ESTADO: se deja escrito en el comentario). (2) `cambiar_fase_lote(p_unidades jsonb, p_fase_destino, p_nota)` con
  `[{vehiculo, fase_esperada}]` (reemplaza la de `uuid[]`; ≤ 200): por unidad `{vehiculo_id, ok, codigo, motivo, historial_id}`, sólo
  atrapa `PT409`, `23514`, `42501` y `22023` (lo demás aborta el lote). (3) `previsualizar_cambio_fase_lote(p_vehiculos uuid[], p_fase)`:
  la vista previa de hasta 200 en una llamada. (4) Permisos: `previsualizar_cambio_fase` exige `puede_unidad(…, 'logistica.ver',
'repuestos.ver')` también para un repuesto; `evaluar_requisitos` y `unidad_llego_a_fase` pierden el `execute` de `authenticated` (las
  llaman funciones `definer`); `fuera_de_regla(p_flujo)` exige `puede_configurar_flujo` o `logistica.ver` del origen. `evaluar_requisitos`
  suma a `detalle` la `clave_dato` y el `tipo_documento_id` (la interfaz pone la etiqueta y el atajo; hoy sólo viene «Dato: transporte.contenedor»).
  (5) Mover no mueve la versión de la ficha: `trg_actualizado_en` y `trg_auditar_cambio` de `vehiculos` no corren cuando sólo cambian
  `fase_id` y `fase_desde` (como `cotizado_en`, migración `20261029184435`); la actividad queda una vez (`unidad.fase_cambiada`).
  (6) `_vehiculo_motivo_de_bloqueo` (B:7796) rechaza con documentos vivos («Tiene documentos cargados.»). (7) Lecturas, `security invoker`,
  con el alcance de `logistica.ver` resuelto una vez por origen (nunca `puede_vehiculo` por fila): `logistica_cadena(p_origen, p_tope,
p_filtros jsonb)` (una columna por fase activa con `es_logistica`, más las jubiladas que aún tienen unidades y «Sin fase»; por columna
  `p_tope + 1` filas) y `logistica_cadena_columna(p_fase, p_desde, p_id, p_tope, p_filtros)`, por cursor `(fase_desde, id)`, tamaño por
  `_acotar_pagina(…, 50, 100)`, sobre el índice nuevo `vehiculos (origen_id, fase_id, fase_desde, id) where eliminado_en is null`,
  registradas en `scripts/guardas/paginas-en-la-base.ts`; cada tarjeta: id, título, VIN, lote, `fase_desde`, `demorada`
  (`coalesce(fases.demora_dias, demora_dias_default) > 0` y vencido; con la regla `alerta_demora`), contenedor, booking y ETA. Filtros:
  `q` (≥ 3 letras o dígitos: título, VIN y lote por sus trigramas; contenedor y booking por prefijo), `demoradas`, `por_aprobar`
  (tiene un documento `subido`), `contenedor`, `booking`, `naviera`. `logistica_unidad(p_vehiculo)`: lo del panel que no da `vehiculos`
  (demorada, fuera de regla con lo que le falta a su fase actual, quién la movió). `logistica_donde_esta(p_buscar, p_tope)`: hasta 10
  unidades de todos los orígenes que veo, con fase, desde cuándo y ETA. Índice `notas (vehiculo_id, creado_en desc, id desc) where
eliminado_en is null`. Cierra los arrastres de ESTADO «mover de fase sin mover la versión de la ficha» y «la papelera manual no mira
  `documentos`». NO entra: TypeScript, pantallas, alertas. **Assert:** `supabase/tests/areas/mover/*.sql` (con usuarios simulados): sin
  `flujos.mover` del origen no mueve; un rol fuera de `fases_roles` no mueve y con `flujos.mover.cualquiera` sí; sin el documento
  bloqueante aprobado, `23514` con `hint = 'requisitos'`; la esperada vieja da `PT409` con el nombre de quien movió; el lote devuelve
  `conflicto` para una y mueve las otras; mover no cambia `vehiculos.actualizado_en`; quien no tiene `logistica.ver` no recibe requisitos
  ni filas de la cadena; el alcance `propios` sólo ve lo suyo. `scripts/carreras/mover.mjs`: dos sesiones con la misma esperada → una mueve,
  la otra `PT409`, una sola fila en `historial_fases`. Un caso en `supabase/tests/medir-escala.sql` con el plan de la columna por su índice.
  `humo.sql:274` pasa a la firma nueva. Lugar: `supabase/migrations/`, `supabase/tests/areas/mover/`, `scripts/carreras/mover.mjs`,
  `scripts/guardas/paginas-en-la-base.ts`, `src/shared/types/database.types.ts`. Nivel **2** (índices). Tipo: datos y dinero. Partes estimadas: 3.
  Dudas, con la recomendada: (1) «Publicar sin mover la versión de la ficha» (la otra mitad del arrastre): `vehiculo_vitrina` (B:19125) usa `vehiculos.actualizado_en` como su propia versión. Recomiendo una columna `vitrina_actualizado_en` que `vehiculo_vitrina` exige y devuelve, y sacar las columnas de vitrina del `when` del trigger; si no cabe en una parte, se hace sólo la fase y lo de publicar queda como abierto **6-2** en PLAN (toca `vehiculos/features/vitrina`). (2) ¿La columna «Sin fase» va en la cadena? Recomiendo sí, primera y sólo si tiene unidades: es el único lugar desde donde entran a una fase inicial. (3) ¿Qué orden dentro de una columna? Recomiendo la que más lleva primero (`fase_desde` ascendente): lo demorado queda arriba sin otro índice.

- **6.03** (hecho el 2026-11-12; `docs/pasos/6.03/`) — La cadena: `/logistica` como kanban por fase, con filtros en la URL, alerta por demora y «dónde está». Entra: pestañas de
  origen `?origen=` (los orígenes donde tengo `logistica.ver` y la regla `logistica` está activa; nombres y colores de la base), una columna
  por fase que devuelve `logistica_cadena()` con su `<Badge>` de color de la fila, `TAMANO_DE_COLUMNA` tarjetas y «Ver más» por cursor
  (`logistica_cadena_columna`) hasta `TOPE_DE_LO_CARGADO` con `<AvisoDeTope>`; el número de la columna, acotado (`conteoCorto()`, «50+»),
  nunca un total. Tarjeta: el título que da `vehiculos`, VIN o lote, «N días en la fase», «Demorado» como `<Badge>` con texto,
  contenedor y ETA si hay; clic o Enter abre `?vehiculo=<id>` (el panel de 6.01); nunca arrastrar y soltar. En el celular, una fase a la
  vez con pestañas (como `pestanas-de-etapas` del embudo). Filtros con `<FilterShell>` y `nuqs` (`shallow: false`): `q`, `demoradas`,
  `por_aprobar`, `contenedor`, `booking`, `naviera`; chips y «Limpiar». «Dónde está»: con `q` de 3 o más, sobre las columnas, la franja
  de resultados de `logistica_donde_esta()` («<título> · en «Embarcado» hace 5 días · ETA 12 nov», de todos mis orígenes; elegir uno
  cambia de origen y abre su panel); `index.ts` del área exporta `dondeEsta(busqueda)` y `leerCadena()` (los usará el buscador de la Fase 7).
  Enciende «Logística» en `_shell/navegacion.ts` y suma `/logistica` a `e2e/soporte/presupuestos.ts` (lo medido más 5 %). Estados:
  esqueleto de tablero, origen sin fases («Este origen todavía no tiene fases.», con el enlace a Flujos sólo si esa ruta existe y tengo
  `flujos.configurar`), vacío por filtro, error con «Reintentar», sin permiso. El kanban entra a `scripts/guardas/listas-con-patron.ts`
  con su motivo (como el embudo). NO entra: selección ni lote (6.04), contenido del panel. **Assert:** `e2e/logistica-cadena.spec.ts`
  (escritorio): con un origen de 3 fases y 5 vehículos sembrados por SQL, uno demorado, se ven las columnas en orden, el demorado lo dice
  con texto, `?q=<vin>` deja una tarjeta y muestra «dónde está», recargar conserva el filtro y el clic abre el panel; vitest de
  `entities/cadena/` (filtros ↔ URL; texto de los días). Lugar: `src/modules/logistica/{features,entities,infra,areas}/cadena/`,
  `pantallas/cadena.ts`, `src/app/(app)/logistica/page.tsx`, `src/app/(app)/_shell/navegacion.ts`, `e2e/`. Nivel **2** (`_shell`).
  Tipo: pantalla. Partes estimadas: 3.
  Dudas, con la recomendada: (1) ¿La tarjeta lleva foto? Recomiendo no: quien mueve reconoce por VIN, lote o contenedor, y 350 miniaturas pesan. (2) ¿Las columnas de un origen con 12 fases? Recomiendo desplazamiento de costado dentro de su caja con `<PistaDeDesborde>`, sin plegar columnas.

- **6.04** (hecho el 2026-11-12; `docs/pasos/6.04/`) — El panel «qué falta», mover con nota y conflicto legible, notas, historial y el lote con vista previa y resultado parcial (la
  tarea de oro 3). Entra, en cinco partes: **(a)** `flujos`, área `mover`: `entities/mover/` (el esquema Zod de la vista previa,
  `etiquetaDeRequisito()` con una etiqueta por cada clave de `claves_dato_requisito()` y un test que cae si falta una; `motivoLegible()`),
  las actions `previsualizarCambio`, `cambiarFase` y `cambiarFaseLote` (`puede(permisos, 'flujos.mover', origenId)` y la base otra vez;
  `PT409` → `conflicto`, `23514` → `requisitos`), exportadas por `flujos` (las usará `repuestos`). **(b)** El hueco «Qué falta»
  (`pantallas/mover-unidad.ts`), primero del panel: los destinos con transición desde la fase actual (el botón dice `accion` de la
  transición si la tiene, «Mover a <fase>» si no) y, por destino, cada requisito con cumplido o falta, bloqueante o informativo y su
  detalle («1 de 2 aprobados»), cada falta con el atajo al hueco que la resuelve (ancla dentro del panel); «Fuera de regla» si a su fase
  actual le falta algo (`logistica_unidad`). Se relee al volver el foco y cuando otro hueco avisa que guardó; sin realtime. **(c)** Mover:
  nota interna (obligatoria si la fase o la transición la piden, dicho junto al campo), `Ctrl/Cmd+Enter`, apagado con su motivo si falta
  un bloqueante o su rol no puede; al mover, aviso «<título> pasó a «<fase>».» y la tarjeta cambia de columna; conflicto con
  `<AvisoDeConflicto>` y el texto de la base («Rosa Mamani la movió a … · Recargar»). **(d)** Huecos «Notas» (escribir; editar y borrar
  sólo las propias, por policy; la del cambio de fase dice «al pasar a «<fase>»») e «Historial» (`historial_fases`: fase, quién, cuándo,
  nota), los dos por `TAMANO_DE_VER_MAS` con cursor `(creado_en, id)`; en la ficha del vehículo, el enlace «Ver en logística» con
  `logistica.ver`. **(e)** Lote: casillas de 44 px en las tarjetas y «Elegir los de esta columna» (lo cargado y filtrado, hasta 200),
  la barra «N elegidos · Mover a…» (destinos de esa columna), `?panel=lote` en un `<Drawer>`: vista previa por unidad con
  `previsualizar_cambio_fase_lote` («Lista» o «Falta: BL aprobado»), nota común, «Mover los N que pueden» y el resultado entero («Se
  movieron 6 de 8. No se movió «X»: falta el BL aprobado. «Y»: la movió Rosa Mamani hace 1 min.») con «Reintentar los 2», que vuelve a
  la vista previa; el mismo panel abre con `?contenedor=` o `?booking=` (elige las unidades de ese grupo que estén en una misma fase) y
  llena `pantallas/mover-grupo.ts` con «Marcar que llegó» para el resumen de un grupo (6.08). Permisos: `flujos.mover`,
  `flujos.mover.cualquiera`, `logistica.ver`. NO entra: subir documentos (el atajo lleva al hueco, que llena 6.06). GLOSARIO: «Lote (de
  mover)». **Assert:** `e2e/logistica-mover.spec.ts`: mover una unidad con nota obligatoria; con el documento bloqueante sin aprobar el
  botón está apagado y dice cuál falta; una segunda cuenta mueve antes y la primera ve el conflicto con su nombre (lo pide el «Terminado
  cuando» de PLAN). `e2e/logistica-lote.spec.ts`: 8 unidades de un contenedor sembradas por SQL, una sin su documento: la vista previa la
  marca, el resultado dice «7 de 8» y, aprobado el documento por SQL, «Reintentar» mueve la que faltaba. Vitest de `flujos/entities/mover/`
  y de `logistica/entities/mover/` (las frases del resultado parcial). Lugar: `src/modules/flujos/{features,entities,infra,areas}/mover/`,
  `src/modules/logistica/{features,entities,infra,areas}/mover/`, `pantallas/mover-unidad.ts`, `pantallas/mover-grupo.ts`,
  `pantallas/cadena.ts` (la selección), `src/app/(app)/vehiculos/[id]/encabezado.tsx`, `e2e/`. Nivel **1**. Tipo: pantalla. Partes estimadas: 5.
  Dudas, con la recomendada: (1) ¿El lote mezcla unidades de fases distintas? Recomiendo no: se arma desde una columna (o un grupo en una misma fase), así todas comparten destinos y la vista previa se entiende. (2) ¿«Mover los que pueden» o todo o nada? Recomiendo los que pueden, dicho en el botón con su número: es el «resultado parcial explícito» del Flujo 3 de UX. (3) ¿La línea de tiempo va también en la ficha del vehículo? Recomiendo sólo el enlace «Ver en logística»: `pestanas.ts` no declara esa pestaña y `vehiculos` no puede importar `logistica`.

- **6.05** (hecho el 2026-11-11; `docs/pasos/6.05/`) — Documentos en la base: registrar con commit diferido, revisar con versión, lo que la fase exige y el objeto compartido. Sólo
  `supabase/`. Entra: (1) `documento_registrar(p_id, p_vehiculos uuid[], p_repuesto, p_tipo, p_ruta, p_nombre, p_mime, p_bytes,
p_emitido_el, p_vence_el, p_nota)`: se llama **después** de subir el objeto (`<unidad>/<sha-256>.<ext>` en el bucket `documentos`);
  idempotente por `p_id`; exige `logistica.documentos.subir` en cada unidad, tipo activo y del flujo de la unidad o global, `mime` dentro de
  `tipos_documento.formatos`, que el objeto exista; `vence_el` sale de `emitido_el + vigencia_dias` si el tipo vence y no vino; para N
  vehículos (el BL de un contenedor) escribe N filas con la misma `ruta` en una transacción. (2) `documento_revisar(p_id,
p_actualizado_en_esperado, p_estado, p_motivo)` (`logistica.documentos.aprobar`; `PT409`; aprobar habilita mover, por eso es RPC),
  `documento_editar(…)` (fechas, nota, `visible_portal`) y `documento_eliminar(…)` (borrado suave; el objeto queda para `storage-gc` por
  refcount). `authenticated` pierde `insert` y `update` de la tabla. (3) El trigger que la ficha promete: no se elimina ni se pasa de
  aprobado a otro estado el documento sin el cual la unidad deja de cumplir un requisito bloqueante de **su fase actual** (`23514`, «La
  fase «<fase>» exige este documento. Sube el reemplazo antes de quitarlo.»); que venza solo no lo impide nadie: la unidad queda «fuera de
  regla». (4) Storage: la policy `documentos: leer` deja leer el objeto a quien ve **alguna fila viva** de `documentos` con esa `ruta`
  (además de la carpeta propia), con el índice nuevo `documentos (ruta)` (falta: `docs/DECISIONES.md:2348`); `storage.objects` sólo recibe
  policies. (5) Índice parcial `documentos (creado_en, id) where estado = 'subido' and eliminado_en is null` (la bandeja de 6.12). NO
  entra: pantallas, el job de vencimientos (6.12), `api/portal/*` (Fase 8; `visible_portal` ya lo leen `web.portal_snapshot` y
  `web.portal_documento_ruta`). **Assert:** `supabase/tests/areas/documentos/*.sql`: sin `logistica.documentos.subir` del origen no
  registra; nadie nace aprobado; rechazar sin motivo falla; aprobar sin la clave da `42501`; versión vieja, `PT409`; un tipo sin
  `visible_portal_permitido` no se muestra en el portal; el documento exigido por la fase no se elimina y el de otra fase sí; registrar
  para 3 vehículos deja 3 filas y `storage_refcount = 3`; quien ve sólo el tercero lee el objeto y quien no ve ninguno, no; un caso en
  `humo.sql`. Lugar: `supabase/migrations/`, `supabase/tests/areas/documentos/`, `src/shared/types/database.types.ts`. Nivel **2**
  (policy e índices). Tipo: datos y dinero. Partes estimadas: 3.
  Dudas, con la recomendada: (1) ¿Un documento común es un objeto y N filas (la ficha) o N objetos como las fotos (DECISIONES, 2026-10-13)? Recomiendo un objeto y N filas con la policy por fila: un BL de 20 MB por 8 no se sube 8 veces desde un celular en puerto. (2) ¿Eliminar un documento se puede deshacer? Recomiendo `<Confirmar>` que lo nombra y sin restaurar: el reemplazo es subir otro. (3) ¿Quién marca «visible en el portal»? Recomiendo quien aprueba (`logistica.documentos.aprobar`), no quien sube: es lo que ve el cliente.

- **6.06** (hecho el 2026-11-12; `docs/pasos/6.06-1/`, `6.06-2/`, `6.06-3/`) — Documentos: subir con la cámara y commit diferido, aprobar o rechazar, vencimiento y «visible en el portal». Entra: el hueco
  «Documentos» del panel (`pantallas/documentos-unidad.ts`) y la pestaña «Documentos» de `/vehiculos/[id]?seccion=documentos`
  (`seccion-documentos.tsx`, que compone el mismo componente; `pestanas.ts` la pone disponible sólo con `logistica.ver` del origen).
  Lista por tipo de documento (nombres de la base; los que pide la fase siguiente, arriba), con estado en `<Badge>` con texto, el motivo
  del rechazo, «Vence el …» o «Vencido», quién subió y quién revisó. Subir: `<ZonaDeArchivos>` de `shared/ui` (selector, soltar y, en
  táctil, cámara) deja los archivos en una bandeja **sin subir**, donde se dice lo que no entra y por qué (formato que el tipo no admite,
  más de 25 MB, repetido por hash); se elige tipo y fechas; «Subir N documentos» sube el objeto por hash sin comprimir
  (`src/shared/lib/almacen.ts`) y recién entonces llama `documento_registrar`; avance «2 de 3» y «Reintentar los N que faltan»; cerrar
  con archivos en la bandeja pregunta (`useCambiosSinGuardar`). Aprobar y «Rechazar» con motivo junto al campo; `PT409` con
  `<AvisoDeConflicto>`; «Eliminar» con `<Confirmar>` con URL; el rechazo de la base «la fase lo exige» se muestra tal cual. Ver o
  descargar con URL firmada de 60 s. «Visible en el portal»: interruptor apagado con motivo si el tipo no lo permite. Llena
  `pantallas/documentos-grupo.ts` («Subir un documento a las N unidades», para el resumen de un grupo). Permisos:
  `logistica.documentos.subir`, `logistica.documentos.aprobar` (por origen): lo que no se puede va apagado con su motivo. Estados: los
  cinco de `ui.md`. NO entra: el aviso de vencimiento (6.12), el portal. **Assert:** `e2e/logistica-documentos.spec.ts` (escritorio): una
  cuenta sube un PDF como BL (queda «Subido»), otra con la clave de aprobar lo aprueba y el requisito de «Qué falta» pasa a cumplido (si
  6.04 aún no está, se comprueba con `previsualizar_cambio_fase` por SQL); vitest de `entities/documentos/` (qué archivo entra según el
  tipo; qué cuenta para un requisito: aprobado, vivo, sin vencer, formato admitido). Lugar:
  `src/modules/logistica/{features,entities,infra,areas}/documentos/`, `pantallas/documentos-unidad.ts`, `pantallas/documentos-grupo.ts`,
  `src/app/(app)/vehiculos/[id]/{pestanas.ts,seccion-documentos.tsx,contenido-de-la-pestana.tsx}`, `scripts/guardas/areas-b/`, `e2e/`.
  Nivel **1**. Tipo: pantalla. Partes estimadas: 3.
  Dudas, con la recomendada: (1) ¿Una foto sacada con la cámara se convierte a WebP? No: es un documento y no se comprime (CLAUDE.md); recomiendo avisar el tamaño antes de subir si pasa de 10 MB. (2) ¿La pestaña «Documentos» de la ficha deja subir o sólo ver? Recomiendo lo mismo que el panel (un solo componente): menos código y el permiso ya lo decide la base.

- **6.07** (hecho el 2026-11-12; `docs/pasos/6.07-1/`, `6.07-2/`, `6.07-3/`) — Transporte y aduana en la base: guardar con versión, aplicar a un grupo todo o nada, declaraciones y lo que la fase exige.
  Sólo `supabase/` y `scripts/carreras/`. Entra, transporte: (1) `transporte_guardar(p_vehiculo, p_repuesto,
p_actualizado_en_esperado, p_cambios jsonb)`: la esperada nula crea la fila 1:1 (si ya existe, `PT409`); exige
  `logistica.transporte.editar`, la regla `transporte` del flujo y, para contenedor, la regla `contenedor` y `fases.permite_contenedor`;
  normaliza contenedor y booking (mayúsculas, sin espacios); la oferta del flujo filtra lo que se ofrece y nunca invalida lo guardado.
  (2) `transporte_grupo(p_tipo, p_clave)`: las unidades del grupo que veo, con su versión y su fase, y si hay otras que no veo (sí o no,
  sin número). (3) `transporte_grupo_aplicar(p_tipo, p_clave, p_esperadas jsonb, p_cambios jsonb)`: bloquea las filas en orden de id y
  aplica a todas o a ninguna: `PT409` si una cambió o el grupo ya no es el que venía; `42501` si no puedo editar alguna; ≤ 200.
  (4) `transporte_grupos(p_tipo, p_desde, p_tope, p_filtros)`: embarques (por `booking`) y contenedores (por `contenedor`) por cursor
  sobre la clave, con `_acotar_pagina`, sobre los índices B:24079–24083; por grupo, naviera, puertos y fechas («varios» si difieren) y
  el número de unidades acotado (`limit n + 1`). Entra a `scripts/guardas/areas-b/paginas-en-la-base.ts`. `authenticated` pierde `insert`
  y `update` de `transportes`. El comentario de la tabla deja de nombrar una vista. Aduana: (5) `declaracion_guardar(p_id,
p_actualizado_en_esperado, p_datos)` (número repetido → `23505` con `hint = 'numero'`), `declaracion_vehiculos_poner(p_declaracion,
p_actualizado_en_esperado, p_agregar uuid[], p_quitar uuid[])` (quitar pone `removido_en`; volver a agregar revive la fila; un vehículo
  ya declarado en otra da un motivo con el número; exige la regla `aduana` y una fase con `permite_aduana`; **con canal de aforo asignado la
  composición no cambia**), `declaracion_canal(p_id, p_actualizado_en_esperado, p_canal)`. (6) «Pagada» derivada, nunca columna:
  `declaraciones_listar(p_desde, p_id, p_tope, p_filtros)` por cursor `(creado_en desc, id desc)` con su índice nuevo, y por fila
  `pagada` (todos sus vehículos vivos tienen un gasto vivo de una categoría con `proposito = 'tributos'`) y cuántos faltan;
  `declaracion_leer(p_id)`. `authenticated` pierde la escritura directa de las dos tablas. (7) El trigger de la ficha para los datos:
  no se vacía un dato de transporte ni se quita un vehículo de su declaración si su fase actual lo exige como bloqueante (`23514`
  con la fase y el dato). NO entra: pantallas, catálogos. **Assert:** `supabase/tests/areas/transporte/*.sql` y `areas/aduana/*.sql`: sin
  la clave del origen no guarda; versión vieja, `PT409`; aplicar a un grupo de 3 con una cambiada no cambia ninguna; no se vacía el
  contenedor de una unidad cuya fase lo exige; la composición se congela con el canal; `pagada` pasa a verdadera recién con el tributo del
  último vehículo; quien no tiene `logistica.aduana.gestionar` no escribe. `scripts/carreras/transporte-grupo.mjs`: aplicar al grupo
  mientras otra sesión guarda una unidad → una de las dos recibe `PT409`, nunca un grupo a medias ni un bloqueo mutuo. Lugar:
  `supabase/migrations/`, `supabase/tests/areas/{transporte,aduana}/`, `scripts/carreras/`, `scripts/guardas/areas-b/`. Nivel **2**
  (índice). Tipo: datos y dinero. Partes estimadas: 4.
  Dudas, con la recomendada: (1) ¿Qué orden tienen los grupos? Recomiendo por clave con filtros (naviera, puerto, «en tránsito» = sin arribo) y búsqueda por prefijo: ordenar por ETA pide agrupar toda la tabla. (2) ¿Quién lee una declaración? Hoy basta `logistica.ver` en cualquier origen (B:26245). Recomiendo que la lectura devuelva sólo los vehículos que quien mira ve y deje la cabecera a quien ve al menos uno. (3) ¿Cambiar el canal una vez puesto? Recomiendo sí, con la versión, pero la composición sigue congelada.

- **6.08** (hecho el 2026-11-12; `docs/pasos/6.08-1/`, `6.08-2/`, `6.08-3/`, `6.08-4/`) — Transporte: el hueco de la unidad, `/logistica/embarques` (embarques y contenedores) con «editar el grupo», y los catálogos
  de puertos y navieras. Entra: (1) el hueco «Transporte» (`pantallas/transporte-unidad.ts`): naviera, puerto de origen y de destino (lo
  que ofrece `flujos_transporte_oferta` del flujo; lista vacía = todos los activos), contenedor, booking, zarpe, ETA, arribo y notas, en
  `<Bloque>`; guardar con versión, conflicto «Alguien lo cambió · Recargar» (`<AvisoDeConflicto>`); sin `logistica.transporte.editar` del
  origen, sólo lectura con motivo; el rechazo «la fase lo exige», junto al campo. (2) `/logistica/embarques` (`logistica.ver`):
  `?grupo=embarques|contenedores`, lista por cursor con el patrón de lista (`<UnaSolaVista>`, sin selector de tamaño), filtros en URL
  (naviera, puerto, «en tránsito», `q` por prefijo, mínimo 3), resumen `?booking=` o `?contenedor=` con sus unidades (título, fase,
  días) y los huecos de grupo de mover, documentos y dinero. (3) «Editar grupo» en `?panel=editar-grupo`: los campos que difieren entre
  unidades se muestran como «Varios» y sólo se aplica lo que se toca; pie «Se aplicará a las N unidades.»; conflicto: «No se cambió
  ninguna: <motivo> · Recargar». (4) Llena `pantallas/transporte-enlace.ts` («Embarques» en la sub-navegación) y
  `pantallas/transporte-catalogos.ts`: «Puertos» y «Navieras» en `/configuracion/logistica` con `<ListaDeCatalogo>` (crear, renombrar,
  activar o desactivar, ordenar puertos), por las policies que ya existen (B:26658–26670, B:26807–26819), sin borrar (el `delete` deja
  nulos los transportes, B:25865–25875). Permisos: `logistica.ver`, `logistica.transporte.editar`, `logistica.catalogos.gestionar`. Estados: los
  cinco; sin navieras, el selector lo dice con el enlace a Configuración si puedo gestionarlas. NO entra: mover desde el grupo (lo
  dibuja el hueco de 6.04), prorratear (6.11). GLOSARIO: «Grupo (de transporte)». **Assert:** `e2e/logistica-transporte.spec.ts`
  (escritorio): cargar contenedor y ETA a una unidad, verla en su contenedor en `/logistica/embarques`, y «Editar grupo» cambia el ETA de
  las 3; `e2e/configuracion-logistica.spec.ts` (`// @sin-celular-archivo:`): crear una naviera y verla en el selector; vitest de
  `entities/transporte/grupos.ts` («Varios», qué cambios se mandan). Lugar:
  `src/modules/logistica/{features,entities,infra,areas}/transporte/`, `pantallas/transporte-*.ts`, `src/app/(app)/logistica/embarques/`,
  `scripts/guardas/areas-b/`, `e2e/`. Nivel **1**. Tipo: pantalla. Partes estimadas: 4.
  Dudas, con la recomendada: (1) ¿Sacar una unidad de un contenedor es «editar el grupo»? No: se hace en el hueco de esa unidad; el grupo sólo aplica a todas. (2) ¿Los catálogos de puertos y navieras son de esta fase o de la 5 («oferta de transporte»)? Recomiendo aquí: la semilla no trae navieras y sin ellas el hueco no sirve; si la Fase 5 ya los hizo, esta parte se salta.

- **6.09** (hecho el 2026-11-12; `docs/pasos/6.09-1/`, `6.09-2/`) — Aduana: `/logistica/aduana` con las declaraciones, su composición, el canal de aforo y «pagada», y el hueco de la unidad.
  Entra: lista por cursor (`declaraciones_listar`) con el patrón de lista: número, canal en `<Badge>` con texto, aceptada, «Vence el …»
  de los tributos (vencida o por vencer, con texto), despachante, unidades (acotado) y «Pagada» o «Faltan los tributos de N»; filtros en
  URL (canal, pagada, `q` por número); resumen `?declaracion=<id>` con sus vehículos y, por cada uno, si tiene el tributo. Alta y edición
  en `<Drawer>` (`?panel=nueva-declaracion`, `?panel=editar-declaracion`): número, aceptada, vence, despachante, depósito, notas; número
  repetido junto al campo. «Vehículos de la declaración»: buscar por título, VIN o lote (mínimo 3) entre los que veo; agregar y quitar con
  versión; uno ya declarado dice en cuál; con canal asignado, apagado con «La composición quedó fija al asignar el canal.». «Asignar
  canal» con `<Confirmar>` con URL que avisa que fija la composición. El hueco «Aduana» de la unidad (`pantallas/aduana-unidad.ts`): su
  declaración vigente con enlace, canal, vencimiento y «Tributos pagados: sí o no» con el atajo al hueco de gastos; visible con la regla
  `aduana`. Llena `pantallas/aduana-enlace.ts`. Permisos: `logistica.ver` para leer, `logistica.aduana.gestionar` para escribir (sin
  origen). Estados: los cinco. NO entra: registrar el gasto (6.11), el archivo de la DUI (es un documento, 6.06). **Assert:**
  `e2e/logistica-aduana.spec.ts` (escritorio): crear una declaración con 2 vehículos, asignarle canal (la composición queda apagada) y,
  con el gasto de tributos de los dos (sembrado por SQL), la fila dice «Pagada»; vitest de `entities/aduana/` (el texto de «faltan», el
  vencimiento). Lugar: `src/modules/logistica/{features,entities,infra,areas}/aduana/`, `pantallas/aduana-*.ts`,
  `src/app/(app)/logistica/aduana/`, `scripts/guardas/areas-c/`, `e2e/`. Nivel **1**. Tipo: pantalla. Partes estimadas: 3.
  Dudas, con la recomendada: (1) ¿Los colores del canal (verde, amarillo, rojo)? Son los nombres del enum: `<Badge>` con el texto y un tono de `design/tokens.css`, nunca sólo color. (2) ¿«DUI» o «declaración» en la interfaz? Recomiendo «Declaración» (GLOSARIO; «DUI» es de un país).

- **6.10** (hecho el 2026-11-11; `docs/pasos/6.10-1/`, `6.10-2/`) — Gastos y pagos en la base: el monto en moneda base lo calcula la base, prorratear, y confirmar un pago como acto sellado.
  Sólo `supabase/` y `scripts/carreras/`. Entra: (1) `gasto_registrar(p_id, p_vehiculo, p_repuesto, p_categoria, p_moneda, p_monto,
p_tipo_cambio uuid, p_fecha, p_proveedor, p_comprobante_ruta, p_notas)`: idempotente por id; la base lee el valor vigente del tipo de
  cambio elegido y escribe `tipo_cambio_aplicado` y `monto_base = round(monto × valor, 2)` (en la moneda base, sin tipo de cambio y
  `monto_base = monto`); exige `logistica.gastos.editar` de la unidad y la regla `gastos`. `gasto_guardar(p_id,
p_actualizado_en_esperado, p_cambios)` y `gasto_eliminar(…)` (borrado suave; no el tributo que la fase actual exige). (2)
  `gastos_prorratear(p_lote uuid, p_vehiculos uuid[], …)`: N filas en una transacción, en partes iguales, cuya suma es exactamente el
  total (los centavos que sobran, a las primeras); idempotente por `p_lote` (columna nueva `gastos.lote_id` con su índice). (3)
  `pago_registrar`, `pago_guardar` y `pago_eliminar` (sólo sin confirmar), con el mismo cálculo; y **`pago_confirmar(p_id,
p_actualizado_en_esperado)`**: exige `logistica.pagos.confirmar`, bloquea la fila, pone `confirmado`, `confirmado_por` y
  `confirmado_en` (el sello es de la base) y deja `pago.confirmado` en `actividad`; uno confirmado no se edita ni se elimina. Sale de la
  lista de excepciones de `supabase/tests/permisos-enforcement.sql:18` y de la deuda de ESTADO. `authenticated` pierde la escritura
  directa de `gastos` y `pagos`. (4) Storage: las policies de `comprobantes` (B:32209–32211) pasan a mirar la carpeta de la unidad
  (`<unidad>/<sha-256>.<ext>`) con `puede_unidad`, no la clave en cualquier origen. (5) Lecturas por cursor `(fecha desc, id desc)` con
  `_acotar_pagina` y sus índices nuevos (`… where eliminado_en is null`): `gastos_listar(p_desde, p_id, p_tope, p_filtros)` y
  `pagos_listar(…)` (filtros: origen, categoría, fechas, sin confirmar), con el alcance resuelto una vez; a
  `scripts/guardas/areas-c/paginas-en-la-base.ts`. (6) `margen_vehiculo` (B:14229) no cambia de contrato: suma el real por categoría
  (`por_categoria`) para «cotizado contra real». NO entra: pantallas, categorías (catálogo), repuestos (`repuestos.costos.*` siguen en
  las policies de lectura). **Assert:** `supabase/tests/areas/dinero/*.sql`: un gasto de 100 en otra moneda con el tipo de cambio en
  6,96 guarda 696,00 aunque el llamador mande otra cosa; prorratear 100,00 entre 3 da 33,34 + 33,33 + 33,33; sin
  `logistica.pagos.confirmar` no se confirma (`42501`) y con ella queda quién y cuándo; un confirmado no se edita; `margen_vehiculo` sin
  pagos confirmados devuelve `margen` nulo (no 0) y sin cotización final, `desviacion` nula; sin `logistica.margen.ver` del origen,
  `42501`; quien tiene `logistica.gastos.ver` en otro origen no lee el gasto ni su comprobante. `scripts/carreras/pagos-confirmar.mjs`:
  dos confirman a la vez → un solo sello. Lugar: `supabase/migrations/`, `supabase/tests/areas/dinero/`, `scripts/carreras/`,
  `scripts/guardas/areas-c/`. Nivel **2** (policies, columna e índices). Tipo: datos y dinero. Partes estimadas: 4.
  Dudas, con la recomendada: (1) Con varios tipos de cambio con nombre (Aduana, Paralelo…), ¿cuál convierte un gasto? Recomiendo que lo elija quien carga, entre los activos de esa moneda a la base, y que la base guarde el valor de ese momento: es lo que hace la cotización. (2) ¿Se puede deshacer una confirmación? Recomiendo no; un error se corrige con `pago_anular` (misma clave, motivo obligatorio, borrado suave con constancia en `actividad`), que entra en este paso si cabe en sus partes y si no queda como abierto **6-3**. (3) ¿«Venta» son los pagos confirmados (hoy) o el total de la cotización final? Recomiendo dejarlo: sin cobro confirmado no hay venta que mostrar.

- **6.11** (hecho el 2026-11-11; `docs/pasos/6.11-1/`, `6.11-2/`, `6.11-3/`, `6.11-4/`) — Gastos, pagos y margen: los huecos de la unidad, `/logistica/gastos`, prorratear a un grupo y las categorías de gasto.
  Entra: (1) hueco «Gastos» (`logistica.gastos.ver` del origen; sin la clave no se dibuja: los costos no se anuncian): lista de la unidad
  con categoría (de la base), proveedor, fecha, monto en su moneda y en la base con `<Monto>` (Modo Live), comprobante; alta y edición
  en `<Drawer>` con categoría, moneda, monto, tipo de cambio (los activos de esa moneda; el equivalente se muestra cuando lo devuelve la
  base, nunca calculado en el navegador), fecha, comprobante con subida diferida al bucket `comprobantes` y notas; eliminar con
  «Deshacer» no: `<Confirmar>` que nombra el gasto. (2) hueco «Pagos» (`logistica.pagos.ver`): concepto, método, fecha, monto, lead (el
  vinculado al vehículo, por defecto), comprobante; «Confirmar pago» (`logistica.pagos.confirmar`) con `<Confirmar>` con URL que nombra
  concepto y monto y dice «Queda sellado: no se podrá editar.»; el confirmado muestra «Confirmado por <nombre> el <fecha>» y va en sólo
  lectura. (3) hueco «Margen» (`logistica.margen.ver`): cotizado (la final), real, desviación, venta y margen, con el real por
  categoría; `null` se escribe «Sin cotización final» o «Sin venta registrada», **nunca 0**. (4) `/logistica/gastos`
  (`?ver=gastos|pagos`): listas por cursor con el patrón de lista, filtros en URL (origen, categoría, desde y hasta, «sin confirmar»);
  la fila abre el panel de su unidad; no se muestra ninguna suma de la lista. (5) Llena `pantallas/dinero-grupo.ts` («Prorratear un gasto
  entre las N unidades», con la vista de cuánto le toca a cada una antes de confirmar), `pantallas/dinero-enlace.ts` y
  `pantallas/dinero-catalogos.ts` («Categorías de gasto» en `/configuracion/logistica`: nombre, propósito de la lista fija de la base,
  activa, orden; una en uso no se borra, B:25220). Estados: los cinco. NO entra: comprobantes de venta (son de cotizaciones), el tablero
  de margen del mes (Fase 9). GLOSARIO: «Prorratear», «Sello (de un pago)». **Assert:** `e2e/logistica-gastos-y-pagos.spec.ts`
  (escritorio): registrar un gasto en otra moneda y ver su equivalente, registrar un pago, confirmarlo con otra cuenta (queda en sólo
  lectura con su nombre) y el margen pasa de «Sin venta registrada» a un monto; vitest de `entities/dinero/` (el texto de cada nulo del
  margen; el reparto que se muestra antes de prorratear coincide con el de la base en los casos de 6.10). Lugar:
  `src/modules/logistica/{features,entities,infra,areas}/dinero/`, `pantallas/dinero-*.ts`, `src/app/(app)/logistica/gastos/`,
  `scripts/guardas/areas-c/`, `e2e/`. Nivel **1**. Tipo: pantalla. Partes estimadas: 4.
  Dudas, con la recomendada: (1) ¿La lista de gastos muestra un total? No («un número que se muestra nunca es un total exacto»); el total de una unidad sí (lo da `margen_vehiculo`). (2) ¿Prorratear en partes iguales o por valor del vehículo? Recomiendo partes iguales ahora (es lo que hace la base en 6.10); otro criterio es un abierto. (3) ¿Quién no tiene `logistica.gastos.ver` ve el hueco apagado o no lo ve? Recomiendo no verlo (DECISIONES, 2026-10-13: el inventario no muestra costos).

- **6.12** (hecho el 2026-11-12; `docs/pasos/6.12-1/`, `6.12-2/`) — Alertas por demora y por vencimiento (cron) y la bandeja de logística en Inicio. Entra, base: (1) el job `alertas-demora`
  (cada hora, en la migración, con `cron.schedule`) llama a `alertas_demora()` reescrita: por lotes con tope por corrida, usa
  `notificar()` (B:14653), repite el aviso de una unidad que sigue demorada cada `fases.alerta_cada_horas` (nulo = 72 h) reabriendo la
  misma notificación (el antispam B:23679 sigue: una abierta por persona, tipo y unidad), respeta `demora_dias = 0` y la regla
  `alerta_demora`; destinatarios, quien tiene `flujos.mover` del origen y está activo. Un trigger en `historial_fases` cierra
  (`accionada_en`) las alertas abiertas de la unidad al moverla. (2) el job `documentos-vencimientos` (diario): por cada documento
  aprobado que vence dentro de `tipos_documento.aviso_dias` (índice B:23323), un aviso `documento_por_vencer` a quien tiene
  `logistica.documentos.subir` del origen; el texto cambia con `modo_vencimiento` (`renovar` o `solicitar`). (3)
  `logistica_bandeja(p_tope)`: tres listas cortas de lo que veo, cada una con `limit p_tope + 1` y sin contar: **demoradas** (por el
  índice de la cadena), **por aprobar** (documentos `subido` de orígenes donde tengo `logistica.documentos.aprobar`, por el índice de
  6.05) y **trabados** (ver duda 1). Interfaz: los bloques «Vehículos trabados», «Documentos por aprobar» y «Alertas por demora» de
  `tablero/entities/bandeja.ts` se llenan desde `bandejaLogistica()` (`logistica/areas/alertas/index.ts`): hasta 5 filas cada uno (título,
  fase, «hace N días» o el motivo), cada fila al panel de su unidad y «Ver todas» a la cadena ya filtrada (`/logistica?demoradas=si`,
  `/logistica?por_aprobar=si`); cada bloque lee al montarse con `esqueleto-bandeja`, su vacío (el texto ya está en `bandeja.ts`) y error
  con «Reintentar». NO entra: la campana, el push, las preferencias por persona y el realtime (Fase 7: los avisos quedan en
  `notificaciones` y se verán cuando exista la campana); la interfaz de `demora_dias_default` (sigue en la deuda de ESTADO).
  GLOSARIO: «Trabado». **Assert:** `supabase/tests/areas/alertas/*.sql`: una unidad demorada genera una notificación por destinatario y
  una segunda corrida no la duplica; pasado `alerta_cada_horas` se reabre la misma; `demora_dias = 0` o la regla apagada no avisan; mover
  la cierra; un documento que vence en 5 días con `aviso_dias = 7` avisa una vez; quien no ve el origen no recibe nada en
  `logistica_bandeja`. Los dos jobs, en `supabase/tests/jobs.sql`. `e2e/inicio-bandeja-logistica.spec.ts` (escritorio): con una unidad
  demorada y un documento subido, Inicio los muestra y «Ver todas» abre la cadena filtrada. Lugar: `supabase/migrations/`,
  `supabase/tests/areas/alertas/`, `src/modules/logistica/{features,entities,infra,areas}/alertas/`,
  `src/modules/tablero/features/bandeja/`, `src/modules/tablero/CLAUDE.md`, `src/app/(app)/page.tsx`, `e2e/`. Nivel **1** (+ `jobs.sql`;
  pasa a **2** si necesita un índice). Tipo: datos y dinero. Partes estimadas: 3.
  Dudas, con la recomendada: (1) ¿Qué es un vehículo «trabado»? Evaluar los requisitos de todas las unidades es caro (`fuera_de_regla` recorre el flujo entero). Recomiendo: una unidad **demorada** a la que le falta un requisito bloqueante para su siguiente fase (la de menor `orden` entre sus transiciones), evaluando sólo las primeras 50 demoradas; el bloque dice qué le falta. (2) ¿A quién se avisa la demora, a quien puede mover (hoy) o a quien ve logística? Recomiendo quien puede mover: es quien lo resuelve. (3) ¿Cada cuánto corre? Recomiendo cada hora; con `alerta_cada_horas` nulo, un recordatorio cada 72 h (lo que dice la ficha de `notificaciones`).

- **6.13** (hecho el 2026-11-11; `docs/pasos/6.13/`) — El campo «principal» de un origen (**6-1**): qué identifica a un vehículo en la lista, el resumen y logística. Entra:
  migración con la columna `origenes_campos.principal boolean not null default false` y el índice único parcial `(origen_id) where
principal`; `origen_campo_crear` (B:15008) y `origen_campo_guardar` (B:15081) aceptan `principal` (marcar uno desmarca el anterior en
  la misma llamada y lo devuelve; un campo inactivo no puede serlo; desactivar el principal lo desmarca); la lectura del layout
  (`origenes/infra/campos.ts`) lo trae. En `origenes/features/campos`, el interruptor «Principal» con su ayuda («Identifica al vehículo
  en la lista, el resumen y logística. Uno por origen.») y el aviso de cuál deja de serlo. En `vehiculos`: `identidadDeVehiculo(vehiculo,
layout)` en `entities/` (el valor del campo principal mostrado con `shared/lib/campos/mostrar`; sin principal o vacío, el título), usada
  por la fila y la tarjeta del listado, el resumen y exportada por `client.ts`; `en_tarjeta` vuelve a decir sólo qué se ve en la
  tarjeta. La cadena y el panel de logística ya piden el título a `vehiculos` (6.01 y 6.03): pasan a pedir la identidad sin cambiar de
  forma (por eso este paso va primero en su carril: si 6.03 ya entró, cambia además la tarjeta de `features/cadena`). Cierra **6-1**. NO entra: la web pública (`interno.vitrina_vehiculos`), el PDF de la
  cotización. GLOSARIO: «Campo principal». **Assert:** `supabase/tests/areas/origenes/principal.sql`: dos principales en un origen no
  caben; marcar otro desmarca el primero; sin `origenes.gestionar`, `42501`; versión vieja, `PT409`. Vitest de `identidadDeVehiculo`
  (con principal, sin él, vacío). `e2e/origenes-campo-principal.spec.ts` (`// @sin-celular-archivo:`): marcar «Lote» como principal y
  ver el lote en la fila de `/vehiculos`. Lugar: `supabase/migrations/`, `src/modules/origenes/{entities,infra,features/campos}/`,
  `src/modules/vehiculos/{entities,features/listado,features/resumen}/`, `src/shared/ui/campos/` si el formulario del campo vive ahí,
  `e2e/`. Nivel **2** (columna e índice; `src/shared` si toca el formulario). Tipo: datos y dinero. Partes estimadas: 3.
  Dudas, con la recomendada: (1) ¿Marcar otro principal desmarca el anterior o se rechaza? Recomiendo desmarcar y decirlo: el índice único sigue siendo el candado y la persona no tiene que ir a buscar el otro. (2) ¿La identidad reemplaza al título o lo acompaña? Recomiendo que lo acompañe en logística («<principal> · <título>») y lo reemplace sólo donde hoy `en_tarjeta` hacía de identidad. (3) Lo toma un carril que no es base: necesita `origenes/` y `vehiculos/` en su `dueno_de` para este paso, o lo hace el **a** entre 6.02 y 6.03.

- **6.14** (hecho el 2026-11-12; `docs/pasos/6.14-1/`, `6.14-2/`) — El cierre de la Fase 6: el recorrido de la IA por la tarea de oro 3, la tabla de criterios, ESTADO y BITACORA. Entra:
  `e2e/logistica-tarea-de-oro.spec.ts` con dos cuentas (logística y dueña), en `escritorio` y `movil`: mover 1 unidad desde la cadena
  en ≤ 15 s (reloj y KLM, como el recorrido del 4.28); «marcar que llegó» un contenedor de 8 desde `/logistica/embarques` en ≤ 60 s con
  la vista previa por unidad; no se mueve sin el documento bloqueante; el conflicto se lee con el nombre de quien movió; el margen dice
  «Sin venta registrada» y nunca 0. El recorrido de la IA con `E2E_CAPTURAS` sobre la cadena, el panel, embarques, aduana, gastos e
  Inicio, con las hojas de contacto abiertas y lo visto en el informe; los defectos de pulido, a `docs/PLAN.md` › «Pulido para la
  Fase 9» en una línea cada uno. La tabla de criterios del «Terminado cuando» (cada fila con la prueba que la sostiene); `docs/ESTADO.md`
  (fase cerrada; salen de «Pendientes» y de «Deuda» lo cerrado: la versión de la ficha al mover, la papelera y `documentos`,
  `logistica.pagos.confirmar`); `docs/BITACORA.md` con `e2e completo: sí`; las fichas de `logistica`, `flujos` y `tablero` al día;
  `docs/UX.md` › Flujo 3 con lo que quedó; los abiertos 6-x que sobrevivan, con su paso o «los decide la persona»; `mapa.sh --check`.
  NO entra: código de producto nuevo; lo que falle al 100 % se arregla aquí y lo que no, se anota. **Assert:** `pnpm test:e2e:completo`
  con los dos proyectos en verde y el CI del PR en verde; la tabla de criterios sin filas vacías. Lugar: `e2e/`, `docs/`,
  `src/modules/{logistica,flujos,tablero}/CLAUDE.md`. Nivel **3** (cierre). Tipo: pantalla. Partes estimadas: 2.
  Hecho en dos: el **6.14-1** (la tarea de oro 3, KLM 11,3 y 14,6 s, y el recorrido de la IA con cinco líneas de pulido) y el **6.14-2** (el Nivel 3 y
  los docs de cierre).

Total de la fase: 14 pasos y 40 partes, todos hechos (la fase cerró con el 6.14, el 2026-11-12).

### Riesgos y huecos

- **`docs/archivo/` no se pudo leer** (permiso denegado): si la historia de `cambiar_fase` o de los embarques dice algo más, no lo vi.
- **No sé cómo parte la Fase 5** ni si su paso base reorganiza `flujos`: lo cubren C y la duda 2 de 6.01; el coordinador no debería
  integrar a la vez 6.01 y el paso de la Fase 5 que toque `flujos/index.ts`. (La Fase 5 cerró el 2026-11-12: `flujos` quedó por áreas y mover
  es del 6.04.)
- **«Trabado» no está definido** en UX ni en el GLOSARIO: 6.12 propone una definición barata. Es la decisión de producto que más pesa.
  (Resuelto en el 6.12: «Trabado» en el GLOSARIO.)
- **`tiene_permiso` sin origen** (A.10): no propongo volver por origen `logistica.aduana.gestionar` ni `logistica.pagos.confirmar`
  (cambia el catálogo y la matriz de Roles); 6.07 y 6.10 acotan lo que se **lee**. Si la persona las quiere por origen, es otro paso.
- **La carrera de `cambiar_fase`** (A.1) sale de leer el SQL, no de reproducirla (no podía correr nada): 6.02 escribe primero
  `scripts/carreras/mover.mjs`; si no cae, el candado se deja donde está y se dice.
- **`fuera_de_regla(p_flujo)` no escala** (evalúa cada unidad del flujo): la Fase 6 no la usa para listas; quien la muestre (Fase 5)
  necesita tope. Sin paso aquí. (Resuelto en el 5.07: `fuera_de_regla()` se borró; `flujo_fuera_de_regla(p_flujo, p_tope)` pide permiso y
  tiene tope.)
- **6.04 es el paso más grande** (5 partes): si no cabe, el corte natural es (a)–(d) y el lote (e) aparte.
- **Nada depende de afuera del repo**: ni claves, ni VAPID, ni correo, ni dominio. Los jobs usan `pg_cron` de la base. La cámara es el
  `capture` de `<ZonaDeArchivos>`: en e2e sólo se prueba que el botón está; probar en un iPhone ya es deuda de ESTADO.
- **Repuestos como unidad**: las RPC nuevas reciben `p_repuesto` donde la tabla lo admite, pero ninguna pantalla de la Fase 6 lo
  ejercita (el módulo es de la Fase 8): esas ramas quedan probadas sólo con filas sembradas por SQL.
- **`demora_dias_default`** sigue sin interfaz y `fases.demora_dias` se edita en la Fase 5: hasta entonces las alertas usan lo sembrado.
- **JS de `/logistica`**: el panel carga nueve huecos, cada uno con `diferido()` y lectura al abrirse; un presupuesto pasado por ≤ 5 %
  se sube en `docs/RENDIMIENTO.md` (regla vigente).
- **Abiertos que pueden nacer**: **6-2** (publicar sin mover la versión de la ficha, si 6.02 no lo alcanza; `vehiculos/features/vitrina`)
  y **6-3** (`pago_anular`, si 6.10 no lo alcanza; área `dinero`). (6-2 nació en el 6.02-1 y lo decide la persona; 6-3 se cerró en el 6.10-2.)

## Fase 7 — Agenda, chat, notificaciones y buscador

Módulos `agenda` (calendario mes/semana/día con eventos, tareas, recordatorios y subastas; visibilidad; reasignar tarea; vínculos a
lead/vehículo/cotización), `chat` (directos deduplicados, grupos, canal global por permiso, menciones `#` con drawer de la entidad,
`/tarea` y `/evento` desde el mensaje, realtime, widget flotante, editar/borrar), `notificaciones` (campana con «requiere acción»,
realtime, push web con VAPID y `supabase/functions/push`, preferencias por usuario), `buscador` (Ctrl/Cmd+K: RPC por sección con mínimo 3
caracteres y ámbito en servidor, acciones, últimos abiertos; incluye «Nueva cotización»).

**Terminado cuando:** una tarea dada desde el chat le llega como notificación y push al responsable; una mención a un lead que no puedo ver
muestra placeholder; el buscador nunca devuelve algo que la RLS esconde ni busca por teléfono.

- **7-1** (correo de la app, preparado el 2026-10-28): `enviarEmail()` de `src/shared/lib/email/` ya existe con el adaptador `mailpit`. Falta
  lo de producción: los adaptadores `resend` y `cloudflare` por su API REST (mismo contrato, con su prueba de contrato con `fetch` simulado),
  su variable de clave en `src/shared/config/esquemas.ts`, `pnpm email:probar <destino>` (un correo real con el proveedor configurado), y el
  mismo contrato en `supabase/functions/` si una función edge manda correo. Assert: cambiar `EMAIL_PROVEEDOR` de `resend` a `cloudflare`
  no cambia código (docs/ENTORNOS.md › «Cambiar de Resend a Cloudflare»). **Cerrado en el 7.05** (2026-11-11).
- **7-2** (Fase 7; salió del 5.13-1): la suscripción de la campana va con `diferido()` y el aviso `aqui`
  (`notificaciones/features/campana/components/campana.tsx:34-40`); pedida sin red, deja «Sin conexión» con «Reintentar» en el encabezado y
  el contador no se suscribe hasta reintentar o recargar. Assert: con la red de vuelta, la campana se suscribe sola (o el aviso del
  encabezado no aparece). Lo toma el próximo paso de `notificaciones` o el 7.14. **Cerrado en el 7.14-1** (2026-11-12): la campana se vuelve a
  suscribir con cada `online` (`campana.test.tsx`).

#### Los decide la persona

- **7-3** (salió del 7.08-1 y el 7.08-3): el `aplicado_en` de `chat.participar` y `chat.moderar` en el catálogo dice «policy …» y no nombra las RPC
  que lo exigen (`supabase/seed.sql:94, :96`; `docs/pasos/7.08-3/bitacora.md:30-32`). Es dato de catálogo: va en una migración. Paso de datos.
- **7-4** (salió del 7.08-2, D14): con `p_conversacion` del canal global, `tarea_crear` y `agenda_quienes_reciben` miran la fila suelta de
  `conversaciones_miembros` y un responsable sin `chat.global` pasa; `mensaje_tarea_crear` sí lo vuelve a mirar con `_chat_miembro_vigente`
  (`docs/pasos/7.08-2/bitacora.md:36-37`). Hoy no se llega desde la interfaz sin pasar por el chat. Paso de datos (`security definer`).
- **7-5** (salió del 7.14-1, D6): la suscripción de la burbuja del chat (`SuscripcionDeNoLeidosDiferida`,
  `src/modules/chat/features/widget/components/diferidos.tsx:6`) no se reintenta al volver la red, como sí la campana desde el 7.14-1; el
  arreglo es el mismo hook y una `key`. Y la suscripción de la campana, pedida sin red, pone su barra fija «Sin conexión. No se pudo abrir
  esto.» aunque nadie abrió nada (se va sola al volver la red; el completo del 7.14-2 la vio sobre la del modal en `leads-escala`): una suscripción de fondo
  no debería avisar. Lugar: `chat/features/widget` y `notificaciones/features/campana`. Pantalla, Nivel 1. La primera mitad la cerró el 8.12-ci (`docs/pasos/8.12-ci/bitacora.md:9`).

Cerrados en la fase: **7-1** (7.05), **7-2** (7.14-1), notificar al compartir, transferir y limpiar (7.01-2), `recordatorios_notificar()` con su
cron (7.01-1), «Escribirle por chat» (7.11), el buscador de leads sin privados (7.12) y el atajo `?` (7.13).

### Lo que ya existe y lo que falta (leído el 2026-11-09)

| Superficie                  | Ya está en la base                                                                                                                                                                                                                                                                                                                                                                              | Código que existe                                                                                                                                                                                                                              | Falta                                                                                                                                                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Notificaciones (tabla)      | `notificaciones` base:21193 (id bigint, `requiere_accion`, `leida_en`, `accionada_en`); policies leer/editar/borrar propias base:26696-26704; grants `select, delete` y `update(leida_en)`, `update(accionada_en)` base:31724-31732; antispam único `(usuario_id, tipo, referencia_id) where accionada_en is null` base:23679; `(usuario_id, creado_en desc) where leida_en is null` base:23683 | Cáscara: `src/modules/notificaciones/{CLAUDE.md,index.ts}`                                                                                                                                                                                     | Índice de la lista completa y de «por accionar»; realtime (la publicación `supabase_realtime` no tiene tablas, base:27369); purga programada                                                            |
| `notificar()`               | base:14653: un `insert … on conflict do nothing`, sólo `service_role` (base:30346)                                                                                                                                                                                                                                                                                                              | —                                                                                                                                                                                                                                              | No mira preferencias ni a quién le escribe; tres funciones insertan sin pasar por ella: `alertas_demora` base:8085, `web_expirar_solicitudes` base:19628/19649, `web.solicitar_asesor` base:19849/19893 |
| Quién avisa hoy             | `tarea_notificar` (trigger base:17398, 24775), `recordatorios_notificar` base:16703 (sin cron; `ruta` con el lead aunque ya no lo vea), `web_confirmar_contacto` marca `accionada_en` base:19609                                                                                                                                                                                                | —                                                                                                                                                                                                                                              | Avisar al compartir (`lead_compartir` base:11933), transferir (`lead_transferir` base:12797) y limpiar (`limpieza_automatica_correr` base:14096); cron de recordatorios; menciones y eventos            |
| Campana y `/notificaciones` | —                                                                                                                                                                                                                                                                                                                                                                                               | `_shell/marco.tsx` sin hueco de campana; las `ruta` que ya escribe la base: `/notificaciones`, `/agenda?tarea=`, `/leads/<id>`, `/logistica/vehiculo/<id>`                                                                                     | Todo: módulo, `shell.ts`, ruta, realtime `*.client.ts` (no hay ningún `.channel(` en `src/`)                                                                                                            |
| Push                        | `suscripciones_push` base:21705 (endpoint único base:22907; policies propias base:27052-27064; escritura directa); integración `push_web` apagada (`supabase/seed.sql:25`); permiso `notificaciones.push` sin enforcement (`supabase/tests/permisos-enforcement.sql:19`)                                                                                                                        | `public/sw.js` mínimo (sin `push`), `registrar-service-worker.tsx` (sólo producción), `web-push ^3.6.7` en `package.json`, VAPID opcional en `src/shared/config/esquemas.ts:18-29`, `.env.example:7-10`                                        | `supabase/functions/push` (sólo su fila en `supabase/functions/README.md`), disparo desde la base, RPC de suscribir, preferencias, interfaz de `push_web`, `[functions.push]` en `config.toml`          |
| Preferencias                | `preferencias_usuario` base:21348 (clave + jsonb, propias base:26788-26800)                                                                                                                                                                                                                                                                                                                     | `src/modules/equipo/infra/perfil.ts:36`, `<PreferenciasPerfil>` en `/perfil`                                                                                                                                                                   | Clave de notificaciones y su sección                                                                                                                                                                    |
| Correo (7-1)                | —                                                                                                                                                                                                                                                                                                                                                                                               | `src/shared/lib/email/{index,tipos}.ts`, `adaptadores/mailpit.ts`; `esquemas.ts:56-60` rechaza `resend`/`cloudflare`                                                                                                                           | Los dos adaptadores REST, sus claves, `pnpm email:probar`                                                                                                                                               |
| Eventos                     | `eventos` base:20685 (visibilidad privado/publico/seleccionados, `lead_id`, `vehiculo_id`), `eventos_destinatarios` base:20707, `puede_evento()` base:16240, policies base:26312-26339, `eventos_inicio_idx` base:23363, grants de tabla base:31578                                                                                                                                             | Cáscara de `agenda`                                                                                                                                                                                                                            | RPC de crear/editar con versión; `cotizacion_id` (no existe); aviso a destinatarios                                                                                                                     |
| Tareas                      | `tareas` base:21753, policies base:27119-27127, grants por columna base:31994-32030, `reasignar_tarea` base:16487, `tarea_validar` base:17414 (sólo `before insert`), `tareas_responsable_idx` base:24039                                                                                                                                                                                       | Bloque «Mis tareas» vacío en `tablero/entities/bandeja.ts`                                                                                                                                                                                     | RPC con versión; lectura por rango; que la vean los miembros de la conversación donde nació                                                                                                             |
| Recordatorios y subastas    | `recordatorios` base:6710 + `recordatorio_*` base:16503-16674, `recordatorios_usuario_idx` base:23823; `vehiculos.cierre_subasta_en` con su índice (`20261029185919_…`)                                                                                                                                                                                                                         | Ficha del lead (leads)                                                                                                                                                                                                                         | La lectura unificada por rango                                                                                                                                                                          |
| Chat                        | `conversaciones` base:20358, `conversaciones_miembros` base:20373, `mensajes` base:21102, `mensajes_menciones` base:21128, `es_miembro()` base:10277, policies base:26118-26149 y 26621-26642, `mensaje_editar_validar` base:14248, `mensajes_conversacion_fecha_idx` base:23631, `trg_lead_visible` base:24635                                                                                 | Cáscara de `chat`; `navegacion.ts` ya nombra `/chat` y `/agenda` (`disponible: false`)                                                                                                                                                         | Ninguna RPC; dedupe de directas; fila del canal global; no leídos; realtime                                                                                                                             |
| Buscador                    | `leads_candidatos` base:13092, `leads_ids_del_numero` base:13272, `leads_vista_por_ids` base:14084, trigramas de vehículos base:24187-24219 y `cotizaciones_titulo_trgm` base:23275; `visitados` base:22045 (propias base:27256-27268)                                                                                                                                                          | `buscador-pendiente.tsx`, atajos `buscar` y `ayuda` en `src/shared/lib/atajos.ts`, `shared/ui/command.tsx` (cmdk), `leerClientesDelPanel` (`leads/infra/panel-para-cotizar.client.ts:142`), `leerListaDelPanel` (vehiculos), `buscarVehiculos` | Búsqueda de cotizaciones por texto (`cotizaciones_listado` no la tiene); nadie escribe `visitados`; la paleta; la lista de `?`                                                                          |
| Pruebas SQL de la fase      | Sólo `rls-en-todo.sql`, `permisos-enforcement.sql` y el caso de turnos de `humo.sql:282`                                                                                                                                                                                                                                                                                                        | —                                                                                                                                                                                                                                              | Ninguna prueba de RLS de chat, agenda, notificaciones ni push                                                                                                                                           |

**Lo que el párrafo de PLAN y las fichas dicen y la base no hace:**

1. «Sólo `notificar()` inserta, decide por permiso y respeta preferencias»: es un insert pelado y tres funciones insertan directo.
2. «Una alerta de demora cada 72 h»: sólo existe el único mientras no esté accionada (es de la Fase 6).
3. Push por «Database Webhook con `x-push-secret`» (README, ficha): el patrón vigente es el pase de un uso (`storage_gc_disparar`, `docs/DECISIONES.md:275`) y la URL de Vault (`20261028183622_…`).
4. Agenda: la ficha nombra `vehiculos.subasta_en` (es `cierre_subasta_en`); `tarea_validar` no impide vencer en el pasado ni mira bloqueados; `eventos: editar` (base:26316) no vuelve a exigir `agenda.eventos.publicar` (un privado se vuelve público con un `update`).
5. Chat: no hay índice de «una directa por par» ni ventana de edición; el autor puede escribir `editado_en` y `eliminado_en` (des-borrar); nadie puede crear el canal global (la policy exige `not es_global` y no hay fila sembrada); quien pierde `chat.global` sigue leyendo si quedó de miembro.
6. `actividad_purgar()` (base:8031) purga notificaciones y `visitados` pero no tiene job.
7. PLAN › Fase 8 lista como arrastrados «Escribirle por chat», la notificación de la limpieza, el buscador de leads sin privados, el atajo `?` y `recordatorios_notificar()`: acá quedan en la 7 (7.01, 7.11, 7.12, 7.13).

### Tabla de criterios

Cada criterio del «Terminado cuando» y del párrafo de la fase con la prueba que lo mide y su resultado en el Nivel 3 del 7.14-2 («base» = `db:probar` o
`db:carreras`, que corren en el CI de cada PR; «unidad» = Vitest; «stack local» = `push-de-verdad.sh` con las funciones servidas; rutas `areas/…` de
`supabase/tests/`).

| Criterio                                                                                  | Prueba                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Proyectos                              | Resultado                                      |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------- |
| Una tarea dada con `/tarea` en el chat le llega al responsable en la campana sin recargar | `fase-7-recorrido.spec.ts` › «E2E R1 la tarea dada con /tarea en el chat le llega a Luis en la campana sin recargar»; `chat-menciones.spec.ts` › «E2E: /tarea a la otra persona abre el formulario, deja su ficha, avisa a Luis y él la completa»; `notificaciones-campana.spec.ts` › «una notificación nueva aparece en la campana sin recargar»; `areas/chat/fichas.sql`, `areas/agenda/tareas-conversacion.sql`, `areas/notificaciones/puerta.sql`                                                                                                                                                                           | escritorio, movil y base               | verde                                          |
| … y como push                                                                             | `supabase/tests/push-de-verdad.sh` (de la base a la función servida, con el pase canjeado); `supabase/tests/push-contrato.test.ts` y `push-funcion.test.ts` (firma, cifrado, clasificación, la lista de hosts); `areas/push/{disparo,push}.sql`; `perfil-notificaciones.spec.ts` › «E2E escritorio · encender los avisos de este navegador crea su fila y apagarlos la quita»                                                                                                                                                                                                                                                   | stack local, unidad, escritorio y base | verde; `push-de-verdad.sh` 2 de 2 en el 7.14-1 |
| El push a un teléfono real                                                                | nadie hasta las claves VAPID (`docs/ENTORNOS.md`); la firma y el cifrado, `push-contrato.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | —                                      | sin probar (falta lo de afuera)                |
| La mención a un lead que no veo muestra el placeholder                                    | `fase-7-recorrido.spec.ts` › «E2E R2 Luis lee el placeholder de la mención a un lead que no ve y el nombre no está en el DOM»; `chat-menciones.spec.ts` › «E2E: quien no ve el lead lee el placeholder y el drawer no abre datos» y «E2E: Ana menciona su lead desde el redactor; la dueña lo ve y Luis, sin acceso, lee el placeholder»; `areas/chat/{fichas,membresia}.sql`                                                                                                                                                                                                                                                   | escritorio, movil y base               | verde                                          |
| El buscador no devuelve lo que la RLS esconde                                             | `fase-7-recorrido.spec.ts` › «E2E R3 el buscador no trae lo que la RLS esconde ni busca por teléfono»; `buscador.spec.ts` › «Ctrl+K, el nombre de un lead y Enter abren su ficha, que sale en «Últimos abiertos»; el lead ajeno no aparece» y «abrir una ficha registra la visita, una sola vez, y lo que no se ve no deja marca»; `areas/buscador/{buscador,visitados,forma}.sql`; `cotizaciones-visibilidad.sql`                                                                                                                                                                                                              | escritorio, movil y base               | verde                                          |
| … ni busca por teléfono                                                                   | la misma R3; `areas/buscador/buscador.sql`; `src/modules/buscador/entities/telefono-en-la-busqueda.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | escritorio, movil, unidad y base       | verde                                          |
| Agenda: mes, semana y día; visibilidad, tareas y recordatorios                            | `agenda.spec.ts` › «la asesora ve el evento y su tarea en el día; un tercero no ve el evento», «la dueña ve la tarea de la asesora con «Ver la de todos» y lo elegido queda en la URL», «E2E la dueña crea, ve, edita y elimina un evento y le da una tarea a la asesora», «E2E la asesora ve sus tareas sin fecha y completa un recordatorio»; `areas/agenda/*.sql` (10 archivos)                                                                                                                                                                                                                                              | escritorio, movil y base               | verde                                          |
| Chat: directas sin duplicar, grupos, canal global por permiso, editar y borrar, realtime  | `chat.spec.ts` › «un mensaje nuevo llega a la lista sin recargar, con su no leído, y la fila sube», «iniciar una directa buscando a la persona: aparece en la lista de la otra y la que ya existe no se duplica», «un grupo nuevo se puede silenciar y dejar», «Ana escribe a Marta: Marta lo ve sin recargar con su no leído, que se limpia al abrir, y la respuesta le llega a Ana», «sin red el mensaje queda «No enviado» y al reintentar llega una sola vez», «Ana responde a Luis, edita lo suyo y lo borra; Luis lo ve sin recargar»; `areas/chat/{directas,grupos,global,mensajes,mensajes-editar,lista,membresia}.sql` | escritorio, movil y base               | verde                                          |
| Widget, no leídos y «Escribirle por chat»                                                 | `chat-widget.spec.ts` › «en /leads llega un mensaje: la burbuja dice «1», se abre y se responde sin salir», «en el celular la burbuja es un enlace a /chat», «sin chat.participar no hay burbuja ni entrada «Chat»», ««Escribirle por chat» desde el alta abre la directa con quien tiene el lead», «/chat?con= con alguien que no puede usar el chat lo dice y deja la lista»                                                                                                                                                                                                                                                  | escritorio y movil                     | verde                                          |
| Notificaciones: campana, lista, puerta, purga y el cron de recordatorios                  | `notificaciones-campana.spec.ts` (7 pruebas); `areas/notificaciones/{puerta,avisos-de-cartera,purgar,recordatorios-job}.sql`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | escritorio, movil y base               | verde                                          |
| Preferencias y activar el push                                                            | `perfil-notificaciones.spec.ts` (6 pruebas; `// @sin-celular-archivo`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | escritorio                             | verde                                          |
| Correo de producción (7-1)                                                                | `src/shared/lib/email/adaptadores/{resend,cloudflare}.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | unidad                                 | verde (unidad)                                 |
| Paleta, últimos abiertos y `?`                                                            | `buscador.spec.ts` › «? lista los atajos y no se dispara mientras se escribe», «Nueva cotización lleva a la hoja, Nuevo lead abre el alta y Ver todos va al listado», «sin conexión la paleta lo dice y Reintentar vuelve a buscar»; `src/modules/buscador/entities/*.test.ts`                                                                                                                                                                                                                                                                                                                                                  | escritorio, movil y unidad             | verde                                          |
| La campana se suscribe sola al volver la red (7-2)                                        | `src/modules/notificaciones/features/campana/components/campana.test.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | unidad                                 | verde (unidad, 7.14-1)                         |

### Cierre de la Fase 7

**Fase 7 cerrada el 2026-11-12** con el Nivel 3 del 7.14-2, corrido por proyecto (cada uno desde `db:reset` y `db:carreras`, 17,3 s y 17,9 s):
escritorio, sobre `941663d6`, 1.207 en verde, 17 saltadas y 1 caída en 53,5 min (55,7 de reloj); celular, sobre `d24a019a`, 839 en verde, 29 saltadas, 1
caída y 3 sin correr (el resto de su serial) en 34,6 min (35,8 de reloj). Ninguna caída era de la fase ni del producto, y las dos se repetían 3 de 3 solas:
en `leads-escala` › «sin red, abrir un modal…» la suscripción de la campana, pedida al descansar, ponía su propia barra «Sin conexión» junto a la del
modal (la prueba la busca en `#contenido`, `d24a019a`, como `83c0dada`); en `configuracion-leads-origenes-recorrido` › «B · con 12 orígenes…» la burbuja
del chat tapaba en el celular el «⋯» que la prueba dejaba al borde de abajo (la prueba centra el botón, `30ce6ffb`; la burbuja va sobre el marco a
propósito, D15 del 7.11-3). Las dos son de Nivel 1: verdes 2 de 2 en sus proyectos, sin repetir el completo. 5a-4b: los dos proyectos suman 91,5 min
de reloj (90,3 en el 6.14-2). `db:probar` 1.366 en verde, `db:lint` sin errores (59 avisos y 69 «extra»), las guardas 1.128 en verde y `mapa.sh
--check` en verde. El recorrido (`e2e/fase-7-recorrido.spec.ts`, 7.14-1): R1, la tarea dada con `/tarea` le llega a Luis en la campana sin recargar;
R2, el placeholder de la mención sin el nombre en el DOM; R3, el buscador no trae lo escondido ni busca por teléfono; el push llega de la base a la
función con el pase canjeado (`push-de-verdad.sh`). El JS del marco con la campana, la burbuja y la paleta, todas las rutas bajo su tope
(`docs/RENDIMIENTO.md` › «Cierre de la Fase 7»). Lo que deja: **7-3**, **7-4** y **7-5** (los decide la persona), **9-13** (Fase 9) y el push a un
teléfono real hasta las claves VAPID. La «Partición» sigue aquí hasta que una sesión con permiso la pase a `docs/archivo/PLAN.md`.

### Partición

Un paso, su verificación y su PR; quién lo hace y de qué depende lo dice `docs/plan.yaml` (la tabla de «Carriles de las fases 5 a 9»). Cada fila dice qué entra, su assert y el lugar. Sus «Dudas» ya traen la opción recomendada: sin compuertas, **esa es la decisión**, y quien haga el paso la anota en `docs/DECISIONES.md` (el carril base) o en `docs/pasos/<paso>/decisiones.md`.

- **7.01** (hecho el 2026-11-11; `docs/pasos/7.01-1/`, `7.01-2/`) — Notificaciones: la base. Parte 1: una puerta para toda fila de `notificaciones` sin tocar las funciones de otras fases: trigger
  `before insert` que descarta si el destinatario está de baja o bloqueado (`perfiles.activo`, `bloqueado`); `notificar()` conserva su firma
  (base:14653: 7.06 y 7.08 la llaman tal cual). Índices `notificaciones_usuario_fecha_idx (usuario_id, creado_en desc, id desc)` y
  `notificaciones_por_accionar_idx (… ) where requiere_accion and accionada_en is null`. `alter publication supabase_realtime add table
public.notificaciones`. Job `recordatorios-notificar` cada minuto (`recordatorios_notificar()`, por lotes de 200 como hoy) con la `ruta`
  corregida: con el lead sólo si el dueño del recordatorio aún lo tiene en la cartera (la regla de `recordatorios_vista`); si no,
  `/agenda?recordatorio=<id>`. `notificaciones_purgar()` con su job diario (leídas o accionadas de más de 90 días; `visitados` de más de
  30), sin programar `actividad_purgar()` (es de la Fase 9). Parte 2: avisar por `notificar()` al compartir (`lead_compartir`, tipo
  `lead_compartido`, a quien recibe), al transferir (`lead_transferir`, `lead_transferido`, al destino) y antes de limpiar (`limpieza_pronto`,
  a quien creó el vehículo cuando entra en la ventana de 3 días de `docs/DECISIONES.md:323-327`, una vez por vehículo, por lotes); ningún
  título ni cuerpo lleva un teléfono ni un número de lead. NO entra: interfaz, push, `alertas_demora` (Fase 6), turnos (Fase 8). Cierra lo
  arrastrado de ESTADO «notificar al compartir, transferir y limpiar» y «`recordatorios_notificar()` sin cron». **Assert:**
  `supabase/tests/areas/notificaciones/puerta.sql` (B no lee las de A; `authenticated` no inserta ni ejecuta `notificar()`; antispam; una
  persona de baja no recibe; la publicación tiene la tabla), `…/avisos-de-cartera.sql` (compartir y transferir dejan exactamente una al
  destinatario y ninguna a otro; la limpieza, una al creador) y `…/recordatorios-job.sql` (el job está en `cron.job`; una corrida notifica una
  vez y sella `notificado_en`; sin el lead en la cartera la `ruta` no lo nombra). Lugar: `supabase/migrations/*_notificaciones_*.sql`,
  `supabase/tests/areas/notificaciones/`, `src/shared/types/database.types.ts`, fichas de `notificaciones` y `leads`. Nivel **2** (estructura:
  índices). Tipo: datos y dinero. Partes estimadas: 2.
  Dudas, con la recomendada: (1) ¿Las preferencias apagan también la campana? Recomiendo que no: la campana es el registro y las preferencias sólo gobiernan el push (7.03); así las filas que insertan otras fases no cambian. (2) ¿A quién avisa la limpieza? Al creador del vehículo, 3 días antes (es quien tiene «Conservar»). (3) ¿Programar `actividad_purgar()`? No: borra auditoría; una función propia para lo de esta fase.

- **7.02** (hecho el 2026-11-12; `docs/pasos/7.02/`) — La campana y `/notificaciones`. Deja la base del módulo: `entities/tipos.ts` (catálogo por `tipo`: icono, si pide acción, texto
  de la acción; un tipo desconocido se dibuja genérico) y `entities/destino.ts` (una `ruta` cuya pantalla no existe todavía, `/agenda` o
  `/logistica/…`, no se enlaza: se compara con `NAVEGACION.disponible`), `infra/queries/notificaciones.ts`, `infra/notificaciones.client.ts`,
  `infra/realtime.client.ts`, `features/{campana,lista}/`, `index.ts`, `shell.ts` + `shell.client.ts`, `pantallas/notificaciones.ts`. Crea
  `src/shared/lib/supabase/canal.client.ts` (suscribirse a cambios de una tabla; la fila es señal: se relee por fetch, y también al
  reconectar y al volver a la pestaña), que reusa 7.09. En `_shell/marco.tsx` abre de una vez los tres huecos `campana`, `buscador` y
  `flotante`, cada uno con su archivo en `src/app/(app)/_shell/huecos/{campana,buscador,chat}.tsx` (los dos últimos nacen con
  `<BuscadorPendiente>` y `null`): 7.11 y 7.13 sólo editan el suyo. Campana en la barra (44 px en el celular; el contador sale de
  `limit 10` → «9+»; el contenido del popover viaja con `diferido()`): primero las que piden acción, tope 10 y «Ver todas». Página
  `/notificaciones` (todos): lista por cursor `(creado_en, id)` sobre `notificaciones_usuario_fecha_idx`, «Ver más» de `TAMANO_DE_VER_MAS`
  hasta `TOPE_DE_LO_CARGADO` con `<AvisoDeTope>`, `?ver=por-accionar|todas` en la URL, «Marcar todas como leídas» (por lotes), abrir marca
  leída. La acción por tipo llega por props (`acciones: Record<tipo, ReactNode>`) desde el hueco: la Fase 8 suma «Contacté» de `turno_web`
  sin editar el módulo. Estados de `docs/UX.md` › «Reglas transversales»: esqueleto, vacío, error con reintentar, sin conexión. NO entra:
  push, preferencias, la tarjeta de turno. **Assert:** `e2e/notificaciones-campana.spec.ts` (con una fila insertada por SQL para la sesión
  abierta, la campana la muestra sin recargar, abrirla lleva a su `ruta` y la marca leída; «Ver todas» lista por cursor) y Vitest de
  `entities/` (`destino.test.ts`, `tipos.test.ts`). Lugar: `src/modules/notificaciones/`, `src/app/(app)/notificaciones/`,
  `src/app/(app)/_shell/{marco.tsx,huecos/}`, `src/app/(app)/layout.tsx`, `src/shared/lib/supabase/canal.client.ts`. Nivel **2** (layout y
  `src/shared`). Tipo: pantalla. Partes estimadas: 3.
  Dudas, con la recomendada: (1) ¿Abrir una notificación la da por accionada? Sí para los tipos sin acción propia (`tarea_asignada`, `recordatorio`, `demora_fase`, los de 7.01); `turno_web` sólo por `web_confirmar_contacto`. (2) Realtime: `postgres_changes` bajo RLS (recomendado: anda en el stack local y no pide policies en `realtime.messages`) frente a Broadcast desde la base.

- **7.03** (hecho el 2026-11-11; `docs/pasos/7.03-1/`, `7.03-2/`) — Push web: suscribir, disparar y `supabase/functions/push`. Parte 1 (base): `push_suscribir(p_endpoint, p_claves, p_user_agent)`
  y `push_desuscribir(p_endpoint)` (`security definer`; exigen `notificaciones.push`; endpoint `https` de una lista de hosts de servicios de
  push, para que la función no sea un proxy abierto; un endpoint que era de otra persona pasa a quien suscribe; tope 10 por persona);
  se quita el `insert`/`update` directo de `suscripciones_push` (base:31979) y `notificaciones.push` gana enforcement (`permisos.aplicado_en`;
  sale de la lista de `supabase/tests/permisos-enforcement.sql:19`). Preferencia `notificaciones.push` en `preferencias_usuario`
  (`{ "<tipo>": false }`; sin fila = todo encendido). Disparo: trigger `after insert` en `notificaciones` → `push_disparar()` con un pase de
  un uso por `pg_net` (el patrón de `storage_gc_disparar` y `_url_del_proyecto()`), sólo si `push_web` está activa, el tipo no está apagado
  y hay suscripción; sin cola de reintentos (la campana es el registro). Parte 2 (función): `supabase/functions/push/` (`verify_jwt = false`
  en `config.toml`) canjea el pase (`push_abrir`, `service_role`), envía y devuelve el resultado (`push_resultado`: `ultimo_envio_en`,
  `fallos`, borra las 404/410); el envío es un adaptador con `fetch` inyectado; sin claves VAPID responde `{ ok: false, codigo: 'sin_claves' }`
  y no manda nada. NO entra: interfaz (7.04), claves reales. **Assert:** `supabase/tests/areas/push/push.sql` (sin permiso no suscribe; B no
  ve ni borra las de A; host fuera de la lista y escritura directa se rechazan; el pase vale una vez; integración o tipo apagados no
  disparan) y la prueba de contrato `supabase/tests/push-contrato.test.ts` (claves VAPID generadas en la prueba y `fetch` simulado: `POST`
  al endpoint con `Authorization: vapid …`, `TTL` y `Content-Encoding: aes128gcm`; 404/410 → caducada; 429/5xx → fallo; sin claves →
  `sin_claves`). Lugar: `supabase/migrations/*_push_*.sql`, `supabase/functions/push/`, `supabase/functions/README.md`,
  `supabase/config.toml`, `docs/ENTORNOS.md`. Nivel **2** (RLS: grants y policy de `suscripciones_push`). Tipo: datos y dinero. Partes
  estimadas: 2.
  Dudas, con la recomendada: (1) ¿Secreto `PUSH_WEBHOOK_SECRET` o pase? Pase: la base no guarda secretos (DECISIONES:275). (2) ¿`web-push` (ya en `package.json`) dentro de Deno? Se verifica ese día (`npm:web-push`); si no corre en el runtime local, RFC 8291/8292 con Web Crypto en un archivo propio: el contrato es el mismo. (3) ¿Qué lleva el push? Título, cuerpo y `ruta` de la fila, nada más.

- **7.04** (hecho el 2026-11-12; `docs/pasos/7.04/`) — Preferencias de notificaciones y activar el push. En `/perfil`, sección «Notificaciones»: «Recibir avisos en este navegador»
  (`usePush()`, `infra/push.client.ts` con `NEXT_PUBLIC_VAPID_PUBLIC_KEY`; estados: navegador sin soporte, permiso negado, integración
  `push_web` apagada, sin clave pública y rol sin `notificaciones.push`, cada uno deshabilitado con su motivo, nunca escondido), un
  interruptor de push por tipo del catálogo de 7.02 y «Tus navegadores» (las suscripciones propias, con «Quitar»). `public/sw.js` suma
  `push` (mostrar) y `notificationclick` (enfocar o abrir la `ruta`), todavía sin caché. Empresa › Integraciones: el interruptor de
  `push_web` (cierra la deuda «sin interfaz: `push_web`»; `empresa.ajustes.gestionar`). NO entra: instalar la PWA (Fase 9). **Assert:**
  `e2e/perfil-notificaciones.spec.ts` (con `PushManager.subscribe` simulado por `addInitScript`: encender crea la fila en
  `suscripciones_push`, apagar un tipo persiste al recargar, sin el permiso el interruptor está deshabilitado con su motivo). Lugar:
  `src/modules/notificaciones/features/{preferencias,push}/`, `pantallas/perfil.ts`, `src/app/(app)/perfil/page.tsx`, `public/sw.js`,
  `src/modules/empresa/features/integraciones/`. Nivel **1**. Tipo: pantalla. Partes estimadas: 2.
  Dudas, con la recomendada: ¿Dónde viven las preferencias? En `/perfil` (ya tiene las de interfaz), con un enlace desde `/notificaciones`.

- **7.05** (hecho el 2026-11-11; `docs/pasos/7.05/`) — Correo de la app: adaptadores `resend` y `cloudflare` (7-1). `src/shared/lib/email/adaptadores/{resend,cloudflare}.ts` por su
  API REST con el contrato de `tipos.ts`; sus claves en `src/shared/config/esquemas.ts` (obligatorias sólo con ese proveedor; se va el
  «todavía no tiene adaptador» de `esquemas.ts:56-60` e `index.ts:35`); `pnpm email:probar <destino>` (`scripts/email-probar.mjs`);
  `docs/ENTORNOS.md` y `.env.example`. NO entra: correo desde una función edge (ninguna manda) ni correos nuevos del producto. Cierra
  **7-1**. **Assert:** pruebas de contrato con `fetch` simulado (`adaptadores/resend.test.ts`, `cloudflare.test.ts`: URL, cabeceras, cuerpo,
  error del proveedor como valor) y `email.test.ts`: cambiar `EMAIL_PROVEEDOR` de `resend` a `cloudflare` no cambia código. Lugar:
  `src/shared/lib/email/`, `src/shared/config/`, `scripts/`, `package.json`. Nivel **2** (`src/shared`). Tipo: pantalla (código de `shared`
  sin datos ni permisos: sin auditor). Partes estimadas: 1.
  Dudas, con la recomendada: la forma exacta de la API de Cloudflare Email Sending se verifica ese día; si no es pública, el adaptador queda con su contrato y `email:probar` lo dice.

- **7.06** (hecho el 2026-11-11; `docs/pasos/7.06-1/`, `7.06-2/`) — Agenda: la base. Todo se escribe por RPC `security definer` con el `id` del navegador al crear y `p_actualizado_en_esperado`
  (`_exigir_version()`, `PT409`) al editar: `evento_crear`, `evento_guardar` (con sus destinatarios, todo o nada, tope 50), `evento_eliminar`,
  `tarea_crear`, `tarea_guardar`, `tarea_completar`, `tarea_eliminar`, y `reasignar_tarea` (base:16487) con versión y sin dejar reasignar a
  alguien de baja o bloqueado. Reglas: `publico` y `seleccionados` exigen `agenda.eventos.publicar` también al editar (hoy no, base:26316);
  dar una tarea a otro exige `agenda.tareas.asignar` y que reciba con `agenda.tareas.recibir`; no se vence en el pasado; el lead, vehículo o
  cotización vinculados los ve quien escribe. Se quita la escritura directa de `eventos`, `eventos_destinatarios` y `tareas` (base:31578-
  32030). Columna `eventos.cotizacion_id` (FK e índice). `tareas: leer` suma a los miembros de la conversación donde nació (`mensajes.tarea_id`
  - `es_miembro`). Avisos: `evento_invitacion` a cada destinatario; completar la tarea acciona su notificación. Lecturas: `agenda_rango(p_desde,
p_hasta, p_de_todos)` (hasta 45 días; eventos por `eventos_inicio_idx`, tareas por `tareas_responsable_idx` o un índice nuevo por `vence_en`
    para `agenda.ver_todo`, recordatorios propios por `recordatorios_usuario_idx`, subastas por el índice de `cierre_subasta_en` bajo la RLS de
    vehículos; cada clase con `limit tope + 1`), `agenda_tareas_sin_fecha(p_tamano, cursor)` con `_acotar_pagina` y
    `agenda_quienes_reciben(p_texto)`. `src/modules/agenda/entities/visibilidad.ts` con su test. NO entra: pantalla, repeticiones, arrastrar.
    **Assert:** `supabase/tests/areas/agenda/` (`eventos.sql`: matriz privado/público/seleccionados × creador/destinatario/tercero/`agenda.ver_todo`
    y publicar sin permiso al crear y al editar; `tareas.sql`: asignar y recibir sin permiso, reasignar, `PT409`, escritura directa rechazada,
    la ven los miembros de su conversación; `rango.sql`: no entrega evento privado ajeno, recordatorio ajeno ni subasta de un vehículo que la
    RLS esconde, y corta en el tope) y `visibilidad.test.ts`. Lugar: `supabase/migrations/*_agenda_*.sql`, `supabase/tests/areas/agenda/`,
    `src/modules/agenda/entities/`, `scripts/guardas/areas-<carril>/paginas-en-la-base.ts`. Nivel **2** (RLS y estructura). Tipo: datos y dinero.
    Partes estimadas: 3.
    Dudas, con la recomendada: (1) ¿Evento con cotización? Sí, se suma la columna (PLAN pide el vínculo y las tareas ya lo tienen). (2) ¿Quién edita una tarea? El creador todo; el responsable sólo completar y reabrir. (3) Reasignar una tarea nacida en el chat: sólo a un miembro de esa conversación (si no, quien la recibe no ve su contexto).

- **7.07** (hecho el 2026-11-11; `docs/pasos/7.07-1/`, `7.07-2/`, `7.07-3/`, `7.07-4/`) — La agenda: `/agenda`. Deja la base del módulo (`index.ts` con `leerAgenda(rango)`, `client.ts` con `<ChipEvento>`,
  `composicion.ts`, `pantallas/agenda.ts`) y prende `agenda` en `_shell/navegacion.ts`. Calendario mes, semana y día con `?vista=` y
  `?fecha=` en la URL (en el celular abre en «día»), las cuatro clases con texto y color (eventos, tareas, recordatorios, subastas),
  `?ver=` para filtrarlas y `?de=todos` sólo con `agenda.ver_todo`; fechas en la zona de la empresa (`fechas.ts`, `date-fns-tz` ya
  instalada, sin dependencia nueva). Paneles con URL: `?evento=<id>`, `?tarea=<id>` (la `ruta` de `tarea_notificar`), `?recordatorio=<id>`,
  `?panel=nuevo-evento|nueva-tarea`; `N` abre «Nuevo evento»; visibilidad con sus destinatarios (deshabilitada con motivo sin
  `agenda.eventos.publicar`); tareas: completar, reasignar (`agenda_quienes_reciben`), lista «Sin fecha» con «Ver más» y tope; recordatorios:
  completar por `recordatorio_completar` (la action de `leads`, por su entrada); una subasta abre `/vehiculos/<id>`. Bandeja de inicio:
  «Mis tareas» y «Recordatorios de hoy» con contenido (5 y «Ver todas»), cada uno en su archivo. Estados: esqueleto del calendario, vacío,
  error con reintentar, conflicto `PT409`, tope del rango con `<AvisoDeTope>`. NO entra: arrastrar, repeticiones, vista de equipo.
  **Assert:** `e2e/agenda.spec.ts` (la dueña crea un evento para «seleccionados» y una tarea para la asesora: la asesora ve los dos en el día
  y completa la tarea; un tercero no ve el evento) y Vitest de `entities/calendario` (semanas de un mes y cortes de día en la zona de la
  empresa). Lugar: `src/modules/agenda/`, `src/app/(app)/agenda/`, `src/app/(app)/_shell/navegacion.ts`, `src/app/(app)/_inicio/`,
  `src/modules/tablero/features/bandeja/`. Nivel **2** (`_shell`). Tipo: pantalla. Partes estimadas: 4.
  Dudas, con la recomendada: (1) ¿Calendario propio o librería? Propio, con CSS grid y `date-fns` (regla «versiones nuevas sin verificarlas hoy»). (2) ¿El mes en el celular? Una lista por día, no la grilla.

- **7.08** (hecho el 2026-11-11; `docs/pasos/7.08-1/`, `7.08-2/`, `7.08-3/`) — Chat: la base. Estructura: `conversaciones.par_directo` (único parcial: una directa por par), `conversaciones.ultimo_mensaje_en`
  con su índice, `mensajes (conversacion_id, creado_en desc, id desc)`; la fila del canal global sembrada en la migración; `mensajes` y
  `conversaciones_miembros` a la publicación de realtime. RPC `security definer`: `chat_directa(p_usuario)` (devuelve la que existe),
  `chat_grupo_crear`, `chat_grupo_miembros`, `chat_salir`, `chat_global_entrar`, `chat_leer` (mueve `ultimo_leido_en`), `chat_silenciar`,
  `mensaje_enviar(p_id, p_conversacion, p_cuerpo, p_menciones, p_responde_a, p_ficha)` (idempotente por `id`; hasta 20 menciones; el
  cuerpo guarda la referencia, nunca el nombre de lo mencionado; avisa `mencion` a las personas mencionadas que son miembros; una ficha de
  vehículo, lead o cotización exige que quien envía la vea), `mensaje_editar` (autor, 15 minutos), `mensaje_eliminar` (autor, o cualquiera
  con `chat.moderar`; vacía el cuerpo) y `mensaje_tarea_crear` / `mensaje_evento_crear` (la tarea o el evento con las reglas de 7.06 más el
  mensaje-ficha en una transacción; el responsable es miembro). Lecturas: `chat_conversaciones(p_tamano, cursor)` (por `ultimo_mensaje_en`,
  con no leídos acotados a 100 → «99+») y `chat_no_leidos()`; los mensajes, por cursor bajo su RLS. Se quita la escritura directa
  (base:31462-31704). Seguridad: sólo los miembros leen (la dueña tampoco, a propósito); el canal global se lee con `chat.global`
  vigente aunque quede la fila de miembro; escribir pide `chat.participar`. NO entra: pantalla, adjuntos, «escribiendo…». **Assert:**
  `supabase/tests/areas/chat/` (`membresia.sql`: quien no es miembro no lee conversación, mensajes ni menciones; `directas.sql`: A→B y B→A
  son la misma; `global.sql`: entrar pide `chat.global` y perderlo corta la lectura; `mensajes.sql`: enviar sin `chat.participar`, editar
  ajeno o fuera de la ventana, borrar sin `chat.moderar`, el borrado no entrega cuerpo, escritura directa rechazada; `fichas.sql`:
  `mensaje_tarea_crear` deja una `tarea_asignada` al responsable y la tarea la ven los miembros; una mención a un lead no lo vuelve
  visible en `leads_vista` para quien no lo tenía). Lugar: `supabase/migrations/*_chat_*.sql`, `supabase/tests/areas/chat/`,
  `scripts/guardas/areas-<carril>/paginas-en-la-base.ts`. Nivel **2** (RLS y estructura). Tipo: datos y dinero. Partes estimadas: 3.
  Dudas, con la recomendada: (1) Ventana para editar: 15 minutos, constante en la RPC (la ficha la nombra y no existe). (2) Borrar: queda «Mensaje eliminado» y el cuerpo se vacía (RLS no esconde columnas). (3) Un grupo lo administra quien lo creó (la policy de hoy). (4) Sin prueba de carreras: la directa la cuida el índice único, no un candado.

- **7.09** (hecho el 2026-11-12; `docs/pasos/7.09-1/`, `7.09-2/`, `7.09-3/`, `7.09-4/`) — El chat: `/chat`. Deja la base del módulo (`index.ts`, `client.ts`, `composicion.ts`, `pantallas/chat.ts`, áreas
  `conversaciones` y `mensajes` en `features/`, `infra/realtime.client.ts` sobre `canal.client.ts` de 7.02) y prende `chat` en
  `_shell/navegacion.ts`. Maestro-detalle con `?c=<conversación>` (en el celular, dos pantallas y «atrás» vuelve a la lista). Lista:
  conversaciones por cursor con «Ver más» y tope, no leídos «99+», iniciar una directa buscando a una persona (mínimo 3 letras), crear
  grupo, entrar al canal global (sólo con `chat.global`), silenciar y salir. Hilo: lo nuevo abajo, «Ver anteriores» por cursor sobre el
  índice de 7.08 hasta `TOPE_DE_LO_CARGADO` con `<IrAUnaFecha>` como camino a lo antiguo; redactor (Enter envía, Mayús+Enter salta de
  línea); envío optimista con el `id` del navegador («No enviado · Reintentar» sin red, sin duplicar); responder; editar dentro de la
  ventana; borrar con `<Confirmar>` con URL. Realtime: la señal relee desde el último mensaje, marca leído lo que se ve y rehidrata al
  reconectar. Estados: sin `chat.participar` (`<EstadoSinPermiso>` por URL), vacío primera vez, error con reintentar, conversación que ya
  no es mía. NO entra: menciones, `/tarea`, widget. **Assert:** `e2e/chat.spec.ts` (dos sesiones: la asesora abre una directa con la de
  logística y escribe; la otra lo ve sin recargar con su no leído, que se limpia al abrir). Lugar: `src/modules/chat/`,
  `src/app/(app)/chat/`, `src/app/(app)/_shell/navegacion.ts`. Nivel **2** (`_shell`). Tipo: pantalla. Partes estimadas: 4.
  Dudas, con la recomendada: ¿Presencia y «escribiendo…»? No entran (PLAN no los nombra).

- **7.10** (hecho el 2026-11-12; `docs/pasos/7.10-1/`, `7.10-2/`, `7.10-3/`) — Menciones `#`, fichas, `/tarea` y `/evento`. `entities/menciones.ts`: parser puro de `#` y `/comando` (texto ↔ referencias)
  con su test. En el redactor, `#` abre un selector de vehículo, lead, cotización o persona que busca con las lecturas de 7.12 (mínimo 3;
  leads sin teléfono ni campos privados). En el hilo la mención se hidrata bajo la RLS de quien lee, una lectura por clase y por página
  (sin N+1): si no la ve, placeholder «No tienes acceso a este lead» sin nombre; si se purgó, «Eliminado». Un clic abre el drawer de la
  entidad sin salir del chat (`?mencion=<clase>:<id>`), con el resumen que cada módulo ya expone (lead rápido, resumen de vehículo,
  resumen de cotización; si falta la salida por `client.ts`, se suma ahí). `/tarea` y `/evento` abren un formulario corto (título,
  responsable entre los miembros, vence) → `mensaje_tarea_crear` / `mensaje_evento_crear`; la ficha en el hilo muestra el estado y deja
  completar al responsable. NO entra: menciones fuera del chat. Cubre dos de los tres «Terminado cuando» del párrafo. **Assert:**
  `e2e/chat-menciones.spec.ts` (la asesora menciona un lead suyo: quien no lo ve lee el placeholder y el drawer no abre datos, la dueña ve
  el nombre y lo abre; `/tarea` a la otra persona: le aparece en la campana y en su agenda) y `menciones.test.ts`. Lugar:
  `src/modules/chat/{entities,features/menciones,features/fichas}/`, entradas `client.ts` de `leads`, `vehiculos` y `cotizaciones` si hace
  falta. Nivel **1**. Tipo: pantalla. Partes estimadas: 3.
  Dudas, con la recomendada: ¿Mencionar a una persona la avisa aunque tenga la conversación silenciada? Sí: silenciar apaga los no leídos, no una mención.

- **7.11** (hecho el 2026-11-12; `docs/pasos/7.11-1/`, `7.11-2/`, `7.11-3/`) — Widget flotante, no leídos y «Escribirle por chat». `<WidgetChat>` fuera de `/chat` en el hueco `_shell/huecos/chat.tsx`
  (`chat/shell.client.ts`): en el shell viaja sólo la burbuja con el contador; el panel reusa lista e hilo de 7.09 con `diferido()`; sólo
  con `chat.participar`; no tapa el pie de un panel ni los avisos; en el celular la burbuja lleva a `/chat`. No leídos también en la
  entrada «Chat» de la barra lateral. «Escribirle por chat» en el aviso «Lo tiene <persona>» del teléfono (alta y cambio de principal;
  `leads/entities/verificacion.ts:101`), sólo si las dos personas tienen `chat.participar`: es un enlace a `/chat?con=<usuario>` que la
  página resuelve con `chat_directa` (`leads` no importa `chat`: `chat` depende de `leads` en `docs/ARQUITECTURA.md`). NO entra: sonido,
  varias ventanas. Cierra lo arrastrado «Escribirle por chat». **Assert:** `e2e/chat-widget.spec.ts` (en `/leads` llega un mensaje: la
  burbuja dice «1», se abre y se responde sin salir; «Escribirle por chat» desde el alta abre la directa con quien tiene el lead) y se
  actualiza `e2e/leads-alta.spec.ts:216`. Lugar: `src/modules/chat/features/widget/`, `src/app/(app)/_shell/huecos/chat.tsx`,
  `src/app/(app)/_shell/barra-lateral.tsx`, `src/modules/leads/features/{alta,telefono}/`. Nivel **2** (layout). Tipo: pantalla. Partes
  estimadas: 2.
  Dudas, con la recomendada: ¿El widget flota en el celular? No: tapa el pie; la burbuja abre `/chat`.

- **7.12** (hecho el 2026-11-11; `docs/pasos/7.12-1/`, `7.12-2/`) — Buscador: la base. Una búsqueda por sección, cada una en su módulo y llamada desde el navegador (cancelable), que 7.10 reusa:
  leads por nombre y `#n` (`leads_candidatos` + `leads_vista_por_ids` y `leads_ids_del_numero`, sobre `leerClientesDelPanel`; nunca
  teléfono ni campos privados), vehículos por título, VIN o lote (`leerListaDelPanel` / `buscarVehiculos`), y cotizaciones con la RPC nueva
  `buscador_cotizaciones(p_texto, p_tamano)`: número exacto o título por `cotizaciones_titulo_trgm`, `security definer` que vuelve a aplicar
  la visibilidad de `cotizaciones_listado` (bajo RLS un `ilike` no usa el índice, `.claude/rules/migraciones.md` › «Forma»), sin la
  papelera, sin montos, con `_acotar_pagina`; entra al inventario de `supabase/tests/cotizaciones-visibilidad.sql`. Mínimo
  `MINIMO_DE_BUSQUEDA` en el servidor; tope 5 por sección. Últimos abiertos: `visita_registrar(p_tipo, p_id)` (upsert propio, tope 50 por
  persona) y el índice `visitados (usuario_id, visto_en desc)`; se hidratan bajo la RLS de cada entidad. `src/modules/buscador/entities/
ranking.ts` (orden y agrupación) con su test. NO entra: la paleta, buscar repuestos o logística. Cierra lo arrastrado «el buscador de
  leads, sin los privados». **Assert:** `supabase/tests/areas/buscador/buscador.sql` (como la asesora con «propios»: no sale el lead ajeno,
  el vehículo de un origen sin permiso ni la cotización que su nivel no ve; un teléfono entero o parcial no encuentra ningún lead; el valor
  de un campo privado tampoco; la papelera no sale; con 2 letras, nada; B no lee los `visitados` de A) y `ranking.test.ts`. Lugar:
  `supabase/migrations/*_buscador_*.sql`, `supabase/tests/areas/buscador/`, `src/modules/buscador/{entities,infra}/`,
  `src/modules/cotizaciones/{infra,areas}/listado/`, `src/modules/leads/client.ts`. Nivel **2** (estructura: índice). Tipo: datos y dinero.
  Partes estimadas: 2.
  Dudas, con la recomendada: (1) ¿Por qué se busca una cotización? Número y título; por el nombre del lead no (el lead sale en su sección). (2) ¿Personas en el buscador? No en esta fase.

- **7.13** (hecho el 2026-11-12; `docs/pasos/7.13-1/`, `7.13-2/`, `7.13-3/`) — La paleta `Ctrl/Cmd+K` y la lista de atajos `?`. `<Buscador>` reemplaza a `<BuscadorPendiente>` en
  `_shell/huecos/buscador.tsx` (`buscador/shell.client.ts`) y hereda su regla de ancho (icono de 44 px bajo 24 rem;
  `e2e/barra-superior-celular.spec.ts` se pone al día); `useAtajo('buscar')`; la paleta (`shared/ui/command.tsx`) viaja con `diferido()`.
  Sin texto: «Últimos abiertos» y acciones; con texto: 250 ms de espera, mínimo 3 («Escribe al menos 3 letras»), una llamada por sección
  en paralelo con cancelación, hasta 5 por sección y «Ver todos en Leads» (`/leads?q=`). Acciones sólo si `puede()`: «Nuevo lead»
  (`leads.crear`, abre el drawer), «Nueva cotización» (`cotizaciones.crear` → `/cotizaciones/nuevo`), «Nuevo vehículo»
  (`vehiculos.crear`), ir a cada entrada visible de `NAVEGACION` y de `seccionesVisibles()`, y «Ver atajos». Las fichas `/leads/[id]`,
  `/vehiculos/[id]` y `/cotizaciones/[id]` registran la visita (`<RegistrarVisita>` de `buscador/pantallas/visita.ts`). `?` abre «Atajos de
  teclado» con el catálogo de `src/shared/lib/atajos.ts` (`src/shared/ui/atajos/lista-de-atajos.tsx`). Estados: buscando, sin resultados,
  error con reintentar, sin conexión. Cierra lo arrastrado «el atajo `?` sin lista» y la entrada `Ctrl/Cmd+K → «Nueva cotización»` de
  `docs/UX.md:38`. **Assert:** `e2e/buscador.spec.ts` (Ctrl+K, el nombre de un lead de la semilla y Enter abren su ficha, que después sale
  en «Últimos abiertos»; la asesora no ve el lead ajeno; «Nueva cotización» lleva a `/cotizaciones/nuevo`; `?` lista los atajos). Lugar:
  `src/modules/buscador/features/paleta/`, `src/app/(app)/_shell/huecos/buscador.tsx`, `src/shared/ui/atajos/`, las tres `page.tsx` de
  ficha. Nivel **2** (`_shell` y `src/shared`). Tipo: pantalla. Partes estimadas: 3.
  Dudas, con la recomendada: ¿Un texto que parece teléfono? La sección de leads dice «No se busca por teléfono» y no pide nada.

- **7.14** (hecho el 2026-11-12; `docs/pasos/7.14-1/`, `7.14-2/`) — Cierre de la Fase 7. Recorrido de la IA del «Terminado cuando»: (1) una tarea dada con `/tarea` en el chat le llega al
  responsable en la campana sin recargar y como push (el push, contra un endpoint simulado: `supabase/tests/push-de-verdad.sh` con las
  funciones servidas, al modo de `jobs-de-verdad.sh`; si el runtime local no alcanza al anfitrión, se dice y vale el contrato de 7.03);
  (2) la mención a un lead que no veo muestra el placeholder; (3) el buscador no devuelve lo que la RLS esconde ni busca por teléfono.
  Tabla de criterios en `docs/PLAN.md` › «Fase 7» con cada arrastrado y abierto (7-1 y los cinco de ESTADO) y dónde quedó; fichas de los
  cuatro módulos, `docs/GLOSARIO.md`, `docs/UX.md` (filas de Agenda, Chat, Notificaciones y Buscador; `?` ya dibujado; la barra superior),
  `docs/RENDIMIENTO.md` (JS del shell con campana, burbuja y buscador: se mide y, si pasa por ≤ 5 %, se sube el tope), ESTADO y BITACORA.
  **Assert:** `e2e/fase-7-recorrido.spec.ts` en verde y `pnpm test:e2e:completo` con los dos proyectos. Lugar: `e2e/`, `docs/`. Nivel **3**
  (cierre). Tipo: pantalla. Partes estimadas: 2.
  Dudas, con la recomendada: ninguna. **Paralelo.** Pueden arrancar a la vez 7.01, 7.05, 7.06 y 7.12 (no comparten archivos fuera de `supabase/migrations/` y `database.types.ts`). Después: 7.02 ∥ 7.03 ∥ 7.08 ∥ 7.07; 7.04 ∥ 7.09 ∥ 7.13; 7.10 ∥ 7.11. No en paralelo: 7.07 con 7.09 (la misma `navegacion.ts` y su test; una línea cada uno, se unen, pero mejor en serie) y 7.11 con 7.13 sólo si 7.02 no dejó los huecos.
  Hecho en dos: el **7.14-1** (el recorrido del «Terminado cuando» en los dos proyectos, `supabase/tests/push-de-verdad.sh`, 7-2 y el JS del marco) y el **7.14-2** (el Nivel 3 y los docs de cierre).

Total de la fase: 14 pasos y 34 partes, todos hechos (la fase cerró con el 7.14, el 2026-11-12).

### Riesgos y huecos

- **Claves VAPID reales:** no hacen falta. 7.03 prueba con claves generadas en la prueba y 7.04 simula `PushManager.subscribe`; sin
  claves la función responde `sin_claves` y `/perfil` lo dice. La persona las pone en Vercel y en los secretos de la función
  (`docs/ENTORNOS.md:24-25`). El push de verdad a un teléfono no lo prueba nadie hasta entonces: queda dicho en la tabla de criterios.
  (El cierre lo dice en la tabla de criterios del 7.14-2.)
- **Push en un e2e:** Chromium sin servicio de push no entrega nada; por eso el cierre usa un endpoint simulado. No pude comprobar
  leyendo que el runtime local de funciones alcance al anfitrión. (Resuelto en el 7.14-1: `push-de-verdad.sh` llega de la base a la
  función por el gateway, `url_proyecto`, sin endpoint simulado; la última milla, `push-contrato.test.ts`.)
- **`web-push` en Deno** y **la API REST de Cloudflare Email Sending:** no verificables sin red; cada paso las verifica el día que corre
  y tiene su plan B escrito (Web Crypto; contrato sin envío real). (Resuelto en el 7.03-2 con Web Crypto propio y en el 7.05 con el
  contrato con `fetch` simulado.)
- **Realtime:** ningún código lo usa hoy y la publicación está vacía; no pude probar que `postgres_changes` filtre por RLS en este stack
  ni cuánto pesa el cliente de realtime en el JS del shell (la campana y la burbuja van en todas las pantallas: se mide en 7.02 y 7.11).
  (Resuelto en el 7.02 y el 7.11-1: se suscriben diferidas; el JS del marco, `docs/RENDIMIENTO.md` › «Cierre de la Fase 7».)
- **Proveedor de correo, dominio y proyecto de producción:** fuera del repo; 7.05 deja adaptador, variables y `email:probar`.
- **Agujeros de seguridad ya presentes** que los pasos rojos cierran y conviene no olvidar si se recorta: evento privado → público sin
  permiso (7.06), des-borrar un mensaje y leer el canal global sin el permiso (7.08), suscripción con endpoint libre (7.03). (Cerrados
  en el 7.06, el 7.08-1/2 y el 7.03-1.)
- **No determinado:** las reglas de «reasignar tarea de chat vs suelta» y la ventana de edición no están escritas en ningún doc que pude
  leer (van como dudas con recomendación); qué exporta hoy cada módulo para abrir su resumen en un drawer ajeno (7.10 lo suma si falta);
  si `docs/archivo/` guarda decisiones de la Fase 7. (Las dudas se decidieron con su recomendada en cada paso, `docs/pasos/7.*/decisiones.md`.)
- **Tamaño:** 7.07 y 7.09 son los más grandes (4 partes); si el planificador no los cabe, se parten por vista (calendario / paneles) y
  por lado (lista / hilo), sin tocar las dependencias. (7.07 y 7.09 se hicieron en 4 partes cada uno.)
- **Dependencia floja 7.10 → 7.07:** sólo por el e2e que mira la tarea en la agenda; si 7.07 se atrasa, el e2e mira la campana y sigue.
  (No hizo falta: 7.07 entró antes.)

## Fase 8 — Web pública (contenido, cola y portal) y repuestos

Módulo `web`: ajustes del sitio (lema, redes, legales con editor, orígenes visibles, política de la cola), guías con Tiptap y publicación
por permiso, FAQs, testimonios con consentimiento, tablero de la cola (`estado_cola_web`, `unassigned` destacado, prioridades y cupos),
tarjeta de turno con «Contacté» y «Vincular a lead» en 2 toques, interruptor de disponibilidad en el perfil, revalidación de la web por
trigger + `WEB_PUBLICA_REVALIDAR_URL`, route handlers del portal (`api/portal/*` con cookie firmada y `web.portal_*`: el contrato está en
`docs/DECISIONES.md`, «Contrato del portal para la Fase 8», 2026-10-15). Módulo `repuestos`: proyectos e ítems, imágenes, stock y
movimientos, compras (permiso de costos), flujo de repuestos con la misma cadena, esperas que destraban al vehículo, cotizador de repuestos
(config append-only, tramos, cajas, líneas importado/local, aceptar), catálogos.

**Terminado cuando:** confirmar un turno toma 2 toques en viewport móvil y la tasa de contacto se actualiza; un visitante anónimo (test
contra `web.solicitar_asesor`) recibe asesor, el mismo asesor dentro del plazo pegajoso y respaldo cuando nadie está disponible; un
repuesto en fase «Recibido» cumple la espera del vehículo en «En taller».

La rueda por rol (2026-10-21, `docs/DECISIONES.md`) deja listo: el permiso `web.cola.participar`, `puede_estar_en_la_rueda()`,
`estado_cola_web` filtrado y la sección «Turnos de la web» de `/perfil`, hoy de sólo lectura. **El interruptor de disponibilidad nace en
esa sección** (`cola_web_asesores.disponible`, la persona sólo escribe esa columna), **deshabilitado con el motivo «Tu rol no recibe
turnos de la web.»** si su rol no tiene el permiso (patrón de `docs/UX.md`: deshabilitado con su motivo, nunca escondido). Arrastrados a
esta fase (de ESTADO y del cierre de la Fase 3): la Fase 8 hace `api/portal/*`, la cookie con `otorgado_en`, el límite por IP y el ingreso
según el contrato del portal; `ajustes_web.direccion_publica` no tiene pantalla; el CTA «Escribirle por chat»; la notificación de la
limpieza; el buscador de leads, sin los privados; el atajo `?` sin lista; `recordatorios_notificar()` existe sin cron y su `ruta` nombra
el lead aunque su dueño ya no lo vea; el job `web_expirar_solicitudes` se programa con esta fase.

- **8-1** (Fase 8): la habilitada cuyo rol no recibe turnos no se ve en la cola. `estado_cola_web` sólo lista a quien puede estar en la
  rueda (decidido el 2026-10-21) y `cola_web_configurar` deja habilitar a quien no puede: quien administra la cola cree que habilitó a
  alguien que no recibe nada — el tablero de la cola muestra a esa persona aparte, con «Habilitada, pero su rol no recibe turnos de la
  web», y un e2e lo prueba (rol sin el permiso y habilitada: su fila y el texto; con el permiso: entra en la rueda); habilitar a alguien
  sin el permiso lo avisa. Lugar: `src/modules/web/features/cola/` (nuevo), con una lectura propia que no pase por `estado_cola_web`. **Cerrado en el 8.04-3** (2026-11-12).

#### Los decide la persona

- **8-13a** (salió del 8.13-1, D3, y el 8.13-4, D2): un ítem de repuestos no dice «fuera de regla» ni quién lo movió, y «Esperas que destraban
  vehículos» lista los ítems en vuelo de proyectos con vehículo sin cruzarlos con la fase del vehículo: `logistica_unidad` es sólo de vehículo y leerlo
  pide una RPC `security definer` (`docs/pasos/8.13-1/decisiones.md:5`, `8.13-4/decisiones.md:5`). Paso de datos.
- **8-13c** (salió del 8.13-3, D2): un índice `(fase_id, fase_desde, id)` en `repuestos_items` si la Cadena de repuestos y los bloques de Inicio llegan a
  miles; hoy van por `repuestos_items_fase_id_idx`, ≤ 30 consultas de 51 (`docs/pasos/8.13-3/bitacora.md:12`, `8.13-4/bitacora.md:11`). Migración.
- **8-13d** (salió del 8.13-5): anular un pago confirmado de un proyecto de repuestos; hoy no se puede y el texto de confirmar lo dice
  (`docs/pasos/8.13-5/decisiones.md:8`). Dinero.
- **8-13e** (salió del 8.13-5): eliminar el último pago vivo sin confirmar de un proyecto puede dejar sin cumplir `proyecto.pago_cliente` de la fase
  actual de un ítem; el vehículo tiene esa guarda y el proyecto no (`docs/pasos/8.13-5/decisiones.md:18`). Dinero.
- **8-13f** (salió del 8.13-5, D10): `pago_registrar` del vehículo acepta `NaN` (`'NaN' > 0` es verdadero en PG y `numeric(18,2)` lo guarda); la gemela
  de repuestos ya lo rechaza (`docs/pasos/8.13-5/decisiones.md:17`). Dinero, migración.
- **8-05a** (salió del 8.05-1, D4): vincular a un lead una solicitud ya contactada pide una RPC (`docs/pasos/8.05-2/bitacora.md:17`). Paso de datos.
- **8-14a** (salió del 8.14-1, D9): el bloque de turnos de Inicio pide `leads.crear` o `web.cola.gestionar`; un rol con sólo `web.cola.participar`
  recibe turnos y no los ve en Inicio (`docs/pasos/8.14-1/decisiones.md`, D9). Recomendado: dejarlo (quien atiende la web crea el lead). Permisos.

Abiertos de la fase con su lugar: **8-13b** (el transporte propio de un ítem sin vehículo, hoy sólo texto: un formulario con
`transporte_guardar(p_repuesto)`, que ya lo acepta; `docs/pasos/8.13-2/decisiones.md:7`; pantalla de `repuestos`, Nivel 1); la IP real tras la
reescritura (medir la IP que llega a `/api/portal/ingresar` cuando el sitio publique el portal; si es la del sitio, una cabecera firmada por el sitio;
`docs/pasos/8.07-3/bitacora.md:18-19`); para «Pulido para la Fase 9» › seguridad, los de D14 de `docs/pasos/8.10-1/decisiones.md:16` y los pagos de un
proyecto de repuestos (`docs/pasos/8.11-1/bitacora.md:26`); para «Pulido para la Fase 9», la cabecera del proyecto tras pasar a stock (D8 de 8.10-2,
`docs/pasos/8.10-2/bitacora.md:28`).

Cerrados en la fase: **8-1** (8.04-3), `api/portal/*` con la cookie con `otorgado_en`, el límite por IP y el ingreso (8.07), `direccion_publica` (8.01-4),
el job `web_expirar_solicitudes` (8.04-1), los arrastrados de la Fase 7 (el CTA del chat, la notificación de la limpieza, el buscador, el atajo `?` y
`recordatorios_notificar()`) y las contradicciones 1 (8.06-2), 2 y 4 (8.01-1), 3 (8.08-1), 6 (9.01, el job `actividad-purgar`) y 5 (`/notificaciones`
existe desde el 7.02 y lista `turno_web`; ninguna migración cambió esa `ruta`).

### Lo que ya existe y lo que falta (leído el 2026-11-09)

| Superficie                   | Ya está en la base                                                                                                                                                                                                                                                                | Código que existe                                                                                                                                                        | Falta                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ajustes del sitio            | `ajustes_web` B:19906 (lema, redes, legales, seo, `origenes_visibles`, `direccion_publica`, política de la cola); policy editar `web.ajustes.gestionar` B:26044; vista `web.ajustes` B:22157                                                                                      | `web/infra/queries/sitio.ts` (`getDireccionPublica`)                                                                                                                     | Ruta `/configuracion/web`, formulario, RPC de guardado con `PT409` (hoy sería `.update()` directo de algo que decide qué es público), forma de `legales`                                                                                                                                                                                 |
| Guías y categorías           | `web_guias` B:22105 (`cuerpo_html`), `web_categorias_guias` B:22079, trigger `web_guia_publicar_validar` B:19662/24835 (`web.guias.publicar`), policies B:27294–27344, vista `web.guias` B:22215, bucket `web` B:32254 con policies B:32237 y refcount B:17381                    | Tiptap **instalado** (`package.json:36-38`: `@tiptap/pm`, `react`, `starter-kit` ^3.31.4), usado sólo en `leads/features/seguimientos/components/editor-enriquecido.tsx` | Todo lo de pantalla. **No hay saneador de HTML** (ni `dompurify` ni `sanitize-html`): quien tiene `web.contenido.gestionar` puede escribir `cuerpo_html` por PostgREST. Falta `cuerpo_doc` + HTML derivado en la base                                                                                                                    |
| FAQs                         | `web_faqs` B:22091, policies B:27313–27325, vista `web.faqs` B:22203                                                                                                                                                                                                              | —                                                                                                                                                                        | Pantalla                                                                                                                                                                                                                                                                                                                                 |
| Testimonios                  | `web_testimonios` B:22128 (consentimiento por dato), policies B:27351–27363, `trg_lead_visible` B:24651, vista `web.testimonios` B:22249 (exige el trío)                                                                                                                          | —                                                                                                                                                                        | Pantalla; RPC que registre el consentimiento (`consent_por`, `consent_en` hoy los escribe el cliente)                                                                                                                                                                                                                                    |
| Cola: tablero y política     | `cola_web_asesores` B:20302, `cola_web_configurar` B:8750, `estado_cola_web` B:20634, `puede_estar_en_la_rueda` B:16226, `solicitudes_contacto_web` B:20603 con índices B:23983–24011 y policy leer B:27045; `rueda-por-rol.sql`, `medir-rueda.sql`, `scripts/carreras/rueda.mjs` | `web/entities/rueda.ts`                                                                                                                                                  | Ruta `/configuracion/cola-web`; lectura que no pase por `estado_cola_web` (8-1); índice para listar solicitudes por estado; job de `web_expirar_solicitudes` B:19617 (no está entre los de B:32305–32310)                                                                                                                                |
| Turno y disponibilidad       | `web.solicitar_asesor` B:19830, `web_confirmar_contacto` B:19596, grant `UPDATE(disponible)` B:31447 y policy propia B:26093                                                                                                                                                      | `features/rueda/components/estado-en-la-rueda.tsx` en `/perfil` (sólo lectura); bloque `turnos-web` de `tablero/entities/bandeja.ts` declarado y vacío                   | `<TarjetaTurno>`, lectura «mis turnos», action de disponibilidad, contenido del bloque de Inicio. **La ficha pública del asesor no tiene pantalla** (`perfiles.whatsapp_web`, `handle`, `publico_web`, `cargo_web`, `bio_web`, `especialidades`: B:14009–14013, grants B:30179–30211) y sin `whatsapp_web` nadie recibe turnos (B:19878) |
| Revalidación                 | `net.http_post` y Vault ya se usan (B:8403, B:11550); fila `integraciones.web_publica` con `config.revalidar_url` (`seed.sql:26`); `integracion_guardar` B:11492                                                                                                                  | `WEB_PUBLICA_REVALIDAR_URL/_SECRETO` opcionales en `src/shared/config/esquemas.ts:30-31`                                                                                 | **Nada en la base** (`rg revalid` = 0): función, triggers, cola y job; la tarjeta «Web pública» en Empresa › Integraciones (`empresa/CLAUDE.md:56`: «sin interfaz hasta su fase»)                                                                                                                                                        |
| Portal                       | `accesos_portal` B:6551, `web.portal_login/snapshot/documento_ruta/cambiar_clave` B:19694–19779 sólo `service_role` (B:31297–31313), `_portal_vigente` B:6575; `portal-cliente.sql`, `scripts/carreras/portal.mjs`                                                                | Lado del equipo completo (`leads/features/portal`); `createAdminClient()` en `shared/lib/supabase/admin.ts`                                                              | `src/app/api/` no existe; cookie firmada (`jose` **no** está en `package.json`, aunque `.claude/rules/acciones.md` la nombra); límite por IP (ninguna tabla); `/api/portal/` no es ruta pública en `shared/lib/rutas.ts`; variable del secreto de la cookie                                                                              |
| Repuestos: proyectos e ítems | `repuestos_proyectos` B:21591 (único por vehículo B:23915, `numero` B:22852), `repuestos_items` B:21546, imágenes B:21579, policies B:26941–26983, bucket `repuestos` B:32229, `puede_repuesto` B:16288                                                                           | `repuestos/index.ts` vacío; `XCell` en `shared/ui/xcell/` (sin variante «compacta»)                                                                                      | Todo el código. **Ninguna RPC de repuestos**: crear ítem (hoy el INSERT directo admite `fase_id` y `stock_cantidad`, B:31872), eliminar, listar por cursor con estado derivado                                                                                                                                                           |
| Stock                        | `repuestos_stock_movimientos` B:21627, `stock_cantidad`/`en_stock_desde`                                                                                                                                                                                                          | —                                                                                                                                                                        | Nadie escribe `stock_cantidad` (sin grant de columna, B:31876–31916, y sin trigger); `en_stock_desde` sí se edita directo (B:31912) y saca al ítem de la espera (B:11171); RPC, índice y carrera                                                                                                                                         |
| Compras                      | `repuestos_compras` B:21435, policies `repuestos.costos.*` B:26871–26879, bucket `comprobantes` B:32208, `pagos.proyecto_repuestos_id` B:21273                                                                                                                                    | —                                                                                                                                                                        | Pantalla; `monto_base` y `tipo_cambio_aplicado` los escribe el cliente; margen por RPC                                                                                                                                                                                                                                                   |
| Cotizador de repuestos       | `repuestos_cotizador_config` B:21516, tramos B:21652, cajas B:21405, cotizaciones B:21462 y líneas B:21481, policies B:26886–26934                                                                                                                                                | —                                                                                                                                                                        | `entities/cotizador`; RPC crear/guardar/**aceptar** (la policy exige `estado = 'borrador'` también en el `with check`, B:26890: hoy no se puede aceptar); `config_snapshot` y `total` los escribe el cliente                                                                                                                             |
| Catálogos                    | `repuestos_catalogos` B:21417 (cuatro catálogos por `check`), policies B:26852–26864; ejemplos en `seed.sql:147`                                                                                                                                                                  | —                                                                                                                                                                        | Ruta `/configuracion/repuestos`                                                                                                                                                                                                                                                                                                          |
| Flujo y esperas              | Motor completo: `cambiar_fase` B:8443, `previsualizar_cambio_fase` B:16146, `evaluar_requisitos` B:11140, `_puede_mover` (`repuestos.mover`) B:6653, `claves_dato_requisito` B:8715; flujo de repuestos con 5 fases en `seed.sql:201-214`                                         | `flujos` sólo expone `leerFasesDeOrigen`                                                                                                                                 | Interfaz de mover (la traen las fases 5 y 6), lectura de fases de repuestos, «qué espera este vehículo»                                                                                                                                                                                                                                  |

Contradicciones entre el párrafo de PLAN (o las fichas) y la base:

1. **Revalidación «por trigger»:** no existe ningún trigger; y la URL tiene dos casas (variables de entorno y `integraciones.config.revalidar_url`). Hay que elegir una (8.06).
2. **Política de la cola:** vive en `ajustes_web` y la gobierna `web.ajustes.gestionar`, no `web.cola.gestionar`; `docs/UX.md:89` separa «web» y «cola web» (8.01 lo resuelve en la RPC).
3. **Esperas:** la ficha de `repuestos` dice «los que terminaron sin llegar no frenan»; `evaluar_requisitos` (B:11166–11172) exige que **todos** los ítems vivos fuera de stock hayan llegado: uno en «Perdido» (final) frena al vehículo para siempre (8.08).
4. **Cookie con `jose`** (acciones.md) y «Tiptap saneado» (ficha de `web`): la primera es una dependencia que no está; lo segundo no tiene con qué. El precedente del repo es la lista blanca del documento (`leads/entities/documento.ts`, espejo de `_seguimiento_detalle()`), no sanear HTML.
5. **Notificaciones de turno:** `solicitar_asesor` y `web_expirar_solicitudes` escriben `ruta = '/notificaciones'` (B:19629, 19850, 19894), pantalla de la Fase 7.
6. **Purga de `eventos_web`:** la hace `actividad_purgar()` (B:8040), que tampoco tiene job. No es de esta fase (Fase 9, `actividad`), pero nadie lo tiene anotado.

### Tabla de criterios

Cada criterio del «Terminado cuando» y del párrafo de la fase con la prueba que lo mide y su resultado en el Nivel 3 del 8.14-2 («base» = `db:probar` o
`db:carreras`; «unidad» = Vitest; rutas `areas/…` de `supabase/tests/`). `db:carreras` corre al empezar cada proyecto del completo; `db:probar` y Vitest, en
el CI de cada PR.

| Criterio                                                                                     | Prueba                                                                                                                                                                                                                                                                                                                                                                                                | Proyectos                        | Resultado                                                          |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------ |
| Confirmar un turno toma 2 toques en viewport móvil                                           | `fase-8-recorrido.spec.ts` › «E2E R2 la asesora confirma el turno en dos toques desde Inicio»; `web-turno.spec.ts` › ««Contacté» confirma el turno en un toque y la tarjeta se va»                                                                                                                                                                                                                    | escritorio y movil               | verde en los dos                                                   |
| … y la tasa de contacto se actualiza                                                         | `fase-8-recorrido.spec.ts` › «E2E R3 el tablero de la cola muestra la tasa de contacto nueva»; `src/modules/web/entities/cola/tablero.test.ts`                                                                                                                                                                                                                                                        | escritorio y unidad              | verde (escritorio; unidad: CI del PR sobre `910befb2`)             |
| Un visitante anónimo recibe asesor                                                           | `fase-8-recorrido.spec.ts` › «E2E R1 un visitante anónimo pide un asesor y le toca una de las dos»; `perfil-disponibilidad.spec.ts` › «apagar la disponibilidad corta el reparto y encenderla lo devuelve»; `rueda-por-rol.spec.ts` › «la dueña le quita y le pone web.cola.participar a un rol, y la rueda lo respeta al instante»; `supabase/tests/rueda-por-rol.sql`; `scripts/carreras/rueda.mjs` | escritorio, movil y base         | verde en los dos (base: `db:carreras` del completo y CI del PR)    |
| … el mismo dentro del plazo pegajoso                                                         | `fase-8-recorrido.spec.ts` › «E2E R4 el visitante que vuelve dentro del plazo recibe a la misma asesora»; `supabase/tests/rueda-por-rol.sql`                                                                                                                                                                                                                                                          | escritorio, movil y base         | verde en los dos (base: CI del PR)                                 |
| … y el respaldo cuando nadie está disponible                                                 | `fase-8-recorrido.spec.ts` › «E2E R5 con todas sin disponibilidad el visitante recibe el respaldo»; `rueda-por-rol.spec.ts` › «quien no recibe turnos conserva su leads.* y su perfil se lo dice»                                                                                                                                                                                                     | escritorio, movil y base         | verde en los dos (base: CI del PR)                                 |
| Un repuesto en «Recibido» cumple la espera del vehículo en «En taller»                       | `fase-8-recorrido.spec.ts` › «E2E R8 el repuesto que llega a «Recibido» cumple la espera del vehículo en «En taller»»; `repuestos-espera-recorrido.spec.ts` (3 pruebas); `areas/repuestos/esperas.sql`                                                                                                                                                                                                | escritorio, movil y base         | verde en los dos (base: CI del PR)                                 |
| El portal por HTTP (`api/portal/*`, cookie firmada, límite por IP)                           | `fase-8-recorrido.spec.ts` › «E2E R6 el cliente entra al portal por api/portal con el código que dio la ficha»; `portal-api.spec.ts` (6 pruebas, sólo escritorio); `leads-portal.spec.ts` (9); `supabase/tests/portal-cliente.sql`; `scripts/carreras/portal.mjs`                                                                                                                                     | escritorio, movil y base         | verde en los dos (base: `db:carreras` del completo y CI del PR)    |
| Guías publicadas y revalidar la web                                                          | `fase-8-recorrido.spec.ts` › «E2E R7 la guía publicada sale en web.guias y deja su etiqueta por revalidar»; `configuracion-web-guias.spec.ts` (3); `empresa-integracion-web.spec.ts` › «E2E escritorio · encender la web pública, guardar dirección y secreto, y probar»; `areas/web/{guias-publicar,revalidar,doc-html}.sql`                                                                         | escritorio, movil (R7) y base    | verde en los dos (base: CI del PR)                                 |
| Ajustes, FAQs, testimonios con consentimiento y legales                                      | `configuracion-web-{ajustes,faqs,testimonios,legales}.spec.ts` (5); `areas/web/{ajustes-guardar,faqs-permisos,testimonios-consentimiento,testimonios-permisos}.sql`                                                                                                                                                                                                                                   | escritorio y base                | verde (base: CI del PR)                                            |
| 8-1: la habilitada sin el permiso se ve aparte                                               | `cola-web-tablero.spec.ts` › «la habilitada cuyo rol no recibe turnos figura aparte, y la sin asignar arriba», «con el permiso en su rol, «Actualizar» la pasa a la rueda» y «habilitar desde «Agregar a la rueda» a quien su rol no recibe turnos lo avisa»                                                                                                                                          | escritorio                       | verde                                                              |
| Disponibilidad y ficha pública en `/perfil`                                                  | `perfil-disponibilidad.spec.ts` (3)                                                                                                                                                                                                                                                                                                                                                                   | escritorio y movil               | verde en los dos                                                   |
| Repuestos: proyectos, ítems, imágenes, stock, compras y margen, cotizador, pagos y catálogos | `repuestos-*.spec.ts` (10 sin el de la espera), `configuracion-repuestos-{catalogos,cotizador}.spec.ts`; `areas/repuestos/*.sql` (17); `scripts/carreras/{repuestos-stock,repuestos-cotizador}.mjs`; `src/modules/repuestos/entities/cotizador/*.test.ts` (5)                                                                                                                                         | escritorio, movil, unidad y base | verde en los dos (unidad y base: CI del PR; carreras: el completo) |
| Inicio: turnos y repuestos                                                                   | `web-turno.spec.ts` › «quien gestiona la cola no ve en su Inicio los turnos de otra persona»; `inicio-repuestos.spec.ts` (2)                                                                                                                                                                                                                                                                          | escritorio y movil               | verde en los dos                                                   |
| Ninguna clave `web.*` ni `repuestos.*` sin enforcement                                       | `supabase/tests/permisos-enforcement.sql` (sin excepciones)                                                                                                                                                                                                                                                                                                                                           | base                             | verde (base: CI del PR)                                            |
| Turnos de Inicio para un rol con sólo `web.cola.participar`                                  | R2 da `leads.crear` a las asesoras (D9 del 8.14-1)                                                                                                                                                                                                                                                                                                                                                    | —                                | hueco conocido: **8-14a**                                          |

### Cierre de la Fase 8

**Fase 8 cerrada el 2026-11-13** con el Nivel 3 del 8.14-2, corrido por proyecto (cada uno desde `db:reset` y `db:carreras`, 19,5 s y 23,5 s) sobre
`3179fc8e` (la rama con el recorrido y el 9.06): escritorio, 1.265 en verde, 17 saltadas y 0 caídas en 52,7 min (54,3 de reloj); celular, 879 en verde,
31 saltadas, 1 caída y 1 sin correr (el resto de su serial) en 37,2 min (38,6 de reloj). La caída no es de la fase ni del producto: en
`vehiculos-vitrina` › «con el permiso se publica con su precio…» el ingreso por interfaz del arranque quedó en `/ingreso` con la página en blanco (el
`POST /ingreso` respondió 200 y no redirigió); sola, 3 de 3 verdes en el celular: inestable, anotada y sin arreglar (`.piloto/salidas/8.14-2/triaje-*`).
Ninguna saltada nueva sin motivo (`saltadas.mjs 9c329195..HEAD`: 0); el celular suma R3 (`@sin-celular`). 5a-4b: los dos proyectos suman 92,9 min de
reloj (91,5 en el 7.14-2). El CI del PR (sobre `910befb2`, con la base: reset, tipos, `db:probar`, `db:lint` y advisors) en verde y `mapa.sh --check` en
verde. El recorrido (`e2e/fase-8-recorrido.spec.ts`, 8.14-1): R1, un visitante anónimo recibe asesora; R2, la asesora confirma el turno en dos toques
desde Inicio; R3, la tasa de contacto nueva en el tablero de la cola; R4, el mismo asesor dentro del plazo pegajoso; R5, el respaldo con todas sin
disponibilidad; R6, el portal por `api/portal` con el código de la ficha; R7, la guía publicada en `web.guias` con su etiqueta por revalidar; R8, el
repuesto en «Recibido» cumple la espera del vehículo en «En taller». Lo que deja: **8-05a**, **8-13a**, **8-13c** a **8-13f** y **8-14a** (los decide
la persona), **8-13b**, la IP real tras la reescritura (8.07-3) y la seguridad de 8.10-1 y de los pagos de repuestos («Pulido para la Fase 9»). La
«Partición» sigue aquí hasta que una sesión con permiso la pase a `docs/archivo/PLAN.md`.

### Partición

Un paso, su verificación y su PR; quién lo hace y de qué depende lo dice `docs/plan.yaml` (la tabla de «Carriles de las fases 5 a 9»). Cada fila dice qué entra, su assert y el lugar. Sus «Dudas» ya traen la opción recomendada: sin compuertas, **esa es la decisión**, y quien haga el paso la anota en `docs/DECISIONES.md` (el carril base) o en `docs/pasos/<paso>/decisiones.md`.

Áreas de `web`: `sitio`, `contenido`, `cola`, `turnos` (con la `rueda` que ya existe) y `portal`. Áreas de `repuestos`: `proyectos`, `items`, `stock`, `compras`, `cotizador`,
`catalogos`, `flujo`. Un área = `features/<área>/`, `entities/<área>/`, `infra/<área>/`, `areas/<área>/` (sus entradas) y `pantallas/<pantalla>.ts`; las tres entradas de la raíz
sólo reexportan áreas (el modelo de `cotizaciones`). **8.01 deja la base de `web` y 8.08 la de `repuestos`**; después cada paso agrega archivos propios.

- **8.01** (hecho el 2026-11-12; `docs/pasos/8.01-1/`, `8.01-2/`, `8.01-3/`, `8.01-4/`) — La base de `web`: áreas, `/configuracion/web` con huecos, lo que el contenido escribe por RPC y la pestaña «Ajustes». (1) Esqueleto por áreas: `index.ts`,
  `client.ts` y `composicion.ts` de `src/modules/web/` pasan a reexportar `areas/<área>/`; lo que hoy sale (`leerDireccionPublica`, `puedeEstarEnLaRueda`, `pantallas/perfil.ts`) no
  cambia de nombre. (2) Ruta `/configuracion/web` (`RUTAS.configuracionDeWeb`; también `RUTAS.configuracionDeColaWeb`, sin pantalla todavía) con su `seccion.ts` propia que
  `secciones.ts` importa (como `cotizacion/seccion.ts`), `pestanas.ts` (`ajustes` y `legales` con `web.ajustes.gestionar`; `guias`, `faqs`, `testimonios` con
  `web.contenido.gestionar`) y un archivo de hueco por pestaña (`pantallas/sitio-<pestaña>.ts`, nulo hasta su paso, como los `HUECOS_DE_*` de `cotizaciones/pantallas/`): una pestaña
  con el hueco nulo no se dibuja. (3) Migración `web_…`: `_web_doc_html(jsonb)` — valida un documento de ProseMirror contra una lista blanca (párrafo, títulos 2 y 3, listas, cita,
  negrita, cursiva, enlace `http/https/mailto/tel` con `rel`, salto, imagen sólo del bucket `web`; tope de bytes) y devuelve su HTML — con su espejo en
  `entities/contenido/doc.ts` y un archivo de casos que corre contra las dos (como `leads/entities/documento.casos.ts`); `web_guias.cuerpo_doc jsonb` y un trigger que deriva
  `cuerpo_html` y `minutos_lectura` del documento (lo que llegue en `cuerpo_html` se pisa); `web_ajustes_guardar(p_actualizado_en_esperado, p_cambios jsonb)` (`security definer`,
  `PT409`): las columnas del sitio piden `web.ajustes.gestionar`, las de la política de la cola (`cola_activa`, `ttl_contacto_minutos`, `dias_pegajoso`,
  `max_abiertas_default`, `max_intentos`) piden `web.cola.gestionar` **o** `web.ajustes.gestionar`; valida `redes` y `seo` (claves conocidas, `https`), `origenes_visibles` ⊂
  `origenes`, y `legales` como `{clave: {titulo, doc}}` que guarda con su `html` derivado; se quita el `UPDATE` directo de `ajustes_web` a `authenticated`;
  `web_testimonio_consentir(p_testimonio, p_canal, p_ciudad, p_vehiculo, p_foto)` y `web_testimonio_retirar(p_testimonio)` (ponen `consent_por = auth.uid()` y la fecha; retirar
  despublica), con las columnas `consent_*` fuera del `UPDATE` directo y un trigger que rechaza `publicado = true` sin el trío. (4) Pestaña «Ajustes»: nombre del sitio, lema,
  horario, WhatsApp de respaldo, redes, SEO, «Mostrar la moneda secundaria», **dirección pública** (`direccion_publica`, la que le faltaba pantalla) y **orígenes visibles** (los
  orígenes salen de `getOrigenes()` de `origenes`, compuestos por la página; apagar uno avisa con conteo acotado cuántos vehículos publicados dejan de verse); formulario en
  `<Bloque>`, borrador en `sessionStorage`, conflicto con `<AvisoDeConflicto>`, los cinco estados de `docs/UX.md`. No entra: legales (8.03), cola (8.04), revalidar (8.06). Cierra
  el arrastrado «`ajustes_web.direccion_publica` no tiene pantalla». **Assert:** `supabase/tests/areas/web/doc-html.sql` + `entities/contenido/doc.test.ts` (mismos casos en SQL y
  TS; `<script>`, `javascript:` y una imagen de otro host nunca salen en el HTML); `areas/web/ajustes-guardar.sql` (42501 sin permiso; quien sólo tiene `web.cola.gestionar` cambia
  la política y nada más; `PT409`; origen inexistente; un `update` directo de `ajustes_web` o de `web_guias.cuerpo_html` no deja HTML ajeno en `web.guias` ni en `web.ajustes`);
  `areas/web/testimonios-consentimiento.sql` (publicar sin el trío falla; `consent_por` no se escribe directo; tras retirar, `web.testimonios` no lo trae);
  `areas/web/guias-publicar.sql` (hoy `web_guia_publicar_validar` no tiene prueba: con `web.contenido.gestionar` y sin `web.guias.publicar`, poner o quitar `publicada_en` da 42501);
  `permisos-enforcement.sql` y `humo.sql` al día; `e2e/configuracion-web-ajustes.spec.ts` (camino feliz: guardar lema y dirección pública, apagar un origen y ver el aviso;
  `// @sin-celular-archivo`). Lugar: `src/modules/web/` (raíz, `areas/`, `entities/contenido/`, `features/sitio/`, `infra/sitio/`, `pantallas/sitio-*.ts`),
  `src/app/(app)/configuracion/web/`, `src/app/(app)/configuracion/secciones.ts`, `src/shared/lib/rutas.ts`, `supabase/migrations/`, `supabase/tests/areas/web/`. Nivel **2**
  (`src/shared` y columna nueva). Tipo: datos y dinero. Partes estimadas: 4.
  Dudas, con la recomendada: (1) ¿HTML derivado en la base o saneado en el servidor de Next? Recomiendo **en la base** (lista blanca del documento, como los seguimientos): cierra el camino de PostgREST directo y no pide dependencia nueva; sanear en Next pediría `sanitize-html` (compuerta `dependencia`, va a la persona) y deja la base abierta. (2) Forma de `legales`: recomiendo `{terminos: {titulo, doc, html, actualizado_en}, privacidad: {…}}`; es contrato con el repo del sitio y va a `docs/DECISIONES.md`. (3) ¿Quién cambia la política de la cola? Recomiendo cualquiera de los dos permisos (arriba): hoy quien administra la cola no puede tocar su propio plazo.

- **8.02** (hecho el 2026-11-12; `docs/pasos/8.02-1/`, `8.02-2/`) — FAQs y testimonios con consentimiento. `/configuracion/web?seccion=faqs` y `?seccion=testimonios` (`web.contenido.gestionar`); llena sus dos huecos. FAQs: lista con
  `<ListaDeCatalogo>` (orden con botones), alta y edición en `<Drawer>` con URL (`?panel=faq&faq=<id>`), categoría (texto con las ya usadas como sugerencia), interruptor
  «Publicada», eliminar con `<Confirmar>` con URL. Testimonios: lista, alta y edición (cliente, ciudad, texto, vehículo, foto al bucket `web` en WebP ≤ 1600 px y por hash),
  «Registrar consentimiento» (canal y qué datos autorizó: ciudad, vehículo, foto) por `web_testimonio_consentir`, «Retirar consentimiento» (`<Confirmar>` que nombra al cliente;
  despublica) y «Publicado» **deshabilitado con el motivo «Falta registrar el consentimiento.»** mientras no esté el trío. Escritura por Server Actions sobre las policies que
  existen (B:27313–27363) con `actualizado_en` esperado (0 filas = conflicto). Son listas de configuración (decenas): se leen con `limit` tope + 1 y `<AvisoDeTope>`, sin cursor ni
  volumen. Estados: los cinco de `docs/UX.md`. No entra: vincular el testimonio a un lead (`lead_id` queda nulo; se anota en la ficha), vista previa con el diseño del sitio.
  **Assert:** `e2e/configuracion-web-faqs.spec.ts` (crear y publicar → la trae `web.faqs` leída como `anon`; despublicar → no) y
  `e2e/configuracion-web-testimonios.spec.ts` (crear → «Publicado» apagado con su motivo → registrar consentimiento sólo de ciudad → publicar → `web.testimonios` trae ciudad y no
  vehículo → retirar → desaparece); los dos `// @sin-celular-archivo`. Lugar: `src/modules/web/features/contenido/{faqs,testimonios}/`, `infra/contenido/`,
  `pantallas/sitio-faqs.ts`, `pantallas/sitio-testimonios.ts`, `src/app/(app)/configuracion/web/seccion-{faqs,testimonios}.tsx`. Nivel **1**. Tipo: pantalla. Partes estimadas: 2.
  Dudas, con la recomendada: ¿la categoría de una FAQ es texto libre o catálogo? Recomiendo texto libre con sugerencias (la columna es `text` y la vista la expone tal cual).

- **8.03** (hecho el 2026-11-12; `docs/pasos/8.03-1/`, `8.03-2/`) — Guías, categorías y legales con el editor. `/configuracion/web?seccion=guias`: lista (título, categoría, autor, estado «Borrador», «Programada» o «Publicada»; búsqueda
  por título con `MINIMO_DE_BUSQUEDA`; `limit` tope + 1 y `<AvisoDeTope>`). `/configuracion/web/guias/[id]` (página propia: es un segundo nivel, no un modal): el editor Tiptap
  **propio del área** en `features/contenido/editor/` (no importa el de `leads`; viaja con `diferido()`), con barra de títulos, listas, cita, negrita, cursiva, enlace e imagen
  (sube al bucket `web`); título, `slug` (se deriva del título y se puede editar; el `23505` de `web_guias_slug_key` se dice junto al campo), resumen, categoría, autor (una persona
  del equipo), portada, SEO; guarda `cuerpo_doc` con `actualizado_en` esperado y borrador en `sessionStorage`; «Publicar», «Programar» (fecha en `publicada_en`) y «Despublicar»,
  **deshabilitados con «Tu rol no publica guías.»** sin `web.guias.publicar` (la base ya lo exige, B:19662); eliminar con `<Confirmar>` con URL. Categorías en un `<Drawer>`
  (`?panel=categorias`) con `<ListaDeCatalogo>`: crear, renombrar, ordenar, desactivar; borrar sólo sin guías. «Legales» (`?seccion=legales`, `web.ajustes.gestionar`): los
  documentos de `ajustes_web.legales`, cada uno con el mismo editor, guardados por `web_ajustes_guardar`. No entra: versiones de una guía, vista previa con el diseño del sitio,
  importar HTML. **Assert:** `e2e/configuracion-web-guias.spec.ts` (crear con un título, una lista y un enlace → guardar → publicar → `web.guias` como `anon` trae `<h2>`, `<ul>`
  y el `<a rel=…>`; con `web.contenido.gestionar` y sin `web.guias.publicar`, «Publicar» apagado con su motivo) y `e2e/configuracion-web-legales.spec.ts` (guardar «Términos» →
  `web.ajustes.legales` lo trae). Los specs, `// @sin-celular-archivo`; el 42501 de publicar ya lo prueba 8.01. Lugar: `src/modules/web/features/contenido/{guias,categorias,legales,editor}/`, `infra/contenido/`, `pantallas/sitio-guias.ts`, `pantallas/sitio-legales.ts`,
  `pantallas/guia.ts`, `src/app/(app)/configuracion/web/seccion-{guias,legales}.tsx`, `src/app/(app)/configuracion/web/guias/[id]/`. Nivel **1**. Tipo: pantalla. Partes estimadas: 4.
  Dudas, con la recomendada: (1) ¿Qué documentos legales? Recomiendo dos fijos, «Términos y condiciones» (`terminos`) y «Política de privacidad» (`privacidad`): es lo que un sitio necesita y otro más es una clave nueva. (2) ¿Programar una publicación? Recomiendo sí: `web.guias` ya filtra `publicada_en <= now()` y no cuesta base.

- **8.04** (hecho el 2026-11-12; `docs/pasos/8.04-1/`, `8.04-2/`, `8.04-3/`) — Cola web: el tablero, la política y habilitar (8-1). Ruta `/configuracion/cola-web` (`web.cola.gestionar`), con su `seccion.ts` registrada en `secciones.ts`. Parte de
  base (migración `cola_web_…`): `cola_web_tablero()` (`security definer`, `assert_permiso('web.cola.gestionar')`, tope con `_acotar_pagina`): **todas** las habilitadas de
  `cola_web_asesores` con `en_la_rueda` (`puede_estar_en_la_rueda`), si les falta `whatsapp_web`, disponible, prioridad, orden, cupo, abiertas, totales y tasa de contacto — la
  lectura propia que 8-1 pide, sin pasar por `estado_cola_web`; `cola_web_solicitudes(p_estado, p_cursor, p_tamano)` por cursor `(creado_en desc, id)` con el índice nuevo
  `solicitudes_contacto_web (estado, creado_en desc, id)`, registrada en `scripts/guardas/areas-<carril>/paginas-en-la-base.ts`; el job
  `cron.schedule('web-expirar-solicitudes', '*/5 * * * *', 'select public.web_expirar_solicitudes()')`. Pantalla: arriba «Sin asignar» **destacado** (conteo acotado y la lista por
  cursor de las `sin_asignar`, con fuente, vehículo y hora; aviso si falta el WhatsApp de respaldo); la rueda (persona, disponible, abiertas de cupo, prioridad, tasa de contacto,
  vencidas, última asignación); aparte, el grupo **«Habilitada, pero su rol no recibe turnos de la web»**; «Agregar a la rueda» (busca en el equipo con su mínimo de letras; drawer
  con cupo —vacío hereda el de la política—, prioridad y orden, por `cola_web_configurar`), y al habilitar a quien no tiene el permiso, el aviso «Quedó habilitada, pero su rol no
  recibe turnos de la web.» con enlace a Roles (se sabe releyendo `puede_estar_en_la_rueda`); «Quitar de la rueda» con «Deshacer»; el formulario de la política (activa, minutos
  para contactar, días del pegajoso, cupo por defecto, intentos) por `web_ajustes_guardar`. Sin realtime: «Actualizar» y relectura al volver el foco. No entra: asignar a mano una
  `sin_asignar` (no hay RPC y el visitante ya fue al respaldo), realtime (Fase 7). Cierra **8-1** y el arrastrado «el job `web_expirar_solicitudes` se programa con esta fase».
  **Assert:** `supabase/tests/areas/cola/tablero.sql` (42501 sin `web.cola.gestionar`; habilitada sin el permiso → fila con `en_la_rueda = false`; con el permiso → `true`; quien no
  gestiona no lee solicitudes ajenas), un caso en `supabase/tests/jobs.sql` (el job existe y su comando no lleva URL), y `e2e/cola-web-tablero.spec.ts` (rol sin el permiso y
  habilitada: su fila y el texto; con el permiso: entra en la rueda; habilitar sin el permiso avisa; `// @sin-celular-archivo`). Lugar: `src/modules/web/features/cola/`,
  `entities/cola/` (espejo documentado del orden de la ruleta, con test), `infra/cola/`, `pantallas/cola.ts`, `src/app/(app)/configuracion/cola-web/`, `supabase/`. Nivel **2**
  (índice nuevo). Tipo: datos y dinero. Partes estimadas: 3.
  Dudas, con la recomendada: ¿la persona se busca con la lista del equipo o con un selector propio? Recomiendo componer en la página la lectura que `equipo` ya expone (`leerEquipo`, con su mínimo de búsqueda): `web` no lee tablas de `equipo`.

- **8.05** (hecho el 2026-11-12; `docs/pasos/8.05-1/`, `8.05-2/`) — La tarjeta de turno, la disponibilidad y la ficha pública en `/perfil`, y el bloque de Inicio. `<TarjetaTurno>` (`features/turnos/`): código `#WEB-XXXX`, fuente,
  vehículo (el título sale de `web.vehiculos`, que ya es público), cuenta regresiva a `vence_en` y «Vencido» al pasar; **«Contacté»** (`web_confirmar_contacto(p_solicitud)`) y
  **«Vincular a lead»** (`<Drawer>` `?panel=vincular-turno&turno=<id>` con el buscador de leads que `leads` da por un archivo nuevo `leads/pantallas/turno.ts`, a partir de
  `features/panel-para-cotizar/components/buscador-de-clientes.tsx`, y «Crear lead» adentro con `<AltaDeLead>`; al elegir, `web_confirmar_contacto(p_solicitud, p_lead)`). Bloque
  «Turnos de la web sin confirmar» de Inicio: mis turnos `asignada` y `vencida`, por `vence_en`, leídos bajo RLS (`usuario_id = auth.uid()`, índice
  `solicitudes_contacto_web_usuario_id_idx`) con tope + 1 y `<AvisoDeTope>`; `<Bandeja>` pasa a recibir el contenido de cada bloque por una prop que arma
  `src/app/(app)/_inicio/bloques.tsx` (una línea por bloque; si la Fase 6 ya lo hizo, se suma la suya). En `/perfil`, la sección «Turnos de la web» gana el **interruptor
  «Disponible para recibir turnos»** (`<Interruptor>`; action que escribe sólo `cola_web_asesores.disponible` de la propia fila), deshabilitado con «Tu rol no recibe turnos de la
  web.» sin `web.cola.participar` y con «Quien administra la cola todavía no te sumó a la rueda.» si no está habilitada; y el bloque «Tu ficha en la web»: WhatsApp (obligatorio
  para recibir turnos; formato `+…`), identificador (`handle`, único), cargo, presentación, especialidades y «Aparecer en la web» (`publico_web`). Sale por `pantallas/turno.ts`
  (`TarjetaTurno`) y por `index.ts` (`leerMisTurnos`, `confirmarContacto`) para la campana de la Fase 7. No entra: la campana, el push y el realtime (Fase 7; mientras, el bloque
  relee al volver el foco). Cierra el arrastrado del interruptor de disponibilidad. **Assert:** `e2e/web-turno.spec.ts`, **también en `movil`**: el spec habilita a la asesora por
  SQL, llama `web.solicitar_asesor` como `anon` → Inicio muestra la tarjeta → «Contacté» en **≤ 2 toques** contados → la tarjeta se va y `contactadas_total` sube 1; segunda
  prueba, «Vincular a lead» deja `lead_id` y `senal_contacto = 'lead'`. `e2e/perfil-disponibilidad.spec.ts`: apagar → `web.solicitar_asesor` ya no le reparte → encender; con un
  rol sin el permiso, el interruptor apagado con su motivo. `entities/turnos/cuenta-regresiva.test.ts`. Lugar: `src/modules/web/features/{turnos,rueda}/`, `entities/turnos/`,
  `infra/turnos/`, `pantallas/{turno,perfil,inicio}.ts`, `src/modules/leads/pantallas/turno.ts`, `src/modules/tablero/features/bandeja/`, `src/app/(app)/page.tsx`,
  `src/app/(app)/_inicio/`, `src/app/(app)/perfil/page.tsx`. Nivel **1**. Tipo: pantalla. Partes estimadas: 4.
  Dudas, con la recomendada: (1) ¿Dónde vive la tarjeta sin la campana? Recomiendo el bloque de Inicio (ya declarado) y dejarla exportada: la Fase 7 la monta en la campana sin tocar `web`. (2) ¿«Aparecer en la web» lo decide la persona? Recomiendo sí: la base ya le da esa columna (B:30203) y quien administra el equipo también puede. (3) «Contacté» no tiene vuelta atrás en la base: recomiendo sin «Deshacer» y sin confirmación (son los 2 toques); vincular después sigue disponible desde la tarjeta contactada del día.

- **8.06** (hecho el 2026-11-11; `docs/pasos/8.06-1/`, `8.06-2/`) — Revalidar la web pública y encender la integración «Web pública». Migración `web_revalidar_…`: tabla `interno.web_revalidar_pendiente(etiqueta, pedido_en)` (una
  fila por etiqueta); triggers **por sentencia** que anotan su etiqueta en `web_guias` y `web_categorias_guias` (`guias`), `web_faqs` (`faqs`), `web_testimonios`
  (`testimonios`), `ajustes_web` y `ajustes_empresa` (`ajustes`), `perfiles` y `cola_web_asesores.orden` (`asesores`), `vehiculos`, `vehiculos_imagenes`, `fases`, `origenes`,
  `origenes_campos` e `integraciones` (`vehiculos`); `web_revalidar_correr()` (`security definer`, sólo `service_role`): si `web_publica` está activa y tiene
  `config.revalidar_url`, un `net.http_post` con `{etiquetas: […]}` y el secreto de Vault (`integracion:web_publica`) en una cabecera, y vacía lo enviado; job
  `web-revalidar` cada minuto (sin URL en el comando). `integracion_guardar` valida `revalidar_url` (`https`). Interfaz en `empresa` (Empresa › Integraciones, el patrón de
  `config-apibara.tsx`): tarjeta «Web pública» con el interruptor (avisa con conteo acotado cuántos vehículos publicados empiezan o dejan de verse), la dirección de revalidación,
  el secreto (se guarda con `integracion_guardar_secreto`, no se vuelve a mostrar) y «Probar» (una Server Action hace el POST y dice el código de respuesta). El contrato con el
  repo del sitio (método, cabecera, etiquetas) va a `docs/DECISIONES.md` y a la ficha de `web`. No entra: el receptor (es del otro repo). **Assert:**
  `supabase/tests/areas/web/revalidar.sql` (dos cambios de FAQs dejan **una** fila `faqs`; con la integración apagada o sin URL, correr no pide nada y no pierde lo pendiente; el
  pedido lleva el secreto en la cabecera, nunca en el cuerpo ni en `cron.job.command`; `authenticated` y `anon` no ejecutan `web_revalidar_correr`; cambiar la fase de un vehículo
  publicado anota `vehiculos`), caso en `jobs.sql`, y `e2e/empresa-integracion-web.spec.ts` (encender, guardar dirección y secreto, «Probar» contra un servidor HTTP que levanta
  el propio spec; `// @sin-celular-archivo`). Lugar: `supabase/`, `src/modules/empresa/features/integraciones/`, `src/modules/empresa/entities/integraciones.ts`,
  `src/shared/config/esquemas.ts`, `.env.example`, `docs/ENTORNOS.md`, `src/modules/web/CLAUDE.md`. Nivel **2** (tabla nueva y `src/shared`). Tipo: datos y dinero. Partes
  estimadas: 3.
  Dudas, con la recomendada: (1) ¿Dónde vive la URL? Recomiendo **sólo en la integración** (`integraciones.config` + Vault) y quitar `WEB_PUBLICA_REVALIDAR_URL/_SECRETO` de `esquemas.ts`, `.env.example` y `docs/ENTORNOS.md`: la base es la que dispara y no lee variables de Vercel; dos casas se desincronizan. (2) ¿Disparo directo o cola con job? Recomiendo la cola: una limpieza o una baja tocan miles de vehículos y serían miles de POST; con la cola es uno por minuto y etiqueta.

- **8.07** (hecho el 2026-11-12; `docs/pasos/8.07-1/`, `8.07-2/`, `8.07-3/`) — El portal del cliente por HTTP: `api/portal/*` con cookie firmada y límite por IP. Route handlers en `src/app/api/portal/`: `POST ingresar` (`{codigo, clave}`),
  `GET estado`, `GET documentos/[id]`, `POST clave`, `POST salir`. Cada uno valida con Zod (ids con `z.guid()`), exige `Origin` propio o el de `ajustes_web.direccion_publica` en
  los POST, y usa `createAdminClient()` **sólo** para `web.portal_*`. `ingresar`: primero el límite por IP; después `web.portal_login`; todo fallo responde el mismo 401 con el
  mismo cuerpo; el éxito deja la cookie `portal` (`HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/api/portal`) firmada con HMAC-SHA256 de `node:crypto` sobre
  `{lead_id, otorgado_en, exp}`. `estado`: `web.portal_snapshot(lead, otorgado_en)`; si vuelve nulo (acceso revocado o vuelto a otorgar), 401 y borra la cookie. `documentos/[id]`:
  `web.portal_documento_ruta` → `createSignedUrl` de 60 s → 302; la `ruta` nunca sale. `clave`: `web.portal_cambiar_clave`. Migración `portal_…`: `interno.portal_intentos`
  (huella = sha256 de la IP con una sal de Vault, ventana y cuenta: la IP no se guarda) y `web.portal_intento(p_huella) returns boolean` sólo para `service_role` (10 por 15 min;
  al pasar, 429 con `Retry-After`), con su purga en un job. `PORTAL_COOKIE_SECRETO` (≥ 32 caracteres) entra opcional a `src/shared/config/esquemas.ts`, `.env.example` y
  `docs/ENTORNOS.md`: sin ella los handlers responden 503 y nada más se rompe. `esRutaPublica()` de `src/shared/lib/rutas.ts` deja pasar `/api/portal/` (el proxy no la manda a
  `/ingreso`). `.claude/rules/acciones.md` deja de nombrar `jose`. Cierra los arrastrados «`api/portal/*`, la cookie con `otorgado_en`, el límite por IP y el ingreso según el
  contrato». No entra: las pantallas del portal (repo del sitio), el texto del portal por empresa (Fase 9). **Assert:** `src/modules/web/infra/portal/cookie.test.ts` (firma,
  vencimiento, un byte cambiado la invalida, `otorgado_en` viaja); `supabase/tests/areas/portal/limite-por-ip.sql` (el intento 11 da `false`, otra huella no; `anon` y
  `authenticated` no ejecutan; `privilegios-de-anon.sql` sigue verde); `e2e/portal-api.spec.ts` con `request` (`// @sin-celular-archivo`: no tiene interfaz): otorgar →
  clave mala y código inexistente dan la **misma** respuesta → clave buena: 200 y cookie `HttpOnly` → `estado` trae los vehículos sin VIN completo → «Volver a otorgar» → la cookie
  vieja da 401 → un documento responde 302 a una URL firmada → el intento 11 da 429. Lugar: `src/app/api/portal/`, `src/modules/web/{infra,entities,areas}/portal/`,
  `src/shared/lib/rutas.ts`, `src/shared/config/esquemas.ts`, `supabase/`. Nivel **2** (`src/shared` y tabla nueva). Tipo: datos y dinero. Partes estimadas: 3.
  Dudas, con la recomendada: (1) ¿`jose` o `node:crypto`? Recomiendo `node:crypto`: firma lo mismo sin paquete nuevo (un paquete abre la compuerta `dependencia`, que detiene el paso hasta la persona). (2) El sitio está en otro dominio: ¿CORS con cookie de terceros o que el sitio reescriba `/api/portal/*` hacia el CRM? Recomiendo la reescritura: la cookie queda de primera parte y `SameSite=Lax` alcanza; se anota como contrato en `docs/DECISIONES.md`. (3) Duración de la sesión: recomiendo 7 días; revocar o volver a otorgar la corta antes por `otorgado_en`.

- **8.08** (hecho el 2026-11-12; `docs/pasos/8.08-1/`, `8.08-2/`, `8.08-3/`) — La base de `repuestos`, sus áreas y los catálogos. (1) Migración `repuestos_…`: `repuesto_proyecto_crear(p_id, p_datos)` (de un vehículo que quien crea ve, o
  externo; el `23505` de `repuestos_proyecto_por_vehiculo` se vuelve «Ese vehículo ya tiene un proyecto»), `repuesto_proyecto_cerrar` / `_reabrir` y `repuesto_proyecto_eliminar`
  (sólo sin ítems); `repuesto_item_crear(p_id, p_proyecto, p_datos)` (nace en la fase inicial del flujo de repuestos si no hay nada que decidir, con su fila en
  `historial_fases`, como `vehiculo_crear`) y `repuesto_item_eliminar(p_item)` (sólo sin historial más allá del nacimiento, sin documentos ni compras; si no, 23514 con «Pásalo a
  stock o márcalo perdido.»); **se quita el INSERT directo de `repuestos_items`** (hoy admite `fase_id` y `stock_cantidad`) y el `UPDATE` directo de `eliminado_en`, `cerrado_en` y
  `vehiculo_id` de proyectos; `repuestos_proyectos_listar(p_cursor, p_tamano, p_q, p_estado)` por cursor sobre `numero desc` (`repuestos_proyectos_numero_key`), con el estado
  derivado de sus ítems, `_acotar_pagina` y registro en `paginas-en-la-base`; `repuestos_pendientes_de_vehiculo(p_vehiculo)` (los ítems vivos que una espera del vehículo todavía
  aguarda; pide `repuestos.ver` o `logistica.ver`); y **`evaluar_requisitos` corregida**: en la espera a hijos no cuentan los ítems que terminaron en una fase final sin llegar a
  la esperada (hoy un «Perdido» frena al vehículo para siempre), y `detalle` suma `sin_llegar`. (2) Esqueleto por áreas de `src/modules/repuestos/` y `RUTAS.repuestos` y
  `RUTAS.configuracionDeRepuestos`. (3) `/configuracion/repuestos` (`repuestos.configurar`), con `seccion.ts` propia, `pestanas.ts` («Catálogos», y el hueco «Cotizador» para 8.12)
  y la pestaña «Catálogos»: cuatro `<ListaDeCatalogo>` (tipo de pieza, condición, vía de transporte, país de origen): crear, renombrar, ordenar y desactivar sobre las policies
  que existen (B:26852–26864); borrar sólo sin uso (el FK deja nulo el ítem); `duplicado` junto al campo. No entra: `/repuestos` (8.09), stock (8.10). **Assert:**
  `supabase/tests/areas/repuestos/base.sql` (el ítem nace en la inicial con historial; INSERT directo → 42501; eliminar con compras → rechazado con su motivo; sin `repuestos.ver`
  no se lee nada; ninguna lectura de ítems o proyectos trae un costo) y `areas/repuestos/esperas.sql` — **el «Terminado cuando» de la fase, por SQL**: vehículo en «En taller» con
  una espera a «Recibido» y dos ítems: con uno en «En tránsito» `previsualizar_cambio_fase` dice que falta; al llegar a «Recibido» cumple; uno «Perdido» no frena y sale en
  `sin_llegar`; uno en stock no cuenta; `e2e/configuracion-repuestos-catalogos.spec.ts` (`// @sin-celular-archivo`). Lugar: `supabase/`, `src/modules/repuestos/` (raíz, `areas/`,
  `features/catalogos/`, `infra/catalogos/`, `pantallas/configuracion.ts`), `src/app/(app)/configuracion/repuestos/`, `src/app/(app)/configuracion/secciones.ts`,
  `src/shared/lib/rutas.ts`. Nivel **2** (`src/shared`; policies de escritura que se quitan). Tipo: datos y dinero. Partes estimadas: 4.
  Dudas, con la recomendada: (1) ¿El ítem perdido frena al vehículo? Recomiendo que no (lo dice la ficha y es la única salida de un vehículo cuyo repuesto no llega); la migración cambia una función de `flujos`: se avisa en su ficha. (2) ¿Borrar un proyecto? Recomiendo sólo vacío y con «Deshacer»; con ítems, «Cerrar». (3) `repuestos_catalogos.datos` (jsonb) no tiene uso definido: recomiendo no dibujarlo.

- **8.09** (hecho el 2026-11-12; `docs/pasos/8.09-1/`, `8.09-2/`, `8.09-3/`, `8.09-4/`, `8.09-5/`) — Proyectos e ítems: `/repuestos` y `/repuestos/[id]` con la hoja. `/repuestos` (`repuestos.ver`; enciende `disponible` en `_shell/navegacion.ts`): listado con el
  patrón de `shared/ui/lista` (número, vehículo o «Externo», cliente, estado derivado, última actividad), búsqueda en la URL (`?q=`, mínimo 3), filtro abiertos o cerrados,
  **por cursor** con `repuestos_proyectos_listar`, `TAMANOS_DE_PAGINA` y su `MAXIMO_DE_PAGINA_DE_REPUESTOS`; «Nuevo proyecto» (`N`; `<Drawer>` `?panel=nuevo-proyecto`): de un
  vehículo (el buscador del inventario de `vehiculos`, compuesto por la página) o externo (etiqueta, VIN, cliente o lead). `/repuestos/[id]`: cabecera (número, vehículo con enlace,
  cliente, «Cerrar proyecto»), `pestanas.ts` con huecos («Ítems»; «Compras» para 8.11; «Cotizaciones» para 8.12) y la **hoja de ítems** editable celda a celda con `XCell`
  (descripción, tipo de pieza, condición, país, vía, cantidad, precio al cliente con `<Monto>` y moneda, tracking, notas; la fase, un `<Badge>` de sólo lectura), fila nueva al
  final (`repuesto_item_crear`), guardado por celda con `actualizado_en` esperado y `<AvisoDeConflicto>`, todo de sólo lectura sin `repuestos.editar`; eliminar ítem con
  `<Confirmar>` con URL (o su motivo). Los ítems de un proyecto se leen con tope 200 + 1 (`repuestos_items_proyecto_id_idx`) y `<AvisoDeTope>`. Imágenes del ítem
  (`?panel=imagenes&item=<id>`): `<ZonaDeArchivos>`, WebP ≤ 1600 px, por hash, bucket `repuestos`, hasta 8, borrar por refcount. En `/vehiculos/[id]`, `<ResumenRepuestos>`
  (`pantallas/vehiculo.ts`): sin proyecto, «Crear proyecto de repuestos»; con él, enlace y cuántos ítems por fase; `index.ts` da `proyectoDe(vehiculoId)`. Estados: los cinco.
  No entra: mover de fase y documentos del ítem (8.13), stock (8.10), compras (8.11), cotizaciones (8.12). **Assert:** `e2e/repuestos-proyecto.spec.ts` (crear un proyecto externo
  → dos ítems sólo con el teclado → cambiar un precio → recargar y siguen; con `repuestos.ver` y sin `repuestos.editar`, la hoja no deja editar; desde la ficha de un vehículo,
  «Crear proyecto de repuestos» lo abre ya vinculado) y `entities/proyectos/estado.test.ts` (el estado derivado). Lugar: `src/modules/repuestos/features/{proyectos,items}/`,
  `entities/{proyectos,items}/`, `infra/{proyectos,items}/`, `pantallas/{listado,proyecto,vehiculo}.ts`, `src/app/(app)/repuestos/`, `src/app/(app)/_shell/navegacion.ts`,
  `src/app/(app)/vehiculos/[id]/page.tsx`. Nivel **2** (`_shell`). Tipo: pantalla. Partes estimadas: 4.
  Dudas, con la recomendada: (1) La ficha pide una XCell «compacta» que `shared/ui/xcell` no tiene: recomiendo usar la XCell como está (sin tocar `src/shared`) y anotar la densidad en «Pulido para la Fase 9». (2) Tope de imágenes por ítem: recomiendo 8 (un repuesto no es un vehículo, que lleva 24).

- **8.10** (hecho el 2026-11-12; `docs/pasos/8.10-1/`, `8.10-2/`, `8.10-3/`) — Stock y movimientos. Parte de base (migración `repuestos_stock_…`): `repuesto_stock_mover(p_item, p_cantidad, p_motivo, p_stock_esperado)` (candado `for update`,
  nunca negativo, inserta el movimiento y fija o limpia `en_stock_desde`; `PT409` si el stock cambió) y `repuesto_stock_reasignar(p_item, p_proyecto_destino, p_cantidad)` (todo o
  nada: descuenta y crea el ítem en el destino); se quitan el INSERT directo de `repuestos_stock_movimientos` y el `UPDATE(en_stock_desde)` (hoy cualquiera con
  `repuestos.editar` saca un ítem de la espera de su vehículo con un `update`); `repuestos_stock_listar(p_cursor, p_tamano)` **por cursor** con el índice parcial nuevo
  `repuestos_items (en_stock_desde desc, id) where en_stock_desde is not null and eliminado_en is null`, en el registro de páginas. `entities/stock/`: las reglas del sobrante
  (reasignar, vender suelto, devolver, ajuste) y los motivos, con test. Pantalla: en la hoja del proyecto, «Pasar a stock» (cantidad y motivo); la vista «Stock» de `/repuestos`
  (`?vista=stock`: ítem, proyecto de origen, cantidad, desde cuándo) con «Reasignar a un proyecto», «Vender suelto» y «Devolver»; el historial de movimientos del ítem con «Ver
  más» (`TAMANO_DE_VER_MAS`, `repuestos_stock_movimientos_item_id_idx`). **Assert:** `supabase/tests/areas/repuestos/stock.sql` (no queda negativo; INSERT y `UPDATE` directos →
  42501; reasignar es todo o nada; un ítem en stock no cuenta para la espera), `scripts/carreras/repuestos-stock.mjs` (dos salidas a la vez no dejan stock negativo),
  `entities/stock/reglas.test.ts`, `e2e/repuestos-stock.spec.ts` (pasar 2 a stock → aparecen en «Stock» → reasignar 1 a otro proyecto → queda 1 y hay un ítem nuevo allá). Lugar:
  `src/modules/repuestos/{features,entities,infra}/stock/`, `pantallas/stock.ts`, `scripts/carreras/`, `supabase/`. Nivel **2** (índice nuevo). Tipo: datos y dinero. Partes
  estimadas: 3.
  Dudas, con la recomendada: ¿«Vender suelto» registra un precio? Recomiendo que no en esta fase: es un movimiento con motivo y nota (la tabla no tiene monto); el cobro es un pago del proyecto (8.13).

- **8.11** (hecho el 2026-11-12; `docs/pasos/8.11-1/`, `8.11-2/`, `8.11-3/`) — Compras y margen, con el permiso de costos. Parte de base (migración `repuestos_compras_…`): `repuesto_compra_guardar(p_id, p_datos, p_actualizado_en_esperado)`
  (`repuestos.costos.editar`; la base pone `tipo_cambio_aplicado` y `monto_base` con el tipo de cambio por defecto vigente: hoy los escribe el cliente),
  `repuesto_compra_eliminar` (borrado lógico), sin INSERT ni `UPDATE` directos; `repuestos_proyecto_margen(p_proyecto)` (`assert_permiso('repuestos.costos.ver')`): por moneda,
  Σ precios de ítems − Σ compras, y **nulo, no 0**, si falta el precio de algún ítem. Pantalla: la pestaña «Compras» de `/repuestos/[id]`, que **sólo existe con
  `repuestos.costos.ver`** (sin él no se dibuja y `?seccion=compras` cae en «Ítems»): lista (proveedor, ítem, monto con `<Monto>`, fecha, comprobante), registrar y editar en
  `<Drawer>` (`repuestos.costos.editar`; sin él, apagado con motivo), comprobante al bucket `comprobantes` sin comprimir y por hash, y el margen del proyecto («Sin precio en N
  ítems» cuando es nulo; Modo Live lo oculta). No entra: los pagos del cliente del proyecto (su componente es de `logistica`, Fase 6; van en 8.13). **Assert:**
  `supabase/tests/areas/repuestos/compras.sql` (sin `repuestos.costos.ver`: 0 compras y 42501 en el margen; `monto_base` lo pone la base aunque el cliente mande otro),
  `entities/compras/margen.test.ts` (por moneda; nulo ≠ 0), `e2e/repuestos-compras.spec.ts` (con costos: registrar una compra y ver el margen; sin costos: la pestaña no está).
  Lugar: `src/modules/repuestos/{features,entities,infra}/compras/`, `pantallas/compras.ts`, `supabase/`. Nivel **2** (cambia policies de escritura). Tipo: datos y dinero. Partes
  estimadas: 3.
  Dudas, con la recomendada: ¿Con qué tipo de cambio se pasa a la moneda base? Recomiendo el por defecto vigente al guardar, congelado en la fila (`tipo_cambio_aplicado`), como hace `pagos`.

- **8.12** (hecho el 2026-11-12; `docs/pasos/8.12-1/`, `8.12-2/`, `8.12-3/`, `8.12-4/`, `8.12-ci/`) — El cotizador de repuestos: configuración, hoja y aceptar. (1) `entities/cotizador/`: importado = costo × `factor_importado` + logística + caja; local = (costo +
  logística + caja) × (1 + `recargo_local`); por cantidad y con el `redondeo` del snapshot; la logística sugerida sale del tramo de su moneda (`costo_min ≤ costo < costo_max`) y
  **por encima del último tramo no hay sugerencia** (la celda pide el monto con `emptyLabel`, no asume 0); aritmética decimal, nunca `float`; un archivo de casos compartido con
  la base. (2) Migración `repuestos_cotizador_…`: `repuestos_cotizacion_crear(p_id, p_proyecto, p_moneda)` (congela en `config_snapshot` la configuración vigente —la de id más
  alto—, los tramos y las cajas de esa moneda), `repuestos_cotizacion_guardar(p_id, p_lineas, p_notas, p_actualizado_en_esperado)` (recalcula cada total con el snapshot: la base
  decide; `PT409`), `repuestos_cotizacion_aceptar(p_id, …)` (pasa a `aceptada`, sella `aceptada_en`, anula la aceptada anterior del proyecto y copia el precio unitario de cada
  línea con ítem a `repuestos_items.precio_cliente`) y `repuestos_cotizacion_anular`; sin INSERT ni `UPDATE` directos en cotizaciones y líneas (hoy el cliente escribe `total` y
  el snapshot, y aceptar es imposible por la policy B:26890); un trigger que rechaza tramos solapados de una misma moneda. (3) Configuración › Repuestos › «Cotizador» (el hueco de
  8.08; `repuestos.configurar`): la configuración vigente con «Publicar cambios» (fila nueva: es append-only) y su historial, los tramos y las cajas por moneda. (4) Pestaña
  «Cotizaciones» de `/repuestos/[id]` (`repuestos.cotizar`): lista (número, estado, total, fecha) y `/repuestos/[id]/cotizaciones/[cotizacion]`: la hoja con los bloques
  «Importado» y «Local», líneas desde un ítem del proyecto o libres, celdas `XCell` (costo, logística con ↺ al sugerido, caja elegida de las activas, total), total con
  `<Monto>`; «Aceptar» (`<Confirmar>` que nombra número y total) y «Anular»; aceptada o anulada, sólo lectura con el snapshot con que se calculó. No entra: PDF o tarjeta de la
  cotización de repuestos, comprobantes. **Assert:** `entities/cotizador/formula.test.ts` (los dos bloques, el redondeo, el tramo y «sin tramo, sin sugerencia»);
  `supabase/tests/areas/repuestos/cotizador.sql` (los mismos casos dan el mismo total en la base; publicar otra configuración no cambia una cotización que existe; aceptada no se
  edita; sin `repuestos.cotizar` → 42501; `total` y `config_snapshot` no se escriben directo; tramos solapados → rechazados); `e2e/repuestos-cotizar.spec.ts` (publicar
  configuración → cotizar una línea importada y una local → el total esperado → aceptar → el precio queda en el ítem). Lugar: `src/modules/repuestos/{features,entities,infra}/cotizador/`,
  `pantallas/{cotizador,cotizacion,configuracion-cotizador}.ts`, `src/app/(app)/repuestos/[id]/cotizaciones/`, `src/app/(app)/configuracion/repuestos/`, `supabase/`. Nivel **2**
  (cambia policies de escritura). Tipo: datos y dinero. Partes estimadas: 5.
  Dudas, con la recomendada: (1) ¿Cuál es la «caja sugerida»? La base sólo tiene una lista de montos por moneda: recomiendo que no haya sugerencia automática; se elige de las cajas activas y `caja_sugerida` guarda la elegida. (2) ¿Aceptar copia el precio al ítem? Recomiendo sí (es lo que cumple el requisito `repuesto.precio` del flujo) y una sola aceptada por proyecto. (3) ¿La cotización de repuestos se numera sin huecos? No: es `identity` (B:21505) y no es un comprobante; se deja así.

- **8.13** (hecho el 2026-11-12; `docs/pasos/8.13-1/`, `8.13-2/`, `8.13-3/`, `8.13-4/`, `8.13-5/`, `8.13-6/`) — El flujo de repuestos y las esperas que destraban al vehículo. Con lo que `flujos` y `logistica` exponen al cerrar las fases 5 y 6 (`previsualizarCambio()`,
  `cambiarFase()`, el panel «Qué falta», mover con nota y `PT409`, `<BadgeFase>`, documentos, transporte y notas por unidad): mover un ítem desde la hoja y desde la vista «Cadena»
  de `/repuestos` (`?vista=cadena`: columnas por fase del flujo de repuestos, cada una por cursor con `TAMANO_DE_COLUMNA`, filtros en la URL), con `repuestos.mover` y los roles
  por fase y transición del motor; el panel del ítem (`?item=<id>`) con sus documentos (`repuestos.documentos.subir` y `.aprobar`), su transporte («Sigue al vehículo»), notas e
  historial; los pagos del cliente del proyecto (lo que cumple `proyecto.pago_cliente`) con el componente de pagos de `logistica`; `index.ts` da `esperasQueDestraban(vehiculoId)`
  (sobre `repuestos_pendientes_de_vehiculo`, de 8.08) para el panel del vehículo de `logistica`; y los bloques de Inicio «Repuestos por mover» (`repuestos.mover`: ítems vivos en
  fase no final, los más viejos primero, tope + 1) y «Esperas que destraban vehículos» (`repuestos.ver`), cada uno con enlace a su lista filtrada. Configurar el flujo de repuestos
  es de la Fase 5: aquí, sólo el enlace desde Configuración › Repuestos. No entra: mover en lote (`cambiar_fase_lote` es de vehículos). **Assert:**
  `e2e/repuestos-espera-recorrido.spec.ts`: un vehículo en «En taller» con una espera a «Recibido» y un ítem en tránsito → su panel dice que espera un repuesto → quien tiene
  `repuestos.mover` pasa el ítem a «Recibido» con la vista previa → el vehículo ya puede pasar de fase; y sin `repuestos.mover`, mover está apagado con su motivo. Lugar:
  `src/modules/repuestos/{features,entities,infra}/flujo/`, `pantallas/{cadena,item,inicio}.ts`, `src/app/(app)/repuestos/`, `src/app/(app)/_inicio/bloques.tsx`. Nivel **1**.
  Tipo: pantalla. Partes estimadas: 4.
  Dudas, con la recomendada: Si la Fase 6 deja sus componentes atados a `vehiculo_id`, ¿se generalizan o se duplican? Recomiendo generalizarlos en `logistica` (la base ya es por unidad: `vehiculo_id | repuesto_id`) con un pedido a su carril; duplicarlos serían dos paneles que divergen.

- **8.14** (hecho el 2026-11-13; `docs/pasos/8.14-1/`, `8.14-2/`) — Cierre de la Fase 8. El recorrido de la IA del «Terminado cuando», en `e2e/fase-8-recorrido.spec.ts` (los dos proyectos): un visitante anónimo llama
  `web.solicitar_asesor` y recibe asesor; vuelve dentro del plazo pegajoso y recibe el mismo; con todos sin disponibilidad (apagada desde `/perfil`), recibe el respaldo; la
  asesora confirma el turno en 2 toques en el celular y la tasa de contacto del tablero de la cola cambia; el cliente entra al portal por `api/portal` con el código que dio la
  ficha del lead; una guía publicada sale en `web.guias` y deja su etiqueta por revalidar; un repuesto en «Recibido» cumple la espera del vehículo en «En taller». Tabla de
  criterios de la fase en `docs/PLAN.md` (cada línea del «Terminado cuando» y cada arrastrado, con su prueba), `docs/ESTADO.md` y `docs/BITACORA.md`; fichas de `web` y
  `repuestos` sin «todavía no existe»; `docs/GLOSARIO.md` con los términos nuevos (disponible, sin asignar, ficha pública, sobrante, movimiento de stock, tramo, caja);
  `docs/UX.md` con las pantallas nuevas; `permisos-enforcement.sql` sin claves de `web.*` ni `repuestos.*` sin enforcement; `mapa.sh --check`. **Assert:** ese spec en verde y
  `pnpm test:e2e:completo` con los dos proyectos. Lugar: `e2e/`, `docs/`, las dos fichas. Nivel **3** (cierre de fase). Tipo: pantalla. Partes estimadas: 2.
  Hecho en dos: el **8.14-1** (el recorrido del «Terminado cuando» en los dos proyectos, las fichas de `web` y `repuestos`, GLOSARIO y UX) y el **8.14-2** (el Nivel 3 y los docs de cierre).
  Dudas, con la recomendada: ninguna. **Paralelo.** Sin dependencias entre sí desde el primer día: 8.01, 8.06 y 8.08. Tras 8.01: 8.02 ∥ 8.03 ∥ 8.04 ∥ 8.05 ∥ 8.07 (áreas distintas; 8.02 y 8.03 comparten `infra/contenido/` pero con archivos propios). Tras 8.08: 8.09; tras 8.09: 8.10 ∥ 8.11 ∥ 8.12 (cada uno llena su hueco). No en paralelo: 8.01 con 8.08 **si** las dos tocan `secciones.ts` y `rutas.ts` el mismo día (dos líneas cada una: choque trivial, lo resuelve la sesión); 8.05 y 8.13 tocan `_inicio/bloques.tsx`. **Arrastrados que no entran:** el CTA «Escribirle por chat», la notificación de la limpieza, el buscador de leads sin los privados, el atajo `?` sin lista y `recordatorios_notificar()` sin job (y su `ruta`) son de `chat`, `notificaciones` y `buscador`: **quedan en la Fase 7**, aunque el párrafo de la Fase 8 los nombre. El texto del portal por empresa queda en la Fase 9 (ya está en su párrafo). El job de `actividad_purgar()` (purga `eventos_web`), en la Fase 9.

Total de la fase: 14 pasos y 45 partes, todos hechos (la fase cerró con el 8.14, el 2026-11-13; 8.12-ci cuenta como parte).

### Riesgos y huecos

- **No pude leer `docs/archivo/`**: el contrato completo del portal (si fija nombre de cookie, duración, forma del límite por IP) puede contradecir lo que propongo en 8.07. El
  planificador de 8.07 debe leerlo primero (`rg -n 'Contrato del portal' docs/archivo`). (Resuelto en el 8.07-1: el permiso negó `docs/archivo` y el contrato vigente es `docs/DECISIONES.md` › «Contrato del portal para la Fase 8»; `docs/pasos/8.07-1/decisiones.md:27-28`.)
- **El repo del sitio** (`sitio-marketing`) está fuera: el receptor de la revalidación, la reescritura de `/api/portal/*` y el tipado de `web.ajustes.legales` son contratos que
  este repo sólo puede documentar (DECISIONES y ficha de `web`). Todo queda probado contra un receptor del propio spec y con `request` de Playwright; nada espera al sitio. (Resuelto en el 8.06 y el 8.07: el contrato con el sitio está en la ficha de `web`; `docs/pasos/8.06-1/decisiones.md:31`.)
- **La IP real tras la reescritura:** el CRM verá la IP del servidor del sitio salvo que éste reenvíe `x-forwarded-for`. 8.07 debe leer la cabecera que el contrato fije y, si
  falta, limitar por código de acceso además de por IP (la base ya bloquea por código: 5 fallos, 15 min). Queda como abierto de la fase (8.14-2; `docs/pasos/8.07-3/bitacora.md:18-19`).
- **Secretos:** `PORTAL_COOKIE_SECRETO` y el secreto de revalidación los pone la persona en Vercel y Vault. Sin ellos: 503 en el portal y la cola de revalidación sin enviar (no
  pierde nada). Documentado en `docs/ENTORNOS.md`; ningún paso abre compuerta `afuera`. (Resuelto: `docs/ENTORNOS.md:26, :43`.)
- **Dependencias:** ninguna nueva si se aceptan las recomendadas (`node:crypto`, HTML derivado en la base). Tiptap alcanza con lo instalado **salvo la imagen**: el nodo de
  imagen no viene en `starter-kit`; 8.03 lo escribe como extensión propia (pocas líneas con lo que reexporta `@tiptap/react`, como hace `editor-enriquecido.tsx` de `leads`
  con `Extension`; `@tiptap/core` no está como dependencia directa) o las guías salen sin imágenes en el cuerpo. Si el planificador prefiere `@tiptap/extension-image`, es compuerta `dependencia`. (Resuelto en el 8.03 sin dependencia nueva: `docs/pasos/8.03-1/decisiones.md:25`, `8.03-2/decisiones.md:15`.)
- **`_web_doc_html` en PGlite:** `db:probar` corre en PGlite; la función es plpgsql puro (sin extensiones), pero el espejo TS ↔ SQL debe probarse ahí como el de seguimientos. (Resuelto: `supabase/tests/areas/web/doc-html.sql`.)
- **pg_net en pruebas:** `supabase/tests/jobs.sql` ya cuenta `net.pedidos`; 8.06 debe usar ese mismo doble y no un POST real. (Resuelto en el 8.06-1 con el doble `net.pedidos`: `docs/pasos/8.06-1/decisiones.md:7`.)
- **Realtime:** la publicación `supabase_realtime` no tiene tablas (B:27369). El tablero de la cola y el bloque de turnos releen al volver el foco hasta la Fase 7.
- **El flujo de repuestos sólo nace en `seed.sql`** (líneas 201–214) y `authenticated` no puede insertar en `flujos` (B:31618): un despliegue sin seed no tendría flujo y
  `repuesto_item_crear` dejaría los ítems sin fase. Lo resuelve la Fase 5 (o una migración con `insert … on conflict`); 8.08 debe tolerar «sin flujo» con un estado vacío que lo diga. (Resuelto en el 8.08-1: `docs/pasos/8.08-1/bitacora.md:20`.)
- **Quitar escrituras directas** (8.01, 8.08, 8.10, 8.11, 8.12) cambia policies o grants de tablas que ningún código usa todavía: riesgo bajo, pero `humo.sql` y
  `permisos-enforcement.sql` tienen que seguir verdes y `web.*` cambia de forma para el sitio (`legales`): avisar en DECISIONES.
- **Volumen:** las únicas tablas que crecen aquí son `solicitudes_contacto_web`, `repuestos_proyectos`, `repuestos_items` y `repuestos_stock_movimientos`: todas van por cursor
  con índice (8.04, 8.08, 8.10). No pido `medir-*.sql` ni e2e de volumen (regla del 2026-11-08); si la persona los quiere para proyectos de repuestos, es un paso aparte.
- **8.12 con 5 partes** está en el tope: si el planificador ve que no cabe, el corte natural es «base y configuración» (rojo) y «hoja y aceptar» (pantalla), y la fase pasa a 15 pasos. (Fue en 4 partes y el 8.12-ci.)
- **Sin determinar:** si el buscador de clientes de `leads` se deja reusar fuera de la hoja de cotizar sin cambios (8.05 puede necesitar tocar
  `leads/features/panel-para-cotizar/`); y si `starter-kit` 3.31 trae ya el enlace (el editor de `leads` lo configura, así que parece que sí).

## Fase 9 — Tablero, datos, PWA y pulido

Módulo `tablero` (métricas y gráficas por rol con widgets personalizables guardados en `preferencias_usuario`, dataviz con los tokens),
`datos` (exportar/importar de todo para el dueño con `supabase/functions/importar-csv`), `actividad` (listado por día con diff), PWA
(instalación, push, `sw.js` mínimo), transiciones y esqueletos revisados pantalla por pantalla contra `docs/UX.md`, auditoría de
accesibilidad AA, e2e completo de las cuatro tareas de oro en móvil y escritorio, `splinter` en verde, despliegue en Vercel con
`supabase db push --dry-run` revisado. **La conversión de leads del tablero cuenta por la clase del tipo de lead (`tipos_lead.clase`: de
prospecto a cliente), nunca por el nombre ni la clave de un tipo** (9j). Arrastrados: Actividad lee el diff por una función que recorta
según la cartera y **no** reintroduce los números de lead (`actividad.antes/despues` no los guardan y la matriz lo asserta con un patrón;
todo lo nuevo que devuelva el número de un lead entra al inventario de `numero-global.sql`); plantilla de etapas de embudos por empresa y
tablero de equipo (`tablero.metricas.ver`); plantilla del texto del portal por empresa.

**Terminado cuando:** las cuatro tareas de oro cumplen su meta en e2e móvil y escritorio, el tablero del dueño muestra conversión de leads,
cola web y margen del mes con datos reales, splinter y los advisors están en cero errores, y la app está desplegada apuntando al proyecto
Pro.

**Pulido para la Fase 9** (2026-10-30; viene de la Fase 4; regla en `.claude/rules/e2e.md` › «Pulido y rigor por tipo de paso»). Ningún paso los recoge ni abre otro por ellos, aunque su fila los nombre
(4.20 y 4.28): **4-61**, **4-62** y **4-63** (el foco tras recargar y «atrás» que quedó del 4-49), **5a-29** y **5a-30** (del 4.20) y **5a-33** (del 4.28). Los recorre la
auditoría AA de la Fase 9, con 5a-28. Los defectos de pulido nuevos se anotan aquí, en una línea.

- (6.14-1) «Qué falta» del panel de la unidad deja un hueco vacío arriba del primer destino y de «Desde esta fase no hay a dónde mover.» (escritorio y celular; `logistica-tarea-de-oro` 02, 03 y 08).
- (6.14-1) El resumen del contenedor pone «Mover el grupo» debajo de toda la lista de unidades: con 8 hay que desplazar para llegar a «Marcar que llegó» (escritorio y celular; `logistica-tarea-de-oro` 05).
- (6.14-1) `/logistica/embarques` › Contenedores dice «Las primeras.» sobre la lista sin decir de qué (escritorio y celular; `logistica-tarea-de-oro` 04).
- (6.14-1) El margen sin gastos dice «Real USD 0,00»: es cierto, pero junto a «Sin venta registrada» parece un costo cargado; «Sin gastos» lo diría sin cifra (escritorio y celular; `logistica-tarea-de-oro` 08).
- (6.14-1) La cadena de la dueña: en el celular las pestañas de origen parten en dos líneas y la última queda cortada en el borde; en escritorio la tercera columna se corta sin indicio de que se desplaza (`logistica-tarea-de-oro` 01 y 09).
- (5.04-3) El inspector de fase no se miró al 200 % (los bloques anidados miden con `minmax(0, 1fr)`; sin captura): `docs/pasos/5.04-3/bitacora.md`.
- (4.18-3b) «Copiar texto» apagado nombra por `aria-describedby` un id que no está en el DOM mientras la tarjeta carga (`copiar-texto-de-la-tarjeta.tsx`): el aviso y «Falta el total para copiarlo.» sólo se dibujan con la tarjeta.

- **4-50** (desde el 4.18-1, P7): el resumen fijo al pie al 200 %; el 4.18-2 no lo empeora al 100 % y el assert de hoy sigue verde.

- **Pulido nuevo (4.17-3):** al abrir la pestaña «Cotizaciones» de la ficha del vehículo puede verse esqueleto, luego blanco, luego esqueleto: el primero es el de `diferido()` mientras llega el código y el segundo el de las filas, que espera 300 ms. Sin prueba nueva.

- **4-19** (A, sin paso: pulido): el «·» entre el estado y el uso queda solo al comienzo de una línea al 200 % — en
  `e2e/configuracion-cotizacion-niveles-200.spec.ts`, ninguna línea de «Estado · Uso» empieza por «·» (el separador va pegado al final de
  la anterior); `src/modules/cotizaciones/features/niveles/components/lista-de-niveles.tsx` (`EstadoYUso`).
- **4-20** (A, sin paso: pulido; con la persona: ancho contra altura): el aviso de escritorio es angosto (216 px al 100 %): una descripción larga ocupa
  unas diez líneas y al 200 % (432 px) un aviso cubre campos de un panel — en `e2e/avisos-con-descripcion.spec.ts`, al 100 % en
  escritorio el aviso con descripción cabe en seis líneas o menos, y ningún aviso cubre un campo con foco (`src/shared/ui/sonner.tsx` y
  `--ancho-del-aviso` de `src/app/globals.css`; el pie del panel no se tapa: `avisoNoTapaElPie`).
- **4-61** (sin fase; salió del 4.14-2a5, F16 y F17 de su sonda): anotar o agendar desde el «⋯» de la cabecera de la ficha llegan por `router.push` a `?seccion=seguimientos&panel=…`
  (navegación del servidor, sin la marca del guardián). Sin recargar, «atrás» devuelve el foco al «⋯» (guardia en `paneles-foco-al-volver-ficha.spec.ts`); tras recargar lo deja
  en `body` (F16 en los dos proyectos; F17 sólo medido en móvil: en escritorio la sonda no vio el diálogo tras recargar). Assert: tras recargar y «atrás», el foco en el «⋯».
- **4-62** (sin fase; límite de 4-59, del 4.14-2a5): tras recargar con anotar o agendar abierto desde el botón de la pestaña del lead rápido, o con un panel que se cierra con Esc,
  la ✕ o guardar en una URL distinta de la de apertura (la que lleva `&pestana=`), el segundo «atrás» deja el foco en `body`: la ficha de `lead` sólo se recupera en la URL
  donde se abrió. Assert: el segundo «atrás» devuelve el foco al nombre de la fila también desde la pestaña.
- **4-50** (pulido para la Fase 9 desde el 4.18-1, P7; antes: antes del 4.18, P5 del 4.14-2a; salió del 4.13-4d, de las capturas): al 200 %, el resumen fijo al pie (escritorio y celular) ocupa cerca del 40 % del alto de la pantalla y
  tapa la hoja mientras se desplaza; se pliega con su «—», pero nace abierto. Assert: al 200 % el resumen al pie no pasa de un alto que se decida, o nace plegado, y
  `aLaVistaSinDesplazar()` de la celda con el foco sigue verde. Suma (4.14-2a, P5): el resumen no sube más allá del borde de arriba de la hoja, y con la barra del vehículo
  encima, al 200 % y con la página arriba de todo, queda debajo del borde de la ventana: 107 px en escritorio y 37,6 en el celular (al 100 % cabe; antes cabía por 1 px).
  `cotizar-hoja-resumen.spec.ts` lo mide ahora con la hoja arriba de la ventana. La persona lo aceptó (P5) y **endureció el assert**: además, al 200 % en los dos
  proyectos y con la página arriba de todo, el resumen cabe entero en la ventana (su borde de abajo a ≤ 1 px del de la ventana). Se arregla al decidir 4-50, antes del 4.18. Suma (4.14-3b): con las dos barras (vehículo y cliente), al 200 % y con la página arriba de todo, el resumen queda 227 px (escritorio) y 157,6 (celular) bajo el borde de la ventana (al 100 % cabe: −258,5 y 0); el assert endurecido, con la hoja arriba de la ventana, sigue en verde.
- **5a-29** (Fase 9): la «Clave interna» de un origen se corta en el borde de la pantalla al 200 % en el celular (`e2e_largo_capturas_movil`,
  monoespaciada, llega a x = 412; no ensancha la página, así que `sinScrollHorizontal()` no lo ve) — `aLaVistaSinDesplazar()` sobre el
  valor de la clave al 200 % en 412 px (la clave se parte, o se desplaza dentro de su caja). Lugar:
  `src/modules/origenes/features/origenes/components/datos-del-origen.tsx` (línea 34) y `e2e/configuracion-200.spec.ts`.
- **5a-30** (Fase 9): el paso «Revisa los permisos» de la ficha de un origen queda en una columna de ~130 px al 200 % en el celular («Abrir
  →» no cede; el paso «Publica la fórmula» ganaría su «Abrir →» y heredaría el defecto) — el texto del paso mide al menos 12 rem de
  ancho al 200 % en 412 px, o «Abrir» pasa debajo (`@container`, como las tarjetas), con su prueba en `e2e/`
  (`src/modules/origenes/features/pasos/components/siguientes-pasos.tsx`).
- **5a-33** (pulido de la Fase 9; el 4.28 no lo recoge, por la regla del 2026-10-30): Roles, en escritorio al 200 %, el conteo del rol (`roles_personas()`) queda tapado por la columna «Permiso» fija, y
  `toBeVisible` no lo detecta — al 200 % en escritorio, la caja del conteo no se solapa con la columna fija (sus cajas no se intersecan),
  con un rol de miles de personas («más de 1.000 personas») y con uno de una. Lugar: `e2e/roles-conteo-acotado.spec.ts`,
  `matriz-de-roles.tsx` y `cabecera-matriz.tsx` (`src/modules/equipo/features/roles/components/`). Decidido por la persona el 2026-10-22.

Abiertos de esta fase:

- **4-41** (Fase 9; decidido el 2026-10-28: no antes): `pnpm env:check` sólo revisa `.env.local` y `.env.demo`. Falta leer por API, sin
  valores, las variables de Vercel (producción y preview) y los secretos de las funciones y la configuración de Auth de Supabase. Assert:
  con `VERCEL_TOKEN` y `SUPABASE_ACCESS_TOKEN`, `env:check produccion` dice qué falta en cada lugar de la tabla de docs/ENTORNOS.md.
- **5a-28** (Fase 9: la auditoría AA recorre Configuración al 200 %): el formulario de apibara toca el borde de su tarjeta al 200 % en el
  celular (el campo «Dirección del servicio», el `fieldset` de plataformas y el botón «Guardar configuración», `nowrap`, miden 315 px
  dentro de 282 y terminan en x = 380) — al 200 % en 412 px, ningún descendiente del cuerpo de la tarjeta de Integraciones pasa de su
  relleno (`getBoundingClientRect` contra el cuerpo de `<Bloque>`). Lugar:
  `src/modules/empresa/features/integraciones/components/config-apibara.tsx` (la grilla del `fieldset` exterior a `minmax(0, 1fr)` y el
  botón que parte su texto) y `e2e/interruptor-200.spec.ts`.
- **9-1** (Fase 9): dominancia sobre la persona. Hoy la dominancia mira permisos y no personas: quien tiene `equipo.usuarios.gestionar`
  puede bloquear, dar de baja o cambiar los roles de alguien con permisos que él no cubre. Regla decidida el 2026-10-21: nadie bloquea,
  da de baja ni cambia los roles de quien tiene permisos que él no cubre; el dueño sí, sobre todos — en `supabase/tests/dominancia-persona.sql`
  (nuevo, en `db:probar`), A con `equipo.*` y sin `leads.numero_global.ver` recibe 42501 con su mensaje legible en `equipo_bloquear`,
  `equipo_dar_de_baja`, `rbac_asignar_rol` y `rbac_quitar_rol` sobre B, que sí lo tiene; el dueño puede sobre B; quien cubre todo lo de B
  puede; con «Ver como» no cambia lo que decide la base. La interfaz lo muestra antes (`accionesSobre()` deshabilita con el motivo, como
  `rolDominado()`), con su prueba. Lugar: esas cuatro RPC (migración y cadena db con `db:carreras`), `entities/dominancia.ts` y
  `entities/persona.ts` de `equipo` (la ficha de `equipo` lista la deuda).
- **9-2** (Fase 9; decidido el 2026-10-21: no se hace antes de cotizaciones): el rango de un campo numérico — un valor fuera de `min`/`max`
  lo rechaza la base (`_lead_atributos_formato()` y la validación de atributos de vehículos) con su motivo en el campo y el formulario lo
  dice junto al campo; el límite se edita en el editor de campos y un cambio que deja datos fuera lo avisa con su impacto
  (`resumenDeImpacto()`). Lugar: `src/shared/lib/campos/esquema-de-valor.ts`, el panel del campo de `src/shared/ui/campos/` y las dos
  validaciones de la base.
- **9-3** (Fase 9; decidido el 2026-10-21: no se hace antes de cotizaciones): separar `leads.campos.gestionar` de `leads.configurar` (hoy
  un solo permiso gobierna los campos, los orígenes y los tipos de lead) — una migración siembra `leads.campos.gestionar` con su
  enforcement y la concede a todo rol que hoy tiene `leads.configurar`; las RPC de campos de leads la piden (`leads.configurar` sigue para
  orígenes y tipos); `permisos-enforcement.sql` la ve; la matriz de Roles la muestra. Lugar: las RPC `leads_campos_*`, `CLAVES_PERMISO` y
  Configuración › Leads › Campos.
- **9-4** (Fase 9; decidido en CI-1, 2026-10-25): `db:medir` fuera de CI (mide tiempo y un runner compartido de 2 vCPU lo vuelve inestable;
  corre en local en el paso que toca una RPC medida) — `scripts/guardas/workflows.test.ts` falla si un workflow llama `db:medir` o
  `medir-listado`; para que entre a CI hace falta un runner dedicado y 5 corridas seguidas en él con cada tiempo a ≤ 10 % de su mediana
  (desvío / mediana), anotadas en una tabla. Lugar: `scripts/medir-listado.mjs`, `supabase/tests/medir-*.sql`, el job `base` de
  `.github/workflows/ci.yml` y la lista `FUERA_DE_CI` de `scripts/guardas/workflows.ts`.
- **9-5** (Fase 9; decidido en CI-1): `db:medir:volumen` fuera de CI, lo mismo que 9-4 y además pide `db:sembrar-volumen` antes y `db:reset`
  después (la guarda ya lo cubre: `db:medir` es prefijo de `db:medir:volumen`), con las 5 corridas medidas sobre el volumen sembrado.
  Lugar: el de 9-4 y `scripts/sembrar-volumen.mjs`.
- **9-6** (Fase 9; decidido en CI-1): `db:carreras` fuera de CI hasta ver cómo se porta en el runner (dos o tres conexiones reales sin
  `sleep`; en local 25,8 s y 23,6 s, nunca con 2 vCPU). Entra al job `base` después de **5 corridas seguidas en verde por
  `workflow_dispatch`**, sin reintentos; un rojo vuelve la cuenta a 0 y lleva su número. El job `carreras` (CI-1b) corre sólo con
  `workflow_dispatch` y el input `carreras: true` (por defecto false); con `e2e: false` el dispatch no compila ni corre el e2e; la guarda lo
  admite sólo por nombre y con ese `if`. Con 5, el paso pasa a `base`, el job se borra y la guarda deja de admitirlo (`admitidaEnSuJob`).
  **Cuenta: 3 de 5**, por el job `carreras`: 1) 2026-10-25, 40222651048, verde; 2) 2026-10-25, 40241115895, verde; 3) 2026-10-26,
  40320539963, verde en 3 min 8 s (el resto de la corrida cayó en el e2e, bloque 2: `leads-exportar`, CI-4). La cuenta sigue con cada fila
  nueva (fecha, id de `gh run list`, resultado). Lugar: `scripts/carreras.mjs`, `scripts/carreras/`, `.github/workflows/ci.yml` y
  `scripts/guardas/workflows.ts`.
- **9-7** (Fase 9; gravedad baja): el aviso de «guardado» sale con el pie todavía en «Guardando…». `alGuardar` avisa («Lead creado», con
  «Abrir ficha») pero `enCurso` es el `isPending` de next-safe-action y dura hasta que la pantalla termina de refrescarse: del aviso al pie
  quieto pasan 40 a 49 ms, ≈ 150 ms con la CPU 6× más lenta y ≈ 800 ms a 20× — una prueba (o la sonda de CI-2 hecha prueba) que con la CPU
  6× más lenta por CDP mide que, al entrar el aviso de guardado, en el mismo cuadro el pie ya no dice «Guardando…» y sus botones están
  habilitados; lo mismo para el panel de vehículo y el de etapas. Lugar: `src/modules/leads/features/alta/components/alta-cargada.tsx`
  (`alGuardar` y `avisarExito`), `use-crear-lead.ts`, `use-envio-del-alta.ts:136`; y los mismos patrones en
  `src/modules/vehiculos/features/…/use-formulario-de-vehiculo.ts:143-175` (+ `panel-de-vehiculo.tsx:58,98`) y
  `src/modules/…/use-panel-de-etapas.ts:35-43`. Salida posible: avisar cuando `isPending` vuelve a `false`, no al resolver la promesa.
- **9-8** (Fase 9): `e2e/empresa.spec.ts:194` deja una clave de apibara en Vault y pisaría una real. La prueba escribe
  `e2e-clave-<proyecto>-0123456789` (`integracion_guardar_secreto`) y `restaurarEmpresa()` (`e2e/soporte/empresa.ts:132-151`) sólo devuelve
  la columna `integraciones.secreto_guardado_en`, no Vault (la base queda incoherente, lo que escondió el rojo de
  `vehiculos-apibara-funcion.spec.ts:84` en local, y una clave real se reemplazaría sin poder devolverla) — tras `empresa.spec.ts`,
  `vault.secrets` (id, `updated_at` y `md5` del texto cifrado de `integracion:apibara`) queda como estaba, con y sin una clave previa; el
  spec mueve la clave real de lugar por SQL (renombrar la fila de `vault.secrets`, sin descifrarla) y la vuelve a poner al terminar, también
  si cae. Lugar: `e2e/empresa.spec.ts:194` y `e2e/soporte/empresa.ts`; el ayudante `e2e/soporte/apibara-clave.ts` ya sabe preguntar si
  existe y la huella sin leer.
- **9-9** (Fase 9): mediciones de una sola vez tras cargar que CI-3 no reprodujo (no cayeron con la CPU limitada y quedan como están):
  `e2e/leads-ficha-origen-inactivo-200.spec.ts:81` (9 de 9 a 14×; a 20× el drawer tarda más que los 5 s de `toBeVisible`),
  `e2e/barra-de-filtros-200.spec.ts:157-163` (18 de 18 a 14× y 20×; `menu-de-acciones-200.spec.ts:43` dice que el listado llega más ancho
  antes de hidratar), `e2e/leads-recorrido.spec.ts:242-243`, `e2e/leads-recorrido-modales.spec.ts:66` (`sinScrollHorizontal` antes de que
  monten los `diferido()`: puede dar un verde falso) y las capturas que se toman antes de que la barra se desplace
  (`configuracion-200-capturas.spec.ts:61-72`, `cierre-pendientes-capturas.spec.ts:66,107,118`, `leads-recorrido-cierre-2.spec.ts:208-210`)
  — cada una pasa 15 de 15 con una copia que limita la CPU a 20× por CDP (`Emulation.setCPUThrottlingRate`), o espera un estado antes de
  medir o capturar (`aLaVistaAlAcomodarse()`, `esperarHidratado()`, la pista con `data-visible`); en las capturas, la pestaña abierta de la
  imagen está entera dentro de su barra. Lugar: esos archivos y `e2e/soporte/recorrido.ts`.
- **9-10** (Fase 9): las esperas del e2e que leen un texto con la espera de fábrica (5 s) cuando lo que tarda es un pedido (RPC desde el
  navegador, route handler o server action), después de sembrar volumen: `e2e/leads-rapido-volumen.spec.ts` («Ver más» `:106`, `:111`, el
  bucle `:124` con el aviso del tope `:130-131` y `:172`; «Ir a una fecha» `:152-153` y «Volver a los más recientes» `:158`; «Guardar» con
  conflicto `:184`, «Recargar» `:190` y «Guardar» `:195`; «Completados» `:228` y su «Ver más» `:231`), `e2e/leads-papelera.spec.ts`
  («Mostrar los 200» `:231`, «Restaurar …» `:234` y la página releída `:236`), `e2e/leads-escala.spec.ts` («Ver más» del kanban `:223` y el
  aviso del tope `:226`), `e2e/leads-alta-contexto.spec.ts:224`, `e2e/leads-exportar.spec.ts:257-258` y `e2e/escala-recorrido.spec.ts:140` y
  `:142` (sólo con `db:sembrar-volumen`, no corre en CI). Se dejaron fuera: `equipo-tope`, `equipo-busqueda-minima`,
  `roles-conteo-acotado` (navegación por URL), `leads-escala.spec.ts:66`, `vehiculos-por-pagina` y `por-pagina-pendiente-*`,
  `listas-por-pagina-volumen` (60 s), `leads-recorrido-csv:121` (20 s) y el ayudante `descargar()` — cada una espera la respuesta de su
  pedido (`page.waitForResponse` con un tope propio, como la prueba «más de 5.000 leads» de `leads-exportar.spec.ts`) o el estado que la
  sigue, deja en el log lo que tardó y pasa con un POST demorado 6 s por `page.route`. Lugar: esos cinco specs y, si se repite, un ayudante
  en `e2e/soporte/esperas.ts`.
- **9-11** (Fase 9; para el próximo cambio del workflow): un rojo del e2e en CI no deja nada de la base (el dispatch 40320539963 cayó por una
  lentitud de ~20 s y el artefacto sólo trae lo de Playwright y `funciones.log`; ver 4-26) — el paso `if: failure()` del job e2e
  (`.github/workflows/ci.yml:224-232`) suma a `e2e-fallos/` el `docker logs` de la base, `pg_stat_statements` (las 30 de mayor
  `max_exec_time`), `pg_stat_user_tables` de `leads` y `leads_asesores` (`n_dead_tup`, `last_autovacuum`, `last_autoanalyze`),
  `pg_stat_checkpointer` y `cron.job_run_details` de los últimos 15 min; `scripts/guardas/workflows.test.ts` exige esos archivos en ese
  paso, y un rojo provocado a propósito en un dispatch los deja en el artefacto con contenido.
- **9-12** (Fase 9; para antes de producción): «¿Guardar contraseña?» de Chrome con la entrada `type="password"` del Modo Live. La `XCell`
  abre su entrada como `password` con Live encendido (el CSS tapa lo que se dibuja y el valor sigue en el árbol de accesibilidad, medido
  con CDP); lleva `autoComplete="off"` y las marcas de 1Password, LastPass, Bitwarden y Dashlane, pero Chrome ignora `autocomplete="off"`
  en un `password` y no tiene marca propia, y no se puede probar en el Chromium de Playwright — con un Chrome con sesión y gestor de
  contraseñas, y Live encendido, tipear y confirmar un monto en la hoja de cotizar no ofrece guardar nada, en escritorio y en el celular;
  si lo ofrece, se decide de nuevo (con `type="text"` y sólo el CSS el valor queda en el árbol de accesibilidad: `docs/DECISIONES.md`,
  «Paso 4.12 (1 de 2)», hb). Lugar: `src/shared/ui/xcell/entrada-de-xcell.tsx` y su ficha; se mira cuando la hoja (4.13) exista.
- **9-13** (Fase 9; salió del 5.05): `rbac_eliminar_rol` sobre un rol que figura en una lista de quién mueve (`fases_roles`,
  `fases_transiciones_roles`) da el `23503` crudo de la FK `restrict`; mensaje humano o quitar el rol de las listas. Lugar: `equipo` y su RPC.

### Lo que ya existe y lo que falta (leído el 2026-11-09)

| Superficie                    | Ya está en la base (`base.sql:línea`) y en el código                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Falta                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Actividad**                 | Tabla `actividad` (20147); policy «actividad: leer» con `actividad.ver` (26030); `authenticated` lee por columna y **no** lee `antes`/`despues` (31386–31410; `humo.sql:3439`); índices `actividad_fecha_idx`, `actividad_actor_accion_idx`, `actividad_registro_idx` (23103–23115); `auditar()` (8265) en 24 tablas (24443–24543), `lead_auditar()` (11618: sin teléfono ni números), `cotizacion_auditar()` (8818), `formula_auditar()` (11329); `registrar_actividad()` (16722, con `execute` para `authenticated`: deuda); `actividad_purgar()` (8031, sólo `service_role`). Código: sólo la ficha y un `index.ts` vacío.                                                                                              | La lectura por cursor, **la función del diff recortado** (sin ella nadie ve un diff), índices por persona y por entidad, **el job de la purga** y la purga por lotes, `entities/diff.ts`, `features/listado/`, la ruta `/actividad`.                                                                                                                                                                                                           |
| **Datos**                     | `importaciones` (3695; `entidad` ∈ leads, vehiculos, seguimientos, repuestos_items; `authenticated` no la escribe), policy «importaciones: leer» propio o `datos.importar.todo` (26510), `importaciones_leads` (20951), bucket `importaciones` (50 MB, csv; 32247) con «importaciones: propio» (32220), `leads_importar_lote` (13484), `leads_importacion_terminar` (13401), `leads_importacion_deshacer` (13305), `leads_exportacion_registrar` (13230), `_lead_crear` (4026), `vehiculo_crear` (18518), job `importaciones-vinculos-purgar` (32308). Código: `src/shared/lib/csv/{leer,escribir,descargar}.ts`; en `leads`, `features/importar/`, `features/exportar/`, `POST /leads/exportar`, `entities/importacion/`. | Enforcement de `datos.exportar.todo` (hoy excepción en `permisos-enforcement.sql:17`), RPC que registra y limita la exportación total, `POST /datos/exportar`, RPC para crear una importación y procesarla por lotes a nombre de otra persona, **`supabase/functions/importar-csv` (no existe; sólo su contrato en `supabase/functions/README.md`)**, el job que la continúa, `entities/plantillas.ts`, la ruta `/datos`.                      |
| **Tablero (métricas)**        | `preferencias_usuario` (21348; policies de lo propio, 26788–26800), `tipos_lead.clase` (21853), `cotizacion_marcar_final` (9349), `margen_vehiculo(p_vehiculo)` (14229; `logistica.margen.ver` **por origen**), vista `estado_cola_web` (20634; **totales de siempre**, no del mes), `solicitudes_contacto_web` (20603), `pagos` (21272), `gastos` (20890), `leads_listado_idx` (23563), `cotizaciones_listado_idx` (23235). Código: tokens `--viz-*` (`design/tokens.css:107–118`), `<Monto>`, la entrada `/tablero` del menú con `disponible: false`.                                                                                                                                                                    | Toda RPC agregada; **la fecha de conversión** (ver contradicciones); índices por fecha en `pagos.confirmado_en` y `solicitudes_contacto_web.asignada_en`; enforcement de `tablero.metricas.ver`; `entities/widgets.ts`, `features/metricas/`, `infra/queries/metricas.ts` (la ficha lo lista, no existe), `/tablero`; guardar una preferencia genérica (`equipo` sólo escribe las suyas en `infra/perfil.ts:36`). No hay librería de gráficas. |
| **Bandeja (Inicio)**          | `BLOQUES_BANDEJA` (10 bloques, **todos vacíos**), `<Bandeja>`, `src/app/(app)/page.tsx`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | El contenido de cada bloque y una estructura para que cada fase llene el suyo sin editar el mismo archivo. Los de leads y equipo (módulos ya hechos) no los tiene asignados ninguna fase.                                                                                                                                                                                                                                                      |
| **PWA**                       | `src/app/manifest.ts` (identidad e íconos de la empresa), `public/sw.js` (install/activate, sin caché a propósito), `src/shared/ui/registrar-service-worker.tsx` (sólo en producción), `suscripciones_push` (21705) con policies de lo propio.                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | La instalación (botón, instrucciones de iOS), los manejadores `push`/`notificationclick` (los necesita la Fase 7), el logo oscuro (`ajustes_empresa.logo_oscuro_ruta` no lo lee ni lo escribe nadie).                                                                                                                                                                                                                                          |
| **Dominancia (9-1)**          | `equipo_bloquear` (10168), `equipo_dar_de_baja` (10196), `rbac_asignar_rol` (16331), `rbac_quitar_rol` (16453), `rol_dominado` (16787), `concesion_dominada` (8802), `equipo_lista` (10226); `entities/dominancia.ts`, `accionesSobre()` (`entities/persona.ts:212`).                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Una regla «domino a esta persona» en la base, usada por las cuatro RPC y por `equipo_lista()`; el motivo en la interfaz.                                                                                                                                                                                                                                                                                                                       |
| **Campos (9-2, 9-3)**         | `lead_campo_crear/eliminar/guardar/impacto/mover` (11638–11855) con `leads.configurar`; `_lead_atributos_formato` (3764), `vehiculo_validar_atributos` (19011), `_atributos_validar` (630); `numero(minimo, maximo, …)` ya recibe límites (`esquema-de-valor.ts:37`, hoy ±`NUMERO_MAXIMO`).                                                                                                                                                                                                                                                                                                                                                                                                                                | El permiso `leads.campos.gestionar`; **las columnas del rango** (ni `leads_campos`, 20966, ni `origenes_campos`, 20040, tienen mínimo o máximo).                                                                                                                                                                                                                                                                                               |
| **Plantillas por empresa**    | `_embudo_defecto_de()` con seis etapas fijas en el código (2485–2508); `textoParaWhatsApp()` fija (`leads/entities/portal-mensaje.ts:63`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Dónde guardarlas, sus RPC y sus dos pantallas.                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Herramientas y despliegue** | `scripts/env-check.ts` (sólo `local` y `demo`), `scripts/splinter.sql` y el job `base` del CI (cae con un ERROR), `db:lint --fail-on error`, `.github/workflows/demo.yml` (**al integrar en `main` aplica migraciones y funciones a la demo si el repo tiene `DEMO_PROJECT_REF`**), `scripts/demo/restaurar.sh`, `docs/ENTORNOS.md`.                                                                                                                                                                                                                                                                                                                                                                                       | `env:check produccion` (4-41), la guía de despliegue con su lista para la persona, un guion «en seco» local, los WARN de splinter y los avisos de rendimiento con dueño.                                                                                                                                                                                                                                                                       |
| **Tareas de oro**             | 1: `e2e/leads-alta.spec.ts`. 2: `e2e/cotizar-tarea-de-oro*.spec.ts` (4 specs). 4, el tramo del portal: `e2e/leads-portal-acceso.spec.ts`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 3 (Fase 6) y el turno de la 4 (Fase 8). No hay ninguna comprobación automática de accesibilidad (sin axe en `package.json`).                                                                                                                                                                                                                                                                                                                   |

**Lo que el párrafo de PLAN, las fichas o `docs/UX.md` dicen y la base no:**

1. «`actividad_purgar` (diario)» (ficha de `actividad`): **no hay job**. Los `cron.schedule` de `base.sql:32305–32310` y de `20261028183622_…:48–49` no la
   nombran; hoy la actividad no se purga nunca (ni `eventos_web`, `visitados` y `notificaciones`, que purga la misma función).
2. «El tablero muestra conversión de leads»: `leads` (4342) no guarda cuándo pasó a cliente y `actividad` dura 14 días. Hace falta una columna o definir la
   conversión por cohorte (duda del 9.07).
3. «Cola web» y «margen del mes»: `estado_cola_web` da acumulados de siempre y `margen_vehiculo` es por vehículo; el mes pide funciones nuevas.
4. 9-3 nombra «las RPC `leads_campos_*`»: se llaman `lead_campo_*`; `leads_campos_privacidad_aplicar` es un job.
5. 9-2 habla de «un valor fuera de `min`/`max`» como si el límite existiera: hay que crear las columnas (estructura: Nivel 2).
6. `docs/UX.md:98` dice «todo: `datos.todo`»: las claves son `datos.exportar.todo` y `datos.importar.todo`.
7. La ficha de `datos` dice «RPC: `crear_lead` por fila»; la decisión del 2026-10-15 es `_lead_crear` vía `leads_importar_lote`, que asigna a quien
   llama: «asignándolos a cualquiera» (`datos.importar.todo`) no tiene RPC.
8. «Lo que ve cada persona se acota por su cartera» (ficha de `actividad`): la policy entrega **todas** las filas (acción, registro y `detalle`) a quien
   tiene `actividad.ver`; el recorte sólo puede vivir en la función del diff, y `detalle` hay que revisarlo acción por acción.
9. «PWA (instalación, push, `sw.js` mínimo)»: el `sw.js` mínimo, el manifest y los íconos ya están; el push es de la Fase 7 (`supabase/functions/push`).
10. «Desplegada apuntando al proyecto Pro»: según `docs/ENTORNOS.md` la demo **es** producción (Supabase Pro) y `demo.yml` ya le aplica cada migración que
    entra a `main`. El piloto no despliega: prepara y verifica en seco (9.13).
11. **4-63** sólo está nombrado (`docs/PLAN.md:705`); su texto no está en PLAN (estará en `docs/archivo/`, que no pude leer).

### Partición

Un paso, su verificación y su PR; quién lo hace y de qué depende lo dice `docs/plan.yaml` (la tabla de «Carriles de las fases 5 a 9»). Cada fila dice qué entra, su assert y el lugar. Sus «Dudas» ya traen la opción recomendada: sin compuertas, **esa es la decisión**, y quien haga el paso la anota en `docs/DECISIONES.md` (el carril base) o en `docs/pasos/<paso>/decisiones.md`.

Catorce pasos. Para no pasar de 14 junté cosas que serían pasos propios; lo digo en cada uno («se puede partir en…»). «Adelantable» = no depende de las
fases 5 a 8 y puede tomarlo un carril libre desde hoy.

- **9.01** — Actividad: lectura recortada, purga y `/actividad`. **Adelantable.** _Base (partes 1 y 2), migración `actividad_…`:_ (a)
  `actividad_listar(p_antes_id, p_tamano, p_actor, p_tabla, p_registro, p_hasta)`: por cursor sobre `id` (la PK; nunca `offset`), una ruta por filtro en
  plpgsql con su `order by id desc limit`, tamaño por `_acotar_pagina` y registrada en `scripts/guardas/areas-<carril>/paginas-en-la-base.ts`; pide
  `actividad.ver`; devuelve acción, tabla, registro, quién (nombre) y cuándo, y un resumen armado por acción, **no el `detalle` en bruto**. (b)
  `actividad_diff(p_id) returns jsonb`, `security definer` con `set search_path = ''`: pide `actividad.ver` y devuelve sólo las claves que cambiaron
  `{campo: {antes, despues}}`, recortadas con una **lista cerrada por tabla**: `leads` → si `_lead_vivo_en_mi_cartera(registro)` es falso, sólo lo que
  está en `atributos_publicos` (ningún campo «solo la cartera»), y nunca `numero`, `numero_propio` ni `telefono_principal`; `vehiculos`, `cotizaciones`,
  `documentos`, `gastos`, `pagos`, `transportes`, `declaraciones_aduana`, `comprobantes`, `repuestos_*` → `{visible: false}` si quien mira no tiene el
  permiso de ver esa entidad en su origen (`puede_vehiculo`, `puede_cotizacion`); configuración (`roles_permisos`, `usuarios_roles`, `fases*`,
  `origenes*`, `leads_campos`, `ajustes_*`, `integraciones`, `tipos_cambio`, `plantillas_tarjeta`, `formulas`, `categorias`, `cola_web_asesores`) →
  entero; nunca `clave_hash`, `apibara_raw` ni un secreto; tabla que no está en la lista → `{visible: false}`. (c) Índices `actividad (actor_id, id desc)`
  y `actividad (tabla, id desc)`; «Ir a una fecha» por `actividad_fecha_idx`. (d) El job `actividad-purgar` (diario, `cron.schedule` en la migración) y
  `actividad_purgar()` por lotes de 10.000 con tope por corrida (el patrón de `importaciones_vinculos_purgar`, `base.sql:11465`). (e) La deuda aceptada
  de `registrar_actividad()`: se le quita el `execute` a `authenticated` si ninguna función de invocador la llama (se busca en `pg_proc`); si alguna la
  llama, queda escrita con su nombre. _Pantalla (partes 3 y 4):_ `/actividad` (`actividad.ver`): tabla agrupada por día (zona horaria de la empresa, con
  `fechas.ts`), «Ver más» con `TAMANO_DE_VER_MAS` hasta `TOPE_DE_LO_CARGADO` y `<AvisoDeTope>`, «Ir a una fecha» (`src/shared/ui/ir-a-una-fecha.tsx`),
  filtros en la URL con `nuqs` (`?persona=`, `?entidad=`, `?registro=`, `?accion=`), y el diff en un `<Drawer>` con URL (`?cambio=<id>`), leído al
  abrirlo y con su código por `diferido()`. `entities/diff.ts` presenta cada clave con el término del glosario; las claves de `atributos` llevan la
  etiqueta del campo (`leads_campos`, `origenes_campos`: ningún texto fijo las nombra), y los montos van por `<Monto>`. Estados de `docs/UX.md`:
  esqueleto de tabla, vacío de primera vez («Todavía no hay actividad de los últimos 14 días.»), vacío por filtro con «Limpiar filtros», error con
  «Reintentar», sin permiso; en el drawer, «No tienes acceso a este cambio.» cuando llega `visible: false`. Prende `actividad` en
  `_shell/navegacion.ts`. **No entra:** la línea de tiempo dentro de las fichas (ver dudas), exportar la actividad, cambiar `actividad_dias` (ya está en
  Empresa › Retención). Cierra: el arrastrado «Actividad lee el diff por una función que recorta según la cartera» y la deuda de `registrar_actividad()`.
  **Assert:** `supabase/tests/areas/actividad/actividad.sql`: sin `actividad.ver`, 42501 en las dos funciones; A con `actividad.ver` y sin el lead en su
  cartera no recibe el valor de un campo «solo la cartera» y B, en la cartera, sí; ningún resultado trae `numero`, `numero_propio` ni un teléfono (el
  patrón de `numero-global.sql:249`), y las dos funciones entran al inventario de `numero-global.sql`; una tabla auditada que no está en la lista da
  `visible: false` (la prueba recorre los triggers `%auditar%` de `pg_trigger`: una tabla nueva sin recorte declarado la hace caer); `anon` no ejecuta
  nada. `supabase/tests/jobs.sql`: el job existe y la purga respeta `actividad_dias`. Vitest de `entities/diff.ts` (sólo lo que cambió; un monto sale
  como monto). `e2e/actividad.spec.ts` (camino feliz: la dueña cambia el nombre de un lead, lo ve en `/actividad` bajo «Hoy», abre el diff y lee antes y
  después; una asesora sin el permiso no tiene la entrada en el menú). Lugar: `supabase/migrations/*_actividad_*.sql`, `supabase/tests/areas/actividad/`,
  `src/modules/actividad/{entities,infra,features/listado,pantallas/listado.ts,index.ts,CLAUDE.md}`, `src/app/(app)/actividad/{page,loading}.tsx`,
  `src/app/(app)/_shell/navegacion.ts`, `e2e/actividad.spec.ts`, `docs/UX.md` (fila «Actividad»). Nivel **2** (estructura: índices nuevos; layout:
  `_shell`). Tipo: datos y dinero. Partes estimadas: 4.
  Dudas, con la recomendada: (1) ¿La línea de tiempo dentro de la ficha (`actividadDe(entidad)` de la ficha del módulo)? Recomiendo **no**: un enlace «Ver actividad» en el «⋯» de la ficha de lead y de vehículo a `/actividad?entidad=leads&registro=<id>`, sólo para quien tiene `actividad.ver`; cubre la necesidad sin una pestaña nueva ni tocar dos módulos ajenos. (2) ¿Qué ve del diff de un lead ajeno quien tiene `actividad.ver`? Recomiendo lo público y nada más (lo que ya ve en `leads_vista`); el dueño tampoco ve teléfonos, como dice la ficha. (3) Se puede partir en 9.01a (base, `opus`) y 9.01b (pantalla, `sonnet`).

- **9.02** — Inicio: la bandeja con huecos y los bloques de lo que ya existe. **Adelantable, y conviene que entre antes de las fases 6, 7 y 8**, que
  llenan sus bloques. Deja la base del área `bandeja` del módulo `tablero`: cada bloque de `BLOQUES_BANDEJA` pasa a tener **su archivo**
  `features/bandeja/bloques/<clave>.tsx` (un Server Component bajo su `<Suspense>` con el esqueleto del bloque, que lee por la entrada pública del
  módulo dueño) y un registro `features/bandeja/bloques/registro.ts` con las diez claves ya declaradas, cada una apuntando a su archivo: los siete de
  módulos que no existen nacen como hueco (el vacío de hoy) y **la fase que lo llena edita sólo su archivo** (`vehiculos-trabados`,
  `documentos-por-aprobar`, `alertas-demora`: Fase 6; `tareas`: Fase 7; `turnos-web`, `repuestos-por-mover`, `esperas-repuestos`: Fase 8). Este paso
  llena los tres de lo que ya está hecho: «Recordatorios de hoy» (los míos que vencen hoy, hasta 5, cada uno a su ficha `?seccion=seguimientos`),
  «Leads sin seguimiento» (míos y en cartera, con `ultimo_seguimiento_en` nulo) y «Personas sin rol» (`equipo.usuarios.gestionar`; a
  `/configuracion/equipo`). Cada bloque pide `tope + 1` y dice «más de N» (`conteoAcotado()`), nunca un total; el encabezado lleva a la lista filtrada
  si el filtro existe en ese listado (si no, enlaza cada fila y no inventa un filtro). Estados: esqueleto por bloque, vacío con su frase (la de
  `bandeja.ts`), error por bloque con «Reintentar» sin tumbar los demás; «sin rol» como hoy. Las lecturas nuevas viven en su módulo (`leads/infra/` y
  `equipo/infra/`) y salen por su `index.ts`; `tablero` declara que depende de `leads` y `equipo` en su ficha. **No entra:** widgets en Inicio (dudas
  del 9.08), los siete bloques de las otras fases. Cierra: nada numerado; es la base que las otras fases necesitan. **Assert:** vitest de
  `entities/bandeja.ts` (cada clave del catálogo tiene su entrada en el registro y al revés; un bloque sin su permiso no se monta);
  `e2e/inicio-bandeja.spec.ts` (camino feliz: una asesora con un recordatorio para hoy lo ve en su bloque y llega a la ficha; la dueña ve «Personas sin
  rol» con la persona recién invitada; un bloque de otra fase muestra su vacío). Lugar: `src/modules/tablero/{entities/bandeja.ts,
features/bandeja/,infra/bandeja/,pantallas/inicio.ts,CLAUDE.md}`, `src/modules/leads/{infra,index.ts}`, `src/modules/equipo/{infra,index.ts}`,
  `src/app/(app)/page.tsx`. Nivel **1** (Nivel 2 sólo si una lectura pide un índice nuevo). Tipo: pantalla. Partes estimadas: 2.
  Dudas, con la recomendada: (1) ¿Qué es «sin seguimiento»? Recomiendo: mío, en mi cartera, sin ningún seguimiento y creado hace más de 24 h (lo que la asesora dejó sin contactar ayer); `ajustes_empresa.lead_dormido_meses` es otra cosa y sigue sin lector (ver E). (2) ¿Los bloques leen en el servidor o desde el navegador? Recomiendo en el servidor, cada uno tras su `<Suspense>` con `await connection()`: Inicio no suma JS y un bloque lento no frena a los demás.

- **9.03** — Dominancia sobre la persona (9-1). **Adelantable.** _Base (parte 1):_ migración `equipo_…` con `persona_dominada(p_usuario) returns
boolean` (`stable`, `security definer`, `set search_path = ''`: quien llama cubre **todo** permiso de esa persona, con la misma comparación de origen
  y alcance que `rol_dominado()`, `base.sql:16787`; el dueño domina a todos) y las cuatro RPC que la exigen tras su `assert_permiso` y con la fila de
  `perfiles` tomada `for update`: `equipo_bloquear` (10168), `equipo_dar_de_baja` (10196), `rbac_asignar_rol` (16331) y `rbac_quitar_rol` (16453); 42501
  con un mensaje legible («No puedes bloquear a <nombre>: tiene permisos que tú no tienes.»). `equipo_lista()` (10226) suma `dominada` por fila para
  que la interfaz no necesite los permisos de nadie. _Interfaz (parte 2):_ `accionesSobre()` (`equipo/entities/persona.ts:212`) apaga bloquear, dar de
  baja y cada interruptor de rol con su motivo a la vista (el patrón de `rolDominado()`: deshabilitado con motivo, nunca escondido), en `menu-persona.tsx`
  y `panel-roles-persona.tsx`. Con «Ver como» la base decide igual (la deuda «acota la interfaz, no las filas» sigue aceptada). **No entra:** cambiar
  qué permisos existen ni la matriz de Roles. Cierra **9-1** y la deuda que lista la ficha de `equipo` (línea 54). **Assert:**
  `supabase/tests/dominancia-persona.sql` (en `db:probar`): A con `equipo.*` y sin `leads.numero_global.ver` recibe 42501 con su mensaje en las cuatro
  RPC sobre B, que sí lo tiene; el dueño puede sobre B; C, que cubre todo lo de B, puede; nadie se bloquea a sí mismo (como hoy). Una carrera en
  `scripts/carreras/dominancia.mjs` (`db:carreras`): A bloquea a B mientras el dueño le asigna a B un rol que A no cubre; gane quien gane, B no queda
  bloqueado por alguien que no lo domina. Vitest de `entities/persona.ts` y `entities/dominancia.ts` (el motivo sale cuando `dominada` es falso). Lugar:
  `supabase/migrations/*_equipo_*.sql`, `supabase/tests/dominancia-persona.sql`, `scripts/carreras/dominancia.mjs`, `scripts/carreras.mjs`,
  `src/modules/equipo/{entities,infra,features/equipo/components}`. Nivel **1** + cadena db + `db:carreras` (no crea tabla, índice ni policy). Tipo:
  datos y dinero. Partes estimadas: 2.
  Dudas, con la recomendada: (1) ¿Desbloquear también exige dominar? Recomiendo sí (es la misma RPC con `p_bloquear = false`, y desbloquear a quien tiene más permisos que tú es darle acceso). (2) ¿Quitarle un rol que sí dominas a alguien que no dominas? Recomiendo que no: la regla del 2026-10-21 es sobre la persona.

- **9.04** — Configuración de leads que quedó: `leads.campos.gestionar` (9-3), el rango de un campo numérico (9-2) y las plantillas por empresa.
  **Adelantable.** Van juntos porque los tres editan `lead_campo_*` o las pestañas de Configuración › Leads: en carriles distintos chocarían. _Parte 1
  (9-3):_ migración `leads_…`: siembra `leads.campos.gestionar` en `permisos` con su `aplicado_en`, la concede a todo rol que hoy tiene
  `leads.configurar` (mismo alcance), y `lead_campo_crear/guardar/eliminar/mover/impacto` (`base.sql:11638–11855`) pasan a pedirla;
  `leads.configurar` sigue para `origen_lead_*`, `tipo_lead_*` y `tipo_seguimiento_*`. En el código: `CLAVES_PERMISO` y su etiqueta
  (`src/shared/lib/permisos.ts`), `supabase/seed.sql`, `secciones.ts` (la sección «Leads» se abre con cualquiera de las dos), la lista de permisos del
  hub en `_shell/navegacion.ts` y `configuracion/leads/pestanas.ts` («Campos» con la nueva; las otras con `leads.configurar`; la que no puedes abrir,
  deshabilitada con su motivo). _Partes 2 y 3 (9-2):_ migración `campos_…` con `minimo` y `maximo` (`numeric`, nulos = sin límite; `check (minimo <=
maximo)`; sólo en tipos `numero` y `moneda`) en `leads_campos` y `origenes_campos`, con sus grants de columna; `_lead_atributos_formato()` (3764) y la
  validación de vehículos (`vehiculo_validar_atributos`, 19011, y `_atributos_validar`, 630) rechazan lo que queda fuera con 22023, el motivo
  («"Edad" va de 18 a 99.») y `hint = 'atributos.<clave>'`; `lead_campo_guardar` y `origen_campo_guardar` aceptan los dos límites en `p_cambios`;
  `lead_campo_impacto` y `origen_campo_impacto` cuentan (acotado) los valores que quedarían fuera. En `shared`: `esquema-de-valor.ts` (las líneas 165 y
  166 pasan el rango del campo a `numero()`), `tipos.ts`, `impacto.ts` (`resumenDeImpacto()` dice «N leads tienen un valor fuera de este rango»), y el
  panel del campo de `src/shared/ui/campos/` gana «Mínimo» y «Máximo» con el aviso de impacto antes de guardar; el formulario dice el motivo junto al
  campo. _Partes 4 y 5 (plantillas por empresa):_ tabla nueva de una fila `ajustes_leads` (`embudo_etapas jsonb`, `portal_mensaje text`,
  `actualizado_en`; RLS: la lee `authenticated`, sólo se escribe por RPC), `embudo_plantilla_guardar(p_etapas, p_actualizado_en_esperado)` y
  `portal_mensaje_guardar(p_texto, p_actualizado_en_esperado)` con `leads.configurar` y `PT409`; `_embudo_defecto_de()` (2485) toma las etapas de la
  plantilla (nula = las seis de fábrica) y sólo afecta a los embudos que nazcan después; `textoParaWhatsApp()` aplica la plantilla (variables
  `{cliente}`, `{empresa}`, `{codigo}`, `{clave}`, `{direccion}`; `{codigo}` y `{clave}` obligatorias; nula = la de fábrica). Pantallas: Configuración ›
  Leads › `?seccion=embudo` (reusa el editor de etapas de `features/embudo`) y `?seccion=portal` (un `<Textarea>` con vista previa y «Restablecer»),
  con esqueleto, error con «Reintentar», conflicto con «Recargar» y cambios sin guardar. **No entra:** cambiar embudos que ya existen; `lead_dormido_meses`
  y `demora_dias_default` (ver E). Cierra **9-2**, **9-3** y los arrastrados «plantilla de etapas de embudos por empresa» y «plantilla del texto del
  portal por empresa» (también el de ESTADO: «Portal: su texto por empresa»). **Assert:** `supabase/tests/permisos-enforcement.sql` ve la clave nueva
  sin excepción; `supabase/tests/configuracion-de-leads.sql` suma: con sólo `leads.configurar`, `lead_campo_guardar` da 42501 y `tipo_lead_*` pasa, y al
  revés; un rol que tenía `leads.configurar` conserva las dos tras la migración. `supabase/tests/areas/campos/rango.sql`: 17 con rango 18–99 se rechaza
  en lead y en vehículo con su `hint`; el impacto cuenta los que quedan fuera; un valor que ya estaba fuera no impide guardar otro campo. Vitest de
  `esquema-de-valor.ts` e `impacto.ts`. `supabase/tests/areas/plantillas/plantillas.sql`: sin permiso 42501; plantilla sin etapa inicial, o sin `{codigo}`,
  se rechaza; un embudo nuevo nace con las etapas de la plantilla y uno viejo no cambia; RLS de `ajustes_leads` en `humo.sql`. Vitest de
  `portal-mensaje.ts`. `e2e/configuracion-leads-plantillas.spec.ts` (camino feliz, `// @sin-celular-archivo`: la dueña cambia el texto del portal y al
  dar acceso a un lead el texto para WhatsApp es el nuevo). Lugar: `supabase/migrations/*_{leads,campos,embudo,portal}_*.sql`, `src/shared/lib/campos/`,
  `src/shared/ui/campos/`, `src/shared/lib/permisos.ts`, `src/modules/leads/{entities,infra,features/campos,features/embudo,features/portal,
pantallas/configuracion.ts}`, `src/modules/origenes/features/campos/`, `src/app/(app)/configuracion/{secciones.ts,leads/}`. Nivel **2** (estructura:
  columnas y una tabla con RLS; `src/shared`; `_shell`). Tipo: datos y dinero. Partes estimadas: 5.
  Dudas, con la recomendada: (1) ¿Un valor que ya estaba fuera del rango impide guardar la ficha? Recomiendo que no: se valida el campo sólo si cambió (la función ya recibe `p_anteriores`), y el impacto avisa cuántos hay. (2) ¿Quién edita las plantillas? Recomiendo `leads.configurar` (no un permiso nuevo: sería otro interruptor para lo mismo). (3) **No puede correr en paralelo con el paso de la Fase 6 que hace 6-1** (la bandera «principal» toca `origenes_campos`, `origen_campo_guardar` y el mismo panel del campo). (4) Se puede partir en 9.04a (partes 1 a 3) y 9.04b (partes 4 y 5), sin dependencia entre sí.

- **9.05** — Datos: exportar todo (`/datos`, primera mitad). **Adelantable.** Deja la base del módulo `datos` (entradas, la ruta `/datos` con dos
  secciones por URL, `?seccion=exportar|importar`; «Importar» nace como hueco que llena el 9.06). _Base (parte 1):_ migración `datos_…` con
  `datos_exportacion_registrar(p_entidad, p_filas, p_filtros)`, `security definer`: pide `datos.exportar.todo`, limita a 3 por hora y por entidad con
  un candado por persona (el patrón de `leads_exportacion_registrar`, `base.sql:13230`) y deja la constancia `datos.exportado` en `actividad` sin datos
  de nadie; es el punto de enforcement, y **la lectura no usa ninguna función definer nueva**: sale por lo que quien exporta ya ve con su sesión («exportar
  respeta RLS: lo que no ves no sale»). _Route handler y pantalla (partes 2 y 3):_ `POST /datos/exportar` (con `Origin`, Zod en el cuerpo) escribe el
  CSV por páginas de cursor, sin cargar todo en memoria, con `src/shared/lib/csv/escribir.ts` (BOM, `;`, apóstrofo ante `= + - @`): **leads** (todos los
  que ve con su alcance; el teléfono completo sólo donde está en la cartera, enmascarado en el resto; los campos «solo la cartera» sólo de su cartera;
  el número global sólo con `leads.numero_global.ver`), **vehículos** (un archivo por origen, con las columnas de su layout) y **cotizaciones** (la
  cabecera que entrega `cotizaciones_listado()`: número, cliente, vehículo, clase, estado, total visible, fechas). Tope por archivo: 250.000 filas; con
  más, se pide por rango de fechas (`?desde=&hasta=`) y la pantalla lo dice. La sección «Exportar» de `/datos`: para todos, «Mis leads» (enlaza al
  exportar de `/leads`, que ya existe); con `datos.exportar.todo`, una tarjeta por entidad con su rango de fechas y «Descargar». Estados: «Preparando
  el archivo…» con el botón apagado, error con «Reintentar», el límite por hora con la hora en que se libera, sin permiso: la tarjeta deshabilitada con
  su motivo. Prende `datos` en `_shell/navegacion.ts`. **No entra:** exportar seguimientos, documentos, fotos ni repuestos; un formato que no sea CSV.
  Cierra la deuda «`datos.exportar.todo` sin enforcement» (se borra su excepción de `permisos-enforcement.sql`). **Assert:**
  `supabase/tests/areas/datos/exportar.sql`: sin el permiso, 42501; la cuarta en una hora devuelve `libre_en`; la constancia no guarda datos; y con dos
  cuentas, lo que lee quien exporta de un lead ajeno trae el teléfono enmascarado y ningún campo privado (la consulta del route handler, llamada como esa
  cuenta). `numero-global.sql`: la lectura nueva entra a su inventario. Vitest de `entities/exportacion.ts` (columnas por entidad; un origen sin campos).
  `e2e/datos-exportar.spec.ts` (camino feliz: la dueña descarga los leads y el CSV trae la fila de un lead ajeno con el teléfono enmascarado; una
  asesora ve sólo «Mis leads»). Lugar: `supabase/migrations/*_datos_*.sql`, `supabase/tests/areas/datos/`, `src/modules/datos/{entities,infra,
features/exportar,pantallas/datos.ts,index.ts,CLAUDE.md}`, `src/app/(app)/datos/{page,loading}.tsx`, `src/app/(app)/datos/exportar/route.ts`,
  `src/app/(app)/_shell/navegacion.ts`, `e2e/datos-exportar.spec.ts`, `docs/UX.md` (fila «Datos»: corregir `datos.todo`). Nivel **2** (layout: `_shell`).
  Tipo: datos y dinero. Partes estimadas: 3.
  Dudas, con la recomendada: (1) ¿Qué entidades? Recomiendo leads, vehículos y cotizaciones (lo que hay que poder llevarse); lo demás se suma cuando alguien lo pida. (2) ¿«Todo» incluye los teléfonos y lo privado de carteras ajenas? Recomiendo **no**, como dicen las fichas de `datos` y `actividad` (el dueño ve todo salvo teléfonos): un permiso de exportar no puede ser la puerta trasera de la privacidad. (3) ¿Tope? Recomiendo 250.000 filas por archivo y 3 por hora.

- **9.06** — Datos: importar todo con `supabase/functions/importar-csv` (`/datos`, segunda mitad). **Adelantable** (después del 9.05). _Base (partes 1
  y 2):_ migración `importaciones_…`: `importacion_crear(p_entidad, p_archivo_ruta, p_mapeo, p_asignar_a)` (crea la fila en `pendiente`; `leads` y
  `vehiculos`; con `p_asignar_a` distinto de quien llama pide `datos.importar.todo`, y el destino tiene que estar activo y poder crear leads; sin él,
  `leads.crear`), columnas de avance en `importaciones` (`procesadas`, `asignar_a`), `importacion_procesar_lote(p_importacion, p_desde, p_filas)`
  **sólo para `service_role`**, que actúa a nombre de `importaciones.usuario_id` volviendo a comprobar sus permisos en cada lote y llama por fila a
  `_lead_crear` (la misma regla de duplicados y limbo: «ya existe» sin nombrar a nadie, nunca adopta en bloque) o a `vehiculo_crear` (18518, con
  `vehiculos.crear` del origen), todo o nada por fila y con el informe en `importaciones.errores`; `importacion_terminar`; y el job
  `importaciones-continuar` que vuelve a disparar las que quedaron a medias (el patrón de pase de `storage_gc_disparar`: `pg_cron` → `pg_net`). _Función
  edge (parte 3):_ `supabase/functions/importar-csv` (Deno): canjea el pase, baja el archivo del bucket `importaciones`, parsea (`;` o `,` detectado),
  valida contra `entities/plantillas.ts` y procesa hasta N lotes de 50 por invocación guardando el avance; un archivo se retoma donde quedó y **nunca
  importa dos veces la misma fila** (idempotente por importación y número de fila). _Pantalla (partes 4 y 5):_ la sección «Importar» de `/datos`:
  entidad → archivo (se sube al confirmar, a `importaciones/<uid>/…`) → emparejar columnas → vista previa de las primeras 500 filas con su error por
  fila → «Importar N filas» → avance leído de `importaciones` (sin realtime: se relee cada pocos segundos mientras la sección está abierta) → resultado
  con «Descargar las rechazadas»; y «Importaciones», la lista de las propias (de todos con `datos.importar.todo`) por cursor, 20 por página. Estados:
  los de `docs/UX.md` más «Sin conexión: el archivo no se subió» y la importación a medias que se retoma. **No entra:** `seguimientos` y
  `repuestos_items` (el `check` ya los admite: quedan para quien los pida), importar cotizaciones, deshacer una importación de vehículos. Cierra el
  arrastrado «`datos` (importar de todo para el dueño con `importar-csv`)». **Assert:** `supabase/tests/areas/datos/importar.sql`: sin
  `datos.importar.todo`, crear una importación para otra persona da 42501; `importacion_procesar_lote` no la ejecuta `authenticated`; un teléfono que ya
  existe queda como «ya existe» sin nombre y no adopta del limbo; si a quien importa le quitan el permiso a mitad, el lote siguiente se rechaza; repetir
  un lote no duplica. Una carrera en `scripts/carreras/importacion-total.mjs`: dos invocaciones de la función sobre la misma importación no procesan el
  mismo lote dos veces. Vitest de `entities/plantillas.ts` (validadores por columna). `e2e/datos-importar.spec.ts` (camino feliz, con `pnpm funciones`:
  la dueña importa 3 leads para una asesora, uno con el teléfono repetido; el resultado dice 2 y 1, y la asesora los ve en su cartera). Lugar:
  `supabase/migrations/*_importaciones_*.sql`, `supabase/functions/importar-csv/{index.ts,deno.json}`, `supabase/functions/README.md`,
  `supabase/tests/areas/datos/`, `scripts/carreras/`, `src/modules/datos/{entities/plantillas.ts,infra/importar.ts,features/importar}`,
  `src/app/(app)/datos/`, `e2e/datos-importar.spec.ts`. Nivel **2** (estructura: columnas de `importaciones`). Tipo: datos y dinero. Partes estimadas: 5.
  Dudas, con la recomendada: (1) ¿Se puede deshacer una importación total de leads? Recomiendo sí, con lo que ya existe (`importaciones_leads` y `leads_importacion_deshacer`, 24 h, sólo lo intacto) y sólo quien la hizo. (2) ¿Tamaño? Recomiendo 20.000 filas por archivo aunque el bucket admita 50 MB: un archivo más grande se parte (lo dice la pantalla antes de subir). (3) ¿La columna «Asesor» por fila o un destino por archivo? Recomiendo un destino por archivo (`p_asignar_a`): una columna por fila pide validar personas fila a fila y nadie lo pidió. (4) Se puede partir en 9.06a (base y función) y 9.06b (pantalla, `sonnet`).

- **9.07** — Tablero: las métricas en la base. **Adelantable** (leads y cotizaciones ya existen). Migración `tablero_…`: (a) `leads.cliente_desde
timestamptz` (sin grant de columna: sólo la leen las RPC), puesta por un trigger cuando el tipo del lead pasa a **clase** `cliente` y vaciada si
  vuelve a `prospecto` (mira `tipos_lead.clase`, nunca el nombre ni la clave: 9j), con su índice parcial por fecha; (b) `tablero_leads(p_desde, p_hasta)`
  → `{creados, convertidos, tasa, por_dia[], por_origen[], por_asesor[]}` y `tablero_cotizaciones(p_desde, p_hasta)` → `{creadas, finales, por_dia[],
por_origen[]}`: `security definer` con `set search_path = ''`, piden `tablero.metricas.ver`, ventana de hasta 366 días, días cortados en la zona
  horaria de la empresa, sin papelera, cada una caminando un índice por fecha (`leads_listado_idx`, el nuevo de `cliente_desde`,
  `cotizaciones_listado_idx`) y con los rankings acotados (10 orígenes, 20 personas); sólo cuentas, ningún monto; `tasa` es nula con `creados = 0`.
  **Una RPC por grupo de widgets** (y no una sola para todo el tablero): así el 9.11 agrega dos funciones sin reescribir estas y cada widget carga y
  falla solo. Los `count(` van al registro de `supabase/tests/escala.sql` con su motivo («agregado de un período cerrado, por índice de fecha»). **No
  entra:** pantalla; margen y cola web (9.11); métricas por asesor para quien no tiene `tablero.metricas.ver`. Cierra la deuda «`tablero.metricas.ver`
  sin enforcement» (se borra su excepción) y la regla del párrafo (la conversión cuenta por la clase). **Assert:**
  `supabase/tests/areas/tablero/metricas.sql`: sin el permiso, 42501 en las dos; un lead marcado cliente este mes cuenta en `convertidos`; renombrar el
  tipo «Cliente» no cambia la cuenta, y un segundo tipo de clase `cliente` también cuenta; un lead en la papelera no cuenta; el borde del mes cae en
  `America/La_Paz` y no en UTC; `tasa` nula sin leads; `anon` no ejecuta. `permisos-enforcement.sql` y `escala.sql` en verde. Lugar:
  `supabase/migrations/*_tablero_*.sql`, `supabase/tests/areas/tablero/`, `supabase/tests/{escala,permisos-enforcement}.sql`. Nivel **2** (estructura:
  columna e índice). Tipo: datos y dinero. Partes estimadas: 2.
  Dudas, con la recomendada: (1) **«Un número que se muestra nunca es un total exacto»** (`CLAUDE.md`) contra un tablero, que es contar. Recomiendo una excepción escrita en `docs/DECISIONES.md` y `escala.md`: los agregados de un período cerrado se cuentan en la base, con ventana máxima, por índice de fecha y con su motivo en `escala.sql`; las listas siguen igual. (2) ¿Qué es la conversión del mes? Recomiendo dos números: «Convertidos» (por `cliente_desde` en el período) y «Tasa» = convertidos del período / creados del período. (3) ¿Los clientes que ya existen? Recomiendo dejar `cliente_desde` nulo (no se sabe cuándo pasaron) y decirlo en el widget el primer mes («Desde <fecha de la migración>»); no inventar fechas.

- **9.08** — Tablero: `/tablero` con widgets personalizables. **Adelantable** (después del 9.07). Área `metricas` del módulo `tablero` (no toca la de
  `bandeja`, del 9.02): `entities/widgets.ts`, el catálogo tipado (clave, título, permisos que exige, grupo de RPC, tamaño), con un widget por archivo
  en `features/metricas/widgets/<clave>.tsx` y un registro con todas las claves declaradas (las de margen y cola web nacen como hueco para el 9.11);
  `infra/queries/metricas.ts` llama a cada RPC **en el servidor**, cada widget tras su `<Suspense>`. Pantalla `/tablero` (`tablero.metricas.ver`):
  período en la URL (`?periodo=mes|mes-anterior|90d`), cifras grandes («Leads creados», «Convertidos», «Tasa de conversión», «Cotizaciones», «Finales»),
  barras por día y rankings por origen y por persona. Gráficas en SVG propio con los tokens `--viz-*` (leer la skill `dataviz` antes; sin librería
  nueva), cada una con su tabla equivalente («Ver como tabla») y nunca sólo color; números con `formato.ts`. «Personalizar» en un `<Drawer>` con URL
  (`?panel=personalizar`): mostrar u ocultar y subir o bajar cada widget (botones, como `src/shared/ui/lista-de-catalogo/`; sin arrastrar), guardado en
  `preferencias_usuario` con la clave `tablero.widgets` (`{orden, ocultos}` validado con Zod; una clave que ya no existe se ignora y un widget nuevo
  aparece al final) por una acción genérica de preferencias que `equipo` pasa a exponer por su `index.ts`. Estados: esqueleto por widget, vacío con la
  acción que lo llena («Todavía no hay leads este mes» con «Nuevo lead» si puede), error por widget con «Reintentar», sin permiso (`<EstadoSinPermiso>`),
  y un widget cuyo permiso no tienes no se muestra ni se ofrece en «Personalizar». Prende `tablero` en `_shell/navegacion.ts`. **No entra:** widgets en
  Inicio (dudas), exportar una gráfica, comparar períodos. Cierra el arrastrado «tablero de equipo (`tablero.metricas.ver`)». **Assert:** vitest de
  `entities/widgets.ts` (visibles según permisos; aplicar `{orden, ocultos}` con claves viejas y nuevas; una tasa nula se escribe «Sin datos», nunca
  «0 %»); `e2e/tablero.spec.ts` (camino feliz: la dueña ve «Convertidos: 1» tras marcar final una cotización en la preparación, oculta un widget,
  recarga y sigue oculto; la asesora sin el permiso no tiene la entrada y `/tablero` le dice que no tiene permiso). Lugar:
  `src/modules/tablero/{entities/widgets.ts,infra/queries/,features/metricas/,pantallas/tablero.ts,CLAUDE.md}`, `src/modules/equipo/{infra/perfil.ts,
index.ts}`, `src/app/(app)/tablero/{page,loading}.tsx`, `src/app/(app)/_shell/navegacion.ts`, `e2e/tablero.spec.ts`, `docs/UX.md` (fila «Tablero»),
  `docs/GLOSARIO.md` («Widget»). Nivel **2** (layout: `_shell`). Tipo: pantalla. Partes estimadas: 3.
  Dudas, con la recomendada: (1) ¿Widgets en Inicio («bandeja por rol + widgets opcionales», `docs/UX.md:74`)? Recomiendo **no**: Inicio sigue siendo la bandeja («no dashboard», Decisiones de UX) y quien tiene `tablero.metricas.ver` ve en su cabecera el enlace «Ver el tablero». (2) ¿«Por rol»? Recomiendo por permiso: cada widget declara los suyos y el tablero muestra los que te tocan; no hay un tablero distinto por nombre de rol. (3) ¿Librería de gráficas? Recomiendo SVG propio: una dependencia nueva es una compuerta `dependencia` que detiene al carril, y el JS de la ruta tiene presupuesto.

- **9.09** — Higiene del e2e, del CI y de los entornos (9-4 a 9-6, 9-8 a 9-11 y 4-41). **Adelantable.** _Parte 1 (9-8):_ `e2e/empresa.spec.ts:194` y
  `e2e/soporte/empresa.ts` dejan `vault.secrets` de `integracion:apibara` como estaba: mueven la clave real de lugar por SQL sin descifrarla y la
  devuelven al terminar, también si la prueba cae (con `e2e/soporte/apibara-clave.ts`). _Parte 2 (9-9 y 9-10):_ las mediciones de una sola vez esperan
  un estado antes de medir o capturar (`aLaVistaAlAcomodarse()`, `esperarHidratado()`, la pista con `data-visible`) y las esperas de fábrica de 5 s
  sobre un pedido pasan a esperar su respuesta con tope propio, en un ayudante de `e2e/soporte/esperas.ts`, en los archivos y líneas que PLAN lista.
  _Parte 3 (9-11, 9-4, 9-5, 9-6):_ el paso `if: failure()` del job e2e (`.github/workflows/ci.yml:224–232`) suma a `e2e-fallos/` el log de la base,
  las 30 consultas más lentas de `pg_stat_statements`, `pg_stat_user_tables` de `leads` y `leads_asesores`, `pg_stat_checkpointer` y
  `cron.job_run_details` de los últimos 15 min, en un guion `scripts/ci/volcar-base.sh` que también corre en local, y
  `scripts/guardas/workflows.test.ts` exige esos archivos; 9-4 y 9-5 quedan **cerrados como decididos** (fuera de CI; la guarda `FUERA_DE_CI` ya lo
  vigila); 9-6 queda con su cuenta en 3 de 5 y **en la lista de la persona** (el hook no deja a una sesión correr `gh workflow run`). _Parte 4 (4-41):_
  `pnpm env:check produccion`: lee por API **los nombres, nunca los valores** de las variables de Vercel (producción y preview), los secretos de las
  funciones y la configuración de Auth de Supabase, y dice qué falta en cada lugar de la tabla de `docs/ENTORNOS.md`; sin `VERCEL_TOKEN` o
  `SUPABASE_ACCESS_TOKEN` no falla a ciegas: lista cada lugar como «no se pudo leer: falta <token>» y sale con un código propio. Los dos lectores son
  adaptadores con `fetch` inyectado; la lista de variables sale de `src/shared/config/esquemas.ts` (un esquema `esquemaDeProduccion`). **La sesión no
  lo corre contra la nube**: lo prueba con `fetch` simulado. **No entra:** estabilizar inestables; meter `db:medir` o las carreras al CI; `deno check`
  de las funciones en el CI (dependencia nueva: ver E). Cierra **9-4**, **9-5**, **9-8**, **9-9**, **9-10**, **9-11** y **4-41**; **9-6** sigue abierto
  con dueño (la persona). **Assert:** el spec de 9-8 lo afirma sobre sí mismo: tras `empresa.spec.ts`, `id`, `updated_at` y `md5` del cifrado de
  `integracion:apibara` son los de antes, con y sin clave previa. Cada espera de 9-10 pasa con su POST demorado 6 s por `page.route` (un caso por
  archivo). `scripts/guardas/workflows.test.ts` cae si el paso de fallo no vuelca esos archivos, y `volcar-base.sh` corrido en local los deja con
  contenido. `scripts/env-check.test.ts`: con respuestas simuladas de las dos API, `produccion` nombra lo que falta en cada lugar; sin tokens, lo dice;
  y ninguna salida contiene un valor. Lugar: `e2e/empresa.spec.ts`, `e2e/soporte/{empresa,esperas,recorrido}.ts`, los specs de 9-9 y 9-10,
  `.github/workflows/ci.yml`, `scripts/guardas/workflows{,.test}.ts`, `scripts/ci/volcar-base.sh`, `scripts/env-check{,.test}.ts`,
  `scripts/lib/entornos/` (nuevo), `src/shared/config/esquemas.ts`, `docs/ENTORNOS.md`. Nivel **2** (`src/shared`). Tipo: pantalla (herramientas: sin
  datos ni permisos de producto). Partes estimadas: 4.
  Dudas, con la recomendada: (1) 9-11 pide «un rojo provocado a propósito en un dispatch»: una sesión no puede dispararlo. Recomiendo demostrarlo en local con el guion y dejar el dispatch en la lista de la persona. (2) 9-9 pide «15 de 15 con la CPU a 20×»: son 15 corridas por archivo; recomiendo 5 de 5 (lo decidido el 2026-11-08 es no gastar en estabilizar) y decirlo en el informe. (3) **No en paralelo con el paso de la Fase 7 que hace 7-1** (los dos editan `esquemas.ts`), ni con el 9.13.

- **9.10** — PWA: instalar la app, el `sw.js` y el logo oscuro. **Adelantable** en lo que es instalación; lo del push espera a la Fase 7. _Parte 1:_
  «Instalar la app» en el menú del usuario (`_shell/menu-usuario.tsx`): guarda el `beforeinstallprompt` y lo ofrece; en iOS, donde no existe, abre las
  instrucciones («Compartir › Agregar a inicio»); no aparece si la app ya corre instalada (`display-mode: standalone`) ni si el navegador no instala.
  El manifest (`src/app/manifest.ts`) gana `id` y dos atajos por permiso neutro («Nuevo lead», «Cotizar»). `public/sw.js` sigue sin caché de datos (sin
  conexión la app no funciona y no se simula: `docs/PRODUCTO.md`) y, **si la Fase 7 ya integró el push**, se comprueba con la app instalada que el clic
  de una notificación enfoca la ventana abierta y navega a su `ruta` (si no la integró, esa comprobación pasa al cierre, 9.14). _Parte 2:_ el logo
  oscuro: Empresa › Marca gana «Logo para el tema oscuro» (`ajustes_empresa.logo_oscuro_ruta`, que ya cuenta en `storage_refcount()`,
  `base.sql:17389`), `<Marca>` lo usa con el tema oscuro y cae al logo normal si no hay. **No entra:** modo sin conexión, sincronización en segundo
  plano, la suscripción al push y sus preferencias (Fase 7). Cierra «PWA (instalación, `sw.js` mínimo)» del párrafo y, de «Sin interfaz», el logo
  oscuro. **Assert:** `e2e/pwa.spec.ts` (el e2e ya corre sobre el build de producción): el manifest responde con nombre, `start_url`, `display` e
  íconos de 192, 512 y enmascarable; el service worker queda registrado y activo; con un `beforeinstallprompt` simulado aparece «Instalar la app» y al
  elegirla se llama a `prompt()`; en `movil`, lo mismo. Vitest de la regla pura «¿ofrezco instalar?». El logo oscuro, con el spec de Empresa que ya
  existe (un caso). Lugar: `src/app/manifest.ts`, `public/sw.js`, `src/shared/ui/{instalar-app.tsx,use-instalacion.ts,marca.tsx}`,
  `src/app/(app)/_shell/menu-usuario.tsx`, `src/modules/empresa/features/empresa/`, `e2e/pwa.spec.ts`. Nivel **2** (`src/shared` y `_shell`). Tipo:
  pantalla. Partes estimadas: 2.
  Dudas, con la recomendada: (1) ¿Un aviso que invite a instalar? Recomiendo no: sólo la entrada del menú (un aviso que nadie pidió tapa trabajo). (2) `public/sw.js` lo edita también la Fase 7 (manejadores `push` y `notificationclick`): este paso **no lo toca** si la 7 no entró; sólo lo lee.

- **9.11** — Tablero: margen del mes y cola web. **Depende de la Fase 6** (`F6·pagos`: gastos y pagos con «confirmar», y el margen) **y de la Fase 8**
  (`F8·cola`: el tablero de la cola con «Contacté»). Las tablas ya existen, así que la base se puede escribir y probar con filas sembradas por SQL; se
  espera a las dos fases para no rehacerla si cambian `pagos` o el turno, y porque «con datos reales» los genera su interfaz. Migración `tablero_…`:
  `tablero_margen(p_desde, p_hasta)` (`security definer`; sólo los orígenes donde quien llama tiene `logistica.margen.ver`,
  `origenes_con_alcance()`): de los vehículos con algún pago confirmado en el período (por `confirmado_en`), `venta`, `real` (gastos), `cotizado` (la
  final activa) y `margen = venta − real`, en moneda base, total y por origen; los que no tienen venta **no entran a la suma** y se cuentan aparte
  («N sin venta registrada»); sin ninguno, `margen` es **nulo**, nunca 0. `tablero_cola_web(p_desde, p_hasta)` (`web.cola.gestionar`): solicitudes del
  período por estado, tasa de contacto (contactadas / asignadas no directas; nula sin asignadas), mediana de minutos hasta «Contacté» y el ranking de
  hasta 20 personas de la rueda. Índices por fecha en `pagos (confirmado_en)` y `solicitudes_contacto_web (asignada_en)` si la fase dueña no los dejó.
  Los dos widgets llenan sus huecos (`features/metricas/widgets/{margen,cola-web}.tsx`): el margen por `<Monto>` (Modo Live) y, nulo, «Sin venta
  registrada». **No entra:** margen por vehículo (es de logística), editar la cola. Cierra «el tablero del dueño muestra conversión de leads, cola web
  y margen del mes» del «Terminado cuando». **Assert:** `supabase/tests/areas/tablero/margen-y-cola.sql`: con cifras exactas (dos vehículos, dos
  monedas con su tipo de cambio aplicado: la suma en moneda base cuadra al centavo); un vehículo sin pago confirmado no suma y se cuenta aparte; sin
  ventas, nulo; quien tiene `logistica.margen.ver` en un solo origen recibe sólo ese; sin permiso, 42501 en cada una; la tasa de contacto no cuenta las
  directas. Vitest del texto del widget (nulo → «Sin venta registrada»). `e2e/tablero.spec.ts` gana un caso: la dueña ve el margen del mes tras
  confirmar un pago desde la pantalla de la Fase 6. Lugar: `supabase/migrations/*_tablero_*.sql`, `supabase/tests/areas/tablero/`,
  `src/modules/tablero/{features/metricas/widgets/,infra/queries/}`, `e2e/tablero.spec.ts`. Nivel **2** (estructura: índices). Tipo: datos y dinero.
  Partes estimadas: 2.
  Dudas, con la recomendada: (1) ¿El mes del margen es el del pago confirmado o el de la venta? Recomiendo el del pago confirmado (`confirmado_en`): es el único hecho sellado; la base no tiene «fecha de venta». (2) ¿Un vehículo pagado a medias? Recomiendo que cuente lo confirmado y lleve la marca «pago parcial» si la Fase 6 deja cómo saberlo; si no, se suma tal cual y se anota.

- **9.12** — Auditoría de accesibilidad AA: el pulido anotado, las transiciones y los esqueletos. **Depende de los cierres de las fases 5 a 8** (recorre
  sus pantallas) y de los pasos de pantalla de esta. _Parte 1, el barrido:_ un recorrido de todas las rutas de `docs/MAPA.md` en `escritorio` y
  `movil`, tema claro y oscuro, que comprueba lo que una máquina puede: nombre accesible de cada control, etiqueta y error asociados en los formularios
  (ids de `aria-describedby` que existen), un `h1` y un título por página, orden de foco, foco visible, blancos táctiles de 44 px y contraste de los
  pares de tokens de `design/tokens.css` (esto último, en Vitest); deja la tabla de hallazgos en DECISIONES, bajo un título nuevo «Auditoría AA (9.12)». _Parte
  2, leads y cotizaciones:_ **4-61**, **4-62** y **4-63** (el foco tras recargar y «atrás»), **9-7** (el aviso de guardado con el pie en
  «Guardando…»: avisar cuando `isPending` vuelve a falso, en los tres paneles que nombra PLAN), **4-50** (el resumen fijo al pie al 200 %), el
  `aria-describedby` de «Copiar texto» mientras carga la tarjeta (4.18-3b) y el esqueleto-blanco-esqueleto de la pestaña «Cotizaciones» (4.17-3).
  _Parte 3, Configuración y `shared/ui`:_ **5a-28**, **5a-29**, **5a-30**, **5a-33**, **4-19**, **4-20** y, porque es un blanco táctil bajo el mínimo,
  **4-102** (los botones de `<Confirmar>` a 42 px). _Parte 4, esqueletos y transiciones:_ cada `page.tsx` de `(app)` con su `loading.tsx` del patrón de
  su pantalla (hoy 20 `loading.tsx` para 21 páginas), los cinco estados de `docs/UX.md` en cada vista de datos, la transición de página con
  `prefers-reduced-motion`; una guarda `scripts/guardas/estados-de-ruta.test.ts` (toda página de `(app)` tiene esqueleto propio o heredado). _Parte 5:_
  los hallazgos del barrido en las pantallas de las fases 5 a 9. Lo que no se arregle queda en PLAN con dueño. **No entra:** especs nuevos al 200 %
  (regla del 2026-10-30: cada defecto se arregla y se comprueba ampliando el spec que su abierto ya nombra, o con una captura del recorrido si no
  nombra ninguno); lectores de pantalla reales; **9-12** («¿Guardar contraseña?» de Chrome con Live: pide un Chrome con sesión y gestor de contraseñas,
  va a la lista de la persona del 9.13). Cierra **4-19**, **4-20**, **4-50**, **4-61**, **4-62**, **4-63**, **4-102**, **5a-28**, **5a-29**, **5a-30**,
  **5a-33**, **9-7**, las dos líneas sueltas de «Pulido para la Fase 9» y, del párrafo, «transiciones y esqueletos revisados» y «auditoría AA».
  **Assert:** `e2e/accesibilidad.spec.ts` (el barrido, en los dos proyectos: cero controles sin nombre y cero `aria-describedby` rotos en todas las
  rutas); `design/tokens.test.ts` (contraste ≥ 4,5:1 del texto y ≥ 3:1 de bordes y foco, en claro y oscuro); la guarda de esqueletos; por cada abierto,
  el assert que su texto en PLAN ya define, en el spec que ya nombra; para 9-7, una prueba de hook (el aviso sale con `isPending` en falso), sin CDP.
  Lugar: `e2e/accesibilidad.spec.ts`, `e2e/soporte/accesibilidad.ts`, `design/`, `scripts/guardas/`, `src/shared/ui/{sonner,confirmar}.tsx`,
  `src/app/globals.css`, y los archivos que cada abierto nombra en `leads`, `vehiculos`, `cotizaciones`, `origenes`, `equipo` y `empresa`. Nivel **2**
  (`src/shared`). Tipo: pantalla. Partes estimadas: 5.
  Dudas, con la recomendada: (1) ¿Con qué se barre? Recomiendo, sin dependencia nueva, el árbol de accesibilidad por CDP (`Accessibility.getFullAXTree`) más reglas propias; `@axe-core/playwright` detecta más, pero es una dependencia (compuerta que va a la persona): si la aprueba antes de la fase, se usa. (2) 4-20 dice «con la persona: ancho contra altura». Recomiendo subir `--ancho-del-aviso` a 22 rem en escritorio. (3) 4-50: recomiendo que al 200 % el resumen nazca plegado. (4) **Las partes 2 y 3 no dependen de las fases 5 a 8**: si se admite un paso más, son un 9.12a adelantable (pulido anotado) y el resto, 9.12b. (5) 4-63: su texto no está en PLAN; el plan del paso lo busca en `docs/archivo/` o lo da por cubierto con 4-61 y 4-62.

- **9.13** — Despliegue en seco: splinter y advisors en cero, la guía y la lista de la persona. **Depende de que no falte ninguna migración** (los pasos
  con base de esta fase y los cierres de las 5 a 8). **Nada de este paso toca la nube**: ni la CLI contra el proyecto enlazado, ni Vercel, ni
  secretos, ni los conectores MCP de Supabase o de Vercel; el hook rechaza hasta el texto de esas órdenes dentro de un comando, así que los archivos
  que las nombran se escriben con Write o Edit. _Parte 1, la base limpia:_ `scripts/splinter.sql` sobre el esquema final con **cero ERROR** (ya lo
  exige el CI) y cada WARN arreglado o con su motivo en una lista versionada que una prueba compara (`supabase/tests/advisors.sql`: un aviso nuevo sin
  motivo cae); los avisos de rendimiento que no dependen de estadísticas (FK sin índice, índices duplicados, policies permisivas repetidas,
  `auth.uid()` sin `select`); y la deuda aceptada que es de la base, cerrada o reescrita con su motivo: `storage_refcount()` con `execute` para
  `authenticated`, `limpieza_el` con los derechos de la base, los 47 avisos de `db:lint` en `_formula_*`. _Parte 2, el guion en seco:_
  `pnpm despliegue:en-seco` (`scripts/despliegue/en-seco.sh`, sólo local): `db:reset` desde cero, `db:probar`, `db:lint`, splinter, `next build`,
  `env:check produccion` (9.09) y un inventario que compara lo que el repo espera con lo que la base local tiene: jobs de `cron.job`, buckets, secretos
  de Vault por nombre, funciones edge de `supabase/functions/` con los secretos que pide cada una, y los webhooks; termina con «listo» o con lo que
  falta. _Parte 3, la guía:_ un doc nuevo, `DESPLIEGUE.md` en `docs/`, con la lista de la persona, en orden y con qué mirar en cada salida: la revisión con `--dry-run`
  de las migraciones pendientes y recién después aplicarlas, las funciones, la configuración de Auth, las variables de Vercel y los secretos (lo que
  `env:check produccion` diga que falta), el dominio, VAPID, el proveedor de correo, cómo volver atrás, y lo que sólo una persona puede comprobar:
  **9-12** (Chrome con Live), las fotos en un iPhone, los dos dispatch de 9-6 y el de 9-11, y **5a-4b**. Dice además que `demo.yml` ya aplica
  migraciones a la demo al integrar en `main`. **No entra:** desplegar; crear proyectos; cambiar `demo.yml`. Cierra, del «Terminado cuando», «splinter
  y los advisors en cero errores» y deja «desplegada apuntando al proyecto Pro» como un paso de la persona con todo verificado. **Assert:**
  `supabase/tests/advisors.sql` en `db:probar` (cero ERROR; todo WARN está en la lista con motivo); `scripts/despliegue/en-seco.test.ts` (el inventario
  cae si falta un job o una función que el repo declara, con una base simulada); `pnpm despliegue:en-seco` termina en «listo» en la sesión y su salida
  va al informe; `scripts/enlaces-internos.mjs` pasa con la guía nueva; una guarda comprueba que el guion no contiene ninguna orden contra el proyecto
  remoto. Lugar: `supabase/migrations/*_advisors_*.sql`, `supabase/tests/advisors.sql`, `scripts/despliegue/`, `scripts/guardas/`, `package.json`
  (sólo el script), el `DESPLIEGUE.md` nuevo, `docs/ENTORNOS.md`, `docs/ESTADO.md` (Deuda aceptada). Nivel **2** (lo normal es que limpiar avisos cree o
  borre un índice o una policy). Tipo: datos y dinero. Partes estimadas: 3.
  Dudas, con la recomendada: (1) ¿«En cero» incluye los WARN? Recomiendo cero ERROR y cero WARN **sin motivo escrito** (los 47 de `_formula_*` son cosméticos y se quedan con su motivo). (2) ¿La guía es para la demo o para la instalación de un cliente? Recomiendo las dos en un solo documento: la demo es el ensayo, y la de un cliente suma tres pasos (quitar el comodín de los previews, el registro y el dueño).

- **9.14** — El cierre de la Fase 9: las cuatro tareas de oro en celular y escritorio, la tabla de criterios y el Nivel 3. _Parte 1, las tareas de
  oro:_ una tabla tarea → spec → meta → proyecto, y lo que falte para que las cuatro tengan su meta afirmada en `escritorio` **y** en `movil`, con el
  método de la tarea 2 (teclas o toques contados y KLM, no un cronómetro) y su «nunca» afirmado: 1, `e2e/leads-alta.spec.ts` (≤ 25 s; el duplicado al
  terminar de tipear); 2, `e2e/cotizar-tarea-de-oro-recorrido.spec.ts` (≤ 90 s, ya en los dos); 3, el spec que deje la Fase 6 (mover 1 en ≤ 15 s y el
  contenedor de 8 en ≤ 60 s con vista previa; no se mueve sin el documento bloqueante); 4, el spec de la Fase 8 («Contacté» en 2 toques en el celular)
  más `e2e/leads-portal-acceso.spec.ts` (portal en ≤ 30 s con teclado). Si una meta no se cumple, es un rojo que se arregla aquí o se devuelve a su
  fase: no se cierra con él. _Parte 2, el recorrido de la IA con dos cuentas_ (la dueña y una asesora), sin sembrar por SQL: la asesora registra un
  lead, cotiza, se marca final y se confirma un pago; la dueña ve en `/tablero` la conversión, la cola web y el margen del mes con esos datos, encuentra
  cada cambio en `/actividad` con su diff (y la asesora no ve el de un lead ajeno), exporta todo en `/datos` y lo importa en una base limpia, e instala
  la app; el push con la app instalada, si quedó pendiente del 9.10. _Parte 3:_ la tabla de criterios del «Terminado cuando» con su evidencia;
  «desplegada apuntando al proyecto Pro» queda como **listo para desplegar** (el guion en seco del 9.13 en verde y la lista de la persona entregada),
  dicho así en ESTADO; el Nivel 3 (`pnpm test:e2e:completo`, los dos proyectos); ESTADO y BITACORA; los abiertos que sigan, con dueño; y la
  reconciliación de lo que esta fase dijo «no entra» (abajo, en C y E). **No entra:** desplegar. **Assert:** la tabla de criterios sin filas vacías;
  el completo en verde en los dos proyectos; `lint`, `typecheck`, `test`, `db:probar`, `db:lint`, `db:carreras` y `mapa.sh --check` en verde; CI en
  verde. Lugar: `e2e/` (lo que falte de las cuatro tareas), `docs/{PLAN,ESTADO,BITACORA,DECISIONES,UX}.md`. Nivel **3** (cierre de fase). Tipo: pantalla.
  Partes estimadas: 3.
  Dudas, con la recomendada: (1) ¿La fase cierra sin el despliegue hecho? Recomiendo sí, como «lista para desplegar»: el piloto no puede tocar producción y la puerta de una fase es el CI (`docs/PILOTO.md`). (2) ¿Las metas en segundos se miden con reloj? Recomiendo KLM y conteo de teclas o toques, como en la 2: un cronómetro en una máquina con tres carriles da rojos falsos.

### Riesgos y huecos

- **Ids de las otras fases:** los alias `F5·…` a `F8·…` de `depende_de` se cambian por los ids reales al armar `plan.yaml`. **4-63** no tiene texto en PLAN.
- **El piloto y la nube.** El hook bloquea el texto de las órdenes remotas y `gh workflow run` (por eso 9-6 y el dispatch de 9-11 van a la lista de la
  persona). Esta sesión tiene a la vista conectores MCP de Supabase y de Vercel: si las del piloto también, conviene negarlos antes de la fase.
- **`demo.yml` ya toca el proyecto Pro:** aplica a la demo (la producción de hoy) cada migración que entra a `main` si el repo tiene `DEMO_PROJECT_REF`.
  Es lo decidido, pero integrar un PR con base ya escribe en la nube; la persona decide si sigue así durante las fases 5 a 9.
- **Una dependencia nueva detiene al carril** (la compuerta `dependencia` va a la persona): por eso gráficas en SVG propio, el barrido AA sin axe y nada
  de `deno check` en el CI (las tres funciones Deno siguen fuera de lint y typecheck). Si la persona aprueba antes `@axe-core/playwright`, se usa.
- **«Un número que se muestra nunca es un total exacto»** contra un tablero: sin la excepción escrita (duda 1 del 9.07) el tablero rompe la regla y
  su guarda (`escala.sql`). **La conversión no tiene historia:** los clientes de antes quedan sin `cliente_desde` y el primer mes arranca en cero.
- **`importar-csv` es el paso más incierto.** No pude determinar si el empaquetado de la función admite importar `src/shared/lib/csv/leer.ts` desde
  fuera de `supabase/functions/` (si no, el parser se copia y una prueba compara las copias); el tiempo máximo de una invocación obliga a procesar por
  tramos con avance guardado; su e2e pide `pnpm funciones`.
- **La purga de la actividad nunca corrió:** al programarla (9.01), el primer pase borra todo lo de más de 14 días y, con la misma función,
  `eventos_web`, `visitados` y notificaciones viejas. **`actividad.detalle` no está recortado** y no revisé una por una las 65 llamadas a
  `registrar_actividad()`: lo hace el 9.01, y si alguna guarda algo privado la tabla pierde el grant de `detalle`.
- **`lead_dormido_meses` no lo lee nada** (ni la base ni la app): no le doy interfaz; sigue en Deuda aceptada hasta que algo lo use.
- **Fuera del repo:** `VERCEL_TOKEN` y `SUPABASE_ACCESS_TOKEN` (4-41: `fetch` simulado y un «no se pudo leer» explícito); VAPID y el correo (Fase 7);
  el dominio y el proyecto de un cliente (guía del 9.13); un Chrome con gestor de contraseñas (9-12) y un iPhone (fotos): lista de la persona.
- **Tamaño:** 9.04, 9.06 y 9.12 quedan en 5 partes, el máximo, por el tope de 14 pasos; con 18 se parten 9.01, 9.04, 9.06 y 9.12 como dice cada fila
  (las mitades de pantalla irían a `sonnet`). **5a-4b** (70 min el completo) hace del Nivel 3 lo más largo del cierre.

---

## Fuera de alcance

- Multiidioma. Offline real. Editor de artes (Konva). Directorio de contactos/empresas.
- API de WhatsApp/Meta. Multi-empresa por despliegue.
- La web pública en sí (repo aparte con `sitio-marketing` sobre el esquema `web`).

Si algo de esta lista se vuelve necesario, se discute y se agrega al plan explícitamente. No se cuela dentro de otra fase.
