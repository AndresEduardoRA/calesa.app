'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioCamposDeLead } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_LEADS } from '../../../entities/motivos'
import { esquemaCrearCampo } from '../schemas/campos'

// Un campo propio de los leads: nace al final del layout y no es de fábrica. Su clave no cambia después (los leads guardan sus valores con ella).
export const crearCampo = actionClient
  .inputSchema(esquemaCrearCampo)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'leads.configurar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_LEADS)
    }
    const hecho = await repositorioCamposDeLead.crear(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeLeads, 'layout')
    }
    return hecho
  })
