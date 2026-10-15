// Pedirle algo a una función edge servida por el runtime local, tolerando que no responda. Es la
// única definición de «sin respuesta» y de la espera entre intentos: la usan la guardia
// (`guardia.ts`) y los specs que llaman a una función de verdad.
//
// El runtime local recicla sus procesos entre pedidos y alguno se corta justo en medio: su registro
// dice `connection aborted` y el gateway contesta 503 sin cuerpo. Eso, o un pedido que ni siquiera
// llegó (`fetch` lanza), es «sin respuesta» y se vuelve a pedir. Una respuesta de la función nunca:
// las nuestras contestan siempre con un cuerpo (sus errores esperados van con 200 y `ok: false`).

export const ESPERA_ENTRE_INTENTOS_MS = 500
export const INTENTOS_ANTE_UN_CORTE = 3

const DEL_GATEWAY_SIN_RESPUESTA = [502, 503, 504]

// La respuesta, o el motivo por el que no la hubo.
async function unPedido(url: string, init: RequestInit): Promise<Response | string> {
  let respuesta: Response
  try {
    respuesta = await fetch(url, init)
  } catch (error) {
    return `el pedido no llegó (${error instanceof Error ? error.message : String(error)})`
  }
  if (DEL_GATEWAY_SIN_RESPUESTA.includes(respuesta.status)) {
    const cuerpo = await respuesta.clone().text()
    if (cuerpo === '') {
      return `el gateway respondió ${String(respuesta.status)} sin cuerpo`
    }
  }
  return respuesta
}

// Pide hasta `intentos` veces mientras no haya respuesta, con `ESPERA_ENTRE_INTENTOS_MS` entre una y
// otra, y deja una línea en la salida por cada reintento. `null` = no respondió en ningún intento.
export async function pedirAFuncion(
  url: string,
  init: RequestInit,
  { etiqueta, intentos = INTENTOS_ANTE_UN_CORTE }: { etiqueta: string; intentos?: number },
): Promise<Response | null> {
  for (let intento = 1; intento <= intentos; intento++) {
    const resultado = await unPedido(url, init)
    if (typeof resultado !== 'string') {
      return resultado
    }
    if (intento < intentos) {
      console.warn(
        `[funciones] reintento: ${etiqueta} sin respuesta (${resultado}), intento ${String(intento + 1)} de ${String(intentos)}`,
      )
      await new Promise((resolver) => setTimeout(resolver, ESPERA_ENTRE_INTENTOS_MS))
    }
  }
  return null
}
