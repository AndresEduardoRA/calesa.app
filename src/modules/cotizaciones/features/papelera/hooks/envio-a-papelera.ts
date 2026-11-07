import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarConDeshacer, avisarError, avisarExito } from '@/shared/ui/toasts'
import {
  errorDeEnvio,
  resumenDeEnvio,
  resumenDeRestauracion,
  type ResultadoDeEnvio,
  type ResultadoDeRestaurar,
} from '../../../entities/papelera/resultados'
import { enviarCotizacionesAPapelera } from '../actions/enviar-a-papelera'
import { restaurarCotizacionesDePapelera } from '../actions/restaurar-de-papelera'

// Enviar a la papelera desde la guardada (4.24-3). Llama a las actions directo, sin `useAction` (el botón lleva su propio «en curso»): el JS en frío de la guardada
// está al tope. Es reversible: se hace y se ofrece «Deshacer» 10 s, como en vehículos y leads. Manda la versión de la página
// tal cual; «Deshacer» restaura ese lote con la versión que devolvió el envío.

const NO_SE_ENVIO = 'No se pudo enviar.'
const NO_SE_RESTAURO = 'No se pudo restaurar.'

async function deshacer(envio: ResultadoDeEnvio): Promise<void> {
  if (!envio.lote || !envio.actualizadoEn) {
    return
  }
  const resultado = await enviarAccion<ResultadoDeRestaurar>(
    restaurarCotizacionesDePapelera({
      loteId: envio.lote,
      actualizadoEnEsperado: envio.actualizadoEn,
    }),
    NO_SE_RESTAURO,
  )
  if (!resultado.ok) {
    avisarError(resultado.error)
    return
  }
  const dicho = resumenDeRestauracion(resultado.data)
  // Una sola: si no volvió, es un error de regla con su motivo (como en la papelera).
  if (resultado.data.restaurados.length === 0) {
    avisarError({ codigo: 'regla', mensaje: dicho })
  } else {
    avisarExito(dicho)
  }
}

// Devuelve si entró (para que quien llama deje la página, que ya no existe para nadie).
export async function enviarLaGuardadaALaPapelera(cotizacion: {
  id: string
  actualizadoEn: string
}): Promise<boolean> {
  const resultado = await enviarAccion<ResultadoDeEnvio>(
    enviarCotizacionesAPapelera({ cotizaciones: [cotizacion] }),
    NO_SE_ENVIO,
  )
  if (!resultado.ok) {
    avisarError(resultado.error)
    return false
  }
  const envio = resultado.data
  if (envio.enviados.length === 0) {
    avisarError(errorDeEnvio(envio))
    return false
  }
  avisarConDeshacer(resumenDeEnvio(envio), () => {
    void deshacer(envio)
  })
  return true
}
