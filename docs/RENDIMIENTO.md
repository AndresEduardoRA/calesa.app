# Rendimiento

Cada superficie que crece con los datos, con su tope, el índice que la sostiene, su presupuesto y
dónde se mide. La regla está en `.claude/rules/escala.md`. Las mediciones no son a mano:

- **La base:** `pnpm db:medir` (`scripts/medir-listado.mjs`) corre cada `supabase/tests/medir-*.sql`
  contra el Supabase local en una transacción que se revierte. `medir-volumen.sql` además **asserta la
  forma del plan genérico**: el índice nombrado, ningún recorrido de la tabla y lo que se descarta. Si
  una consulta cambia de forma, falla.
- **Con volumen** (9e): `pnpm db:sembrar-volumen` llena la base local con 50.000 leads (la dueña 20.000, Ana 2.000), 10.000
  vehículos, 200.000 seguimientos, 20.000 recordatorios y 8.000 oportunidades en una etapa; `pnpm db:medir:volumen` corre
  `medir-escala.sql` (cada consulta del inventario, como la dueña con «todos» y como Ana con «propios»: la RLS cuenta) y
  `medir-jobs.sql` (100.000 filas por purgar en cada job), con plan y presupuesto asertados. Después, `pnpm db:reset`.
- **La pantalla:** cada superficie tiene su e2e con volumen sembrado por SQL (`e2e/soporte/sql.ts`).
  Cuenta los pedidos, los bytes de la primera respuesta y los nodos del DOM, sin cronómetros.
- **El JS en frío** es la suma de los `.js` de `/_next/static` que el **documento** de la pantalla nombra
  (sus `<script>` y `<link rel="preload">`), con gzip y pedidos sin caché: lo que paga quien llega por
  primera vez a esa pantalla (`e2e/soporte/js-en-frio.ts`). No cuenta lo que Next prefetchea de las demás rutas
  (medir «hasta el `networkidle`» daba lo mismo en todas) ni lo que se pide al interactuar. Lo guarda
  `e2e/presupuesto-js.spec.ts` con los presupuestos de `e2e/soporte/presupuestos.ts`.
- **Las guardas** de `.claude/rules/escala.md` (código, SQL, planes, jobs, JS, nodos) y la regla de qué
  hace falla cuando la próxima lista no cumple están en esa regla.

## Seguimientos de un lead

La sección «Seguimientos» de la ficha y la pestaña «Seguimientos» del drawer.

| Qué                                 | Valor                                                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Página y tope                       | 20 por «Ver más», hasta 500 (`TAMANO_DE_PAGINA`, `TOPE_DE_LO_CARGADO`); más allá, «Ir a una fecha»                                                     |
| Lectura                             | `lead_seguimientos()`: la unión de los míos y los públicos; con y sin cursor son dos consultas                                                         |
| Índices                             | `seguimientos_lead_autor_idx (lead_id, usuario_id, ocurrido_en desc, id desc)` y `seguimientos_lead_publicos_idx` (parcial, `visibilidad = 'publico'`) |
| «Recargar» tras un conflicto        | La primera página + `lead_seguimiento(p_lead, p_id)` por la clave primaria: ≤ 2 pedidos                                                                |
| Presupuesto de la primera respuesta | ≤ 24 KB con 20 ítems de un párrafo (medido: 16,4 KB)                                                                                                   |
| Pedidos al abrir la pestaña         | 1 de la lista (+ los tipos activos: una lista fija de configuración)                                                                                   |
| Nodos del drawer                    | ~1.700 tras 5 «Ver más» y ~7.000 en el tope de 500 (`content-visibility: auto` en cada ítem)                                                           |
| `db:medir` (20.000 seguimientos)    | página 1: 7,3 ms; página 501: 7,1 ms; con «todos» y 20.000 privados ajenos: 0,1 ms (antes 4,6 ms descartando las 20.000); por id: 0,5 ms               |
| e2e                                 | `e2e/leads-rapido-volumen.spec.ts`                                                                                                                     |

El costo de la página de la autora es casi todo la policy de `seguimientos`, que evalúa
`puede_lead(lead_id)` por fila: 21 veces, unos 0,3 ms cada una. No crece con el total.

## Recordatorios de un lead

«Tus recordatorios» de la ficha y la pestaña «Recordatorios» del drawer (el mismo bloque).

| Qué                                 | Valor                                                                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Página y tope                       | 20 por «Ver más», hasta 500 por lista; «Completados» no se lee hasta abrirse                                                                                                    |
| Lectura                             | `lead_recordatorios(p_lead, p_completados, …)`, sobre la tabla (la vista no deja usar el índice por persona y lead); por id, `recordatorios_vista` por la clave primaria        |
| Índices                             | `recordatorios_lead_pendientes_idx (usuario_id, lead_id, recordar_en, id)` y `recordatorios_lead_completados_idx (usuario_id, lead_id, completado_en desc, id desc)`, parciales |
| «Recargar» tras un conflicto        | Sólo ése, por su id: 1 pedido                                                                                                                                                   |
| Presupuesto de la primera respuesta | ≤ 14 KB con 20 ítems (medido: 9,4 KB)                                                                                                                                           |
| Pedidos al abrir la pestaña         | 1 (los pendientes); abrir «Completados», 1 más                                                                                                                                  |
| Aviso de vencidos de la ficha       | `lead_ficha()` cuenta hasta 21 con `recordatorios_lead_pendientes_idx` («más de 20»); `lead_ficha` pasó de 6,5 a 2,3 ms con 1.000 vencidos                                      |
| `db:medir` (5.000 recordatorios)    | pendientes, página 1: 1,1 ms; completados, página 126: 0,9 ms; sin filas descartadas en ningún plan                                                                             |
| e2e                                 | `e2e/leads-rapido-volumen.spec.ts`                                                                                                                                              |

Antes de la 9d-2 se leían los 100 de fecha más vieja, completados incluidos: con muchos completados
viejos no llegaba ningún pendiente.

## Inventario de escala (9e)

Cada lista, tabla, tablero, panel, selector, buscador, contador, exportación, importación y job. «Tope» es lo que se
dibuja o se lee de una vez; «Número» dice de dónde sale lo que se muestra (siempre acotado: `limit tope + 1`); «Presupuesto»
es el tiempo que asserta `pnpm db:medir:volumen` o el e2e (≈ 4 veces lo medido; en el listado, las metas de la 9h); «A 50.000» es
lo medido en la dueña («todos») y, entre paréntesis, en Ana («propios», 2.400 visibles); con «→», lo de antes y lo de hoy (9h). Estado: **ok**, **arreglado** (en la 9e), **límite**
(aceptado, anotado abajo) o **exento** (acotado por naturaleza, con su motivo en `scripts/guardas/excepciones-de-escala.ts`
o `supabase/tests/escala.sql`).

### Leads

