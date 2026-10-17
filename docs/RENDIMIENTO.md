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
es el tiempo que asserta `pnpm db:medir:volumen` o el e2e (≈ 4 veces lo medido); «A 50.000» es lo medido en la dueña
(«todos») y, entre paréntesis, en Ana («propios», 2.000). Estado: **ok**, **arreglado** (en la 9e), **límite**
(aceptado, anotado abajo) o **exento** (acotado por naturaleza, con su motivo en `scripts/guardas/excepciones-de-escala.ts`
o `supabase/tests/escala.sql`).

### Leads

| Superficie                                   | Tope                                      | Número                                               | Índice                                                      | Presupuesto             | A 50.000                         | Estado                                                                                                                                                  |
| -------------------------------------------- | ----------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------- | ----------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Listado, página                              | 50 filas por cursor                       | ninguno (Anterior / Siguiente)                       | `leads_listado_idx`                                         | 100 ms                  | 10 ms (11)                       | ok                                                                                                                                                      |
| Listado, página profunda                     | 50 filas                                  | ninguno                                              | `leads_listado_idx` (condición de índice sobre `creado_en`) | 1.200 ms                | 370 ms (38)                      | **límite**: la política de `leads` llama dos funciones por fila                                                                                         |
| Listado, filtro por un atributo              | 50                                        | ninguno                                              | `leads_listado_idx` + `COST` de `atributos_lead()`          | 300 ms                  | 43 ms (40)                       | **arreglado** (3.761 ms)                                                                                                                                |
| Listado, filtro sin resultados / búsqueda    | 50                                        | ninguno                                              | recorre la cartera visible                                  | 12.000 / 1.500 ms       | 4.365 / 404 ms (202 / 32)        | **límite**                                                                                                                                              |
| Listado, favoritos / tachados / etiqueta     | 50                                        | ninguno                                              | unión por clave primaria con las marcas de quien mira       | 500 / 500 / 1.500 ms    | 99 / 104 / 717 ms (15 / 15 / 40) | favoritos arreglado (333 ms); tachados y etiqueta **límite** (~13 µs por lead; eran 25 y 668 ms): a cambio, quien no tiene ninguno pasó de 300 a 0,2 ms |
| Aviso de tachados ocultos                    | 50                                        | «más de 50» (`contarLeadsHasta`)                     | `leads_tachados_pkey` (unión)                               | 100 ms                  | 10 ms (3); 0,1 ms sin tachados   | **arreglado** (`count` exacto, 325 ms)                                                                                                                  |
| Drawer rápido, seguimientos y recordatorios  | 20 por «Ver más», 500                     | ninguno                                              | ver «Seguimientos de un lead»                               | ver arriba              | ver arriba                       | ok                                                                                                                                                      |
| Ficha                                        | un lead                                   | «más de 100 vehículos»                               | `vehiculos_lead_idx`                                        | 80 ms                   | 2 ms (5)                         | **arreglado** (`count(*)`)                                                                                                                              |
| Ficha, oportunidades                         | 100 + `hay_mas`                           | ninguno                                              | `oportunidades_lead_id_idx`                                 | 150 ms                  | 18 ms (8)                        | **arreglado** (sin tope)                                                                                                                                |
| Kanban, tablero                              | 6 columnas × 50                           | «500+» por columna                                   | `oportunidades_lead_id_idx` bajo la política                | 800 ms                  | 216 ms                           | **arreglado** (total exacto); **límite**: cuesta lo que tiene la persona (~2 µs por oportunidad)                                                        |
| Kanban, «Ver más»                            | 500 por columna, con aviso                | «Ver más (N)» o «Ver más»                            | ídem                                                        | 500 ms                  | 101 ms                           | **arreglado** (sin tope; `p_antes_en is null or`)                                                                                                       |
| Papelera de leads                            | 5 lotes por cursor (≤ 200 leads cada uno) | ninguno                                              | `lotes_papelera_tipo_idx`                                   | 400 ms                  | 62 ms                            | **arreglado** (597 ms, todos los lotes)                                                                                                                 |
| Quién lo tiene (cartera)                     | personas de una cartera                   | ninguno                                              | `leads_asesores`                                            | 50 ms                   | 0,3 ms                           | exento                                                                                                                                                  |
| Candidatos de cartera                        | 500 (`limit 500`)                         | ninguno                                              | —                                                           | 50 ms                   | 0,6 ms                           | ok                                                                                                                                                      |
| Etiquetas, selector y «Gestionar»            | 50 por persona                            | «En N leads» hasta 1.001                             | `leads_etiquetas_etiqueta_id_idx`                           | 300 ms                  | 51 ms                            | **arreglado** (`count(*)` por etiqueta)                                                                                                                 |
| Importar, «Tus importaciones recientes»      | 20 de las últimas 24 h                    | `intactos` ≤ 500                                     | `importaciones_leads` (PK)                                  | 300 ms                  | 45 ms                            | exento                                                                                                                                                  |
| Importar, vista previa                       | 500 filas del archivo, 50 por página      | «N filas» del archivo                                | —                                                           | —                       | —                                | ok                                                                                                                                                      |
| Importar, lotes                              | 50 filas por lote, 500 por archivo        | —                                                    | —                                                           | `medir-importacion.sql` | —                                | ok                                                                                                                                                      |
| Exportar                                     | lotes de 500, hasta 5.000, 5 por hora     | hasta 5.001 ids (de a 1.000); «Descargamos N» exacto | `leads_listado_idx`                                         | 3.000 ms (5.001 ids)    | 210 ms (51); antes 815 ms exacto | **arreglado** (conteo exacto)                                                                                                                           |
| Alta, selectores                             | orígenes y tipos activos                  | —                                                    | —                                                           | —                       | —                                | exento                                                                                                                                                  |
| Listado, filtro por un origen del lead       | 50                                        | ninguno                                              | `leads_origen_lead_id_idx` (bitmap y top-N)                 | 450 ms                  | 100 ms (20,5); 0,1 ms sin leads  | **límite**: cuesta lo que suma ese origen (~10 µs por lead); dos orígenes a la vez, 198 ms (26,8)                                                       |
| Orígenes del lead, pantalla de configuración | 100 (se dice al llegar)                   | «N de 100»                                           | `leads_origen_lead_id_idx` (un `exists` por rango por fila) | 100 ms                  | 0,03 ms la lista; antes 5 ms     | **arreglado** (era Seq Scan sobre `leads`, ver abajo)                                                                                                   |
| Eliminar un origen del lead                  | uno                                       | —                                                    | `leads_origen_lead_id_idx` (el mismo `exists`)              | 5 ms                    | 0,03 ms; antes 5 ms              | **arreglado**                                                                                                                                           |

