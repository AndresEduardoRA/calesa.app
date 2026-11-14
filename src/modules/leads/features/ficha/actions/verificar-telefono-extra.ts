'use server'

import { fallo, type Resultado } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTelefonos } from '../../../composicion'
import type { Verificacion } from '../../../entities/verificacion'
import { esquemaVerificarTelefonoExtra } from '../schemas/telefonos'

// «¿Ya existe este número, y de quién es?» al agregar un teléfono extra a un lead: la base dice qué pasa según la regla de la empresa
// (bloquea o sólo avisa) y sólo a quien tiene el lead en su cartera y puede editar sus teléfonos extra.
export const verificarTelefonoExtra = actionClient
  .inputSchema(esquemaVerificarTelefonoExtra)
  .action(async ({ parsedInput, ctx }): Promise<Resultado<Verificacion>> => {
    if (!puede(ctx.permisos, 'leads.telefonos_extra.editar')) {
      return fallo('sin_permiso', 'No tienes permiso para editar los teléfonos extra.')
    }
    return repositorioDeTelefonos.verificarExtra({
      id: parsedInput.leadId,
      codigoDePais: parsedInput.codigoDePais,
      telefono: parsedInput.telefono,
    })
  })