| Superficie                                                             | Tope                                                                                     | Número                                               | Índice                                                                                  | Presupuesto                          | A 50.000                                                                                                                                                                                                                                                                                                                  | Estado                                                                                                         |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Listado, página                                                        | 100 filas por cursor (`MAXIMO_DE_PAGINA_DE_LEADS`)                                       | ninguno (Anterior / Siguiente)                       | `leads_listado_idx`                                                                     | 30 ms                                | a 50: 10 (11) → 10,5 (10); a 100: 518 (92) → 19 (17)                                                                                                                                                                                                                                                                      | **arreglado** (9h: la policy estimable)                                                                        |
| Listado, página profunda                                               | 100 filas                                                                                | ninguno                                              | `leads_listado_idx` (condición de índice sobre `creado_en`)                             | 150 ms                               | 370 (38) → 11 (10); a 100, 19 (17)                                                                                                                                                                                                                                                                                        | **arreglado** (9h; era límite: la policy llamaba dos funciones por fila)                                       |
| Listado «míos», página 1 (lo que ve cada quien por defecto)            | 100                                                                                      | ninguno                                              | `leads_listado_idx`                                                                     | 30 ms                                | 870 (70) → 10 (10); a 100, 17 (17)                                                                                                                                                                                                                                                                                        | **arreglado** (9h; no estaba en el inventario)                                                                 |
| Listado, un campo privado sin resultados                               | 100                                                                                      | ninguno                                              | recorre la cartera de quien filtra con `atributos_lead()` (~66 µs por lead)             | 6.000 ms                             | ~4.000 sobre lo visible → 1.065 (146)                                                                                                                                                                                                                                                                                     | **límite** (9h): sólo la cartera tiene el dato                                                                 |
| Listado, filtro por un atributo                                        | 100                                                                                      | ninguno                                              | `leads_listado_idx`; un campo público por `atributos_publicos`                          | 100 ms                               | 43 (40) → 11 (11)                                                                                                                                                                                                                                                                                                         | **arreglado** (9e: 3.761 → 43; 9h: la copia de lo público)                                                     |
| Listado, filtro sin resultados / búsqueda                              | 100                                                                                      | ninguno                                              | recorre la cartera visible, ~0,4 µs por lead                                            | 100 / 200 ms                         | 4.365 / 404 (202 / 32) → 21 / 51 (16 / 16)                                                                                                                                                                                                                                                                                | **arreglado** (9h) · con 212.000 leads la búsqueda de la dueña **crece con N**: 207–231 ms (cierre 5a, `5a-1`) |
| Listado, favoritos / tachados / etiqueta                               | 100                                                                                      | ninguno                                              | unión por clave primaria con las marcas de quien mira                                   | 100 ms cada uno                      | 99 / 104 / 717 (15 / 15 / 40) → 11 / 12 / 42 (9 / 10 / 24)                                                                                                                                                                                                                                                                | **arreglado** (9h)                                                                                             |
| Aviso de tachados ocultos                                              | 50                                                                                       | «más de 50» (`contarLeadsHasta`)                     | `leads_tachados_pkey` (unión)                                                           | 100 ms                               | 10 (3) → 2 (0,5); con un atributo 70 (10) → 2 (0,5)                                                                                                                                                                                                                                                                       | **arreglado**                                                                                                  |
| Drawer rápido, seguimientos y recordatorios                            | 20 por «Ver más», 500                                                                    | ninguno                                              | ver «Seguimientos de un lead»                                                           | ver arriba                           | ver arriba                                                                                                                                                                                                                                                                                                                | ok                                                                                                             |
| Ficha                                                                  | un lead                                                                                  | «más de 100 vehículos»                               | `vehiculos_lead_idx`                                                                    | 80 ms                                | 2 ms (5)                                                                                                                                                                                                                                                                                                                  | **arreglado** (`count(*)`)                                                                                     |
| Ficha, oportunidades                                                   | 100 + `hay_mas`                                                                          | ninguno                                              | `oportunidades_lead_id_idx`                                                             | 150 ms                               | 18 ms (8)                                                                                                                                                                                                                                                                                                                 | **arreglado** (sin tope)                                                                                       |
| Kanban, tablero                                                        | 6 columnas × 50                                                                          | «500+» por columna                                   | `oportunidades_lead_id_idx` bajo la política                                            | 800 ms                               | 216 ms                                                                                                                                                                                                                                                                                                                    | **arreglado** (total exacto); **límite**: cuesta lo que tiene la persona (~2 µs por oportunidad)               |
| Kanban, «Ver más»                                                      | 500 por columna, con aviso                                                               | «Ver más (N)» o «Ver más»                            | ídem                                                                                    | 500 ms                               | 101 ms                                                                                                                                                                                                                                                                                                                    | **arreglado** (sin tope; `p_antes_en is null or`)                                                              |
| Kanban, buscar (cierre 1)                                              | 500 por columna, con aviso                                                               | «500+» o lo que coincide                             | `oportunidades_tablero_idx` y filtra: sin resultados recorre la columna de la persona   | 700 ms (tablero), 200 ms («Ver más») | 8.000 en una etapa: sin resultados 175 ms, con resultados 162, «Ver más» 49 (el tablero sin buscar, 147)                                                                                                                                                                                                                  | **arreglado**: el camino a lo antiguo de una columna (era «la ficha de cada lead»)                             |
| Papelera de leads                                                      | 5 lotes por cursor; de cada uno, los primeros 20 (`PRIMEROS_DEL_LOTE`) y «Mostrar los N» | `en_papelera` exacto (≤ 200)                         | `lotes_papelera_tipo_idx`                                                               | 400 ms                               | 85 → 13 ms (0,3 Ana); 5 lotes de 200: 8.212 → 1.017 nodos                                                                                                                                                                                                                                                                 | **arreglado** (9e: 597 ms, todos los lotes; cierre 1: 1.000 filas → 100)                                       |
| Quién lo tiene (cartera)                                               | personas de una cartera                                                                  | ninguno                                              | `leads_asesores`                                                                        | 50 ms                                | 0,3 ms                                                                                                                                                                                                                                                                                                                    | exento                                                                                                         |
| Candidatos de cartera                                                  | 500 (`limit 500`)                                                                        | ninguno                                              | —                                                                                       | 50 ms                                | 0,6 ms                                                                                                                                                                                                                                                                                                                    | ok                                                                                                             |
| Etiquetas, selector y «Gestionar»                                      | 50 por persona                                                                           | «En N leads» hasta 1.001                             | `leads_etiquetas_etiqueta_id_idx`                                                       | 300 ms                               | 51 ms                                                                                                                                                                                                                                                                                                                     | **arreglado** (`count(*)` por etiqueta)                                                                        |
| Importar, «Tus importaciones recientes»                                | 20 de las últimas 24 h                                                                   | `intactos` ≤ 500                                     | `importaciones_leads` (PK)                                                              | 300 ms                               | 45 ms                                                                                                                                                                                                                                                                                                                     | exento                                                                                                         |
| Importar, vista previa                                                 | 500 filas del archivo, 50 por página                                                     | «N filas» del archivo                                | —                                                                                       | —                                    | —                                                                                                                                                                                                                                                                                                                         | ok                                                                                                             |
| Importar, lotes                                                        | 50 filas por lote, 500 por archivo (`FILAS_POR_LOTE`, con su guarda)                     | —                                                    | —                                                                                       | `medir-importacion.sql`              | 500 filas: ~1,1–1,4 s en la semilla, ~3 s con 62.000 leads y 22.000 filas de `actividad` (con `actividad` chica, ~1,0–1,1 s con 0, 62.000 y 212.000: crece con `actividad`, `5a-3`); un lote de 100 no mejora más de 13 % y duplica el lote más lento. **Una base recién creada, sin estadísticas: ~20 s la primera vez** | **arreglado** (cierre 4: `seed.sql` analiza; la medición tiene su presupuesto «tal como queda tras el reset»)  |
| Exportar                                                               | lotes de 500, hasta 5.000, 5 por hora                                                    | hasta 5.001 ids (de a 1.000); «Descargamos N» exacto | `leads_listado_idx`                                                                     | 100 ms (5.001 ids)                   | 210 (51) → 5 (16)                                                                                                                                                                                                                                                                                                         | **arreglado**                                                                                                  |
| Alta, selectores                                                       | orígenes y tipos activos                                                                 | —                                                    | —                                                                                       | —                                    | —                                                                                                                                                                                                                                                                                                                         | exento                                                                                                         |
| Listado, filtro por un origen del lead                                 | 100                                                                                      | ninguno                                              | `leads_listado_idx` (un origen sin leads, `leads_origen_lead_id_idx`)                   | 100 ms                               | 100 (20,5) → 10 (10); dos orígenes 198 (27) → 11 (10); sin leads 0,1                                                                                                                                                                                                                                                      | **arreglado** (9h; era límite)                                                                                 |
| Listado, buscar `#n`                                                   | un lead                                                                                  | ninguno                                              | `leads_numeros_globales_numero_key` (dueña) / `leads_numeros_propios_creador_idx` (Ana) | 20 ms                                | 0,7 ms (2,7)                                                                                                                                                                                                                                                                                                              | ok                                                                                                             |
| Alta de un lead (el número propio)                                     | uno                                                                                      | —                                                    | `leads_contadores` (PK, un upsert)                                                      | 80 ms                                | 2,0 ms (1,8); el upsert 0,0 ms                                                                                                                                                                                                                                                                                            | ok                                                                                                             |
| Orígenes del lead, pantalla de configuración                           | 100 (se dice al llegar)                                                                  | «N de 100»                                           | `leads_origen_lead_id_idx` (un `exists` por rango por fila)                             | 100 ms                               | 0,03 ms la lista; antes 5 ms                                                                                                                                                                                                                                                                                              | **arreglado** (era Seq Scan sobre `leads`, ver abajo)                                                          |
| Eliminar un origen del lead                                            | uno                                                                                      | —                                                    | `leads_origen_lead_id_idx` (el mismo `exists`)                                          | 5 ms                                 | 0,03 ms; antes 5 ms                                                                                                                                                                                                                                                                                                       | **arreglado**                                                                                                  |
| Listado, filtro por un tipo de lead                                    | 100                                                                                      | ninguno                                              | `leads_listado_idx` (uno raro y uno sin leads, `leads_tipo_lead_id_idx`)                | 100 ms                               | 20–27 ms con 50.000 y con 212.000; sin leads 0,2                                                                                                                                                                                                                                                                          |
| Tipos de lead, pantalla de configuración                               | 100 (la base lo dice)                                                                    | «N de 100»                                           | `leads_tipo_lead_id_idx` (un `exists` por rango por fila)                               | 100 ms                               | 0,4 ms con 212.000                                                                                                                                                                                                                                                                                                        |
| Eliminar un tipo de lead                                               | uno                                                                                      | —                                                    | `leads_tipo_lead_id_idx` (el mismo `exists`)                                            | 5 ms                                 | 0,0 ms                                                                                                                                                                                                                                                                                                                    |
| Catálogos del listado, la ficha y la exportación (`leads_catalogos()`) | orígenes y tipos                                                                         | —                                                    | —                                                                                       | 30 ms                                | 0,1 ms                                                                                                                                                                                                                                                                                                                    |

**El filtro por origen del lead (9f-1).** `leads.origen_lead_id` tiene el índice de su FK (`leads_origen_lead_id_idx`) y
`db:medir:volumen` asserta que el filtro lo use, también el origen sin leads (0,1 ms: no recorre nada). Un origen con un quinto
de la cartera cuesta ~100 ms para la dueña y ~20 para Ana: un bitmap de sus leads y un top-N, no la página. Se probó un índice
compuesto `(origen_lead_id, creado_en desc, id desc) where eliminado_en is null`, que con el plan forzado entrega la página en
3 ms, pero el planificador **no lo elige**: estima que la policy de `leads` deja pasar ~24 de 8.000 filas y prefiere el bitmap.
No se dejó un índice que no se usa. **Desde la 9h** el filtro camina `leads_listado_idx` (~10 ms la dueña y Ana): la policy ya
se estima bien y no hace falta el compuesto. Un origen sin leads sigue por el índice de la FK.

