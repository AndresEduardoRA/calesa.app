# Plan por fases

El plan vivo: sólo lo que falta. Cada fase tiene un criterio de terminado verificable (algo que se puede correr y ver); las metas de las
tareas de oro de `docs/UX.md` son criterio de terminado de su fase y se miden con un e2e. El alcance es todo el brief; no hay MVP: hay orden.
Fases 0 a 3 completas y la Fase 4 hecha hasta el 4.13: el detalle (lo hecho, lo cerrado y la historia), en `docs/archivo/PLAN.md`
(sólo con grep). Se avanza **un paso a la vez** (un prompt, un commit, su verificación) y el piloto sigue con el siguiente **sin parar a
reportar**: el reporte queda en el registro (`.piloto/registro.md`). Entre fases la puerta es el CI de la rama en verde y sin rojos
anotados (`docs/PILOTO.md`, «Sin esperar al CI»). Los pasos tachados o cerrados no están aquí.

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
uno (hoy: **2 de 3**: el 4.15-3a y el 4.15-3b, de pantalla, sin completo; el 4.15-2 corrió el completo de escritorio). Compuerta `dependencia` para subir una dependencia
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
- **4.16** — El listado `/cotizaciones` (resumen `?cotizacion=`, «Vencida», cursor, el máximo medido, sin el snapshot), la siembra de
  volumen y `medir-escala.sql`; se enciende la navegación. Cierra **4-14** («todas las que veo» de quien ve «propios») y **4-23** (el
  gemelo en el inventario de vehículos), la entrada a cotizar desde el listado (`docs/UX.md:38`) y el camino a lo antiguo del historial del vehículo (el tope de 500 del 4.14-2b: un
  filtro por vehículo). Depende de 4.10 y 4.13. Nivel **2** (`_shell`) + `db:medir:volumen` + `E2E_VOLUMEN=1`.
  Prompts: 4 (quedan 3).
  **Partido en 4** (`docs/DECISIONES.md` › «Paso 4.16 (1 de 4)»): el **4.16-1** (4-14: `cotizaciones_listado()` por cursor y por alcance, sus índices, su medición y
  `MAXIMO_DE_PAGINA_DE_COTIZACIONES`; Nivel 2 + `db:medir:volumen`): hecho. El **4.16-2** (4-23, el inventario de quien ve «propios», con el diseño de rutas del 4.16-1; Nivel 2 +
  `db:medir:volumen`), el **4.16-3** (la siembra de cotizaciones de `sembrar.sql`, su fila en `medir-escala.sql` y las mediciones que piden una base sin cotizaciones; Nivel 1 +
  `db:medir:volumen`) y el **4.16-4** (la pantalla `/cotizaciones`, la navegación, la entrada a cotizar desde el listado de `docs/UX.md:38` y el enlace desde el historial del vehículo;
  Nivel 2 + `E2E_VOLUMEN=1`; puede partirse al planificarlo). Marcas: 4.16-1 `sí`.
  - **P1** (1, contestada el 2026-11-04 con la recomendada): «Mías» son las que creó quien mira (`creado_por`), para cualquiera; no es «Míos» de leads.
  - **P2** (1, contestada el 2026-11-04 con la recomendada): todas las versiones de una cadena salen en el listado, cada una en su fila.
- **4.17** — **5a-12** y, con el mismo «Ver más», las secciones «Cotizaciones» de la ficha del lead y del vehículo (la del vehículo puede usar la lectura
  `leerHistorialDelVehiculo()` del 4.14-2b y es el camino a lo antiguo de su tope de 500). Depende de 4.13 a
  4.16. Nivel 1 + cadena db + `db:carreras`. Prompts: 2.
- **4.18** — La tarjeta, el PDF y compartir: filas por grupo con su tono (el del grupo, o el que la plantilla elija del catálogo), celdas
  combinadas de tipo de cambio y plazo, título de la variante, asesor, logo, nota, leyenda y la garantía condicionada, Live, y el total en Bs
  si `cotizaciones.ver_total_bs`.
  `validar_plantilla` rechaza un nodo que no sea del nivel «todos». e2e: el total del PDF es la suma de las líneas. **Hito 4-A al
  cerrarlo.** Depende de 4.15. Nivel 1; **Nivel 2 del hito**. Prompts: 3.
- **4.19** — El editor de la plantilla, con la vista previa en vivo. Depende de 4.18. Nivel 1. Prompts: 2.
- **4.20** — La fórmula: versiones, publicar con nota, historial, revertir y el ⚙ (una constante publica la N+1 de su origen; un tipo de
  cambio va a `tipo_cambio_guardar` con `empresa.tipos_cambio.gestionar`); «Aplicar también a esta cotización»; el diseño se publica con
  la fórmula (revertir publica una copia **con el diseño**, por `_publicar_formula(…, true)`: **4-8**); `formula_publicar` deja de decir
  «Recargá»; Configuración › Cotización (vigencia, vehículo obligatorio); el enlace de «Falta publicar la fórmula» de la hoja (4.13-2)
  apunta a Configuración › Cotización, que hoy pide `equipo.roles.ver`: quien sólo configura el origen cae en «No tienes permiso» hasta
  que esa pantalla abra con `cotizaciones.configurar`. Cierra **4-8**, **4-33**, **4-36**, **4-19**, **4-20**, **5a-29** y **5a-30**;
  **4-30** aquí o en 4.22. Depende de 4.12, 4.13 y 4.15. Nivel 1 + cadena db. Prompts: 2.
