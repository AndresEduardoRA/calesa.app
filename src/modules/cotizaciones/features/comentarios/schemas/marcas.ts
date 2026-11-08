import { z } from 'zod'
import { esquemaDelMotivo } from '../../../entities/comentarios/moderacion-lectura'

// Lo que mandan favorita, reportar y moderar (4.27-4). La base vuelve a revisarlo todo (ver, moderar, el motivo, la versión).
export const esquemaPonerFavorita = z.object({ cotizacionId: z.guid(), valor: z.boolean() })

export const esquemaReportar = z.object({ cotizacionId: z.guid(), motivo: esquemaDelMotivo })

export const esquemaRetirarReporte = z.object({ cotizacionId: z.guid() })

// La versión es el texto de la base, tal cual (con sus microsegundos): nunca pasa por `Date`.
export const esquemaModerar = z.object({
  cotizacionId: z.guid(),
  actualizadoEn: z.string().min(1),
  estado: z.enum(['invalida', 'activa']),
})
