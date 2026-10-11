'use server'

import { redirigir } from '@/shared/lib/navegacion'
import { RUTAS, returnToSeguro } from '@/shared/lib/rutas'
import { actionClientPublico } from '@/shared/lib/safe-action'
import { servicioAcceso } from '../../../composicion'
import { origenDelSitio } from '../origen'
import { esquemaGoogle } from '../schemas/acceso'

export const ingresarConGoogle = actionClientPublico
  .inputSchema(esquemaGoogle)
  .action(async ({ parsedInput }) => {
    const volverA = new URL(RUTAS.canje, await origenDelSitio())
    const siguiente = returnToSeguro(parsedInput.returnTo)
    if (siguiente) {
      volverA.searchParams.set('next', siguiente)
    }
    const google = await servicioAcceso.urlDeGoogle(volverA.toString())
    if (!google.ok) {
      return google
    }
    // Sale del sitio: a la pantalla de Google. Vuelve por /auth/callback.
    redirigir(google.data.url)
  })
