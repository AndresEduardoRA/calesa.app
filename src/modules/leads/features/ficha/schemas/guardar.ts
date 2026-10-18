import { z } from 'zod'
import { LARGO_MAXIMO_DEL_NOMBRE } from '../../../entities/alta'

// Lo que cruza el límite al guardar la ficha: ya validado y reducido a lo que cambió por el mismo
// código que usa la pantalla (`validarEdicion()`); el servidor revisa la forma y la base el resto
// (permiso, versión, layout), con el dato en el `hint`.
const valorDeAtributo = z.union([
  z.string().max(6000),
  z.number(),
  z.boolean(),
  z.array(z.string().max(80)).max(100),
])

const cambios = z
  .object({
    nombre: z.string().trim().min(1).max(LARGO_MAXIMO_DEL_NOMBRE).optional(),
    tipoLeadId: z.guid().optional(),
    origenId: z.guid().nullable().optional(),
    // Un valor pone o cambia; `null` quita la clave.
    atributos: z
      .record(z.string().min(1).max(60), valorDeAtributo.nullable())
      .refine((campos) => Object.keys(campos).length <= 300, { error: 'Son demasiados campos.' })
      .optional(),
  })
  .refine((c) => Object.keys(c).length > 0, { error: 'No hay nada que guardar.' })

export const esquemaGuardarLead = z.object({
  id: z.guid(),
  // La versión que tenía en pantalla quien edita.
  actualizadoEnEsperado: z.string().min(1),
  cambios,
})
