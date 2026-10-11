'use server'

import { redirigir } from '@/shared/lib/navegacion'
import { destinoTrasIngresar } from '@/shared/lib/rutas'
import { actionClientPublico } from '@/shared/lib/safe-action'
import { servicioAcceso } from '../../../composicion'
import { esquemaIngreso } from '../schemas/acceso'
import { rechazarSiInactiva } from '../sesion'

export const ingresar = actionClientPublico
  .inputSchema(esquemaIngreso)
  .action(async ({ parsedInput }) => {
    const { email, contrasena, returnTo } = parsedInput
    const ingreso = await servicioAcceso.ingresar({ email, contrasena })
    if (!ingreso.ok) {
      return ingreso
    }
    const rechazo = await rechazarSiInactiva(ingreso.data.estado)
    if (rechazo) {
      return rechazo.resultado
    }
    redirigir(destinoTrasIngresar(returnTo))
  })
