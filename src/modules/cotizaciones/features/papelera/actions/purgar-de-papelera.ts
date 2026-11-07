'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDePapeleraDeCotizaciones } from '../../../areas/papelera/composicion'
import { puedePurgarLaPapeleraDeCotizaciones } from '../../../entities/papelera/acceso'
import type { ResultadoDePurgar } from '../../../entities/papelera/resultados'
import { RUTA_DEL_LISTADO } from '../../../entities/ruta-de-la-hoja'
import { esquemaSobreUnLote } from '../schemas/papelera'

// Purga un lote, entero o por partes: borra las cotizaciones para siempre, con sus revisiones, comentarios y adjuntos. Con la versión del lote: si otra persona
// restauró o purgó algo mientras tanto, la base responde conflicto con quién y cuándo. Lo que otra tabla necesita (una final con su comprobante) vuelve en
// `bloqueados`. Sin la clave no se llama a la base (y la base la vuelve a pedir antes de mirar el lote).
export const purgarCotizacionesDePapelera = actionClient
  .inputSchema(esquemaSobreUnLote)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ResultadoDePurgar>> => {
    if (!puedePurgarLaPapeleraDeCotizaciones(ctx.permisos)) {
      return fallo('sin_permiso', 'No tienes permiso para purgar la papelera de cotizaciones.')
    }
    const resultado = await repositorioDePapeleraDeCotizaciones.purgar(parsedInput)
    if (resultado.ok) {
      // El listado, la guardada y la papelera misma (todo bajo `/cotizaciones`) ya no la ven.
      revalidatePath(RUTA_DEL_LISTADO, 'layout')
    }
    return resultado
  })
