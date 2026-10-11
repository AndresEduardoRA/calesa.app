'use server'

import { redirigir } from '@/shared/lib/navegacion'
import { getAjustes, registroDisponible } from '@/modules/empresa'
import { fallo } from '@/shared/lib/errores'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClientPublico } from '@/shared/lib/safe-action'
import { servicioAcceso } from '../../../composicion'
import { MENSAJE_REGISTRO_CERRADO } from '../../../entities/errores-acceso'
import { esquemaRegistro } from '../schemas/acceso'

export const registrarse = actionClientPublico
  .inputSchema(esquemaRegistro)
  .action(async ({ parsedInput }) => {
    // La pantalla no muestra el formulario con el registro cerrado, pero una action se puede
    // llamar igual. Se responde legible acá; quien de verdad lo impide es el trigger de la base.
    if (!registroDisponible(await getAjustes())) {
      return fallo('regla', MENSAJE_REGISTRO_CERRADO)
    }
    const registro = await servicioAcceso.registrar(parsedInput)
    if (!registro.ok) {
      return registro
    }
    // Con sesión (Auth sin confirmación de correo) entra directo. Sin sesión falta confirmar: el
    // aviso viaja en la URL y no en el estado del formulario, porque al escribir cookies esta
    // action hace que `/registro` se vuelva a dibujar, y con una persona ya creada esa página deja
    // de mostrar el formulario.
    redirigir(
      registro.data.sesionIniciada ? RUTAS.inicio : `${RUTAS.ingreso}?aviso=confirmar_correo`,
    )
  })
