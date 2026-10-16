# Rendimiento

Cada superficie que crece con los datos, con su tope, el índice que la sostiene, su presupuesto y
dónde se mide. La regla está en `.claude/rules/escala.md`. Las mediciones no son a mano:

- **La base:** `pnpm db:medir` (`scripts/medir-listado.mjs`) corre cada `supabase/tests/medir-*.sql`
  contra el Supabase local en una transacción que se revierte. `medir-volumen.sql` además **asserta la
  forma del plan genérico**: el índice nombrado, ningún recorrido de la tabla y lo que se descarta. Si
  una consulta cambia de forma, falla.
- **La pantalla:** cada superficie tiene su e2e con volumen sembrado por SQL (`e2e/soporte/sql.ts`).
  Cuenta los pedidos, los bytes de la primera respuesta y los nodos del DOM, sin cronómetros.
- **El JS en frío** es la suma de los `.js` de `/_next/static` que pide una página en un contexto
  nuevo, con gzip. Se mide con un spec temporal que no se commitea. El shell trae lo que el layout
  `(app)` alcanza por `@/modules/leads` (el `index.ts` reexporta la ficha): por eso `/perfil` pesa lo
  mismo que `/leads`. El presupuesto de `/leads` se fija en el cierre de la Fase 3.

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

## `/leads`

| Qué        | Valor                                                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| JS en frío | 509,6 KB con gzip en 25 chunks, antes y después de la 9d-2. La 9d dio 508,9 KB con otro script; este método da 509,6 sobre lo mismo |
| Documento  | 66,0 KB sobre `/perfil` (9d)                                                                                                        |
| Listado    | `leads_listado_idx`; medido en `medir-listado.sql` con 2.000 leads                                                                  |

Lo que hace falta para no subirlo:

- Las pestañas del drawer, el bloque de recordatorios de la ficha y lo de una línea de tiempo larga
  («Ir a una fecha», «Desde el …», el aviso del tope) van con `import()` diferido.
- Sin eso, el código nuevo sumaba 5,1 KB a todas las pantallas por el camino del shell.