- **4.21** — El editor de la fórmula como el Excel (filas, grupos, tipo de cambio, plazo; cada fila en texto, compilada por 4.07, que
  guarda `{ ...raíz compilada, texto }`); evalúa con el motor TS, porque quien lo usa ya ve la fórmula. Cierra **4-5** y **4-6**.
  Depende de 4.07 y 4.20. Nivel 1. Prompts: 2.
- **4.22** — **El editor del diseño**: secciones, celdas, nivel de ver y de editar, qué va a «avanzado», variantes, interruptores,
  atajos, modos y tonos (y editar el catálogo de tonos con su validación AA), con vista previa a 412 y 1.280 px y al 200 % (el mismo
  componente en un contenedor de ese ancho). **Avisa, sin bloquear**, cuando un nodo de un nivel restringido es el único oculto de una
  suma visible («se deduce restando»). `editar_sin_ver` rechaza una sección con sólo `nivel_ver` restringido: el editor pone ver y
  editar juntos. **4-30** (tope de tamaño del diseño) aquí o en 4.20. Depende de 4.09 y 4.20. Nivel 1. Prompts: 3.
- **4.23** — Las tablas de referencia: **primero 5b-7**; editar y reordenar filas; publicar la N+1 (D5; las tablas de referencia hoy no
  tienen versión). Depende de 4.05 y 4.20. Nivel **2** + `db:carreras`. Prompts: 2.
- **4.24** — La papelera propia (`cotizaciones.papelera.purgar`, versión, purga por lotes, «Deshacer»); hoy `vehiculos.papelera.purgar`
  gobierna también la de cotizaciones, sin versión ni purga automática. Depende de 4.10. Nivel **2** + `medir-jobs.sql`. Prompts: 1.
- **4.25** — Marcar final: `cotizacion_marcar_final` mira el lead y la papelera, toma los candados en el orden de vincular (hoy vincula
  el lead antes de tomar el vehículo: posible deadlock; ya toma primero su cotización), pasa el lead a la clase cliente, la cotización
  final como ancla de la limpieza y desvincular con una final. Cierra **4-17** (una final creada con `cotizacion_crear` no hace lo que
  `cotizacion_marcar_final`). Carreras. Depende de 4.10 y **4.24**. Nivel 1 + cadena db + `db:carreras` + `medir-jobs.sql`. Prompts: 2.
- **4.26** — Comprobantes: emitir y anular, la numeración sin huecos, la serie en Empresa (D6); su `datos` sólo con lo del nivel «todos».
  Depende de **4.25**. Nivel **2** + `db:carreras`. Prompts: 2.
- **4.27** — Comentarios anidados, adjuntos, favoritos, reportes y moderar. Depende de 4.10. Nivel **2** (`storage.objects`). Prompts: 2.
- **4.28** — El cierre: el recorrido de la IA con dos cuentas por la tarea de oro 2, la tabla de criterios, **5a-4b** con el tiempo de
  cada proyecto (con la decisión vigente, sin segunda pila local, su assert de 25 min no se cumple en esta fase), **5a-33** (el conteo
  del rol, tapado al 200 % en Roles), ESTADO y BITACORA. Depende de todo. Nivel **3**. Prompts: 2.

Total de la fase: 34 pasos y 87 prompts; faltan los pasos 4.15-4 y 4.16-2 a 4.28.

**Pulido para la Fase 9** (2026-10-30; regla en `.claude/rules/e2e.md` › «Pulido y rigor por tipo de paso»). Ningún paso los recoge ni abre otro por ellos, aunque su fila los nombre
(4.20 y 4.28): **4-61**, **4-62** y **4-63** (el foco tras recargar y «atrás» que quedó del 4-49), **5a-29** y **5a-30** (del 4.20) y **5a-33** (del 4.28). Los recorre la
auditoría AA de la Fase 9, con 5a-28. Los defectos de pulido nuevos se anotan aquí, en una línea.

### Abiertos de la Fase 4

Sólo los abiertos; lo cerrado vive en `docs/archivo/PLAN.md`. Los de otras fases están en su sección: **5a-28** (Fase 9), **6-1** (Fase 6),
**8-1** (Fase 8) y **9-1** a **9-12** (Fase 9).

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
- **4-5** (4.21): el ⚙ de una constante que nació de un literal deja viejo el texto de su fila. La fila guarda `texto`
  (`=(remate+fees)*4%`) y el compilador crea una `constante` auxiliar por cada número escrito (`total__2` = 4%); el ⚙ publica la N+1 con
  otro valor en `params` y el `texto` sigue diciendo 4%; si el editor recompila, el ⚙ se deshace en silencio — un test del editor: cambiar
  con el ⚙ una constante auxiliar y reabrir la fila muestra el valor nuevo (o avisa que el texto ya no manda); recompilar no pisa el ⚙ sin
  preguntar. Se decide en 4.21: reescribir el literal en el texto, o dejar el ⚙ de una constante auxiliar sólo para quien no tiene texto
  (`formula_cambiar_constante`).
- **4-6** (4.21): `compilarExpresion` no mira `MAXIMO_DE_TEXTO`; sólo `validarFormula()` y `validar_formula()` rechazan una fila con
  `texto` de más de 2.000 (`forma`, en `definicion.nodos.<i>.texto`) — un e2e o prueba del editor que escribe 2.001 caracteres en una fila
  y ve el error en esa fila, sin llamar a `validarFormula()`; con 2.000 no hay error (`MAXIMO_DE_TEXTO` de `index.ts`).
