import { z } from 'zod'
import { esquemaDeEntradas } from './guardado'

// Lo que manda la hoja de una cotización guardada al guardar (`PedidoDeEdicion`, 4.15-3). Los ids son de la base (`z.guid()`); la versión es el texto de la base, acotado, sin pasar
// por una fecha (sus microsegundos); título y notas tienen los topes de la base (120 y 2.000, ya recortados). La base vuelve a validar todo con la sesión de quien guarda.
export const esquemaDeEdicion = z.object({
  intento: z.guid(),
  cotizacionId: z.guid(),
  actualizadoEn: z.string().min(10).max(64),
  entradas: esquemaDeEntradas,
  modoTc: z.string().min(1).max(200).nullable(),
  verTotalBs: z.boolean(),
  titulo: z.string().max(120).nullable(),
  notas: z.string().max(2000).nullable(),
  vehiculoId: z.guid().nullable(),
})
