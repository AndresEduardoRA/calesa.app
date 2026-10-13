'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { actionClient } from '@/shared/lib/safe-action'
import { leerVistas, repositorioVistas } from '../../../composicion'
import { RUTA_DE_PANTALLA, motivoParaNoGuardar } from '../../../entities/vista'
import { esquemaGuardarVista } from '../schemas/vistas'

// Guarda los filtros de ahora con un nombre. No pide ningún permiso: las vistas son de quien las
// guarda (la RLS es de fila propia) y lo que guardan es una URL, que el listado vuelve a leer con
// los permisos del momento.
export const guardarVista = actionClient
  .inputSchema(esquemaGuardarVista)
  .action(async ({ parsedInput, ctx }) => {
    const existentes = await leerVistas(parsedInput.pantalla)
    if (!existentes.ok) {
      return existentes
    }
    const motivo = motivoParaNoGuardar(existentes.data, parsedInput.nombre)
    if (motivo !== null) {
      return fallo('regla', motivo)
    }
    const guardada = await repositorioVistas.guardar({ ...parsedInput, usuarioId: ctx.usuarioId })
    if (guardada.ok) {
      revalidatePath(RUTA_DE_PANTALLA[parsedInput.pantalla])
    }
    return guardada
  })
