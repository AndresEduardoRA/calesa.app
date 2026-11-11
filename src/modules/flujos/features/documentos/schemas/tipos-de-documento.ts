import { z } from 'zod'
import {
  FORMATOS_DE_DOCUMENTO,
  MODOS_DE_VENCIMIENTO,
} from '../../../entities/documentos/tipo-de-documento'

// Lo que cruza el límite de los tipos de documento: la forma y la lista cerrada de claves. Lo que vale cada dato (largo, repetido, días, el tope del
// grupo) lo dice la base con el campo en el `hint`.
const version = z.string().min(1)
// Nulo = el grupo de toda la empresa. Va en las cuatro: la action necesita el grupo para exigir su permiso antes de escribir.
const flujoId = z.guid().nullable()

const datos = {
  nombre: z.string().max(200),
  descripcion: z.string().max(2000).nullable(),
  formatos: z.array(z.enum(FORMATOS_DE_DOCUMENTO)).max(FORMATOS_DE_DOCUMENTO.length),
  modo_vencimiento: z.enum(MODOS_DE_VENCIMIENTO),
  vigencia_dias: z.number().int().nullable(),
  aviso_dias: z.number().int().nullable(),
  visible_portal_permitido: z.boolean(),
}

export const esquemaCrearTipoDeDocumento = z.object({
  // El del intento: el mismo en cada reintento.
  id: z.guid(),
  flujoId,
  cambios: z.strictObject(datos),
})

export const esquemaGuardarTipoDeDocumento = z.object({
  id: z.guid(),
  flujoId,
  actualizadoEnEsperado: version,
  cambios: z
    .strictObject({ ...datos, activo: z.boolean() })
    .partial()
    .refine((c) => Object.keys(c).length > 0, { error: 'No hay nada que guardar.' }),
})

export const esquemaMoverTipoDeDocumento = z.object({
  id: z.guid(),
  flujoId,
  actualizadoEnEsperado: version,
  // «Después de X»; nulo = primero.
  despuesDe: z.guid().nullable(),
})

export const esquemaEliminarTipoDeDocumento = z.object({
  id: z.guid(),
  flujoId,
  actualizadoEnEsperado: version,
})
