'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDePapeleraDeLeads } from '../../../composicion'
import { puedePurgarLeads, type ResultadoDePurgar } from '../../../entities/papelera'
import { esquemaSobreUnLote } from '../schemas/papelera'

// Purga un lote, entero o por partes: borra las filas para siempre. Con la versión del lote: si
// otra persona restauró o purgó algo mientras tanto, la base responde conflicto con quién y cuándo.
// Lo que no se puede purgar (un vehículo vinculado, pagos, el portal vigente) vuelve en
// `bloqueados`.
export const purgarLeadsDePapelera = actionClient
  .inputSchema(esquemaSobreUnLote)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ResultadoDePurgar>> => {
    if (!puedePurgarLeads(ctx.permisos)) {
      return fallo('sin_permiso', 'No tienes permiso para purgar la papelera de leads.')
    }
    const resultado = await repositorioDePapeleraDeLeads.purgar(parsedInput)
    if (resultado.ok) {
      revalidatePath(RUTAS.leads, 'layout')
    }
    return resultado
  })