- **4-8** (4.20): el ⚙ pisa el borrador en curso, y guardar el borrador no pide su versión. `formula_cambiar_constante()` guarda un
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
- **4-17** (4.25): una final creada con `cotizacion_crear` no hace lo que `cotizacion_marcar_final`. `cotizacion_crear(…,
p_clase := 'final')` exige `cotizaciones.final.gestionar`, un vehículo y el índice de «una final por vehículo» (23505), pero no
  vincula el vehículo al lead ni manda las preventas del vehículo a la papelera, y ninguna de las dos pasa el lead al primer tipo de la
  clase cliente — en `cotizacion-crear.sql`, que crear una final y marcar una preventa como final dejen el mismo estado (vehículo
  vinculado, preventas en la papelera, lead en la clase cliente), o que crear una final sin pasar por la preventa se rechace con su
  motivo. `cotizacion_marcar_final` ya toma primero su cotización.
- **4-19** (4.20): el «·» entre el estado y el uso queda solo al comienzo de una línea al 200 % — en
  `e2e/configuracion-cotizacion-niveles-200.spec.ts`, ninguna línea de «Estado · Uso» empieza por «·» (el separador va pegado al final de
  la anterior); `src/modules/cotizaciones/features/niveles/components/lista-de-niveles.tsx` (`EstadoYUso`).
- **4-20** (4.20, con la persona: ancho contra altura): el aviso de escritorio es angosto (216 px al 100 %): una descripción larga ocupa
  unas diez líneas y al 200 % (432 px) un aviso cubre campos de un panel — en `e2e/avisos-con-descripcion.spec.ts`, al 100 % en
  escritorio el aviso con descripción cabe en seis líneas o menos, y ningún aviso cubre un campo con foco (`src/shared/ui/sonner.tsx` y
  `--ancho-del-aviso` de `src/app/globals.css`; el pie del panel no se tapa: `avisoNoTapaElPie`).
- **4-23** (4.16-2; el diseño de las rutas está en `cotizaciones_listado()` del 4.16-1: cada ruta por su índice, uno solo entero por columna que se sondea): el inventario de quien ve «propios» y casi nada es suyo recorre el origen entero: la «chica» (3 propios) 6,8 ms y 1.744
  buffers con 50.000 vehículos y **32,7 ms y 6.647** con 250.000 (no es regresión del 4.11; sólo con `vehiculos.ver` en «propios») — en
  `medir-vehiculos-lectura.sql`, la página 1 y una profunda de la chica con 50.000 y 250.000: ≤ 10 ms y buffers que no crecen con N, y lo
  que devuelve es lo que dice la regla (`vehiculos-visibilidad.sql`); se escribe antes de arreglar y cae contra lo de hoy. Lugar:
  `buscarVehiculos()` (`src/modules/vehiculos/infra/queries/listado.ts`) y una función de lectura con las dos rutas de 4-14 (`creado_por`,
  que no tiene índice, y la cartera hacia `vehiculos_lead_idx`), con los filtros del inventario que hoy van por PostgREST; se decide con 4-14.
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
- **4-30** (4.22 o 4.20): un diseño de la hoja no tiene tope de tamaño (`validar_diseno()` no limita los ítems; la hoja más grande real,
  `subasta_usa`, tiene 39 ítems y 430 nodos del DOM; ≈ 15 nodos por celda) — publicar un diseño de más de N ítems es rechazado con la
  regla y su `donde` (N sale de medir: el tope de nodos de la hoja es 460), o la hoja las divide.
- **4-33** (4.20, el ⚙ de un tipo de cambio desde la hoja): un `tipo_cambio_guardar` que empezó antes de abrir la hoja y confirmó después
  cuenta como visto (`tipos_cambio_historial.cambiado_en` es el `now()` de la transacción que escribe; la ventana dura lo que una
  transacción) — una tarifa que confirma después de abrir la hoja y con `cambiado_en` anterior a la apertura da `desactualizada` al
  guardar. Salida sugerida: `abierta` lleva una huella con clave de las tarifas vistas al abrir (el formato opaco la admite sin cambiar
  firmas) y `cotizacion_crear` la compara con las de hoy. Además, quien deja varias hojas abiertas puede elegir, dentro de 24 h, entre
  horas que de verdad abrió (límite aceptado de «Guardar con la N»).
- **4-34** (**cerrado** en el 4.15-1, 2026-11-04: `_cotizacion_puede_guardar()` pide ver y editar antes y después del candado. Lo que pasaba de verdad: quien edita sin ver no escribía —`_cotizacion_armar` pide ver—, pero antes de esa línea tomaba el candado y respondía distinto de lo inexistente: PT409 con quién y cuándo, 22023 del vehículo o del título, `intento_reusado`; 4.15): `cotizacion_guardar` deja editar con `cotizaciones.editar` y sin `cotizaciones.ver` (usa
  `puede_cotizacion(id, 'cotizaciones.editar')` y `_nodos_visibles()` pide `ver`: nada se ve ni se edita, y lo guardado se conserva) —
  un rol con sólo `cotizaciones.editar` no puede guardar (42501), como `cotizacion_crear` sin `ver`.
- **4-36** (4.20, publicar la fórmula con su diseño: misma ruta que mide; elegido al integrar el A0): `supabase/tests/medir-publicar.sql`
  no se puede repetir sin `db:reset` — dos `pnpm db:medir` seguidas, sin `db:reset` entre ellas, pasan las dos.
