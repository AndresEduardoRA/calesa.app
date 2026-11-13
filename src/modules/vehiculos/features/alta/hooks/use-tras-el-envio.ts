'use client'

import { useCallback, useEffect, useReducer, useRef } from 'react'

export type TrasElEnvio = {
  // Encola algo para cuando el envío ya no esté en curso (el aviso de guardado, cerrar el panel). Estable entre renders.
  despues: (hacer: () => void) => void
  cola: { current: (() => void)[] }
}

// 9-7: el aviso de «guardado» salía con el pie todavía en «Guardando…». `isPending` de next-safe-action dura hasta que la pantalla termina de refrescarse,
// así que lo que sigue a guardar se encola y sale cuando el envío ya no está en curso (`useSoltarTrasElEnvio`). Va en dos llamadas porque quien avisa se arma
// antes que el hook del formulario, que es de donde sale `enCurso`.
export function useTrasElEnvio(): TrasElEnvio {
  const cola = useRef<(() => void)[]>([])
  const [, pedirUnRender] = useReducer((n: number) => n + 1, 0)
  const despues = useCallback((hacer: () => void) => {
    cola.current.push(hacer)
    pedirUnRender()
  }, [])
  return { despues, cola }
}

const soltar = (cola: TrasElEnvio['cola']) => {
  for (const hacer of cola.current.splice(0)) {
    hacer()
  }
}

// Corre lo encolado, en orden y una vez cada cosa, en el primer render en que `enCurso` es falso. Si el componente se desmonta antes, sale al
// desmontarse: sólo se encola tras un guardado que entró, y lo que desmonta suele ser justo la versión nueva que trajo el refresco (el panel
// de un vehículo o de un embudo se vuelve a montar con ella), así que el envío ya terminó.
export function useSoltarTrasElEnvio(tras: TrasElEnvio, enCurso: boolean): void {
  const { cola } = tras
  useEffect(() => {
    if (!enCurso) {
      soltar(cola)
    }
  })
  useEffect(
    () => () => {
      soltar(cola)
    },
    [cola],
  )
}
