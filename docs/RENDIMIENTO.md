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

| Superficie                                                             | Tope                                                                                                                                                                               | Número                                               | Índice                                                                                                                  | Presupuesto                                       | A 50.000                                                                                                                                                                                                                                                                                                                  | Estado                                                                                                                                                                                              |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Listado, página                                                        | 100 filas por cursor (`MAXIMO_DE_PAGINA_DE_LEADS`)                                                                                                                                 | ninguno (Anterior / Siguiente)                       | `leads_listado_idx`                                                                                                     | 30 ms                                             | a 50: 10 (11) → 10,5 (10); a 100: 518 (92) → 19 (17)                                                                                                                                                                                                                                                                      | **arreglado** (9h: la policy estimable)                                                                                                                                                             |
| Listado, página profunda                                               | 100 filas                                                                                                                                                                          | ninguno                                              | `leads_listado_idx` (condición de índice sobre `creado_en`)                                                             | 150 ms                                            | 370 (38) → 11 (10); a 100, 19 (17)                                                                                                                                                                                                                                                                                        | **arreglado** (9h; era límite: la policy llamaba dos funciones por fila)                                                                                                                            |
| Listado «míos», página 1 (lo que ve cada quien por defecto)            | 100                                                                                                                                                                                | ninguno                                              | `leads_listado_idx`                                                                                                     | 30 ms                                             | 870 (70) → 10 (10); a 100, 17 (17)                                                                                                                                                                                                                                                                                        | **arreglado** (9h; no estaba en el inventario)                                                                                                                                                      |
| Listado, un campo privado sin resultados                               | 100                                                                                                                                                                                | ninguno                                              | `leads_candidatos()` con `privados` (cartera de quien filtra); ≈ 0,38 µs por lead con un valor raro                     | 100 ms los dos pasos y 40.000 buffers             | 62.000: 15,3 ms · 212.000: 37,9 ms (la dueña)                                                                                                                                                                                                                                                                             | **arreglado** (4.03, 5a-10: 5.320 → 37,9 ms con 212.000); límite: su texto y su rango, los ocultos y la exportación (5a-34)                                                                         |
| Listado, filtro por un atributo                                        | 100                                                                                                                                                                                | ninguno                                              | `leads_listado_idx`; un campo público por `atributos_publicos`                                                          | 100 ms                                            | 43 (40) → 11 (11)                                                                                                                                                                                                                                                                                                         | **arreglado** (9e: 3.761 → 43; 9h: la copia de lo público)                                                                                                                                          |
| Listado, filtro sin resultados / búsqueda                              | 100                                                                                                                                                                                | ninguno                                              | recorre la cartera visible, ~0,4 µs por lead                                                                            | 100 / 200 ms                                      | 4.365 / 404 (202 / 32) → 21 / 51 (16 / 16)                                                                                                                                                                                                                                                                                | **arreglado** (9h) · con 212.000 la búsqueda crecía con N (207–231 ms, cierre 5a): **arreglado** en 5a-fix-1b por candidatos, ≤ 44,6 ms (los dos pasos); los términos sin tramo de 3 letras, `5a-8` |
| Listado, favoritos / tachados / etiqueta                               | 100                                                                                                                                                                                | ninguno                                              | unión por clave primaria con las marcas de quien mira                                                                   | 100 ms cada uno                                   | 99 / 104 / 717 (15 / 15 / 40) → 11 / 12 / 42 (9 / 10 / 24)                                                                                                                                                                                                                                                                | **arreglado** (9h)                                                                                                                                                                                  |
| Aviso de tachados ocultos                                              | 50                                                                                                                                                                                 | «más de 50» (`contarLeadsHasta`)                     | `leads_tachados_pkey` (unión)                                                                                           | 100 ms                                            | 10 (3) → 2 (0,5); con un atributo 70 (10) → 2 (0,5)                                                                                                                                                                                                                                                                       | **arreglado**                                                                                                                                                                                       |
| Drawer rápido, seguimientos y recordatorios                            | 20 por «Ver más», 500                                                                                                                                                              | ninguno                                              | ver «Seguimientos de un lead»                                                                                           | ver arriba                                        | ver arriba                                                                                                                                                                                                                                                                                                                | ok                                                                                                                                                                                                  |
| Ficha                                                                  | un lead                                                                                                                                                                            | «más de 100 vehículos»                               | `vehiculos_lead_idx`                                                                                                    | 80 ms                                             | 2 ms (5)                                                                                                                                                                                                                                                                                                                  | **arreglado** (`count(*)`)                                                                                                                                                                          |
| Ficha, oportunidades                                                   | 100 + `hay_mas`                                                                                                                                                                    | ninguno                                              | `oportunidades_lead_id_idx`                                                                                             | 150 ms                                            | 18 ms (8)                                                                                                                                                                                                                                                                                                                 | **arreglado** (sin tope)                                                                                                                                                                            |
| Kanban, tablero                                                        | 6 columnas × 50                                                                                                                                                                    | «500+» por columna                                   | `oportunidades_lead_id_idx` bajo la política                                                                            | 800 ms                                            | 216 ms                                                                                                                                                                                                                                                                                                                    | **arreglado** (total exacto); **límite**: cuesta lo que tiene la persona (~2 µs por oportunidad)                                                                                                    |
| Kanban, «Ver más»                                                      | 500 por columna, con aviso                                                                                                                                                         | «Ver más (N)» o «Ver más»                            | ídem                                                                                                                    | 500 ms                                            | 101 ms                                                                                                                                                                                                                                                                                                                    | **arreglado** (sin tope; `p_antes_en is null or`)                                                                                                                                                   |
| Kanban, buscar (cierre 1)                                              | 500 por columna, con aviso                                                                                                                                                         | «500+» o lo que coincide                             | `oportunidades_tablero_idx` y filtra: sin resultados recorre la columna de la persona                                   | 700 ms (tablero), 200 ms («Ver más»)              | 8.000 en una etapa: sin resultados 175 ms, con resultados 162, «Ver más» 49 (el tablero sin buscar, 147)                                                                                                                                                                                                                  | **arreglado**: el camino a lo antiguo de una columna (era «la ficha de cada lead»)                                                                                                                  |
| Papelera de leads                                                      | 5 lotes por cursor; de cada uno, los primeros 20 (`PRIMEROS_DEL_LOTE`) y «Mostrar los N»                                                                                           | `en_papelera` exacto (≤ 200)                         | `lotes_papelera_tipo_idx`                                                                                               | 400 ms                                            | 85 → 13 ms (0,3 Ana); 5 lotes de 200: 8.212 → 1.017 nodos                                                                                                                                                                                                                                                                 | **arreglado** (9e: 597 ms, todos los lotes; cierre 1: 1.000 filas → 100)                                                                                                                            |
| Quién lo tiene (cartera)                                               | personas de una cartera                                                                                                                                                            | ninguno                                              | `leads_asesores`                                                                                                        | 50 ms                                             | 0,3 ms                                                                                                                                                                                                                                                                                                                    | exento                                                                                                                                                                                              |
| Candidatos de cartera                                                  | 500 (`limit 500`)                                                                                                                                                                  | ninguno                                              | —                                                                                                                       | 50 ms                                             | 0,6 ms                                                                                                                                                                                                                                                                                                                    | ok                                                                                                                                                                                                  |
| Etiquetas, selector y «Gestionar»                                      | 50 por persona                                                                                                                                                                     | «En N leads» hasta 1.001                             | `leads_etiquetas_etiqueta_id_idx`                                                                                       | 300 ms                                            | 51 ms                                                                                                                                                                                                                                                                                                                     | **arreglado** (`count(*)` por etiqueta)                                                                                                                                                             |
| Importar, «Tus importaciones recientes»                                | 20 de las últimas 24 h                                                                                                                                                             | `intactos` ≤ 500                                     | `importaciones_leads` (PK)                                                                                              | 300 ms                                            | 45 ms                                                                                                                                                                                                                                                                                                                     | exento                                                                                                                                                                                              |
| Importar, vista previa                                                 | 500 filas del archivo, 50 por página                                                                                                                                               | «N filas» del archivo                                | —                                                                                                                       | —                                                 | —                                                                                                                                                                                                                                                                                                                         | ok                                                                                                                                                                                                  |
| Importar, lotes                                                        | 50 filas por lote, 500 por archivo (`FILAS_POR_LOTE`, con su guarda)                                                                                                               | —                                                    | —                                                                                                                       | `medir-importacion.sql`                           | 500 filas: ~1,1–1,4 s en la semilla, ~3 s con 62.000 leads y 22.000 filas de `actividad` (con `actividad` chica, ~1,0–1,1 s con 0, 62.000 y 212.000: crece con `actividad`, `5a-3`); un lote de 100 no mejora más de 13 % y duplica el lote más lento. **Una base recién creada, sin estadísticas: ~20 s la primera vez** | **arreglado** (cierre 4: `seed.sql` analiza; la medición tiene su presupuesto «tal como queda tras el reset»)                                                                                       |
| Exportar                                                               | lotes de 500, hasta 5.000, 5 por hora                                                                                                                                              | hasta 5.001 ids (de a 1.000); «Descargamos N» exacto | `leads_listado_idx`                                                                                                     | 100 ms (5.001 ids)                                | 210 (51) → 5 (16)                                                                                                                                                                                                                                                                                                         | **arreglado**                                                                                                                                                                                       |
| Alta, selectores (se leen al abrir el drawer, desde el navegador)      | los tres catálogos activos, cada uno con `limit` de su tope (100, 100 y 100: `_origenes_lead_tope()`, `_tipos_lead_tope()`, `_tipos_seguimiento_tope()`) y `topes` en la respuesta | —                                                    | —                                                                                                                       | —                                                 | 2 pedidos al abrir (`lead_alta_contexto`, `leads_campos`): 1,7 + 2,5 KB con la semilla y **30,5 + 2,5 KB con 100 + 100 + 100**, sin comprimir (sin `clave` ni `icono`; sin recortar serían ≈ 47 KB); `lead_alta_contexto` **1,1 ms con 62.000 y con 212.000 leads**                                                       | `e2e/leads-alta-contexto.spec.ts` (< 40 KB); `medir-escala.sql` asserta el plan; el documento de ninguna pantalla los lleva                                                                         |
| Listado, filtro por un origen del lead                                 | 100                                                                                                                                                                                | ninguno                                              | `leads_listado_idx` (un origen sin leads, `leads_origen_lead_id_idx`)                                                   | 100 ms                                            | 100 (20,5) → 10 (10); dos orígenes 198 (27) → 11 (10); sin leads 0,1                                                                                                                                                                                                                                                      | **arreglado** (9h; era límite)                                                                                                                                                                      |
| Listado, buscar `#n`                                                   | hasta 100 leads (uno por creador y el global: 7 en el volumen)                                                                                                                     | ninguno                                              | `leads_numeros_globales_numero_key` y, por cada persona, `leads_numeros_propios_creador_idx` (`leads_ids_del_numero()`) | 5 ms (con la página, 20)                          | 2,3–2,6 ms la dueña, 1,3–1,6 Ana; con la página 2,3–3,0                                                                                                                                                                                                                                                                   | ok                                                                                                                                                                                                  |
| Alta de un lead (el número propio)                                     | uno                                                                                                                                                                                | —                                                    | `leads_contadores` (PK, un upsert)                                                                                      | 80 ms                                             | 2,0 ms (1,8); el upsert 0,0 ms                                                                                                                                                                                                                                                                                            | ok                                                                                                                                                                                                  |
| Orígenes del lead, pantalla de configuración                           | 100 (se dice al llegar)                                                                                                                                                            | «N de 100»                                           | `leads_origen_lead_id_idx` (un `exists` por rango por fila)                                                             | 100 ms                                            | 0,03 ms la lista; antes 5 ms                                                                                                                                                                                                                                                                                              | **arreglado** (era Seq Scan sobre `leads`, ver abajo)                                                                                                                                               |
| Eliminar un origen del lead                                            | uno                                                                                                                                                                                | —                                                    | `leads_origen_lead_id_idx` (el mismo `exists`)                                                                          | 5 ms                                              | 0,03 ms; antes 5 ms                                                                                                                                                                                                                                                                                                       | **arreglado**                                                                                                                                                                                       |
| Listado, filtro por un tipo de lead                                    | 100                                                                                                                                                                                | ninguno                                              | `leads_listado_idx` (uno raro y uno sin leads, `leads_tipo_lead_id_idx`)                                                | 100 ms                                            | 20–27 ms con 50.000 y con 212.000; sin leads 0,2                                                                                                                                                                                                                                                                          |
| Tipos de lead, pantalla de configuración                               | 100 (la base lo dice)                                                                                                                                                              | «N de 100»                                           | `leads_tipo_lead_id_idx` (un `exists` por rango por fila)                                                               | 100 ms                                            | 0,4 ms con 212.000                                                                                                                                                                                                                                                                                                        |
| Eliminar un tipo de lead                                               | uno                                                                                                                                                                                | —                                                    | `leads_tipo_lead_id_idx` (el mismo `exists`)                                                                            | 5 ms                                              | 0,0 ms                                                                                                                                                                                                                                                                                                                    |
| Tipos de seguimiento, pantalla de configuración                        | 100 (la base lo dice)                                                                                                                                                              | «N de 100»                                           | `seguimientos_tipo_idx` (la sonda `con_seguimientos`: un `exists` por rango por fila)                                   | 100 ms                                            | `tipos_seguimiento_con_uso()` 1,0 ms con 62.000 y con 212.000 leads (el volumen de seguimientos de `db:sembrar-volumen`); la sonda 0,1 ms                                                                                                                                                                                 | `medir-escala.sql` con los 100 tipos sembrados                                                                                                                                                      |
| Eliminar un tipo de seguimiento                                        | uno                                                                                                                                                                                | —                                                    | `seguimientos_tipo_idx` (el mismo `exists`)                                                                             | 5 ms                                              | 0,1 ms                                                                                                                                                                                                                                                                                                                    | —                                                                                                                                                                                                   |
| Iconos del catálogo (origen, tipo de lead, tipo de seguimiento)        | 24 claves, cerradas                                                                                                                                                                | —                                                    | —                                                                                                                       | 3.500 nodos y 48.000 B gz el listado de 100 filas | Listado de 100 filas: **3.037 nodos en escritorio y 3.124 en celular** (dueña), **41.620 B** comprimidos; con el SVG en línea el celular llegó a 3.515 (por eso el símbolo `<use>`); el catálogo no entra al documento de `/perfil` (80.751 B con la semilla y con 100 + 100 + 100)                                       | `e2e/listas-por-pagina-volumen.spec.ts`, `e2e/presupuesto-js.spec.ts` y la guarda de que el shell y el alta no lo importan                                                                          |
| Catálogos del listado, la ficha y la exportación (`leads_catalogos()`) | orígenes y tipos                                                                                                                                                                   | —                                                    | —                                                                                                                       | 30 ms                                             | 0,1 ms                                                                                                                                                                                                                                                                                                                    |

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

**Buscar un número (5a-14, `…20261019003700`).** `#n` ya no resuelve un solo número: con `leads.numero_global.ver` el global y el propio de cada creador, sin él el propio de quien busca, en **una** llamada, `leads_ids_del_numero(p_numero, p_todos)` (invocador: la policy de las copias es la regla). Sin índice, trigger ni columna nuevos: el costo de escribir no cambia. El global entra por `leads_numeros_globales_numero_key` y, por cada persona de `perfiles` (el equipo: seis en el volumen), una bajada de `leads_numeros_propios_creador_idx (creado_por, numero)`; Postgres 17 no hace _skip scan_, así que `numero = n` solo no la usaría. **Con 62.000 y con 212.000 leads, la mediana de cinco corridas con `db:medir:volumen`:** resolución de la dueña 2,3 y 2,6 ms, de Ana 1,3 y 1,6; resolución con la página (`leads_vista` o la cartera por `id = any(…)`) la dueña «todos» 2,7 y 2,9, «míos» 2,7 y 3,0, Ana 2,3 y 2,6; el plan de los propios de cada creador 0,9 y 1,0 ms, el del global 0,7 y 0,8, el del propio de Ana 0,7 (la máquina con carga de 3 a 7: Steam y el navegador abiertos). **Alternativa medida y descartada:** un índice sólo por `numero` (resolvía en 0,7 ms, 1,7 menos) suma una entrada de btree a cada alta, fila importada y renumeración de la importación y un `create index` que bloquea las altas. **Asserts** (`medir-escala.sql`): resolución ≤ 5 ms y con la página ≤ 20 ms, sin `Seq Scan` de las copias ni de `leads`, y la dueña encuentra 6 o 7 leads con el propio de Ana (uno por creador y, si es otro lead, el global) y Ana sólo el suyo, también pidiendo `todos`. **Límite:** como mucho 100 ids (un equipo de más de 99 personas con el mismo propio; la URL del listado lleva los ids); un equipo de miles de personas pediría otra forma (un índice por `numero`).

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

| Superficie                             | Tope                                                               | Número                                                            | Índice                                              | Presupuesto                               | A 50.000 / 10.000                                                                                                       | Estado                                                                                                                                                                                                                                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inventario, página                     | 50 por cursor                                                      | ninguno                                                           | `vehiculos_origen_listado_idx`                      | 20 ms                                     | 0,4 ms                                                                                                                  | ok                                                                                                                                                                                                                                                                                                             |
| Inventario, búsqueda / limpieza        | 50                                                                 | ninguno                                                           | `vehiculos_origen_listado_idx`                      | 100 / 150 ms                              | 9 / 19 ms                                                                                                               | ok                                                                                                                                                                                                                                                                                                             |
| Papelera de vehículos                  | 5 lotes por cursor; de cada uno, los primeros 20 y «Mostrar los N» | `en_papelera` exacto (≤ 200)                                      | `lotes_papelera_tipo_idx`                           | 200 ms                                    | 13 ms                                                                                                                   | **arreglado** (115 ms, todo; cierre 1: los primeros 20)                                                                                                                                                                                                                                                        |
| Aviso de archivos por borrar           | cola de Storage hasta 1.000                                        | «más de 1.000»                                                    | `cola_gc_storage_edad_idx`                          | 50 ms                                     | 0,3 ms                                                                                                                  | **arreglado** (`count(*)`)                                                                                                                                                                                                                                                                                     |
| Galería de fotos                       | 24 por vehículo                                                    | «N de 24»                                                         | `vehiculos_imagenes_hash_unico`                     | —                                         | —                                                                                                                       | exento                                                                                                                                                                                                                                                                                                         |
| Vínculos e interesados de un vehículo  | 50 / 100                                                           | «Mostrando los 50 vínculos / 100 interesados más recientes.»      | `vehiculos_vinculos_vehiculo_idx`                   | —                                         | —                                                                                                                       | **arreglado** (cierre 1: lee uno de más y lo dice; también los tres bloques de «Vehículos» del lead, 100 / 100 / 50, y «Vehículo (opcional)»)                                                                                                                                                                  |
| Selector «agregar vehículo»            | 20                                                                 | «Mostrando los primeros 20. Escribe más para afinar la búsqueda.» | —                                                   | 300 ms                                    | 31 ms (64)                                                                                                              | **arreglado** (cierre 1: lee 21 y lo dice)                                                                                                                                                                                                                                                                     |
| Orígenes, resumen y categorías con uso | decenas de orígenes                                                | conteos del origen                                                | —                                                   | 100 / 50 ms                               | 1,8 / 0,3 ms                                                                                                            | exento (administración)                                                                                                                                                                                                                                                                                        |
| Equipo, lista                          | 100 por nombre (`TOPE_DEL_EQUIPO`; la RPC lee 101)                 | ninguno                                                           | `perfiles_*_orden_idx` y `perfiles_busqueda_idx`    | buffers ≤ 150; nodos < 3.500              | 105 buffers con 100.007; 15.157 → 1.673 nodos y 3,5 MB → 445 KB; «zq» por la RPC 4.117 → 411 buffers (= sin texto, 405) | **arreglado (5a-21)**: la sección «La lista del equipo con tope» al final tiene las cifras y el plan; **5a-31 hecho (4.02)**: con menos de 3 letras o dígitos seguidos el campo no pide nada y la RPC no filtra (sección «Paso 4.02»); cierre 1: la miniatura de 96 px y no el avatar de 512 (154 KB → 1,4 KB) |
| Roles, personas de cada rol            | hasta 1.001 por rol (`roles_personas()`)                           | «más de 1.000 personas»                                           | `usuarios_roles_rol_idx`                            | ≤ 150 buffers; ≤ 1.001 filas por rol      | 1.027 → 24 buffers y 100.020 → 1.001 filas con un rol de 100.007                                                        | **5a-27 hecho (4.02)**: antes `usuarios_roles(count)` exacto; sección «Paso 4.02»                                                                                                                                                                                                                              |
| Baja de una persona, vista previa      | hasta 1.001                                                        | «más de 1.000»                                                    | `leads_asesores_usuario_vigente_idx`                | 100 / 300 ms                              | 12 ms; 200.000: 313 → 44–73 ms                                                                                          | **arreglado** (cierre 1; era exacto)                                                                                                                                                                                                                                                                           |
| Baja de una persona                    | lotes de 5.000                                                     | exacto (lo hecho)                                                 | `leads_asesores_usuario_vigente_idx` + `leads_pkey` | 4.000 ms la llamada, 6.000 ms una corrida | 200.000: 17,9 s (y el corte de 8 s) → 0,5 s la llamada, 1,7–4,3 s una corrida                                           | **arreglado** (cierre 1, `medir-bajas.sql`)                                                                                                                                                                                                                                                                    |
| Tipos de cambio, historial             | 30                                                                 | «Mostrando los 30 cambios más recientes.»                         | FK del cambio                                       | —                                         | —                                                                                                                       | **arreglado** (cierre 1: lee 31 y lo dice)                                                                                                                                                                                                                                                                     |
| Bandeja / buscador / campana           | sin consulta todavía                                               | —                                                                 | —                                                   | —                                         | —                                                                                                                       | —                                                                                                                                                                                                                                                                                                              |

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

