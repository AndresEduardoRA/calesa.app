import { z } from 'zod'
import { esquemaDeClave } from '../../../entities/portal'

// Lo que cruza el límite del acceso del cliente. La clave escrita sigue la regla de la base (el mismo
// motivo, antes de enviar); nula, la genera la base. Si el lead se ve y quién puede, lo decide la base.
export const esquemaOtorgarPortal = z.object({
  leadId: z.guid(),
  clave: esquemaDeClave.nullable(),
  // La versión que la persona ve, tal cual la dio la base (nula si no hay acceso).
  otorgadoEnEsperado: z.string().max(40).nullable(),
})

export const esquemaLeadDelPortal = z.object({ leadId: z.guid() })
