import { useState } from 'react'

// Dos celdas de la misma fila no se guardan en paralelo (8.09-2, C9): el segundo guardado partiría de la versión vieja y chocaría con el primero. Una cola por clave: cada trabajo espera al
// anterior de su fila (sea cual sea su resultado); filas distintas no se esperan. El trabajo lee la versión al correr, no al encolarse.
export function colaPorClave() {
  const colas = new Map<string, Promise<unknown>>()
  return function encolar<T>(clave: string, trabajo: () => Promise<T>): Promise<T> {
    const anterior = colas.get(clave) ?? Promise.resolve()
    const siguiente = anterior.then(trabajo, trabajo)
    const cola = siguiente.catch(() => undefined)
    colas.set(clave, cola)
    void cola.then(() => {
      if (colas.get(clave) === cola) colas.delete(clave)
    })
    return siguiente
  }
}

export function useColaPorFila() {
  return useState(colaPorClave)[0]
}