**Tras el cierre 5b** (los barriles de módulo, abajo): `/leads` 498,6 KB, `/perfil` 413,0 KB y `/vehiculos` 467,7 KB, con presupuestos de 530, 440 y 500 KB (bajaron; ninguno subió).

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

_Cerrada en el cierre 5a-fix-3 (más abajo, «Cierre 5a-fix-3»): la clasificación por título no se sostuvo y la lista de pruebas que bajan se rehízo contra el código._

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

## Cierre 5a-fix-1a: «míos» de quien tiene pocos leads se lee por su cartera (2026-10-18)

La persona con pocos leads recorría `leads_listado_idx` entero (5a-2): la «chica» (3 leads) descartaba 49.529 filas con 62.000 leads y 199.526 con 212.000 (18,6 → 63,8 ms), porque la policy de `leads` decide en ejecución si ve «todos» o «propios» (`alcance_de()` y `auth.uid()` son InitPlans) y el plan genérico espera cortar enseguida. Medido en transacciones que se revierten, como `authenticated`, con plan genérico y `EXPLAIN (ANALYZE, BUFFERS)`, con 62.000 y con 212.000 leads (siembra por defecto y `-- --leads 200000`; `shared_buffers` 128 MB, `random_page_cost` 4, `effective_cache_size` 128 MB). Personas: dueña («todos», 40 % de los leads), Ana (2.400 con 62.000, 8.000 con 212.000), Berta (7.000 / 28.000), la «chica» (3), una supervisora («todos» con 3 propios), una asesora con 3 vivos y 500 en la papelera, una sin leads, y una variante con ~30 personas.

### Las opciones, con sus números

Página 1 de 100 filas de «míos», ms (descartes entre paréntesis); «antes» = `leads_vista` con `en_cartera = true`. La columna «otros» dice a qué volumen se midió:

| Opción                                                                    | Chica 62.000  | Chica 212.000  | Otros (Ana / dueña)                                                                      | Veredicto                                                                                  |
| ------------------------------------------------------------------------- | ------------- | -------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Antes                                                                     | 19,1 (49.529) | 63,0 (199.526) | 212.000: 22,0 / 20,9                                                                     | —                                                                                          |
| **B1** policy con un `OR` de dos ramas por alcance                        | 17,1 (62.029) | 67,6 (219.093) | 212.000: 92,3 / 133,1                                                                    | **Peor para todos**: un plan genérico no cambia de camino al ejecutarse                    |
| **B2** `cartera @> case alcance …` con `gin (cartera)`                    | 22,1 (62.029) | 85,3 (219.093) | 212.000: 108,3 / 141,6                                                                   | **Peor para todos**                                                                        |
| **C2** `leads_vista` como `UNION ALL` con compuertas por alcance          | 13,2          | 20,7           | 212.000: 1.463 / **34.761**                                                              | **Inviable**: `Sort` sobre todo el `Append`, con las columnas caras calculadas en todo     |
| **C3** relación angosta con derechos del dueño y `security_barrier`       | 13,4 (63.796) | —              | 62.000: 33,2 / 52,8                                                                      | No: el planificador no la aplana y vuelve a recorrer `leads`                               |
| **C1'** `leads_cartera_vista` con el índice por persona, sin `include`    | 3,5 (29)      | —              | 62.000, cursor: Ana 27,4, Berta 40,7, dueña (asc.) 79,9                                  | Bien para la «chica»; **regresa** a las demás (`Bitmap Heap Scan` y ordenar todo el rango) |
| **C4** C1' con `include (tipo_acceso, revocado_en)`                       | 3,6 (29)      | —              | 62.000, cursor: Ana 20,9, Berta 20,7, dueña (asc.) 80,6                                  | Arregla Ana y Berta; falta la dueña                                                        |
| **C5 (elegida)** C4 + `true as en_cartera` y `true as telefono_visible`   | **3,7 (29)**  | **3,7 (29)**   | 212.000: 21,8 / 22,8 (cursores 21,4 / 22,4)                                              | Ordenado en todos; la dueña sólo conserva su lectura de siempre (abajo)                    |
| C6 C5 + `atributos_publicos` por una función de `COST` alto               | —             | —              | 62.000, un filtro sin resultados: chica 10,7 → 1,1; Berta 12,1 → 29,6; dueña 17,9 → 86,6 | No: la «chica» mejora y Berta y la dueña empeoran 2,4 y 4,8 veces                          |
| **A** (techo: RPC con el uid literal, sin policy ni columnas de la vista) | 0,0           | 0,0            | 212.000: 9,8 (1,4 con `gin`) / 0,6 (0,3)                                                 | El mejor plan, pero hay que reescribir en SQL todo el DSL de filtros del listado           |

**Por qué C5 y no A.** A planifica con el uid como literal, así que el planificador conoce el tamaño de la cartera y hasta un filtro sin resultados baja a milisegundos con `gin (cartera)` (Ana: 27,6 → 3,3 ms). Pero exige una función `security definer` que reimplemente búsqueda, tipo, origen, atributos públicos y privados, marcas, etiquetas y el cursor en los dos sentidos, una clase nueva en el cinturón y su matriz: lo que se mide como el 5a-1 (la búsqueda por nombre) pide el mismo tipo de función. Queda anotado para esa tarea. C5 cumple lo pedido sin segunda copia de la regla ni reescritura de filtros.

**La forma elegida** (`…20261019003200_listado_por_cartera.sql`): `leads_asesores.lead_creado_en` (copia de `leads.creado_en`: la llena un trigger al insertar, con el lead `for no key update`; otro la sigue si el lead cambia de fecha; un tercero impide cambiarla a mano), el índice `leads_asesores_listado_idx (usuario_id, lead_creado_en desc, lead_id desc) include (tipo_acceso, revocado_en) where revocado_en is null` y la vista `leads_cartera_vista` (`security_invoker`, `leads_vista` unida **por `id`** a las filas vigentes de quien mira). La ruta la elige la app (`fuenteDelListado()`): «míos» de quien tiene `leads.ver` «propios» lee la vista nueva; todo lo demás, `leads_vista`.

**El plan** (la «chica», página 1 de 100 filas, 212.000 leads; 3 filas, 3,7 ms, 290 buffers): `Limit → Nested Loop Left Join → Nested Loop Anti Join (leads_tachados) → Nested Loop → Index Scan using leads_asesores_listado_idx (Index Cond: usuario_id = $InitPlan; Heap Fetches: 0) → Index Scan using leads_pkey on leads` (el `exists` de la policy de `leads_asesores` y la unión), y las columnas caras (`atributos_lead()`, `telefono_lead()`, los números, las etiquetas) sólo para las filas que salen: `atributos_lead()` se llama 101 veces para una página de 100 (guarda `llamadas`). Con cursor (los dos sentidos) el `Index Cond` suma `lead_creado_en <= / >=` y es un `Index Scan` o `Index Scan Backward` de 101 filas. Con ~30 personas en `leads_asesores` los planes y los tiempos son los mismos.

### Antes → después (`db:medir:volumen`, mediana de 5 corridas, ms)

| Lectura                                                                            | 62.000 antes → después         | 212.000 antes → después        | Presupuesto |
| ---------------------------------------------------------------------------------- | ------------------------------ | ------------------------------ | ----------- |
| «Chica» (3 leads), página 1 de 50 y de 100                                         | 18,6 → **3,6**                 | 63,8 → **3,7**                 | 30          |
| «Chica», página 100 por cursor, 50 y 100 filas                                     | 15,8 → **3,6**                 | 64,9 → **3,7**                 | 150         |
| «Chica», descartes de la página 1 (la guarda tenía `1,1 × N`)                      | 49.529 → **29**                | 199.526 → **29**               | 3.000       |
| Asesora con 500 leads propios en la papelera, página 1 (descarta 530)              | — → 4,8                        | — → 4,9                        | 30; 3.000   |
| Ana, página 1 / Berta, página 1                                                    | 12,3 → 12,9 / 11,9 → 13,0      | 12,2 → 13,0 / 12,0 → 13,1      | 30          |
| **Los cuatro cercanos al techo** (no se tocaron sus presupuestos):                 |                                |                                |             |
| etiqueta de Ana                                                                    | 23,6 → 16,1                    | 96,3 → **64,3**                | 100         |
| un atributo sin resultados de la dueña («todos» / «míos»)                          | 23,7 → 21,8 / 16,0 → 20,8      | 90,4 → 90,0 / 76,7 → 74,5      | 100         |
| un campo privado sin resultados de la dueña («míos»)                               | 1.396,6 → 1.418,6              | 5.305,1 → 5.534,1              | 6.000       |
| kanban de la dueña, primera página de una columna                                  | 18,5 → 25,6                    | 74,8 → 70,6                    | 100         |
| «chica» y Ana, campo privado sin resultados                                        | 16,5 → **1,3** / 184,7 → 176,3 | 60,9 → **1,4** / 722,5 → 709,6 | 6.000       |
| alta de un lead (trigger de la fila de la cartera incluido) / 500 filas importadas | 2,0 / 989 → 1.020              | 2,0 / 1.086 → 1.050–1.078      | 80 ms; 2 s  |

Los tres de la dueña y el kanban están en rutas que **no cambiaron** (`leads_vista` / la policy de `oportunidades`): las diferencias son ruido (el kanban no se reproduce: `_mis_leads_vivos()` cuesta 49,7 ms con el índice nuevo y 50,2 sin él). El campo privado de la dueña con 212.000 queda en 5.534 de 6.000 (92 %): sigue siendo el primero en fallar al crecer N (lo recorre su cartera con `atributos_lead()` a ~66 µs por lead). La etiqueta de Ana baja de 96 a 64 ms; los cuatro siguen cerca de su techo y siguen creciendo con N salvo los que dependen de la cartera de la persona.

### Lo que **no** arregla (límites, con su número)

