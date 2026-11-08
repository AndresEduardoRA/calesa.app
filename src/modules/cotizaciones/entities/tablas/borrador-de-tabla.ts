// El borrador del editor de una tabla de referencia (4.23-3, C8): las filas (con su id) y los crudos, guardados en la pestaña del navegador con la versión que se leyó.
// Sólo se repone sobre esa misma versión: si la tabla se publicó después, lo guardado es de otra tabla y se descarta (nunca pisa una versión más nueva sin decirlo).
import { z } from 'zod'
import type { Borrador } from '@/shared/lib/borrador'
import { esquemaDeValorDeCelda, type FilaEditable } from './edicion'
import { TOPE_DE_FILAS } from './validacion'
import type { Crudos } from './vista-del-editor'

export const claveDelBorradorDeTabla = (tablaId: string) => `tabla-de-referencia:${tablaId}`

export type BorradorDeTabla = { version: number; filas: readonly FilaEditable[]; crudos: Crudos }

export type BorradorRecuperado =
  { tipo: 'misma'; filas: FilaEditable[]; crudos: Crudos } | { tipo: 'vieja' } | null

const esquemaDelBorrador = z.object({
  version: z.int().min(1),
  filas: z
    .array(
      z.object({ id: z.string().min(1), valores: z.record(z.string(), esquemaDeValorDeCelda) }),
    )
    .max(TOPE_DE_FILAS),
  crudos: z.record(
    z.string(),
    z.record(z.string(), z.object({ texto: z.string(), mensaje: z.string() })),
  ),
})

// `lib/borrador` guarda textos por campo: la tabla va entera en uno, como JSON.
export const borradorParaGuardar = (borrador: BorradorDeTabla): Borrador => ({
  tabla: JSON.stringify(borrador),
})

// Lo guardado con la misma versión, `vieja` si es de otra, nulo si no hay o no se lee (es lo mismo que no tener).
export function recuperarBorrador(guardado: Borrador | null, version: number): BorradorRecuperado {
  const crudo = guardado?.['tabla']
  if (crudo === undefined) return null
  let json: unknown
  try {
    json = JSON.parse(crudo)
  } catch {
    return null
  }
  const leido = esquemaDelBorrador.safeParse(json)
  if (!leido.success) return null
  if (leido.data.version !== version) return { tipo: 'vieja' }
  return { tipo: 'misma', filas: leido.data.filas, crudos: leido.data.crudos }
}
