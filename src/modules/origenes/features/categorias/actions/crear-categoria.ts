'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioCategorias } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../entities/motivos'
import { esquemaCrearCategoria } from '../schemas/categorias'

// Una categoría nueva va al final de su lugar. Un solo nivel de anidado: la RPC rechaza una hija de una hija.
export const crearCategoria = actionClient
  .inputSchema(esquemaCrearCategoria)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'origenes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_ORIGENES)
    }
    const hecho = await repositorioCategorias.crear(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.origenes, 'layout')
    }
    return hecho
  })
