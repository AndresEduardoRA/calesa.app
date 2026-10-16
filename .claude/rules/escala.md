---
paths:
  - 'src/**'
  - 'supabase/**'
  - 'e2e/**'
  - 'scripts/**'
---

# Escala

Toda lista se diseña para miles de filas, aunque la semilla tenga 20. Se verifica con volumen
sembrado, no a ojo (`docs/RENDIMIENTO.md` tiene cada superficie con su tope, índice y presupuesto).

- Una lista se lee por cursor (keyset), una página fija a la vez. El tamaño de la página y el tope
  salen de un solo punto (`TAMANO_DE_PAGINA` y `TOPE_DE_LO_CARGADO` de `src/shared/lib/paginacion.ts`;
  la 9g los hará configurables). Nunca `offset`.
- Lo que se dibuja tiene tope. Al llegar, se dice («Mostrando los 500 más recientes») y se ofrece un
  camino a lo antiguo («Ir a una fecha», un filtro). «Ver más» no suma para siempre.
- Un número que se muestra sale de `limit n + 1` («más de 20») o no se muestra. Nunca de `count(*)`
  ni de `count: 'exact'`: el número crece con el total.
- Cada consulta nombra en un comentario el índice que la sostiene y tiene su `EXPLAIN` en
  `pnpm db:medir`, que asserta la forma del plan genérico (el que usa plpgsql tras unas llamadas):
  el índice, sin recorrer la tabla, sin descartar filas que crezcan con la profundidad. En plpgsql, con
  cursor y sin cursor son dos consultas: un `p_x is null or (…)` o un `coalesce` en el cursor dejan de
  ser condición de índice.
- Las listas hijas se leen al abrir su pestaña o su sección, nunca con la lectura del padre, y su
  código viaja con un `import()` diferido.
- Ninguna acción crece con lo cargado: recargar lee una página (y lo puntual por su id), buscar tiene
  tope de páginas, nada consulta por fila (N+1).
- Exportar, importar y los jobs van por lotes con tope por lote y por pedido.
- Las imágenes se piden por preset de tamaño, nunca el original.
- Toda lista nueva se prueba con volumen sembrado por SQL (`generate_series`, `e2e/soporte/sql.ts`):
  bytes de la primera respuesta, plan y nodos del DOM. Con la semilla de 20 filas no se sabe nada.