**El filtro por tipo de lead (9j).** `leads.tipo_lead_id` tiene el índice de su FK (creado a mano: el bucle de `…000900_indices.sql` ya había pasado) y
`db:medir:volumen` asserta que un tipo sin leads (0,2 ms) y uno raro (1 %) lo usen. La siembra reparte los leads así: «Prospecto» 85 %, «Cliente» 14 %,
un tipo raro 1 % y uno sin leads. Con 50.000 y con 212.000 leads la página cuesta lo mismo, 20 a 27 ms para la dueña, Ana y Berta: uno común o
intermedio camina `leads_listado_idx` y descarta lo que no es de quien mira (a Ana, con el 14 %, ~19.100 filas, el mismo número con 50.000 que con
212.000: depende de la fracción visible y del tamaño de la página, no de la tabla); uno raro va por la FK y descarta lo que otras personas tienen de ese
tipo (7.551 a Ana con 212.000). **No se agregó un índice compuesto `(tipo_lead_id, creado_en desc, id desc)`:** lo que se descarta es la visibilidad, que
un índice por tipo no evita. Si una empresa pasara de ~1.000.000 de leads, se vuelve a medir con `pnpm db:sembrar-volumen -- --leads 1000000`. La lista de
tipos de la pantalla de configuración y la sonda de «¿algún lead lo usa?» usan el mismo `exists` por rango que los orígenes (0,4 ms con 100 tipos).
Ni el listado ni el kanban suman pedidos por los nombres: los tipos viajan en `leads_catalogos()`, la lectura que ya traía los orígenes (0,1 ms).

**La cartera de «todos» (9h).** La policy de `leads` se estimaba en un 0,37 % de la cartera viva (188 filas de 50.183; pasan
50.000 para la dueña y 2.400 para Ana): la rama «todos» dentro de un `or` valía 0,005 (un `Param = const` sin estadísticas) y el
limbo, un SubPlan por fila, 0,5. Con `limit 101` y ~150 estimadas, leer toda la cartera y ordenar le parecía tan barato como
caminar `leads_listado_idx`, y cada fila leída costaba ~10 µs (~80 con `atributos_lead()`). Ahora la regla es
`_lead_visible_para()` sobre `leads.cartera`, escrita para que se estime en ~1, y un campo público se filtra por
`leads.atributos_publicos`: cada fila recorrida cuesta ~0,4 µs y el planificador camina el índice y corta. Los números, antes y
hoy, en la tabla de arriba (50.000) y en ésta (200.000: lo que crece con la cartera es lo que recorre lo visible, ~0,4 µs por
lead, y la asesora con 3 leads, que camina el índice entero). `medir-escala.sql` mide también «míos», a Berta (7.000) y a una asesora con 3 leads, y asserta las metas.

| Con 200.000 leads, en ms (una vez, `pnpm db:sembrar-volumen -- --leads 200000`; sin presupuesto) | Antes          | Hoy           |
| ------------------------------------------------------------------------------------------------ | -------------- | ------------- |
| Página 1 a 100 filas (dueña / Ana / asesora con 3 leads)                                         | 22 / 37 / 58   | 18 / 17 / 59  |
| Página profunda a 100 filas                                                                      | 22 / 39 / 65   | 18 / 17 / 61  |
| «Míos», página 1                                                                                 | 14 (a 50) / 29 | 16 / 17 / 59  |
| Filtro sin resultados, un campo público (dueña / Ana)                                            | 16.279 / 703   | 63–87 / 52–70 |
| Etiqueta                                                                                         | 2.856 / 155    | 70 / 89       |
| Tachados                                                                                         | 451 / 36       | 26 / 17       |
| Un origen del lead                                                                               | 411 / 74       | 19 / 17       |
| Búsqueda sin resultados (Seq Scan: es lo correcto sin resultados)                                | 1.653 / 123    | 198 / 59      |
| Exportar, conteo hasta 5.001                                                                     | 203 / 105      | 5 / 31        |
| Un campo privado sin resultados (recorre la cartera de quien filtra: la dueña tiene 80.000)      | —              | 4.113 / 554   |

**Lo que cuesta escribir (9h, 50.000):** los triggers de la cartera y de los atributos públicos suman 0,4 ms a un alta (1,9 →
2,3), 208 ms a importar 500 filas en 10 lotes (809 → 1.017; el lote más lento 89 → 110 ms, contra 8 s de tope), 2,3 s a
transferir 5.000 leads de a uno (6,3 → 8,6 s) y 0,4 s a la baja de Berta, con 7.000 (113 → 510 ms). La baja de alguien con 80.000 leads tardaba 6,7 s (era 0,75: se
reescribe la fila de cada lead, ~70 µs) y con 200.000, **17,9 s**: `authenticated` la cortaba a los 8 s. **Desde el cierre 1 va por
lotes** (ver abajo). **El relleno** de una base viva (`_leads_derivados_rellenar(5000)`, reanudable, `skip
locked`): 212.000 leads en 43 lotes de ~450 ms. **Cambiar la privacidad de un campo** que tienen 200.000 leads no cabe en una
sentencia (9 a 21 s, contra 8 s de `statement_timeout`): va por lotes de 5.000 (`leads-campos-privacidad`, cada minuto, hasta 10).

**La baja por lotes (cierre 1, `medir-bajas.sql`, con transacciones de verdad).** Con 200.000 leads de una sola persona:
antes, una sentencia de 17,9 s que `authenticated` cortaba a los 8 s (y retenía los 200.000 leads mientras tanto). Ahora la
llamada hace el primer lote de 5.000 (**0,4–0,6 s**, presupuesto 4 s; una vez, tras cargar los 200.000, 3,4 s) y el job
`equipo-bajas` el resto: cada corrida corta pasados 1,5 s (**1,7–2,4 s**; con la máquina ocupada 3,5 y 4,3 s: un lote suelto no se corta; presupuesto
6 s, bajo el corte de 8 s que tendría una llamada) y la baja termina en 5 a 8 corridas, ~40 lotes, ~10 s de trabajo repartidos en minutos. Lotes medidos: 2.000 ≈ 250 ms,
5.000 ≈ 550 ms, 10.000 ≈ 0,9–1,4 s. Dos cosas que se aprendieron midiendo: (1) **cada lote sigue desde el último lead del
anterior** (cursor): empezando desde el principio, dentro de la misma corrida recorría las entradas del índice parcial que los
lotes anteriores ya revocaron (no se pueden descartar hasta que la corrida confirma) y una corrida de 10 lotes crecía con lo
hecho, 5,6 s; (2) **los ids salen solos del índice y los leads se bloquean después por su clave**: unidos, para la dueña (20.000
de 62.000) el planificador recorría las dos tablas y ordenaba (26 ms hoy, pero crece con la tabla); separados, 0,7 ms los ids
y 5 ms el candado. La vista previa cuenta hasta 1.001: 313 ms → 44–73 ms con 200.000 (al principio 2,2 s: `_bajas_en_curso()`
se evaluaba por fila; envuelta en `(select …)::uuid[]` es un InitPlan). El InitPlan nuevo de la regla no cambió ningún plan del
listado (`medir-escala.sql`; con 512.000 leads, la página 1 de la dueña sigue en 1,6 ms por `leads_listado_idx`).

**El cierre 2 midió la página como la pide la app** (`pg_temp.pagina` no incluía `dueno_id`, que la app sí lee: ahora trae las
columnas de `columnasDeLaConsulta()`). Página 1 de la dueña con 50.000 leads: 30,3 ms con las columnas reales antes de la
migración `…002500` (pasaba el presupuesto de 30 ms por 0,3) y 14,0 ms después (14,2 y 14,0 en las dos mediciones finales);
con el máximo de la lista, 24,1 ms. El filtro de la baja en curso (`la.usuario_id <> all ((select _bajas_en_curso())::uuid[])`)
es un InitPlan sobre una tabla casi vacía y no cambió el índice de ningún plan. La baja de 200.000 leads sigue terminando con la
cartera igual a su fuente; sus tiempos varían entre corridas con la carga de la máquina (no son una meta). Nodos del DOM: la
tabla con el nombre pegado (`w-max min-w-full`) y 100 filas sigue dentro de los 3.500 de `listadoDe100` (`leads-tabla-ancha.spec.ts`).

**El cierre 3 filtró también la policy de `leads_asesores`** (`…002700`: `usuario_id <> all ((select _bajas_en_curso())::uuid[])`, un InitPlan
sobre una tabla casi vacía). Medido con 62.000 leads (`db:medir:volumen`, la corrida entera sin una aserción fallida): página 1 de la dueña
14,8 ms (14,0–14,2 antes de la migración; presupuesto 30), con el máximo de la lista 24,6 ms (24,1), «míos» con el máximo 21,4 ms,
página 100 por cursor 14,7 ms; ningún plan cambió de índice. `db:carreras` en verde. Nodos del DOM: las tarjetas con el nombre partido en
líneas (`@container`) no suman nodos.

**«¿Algún lead usa este origen?» (corrección de la 9f-1, `…20261019000800`).** El índice de la FK existía (lo crea el bucle de
`…000900_indices.sql`), pero `_origenes_lead_json()` y `origen_lead_eliminar()` no lo usaban: con `l.origen_lead_id = o.id` el plan
genérico estima 1/`n_distinct` de la tabla (un quinto) y elige Seq Scan; para un origen con un lead, o sin ninguno, recorría
`leads` entera (62.000 filas, 5 ms) y crece con la tabla. `order by … limit 1` y `min()` no lo arreglan (`min(uuid)` ni existe). La
sonda por rango, `>= x and <= x`, se estima en un 0,5 % de la tabla sea cual sea el dato: camina el índice (0,03 ms). Lo asserta
`medir-escala.sql` con el origen como columna (que es lo que ve el plan genérico; con un literal el planificador usa el dato real y
no se entera) y con un origen de un solo lead; con la forma vieja la medición falla.

