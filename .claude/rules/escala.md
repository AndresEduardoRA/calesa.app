---
paths:
  - 'src/**'
  - 'supabase/**'
  - 'e2e/**'
  - 'scripts/**'
---

# Escala

Toda lista se diseña para miles de filas, aunque la semilla tenga 20. Se verifica con volumen
sembrado, no a ojo (`docs/RENDIMIENTO.md` tiene cada superficie con su tope, índice y presupuesto, medida
con 50.000 leads: `pnpm db:sembrar-volumen` y `pnpm db:medir:volumen`).

- Una lista se lee por cursor (keyset), una página fija a la vez. El tamaño de la página y el tope
  salen de un solo punto (`TAMANO_DE_PAGINA` y `TOPE_DE_LO_CARGADO` de `src/shared/lib/paginacion.ts`;
  la 9g los hará configurables). Nunca `offset` ni `.range()`.
- Lo que se dibuja tiene tope. Al llegar, se dice («Mostrando los 500 más recientes») y se ofrece un
  camino a lo antiguo («Ir a una fecha», un filtro). «Ver más» no suma para siempre. Lo que crece es la
  cantidad de lotes, de columnas o de páginas, no el alto de una página: la papelera lee 5 lotes por vez.
- Un número que se muestra sale de `limit n + 1` («más de 20») o no se muestra. Nunca de `count(*)`
  ni de `count: 'exact'`: el número crece con el total. La forma es una: la consulta pide `tope + 1`
  (o cuenta sobre un subselect con `limit tope + 1`), `conteoAcotado()` de `src/shared/lib/conteo.ts` lo
  vuelve `{ n, hayMas }` y `conteoEnFrase()` («más de 50») o `conteoCorto()` («500+») lo escriben.
  PostgREST corta un pedido en 1.000 filas (`max_rows`): un tope mayor se lee por páginas.
- Cada consulta nombra en un comentario el índice que la sostiene y tiene su `EXPLAIN` en
  `pnpm db:medir:volumen`, que asserta la forma del plan genérico (el que usa plpgsql tras unas llamadas):
  el índice, sin recorrer la tabla, sin descartar filas que crezcan con la profundidad, y su presupuesto
  de tiempo. En plpgsql, con cursor y sin cursor son dos consultas: un `p_x is null or (…)` o un
  `coalesce` en el cursor dejan de ser condición de índice. Una función que el planificador toma por
  barata (`COST` 100) y no lo es (`atributos_lead()`, ~75 µs) lleva su `COST` verdadero: con el barato,
  Postgres lee todo y ordena en vez de caminar el índice y cortar.
- Las listas hijas se leen al abrir su pestaña o su sección, nunca con la lectura del padre, y su
  código viaja con `diferido()`.
- **El código diferido pasa por `diferido()`** de `src/shared/ui/diferido.tsx`, nunca por `next/dynamic`
  (el lint lo prohíbe): carga con un reintento y, sin red, dice «Sin conexión» en su lugar con
  «Reintentar» en vez de tumbar la pantalla al `error.tsx`. Un modal o un panel se monta con
  `useAbiertoAlgunaVez()`.
- **El shell importa sólo lo que dibuja el marco.** Todo lo que importa `src/app/(app)/layout.tsx` viaja
  en el JS de todas las pantallas, así que no importa el `index.ts` de un módulo (reexporta cada
  pantalla) sino su entrada `@/modules/<x>/shell` (y `shell.client` para un Client Component de
  `_shell/`). «Nuevo lead» es el botón y la tecla `N`; el drawer llega con el primer clic.
- Ninguna acción crece con lo cargado: recargar lee una página (y lo puntual por su id), buscar tiene
  tope de páginas, nada consulta por fila (N+1).
- Exportar, importar y los jobs van por lotes con tope por lote y por corrida (`supabase/tests/medir-jobs.sql`
  los mide con 100.000 filas por purgar).
- Las imágenes se piden por preset de tamaño, nunca el original (la miniatura de 480 px en toda lista).
- Toda lista nueva se prueba con volumen sembrado por SQL (`generate_series`, `e2e/soporte/sql.ts`):
  bytes de la primera respuesta, plan y nodos del DOM. Con la semilla de 20 filas no se sabe nada.

## Las guardas (qué falla si la próxima lista no cumple)

| Guarda                                                                                                                                                                    | Dónde                                                                                                                              | Corre en                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Código: `count:`, `head: true`, `.range(`, `.select('*')` y un `.from('<tabla que crece>')` sin `.limit(`, `.single()`, `.maybeSingle()` ni filtro por `id` en su función | `scripts/guardas/escala.test.ts`; las excepciones, cada una con su motivo y su tope, en `scripts/guardas/excepciones-de-escala.ts` | `pnpm test`              |
| Código diferido: ningún `next/dynamic`, todo `diferidos.tsx` por `diferido()`                                                                                             | `eslint.config.mjs` y `scripts/guardas/diferidos.test.ts`                                                                          | `pnpm lint`, `pnpm test` |
| SQL: nada con `offset`, y un `count(` sin `limit` figura con su motivo                                                                                                    | `supabase/tests/escala.sql` (lee `pg_proc` y `pg_views` vigentes)                                                                  | `pnpm db:probar`         |
| Planes y tiempos de cada consulta del inventario, como la dueña («todos») y como la asesora («propios»)                                                                   | `supabase/tests/medir-escala.sql`                                                                                                  | `pnpm db:medir:volumen`  |
| Los jobs con 100.000 filas por purgar: tiempo por corrida y tope                                                                                                          | `supabase/tests/medir-jobs.sql`                                                                                                    | `pnpm db:medir:volumen`  |
| JS en frío por ruta (`/leads`, `/perfil`, `/vehiculos`)                                                                                                                   | `e2e/presupuesto-js.spec.ts`, presupuestos en `e2e/soporte/presupuestos.ts`                                                        | `pnpm test:e2e`          |
| Nodos del DOM del drawer, del listado y de una columna del kanban con volumen                                                                                             | `e2e/leads-rapido-volumen.spec.ts`, `e2e/leads-escala.spec.ts`                                                                     | `pnpm test:e2e`          |
