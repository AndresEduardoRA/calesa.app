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

| Superficie                                                  | Tope                                               | Número                                               | Índice                                                                                  | Presupuesto             | A 50.000                                                             | Estado                                                                                           |
| ----------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Listado, página                                             | 100 filas por cursor (`MAXIMO_DE_PAGINA_DE_LEADS`) | ninguno (Anterior / Siguiente)                       | `leads_listado_idx`                                                                     | 30 ms                   | a 50: 10 (11) → 10,5 (10); a 100: 518 (92) → 19 (17)                 | **arreglado** (9h: la policy estimable)                                                          |
| Listado, página profunda                                    | 100 filas                                          | ninguno                                              | `leads_listado_idx` (condición de índice sobre `creado_en`)                             | 150 ms                  | 370 (38) → 11 (10); a 100, 19 (17)                                   | **arreglado** (9h; era límite: la policy llamaba dos funciones por fila)                         |
| Listado «míos», página 1 (lo que ve cada quien por defecto) | 100                                                | ninguno                                              | `leads_listado_idx`                                                                     | 30 ms                   | 870 (70) → 10 (10); a 100, 17 (17)                                   | **arreglado** (9h; no estaba en el inventario)                                                   |
| Listado, un campo privado sin resultados                    | 100                                                | ninguno                                              | recorre la cartera de quien filtra con `atributos_lead()` (~66 µs por lead)             | 6.000 ms                | ~4.000 sobre lo visible → 1.065 (146)                                | **límite** (9h): sólo la cartera tiene el dato                                                   |
| Listado, filtro por un atributo                             | 100                                                | ninguno                                              | `leads_listado_idx`; un campo público por `atributos_publicos`                          | 100 ms                  | 43 (40) → 11 (11)                                                    | **arreglado** (9e: 3.761 → 43; 9h: la copia de lo público)                                       |
| Listado, filtro sin resultados / búsqueda                   | 100                                                | ninguno                                              | recorre la cartera visible, ~0,4 µs por lead                                            | 100 / 200 ms            | 4.365 / 404 (202 / 32) → 21 / 51 (16 / 16)                           | **arreglado** (9h)                                                                               |
| Listado, favoritos / tachados / etiqueta                    | 100                                                | ninguno                                              | unión por clave primaria con las marcas de quien mira                                   | 100 ms cada uno         | 99 / 104 / 717 (15 / 15 / 40) → 11 / 12 / 42 (9 / 10 / 24)           | **arreglado** (9h)                                                                               |
| Aviso de tachados ocultos                                   | 50                                                 | «más de 50» (`contarLeadsHasta`)                     | `leads_tachados_pkey` (unión)                                                           | 100 ms                  | 10 (3) → 2 (0,5); con un atributo 70 (10) → 2 (0,5)                  | **arreglado**                                                                                    |
| Drawer rápido, seguimientos y recordatorios                 | 20 por «Ver más», 500                              | ninguno                                              | ver «Seguimientos de un lead»                                                           | ver arriba              | ver arriba                                                           | ok                                                                                               |
| Ficha                                                       | un lead                                            | «más de 100 vehículos»                               | `vehiculos_lead_idx`                                                                    | 80 ms                   | 2 ms (5)                                                             | **arreglado** (`count(*)`)                                                                       |
| Ficha, oportunidades                                        | 100 + `hay_mas`                                    | ninguno                                              | `oportunidades_lead_id_idx`                                                             | 150 ms                  | 18 ms (8)                                                            | **arreglado** (sin tope)                                                                         |
| Kanban, tablero                                             | 6 columnas × 50                                    | «500+» por columna                                   | `oportunidades_lead_id_idx` bajo la política                                            | 800 ms                  | 216 ms                                                               | **arreglado** (total exacto); **límite**: cuesta lo que tiene la persona (~2 µs por oportunidad) |
| Kanban, «Ver más»                                           | 500 por columna, con aviso                         | «Ver más (N)» o «Ver más»                            | ídem                                                                                    | 500 ms                  | 101 ms                                                               | **arreglado** (sin tope; `p_antes_en is null or`)                                                |
| Papelera de leads                                           | 5 lotes por cursor (≤ 200 leads cada uno)          | ninguno                                              | `lotes_papelera_tipo_idx`                                                               | 400 ms                  | 85 ms                                                                | **arreglado** (597 ms, todos los lotes)                                                          |
| Quién lo tiene (cartera)                                    | personas de una cartera                            | ninguno                                              | `leads_asesores`                                                                        | 50 ms                   | 0,3 ms                                                               | exento                                                                                           |
| Candidatos de cartera                                       | 500 (`limit 500`)                                  | ninguno                                              | —                                                                                       | 50 ms                   | 0,6 ms                                                               | ok                                                                                               |
| Etiquetas, selector y «Gestionar»                           | 50 por persona                                     | «En N leads» hasta 1.001                             | `leads_etiquetas_etiqueta_id_idx`                                                       | 300 ms                  | 51 ms                                                                | **arreglado** (`count(*)` por etiqueta)                                                          |
| Importar, «Tus importaciones recientes»                     | 20 de las últimas 24 h                             | `intactos` ≤ 500                                     | `importaciones_leads` (PK)                                                              | 300 ms                  | 45 ms                                                                | exento                                                                                           |
| Importar, vista previa                                      | 500 filas del archivo, 50 por página               | «N filas» del archivo                                | —                                                                                       | —                       | —                                                                    | ok                                                                                               |
| Importar, lotes                                             | 50 filas por lote, 500 por archivo                 | —                                                    | —                                                                                       | `medir-importacion.sql` | —                                                                    | ok                                                                                               |
| Exportar                                                    | lotes de 500, hasta 5.000, 5 por hora              | hasta 5.001 ids (de a 1.000); «Descargamos N» exacto | `leads_listado_idx`                                                                     | 100 ms (5.001 ids)      | 210 (51) → 5 (16)                                                    | **arreglado**                                                                                    |
| Alta, selectores                                            | orígenes y tipos activos                           | —                                                    | —                                                                                       | —                       | —                                                                    | exento                                                                                           |
| Listado, filtro por un origen del lead                      | 100                                                | ninguno                                              | `leads_listado_idx` (un origen sin leads, `leads_origen_lead_id_idx`)                   | 100 ms                  | 100 (20,5) → 10 (10); dos orígenes 198 (27) → 11 (10); sin leads 0,1 | **arreglado** (9h; era límite)                                                                   |
| Listado, buscar `#n`                                        | un lead                                            | ninguno                                              | `leads_numeros_globales_numero_key` (dueña) / `leads_numeros_propios_creador_idx` (Ana) | 20 ms                   | 0,7 ms (2,7)                                                         | ok                                                                                               |
| Alta de un lead (el número propio)                          | uno                                                | —                                                    | `leads_contadores` (PK, un upsert)                                                      | 80 ms                   | 2,0 ms (1,8); el upsert 0,0 ms                                       | ok                                                                                               |
| Orígenes del lead, pantalla de configuración                | 100 (se dice al llegar)                            | «N de 100»                                           | `leads_origen_lead_id_idx` (un `exists` por rango por fila)                             | 100 ms                  | 0,03 ms la lista; antes 5 ms                                         | **arreglado** (era Seq Scan sobre `leads`, ver abajo)                                            |
| Eliminar un origen del lead                                 | uno                                                | —                                                    | `leads_origen_lead_id_idx` (el mismo `exists`)                                          | 5 ms                    | 0,03 ms; antes 5 ms                                                  | **arreglado**                                                                                    |