- **4-39** (sin fase: lo decide la persona; el original sugiere un refactor sin pantalla antes del 4.16): cuatro archivos de `entities/`
  pasan de 300 líneas — `vehiculos/entities/vitrina.ts` 358, `leads/entities/oportunidad.ts` 321, `leads/entities/alta.ts` 331 y
  `leads/entities/importacion/filas.ts` 333 — `wc -l` de cada uno ≤ 300, partido por responsabilidad (en `vitrina.ts`, el formulario y su
  validación aparte de la vista previa; en `oportunidad.ts`, el formulario aparte del modelo), con sus pruebas al lado y `pnpm test` igual.
- **4-43** (sin fase: lo decide la persona; salió del 4-42): `e2e/leads-ficha-edicion.spec.ts` tiene 331 líneas (> 300) — partirlo por
  responsabilidad (edición, borrador, sin red, permisos). Assert: `wc -l` de cada parte ≤ 300 y las mismas pruebas en verde.
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
- **4-61** (sin fase; salió del 4.14-2a5, F16 y F17 de su sonda): anotar o agendar desde el «⋯» de la cabecera de la ficha llegan por `router.push` a `?seccion=seguimientos&panel=…`
  (navegación del servidor, sin la marca del guardián). Sin recargar, «atrás» devuelve el foco al «⋯» (guardia en `paneles-foco-al-volver-ficha.spec.ts`); tras recargar lo deja
  en `body` (F16 en los dos proyectos; F17 sólo medido en móvil: en escritorio la sonda no vio el diálogo tras recargar). Assert: tras recargar y «atrás», el foco en el «⋯».
- **4-63** (sin fase; salió del 4.14-2a5): en el lead rápido, un segundo `page.goBack()` justo tras el primero (recargar con «Editar» abierto, «atrás» y «atrás») deja la URL en `/leads`
  con el rápido todavía visible: 1 de 10 corridas en escritorio (`.piloto/salidas/4.14-2a5/repetir-dos-atras.txt`), y 4 de 15 con C4 anulado (M10: `mut/repetir-M10-editar.txt`), así que no
  nace de `esperaSinPanel`. La traza de la caída (`e2e-fallos/2026-10-30_12-38/`) muestra la URL ya sin `lead`. Puede ser la sincronización de nuqs con un «atrás» rápido o una carrera de `e2e/paneles-foco-al-volver-leads.spec.ts:196`.
  Assert: `--repeat-each=20` de ese spec sin caídas, y la causa medida (la URL cambió y el rápido no).
- **4-62** (sin fase; límite de 4-59, del 4.14-2a5): tras recargar con anotar o agendar abierto desde el botón de la pestaña del lead rápido, o con un panel que se cierra con Esc,
  la ✕ o guardar en una URL distinta de la de apertura (la que lleva `&pestana=`), el segundo «atrás» deja el foco en `body`: la ficha de `lead` sólo se recupera en la URL
  donde se abrió. Assert: el segundo «atrás» devuelve el foco al nombre de la fila también desde la pestaña.
- **4-60** (sin fase, el próximo paso que toque la paginación del listado; salió del 4.14-2a4): en el completo de escritorio,
  `e2e/listas-por-pagina-pendiente.spec.ts:102` cayó una vez: tras volver la red, el listado y la URL quedaron en 25 pero la preferencia guardada siguió en 10 (5 s de
  espera). La traza (`e2e-fallos/2026-10-30_07-04/`): la única POST, la action que guarda la preferencia, salió 6 ms antes de `setOffline(true)`, falló (status −1) y no se
  reintentó al volver la red (103 ms después). Repetido 5 veces, en verde (`.piloto/salidas/4.14-2a4/repetir-listas.txt`): la prueba es una carrera entre el envío y el
  corte. No se descartó que los hooks del 4.14-2a4 en `/leads` cambien el instante del envío. Assert: con la red cortada mientras la action está en vuelo, al volver la
  preferencia queda guardada (el envío se reintenta), y `--repeat-each=20` de ese spec sin caídas.
- **4-50** (antes del 4.18, P5 del 4.14-2a; el cómo lo decide la persona; salió del 4.13-4d, de las capturas): al 200 %, el resumen fijo al pie (escritorio y celular) ocupa cerca del 40 % del alto de la pantalla y
  tapa la hoja mientras se desplaza; se pliega con su «—», pero nace abierto. Assert: al 200 % el resumen al pie no pasa de un alto que se decida, o nace plegado, y
  `aLaVistaSinDesplazar()` de la celda con el foco sigue verde. Suma (4.14-2a, P5): el resumen no sube más allá del borde de arriba de la hoja, y con la barra del vehículo
  encima, al 200 % y con la página arriba de todo, queda debajo del borde de la ventana: 107 px en escritorio y 37,6 en el celular (al 100 % cabe; antes cabía por 1 px).
  `cotizar-hoja-resumen.spec.ts` lo mide ahora con la hoja arriba de la ventana. La persona lo aceptó (P5) y **endureció el assert**: además, al 200 % en los dos
  proyectos y con la página arriba de todo, el resumen cabe entero en la ventana (su borde de abajo a ≤ 1 px del de la ventana). Se arregla al decidir 4-50, antes del 4.18. Suma (4.14-3b): con las dos barras (vehículo y cliente), al 200 % y con la página arriba de todo, el resumen queda 227 px (escritorio) y 157,6 (celular) bajo el borde de la ventana (al 100 % cabe: −258,5 y 0); el assert endurecido, con la hoja arriba de la ventana, sigue en verde.
