'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioPerfil } from '../../../composicion'
import { esAvatarDe, esquemaPerfil } from '../schemas/perfil'

// Cada persona edita su propio perfil: no hay permiso que pedir, el id sale de la sesión y nunca
// del formulario. La base lo repite (policy `id = auth.uid()` y grant por columna).
export const guardarPerfil = actionClient
  .inputSchema(esquemaPerfil)
  .action(async ({ parsedInput, ctx }) => {
    const { nombre, avatarRuta, avatarMiniaturaRuta, actualizadoEnEsperado } = parsedInput
    for (const ruta of [avatarRuta, avatarMiniaturaRuta]) {
      if (ruta && !esAvatarDe(ctx.usuarioId, ruta)) {
        return fallo('sin_permiso', 'Esa foto no es tuya.')
      }
    }
    const guardado = await repositorioPerfil.actualizar({
      usuarioId: ctx.usuarioId,
      nombre,
      avatarRuta,
      avatarMiniaturaRuta: avatarRuta ? (avatarMiniaturaRuta ?? null) : null,
      actualizadoEnEsperado,
    })
    if (guardado.ok) {
      // El nombre y la foto están en el menú de toda la app, no sólo en esta pantalla.
      revalidatePath(RUTAS.inicio, 'layout')
    }
    return guardado
  })