**El filtro por origen del lead (9f-1).** `leads.origen_lead_id` tiene el índice de su FK (`leads_origen_lead_id_idx`) y
`db:medir:volumen` asserta que el filtro lo use, también el origen sin leads (0,1 ms: no recorre nada). Un origen con un quinto
de la cartera cuesta ~100 ms para la dueña y ~20 para Ana: un bitmap de sus leads y un top-N, no la página. Se probó un índice
compuesto `(origen_lead_id, creado_en desc, id desc) where eliminado_en is null`, que con el plan forzado entrega la página en
3 ms, pero el planificador **no lo elige**: estima que la policy de `leads` deja pasar ~24 de 8.000 filas y prefiere el bitmap.
No se dejó un índice que no se usa. **Desde la 9h** el filtro camina `leads_listado_idx` (~10 ms la dueña y Ana): la policy ya
se estima bien y no hace falta el compuesto. Un origen sin leads sigue por el índice de la FK.

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
llamada hace el primer lote de 5.000 (**0,4–0,6 s**, presupuesto 2,5 s; una vez, tras cargar los 200.000, 3 s) y el job
`equipo-bajas` el resto: cada corrida corta pasados 1,5 s (**1,7–2,4 s**, y 3,5 s una vez con la máquina ocupada; presupuesto
4 s) y la baja termina en 5 a 8 corridas, ~40 lotes, ~10 s de trabajo repartidos en minutos. Lotes medidos: 2.000 ≈ 250 ms,
5.000 ≈ 550 ms, 10.000 ≈ 0,9–1,4 s. Dos cosas que se aprendieron midiendo: (1) **cada lote sigue desde el último lead del
anterior** (cursor): empezando desde el principio, dentro de la misma corrida recorría las entradas del índice parcial que los
lotes anteriores ya revocaron (no se pueden descartar hasta que la corrida confirma) y una corrida de 10 lotes crecía con lo
hecho, 5,6 s; (2) **los ids salen solos del índice y los leads se bloquean después por su clave**: unidos, para la dueña (20.000
de 62.000) el planificador recorría las dos tablas y ordenaba (26 ms hoy, pero crece con la tabla); separados, 0,7 ms los ids
y 5 ms el candado. La vista previa cuenta hasta 1.001: 313 ms → 44–73 ms con 200.000 (al principio 2,2 s: `_bajas_en_curso()`
se evaluaba por fila; envuelta en `(select …)::uuid[]` es un InitPlan). El InitPlan nuevo de la regla no cambió ningún plan del
listado (`medir-escala.sql`; con 512.000 leads, la página 1 de la dueña sigue en 1,6 ms por `leads_listado_idx`).

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

