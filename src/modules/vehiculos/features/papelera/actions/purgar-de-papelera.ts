'use server'

import { fallo } from '@/shared/lib/errores'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioPapelera } from '../../../composicion'
import { puedePurgar } from '../../../entities/papelera'
import { revalidarInventario } from '../revalidar'
import { esquemaSobreUnLote } from '../schemas/papelera'

// Purga un lote, entero o por partes: borra las filas para siempre y deja sus fotos en la cola de
// limpieza de Storage. Con la versión del lote: si otra persona restauró o purgó algo mientras
// tanto, la base responde `conflicto` con quién y cuándo. Lo que no se puede purgar (dinero
// registrado, un vínculo) vuelve en `bloqueados`.
export const purgarDePapelera = actionClient
  .inputSchema(esquemaSobreUnLote)
  .action(async ({ parsedInput, ctx }) => {
    if (!puedePurgar(ctx.permisos)) {
      return fallo('sin_permiso', 'No tienes permiso para purgar la papelera.')
    }
    const resultado = await repositorioPapelera.purgar(parsedInput)
    revalidarInventario()
    return resultado
  })