- **4-51** (sin fase; se mide y se decide en el paso de la purga de vehículos; salió del 4.14-1): el `on delete set null` de `cotizaciones.vehiculo_id` (`base.sql:25020`) no tiene
  un índice que lo sirva: `cotizaciones_vehiculo_creado_idx` (el del 4.14-1) y el de antes son parciales (`eliminado_en is null`), así que purgar un vehículo busca sus
  cotizaciones de la papelera recorriendo. No empeora con el 4.14-1. Assert: purgar un vehículo con 250.000 cotizaciones no recorre `cotizaciones` (`seq_scan` = 0).
- **4-52** (sin fase, lo decide la persona; del tipo de 4-46): `supabase/tests/medir-cotizacion-guardar.sql` mide 319 líneas (> 300; ya medía 308 antes del 4.14-1). Partirlo por
  responsabilidad (el terreno y las funciones de medición, los casos). Assert: `wc -l` de cada parte ≤ 300 y lo mismo medido en verde.
- **4-64** (sin fase, lo decide la persona; del tipo de 4-52, salió del 4.14-3a): `supabase/tests/derivados-leads.sql` mide 493 líneas y `scripts/carreras.mjs` 355 (> 300; ya medían 470 y 353 antes). Partirlos por tema, o registrar las carreras nuevas desde `scripts/carreras/`. Del 4.15-1: `supabase/tests/cotizaciones-visibilidad.sql` (1.730 → 1.807 líneas), `supabase/tests/cotizacion-guardar.sql` (665 → 762) y `scripts/carreras/cotizaciones-guardar.mjs` (666 → 698); y `cotizacion_guardar` mide 121 líneas de función (> 80): partir una RPC `security definer` mueve su inventario y sus carreras. Del 4.15-2: `cotizaciones-visibilidad.sql` (→ 1.811), `scripts/carreras.mjs` (→ 357), `cotizacion-hoja.sql` (705 → 735), `cotizacion-guardar.sql` (→ 764), `medir-cotizaciones-lectura.sql` (359 → 360); `cotizacion-hoja-dato-del-vehiculo.sql` (340) y `cotizaciones-guardar.mjs` (698) sólo cambian la firma; y las funciones `_cotizacion_hoja` (≈ 127 líneas, recreada igual) y `cotizacion_encima` (106 de cuerpo). Del 4.16-1: `cotizaciones-visibilidad.sql` (→ 1.880), `medir-cotizaciones-listado.sql` (389, nuevo: el runner pasa el SQL por la entrada estándar y `\ir` no sirve), `cotizaciones-listado.sql` (309, nuevo) y la función `cotizaciones_listado()` (149 líneas: tres consultas de siete ramas; partirla en ayudantes les daría EXECUTE y entrarían a la guarda de páginas).
- **4-65** (**cerrado** en el 4.14-3b, 2026-10-31: límite aceptado por la T3, declarado en `docs/RENDIMIENTO.md` y con su assert en `medir-cartera-reciente.sql`: 285 ms con 212.000 leads, tope 400; sin fase; salió del 4.14-3a, T3): la pestaña por clase del panel del cliente recorre toda la cartera de quien mira cuando no tiene ningún lead de esa clase (`tipo_lead_id` no está en `leads_asesores_reciente_idx`): 66 ms con 20.000 leads en su cartera y 289 ms con 80.000 (tope declarado 400 ms). Si el 3b lo siente en la pantalla, la salida es copiar también la clase del lead en la cartera, con su índice y sus triggers (otro plan, a auditar). Assert: la pestaña de la clase ausente de `supabase/tests/medir-cartera-reciente.sql`.
- **4-53** (**cerrado** en el 4.14-3a, 2026-10-31: `scripts/sembrar-volumen.mjs` importa `readFileSync`, y `db:sembrar-volumen` y `db:medir:volumen` corren detrás; sin fase; salió del 4.14-1): `pnpm db:sembrar-volumen` cae con `ReferenceError: readFileSync is not defined`:
  `scripts/sembrar-volumen.mjs` lo usa sin importarlo desde `c300ad7b` (el ayudante del stack de cada worktree). El 4.14-1 sembró con una copia que lo importa, fuera del repo.
  Assert: `pnpm db:sembrar-volumen` termina y `pnpm db:medir:volumen` corre detrás.
