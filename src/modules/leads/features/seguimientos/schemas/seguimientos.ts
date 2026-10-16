import { z } from 'zod'
import { validarDocumento, type Documento } from '../../../entities/documento'
import { LARGO_MAXIMO_DEL_TITULO, VISIBILIDADES } from '../../../entities/seguimiento'

// Lo que cruza el límite de los seguimientos. El documento pasa por la misma lista blanca que la
// base (`validarDocumento()`): lo que no pasa no sale del servidor. La base lo vuelve a validar.
export const detalle = z
  .unknown()
  .superRefine((valor, ctx) => {
    const validado = validarDocumento(valor)
    if (!validado.ok) {
      ctx.addIssue({ code: 'custom', message: validado.motivo })
    }
  })
  .transform((valor): Documento | null => {
    const validado = validarDocumento(valor)
    return validado.ok ? validado.documento : null
  })

const titulo = z.string().trim().min(1).max(LARGO_MAXIMO_DEL_TITULO)
const instante = z.iso.datetime({ offset: true })

export const esquemaCrearSeguimiento = z.object({
  // El del intento: el mismo en cada reintento, así no se duplica.
  id: z.guid(),
  leadId: z.guid(),
  tipoId: z.guid(),
  titulo,
  detalle,
  visibilidad: z.enum(VISIBILIDADES),
  // Nulo = ahora.
  ocurridoEn: instante.nullable(),
  // Un recordatorio que entra junto (en la misma transacción); nulo = ninguno.
  recordatorio: z.object({ recordarEn: instante }).nullable(),
  // Un vehículo del lead que quien anota ve (la base lo vuelve a mirar); nulo = ninguno.
  vehiculoId: z.guid().nullable(),
})

export const esquemaGuardarSeguimiento = z.object({
  id: z.guid(),
  // La versión del seguimiento que tenía en pantalla quien lo edita.
  actualizadoEnEsperado: z.string().min(1),
  cambios: z
    .object({
      tipoId: z.guid().optional(),
      titulo: titulo.optional(),
      detalle: detalle.optional(),
      visibilidad: z.enum(VISIBILIDADES).optional(),
      ocurridoEn: instante.optional(),
      // Nulo lo quita.
      vehiculoId: z.guid().nullable().optional(),
    })
    .refine((c) => Object.keys(c).length > 0, { error: 'No hay nada que guardar.' }),
})

export const esquemaVersionDeSeguimiento = z.object({
  id: z.guid(),
  actualizadoEnEsperado: z.string().min(1),
})
