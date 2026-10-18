import { z } from 'zod'
import { detalle } from '../../seguimientos/schemas/seguimientos'

// Lo que cruza el límite del alta: ya validado y convertido por el formulario (la misma función que
// usa la pantalla); el servidor revisa la forma y la base el resto, con el dato en el `hint`.
const valorDeAtributo = z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])

export const esquemaCrearLead = z.object({
  // El del intento: reintentar con el mismo no duplica.
  id: z.guid(),
  telefono: z.string().trim().min(1).max(60),
  nombre: z.string().trim().min(1).max(120),
  origenId: z.guid().nullable(),
  // El id del tipo (uno de los que la base ofrece activos); la base mira que siga activo.
  tipoLeadId: z.guid(),
  adoptar: z.boolean(),
  atributos: z.record(z.string(), valorDeAtributo),
  seguimiento: z
    .object({
      tipoId: z.guid(),
      titulo: z.string().trim().min(1).max(120),
      // El documento del editor, con la misma lista blanca que la ficha (y la base la vuelve a mirar).
      detalle,
      // El instante en que pasó; nulo = ahora.
      ocurridoEn: z.iso.datetime({ offset: true }).nullable(),
    })
    .nullable(),
  recordatorio: z.object({ recordarEn: z.iso.datetime({ offset: true }) }).nullable(),
})

export const esquemaVerificarTelefono = z.object({ telefono: z.string().max(60) })