| Superficie                             | Tope                        | Número             | Índice                                              | Presupuesto                               | A 50.000 / 10.000                                                             | Estado                                      |
| -------------------------------------- | --------------------------- | ------------------ | --------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------- |
| Inventario, página                     | 50 por cursor               | ninguno            | `vehiculos_origen_listado_idx`                      | 20 ms                                     | 0,4 ms                                                                        | ok                                          |
| Inventario, búsqueda / limpieza        | 50                          | ninguno            | `vehiculos_origen_listado_idx`                      | 100 / 150 ms                              | 9 / 19 ms                                                                     | ok                                          |
| Papelera de vehículos                  | 5 lotes por cursor          | ninguno            | `lotes_papelera_tipo_idx`                           | 200 ms                                    | 13 ms                                                                         | **arreglado** (115 ms, todo)                |
| Aviso de archivos por borrar           | cola de Storage hasta 1.000 | «más de 1.000»     | `cola_gc_storage_edad_idx`                          | 50 ms                                     | 0,3 ms                                                                        | **arreglado** (`count(*)`)                  |
| Galería de fotos                       | 24 por vehículo             | «N de 24»          | `vehiculos_imagenes_hash_unico`                     | —                                         | —                                                                             | exento                                      |
| Vínculos e interesados de un vehículo  | 50 / 100                    | ninguno            | `vehiculos_vinculos_vehiculo_idx`                   | —                                         | —                                                                             | ok (sin aviso al llegar: PLAN)              |
| Selector «agregar vehículo»            | 20                          | ninguno            | —                                                   | 300 ms                                    | 31 ms (64)                                                                    | ok                                          |
| Orígenes, resumen y categorías con uso | decenas de orígenes         | conteos del origen | —                                                   | 100 / 50 ms                               | 1,8 / 0,3 ms                                                                  | exento (administración)                     |
| Equipo, lista                          | el equipo                   | ninguno            | —                                                   | —                                         | —                                                                             | exento                                      |
| Baja de una persona, vista previa      | hasta 1.001                 | «más de 1.000»     | `leads_asesores_usuario_vigente_idx`                | 100 / 300 ms                              | 12 ms; 200.000: 313 → 44–73 ms                                                | **arreglado** (cierre 1; era exacto)        |
| Baja de una persona                    | lotes de 5.000              | exacto (lo hecho)  | `leads_asesores_usuario_vigente_idx` + `leads_pkey` | 2.500 ms la llamada, 4.000 ms una corrida | 200.000: 17,9 s (y el corte de 8 s) → 0,5 s la llamada, 1,7–3,5 s una corrida | **arreglado** (cierre 1, `medir-bajas.sql`) |
| Tipos de cambio, historial             | 30                          | ninguno            | FK del cambio                                       | —                                         | —                                                                             | ok (sin aviso al llegar: PLAN)              |
| Bandeja / buscador / campana           | sin consulta todavía        | —                  | —                                                   | —                                         | —                                                                             | —                                           |

### Jobs (100.000 filas por purgar)

| Job                                               | Antes                                  | Ahora                                | Tope                                                          |
| ------------------------------------------------- | -------------------------------------- | ------------------------------------ | ------------------------------------------------------------- |
| `papelera-purgar`                                 | 29 s en una corrida, sin tope          | 3 s, 50 lotes por corrida, cada hora | 50 lotes (10.000 leads) por corrida                           |
| `limpieza-automatica`                             | 24 s (revisaba 100.800 para contarlos) | 0,6 s                                | mueve 200 y revisa 1.000 más                                  |
| `importaciones-vinculos-purgar`                   | 0,85 s, un `DELETE`                    | 0,5 s                                | lotes de 10.000, 10 por corrida                               |
| `apibara-consultas-purgar`                        | 0,08 s, un `DELETE`                    | 0,3 s                                | lotes de 10.000, 10 por corrida                               |
| `storage-gc` (reclamar 100 de 100.000 en la cola) | 0,9 s la primera pasada                | 0,05 s                               | 2.000 huérfanos encolados por pasada, 100 por ronda, 5 rondas |