- **4-66** (sin fase, lo decide la persona; salió del 4.14-3c, P3): en «Nuevo lead» abierto desde la hoja, un teléfono que ya es de un lead que quien cotiza ve («Ya existe: …», que no deja seguir) no se puede elegir desde el aviso: se busca en el panel del cliente. Hacerlo es un botón junto al aviso con el `leadId` que ya llega (`entities/verificacion.ts`) y la escritura de «elegir al creado»; toca el campo del teléfono del alta, que comparte su aviso con el cambio de teléfono de la ficha.
- **4-67** (sin fase, lo decide la persona; salió del 4.15-1, 4-26): el conteo de exportar (`contarLeadsHasta`, `leads_cartera_vista` de a 1.000) de una cartera recién sembrada de 5.001: tras `analyze leads, leads_asesores` su primera página elige `Nested Loop` con `Seq Scan on leads` adentro (12,5 millones de filas descartadas, 828.878 buffers): 3.095 ms; sin `analyze`, sus páginas crecen con la profundidad (31, 60, 95, 131 y 167 ms). Medido en SQL (`.piloto/salidas/4.15-1/4-26/`), no por la e2e (allí el autoanalyze cayó y la respuesta siguió en 299 ms). Cierre: en `db:medir:volumen`, las páginas del conteo de exportar de una cartera de 5.001, tras `analyze`, sin `Seq Scan on leads` en el bucle, sin crecer con la página y bajo 50 ms cada una.
- **4-68** (4.24, la papelera propia; salió del 4.15-1): `papelera_enviar` deja mandar una cotización a la papelera con `cotizaciones.editar` y sin `cotizaciones.ver` (el mismo defecto que 4-34, en otra puerta) — que pida ver, con el error de lo inexistente.
- **4-69** (4.27, adjuntos; salió del 4.15-1): las policies «cotizaciones_adjuntos: crear» y «cotizaciones: subir» (`storage.objects`) piden `editar` sin `ver` — que pidan ver; son policies: su paso corre el Nivel 2.
- **4-70** (4.24, la papelera propia; salió del 4.15-2): `papelera_restaurar` de una versión nueva (cotizar encima) cuando su anterior ya tiene otra viva da el 23505 de `cotizaciones_encima_unica`, sin texto humano: un PT409 «Esa cotización ya tiene otra versión nueva», o restaurarla sin la marca de anterior.
- **4-71** (sin fase, lo decide la persona; salió del 4.15-3a, P1): cambiar el vehículo de una preventa guardada desde su página `/cotizaciones/[id]`. La base lo deja (`cotizacion_guardar(p_vehiculo)`: una preventa cambia de vehículo y nunca lo quita); la página lo muestra sin cambiarlo y «Guardar» manda el que tiene. Hacerlo es la barra del vehículo de la hoja nueva (un 4.15-3c) o sólo elegir entre los ya cargados.
- **4-72** (sin fase, lo decide la persona; salió del 4.15-3a): quien ve una cotización y no ve su vehículo no la recalcula ni la guarda (`_cotizacion_armar` pide ver el vehículo): la página dice «No se pudo recalcular» y muestra «Total guardado», pero sus cifras de hoy no se ven. Que el recálculo de una guardada no dependa del vehículo que quien mira no ve, o que la pantalla lo diga.
- **4-73** (sin fase; salió del 4.15-3a): el JS en frío de `/cotizaciones/nuevo` subió de 453,1 a 456,9 KB tras el 4.15-3a (commit 2) y quedó en 456,2 tras el commit 3, tope 460 (margen 3,8 KB); el plan decía «no sube». Viene de lo compartido que tocaron los commits 1 y 2 (la hoja generalizada: `DeDondeCalcula`, `iniciales`, `abre`); sin atribuir a un commit (habría pedido compilar `9df08f05`). La guardada también viaja con la hoja nueva: `hoja-de-cotizar.tsx` importa su guardado. Antes de sumar peso a la hoja (el 4.15-3b, el 4.19): atribuirlo y, si hace falta, pedir lo de la guardada con `diferido()`. **Atribuido en el 4.15-3b:** los textos que sólo dice la guardada («Al recargar se abre esa versión», «no puedes guardar esta cotización») viajan en el chunk `3e8zry20292r8.js` (10,4 KB con gzip), que carga también `/cotizaciones/nuevo`; el 3b no lo movió (456,2 KB de 460, igual que antes) y suma sólo a `/cotizaciones/[id]` (440,3 → 442,3 de 448). Sigue abierto, sin fase.
- **4-74** (menor, sin fase; salió del 4.15-3a): `schemas/edicion.ts:14` acota `notas` con `.max(2000)`, que cuenta unidades UTF-16 y la base cuenta caracteres (una nota con emoji cerca del tope bloquearía «Guardar»; hoy ninguna pantalla escribe notas); y `e2e/cotizar-guardada-guardar.spec.ts:124` usa `waitForTimeout(600)` para afirmar que no salió ningún guardado (no hay un estado final que esperar sin un guardado centinela).
- **4-75** (4.17, el camino a lo antiguo; salió del 4.15-3b, P2): el panel «Revisiones» de una guardada se detiene en las 500 más recientes (`<AvisoDeTope>`, «Mostrando las 500 más recientes.») y no tiene cómo llegar a las más viejas: el 4.17, que hace los «Ver más» de las secciones «Cotizaciones» y el camino a lo antiguo del historial, suma ahí «Ir a una fecha» al panel. Motivo de no hacerlo ya: 500 ediciones de una sola cotización no es un caso real y la base lee de a 20 por `cotizaciones_revisiones_cotizacion_idx`.
- **4-76** (menor, sin fase; salió del 4.15-3b): (a) el aviso de versión no sale si la hoja no tiene secciones que dibujar (`hoja-de-cotizar.tsx` corta con `SinDatosQueVer` antes del hueco `encima`), aunque el aviso lo ve todo el que abre la página; (b) `e2e/cotizar-encima.spec.ts` afirma «sin envío» tras un toque forzado sin un centinela (el mismo caso que 4-74); (c) la prueba de «otra persona cotizó encima» usa a la dueña en otra sesión, no a otra persona; (d) falta la prueba de que la hoja nueva no dibuja el aviso (cierto por construcción).
- **4-77** (4.16-2 lo vuelve a medir; arreglarlo es un paso propio con compuerta `datos`; salió del 4.16-1): cada lectura con la policy de `cotizaciones` carga ≈ 160–240 buffers fijos por llamada: `origenes_con_alcance()` → `mis_permisos()` relee `perfiles` ≈ 74 veces (una por fila de su join, `base.sql:14318-14323`) y la policy de cada ruta activa trae sus InitPlan (`.piloto/salidas/4.16-1/sonda-costo-fijo.txt`). No crece con N; probablemente crece con las filas de `roles_permisos` de quien mira (permisos × orígenes: inferencia, sin medir). Es de toda lectura con esa policy, no del listado, y bajarlo toca una `security definer` de todas las policies. El 4.16-2 lo mide con dos roles de distinto tamaño y deja el número.
- **4-54** (sin fase, lo decide la persona; salió del 4.14-2a): si una cotización se está guardando cuando se elige otro vehículo en el panel (abrirlo y elegir dentro de lo que
  tarda el guardado), se guarda con el de antes —lo que se veía al guardar— y la hoja pasa al nuevo sin la tarjeta de éxito; quien guardó puede creer que no se guardó y
  guardar otra vez: una cotización de más. La barra queda fuera de `[data-hoja]` y no se apaga con su `inert`. Assert: con el guardado demorado (la action interceptada), abrir
  el panel y elegir otro vehículo; al terminar, o la pantalla dice que se guardó o el panel no dejó elegir, y el lead tiene una sola cotización nueva. Suma (4.14-3b): elegir un cliente mientras se guarda es el mismo caso (el lead también va en la `key` de la hoja). Suma (4.14-3c): crear un lead desde «+» mientras la hoja guarda es el mismo caso (elegir al creado vuelve a montar la hoja).