**Los números de un lead (9f-2).** El número global y el propio se leen de dos copias (`leads_numeros_globales` y
`leads_numeros_propios`) cuya policy es la regla de quién los ve. En `leads_vista` y en el kanban son **subconsultas escalares de la
lista de columnas**, no uniones: Postgres las evalúa después del `limit`, sólo para las filas que salen, y una unión se evaluaba por
cada fila recorrida (una página profunda costaba ~1.090 ms; con la subconsulta, ~330, lo mismo que sin pedir los números; la página
100 por cursor, 12 ms). El permiso (`tiene_permiso('leads.numero_global.ver')`) es un InitPlan: `medir-escala.sql` cuenta las
llamadas con `pg_stat_xact_user_functions` y asserta que son una por consulta, no por fila (3 en la dueña y 4 en Ana por las
policies que lo nombran). `_lead_verificar` lo calcula perezoso: calcularlo al declarar subía la papelera de 62 a 364 ms. Buscar
`#n` resuelve el número a su lead por el índice único de la copia (0,7 ms la dueña) o por `(creado_por, numero)` (2,7 ms Ana) y
entra como `id.in.(…)`: no recorre `leads`. El contador del número propio es un upsert por clave primaria, lo mismo con 20 que con
50.000 leads. El relleno de la migración (`…000900`) tarda ~13 s con 62.000 leads (apaga los triggers de `leads` en su UPDATE; sobre
una base viva grande habría que hacerlo por lotes). El sembrado de volumen corre `vacuum analyze` para que la cuenta de la
exportación use un index-only scan.

### Vehículos, orígenes, equipo y empresa

| Superficie                             | Tope                                                               | Número                                                            | Índice                                              | Presupuesto                               | A 50.000 / 10.000                                                             | Estado                                                                                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inventario, página                     | 50 por cursor                                                      | ninguno                                                           | `vehiculos_origen_listado_idx`                      | 20 ms                                     | 0,4 ms                                                                        | ok                                                                                                                                                      |
| Inventario, búsqueda / limpieza        | 50                                                                 | ninguno                                                           | `vehiculos_origen_listado_idx`                      | 100 / 150 ms                              | 9 / 19 ms                                                                     | ok                                                                                                                                                      |
| Papelera de vehículos                  | 5 lotes por cursor; de cada uno, los primeros 20 y «Mostrar los N» | `en_papelera` exacto (≤ 200)                                      | `lotes_papelera_tipo_idx`                           | 200 ms                                    | 13 ms                                                                         | **arreglado** (115 ms, todo; cierre 1: los primeros 20)                                                                                                 |
| Aviso de archivos por borrar           | cola de Storage hasta 1.000                                        | «más de 1.000»                                                    | `cola_gc_storage_edad_idx`                          | 50 ms                                     | 0,3 ms                                                                        | **arreglado** (`count(*)`)                                                                                                                              |
| Galería de fotos                       | 24 por vehículo                                                    | «N de 24»                                                         | `vehiculos_imagenes_hash_unico`                     | —                                         | —                                                                             | exento                                                                                                                                                  |
| Vínculos e interesados de un vehículo  | 50 / 100                                                           | «Mostrando los 50 vínculos / 100 interesados más recientes.»      | `vehiculos_vinculos_vehiculo_idx`                   | —                                         | —                                                                             | **arreglado** (cierre 1: lee uno de más y lo dice; también los tres bloques de «Vehículos» del lead, 100 / 100 / 50, y «Vehículo (opcional)»)           |
| Selector «agregar vehículo»            | 20                                                                 | «Mostrando los primeros 20. Escribe más para afinar la búsqueda.» | —                                                   | 300 ms                                    | 31 ms (64)                                                                    | **arreglado** (cierre 1: lee 21 y lo dice)                                                                                                              |
| Orígenes, resumen y categorías con uso | decenas de orígenes                                                | conteos del origen                                                | —                                                   | 100 / 50 ms                               | 1,8 / 0,3 ms                                                                  | exento (administración)                                                                                                                                 |
| Equipo, lista                          | el equipo                                                          | ninguno                                                           | —                                                   | —                                         | —                                                                             | exento; **cierre 1:** dibuja la miniatura de 96 px y no el avatar de 512 (una imagen de prueba con ruido: 154 KB → 1,4 KB; un degradé, 5,5 KB → 0,2 KB) |
| Baja de una persona, vista previa      | hasta 1.001                                                        | «más de 1.000»                                                    | `leads_asesores_usuario_vigente_idx`                | 100 / 300 ms                              | 12 ms; 200.000: 313 → 44–73 ms                                                | **arreglado** (cierre 1; era exacto)                                                                                                                    |
| Baja de una persona                    | lotes de 5.000                                                     | exacto (lo hecho)                                                 | `leads_asesores_usuario_vigente_idx` + `leads_pkey` | 4.000 ms la llamada, 6.000 ms una corrida | 200.000: 17,9 s (y el corte de 8 s) → 0,5 s la llamada, 1,7–4,3 s una corrida | **arreglado** (cierre 1, `medir-bajas.sql`)                                                                                                             |
| Tipos de cambio, historial             | 30                                                                 | «Mostrando los 30 cambios más recientes.»                         | FK del cambio                                       | —                                         | —                                                                             | **arreglado** (cierre 1: lee 31 y lo dice)                                                                                                              |
| Bandeja / buscador / campana           | sin consulta todavía                                               | —                                                                 | —                                                   | —                                         | —                                                                             | —                                                                                                                                                       |

### Jobs (100.000 filas por purgar)

| Job                                               | Antes                                                                                                 | Ahora                                                                                                                                                                                                                                           | Tope                                                          |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `papelera-purgar`                                 | 29 s en una corrida, sin tope                                                                         | 3 s, 50 lotes por corrida, cada hora                                                                                                                                                                                                            | 50 lotes (10.000 leads) por corrida                           |
| `limpieza-automatica`                             | 24 s (revisaba 100.800 para contarlos)                                                                | 0,6 s                                                                                                                                                                                                                                           | mueve 200 y revisa 1.000 más                                  |
| `importaciones-vinculos-purgar`                   | 0,85 s, un `DELETE`                                                                                   | 0,5 s                                                                                                                                                                                                                                           | lotes de 10.000, 10 por corrida                               |
| `apibara-consultas-purgar`                        | 0,08 s, un `DELETE`                                                                                   | 0,3 s                                                                                                                                                                                                                                           | lotes de 10.000, 10 por corrida                               |
| `storage-gc` (reclamar 100 de 100.000 en la cola) | 0,9 s la primera pasada                                                                               | 0,05 s                                                                                                                                                                                                                                          | 2.000 huérfanos encolados por pasada, 100 por ronda, 5 rondas |
| `storage-gc`, el barrido de huérfanos (cierre 1)  | cada pasada recorría el bucket entero: 208 ms con 301.000 objetos ya encolados, y crece con el bucket | un cursor por bucket (`cola_gc_barrido`): 10.000 examinados por pasada, 82–175 ms al principio o al final (150 ms a 1 s, con la máquina ocupada, la que además encola 10.000 huérfanos); una vuelta por 301.000 son 31 pasadas y encuentra todo | 10.000 objetos examinados por pasada (5 pasadas por corrida)  |

#### Los jobs en nueve corridas (cierre 4)

`importaciones-vinculos-purgar` tardó 6.365 ms una vez y 199 ms la siguiente; no se reprodujo en nueve condiciones (en ms, con la carga de la
máquina entre 1,6 y 4,2): recién cargado 223 · `CHECKPOINT` antes 322 · segunda seguida 187 y 503 · 33 checkpoints forzados encima 191 · 7
checkpoints tras la carga 615 · un autovacuum activo 233. Típicos con 100.000 filas: apibara 190–250 · vínculos 190–330 · papelera
3.900–4.300 · limpieza 410–430 · `storage-gc` reclamar 170–190, encolar 160–230. Las imágenes completas del WAL no cuestan nada medible (11 MB:
212 ms; ninguna: 241 ms) y los checkpoints encima tampoco. El único caso lento (`storage-gc` 4.254 ms contra 160, papelera 6,6 s contra 4,0)
tuvo +13,3 s de `sync` del checkpointer contra +0,3 s en las rápidas: un `fsync` lento del disco, sin poder repetirlo. `scripts/medir-listado.mjs`
imprime ahora, tras cada medición, la carga, la presión de disco y de CPU, el WAL, los checkpoints y los autovacuums de esa corrida.
Los presupuestos no cambian (10 a 30 veces lo típico).

#### Preparar y limpiar un spec (cierre 4)

