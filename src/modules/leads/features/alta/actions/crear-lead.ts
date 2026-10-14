'use server'

import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeAlta } from '../../../composicion'
import type { ResultadoDeAlta } from '../../../entities/repositorios'
import type { ResultadoDelAlta } from '../resultado'
import { esquemaCrearLead } from '../schemas/alta'

// Da de alta un lead con su primer seguimiento y su recordatorio, en una sola transacción. El
// permiso se comprueba acá y de nuevo en `crear_lead()`. Un duplicado vuelve como valor
// (`existe`, `de_otro`, `limbo`), no como error: la pantalla lo dice junto al teléfono.
export const crearLead = actionClient
  .inputSchema(esquemaCrearLead)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDelAlta<ResultadoDeAlta>> => {
    if (!puede(ctx.permisos, 'leads.crear')) {
      return fallo('sin_permiso', 'No tienes permiso para dar de alta leads.')
    }
    const { id, adoptar, ...datos } = parsedInput
    const creado = await repositorioDeAlta.crear({ id, adoptar, datos })
    if (!creado.ok) {
      const { campo, error } = creado
      return { ok: false, error, ...(campo ? { porCampo: { [campo]: error.mensaje } } : {}) }
    }
    return creado
  })