- **«Todos» con pocos leads propios (una supervisora)** sigue leyendo `leads_vista` en «míos» y recorre `leads_listado_idx` entero: 78,9 ms la página 1 con 212.000 (5,5 ms por la cartera). No se enruta por la cartera porque a la dueña (cartera de 40 % de los leads) le cuesta: con 212.000, su campo privado sin resultados 5.318 → 5.871 ms (98 % del techo), su etiqueta sin resultados 370 → 611 ms y su búsqueda por nombre 125 → 207 ms (el plan por la cartera evalúa `ilike` sobre todo `leads`; en cambio el de «propios» lo evalúa sólo sobre lo suyo). El criterio es el alcance, no el tamaño de la cartera: el planificador no lo sabe al planificar.
- **Un filtro sin resultados sobre una columna común** (`atributos_publicos @>`, `ilike`) sigue en un `Seq Scan` de `leads` para todos, también para la «chica»: 56,2 ms con 212.000 (11,0 con 62.000), dentro de su presupuesto de 100. El plan genérico supone una cartera promedio (60.000 filas ÷ personas = ~7.000) y un barrido de `leads` le parece más barato que 7.000 consultas por clave; no hay un plan único para una cartera de 3 y una de 25.000 (C6 lo mostró). Es la misma familia que la búsqueda por nombre (5a-1): operadores que no son _leakproof_ bajo RLS. La respuesta es A (una función con el uid literal y `gin`), que 5a-1 ya necesita.
- **Los leads de la papelera de una persona siguen en su cartera** (su fila en `leads_asesores` queda vigente hasta que se purgan) y el índice nuevo no puede ser parcial por `eliminado_en`: una persona con 500 en la papelera descarta 530 filas en su página 1 (4,9 ms con 212.000). Lo acota la papelera de cada persona; la guarda lo asserta con una asesora así.
- **Hallazgos de la dueña en «míos»** que nunca se midieron y no cambiaron: un atributo común, 105,6 ms con 212.000 (presupuesto 100) y una etiqueta propia, 112 ms con 62.000. Van a `docs/PLAN.md`, no a un presupuesto nuevo.
- **La regresión que se midió y se evitó:** la forma sin `include` (C1') hacía que Berta, Ana y la dueña pagaran `Bitmap Heap Scan` + ordenar todo el rango en una página por cursor (Berta 20,6 → 40,3 ms; la dueña, cursor ascendente, 20,7 → 79,9). Con el `include`, `en_cartera` constante y `Index Only Scan` desaparece.

### Costo de escribir y de la carrera

El trigger de inserción cuesta una lectura por clave y un candado `for no key update` del lead (el que las RPC de la cartera ya tienen): alta 2,0 ms (igual), 500 filas importadas 1.050–1.078 ms (1.086–1.119 antes, sin crecer con `actividad`), baja de 200.000 sin cambio (`medir-bajas.sql`). La carrera: si la fecha de un lead cambia a la vez que otra transacción inserta una fila de su cartera, la copia quedaba con la vieja (los dos locks no se estorbaban: `db:carreras` la hizo fallar con la fila nueva en otra fecha); con el candado una espera a la otra (dos escenarios en `scripts/carreras/cartera.mjs`). Nada cambia `leads.creado_en` en la app; la copia es correcta por construcción.

## Cierre 5a-fix-1b: la búsqueda por nombre no depende de cuántos leads hay (2026-10-18)

La búsqueda por nombre del listado (`5a-1`) era un `Seq Scan` de `leads` con la regla de visibilidad y `ilike` como filtros: 205 ms la dueña sin resultados con 212.000 leads, y un término que coincide con casi todo, de 0,7 a 12,8 s. Dos mecanismos se suman: **(M1)** `ilike` y `@>` no son _leakproof_, así que bajo RLS no se evalúan antes que la policy y ningún índice los sostiene; **(M2)** el plan genérico no sabe quién mira (`auth.uid()` es un InitPlan), y para quien tiene «propios» elige recorrer `leads` en vez de su cartera. Medido como `authenticated`, con plan genérico y `EXPLAIN (ANALYZE, BUFFERS)`, mediana de 5 corridas, con 62.000 y con 212.000 leads (`shared_buffers` 128 MB). Personas: la dueña («todos», 40 % de los leads), Ana (2.400 / 8.000), Berta (7.000 / 28.000) y la «chica» (3). La máquina es de uso diario de Andres: cada corrida de `db:medir:volumen` abre con su carga (`Máquina al empezar`).

### Las opciones, con lo que se midió

| Opción                                                                                                         | Resultado                                                                                                                                                                                                                                                           | Veredicto   |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **Lo de antes** (vista + `ilike`, la ruta de la app)                                                           | dueña «todos» 205 ms sin resultados (212.000), Ana 392 con un apellido común, un término que coincide con todo 0,7 a 12,8 s; crece con N                                                                                                                            | —           |
| **P**: candidatos sin tope (la propuesta del 5a: `gin (nombre)` + `security definer` + `_lead_visible_para()`) | un término amplio junta hasta 212.000 ids; con `Volumen` el planificador elige el GIN aunque recorrer el listado cuesta 1 ms (40–100 ms con 62.000); sin trigramas recorre `leads`; con el índice entero, la «chica» lee del heap lo que coincide de otras personas | descartada  |
| **Tope y vuelta al camino de antes**                                                                           | con más de 300 coincidencias, quien tiene «propios» vuelve al `Seq Scan` (Berta ≈ 75 ms)                                                                                                                                                                            | descartada  |
| **A**: la página entera en SQL (el techo de 5a-fix-1a)                                                         | 0,0 y 9,8 ms, pero reescribe el DSL de filtros, el conteo y la exportación                                                                                                                                                                                          | descartada  |
| **L**: envolver `ilike` en una función _leakproof_                                                             | sólo un superusuario puede marcarla, y `postgres` no lo es en Supabase (PGlite lo dejaría pasar)                                                                                                                                                                    | descartada  |
| **V**: vista con derechos del dueño y sin barrera                                                              | los operadores que elige el cliente de PostgREST se evaluarían sobre filas que no se ven                                                                                                                                                                            | descartada  |
| **Candidatos por ventana en dos pasos (elegida)**                                                              | todos los términos con tramo de 3 letras o densos, ≤ 44,6 ms con 212.000 y ≤ 39,5 con 62.000                                                                                                                                                                        | **elegida** |

Cuatro variantes de **índice** para los candidatos (62.000, la etapa de índice como la ejecuta la definer, ms): el de antes (`gin (nombre)` entero) 7,8–22 ms y lee filas de otras personas; **B** `(cartera, nombre) parcial` 0,1–7 ms para Ana, Berta y la «chica», y lo ajeno no llega al heap; **C** `gin (nombre)` parcial más `gin (cartera)` aparte 2,5–7 ms (el `BitmapAnd` arma el bitmap global del trigrama: justo la señal de tiempo que se quería evitar); **G** B más n-gramas de 1 y 2 caracteres para los términos cortos: la «chica» y Ana igual, pero 500 altas pasan de 1,1–1,7 s a 2,8–3,7 s (2,5 veces) y 3,3 s de creación con 62.000. Se eligió B, con `atributos_publicos jsonb_path_ops` para el filtro por una opción.

### Lo elegido: la forma

Dos pasos, como `#n` hoy (`…20261019003300_busqueda_por_candidatos.sql`):

1. **`leads_candidatos(p_filtros)`** (`security definer`, clase L). Calcula una vez quién mira, su alcance y `_bajas_en_curso()` y los pasa a la consulta **como literales**: así el planificador conoce el tamaño de la cartera. Devuelve `{ ids, completa, hasta }`: los primeros K = 300 que coinciden, en el orden del listado y después del cursor, sólo de lo que `_lead_visible_para()` deja ver. **Etapa W:** recorre hasta S = 4000 filas en el orden del listado (por `leads_asesores_listado_idx` con una unión `lateral … limit 1` para «míos» y «propios» —sin la valla el planificador lee `leads` entera con un `Hash Join`, 24 ms con 62.000—; por `leads_listado_idx` para «todos») y se queda con las que cumplen: un término común termina ahí. **Etapa I:** sólo si W recorrió S sin juntar K + 1; usa `leads_busqueda_idx`, con el **patrón entero** (sus trigramas se cruzan solos; con el tramo más largo, `Volumen 4999` elegía `Volumen` y costaba 104 ms contra 1). Si el texto no tiene un tramo de 3 letras o dígitos y no hay un campo público, el índice no tiene qué buscar y la etapa I es un recorrido por el listado sin tope (`5a-8`).
2. **`leads_vista_por_ids(p_leads)`** (invocador, SQL, `stable`, sin `strict`, `set` ni `definer`: Postgres la inlinea en la consulta de PostgREST). La página sale de ahí con lo que no resolvieron los candidatos, el cursor, el orden y el límite. **Repetir el nombre y el campo público en este paso era un error:** el planificador los estima en casi cero filas, arma un `Nested Loop` y recorre `leads_favoritos` y `leads_tachados` enteras por cada candidato (88 ms con 300 contra 21), así que `condicionesDeLaPagina()` los quita.
3. Si las marcas de quien mira (tachados, favoritos) dejan la página corta, la app pide la ventana que sigue desde `hasta`, hasta `ventanasHasta(tamano)`; pasadas ésas vuelve a la consulta de antes: nunca peor que antes.

**Índice** `leads_busqueda_idx gin (cartera, nombre gin_trgm_ops, atributos_publicos jsonb_path_ops) where eliminado_en is null and cartera <> '{}'` con `fastupdate = on` y `gin_pending_list_limit = 256` kB; reemplaza a `leads_nombre_trgm` (entero, de la migración `…000900`, sin uso bajo RLS). 36 MB con 212.000 leads. Con `fastupdate = off` la baja de 200.000 tardaba 11 corridas del job (18 s), con la lista de 256 kB, 9 (14–15 s).

### Antes → después (los dos pasos, ms, ruta de la app; `db:medir:volumen`, mediana de 5)

| Persona                        | Término                    | 62.000 antes → después | 212.000 antes → después |
| ------------------------------ | -------------------------- | ---------------------- | ----------------------- |
| Dueña, «todos»                 | «Volumen 4999» (selectivo) | 58,8 → **23,5**        | 220,6 → **17,5**        |
| Dueña, «todos»                 | «zzzzqx» (sin resultados)  | 48,8 → **6,7**         | 204,7 → **6,5**         |
| Dueña, «todos»                 | «Gómez» (12,5 %)           | 76,0 → **33,8**        | 294,1 → **36,9**        |
| Dueña, «todos»                 | «Volumen» (casi todo)      | 5.260 → **33,3**       | 710,7 → **35,4**        |
| Dueña, «míos»                  | «Volumen 4999» (selectivo) | 33,6 → **22,2**        | 135,2 → **29,0**        |
| Dueña, «míos»                  | «zzzzqx» (sin resultados)  | 28,7 → **13,3**        | 123,6 → **16,2**        |
| Dueña, «míos»                  | «Gómez» (12,5 %)           | 296,7 → **37,4**       | 170,8 → **44,6**        |
| Dueña, «míos»                  | «Volumen» (casi todo)      | 2.127 → **37,2**       | 12.771 → **43,8**       |
| Ana, «míos» (2.400 / 8.000)    | «Volumen 4999» (selectivo) | 12,6 → **9,9**         | 59,5 → **23,0**         |
| Ana, «míos» (2.400 / 8.000)    | «zzzzqx» (sin resultados)  | 12,3 → **9,5**         | 58,7 → **18,8**         |
| Ana, «míos» (2.400 / 8.000)    | «Gómez» (12,5 %)           | 56,1 → **32,9**        | 391,8 → **40,5**        |
| Ana, «míos» (2.400 / 8.000)    | «Volumen» (casi todo)      | 263,0 → **34,1**       | 3.119 → **43,8**        |
| Berta, «míos» (7.000 / 28.000) | «Volumen 4999» (selectivo) | 20,5 → **24,4**        | 74,3 → **18,1**         |
| Berta, «míos» (7.000 / 28.000) | «zzzzqx» (sin resultados)  | 16,1 → **17,9**        | 73,0 → **16,0**         |
| Berta, «míos» (7.000 / 28.000) | «Gómez» (12,5 %)           | 16,1 → **16,3**        | 73,0 → **16,4**         |
| Berta, «míos» (7.000 / 28.000) | «Volumen» (casi todo)      | 606,0 → **39,5**       | 7.270 → **38,8**        |
| «Chica», «míos» (3)            | «Volumen 4999» (selectivo) | 7,6 → **0,7**          | 38,8 → **0,7**          |
| «Chica», «míos» (3)            | «zzzzqx» (sin resultados)  | 7,5 → **0,8**          | 38,7 → **0,7**          |
| «Chica», «míos» (3)            | «Gómez» (12,5 %)           | 7,5 → **3,6**          | 38,4 → **3,6**          |
| «Chica», «míos» (3)            | «Volumen» (casi todo)      | 7,5 → **4,1**          | 38,1 → **4,1**          |

Berta con 62.000 no mejora en los términos selectivos (16–20 → 16–24): los dos pasos tienen un costo fijo de ≈ 16 ms (la etapa W lee hasta 4.000 de su cartera); lo que cambia es que **deja de crecer con N** (73 → 16 ms con 212.000). La página de 101 filas con sus columnas es ≈ 21–25 ms de cada fila (lo que ya cuesta cualquier página); los candidatos suman 1 a 20.

### Huella, sin oráculo y lo que se probó

- **Las filas enteras, iguales:** `busqueda-leads.sql` (`db:probar`, PGlite) compara el md5 de las filas de `leads_vista` / `leads_cartera_vista` con el de los candidatos para 9 lecturas de personas (sin leads, con uno, con tres, con muchos, «todos» con dos propios en «míos» y en «todos», que se va, la dueña) × 29 términos (comodines, barra, comillas, tildes, ñ, mayúsculas, 1 y 2 caracteres, `*`, `#n`) × 8 filtros (tachados, favoritos, tipo, origen, un campo público, uno privado) × ventanas de 2, 3 y 300; y recorre todo por cursor, hacia los dos lados, con páginas de 2 y 5, sin repetir una fila. `busqueda-volumen.sql` (`db:medir:volumen`) lo repite en **Postgres de verdad con volumen** (PGlite pliega mayúsculas y tildes sólo en ASCII): 190 comparaciones iguales (118 con filas), con 62.000 y con 212.000. `busqueda.test.ts` compara `_lead_busqueda_patron()` con `patronContiene()` en 33 textos.
- **Sin oráculo:** un término que sólo coincide con la papelera, el limbo, la baja en curso o lo ajeno contesta `{"ids": [], "completa": true, "hasta": null}`, igual que uno sin nada; los dígitos de un teléfono no encuentran nada; un id ajeno en `extra` (el del número) no vuelve; todo id que sale es de un lead que la vista deja ver; quien no puede ver leads recibe lo mismo, sin error; las formas raras (`null`, `[]`, un texto numérico) tampoco fallan. **El tiempo:** Berta lee **0 bloques del heap** buscando `Mamani`, `Quispe` y `Gómez` (26.000 leads de otras personas con 212.000) y `zzzzqx`; la guarda lo asserta (≤ 40).
- **Mutaciones** (cada una rompe un bloque con su causa): quitar `_lead_visible_para()` de los candidatos → «sin oráculo» devuelve el lead de una baja en curso; no escapar el `%` del patrón → el oráculo por posición; `strict` en `leads_vista_por_ids` → «no se inlinea». La guarda de escala con la ruta de antes: **46 aserciones rotas** con 212.000 (hasta 21 s); con la nueva, verde.

### Costo en escritura (la guarda que ya estaba; 212.000 leads, misma base alternando el índice)

| Qué                                                                                        | Antes (`leads_nombre_trgm`)   | Después (`fastupdate = on`, 256 kB)                                             |
| ------------------------------------------------------------------------------------------ | ----------------------------- | ------------------------------------------------------------------------------- |
| Importar 500 filas, 23.000 / 124.000 de `actividad`                                        | 1.073 / 1.033 ms (razón 0,99) | 1.119 / 1.056 (62.000) · 1.163–1.204 (212.000); razón 1,04                      |
| Alta de un lead (trigger del número propio incluido)                                       | 2,0 ms                        | 2,4 ms (62.000) · 2,5 / 2,9 (212.000)                                           |
| Baja de 200.000: la llamada                                                                | 576 ms                        | 452–539                                                                         |
| Baja de 200.000: la corrida más larga del job                                              | 2.152 ms (tope 6.000)         | 1.839–2.108 (4.948 una vez, con carga 10–15 y un checkpoint con 11 s de `sync`) |
| Baja de 200.000: el job entero                                                             | 6 corridas, 10,1 s            | 9 corridas, 14,4 s (con `fastupdate = off`: 11, 18 s)                           |
| Jobs (`papelera-purgar` etc.)                                                              | 4.455 ms                      | 4.166–4.366 (5.210 con carga)                                                   |
| 10.000 updates de la cartera (5.000 leads que ganan y pierden a una persona; 62.000 leads) | 0,6–0,7 s                     | 1,7–1,8 s con `fastupdate = off` (no se midió con la lista de 256 kB)           |

La baja pasa a costar ≈ 40–50 % más de tiempo total porque cada update de `leads` (casi ninguno es HOT: 12 de 10.000, también antes) inserta ahora ~35 claves más en el GIN (la cartera y los campos públicos). Las guardas (llamada ≤ 4 s, corrida ≤ 6 s) pasan con holgura. El tamaño del índice nuevo con 212.000 leads es 36 MB; el de antes, creado de un golpe, 8,8 MB.

### Diagnóstico de los hallazgos (a 212.000)

- **Un atributo común de la dueña en «míos»** (105,6 ms) y **un filtro sin resultados sobre una columna común** (la «chica» 56 ms; la dueña «todos» 90): el mismo mecanismo (`@>` no _leakproof_ y plan sin uid): **entran**, por los candidatos (`@>` sobre `atributos_publicos` en el mismo índice): 31,7 / 9,4 / 2,7 / 0,6 ms.
- **La supervisora** (75,8 ms; por la cartera 1,4), **la etiqueta de la dueña** (83 ms con la suya, 368 sin resultados), **el kanban** (67–111 ms con el índice de antes y con el nuevo), **un término sin tramo de 3** y **los filtros de texto y de rango sobre un campo público** (118 / 72 ms): no son el de la búsqueda; `docs/PLAN.md` 5a-5 a 5a-9, cada uno con su assert y su lugar.

### Lo que no se hizo y por qué

Los n-gramas (arriba); un índice de trigramas por separado de la cartera (C); el conteo de tachados ocultos (`contarLeadsHasta`) y la exportación del conteo siguen por la consulta de antes cuando hay una búsqueda por nombre (se cuentan hasta 51 / 5.001 ids, y mientras se busca no se ocultan tachados). La exportación lee las páginas de 500 por candidatos, en dos ventanas.

## Cierre 5b: los barriles de módulo, la ficha y las oportunidades (2026-10-18)

Lo que pesa una pantalla en el navegador, medido con `e2e/presupuesto-js.spec.ts` (JS en frío con gzip) y con las pruebas de la ficha (bytes crudos del documento de `/leads/<id>` menos los de `/perfil`: lo que la ficha **aporta**). Ninguna base cambió: son números de la app compilada (`.next-e2e`). **No se sube ningún presupuesto.**

### JS en frío: el `index.ts` de un módulo no exporta componentes

Una pantalla paga en JS todo lo que reexporta lo que importa, aunque no lo use: Next arma el manifiesto de cliente de la página con todo módulo `'use client'` que encuentra en el grafo de servidor, y el `index.ts` de un módulo lo importaba casi toda pantalla (una sesión, una lectura, un tipo). Había dos cadenas: `/perfil` importaba `@/modules/equipo`, cuyo `index.ts` reexportaba once componentes (`ListaEquipo` 6,8 KB y `MatrizDeRoles` 5,3 KB con gzip, más los formularios), y ese mismo barril reexportaba `canjearAcceso`, que importaba el barril entero de `empresa` (15,9 KB de formularios de Configuración › Empresa en **toda** pantalla); `/leads` arrastraba en un mismo chunk la ficha, el importador, los editores de campos, orígenes y tipos, la papelera, el portal y las oportunidades (el listado son ~24 KB).

| Ruta         | Antes (9i y cierres 1 a 4) | Ahora (5b) | Diferencia | Presupuesto |
| ------------ | -------------------------- | ---------- | ---------- | ----------- |
| `/leads`     | 565,4 KB                   | 498,6 KB   | −66,8 KB   | 570 → 530   |
| `/perfil`    | 443,3 KB                   | 413,0 KB   | −30,3 KB   | 460 → 440   |
| `/vehiculos` | 520,0 KB                   | 467,7 KB   | −52,3 KB   | 530 → 500   |

Los presupuestos bajan a lo medido más un 5 % (redondeado a la decena); ninguno sube. La forma: cada módulo con componentes de cliente (`equipo`, `empresa`, `leads`, `origenes`, `vehiculos`; `tablero` pasó con la bandeja) tiene `pantallas/<pantalla>.ts`, que reexporta sólo lo que esa pantalla dibuja y sólo la importa `src/app` (lo cuida el lint); el `index.ts` queda con sesión, lecturas, actions, reglas y tipos. Una guarda (`scripts/guardas/barriles.test.ts`, en `pnpm test`) recorre los imports de valor de cada `src/modules/<x>/index.ts` y falla, con el camino de archivos, si llega a un `'use client'`; se probó con una regresión (un componente de equipo en su index).

### La ficha: «Datos» recibe lo que dibuja (bytes del documento sobre `/perfil`)

`FichaDeLead` recibe sus props en **toda** sección, y mandaba el layout completo de campos (apagados incluidos), todos los orígenes y los tipos de lead (hasta 100 cada uno) para un panel de edición que casi nunca se abre.

| Caso                                  | Antes   | Ahora   | Presupuesto |
| ------------------------------------- | ------- | ------- | ----------- |
| «Datos», con la semilla               | 40,6 KB | 39,2 KB | 48 → 43 KB  |
| «Datos», con 100 orígenes y 100 tipos | 70,1 KB | 40,1 KB | 43 KB       |

Ahora manda los campos activos y el origen y el tipo de ese lead; el panel de edición lee el layout y los catálogos desde el navegador al abrirse (`leerCatalogosDeEdicion()`, una lectura nueva en cada apertura, con esqueleto, «No se pudo cargar el formulario.» con «Reintentar» y un `?panel=editar-lead` que lo abre igual). Un test (`e2e/leads-ficha.spec.ts`) mide la ficha con 100 orígenes y 100 tipos y falla con las props de antes. **Lo que quedó, con número, se cerró en el cierre 5b-fix** (abajo): el shell mandaba a **toda** pantalla el contexto del alta con esos catálogos (≈ 26 KB con 100 + 100).

### Oportunidades: 10 a la vista, «Ver todas» hasta 100

Cada oportunidad pesa ~3,5 KB en el documento (props del servidor a un componente de cliente), y la sección dibujaba hasta 100: una ficha con 100 pagaba ~370 KB en cada visita.

| Caso (`e2e/leads-oportunidades-ver-todas.spec.ts`, 105 oportunidades sembradas por SQL) | Antes  | Ahora   | Presupuesto |
| --------------------------------------------------------------------------------------- | ------ | ------- | ----------- |
| La ficha con la sección abierta (10 a la vista, las abiertas primero)                   | 374 KB | 62,3 KB | 66 KB       |
| La ficha con «Ver todas» (`?todas=1`, hasta 100)                                        | 374 KB | 374 KB  | 400 KB      |

Sin cambio en la base: el servidor lee igual (101 y dice `hay_mas`) y manda sólo lo que se dibuja. «Ver todas» es un enlace (`?todas=1`): «atrás» vuelve a las 10, y «Ver sólo las 10 más recientes» también. Más allá de 100 no hay camino y cada oportunidad sigue pesando 3,5 KB: `docs/PLAN.md`, 5a-12.

### Los cuatro defectos de interfaz (medidos con cajas, al 100 y al 200 %, en escritorio y celular)

No son rendimiento, pero cada uno tiene su número porque su spec falla con el diseño anterior:

- **4.1, la barra del listado** (`barra-de-filtros-200.spec.ts`, `barra-de-filtros-vehiculos-200.spec.ts`): las cajas siguen el orden de lectura, toda fila empieza a la izquierda y ningún botón queda solo si cabía en la fila de arriba.
- **4.2, los marcadores** (`exigirMarcadorQueCabe`, mide con el lienzo): en el celular al 200 % el campo mide ~300 px; «Buscar por nombre o número» (396 px), «Buscar por título, VIN o lote» (375) y «Buscar en el embudo» (287 en 262) se cortaban; ahora «Nombre o número», «Título, VIN o lote» y «Título o lead» caben.
- **4.3, la vista previa de la importación** (`leads-importar-vista-previa.spec.ts`): el nombre dejó de partirse («…escritorio B / 1» con la mitad del ancho vacía) y «Fila N» ya no se parte; la página no se ensancha al 200 %.
- **4.4, el pie del modal en el celular** (`modales-celular-200.spec.ts`, en «Nuevo rol», «Invitar» y «Nuevo embudo»): pie 13 a 23 % de la pantalla (antes 31 %) y cuerpo 55 a 69 % del modal (antes 31 y 32 %); con la pregunta de descartar, pie 34 % y cuerpo 47 a 52 %; los botones miden 44 px (antes `min-h-11`, en rem: 88 px al 200 %).

## Cierre 5a-fix-3: la suite con los dos proyectos, de 42,0 a 31,7 min (2026-10-19)

Sin cambios de producto (`src/` y `supabase/` sólo cambian por mutaciones que se revirtieron). **La corrida completa con los dos proyectos y sin la bandera, `pnpm test:e2e:completo`, después del último cambio:** **812 pasan, 33 saltos, 0 fallos, 31,7 min de Playwright (32,5 con `db:reset`, carreras y el build)**; escritorio 530 pruebas en **19,6 min**, celular 315 en **12,0 min**; la prueba más lenta 10,0 s (escritorio) y 9,0 s (celular), la media 2,12 y 2,19 s; carga de la máquina 0,96 al empezar y 2,06 al terminar. **El assert de 25 min no se cumple** (lo que falta y por qué: `docs/PLAN.md` 5a-4b).

| Corrida                                  | Pruebas (esc. + cel.) | Resultado                                                                   | Tiempo (escritorio / celular)                                                                                                   |
| ---------------------------------------- | --------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 5a (la medición del cierre 5a)           | 519 + 519             | 1.009 pasan, 29 saltos                                                      | 39,1 min (19,7 / 19,3)                                                                                                          |
| «Antes» de este cierre                   | 536 + 536             | 1.032 pasan, **1 falla** (el menú de la empresa), 6 no corrieron, 33 saltos | **42,0 min** (22,0 / 20,0); no es limpia: el hook de Stop corrió `pnpm test` dos veces (95 s, carga 9–10) y yo lint y typecheck |
| Medición con huellas (`E2E_HUELLA`)      | 536 + 536             | 1.034 pasan, **1 falla** (`leads-rapido-editar`), 4 no corrieron            | 40,9 min; instrumentada, sólo para comparar                                                                                     |
| Sólo celular con las marcas (validación) | 324                   | 303 pasan, **2 fallas** (cadenas `serial`), 17 saltos                       | 12,2 min                                                                                                                        |
| **Final, después del último cambio**     | **530 + 315**         | **812 pasan, 0 fallas, 33 saltos**                                          | **31,7 min** (19,6 / 12,0)                                                                                                      |

Una primera corrida final (806 pasan) falló en `leads-vehiculos` (la nota de «Agregar vehículo»: el Esc salió 1 ms después del `fill`); se arregló y se repitió entera. En celular dejan de correr 221 de las 536 pruebas (212 por demostración, 6 que no abren la app y 3 que bajaron de nivel), el 21 % de las 1.072 de antes. El escritorio no perdió cobertura: 22,0 → 19,6 min junta que la «antes» no fue limpia y que bajaron seis pruebas, y esas dos cosas no se separaron.

### Lo que el repo no confirmó del 5a-4

- **Los 39,1 min** no se pueden comprobar (no quedó el JSON de esa corrida); la última cifra limpia del escritorio solo es la del 5b, 20,9 min. Hoy son **536 pruebas por proyecto** (no 519) en 107 archivos.
- **La clasificación 65 / 19 / 17 por el título no se sostiene.** Por lectura salen 51 specs sin rama propia, ningún ayudante con rama y sin medir el ancho; pero 26 specs llaman a `panelDeFiltros()`, `grupoDelFiltro()`, `verEtapa()` o `tactil()` (en celular afirma 44 px; en escritorio vuelve sin hacer nada), y **el servidor dibuja sólo las tarjetas en celular** (`anchoDeLaPeticion`: el `user-agent` móvil da 400 px): un spec «sin rama» que toca una fila toca una tarjeta. La decisión sale de comparar, no de leer.

### Cómo se demostró que el celular no agrega nada

`E2E_HUELLA=<carpeta> pnpm test:e2e:completo` (`e2e/soporte/huella.ts`, sólo con la variable) guarda por prueba **cada acción de un `Locator` y cada `expect`** (enganchados al `Frame` del cliente de Playwright, 1.64), con el selector y **la huella del elemento** (la cadena de ancestros: etiqueta, rol, nombre, `data-slot`, `data-side`, `aria-modal`), los errores de consola y de página, y el **JS de la app que se ejecutó** (cobertura de bloques de V8, `Profiler.takePreciseCoverage`). `scripts/comparar-anchos.mjs` compara los dos proyectos prueba por prueba: una sale sólo si los pasos son los mismos sobre los mismos elementos, no hay errores de consola distintos y **todo el JS que el celular ejecuta de más lo ejecuta, en celular, otra prueba que se queda**. Del enganche se descartó leer las trazas de Playwright (el DOM de las instantáneas se guarda con referencias a las anteriores) y comparar el árbol accesible de toda la página (el marco siempre difiere).

**Lo que mide el comparador y no es el ancho** (primera versión: 321 pruebas «distintas» de 527; después de quitarlo, 196): la URL de cada paso (`nuqs` la escribe un cuadro después de que aparece el diálogo; ahora sólo cuenta la de un `goto`), el elemento de una acción que el clic ya sacó (sólo se compara si existe en los dos lados), los números de un nombre y el nombre del proyecto, las envolturas `div` sin rol ni nombre, y una cadena que el navegador cortó en otro nivel (se compara hasta donde llegan las dos). **Lo que sigue contando:** tabla y filas contra lista y artículos, el panel a la derecha contra desde abajo (`data-side`), el menú del celular, las pestañas de etapas, un `expect` que cuenta otros elementos.

**Controles** (tenían que salir distintos): `listado-tarjetas-200`, `leads-embudo` (las pestañas), `leads-listado-filtros` (la hoja), `leads-ficha-telefonos` (el panel desde abajo), `listas-por-pagina`; y `vehiculos-fotos`, donde sólo la prueba de la cámara sale distinta (7 iguales, 1 distinta). **Resultado sobre 527 pruebas:** 294 IGUAL, 196 DISTINTO (`huella-expect` 101, `huella-accion` 51, `accion` 19, `selector` 17, `cuantos` 5, `url` 2, `errores` 1), 29 SALTADA y 8 en un solo proyecto; 17 de las IGUAL se quedan porque son las primeras en ejecutar JS del celular que nadie más ejecuta.

**Un falso IGUAL que el comparador no podía ver y la guarda sí:** las mediciones que ocurren **dentro de un ayudante** (`avisoNoTapaElPie()` mide cajas y no es un paso de un `Locator`). De las 277 que el comparador dejaba salir, la guarda quitó 63 (un ayudante de `e2e/soporte` que toca `boundingBox`, `fontSize`, `viewportSize`, `esMovil`… directa o transitivamente, un `beforeEach` con el 200 %, o una función local del spec) y la validación en celular otras 2 (una prueba `serial` alimentaba a la que sigue: `configuracion-leads-tipos` y `vehiculos-vitrina`). **Quedan 212 marcadas** (15 archivos enteros con 48 pruebas y 164 sueltas) y 6 que no abren la app (`vehiculos-apibara-funcion`, `capturas-quietas`): el celular pasa de 536 a **315 pruebas** (−212 −6 −3 que bajaron y todavía corrían en celular), en 89 archivos.

### Cada rama del celular y quién la toca (las pruebas que se quedan, sólo en celular)

| Rama del celular                                                                                          | Pruebas que se quedan y la tocan | Nota                                                                                                                              |
| --------------------------------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Tarjetas en vez de tabla (leads, vehículos, papeleras)                                                    | 111                              | `UnaSolaVista` dibuja una sola vista según el `user-agent`                                                                        |
| Hoja «Filtros» en vez del panel                                                                           | 13                               | `leads-listado-filtros` (control) y `vehiculos`                                                                                   |
| Pestañas de etapas en vez de columnas del kanban                                                          | 13                               | `leads-embudo` (control), `leads-numeros-pantallas`, `leads-recorrido-cierre-2`                                                   |
| Panel desde abajo (`data-side` = bottom: la hoja de filtros, el teléfono, la cartera, «Agregar vehículo») | 34                               | incluye las 13 de la hoja de filtros; la ficha: `leads-ficha-telefonos` (control)                                                 |
| Menú del celular («Abrir el menú»)                                                                        | 5                                | entre ellas `leads-listado` y `vehiculos`                                                                                         |
| Modal arriba con el pie de 44 px                                                                          | 2                                | `modales-celular-200`                                                                                                             |
| «Tomar una foto»                                                                                          | 1                                | `vehiculos-fotos`: visible en celular, oculto en escritorio                                                                       |
| «Ítems por página» arriba de la lista                                                                     | 14                               | es una posición, no una estructura: la huella no la distingue; la miden `listas-por-pagina` y `vehiculos-por-pagina` (se quedan)  |
| «Rol a la vista» (matriz de Roles)                                                                        | **1**                            | `equipo` › «Rol a la vista» (cierre 5b-fix-2, `docs/PLAN.md` 5a-13): DISTINTO en el paso 8 (`selectOption` contra `to.be.hidden`) |

### Las pruebas que bajan de nivel (la lista de «C», rehecha contra el código)

La lista de «C» no coincidía con el repo en varias filas: «más de 5.000 leads» mira un **mensaje** (el único lugar donde se afirma) y el tope lo cuenta `contarLeadsHasta()` en TypeScript, de a 1.000; los 403 y el límite por hora los da un route handler sin prueba unitaria y el 405 del `GET` lo da Next; la fila de la búsqueda nombraba tests que no cubren el escape; el tope de orígenes «no deja pasar la base» no llamaba a la RPC; `medir-jobs.sql` mide tiempos y no corre en `db:probar`. **Bajaron seis**, cada una con su mutación (una de la prueba de abajo cae; si no cayera, el e2e se quedaba):

| Prueba e2e que se borró                                                                | Pasa a                                                                                 | Mutación → lo que cayó                                                                                                                                                                         |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `leads-exportar` › una celda que empieza por una fórmula                               | `escribir.test.ts`, `exportacion.test.ts` (y `leads-recorrido-csv` descarga de verdad) | `celdaSegura()` sin el apóstrofo → 9 de Vitest; el patrón sin `@`, tabulación ni retorno → 4                                                                                                   |
| `configuracion-leads-origenes-casos` y `-tipos-casos` › la asesora no entra… ni la RPC | `humo.sql` (RPC) y los `*-recorrido` A y C (pantalla)                                  | sin `assert_permiso` en `origen_lead_crear` → cae `db:probar` (9f-1 y el de tipos); en `tipo_lead_crear` → 9j; la pantalla abierta a todas → caen los dos `*-recorrido` y las pruebas borradas |
| `leads-marcas-acceso` › lo que no se ve responde como inexistente                      | `humo.sql` › «marcas: lo que no se ve…»                                                | sin `_lead_visible()` en `lead_favorito_poner` → caen los bloques de marcas                                                                                                                    |
| `leads-marcas-acceso` › una etiqueta ajena y los topes con dos pedidos a la vez        | `humo.sql` y **`scripts/carreras/marcas.mjs` (nueva)**                                 | el candado de etiquetas vacío (en la base local) → «B nunca esperó el lock»: los topes de 20 y de 50 no se prueban                                                                             |
| `leads-numeros-recorrido` › E (por la API)                                             | `numero-global.sql`                                                                    | `grant select (numero)` o `(numero_propio)` a `authenticated` → caen tres bloques                                                                                                              |

**Se quedan** (cada una es el único lugar de algo): las tres de `leads-importar` y `leads-recorrido-csv` › 501 filas (el aviso «Falta una columna» con el botón apagado, el resumen y «Solo con errores»); `leads-exportar` › los 403, el origen ajeno o `GET` y el límite por hora; «más de 5.000» (volumen, y el único lugar del mensaje); la búsqueda y la paginación; `leads-seguimientos-acceso`; los topes de 100 y «apagar el último activo»; `leads-marcas-acceso` › la de la interfaz; `leads-numeros-recorrido` › B; las cuatro con interfaz de remate. Bajar de nivel libera ≈ 0,5 min: **no es la palanca**, lo es el celular.

### Tres carreras de las propias pruebas que salieron al medir (ninguna es del producto)

Las tres se explican por la traza y el DOM del fallo, sin reintento: (1) `empresa` › la dueña cambia el nombre: Escape y, 1 ms después, el clic en «Tipos de cambio» con el menú del celular todavía cerrándose (dos botones, `strict mode`); el original falla 1 de 10 en celular sin carga y con la espera, 20 de 20. (2) `leads-rapido-editar`: al final, el resumen se buscaba por un nombre que es subcadena de «Editar <nombre>», el panel que aún se cerraba (`data-ending-style`); sin instrumentar el original pasó 20 de 20, así que la causa sale del DOM del fallo y no de una tasa. (3) `leads-vehiculos` › la nota de un interés: Esc 1 ms después del `fill`, el panel se cerró sin preguntar (la app anota «hay algo escrito» en un efecto); el original pasó 30 de 30 en aislado; con dos cuadros de espera, 40 de 40.

## Cierre 5b-fix: el contexto del alta se lee al abrir y el documento de `/perfil` no crece con los catálogos (2026-10-19)

Tres defectos que dejó la 5b (`docs/PLAN.md`, 5b-1 a 5b-3), todos del layout. Los números son de la app compilada (`.next-e2e`), escritorio y celular, sin cambio en la base.

### 5b-3 · el documento de `/perfil` (bytes sin comprimir de `GET /perfil`)

| Caso                         | Antes   | Ahora  | Presupuesto                                         |
| ---------------------------- | ------- | ------ | --------------------------------------------------- |
| Con la semilla               | 82.462  | 79.287 | 82 KB (`PRESUPUESTO_DEL_DOCUMENTO_DE_PERFIL_EN_KB`) |
| Con 100 orígenes y 100 tipos | 109.158 | 79.287 | 82 KB                                               |
| Diferencia entre los dos     | 26.696  | 0      | ±1 KB                                               |

Lo que viajaba en cada documento era el contexto del alta (orígenes, tipos de lead y de seguimiento activos, el último origen, el código de país, la ciudad y el país de la empresa) y el layout completo de campos, que el layout `(app)` leía en cada petición y mandaba por props a `<AltaDeLead>`; con 100 + 100 eran ~26 KB, se abriera o no el drawer. Ahora `<AltaDeLead>` no recibe nada. **La lectura nueva** (`infra/contexto-de-alta.client.ts`): **dos pedidos desde el navegador, en paralelo**, cuando se abre el drawer o antes, al llegar el puntero al botón, al tomar el foco o con la tecla `N`: `lead_alta_contexto` (1.847 B con la semilla, 27.837 B con 100 + 100) y `leads_campos` (2.455 B), sin comprimir (PostgREST local). **Sin tope propio:** no se pudo en una sola petición ni con tope sin SQL (la restricción del cierre lo prohibía): el tope es el de escribir —100 orígenes y 100 tipos— y los tipos de seguimiento y los campos no lo tienen (`docs/PLAN.md`, 5b-5). La memoria (`shared/lib/memoria-de-lectura.ts`) vale 60 s (no había un valor fijado para catálogos), comparte la lectura en camino (el doble clic, o el clic tras el puntero, hacen un solo pedido de cada uno), no guarda un fallo y la tiran `crear`, `guardar`, `mover` y `eliminar` de orígenes y tipos al terminar, y un alta rechazada porque un origen o un tipo se apagó mientras se escribía (antes lo hacía un `router.refresh()`).

| Medida                                          | Antes         | Ahora         | Presupuesto |
| ----------------------------------------------- | ------------- | ------------- | ----------- |
| JS en frío `/perfil` (gzip)                     | 413,1 KB      | 413,4 KB      | 440 KB      |
| JS en frío `/leads` y `/vehiculos`              | 498,6 y 467,7 | 498,8 y 467,0 | 530 y 500   |
| Tarea de oro 1 (de `N` al lead guardado), robot | 1,5 s         | 1,4 s         | KLM ≤ 25 s  |

**Lo que no baja es el JS en frío:** el código del drawer ya iba diferido, y el esqueleto, la espera y la memoria suman ~0,3 KB al shell. Ningún presupuesto de JS se toca. La tarea de oro mide 4 teclas de control y KLM 18,3 s, los mismos; `abrirConN()` ahora espera además el foco en «Teléfono principal», porque el drawer se abre antes de tener el formulario.

### 5b-1 y 5b-2, medidos con cajas (al 200 %, celular de 412 px)

- **5b-1, el buscador de la barra:** el botón medía 72 px de alto (`h-9` en rem) y su «Buscar» se veía «B…»; ahora 44 × 44 px con el nombre «Buscar», y desde 24 rem de interior de barra (384 px a 16 px, el `@container` descuenta el relleno), el icono y «Buscar» entero. `sinTextoCortado()` recorre cada elemento con texto de la barra (`scrollWidth <= clientWidth`) también con la barra justo en 24 rem y un píxel menos.
- **5b-2, el kanban:** una tarjeta pedía 411 px a una columna de 348 (el pie: «Mover a…» 192 px + «⋯» 44 + la fecha) y las pistas `auto` de cuatro grillas encadenadas empujaban la página a **475 px**; con `minmax(0,1fr)`, `min-w-0`, el pie que se parte y el nombre del lead cortado con «…», `sinScrollHorizontal()` pasa sin tarjetas, con una, con diez, con un nombre de 80 letras y con un vehículo de título largo, y en el listado, el inventario y las dos papeleras.

## Cierre 5b-fix-2: «Nuevo lead» es un solo drawer (2026-10-19)

Tres cosas sin cambio en la base. Los números son de la app compilada (`.next-e2e`), escritorio y celular (Pixel 7).

### 5b-6 · montajes y entradas animadas del drawer «Nuevo lead» (`e2e/leads-alta-un-drawer.spec.ts`)

Un observador cuenta las hojas del drawer que entran al documento (montajes) y las transiciones de entrada (`transitionrun` de su desplazamiento u opacidad que no son de salida). Idéntico en escritorio (clic sin hover previo) y en celular (un toque); la lectura de `lead_alta_contexto` y `leads_campos` retrasada con `page.route`.

| Caso                          | Antes (montajes / entradas)  | Ahora                        |
| ----------------------------- | ---------------------------- | ---------------------------- |
| lectura 150, 400 y 1.500 ms   | 3 / 0                        | **1 / 1**                    |
| un 500 y «Reintentar»         | 3 / 0                        | **1 / 1**                    |
| red caída                     | 2 / 0                        | **1 / 1**                    |
| doble toque o doble clic      | 3 / 0                        | **1 / 1**                    |
| cerrar y reabrir mientras lee | 4 / 1 (celular y escritorio) | **2 / 2** (una por apertura) |

Una sola lectura (un pedido de cada) en todos. El JS en frío no cambia (`presupuesto-js`, en verde dentro de 530, 440 y 500 KB: el `<Drawer>` ya viajaba en el shell por la espera). La tarea de oro 1: 1,4 → 0,7 s del robot en el dirigido y 1,2 s en el Nivel 2 (el reloj del robot es un tope, no una medida fina), 4 teclas, KLM 18,3 s. Nivel 2 del cierre: 538 en verde, 16 saltados, 0 fallos, 20,3 min.

### 5b-4 · la tarea de oro 4 (`e2e/leads-portal-acceso.spec.ts`)

|                                               | Escritorio | Celular   |
| --------------------------------------------- | ---------- | --------- |
| Teclas de control (31 son Tab)                | 32         | 31        |
| KLM (0,28 s por tecla, 3 decisiones a 1,35 s) | 13,0 s     | 12,7 s    |
| Robot                                         | 2,2–2,3 s  | 1,2–1,7 s |
| Clics                                         | 0          | 0         |

### 5a-13 · «Rol a la vista»

Tabla de ramas del celular de «Cierre 5a-fix-3», fila actualizada: 0 → 1 prueba. El comparador de anchos la da DISTINTO (paso 8).

## Cierre 5a-fix-4: las lecturas en volumen (2026-10-19)

Cinco lecturas que crecían con N o estaban cerca de su techo (`docs/PLAN.md` 5a-5 a 5a-9). Mismo método de `db:medir:volumen`: como `authenticated`, plan genérico, mediana de 5 corridas, con 62.000 y con 212.000 leads (`shared_buffers` 128 MB); el «antes» es la base de `HEAD` (`8fa92d9`) con un arnés aparte que mide lo que la guarda no medía (la supervisora, la etiqueta de la dueña en «míos», el texto y el rango sobre un campo público, los términos cortos, el kanban con tres corridas), y el «después», la guarda con lo nuevo. **La máquina no estaba quieta** (un juego abierto usaba un núcleo: carga 2 a 3,7, anotada en cada corrida): las comparaciones son siempre en las mismas condiciones y una falla por carga se mide otra vez aparte. Los números del PLAN se reprodujeron todos con diferencias de ±25 %: supervisora 81,9 (75,8), kanban 69–71 con una corrida de la guarda en 100,9 (67–111), etiqueta de la dueña 88,6 (83,3) y sin resultados 378,7 (368), la de Ana 66,1 (64,3), texto sin resultados de la dueña 130 y 200,7 (118,2), términos cortos 139 a 217 (156–255).

### 5a-8 · el nombre se busca con 3 letras o dígitos seguidos

Lo que cuesta pedirle a la base un término sin tramo de 3 (los dos pasos, ms; `x`, `zq`, `a_b` y `%` dan lo mismo): la dueña «todos» 54,4 → **no se pide** (62.000) y 217,2 → **no se pide** (212.000), «míos» 35,5 y 138,9, Berta 16,9 y 69,4, Ana 6,1 y 25,8, la «chica» 0,5. Con 1 o 2 caracteres la app ya no pide nada por nombre: **0 pedidos al servidor** con 1 y con 2 caracteres (`e2e/leads-listado-busqueda-minima.spec.ts`, los dos proyectos, al 100 % y al 200 %); el campo dice «Escribe al menos 3 letras» en un solo renglón sin cortarse. Con 3 o más, el escaso (`zqx`, `zzzzqx`) sigue donde estaba y ahora se asserta ≤ 50 ms para las cuatro personas: dueña «míos» 9,8 → **11,6** y 10,8 → **12,1**, «todos» 5,5 → **6,3** y 5,5 → **6,5**, Ana 6,7 → **7,9** y 12,0 → **14,3**, Berta 12,1 → **13,4** y 12,2 → **13,6**, la «chica» 0,5 → **0,7** y 0,5 → **0,8** (la diferencia es la carga de la máquina: la función no cambió). Importar 500 filas con ≈ 124.000 de `actividad` sigue en **1.022,6 ms** (62.000) y **1.186,6** (212.000), razón 1,0 (tope 2 s); una primera corrida justo después de sembrar dio 3.020 ms y 1,53 veces, y en aislado, dos veces, 1.070 y 1.005 ms. **La regla** es la de la base, `[[:alnum:]]{3}` de `_leads_candidatos_indexable()`, y no «3 caracteres»: `a_b`, `% %` o `a b c` tienen tres caracteres y ningún tramo, y caminarían la cartera igual. `busqueda-volumen.sql` compara la regla de JS (`[\p{L}\p{Nd}]{3}`) con la de Postgres sobre 21 textos (ñ, tildes, otros alfabetos, `²³¹`, que JS contaba y la base no: de ahí `Nd` y no `N`).

### 5a-5 · «míos» de quien ve «todos» y tiene pocos leads propios

`leads_cartera_corta()` (cuenta hasta 5.000 filas vigentes por `leads_asesores_usuario_vigente_idx` y dice sólo sí o no). **La supervisora (3 propios), página de 101 filas:** 62.000 25,2 → **5,4** ms; 212.000 81,9 → **5,3** (el plan deja de caminar `leads_listado_idx` entero —descartaba 200.000 filas— y camina `leads_asesores_listado_idx`). Su campo privado sin resultados 21,4 y 77,1 → 1,3 y 1,4; una etiqueta que nadie tiene 14,7 y 76,8 → 1,1 y 1,2. **El cruce, con una persona de «todos» y carteras de 3, 500, 2.000, 9.489 (Ana), 27.611 (Berta) y 79.994 (la dueña); por `leads_vista` / por `leads_cartera_vista`, ms con 212.000:**

| Cartera           | Página 1        | Campo privado sin resultados | Etiqueta que nadie tiene | Lee por    |
| ----------------- | --------------- | ---------------------------- | ------------------------ | ---------- |
| 3                 | 81,9 / **5,3**  | 77,1 / **1,4**               | 76,8 / **1,2**           | la cartera |
| 500               | 37,0 / **23,0** | 111,5 / **37,1**             | 78,6 / **4,5**           | la cartera |
| 2.000             | 27,2 / **22,4** | 211,0 / **144,1**            | 82,1 / **13,6**          | la cartera |
| 9.489 (Ana)       | 23,4 / 22,7     | 705,0 / 674,4                | 108,8 / **63,1**         | igual      |
| 27.611 (Berta)    | 21,8 / 21,7     | **1.896,2** / 1.967,6        | **152,3** / 175,3        | la vista   |
| 79.994 (la dueña) | 21,0 / 22,1     | **5.139,0** / 5.509,6        | **368,0** / 586,5        | la vista   |

Con 62.000 el cruce está antes (Berta, 6.610: campo privado 484,5 / 492,4, etiqueta 32,1 / 41,4; Ana, 2.288: 182,3 / 171,0 y 21,1 / 15,5), porque la fracción de la tabla que cruza se parece al 10 %. **T = 5.000:** en ninguno de los dos volúmenes empeora nadie con una cartera de hasta 5.000 (los 2.000 y los 500 mejoran), y quien tiene más sigue donde estaba. La dueña (40 %) **no cambia de ruta**, así que su campo privado no empeora: 5.139 (la ruta de siempre, con 212.000). Lo asertado (`medir-escala.sql`): la supervisora «míos» y «todos» con los presupuestos de la «chica» (página 1 ≤ 30 ms, cursor ≤ 150, ≤ 3.000 descartes), con 62.000 y 212.000: **5,6 y 5,7 ms** «míos», 25,8 y 25,5 «todos» (la vista de siempre: su cartera no entra). Costo de escribir: ninguno (una función; sin tabla, trigger ni índice nuevo).

### 5a-7 · la etiqueta por los candidatos

`leads_candidatos()` suma `etiquetas`; sólo cuentan las de quien llama (una ajena, una inexistente o una mal escrita contesta `{ids: [], completa: true, hasta: null}` sin recorrer nada) y el índice es el de la FK, `leads_etiquetas_etiqueta_id_idx`, que ya existía. Los dos pasos (candidatos + página) contra la vista de siempre, ms:

|                                                                              | 62.000 antes → después | 212.000 antes → después                                          |
| ---------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------- |
| Dueña «míos», una etiqueta propia (1.667 leads)                              | 149,6 → **24,8**       | 88,6 → **33,0**                                                  |
| Dueña «todos», una etiqueta propia                                           | 75,7 → **24,3**        | 79,6 → **33,2**                                                  |
| Dueña «míos», una etiqueta que nadie tiene                                   | 82,9 → **0,4**         | 378,7 → **0,4**                                                  |
| Dueña «todos», una etiqueta que nadie tiene                                  | 171,1 → **0,4**        | 700,8 → **0,5**                                                  |
| Ana, la etiqueta de la guarda de «míos» (ningún lead la tenía en la siembra) | 15,6                   | 66,1 (64,3 de 100); la guarda ahora usa una con 300 de sus leads |
| Ana, una etiqueta en 300 de sus leads                                        | —                      | **25,4**                                                         |
| Ana, una etiqueta que nadie tiene                                            | 15,5 → 0,4             | 64,5 → **0,4**                                                   |
| Berta, una que nadie tiene                                                   | 41,8 → 0,4             | 176,3 → **0,4**                                                  |
| Ocultos con una etiqueta, hasta 51 (dueña / Ana)                             | 7,0 / 1,0 → 5,2 / 2,1  | 28,7 / 2,6 → 20,4 / 4,2                                          |

**Cuánto bajó la guarda de «míos» de Ana:** la fila de 64,3 ms medía una etiqueta que ningún lead tenía (por la vista recorría su cartera entera: 66,1 con 212.000); por los candidatos esa etiqueta cuesta **0,4** (una que nadie tiene) y la guarda mide además una etiqueta que sí tiene 300 de sus leads, **25,4** (el caso que antes no se medía): **de 64,3 a 25,4 ms en el caso con resultados, y a 0,4 en el vacío**. **El plan** de la etapa de índice para Ana: `Index Scan Backward using leads_pkey` con `Index Cond: id = ANY (InitPlan 1)`, el `InitPlan` por `leads_etiquetas_etiqueta_id_idx` (1,3 ms); antes, `leads_listado_idx` con una subconsulta de etiquetas por fila. **Dos cosas que salieron al medir:** (1) con las estadísticas de `leads_etiquetas` atrasadas (una etiqueta recién puesta) la etapa de recorrido sondeaba `leads_etiquetas_etiqueta_id_idx` por fila y llegaba a 147 ms: una etiqueta con S (4.000) leads o menos va directo al índice (121 → 24 ms en la guarda); (2) el lead que llega por su número (`extra`) también tiene que tener la etiqueta, porque la página ya no la repite (repetirla arma el `Nested Loop` de 88 ms contra 21 de 5a-fix-1b). **Límite:** una etiqueta puesta sólo en los 40.000 leads más viejos de la dueña (la ventana de 4.000 no encuentra nada y va al índice con 40.000 ids) cuesta **138 ms** (382 antes); una puesta en todos los suyos, 38,3 (66,8 antes). Los ocultos y la exportación siguen por la consulta de siempre con una etiqueta (20,4 ms la dueña): no hizo falta llevarlos a los candidatos. **Huella:** `busqueda-volumen.sql`, 180 comparaciones de filas enteras iguales con 212.000 (66 con filas) y `busqueda-leads.sql` en PGlite. Costo de escribir: ninguno (sin índice nuevo).

### 5a-9 · texto y rango sobre un campo público: **abierto**, sin arreglo

Medido en la guarda (sin asertar), con 62.000 y 212.000: la dueña «todos» texto sin resultados **49,9 y 204,9**, «míos» 33,2 y 132,6, rango de texto sin resultados 20,2 y 78,2 («todos») y 19,8 y 74,8; Ana 10,2 y 44,3 / 14,7 y 57,1; Berta 27,6 y 122,1 / 14,5 y 59,8; la «chica» 1,1 y 1,2 / 13,1 y 55,1. **No pasa el assert del PLAN (≤ 50 ms con 212.000):** el mecanismo es el de 5a-8 —un recorrido de la cartera con `ilike` o `>=` sobre `->>` en cada fila, ~1 µs por lead— y lo único que lo evita es un índice sobre esa expresión, que es por clave. **Qué se probó** (prototipo en la base local, no aplicado): llevar las tres condiciones a `leads_candidatos()` sin índice: la «chica» 52 → 0,7 ms en el rango, Ana 41–55 → 21–28, **la dueña «todos» 205–211 (igual), «míos» 75 / 138, Berta 58–78** (no mejoran); con un btree y un trigram sobre `(atributos_publicos ->> 'ciudad_vol')` (212.000 leads: 0,16 y 0,21 s, 1.368 kB y 1.032 kB): la dueña «míos», texto de 3 letras sin resultados **74,6 → 0,7 ms** y rango **17,0 → 0,6**, pero la dueña «todos» (205), Berta (75) y un texto de 1 carácter (138) no cambian: el planificador sigue caminando la cartera, porque la etapa I elige el recorrido sin tope cuando la condición no cuenta como indexable. **Costo en escritura de esos dos índices:** importar 500 filas con ≈ 124.000 de `actividad` 1.162 ms contra 1.179 y 1.177 sin ellos, pero la importación no trae ese campo (el índice sólo guarda `NULL`); con el campo lleno el trigram cuesta lo de los n-gramas de 5a-8 (500 altas ×2,5). **Lo que hace falta y no es de esta tarea:** DDL por clave al volver filtrable y público un campo (`CREATE INDEX` no corre en una transacción ni sin bloquear escrituras), saber qué clave tiene índice y guiar a la base hacia él, y el costo de escribir en todo `INSERT`/`UPDATE` de `leads` con ese campo. La decisión es de la persona (`docs/DECISIONES.md`, «Cierre 5a-fix-4»): o 5a-9 se aplica con ese índice por clave y su costo en la baja de 200.000 y en la importación, o el filtro de texto exige también 3 letras (como el nombre) y el rango queda con su límite escrito.

### 5a-6 · la policy de `oportunidades`

`lead_id = any((select _mis_leads_vivos())::uuid[])` armaba el arreglo de los 80.000 leads vivos de la cartera de la dueña (un `InitPlan`: **49,5 ms y 4.365 buffers**) y después un `Bitmap Index Scan` de `oportunidades_lead_id_idx` con esos valores leía sus 10.000 oportunidades y las ordenaba para quedarse con 51. Ahora `_lead_vivo_en_mi_cartera(lead_id)` pregunta por cada una que sale (migración `…20261019003600`; `_mis_leads_vivos()` se borra: nadie más la usaba). **El plan, `EXPLAIN (ANALYZE, BUFFERS)` de la primera página de una columna, la dueña con 212.000 leads:** `Limit → Sort (top-N) → Bitmap Heap Scan on oportunidades (Recheck Cond: lead_id = ANY (InitPlan 3); 8.333 filas, 4.655 buffers) → Bitmap Index Scan on oportunidades_lead_id_idx (10.000 filas)` **→** `Limit → Index Scan using oportunidades_tablero_idx (Index Cond: usuario_id = …, etapa_id = …; Filter: _lead_vivo_en_mi_cartera(lead_id)), 51 filas, 420 buffers`. Ms (la dueña, tres corridas seguidas y lo que usa la pantalla):

|                                                   | 62.000 antes → después       | 212.000 antes → después                                                                     |
| ------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------- |
| Primera página de una columna, corridas 1 / 2 / 3 | 19,0 / 19,1 / 19,0 → **1,2** | 71,2 / 69,9 / 68,9 (una corrida de la guarda: 100,9) → **1,1 / 1,1 / 1,2** (la guarda: 1,4) |
| «Ver más» de una columna                          | 19,0 → 1,2                   | 67,9 → 1,3                                                                                  |
| El total acotado de una columna (hasta 501)       | —                            | 78,0 → 9,1                                                                                  |
| `embudo_tablero` (6 columnas)                     | —                            | 410,1 (442,9) → **63,0** (54,8)                                                             |
| Buscar en el embudo, sin resultados               | —                            | 473,8 → 379,1 (444,2 en la guarda)                                                          |
| `lead_oportunidades` de la ficha                  | —                            | 72,0 → 1,4                                                                                  |
| Tablero de Ana                                    | —                            | 92,6 → 26,8                                                                                 |

**Qué se probó antes de elegir:** (P1) conservar el arreglo pero armarlo desde las oportunidades de quien mira (10.000 valores, no 80.000): 78,6 → 58–72 ms, el plan no cambia (sigue el `Bitmap Index Scan`); (P2) la pregunta por fila: 1,1 ms y el plan nuevo; con `cost 20` en la función, lo mismo. **La visibilidad no cambió:** `oportunidades-policy.sql` compara lo que entrega la policy con la regla escrita a mano por persona (A, B, la que se va, la de «todos», la sin `leads.ver`), con la papelera, el limbo, el acceso revocado, una oportunidad eliminada y la de un lead que la dueña ya no ve, y la RPC contesta lo mismo que de una inexistente; con la función sin `revocado_en is null` o sin `l.eliminado_en is null` la prueba cae nombrando a quién se le filtra de más. La guarda ahora asserta la forma (`oportunidades_tablero_idx`, sin recorrer `oportunidades`, ≤ 200 descartes) y baja los tres presupuestos de la columna de 100 a 25 ms.

### Costo en escritura

Ninguna de las migraciones nuevas agrega un índice, un trigger o una columna (`…003400`, `…003500` y `…003600` son funciones y una policy): lo que cuesta escribir no cambia. La guarda de `db:medir:volumen` pasa entera con las dos tamaños: importar 500 filas ≤ 2 s (1.022,6 y 1.186,6 ms), la baja de 200.000 (la llamada 456,2 ms, la corrida más larga 1.850,0, 10 corridas del job y 15,3 s con la máquina cargada; antes de este cierre, 9 corridas y 14,4 s), los jobs. El único costo medido de un índice es el del experimento de 5a-9 (arriba), que no se aplicó.

### JS en frío de `/perfil` (pendiente del 5b-fix-2)

Medido con `e2e/presupuesto-js.spec.ts` (Playwright con el reporter JSON, sobre el build de `.next-e2e` del Nivel 2, después del último cambio de código y de la última migración): **`/perfil` 413,9 KB con gzip en 24 chunks** (presupuesto 440; el 5b-fix lo dejó en 413,4 y el 5b en 413,0: +0,5 KB que no se atribuyó a nada concreto), **`/leads` 499,6 KB** en 31 chunks (530; antes 498,6: +1,0 KB, probablemente `cumpleElMinimo()` y la línea de aviso del campo de búsqueda, que `FilterShell` lleva a todo listado) y **`/vehiculos` 467,6 KB** en 29 chunks (500; antes 467,7). Ningún presupuesto cambió. El documento de `/perfil` (HTML con el payload RSC, sin comprimir): **79.288 bytes** con la semilla y con 100 orígenes y 100 tipos, 0 de diferencia (79.287 en el 5b-fix).

## La rueda por rol: preguntar por el rol al repartir (2026-10-21)

`web.solicitar_asesor` y `web_expirar_solicitudes` evalúan ahora, por cada candidata de la cola, `puede_estar_en_la_rueda()` (cuenta activa y sin bloqueo, y `web.cola.participar` por alguno de sus roles: una bajada por `usuarios_roles_pkey` y por `roles_permisos_rol_clave_idx`). `docs/DECISIONES.md`, 2026-10-21. **Qué se midió** (`supabase/tests/medir-rueda.sql`, dentro de `pnpm db:medir:volumen`; una transacción que se revierte, con 62.000 leads sembrados que la rueda no lee): 500 personas en la cola (3 roles cada una, 60 roles con 30 permisos, 15 de ellos con el permiso), 50.000 solicitudes (5.000 abiertas) y luego 200.000 (las mismas 5.000 abiertas); mediana de 5 corridas, ms.

| Qué                                                        | 50.000 solicitudes | 200.000 solicitudes | Presupuesto |
| ---------------------------------------------------------- | ------------------ | ------------------- | ----------- |
| La elección de la rueda (el paso 5, con la regla)          | 15,0               | 15,5                | 40          |
| La misma elección **antes** de la migración (sin la regla) | 7,1                | 7,4                 | (informa)   |
| `puede_estar_en_la_rueda()` sobre las 500 de la cola       | 8,2                | 8,3                 | (informa)   |
| `estado_cola_web` (la lista, con la regla)                 | 9,6                | 9,6                 | 40          |
| `web.solicitar_asesor`, promedio de 50 llamadas completas  | 15,5               | 15,5                | 60          |
| `web_expirar_solicitudes(20)`: 20 vencidas y reasignadas   | 357,6              | 367,3               | 800         |

- **Lo que cuesta la regla:** ≈ 8 ms con 500 personas en la cola (16 µs por persona: dos consultas por clave). **No crece con las solicitudes** (la razón con 4 veces las solicitudes es ≤ 1,1; el assert pide ≤ 1,5 con 3 ms de piso) ni con los leads: lo que crece es la cola, y una cola de cientos de asesores es el techo del negocio. `web_expirar_solicitudes(20)` son 20 reasignaciones de 18 ms cada una; el job (cuando se programe, Fase 8) corre cada 5 minutos y la llamada de un visitante sólo trae 20.
- **El plan** se asserta: las abiertas de cada persona se cuentan por `solicitudes_web_asesor_abiertas_idx` y nunca se recorre `solicitudes_contacto_web`. Sin índice, trigger ni columna nuevos: la regla se apoya en índices que ya estaban.
- **Las corridas sueltas** (tres, sobre la base de la semilla, antes de sembrar volumen) dieron 14,1 a 18,6 ms la elección con la regla y 8,9 a 10,7 sin ella: ±2 ms de una corrida a otra. La tabla es la corrida de `db:medir:volumen` con 62.000 leads.
- **La máquina:** carga 1,4 a 1,5 de 8 al empezar y al terminar (el navegador abierto, Brave, con varias pestañas; ningún juego), disco 0,9 % y CPU 0,0 % (`db:medir:volumen` la anota); sin checkpoints durante la medición (`checkpoints +0`) ni autovacuum activo.
- **Qué no se mide y por qué:** cada llamada de `solicitar_asesor` escribe (una solicitud y el renglón de la persona) y dentro de una sola transacción esa escritura miente (`docs/RENDIMIENTO.md`, cierre 5a: una transacción por lote). Los 15,5 ms sirven para ver que no dependen de las solicitudes viejas, no como el costo de una escritura real.

## Cierre de defectos de la rueda: 5a-15, 5a-16, 8-2 y el panel de filtros (2026-10-21)

Nada de esto crece con el número de leads (una lista de 72 permisos, una elección de «ítems por página», una llamada a `solicitar_asesor`, un corte de ancho), así que no hay medición con volumen sembrado: lo que se midió es **qué pasa y cuándo**. `docs/DECISIONES.md`, 2026-10-21.

- **5a-15 — «ítems por página» con una navegación pendiente, 480 corridas, 0 fallos.** Escenario: segunda «Siguiente» y elegir el tamaño enseguida (o tras la fila de la página 3), en leads (25) y vehículos (50). Latencia sumada a toda lectura RSC (los adelantos también) y CPU ×6 por CDP; «Final» = la primera página con el tamaño nuevo, la URL con `por=` y sin cursor, el selector en lo elegido:

  | Condición                                                                            | Corridas por caso | Casos | Fallos |
  | ------------------------------------------------------------------------------------ | ----------------- | ----- | ------ |
  | 300 y 1.000 ms, escritorio y celular, leads y vehículos, con y sin esperar a la fila | 10                | 16    | 0      |
  | 0, 50 y 120 ms, escritorio, leads y vehículos                                        | 20                | 12    | 0      |
  | CPU ×6, eligiendo al llegar la lectura de la página 3, escritorio                    | 20                | 4     | 0      |

  **La traza del fallo del 2026-10-19** (`e2e-fallos/2026-10-19_19-18`, el POST y las lecturas con su hora): la segunda lectura de cursor empezó en 2.681 ms y **respondió en 6 ms**; el POST de la preferencia salió en 2.729 (+17 ms) y ningún GET con `por=` lo siguió. La corrida con CPU ×6 da la misma forma (POST 76 ms tras la respuesta) y termina bien. **El estrés que queda** (`E2E_ESTRES=1`, 20 corridas por modo y lista): con el guardado a 3 s y las lecturas a 1 s, el modo `latencia` tarda 2,2 min (leads) y 2,1 (vehículos) en escritorio; el modo `cpu` 0,8 y 0,9 min (medidos con el guardado sin demora: 8 pruebas, 7,7 min con los dos proyectos); ≈ 6 min por proyecto, una vez al cerrar una tarea que toque `shared/ui/filtros` o la preferencia. **Cae con la mutación** (`aplicar(tamano)` a la vez que el guardado): la URL ya trae `por=` mientras el guardado está en vuelo.

- **5a-16 — la matriz de Roles al 200 % en 412 px** (`document.documentElement.style.fontSize = '200%'`):

  |                                                                 | Antes        | Después       |
  | --------------------------------------------------------------- | ------------ | ------------- |
  | Filas con el control fuera de la vista (de 72)                  | 72           | 0             |
  | Borde derecho del interruptor                                   | 465–497 px   | dentro de 412 |
  | Borde derecho del permiso por origen                            | hasta 564 px | dentro de 412 |
  | Ancho de la página con un rol de 80 letras                      | 935 px       | 412 px        |
  | Escritorio al 200 % (1.280 px), filas con el control a la vista | 72 de 72     | 72 de 72      |

  Medido con la prueba (`aLaVistaSinDesplazar()`: las doce primeras filas y la última, nombre y control) y, para las 72, con un recorrido aparte. Las otras listas de Configuración, medidas igual: la lista del equipo deja el «⋯» en x = 862 (5a-17), Empresa y la ficha de un origen ensanchan la página a 579 y 494 px (5a-18), y la matriz en escritorio mide 4.012 px en 686 (5a-19).

- **El panel de filtros al costado — ancho del contenedor del listado, en rem** (`[data-barra-de-filtros]` y su padre):

  | Pantalla | 100 % | 125 % | 150 % | 200 % |
  | -------- | ----- | ----- | ----- | ----- |
  | 1.024 px | 45,5  | 32,7  | 24,2  | 13,5  |
  | 1.100 px | 50,3  | 36,5  | 27,3  | 15,9  |
  | 1.280 px | 61,5  | 45,5  | 34,8  | 21,5  |
  | 1.440 px | 71,5  | 53,5  | 41,5  | 26,5  |
  | 1.920 px | 101,5 | 77,5  | 61,5  | 41,5  |

  Corte en **40 rem** (panel 15 + hueco 1 + 24 para la lista): al costado en 1.024 al 100 %, 1.280 al 100 y al 125 %, 1.440 hasta el 150 %, 1.920 hasta el 200 %; hoja el resto. **Antes → después, a 1.280 px al 200 %:** panel de 480 px y lista de **176** (celda del nombre de 512, a la vista ~100) → hoja de filtros y lista de **688** con el nombre entero (472/472). Un cambio de lo que se ve al 125 % a 1.100 px y al 150 % a 1.280 px (antes al costado con la lista de ~20 rem).

- **8-2** — sin medición: una línea (`returning * into s`) en una llamada que ya hacía el `update`.
- **Verificación:** Nivel 2 (`pnpm test:e2e:completo --project=escritorio`, después del último cambio de código): **555 en verde, 16 saltados, 0 fallos, 21,6 min**; la carga de la máquina fue de 5 a 9 de 8 durante la corrida (el navegador de la persona abierto, Brave con varias pestañas; ningún juego), más alta que en el Nivel 2 de la rueda por rol (20,6 min) sin que lo notara ninguna prueba.

## Configuración de leads: tipos de seguimiento, iconos y origen por defecto (2026-10-21)

`docs/DECISIONES.md`, 2026-10-21. Lo que cambia con el volumen es la lectura del alta (ahora con tres catálogos acotados) y el listado, que dibuja dos iconos por fila.

- **La lectura del alta no crece con los leads** (`pnpm db:medir:volumen`, los tres catálogos al tope de 100):

  | Consulta                                                         | 62.000 leads | 212.000 leads |
  | ---------------------------------------------------------------- | ------------ | ------------- |
  | `lead_alta_contexto()`                                           | 1,1 ms       | 1,1 ms        |
  | `tipos_seguimiento_con_uso()`                                    | 1,0 ms       | 1,0 ms        |
  | la sonda `con_seguimientos` de un tipo (`seguimientos_tipo_idx`) | 0,1 ms       | 0,1 ms        |
  | `leads_catalogos()`                                              | 0,8 ms       | 0,8 ms        |

- **Bytes de la respuesta del alta** (`e2e/leads-alta-contexto.spec.ts`, sin comprimir): semilla 1.664 B; con 100 + 100 + 100 y los nombres del e2e **30.530 B** (< 40 KB). Sin recortar `clave` e `icono` (el alta es de `<select>` y no los dibuja) eran ≈ 47 KB; la importación toma las claves de `leads_catalogos()`.
- **Listado de 100 filas** (la dueña): **3.037 nodos en escritorio y 3.124 en celular**, 41.620 B comprimidos (presupuestos 3.500 y 48.000). La cifra de antes de la tarea era 2.597; con el SVG de lucide en línea el celular llegaba a **3.515** (más que el presupuesto), por eso las filas dibujan un símbolo compartido (`<use href>`, 2 nodos por icono en vez de ~3,5) y la página monta sólo los de las claves que usa.
- **JS en frío** (`e2e/presupuesto-js.spec.ts`, con gzip): `/leads` 499,6 → **503,5 KB** (presupuesto 530), `/perfil` 413,9 → **413,5** (440), `/vehiculos` 467,6 → **468,6** (500). El catálogo (24 trazos) cae en los chunks de leads; el shell y el alta no lo importan (guarda).
- **Documento de `/perfil`:** 80.751 B con la semilla y con 100 + 100 + 100 (diferencia **0**; presupuesto 82 KB, que se cumple). El 79.288 B registrado en el cierre 5b-fix-2 es 1.463 B menor y **esa diferencia no se atribuyó**: no depende de los catálogos ni de los iconos (la cifra es la misma con y sin ellos), pero no se pudo medir `344d788` para saber si ya estaba (`git worktree add` fue denegado y no se corrió Playwright después del Nivel 2). Queda como `docs/PLAN.md`, 5b-8.
- **Mutaciones:** 18 sobre el SQL de la migración, en todas cae la prueba que debe; con dos conexiones (`db:carreras`), el candado de crear, el `for share` de `seguimiento_tipo_vigente`, el índice único del por defecto y el candado de `origen_lead_guardar` caen; el de `tipo_seguimiento_mover` no (`docs/PLAN.md`, 5b-7).
- **La suite:** el Nivel 2 (sólo escritorio) con el código final, **579 en verde, 16 saltados, 0 fallos, 22,7 min** (la primera corrida, 22,2 min, dio 2 fallos de la misma causa, corregida; ver BITACORA). Abiertos durante las corridas: Steam, Brave, VS Code, Claude desktop, Obsidian y Docker; carga de 3 a 5 sobre 8 núcleos.

## La lista del equipo con tope: 5a-21 (2026-10-22)

`getEquipo` leía `perfiles` entera y la lista filtraba en el navegador; `max_rows` = 1.000 la cortaba en silencio desde la persona 1.001 y el buscador no la encontraba. Ahora la lista dibuja las 100 primeras por nombre, lo dice con `<AvisoDeTope>` y el texto y el estado se resuelven en la base (`equipo_lista()`, `…004100`). Medido sin cronómetros: bytes, plan y nodos.

- **Antes, con 1.050 personas en HEAD (`bc832f4`):** la página dibujaba **999 filas** (la persona 1.001 no salía ni buscándola), **15.157 nodos** en escritorio y 14.148 en celular, un documento de **3.564.280 B** (90.117 B comprimidos; 2.645.686 y 81.963 en celular) y una lectura de 1.000 filas de **334.111 B** de JSON con un `Seq Scan` de `perfiles` y su `Sort` (2.040 buffers).
- **Después:** 100 filas, **1.673 nodos** en escritorio y 1.563 en celular, documento de **444.549 B** (25.576 B comprimidos; 351.287 y 24.210 en celular) y una lectura de 101 ids. El presupuesto de nodos es el de la lista de 100 leads (3.500).
- **Dos etapas, no una consulta** (como `leads_candidatos`): con una sola `order by … limit 101` y el término común «maria», el planificador caminaba el índice del orden y leía **49.102 filas de 100.000** (49.843 buffers, 181 ms) porque las María vienen después de las Ana, las Carla y las Elías. (W) recorrer las primeras 2.000 del estado, de a una, cortando al juntar 101 (**105 buffers** con un término en todas, **2.032** si no aparece nada); (I) si no, el trigram, que cuesta lo que coincide (98 buffers un término raro; 731 «núñez ana»). La recorrida es perezosa a propósito: con `count(*)` sobre sus 2.000 filas costaba 2.031 buffers aunque encontrara las 101 en las primeras. Con `S` = 2.000 la peor búsqueda cuesta `S + 101 · N / S` filas, mínimo en `S` = raíz de 101 · N (3.200 con 100.000).
- **Sin tramo para el trigram** (un texto de menos de 3 letras o dígitos): sigue recorriendo el orden. Si además no coincide con nadie («zq») recorre todo: **172 ms con 100.000** y crece con la tabla. Un equipo de cientos de miles lo siente sólo en ese caso; se aceptó entonces y hoy tiene entrada: **5a-31** (`docs/PLAN.md`, Fase 4: la búsqueda del equipo exige 3 caracteres, como la de leads).
- **Cada etapa asserta su plan** (`supabase/tests/medir-equipo.sql`, en `pnpm db:medir:volumen`): el índice que usa, que no hay `Seq Scan`, sus buffers y las filas del índice del orden que lee la recorrida (≤ 121). Con 10.000 y con 100.000 personas el costo de «sin texto» y del trigram raro no crece (hasta 1,5 veces y un piso de 60 buffers). Las medidas con 10.000 no exigen el plan: ahí el planificador puede preferir la tabla (2.000 es el 20 % de ella).
- **Lo revertido deja tuplas muertas:** 100.000 filas insertadas y revertidas hacían que el escaneo sólo de índice visitara el heap por cada una (1.106 visitas en vez de 101), así que la medición hace `vacuum` de `perfiles` antes y después.
- **Índices nuevos:** `perfiles_vigentes_orden_idx` (nombre, correo, id; donde activo), `perfiles_estado_orden_idx` (estado, nombre, correo, id) y `perfiles_busqueda_idx` (GIN trigram). `unaccent` es `stable`: con su diccionario por nombre se declara `immutable` para el índice; si la extensión cambia sus reglas, `reindex index public.perfiles_busqueda_idx`.
- **`cuentas()` de los e2e** leía `listUsers({ perPage: 1000 })` sin paginar: con 1.051 cuentas dejaba 51 atrás. Ahora pide página por página; las sembradas por `generate_series` se quitan por SQL antes.
- **Interruptor y tarjeta (5a-25):** sin cifras de escala; el cuerpo de `<Bloque>` pasa a `minmax(0, 1fr)` y el interruptor del celular al 200 % queda a 33 px del borde de su tarjeta (0 antes).
- **El Nivel 2** (sólo escritorio) de esta tarea, con la carga y las horas, está en `docs/BITACORA.md` (2026-10-22).

## Paso 4.02: el equipo busca desde 3 letras y Roles cuenta con tope (2026-10-22)

Medido con `supabase/tests/medir-equipo.sql` (en `pnpm db:medir:volumen`), en buffers y filas, no en ms: 100.007 personas sembradas en la transacción y, para Roles, un rol con todas ellas. Las cifras de HEAD (`4113291`) salen del mismo archivo corrido sobre esa base antes del arreglo.

- **5a-31, «zq» por la RPC entera** (explicada como la dueña; el Function Scan suma lo que corre adentro): **4.117 buffers** en HEAD (y devolvía 0 filas: caminaba todo el orden buscando el texto) → **411**, lo mismo que la RPC sin texto (405), porque un texto sin tramo de 3 letras o dígitos ya no filtra. «z» y «ñq»: 416 y 4.091 en HEAD → 405. La consulta que corre es la de sin texto: **106 buffers (≤ 150)**. Lo fijo de la RPC (la sesión activa, dos `tiene_permiso`, armar la consulta) es lo que separa los 106 de la consulta de los 405 de la llamada; con 100.000 filas recién insertadas en `usuarios_roles` dentro de la misma transacción, `mis_permisos()` lee 295 buffers en vez de 18 (igual con y sin el índice nuevo), y por eso la RPC sin texto da 131 en la versión de la medición sin el rol de 100.000 y 405 con él.
- **5a-31, la app:** con 1 o 2 letras, **0 pedidos al servidor** (`e2e/equipo-busqueda-minima.spec.ts`, los dos proyectos, al 100 % y al 200 %); el campo dice «Escribe al menos 3 letras» en un renglón. Hizo falta que `lista-equipo.tsx` no llame a `setParametros` si `q` no cambia: con `q` ya vacío, mandar otra vez `''` hacía un pedido RSC por letra.
- **5a-27, Roles con un rol de 100.007 personas:** el conteo exacto (lo que hacía el embed `usuarios_roles(count)`) leía **100.020 filas** (1.022 a 9.351 buffers según el plan que eligiera) → `roles_personas()` lee **1.001 filas y 24 buffers**. Dos trampas medidas: (1) con un subselect por rol y el plan genérico, el planificador estima personas ÷ roles por rol (50.000 con dos valores), elige recorrer la tabla y, para el rol de la dueña (una persona), la camina entera: 7.492 buffers; con el id como literal mira las estadísticas de cada rol: el chico va por `usuarios_roles_rol_idx` y el de 100.000 recorre hasta juntar 1.001. (2) La medición se revierte y dejaba 100.000 tuplas muertas en `usuarios_roles` por corrida (935, 1.870, 2.804 páginas): ahora hace `vacuum analyze public.usuarios_roles` antes y después, como con `perfiles`.

## 5b-8: el documento de `/perfil` (2026-10-22)

Bytes sin comprimir de `GET /perfil` con la semilla (`e2e/presupuesto-js.spec.ts`, proyecto `escritorio`, build de `.next-e2e` de cada commit, contra la base local de hoy: los commits viejos corren sin problema). Cada punto se midió con `git switch --detach`; el árbol volvió a `master` y limpio.

| Commit                                                                    | Bytes  | Diferencia                                  |
| ------------------------------------------------------------------------- | ------ | ------------------------------------------- |
| `1a88959` (`4a646b5^`)                                                    | 79.288 | — (es la cifra del cierre 5b-fix-2)         |
| `4a646b5` feat(web): decir en el perfil si el rol recibe turnos de la web | 80.751 | **+1.463**                                  |
| `9dc05f7`                                                                 | 80.203 | −548 (entre `4a646b5` y aquí, sin atribuir) |
| `7bbfa50`                                                                 | 80.202 | −1                                          |
| HEAD `9802a30`                                                            | 80.338 | +136 (`12dbba2` y `7f50e0e`, sin atribuir)  |

- **Causa de los +1.463 B:** `4a646b5` agrega a `/perfil` el bloque «Turnos de la web» (`EstadoEnLaRueda`: `<Bloque>` con su título y una frase de `textoDeLaRueda()`). Es contenido de la rueda por rol, no catálogos ni iconos. **No se recorta:** quitarlo ahorraría los 1.463 B pero quita la función; se anota y el presupuesto de 82 KB no se toca (82 KB = 83.968 B; HEAD 80.338 B = 95,7 %, quedan 3.630 B).
- **La premisa del PLAN estaba desfasada:** los 79.288 son de `8fa92d9` (10-19), no de `344d788` (que ya incluye la rueda); por eso no hacía falta medir `344d788`.
- **Lo que queda sin atribuir** son dos oscilaciones menores (−548 y +136 B) entre commits que no tocan lo que `/perfil` importa por su ruta; no se bisecó más porque ninguna acerca el documento al presupuesto.

## Paso 4.03 (5a-10): un campo privado por los candidatos (2026-10-22)

Medido con `EXPLAIN (ANALYZE, BUFFERS)` como la dueña (`authenticated`, plan genérico), mediana de 5 corridas de 7, con 62.000 y con 212.000 leads (`db:sembrar-volumen`, sin y con `-- --leads 200000`; la dueña tiene 20.000 y 80.000 en su cartera, Berta 7.000 y 28.000). La carga de la máquina fue de 2,0 a 4,1 (de 8 núcleos) en todas las corridas, anotada en cada una; el HEAD es `b032595`. Un privado sin resultados, **la página entera** (la ruta de HEAD, por `leads_vista` o `leads_cartera_vista`) contra **los dos pasos** (candidatos y página):

| Persona (cartera)           | Ruta de HEAD, 62.000         | Ahora, 62.000        | Ruta de HEAD, 212.000        | Ahora, 212.000       |
| --------------------------- | ---------------------------- | -------------------- | ---------------------------- | -------------------- |
| dueña (20.000 / 80.000)     | 1.316,8–1.358,1 ms · 228.351 | **15,3 ms** · 16.826 | 5.320,2–5.343,6 ms · 892.348 | **37,9 ms** · 18.737 |
| Berta (7.000 / 28.000)      | 495,2–507,2 ms · 119.103     | **12,2 ms** · 20.399 | 1.989,1–2.021,1 ms · 476.356 | **20,3 ms** · 18.508 |
| Ana                         | 174,6 ms · 40.856            | **6,9 ms** · 9.190   | 690,7 ms · 163.337           | **15,5 ms** · 20.579 |
| la «chica» (3)              | 1,5 ms · 79                  | 0,7 ms · 28          | 1,5 ms · 78                  | 0,7 ms · 26          |
| la de la papelera (503)     | 1,5 ms · 79                  | 2,1 ms · 3.051       | 1,5 ms · 83                  | 2,4 ms · 3.503       |
| la supervisora («todos», 3) | 1,5 ms · 79                  | 0,8 ms · 28          | 1,5 ms · 78                  | 0,7 ms · 26          |

- **La causa, en el plan de HEAD:** `Index Scan using leads_listado_idx` sobre `leads`, con `Rows Removed by Filter: 50.000` (todo lo visible), y el filtro `en_cartera AND atributos_lead(id) @> {…}`. Para los 20.000 leads de su cartera llama a `atributos_lead()`, una función plpgsql `definer` que vuelve a leer el lead por su clave y recalcula `alcance_de()` y `_bajas_en_curso()`: **~11 buffers y ~66 µs por lead** (228.351 ÷ 20.000; 1.316,8 ms ÷ 20.000). Con 212.000 son 80.000 llamadas: los 5.534 ms del PLAN (aquí 5.320–5.344). Crece con la cartera de quien filtra, no con la tabla.
- **El arreglo:** la misma condición dentro de la ventana de candidatos, sobre `leads.atributos` y sólo de la cartera de quien llama (`leads_candidatos()`, clave `privados`): la etapa W recorre hasta 4.000 filas de su cartera por `leads_asesores_listado_idx` (16.000 buffers, una constante) y, si no junta 301, la etapa I lee la cartera por `leads_busqueda_idx` (`Bitmap Index Scan` por `cartera @> {yo}` y el filtro en el heap). Sin índice, trigger ni columna nueva: **el costo de escribir no cambia**.
- **Por qué W y no sólo el índice:** el primer prototipo, sólo la etapa del índice, dejó a Berta con un valor denso en **81,7 ms y 172.340 buffers con 212.000** (con 62.000, 2,3 ms): el planificador estima el `@>` casi vacío, camina `leads_listado_idx` entero y descarta lo ajeno. Con W corta al juntar 301: 10,7 ms el paso 1 y 31,7 los dos pasos.
- **Lo que sigue creciendo, con su número:** con un valor raro la etapa I lee el heap de la cartera: la dueña 15,3 → 37,9 ms (paso 1: 15,1 → 37,7) y 16.826 → 18.737 buffers, Berta 12,2 → 20,3 ms: **≈ 0,38 µs por lead de la cartera** ((37,9 − 15,3) ÷ 60.000 y (20,3 − 12,2) ÷ 21.000). Con un valor común corta en 301 y no crece (dueña 30,2 → 32,9 ms). El techo si la cartera estuviera repartida por toda la tabla (la siembra junta las carteras): leer `leads` entera con el filtro, 7.313 buffers y 12,6 ms con 62.000, **26.557 y 29,5 ms con 212.000**. El presupuesto es el mismo con los dos volúmenes (100 ms y 40.000 buffers): quien lo rompa es una regresión, no el volumen.
- **Lo que no mejora (5a-34), dueña con 212.000 (62.000 entre paréntesis):** un texto privado sin resultados **5.502 ms y 892.348 buffers** (1.364,5), los tachados ocultos con un privado **275,4 ms** (68,7) y el primer pedido del conteo de la exportación **5.275,6 ms** (1.322,3): leen la vista y pagan `atributos_lead()` por lead.
- **Lo asertado** (`medir-escala.sql`, `privados()`, seis personas × cinco formas): paso 1 ≤ 80 ms, paso 2 ≤ 40, los dos ≤ 100 ms, buffers de los dos ≤ 40.000, y lo que devuelve: nada fuera de su cartera y, con el valor raro, exactamente los suyos vivos. El mayor de todos con 212.000: 43,4 ms (dueña, valor raro) y 26.437 buffers (Ana, valor común y un nombre). `busqueda-volumen.sql` suma **168 huellas md5 iguales** (94 con filas con 62.000, 86 con 212.000: 35 s y 193 s, la ruta de siempre es lo lento).
- **Contra HEAD cae por contenido, no por ms:** `leads_candidatos` de HEAD ignora `privados` y devuelve 300 de 300 candidatos sin filtrar (29 violaciones con 212.000, 28 con 62.000); es rápida, así que los ms y los buffers no caen: los 5,3 s son de la ruta de la app por la vista, que la guarda ya no mide. **Mutación:** evaluar el filtro con `public.atributos_lead(l.id)` hace caer 33 aserciones con 62.000 (1.729,8 ms contra 80 y 232.799 buffers contra 40.000).
- **Berta, «lp»:** la siembra reparte las ciudades por el mismo número que el dueño, así que todos los leads de Berta son «scz» y su valor denso en la guarda es «scz».
- **La baja de 200.000 (5a-11) no es de este paso:** la corrida más larga del job midió 1.956 ms con 212.000 y 4.254 con 62.000 (de 6.000), con 10 y 14 corridas; es el ruido que 5a-11 documenta (el índice y los triggers no cambiaron).

## Paso 4.03 (5a-9 y 5a-34): el texto y el rango de un campo, y los ocultos y la exportación, por los candidatos (2026-10-22)

Medido con `EXPLAIN (ANALYZE, BUFFERS)` como `authenticated` (plan genérico), mediana de 5 corridas de 7, con 62.000 y con 212.000 leads (`db:sembrar-volumen`, sin y con `-- --leads 200000`; la dueña tiene 20.000 y 80.000 en su cartera, Berta 7.000 y 28.000). Carga de la máquina al empezar cada corrida (`/proc/loadavg`, de 8 núcleos): de 1,4 a 2,1. «Antes» es la ruta de la app en HEAD (`leads_vista` o `leads_cartera_vista` con las condiciones de `condicionesDeLeads()`); «después» son los dos pasos (candidatos y página). Los números de los seis casos del encargo, la dueña con 212.000 leads (con 62.000 entre paréntesis), ms y buffers:

| Caso                                                | Antes                  | Después                           |
| --------------------------------------------------- | ---------------------- | --------------------------------- |
| 1 texto público sin resultados, «todos»             | 198,2 y 172.692 (50,6) | **13,5 y 11.365** (13,8)          |
| 2 rango de texto público sin resultados, «todos»    | 76,2 y 26.565 (16,4)   | 7,4 y 11.365 (8,1)                |
| 2 rango de número público desde 5, «todos»          | 104,4 y 172.692 (27,1) | 8,2 y 11.365 (8,5)                |
| 1 texto público sin resultados, «míos»              | 128,7 y 172.692 (32,7) | 29,7 y 40.291 (38,0 y 43.905)     |
| 3 texto privado sin resultados                      | 5.642,2 y 892.611      | **84,4 y 18.793** (29,3 y 16.881) |
| 3 rango de texto privado sin resultados             | 5.464,2 y 892.611      | 35,4 y 18.793 (14,9)              |
| 4 tachados ocultos con un texto privado (hasta 51)  | 290,5 y 52.021 (71,9)  | **10,8 y 9.981** (3,8)            |
| 5 exportación, 1.er pedido, texto privado           | 5.638,7 y 892.611      | **84,6 y 18.793** (29,3)          |
| 5 exportación, 1.er pedido, `@>` privado raro       | 5.408,9 y 727.046      | 37,0 y 18.793 (15,7)              |
| 5 exportación, 1.er pedido, `@>` privado denso      | 5.463,0 y 727.046      | 11,9 y 17.106 (11,2)              |
| 5 exportación, conteo entero, `@>` denso (17 vent.) | —                      | 201,4 y 290.290 (239,8)           |

Las demás personas, sin resultados, 212.000 (62.000): **Berta** texto público 70,9 → 39,9 ms (15,3 → 21,0) y texto privado 2.081,5 y 478.417 → **39,5 y 18.522** (496,8 → 20,9); **Ana** 59,3 → 22,4 (12,0 → 10,6); la **«chica»** 52,9 → 0,7; la de la **papelera** 52,8 → 1,8; la **supervisora** «míos» 191,6 → 0,8 y «todos» 200,1 → 13,5. Los ocultos de Berta, que no tiene tachados, pasan de 0,2 a 0,7 ms.

- **La causa de 5a-9, en el plan de HEAD:** un `ilike` o un `>=` sobre `atributos_publicos` no es _leakproof_ y bajo RLS ningún índice lo sostiene: la dueña «todos» recorre `leads_listado_idx` y descarta lo que no cumple, `Rows Removed by Filter` ∼ todo lo visible (172.692 buffers con 212.000, 48.878 con 62.000). Crece con N. La de 5a-34 es la de 5a-10: `atributos_lead()` ~66 µs por lead de la cartera.
- **El arreglo:** el texto y el rango dentro de la ventana de candidatos (`comparaciones` y `comparaciones_privadas`), con el tope del recorrido para un campo público de quien ve «todos»: la ventana mira 4.000 leads y, si no junta candidatos, hasta 10.000 (≈ 11.365 buffers y 13,5 ms, **los mismos con 62.000 y con 212.000**). Sin ese tope la etapa W sería O(N) por `leads_listado_idx`. Los tachados ocultos y el conteo de la exportación, `tachados: true` en la ventana y la cuenta por `leads_vista_por_ids(ids)`.
- **Dónde empeora, con su número:** con 62.000 la dueña «míos» con un texto público sin resultados cuesta 38,0 ms contra 32,7 de HEAD (≈ 40.000 buffers fijos contra 48.878 que crecen); un valor **denso** pasó de 22,1 a 29,7 ms (dueña «todos») y de 8.200 a 22.311 buffers; los ocultos de Berta de 0,2 a 0,7 ms. Todos dentro de su presupuesto.
- **Lo asertado** (`medir-escala.sql`, seis personas, los mismos presupuestos con 62.000 y con 212.000): texto y rango público ≤ 50 ms y 45.000 buffers; privado y ocultos y el primer pedido de la exportación ≤ 100 ms y 40.000; el conteo entero de la exportación con un valor denso, 800 ms y 400.000 buffers (17 ventanas: 201 ms y 290.290 con 212.000, 240 y 298.994 con 62.000), y lo que devuelve. El mayor con 212.000: el texto privado de la dueña, 84,4 ms de 100. `busqueda-volumen.sql` suma las huellas md5 de 15 filtros × 7 lecturas.
- **5a-37:** dos siembras nuevas seguidas (212.000 y 62.000) pasan `db:medir:volumen` a la primera con la siembra que termina en `vacuum (analyze)` de lo que siembra y `reindex` del GIN: `leads_busqueda_idx` recién sembrado leía los mismos buffers (269 contra 288) pero tardaba 28,8 ms en vez de 4,3.
- **Qué falta medir:** con una cartera repartida por toda la tabla (la siembra junta las carteras) el peor caso del heap sigue siendo 26.557 buffers y ≈ 30 ms con 212.000 (5a-10); nada de este paso lo empeora.

## Paso 4.04 (5a-11): la baja de 200.000, medida; sin arreglo (2026-10-23)

Medido con 212.000 leads (`db:sembrar-volumen -- --leads 200000`), `supabase/tests/medir-bajas.sql` 7 veces por opción (mediana de las 5 centrales; entre paréntesis, la menor y la mayor de esas 5) y un medidor aparte que repite la misma preparación y el mismo cierre con `EXPLAIN (ANALYZE, BUFFERS, WAL)` en la llamada y en cada corrida del job, los updates HOT de `pg_stat_user_tables` y el costo por sentencia (`pg_stat_statements`, `track = all`). Carga al empezar cada corrida (`/proc/loadavg`, 8 núcleos): de 0,9 a 6,0, anotada en cada fila. Cada opción se aplicó sobre la base viva, se midió y se revirtió.

**La medición estaba contaminada:** el cron `equipo-bajas` (cada minuto) corría la misma baja en paralelo con las corridas de la guarda (`cron.job_run_details`: 1,3–1,9 s a las 03:51, 03:52, 03:53, 03:58 y 03:59 UTC), así que el número de corridas variaba (10, 11 y una vez **25 corridas y 89 lotes** para la misma baja). `medir-bajas.sql` pausa ahora el cron mientras mide y lo reactiva al final. Con el cron pausado, la línea base es estable: 9 corridas en 6 de 7.

**El mecanismo no es el del PLAN.** El desglose por sentencia (línea base): de 15,7 s del job, **11,7 s son el `update leads set cartera`** de `_leads_cartera_recalcular()` (10,1 millones de buffers, ~50 por lead, 181.000 páginas ensuciadas, 262 MB de WAL); el `update leads_asesores` suma otros 3,3 s. **Ningún update es HOT** (0 de 200.000) y **el GIN no crece**: la fila nueva queda con `cartera = '{}'` y `leads_busqueda_idx` es parcial (`cartera <> '{}'`), así que no recibe ninguna clave (las «~35 claves» pasan con un lead que conserva a alguien, no en esta medición). Lo que cuesta es que **`cartera` es una columna indexada desde 1b** (en el GIN y en su predicado): un update que la cambia nunca es HOT y entra a los 11 btree de `leads`. Antes de 1b (`leads_nombre_trgm` sobre `nombre`) podía ser HOT: de ahí las 6 corridas y 10,1 s de entonces.

| Opción (212.000 leads)                                  | Llamada ms | Corrida más larga ms  | Corridas del job | Job entero ms              | Buffers del job | Páginas ensuciadas | WAL    | HOT de `leads` | Búsqueda                            |
| ------------------------------------------------------- | ---------- | --------------------- | ---------------- | -------------------------- | --------------- | ------------------ | ------ | -------------- | ----------------------------------- |
| **Línea base** (HEAD; cron pausado)                     | 480,8      | 1.867,0 (1.852–1.942) | 9 (40 lotes)     | 15.202,8 (14.554–15.375)   | 15,57 M (3)     | 221.249 (3)        | 417 MB | 0              | igual                               |
| Lote de 1.000 (`equipo_bajas_continuar`)                | 525,6      | 1.166,9 (1.104–2.583) | **20** (196)     | 16.488,9 (15.992–22.110)   | 15,71 M         | 187.731            | 419 MB | 0              | igual                               |
| Lote de 2.000                                           | 499,8      | 1.628,5 (1.617–1.780) | 11 (99)          | 15.419,3 (15.294–15.754)   | 15,69 M         | 197.640            | 417 MB | 0              | igual                               |
| `gin_pending_list_limit` 4 MB                           | 492,4      | 1.908,8 (1.870–1.931) | 10 (40)          | 15.541,0 (15.494–16.160)   | 15,58 M         | 337.447            | 334 MB | 0              | no medida (el GIN no recibe claves) |
| **GIN sin la cartera** (`nombre`, `atributos_publicos`) | 459,3      | 1.819,1 (1.745–2.063) | 7 (6–7)          | **9.953,8** (9.208–10.212) | 9,88 M          | 46.882             | 203 MB | 167.401 (84 %) | **41 aserciones rotas**             |
| GIN sin la cartera y `fillfactor = 90`                  | 333,5      | 1.812,5 (1.768–1.866) | **6** (6–6)      | **9.303,3** (9.086–9.696)  | 9,34 M          | 40.059             | 208 MB | 182.234 (91 %) | las mismas (es el mismo índice)     |

(3) = sólo 3 corridas del medidor detallado en la línea base limpia; las demás, 7. Los buffers se mueven menos de 0,3 % entre corridas.

- **El lote no cambia el trabajo, sólo cómo se reparte:** con 1.000 la corrida tope es de 10 lotes (10.000 leads), así que hacen falta 20; los buffers del job son los mismos. Un lote mayor que 5.000 no se midió: con 5.000 ya corta el límite de 1,5 s por corrida, así que sólo alargaría la corrida más larga.
- **`gin_pending_list_limit` no tiene nada que mover:** el GIN no recibe claves en esta baja.
- **Sin la cartera en el GIN, la baja cumple el assert** (≤ 6 corridas o ≤ 10,1 s: 9.953,8 ms sin `fillfactor`, 1,5 % de margen; 6 corridas siempre con 90) **pero la búsqueda lo pierde todo:** `db:medir:volumen` con 212.000 corta en `medir-escala.sql` con 41 aserciones. Berta busca «Mamani» (`_leads_candidatos_sql('indice', …)`): con el índice de hoy, `Bitmap Index Scan` con `cartera @> {Berta} AND nombre ~~* '%Mamani%'`, 0 filas, **33 buffers y 0,39 ms**; sin la cartera, el índice devuelve los **25.016** leads de otras personas que se llaman así, `Heap Blocks: exact=3719`, `Rows Removed by Filter: 25000`, **3.790 buffers y 37,7 ms** (lo ajeno llega al heap, que 1b asserta en ≤ 40 bloques). Además: Berta «míos» con un nombre 47–52 ms (presupuesto 25), un atributo común 94,6 (25), y los privados de la dueña, Ana y Berta 42.657–46.385 buffers (tope 40.000). Descartada.
- **Lo que sí movería la baja sin tocar la búsqueda queda fuera del lugar del ítem:** que el update de la cartera vuelva a ser HOT exige que ninguna columna que cambia esté en un índice de `leads`; o bien bajar el costo de cada update no-HOT (los 11 btree de `leads` cuyo predicado cumple la fila nueva). Se reporta y decide la persona (`docs/PLAN.md`, 5a-11).

### Cierre del 4.04: la guarda de la baja, con topes de lo medido (2026-10-23)

La persona aceptó el número de 5a-11 con la causa corregida (opción A). `supabase/tests/medir-bajas.sql` baja sus topes (no sube ninguno): el job **≤ 12 corridas, ≤ 20.000 ms y la corrida más larga ≤ 3.000 ms**, contra ≤ 60 corridas y ≤ 6.000 ms; la llamada (≤ 4.000 ms) y la vista previa (≤ 300 ms) no cambian.

| Qué                                              | Corridas | Job entero ms | Corrida más larga ms | Veredicto                                           |
| ------------------------------------------------ | -------- | ------------- | -------------------- | --------------------------------------------------- |
| Lote de 1.000, guarda vieja (60 / 6.000)         | 20       | 15.402,8      | 930,0                | **pasa** (rc 0)                                     |
| Lote de 1.000, guarda nueva                      | 20       | 15.814,0      | 1.211,0              | **cae** (rc 3, «20 corridas, el presupuesto es 12») |
| Lote de 5.000, `db:medir:volumen` #1 (carga 1,7) | 9        | 14.802,8      | 1.830,0              | pasa                                                |
| Lote de 5.000, `db:medir:volumen` #2 (carga 2,1) | 9        | 14.068,8      | 1.823,0              | pasa                                                |
| Lote de 5.000, `db:medir:volumen` #3 (carga 1,8) | 10       | 15.515,6      | 1.947,7              | pasa                                                |

La regresión de bajar el lote (la mutación: `equipo_bajas_continuar()` con lotes de 1.000 aplicada por `psql` sobre la base viva; al terminar se volvió la función a 5.000 y se comprobó contra la migración) es la que la guarda vieja dejaba pasar. Con los topes nuevos, las tres corridas seguidas con 212.000 leads pasan, con 1.823–1.948 ms de corrida más larga contra 3.000.

**Cuándo cae sin que haya regresión (a la vista, no explicado con «la máquina»):** una corrida suelta de la guarda, lanzada justo después de otra que había fallado a medias (con 200.000 leads «Medir baja» de más y el cron pausado), dio 13 corridas, 28.191,1 ms y una corrida de 3.823,3 ms con la carga de 2,6 a 3,7 y el lote en 5.000. El log de la base de esa ventana: un checkpoint cada 15–30 s por WAL («checkpoints are occurring too frequently», distancia ≈ 688 MB: la guarda escribe ~400 MB en segundos) y dos con `sync` de **11,4 y 12,4 s** (el archivo más lento, 2,2 y 4,8 s): el mismo fsync lento de disco que `scripts/medir-listado.mjs` ya documenta. Los topes nuevos son lo medido más margen y **un fsync de 12 s en medio los rompe**: si pasa, se anota la corrida y su carga y no se afloja el número ni se reintenta.

## Diagnóstico de 5a-41 y la guarda de la baja bajo un fsync lento (2026-10-23)

Sin cambios de código, SQL ni specs: sólo reproducir y medir. La causa vive acá y no en `e2e-fallos/`, que guarda sólo las cinco últimas carpetas (ya se perdió así una `CAUSA.md`, la de 5a-32). Las salidas enteras quedaron en el scratchpad de la sesión, que no dura: lo que importa está en estas tablas.

**Cómo se midió:** cada corrida es `pnpm test --retry=0` con la salida entera y un JSON (`--reporter=json`) en su archivo; la carga se anota al empezar (`/proc/loadavg`, 8 núcleos) y un muestreador anota cada segundo la presión de E/S y de CPU del kernel (`/proc/pressure`) y cuánto tarda un `fdatasync` de 4 KB en el disco de la base (`/dev/nvme0n1p2`, 93 % lleno). **La CPU:** 12 bucles `while :; do :; done`. **El disco:** dos `dd if=/dev/zero bs=1M count=512 conv=fdatasync` en bucle sobre ese disco y `sync` cada 0,5 s (en la base: checkpoints con `sync` de 5 a 17 s, más que los 11,4 y 12,4 del cierre del 4.04). **La caché fría:** `posix_fadvise(DONTNEED)` sobre `node_modules`, `src`, `scripts`, `supabase`, `e2e` y la instalación de Node (1.298 MB, 74.764 archivos) antes de `pnpm lint` y `pnpm typecheck`, y `pnpm test` enseguida, como la que cayó.

| Condición                                 | Corridas | Caídas | Carga al empezar                | `fsync` 4 KB (mediana / máx) | E/S estancada (máx) | Vitest por corrida |
| ----------------------------------------- | -------- | ------ | ------------------------------- | ---------------------------- | ------------------- | ------------------ |
| Sin carga extra                           | 10       | 0      | 5,2–16,6                        | 1 ms / 11 ms                 | 8,6 %               | 72,5–87,9 s        |
| 12 bucles de CPU                          | 10       | 0      | 12,1–24,5                       | 1 ms / 100 ms                | 0,5 %               | 157,7–161,0 s      |
| Escritura a disco con `fdatasync`         | 10       | 0      | 11,0–19,2                       | 415 ms / 3,7 s               | 67,4 %              | 73,4–74,9 s        |
| Caché vaciada, `lint` y `typecheck` antes | 10       | 0      | 2,1–6,3                         | 1 ms / 274 ms                | 4,1 %               | 72,4–73,4 s        |
| CPU y disco a la vez                      | 10       | 0      | 9,2 la primera; 27,4–29,5 las 9 | 424 ms / 4,4 s               | 26,2 %              | 163,3–167,2 s      |

**La corrida que cayó, por sus rastros** (la salida se perdió): el registro de la sesión del cierre del 4.04 la ubica de 02:24:05 a 02:25:40, tras `lint` y `typecheck` (02:23:11–02:24:05), con ~95 s de reloj, como las dos que pasaron enseguida (92 y 88 s). **No fue en la ventana de la guarda:** la corrida de 13 corridas y 28,2 s fue de 01:42:54 a 01:43:37, con la siembra de 212.000 y una guarda cortada justo antes, y los dos `sync` largos (11,4 y 12,4 s) son de esa ventana, con la base escribiendo 8–17 MB/s. En la ventana del fallo (`sar`, 02:20–02:30) el disco estaba ocioso: await 0,57 ms, 0,53 % de uso, 573 kB/s escritos e iowait 0,02 %; el checkpoint de la base de 02:22:23 a 02:24:53 tuvo `sync` de 0,327 s. Lo que sí había: la CPU al 71 % con 16 en cola, el juego de la persona (02:09:49–02:29:52, 7 GB de pico) que al cargar desalojó caché (de 15,7 a 12,5 GB, con el kernel reclamando páginas también durante la corrida) y gnome-shell diciendo «your system is too slow» a las 02:24:58. El caché de resultados de Vitest ya se había reescrito: sus dos marcas de «fallido» son de archivos borrados.

**Hipótesis:**

- **A, un fsync lento:** descartada para este fallo. No había presión de E/S, y con ella (disco, y disco con CPU) Vitest no cae ni se alarga: no escribe al disco (PGlite en memoria, `tmpdir` en tmpfs; sólo escribe el caché de resultados al final).
- **C, el arranque en frío tras `lint` y `typecheck`:** descartada. Con la caché vaciada, 10 de 10 y la misma duración (el NVMe lee esos 1,3 GB en menos de un segundo).
- **B, el reloj o el orden:** sin mecanismo. Ninguna fecha de prueba cae cerca de ese minuto (son del 11 al 16 de octubre, sin un umbral que venza a las 02:25), cada archivo corre en su proceso y lo único compartido es `git ls-tree` (lectura) y tmpfs; ninguna prueba lee `docs/` (entre la que cayó y las que pasaron sólo corrió `mapa.sh`, que dejó `MAPA.md` igual).
- **B, la carga:** no reproducida, con margen fino. Ningún archivo fija un límite propio; el único cercano es el segundo que esperan por defecto `waitFor` y `findBy` (12 archivos). Con carga 22–24, la primera prueba de `modal-de-formulario.test.tsx` llegó a 895 ms y la de `barra-del-editor.test.tsx` (2 pruebas, las dos esperan la barra en `montar()`: el único archivo de 2 pruebas con esas esperas) a 766 ms, contra 419 y 340 sin carga; ninguna prueba pasó de 1,2 s contra su límite de 5 s. Los 4 archivos con PGlite quedan fuera: un `beforeAll` vencido (10 s) tira las de su bloque, de 33 a 41, no 2.

**Veredicto:** 5a-41 no reproducida en 50 corridas, sin causa probada. Lo que falta para encontrarla es la salida de la próxima caída (`docs/PLAN.md`, 5a-41).

### La guarda de la baja con la misma presión de disco (5a-42)

`supabase/tests/medir-bajas.sql` tal cual por `psql`, 3 veces, y el medidor del 4.04 (repite la preparación y el cierre del archivo y mide cada corrida del job con `EXPLAIN (ANALYZE, BUFFERS, WAL)`) para los buffers: `pg_stat_statements` no guarda una sentencia que termina en error, y el bloque del job es justo el que levanta. «60 s» es una copia del medidor con el corte de la llamada en 60 s en vez de 8, sólo para poder medir el job. «4.04» son las 3 corridas limpias del medidor del paso 4.04.

| Corrida             | Presión | E/S estancada (mediana) | `sync` de checkpoint en la ventana | Vista previa ms | Llamada ms          | Corridas | Lotes | Job ms          | Corrida más larga ms | Buffers del job         | WAL del job  | Resultado                |
| ------------------- | ------- | ----------------------- | ---------------------------------- | --------------- | ------------------- | -------- | ----- | --------------- | -------------------- | ----------------------- | ------------ | ------------------------ |
| guarda 1            | sí      | 66 %                    | ninguno                            | 359,3           | —                   | —        | —     | —               | —                    | —                       | —            | cae: vista previa > 300  |
| guarda 2            | sí      | 75 %                    | 14,5 y 3,3 s                       | 126,6           | 2.877,1             | 24       | 40    | 79.479,9        | 6.428,1              | (no queda)              | —            | cae: 24 corridas > 12    |
| guarda 3            | sí      | 76 %                    | 17,2 s                             | 175,5           | 3.944,8             | 21       | 40    | 74.297,6        | 14.200,9             | (no queda)              | —            | cae: 21 corridas > 12    |
| medidor 1           | sí      | 76 % (las dos)          | 1,8 a 14,4 s (las dos)             | —               | 6.481               | 22       | —     | 84.797          | 13.751               | 15.607.003              | 394 MB       | —                        |
| medidor 2           | sí      |                         |                                    | —               | > 8.000 (cancelada) | —        | —     | —               | —                    | —                       | —            | `authenticated` la corta |
| medidor 60 s, 1 y 2 | sí      | 76 %                    | 1,1 a 12,3 s                       | —               | 4.586 y 2.494       | 23 y 23  | —     | 77.070 y 82.568 | 7.257 y 7.874        | 15.607.736 y 15.597.355 | 324 y 357 MB | —                        |
| control 1 y 2       | no      | 4,3 %                   | 0,27 a 0,81 s                      | —               | 452 y 465           | 9 y 10   | —     | 14.399 y 15.431 | 1.849 y 2.155        | 15.505.813 y 15.609.065 | 418 y 317 MB | —                        |
| 4.04 (3)            | no      | —                       | —                                  | —               | 469–518             | 10–12    | 40    | 16.016–24.449   | 1.928–5.249          | 15.550.729–15.591.378   | 323–426 MB   | —                        |

- **Los buffers del job no se mueven con el disco:** 15,60–15,61 M con presión y 15,51–15,61 M sin ella (8 corridas, 0,7 % de dispersión), con el job de 5 a 6 veces más largo que el control del día y más del doble de corridas. Los lotes son 40 en todas (200.000 ÷ 5.000): las corridas suben porque cada una corta a los 1,5 s, así que «≤ 12 corridas» también es un tope de tiempo. El WAL (317–426 MB) varía con las imágenes completas tras cada checkpoint, igual con y sin presión; las páginas ensuciadas (27.696 a 405.670) dependen de cuándo cae el checkpoint: ninguno de los dos sirve de tope.
- **Lo que se rompe es todo lo que mide tiempo,** también lo que no escribe: la vista previa (359 ms) y la llamada, que una vez pasó los 8 s y `authenticated` la canceló (57014). Hay checkpoints durante el job con y sin presión (≈ 670 MB de WAL cada uno): lo que separa no es que haya uno, sino cuánto tarda su `sync` (con presión, 6 de 10 entre 5 y 17 s; sin ella, nunca más de 1,2 s en el log del día). Pero la guarda 1 cayó sin ningún checkpoint en su ventana: lo que la vio fue la presión de E/S del kernel (`/proc/pressure/io`, `some avg10`), con mediana de 66–76 % con presión y de 4,3 % sin ella, con el medidor escribiendo lo mismo que la guarda (máximo 25,9 %). Hacen falta las dos señales: el `sync` ve lo que escribe la base misma (la corrida de 13 del 4.04, a las 01:43, no tenía presión de afuera) y la presión del kernel ve lo de afuera.
- **Assert propuesto en `docs/PLAN.md`, 5a-42 (no aplicado):** decide el trabajo (40 lotes, buffers del job ≤ 16.000.000, lo medido más alto + 2,5 %) y los ms de hoy se juzgan sólo si la ventana estuvo sana: ningún checkpoint con `sync` de más de 2 s y la presión de E/S del kernel con mediana ≤ 30 %; si no, «ms no medibles», que no cuenta como verde. No se subió ni se aflojó ningún tope.

## Paso 4.05 (4 de 4): `validar_formula()` con 200 y 2.000 nodos (2026-10-23)

- **Cómo se mide:** con `EXPLAIN (ANALYZE, BUFFERS)` como `authenticated`, en el Supabase local (Postgres 17), la mediana de 5
  corridas de 7 (las 2 primeras calientan la compilación de plpgsql y el caché del catálogo).
- **Las fórmulas:** las sintéticas de `formulaSintetica()`, con cadenas de dos referencias, un `suma` de n/2, n/4 constantes, n/10
  grupos y una variante de 50 claves con `solo_en` de 25. Son las mismas de la prueba de escala de TS, volcadas a
  `supabase/tests/corpus-de-formula.json` › `sinteticas`.
- **Dónde corre:** `supabase/tests/medir-validar-formula.sql`, en `pnpm db:medir`.

| Tamaño      | Antes (`…000600`)            | 3 corridas a mano (antes de `fdf87f7`) | Con `…005100` (STABLE) | Tope   |
| ----------- | ---------------------------- | -------------------------------------- | ---------------------- | ------ |
| 200 nodos   | — (rechazaba la forma nueva) | 8,39 · 8,57 · 8,46 ms                  | **8,4 ms**             | 26 ms  |
| 2.000 nodos | —                            | 78,88 · 80,93 · 81,11 ms               | **78,4 ms**            | 245 ms |
| 2.000 ÷ 200 | —                            | 9,41 · 9,44 · 9,59                     | **9,4**                | 12     |

- **Buffers: 0 en todas las medidas** (shared, local y temp). La función no toca tablas.
- **La carga al empezar** fue 2,18 en las tres corridas a mano y 1,93 y 2,23 en las dos de `pnpm db:medir`, sin presión de disco ni de
  CPU (≤ 0,3 %).
- **Los topes son la mayor mediana de las 3 corridas × 3** (8,57 → 26 y 81,11 → 245). La razón ≤ 12 la fija el pedido, porque el
  tiempo es más ruidoso que las visitas; el validador TS mide ×10,05 en visitas.
- **No se subió ningún presupuesto:** la medición es nueva.
- **Por qué `offset 0`:** la llamada va sobre una subconsulta con `offset 0`. Si la función es IMMUTABLE (lo fue hasta `…005100`), el
  planificador la evalúa con las constantes al planificar y el tiempo cae en Planning Time.
- **La guarda muerde:** una mutación hizo cuadrática la pasada de la forma (que recorra la lista en cada nodo), en una transacción
  que se revierte. Midió 14,32 y 507,03 ms y cayó por el tope de 2.000 nodos («tarda 507,03 ms y el tope es 245»). La razón, 35,4,
  también la habría tumbado.
- **Lo que cuesta:** unos 40 µs por nodo, contra 0,05 ms por fórmula entera en TS.
  - Es plpgsql: cada pasada evalúa unas decenas de expresiones simples por nodo.
  - La forma revisa con una expresión regular cada id, cada referencia y cada clave de `solo_en` (12.500 en la de 2.000).
  - Corre al guardar una fórmula (`formula_guardar_borrador`, también desde el ⚙), no al cotizar.

## Paso 4.06 (1 de 2): `evaluar_formula()` con 200 y 2.000 nodos (2026-10-23)

- **Cómo se mide:** como `validar_formula()` (4.05-4): `EXPLAIN (ANALYZE, BUFFERS)` como `authenticated`, en el Supabase local
  (Postgres 17), la mediana de 5 corridas de 7 (las 2 primeras calientan la compilación de plpgsql y el caché del catálogo), sobre
  una subconsulta con `offset 0`.
- **Las evaluaciones:** las de `evaluacionSintetica()` (`entities/evaluacion-sintetica.ts`), volcadas a
  `supabase/tests/corpus-del-motor.json` › `sinteticas`. Es la de `motor-escala.test.ts` hecha paramétrica: n/10 grupos, una variante,
  inputs sin tipear con `sugerido_de`, overrides en los tramos y tres inexistentes, y tablas de 50 o de 1.000 filas, vivas (en la
  entrada) o congeladas (en `params`), con la fila buscada siempre la última.
- **Dónde corre:** `supabase/tests/medir-evaluar-formula.sql`, en `pnpm db:medir`.

| Medición                                                        | 1.ª      | 2.ª      | 3.ª      | `pnpm db:medir` | Tope   |
| --------------------------------------------------------------- | -------- | -------- | -------- | --------------- | ------ |
| 200 nodos                                                       | 5,34 ms  | 5,15 ms  | 5,17 ms  | **5,1 ms**      | 16 ms  |
| 2.000 nodos                                                     | 45,29 ms | 43,54 ms | 43,57 ms | **43,7 ms**     | 136 ms |
| 2.000 ÷ 200                                                     | 8,48     | 8,46     | 8,42     | **8,5**         | 12     |
| 200 nodos, 4 tablas **vivas** de 1.000 filas (informativo)      | 28,33    | 27,57    | 27,63    | **28,2 ms**     | —      |
| 200 nodos, 4 tablas **congeladas** de 1.000 filas (informativo) | 16,83    | 16,24    | 16,37    | **16,3 ms**     | —      |
| 2.000 nodos, 4 tablas congeladas de 1.000 filas (informativo)   | —        | —        | —        | **164,4 ms**    | —      |
| ídem con los argumentos de una columna comprimida (veces)       | —        | —        | —        | **1,0**         | 1,5    |

- **Buffers: 0 en todas las medidas** (shared, local y temp). La función es pura y no toca tablas.
- **La carga al empezar** fue 3,08 (1.ª), 3,04 (2.ª) y 2,21 (3.ª), sin presión de disco ni de CPU. La de `pnpm db:medir`, 1,48.
- **Los topes son la mayor mediana de las 3 corridas × 3** (5,34 → 16 y 45,29 → 136). La razón ≤ 12 la fija el pedido, porque el tiempo
  es más ruidoso que las visitas.
- **No se subió ningún presupuesto:** la medición es nueva. `validar_formula()` sigue en 8,4 y 78,8 ms.
- **Lo que cuesta:** unos 22 a 26 µs por nodo (`validar_formula()`, 40), y es plpgsql: unas decenas de expresiones simples por nodo, más una
  búsqueda por cada `tabla` que no trae override.
- **Las tablas grandes** (para el p95 de ≤ 50 ms con 4 tablas de 1.000 filas que pide el 4.06-2):
  - vivas, 200 nodos: **28 ms.** Son 12 ms más que congeladas: la base revisa la forma de cada celda de `entrada.tablas` (4.000
    filas) antes de evaluar, porque no confía en quien llama;
  - congeladas, 2.000 nodos: **164 ms** (166 en la corrida de ajuste). Hay unas 250 búsquedas de 1.000 filas (`tabla`; los tramos traen override), 0,5 ms cada una.
    Cada una expande la tabla con `jsonb_array_elements` y filtra, sin salir en la primera coincidencia;
  - la lectura de las tablas de la base (por `tablas_referencia_filas_…`) la hace `cotizacion_evaluar()`, y no cuenta acá.
- **Las guardas muerden,** cada versión mala en una transacción que se revierte:

  | Versión mala                                                | Lo que dice                                                                                |
  | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
  | Acumula los valores con `\|\|` por nodo (cuadrática)        | 7,2 y **198,0 ms**: «tarda 198,04 ms y el tope es 136» (la razón, 27, también cae)         |
  | Relee `p_def` en cada nodo de la pasada                     | la columna comprimida tarda **×2,36** los literales: «lee un argumento dentro de un bucle» |
  | Lee las constantes de `p_params` (sin desarmarlo al entrar) | ×1,10: no cae por tiempo, la tumba la guarda de texto (`la pasada nombra un argumento`)    |

- **Por qué dos guardas:** con tablas de 1.000 filas, las búsquedas (164 ms) tapan el costo de descomprimir (+22 ms), así que el tiempo
  no distingue a quien lee `p_params` unas pocas veces. La guarda de texto de `evaluar-formula.sql` (`db:probar`) es exacta; la de
  tiempo atrapa lo que se lee cientos de veces.

## Paso 4.06 (2 de 2): `cotizacion_evaluar()` con 50.000 y con 250.000 cotizaciones (2026-10-23)

- **Cómo se mide:** `supabase/tests/medir-evaluar.sql`, en `pnpm db:medir:volumen` (antes de `medir-bajas.sql`), contra el Supabase local
  (Postgres 17) con la siembra de volumen y en una transacción que se revierte. **200 llamadas seguidas** (más 10 de calentamiento), cada una
  cronometrada, **como `authenticated`** (con el permiso que sólo esa transacción le da: hasta el 4.10 nadie más lo tiene) y con el plan
  genérico (`plan_cache_mode = force_generic_plan`, lo que usa plpgsql tras unas llamadas). Mediana y p95.
- **Cuatro casos:** la fórmula del seed (`subasta_usa`) por origen y por cotización, y una sintética de 200 nodos con 4 tablas **vivas** de
  1.000 filas (la del corpus, con `anioInicial: 1100` para que su vehículo quepa en `vehiculos.anio`) por origen y por cotización. De cada
  uno: la llamada entera, **ARMAR** (`_cotizacion_armar`: leer la fórmula, las tablas, los tipos de cambio y el vehículo) y **EVALUAR**
  (`evaluar_formula()` sobre lo armado), en ms; y los buffers de una llamada.
- **El terreno:** las filas de `transporte_por_ruta` que el seed no trae (el 4.08 lo arregla; se siembran en la transacción y no se toca
  `seed.sql`), 20 tablas que ningún nodo nombra en el origen de la sintética (20.000 filas), 50 orígenes con tablas `t1` a `t4` de 1.000
  filas (200.000 filas que una mala lectura pagaría) y las cotizaciones, 50.000 y después 250.000, mitad de cada fórmula.

| Medición (ms)                           | 50.000 cotizaciones | 250.000 cotizaciones | Tope        |
| --------------------------------------- | ------------------- | -------------------- | ----------- |
| seed por origen, mediana / p95          | 2,5 / 2,8           | 2,6 / 2,8            | 10 / 20     |
| seed por cotización, mediana / p95      | 2,5 / 2,7           | 2,5 / 2,7            | 10 / 20     |
| sintética por origen, mediana / p95     | 35,0 / 36,0         | 34,9 / 35,9          | — / 50      |
| sintética por cotización, mediana / p95 | 34,8 / 35,7         | 35,2 / 36,4          | — / 50      |
| sintética: ARMAR mediana / EVALUAR      | 7,4 / 27,4          | 7,4 / 27,3           | —           |
| seed: ARMAR mediana / EVALUAR           | 1,3 / 1,2           | 1,3 / 1,2            | —           |
| p95 con 250.000 sobre p95 con 50.000    | —                   | 0,95 a 1,07 (veces)  | ≤ 1,5 veces |

- **Varias corridas** (dos sueltas y dos de `db:medir:volumen`; carga 1,5 a 2,4, sin presión de disco ni de CPU): la mediana del seed 2,5 a 2,8
  y su p95 2,6 a 3,1; la sintética, mediana 34,5 a 35,6 y p95 35,6 a 37,3. **Ningún presupuesto subió:** la medición es nueva.
- **Lo que cuesta armar las tablas:** 7,4 ms para 4.000 filas (1,9 µs por fila: un `jsonb_agg` ordenado sobre el índice), contra los 27 ms
  de evaluarlas (4.06-1: 28 ms con las vivas). ARMAR de la fórmula del seed cuesta 1,3 ms, casi todo en los permisos (`puede_vehiculo`,
  `assert_permiso`): 112 a 195 buffers según cuán encogidas estén las tablas de permisos.
- **No crece con las cotizaciones.** En razón: el p95 con 250.000 es 0,95 a 1,07 veces el de 50.000 (tope 1,5, con un piso de 3 ms). En
  bloques de `cotizaciones` (heap, índices y TOAST, con `pg_stat_get_xact_blocks_fetched`):

  | Caso             | 50.000 | 250.000 | Qué es                                                                                   |
  | ---------------- | ------ | ------- | ---------------------------------------------------------------------------------------- |
  | por origen       | 0      | 0       | la función no toca la tabla                                                              |
  | por cotización   | 6      | 8       | dos búsquedas por clave (el permiso y la lectura): 3 + 3, y 4 + 4 con el índice más alto |
  | una por su clave | 3      | 4       | 2 niveles de `cotizaciones_pkey` y el heap, y 3 niveles y el heap                        |

- **Los buffers totales van como dato y no se asertan:** incluyen las tablas de permisos (`roles_permisos`, `perfiles`, `usuarios_roles`:
  23 a 27 páginas para 6 a 119 filas), que el autovacuum encoge a mitad de una corrida. Una misma llamada leyó 138 y 178 buffers en dos fases
  de la misma corrida (por origen, con 50.000 y 250.000), y 249 y 460 en otra, sin que cambiara nada de la función. Con `pg_stat_get_xact_blocks_fetched`
  sobre `cotizaciones` el ruido desaparece.
- **Las guardas de escala muerden** (`medir-evaluar.sql`, sobre la sintética: ARMAR lee 303 buffers contra un tope de 359):

  | Versión mala (copia de la función de verdad, en `pg_temp`)     | Lee            | Tope |
  | -------------------------------------------------------------- | -------------- | ---- |
  | lee todas las tablas del origen y no las que la fórmula nombra | 1.033 buffers  | 359  |
  | lee las filas de todos los orígenes con esa clave              | 13.006 buffers | 359  |

  El tope es `1,2 × (páginas del heap de las filas nombradas + 4 × (hojas del índice + 3) + el costo fijo de ARMAR del seed)`, con el costo
  fijo medido en ese momento (64 + 40 + 195 = 299 → 359). Si el texto de `_cotizacion_armar` cambia y la mutación ya no aplica, la guarda falla.

- **`medir-bajas.sql` pasó** en la corrida completa de `db:medir:volumen` (5a-42 no apareció): 9 corridas del job y 40 lotes, 14.357,4 ms en
  total y 1.846,9 ms la corrida más larga, a las 19:11 y con carga 1,7. La primera corrida completa no llegó a `medir-bajas.sql`: cayó antes,
  en `medir-evaluar.sql`, por la aserción de buffers totales que se reemplazó (arriba). No se tocó ni se subió ningún tope.

## Paso 4.08 (1 de 3): `validar_diseno()` con unos 200 y unos 2.000 ítems (2026-10-24)

- **Cómo se mide:** como `validar_formula()` (4.05-4): `EXPLAIN (ANALYZE, BUFFERS)` como `authenticated`, en el Supabase local
  (Postgres 17), la mediana de 5 corridas de 7, sobre una subconsulta con `offset 0`.
- **Los diseños:** los de `disenoSintetico()` (`entities/diseno-sintetico.ts`), volcados a `supabase/tests/corpus-de-diseno.json` ›
  `sinteticas`. Son 206 y 2.018 ítems (255 y 2.487 nodos de la fórmula): celdas de pares con su porcentaje, tablas con atajos,
  subtotales, banderas con su interruptor, secciones con niveles, modos y grupos con tonos.
- **Dónde corre:** `supabase/tests/medir-validar-diseno.sql`, en `pnpm db:medir`.
- **Tres formas de llamar:** con los argumentos como literales (0 buffers); de una columna `storage external` (fuera de línea y sin
  comprimir), donde los buffers son los del TOAST y crecen con lo que la función relee; y de una columna comprimida (la que tendrá
  `formulas.diseno`), contra los literales.

| Medición                                           | 1.ª (carga 3,2) | 2.ª (2,2) | 3.ª (1,6) | 4.ª (1,1) | `pnpm db:medir` (0,9) | Tope  |
| -------------------------------------------------- | --------------- | --------- | --------- | --------- | --------------------- | ----- |
| 206 ítems, ms                                      | 4,84            | 4,87      | 4,77      | 4,77      | **4,8**               | 15    |
| 2.018 ítems, ms                                    | 44,61           | 44,98     | 43,86     | 44,30     | **44,3**              | 136   |
| 2.018 ÷ 206 (ms)                                   | 9,22            | 9,23      | 9,20      | 9,28      | **9,3**               | 12    |
| Columna externa, 206 ítems, buffers (5 corridas)   | 265             | 265       | 265       | 265       | **265**               | 320   |
| Columna externa, 2.018 ítems, buffers              | 1.665           | 1.665     | 1.665     | 1.665     | **1.665**             | 2.000 |
| Columna externa, 2.018 ÷ 206 (buffers)             | 6,28            | 6,28      | 6,28      | 6,28      | **6,3**               | 12    |
| Columna comprimida ÷ literales (2.018 ítems)       | 1,02            | 1,02      | 1,02      | 1,00      | **1,0**               | 1,5   |
| Guarda: búsqueda lineal por ítem (veces, ms)       | 18,06           | 18,38     | 17,20     | 18,01     | **18,5**              | > 12  |
| Guarda: `p_def` releído por grupo (veces, buffers) | 56,72           | 56,72     | 56,72     | 56,72     | **56,7**              | > 12  |

- **Buffers con literales: 0 en todas las medidas** (shared, local y temp). La función no toca tablas.
- **Los topes de ms son la mayor mediana de las 4 corridas × 3** (4,87 → 15 y 44,98 → 136); los de buffers, lo medido + 20 % (265 → 320
  y 1.665 → 2.000): los bloques no dependen de la máquina. La razón ≤ 12 la fija el pedido. Sin presión de disco ni de CPU (≤ 0,3 %).
- **Un diseño de 2.000 ítems cuesta 44 ms:** unos 20 µs por ítem, y la mitad de lo que cuesta `validar_formula()` con 2.000 nodos (78 ms).
  Corre al publicar, no al cotizar.
- **La columna comprimida cuesta lo mismo que los literales (1,0 veces):** la función desarma `p_def` y `p_diseno` un número fijo de veces
  al entrar, y los ayudantes reciben las partes ya desarmadas.
- **Las guardas muerden, en el mismo archivo:** una copia de `_diseno_secciones()` con `array_position(p_ids, …)` en lugar del mapa
  (una búsqueda lineal por ítem) da una razón de ms de 18 (tope 12), y una copia de `validar_diseno()` que relee `p_def` por cada grupo
  lee 57 veces los buffers de 200 ítems con 2.000. Ninguna pasa la medición; no se subió ningún tope.

## Paso 4.08 (2 de 3): guardar y publicar una fórmula con su diseño, de unos 200 y unos 2.000 ítems (2026-10-24)

- **Cómo se mide:** `supabase/tests/medir-publicar.sql` (`pnpm db:medir`), en el Supabase local (Postgres 17), dentro de una transacción que se revierte.
  `EXPLAIN (ANALYZE, BUFFERS)` como `authenticated` (una dueña creada para la medición), la mediana de 5 corridas de 7. Cada ronda guarda un borrador
  nuevo y lo publica. Los diseños son los de `disenoSintetico()` (206 y 2.018 ítems; 100 tonos y 100 niveles, más que el tope de 24: se insertan como
  `postgres`).
- **Qué cuesta publicar:** valida la fórmula (`validar_formula()`), valida el diseño (`validar_diseno()`) y compila la visibilidad
  (`_compilar_visibilidad()`); guardar valida la fórmula y la forma del diseño. Es lineal.

| Medición                                                    | 1.ª (carga 1,1) | 2.ª (1,2)      | 3.ª (1,2)      | Tope           |
| ----------------------------------------------------------- | --------------- | -------------- | -------------- | -------------- |
| `formula_publicar`, 206 ítems, ms                           | 17,53           | 17,94          | 17,53          | 55             |
| `formula_publicar`, 2.018 ítems, ms                         | 172,26          | 174,59         | 171,78         | 550            |
| 2.018 ÷ 206 (ms)                                            | 9,83            | 9,73           | 9,80           | 12             |
| `formula_publicar`, buffers (5 corridas), 206 / 2.018 ítems | 1.902 / 17.144  | 1.912 / 17.097 | 1.925 / 17.112 | 2.350 / 20.600 |
| 2.018 ÷ 206 (buffers)                                       | 9,01            | 8,94           | 8,89           | 12             |
| `formula_guardar_borrador`, 206 / 2.018 ítems, ms           | 10,83 / 103,15  | 11,00 / 105,76 | 10,80 / 103,94 | 36 / 320       |
| `_compilar_visibilidad`, 206 / 2.018 ítems, ms (aislada)    | 1,07 / 8,21     | 1,07 / 8,06    | 1,07 / 8,43    | 4 / 27         |
| `_compilar_visibilidad`, columna externa, buffers           | 50 / 310        | 50 / 310       | 50 / 310       | 60 / 375       |
| Guarda: búsqueda lineal por ítem (veces, ms)                | 36,09           | 36,35          | 35,42          | > 12           |
| Guarda: el diseño releído por sección (veces, buffers)      | 42,30           | 42,30          | 42,30          | > 12           |

- **Los topes de ms son la mayor mediana de las corridas × 3** (con una primera de 181,51 ms de publicar, 546 → 550); los de buffers, lo medido + 20 %.
  Publicar un diseño de 2.000 ítems cuesta unos 0,17 s: corre al configurar, no al cotizar.
- **Sin guardar y sin publicar, la compilación cuesta 8 ms con 2.000 ítems** (la décima parte de `validar_diseno()`), y con literales no lee ningún bloque.
- **Una regresión real cae:** con `_compilar_visibilidad()` cuadrática aplicada a la base, `formula_publicar` con 2.000 ítems tarda 23,2 veces lo de 200
  (el tope es 12); restaurada, vuelve a pasar. Las dos copias malas de la medición (una búsqueda lineal por ítem y el diseño releído por sección) dan 36 y
  42 veces.

### Las sondas de uso de un tono y de un nivel (`_tono_en_uso`, `_nivel_en_uso`)

- **Se miden primero,** con `formulas` casi vacía: las versiones grandes de las otras mediciones llenan el TOAST y taparían lo que se mide. Se siembran 200
  y después 1.800 versiones archivadas más (sin auditoría, `session_replication_role = replica`), con `analyze`, y se cuentan los bloques de `formulas`
  (heap, índices y TOAST) con `pg_stat_get_xact_blocks_fetched`, ya calientes.
- **Se compara cuánto SUMAN 1.800 versiones más, no el total:** el total lleva la basura que dejaron en el heap las corridas anteriores (cada una se
  revierte y el vacuum tarda) y sube de corrida en corrida (9, 38, 65 con 200 versiones). El crecimiento es limpio: **18 bloques** las dos sondas, contra
  **100** una copia que no puede usar el GIN (tiene que sumar 50 o más, y las sondas, menos de un tercio de lo que suma la copia). Las dos sondas usan
  `formulas_tonos_idx` y `formulas_niveles_idx`, con el plan genérico y sin recorrer `formulas` (se asierta el texto del plan).
- **Una trampa del planificador:** con `order by o.nombre limit 1` y la tabla de versiones, la sonda de una clave que nadie usa puede elegir recorrer los
  orígenes por nombre y probar cada versión: 139 y 519 bloques con 200 y 2.000 versiones, y cambia según el orden en que se cargaron. Una CTE `materialized`
  hace que el GIN conduzca (`offset 0` también, pero `escala.sql` lo prohíbe).

## Paso 4.08 (3 de 3): `cotizacion_evaluar()` con la fórmula de las capturas, y la guarda de ARMAR (2026-10-24)

- **Cómo se mide:** `pnpm db:reset`, `pnpm db:sembrar-volumen` y `pnpm db:medir:volumen` (62.000 leads); `supabase/tests/medir-evaluar.sql`, como `authenticated`, con el plan genérico.
  La fórmula del seed ya no es la de antes: es la de las capturas (47 nodos, con variante, tres tipos de cambio y modos), que congela sus tablas en `params.tablas`.
- **La fórmula del seed (topes del plan, sin subir: mediana ≤ 10 ms y p95 ≤ 20):**

  | `cotizacion_evaluar()`, fórmula del seed | Con 50.000 cotizaciones | Con 250.000 |
  | ---------------------------------------- | ----------------------- | ----------- |
  | por origen, mediana / p95 (ms)           | 2,2 / 2,4               | 2,3 / 2,5   |
  | por cotización, mediana / p95 (ms)       | 2,3 / 2,4               | —           |
  | ARMAR por origen, buffers de una llamada | 116                     | —           |
  | bloques de `cotizaciones` por origen     | 0                       | 0           |

  Con 250.000 sobre 50.000 el p95 es 1,0 veces (tope 1,5). ARMAR lee **116 buffers** y ninguna tabla viva: las cuatro tablas de la fórmula van en `params.tablas`.

- **La guarda de ARMAR** (lee a lo sumo las páginas de las tablas que la fórmula nombra) medía su costo fijo con ARMAR de la fórmula del seed «con 4 tablas casi vacías». La del
  seed ya no tiene tablas vivas, y el tope habría bajado en lo que cuestan las cuatro búsquedas de tabla (la primera corrida dio 310 contra 309, medido, no
  supuesto). Ahora el costo fijo sale de un origen de control (`medir_evaluar_fijo`: una fórmula con dos tipos de cambio y 4 tablas vivas de una fila) y **la guarda es la
  misma**: ARMAR de la sintética lee **272 buffers contra un tope de 321** (costo fijo de 162; antes 303 contra 359 con 195: el costo fijo cambia con lo encogidas que estén
  las tablas de permisos), y las dos versiones malas leen 1.041 y 12.976 (la guarda muerde).
- **La siembra de volumen reparte los 10.000 vehículos entre tres orígenes** (antes dos): `subasta_usa` tiene un tercio y no la mitad (`1 + g % total` en `sembrar.sql`). Las guardas del inventario
  (profundidad de 2.000 y de 11 páginas de 100) siguen en verde.
- **`medir-bajas.sql`:** la corrida limpia dio 14.265,2 ms con 9 corridas del job y 40 lotes (la corrida más larga, 1.843,9 ms). La primera dio 22.778,8 ms contra un
  presupuesto de 20.000 con 12 corridas y los mismos 40 lotes, con dos checkpoints que escribieron 26,4 s durante la medición (5a-42: se decide por el trabajo, que no
  cambió, y la ventana sana pasó). No se tocó ni se subió ningún tope.