170 bloques spec × proyecto en la corrida completa del cierre 3: 126,6 s de `beforeAll` y 70,6 s de `afterAll` (~1,15 s por bloque, ninguno de
más de 3,5 s). Los diez peores (beforeAll / afterAll, s): `leads-exportar` escritorio 1,1 / 2,4 · `leads-rapido-volumen` escritorio 2,4 / 0,5 ·
`leads-exportar` celular 1,1 / 1,5 · `leads-numeros-pantallas` celular 1,6 / 0,5 · `leads-portal` celular 1,3 / 0,7 · `avisos-sobre-el-pie`
celular 1,4 / 0,6 · `vehiculos-por-pagina` escritorio 1,6 / 0,3 · `leads-numeros-pantallas` escritorio 1,4 / 0,5 · `leads-portal-acceso`
celular 1,3 / 0,6 · `leads-portal` escritorio 1,2 / 0,6. Por dentro (`prepararListado` / `prepararRecorrido`): 6–7 `createUser` de ~80 ms (bcrypt,
65–73 % del `beforeAll`) y 6–7 `deleteUser` de ~55 ms (80 % del `afterAll`), en fila. Ahora: la dueña primero y las demás a la vez, y al
borrar todas menos la dueña a la vez (`afterAll` 430 → 220–240 ms, `beforeAll` 710 → 400–460 ms): ~0,45 s por bloque. **Medido en la corrida completa del cierre 4** (916 tests, 178 bloques): 79,8 s de `beforeAll` y 39,8 de `afterAll`, **119,6 s contra 197** (0,67 s por bloque contra 1,15); el total de la corrida no baja (34,2 min, como antes) porque sumó 42 tests (1.918 s de tests contra 1.834).

### Ítems por página (9g): qué lista lo admite y su máximo

La persona elige 10, 25, 50 o 100 (`listas.por_pagina`, `?por=`) y cada lista declara su **máximo**: se muestra el menor de lo
pedido y ese máximo, y el selector ofrece hasta ahí. Un máximo se gana midiendo con volumen (`pnpm db:medir:volumen` lo asserta con
el tamaño que sale del código; `e2e/listas-por-pagina-volumen.spec.ts` mide bytes, nodos y una página profunda). Una lista que no
cabe con 100 declara uno menor y el motivo queda acá. Medido con 62.000 leads y 10.000 vehículos.

