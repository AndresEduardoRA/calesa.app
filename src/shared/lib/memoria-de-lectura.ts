import { ok, type Resultado } from './errores'

export type MemoriaDeLectura<T> = {
  // Lo guardado si todavía vale; si no, lee (una sola lectura a la vez: quien llega mientras otra va en camino espera la misma).
  leer: () => Promise<Resultado<T>>
  // Lo guardado si todavía vale, sin leer nada (para dibujar de una vez).
  vigente: () => T | null
  // Tira lo guardado y lo que viene en camino: una lectura que empezó antes no vuelve a guardarse.
  olvidar: () => void
}

// Una lectura del navegador que vale `vidaMs` y se comparte (un catálogo que casi no cambia). Sólo se guarda un resultado bueno: un fallo
// no se recuerda, el siguiente pedido lee de nuevo. `olvidar()` es para cuando se sabe que cambió (quien lo cambia lo llama al terminar).
export function memoriaDeLectura<T>(
  leer: () => Promise<Resultado<T>>,
  vidaMs: number,
  ahora: () => number = () => Date.now(),
): MemoriaDeLectura<T> {
  let guardado: { dato: T; en: number } | null = null
  let enCamino: Promise<Resultado<T>> | null = null
  let generacion = 0

  const vigente = () => (guardado !== null && ahora() - guardado.en < vidaMs ? guardado.dato : null)

  return {
    vigente,
    olvidar: () => {
      generacion += 1
      guardado = null
      enCamino = null
    },
    leer: () => {
      const dato = vigente()
      if (dato !== null) {
        return Promise.resolve(ok(dato))
      }
      if (enCamino) {
        return enCamino
      }
      const mia = generacion
      const lectura = leer().then(
        (resultado) => {
          if (mia === generacion) {
            enCamino = null
            if (resultado.ok) {
              guardado = { dato: resultado.data, en: ahora() }
            }
          }
          return resultado
        },
        (error: unknown) => {
          if (mia === generacion) {
            enCamino = null
          }
          throw error
        },
      )
      enCamino = lectura
      return lectura
    },
  }
}