**El filtro por origen del lead (9f-1).** `leads.origen_lead_id` tiene el índice de su FK (`leads_origen_lead_id_idx`) y
`db:medir:volumen` asserta que el filtro lo use, también el origen sin leads (0,1 ms: no recorre nada). Un origen con un quinto
de la cartera cuesta ~100 ms para la dueña y ~20 para Ana: un bitmap de sus leads y un top-N, no la página. Se probó un índice
compuesto `(origen_lead_id, creado_en desc, id desc) where eliminado_en is null`, que con el plan forzado entrega la página en
3 ms, pero el planificador **no lo elige**: estima que la policy de `leads` deja pasar ~24 de 8.000 filas y prefiere el bitmap.
No se dejó un índice que no se usa. Sale con lo mismo que el filtro sin resultados (9h, `docs/PLAN.md`): una columna que la
policy no tenga que adivinar.

**«¿Algún lead usa este origen?» (corrección de la 9f-1, `…20261019000800`).** El índice de la FK existía (lo crea el bucle de
`…000900_indices.sql`), pero `_origenes_lead_json()` y `origen_lead_eliminar()` no lo usaban: con `l.origen_lead_id = o.id` el plan
genérico estima 1/`n_distinct` de la tabla (un quinto) y elige Seq Scan; para un origen con un lead, o sin ninguno, recorría
`leads` entera (62.000 filas, 5 ms) y crece con la tabla. `order by … limit 1` y `min()` no lo arreglan (`min(uuid)` ni existe). La
sonda por rango, `>= x and <= x`, se estima en un 0,5 % de la tabla sea cual sea el dato: camina el índice (0,03 ms). Lo asserta
`medir-escala.sql` con el origen como columna (que es lo que ve el plan genérico; con un literal el planificador usa el dato real y
no se entera) y con un origen de un solo lead; con la forma vieja la medición falla.

### Vehículos, orígenes, equipo y empresa

