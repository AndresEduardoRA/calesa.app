import { z } from 'zod'
import { esquemaDeValorDeCelda } from '../../../entities/tablas/edicion'
import { esquemaDeNotaDeTabla } from '../../../entities/tablas/publicacion'
import { MENSAJE_DEL_TOPE, TOPE_DE_FILAS } from '../../../entities/tablas/validacion'

// Lo que manda «Publicar» de una tabla de referencia (4.23-2): la tabla, su origen (nulo en una compartida), las filas en su orden, la nota y la versión que se leyó.
// Las claves y los tipos de cada celda no se validan aquí (un booleano viaja: la base lo rechaza con su celda): lo hace la base con su mensaje y el camino de la celda (la action no recibe las columnas del navegador).
export const esquemaDePublicarTabla = z.object({
  tablaId: z.guid(),
  origenId: z.guid().nullable(),
  filas: z
    .array(z.record(z.string(), esquemaDeValorDeCelda))
    .max(TOPE_DE_FILAS, { error: MENSAJE_DEL_TOPE }),
  nota: esquemaDeNotaDeTabla,
  versionEsperada: z.int().min(1),
})

export type EntradaDePublicarTabla = z.infer<typeof esquemaDePublicarTabla>