- **4-56** (sin fase, lo decide la persona; del tipo de 4-43): `e2e/soporte/cotizar-formula.ts` mide 330 líneas (> 300; 315 antes del 4.14-2a, que le sumó el origen de subasta
  y el borrado de sus vehículos). Partirlo por responsabilidad (la fórmula de prueba, los orígenes y su limpieza, lo que se mira en la base). Assert: `wc -l` de cada parte ≤ 300
  y los mismos specs en verde.
- **4-57** (sin fase, el próximo paso que toque esas pantallas; salió del 4.14-2a3): en una corrida larga de escritorio, una apertura justo tras cargar la página o tras
  cerrar un panel `shallow: false` no tuvo efecto: `vehiculos-resumen.spec.ts:68` (Enter en el nombre recién cargado `/vehiculos`), `vehiculos-resumen-casos.spec.ts:66` (el
  segundo «Editar» tras «Cancelar») y, contra HEAD, la sonda del 4.14-2a3 (un clic en «Filtros» recién cargado; `.piloto/salidas/4.14-2a3/sonda-c0.txt`). Repetidos, en verde.
  Sin causa todavía (¿la hidratación?, ¿una navegación pendiente que pisa la nueva?). Assert: `--repeat-each=20` de esos dos specs en escritorio, con la página recién
  cargada, sin caídas; si caen, la causa medida y su arreglo.
- **4-55** (4.18; salió del 4.14-2a): la referencia del cotizador pone el título de la cotización en el panel del vehículo; `cotizacion_crear` no recibe título. Se decide con
  la tarjeta y el PDF. Assert: lo que se decida, con su e2e.
- **4-45** (4.18; salió del 4.13-4b1): `cotizaciones.moneda_mostrar` (`char(3)`, legible) no la escribe ninguna RPC ni la lee la app, y con
  `ver_total_bs` su propósito queda en duda. Se decide en el 4.18, con la tarjeta y el PDF: se usa o se quita (migración que la borra, con
  su `db:types`).
  Assert: o una prueba de base que la escribe y la lee, o `moneda_mostrar` fuera de `cotizaciones` y de `database.types.ts`.
  Suma (4.13-4b2): la tarjeta y el PDF de una cotización guardada necesitan la moneda del total en Bs; la hoja la lee de `cabecera.moneda_bs`, que sale de
  la versión y del tipo de cambio de hoy. `moneda_mostrar` podría guardarla al crear: se decide aquí.
- **4-46** (sin fase, lo decide la persona; salió del 4.13-4b2; del tipo de 4-39 y 4-43): `supabase/tests/cotizacion-hoja.sql` tiene 705 líneas (> 300). Partirlo
  por responsabilidad: los ayudantes `pg_temp.ch_*` a un archivo que `scripts/probar-schema.mjs` cargue antes, y la conducta, los niveles y la moneda aparte, con
  `SOLO` sabiendo cargar los ayudantes. Assert: `wc -l` de cada parte ≤ 300 y los mismos `@test` en verde.
- **4-47** (4.23; salió del 4.13-4c2): la ayuda de una tabla dibuja hasta 1.000 filas y dice «Mostrando las 1.000 primeras filas.» sin un camino a las demás (se aparta de
  la regla de `.claude/rules/escala.md`: siempre hay un camino a lo antiguo); el editor de tablas (4.23) lo da. Además, sin copia viva de la tabla, la base manda la clave como
  nombre y `columnas` vacía, y la pantalla deriva las columnas de la primera fila (con la clave de encabezado). Assert: una tabla de más de 1.000 filas llega a todas desde
  el editor, y una tabla congelada sin viva se rotula con etiquetas.
- **4-48** (sin fase; el próximo paso que toque `src/shared`): `src/shared/ui/xcell/CLAUDE.md:38` dice «lo que abran [los botones] pasa sus cifras por `<Monto>`»; con la
  ayuda de una tabla (4.13-4c2, P13) sólo es cierto para una celda de dinero (un factor `raw` queda a la vista). No se corrigió en el 4c2 porque tocar esa ficha da Nivel 2.
  Assert: la línea dice lo que hace la hoja.
- **5a-4b** (4.28): la suite completa no baja de 25 min (el Nivel 3 tarda 40,1 min con 1.065 pruebas; el Nivel 2 ≈ 24; el último completo
  de escritorio, ≈ 28 min). Decidido el 2026-10-19: no se monta la segunda pila local; los shards de CI son la salida (`.github/workflows/ci.yml`,
  CI-1: 4 runners, cada uno con su pila y su base; escritorio por defecto y `proyectos: ambos` a mano; los bloques de escritorio suman 5,7 a
  6,5 min de pruebas cada uno). El mecanismo: los dos proyectos comparten la base y corren con un solo worker. Assert original:
  `pnpm test:e2e:completo` con los dos proyectos ≤ 25 min con las mismas pruebas (`node scripts/areas-cubiertas.mjs`); el cierre (4.28)
  anota el tiempo de cada proyecto para que la persona decida con números si vale la segunda pila local (dos pilas de Supabase con otro
  `project_id`, otros puertos y `scripts/e2e-completo.mjs` lanzando los dos a la vez).