| Superficie                             | Tope                        | Número             | Índice                            | Presupuesto  | A 50.000 / 10.000 | Estado                          |
| -------------------------------------- | --------------------------- | ------------------ | --------------------------------- | ------------ | ----------------- | ------------------------------- |
| Inventario, página                     | 50 por cursor               | ninguno            | `vehiculos_origen_listado_idx`    | 20 ms        | 0,4 ms            | ok                              |
| Inventario, búsqueda / limpieza        | 50                          | ninguno            | `vehiculos_origen_listado_idx`    | 100 / 150 ms | 9 / 19 ms         | ok                              |
| Papelera de vehículos                  | 5 lotes por cursor          | ninguno            | `lotes_papelera_tipo_idx`         | 200 ms       | 13 ms             | **arreglado** (115 ms, todo)    |
| Aviso de archivos por borrar           | cola de Storage hasta 1.000 | «más de 1.000»     | `cola_gc_storage_edad_idx`        | 50 ms        | 0,3 ms            | **arreglado** (`count(*)`)      |
| Galería de fotos                       | 24 por vehículo             | «N de 24»          | `vehiculos_imagenes_hash_unico`   | —            | —                 | exento                          |
| Vínculos e interesados de un vehículo  | 50 / 100                    | ninguno            | `vehiculos_vinculos_vehiculo_idx` | —            | —                 | ok (sin aviso al llegar: PLAN)  |
| Selector «agregar vehículo»            | 20                          | ninguno            | —                                 | 300 ms       | 31 ms (64)        | ok                              |
| Orígenes, resumen y categorías con uso | decenas de orígenes         | conteos del origen | —                                 | 100 / 50 ms  | 1,8 / 0,3 ms      | exento (administración)         |
| Equipo, lista                          | el equipo                   | ninguno            | —                                 | —            | —                 | exento                          |
| Baja de una persona, vista previa      | los leads de una persona    | exacto             | —                                 | 100 ms       | 10 ms             | exento (administración puntual) |
| Tipos de cambio, historial             | 30                          | ninguno            | FK del cambio                     | —            | —                 | ok (sin aviso al llegar: PLAN)  |
| Bandeja / buscador / campana           | sin consulta todavía        | —                  | —                                 | —            | —                 | —                               |

### Jobs (100.000 filas por purgar)

| Job                                               | Antes                                  | Ahora                                | Tope                                                          |
| ------------------------------------------------- | -------------------------------------- | ------------------------------------ | ------------------------------------------------------------- |
| `papelera-purgar`                                 | 29 s en una corrida, sin tope          | 3 s, 50 lotes por corrida, cada hora | 50 lotes (10.000 leads) por corrida                           |
| `limpieza-automatica`                             | 24 s (revisaba 100.800 para contarlos) | 0,6 s                                | mueve 200 y revisa 1.000 más                                  |
| `importaciones-vinculos-purgar`                   | 0,85 s, un `DELETE`                    | 0,5 s                                | lotes de 10.000, 10 por corrida                               |
| `apibara-consultas-purgar`                        | 0,08 s, un `DELETE`                    | 0,3 s                                | lotes de 10.000, 10 por corrida                               |
| `storage-gc` (reclamar 100 de 100.000 en la cola) | 0,9 s la primera pasada                | 0,05 s                               | 2.000 huérfanos encolados por pasada, 100 por ronda, 5 rondas |

### JS en frío (con gzip, lo que el documento nombra)

| Ruta         | Antes (shell por los barriles) | Ahora                                   | Presupuesto |
| ------------ | ------------------------------ | --------------------------------------- | ----------- |
| `/leads`     | 547,5 KB                       | 543,7 KB                                | 570 KB      |
| `/perfil`    | 547,5 KB                       | 434,9 KB (sin leads en el shell: 434,8) | 460 KB      |
| `/vehiculos` | 598,7 KB                       | 504,9 KB                                | 530 KB      |

### Lo que se vio al mirar (con volumen cargado; `e2e/escala-recorrido.spec.ts`, `E2E_CAPTURAS`)

Escritorio y celular, la dueña y Ana. Se leyeron las capturas, y de ahí salieron dos arreglos y cuatro notas:

- **Arreglado:** paginar el listado sin red dejaba la pantalla en blanco (el enlace caía a una navegación completa).
  Ahora no navega y dice «Sin conexión: no se puede cambiar de página…». El kanban con 500 tarjetas en una columna
  tenía 26.000 nodos en el celular (las dos distribuciones, la de escritorio y la de pestañas, estaban en el DOM);
  ya hidratado queda sólo la que se ve (7.700 nodos en el tope; 2.540 un listado de 50 filas).
- **Se entiende que hay más** en el listado sólo al pie: arriba no dice en qué página se está ni que sigue; Anterior y
  Siguiente están debajo de las 50 filas. Con filtros y búsqueda como camino a lo antiguo alcanza (buscar «Volumen 12345»
  llega a una fila de hace meses al instante), pero sin un «página N» queda dudoso: PLAN.
- **El tope se dice** («Mostrando las 500 con actividad más reciente…») pero queda al pie de una columna de 500, y el camino
  a lo antiguo del kanban es la ficha de cada lead (no tiene filtros todavía): PLAN.
- **Una página de papelera con lotes de 200** son 1.000 filas de ~60 px, cada una con «Restaurar» y «Purgar»: usable pero
  larga; lo siguiente es un lote que muestra los primeros 20 y «Mostrar los 200» (PLAN).
- **Volver con «atrás»** vuelve a la página anterior del listado, no al principio (la URL lleva el cursor).
- «Mover a…» se parte en dos líneas en una columna de 288 px. Cosmético.