| Lista                                                                                                                        | Selector | Máximo                                                                   | Por qué y lo medido                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Listado de leads                                                                                                             | sí       | **100** (`MAXIMO_DE_PAGINA_DE_LEADS`)                                    | **Cabe con 100 desde la 9h** (fue 50: a 100 el planificador dejaba `leads_listado_idx` y leía los 50.000 leads de la dueña, 518 ms). Página 1 y una profunda a 100 filas: 19 ms la dueña, 17 Ana, sin recorrer `leads`. En el navegador, con 100 (la dueña): antes 704.768 B crudos (46.497 comprimidos), 5.020 nodos en escritorio y 5.015 en el celular, con la tabla y las tarjetas las dos en el HTML y el DOM; **hoy (cierre 1, una sola vista) 465.393 B en escritorio y 427.052 en el celular (37.615 / 37.278 comprimidos), 2.594 y 2.781 nodos** (Ana: 4.777 → 2.469 / 2.656). Presupuesto 3.500 nodos y 48 KB, y `?por=100` entra a la corrida normal (`leads-escala.spec.ts`). Una página profunda no suma nodos |
| Inventario de vehículos                                                                                                      | sí       | **100** (`MAXIMO_DE_PAGINA_DE_VEHICULOS`)                                | Cabe. 0,6 ms la página 1 y la 20 por cursor (`vehiculos_origen_listado_idx`, sin descartar). Con 100 filas: antes 1.387.796 B crudos (57.196 comprimidos) y 7.894 / 7.888 nodos; **hoy (cierre 1) 919.569 B en escritorio y 740.210 en el celular (47.333 / 45.167 comprimidos), 4.916 y 3.295 nodos**. Presupuesto 6.000 nodos y 60 KB (`vehiculos-por-pagina.spec.ts` en la corrida normal). 10, 25, 50 y 100 filas: 29,8 / 32,6 / 37,3 / 47,3 KB. Una página profunda no suma nodos                                                                                                                                                                                                                                      |
| Papelera de leads y de vehículos                                                                                             | no       | 5 lotes (`LOTES_POR_PAGINA`), 20 filas de cada uno (`PRIMEROS_DEL_LOTE`) | **No entran al selector (cierre 1):** la unidad es el lote y 5 lotes de 20 ya son 100 filas, el máximo de una página; 10, 25, 50 o 100 lotes multiplicarían el DOM sin acercar lo antiguo. «Mostrar los N» trae un lote entero (≤ 200) cuando se pide                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| «Ver más» de seguimientos y recordatorios                                                                                    | no       | 20, tope 500                                                             | Otro mecanismo (se acumula dentro de una ficha o un drawer): más ítems por clic empeora el DOM sin acortar el camino a lo antiguo, que es «Ir a una fecha»                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Columna del kanban                                                                                                           | no       | 50, tope 500                                                             | Su propia unidad (`TAMANO_DE_COLUMNA`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Importaciones recientes, equipo, vista previa de la importación, oportunidades, vínculos, interesados, candidatos, etiquetas | no       | fijas                                                                    | Sin páginas con Anterior y Siguiente o con topes fijos sin parámetro: el cliente no puede pedir más                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

**En la base** cada RPC con tamaño acota con `_acotar_pagina(pedido, por_defecto, máximo)`: `lead_seguimientos` y `lead_recordatorios`
(20, hasta 50), las dos papeleras (6, hasta 51: la página más una), `embudo_tablero` (50 hasta 100 por columna y 500 hasta 1.000 de
total) y `embudo_etapa_pagina` (50, hasta 100). El listado y el inventario se leen por PostgREST: su tope es `max_rows` (1.000).
`escala.sql` llama las RPC con 100000, 51, 30, 0, -1 y nulo (120 filas): 50, 50, 30, 1, 1 y 20.

**Lo que se vio al mirar (capturas, la dueña y Ana, escritorio y celular, cada valor del selector).** _Arreglado:_ una tabla
con muchas columnas (el origen de volumen) ensanchaba toda la página en escritorio: el contenedor de la lista tenía una columna
automática que crecía hasta el ancho de la tabla; ahora es `minmax(0, 1fr)` y la tabla se recorta en su tarjeta (lo encontró
`sinScrollHorizontal` con 100 filas). _Notas:_ en el celular, con 100 tarjetas, el selector quedaba al pie de una lista de ~40.000 px
(llega «Siguiente», no el selector). **Arreglado en el cierre 1:** el selector va arriba de la lista en el celular, y se
dibuja una sola vista (el HTML crudo del inventario con 100 filas, 1,4 MB → 920 KB).

### JS en frío (con gzip, lo que el documento nombra)

| Ruta         | Antes (shell por los barriles) | Ahora                                   | Presupuesto |
| ------------ | ------------------------------ | --------------------------------------- | ----------- |
| `/leads`     | 547,5 KB                       | 543,7 KB                                | 570 KB      |
| `/perfil`    | 547,5 KB                       | 434,9 KB (sin leads en el shell: 434,8) | 460 KB      |
| `/vehiculos` | 598,7 KB                       | 504,9 KB                                | 530 KB      |

**Tras la 9i** (medido en la misma máquina): `/leads` 562,1 KB, `/perfil` 443,4 KB y `/vehiculos` 519,2 KB, sin tocar ningún presupuesto. Antes de empezar,
en `master`, ya se medían 560,6 y 515,5 en `/leads` y `/vehiculos` (lo anotado arriba había subido con el cierre 1 al 4): la 9i suma **1,5 y 3,7 KB**
(el patrón de lista compartido, el «⋯» y el menú del lead; el resumen de vehículos y el panel de edición del resumen van por `diferido()` y no entran).

### Lo que se vio al mirar (con volumen cargado; `e2e/escala-recorrido.spec.ts`, `E2E_CAPTURAS`)

Escritorio y celular, la dueña y Ana. Se leyeron las capturas, y de ahí salieron dos arreglos y cuatro notas:

- **Arreglado:** paginar el listado sin red dejaba la pantalla en blanco (el enlace caía a una navegación completa).
  Ahora no navega y dice «Sin conexión: no se puede cambiar de página…». El kanban con 500 tarjetas en una columna
  tenía 26.000 nodos en el celular (las dos distribuciones, la de escritorio y la de pestañas, estaban en el DOM);
  ya hidratado queda sólo la que se ve (7.700 nodos en el tope; 2.540 un listado de 50 filas). **Desde el cierre 1** el servidor
  ya manda una sola (las columnas o las pestañas, según el ancho de la petición): el HTML deja de traer las dos; los nodos ya
  hidratados son los mismos (15.965 en escritorio con la columna en el tope, 10.689 en el celular). El listado de 50 filas: 2.712 → 1.489.
- **Se entiende que hay más** en el listado sólo al pie: arriba no dice en qué página se está ni que sigue; Anterior y
  Siguiente están debajo de las 50 filas. Con filtros y búsqueda como camino a lo antiguo alcanza (buscar «Volumen 12345»
  llega a una fila de hace meses al instante), pero sin un «página N» queda dudoso: PLAN. **Cierre 1:** «página N» se descartó (con cursor no hay número verdadero sin
  contar las filas de antes); arriba se dice «Los más recientes» o «Creados hasta el …» con «Volver al principio».
- **El tope se dice** («Mostrando las 500 con actividad más reciente…») pero queda al pie de una columna de 500, y el camino
  a lo antiguo del kanban es la ficha de cada lead (no tiene filtros todavía): PLAN.
- **Una página de papelera con lotes de 200** son 1.000 filas de ~60 px, cada una con «Restaurar» y «Purgar»: usable pero
  larga; lo siguiente es un lote que muestra los primeros 20 y «Mostrar los 200» (PLAN).
- **Volver con «atrás»** vuelve a la página anterior del listado, no al principio (la URL lleva el cursor).
- «Mover a…» se parte en dos líneas en una columna de 288 px. Cosmético.

### El patrón de lista y el resumen de vehículos (9i)

Medido con 62.000 leads y 10.000 vehículos (`E2E_VOLUMEN=1`, escritorio). Cada fila suma su «⋯» (envoltorio, botón, icono y tres círculos: 6 nodos) y
el inventario pierde su lápiz de «Editar»; el resumen de un vehículo no se pide hasta abrirlo (el drawer entero va por `diferido()`).

| Superficie                                         | Antes (cierre 1)        | 9i                               | Presupuesto                          |
| -------------------------------------------------- | ----------------------- | -------------------------------- | ------------------------------------ |
| Listado de leads, 100 filas, la dueña («todos»)    | 2.594 nodos; 37,6 KB gz | 2.597 nodos; 39,5 KB gz (537 KB) | 3.500 nodos; 48 KB gz                |
| Listado de leads, 100 filas, Ana («propios»)       | —                       | 2.472 nodos; 37,3 KB gz          | igual                                |
| Inventario, 100 filas                              | 4.916 nodos; 47,3 KB gz | 5.020 nodos; 49,6 KB gz (927 KB) | 6.000 nodos; 60 KB gz                |
| Columna del kanban en el tope (500 tarjetas)       | 8.212 nodos             | **11.212 nodos** (3.000 del «⋯») | 9.000 → **11.800** → **10.250** (9j) |
| Resumen de vehículos: pedidos a la base al abrirlo | —                       | 1 (a lo sumo 2 con una pestaña)  | 2                                    |

**El kanban pasó su presupuesto de nodos** y se subió con la razón escrita (`docs/DECISIONES.md`, 2026-10-18): 6 nodos por tarjeta es lo que cuesta un
«⋯» con icono, y se prefirió un «⋯» igual en las cuatro superficies a un glifo de texto que dependería de la fuente. Una columna en el tope es el
peor caso (500 tarjetas); una de 50 suma 300 nodos.

### El «⋯» de 3 nodos (0b de la 9j)

El icono del «⋯» pasó de un `<svg>` con tres `<circle>` (6 nodos con el botón y su envoltorio) a un `<svg>` con un `<use>` que apunta a un símbolo montado una
vez en el layout `(app)` (`src/shared/ui/lista/simbolos-de-lista.tsx`): el botón, el `<svg>` y el `<use>` son **3 nodos**, sin envoltorio. Con `currentColor`
sigue al tema claro y oscuro, a los colores forzados y al 200 %; `e2e/mas-acciones-icono.spec.ts` compara píxeles contra el icono de referencia en los tres.

| Superficie                                      | 9i           | 9j                              | Presupuesto                             |
| ----------------------------------------------- | ------------ | ------------------------------- | --------------------------------------- |
| Listado de leads, 100 filas, la dueña («todos») | 2.597 nodos  | **2.303 nodos**; 40,6 KB gz     | 3.500 nodos; 48 KB gz                   |
| Listado de leads, 100 filas, Ana («propios»)    | 2.472 nodos  | **2.183 nodos**; 38,4 KB gz     | igual                                   |
| Inventario, 100 filas                           | 5.020 nodos  | **4.726 nodos**; 50,0 KB gz     | 6.000 nodos; 60 KB gz                   |
| Columna del kanban en el tope (500 tarjetas)    | 11.212 nodos | **9.718 nodos** (1.500 del «⋯») | 11.800 → **10.250** (lo medido más 5 %) |

El presupuesto del kanban vuelve a ser lo medido más 5 %, y la prueba exige además que el «⋯» de cada tarjeta cueste exactamente 3 nodos (500 tarjetas, 1.500).

## Cierre 5a: lo que crece con N y la importación, medido y sin arreglar (2026-10-18; la importación se arregló en el cierre 5a-fix-2, B2)

Mismo método de `db:medir:volumen` (como `authenticated`, plan genérico, mediana de 5 corridas), con `EXPLAIN (ANALYZE, BUFFERS)`, en la siembra por defecto (50.000 → **62.000 leads**)
y en `-- --leads 200000` (→ **212.000**); «50.000» y «200.000» son el parámetro de la siembra, que suma ~12.000 leads más. Sobre una base local con `shared_buffers = 128MB`: la tabla `leads`
mide 57 MB con 62.000 y 207 MB con 212.000, así que con 212.000 ya no cabe y cada pasada lee de la caché del sistema; por eso se repitió con 1 GB (columna «1 GB», cambio temporal
de la configuración local, ya revertido) para separar lo que crece con N de lo que crece por la memoria del equipo.

### A1. Búsqueda por nombre (`5a-1`): crece con N, es un defecto de escala real

La consulta es `Seq Scan on leads` con la regla de visibilidad y `ilike` como filtros: `Rows Removed by Filter` = todos los leads, para cualquier persona (el planificador la estima
en 60 filas). `ilike` no es _leakproof_: bajo RLS no se evalúa antes que la policy, así que ningún índice (trigram incluido) lo sostiene. El costo es de dos partes: recorrer la tabla (~0,17 µs
por lead, igual para todos) y evaluar `ilike` sobre lo que la persona ve (~0,7 µs por lead visible; la dueña ve el 100 %).

| Búsqueda sin resultados (ms) | 62.000 | 212.000 (128 MB) | 212.000 (1 GB) | µs por lead (62.000 → 212.000 → 1 GB) | Presupuesto |
| ---------------------------- | ------ | ---------------- | -------------- | ------------------------------------- | ----------- |
| Dueña (ve todo)              | 48,8   | **207,1**        | 190,3          | 0,79 → 0,98 → 0,90                    | 200         |
| Berta (28.000)               | 16,3   | 74,0             | 59,0           | 0,26 → 0,35 → 0,28                    | 200         |
| Ana (8.000)                  | 12,2   | 59,0             | 44,0           | 0,20 → 0,28 → 0,21                    | 200         |
| «Chica» (3 leads)            | 10,1   | 50,5             | 36,1           | 0,16 → 0,24 → 0,17                    | 200         |

«Coincide con pocos»: dueña 58,8 → **230,7** (1 GB: 214,4), el «234 ms» de la 9j. Con la caché grande el costo por lead es casi el mismo en los dos tamaños (de +4 % a +14 % entre 62.000 y 212.000): **lineal en N**;
los 128 MB le suman de 9 a 40 % (19.800 bloques leídos con 212.000 leads, 0 con 62.000). El presupuesto fijo de 200 ms (3,4 veces lo medido con 62.000) alcanza hasta ~185.000 leads en la dueña; con 212.000 ya no.
**Guarda hoy** (`medir-escala.sql`, `listado()`): `max(200, 3,2 µs × N)` ms, el mismo 200 con 62.000 y ~3 veces lo medido con 212.000 (683 ms); lo que se espera tras el arreglo está en `docs/PLAN.md` (5a-1).
**Camino medido, sin aplicar** (como `postgres`, índice creado y revertido en una transacción): `gin (nombre gin_trgm_ops)` pesa 8,8 MB con 212.000 leads y se crea en 0,9 s;
sin resultados 0,01 ms, una búsqueda selectiva (`%Volumen 4999% Gómez%`) 5,5 ms (426 buffers) y una amplia (`%Volumen 1%`) vuelve a `leads_listado_idx` en 0,2 ms. Para que sirva bajo RLS tiene que
entrar por una función `security definer` que saque los candidatos del trigram y les aplique `_lead_visible_para()`.

### A2. La persona con pocos leads (`5a-2`): crece con N, es un defecto de escala real

La página 1 de «chica» es `Index Scan using leads_listado_idx` con la visibilidad como filtro: `Rows Removed by Filter: 199.997` y `Buffers: shared hit=172.242`, para devolver 3 filas. Como la policy
decide en tiempo de ejecución si la persona ve «todos» o «propios» (`CASE alcance … WHEN 'propios' THEN uid = ANY(cartera)`), el plan genérico estima 187.195 filas que pasan y espera cortar
enseguida: una persona con **menos de una página** de resultados camina el índice entero. Sin pasar por la memoria (todo son `hit`): **0,30 µs por lead, lineal**.

| Persona / consulta (ms)               | 62.000             | 212.000            | Descarta (62.000 → 212.000)         | Presupuesto       |
| ------------------------------------- | ------------------ | ------------------ | ----------------------------------- | ----------------- |
| Chica, página 1 (×3 variantes)        | 18,5               | **62,8**           | 50.026 → **200.026**                | 30 ms; **70.000** |
| Chica, página 100 por cursor          | 15,6               | 63,5               | 37.527 → 187.524                    | 150 ms; 70.000    |
| Chica, un atributo / tipo / origen    | 16,5 a 18,7        | 55,7 a 63,0        | ~N                                  | 100 ms            |
| Control: dueña, Ana y Berta, página 1 | 13,9 / 12,3 / 11,8 | 13,8 / 12,1 / 11,9 | 24 / 1.075 / 333 → 22 / 1.043 / 337 | 30 ms; 3.000      |

Quien tiene más de una página cuesta lo mismo con cualquier N (las tres filas de control); quien tiene menos paga el tamaño de la tabla. En la 9j sólo se vio el primer descarte (200.040 contra 70.000)
porque la guarda cortaba en la primera aserción; el mismo plan falla también los 30 ms (62,8) y es la forma de «lo que no es la primera página» para cualquier persona con pocos resultados:
una etiqueta de Ana 23,9 → 91,4 ms (200.001 descartes) y un atributo sin resultados de cualquiera, 16,6–23,4 → 62,6–89,6 ms.
**Guarda hoy:** descartes ≤ 1,1 × N y página 1 ≤ `max(30, 0,48 µs × N)` ms (102 ms con 212.000). **Camino medido, sin aplicar** (como `postgres`, sin la policy): por `leads_asesores_usuario_id_idx` una persona
sin leads cuesta 0,03 ms; Ana (8.000) 7,9 ms y Berta (28.000) 5,7 ms por `leads_listado_idx` con la semiunión a `leads_asesores`, contra 20,8 ms hoy; `gin (cartera)` pesa 320 kB y se crea en 82 ms. El arreglo es
decidir el camino por el alcance antes de planear (una función que ramifica «todos»/«propios»), no un índice más.

**Los que ya están cerca de su presupuesto con 212.000 y crecen igual** (no se tocaron: pasan): etiqueta de Ana 91,4/100 ms, un atributo sin resultados de la dueña 89,6/100, un campo privado sin resultados de la dueña
5.363/6.000 ms (1.348 con 62.000; 67 µs por lead de su cartera, que es el 40 % de N), y el kanban de la dueña, «primera página de una columna» 68,9–103,7/100 ms (19,0 con 62.000; cuesta lo que tiene la persona).
Con la linealidad medida fallan entre ~215.000 y ~250.000 leads.

### B. Importar 500 filas (`5a-3`): la causa no es el tamaño de `leads` solo

El «~3 s con 62.000 leads contra ~1,1 s en la semilla» **es de `actividad`, no de `leads`**: `medir-importacion.sql` inserta 22.000 filas de `actividad` y la semilla las mide sobre `leads` casi vacía.

| Etapa (500 filas, 10 lotes de 50)                                                              | Semilla (0 leads)          | 62.000                               | 212.000            |
| ---------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------ | ------------------ |
| Leer el CSV (`papaparse`, 15 KB)                                                               |                            | 0,4 ms                               |                    |
| Validar y preparar las 500 filas (`prepararFilas`, Node)                                       |                            | 19,4 ms                              |                    |
| Partir en lotes                                                                                |                            | 0,3 ms                               |                    |
| 10 lotes de `leads_importar_lote` en SQL (una transacción por lote), `actividad` con 313 filas | 1.039 ms (92–123 por lote) | 958 ms (94–114)                      | 1.098 ms (107–123) |
| Los 10 lotes por PostgREST, con el ingreso de la dueña                                         |                            | 1.167 ms (112–131)                   |                    |
| Lo mismo, con `actividad` en 25.309 filas                                                      |                            | **3.037 ms** (296–312 por lote)      |                    |
| Lo mismo, con `actividad` en 126.307 filas                                                     |                            | **10.467 ms** (1.040–1.055 por lote) |                    |

Con `actividad` chica el costo es **plano en N** (~2 ms por fila: `_lead_crear` 0,27 ms propios, `_leads_cartera_recalcular` 0,28, `mis_permisos` 0,2–0,29, `_lead_atributos_publicos` 0,11, `registrar_actividad` 0,09, los triggers de
`leads` de 50 altas directas suman 52–57 ms, igual con 62.000 y con 212.000: `trg_lead_crear_dueno` 24–27, `validar_atributos` 7, `numeros_proyectar` 3–6, `derivados` 2,9, `auditar` 3,3, `numero_propio` 2,8). Lo que crece es una
consulta de `_lead_crear`, «¿este intento ya entró por una adopción?»:
`select l.id from actividad a join leads l on l.id::text = a.registro_id where a.accion = 'lead.adoptado_del_limbo' and a.actor_id = … and a.detalle ->> 'intento' = p_id::text order by a.id desc limit 1`.
Con `leads` grande el planificador la resuelve con `Index Scan Backward using actividad_pkey` y esos tres filtros (`Rows Removed by Filter: 23.313`, 2.055 buffers) en vez de `actividad_intento_adopcion_idx`: **3,4 ms por fila con 23.000
filas de `actividad` y 18,3 ms con 123.000 (0,15 µs por fila de `actividad`)**, igual en plan personalizado, genérico y automático. Con `leads` casi vacía usa el índice parcial (0,05 ms, igual con 22.000 o con 122.000 filas).
Un lote de 50 llega al corte de 8 s de `authenticated` con ~960.000 filas de `actividad`, que una empresa que usa la app junta rápido (cada alta, cada acción registra una).
**Por qué no se vio:** el terreno de `medir-importacion.sql` es la semilla (`db:medir`, sin volumen), cuyo presupuesto «tal como queda tras el reset» es 8 s las 500 filas (con la causa puesta, 62.000 leads: 3,0 s pasa) y no corre en `db:medir:volumen`.
**Camino sin aplicar:** la consulta sólo importa cuando el alta trae `adoptar` (el intento de una adopción reenviada): saltarla si no lo trae, o resolverla desde el índice parcial (`materialized` o `registro_id::uuid`), y llevar la medición a `db:medir:volumen` con presupuesto
de ~2 s las 500 filas; lo que se espera después del arreglo está en `docs/PLAN.md` (5a-3).
`supabase/tests/medir-importacion-etapas.sql` (no cableado) repite estas cifras: una transacción por lote, el tiempo de cada lote, el tiempo propio por función y los triggers de 50 altas.

### B2. El arreglo (cierre 5a-fix-2, 2026-10-18): la consulta sólo corre con `adoptar`

`_lead_crear` busca «¿este intento ya entró por una adopción?» únicamente si el alta trae `adoptar`, y la importación lo rechaza (migración `…20261019003100`; `docs/DECISIONES.md`, «Cierre 5a-fix-2»). Medido con `supabase/tests/medir-importacion-volumen.sql`
(`db:medir:volumen`: una transacción por lote, `authenticated`, la dueña de la siembra, `actividad` rellena con una adopción del limbo de cada cuatro filas, 500 filas en lotes de 50):

| 500 filas, con 62.000 leads                          | Antes (dos corridas)                  | Después (tres corridas + la de `db:medir:volumen`) |
| ---------------------------------------------------- | ------------------------------------- | -------------------------------------------------- |
| `actividad` ≈ 23.000                                 | 3.501 y 4.297 ms (lote 365–659)       | 1.002 a 1.135 ms (lote 114–125)                    |
| `actividad` ≈ 124.000                                | 12.229 y 13.144 ms (lote 1.231–1.352) | 987 a 1.178 ms (lote 101–140)                      |
| Tiempo por fila, mediana de lotes (124.000 / 23.000) | 3,31 y 3,51 veces                     | 0,88 a 1,10 veces (assert: 0,8 a 1,2)              |
| Con 212.000 leads                                    |                                       | 1.119 ms y 1.086 ms; 1,0 veces                     |

La primera versión de la medición (relleno sin adopciones: el índice parcial queda vacío y el planificador elige otro camino) salió «verde» con el código viejo; el relleno de una adopción de cada cuatro es lo que la hace roja. Cuesta ~2 ms por fila (el costo plano de B) y ya no crece con `actividad`.

**El plan de la consulta, antes** (62.000 leads, `actividad` 27.313 filas, 10 % de adopciones de la dueña, `EXPLAIN (ANALYZE, BUFFERS)`): `Limit → Nested Loop → Index Scan Backward using actividad_pkey` con `Filter` de los tres predicados,
`Rows Removed by Filter: 27.313`, `Buffers: shared hit=5.360`, **11,6 ms** por llamada, una vez por fila importada. **Después:** la importación no la ejecuta (0 ms con cualquier `actividad`); sólo la ejecuta una adopción.

**La forma depende de las estadísticas de `leads` y de `actividad`, no sólo de su tamaño** (consulta aislada, plan personalizado y genérico, ms de ejecución; «A» = la forma actual, «B» = con `with … as materialized` y `registro_id::uuid`):

| Relleno de `actividad` (actor: la dueña)  | `leads` ≈ 0                                          | `leads` 62.000 (A / B)                                           | `leads` 212.000 (A / B)                                          |
| ----------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| 0 % de adopciones, 23.000 y 123.000 filas | índice parcial, 0,02–0,08                            | índice parcial, 0,03 / 0,02–0,03                                 | **`actividad_pkey`: 3,2 y 18,5** / índice parcial                |
| 10 %, 23.000                              | índice parcial (bitmap), 0,03                        | **`actividad_pkey`: 14,9–18,6** / índice parcial                 | **`actividad_pkey`: 13,4–14,8** / índice parcial                 |
| 10 %, 123.000                             | índice parcial (bitmap), 0,03                        | **`actividad_pkey`: 22,7–31,2** / índice parcial (bitmap)        | **`actividad_pkey`: 20,4–27,2** / índice parcial                 |
| 25 %, 23.000                              | índice parcial (bitmap), 0,03                        | **`actividad_pkey`: 16,2–17,5** / índice parcial (bitmap)        | **`actividad_pkey`: 14,4–15,7** / índice parcial                 |
| 25 %, 123.000                             | índice parcial (bitmap), 0,03                        | **`actividad_pkey`: 31,5–55,6** / **`actividad_pkey`: 28,9–316** | **`actividad_pkey`: 23,5–41,2** / **`actividad_pkey`: 31,2–101** |
| 10 % de otros actores (123.000)           | índice parcial / `actividad_actor_accion_idx`: 0,4–8 | índice parcial, 0,03                                             | `actividad_actor_accion_idx`: 0,5–30 / ídem 0,5–12               |

Con la base vacía de leads la forma actual usa el índice parcial siempre (por eso `medir-importacion.sql` sobre la semilla no ve nada); con 62.000 leads la usa sólo si el relleno no tiene adopciones o no son de un mismo actor; con 212.000 recorre `actividad_pkey` en todos los casos.
La forma B arregla casi todo con 62.000 pero **no con 25 % de adopciones y 123.000 filas** (`actividad_pkey`, hasta 316 ms), ni con 212.000 en ese caso (101 ms): no es una respuesta. **Lo que queda:** la consulta de la rama de adopción (una por adopción, a ritmo humano; `actividad` se purga a los 14 días) cuesta 14–56 ms con 23.000–123.000 filas y adopciones presentes: es el costo conocido, no se mide en el presupuesto.

### C. La suite completa con los dos proyectos (`5a-4`): medición, no Nivel 3

Una corrida (`playwright test` con `E2E_COMPLETO=1`, `--reporter=list,json,…/reporter-de-fallos.ts`, después de `db:reset`, `db:carreras` y el build, con las funciones edge servidas), sobre el código del cierre 5a (sin cambios de producto):
**1.038 resultados: 1.009 pasan, 29 saltos por diseño, 0 fallos, 0 intermitencias, 39,1 min** (2.344 s) de Playwright. No cuenta como Nivel 3 (`e2e completo: no (cierre 5a)` en `docs/BITACORA.md`).

| Parte                                                                                                                 | Tiempo                                                                                          | Del total (~39,9 min) |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------- |
| Preparación fuera de Playwright: `db:reset` 29,5 s + `db:carreras` 9,5 s + `next build` 6,3 s (con `.next-e2e` tibia) | **45 s**                                                                                        | 1,9 %                 |
| Arranque del servidor y `globalSetup` (el primer test empieza a los 2 s)                                              | 2 s                                                                                             | 0,1 %                 |
| Funciones edge: el `OPTIONS` de la guardia, ya servidas (`storage-gc`, `apibara`, `avatares-miniaturas`)              | 21–33 ms cada uno (en frío no se midió: ya estaban arriba)                                      | ~0                    |
| Proyecto **escritorio**: 519 pruebas (506 pasan, 13 saltos)                                                           | **19,7 min** (1.181 s; 1.108 s dentro de las pruebas y 73 s en `beforeAll`/`afterAll` y huecos) | 49,4 %                |
| Proyecto **celular**: 519 pruebas (503 pasan, 16 saltos)                                                              | **19,3 min** (1.161 s; 1.086 s y 75 s)                                                          | 48,5 %                |

El ~40 min es 98 % Playwright y se reparte por igual entre los dos proyectos: el celular repite el 49 % del tiempo. No hay una prueba que domine: la más lenta dura 11 s y la media es 2,1 s; el archivo más lento, 36 s de 1.181.

**Los 10 specs más lentos por proyecto** (reloj de pared del archivo hasta el siguiente, hooks incluidos; s):

| #   | Escritorio                       |      | Celular                         |      |
| --- | -------------------------------- | ---- | ------------------------------- | ---- |
| 1   | `listas-por-pagina` (13 pruebas) | 36,2 | `listas-por-pagina`             | 34,3 |
| 2   | `leads-exportar` (9)             | 28,7 | `origenes` (8)                  | 28,0 |
| 3   | `leads-alta-casos` (9)           | 27,5 | `leads-exportar`                | 27,3 |
| 4   | `leads-menu-orden` (6)           | 27,1 | `leads-menu-orden`              | 26,7 |
| 5   | `leads-rapido-volumen` (4)       | 26,7 | `leads-alta-casos`              | 25,3 |
| 6   | `origenes`                       | 25,3 | `paneles-salida-con-aviso` (12) | 23,2 |
| 7   | `vehiculos-papelera` (8)         | 23,5 | `vehiculos-papelera`            | 23,2 |
| 8   | `paneles-salida-con-aviso` (12)  | 22,1 | `vehiculos-fotos` (8)           | 21,8 |
| 9   | `leads-vehiculos` (7)            | 22,1 | `leads-vehiculos`               | 21,6 |
| 10  | `vehiculos-fotos`                | 20,9 | `leads-recorrido-modales` (6)   | 21,0 |

**Cuántos specs no necesitan el celular.** Criterio escrito: _no necesita_ si no afirma nada que dependa del ancho, el tacto o el texto al 200 % (permisos, conflictos, URL, teclado, datos, formularios); _duda_ si mezcla (un caso de hoja de filtros, una captura); _necesita_ si trata de la disposición (tarjetas contra tabla, 200 %, barras, «⋯» por vista). Sobre los 101 specs que corren en celular (juicio por los títulos de las 506 pruebas, no una medida):

| Clase                  | Specs  | Pruebas | Reloj en celular                 |
| ---------------------- | ------ | ------- | -------------------------------- |
| No necesita el celular | **65** | 342     | **12,9 min** (67 % del proyecto) |
| Duda                   | 19     | 106     | 4,2 min                          |
| Necesita el celular    | 17     | 71      | 2,2 min                          |

Estricto: sólo **6 pruebas** no usan `page` (`leads-marcas-acceso` 2, `leads-numeros-recorrido` 1, `vehiculos-apibara-funcion` 3): ~12 s de celular, el 0,9 % (el mismo número de la medición del 2026-10-18). Apagar el celular de los 65 ahorraría ~13 min de 40, a cambio de dejar de ver esos flujos en el ancho del teléfono; no se aplica.

**Specs o pruebas que podrían bajar** (no se movió ninguna; «libera» es el tiempo de esa prueba en los dos proyectos; los archivos de Vitest y de `supabase/tests` nombrados existen, pero que cubran exactamente el caso se comprueba al moverlo, no se verificó aquí):

| Prueba                                                                                                                                                                                           | A                                                                    | Razón (lo que ya cubre)                                                                                                      | Libera |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------ |
| `leads-importar` › archivo que no es CSV de texto, › archivo de ejemplo, › filas buenas y malas (la parte que explica); `leads-recorrido-csv` › 501 filas                                        | Vitest                                                               | `leer.test.ts`, `plantilla.test.ts`, `filas.test.ts` ya prueban la regla; queda una prueba e2e de la entrada real            | 7,5 s  |
| `leads-exportar` › celda con fórmula                                                                                                                                                             | Vitest                                                               | `escribir.test.ts` y `exportacion.test.ts`                                                                                   | 6,3 s  |
| `leads-exportar` › sin el permiso (403), › «todos» sin el permiso, › origen ajeno o GET, › límite por hora                                                                                       | Vitest (route handler) y `db:probar` (`leads_exportacion_registrar`) | es un pedido sin pantalla; la RPC y su límite no necesitan navegador                                                         | 11,3 s |
| `leads-exportar` › más de 5.000 leads (11 s en escritorio)                                                                                                                                       | `db:probar`                                                          | la prueba más lenta de la suite; siembra 5.001 y mira un número                                                              | 17,5 s |
| `leads-listado` › la búsqueda trata %, _, comas y comillas como texto; `leads-listado-filtros` › paginación (cursor repetido, vacío, ilegible)                                                   | Vitest                                                               | `listado.test.ts` / `filtros.test.ts` y el cursor son entidades puras                                                        | 16 s   |
| `leads-seguimientos-acceso` › pegar contenido, › la lista blanca de enlaces                                                                                                                      | Vitest                                                               | `documento-limpio.test.ts` ya es la regla; la RPC la cubre `db:probar`                                                       | 8 s    |
| `configuracion-leads-origenes-casos` y `-tipos-casos` › «la asesora no entra… ni puede llamar la RPC», › «el tope de 100… la base no deja pasar», › «apagar el último activo»                    | `db:probar` / `db:carreras`                                          | la RPC y el candado ya están en `matriz-leads.sql`, `humo.sql` y `scripts/carreras/tipos.mjs`; la pantalla se prueba una vez | 11,9 s |
| `leads-marcas-acceso` (3 pruebas, 2 sin `page`)                                                                                                                                                  | `db:probar`                                                          | acceso a RPC y a tablas de otra persona: matrices                                                                            | 17,1 s |
| `leads-numeros-recorrido` › E (por la API) y B (Ana sin el permiso)                                                                                                                              | `db:probar`                                                          | `numero-global.sql` ya prueba privilegios, sondas y oráculo                                                                  | 5,5 s  |
| `leads-importar-deshacer` › fuera de plazo; `leads-papelera` › restaurar con el teléfono tomado; `leads-portal` › bloqueado tras cinco fallos; `vehiculos-limpieza` › el job manda a la papelera | `db:probar` / `medir-jobs`                                           | reglas de la base con la interfaz de remate                                                                                  | 10,6 s |
| `vehiculos-apibara-funcion` (3, sin `page`)                                                                                                                                                      | un proyecto sin navegador, una vez                                   | prueba la función edge con `fetch`; corre dos veces                                                                          | 1,1 s  |
| `capturas-quietas` (3)                                                                                                                                                                           | queda, sólo en escritorio                                            | prueba el ayudante de capturas, no el producto; no depende del ancho                                                         | 3,6 s  |

Todo junto libera **~116 s de 2.344 (5 %)** más sus `beforeAll`/`afterAll`: bajar de nivel no cambia el orden de magnitud; la palanca grande es el celular de los 65 specs que no lo necesitan (~13 min), que es una decisión de cobertura, no de higiene.
