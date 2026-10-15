import type { ErrorApp } from './errores'

// Lo que devuelve una Server Action de guardado: el dato, o el error con los campos que no pasaron
// (por su clave en el formulario) para escribir el motivo al lado de cada uno.
export type ResultadoDeAccion<Dato> =
  { ok: true; data: Dato } | { ok: false; error: ErrorApp; porCampo?: Record<string, string> }

// Además de lo que devuelve la action: si el pedido ni siquiera llegó al servidor.
export type Envio<Dato> = ResultadoDeAccion<Dato> | { ok: false; error: ErrorApp; sinRed: true }

type Respuesta<Dato> = { data?: ResultadoDeAccion<Dato>; serverError?: ErrorApp } | undefined

// Una action que no llega al servidor no responde: su promesa falla (o vuelve vacía). Eso se
// distingue de un error del servidor, porque lo que no llegó se puede reintentar tal cual.
// `mensajeDeValidacion` es lo que se dice si la entrada no pasó el esquema de la action.
export async function enviarAccion<Dato>(
  pedido: Promise<Respuesta<Dato>>,
  mensajeDeValidacion: string,
): Promise<Envio<Dato>> {
  const sinRed: Envio<Dato> = {
    ok: false,
    sinRed: true,
    error: { codigo: 'inesperado', mensaje: 'No pudimos llegar al servidor.' },
  }
  try {
    const respuesta = await pedido
    if (!respuesta) {
      return sinRed
    }
    if (respuesta.serverError) {
      return { ok: false, error: respuesta.serverError }
    }
    return (
      respuesta.data ?? {
        ok: false,
        error: { codigo: 'validacion', mensaje: mensajeDeValidacion },
      }
    )
  } catch {
    return sinRed
  }
}
