'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'

// El pedido al servidor de lo que la página no trajo (la cotización de `?cotizacion=` que no está en ella y que el servidor no leyó): `router.refresh()` vuelve a dibujar la
// página con la URL de ahora. Con `necesita` se hace **una vez por id** (`yaPedido`: se pidió, terminó y sigue sin llegar) y otra por cada «Reintentar» (`pedir()`). `pendiente`
// dice que el pedido está en camino: mientras tanto el resumen espera, no dice «error». Cuesta lo que una carga del listado (`docs/RENDIMIENTO.md`).
export function usePedidoAlServidor(id: string | null, necesita: boolean) {
  const router = useRouter()
  const [pendiente, empezar] = useTransition()
  // Lo último que se pidió: el estado (dentro de la transición) para dibujar, y la marca para que el efecto no pida dos veces lo mismo.
  const [pedido, setPedido] = useState<string | null>(null)
  const enviado = useRef<string | null>(null)
  const pedir = useCallback(() => {
    if (id === null) {
      return
    }
    enviado.current = id
    empezar(() => {
      setPedido(id)
      router.refresh()
    })
  }, [id, empezar, router])
  useEffect(() => {
    if (necesita && id !== null && enviado.current !== id) {
      pedir()
    }
  }, [necesita, id, pedir])
  return { pendiente, yaPedido: id !== null && pedido === id && !pendiente, pedir }
}