- **5a-12** (4.17): las oportunidades de un lead más allá de 100 no tienen camino, y cada una pesa 3,5 KB en el documento. «Ver todas»
  trae hasta 100 (`lead_oportunidades` pide 101 y dice `hay_mas`; `<AvisoDeTope>`); con 100 pesa 374 KB (presupuesto de la ficha con
  todas, 400) — un lead con 1.000 oportunidades llega a todas con «Ver más» de a `TAMANO_DE_VER_MAS`, sin que el documento de la ficha ni
  una lectura pesen más que con 10, y `TOPE_DE_LO_CARGADO` corta lo acumulado (`leads-oportunidades-ver-todas.spec.ts`, con volumen
  sembrado por SQL). Lugar: la RPC `lead_oportunidades` (`p_tamano` y cursor por `_acotar_pagina`, en el registro de
  `scripts/guardas/paginas-en-la-base.ts`; migración y cadena db con `db:carreras`), `features/oportunidades/lecturas.ts` y
  `PieDeOportunidades`; el peso por oportunidad baja si la fila se dibuja en el servidor.
- **5a-29** (4.20): la «Clave interna» de un origen se corta en el borde de la pantalla al 200 % en el celular (`e2e_largo_capturas_movil`,
  monoespaciada, llega a x = 412; no ensancha la página, así que `sinScrollHorizontal()` no lo ve) — `aLaVistaSinDesplazar()` sobre el
  valor de la clave al 200 % en 412 px (la clave se parte, o se desplaza dentro de su caja). Lugar:
  `src/modules/origenes/features/origenes/components/datos-del-origen.tsx` (línea 34) y `e2e/configuracion-200.spec.ts`.
- **5a-30** (4.20): el paso «Revisa los permisos» de la ficha de un origen queda en una columna de ~130 px al 200 % en el celular («Abrir
  →» no cede; el paso «Publica la fórmula» ganaría su «Abrir →» y heredaría el defecto) — el texto del paso mide al menos 12 rem de
  ancho al 200 % en 412 px, o «Abrir» pasa debajo (`@container`, como las tarjetas), con su prueba en `e2e/`
  (`src/modules/origenes/features/pasos/components/siguientes-pasos.tsx`).
- **5a-33** (4.28): Roles, en escritorio al 200 %, el conteo del rol (`roles_personas()`) queda tapado por la columna «Permiso» fija, y
  `toBeVisible` no lo detecta — al 200 % en escritorio, la caja del conteo no se solapa con la columna fija (sus cajas no se intersecan),
  con un rol de miles de personas («más de 1.000 personas») y con uno de una. Lugar: `e2e/roles-conteo-acotado.spec.ts`,
  `matriz-de-roles.tsx` y `cabecera-matriz.tsx` (`src/modules/equipo/features/roles/components/`). Decidido por la persona el 2026-10-22.
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
- **5b-7** (4.23, antes de escribir cómo se reordenan las filas de una tabla de referencia): la carrera «dos personas reordenan tipos de
  seguimiento» no distingue el candado de `tipo_seguimiento_mover`: al quitarle `lock table … share row exclusive` la prueba de
  `scripts/carreras/configuracion-de-leads.mjs` sigue en verde — quitar el candado hace caer `pnpm db:carreras` (una carrera donde B calcule
  su lugar con la lista de antes de que A termine) o, si se demuestra que no hace falta, se quita y la RPC dice por qué en su comentario (en la base, `supabase/migrations/20261028180656_base.sql`).

---

## Fase 5 — Flujos (configuración)

Módulo `flujos`: configuración por origen (y el de repuestos): fases con todos sus atributos, transiciones con acción y nota obligatoria,
roles por fase y por transición, requisitos (documento con tipo/min/max/formatos, dato con las claves del catálogo, espera a fase de otro
flujo), reglas del flujo (encender/apagar con impacto), tipos de documento globales y por flujo con vencimiento, oferta de transporte,
franja «Revisar» (`revisar_flujo`), jubilar/eliminar fase (`fase_eliminar`), «fuera de regla» y el aviso de impacto antes de volver
bloqueante un requisito.

**Terminado cuando:** el dueño arma desde cero un flujo de 5 fases con requisitos de los tres tipos sin tocar SQL, «Revisar» marca una
fase sin salida y una espera cruzada, y jubilar una fase con historial la saca de los destinos sin romper nada.

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
  editor y `vehiculos`.

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
  no cambia código (docs/ENTORNOS.md › «Cambiar de Resend a Cloudflare»).

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
  sin el permiso lo avisa. Lugar: `src/modules/web/features/cola/` (nuevo), con una lectura propia que no pase por `estado_cola_web`.

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

---

## Fuera de alcance

- Multiidioma. Offline real. Editor de artes (Konva). Directorio de contactos/empresas.
- API de WhatsApp/Meta. Multi-empresa por despliegue.
- La web pública en sí (repo aparte con `sitio-marketing` sobre el esquema `web`).

Si algo de esta lista se vuelve necesario, se discute y se agrega al plan explícitamente. No se cuela dentro de otra fase.
