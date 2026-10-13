import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { resultadoDeAccion } from '@/shared/lib/formularios'

export const SIN_SERVIDOR = 'No pudimos llegar al servidor. Revisa tu conexión y vuelve a intentar.'

type Respuesta<Dato> = { serverError?: ErrorApp; data?: Resultado<Dato> }

// La respuesta de una action como un `Resultado`. Una que no llega al servidor no responde: su
// promesa falla (o vuelve vacía), y acá eso es un error como cualquier otro.
export async function respuestaDe<Dato>(
  envio: Promise<Respuesta<Dato> | undefined>,
): Promise<Resultado<Dato>> {
  try {
    const respuesta = await envio
    return respuesta ? resultadoDeAccion(respuesta) : fallo('inesperado', SIN_SERVIDOR)
  } catch {
    return fallo('inesperado', SIN_SERVIDOR)
  }
}
