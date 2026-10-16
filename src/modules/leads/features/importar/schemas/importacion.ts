import { z } from 'zod'
import { TIPOS_DEL_LEAD } from '../../../entities/alta'
import { FILAS_POR_LOTE, LIMITES_DE_IMPORTACION } from '../../../entities/importacion/limites'

// Lo que cruza el límite desde el navegador: se valida acá y la base lo vuelve a validar. Las claves de
// `atributos` tienen la forma de la clave de un campo del layout (nunca `__proto__` ni nada raro) y la
// base rechaza las que no son de un campo activo.
const CLAVE_DE_CAMPO = /^[a-z][a-z0-9_]{1,40}$/

const valorDeAtributo = z.union([
  z.string().max(5000),
  z.number().finite(),
  z.boolean(),
  z.array(z.string().max(500)).max(50),
])

const filaDelLote = z.object({
  // guid y no uuid: `z.uuid()` rechaza uuids que Postgres acepta.
  id: z.guid(),
  fila: z
    .number()
    .int()
    .min(2)
    .max(LIMITES_DE_IMPORTACION.filas + 1),
  lead: z.object({
    nombre: z.string().max(120),
    telefono_principal: z.string().max(40),
    tipo: z.enum(TIPOS_DEL_LEAD),
    origen_lead_id: z.guid().nullable(),
    atributos: z.record(z.string().regex(CLAVE_DE_CAMPO), valorDeAtributo),
  }),
})

export const esquemaImportarLote = z.object({
  importacionId: z.guid(),
  total: z.number().int().min(1).max(LIMITES_DE_IMPORTACION.filas),
  filas: z.array(filaDelLote).min(1).max(FILAS_POR_LOTE),
})

export const esquemaTerminarImportacion = z.object({
  importacionId: z.guid(),
  yaExistian: z.number().int().min(0).max(LIMITES_DE_IMPORTACION.filas),
  rechazadas: z.number().int().min(0).max(LIMITES_DE_IMPORTACION.filas),
  origenId: z.guid().nullable(),
})

export const esquemaDeshacerImportacion = z.object({ importacionId: z.guid() })
