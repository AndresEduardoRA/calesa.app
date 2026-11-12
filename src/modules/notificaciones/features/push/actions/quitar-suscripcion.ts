'use server'

import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDePush } from '../../../composicion'
import { esquemaQuitarSuscripcion } from '../schemas/push'

// Quitar un navegador propio. No exige el permiso: quien lo perdió tiene que poder quitar los suyos.
export const quitarSuscripcion = actionClient
  .inputSchema(esquemaQuitarSuscripcion)
  .action(async ({ parsedInput }) => repositorioDePush.desuscribir(parsedInput.endpoint))