### Ítems por página (9g): qué lista lo admite y su máximo

La persona elige 10, 25, 50 o 100 (`listas.por_pagina`, `?por=`) y cada lista declara su **máximo**: se muestra el menor de lo
pedido y ese máximo, y el selector ofrece hasta ahí. Un máximo se gana midiendo con volumen (`pnpm db:medir:volumen` lo asserta con
el tamaño que sale del código; `e2e/listas-por-pagina-volumen.spec.ts` mide bytes, nodos y una página profunda). Una lista que no
cabe con 100 declara uno menor y el motivo queda acá. Medido con 62.000 leads y 10.000 vehículos.

| Lista                                                                                                                        | Selector | Máximo                                    | Por qué y lo medido                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Listado de leads                                                                                                             | sí       | **100** (`MAXIMO_DE_PAGINA_DE_LEADS`)     | **Cabe con 100 desde la 9h** (fue 50: a 100 el planificador dejaba `leads_listado_idx` y leía los 50.000 leads de la dueña, 518 ms). Página 1 y una profunda a 100 filas: 19 ms la dueña, 17 Ana, sin recorrer `leads`. En el navegador, con 100 (la dueña): antes 704.768 B crudos (46.497 comprimidos), 5.020 nodos en escritorio y 5.015 en el celular, con la tabla y las tarjetas las dos en el HTML y el DOM; **hoy (cierre 1, una sola vista) 465.393 B en escritorio y 427.052 en el celular (37.615 / 37.278 comprimidos), 2.594 y 2.781 nodos** (Ana: 4.777 → 2.469 / 2.656). Presupuesto 3.500 nodos y 48 KB, y `?por=100` entra a la corrida normal (`leads-escala.spec.ts`). Una página profunda no suma nodos |
| Inventario de vehículos                                                                                                      | sí       | **100** (`MAXIMO_DE_PAGINA_DE_VEHICULOS`) | Cabe. 0,6 ms la página 1 y la 20 por cursor (`vehiculos_origen_listado_idx`, sin descartar). Con 100 filas: antes 1.387.796 B crudos (57.196 comprimidos) y 7.894 / 7.888 nodos; **hoy (cierre 1) 919.569 B en escritorio y 740.210 en el celular (47.333 / 45.167 comprimidos), 4.916 y 3.295 nodos**. Presupuesto 6.000 nodos y 60 KB (`vehiculos-por-pagina.spec.ts` en la corrida normal). 10, 25, 50 y 100 filas: 29,8 / 32,6 / 37,3 / 47,3 KB. Una página profunda no suma nodos                                                                                                                                                                                                                                      |
| Papelera de leads y de vehículos                                                                                             | no       | 5 lotes (`LOTES_POR_PAGINA`)              | La unidad es un lote de hasta 200 filas: 10 lotes ya serían 2.000. Entran cuando un lote muestre los primeros 20 con «Mostrar los 200» (pendiente del cierre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| «Ver más» de seguimientos y recordatorios                                                                                    | no       | 20, tope 500                              | Otro mecanismo (se acumula dentro de una ficha o un drawer): más ítems por clic empeora el DOM sin acortar el camino a lo antiguo, que es «Ir a una fecha»                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Columna del kanban                                                                                                           | no       | 50, tope 500                              | Su propia unidad (`TAMANO_DE_COLUMNA`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Importaciones recientes, equipo, vista previa de la importación, oportunidades, vínculos, interesados, candidatos, etiquetas | no       | fijas                                     | Sin páginas con Anterior y Siguiente o con topes fijos sin parámetro: el cliente no puede pedir más                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

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
  llega a una fila de hace meses al instante), pero sin un «página N» queda dudoso: PLAN.
- **El tope se dice** («Mostrando las 500 con actividad más reciente…») pero queda al pie de una columna de 500, y el camino
  a lo antiguo del kanban es la ficha de cada lead (no tiene filtros todavía): PLAN.
- **Una página de papelera con lotes de 200** son 1.000 filas de ~60 px, cada una con «Restaurar» y «Purgar»: usable pero
  larga; lo siguiente es un lote que muestra los primeros 20 y «Mostrar los 200» (PLAN).
- **Volver con «atrás»** vuelve a la página anterior del listado, no al principio (la URL lleva el cursor).
- «Mover a…» se parte en dos líneas en una columna de 288 px. Cosmético.
