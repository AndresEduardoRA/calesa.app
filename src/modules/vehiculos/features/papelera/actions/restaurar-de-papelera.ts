'use server'

import { fallo } from '@/shared/lib/errores'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioPapelera } from '../../../composicion'
import { puedeAbrirLaPapelera } from '../../../entities/papelera'
import { revalidarInventario } from '../revalidar'
import { esquemaSobreUnLote } from '../schemas/papelera'

// Restaura un lote, entero o por partes, con la versión que tenía en pantalla. Lo hace quien lo
// envió o quien puede vaciar la papelera: eso lo decide la base. Es también el «Deshacer» de un
// envío. Lo que choca con un VIN que ya tomó otro vuelve en `pendientes`.
export const restaurarDePapelera = actionClient
  .inputSchema(esquemaSobreUnLote)
  .action(async ({ parsedInput, ctx }) => {
    if (!puedeAbrirLaPapelera(ctx.permisos)) {
      return fallo('sin_permiso', 'No tienes permiso para restaurar de la papelera.')
    }
    const resultado = await repositorioPapelera.restaurar(parsedInput)
    revalidarInventario()
    return resultado
  })
