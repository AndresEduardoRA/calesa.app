# cotizaciones › papelera

El área `papelera` de `cotizaciones` (carril C, 4.24): la papelera propia de cotizaciones, por lote. Ficha del módulo: `../../CLAUDE.md` › «Áreas».

## Qué es

Lo que se envía a la papelera de cotizaciones es un lote (`lotes_papelera`, `tipo = 'cotizaciones'`, de 1 a 200) que se restaura o se purga. La base lo decide todo
(`cotizaciones_papelera_enviar|listar|lote|restaurar|purgar`, 4.24-1a y 4.24-1b): quién ve qué lote (los suyos o, con `cotizaciones.papelera.purgar`, todos), quién
restaura y qué queda pendiente. Acá se lee y se dibuja.

## Entradas

- `index.ts` (servidor): `leerPapeleraDeCotizaciones({ cursor, tamano })`, una página de lotes por cursor `(creado_en, id)`: pide `tamano + 1` y de cada lote las
  primeras `PRIMEROS_DEL_LOTE` (`infra/papelera/listar.ts`, índice `lotes_papelera_tipo_idx`). Una forma rota de la respuesta es un error, nunca una papelera vacía.
- `composicion.client.ts` (navegador; sólo su feature, ningún barril): `leerLoteDePapeleraDeCotizaciones(loteId)`, el lote entero para «Mostrar los N»; `no_encontrado`
  si ya no está.
- `client.ts` sigue vacío: el área no suma JS a quien importa `@/modules/cotizaciones/client`.

## Lo que no se rompe

- El lote trae sólo número, título (o «Cotización #n»), clase, origen y fecha: nada que la RLS le esconda a quien tiene la clave y no ve la cotización. Sin total, sin
  cliente ni vehículo (P6 del 4.24-1a; P4 del 4.24-2).
- Las RPC con tamaño están en `scripts/guardas/paginas-en-la-base-papelera.ts` (`p_tope` con `LOTES_POR_PAGINA + 1`, `p_primeros` con `PRIMEROS_DEL_LOTE`).
